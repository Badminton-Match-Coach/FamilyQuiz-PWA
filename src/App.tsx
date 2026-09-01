import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import LZString from 'lz-string';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Settings, 
  Trophy, 
  CheckCircle2, 
  Lock, 
  ChevronRight, 
  ChevronLeft, 
  Upload,
  Share2,
  XCircle,
  X,
  Edit2,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Copy,
  Sparkles,
  HelpCircle,
  Check,
  CheckSquare,
  MapPin,
  Map,
  Locate,
  Navigation,
  Compass,
  Search,
  Maximize2,
  Globe,
  Download,
  Database,
  Save,
  FolderOpen,
  HardDrive,
  Mail,
  ArrowUpDown,
  GripVertical,
  Image as ImageIcon
} from 'lucide-react';
import { Participant, QuizConfig, QuizMetadata, AnswerRecord, UserType, Question, QuestionType, Location } from './types';
import { Header } from './components/Navigation/Header';
import { SetupView } from './components/Tipspromenad/SetupView';
import { QuizWalkView } from './components/Tipspromenad/QuizWalkView';
import { ResultsView } from './components/Tipspromenad/ResultsView';
import { SettingsView } from './components/Settings/SettingsView';
import { QuestionFullScreenEditor } from './components/Settings/QuestionFullScreenEditor';
import { GlobalImportModal } from './components/Modals/GlobalImportModal';
import { ImageZoomModal } from './components/Modals/ImageZoomModal';
import { HowItWorksModal } from './components/Modals/HowItWorksModal';
import { InAppBreakoutModal } from './components/Modals/InAppBreakoutModal';
export const compressImageFile = async (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.82): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new (window as any).Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Kunde inte läsa in bilden'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Kunde inte läsa filen'));
    reader.readAsDataURL(file);
  });
};
import { defaultQuiz } from './data/defaultQuiz';
import { 
  AdminMapPicker, 
  ParticipantMap, 
  RouteGeoTagModal, 
  CompassDirectionBadge, 
  MiniStationMap, 
  TrailProgressBar, 
  calculateDistanceMeters, 
  formatDistance, 
  calculateWalkingTimeMinutes,
  calculatePathDistance 
} from './components/MapComponent';
import { generateQuizClient, batchTranslateQuizQuestions, getStoredApiKey, setStoredApiKey, getStoredAiUseImages, setStoredAiUseImages, validateTextAnswerWithGemini, findLocationCoordinatesWithGemini } from './geminiClient';
import { Language, SUPPORTED_LANGUAGES, detectLanguage, t, translateQuestion, unpackLanguage } from './i18n';
import { subscribeTranslationCache, requestQuestionTranslations, registerQuestionTranslation } from './translationCache';
import { evaluateTextAnswer, soundex, detectLinguisticLanguage } from './utils/soundex';
import { compressQuizToUrlCode, generateQuizDirectUrl, decompressQuizFromUrlCode } from './utils/quizCompression';
import { validateQuizConfig } from './utils/quizValidation';
import { cacheLogoAsDataUrl } from './utils/logoCache';
import { 
  SavedQuizRecord, 
  saveQuizToIndexedDB, 
  saveQuizSessionToIndexedDB,
  getQuizByQuizId,
  getAllQuizzesFromIndexedDB, 
  deleteQuizFromIndexedDB, 
  exportIndexedDBToJSON, 
  importIndexedDBFromJSON, 
  shareIndexedDBJSON, 
  clearAllQuizzesFromIndexedDB 
} from './quizDb';
import { 
  getQuestionAvailableLanguages, 
  getQuizAvailableLanguages, 
  getLibraryItemLanguages, 
  getLanguageOption 
} from './utils/quizLanguages';

const STORAGE_KEY_ANSWERS = 'quiz_pwa_answers';
const STORAGE_KEY_PARTICIPANTS = 'quiz_pwa_participants';
const STORAGE_KEY_CONFIG = 'quiz_pwa_config';
const STORAGE_KEY_WALKED_PATH = 'family_quiz_walked_path';
const STORAGE_KEY_CACHED_APP_URL = 'family_quiz_cached_app_url';
const DEFAULT_PARTICIPANT_UNIQUE_ID = 'default-participant-reserved';
const DEFAULT_QUIZ_ID = 'default-quiz-template';
const FALLBACK_APP_URL = 'https://badminton-match-coach.github.io/FamilyQuiz-PWA/';

export const getOptionLabel = (oIdx: number, totalCount?: number): string => {
  if (totalCount === 3) {
    return oIdx === 0 ? '1' : oIdx === 1 ? 'X' : oIdx === 2 ? '2' : String(oIdx + 1);
  }
  return String(oIdx + 1);
};

function getInitialCachedAppUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CACHED_APP_URL);
      if (saved && (saved.startsWith('http://') || saved.startsWith('https://'))) {
        return saved;
      }
      if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
        const current = `${window.location.origin}${window.location.pathname}`;
        try {
          localStorage.setItem(STORAGE_KEY_CACHED_APP_URL, current);
        } catch {
          // ignore
        }
        return current;
      }
    } catch {
      // ignore
    }
  }
  return FALLBACK_APP_URL;
}

const ensureQuizId = (config: QuizConfig): QuizConfig => {
  if (config.quizId && config.quizId !== DEFAULT_QUIZ_ID) return config;
  return { ...config, quizId: crypto.randomUUID() };
};

