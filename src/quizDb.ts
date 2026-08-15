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
const DB_VERSION = 2;
const STORE_NAME = 'quizzes';
const LOCALSTORAGE_MIRROR_KEY = 'family_quiz_db_mirror';

// Cached DB connection to prevent Safari connection leaks
let cachedDB: IDBDatabase | null = null;

function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

// LocalStorage helpers for seamless fallback and mirror syncing
function getLocalStorageMirror(): SavedQuizRecord[] {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_MIRROR_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalStorageMirror(records: SavedQuizRecord[]): void {
  try {
    localStorage.setItem(LOCALSTORAGE_MIRROR_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('Could not save to localStorage mirror:', err);
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error('IndexedDB is not available'));
    }

    if (cachedDB) {
      try {
        // Test if still usable
        if (cachedDB.objectStoreNames.contains(STORE_NAME)) {
          return resolve(cachedDB);
        }
      } catch {
        cachedDB = null;
      }
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('title', 'title', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        cachedDB = db;
        db.onversionchange = () => {
          db.close();
          cachedDB = null;
        };
        db.onclose = () => {
          cachedDB = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        cachedDB = null;
        reject(request.error || new Error('Failed to open IndexedDB'));
      };

      request.onblocked = () => {
        console.warn('IndexedDB open blocked by another tab or connection.');
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Save or update a quiz in IndexedDB (with synced localStorage fallback)
 */
export async function saveQuizToIndexedDB(
  quizConfig: QuizConfig,
  existingId?: string,
  customTitle?: string
): Promise<SavedQuizRecord> {
  const id = existingId || `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const title = customTitle?.trim() || quizConfig.title?.trim() || 'Min Tipspromenad';
  const now = Date.now();

  const barnCount = quizConfig.barnQuestions?.length || 0;
  const vuxenCount = quizConfig.vuxenQuestions?.length || 0;
  const hasLocations = [...(quizConfig.barnQuestions || []), ...(quizConfig.vuxenQuestions || [])].some(
    (q) => !!q.location
  );

  // Check existing created date from mirror first to avoid transaction chaining issues
  const mirror = getLocalStorageMirror();
  const existingRecord = mirror.find((m) => m.id === id);
  const createdAt = existingRecord?.createdAt || now;

  const record: SavedQuizRecord = {
    id,
    title,
    createdAt,
    updatedAt: now,
    barnCount,
    vuxenCount,
    hasLocations,
    quizConfig: {
      ...quizConfig,
      title,
    },
  };

  // 1. Always update localStorage mirror first so data is never lost on mobile
  const updatedMirror = [record, ...mirror.filter((m) => m.id !== id)].sort((a, b) => b.updatedAt - a.updatedAt);
  saveLocalStorageMirror(updatedMirror);

  // 2. Persist to IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  } catch (err) {
    console.warn('IndexedDB write failed, persisted to localStorage fallback instead:', err);
  }

  return record;
}

/**
 * Get all saved quizzes from IndexedDB (with synced localStorage fallback)
 */
export async function getAllQuizzesFromIndexedDB(): Promise<SavedQuizRecord[]> {
  let idbRecords: SavedQuizRecord[] = [];
  let idbSuccess = false;

  try {
    const db = await openDB();
    idbRecords = await new Promise<SavedQuizRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result || [];
        tx.oncomplete = () => resolve(records);
      };
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
    idbSuccess = true;
  } catch (err) {
    console.warn('IndexedDB read failed, trying localStorage mirror fallback:', err);
  }

  const mirror = getLocalStorageMirror();

  if (idbSuccess && idbRecords.length > 0) {
    // IndexedDB is the source of truth, update mirror
    idbRecords.sort((a, b) => b.updatedAt - a.updatedAt);
    saveLocalStorageMirror(idbRecords);
    return idbRecords;
  }

  // If IndexedDB returned empty or failed, but localStorage has records, restore them
  if (mirror.length > 0) {
    if (idbSuccess) {
      // Background restore to IndexedDB
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const item of mirror) {
          store.put(item);
        }
      } catch (err) {
        console.warn('Failed background restore to IndexedDB:', err);
      }
    }
    mirror.sort((a, b) => b.updatedAt - a.updatedAt);
    return mirror;
  }

  return idbRecords;
}

/**
 * Get a single quiz by ID from IndexedDB
 */
export async function getQuizFromIndexedDB(id: string): Promise<SavedQuizRecord | null> {
  try {
    const db = await openDB();
    const result = await new Promise<SavedQuizRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result || null;
        tx.oncomplete = () => resolve(result);
      };
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
    if (result) return result;
  } catch (err) {
    console.warn('IndexedDB get error, checking mirror:', err);
  }

  const mirror = getLocalStorageMirror();
  return mirror.find((m) => m.id === id) || null;
}

/**
 * Delete a quiz from IndexedDB by ID
 */
export async function deleteQuizFromIndexedDB(id: string): Promise<void> {
  // Update mirror first
  const mirror = getLocalStorageMirror().filter((m) => m.id !== id);
  saveLocalStorageMirror(mirror);

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  } catch (err) {
    console.warn('IndexedDB delete failed, deleted from mirror:', err);
  }
}

/**
 * Clear all records from IndexedDB quizzes store
 */
export async function clearAllQuizzesFromIndexedDB(): Promise<void> {
  saveLocalStorageMirror([]);

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  } catch (err) {
    console.warn('IndexedDB clear failed:', err);
  }
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
  
  // Test File constructor support safely
  let file: File | null = null;
  try {
    file = new File([blob], filename, { type: 'application/json' });
  } catch {
    file = null;
  }

  // Try Web Share API with file support first (Mobile Safari iOS 15+, Chrome Android)
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Family Quiz Backup',
        text: 'Säkerhetskopia av sparade tipspromenader',
        files: [file],
      });
      return { shared: true, method: 'native' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'native' };
      }
      // Fall through
    }
  }

  // Fallback to text sharing if native share text is supported
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Family Quiz Backup',
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
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(jsonText);
      return { shared: true, method: 'clipboard' };
    }
    return { shared: false, method: 'clipboard' };
  }
}

