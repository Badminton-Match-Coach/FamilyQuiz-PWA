/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuizConfig } from './types';

export interface SavedQuizRecord {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  barnCount: number;
  vuxenCount: number;
  hasLocations: boolean;
  quizConfig: QuizConfig;
}

const DB_NAME = 'FamilyQuizIndexedDB';
const DB_VERSION = 1;
const STORE_NAME = 'quizzes';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save or update a quiz in IndexedDB
 */
export async function saveQuizToIndexedDB(
  quizConfig: QuizConfig,
  existingId?: string,
  customTitle?: string
): Promise<SavedQuizRecord> {
  const db = await openDB();
  const id = existingId || `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const title = customTitle?.trim() || quizConfig.title?.trim() || 'Min Tipspromenad';
  const now = Date.now();

  const barnCount = quizConfig.barnQuestions?.length || 0;
  const vuxenCount = quizConfig.vuxenQuestions?.length || 0;
  const hasLocations = [...(quizConfig.barnQuestions || []), ...(quizConfig.vuxenQuestions || [])].some(
    (q) => !!q.location
  );

  const record: SavedQuizRecord = {
    id,
    title,
    createdAt: now,
    updatedAt: now,
    barnCount,
    vuxenCount,
    hasLocations,
    quizConfig: {
      ...quizConfig,
      title,
    },
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Check if updating existing
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result && getReq.result.createdAt) {
        record.createdAt = getReq.result.createdAt;
      }
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve(record);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => {
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve(record);
      putReq.onerror = () => reject(putReq.error);
    };
  });
}

/**
 * Get all saved quizzes from IndexedDB
 */
export async function getAllQuizzesFromIndexedDB(): Promise<SavedQuizRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records: SavedQuizRecord[] = request.result || [];
      records.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single quiz by ID from IndexedDB
 */
export async function getQuizFromIndexedDB(id: string): Promise<SavedQuizRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a quiz from IndexedDB by ID
 */
export async function deleteQuizFromIndexedDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all records from IndexedDB quizzes store
 */
export async function clearAllQuizzesFromIndexedDB(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Export full IndexedDB as JSON string
 */
export async function exportIndexedDBToJSON(): Promise<string> {
  const quizzes = await getAllQuizzesFromIndexedDB();
  const exportData = {
    appName: 'FamilyQuiz',
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    quizCount: quizzes.length,
    quizzes,
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import quizzes from JSON backup into IndexedDB
 */
export async function importIndexedDBFromJSON(jsonString: string): Promise<number> {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Ogiltigt JSON-format.');
  }

  const list: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.quizzes)
    ? parsed.quizzes
    : parsed?.quizConfig
    ? [parsed]
    : [];

  if (list.length === 0) {
    throw new Error('Inga giltiga quiz hittades i JSON-filen.');
  }

  let count = 0;

  for (const item of list) {
    if (!item.quizConfig && (item.barnQuestions || item.vuxenQuestions)) {
      // Direct QuizConfig structure
      const recordConfig: QuizConfig = {
        title: item.title || 'Importerat Quiz',
        password: item.password || '',
        barnQuestions: item.barnQuestions || [],
        vuxenQuestions: item.vuxenQuestions || [],
      };
      await saveQuizToIndexedDB(recordConfig, item.id || undefined, recordConfig.title);
      count++;
    } else if (item.quizConfig) {
      // SavedQuizRecord structure
      await saveQuizToIndexedDB(
        item.quizConfig,
        item.id || undefined,
        item.title || item.quizConfig?.title
      );
      count++;
    }
  }

  return count;
}

/**
 * Share IndexedDB JSON file using Web Share API or download fallback
 */
export async function shareIndexedDBJSON(): Promise<{ shared: boolean; method: 'native' | 'download' | 'clipboard' }> {
  const jsonText = await exportIndexedDBToJSON();
  const filename = `family_quiz_db_backup_${new Date().toISOString().slice(0, 10)}.json`;

  const blob = new Blob([jsonText], { type: 'application/json' });
  const file = new File([blob], filename, { type: 'application/json' });

  // Try Web Share API with file support first
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Family Quiz IndexedDB Export',
        text: 'Här är säkerhetskopian av alla sparade quiz i IndexedDB!',
        files: [file],
      });
      return { shared: true, method: 'native' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'native' };
      }
      // Fall through if share fails
    }
  }

  // Fallback to text sharing if native share text is supported
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Family Quiz IndexedDB Export',
        text: jsonText,
      });
      return { shared: true, method: 'native' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'native' };
      }
    }
  }

  // Fallback to browser file download
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { shared: true, method: 'download' };
  } catch {
    // Ultimate fallback: copy to clipboard
    await navigator.clipboard.writeText(jsonText);
    return { shared: true, method: 'clipboard' };
  }
}
