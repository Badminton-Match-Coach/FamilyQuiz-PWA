/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileDown,
  Upload,
  Sparkles,
  Database,
  ArrowRight,
  HelpCircle,
  FileSpreadsheet,
  Globe,
  ChevronDown,
  ChevronUp,
  X,
  Share2,
  CheckCircle2,
  Download,
  Save,
  Trash2,
  MapPin,
  HardDrive
} from 'lucide-react';
import { Language, t } from '../../i18n';
import { SavedQuizRecord, QuizMetadata, QuizConfig } from '../../types';

export interface GlobalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  configTab: 'library' | 'questions' | 'db' | 'general' | 'ai';
  setConfigTab: (tab: 'library' | 'questions' | 'db' | 'general' | 'ai') => void;
  savedQuizzes: SavedQuizRecord[];
  dbSearchQuery: string;
  setDbSearchQuery: (q: string) => void;
  dbFilterCategory: string;
  setDbFilterCategory: (c: string) => void;
  dbSortBy: 'date-desc' | 'date-asc' | 'name-asc';
  setDbSortBy: (s: 'date-desc' | 'date-asc' | 'name-asc') => void;
  quizMetadataList: QuizMetadata[];
  librarySearchQuery: string;
  setLibrarySearchQuery: (q: string) => void;
  libraryFilterLanguage: string;
  setLibraryFilterLanguage: (l: string) => void;
  librarySortBy: 'name-asc' | 'date-desc' | 'count-desc';
  setLibrarySortBy: (s: 'name-asc' | 'date-desc' | 'count-desc') => void;
  isLoadingCatalog: boolean;
  catalogLoadError: string | null;
  handleLoadQuizFromDB: (item: SavedQuizRecord, closeModal?: boolean) => void;
  handleDeleteQuizFromDB: (recordId: string) => void;
  handleLoadPresetQuiz: (meta: QuizMetadata) => void;
  configJsonInput: string;
  setConfigJsonInput: (value: string) => void;
  handleImportConfig: () => void;
  quizConfig?: QuizConfig;
  handleSaveCurrentQuizToDB?: () => Promise<void>;
  isSavingToDb?: boolean;
}

export const GlobalImportModal: React.FC<GlobalImportModalProps> = ({
  isOpen,
  onClose,
  lang,
  configTab,
  setConfigTab,
  savedQuizzes,
  dbSearchQuery,
  setDbSearchQuery,
  dbFilterCategory,
  setDbFilterCategory,
  dbSortBy,
  setDbSortBy,
  quizMetadataList,
  librarySearchQuery,
  setLibrarySearchQuery,
  libraryFilterLanguage,
  setLibraryFilterLanguage,
  librarySortBy,
  setLibrarySortBy,
  isLoadingCatalog,
  catalogLoadError,
  handleLoadQuizFromDB,
  handleDeleteQuizFromDB,
  handleLoadPresetQuiz,
  configJsonInput,
  setConfigJsonInput,
  handleImportConfig,
  quizConfig,
  handleSaveCurrentQuizToDB,
  isSavingToDb
}) => {
  const [showAllSavedQuizzes, setShowAllSavedQuizzes] = useState(false);
  const latestSavedQuiz = savedQuizzes.length > 0 ? savedQuizzes[0] : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base sm:text-lg">
                {t(lang, 'importQuizModalTitle') || 'Importera eller öppna frågesport'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {t(lang, 'importQuizModalSubtitle') || 'Välj från färdigt bibliotek, sparat arkiv eller klistra in JSON'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Quick presets section */}
          {quizMetadataList.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                {t(lang, 'presetQuizzes') || 'Färdiga frågesporter'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quizMetadataList.map(meta => (
                  <button
                    key={meta.id}
                    onClick={() => {
                      handleLoadPresetQuiz(meta);
                      onClose();
                    }}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-500/60 hover:bg-indigo-50/40 text-left transition-all group flex flex-col justify-between gap-3 shadow-2xs hover:shadow-md"
                  >
                    <div>
                      <div className="font-black text-sm text-slate-800 group-hover:text-indigo-600 flex items-center justify-between">
                        <span>{meta.title}</span>
                        <span className="text-xs">{meta.language === 'en' ? '🇬🇧' : '🇸🇪'}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1">
                        {meta.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 group-hover:text-indigo-600">
                      <span>{meta.barnCount || 0} barn</span>
                      <span>•</span>
                      <span>{meta.vuxenCount || 0} vuxna</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Saved Quizzes in Local DB */}
          {savedQuizzes.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  <span>{t(lang, 'savedQuizzes') || 'Sparade frågesporter'} ({savedQuizzes.length})</span>
                </h4>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedQuizzes.map(quiz => (
                  <div
                    key={quiz.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="min-w-0">
                      <h5 className="font-black text-xs text-slate-800 truncate">{quiz.title}</h5>
                      <p className="text-[10px] text-slate-400">
                        {new Date(quiz.updatedAt).toLocaleDateString()} • {quiz.barnCount} barn / {quiz.vuxenCount} vuxen
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          handleLoadQuizFromDB(quiz, true);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-2xs"
                      >
                        <Download className="w-3 h-3" />
                        <span>{t(lang, 'loadQuizBtn') || 'Ladda'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteQuizFromDB(quiz.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl"
                        title={t(lang, 'deleteQuizBtn')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paste JSON Config */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{t(lang, 'pasteJsonDirectly') || 'Klistra in JSON-konfiguration'}</span>
            </h4>
            <textarea
              value={configJsonInput}
              onChange={e => setConfigJsonInput(e.target.value)}
              placeholder="Klistra in quiz JSON här..."
              rows={4}
              className="w-full p-3 rounded-2xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  handleImportConfig();
                  onClose();
                }}
                disabled={!configJsonInput.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>{t(lang, 'importConfigBtn') || 'Importera'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