export default function App() {
  const [lang, setLang] = useState<Language>(() => detectLanguage());
  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem('family_quiz_lang', newLang);
    } catch {
      // ignore
    }
  };
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [languageMenuPosition, setLanguageMenuPosition] = useState({ top: 0, left: 0 });
  const languageMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [, setTranslationTick] = useState(0);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [cachedAppUrl, setCachedAppUrl] = useState<string>(() => getInitialCachedAppUrl());
  const selectedLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES[0];

  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbFilterCategory, setDbFilterCategory] = useState('all');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [libraryFilterLanguage, setLibraryFilterLanguage] = useState('all');
  const [librarySortBy, setLibrarySortBy] = useState<'name-asc' | 'date-desc' | 'count-desc'>('name-asc');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [directLinkLockOrderMode, setDirectLinkLockOrderMode] = useState<boolean>(false);



  const handleSaveCustomApiKey = () => {
    try {
      localStorage.setItem('gemini_api_key', userApiKeyInput.trim());
      alert(t(lang, 'apiKeySavedSuccess') || 'API-nyckel sparad!');
      setShowApiKeyInput(false);
    } catch {
      // ignore
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 600, 600, 0.85);
      const cached = await cacheLogoAsDataUrl(dataUrl);
      setQuizConfig(prev => ({ ...prev, logoUrl: cached }));
    } catch (err) {
      console.error('Failed to upload logo:', err);
    }
  };

  const handleRemoveLogo = () => {
    setQuizConfig(prev => ({ ...prev, logoUrl: undefined }));
  };



  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
      const current = `${window.location.origin}${window.location.pathname}`;
      try {
        localStorage.setItem(STORAGE_KEY_CACHED_APP_URL, current);
        setCachedAppUrl(current);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

  


  return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!isLanguageMenuOpen) return;

    const updateMenuPosition = () => {
      const button = languageMenuButtonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const menuWidth = 224;
      const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12);
      setLanguageMenuPosition({
        top: rect.bottom + 8,
        left: Math.max(12, left)
      });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-language-menu-root]')) {
        setIsLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isLanguageMenuOpen]);

  const handleInstallPwa = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setIsAppInstalled(true);
    }
    setDeferredInstallPrompt(null);
  };

  const changeLanguage = (newLang: Language) => {
    unpackLanguage(newLang);
    setLang(newLang);
    localStorage.setItem('quiz_app_lang', newLang);
    
    // Update default participant name if language changes
    setParticipants(prev => prev.map(p => 
      p.id === 'default-du' ? { ...p, name: t(newLang, 'you') } : p
    ));
  };

  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PARTICIPANTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migration: ensure all participants have uniqueId
          const migrated = parsed.map((p: any) => {
            // Preserve default participant's reserved uniqueId
            if (p.id === 'default-du') {
              return { ...p, uniqueId: DEFAULT_PARTICIPANT_UNIQUE_ID };
            }
            return { ...p, uniqueId: p.uniqueId || crypto.randomUUID() };
          });
          return migrated;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [{ id: 'default-du', uniqueId: DEFAULT_PARTICIPANT_UNIQUE_ID, name: t(detectLanguage(), 'you'), type: 'vuxen' }];
  });

  const [answers, setAnswers] = useState<AnswerRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ANSWERS);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Could not load saved answers; starting with an empty answer list:', error);
      return [];
    }
  });

  const [quizConfig, setQuizConfig] = useState<QuizConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: ensure correctAnswers and originalLanguage exist
        const migrateQuestions = (qs: any[]) => (qs || []).map(q => ({
          ...q,
          correctAnswers: Array.isArray(q.correctAnswers) ? q.correctAnswers : (typeof q.correctAnswer === 'number' ? [q.correctAnswer] : [0]),
          originalLanguage: q.originalLanguage || 'en'
        }));
        return ensureQuizId({
          ...parsed,
          barnQuestions: migrateQuestions(parsed.barnQuestions),
          vuxenQuestions: migrateQuestions(parsed.vuxenQuestions)
        });
      } catch (e) {
        return ensureQuizId(defaultQuiz);
      }
    }
    return ensureQuizId(defaultQuiz);
  });

  useEffect(() => {
    return subscribeTranslationCache(() => {
      setTranslationTick(t => t + 1);
    });
  }, []);

  useEffect(() => {
    const allQuestions = [...quizConfig.barnQuestions, ...quizConfig.vuxenQuestions];
    requestQuestionTranslations(allQuestions, lang);
  }, [lang, quizConfig.barnQuestions, quizConfig.vuxenQuestions]);

  const [view, setView] = useState<'setup' | 'quiz' | 'results' | 'config'>('setup');
  const [isPageVisible, setIsPageVisible] = useState(() => document.visibilityState === 'visible');
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => setIsPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const locateUser = () => {
    if (!navigator.geolocation) {
      alert(t(lang, 'noGpsSupport'));
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        alert(t(lang, 'couldNotGetPosition'));
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
const [pendingQuestionIndex, setPendingQuestionIndex] = useState<number | null>(null);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [lockNotice, setLockNotice] = useState<{
    questionIndex: number;
    distanceMeters: number | null;
    message: string;
  } | null>(null);

  const canAccessQuestionForParticipant = (participantId: string, questionIndex: number) => {
    if (!quizConfig.requireSequentialAnswers) return true;

    const answeredIndexes = answers
      .filter(a => a.participantId === participantId)
      .map(a => a.questionIndex);

    if (answeredIndexes.length === 0) {
      return questionIndex === 0;
    }

    const highestAnsweredIndex = Math.max(...answeredIndexes);
    return questionIndex <= highestAnsweredIndex + 1;
  };

  const handleSelectQuestionIndex = (idx: number, isFollowUp = false, participantId?: string) => {
    const activePartId = participantId || selectedParticipantId || (participants.length === 1 ? participants[0]?.id : null);
    if (quizConfig.requireSequentialAnswers && activePartId && !isFollowUp) {
      if (!canAccessQuestionForParticipant(activePartId, idx)) {
        alert(t(lang, 'sequentialAnswerRequiredAlert'));
        return;
      }
    }

    const question = quizQuestionPool?.[idx]
      || quizConfig.barnQuestions[idx]
      || quizConfig.vuxenQuestions[idx];
    const location = question?.location;
    const unlockDistance = Math.max(5, quizConfig.geotagUnlockDistance || 20);

    if (location) {
      const isTreasure = !!question?.hideLocationOnMap || !!location?.hideOnMap;
      if (!userLocation) {
        setLockNotice({
          questionIndex: idx,
          distanceMeters: null,
          message: isTreasure
            ? t(lang, 'treasureHuntLockMessage')
            : 'Denna fråga har en geotag på kartan. Slå på din GPS-position för att kunna låsa upp och svara på den!',
        });
        return;
      }

      const dist = calculateDistanceMeters(userLocation.lat, userLocation.lng, location.lat, location.lng);
      if (dist > unlockDistance) {
        setLockNotice({
          questionIndex: idx,
          distanceMeters: isTreasure ? null : dist,
          message: isTreasure
            ? t(lang, 'treasureHuntLockMessage')
            : `Du är ${formatDistance(dist)} från stationen. Du behöver gå närmare (inom ${unlockDistance} meter) för att låsa upp fråga ${idx + 1}!`,
        });
        return;
      }
    }

    // Question is non-geotagged or within unlock radius -> open question!
    setSelectedQuestionIndex(idx);
    setSelectedParticipantId(
      isFollowUp ? activePartId : participants.length === 1 ? participants[0].id : null
    );
    setLockNotice(null);
  };

  const openFollowUpQuestion = (question: Question, participantId: string, isCorrect?: boolean): boolean => {
    const mode = question.followUpMode || 'always';
    if (!question.followUpQuestionId || (mode === 'correct' && !isCorrect) || (mode === 'incorrect' && isCorrect !== false)) return false;

    const participant = participants.find(p => p.id === participantId);
    if (!participant) return false;
    const questions = participant.type === 'barn' ? quizConfig.barnQuestions : quizConfig.vuxenQuestions;
    const followUpIndex = questions.findIndex(q => q.id === question.followUpQuestionId);
    if (followUpIndex < 0) return false;

    handleSelectQuestionIndex(followUpIndex, true, participantId);
    return true;
  };
  const [showLoadConfirm, setShowLoadConfirm] = useState<{ type: 'db' | 'library'; payload: any } | null>(null);

  const [viewingParticipantId, setViewingParticipantId] = useState<string | null>(null);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [fullScreenEditingQuestionId, setFullScreenEditingQuestionId] = useState<string | null>(null);
  const [editingQuestionLang, setEditingQuestionLang] = useState<Language>('sv');
  const [slideDirection, setSlideDirection] = useState<number>(1);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [showCreateQuestionModal, setShowCreateQuestionModal] = useState<UserType | 'båda' | null>(null);
  const [createModalCategory, setCreateModalCategory] = useState<'barn' | 'vuxen' | 'båda'>('barn');
  const [showRouteGeoTagModal, setShowRouteGeoTagModal] = useState(false);
  const [showQuestionMiniMap, setShowQuestionMiniMap] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [configMasterPasswordInput, setConfigMasterPasswordInput] = useState('');
  const [isConfigUnlocked, setIsConfigUnlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPasswordCorrect, setIsPasswordCorrect] = useState(false);
  const [showConfigInput, setShowConfigInput] = useState(false);
  const [configJsonInput, setConfigJsonInput] = useState('');
  const [showAnswerImportModal, setShowAnswerImportModal] = useState(false);
  const [answerImportInput, setAnswerImportInput] = useState('');
  const [showAnswerExportModal, setShowAnswerExportModal] = useState(false);
  const [showParticipantActions, setShowParticipantActions] = useState(false);
  const [showResultsActions, setShowResultsActions] = useState(false);
  const [editingQuestionsCategory, setEditingQuestionsCategory] = useState<UserType>('barn');
  const [showQuestionMore, setShowQuestionMore] = useState(false);
  const [configTab, setConfigTab] = useState<'questions' | 'ai' | 'db' | 'general' | 'library'>('questions');
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuizRecord[]>([]);
  const [showAllSavedQuizzes, setShowAllSavedQuizzes] = useState(false);
  const [dbSortBy, setDbSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc'>('date-desc');
  const [dbNotification, setDbNotification] = useState<string | null>(null);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const dbFileInputRef = useRef<HTMLInputElement>(null);
  const [draggedQuestionRow, setDraggedQuestionRow] = useState<{
    id: string;
    isFollowUp: boolean;
    rootQuestionId: string;
  } | null>(null);
  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(null);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<'before' | 'after' | null>(null);

  const latestSavedQuiz = useMemo(() => {
    if (savedQuizzes.length === 0) return null;
    return [...savedQuizzes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  }, [savedQuizzes]);

  const sortedSavedQuizzes = useMemo(() => {
    return [...savedQuizzes].sort((a, b) => {
      if (dbSortBy === 'date-desc') {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      }
      if (dbSortBy === 'date-asc') {
        return (a.updatedAt || 0) - (b.updatedAt || 0);
      }
      if (dbSortBy === 'name-asc') {
        return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base', numeric: true });
      }
      return 0;
    });
  }, [savedQuizzes, dbSortBy]);

  const refreshSavedQuizzes = async () => {
    try {
      const list = await getAllQuizzesFromIndexedDB();
      setSavedQuizzes(list);
    } catch (err) {
      console.error('Kunde inte läsa från IndexedDB:', err);
    }
  };

  const autoSaveQuizToIndexedDBIfNew = async (config: QuizConfig) => {
    try {
      const rawTitle = (config.title || '').trim();
      if (!rawTitle) return;

      const existingList = await getAllQuizzesFromIndexedDB();
      const titleLower = rawTitle.toLowerCase();
      const exists = existingList.some(
        (item) => (item.title || '').trim().toLowerCase() === titleLower
      );

      if (!exists) {
        await saveQuizToIndexedDB(config, undefined, rawTitle);
        await refreshSavedQuizzes();
        console.log(`[IndexedDB] Nytt quiz "${rawTitle}" sparades automatiskt i databasen.`);
      }
    } catch (err) {
      console.warn('Kunde inte autospara nytt quiz till IndexedDB:', err);
    }
  };

  useEffect(() => {
    refreshSavedQuizzes();
  }, []);

  useEffect(() => {
    if (configTab === 'db' || configTab === 'library' || showConfigInput || showAnswerImportModal) {
      refreshSavedQuizzes();
    }
  }, [configTab, showConfigInput, showAnswerImportModal, showAnswerExportModal]);

  const handleSaveCurrentQuizToDB = async () => {
    setIsSavingToDb(true);
    try {
      await saveQuizToIndexedDB(quizConfig);
      await refreshSavedQuizzes();
      setDbNotification(t(lang, 'quizSavedSuccess'));
      setTimeout(() => setDbNotification(null), 4000);
    } catch (err) {
      alert('Kunde inte spara till IndexedDB');
    } finally {
      setIsSavingToDb(false);
    }
  };

  const handleLoadQuizFromDB = (record: SavedQuizRecord, _closeModal = true) => {
    if (participants.length > 0 || answers.length > 0) {
      setShowLoadConfirm({ type: 'db', payload: record });
      return;
    }

    const loadedQuiz = ensureQuizId(record.quizConfig);
    setQuizConfig(loadedQuiz);
    setNewQuizTitle(loadedQuiz.title);
    setNewQuizPassword(loadedQuiz.password || '');
    setNewGeotagDistance(loadedQuiz.geotagUnlockDistance || 20);
    setParticipants(record.quizState?.participants || []);
    setAnswers(record.quizState?.answers || []);
    setWalkedPath([]);
    setSelectedQuestionIndex(null);
    setSelectedQuestionIds([]);
    try {
      localStorage.setItem('family_quiz_config', JSON.stringify(loadedQuiz));
      localStorage.removeItem(STORAGE_KEY_WALKED_PATH);
      if (record.quizState?.answers) {
        localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(record.quizState.answers));
      } else {
        localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify([]));
      }
    } catch (err) {
      console.warn('Could not save to localStorage:', err);
    }
    const msg = `${t(lang, 'quizLoadedSuccess')} ("${record.title}")`;
    setDbNotification(msg);
    setTimeout(() => setDbNotification(null), 5000);
    setShowConfigInput(false);
    setView('setup');
  };

  const handleOverwriteQuizInDB = async (recordId: string) => {
    setDbConfirmation({ action: 'overwrite', recordId });
  };

  const handleDeleteQuizFromDB = async (recordId: string) => {
    setDbConfirmation({ action: 'delete', recordId });
  };

  const handleShareExportDB = async () => {
    try {
      const res = await shareIndexedDBJSON();
      if (res.shared) {
        if (res.method === 'download') {
          setDbNotification('Säkerhetskopian har sparats som fil! 📥');
        } else if (res.method === 'clipboard') {
          setDbNotification('Säkerhetskopian har kopierats till urklipp! 📋');
        } else {
          setDbNotification(t(lang, 'exportDbSuccess'));
        }
        setTimeout(() => setDbNotification(null), 4000);
      }
    } catch (err) {
      alert('Kunde inte exportera säkerhetskopia');
    }
  };

  const handleImportBackupJSONFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let text = '';
      if (typeof file.text === 'function') {
        text = await file.text();
      } else {
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Kunde inte läsa filen.'));
          reader.onabort = () => reject(new Error('Inläsningen avbröts.'));
          reader.readAsText(file);
        });
      }
      const count = await importIndexedDBFromJSON(text);
      await refreshSavedQuizzes();
      setDbNotification(t(lang, 'importDbSuccess').replace('{count}', String(count)));
      setTimeout(() => setDbNotification(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Fel vid import av säkerhetskopia');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleClearAllDB = async () => {
    setDbConfirmation({ action: 'clear' });
  };
  const [questionSearch, setQuestionSearch] = useState('');
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [newQuizPassword, setNewQuizPassword] = useState('');
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizLogoUrl, setNewQuizLogoUrl] = useState('');
  const [newGeotagDistance, setNewGeotagDistance] = useState<number>(() => quizConfig.geotagUnlockDistance || 20);
  const [importTarget, setImportTarget] = useState<'barn' | 'vuxen' | 'båda'>('båda');
  const [showFacit, setShowFacit] = useState(false);
  const [facitPasswordInput, setFacitPasswordInput] = useState('');
  const [isFacitUnlocked, setIsFacitUnlocked] = useState(false);
  const [copiedConfigCode, setCopiedConfigCode] = useState(false);
  const [copiedAppUrlCode, setCopiedAppUrlCode] = useState(false);
  const [copiedDirectUrlCode, setCopiedDirectUrlCode] = useState(false);
  const [directUrlLength, setDirectUrlLength] = useState<number | null>(null);
  const [directLinkLockMode, setDirectLinkLockMode] = useState<boolean>(true);
  const [isQuizModeLocked, setIsQuizModeLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const rawHash = window.location.hash || '';
      const hashStr = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
      const hashParams = new URLSearchParams(hashStr);

      const isLockedInUrl = 
        searchParams.get('lock') === '1' ||
        searchParams.get('mode') === 'quiz' ||
        searchParams.get('mode') === 'player' ||
        hashParams.get('lock') === '1' ||
        hashParams.get('mode') === 'quiz' ||
        hashParams.get('mode') === 'player' ||
        rawHash.includes('lock=1') ||
        rawHash.includes('mode=quiz');

      if (isLockedInUrl) {
        localStorage.setItem('family_quiz_lock_mode', 'true');
        return true;
      }
      return localStorage.getItem('family_quiz_lock_mode') === 'true';
    } catch {
      return false;
    }
  });
  const quizUnlockClickCountRef = useRef(0);
  const quizUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQuizIconClick = () => {
    quizUnlockClickCountRef.current += 1;

    if (quizUnlockClickCountRef.current === 7) {
      quizUnlockTimerRef.current = setTimeout(() => {
        if (quizUnlockClickCountRef.current === 7) {
          setIsQuizModeLocked((currentQuizModeLocked) => {
            const nextQuizModeLocked = !currentQuizModeLocked;
            if (nextQuizModeLocked) {
              localStorage.setItem('family_quiz_lock_mode', 'true');
            } else {
              localStorage.removeItem('family_quiz_lock_mode');
            }
            return nextQuizModeLocked;
          });
          quizUnlockClickCountRef.current = 0;
        }
        quizUnlockTimerRef.current = null;
      }, 3000);
      return;
    }

    if (quizUnlockClickCountRef.current > 7) {
      if (quizUnlockTimerRef.current) {
        clearTimeout(quizUnlockTimerRef.current);
        quizUnlockTimerRef.current = null;
      }
      quizUnlockClickCountRef.current = 0;
    }
  };

  useEffect(() => {
    return () => {
      if (quizUnlockTimerRef.current) clearTimeout(quizUnlockTimerRef.current);
    };
  }, []);

  // Tracked walked path (breadcrumbs) with local persistence
  const [walkedPath, setWalkedPath] = useState<Location[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_WALKED_PATH);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WALKED_PATH, JSON.stringify(walkedPath));
  }, [walkedPath]);

  const hasAnyGeotag = useMemo(() => {
    return [...quizConfig.barnQuestions, ...quizConfig.vuxenQuestions].some(q => !!q.location);
  }, [quizConfig.barnQuestions, quizConfig.vuxenQuestions]);

  const isFacitUnlockedRef = useRef(isFacitUnlocked);
  useEffect(() => {
    isFacitUnlockedRef.current = isFacitUnlocked;
  }, [isFacitUnlocked]);

  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const hasAnyGeotagRef = useRef(hasAnyGeotag);
  useEffect(() => {
    hasAnyGeotagRef.current = hasAnyGeotag;
  }, [hasAnyGeotag]);

  // GPS Tracking & Live Breadcrumb recording
  useEffect(() => {
    const isGeoTagEditing = fullScreenEditingQuestionId !== null || showRouteGeoTagModal;
    const isGpsNeeded = isPageVisible && (hasAnyGeotag || isGeoTagEditing) && !isFacitUnlocked && (
      view === 'quiz' || view === 'results' || isGeoTagEditing
    );
    if (!navigator.geolocation || !isGpsNeeded) return;

    const handlePos = (pos: GeolocationPosition) => {
      const newLoc: Location = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      setUserLocation(newLoc);

      // Record breadcrumb point if quiz has geotag info, facit has not been unlocked yet, and user is in quiz or results
      if (hasAnyGeotagRef.current && !isFacitUnlockedRef.current && (viewRef.current === 'quiz' || viewRef.current === 'results')) {
        setWalkedPath(prev => {
          if (prev.length === 0) return [newLoc];
          const last = prev[prev.length - 1];
          const dist = calculateDistanceMeters(last.lat, last.lng, newLoc.lat, newLoc.lng);
          // Only append if user walked at least 3 meters to avoid stationary GPS jitter
          if (dist >= 3) {
            return [...prev, newLoc];
          }
          return prev;
        });
      }
    };

    navigator.geolocation.getCurrentPosition(
      handlePos,
      () => {},
      { enableHighAccuracy: true, timeout: 5000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      handlePos,
      (err) => {
        console.warn('Geolocation watch error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [fullScreenEditingQuestionId, hasAnyGeotag, isFacitUnlocked, isPageVisible, showRouteGeoTagModal, view]);

  const [pointsInputValue, setPointsInputValue] = useState<number>(0);
  const [textInputValue, setTextInputValue] = useState<string>('');
  const [editorTestWord, setEditorTestWord] = useState<string>('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showSettingsHelp, setShowSettingsHelp] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [userApiKeyInput, setUserApiKeyInput] = useState<string>(() => getStoredApiKey());
  const [copiedCustomPrompt, setCopiedCustomPrompt] = useState(false);
  const [pastedJsonInput, setPastedJsonInput] = useState('');
  const [hasCustomizedPromptLangs, setHasCustomizedPromptLangs] = useState(false);
  const [promptLanguages, setPromptLanguages] = useState<Language[]>(() => [lang]);

  useEffect(() => {
    if (!hasCustomizedPromptLangs) {
      setPromptLanguages([lang]);
    }
  }, [lang, hasCustomizedPromptLangs]);

  const togglePromptLanguage = (code: Language) => {
    setHasCustomizedPromptLangs(true);
    setPromptLanguages(prev => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter(c => c !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  const constructSelectedAiPrompt = () => {
    const topicText = aiTopic.trim() || (
      lang === 'sv' ? 'Blandade allmänbildande frågor, natur, vetenskap, historia och rolig kuriosa' :
      lang === 'fr' ? 'Culture générale, nature, science, histoire et anecdotes amusantes' :
      lang === 'es' ? 'Cultura general, naturaleza, ciencia, historia y datos curiosos' :
      lang === 'de' ? 'Allgemeinwissen, Natur, Wissenschaft, Geschichte und unterhaltsame Fakten' :
      'General knowledge, nature, science, history, and fun trivia'
    );
    const langNames: Record<Language, string> = {
      sv: lang === 'sv' ? 'svenska (Swedish)' : lang === 'fr' ? 'suédois (Swedish)' : lang === 'es' ? 'sueco (Swedish)' : lang === 'de' ? 'Schwedisch (Swedish)' : 'Swedish',
      fr: lang === 'sv' ? 'franska (French)' : lang === 'fr' ? 'français (French)' : lang === 'es' ? 'francés (French)' : lang === 'de' ? 'Französisch (French)' : 'French',
      en: lang === 'sv' ? 'engelska (English)' : lang === 'fr' ? 'anglais (English)' : lang === 'es' ? 'inglés (English)' : lang === 'de' ? 'Englisch (English)' : 'English',
      es: lang === 'sv' ? 'spanska (Spanish)' : lang === 'fr' ? 'espagnol (Spanish)' : lang === 'es' ? 'español (Spanish)' : lang === 'de' ? 'Spanisch (Spanish)' : 'Spanish',
      de: lang === 'sv' ? 'tyska (German)' : lang === 'fr' ? 'allemand (German)' : lang === 'es' ? 'alemán (German)' : lang === 'de' ? 'Deutsch (German)' : 'German',
      no: lang === 'sv' ? 'norska (Norwegian)' : 'Norwegian',
      da: lang === 'sv' ? 'danska (Danish)' : 'Danish',
      fi: lang === 'sv' ? 'finska (Finnish)' : 'Finnish',
      it: lang === 'sv' ? 'italienska (Italian)' : 'Italian',
      et: lang === 'sv' ? 'estniska (Estonian)' : 'Estonian',
      lv: lang === 'sv' ? 'lettiska (Latvian)' : 'Latvian',
      lt: lang === 'sv' ? 'litauiska (Lithuanian)' : 'Lithuanian',
      uk: lang === 'sv' ? 'ukrainska (Ukrainian)' : 'Ukrainian',
      is: lang === 'sv' ? 'isländska (Icelandic)' : 'Icelandic',
      se: lang === 'sv' ? 'nordsamiska (Northern Sami)' : 'Northern Sami',
      nl: lang === 'sv' ? 'nederländska (Dutch)' : 'Dutch',
      be: lang === 'sv' ? 'flamländska/belgiska (Flemish/Belgian)' : 'Flemish/Belgian'
    };

    const primaryLang = promptLanguages[0] || lang;
    const primaryLangName = langNames[primaryLang] || 'Swedish';
    const otherLangs = promptLanguages.filter(l => l !== primaryLang);

    const ageFromNum = Number(aiKidAgeFrom) || 5;
    const ageToNum = Number(aiKidAgeTo) || 10;
    const countNum = Number(aiCount) || 5;

    let targetDesc = '';
    if (aiTarget === 'båda') {
      if (lang === 'sv') targetDesc = `${countNum} frågor för barn (passande ålder ${ageFromNum}-${ageToNum} år) OCH ${countNum} frågor för vuxna (mer utmanande).`;
      else if (lang === 'fr') targetDesc = `${countNum} questions pour enfants (âge ${ageFromNum}-${ageToNum} ans) ET ${countNum} questions pour adultes (plus exigeantes).`;
      else if (lang === 'es') targetDesc = `${countNum} preguntas para niños (edad ${ageFromNum}-${ageToNum} años) Y ${countNum} preguntas para adultos (más desafiantes).`;
      else if (lang === 'de') targetDesc = `${countNum} Fragen für Kinder (passend für ${ageFromNum}-${ageToNum} Jahre) UND ${countNum} Fragen für Erwachsene (anspruchsvoller).`;
      else targetDesc = `${countNum} questions for kids (suitable age ${ageFromNum}-${ageToNum} years) AND ${countNum} questions for adults (more challenging).`;
    } else if (aiTarget === 'barn') {
      if (lang === 'sv') targetDesc = `${countNum} frågor för barn (passande ålder ${ageFromNum}-${ageToNum} år).`;
      else if (lang === 'fr') targetDesc = `${countNum} questions pour enfants (âge ${ageFromNum}-${ageToNum} ans).`;
      else if (lang === 'es') targetDesc = `${countNum} preguntas para niños (edad ${ageFromNum}-${ageToNum} años).`;
      else if (lang === 'de') targetDesc = `${countNum} Fragen für Kinder (passend für ${ageFromNum}-${ageToNum} Jahre).`;
      else targetDesc = `${countNum} questions for kids (suitable age ${ageFromNum}-${ageToNum} years).`;
    } else {
      if (lang === 'sv') targetDesc = `${countNum} frågor för vuxna (kluriga och underhållande).`;
      else if (lang === 'fr') targetDesc = `${countNum} questions pour adultes (captivantes et amusantes).`;
      else if (lang === 'es') targetDesc = `${countNum} preguntas para adultos (desafiantes y entretenidas).`;
      else if (lang === 'de') targetDesc = `${countNum} Fragen für Erwachsene (knifflig und unterhaltsam).`;
      else targetDesc = `${countNum} questions for adults (tricky and entertaining).`;
    }

    const buildSampleQuestion = (isAdult: boolean) => {
      const qText = isAdult 
        ? (primaryLang === 'en' ? "In which year did World War I start?" : primaryLang === 'fr' ? "En quelle année la Première Guerre mondiale a-t-elle commencé ?" : primaryLang === 'es' ? "¿En qué año comenzó la Primera Guerra Mundial?" : primaryLang === 'de' ? "In welchem Jahr begann der Erste Weltkrieg?" : "Vilket år startade första världskriget?")
        : (primaryLang === 'en' ? "What is the capital of Sweden?" : primaryLang === 'fr' ? "Quelle est la capitale de la Suède ?" : primaryLang === 'es' ? "¿Cuál es la capital de Suecia?" : primaryLang === 'de' ? "Was ist die Hauptstadt von Schweden?" : "Vad heter Sveriges huvudstad?");
      const qOpts = isAdult
        ? ["1912", "1914", "1918", "1939"]
        : (primaryLang === 'en' ? ["Stockholm", "Gothenburg", "Malmo"] : ["Stockholm", "Göteborg", "Malmö"]);
      const correct = isAdult ? 1 : 0;

      const base: any = {
        text: qText,
        options: qOpts,
        correctAnswer: correct,
        originalLanguage: primaryLang
      };

      if (aiGeotagLandmarks) {
        base.latitude = isAdult ? 59.3268 : 59.3293;
        base.longitude = isAdult ? 18.0717 : 18.0686;
        base.locationName = isAdult ? "Gamla Stan" : "Stockholms Slott";
      }

      if (aiIncludeImages) {
        base.imageUrl = "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80";
        base.optionImages = [
          "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=400&q=80",
          "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=400&q=80",
          "https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80"
        ];
      }

      if (otherLangs.length > 0) {
        const transObj: Record<string, any> = {};
        // Sample with up to 3 requested translation languages to keep example clean
        const sampleLangs = otherLangs.slice(0, 3);
        sampleLangs.forEach(l => {
          if (l === 'en') {
            transObj.en = {
              text: isAdult ? "In which year did World War I start?" : "What is the capital of Sweden?",
              options: isAdult ? ["1912", "1914", "1918", "1939"] : ["Stockholm", "Gothenburg", "Malmo"]
            };
          } else if (l === 'fr') {
            transObj.fr = {
              text: isAdult ? "En quelle année la Première Guerre mondiale a-t-elle commencé ?" : "Quelle est la capitale de la Suède ?",
              options: isAdult ? ["1912", "1914", "1918", "1939"] : ["Stockholm", "Göteborg", "Malmö"]
            };
          } else if (l === 'de') {
            transObj.de = {
              text: isAdult ? "In welchem Jahr begann der Erste Weltkrieg?" : "Was ist die Hauptstadt von Schweden?",
              options: isAdult ? ["1912", "1914", "1918", "1939"] : ["Stockholm", "Göteborg", "Malmö"]
            };
          } else if (l === 'es') {
            transObj.es = {
              text: isAdult ? "¿En qué año comenzó la Primera Guerra Mundial?" : "¿Cuál es la capital de Suecia?",
              options: isAdult ? ["1912", "1914", "1918", "1939"] : ["Estocolmo", "Gotemburgo", "Malmo"]
            };
          } else if (l === 'sv') {
            transObj.sv = {
              text: isAdult ? "Vilket år startade första världskriget?" : "Vad heter Sveriges huvudstad?",
              options: isAdult ? ["1912", "1914", "1918", "1939"] : ["Stockholm", "Göteborg", "Malmö"]
            };
          } else {
            transObj[l] = {
              text: isAdult ? `[${langNames[l] || l}] Question text...` : `[${langNames[l] || l}] Question text...`,
              options: isAdult ? ["Opt 1", "Opt 2", "Opt 3", "Opt 4"] : ["Opt 1", "Opt 2", "Opt 3"]
            };
          }
        });
        base.translations = transObj;
      }

      return base;
    };

    let exampleJson = '';
    if (aiTarget === 'båda') {
      exampleJson = JSON.stringify({
        barnQuestions: [buildSampleQuestion(false)],
        vuxenQuestions: [buildSampleQuestion(true)]
      }, null, 2);
    } else if (aiTarget === 'barn') {
      exampleJson = JSON.stringify({
        barnQuestions: [buildSampleQuestion(false)]
      }, null, 2);
    } else {
      exampleJson = JSON.stringify({
        vuxenQuestions: [buildSampleQuestion(true)]
      }, null, 2);
    }

    if (lang === 'en') {
      let langReqs = `1. Primary language: ${primaryLangName}. All root fields ("text" and "options") MUST be in this language. Set "originalLanguage": "${primaryLang}".\n`;
      if (otherLangs.length > 0) {
        const otherLangDesc = otherLangs.map(l => `"${l}" (${langNames[l]})`).join(', ');
        langReqs += `2. TRANSLATIONS: Each question MUST include a "translations" object with fully translated "text" and "options" for the following language codes: ${otherLangDesc}. Do NOT duplicate root language in translations.\n`;
      }

      return `Create a walk-quiz/trivia set about the topic: "${topicText}".

REQUIREMENTS:
${langReqs}${otherLangs.length > 0 ? '3' : '2'}. Questions to generate: ${targetDesc}
${otherLangs.length > 0 ? '4' : '3'}. Answer options: Anywhere between 2 and 5 multiple choice options per question in the "options" array (questions can have 2, 3, 4, or 5 options).
${otherLangs.length > 0 ? '5' : '4'}. "correctAnswer" is a 0-based integer index for the correct option (0 for 1st option, 1 for 2nd, 2 for 3rd, 3 for 4th, 4 for 5th).
${otherLangs.length > 0 ? '6' : '5'}. Output format: Return ONLY valid JSON matching the template below without markdown code fences or explanatory text.

EXACT JSON TEMPLATE:
${exampleJson}`;
    } else if (lang === 'fr') {
      let langReqs = `1. Langue principale : ${primaryLangName}. Tous les champs principaux ("text" et "options") DOIVENT être dans cette langue. Indiquez "originalLanguage": "${primaryLang}".\n`;
      if (otherLangs.length > 0) {
        const otherLangDesc = otherLangs.map(l => `"${l}" (${langNames[l]})`).join(', ');
        langReqs += `2. TRADUCTIONS : Chaque question DOIT inclure un objet "translations" avec la "text" et les "options" entièrement traduites pour les codes : ${otherLangDesc}.\n`;
      }

      return `Créez un jeu de cartes/quiz sur le thème : "${topicText}".

EXIGENCES :
${langReqs}${otherLangs.length > 0 ? '3' : '2'}. Nombre de questions : ${targetDesc}
${otherLangs.length > 0 ? '4' : '3'}. Options de réponse : Entre 2 et 5 options au choix par question dans le tableau "options" (2, 3, 4 ou 5 options).
${otherLangs.length > 0 ? '5' : '4'}. "correctAnswer" est un entier basé sur 0 indiquant la bonne réponse (0 pour la 1ère option, 1 pour la 2ème, 2 pour la 3ème, etc.).
${otherLangs.length > 0 ? '6' : '5'}. Format de sortie : Renvoyez UNIQUEMENT un JSON valide selon le modèle ci-dessous.

MODÈLE JSON :
${exampleJson}`;
    } else if (lang === 'es') {
      let langReqs = `1. Idioma principal: ${primaryLangName}. Todos los campos principales ("text" y "options") DEBEN estar en este idioma. Establece "originalLanguage": "${primaryLang}".\n`;
      if (otherLangs.length > 0) {
        const otherLangDesc = otherLangs.map(l => `"${l}" (${langNames[l]})`).join(', ');
        langReqs += `2. TRADUCCIONES: Cada pregunta DEBE incluir un objeto "translations" con "text" y "options" traducidos para: ${otherLangDesc}.\n`;
      }

      return `Crea un cuestionario sobre el tema: "${topicText}".

REQUISITOS:
${langReqs}${otherLangs.length > 0 ? '3' : '2'}. Cantidad de preguntas: ${targetDesc}
${otherLangs.length > 0 ? '4' : '3'}. Opciones de respuesta: Entre 2 y 5 opciones por pregunta en el arreglo "options" (2, 3, 4 o 5 opciones).
${otherLangs.length > 0 ? '5' : '4'}. "correctAnswer" es un número entero con índice base 0 para la opción correcta (0 para la 1ª opción, 1 para la 2ª, etc.).
${otherLangs.length > 0 ? '6' : '5'}. Formato de salida: Devuelve ÚNICAMENTE un JSON válido según la plantilla.

PLANTILLA JSON:
${exampleJson}`;
    } else if (lang === 'de') {
      let langReqs = `1. Hauptsprache: ${primaryLangName}. Alle Hauptfelder ("text" und "options") MÜSSEN in dieser Sprache sein. Setze "originalLanguage": "${primaryLang}".\n`;
      if (otherLangs.length > 0) {
        const otherLangDesc = otherLangs.map(l => `"${l}" (${langNames[l]})`).join(', ');
        langReqs += `2. ÜBERSETZUNGEN: Jede Frage MUSS ein "translations"-Objekt mit übersetztem "text" und "options" für folgende Sprachcodes enthalten: ${otherLangDesc}.\n`;
      }

      return `Erstelle ein Quiz/Trivia-Set zum Thema: "${topicText}".

ANFORDERUNGEN:
${langReqs}${otherLangs.length > 0 ? '3' : '2'}. Fragen: ${targetDesc}
${otherLangs.length > 0 ? '4' : '3'}. Antwortoptionen: Frei wählbar zwischen 2 und 5 Antwortmöglichkeiten pro Frage im "options"-Array (2, 3, 4 oder 5 Optionen).
${otherLangs.length > 0 ? '5' : '4'}. "correctAnswer" ist eine 0-basierte Ganzzahl für die richtige Option (0 für die 1. Option, 1 für die 2., etc.).
${otherLangs.length > 0 ? '6' : '5'}. Ausgabeformat: Antworte AUSSCHLIESSLICH mit gültigem JSON gemäß Vorlage.

EXAKTE JSON-VORLAGE:
${exampleJson}`;
    } else {
      let langReqs = `1. Huvudsakligt språk: ${primaryLangName}. Alla grundfält ("text" och "options") MÅSTE vara på detta språk. Sätt "originalLanguage": "${primaryLang}".\n`;
      if (otherLangs.length > 0) {
        const otherLangDesc = otherLangs.map(l => `"${l}" (${langNames[l]})`).join(', ');
        langReqs += `2. ÖVERSÄTTNINGAR: Varje fråga MÅSTE inkludera ett "translations"-objekt med fullständigt översatt "text" och "options" för följande språkkoder: ${otherLangDesc}. (Inkludera inte "${primaryLang}" i translations-objektet).\n`;
      }

      return `Skapa ett tipspromenad-quiz om ämnet/temat: "${topicText}".

KRAV:
${langReqs}${otherLangs.length > 0 ? '3' : '2'}. Antal frågor: ${targetDesc}
${otherLangs.length > 0 ? '4' : '3'}. Svarsalternativ: Valfritt mellan 2 och 5 svarsalternativ per fråga i "options"-listan (frågor kan ha 2, 3, 4 eller 5 alternativ).
${otherLangs.length > 0 ? '5' : '4'}. "correctAnswer": 0-baserat heltal för indexet av det rätta alternativet (0 för 1:a alternativet, 1 för 2:a, 2 för 3:e, 3 för 4:e, eller 4 för 5:e alternativet).
${otherLangs.length > 0 ? '6' : '5'}. Format: Svara ENBART med ett giltigt JSON-objekt enligt mallen nedan utan förklarande text före eller efter.

EXAKT JSON-MALL ATT RETURNERA:
${exampleJson}`;
    }
  };

  const copyCustomPromptToClipboard = () => {
    const promptText = constructSelectedAiPrompt();
    navigator.clipboard.writeText(promptText).then(() => {
      setCopiedCustomPrompt(true);
      setTimeout(() => setCopiedCustomPrompt(false), 4000);
    });
  };

  const robustParseQuizJson = (rawInput: string): any => {
    if (!rawInput || typeof rawInput !== 'string') return null;
    let clean = rawInput.trim();

    // 1. Strip markdown fences
    clean = clean.replace(/```(?:json|text|markdown)?\s*/gi, '').replace(/```\s*$/gi, '').replace(/```/g, '').trim();

    // 2. Extract substring between outer { } or [ ] if surrounded by explanatory text
    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    let startIdx = -1;
    let endIdx = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      endIdx = clean.lastIndexOf('}');
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endIdx = clean.lastIndexOf(']');
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      clean = clean.substring(startIdx, endIdx + 1);
    }

    // 3. Clean trailing commas in objects and arrays
    const sanitized = clean.replace(/,\s*([\]}])/g, '$1');

    try {
      return JSON.parse(sanitized);
    } catch (e1) {
      try {
        return JSON.parse(clean);
      } catch (e2) {
        // 4. Try repairing truncated JSON (if AI stopped due to token limit)
        try {
          let repaired = sanitized;
          const openBraces = (repaired.match(/{/g) || []).length;
          const closeBraces = (repaired.match(/}/g) || []).length;
          const openBrackets = (repaired.match(/\[/g) || []).length;
          const closeBrackets = (repaired.match(/\]/g) || []).length;

          // Remove trailing incomplete property if cut off
          repaired = repaired.replace(/,\s*("[^"]*"?\s*:?\s*[^,}\]]*)$/, '');
          
          for (let i = 0; i < (openBrackets - closeBrackets); i++) repaired += ']';
          for (let i = 0; i < (openBraces - closeBraces); i++) repaired += '}';
          return JSON.parse(repaired);
        } catch (e3) {
          return null;
        }
      }
    }
  };

  const formatImportedQuestion = (q: any, idx: number): Question => {
    const qId = q.id || crypto.randomUUID();
    const origLang = (q.originalLanguage as Language) || lang;
    const text = q.text || q.question || `${t(lang, 'question')} ${idx + 1}`;
    const options = Array.isArray(q.options) && q.options.length > 0 
      ? q.options.map(String) 
      : [t(lang, 'defaultOption1'), t(lang, 'defaultOptionX'), t(lang, 'defaultOption2')];

    let translationsObj: Record<string, { text: string; options: string[] }> | undefined = undefined;
    if (q.translations && typeof q.translations === 'object') {
      translationsObj = {};
      Object.keys(q.translations).forEach((tLang) => {
        const item = q.translations[tLang];
        if (item && typeof item === 'object' && item.text) {
          const transText = String(item.text);
          const transOpts = Array.isArray(item.options) ? item.options.map(String) : options;
          translationsObj![tLang] = { text: transText, options: transOpts };
          
          registerQuestionTranslation(qId, origLang, text, tLang as Language, { text: transText, options: transOpts });
        }
      });
    }

    let locationObj: Location | undefined = undefined;
    if (q.location && typeof q.location.lat === 'number' && typeof q.location.lng === 'number') {
      locationObj = {
        lat: Number(q.location.lat),
        lng: Number(q.location.lng),
        name: q.location.name ? String(q.location.name) : undefined,
        hideOnMap: !!q.location.hideOnMap
      };
    } else if (typeof q.latitude === 'number' && typeof q.longitude === 'number' && (Math.abs(q.latitude) > 0.0001 || Math.abs(q.longitude) > 0.0001)) {
      locationObj = {
        lat: Number(q.latitude),
        lng: Number(q.longitude),
        name: q.locationName ? String(q.locationName) : (q.name ? String(q.name) : undefined)
      };
    } else if (typeof q.lat === 'number' && typeof q.lng === 'number' && (Math.abs(q.lat) > 0.0001 || Math.abs(q.lng) > 0.0001)) {
      locationObj = {
        lat: Number(q.lat),
        lng: Number(q.lng),
        name: q.locationName ? String(q.locationName) : (q.name ? String(q.name) : undefined)
      };
    }

    const imageUrl = typeof q.imageUrl === 'string' && q.imageUrl.trim() ? q.imageUrl.trim() : (typeof q.image === 'string' && q.image.trim() ? q.image.trim() : undefined);
    const optionImages = Array.isArray(q.optionImages) ? q.optionImages.map((img: any) => typeof img === 'string' && img.trim() ? img.trim() : undefined) : undefined;

    return {
      id: qId,
      text,
      imageUrl,
      type: (q.type === 'points' || q.type === 'text' || q.type === 'options') ? q.type : 'options',
      options,
      optionImages,
      correctAnswers: Array.isArray(q.correctAnswers) ? q.correctAnswers : [typeof q.correctAnswer === 'number' ? q.correctAnswer : 0],
      correctTextAnswer: typeof q.correctTextAnswer === 'string' ? q.correctTextAnswer : undefined,
      acceptedTextAnswers: Array.isArray(q.acceptedTextAnswers) ? q.acceptedTextAnswers.map(String) : undefined,
      maxPoints: typeof q.maxPoints === 'number' ? q.maxPoints : undefined,
      followUpQuestionId: typeof q.followUpQuestionId === 'string' ? q.followUpQuestionId : undefined,
      followUpMode: q.followUpMode === 'correct' || q.followUpMode === 'incorrect' ? q.followUpMode : 'always',
      originalLanguage: origLang,
      translations: translationsObj,
      location: locationObj,
      hideLocationOnMap: !!q.hideLocationOnMap
    };
  };

  const handleImportPastedJson = async (jsonStr: string) => {
    try {
      if (!jsonStr || !jsonStr.trim()) {
        alert(t(lang, 'couldNotReadInputAlert'));
        return;
      }
      await processImportConfig(jsonStr);
      setPastedJsonInput('');
      setShowSettingsModal(false);
    } catch (e) {
      alert(t(lang, 'couldNotReadInputAlert'));
    }
  };

  useEffect(() => {
    const activePartId = selectedParticipantId || (participants.length === 1 ? participants[0]?.id : null);
    if (activePartId && selectedQuestionIndex !== null) {
      const participant = participants.find(p => p.id === activePartId);
      if (participant) {
        const questions = participant.type === 'barn' ? quizConfig.barnQuestions : quizConfig.vuxenQuestions;
        const q = questions[selectedQuestionIndex];
        if (q && q.type === 'points') {
          const ans = answers.find(a => a.participantId === activePartId && a.questionIndex === selectedQuestionIndex);
          setPointsInputValue(typeof ans?.pointsScored === 'number' ? ans.pointsScored : 0);
        } else if (q && q.type === 'text') {
          const ans = answers.find(a => a.participantId === activePartId && a.questionIndex === selectedQuestionIndex);
          setTextInputValue(ans?.textAnswer || '');
        }
      }
    }
  }, [selectedParticipantId, selectedQuestionIndex, participants, quizConfig, answers]);

  const parseQuizText = (text: string): Question[] => {
    // Strip markdown code fences if present
    let cleanedText = text
      .replace(/^```(?:json|text|markdown)?\s*/gm, '')
      .replace(/```\s*$/gm, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    const rawLines = cleanedText.split('\n').map(l => l.trim().replace(/\u00A0/g, ' '));
    
    const questions: {
      id: string;
      num: number;
      category: string;
      text: string;
      options: string[];
      correctAnswers?: number[];
    }[] = [];

    let currentQuestion: {
      id: string;
      num: number;
      category: string;
      text: string;
      options: string[];
      correctAnswers?: number[];
    } | null = null;

    const finalizeCurrentQuestion = () => {
      if (!currentQuestion) return;
      if (!currentQuestion.text || currentQuestion.text.trim().length === 0) {
        currentQuestion = null;
        return;
      }
      if (!currentQuestion.correctAnswers || currentQuestion.correctAnswers.length === 0) {
        currentQuestion.correctAnswers = [0];
      }
      if (!currentQuestion.options || currentQuestion.options.length === 0) {
        currentQuestion.options = ['Svar 1', 'Svar X', 'Svar 2'];
      }
      questions.push({
        id: currentQuestion.id || crypto.randomUUID(),
        num: currentQuestion.num,
        category: currentQuestion.category,
        text: currentQuestion.text.trim(),
        options: currentQuestion.options,
        correctAnswers: currentQuestion.correctAnswers
      });
      currentQuestion = null;
    };

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (!line) continue;

      // Check for inline answer line ("Svar: A", "Rätt svar: 2", "Facit: C")
      const inlineAnswerMatch = line.match(/^(?:rätt\s*)?(?:svar|facit)\s*[\:\-\=]\s*(.+)$/i);
      if (inlineAnswerMatch && currentQuestion) {
        const ansRaw = inlineAnswerMatch[1].trim().replace(/[\)\.]/g, '').toUpperCase();
        let ansIdx = -1;

        if (/^[A-D]$/.test(ansRaw)) {
          ansIdx = ansRaw.charCodeAt(0) - 65;
        } else if (/^[1X2]$/.test(ansRaw)) {
          ansIdx = ansRaw === '1' ? 0 : ansRaw === 'X' ? 1 : 2;
        } else if (/^\d+$/.test(ansRaw)) {
          const num = parseInt(ansRaw);
          if (num >= 1 && num <= 10) ansIdx = num - 1;
        }

        if (ansIdx < 0 || ansIdx >= currentQuestion.options.length) {
          const foundIdx = currentQuestion.options.findIndex(
            (opt: string) => opt.toLowerCase() === inlineAnswerMatch[1].trim().toLowerCase()
          );
          if (foundIdx >= 0) ansIdx = foundIdx;
        }

        if (ansIdx >= 0) {
          if (!currentQuestion.correctAnswers) currentQuestion.correctAnswers = [];
          if (!currentQuestion.correctAnswers.includes(ansIdx)) {
            currentQuestion.correctAnswers.push(ansIdx);
          }
        }
        continue;
      }

      // Check for Option match (A), A., A:, A -, 1), 1., 1:, 1 -)
      const optionMatch = line.match(/^([A-D1-4IX2])[\.\)\:\-\/]\s*(.+)$/i);

      // Check for Question start
      const isExplicitFraga = /^fråga\s*\d*/i.test(line);
      const numberedQuestionMatch = line.match(/^(\d+)[\.\)]\s+(.+)$/);

      let isNewQuestion = false;

      if (!currentQuestion) {
        isNewQuestion = true;
      } else if (isExplicitFraga) {
        isNewQuestion = true;
      } else if (numberedQuestionMatch) {
        if (currentQuestion.options.length > 0 || (currentQuestion.correctAnswers && currentQuestion.correctAnswers.length > 0) || line.endsWith('?')) {
          isNewQuestion = true;
        }
      } else if (currentQuestion.options.length >= 2 || (currentQuestion.correctAnswers && currentQuestion.correctAnswers.length > 0)) {
        if (!optionMatch && !inlineAnswerMatch) {
          isNewQuestion = true;
        }
      }

      if (isNewQuestion) {
        finalizeCurrentQuestion();

        const categoryMatch = line.match(/\(([^)]+)\)/);
        let qText = line.replace(/^fråga\s*\d*\s*[\:\-\)]?\s*/i, '').replace(/^\d+[\.\)]\s*/, '');
        if (categoryMatch) {
          qText = qText.replace(/\([^)]+\)/, '').trim();
        }

        currentQuestion = {
          num: questions.length + 1,
          category: categoryMatch ? categoryMatch[1] : '',
          text: qText,
          options: [],
          id: crypto.randomUUID()
        };
        continue;
      }

      // Option match
      if (optionMatch && currentQuestion) {
        currentQuestion.options.push(optionMatch[2].trim());
        continue;
      }

      // Continuation of question text
      if (currentQuestion && currentQuestion.options.length === 0) {
        currentQuestion.text += ' ' + line;
      }
    }

    finalizeCurrentQuestion();

    return questions.map(q => ({
      id: q.id,
      text: q.text + (q.category ? ` (${q.category})` : ''),
      options: q.options,
      correctAnswers: q.correctAnswers ?? [0]
    }));
  };

  // Persist data to "cache" (localStorage)
  useEffect(() => {
    if (participants.length === 0) {
      setParticipants([{ id: 'default-du', uniqueId: DEFAULT_PARTICIPANT_UNIQUE_ID, name: t(lang, 'you'), type: 'vuxen' }]);
    } else {
      localStorage.setItem(STORAGE_KEY_PARTICIPANTS, JSON.stringify(participants));
    }
  }, [participants, lang]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(quizConfig));
  }, [quizConfig]);

  useEffect(() => {
    if (!isAdmin || !quizConfig.quizId) return;

    const saveTimeout = window.setTimeout(() => {
      saveQuizSessionToIndexedDB(quizConfig, { participants, answers })
        .then(() => refreshSavedQuizzes())
        .catch((error) => console.warn('Could not save quiz session to IndexedDB:', error));
    }, 500);

    return () => window.clearTimeout(saveTimeout);
  }, [isAdmin, quizConfig, participants, answers]);

  useEffect(() => {
    if (view === 'config') {
      setNewQuizPassword(quizConfig.password || '');
      setNewQuizTitle(quizConfig.title || '');
      setNewQuizLogoUrl(quizConfig.logoUrl || '');
      setNewGeotagDistance(quizConfig.geotagUnlockDistance || 20);
    }
  }, [view, quizConfig]);

  const totalQuestions = useMemo(() => {
    return Math.max(quizConfig.barnQuestions.length, quizConfig.vuxenQuestions.length, 1);
  }, [quizConfig]);

  const followUpQuestionIds = useMemo(() => new Set(
    [...quizConfig.barnQuestions, ...quizConfig.vuxenQuestions]
      .map(question => question.followUpQuestionId)
      .filter((id): id is string => !!id)
  ), [quizConfig]);

  const participantTypes = new Set(participants.map(participant => participant.type));
  const quizQuestionType = participantTypes.size === 1
    ? participants[0]?.type
    : selectedParticipantId
      ? participants.find(participant => participant.id === selectedParticipantId)?.type
      : null;
  const quizQuestionPool = quizQuestionType === 'barn'
    ? quizConfig.barnQuestions
    : quizQuestionType === 'vuxen'
      ? quizConfig.vuxenQuestions
      : null;

  const visibleQuestionIndexes = useMemo(() => (
    Array.from({ length: totalQuestions }, (_, index) => index)
      .filter(index => {
        const question = quizQuestionPool
          ? quizQuestionPool[index]
          : quizConfig.barnQuestions[index] || quizConfig.vuxenQuestions[index];
        const categoryFollowUpIds = quizQuestionPool
          ? new Set(quizQuestionPool
            .map(candidate => candidate.followUpQuestionId)
            .filter((id): id is string => !!id))
          : followUpQuestionIds;
        return !!question && !categoryFollowUpIds.has(question.id);
      })
  ), [followUpQuestionIds, quizConfig, quizQuestionPool, totalQuestions]);

  const visibleQuestionCount = visibleQuestionIndexes.length;

  const editorQuestionRows = useMemo(() => {
    const questions = editingQuestionsCategory === 'barn'
      ? quizConfig.barnQuestions
      : quizConfig.vuxenQuestions;
    const followUpTargetIds = new Set(
      questions
        .map(question => question.followUpQuestionId)
        .filter((id): id is string => !!id)
    );
    const childrenByParentId = new globalThis.Map<string, Question[]>();

    for (const question of questions) {
      if (!question.followUpQuestionId) continue;
      const children = childrenByParentId.get(question.id) || [];
      const child = questions.find(candidate => candidate.id === question.followUpQuestionId);
      if (child) children.push(child);
      childrenByParentId.set(question.id, children);
    }

    const mainQuestions = questions.filter(question => !followUpTargetIds.has(question.id));
    const rows: {
      question: Question;
      label: string;
      isFollowUp: boolean;
      parentQuestionId?: string;
      rootQuestionId: string;
      groupIndex: number;
      totalGroups: number;
      subIndex: number;
      totalSubInGroup: number;
    }[] = [];

    mainQuestions.forEach((rootQ, rootIdx) => {
      // Calculate total chained followups under this root
      const groupChildren: Question[] = [];
      const collectChildren = (q: Question, visited: Set<string>) => {
        const children = childrenByParentId.get(q.id) || [];
        for (const child of children) {
          if (!visited.has(child.id)) {
            visited.add(child.id);
            groupChildren.push(child);
            collectChildren(child, visited);
          }
        }
      };
      collectChildren(rootQ, new Set([rootQ.id]));

      let currentChildCounter = 0;
      const addRowAndChildren = (
        question: Question,
        label: string,
        isFollowUp: boolean,
        visited: Set<string>,
        parentQuestionId?: string,
        subIndex: number = 0
      ) => {
        if (visited.has(question.id)) return;
        const nextVisited = new Set(visited).add(question.id);
        rows.push({
          question,
          label,
          isFollowUp,
          parentQuestionId,
          rootQuestionId: rootQ.id,
          groupIndex: rootIdx,
          totalGroups: mainQuestions.length,
          subIndex,
          totalSubInGroup: groupChildren.length
        });
        (childrenByParentId.get(question.id) || []).forEach((child, childIndex) => {
          currentChildCounter++;
          addRowAndChildren(child, `${label}:${childIndex + 1}`, true, nextVisited, question.id, currentChildCounter);
        });
      };

      addRowAndChildren(rootQ, `${rootIdx + 1}`, false, new Set(), undefined, 0);
    });

    return rows;
  }, [editingQuestionsCategory, quizConfig]);

  const addParticipant = (name: string, type: UserType) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (isReservedParticipantName(trimmedName)) {
      alert(t(lang, 'reservedParticipantNameError', { name: trimmedName }));
      return;
    }
    const newParticipant: Participant = {
      id: crypto.randomUUID(),
      uniqueId: crypto.randomUUID(),
      name: trimmedName,
      type
    };
    setParticipants([...participants, newParticipant]);
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
    setAnswers(answers.filter(a => a.participantId !== id));
  };

  const updateParticipantName = (id: string, newName: string) => {
    // Just update without validation - validation happens on blur
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const validateAndFinalizeParticipantName = (id: string) => {
    const participant = participants.find(p => p.id === id);
    if (!participant) return;

    const trimmedName = participant.name.trim();
    // Skip name validation for the default participant (allows international names like "Io", "Mina", etc.)
    if (trimmedName && participant.uniqueId !== DEFAULT_PARTICIPANT_UNIQUE_ID && isReservedParticipantName(trimmedName)) {
      alert(t(lang, 'reservedParticipantNameError', { name: trimmedName }));
      setParticipants(prev => prev.map(p => p.id === id ? { ...p, name: '' } : p));
      return;
    }
    setEditingParticipantId(null);
  };

  const isQuestionFullyAnswered = (questionIndex: number) => {
    return participants.length > 0 && participants.every(p => {
      const pQuestions = p.type === 'barn' ? quizConfig.barnQuestions : quizConfig.vuxenQuestions;
      if (!pQuestions[questionIndex]) return true;
      return answers.some(a => a.participantId === p.id && a.questionIndex === questionIndex);
    });
  };

  const submitAnswer = (answerIndex: number) => {
    const activePartId = selectedParticipantId || (participants.length === 1 ? participants[0]?.id : null);
    if (!activePartId || selectedQuestionIndex === null) return;

    // Check if already answered in this quiz run
    const alreadyAnswered = answers.some(a => a.participantId === activePartId && a.questionIndex === selectedQuestionIndex);
    if (alreadyAnswered) return;

    const participant = participants.find(p => p.id === activePartId);
    if (!participant) return;

    const questions = participant.type === 'barn' ? quizConfig.barnQuestions : quizConfig.vuxenQuestions;
    const question = questions[selectedQuestionIndex];
    
    const isCorrect = (question?.correctAnswers || []).includes(answerIndex);

    const newAnswer: AnswerRecord = {
      participantId: activePartId,
      questionIndex: selectedQuestionIndex,
      answerIndex,
      isCorrect,
      timestamp: Date.now()
    };

    setAnswers([...answers, newAnswer]);

    const openedFollowUp = openFollowUpQuestion(question, activePartId, isCorrect);
    if (!openedFollowUp) {
      const allAnswered = isQuestionFullyAnswered(selectedQuestionIndex);
      if (allAnswered) {
        setSelectedParticipantId(participants.length === 1 ? participants[0].id : null);
        setSelectedQuestionIndex(null);
      } else {
        setSelectedParticipantId(null);
      }
    }
  };

  const submitPointsAnswer = (pointsScored: number) => {
    const activePartId = selectedParticipantId || (participants.length === 1 ? participants[0]?.id : null);
    if (!activePartId || selectedQuestionIndex === null) return;

    // Check if already answered in this quiz run
    const alreadyAnswered = answers.some(a => a.participantId === activePartId && a.questionIndex === selectedQuestionIndex);
    if (alreadyAnswered) return;

    const participant = participants.find(p => p.id === activePartId);
    if (!participant) return;
    const questions = participant.type === 'barn' ? quizConfig.barnQuestions : quizConfig.vuxenQuestions;
    const question = questions[selectedQuestionIndex];
    if (!question) return;

    const newAnswer: AnswerRecord = {
      participantId: activePartId,
      questionIndex: selectedQuestionIndex,
      pointsScored: Math.max(0, pointsScored),
      timestamp: Date.now()
    };

    setAnswers([...answers, newAnswer]);

    const openedFollowUp = openFollowUpQuestion(question, activePartId);
    if (!openedFollowUp) {
      const allAnswered = isQuestionFullyAnswered(selectedQuestionIndex);
      if (allAnswered) {
        setSelectedParticipantId(participants.length === 1 ? participants[0].id : null);
        setSelectedQuestionIndex(null);
      } else {
        setSelectedParticipantId(null);
      }
    }
  };

  const submitTextAnswer = (rawUserText: string) => {
    const activePartId = selectedParticipantId || (participants.length === 1 ? participants[0]?.id : null);
    if (!activePartId || selectedQuestionIndex === null) return;

    // Check if already answered in this quiz run
    const alreadyAnswered = answers.some(a => a.participantId === activePartId && a.questionIndex === selectedQuestionIndex);
    if (alreadyAnswered) return;

    const participant = participants.find(p => p.id === activePartId);
    if (!participant) return;

    const questions = participant.type === 'barn' ? quizConfig.barnQuestions : quizConfig.vuxenQuestions;
    const question = questions[selectedQuestionIndex];
    if (!question) return;

    const targetLang = question.originalLanguage || lang;
    const evalResult = evaluateTextAnswer(
      rawUserText,
      question.correctTextAnswer || '',
      question.acceptedTextAnswers || [],
      targetLang
    );

    const targetPartId = activePartId;
    const targetQIdx = selectedQuestionIndex;

    const newAnswer: AnswerRecord = {
      participantId: targetPartId,
      questionIndex: targetQIdx,
      textAnswer: rawUserText.trim(),
      isCorrect: evalResult.isCorrect,
      timestamp: Date.now()
    };

    setAnswers([...answers, newAnswer]);

    // Optional AI Linguistic Engine check when online with Gemini key if initial offline test was inconclusive
    const storedApiKey = getStoredApiKey();
    if (!evalResult.isCorrect && storedApiKey && typeof navigator !== 'undefined' && navigator.onLine) {
      validateTextAnswerWithGemini({
        userInput: rawUserText,
        targetWord: question.correctTextAnswer || '',
        acceptedAlternatives: question.acceptedTextAnswers || [],
        language: targetLang,
        apiKey: storedApiKey
      }).then(aiResult => {
        if (aiResult.match) {
          setAnswers(prev => prev.map(a => 
            (a.participantId === targetPartId && a.questionIndex === targetQIdx)
              ? { ...a, isCorrect: true }
              : a
          ));
        }
      }).catch(() => {
        // Silently preserve offline engine result on network/API errors
      });
    }

    const openedFollowUp = openFollowUpQuestion(question, targetPartId, evalResult.isCorrect);
    if (!openedFollowUp) {
      const allAnswered = isQuestionFullyAnswered(selectedQuestionIndex);
      if (allAnswered) {
        setSelectedParticipantId(participants.length === 1 ? participants[0].id : null);
        setSelectedQuestionIndex(null);
      } else {
        setSelectedParticipantId(null);
      }
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const processImportConfig = async (rawInput: string) => {
    try {
      // Clean markdown code blocks if wrapped
      let cleanInput = rawInput
        .replace(/^```(?:json|text|markdown)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      // Check if user provided a direct URL to a quiz file or manifest
      if ((cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) && !cleanInput.includes('quiz=') && !cleanInput.includes('z=')) {
        try {
          const fetchedContent = await fetchWithCorsFallback(cleanInput, false);
          if (fetchedContent && typeof fetchedContent === 'string' && fetchedContent.trim()) {
            cleanInput = fetchedContent.trim();
          }
        } catch (urlErr: any) {
          console.warn('Failed to fetch URL directly in processImportConfig:', urlErr);
          throw new Error(urlErr.message || 'Kunde inte hämta filen från angiven webbadress.');
        }
      }

      // Check for compressed URL format or code (e.g. ?quiz=..., #quiz=..., #z=..., ?z=..., or raw compressed string)
      let compressedCode = '';
      if (cleanInput.includes('quiz=')) {
        const match = cleanInput.match(/[?#&]quiz=([^&#\s]+)/i);
        if (match && match[1]) {
          compressedCode = decodeURIComponent(match[1]);
        }
      } else if (cleanInput.includes('z=')) {
        const match = cleanInput.match(/[?#&]?z=([^&#\s]+)/i);
        if (match && match[1]) {
          compressedCode = match[1];
        } else if (cleanInput.toLowerCase().startsWith('z=')) {
          compressedCode = cleanInput;
        }
      } else if (cleanInput.includes('q=')) {
        const match = cleanInput.match(/[?#&]?q=([^&#\s]+)/i);
        if (match && match[1]) {
          compressedCode = match[1];
        }
      } else if (cleanInput.startsWith('#z=') || cleanInput.startsWith('#Z=')) {
        compressedCode = cleanInput.slice(1);
      }

      if (compressedCode) {
        const decompressed = decompressQuizFromUrlCode(compressedCode);
        if (decompressed) {
          const validation = validateQuizConfig(decompressed);
          if (!validation.valid) throw new Error(validation.error);
          let importedQuiz = ensureQuizId(decompressed);
          importedQuiz = { ...importedQuiz, logoUrl: await cacheLogoAsDataUrl(importedQuiz.logoUrl) };
          await autoSaveQuizToIndexedDBIfNew(importedQuiz);
          setQuizConfig(importedQuiz);
          localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(importedQuiz));
          setShowConfigInput(false);
          setConfigJsonInput('');
          alert(t(lang, 'importSuccess'));
          return;
        }
      }

      if (cleanInput.toLowerCase().startsWith('qps=')) {
        const encryptedPayload = cleanInput.slice(4);
        const decompressed = xorDecrypt(encryptedPayload, '$');
        const payloadText = LZString.decompressFromEncodedURIComponent(decompressed);
        if (payloadText) {
          try {
            const payload = JSON.parse(payloadText);
            if (payload && payload.schema === 'family-quiz-participant-answers-v1') {
              const incomingParticipants: Participant[] = Array.isArray(payload.participants) ? payload.participants : [];
              const incomingAnswers: AnswerRecord[] = Array.isArray(payload.answers) ? payload.answers : [];

              if (incomingParticipants.length === 0 && incomingAnswers.length === 0) {
                throw new Error('No participant payload data');
              }

              const nameMap = new Map<string, string>();
              const nextParticipants = [...participants];

              for (const participant of nextParticipants) {
                const key = `${normalizeParticipantNameForCompare(participant.name)}|${participant.type}`;
                if (!nameMap.has(key)) nameMap.set(key, participant.id);
              }

              for (const incoming of incomingParticipants) {
                const key = `${normalizeParticipantNameForCompare(incoming.name)}|${incoming.type}`;
                const existingId = nameMap.get(key);
                if (existingId) {
                  const exportedAnswers = incomingAnswers.filter(a => a.participantId === incoming.id);
                  for (const answer of exportedAnswers) {
                    const existingAnswerIndex = answers.findIndex(a => a.participantId === existingId && a.questionIndex === answer.questionIndex);
                    if (existingAnswerIndex === -1) {
                      setAnswers(prev => [...prev, { ...answer, participantId: existingId }]);
                    }
                  }
                  continue;
                }

                const newParticipant: Participant = { ...incoming, id: crypto.randomUUID() };
                nextParticipants.push(newParticipant);
                nameMap.set(key, newParticipant.id);

                const exportedAnswers = incomingAnswers.filter(a => a.participantId === incoming.id);
                for (const answer of exportedAnswers) {
                  const existingAnswerIndex = answers.findIndex(a => a.participantId === newParticipant.id && a.questionIndex === answer.questionIndex);
                  if (existingAnswerIndex === -1) {
                    setAnswers(prev => [...prev, { ...answer, participantId: newParticipant.id }]);
                  }
                }
              }

              setParticipants(nextParticipants);
              setShowConfigInput(false);
              setConfigJsonInput('');
              setView('setup');
              alert(t(lang, 'importSharedAnswersSuccess'));
              return;
            }
          } catch (error) {
            console.error('Failed to parse participant answer payload', error);
          }
        }
      }

      let jsonCandidate = cleanInput;

      // If it doesn't look like JSON array '[' or object '{', try decryption/base64 decoding
      if (!jsonCandidate.startsWith('{') && !jsonCandidate.startsWith('[')) {
        const decryptedDollar = xorDecrypt(rawInput, '$');
        const decDollarTrim = decryptedDollar.trim();
        if (decDollarTrim.startsWith('{') || decDollarTrim.startsWith('[')) {
          jsonCandidate = decDollarTrim;
        } else {
          const decryptedPassword = xorDecrypt(rawInput, 'Password');
          const decPassTrim = decryptedPassword.trim();
          if (decPassTrim.startsWith('{') || decPassTrim.startsWith('[')) {
            jsonCandidate = decPassTrim;
          } else {
            const directBase64 = tryBase64Decode(rawInput);
            if (directBase64) {
              const base64Trim = directBase64.trim();
              if (base64Trim.startsWith('{') || base64Trim.startsWith('[')) {
                jsonCandidate = base64Trim;
              }
            }
          }
        }
      }

      const looksLikeJson = jsonCandidate.startsWith('{') || jsonCandidate.startsWith('[') || jsonCandidate.includes('"barnQuestions"') || jsonCandidate.includes('"vuxenQuestions"');

      // Try parsing JSON using robust parser
      const parsed = robustParseQuizJson(jsonCandidate) || robustParseQuizJson(rawInput);
      if (parsed) {
        try {
          // Case 1: Full Quiz Config with barnQuestions and vuxenQuestions
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (parsed.barnQuestions || parsed.vuxenQuestions)) {
            const barnQs = Array.isArray(parsed.barnQuestions)
              ? parsed.barnQuestions.map((q: any, idx: number) => formatImportedQuestion(q, idx))
              : [];
            const vuxenQs = Array.isArray(parsed.vuxenQuestions)
              ? parsed.vuxenQuestions.map((q: any, idx: number) => formatImportedQuestion(q, idx))
              : [];

            const fullConfig: QuizConfig = {
              quizId: parsed.quizId || crypto.randomUUID(),
              title: parsed.title || 'Quiz',
              password: parsed.password || '',
              logoUrl: parsed.logoUrl,
              barnQuestions: barnQs,
              vuxenQuestions: vuxenQs,
              geotagUnlockDistance: typeof parsed.geotagUnlockDistance === 'number' ? parsed.geotagUnlockDistance : 20,
              requireSequentialAnswers: !!parsed.requireSequentialAnswers
            };
            const validation = validateQuizConfig(fullConfig);
            if (!validation.valid) throw new Error(validation.error);
            let importedQuiz = ensureQuizId(fullConfig);
            if (importedQuiz.logoUrl) {
              importedQuiz = { ...importedQuiz, logoUrl: await cacheLogoAsDataUrl(importedQuiz.logoUrl) };
            }
            await autoSaveQuizToIndexedDBIfNew(importedQuiz);
            setQuizConfig(importedQuiz);
            setNewQuizTitle(importedQuiz.title);
            setNewQuizPassword(importedQuiz.password || '');
            setNewGeotagDistance(importedQuiz.geotagUnlockDistance || 20);
            try {
              localStorage.setItem('family_quiz_config', JSON.stringify(importedQuiz));
              localStorage.removeItem(STORAGE_KEY_WALKED_PATH);
              localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify([]));
            } catch (err) {
              console.error('Error saving quiz to localStorage:', err);
            }
            setShowConfigInput(false);
            setConfigJsonInput('');
            setAnswers([]);
            setWalkedPath([]);
            setSelectedQuestionIndex(null);
            setSelectedQuestionIds([]);
            setView('setup');
            const msg = `${t(lang, 'quizLoadedSuccess')} ("${importedQuiz.title}")`;
            setDbNotification(msg);
            setTimeout(() => setDbNotification(null), 5000);
            return;
          }

          // Case 2: Array of questions [{ text, options, correctAnswer }, ...]
          let questionArray: any[] | null = null;
          if (Array.isArray(parsed)) {
            questionArray = parsed;
          } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.questions)) {
            questionArray = parsed.questions;
          } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed[importTarget + 'Questions'])) {
             // Specific category
             questionArray = parsed[importTarget + 'Questions'];
          }

          if (questionArray) {
            const formattedQuestions: Question[] = questionArray.map((q, idx) => formatImportedQuestion(q, idx));

            applyQuestionsToConfig(formattedQuestions);
            return;
          }
        } catch (jsonErr: any) {
          console.warn('JSON handling failed', jsonErr);
          if (looksLikeJson) {
            throw new Error(jsonErr?.message || 'Felaktig JSON-struktur i quizet.');
          }
        }
      } else if (looksLikeJson) {
        throw new Error('Kunde inte tolka JSON-strukturen. Kontrollera att filen är giltig JSON.');
      }
      
      // Otherwise, parse as plain text
      let newQuestions = parseQuizText(cleanInput);
      if (newQuestions.length === 0) {
        const base64DecodedText = tryBase64Decode(rawInput);
        if (base64DecodedText) {
          newQuestions = parseQuizText(base64DecodedText);
        }
      }
      
      if (newQuestions.length > 0) {
        applyQuestionsToConfig(newQuestions);
      } else {
        alert(t(lang, 'invalidFormatAlert'));
      }
    } catch (err) {
      console.error('Import error:', err);
      alert(err instanceof Error && err.message ? err.message : t(lang, 'invalidFormatAlert'));
    }
  };

  const resetQuiz = () => {
    setShowResetConfirm(true);
  };

  const confirmResetQuiz = () => {
    setAnswers([]);
    setWalkedPath([]);
    localStorage.removeItem(STORAGE_KEY_WALKED_PATH);
    setSelectedQuestionIndex(null);
    setView('setup');
    setIsPasswordCorrect(false);
    setPasswordInput('');
    setFacitPasswordInput('');
    setIsFacitUnlocked(false);
    setShowResetConfirm(false);
  };

  const [lastTaggedLocation, setLastTaggedLocation] = useState<Location | null>(null);

  const updateQuestion = (category: UserType, id: string, updates: Partial<Question>) => {
    setQuizConfig(prev => {
      const existingInBarn = prev.barnQuestions.find(q => q.id === id);
      const existingInVuxen = prev.vuxenQuestions.find(q => q.id === id);
      const currentOrigLang = (existingInBarn || existingInVuxen)?.originalLanguage || 'sv';

      const newOrigLang = (updates.text !== undefined || updates.options !== undefined) 
        ? (updates.originalLanguage || lang) 
        : currentOrigLang;

      const updateList = (qList: Question[]) => 
        qList.map(q => q.id === id ? { ...q, ...updates, originalLanguage: newOrigLang } : q);

      return {
        ...prev,
        barnQuestions: updateList(prev.barnQuestions),
        vuxenQuestions: updateList(prev.vuxenQuestions)
      };
    });
  };

  const openQuestionEditor = (qId: string) => {
    const foundQ = quizConfig.barnQuestions.find(item => item.id === qId) || quizConfig.vuxenQuestions.find(item => item.id === qId);
    setEditingQuestionLang(foundQ?.originalLanguage || lang);
    setFullScreenEditingQuestionId(qId);
  };

  const toggleQuestionTargetGroup = (questionId: string, group: UserType, enabled: boolean) => {
    setQuizConfig(prev => {
      const inBarn = prev.barnQuestions.some(q => q.id === questionId);
      const inVuxen = prev.vuxenQuestions.some(q => q.id === questionId);

      // Don't uncheck if it's the only group selected
      if (!enabled) {
        if (group === 'barn' && !inVuxen) return prev;
        if (group === 'vuxen' && !inBarn) return prev;
      }

      const questionObj = prev.barnQuestions.find(q => q.id === questionId) || prev.vuxenQuestions.find(q => q.id === questionId);
      if (!questionObj) return prev;

      let newBarn = [...prev.barnQuestions];
      let newVuxen = [...prev.vuxenQuestions];

      if (group === 'barn') {
        if (enabled && !inBarn) {
          newBarn.push({ ...questionObj });
        } else if (!enabled && inBarn) {
          newBarn = newBarn.filter(q => q.id !== questionId);
        }
      } else if (group === 'vuxen') {
        if (enabled && !inVuxen) {
          newVuxen.push({ ...questionObj });
        } else if (!enabled && inVuxen) {
          newVuxen = newVuxen.filter(q => q.id !== questionId);
        }
      }

      return {
        ...prev,
        barnQuestions: newBarn,
        vuxenQuestions: newVuxen
      };
    });
  };

  const handleGeotagQuestion = (category: UserType, questionId: string, loc: Location) => {
    updateQuestion(category, questionId, { location: loc });
    setLastTaggedLocation(loc);

    const questions = category === 'barn' ? quizConfig.barnQuestions : quizConfig.vuxenQuestions;
    const currentIndex = questions.findIndex(q => q.id === questionId);

    // Look for next untagged question starting after currentIndex
    let nextUntagged = questions.slice(currentIndex + 1).find(q => !q.location);
    if (!nextUntagged) {
      // Search from start if none found after
      nextUntagged = questions.slice(0, currentIndex).find(q => !q.location && q.id !== questionId);
    }

    if (nextUntagged) {
      setExpandedQuestionId(nextUntagged.id);
    }
  };

  const handleApplyRouteGeoTags = (category: UserType | 'both', locations: Location[]) => {
    setQuizConfig((prev) => {
      const newConfig = { ...prev };
      
      if (category === 'barn' || category === 'both') {
        newConfig.barnQuestions = newConfig.barnQuestions.map((q, idx) => {
          if (idx < locations.length) {
            return { ...q, location: locations[idx] };
          }
          return q;
        });
      }
      
      if (category === 'vuxen' || category === 'both') {
        newConfig.vuxenQuestions = newConfig.vuxenQuestions.map((q, idx) => {
          if (idx < locations.length) {
            return { ...q, location: locations[idx] };
          }
          return q;
        });
      }
      
      return newConfig;
    });
  };

  const getQuestionGroups = (category: UserType) => {
    const questions = category === 'barn' ? quizConfig.barnQuestions : quizConfig.vuxenQuestions;
    const followUpTargetIds = new Set(
      questions
        .map(q => q.followUpQuestionId)
        .filter((id): id is string => !!id)
    );

    const mainQuestions = questions.filter(q => !followUpTargetIds.has(q.id));
    
    return mainQuestions.map(root => {
      const followUps: Question[] = [];
      const visited = new Set<string>([root.id]);
      let currId = root.followUpQuestionId;
      while (currId && !visited.has(currId)) {
        visited.add(currId);
        const child = questions.find(q => q.id === currId);
        if (!child) break;
        followUps.push(child);
        currId = child.followUpQuestionId;
      }
      return { root, followUps };
    });
  };

  const reorderMainQuestions = (category: UserType, sourceRootId: string, targetRootId: string, position: 'before' | 'after' = 'before') => {
    if (!isAdmin || sourceRootId === targetRootId) return;
    const groups = getQuestionGroups(category);
    const sourceIdx = groups.findIndex(g => g.root.id === sourceRootId);
    const targetIdx = groups.findIndex(g => g.root.id === targetRootId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const [movedGroup] = groups.splice(sourceIdx, 1);
    const newTargetIdx = groups.findIndex(g => g.root.id === targetRootId);
    const insertIdx = position === 'after' ? newTargetIdx + 1 : newTargetIdx;
    groups.splice(insertIdx, 0, movedGroup);

    const newQuestions: Question[] = [];
    for (const g of groups) {
      newQuestions.push(g.root, ...g.followUps);
    }

    setQuizConfig(prev => category === 'barn' 
      ? { ...prev, barnQuestions: newQuestions }
      : { ...prev, vuxenQuestions: newQuestions }
    );
  };

  const reorderFollowUpQuestions = (category: UserType, rootQuestionId: string, sourceFollowUpId: string, targetFollowUpId: string, position: 'before' | 'after' = 'before') => {
    if (!isAdmin || sourceFollowUpId === targetFollowUpId) return;
    const groups = getQuestionGroups(category);
    const group = groups.find(g => g.root.id === rootQuestionId);
    if (!group || group.followUps.length < 2) return;

    const sourceIdx = group.followUps.findIndex(q => q.id === sourceFollowUpId);
    const targetIdx = group.followUps.findIndex(q => q.id === targetFollowUpId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const [moved] = group.followUps.splice(sourceIdx, 1);
    const newTargetIdx = group.followUps.findIndex(q => q.id === targetFollowUpId);
    const insertIdx = position === 'after' ? newTargetIdx + 1 : newTargetIdx;
    group.followUps.splice(insertIdx, 0, moved);

    if (group.followUps.length > 0) {
      group.root = { ...group.root, followUpQuestionId: group.followUps[0].id };
      for (let i = 0; i < group.followUps.length; i++) {
        const nextId = i < group.followUps.length - 1 ? group.followUps[i + 1].id : undefined;
        group.followUps[i] = { ...group.followUps[i], followUpQuestionId: nextId };
      }
    }

    const newQuestions: Question[] = [];
    for (const g of groups) {
      newQuestions.push(g.root, ...g.followUps);
    }

    setQuizConfig(prev => category === 'barn' 
      ? { ...prev, barnQuestions: newQuestions }
      : { ...prev, vuxenQuestions: newQuestions }
    );
  };

  const moveMainQuestionStep = (category: UserType, rootId: string, direction: 'up' | 'down') => {
    if (!isAdmin) return;
    const groups = getQuestionGroups(category);
    const idx = groups.findIndex(g => g.root.id === rootId);
    if (idx === -1) return;
    if (direction === 'up' && idx > 0) {
      const temp = groups[idx];
      groups[idx] = groups[idx - 1];
      groups[idx - 1] = temp;
    } else if (direction === 'down' && idx < groups.length - 1) {
      const temp = groups[idx];
      groups[idx] = groups[idx + 1];
      groups[idx + 1] = temp;
    } else {
      return;
    }

    const newQuestions: Question[] = [];
    for (const g of groups) {
      newQuestions.push(g.root, ...g.followUps);
    }

    setQuizConfig(prev => category === 'barn' 
      ? { ...prev, barnQuestions: newQuestions }
      : { ...prev, vuxenQuestions: newQuestions }
    );
  };

  const moveFollowUpStep = (category: UserType, rootId: string, followUpId: string, direction: 'up' | 'down') => {
    if (!isAdmin) return;
    const groups = getQuestionGroups(category);
    const group = groups.find(g => g.root.id === rootId);
    if (!group) return;
    const idx = group.followUps.findIndex(q => q.id === followUpId);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      const temp = group.followUps[idx];
      group.followUps[idx] = group.followUps[idx - 1];
      group.followUps[idx - 1] = temp;
    } else if (direction === 'down' && idx < group.followUps.length - 1) {
      const temp = group.followUps[idx];
      group.followUps[idx] = group.followUps[idx + 1];
      group.followUps[idx + 1] = temp;
    } else {
      return;
    }

    if (group.followUps.length > 0) {
      group.root = { ...group.root, followUpQuestionId: group.followUps[0].id };
      for (let i = 0; i < group.followUps.length; i++) {
        const nextId = i < group.followUps.length - 1 ? group.followUps[i + 1].id : undefined;
        group.followUps[i] = { ...group.followUps[i], followUpQuestionId: nextId };
      }
    }

    const newQuestions: Question[] = [];
    for (const g of groups) {
      newQuestions.push(g.root, ...g.followUps);
    }

    setQuizConfig(prev => category === 'barn' 
      ? { ...prev, barnQuestions: newQuestions }
      : { ...prev, vuxenQuestions: newQuestions }
    );
  };

  const [questionToDelete, setQuestionToDelete] = useState<{ category: UserType; id: string } | null>(null);
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCreateNewQuizConfirm, setShowCreateNewQuizConfirm] = useState(false);
  const [dbConfirmation, setDbConfirmation] = useState<{ action: 'overwrite' | 'delete' | 'clear'; recordId?: string } | null>(null);
  const quizTitleInputRef = useRef<HTMLInputElement>(null);

  const confirmCreateNewQuiz = () => {
    const newQuizId = crypto.randomUUID();
    const newBlankQuiz: QuizConfig = {
      quizId: newQuizId,
      title: '',
      password: '',
      logoUrl: undefined,
      barnQuestions: [],
      vuxenQuestions: [],
      geotagUnlockDistance: 20,
      requireSequentialAnswers: false,
    };

    setQuizConfig(newBlankQuiz);
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newBlankQuiz));

    setNewQuizTitle('');
    setNewQuizPassword('');
    setNewQuizLogoUrl('');
    setAnswers([]);
    localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify([]));
    setWalkedPath([]);
    localStorage.removeItem(STORAGE_KEY_WALKED_PATH);
    setSelectedQuestionIndex(null);
    setSelectedQuestionIds([]);
    setEditingParticipantId(null);
    setQuestionToDelete(null);
    setParticipantToDelete(null);
    setIsPasswordCorrect(false);
    setPasswordInput('');
    setFacitPasswordInput('');
    setIsFacitUnlocked(false);
    setIsQuizModeLocked(false);
    localStorage.removeItem('family_quiz_lock_mode');
    setIsAdmin(true);

    setShowCreateNewQuizConfirm(false);
    setConfigTab('general');

    // Switch to General tab and focus the Quiz Title input field
    setTimeout(() => {
      if (quizTitleInputRef.current) {
        quizTitleInputRef.current.focus();
        quizTitleInputRef.current.select();
      }
    }, 150);
  };

  const confirmDbAction = async () => {
    const confirmation = dbConfirmation;
    setDbConfirmation(null);
    if (!confirmation) return;

    try {
      if (confirmation.action === 'overwrite' && confirmation.recordId) {
        await saveQuizToIndexedDB(quizConfig, confirmation.recordId);
        await refreshSavedQuizzes();
        setDbNotification(t(lang, 'quizSavedSuccess'));
      } else if (confirmation.action === 'delete' && confirmation.recordId) {
        await deleteQuizFromIndexedDB(confirmation.recordId);
        await refreshSavedQuizzes();
      } else if (confirmation.action === 'clear') {
        await clearAllQuizzesFromIndexedDB();
        await refreshSavedQuizzes();
        setParticipants([]);
        setAnswers([]);
        localStorage.removeItem(STORAGE_KEY_ANSWERS);
        localStorage.removeItem(STORAGE_KEY_WALKED_PATH);
      }
      setTimeout(() => setDbNotification(null), 4000);
    } catch (err) {
      alert(t(lang, 'indexedDbActionFailed'));
    }
  };

  // Bulk question selection state
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Quiz Library state & External Catalog support
  const DEFAULT_CATALOG_URL = `${import.meta.env.BASE_URL}quizzes/`;
  const STORAGE_KEY_CATALOG_URL = 'family_quiz_catalog_url';

  const normalizeCatalogUrl = (input?: any): { baseUrl: string; manifestUrl: string; isCustom: boolean } => {
    let trimmed = typeof input === 'string' ? input.trim() : '';
    if (!trimmed || trimmed === '[object Object]' || trimmed === DEFAULT_CATALOG_URL || trimmed === '/quizzes/' || trimmed === 'quizzes/' || trimmed === './quizzes/') {
      return { baseUrl: DEFAULT_CATALOG_URL, manifestUrl: `${DEFAULT_CATALOG_URL}manifest.json`, isCustom: false };
    }
    // If user provided link to index.html or index.htm
    if (trimmed.endsWith('index.html')) {
      trimmed = trimmed.slice(0, trimmed.length - 'index.html'.length);
    } else if (trimmed.endsWith('index.htm')) {
      trimmed = trimmed.slice(0, trimmed.length - 'index.htm'.length);
    }

    if (trimmed.endsWith('manifest.json')) {
      const baseUrl = trimmed.slice(0, trimmed.length - 'manifest.json'.length);
      return { baseUrl, manifestUrl: trimmed, isCustom: true };
    }
    if (!trimmed.endsWith('/')) {
      trimmed += '/';
    }
    return { baseUrl: trimmed, manifestUrl: `${trimmed}manifest.json`, isCustom: true };
  };

  const [catalogUrl, setCatalogUrl] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CATALOG_URL);
    if (!saved || saved === '[object Object]' || saved === 'undefined' || saved === 'null') {
      localStorage.removeItem(STORAGE_KEY_CATALOG_URL);
      return DEFAULT_CATALOG_URL;
    }
    return saved;
  });
  const [customCatalogInput, setCustomCatalogInput] = useState<string>('');
  const [showCatalogConfig, setShowCatalogConfig] = useState<boolean>(false);
  const [quizLibrary, setQuizLibrary] = useState<any[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const BUILTIN_DEFAULT_QUIZZES: QuizMetadata[] = [
    {
      id: 'intro-sv',
      title: 'Introduktionstips (Svenska)',
      description: 'Klassisk tipspromenad med 3 barnfrågor och 3 vuxenfrågor.',
      filename: 'intro_sv.json',
      barnCount: 3,
      vuxenCount: 3,
      language: 'sv',
      catalogBaseUrl: `${import.meta.env.BASE_URL}quizzes/`,
      resolvedUrl: `${import.meta.env.BASE_URL}quizzes/intro_sv.json`
    },
    {
      id: 'intro-en',
      title: 'Introductory Quiz (English)',
      description: 'Standard quiz trail with 3 kids questions and 3 adult questions.',
      filename: 'intro_en.json',
      barnCount: 3,
      vuxenCount: 3,
      language: 'en',
      catalogBaseUrl: `${import.meta.env.BASE_URL}quizzes/`,
      resolvedUrl: `${import.meta.env.BASE_URL}quizzes/intro_en.json`
    }
  ];

  const CATALOG_REQUEST_TIMEOUT_MS = 10000;

  const fetchWithTimeout = async (url: string, timeoutMs = CATALOG_REQUEST_TIMEOUT_MS): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  // Helper to fetch JSON/Text with backend proxy and CORS fallbacks for external domains
  const fetchWithCorsFallback = async (targetUrl: string, asJson = true): Promise<any> => {
    const parseResponseText = (text: string) => {
      if (!asJson) return text;
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    };

    const tryFetchText = async (requestUrl: string): Promise<string> => {
      const res = await fetchWithTimeout(requestUrl, CATALOG_REQUEST_TIMEOUT_MS);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.text();
    };

    // If targetUrl is local or on same origin, fetch directly without proxying
    const isSameOriginOrRelative = !targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') 
      || (typeof window !== 'undefined' && targetUrl.startsWith(window.location.origin));

    if (isSameOriginOrRelative) {
      const relativeOrAbsolute = (typeof window !== 'undefined' && targetUrl.startsWith(window.location.origin))
        ? targetUrl.slice(window.location.origin.length)
        : targetUrl;
      const text = await tryFetchText(relativeOrAbsolute);
      return parseResponseText(text);
    }

    // Attempt 1: Server-side proxy (/api/proxy)
    try {
      const serverProxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
      const text = await tryFetchText(serverProxyUrl);
      return parseResponseText(text);
    } catch (e) {
      console.warn('Backend /api/proxy failed or not available, trying direct fetch:', e);
    }

    // Attempt 2: Direct browser fetch
    try {
      const text = await tryFetchText(targetUrl);
      return parseResponseText(text);
    } catch (e) {
      console.warn('Direct fetch failed, trying CORS proxies for:', targetUrl, e);
    }

    // Attempt 3: codetabs proxy
    try {
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
      const text = await tryFetchText(proxyUrl);
      return parseResponseText(text);
    } catch (e) {
      console.warn('CodeTabs proxy failed:', e);
    }

    // Attempt 4: corsproxy.io proxy
    try {
      const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
      const text = await tryFetchText(proxyUrl);
      return parseResponseText(text);
    } catch (e) {
      console.warn('Corsproxy failed:', e);
    }

    throw new Error('Kunde inte hämta katalogen inom tidsgränsen (kontrollera URL, CORS och nätverk)');
  };

  const fetchQuizLibrary = async (targetCatalogUrl?: any) => {
    try {
      setIsLibraryLoading(true);
      setLibraryError(null);
      const validTargetUrl = (typeof targetCatalogUrl === 'string' && targetCatalogUrl.trim() !== '' && targetCatalogUrl !== '[object Object]')
        ? targetCatalogUrl.trim()
        : undefined;
      const urlToUse = validTargetUrl !== undefined ? validTargetUrl : catalogUrl;
      const { baseUrl, manifestUrl, isCustom } = normalizeCatalogUrl(urlToUse);
      
      const separator = manifestUrl.includes('?') ? '&' : '?';
      const fullManifestUrl = `${manifestUrl}${separator}_t=${Date.now()}`;
      
      let rawData: any;
      if (!isCustom) {
        const res = await fetchWithTimeout(fullManifestUrl, CATALOG_REQUEST_TIMEOUT_MS);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        rawData = await res.json();
      } else {
        try {
          rawData = await fetchWithCorsFallback(fullManifestUrl, true);
        } catch (manifestErr) {
          // If manifest.json failed, try fetching index.html or baseUrl directly
          console.warn('manifest.json failed, trying index.html or baseUrl:', manifestErr);
          const indexUrl = `${baseUrl}index.html?_t=${Date.now()}`;
          rawData = await fetchWithCorsFallback(indexUrl, true);
        }
      }
      
      let rawList: any[] = [];
      if (Array.isArray(rawData)) {
        rawList = rawData;
      } else if (rawData && typeof rawData === 'object' && Array.isArray(rawData.quizzes)) {
        rawList = rawData.quizzes;
      } else if (typeof rawData === 'string') {
        // 1. Try to extract embedded <script type="application/json" ...>...</script>
        const scriptMatch = rawData.match(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i);
        if (scriptMatch && scriptMatch[1]) {
          try {
            const parsedScriptJson = JSON.parse(scriptMatch[1].trim());
            if (Array.isArray(parsedScriptJson)) {
              rawList = parsedScriptJson;
            } else if (parsedScriptJson && Array.isArray(parsedScriptJson.quizzes)) {
              rawList = parsedScriptJson.quizzes;
            }
          } catch (e) {
            console.warn('Failed to parse embedded json script in index.html:', e);
          }
        }

        // 2. If no embedded JSON script list found, parse HTML for .json links or filenames
        if (rawList.length === 0) {
          const jsonMatches = rawData.match(/[\w\-_./]+\.json/g) || [];
          const uniqueMatches = Array.from(new Set(jsonMatches)).filter(f => !f.endsWith('manifest.json'));
          rawList = uniqueMatches.map(filename => ({
            id: filename.replace('.json', ''),
            title: filename.replace('.json', '').replace(/[_-]/g, ' '),
            filename
          }));
        }
      }

      // If list is strings or objects, map and resolve
      const resolvedList = await Promise.all(rawList.map(async (item: any) => {
        const itemFilename = typeof item === 'string' ? item : (item.filename || item.file || item.url || '');
        const isAbsolute = itemFilename.startsWith('http://') || itemFilename.startsWith('https://') || itemFilename.startsWith('/');
        const resolvedUrl = isAbsolute ? itemFilename : `${baseUrl}${itemFilename}`;
        
        let title = (typeof item === 'object' && item.title) ? item.title : '';
        let description = (typeof item === 'object' && item.description) ? item.description : '';
        let barnCount = (typeof item === 'object' && typeof item.barnCount === 'number') ? item.barnCount : undefined;
        let vuxenCount = (typeof item === 'object' && typeof item.vuxenCount === 'number') ? item.vuxenCount : undefined;
        let language = (typeof item === 'object' && item.language) ? item.language : undefined;
        let timeLimit = (typeof item === 'object' && item.timeLimit) ? item.timeLimit : undefined;

        // Always inspect the quiz JSON file to extract exact question counts, language & timelimit
        try {
          const quizContent = !isCustom && !resolvedUrl.startsWith('http')
            ? await (await fetchWithTimeout(resolvedUrl, CATALOG_REQUEST_TIMEOUT_MS)).json()
            : await fetchWithCorsFallback(resolvedUrl, true);

          if (quizContent && typeof quizContent === 'object') {
            title = quizContent.title || title || itemFilename;
            description = quizContent.description || description || '';
            barnCount = Array.isArray(quizContent.barnQuestions) ? quizContent.barnQuestions.length : (barnCount ?? 0);
            vuxenCount = Array.isArray(quizContent.vuxenQuestions) ? quizContent.vuxenQuestions.length : (vuxenCount ?? 0);
            language = quizContent.language || language || (itemFilename.includes('_en') || itemFilename.includes('-en') ? 'en' : (itemFilename.includes('_sv') || itemFilename.includes('-sv') ? 'sv' : undefined));
            timeLimit = quizContent.timeLimit || timeLimit;
          }
        } catch (e) {
          console.warn(`Could not inspect quiz content for ${itemFilename}:`, e);
        }

        // Fallback for title if still missing
        if (!title) {
          title = itemFilename.replace(/\.json$/i, '').replace(/[_-]/g, ' ');
        }

        return {
          id: (typeof item === 'object' && item.id) ? item.id : itemFilename,
          title,
          description: description || '',
          filename: itemFilename,
          catalogBaseUrl: baseUrl,
          resolvedUrl,
          barnCount: barnCount ?? 0,
          vuxenCount: vuxenCount ?? 0,
          language,
          timeLimit
        };
      }));
      
      setQuizLibrary(resolvedList);
      if (validTargetUrl !== undefined) {
        setCatalogUrl(validTargetUrl);
        if (validTargetUrl === DEFAULT_CATALOG_URL || !isCustom) {
          localStorage.removeItem(STORAGE_KEY_CATALOG_URL);
        } else {
          localStorage.setItem(STORAGE_KEY_CATALOG_URL, validTargetUrl);
        }
      }
    } catch (err: any) {
      console.error('Failed to load quiz library from:', err);
      const { isCustom } = normalizeCatalogUrl(targetCatalogUrl || catalogUrl);
      if (!isCustom) {
        setQuizLibrary(BUILTIN_DEFAULT_QUIZZES);
        setLibraryError(null);
      } else {
        const errorMsg = err.message || 'Kunde inte läsa in katalogen';
        setLibraryError(errorMsg);
      }
    } finally {
      setIsLibraryLoading(false);
    }
  };

  const loadLibraryQuiz = async (filenameOrItem: string | any) => {
    if (participants.length > 0 || answers.length > 0) {
      setShowLoadConfirm({ type: 'library', payload: filenameOrItem });
      return;
    }

    try {
      setIsLibraryLoading(true);
      setLibraryError(null);

      let url = '';
      let presetTitle = '';
      let presetDesc = '';
      let presetLang: Language | undefined = undefined;

      if (typeof filenameOrItem === 'object' && filenameOrItem !== null) {
        url = filenameOrItem.resolvedUrl || filenameOrItem.filename || '';
        presetTitle = filenameOrItem.title || '';
        presetDesc = filenameOrItem.description || '';
        presetLang = filenameOrItem.language;
      } else {
        const str = String(filenameOrItem || '');
        if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/')) {
          url = str;
        } else {
          const { baseUrl } = normalizeCatalogUrl(catalogUrl);
          url = `${baseUrl}${str}`;
        }
      }

      // If url is relative or same-origin, fetch directly
      const isLocalOrSameOrigin = !url.startsWith('http://') && !url.startsWith('https://') 
        || (typeof window !== 'undefined' && url.startsWith(window.location.origin));

      let content = '';
      if (isLocalOrSameOrigin) {
        const relativeUrl = (typeof window !== 'undefined' && url.startsWith(window.location.origin))
          ? url.slice(window.location.origin.length)
          : url;
        const res = await fetchWithTimeout(relativeUrl, CATALOG_REQUEST_TIMEOUT_MS);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        content = await res.text();
      } else {
        content = await fetchWithCorsFallback(url, false);
      }

      if (!content || !content.trim()) {
        throw new Error(lang === 'sv' ? 'Filen var tom eller kunde inte läsas in.' : 'The file was empty or could not be read.');
      }

      // Parse JSON
      const parsed = robustParseQuizJson(content);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error(lang === 'sv' ? 'Kunde inte tolka quizfilen som giltig JSON.' : 'Could not parse quiz file as valid JSON.');
      }

      const barnQs = Array.isArray(parsed.barnQuestions)
        ? parsed.barnQuestions.map((q: any, idx: number) => formatImportedQuestion(q, idx))
        : [];
      const vuxenQs = Array.isArray(parsed.vuxenQuestions)
        ? parsed.vuxenQuestions.map((q: any, idx: number) => formatImportedQuestion(q, idx))
        : [];

      const fullConfig: QuizConfig = {
        quizId: parsed.quizId || crypto.randomUUID(),
        title: parsed.title || presetTitle || 'Quiz',
        password: parsed.password || '',
        logoUrl: parsed.logoUrl,
        barnQuestions: barnQs,
        vuxenQuestions: vuxenQs,
        geotagUnlockDistance: typeof parsed.geotagUnlockDistance === 'number' ? parsed.geotagUnlockDistance : 20,
        requireSequentialAnswers: !!parsed.requireSequentialAnswers
      };

      const validation = validateQuizConfig(fullConfig);
      if (!validation.valid) {
        throw new Error(validation.error || (lang === 'sv' ? 'Ogiltigt quizformat' : 'Invalid quiz format'));
      }

      let importedQuiz = ensureQuizId(fullConfig);
      if (importedQuiz.logoUrl) {
        importedQuiz = { ...importedQuiz, logoUrl: await cacheLogoAsDataUrl(importedQuiz.logoUrl) };
      }
      await autoSaveQuizToIndexedDBIfNew(importedQuiz);

      setQuizConfig(importedQuiz);
      setNewQuizTitle(importedQuiz.title);
      setNewQuizPassword(importedQuiz.password || '');
      setNewGeotagDistance(importedQuiz.geotagUnlockDistance || 20);
      setAnswers([]);
      setWalkedPath([]);
      setSelectedQuestionIndex(null);
      setSelectedQuestionIds([]);

      try {
        localStorage.setItem('family_quiz_config', JSON.stringify(importedQuiz));
        localStorage.removeItem(STORAGE_KEY_WALKED_PATH);
        localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify([]));
      } catch (err) {
        console.error('Error saving quiz to localStorage:', err);
      }

      const successMsg = `${t(lang, 'quizLoadedSuccess')} ("${importedQuiz.title}")`;
      setDbNotification(successMsg);
      setTimeout(() => setDbNotification(null), 5000);
      setLibraryError(null);
      setShowConfigInput(false);
      setView('setup');
    } catch (err: any) {
      console.error('Error loading library quiz:', err);
      const errMsg = t(lang, 'libraryError') + (err?.message ? ` (${err.message})` : '');
      setLibraryError(errMsg);
      setDbNotification(errMsg);
      setTimeout(() => setDbNotification(null), 8000);
    } finally {
      setIsLibraryLoading(false);
    }
  };

  const handleShareCatalogLink = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('quiz');
      url.searchParams.delete('z');
      url.searchParams.delete('q');
      url.searchParams.delete('quizFile');
      url.searchParams.delete('loadQuiz');
      url.searchParams.set('catalog', catalogUrl);
      url.hash = '';
      navigator.clipboard.writeText(url.toString());
      setDbNotification(t(lang, 'catalogLinkCopiedNotice'));
      setTimeout(() => setDbNotification(null), 5000);
    } catch (e) {
      console.error('Could not copy catalog link', e);
    }
  };

  const handleResetCatalog = async () => {
    setCatalogUrl(DEFAULT_CATALOG_URL);
    localStorage.removeItem(STORAGE_KEY_CATALOG_URL);
    setCustomCatalogInput('');
    setShowCatalogConfig(false);
    await fetchQuizLibrary(DEFAULT_CATALOG_URL);
  };

  useEffect(() => {
    // Check URL query parameters or URL hash for catalog or compressed quiz: ?quiz=..., #quiz=..., ?z=..., #z=..., #q=...
    const checkAndLoadUrlQuiz = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const rawHash = window.location.hash || '';
        const hashStr = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
        const hashParams = new URLSearchParams(hashStr);

        // Check for catalog parameter in URL: ?catalog=..., ?catalogUrl=..., ?katalog=..., #catalog=...
        const urlCatalog = 
          searchParams.get('catalog') || 
          searchParams.get('catalogUrl') || 
          searchParams.get('katalog') ||
          hashParams.get('catalog') || 
          hashParams.get('catalogUrl') || 
          hashParams.get('katalog');

        if (urlCatalog) {
          const decodedCatalog = decodeURIComponent(urlCatalog).trim();
          if (decodedCatalog) {
            setCatalogUrl(decodedCatalog);
            localStorage.setItem(STORAGE_KEY_CATALOG_URL, decodedCatalog);
            await fetchQuizLibrary(decodedCatalog);
          }
        } else {
          await fetchQuizLibrary();
        }

        let compressedCandidate = 
          searchParams.get('quiz') || 
          searchParams.get('z') || 
          searchParams.get('q') || 
          hashParams.get('quiz') || 
          hashParams.get('z') || 
          hashParams.get('q');

        const isLockedInUrl = 
          searchParams.get('lock') === '1' ||
          searchParams.get('mode') === 'quiz' ||
          searchParams.get('mode') === 'player' ||
          hashParams.get('lock') === '1' ||
          hashParams.get('mode') === 'quiz' ||
          hashParams.get('mode') === 'player' ||
          rawHash.includes('lock=1') ||
          rawHash.includes('mode=quiz');

        if (isLockedInUrl) {
          setIsQuizModeLocked(true);
          localStorage.setItem('family_quiz_lock_mode', 'true');
        }

        // If not parsed as standard searchParam key-value, check if raw hash is z=..., q=..., quiz=... or a direct hash payload
        if (!compressedCandidate && hashStr) {
          const lowerHash = hashStr.toLowerCase();
          if (lowerHash.startsWith('z=') || lowerHash.startsWith('q=') || lowerHash.startsWith('quiz=')) {
            compressedCandidate = hashStr;
          } else if (hashStr.length > 10 && !hashStr.includes('/') && !hashStr.includes('&')) {
            compressedCandidate = hashStr;
          }
        }

        if (compressedCandidate) {
          const decompressed = decompressQuizFromUrlCode(compressedCandidate);
          if (decompressed) {
            // Spara det nya quizet i IndexedDB innan det öppnas om namnet inte redan finns
            let importedQuiz = ensureQuizId(decompressed);
            importedQuiz = { ...importedQuiz, logoUrl: await cacheLogoAsDataUrl(importedQuiz.logoUrl) };
            await autoSaveQuizToIndexedDBIfNew(importedQuiz);

            setQuizConfig(importedQuiz);
            localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(importedQuiz));
            // Clean the URL to avoid reloading on refresh while keeping clean UX
            if (window.history && window.history.replaceState) {
              const cleanUrl = window.location.origin + window.location.pathname;
              window.history.replaceState(null, '', cleanUrl);
            }
            return true;
          }
        }

        // URL Parameter / hash auto-load: ?quizFile=filename.json, ?loadQuiz=filename.json, #loadQuiz=filename.json
        const quizFile = searchParams.get('quizFile') || searchParams.get('loadQuiz') || hashParams.get('loadQuiz');
        if (quizFile) {
          await loadLibraryQuiz(quizFile);
          if (window.history && window.history.replaceState) {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState(null, '', cleanUrl);
          }
          return true;
        }
      } catch (err) {
        console.error('Failed to load quiz from URL parameters/hash:', err);
      }
      return false;
    };

    checkAndLoadUrlQuiz();

    // Listen to hashchange in case user opens or pastes direct #z= link while app is already open
    const handleHashChange = () => {
      checkAndLoadUrlQuiz();
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Clear selected question IDs when switching active editing category
  useEffect(() => {
    setSelectedQuestionIds([]);
  }, [editingQuestionsCategory]);

  const toggleSelectQuestion = (id: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllQuestions = () => {
    if (!editingQuestionsCategory) return;
    const questions = editingQuestionsCategory === 'barn' ? quizConfig.barnQuestions : quizConfig.vuxenQuestions;
    if (selectedQuestionIds.length === questions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(questions.map(q => q.id));
    }
  };

  const confirmDeleteSelectedQuestions = () => {
    if (!editingQuestionsCategory || selectedQuestionIds.length === 0) return;
    const category = editingQuestionsCategory;
    const idsToRemove = new Set(selectedQuestionIds);
    
    setQuizConfig(prev => {
      const newConfig = { ...prev };
      if (category === 'barn') {
        newConfig.barnQuestions = newConfig.barnQuestions.filter(q => !idsToRemove.has(q.id));
      } else {
        newConfig.vuxenQuestions = newConfig.vuxenQuestions.filter(q => !idsToRemove.has(q.id));
      }
      return newConfig;
    });
    setSelectedQuestionIds([]);
    setShowBulkDeleteConfirm(false);
  };

  const deleteQuestion = (category: UserType | null, id: string) => {
    if (!category) return;
    setQuestionToDelete({ category, id });
  };

  const confirmDeleteQuestion = () => {
    if (!questionToDelete) return;
    const { category, id } = questionToDelete;
    
    setQuizConfig(prev => {
      const newConfig = { ...prev };
      if (category === 'barn') {
        newConfig.barnQuestions = newConfig.barnQuestions.filter(q => q.id !== id);
      } else {
        newConfig.vuxenQuestions = newConfig.vuxenQuestions.filter(q => q.id !== id);
      }
      return newConfig;
    });
    setQuestionToDelete(null);
  };

  const addNewQuestion = (category: UserType | 'båda', type: QuestionType = 'options') => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type,
      text: type === 'points' ? 'Ny poängfråga...' : type === 'text' ? 'Ny textfråga...' : 'Ny fråga...',
      options: type === 'points' || type === 'text' ? [] : ['Svar 1', 'Svar X', 'Svar 2'],
      correctAnswers: type === 'points' || type === 'text' ? [] : [0],
      maxPoints: type === 'points' ? 10 : undefined,
      correctTextAnswer: type === 'text' ? 'Rätt svar' : undefined,
      acceptedTextAnswers: type === 'text' ? [] : undefined,
      originalLanguage: lang,
    };
    
    setQuizConfig(prev => {
      const newConfig = { ...prev };
      if (category === 'båda') {
        newConfig.barnQuestions = [...newConfig.barnQuestions, newQuestion];
        newConfig.vuxenQuestions = [...newConfig.vuxenQuestions, { ...newQuestion }];
      } else if (category === 'barn') {
        newConfig.barnQuestions = [...newConfig.barnQuestions, newQuestion];
      } else {
        newConfig.vuxenQuestions = [...newConfig.vuxenQuestions, newQuestion];
      }
      return newConfig;
    });
    setShowCreateQuestionModal(null);
    setFullScreenEditingQuestionId(newQuestion.id);
  };

  const tryBase64Decode = (str: string): string | null => {
    try {
      const cleaned = str.trim().replace(/\s+/g, '');
      if (!cleaned) return null;
      let decoded = '';
      try {
        decoded = decodeURIComponent(escape(atob(cleaned)));
      } catch {
        decoded = atob(cleaned);
      }
      return decoded;
    } catch {
      return null;
    }
  };

  const xorEncryptDecrypt = (input: string, key: string): string => {
    let safeInput = input;
    try {
      safeInput = unescape(encodeURIComponent(input));
    } catch (e) {
      safeInput = input;
    }
    let output = '';
    for (let i = 0; i < safeInput.length; i++) {
      const charCode = safeInput.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      output += String.fromCharCode(charCode);
    }
    try {
      return btoa(unescape(encodeURIComponent(output)));
    } catch (e) {
      return btoa(output);
    }
  };

  const xorDecrypt = (input: string, key: string): string => {
    try {
      const cleaned = input.trim().replace(/\s+/g, '');
      let decoded = tryBase64Decode(cleaned);
      if (decoded === null) {
        decoded = cleaned;
      }
      let output = '';
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        output += String.fromCharCode(charCode);
      }
      try {
        return decodeURIComponent(escape(output));
      } catch (e) {
        return output;
      }
    } catch (e) {
      return input;
    }
  };

  const applyQuestionsToConfig = (formattedQuestions: Question[]) => {
    if (formattedQuestions.length === 0) return;
    setQuizConfig(prev => {
      const newConfig = { ...prev };
      if (importTarget === 'båda') {
        newConfig.barnQuestions = formattedQuestions;
        newConfig.vuxenQuestions = formattedQuestions.map(q => ({ ...q, id: crypto.randomUUID() }));
      } else if (importTarget === 'barn') {
        newConfig.barnQuestions = formattedQuestions;
        if (newConfig.vuxenQuestions.length < formattedQuestions.length) {
          newConfig.vuxenQuestions = formattedQuestions.map(q => ({ ...q, id: crypto.randomUUID() }));
        }
      } else {
        newConfig.vuxenQuestions = formattedQuestions;
        if (newConfig.barnQuestions.length < formattedQuestions.length) {
          newConfig.barnQuestions = formattedQuestions.map(q => ({ ...q, id: crypto.randomUUID() }));
        }
      }
      return newConfig;
    });

    setShowConfigInput(false);
    setConfigJsonInput('');
    setAnswers([]);
    setParticipants([]);
    setView('setup');
    const targetText = importTarget === 'båda' ? 'båda kategorier' : importTarget === 'barn' ? 'Barn' : 'Vuxna';
    alert(t(lang, 'importedQuestionsAlert', { count: formattedQuestions.length.toString() }));
  };

  const handleImportConfig = () => {
    let rawInput = configJsonInput.trim();
    if (!rawInput) return;
    processImportConfig(rawInput);
  };

  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState<number | string>(5);
  const [aiTarget, setAiTarget] = useState<'barn' | 'vuxen' | 'båda'>('båda');
  const [aiKidAgeFrom, setAiKidAgeFrom] = useState<number | string>(5);
  const [aiKidAgeTo, setAiKidAgeTo] = useState<number | string>(10);
  const [aiGeotagLandmarks, setAiGeotagLandmarks] = useState(false);
  const [aiIncludeImages, setAiIncludeImages] = useState<boolean>(() => getStoredAiUseImages());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchTranslating, setIsBatchTranslating] = useState(false);
  const [batchTranslateProgress, setBatchTranslateProgress] = useState<{ current: number; total: number; langCode: string } | null>(null);

  const [searchPlaceQuery, setSearchPlaceQuery] = useState<{ [qId: string]: string }>({});
  const [isSearchingPlace, setIsSearchingPlace] = useState<{ [qId: string]: boolean }>({});
  const [isAiGeotaggingSingle, setIsAiGeotaggingSingle] = useState<{ [qId: string]: boolean }>({});
  const isAiGeotagging = useMemo(() => Object.values(isAiGeotaggingSingle).some(Boolean), [isAiGeotaggingSingle]);

  const handleSearchAndGeotagPlace = async (category: UserType, questionId: string, queryText: string) => {
    const query = queryText.trim();
    if (!query) {
      alert(t(lang, 'searchPlaceInputPlaceholder'));
      return;
    }
    setIsSearchingPlace(prev => ({ ...prev, [questionId]: true }));
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
        headers: {
          'Accept': 'application/json',
        }
      });
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        const item = data[0];
        const loc: Location = {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          name: item.name || (item.display_name ? item.display_name.split(',')[0] : query)
        };
        handleGeotagQuestion(category, questionId, loc);
        alert(t(lang, 'locationFoundSuccess', { name: loc.name || query }));
      } else {
        alert(t(lang, 'noLocationFoundAlert'));
      }
    } catch (err) {
      console.error('Failed to geocode place with Nominatim:', err);
      alert(t(lang, 'noLocationFoundAlert'));
    } finally {
      setIsSearchingPlace(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleAiGeotagSingleQuestion = async (category: UserType, questionId: string, questionText: string) => {
    const currentApiKey = getStoredApiKey();
    if (!currentApiKey) {
      setUserApiKeyInput('');
      setShowSettingsModal(true);
      alert(t(lang, 'missingApiKeyAlert'));
      return;
    }
    setIsAiGeotaggingSingle(prev => ({ ...prev, [questionId]: true }));
    try {
      const result = await findLocationCoordinatesWithGemini(questionText, currentApiKey);
      if (result) {
        const loc: Location = {
          lat: result.lat,
          lng: result.lng,
          name: result.name
        };
        handleGeotagQuestion(category, questionId, loc);
        alert(t(lang, 'locationFoundSuccess', { name: result.name }));
      } else {
        alert(t(lang, 'noLocationFoundAlert'));
      }
    } catch (err: any) {
      if (err.message === 'MISSING_API_KEY') {
        setShowSettingsModal(true);
        alert(t(lang, 'missingApiKeyAlert'));
      } else {
        alert(t(lang, 'generationError') + err.message);
      }
    } finally {
      setIsAiGeotaggingSingle(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const generateWithAi = async () => {
    if (!aiTopic) return alert(t(lang, 'enterTopicAlert'));

    const currentApiKey = getStoredApiKey();
    if (!currentApiKey) {
      setUserApiKeyInput('');
      setShowSettingsModal(true);
      alert(t(lang, 'missingApiKeyAlert'));
      return;
    }

    setIsGenerating(true);
    try {
      const selectedLangs = promptLanguages.length > 0 ? promptLanguages : [lang];
      const data = await generateQuizClient({
        topics: aiTopic,
        count: Number(aiCount) || 5,
        target: aiTarget,
        lang: selectedLangs[0] || lang,
        ageFrom: Number(aiKidAgeFrom) || 5,
        ageTo: Number(aiKidAgeTo) || 10,
        apiKey: currentApiKey,
        geotagLandmarks: aiGeotagLandmarks,
        includeImages: aiIncludeImages,
        targetLanguages: selectedLangs,
      });

      // Register all newly generated translations into the local cache
      const allNew = [
        ...(data.barnQuestions || []),
        ...(data.vuxenQuestions || [])
      ];
      allNew.forEach((q: any) => {
        const origLang = q.originalLanguage || selectedLangs[0] || 'sv';
        if (q.translations) {
          Object.entries(q.translations).forEach(([tLang, trans]: [string, any]) => {
            registerQuestionTranslation(q.id, origLang, q.text, tLang, trans);
          });
        }
      });

      setQuizConfig(prev => ({
        ...prev,
        barnQuestions: data.barnQuestions ? [...prev.barnQuestions, ...data.barnQuestions] : prev.barnQuestions,
        vuxenQuestions: data.vuxenQuestions ? [...prev.vuxenQuestions, ...data.vuxenQuestions] : prev.vuxenQuestions,
      }));

      const totalGenerated = (data.barnQuestions?.length || 0) + (data.vuxenQuestions?.length || 0);
      const barnTagged = (data.barnQuestions || []).filter(q => q.location && typeof q.location.lat === 'number').length;
      const vuxenTagged = (data.vuxenQuestions || []).filter(q => q.location && typeof q.location.lat === 'number').length;
      const totalTagged = barnTagged + vuxenTagged;

      let msg = t(lang, 'aiDoneAlert', { count: totalGenerated.toString() });
      if (selectedLangs.length > 1) {
        msg += ` (🌐 ${selectedLangs.length} språk översatta direkt!)`;
      }
      if (totalTagged > 0) {
        msg += ` (${totalTagged} ${t(lang, 'geotaggedLabel').toLowerCase()} 📍)`;
      }
      alert(msg);
      setAiTopic('');
    } catch (err: any) {
      if (err.message === 'MISSING_API_KEY') {
        setShowSettingsModal(true);
        alert(t(lang, 'missingApiKeyAlert'));
      } else {
        alert(t(lang, 'generationError') + err.message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBatchTranslateQuiz = async () => {
    const currentApiKey = getStoredApiKey();
    if (!currentApiKey) {
      setUserApiKeyInput('');
      setShowSettingsModal(true);
      alert(t(lang, 'missingApiKeyAlert'));
      return;
    }

    const totalQuestions = quizConfig.barnQuestions.length + quizConfig.vuxenQuestions.length;
    if (totalQuestions === 0) {
      alert(t(lang, 'batchTranslateNoQuestions'));
      return;
    }

    const targetLangs = promptLanguages.length > 0 ? promptLanguages : (SUPPORTED_LANGUAGES.map(l => l.code) as Language[]);
    setIsBatchTranslating(true);
    setBatchTranslateProgress({ current: 0, total: targetLangs.length, langCode: targetLangs[0] || 'en' });

    try {
      // Translate barn questions
      const updatedBarn = await batchTranslateQuizQuestions({
        questions: quizConfig.barnQuestions,
        targetLanguages: targetLangs,
        apiKey: currentApiKey,
        onProgress: (current, total, langCode) => {
          setBatchTranslateProgress({ current, total, langCode });
        }
      });

      // Translate vuxen questions
      const updatedVuxen = await batchTranslateQuizQuestions({
        questions: quizConfig.vuxenQuestions,
        targetLanguages: targetLangs,
        apiKey: currentApiKey,
        onProgress: (current, total, langCode) => {
          setBatchTranslateProgress({ current, total, langCode });
        }
      });

      // Register all into local translation cache
      [...updatedBarn, ...updatedVuxen].forEach((q: any) => {
        const origLang = q.originalLanguage || 'sv';
        if (q.translations) {
          Object.entries(q.translations).forEach(([tLang, trans]: [string, any]) => {
            registerQuestionTranslation(q.id, origLang, q.text, tLang, trans);
          });
        }
      });

      setQuizConfig(prev => ({
        ...prev,
        barnQuestions: updatedBarn,
        vuxenQuestions: updatedVuxen,
      }));

      alert(t(lang, 'batchTranslateSuccess', {
        count: totalQuestions.toString(),
        langs: targetLangs.length.toString()
      }));
    } catch (err: any) {
      alert(t(lang, 'generationError') + (err.message || String(err)));
    } finally {
      setIsBatchTranslating(false);
      setBatchTranslateProgress(null);
    }
  };

  const shareConfig = () => {
    try {
      const configStr = JSON.stringify(quizConfig);
      const encrypted = xorEncryptDecrypt(configStr, '$');
      if (!navigator.clipboard?.writeText) throw new Error('Urklipp är inte tillgängligt.');
      navigator.clipboard.writeText(encrypted).then(() => {
        setCopiedConfigCode(true);
        setTimeout(() => setCopiedConfigCode(false), 6000);
      }).catch((error) => {
        console.error('Could not copy quiz export:', error);
        alert('Kunde inte kopiera quiz-exporten till urklipp.');
      });
    } catch (error) {
      console.error('Could not create quiz export:', error);
      alert('Kunde inte skapa quiz-exporten.');
    }
  };

  const normalizeParticipantNameForCompare = (name: string) =>
    (name || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9]/g, '');

  const reservedParticipantNames = new Set([
    'me', 'jag', 'jej', 'mig', 'you', 'du', 'i', 'ich', 'moi', 'yo', 'je', 'mi', 'io', 'mina'
  ]);

  const isReservedParticipantName = (name: string) =>
    reservedParticipantNames.has(normalizeParticipantNameForCompare(name));

  const findReservedParticipantName = (currentParticipants: Participant[]) => {
    for (const p of currentParticipants) {
      if (p.uniqueId !== DEFAULT_PARTICIPANT_UNIQUE_ID && isReservedParticipantName(p.name)) {
        return p;
      }
    }

    return null;
  };

  const buildParticipantAnswerPayload = () => {
    const reservedParticipant = findReservedParticipantName(participants);
    if (reservedParticipant) {
      alert(t(lang, 'reservedParticipantNameError', { name: reservedParticipant.name }));
      return null;
    }

    const payload = {
      schema: 'family-quiz-participant-answers-v1',
      quizId: quizConfig.quizId,
      title: quizConfig.title,
      createdAt: new Date().toISOString(),
      participants: participants.map(({ id, uniqueId, name, type }) => ({ id, uniqueId, name, type })),
      answers: answers.map(a => ({ ...a }))
    };

    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
    const encrypted = xorEncryptDecrypt(compressed, '$');
    return `qps=${encrypted}`;
  };

  const shareParticipantAnswers = async () => {
    const payload = buildParticipantAnswerPayload();
    if (!payload) return;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: quizConfig.title || 'FamilyQuiz',
          text: payload,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(payload);
      setShowAnswerExportModal(true);
    } catch (e) {
      window.prompt(t(lang, 'copyGroupAnswersManualPrompt'), payload);
    }
  };

  const importSharedAnswers = () => {
    setAnswerImportInput('');
    setShowAnswerImportModal(true);
  };

  const mergeParticipantAnswerPayload = (
    baseParticipants: Participant[],
    baseAnswers: AnswerRecord[],
    incomingParticipants: Participant[],
    incomingAnswers: AnswerRecord[]
  ) => {
    const uniqueIdMap = new Map<string, string>();
    const nameMap = new Map<string, string>();
    const mergedParticipants = [...baseParticipants];
    const mergedAnswers = [...baseAnswers];

    for (const participant of mergedParticipants) {
      if (participant.uniqueId) uniqueIdMap.set(participant.uniqueId, participant.id);
      const nameKey = `${normalizeParticipantNameForCompare(participant.name)}|${participant.type}`;
      if (!nameMap.has(nameKey)) nameMap.set(nameKey, participant.id);
    }

    for (const incoming of incomingParticipants) {
      const nameKey = `${normalizeParticipantNameForCompare(incoming.name)}|${incoming.type}`;
      const existingParticipantId =
        (incoming.uniqueId && uniqueIdMap.get(incoming.uniqueId)) || nameMap.get(nameKey);
      const targetParticipantId = existingParticipantId || crypto.randomUUID();

      if (!existingParticipantId) {
        const newParticipant = {
          ...incoming,
          id: targetParticipantId,
          uniqueId: incoming.uniqueId || crypto.randomUUID()
        };
        mergedParticipants.push(newParticipant);
        uniqueIdMap.set(newParticipant.uniqueId, newParticipant.id);
        nameMap.set(nameKey, newParticipant.id);
      }

      for (const answer of incomingAnswers.filter((item) => item.participantId === incoming.id)) {
        const hasAnswer = mergedAnswers.some(
          (existing) => existing.participantId === targetParticipantId && existing.questionIndex === answer.questionIndex
        );
        if (!hasAnswer) mergedAnswers.push({ ...answer, participantId: targetParticipantId });
      }
    }

    return { participants: mergedParticipants, answers: mergedAnswers };
  };

  const handleImportAnswersFromInput = async () => {
    const rawInput = answerImportInput.trim();
    if (!rawInput) return;

    try {
      const cleanInput = rawInput.replace(/\r\n/g, '\n').trim();
      
      if (cleanInput.toLowerCase().startsWith('qps=')) {
        const encryptedPayload = cleanInput.slice(4);
        const decompressed = xorDecrypt(encryptedPayload, '$');
        const payloadText = LZString.decompressFromEncodedURIComponent(decompressed);
        
        if (payloadText) {
          const payload = JSON.parse(payloadText);
          if (payload && payload.schema === 'family-quiz-participant-answers-v1') {
            const incomingParticipants: Participant[] = Array.isArray(payload.participants) ? payload.participants : [];
            const incomingAnswers: AnswerRecord[] = Array.isArray(payload.answers) ? payload.answers : [];

            if (incomingParticipants.length === 0 && incomingAnswers.length === 0) {
              throw new Error('No participant payload data');
            }

            if (payload.quizId === quizConfig.quizId) {
              const mergedSession = mergeParticipantAnswerPayload(participants, answers, incomingParticipants, incomingAnswers);
              setParticipants(mergedSession.participants);
              setAnswers(mergedSession.answers);
            } else {
              const targetQuiz = payload.quizId ? await getQuizByQuizId(payload.quizId) : null;
              if (!targetQuiz) {
                alert(t(lang, 'answerImportQuizMismatch', { title: payload.title || '?' }));
                return;
              }

              const targetSession = targetQuiz.quizState || { participants: [], answers: [] };
              const mergedSession = mergeParticipantAnswerPayload(
                targetSession.participants,
                targetSession.answers,
                incomingParticipants,
                incomingAnswers
              );
              await saveQuizSessionToIndexedDB(ensureQuizId(targetQuiz.quizConfig), mergedSession);
              await refreshSavedQuizzes();
              alert(t(lang, 'importSharedAnswersStoredForQuiz', { title: targetQuiz.title }));
            }

            setShowAnswerImportModal(false);
            setAnswerImportInput('');
            setView('setup');
            if (payload.quizId === quizConfig.quizId) alert(t(lang, 'importSharedAnswersSuccess'));
            return;
          }
        }
      }
      
      throw new Error('Invalid answer payload format. Must start with qps=');
    } catch (error) {
      console.error('Failed to import answers:', error);
      alert(t(lang, 'invalidAnswerImportFormat'));
    }
  };

  const getQuizAnswerProgress = () => {
    if (participants.length === 0) {
      return { totalRequired: 0, answeredCount: 0, isAllAnswered: false };
    }

    let totalRequired = 0;
    let answeredCount = 0;

    for (const p of participants) {
      const questionsForP = p.type === 'barn' ? quizConfig.barnQuestions : quizConfig.vuxenQuestions;
      totalRequired += questionsForP.length;

      for (const [questionIndex] of questionsForP.entries()) {
        const isAnswered = answers.some(a => a.participantId === p.id && a.questionIndex === questionIndex);
        if (isAnswered) {
          answeredCount += 1;
        }
      }
    }

    const isAllAnswered = totalRequired > 0 && answeredCount >= totalRequired;
    return { totalRequired, answeredCount, isAllAnswered };
  };

  const shareDirectQuizUrl = async () => {
    try {
      if (participants.length > 1) {
        if (!window.confirm("Det finns fler deltagare i listan än du. Vill du rensa övriga deltagare innan du delar?")) {
          return;
        }
        const me = participants[0];
        setParticipants([me]);
        setAnswers(answers.filter(a => a.participantId === me.id));
      }
      
      const directUrl = generateQuizDirectUrl(quizConfig, { lockMode: directLinkLockMode });
      setDirectUrlLength(directUrl.length);

      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: quizConfig.title || 'FamilyQuiz',
            text: `${quizConfig.title || 'FamilyQuiz'} - Tipsrunda`,
            url: directUrl,
          });
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      if (!navigator.clipboard?.writeText) {
        window.prompt(t(lang, 'shareDirectLinkBtn') || 'Länk till quiz:', directUrl);
        return;
      }
      await navigator.clipboard.writeText(directUrl);
      setCopiedDirectUrlCode(true);
      setTimeout(() => setCopiedDirectUrlCode(false), 6000);
    } catch (error) {
      console.error('Could not create direct quiz URL:', error);
      alert('Kunde inte skapa quizlänken. Kontrollera quizets innehåll.');
    }
  };


  const getProgress = () => {
    if (participants.length === 0) return 0;
    const totalPossibleAnswers = participants.length * totalQuestions;
    return (answers.length / totalPossibleAnswers) * 100;
  };
  const languageMenuPortal = isLanguageMenuOpen && typeof document !== 'undefined'
    ? createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed w-56 rounded-2xl border border-white/15 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-md z-[2000]"
            style={{ top: languageMenuPosition.top, left: languageMenuPosition.left }}
            data-language-menu-root
          >
            {SUPPORTED_LANGUAGES.map((l) => {
              const isActive = lang === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    handleLanguageChange(l.code);
                    setIsLanguageMenuOpen(false);
                  }}
                  className={'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition-colors ' + (
                    isActive ? 'bg-indigo-600 font-black text-white' : 'text-slate-200 hover:bg-white/10'
                  )}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="text-lg leading-none">{l.flag}</span>
                    <span className="text-sm font-semibold truncate">{l.name}</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">{l.code}</span>
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>,
        document.body
      )
    : null;

  return (
    <div className="min-h-screen bg-indigo-600 text-slate-900 font-sans p-2 sm:p-3 md:p-6 flex flex-col">
      {languageMenuPortal}
      <div className="fixed inset-x-0 top-0 z-[200] bg-slate-950/85 backdrop-blur-sm border-b border-white/10 shadow-md">
        <a
          href={cachedAppUrl}
          target="_blank"
          rel="noreferrer"
          className="block max-w-5xl mx-auto px-2 py-1.5 text-center text-[8px] sm:text-[10px] font-black tracking-[0.08em] text-indigo-100 hover:text-white transition-colors truncate"
          title={cachedAppUrl}
        >
          {cachedAppUrl}
        </a>
      </div>

      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 pt-7 sm:pt-9">
        {/* Messenger & Instagram In-App Browser Breakout Modal / Banner */}
        <InAppBreakoutModal lang={lang} />

        {/* Header Component */}
        <Header
          lang={lang}
          quizConfig={quizConfig}
          view={view}
          setView={setView}
          handleQuizIconClick={handleQuizIconClick}
          isLanguageMenuOpen={isLanguageMenuOpen}
          setIsLanguageMenuOpen={setIsLanguageMenuOpen}
          languageMenuButtonRef={languageMenuButtonRef}
          selectedLanguage={selectedLanguage}
          deferredInstallPrompt={deferredInstallPrompt}
          handleInstallPwa={handleInstallPwa}
          isQuizModeLocked={isQuizModeLocked}
          isFacitUnlocked={isFacitUnlocked}
          isAdmin={isAdmin}
          setShowConfigInput={setShowConfigInput}
          setConfigTab={setConfigTab}
        />

        {/* Global Notification / Alert Toast */}
        <AnimatePresence>
          {dbNotification && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="mt-2 mb-1 px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white text-xs sm:text-sm font-bold shadow-xl border border-white/20 flex items-center justify-between gap-3 z-50 backdrop-blur-md"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="truncate">{dbNotification}</span>
              </div>
              <button
                type="button"
                onClick={() => setDbNotification(null)}
                className="text-slate-400 hover:text-white p-1 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Load Confirmation Modal */}
        <AnimatePresence>
          {showLoadConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <h2 className="text-xl font-black text-slate-800">{t(lang, 'restartBtn')}</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {lang === 'sv' ? 'Vill du rensa gamla svar och deltagare innan du byter quiz?' : 'Do you want to clear old answers and participants before switching quiz?'}
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowLoadConfirm(null)}
                    className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-black uppercase text-slate-600 hover:bg-slate-200"
                  >
                    {t(lang, 'back')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (showLoadConfirm.type === 'db') {
                        handleLoadQuizFromDB(showLoadConfirm.payload, false);
                      } else {
                        loadLibraryQuiz(showLoadConfirm.payload);
                      }
                      setShowLoadConfirm(null);
                    }}
                    className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-black uppercase text-white hover:bg-rose-700"
                  >
                    {t(lang, 'restartBtn')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Content Views: Tipspromenad & Inställningar */}
        <AnimatePresence mode="wait">
          {view === 'setup' && (
            <SetupView
              lang={lang}
              quizConfig={quizConfig}
              participants={participants}
              totalQuestions={totalQuestions}
              getQuizAvailableLanguages={getQuizAvailableLanguages}
              addParticipant={addParticipant}
              updateParticipantName={updateParticipantName}
              validateAndFinalizeParticipantName={validateAndFinalizeParticipantName}
              shareDirectQuizUrl={shareDirectQuizUrl}
              shareParticipantAnswers={shareParticipantAnswers}
              importSharedAnswers={importSharedAnswers}
              setShowHowItWorks={setShowHowItWorks}
              isDirectLinkLocked={isQuizModeLocked}
              setView={setView}
            />
          )}

          {view === 'quiz' && (
            <QuizWalkView
              lang={lang}
              quizConfig={quizConfig}
              participants={participants}
              answers={answers}
              selectedParticipantId={selectedParticipantId}
              setSelectedParticipantId={setSelectedParticipantId}
              selectedQuestionIndex={selectedQuestionIndex}
              setSelectedQuestionIndex={setSelectedQuestionIndex}
              visibleQuestionIndexes={visibleQuestionIndexes}
              userLocation={userLocation}
              setView={setView}
              pointsInputValue={pointsInputValue}
              setPointsInputValue={setPointsInputValue}
              submitPointsAnswer={submitPointsAnswer}
              textInputValue={textInputValue}
              setTextInputValue={setTextInputValue}
              submitTextAnswer={submitTextAnswer}
              submitAnswer={submitAnswer}
              setZoomedImageUrl={setZoomedImageUrl}
              isFacitUnlocked={isFacitUnlocked}
              isAdmin={isAdmin}
              locateUser={locateUser}
              isLocating={isLocating}
              walkedPath={walkedPath}
              setWalkedPath={setWalkedPath}
              STORAGE_KEY_WALKED_PATH={STORAGE_KEY_WALKED_PATH}
              handleSelectQuestionIndex={handleSelectQuestionIndex}
              getQuizAnswerProgress={getQuizAnswerProgress}
              quizQuestionPool={quizQuestionPool}
              visibleQuestionCount={visibleQuestionCount}
            />
          )}

          {view === 'results' && (
            <ResultsView
              lang={lang}
              quizConfig={quizConfig}
              participants={participants}
              answers={answers}
              totalQuestions={totalQuestions}
              viewingParticipantId={viewingParticipantId}
              setViewingParticipantId={setViewingParticipantId}
              isFacitUnlocked={isFacitUnlocked}
              setIsFacitUnlocked={setIsFacitUnlocked}
              isAdmin={isAdmin}
              isQuizModeLocked={isQuizModeLocked}
              facitPasswordInput={facitPasswordInput}
              setFacitPasswordInput={setFacitPasswordInput}
              getQuizAnswerProgress={getQuizAnswerProgress}
              showResetConfirm={showResetConfirm}
              setShowResetConfirm={setShowResetConfirm}
              handleResetQuiz={confirmResetQuiz}
              showResultsActions={showResultsActions}
              setShowResultsActions={setShowResultsActions}
              shareDirectQuizUrl={shareDirectQuizUrl}
              shareParticipantAnswers={shareParticipantAnswers}
              importSharedAnswers={importSharedAnswers}
              hasAnyGeotag={hasAnyGeotag}
              walkedPath={walkedPath}
              calculatePathDistance={calculatePathDistance}
              formatDistance={formatDistance}
              setSelectedQuestionIndex={setSelectedQuestionIndex}
              setSelectedParticipantId={setSelectedParticipantId}
              setView={setView}
              isDirectLinkLocked={isQuizModeLocked}
              setZoomedImageUrl={setZoomedImageUrl}
            />
          )}

          {view === 'config' && (
            <SettingsView
              lang={lang}
              quizConfig={quizConfig}
              setQuizConfig={setQuizConfig}
              isConfigUnlocked={isPasswordCorrect}
              setIsConfigUnlocked={setIsPasswordCorrect}
              isAdmin={isAdmin}
              setIsAdmin={setIsAdmin}
              configMasterPasswordInput={passwordInput}
              setConfigMasterPasswordInput={setPasswordInput}
              setView={setView}
              configTab={configTab as any}
              setConfigTab={setConfigTab as any}
              editingQuestionsCategory={editingQuestionsCategory}
              setEditingQuestionsCategory={setEditingQuestionsCategory}
              setShowCreateQuestionModal={setShowCreateQuestionModal}
              showRouteGeoTagModal={showRouteGeoTagModal}
              setShowRouteGeoTagModal={setShowRouteGeoTagModal}
              setFullScreenEditingQuestionId={setFullScreenEditingQuestionId}
              aiPrompt={aiTopic}
              setAiPrompt={setAiTopic}
              aiBarnCount={aiCount}
              setAiBarnCount={setAiCount}
              aiVuxenCount={aiCount}
              setAiVuxenCount={setAiCount}
              aiIncludeGeotags={aiGeotagLandmarks}
              setAiIncludeGeotags={setAiGeotagLandmarks}
              aiUseImages={false}
              setAiUseImages={() => {}}
              isGeneratingAi={isGenerating}
              handleGenerateQuizWithAI={generateWithAi}
              isBatchTranslating={isBatchTranslating}
              batchTranslateProgress={batchTranslateProgress}
              handleBatchTranslateQuiz={handleBatchTranslateQuiz}
              pastedJsonInput={pastedJsonInput}
              setPastedJsonInput={setPastedJsonInput}
              handleImportPastedJson={handleImportPastedJson}
              showApiKeyInput={showApiKeyInput}
              setShowApiKeyInput={setShowApiKeyInput}
              customApiKey={userApiKeyInput}
              setCustomApiKey={setUserApiKeyInput}
              handleSaveCustomApiKey={handleSaveCustomApiKey}
              userLocation={userLocation}
              savedQuizzes={savedQuizzes}
              handleSaveCurrentQuizToDB={handleSaveCurrentQuizToDB}
              isSavingToDb={isSavingToDb}
              handleShareExportDB={handleShareExportDB}
              handleImportBackupJSONFile={handleImportBackupJSONFile}
              handleClearAllDB={handleClearAllDB}
              dbSearchQuery={dbSearchQuery}
              setDbSearchQuery={setDbSearchQuery}
              dbFilterCategory={dbFilterCategory}
              setDbFilterCategory={setDbFilterCategory}
              dbSortBy={dbSortBy}
              setDbSortBy={setDbSortBy}
              handleLoadQuizFromDB={handleLoadQuizFromDB}
              handleOverwriteQuizInDB={handleOverwriteQuizInDB}
              handleDeleteQuizFromDB={handleDeleteQuizFromDB}
              quizMetadataList={quizLibrary}
              librarySearchQuery={librarySearchQuery}
              setLibrarySearchQuery={setLibrarySearchQuery}
              libraryFilterLanguage={libraryFilterLanguage}
              setLibraryFilterLanguage={setLibraryFilterLanguage}
              librarySortBy={librarySortBy}
              setLibrarySortBy={setLibrarySortBy}
              isLoadingCatalog={isLibraryLoading}
              catalogLoadError={libraryError}
              handleLoadPresetQuiz={loadLibraryQuiz}
              configJsonInput={configJsonInput}
              setConfigJsonInput={setConfigJsonInput}
              handleImportConfig={handleImportConfig}
              currentQuizId={quizConfig.quizId || ''}
              showCreateNewQuizConfirm={showCreateNewQuizConfirm}
              setShowCreateNewQuizConfirm={setShowCreateNewQuizConfirm}
              handleCreateNewQuizConfirm={confirmCreateNewQuiz}
              showResetConfirm={showResetConfirm}
              setShowResetConfirm={setShowResetConfirm}
              handleResetQuiz={confirmResetQuiz}
              showClearConfirm={showClearConfirm}
              setShowClearConfirm={setShowClearConfirm}
              handleClearAllData={handleClearAllDB}
              showSettingsHelp={showSettingsHelp}
              setShowSettingsHelp={setShowSettingsHelp}
              handleLogoUpload={handleLogoUpload}
              handleRemoveLogo={handleRemoveLogo}
              directLinkLockMode={directLinkLockMode}
              setDirectLinkLockMode={setDirectLinkLockMode}
              directLinkLockOrderMode={directLinkLockOrderMode}
              setDirectLinkLockOrderMode={setDirectLinkLockOrderMode}
              shareDirectQuizUrl={shareDirectQuizUrl}
              copiedDirectUrlCode={copiedDirectUrlCode}
              setCopiedDirectUrlCode={setCopiedDirectUrlCode}
              directUrlLength={directUrlLength}
              newQuizTitle={newQuizTitle}
              setNewQuizTitle={setNewQuizTitle}
              newPassword={newQuizPassword}
              setNewPassword={setNewQuizPassword}
              newGeotagDistance={newGeotagDistance}
              setNewGeotagDistance={setNewGeotagDistance}
              handleApplyBatchRouteLocations={handleApplyRouteGeoTags}
            />
          )}
        </AnimatePresence>

        {/* Fullscreen Question Editor Modal */}
        {fullScreenEditingQuestionId && (
          <QuestionFullScreenEditor
            questionId={fullScreenEditingQuestionId}
            onClose={() => setFullScreenEditingQuestionId(null)}
            editingQuestionsCategory={editingQuestionsCategory}
            setEditingQuestionsCategory={setEditingQuestionsCategory}
            quizConfig={quizConfig}
            setQuizConfig={setQuizConfig}
            updateQuestion={updateQuestion}
            handleGeotagQuestion={handleGeotagQuestion}
            handleAiGeotagSingleQuestion={handleAiGeotagSingleQuestion}
            isAiGeotagging={isAiGeotagging}
            userLocation={userLocation}
            isAdmin={isAdmin}
            lang={lang}
            setZoomedImageUrl={setZoomedImageUrl}
          />
        )}

        {/* Global Import / Preset Library Modal */}
        {showConfigInput && (
          <GlobalImportModal
            isOpen={showConfigInput}
            onClose={() => setShowConfigInput(false)}
            lang={lang}
            configTab={configTab}
            setConfigTab={setConfigTab}
            savedQuizzes={savedQuizzes}
            dbSearchQuery={dbSearchQuery}
            setDbSearchQuery={setDbSearchQuery}
            dbFilterCategory={dbFilterCategory}
            setDbFilterCategory={setDbFilterCategory}
            dbSortBy={dbSortBy}
            setDbSortBy={setDbSortBy}
            quizMetadataList={quizLibrary}
            librarySearchQuery={librarySearchQuery}
            setLibrarySearchQuery={setLibrarySearchQuery}
            libraryFilterLanguage={libraryFilterLanguage}
            setLibraryFilterLanguage={setLibraryFilterLanguage}
            librarySortBy={librarySortBy}
            setLibrarySortBy={setLibrarySortBy}
            isLoadingCatalog={isLibraryLoading}
            catalogLoadError={libraryError}
            handleLoadQuizFromDB={handleLoadQuizFromDB}
            handleDeleteQuizFromDB={handleDeleteQuizFromDB}
            handleLoadPresetQuiz={loadLibraryQuiz}
            configJsonInput={configJsonInput}
            setConfigJsonInput={setConfigJsonInput}
            handleImportConfig={handleImportConfig}
            quizConfig={quizConfig}
            handleSaveCurrentQuizToDB={handleSaveCurrentQuizToDB}
            isSavingToDb={isSavingToDb}
          />
        )}

        {/* Image Zoom Modal */}
        <ImageZoomModal
          imageUrl={zoomedImageUrl}
          onClose={() => setZoomedImageUrl(null)}
        />

        {/* How It Works Help Modal */}
        <HowItWorksModal
          isOpen={showHowItWorks}
          onClose={() => setShowHowItWorks(false)}
          lang={lang}
        />
      </div>
    </div>
  );
}
