/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Database,
  Save,
  Share2,
  Upload,
  Trash2,
  Search,
  ArrowUpDown,
  Download,
  FolderOpen,
  Sparkles,
  MapPin,
  Globe,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Language, t } from '../../i18n';
import { QuizConfig } from '../../types';
import { SavedQuizRecord } from '../../quizDb';
import { QuizMetadata } from '../../types';
import { getQuizAvailableLanguages, getLibraryItemLanguages } from '../../utils/quizLanguages';

export interface DatabaseAndLibraryTabProps {
  lang: Language;
  quizConfig: QuizConfig;
  savedQuizzes: SavedQuizRecord[];
  handleSaveCurrentQuizToDB: () => Promise<void>;
  isSavingToDb: boolean;
  handleShareExportDB: () => Promise<void>;
  handleImportBackupJSONFile: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleClearAllDB: () => Promise<void>;
  dbSearchQuery: string;
  setDbSearchQuery: (q: string) => void;
  dbFilterCategory: string;
  setDbFilterCategory: (c: string) => void;
  dbSortBy: 'date-desc' | 'date-asc' | 'name-asc';
  setDbSortBy: (s: 'date-desc' | 'date-asc' | 'name-asc') => void;
  handleLoadQuizFromDB: (item: SavedQuizRecord, closeModal?: boolean) => void;
  handleOverwriteQuizInDB: (id: string) => Promise<void>;
  handleDeleteQuizFromDB: (id: string) => Promise<void>;
  quizMetadataList: QuizMetadata[];
  librarySearchQuery: string;
  setLibrarySearchQuery: (q: string) => void;
  libraryFilterLanguage: string;
  setLibraryFilterLanguage: (l: string) => void;
  librarySortBy: 'name-asc' | 'date-desc' | 'count-desc';
  setLibrarySortBy: (s: 'name-asc' | 'date-desc' | 'count-desc') => void;
  isLoadingCatalog: boolean;
  catalogLoadError: string | null;
  handleLoadPresetQuiz: (meta: QuizMetadata) => void;
  configJsonInput: string;
  setConfigJsonInput: (v: string) => void;
  handleImportConfig: () => void;
  currentQuizId: string;
}

