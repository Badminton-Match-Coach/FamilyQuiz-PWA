import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API routes
app.post("/api/generate-quiz", async (req, res) => {
  const { topics, count, target, lang, ageFrom = 5, ageTo = 10 } = req.body;
  const currentLang = lang || 'sv';
  
  if (!topics || !count) {
    return res.status(400).json({ error: "Missing topics or count" });
  }

  const isBarn = target === 'barn' || target === 'båda';
  const isVuxen = target === 'vuxen' || target === 'båda';

  const langNames: Record<string, string> = {
    sv: 'Swedish',
    fr: 'French',
    en: 'English',
    es: 'Spanish'
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

  try {
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

    const quizData = JSON.parse(response.text);
    
    // Add IDs and originalLanguage
    if (quizData.barnQuestions) {
      quizData.barnQuestions = quizData.barnQuestions.map((q: any) => ({
        ...q,
        id: Math.random().toString(36).substring(2, 9),
        originalLanguage: currentLang
      }));
    }
    if (quizData.vuxenQuestions) {
      quizData.vuxenQuestions = quizData.vuxenQuestions.map((q: any) => ({
        ...q,
        id: Math.random().toString(36).substring(2, 9),
        originalLanguage: currentLang
      }));
    }

    res.json(quizData);
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ error: "Kunde inte generera frågor: " + error.message });
  }
});

app.post("/api/translate-questions", async (req, res) => {
  const { questions, targetLanguage } = req.body;
  if (!questions || !Array.isArray(questions) || !targetLanguage) {
    return res.status(400).json({ error: "Missing questions array or targetLanguage" });
  }

  if (questions.length === 0) {
    return res.json({ translations: [] });
  }

  const prompt = `Translate the following quiz questions and options directly into target language code: "${targetLanguage}".
Each question object has an "id", "text", "originalLanguage", and optional "options".
Translate "text" and each option in "options" accurately into target language "${targetLanguage}".
Keep the exact same "id" for each question. Preserve the original meaning and order of options.`;

  try {
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
    res.json(data);
  } catch (error: any) {
    console.error("Translation Error:", error);
    res.status(500).json({ error: "Could not translate questions: " + error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on port 3000");
  });
}

startServer();
