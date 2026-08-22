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
  geotagLandmarks?: boolean;
}) {
  const apiKey = params.apiKey || getStoredApiKey();
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });
  const { topics, count, target, lang, ageFrom = 5, ageTo = 10, geotagLandmarks = false } = params;
  const currentLang = lang || 'sv';

  const isBarn = target === 'barn' || target === 'båda';
  const isVuxen = target === 'vuxen' || target === 'båda';

  const langNames: Record<string, string> = {
    sv: 'Swedish',
    fr: 'French',
    en: 'English',
    es: 'Spanish',
    de: 'German',
    no: 'Norwegian',
    da: 'Danish',
    fi: 'Finnish',
    it: 'Italian',
    et: 'Estonian',
    lv: 'Latvian',
    lt: 'Lithuanian',
    uk: 'Ukrainian',
    nl: 'Dutch',
    is: 'Icelandic',
    se: 'Northern Sami'
  };
  const targetLangName = langNames[currentLang] || 'Swedish';

  let prompt = `Create a quiz with the theme "${topics}". The questions and answers MUST be in ${targetLangName}. Each question can have between 2 and 5 multiple choice options in the "options" array, and "correctAnswer" is the 0-based index of the correct option.\n`;

  if (geotagLandmarks) {
    prompt += `GEOTAGGING & REAL-WORLD COORDINATES REQUIREMENT:
If the questions are about or mention specific real-world places, landmarks, monuments, museums, historical buildings, parks, stations, or geographical locations (e.g. "Eiffel Tower", "Stockholm Palace", "Big Ben", "Colosseum", "Central Park", "Skansen", "Liseberg", "Vasa Museum"):
For each such question, you MUST provide its real-world GPS coordinates:
- "latitude": float (WGS84 decimal degrees, e.g. 59.3268)
- "longitude": float (WGS84 decimal degrees, e.g. 18.0717)
- "locationName": a concise name of the landmark/location (e.g. "Stockholms slott")
If a question is general trivia without a specific physical place, set latitude to 0 and longitude to 0 or leave them null.\n`;
  }

  if (target === 'båda') {
    prompt += `Create a total of ${count} questions for children (approx. ${ageFrom}-${ageTo} years old) and ${count} questions for adults (more challenging).`;
  } else if (target === 'barn') {
    prompt += `Create a total of ${count} questions for children (approx. ${ageFrom}-${ageTo} years old).`;
  } else {
    prompt += `Create a total of ${count} questions for adults (challenging but fun).`;
  }

  const questionItemProperties: any = {
    text: { type: Type.STRING },
    options: { type: Type.ARRAY, items: { type: Type.STRING } },
    correctAnswer: { type: Type.INTEGER }
  };
  if (geotagLandmarks) {
    questionItemProperties.latitude = { type: Type.NUMBER };
    questionItemProperties.longitude = { type: Type.NUMBER };
    questionItemProperties.locationName = { type: Type.STRING };
  }

  const properties: any = {};
  const required: string[] = [];

  if (isBarn) {
    properties.barnQuestions = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: questionItemProperties,
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
        properties: questionItemProperties,
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

  const mapQuestion = (q: any) => {
    const hasCoords = typeof q.latitude === 'number' && typeof q.longitude === 'number' && (Math.abs(q.latitude) > 0.0001 || Math.abs(q.longitude) > 0.0001);
    return {
      ...q,
      id: Math.random().toString(36).substring(2, 9),
      options: q.options || [],
      correctAnswers: [typeof q.correctAnswer === 'number' ? q.correctAnswer : 0],
      originalLanguage: currentLang,
      location: hasCoords ? {
        lat: q.latitude,
        lng: q.longitude,
        name: q.locationName || undefined
      } : undefined
    };
  };

  if (quizData.barnQuestions) {
    quizData.barnQuestions = quizData.barnQuestions.map(mapQuestion);
  }
  if (quizData.vuxenQuestions) {
    quizData.vuxenQuestions = quizData.vuxenQuestions.map(mapQuestion);
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

/**
 * Validates a user's text answer against a target word using the Gemini Linguistic Validation Engine.
 */
export async function validateTextAnswerWithGemini(params: {
  userInput: string;
  targetWord: string;
  acceptedAlternatives?: string[];
  language?: string;
  apiKey?: string;
}): Promise<{
  match: boolean;
  confidence: number;
  detected_language: 'sv' | 'en' | 'de' | 'fr' | 'es' | 'no' | 'da' | 'fi' | 'it' | 'et' | 'lv' | 'lt' | 'uk' | 'is' | 'se' | 'nl' | 'be';
}> {
  const apiKey = params.apiKey || getStoredApiKey();
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });
  const { userInput, targetWord, acceptedAlternatives = [] } = params;

  const prompt = `You are a linguistic validation engine for a multi-lingual Progressive Web App (PWA). Your job is to determine if a user's input matches a specific target word or concept, even if the user has made severe spelling or grammatical errors typical of dyslexia.

Support these European languages: Swedish, English, German, French, Spanish, Norwegian, Danish, Finnish, Italian, Estonian, Latvian, Lithuanian, Ukrainian, Icelandic, Northern Sami, Dutch, and Belgian Dutch/Flemish.

Apply the following evaluation rules to the user's input:
1. Ignore case sensitivity completely (e.g., "aba" should match "Abba").
2. Ignore missing, extra, or swapped double consonants (e.g., "aba" or "abbba" matches "Abba"; "alene" matches "alleine").
3. Ignore missing or incorrect diacritics/accents (e.g., "ee" or "e" for "é"/"è" in French, missing "umlauts" ä/ö/ü in German/Swedish, missing "ñ" or accents in Spanish, ā/č/ē/ģ/ī/ķ/ļ/ņ/š/ū/ž in Latvian, ą/č/ę/ė/į/š/ų/ū/ž in Lithuanian, ä/ö/õ/ü in Estonian, і/ї/є in Ukrainian).
4. Forgive character transpositions/swaps (e.g., "baab" instead of "barn", "teh" instead of "the").
5. Forgive phonetic substitutions common in the specific language.

Allow a general fuzziness/error margin of up to 30-35% of the target word's length.

User Input: "${userInput}"
Target Word: "${targetWord}"
${acceptedAlternatives.length > 0 ? `Accepted Alternatives: ${JSON.stringify(acceptedAlternatives)}` : ''}

CRITICAL: You must always respond in a strict, minified JSON format. Do not include any conversational text, markdown formatting (like \`\`\`json), or explanations. 

Output structure:
{
  "match": boolean,
  "confidence": float (0.0 to 1.0),
  "detected_language": "sv" | "en" | "de" | "fr" | "es" | "no" | "da" | "fi" | "it" | "et" | "lv" | "lt" | "uk"
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          match: { type: Type.BOOLEAN },
          confidence: { type: Type.NUMBER },
          detected_language: { 
            type: Type.STRING,
            enum: ["sv", "en", "de", "fr", "es", "no", "da", "fi", "it", "et", "lv", "lt", "uk"]
          }
        },
        required: ["match", "confidence", "detected_language"]
      }
    }
  });

  const parsed = JSON.parse(response.text || "{}");
  return {
    match: Boolean(parsed.match),
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    detected_language: parsed.detected_language || 'sv'
  };
}

/**
 * Finds exact GPS coordinates and place name for a question or place query using Gemini.
 */
export async function findLocationCoordinatesWithGemini(
  textOrPlace: string,
  apiKeyOverride?: string
): Promise<{ lat: number; lng: number; name: string } | null> {
  const apiKey = apiKeyOverride || getStoredApiKey();
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Identify the real-world place, landmark, building, park, museum, city, or location mentioned or referred to in the following text/question.
Find its precise real-world GPS coordinates (WGS84 decimal latitude and longitude) and a clean place name.

Text/Question: "${textOrPlace}"

If a specific location or landmark can be identified, provide its coordinates. If the text has no connection to any physical place on Earth, return found: false.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          found: { type: Type.BOOLEAN },
          name: { type: Type.STRING },
          latitude: { type: Type.NUMBER },
          longitude: { type: Type.NUMBER }
        },
        required: ["found"]
      }
    }
  });

  const parsed = JSON.parse(response.text || "{}");
  if (parsed.found && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number' && (Math.abs(parsed.latitude) > 0.0001 || Math.abs(parsed.longitude) > 0.0001)) {
    return {
      lat: parsed.latitude,
      lng: parsed.longitude,
      name: parsed.name || textOrPlace.substring(0, 40)
    };
  }
  return null;
}