export const DatabaseAndLibraryTab: React.FC<DatabaseAndLibraryTabProps> = ({
  lang,
  quizConfig,
  savedQuizzes,
  handleSaveCurrentQuizToDB,
  isSavingToDb,
  handleShareExportDB,
  handleImportBackupJSONFile,
  handleClearAllDB,
  dbSearchQuery,
  setDbSearchQuery,
  dbFilterCategory,
  setDbFilterCategory,
  dbSortBy,
  setDbSortBy,
  handleLoadQuizFromDB,
  handleOverwriteQuizInDB,
  handleDeleteQuizFromDB,
  quizMetadataList,
  librarySearchQuery,
  setLibrarySearchQuery,
  libraryFilterLanguage,
  setLibraryFilterLanguage,
  librarySortBy,
  setLibrarySortBy,
  isLoadingCatalog,
  catalogLoadError,
  handleLoadPresetQuiz,
  configJsonInput,
  setConfigJsonInput,
  handleImportConfig,
  currentQuizId
}) => {
  const dbFileInputRef = useRef<HTMLInputElement>(null);
  const [showAllSavedQuizzes, setShowAllSavedQuizzes] = useState(true);
  const [dbNotification, setDbNotification] = useState<string | null>(null);
  const latestSavedQuiz = savedQuizzes.length > 0 ? savedQuizzes[0] : null;

  const filteredSavedQuizzes = useMemo(() => {
    return savedQuizzes.filter(q => {
      if (!q || typeof q.title !== 'string') return false;
      const matchesSearch = !dbSearchQuery || q.title.toLowerCase().includes(dbSearchQuery.toLowerCase());
      const matchesCat = dbFilterCategory === 'all' || 
        (dbFilterCategory === 'barn' && q.barnCount > 0) ||
        (dbFilterCategory === 'vuxen' && q.vuxenCount > 0) ||
        (dbFilterCategory === 'geotag' && q.hasLocations);
      return matchesSearch && matchesCat;
    });
  }, [savedQuizzes, dbSearchQuery, dbFilterCategory]);

  const sortedSavedQuizzes = useMemo(() => {
    return [...filteredSavedQuizzes].sort((a, b) => {
      if (dbSortBy === 'date-desc') return b.updatedAt - a.updatedAt;
      if (dbSortBy === 'date-asc') return a.updatedAt - b.updatedAt;
      if (dbSortBy === 'name-asc') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [filteredSavedQuizzes, dbSortBy]);

  const filteredLibraryQuizzes = useMemo(() => {
    return quizMetadataList.filter(q => {
      if (!q || typeof q.title !== 'string') return false;
      const matchesSearch = !librarySearchQuery || 
        q.title.toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
        (q.description && q.description.toLowerCase().includes(librarySearchQuery.toLowerCase()));
      const matchesLang = libraryFilterLanguage === 'all' || q.language === libraryFilterLanguage;
      return matchesSearch && matchesLang;
    });
  }, [quizMetadataList, librarySearchQuery, libraryFilterLanguage]);

  const sortedLibraryQuizzes = useMemo(() => {
    return [...filteredLibraryQuizzes].sort((a, b) => {
      const aTitle = a.title || '';
      const bTitle = b.title || '';
      if (librarySortBy === 'name-asc') return aTitle.localeCompare(bTitle);
      if (librarySortBy === 'count-desc') return ((b.barnCount || 0) + (b.vuxenCount || 0)) - ((a.barnCount || 0) + (a.vuxenCount || 0));
      return 0;
    });
  }, [filteredLibraryQuizzes, librarySortBy]);

  return (
                    <div className="space-y-6">
                      {/* Header Banner */}
                      <div className="bg-gradient-to-br from-indigo-50 to-slate-50 p-5 sm:p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shrink-0">
                            <Database className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-black text-base text-slate-800">{t(lang, 'dbSectionTitle')}</h3>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5">{t(lang, 'dbSectionDesc')}</p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <button
                            onClick={handleSaveCurrentQuizToDB}
                            disabled={isSavingToDb}
                            className="py-3 px-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                          >
                            <Save className="w-4 h-4 text-indigo-200" />
                            <span>{t(lang, 'saveCurrentToDbBtn')}</span>
                          </button>

                          <button
                            onClick={handleShareExportDB}
                            className="py-3 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                          >
                            <Share2 className="w-4 h-4 text-emerald-200" />
                            <span>{t(lang, 'exportDbBtn')}</span>
                          </button>

                          <button
                            onClick={() => dbFileInputRef.current?.click()}
                            className="py-3 px-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                          >
                            <Upload className="w-4 h-4 text-slate-300" />
                            <span>{t(lang, 'importDbBtn')}</span>
                          </button>
                          <input 
                            type="file" 
                            ref={dbFileInputRef} 
                            accept=".json" 
                            className="hidden" 
                            onChange={handleImportBackupJSONFile} 
                          />
                        </div>
                      </div>

                      {/* Notification Alert Banner */}
                      <AnimatePresence>
                        {dbNotification && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                <Check className="w-5 h-5 text-white stroke-[3]" />
                              </div>
                              <p className="font-black text-xs sm:text-sm">{dbNotification}</p>
                            </div>
                            <button 
                              onClick={() => setDbNotification(null)}
                              className="text-emerald-100 hover:text-white p-1 font-black text-sm shrink-0"
                            >
                              ✕
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* SENASTE / NUVARANDE QUIZ SECTION (ALLTID SYNLIG OVANFÖR DÖLJ-KNAPPEN) */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            <h3 className="font-black text-xs uppercase tracking-widest text-slate-500">
                              {t(lang, 'recentQuizSection')}
                            </h3>
                          </div>
                          {latestSavedQuiz && (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                              {t(lang, 'latestSavedBadge')}
                            </span>
                          )}
                        </div>

                        {latestSavedQuiz ? (
                          <div className="p-4 rounded-3xl bg-white border-2 border-indigo-200/90 shadow-sm space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-black text-slate-800 text-base leading-snug">{latestSavedQuiz.title || 'Okänd'}</h4>
                                  {quizConfig?.title?.trim() === (latestSavedQuiz.title || '').trim() && (
                                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                                      {t(lang, 'currentlyLoadedBadge')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium mt-1">
                                  {new Date(latestSavedQuiz.updatedAt).toLocaleDateString()} {new Date(latestSavedQuiz.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                <span className="text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200/60 px-2.5 py-1 rounded-full">
                                  🧒 {latestSavedQuiz.barnCount}
                                </span>
                                <span className="text-[10px] font-black bg-pink-50 text-pink-700 border border-pink-200/60 px-2.5 py-1 rounded-full">
                                  🧔 {latestSavedQuiz.vuxenCount}
                                </span>
                                {latestSavedQuiz.hasLocations && (
                                  <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-1 rounded-full flex items-center gap-0.5">
                                    <MapPin className="w-3 h-3 inline" /> GPS
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                              <button
                                onClick={handleSaveCurrentQuizToDB}
                                disabled={isSavingToDb}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                              >
                                <Save className="w-3.5 h-3.5 text-indigo-200" />
                                <span>{t(lang, 'saveCurrentQuizShortBtn')}</span>
                              </button>

                              <button
                                onClick={() => handleLoadQuizFromDB(latestSavedQuiz)}
                                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all active:scale-95"
                              >
                                <FolderOpen className="w-3.5 h-3.5" />
                                <span>{t(lang, 'loadQuizBtn')}</span>
                              </button>

                              <button
                                onClick={() => handleOverwriteQuizInDB(latestSavedQuiz.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1 transition-all active:scale-95"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>{t(lang, 'overwriteQuizBtn')}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-800 text-sm">{quizConfig.title || 'Nuvarande quiz'}</h4>
                                <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                  {t(lang, 'currentlyLoadedBadge')}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                🧒 {quizConfig.barnQuestions?.length || 0} barnfrågor • 🧔 {quizConfig.vuxenQuestions?.length || 0} vuxenfrågor
                              </p>
                            </div>
                            <button
                              onClick={handleSaveCurrentQuizToDB}
                              disabled={isSavingToDb}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95"
                            >
                              <Save className="w-4 h-4 text-indigo-200" />
                              <span>{t(lang, 'saveCurrentQuizShortBtn')}</span>
                            </button>
                          </div>
                        )}

                        {/* TOGGLE: DÖLJ / VISA ALLA SPARADE QUIZ KNAPP */}
                        {savedQuizzes.length > 0 && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setShowAllSavedQuizzes(!showAllSavedQuizzes)}
                              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200/90 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs border border-slate-200/70"
                            >
                              {showAllSavedQuizzes ? (
                                <>
                                  <ChevronUp className="w-4 h-4 text-indigo-600" />
                                  <span>{t(lang, 'hideSavedQuizzes')} ({savedQuizzes.length})</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4 text-indigo-600" />
                                  <span>{t(lang, 'showSavedQuizzes')} ({savedQuizzes.length})</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Saved Quizzes Full List (Collapsible via showAllSavedQuizzes) */}
                      {showAllSavedQuizzes && (
                        <div className="space-y-3 pt-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">
                                {t(lang, 'savedQuizzesHeading')} ({savedQuizzes.length})
                              </h3>
                              {savedQuizzes.length > 0 && (
                                <button
                                  onClick={handleClearAllDB}
                                  className="text-[11px] font-bold text-rose-500 hover:text-rose-700 underline ml-1"
                                >
                                  {t(lang, 'clearDbBtn')}
                                </button>
                              )}
                            </div>

                            {savedQuizzes.length > 1 && (
                              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 self-start sm:self-auto shrink-0">
                                <span className="text-[10px] font-bold text-slate-500 px-1 flex items-center gap-1">
                                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                  {t(lang, 'sortByLabel')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setDbSortBy('date-desc')}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                                    dbSortBy === 'date-desc'
                                      ? 'bg-white text-indigo-600 shadow-xs'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  {t(lang, 'sortDateDesc')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDbSortBy('date-asc')}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                                    dbSortBy === 'date-asc'
                                      ? 'bg-white text-indigo-600 shadow-xs'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  {t(lang, 'sortDateAsc')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDbSortBy('name-asc')}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                                    dbSortBy === 'name-asc'
                                      ? 'bg-white text-indigo-600 shadow-xs'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  {t(lang, 'sortNameAsc')}
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                            {sortedSavedQuizzes.map((item) => (
                              <div 
                                key={item.id}
                                className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-indigo-200 transition-all space-y-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h4 className="font-black text-slate-800 text-base leading-snug">{item.title || 'Okänd'}</h4>
                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                      {item.updatedAt ? `${new Date(item.updatedAt).toLocaleDateString()} ${new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-full">
                                      🧒 {item.barnCount}
                                    </span>
                                    <span className="text-[10px] font-black bg-pink-50 text-pink-700 border border-pink-200/60 px-2 py-0.5 rounded-full">
                                      🧔 {item.vuxenCount}
                                    </span>
                                    {item.hasLocations && (
                                      <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                        <MapPin className="w-3 h-3 inline" /> GPS
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                  <button
                                    onClick={() => handleLoadQuizFromDB(item)}
                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-black text-xs flex items-center gap-1 transition-all active:scale-95"
                                  >
                                    <FolderOpen className="w-3.5 h-3.5" />
                                    <span>{t(lang, 'loadQuizBtn')}</span>
                                  </button>

                                  <button
                                    onClick={() => handleOverwriteQuizInDB(item.id)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1 transition-all active:scale-95"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>{t(lang, 'overwriteQuizBtn')}</span>
                                  </button>

                                  <button
                                    onClick={() => handleDeleteQuizFromDB(item.id)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all active:scale-95"
                                    title={t(lang, 'deleteQuizBtn')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* SECTION: PRESET CATALOG QUIZZES (Bibliotek) */}
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-indigo-600" />
                            <h3 className="font-black text-xs uppercase tracking-wider text-slate-700">
                              {t(lang, 'premadeQuizzesSection')}
                            </h3>
                          </div>
                          {quizMetadataList.length > 0 && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                              {quizMetadataList.length}
                            </span>
                          )}
                        </div>

                        {/* Search & Filter Bar for Catalog */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                            <input
                              type="text"
                              value={librarySearchQuery}
                              onChange={(e) => setLibrarySearchQuery(e.target.value)}
                              placeholder={t(lang, 'searchCatalogPlaceholder') || 'Sök bland färdiga quiz...'}
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <select
                              value={libraryFilterLanguage}
                              onChange={(e) => setLibraryFilterLanguage(e.target.value)}
                              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none text-slate-700"
                            >
                              <option value="all">{t(lang, 'allLanguages') || 'Alla språk'}</option>
                              <option value="sv">🇸🇪 Svenska</option>
                              <option value="en">🇬🇧 English</option>
                            </select>
                          </div>
                        </div>

                        {isLoadingCatalog ? (
                          <div className="p-10 text-center text-slate-400 font-bold flex flex-col items-center gap-3">
                            <div className="w-7 h-7 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs">{t(lang, 'loadingLibrary')}</p>
                          </div>
                        ) : catalogLoadError ? (
                          <div className="p-6 text-center bg-rose-50 rounded-2xl border border-rose-100 flex flex-col items-center gap-2.5">
                            <p className="text-xs font-bold text-rose-700">{t(lang, 'libraryError')}</p>
                            <p className="text-[11px] text-rose-600 font-mono max-w-md break-all bg-white/70 px-2 py-1 rounded border border-rose-200">{catalogLoadError}</p>
                          </div>
                        ) : sortedLibraryQuizzes.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border border-slate-200/60">
                            <Database className="w-7 h-7 mx-auto mb-2 opacity-20" />
                            <p className="text-xs">{t(lang, 'libraryEmpty')}</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-1 custom-scrollbar">
                            {sortedLibraryQuizzes.map(item => {
                              const totalQuestions = (item.barnCount || 0) + (item.vuxenCount || 0);
                              return (
                                <div key={item.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-300 transition-all space-y-3 flex flex-col group">
                                  <div className="flex-1 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <h4 className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{item.title || 'Okänd'}</h4>
                                      {item.language && (
                                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 font-bold text-[10px] px-2 py-0.5 rounded-md border border-indigo-100 uppercase">
                                          {item.language === 'sv' ? '🇸🇪 SV' : item.language === 'en' ? '🇬🇧 EN' : item.language.toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">{item.description || ''}</p>
                                    
                                    <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
                                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                        🧒 {item.barnCount || 0} barn
                                      </span>
                                      <span className="inline-flex items-center gap-1 bg-pink-50 text-pink-900 border border-pink-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                        🧔 {item.vuxenCount || 0} vuxna
                                      </span>
                                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                        📋 {totalQuestions} frågor
                                      </span>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => handleLoadPresetQuiz(item)}
                                    className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-xl font-black text-[10px] uppercase transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>{t(lang, 'loadQuizBtn')}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Manual Import Box (Pasted Code) */}
                      <div className="pt-4 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between px-1">
                           <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400">{t(lang, 'importPastedJsonBtn')}</h3>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3">
                          <textarea 
                            rows={2}
                            value={configJsonInput}
                            onChange={(e) => setConfigJsonInput(e.target.value)}
                            placeholder={t(lang, 'pasteAiResponsePlaceholder')}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          />
                          <button
                            onClick={handleImportConfig}
                            disabled={!configJsonInput.trim()}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-emerald-200" />
                            <span>{t(lang, 'importPastedJsonBtn')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
  );
};
