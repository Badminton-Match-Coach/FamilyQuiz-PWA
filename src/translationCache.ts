import { Question } from './types';
import { Language } from './i18n';

const memoryCache = new Map<string, { text: string; options: string[] }>();

try {
  const saved = localStorage.getItem('quiz_app_translation_cache');
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.keys(parsed).forEach(k => {
      memoryCache.set(k, parsed[k]);
    });
  }
} catch (e) {
  console.warn('Failed to load translation cache:', e);
}

function saveCacheToStorage() {
  try {
    const obj: Record<string, { text: string; options: string[] }> = {};
    memoryCache.forEach((v, k) => {
      obj[k] = v;
    });
    localStorage.setItem('quiz_app_translation_cache', JSON.stringify(obj));
  } catch (e) {
    console.warn('Failed to save translation cache:', e);
  }
}

type CacheSubscriber = () => void;
const subscribers = new Set<CacheSubscriber>();

export function subscribeTranslationCache(sub: CacheSubscriber) {
  subscribers.add(sub);
  return () => {
    subscribers.delete(sub);
  };
}

function notifySubscribers() {
  subscribers.forEach(sub => sub());
}

const pendingRequests = new Set<string>();

export function getCachedTranslation(q: Question, targetLang: Language): { text: string; options: string[] } | null {
  const origLang = q.originalLanguage || 'sv';
  if (origLang === targetLang) {
    return { text: q.text, options: q.options };
  }
  const key = `${q.id}_${origLang}_to_${targetLang}_${q.text}`;
  return memoryCache.get(key) || null;
}

export async function requestQuestionTranslations(questions: Question[], targetLang: Language) {
  const origQuestionsToFetch: Question[] = [];

  for (const q of questions) {
    const origLang = q.originalLanguage || 'sv';
    if (origLang === targetLang) continue;

    const cacheKey = `${q.id}_${origLang}_to_${targetLang}_${q.text}`;
    if (!memoryCache.has(cacheKey) && !pendingRequests.has(cacheKey)) {
      origQuestionsToFetch.push(q);
      pendingRequests.add(cacheKey);
    }
  }

  if (origQuestionsToFetch.length === 0) return;

  try {
    const response = await fetch('/api/translate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetLanguage: targetLang,
        questions: origQuestionsToFetch.map(q => ({
          id: q.id,
          text: q.text,
          options: q.options || [],
          originalLanguage: q.originalLanguage || 'sv'
        }))
      })
    });

    const data = await response.json();
    if (data.translations && Array.isArray(data.translations)) {
      for (const item of data.translations) {
        const origQ = origQuestionsToFetch.find(q => q.id === item.id);
        if (origQ) {
          const origLang = origQ.originalLanguage || 'sv';
          const cacheKey = `${origQ.id}_${origLang}_to_${targetLang}_${origQ.text}`;
          memoryCache.set(cacheKey, {
            text: item.text,
            options: item.options || origQ.options
          });
        }
      }
      saveCacheToStorage();
      notifySubscribers();
    }
  } catch (err) {
    console.error('Failed to translate questions:', err);
  } finally {
    for (const q of origQuestionsToFetch) {
      const origLang = q.originalLanguage || 'sv';
      const cacheKey = `${q.id}_${origLang}_to_${targetLang}_${q.text}`;
      pendingRequests.delete(cacheKey);
    }
  }
}
