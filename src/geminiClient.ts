import { GoogleGenAI, Type } from "@google/genai";

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('gemini_api_key') || ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || '';
}

export function setStoredApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('gemini_api_key', key.trim());
  }
}

export async function generateQuizClient(params: {
  topics: string;
  count: number;
  target: 'barn' | 'vuxen' | 'båda';
  lang: string;
  ageFrom?: number;
  ageTo?: number;
  apiKey?: string;
}) {
  const apiKey = params.apiKey || getStoredApiKey();
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });
  const { topics, count, target, lang, ageFrom = 5, ageTo = 10 } = params;
  const currentLang = lang || 'sv';

  const isBarn = target === 'barn' || target === 'båda';
  const isVuxen = target === 'vuxen' || target === 'båda';

  const langNames: Record<string, string> = {
    sv: 'Swedish',
    fr: 'French',
    en: 'English',
    es: 'Spanish',
    de: 'German'
  };
  const targetLangName = langNames[currentLang] || 'Swedish';

  let prompt = `Create a quiz with the theme "${topics}". The questions and answers MUST be in ${targetLangName}. Each question must have exactly 3 options and one correct index (0, 1, or 2).\n`;

  if (target === 'båda') {
    prompt += `Create a total of ${count} questions for children (approx. ${ageFrom}-${ageTo} years old) and ${count} questions for adults (more challenging).`;
  } else if (target === 'barn') {
    prompt += `Create a total of ${count} questions for children (approx. ${ageFrom}-${ageTo} years old).`;
  } else {
    prompt += `Create a total of ${count} questions for adults (challenging but fun).`;
  }

  const properties: any = {};
  const required: string[] = [];

  if (isBarn) {
    properties.barnQuestions = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.INTEGER }
        },
        required: ["text", "options", "correctAnswer"]
      }
    };
    required.push("barnQuestions");
  }

  if (isVuxen) {
    properties.vuxenQuestions = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.INTEGER }
        },
        required: ["text", "options", "correctAnswer"]
      }
    };
    required.push("vuxenQuestions");
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties,
        required
      }
    }
  });

  const quizData = JSON.parse(response.text || "{}");

  if (quizData.barnQuestions) {
    quizData.barnQuestions = quizData.barnQuestions.map((q: any) => ({
      ...q,
      id: Math.random().toString(36).substring(2, 9),
      options: q.options || [],
      correctAnswers: [typeof q.correctAnswer === 'number' ? q.correctAnswer : 0],
      originalLanguage: currentLang
    }));
  }
  if (quizData.vuxenQuestions) {
    quizData.vuxenQuestions = quizData.vuxenQuestions.map((q: any) => ({
      ...q,
      id: Math.random().toString(36).substring(2, 9),
      options: q.options || [],
      correctAnswers: [typeof q.correctAnswer === 'number' ? q.correctAnswer : 0],
      originalLanguage: currentLang
    }));
  }

  return quizData;
}

export async function translateQuestionsClient(
  questions: Array<{ id: string; text: string; options?: string[]; originalLanguage?: string }>,
  targetLanguage: string,
  apiKeyOverride?: string
) {
  const apiKey = apiKeyOverride || getStoredApiKey();
  if (!apiKey) {
    return { translations: [] };
  }

  if (!questions || questions.length === 0) {
    return { translations: [] };
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Translate the following quiz questions and options directly into target language code: "${targetLanguage}".
Each question object has an "id", "text", "originalLanguage", and optional "options".
Translate "text" and each option in "options" accurately into target language "${targetLanguage}".
Keep the exact same "id" for each question. Preserve the original meaning and order of options.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt + "\nInput Questions JSON:\n" + JSON.stringify(questions),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "text"]
            }
          }
        },
        required: ["translations"]
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return data;
}
