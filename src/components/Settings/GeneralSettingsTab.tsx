/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Plus,
  Edit2,
  Lock,
  MapPin,
  CheckCircle2,
  Trash2,
  HelpCircle,
  X,
  Mail,
  Upload,
  ImageIcon,
  Database,
  ArrowUpDown,
  Check,
  Share2
} from 'lucide-react';
import { Language, t } from '../../i18n';
import { QuizConfig, Participant } from '../../types';
import { compressImageFile } from '../../utils/imageAndLabelUtils';
import { cacheLogoAsDataUrl } from '../../utils/logoCache';

export interface GeneralSettingsTabProps {
  lang: Language;
  quizConfig: QuizConfig;
  participants?: Participant[];
  setQuizConfig: React.Dispatch<React.SetStateAction<QuizConfig>>;
  isAdmin: boolean;
  setShowCreateNewQuizConfirm: (show: boolean) => void;
  showCreateNewQuizConfirm: boolean;
  handleCreateNewQuizConfirm: () => void;
  showResetConfirm: boolean;
  setShowResetConfirm: (show: boolean) => void;
  handleResetQuiz: () => void;
  showClearConfirm: boolean;
  setShowClearConfirm: (show: boolean) => void;
  handleClearAllData: () => void;
  showSettingsHelp: boolean;
  setShowSettingsHelp: (show: boolean) => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleRemoveLogo: () => void;
  directLinkLockMode: boolean;
  setDirectLinkLockMode: (v: boolean | ((prev: boolean) => boolean)) => void;
  directLinkLockOrderMode: boolean;
  setDirectLinkLockOrderMode: (v: boolean | ((prev: boolean) => boolean)) => void;
  shareDirectQuizUrl: () => Promise<void>;
  shareConfig: () => Promise<void>;
  shareAppUrl: () => Promise<void>;
  copiedDirectUrlCode: boolean;
  setCopiedDirectUrlCode: (v: boolean) => void;
  copiedConfigCode: boolean;
  setCopiedConfigCode: (v: boolean) => void;
  copiedAppUrlCode: boolean;
  setCopiedAppUrlCode: (v: boolean) => void;
  directUrlLength: number;
  newQuizTitle: string;
  setNewQuizTitle: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  newGeotagDistance: number;
  setNewGeotagDistance: (v: number) => void;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  lang,
  quizConfig,
  participants = [],
  setQuizConfig,
  isAdmin,
  setShowCreateNewQuizConfirm,
  showCreateNewQuizConfirm,
  handleCreateNewQuizConfirm,
  showResetConfirm,
  setShowResetConfirm,
  handleResetQuiz,
  showClearConfirm,
  setShowClearConfirm,
  handleClearAllData,
  showSettingsHelp,
  setShowSettingsHelp,
  handleLogoUpload,
  handleRemoveLogo,
  directLinkLockMode,
  setDirectLinkLockMode,
  directLinkLockOrderMode,
  setDirectLinkLockOrderMode,
  shareDirectQuizUrl,
  shareConfig,
  shareAppUrl,
  copiedDirectUrlCode,
  setCopiedDirectUrlCode,
  copiedConfigCode,
  setCopiedConfigCode,
  copiedAppUrlCode,
  setCopiedAppUrlCode,
  directUrlLength,
  newQuizTitle,
  setNewQuizTitle,
  newPassword,
  setNewPassword,
  newGeotagDistance,
  setNewGeotagDistance
}) => {
  const quizTitleInputRef = useRef<HTMLInputElement>(null);
  const [newQuizLogoUrl, setNewQuizLogoUrl] = useState(quizConfig.logoUrl || '');
  const [newQuizPassword, setNewQuizPassword] = useState(quizConfig.password || '');
  const [saveConfirmationMessage, setSaveConfirmationMessage] = useState<string | null>(null);
  return (
    <>
                    <div className="space-y-6">
                      {/* Create New Quiz Action Banner */}
                      {isAdmin && (
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 p-4 rounded-2xl flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 shadow-sm">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                              <h4 className="font-black text-xs uppercase tracking-wider text-emerald-950">{t(lang, 'createNewQuizBtn')}</h4>
                            </div>
                            <p className="text-xs text-emerald-700 font-medium leading-relaxed">{t(lang, 'createNewQuizDesc')}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowCreateNewQuizConfirm(true)}
                            className="w-full xs:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
                          >
                            <Plus className="w-4 h-4" />
                            <span>{t(lang, 'createNewQuizBtn')}</span>
                          </button>
                        </div>
                      )}

                      {/* Quiz Title */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/70 space-y-3">
                        <div className="flex items-center gap-2">
                          <Edit2 className="w-4 h-4 text-indigo-600" />
                          <h3 className="font-black text-xs text-slate-500 uppercase tracking-widest">{t(lang, 'quizTitleHeading')}</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <input 
                              ref={quizTitleInputRef}
                              type="text" 
                              placeholder={t(lang, 'quizTitlePlaceholder')}
                              className={`flex-1 p-3 border rounded-xl text-sm font-bold outline-none transition-all ${
                                isAdmin 
                                  ? 'bg-white border-slate-200 focus:border-indigo-500' 
                                  : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                              }`}
                              value={newQuizTitle}
                              readOnly={!isAdmin}
                              onChange={(e) => setNewQuizTitle(e.target.value)}
                            />
                            {isAdmin && (
                              <button 
                                onClick={() => {
                                  setQuizConfig({ ...quizConfig, title: newQuizTitle });
                                  setSaveConfirmationMessage(t(lang, 'titleUpdatedAlert'));
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase shadow-sm transition-all active:scale-95"
                              >
                                {t(lang, 'saveBtn')}
                              </button>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                              {t(lang, 'logoUrlLabel')}
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="url"
                                placeholder="https://example.com/logo.png"
                                className={`flex-1 p-3 border rounded-xl text-xs font-medium outline-none transition-all ${
                                  isAdmin
                                    ? 'bg-white border-slate-200 focus:border-indigo-500'
                                    : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                                }`}
                                value={newQuizLogoUrl}
                                readOnly={!isAdmin}
                                onChange={(e) => setNewQuizLogoUrl(e.target.value)}
                              />
                              {isAdmin && (
                                <button
                                  onClick={async () => {
                                    const cachedLogoUrl = await cacheLogoAsDataUrl(newQuizLogoUrl.trim() || undefined);
                                    setQuizConfig({ ...quizConfig, logoUrl: cachedLogoUrl });
                                    setSaveConfirmationMessage(t(lang, 'logoUpdatedAlert'));
                                  }}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase shadow-sm transition-all active:scale-95"
                                >
                                  {t(lang, 'saveBtn')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Password for Results */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/70 space-y-3">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-indigo-600" />
                          <h3 className="font-black text-xs text-slate-500 uppercase tracking-widest">{t(lang, 'resultsPasswordHeading')}</h3>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder={t(lang, 'newPasswordPlaceholder')}
                            className={`flex-1 p-3 border rounded-xl text-sm font-mono outline-none transition-all ${
                              isAdmin 
                                ? 'bg-white border-slate-200 focus:border-indigo-500' 
                                : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                            }`}
                            value={newQuizPassword}
                            readOnly={!isAdmin}
                            onChange={(e) => setNewQuizPassword(e.target.value)}
                          />
                          {isAdmin && (
                            <button 
                              onClick={() => {
                                setQuizConfig({ ...quizConfig, password: newQuizPassword });
                                setSaveConfirmationMessage(t(lang, 'passwordUpdatedAlert'));
                              }}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase shadow-sm transition-all active:scale-95"
                            >
                              {t(lang, 'saveBtn')}
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">{t(lang, 'currentPasswordLabel')} <span className="font-mono font-bold text-slate-600">{quizConfig.password || t(lang, 'noPasswordSet')}</span></p>
                        <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl text-amber-900 text-xs font-medium leading-relaxed">
                          {t(lang, 'emptyPasswordAutoFacitInfo')}
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/70 space-y-2">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-indigo-600" />
                          <h3 className="font-black text-xs text-slate-500 uppercase tracking-widest">{t(lang, 'quizIdHeading')}</h3>
                        </div>
                        <p className="break-all rounded-xl bg-white px-3 py-2 font-mono text-xs font-bold text-slate-700 border border-slate-200">{quizConfig.quizId}</p>
                      </div>

                      {/* Danger Zone */}
                      {isAdmin && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <button 
                            onClick={() => setShowClearConfirm(true)}
                            className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" /> {t(lang, 'clearAllDataBtn')}
                          </button>
                        </div>
                      )}

                      {/* Share */}
                      {isAdmin && (
                        <div className="space-y-3">
                          {/* Quiz Mode Lock Checkbox */}
                          <label className="flex items-start gap-3 p-3.5 bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-200/80 rounded-2xl cursor-pointer transition-all select-none">
                            <input
                              type="checkbox"
                              checked={directLinkLockMode}
                              onChange={(e) => setDirectLinkLockMode(e.target.checked)}
                              className="mt-0.5 w-4 h-4 rounded text-indigo-600 border-indigo-300 focus:ring-indigo-500 accent-indigo-600 shrink-0 cursor-pointer"
                            />
                            <div className="text-xs">
                              <span className="font-black text-indigo-950 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-indigo-600 inline" />
                                {t(lang, 'quizModeLockCheckboxTitle')}
                              </span>
                              <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                                {t(lang, 'quizModeLockCheckboxDesc')}
                              </p>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-3.5 bg-amber-50/80 hover:bg-amber-50 border border-amber-200 rounded-2xl cursor-pointer transition-all select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(quizConfig.requireSequentialAnswers)}
                              onChange={(e) => setQuizConfig(prev => ({ ...prev, requireSequentialAnswers: e.target.checked }))}
                              className="mt-0.5 w-4 h-4 rounded text-amber-600 border-amber-300 focus:ring-amber-500 accent-amber-600 shrink-0 cursor-pointer"
                            />
                            <div className="text-xs">
                              <span className="font-black text-amber-950 flex items-center gap-1.5">
                                <ArrowUpDown className="w-3.5 h-3.5 text-amber-700 inline" />
                                {t(lang, 'requireSequentialAnswersTitle')}
                              </span>
                              <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                                {t(lang, 'requireSequentialAnswersDesc')}
                              </p>
                            </div>
                          </label>

                          {/* Direct Quiz Link Button (Top recommended) */}
                          <button 
                            onClick={shareDirectQuizUrl}
                            className={`w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border transition-all font-black text-xs uppercase shadow-sm active:scale-95 ${
                              copiedDirectUrlCode 
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200' 
                                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-transparent shadow-indigo-200'
                            }`}
                          >
                            {copiedDirectUrlCode ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                                <span>{t(lang, 'codeCopiedToClipboard')}</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-4 h-4" />
                                <span>{t(lang, 'shareDirectLinkBtn')}</span>
                              </>
                            )}
                          </button>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <button 
                              onClick={shareConfig}
                              className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border transition-all font-black text-[11px] uppercase shadow-2xs active:scale-95 ${
                                copiedConfigCode 
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200' 
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              {copiedConfigCode ? (
                                <>
                                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                                  <span>{t(lang, 'codeCopiedToClipboard')}</span>
                                </>
                              ) : (
                                <>
                                  <Share2 className="w-4 h-4" />
                                  <span>{t(lang, 'copyCodeBtn')}</span>
                                </>
                              )}
                            </button>

                            <button 
                              onClick={shareAppUrl}
                              className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border transition-all font-black text-[11px] uppercase shadow-2xs active:scale-95 ${
                                copiedAppUrlCode 
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200' 
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                              }`}
                            >
                              {copiedAppUrlCode ? (
                                <>
                                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                                  <span>{t(lang, 'copiedNotice')}</span>
                                </>
                              ) : (
                                <>
                                  <Share2 className="w-4 h-4" />
                                  <span>{t(lang, 'copyAppUrlBtn')}</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Clipboard Notice Box for Direct Link */}
                          <AnimatePresence>
                            {copiedDirectUrlCode && (
                              <motion.div 
                                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                    <Check className="w-5 h-5 text-white stroke-[3]" />
                                  </div>
                                  <div>
                                    <p className="font-black text-xs sm:text-sm">{t(lang, 'directLinkCopiedTitle')}</p>
                                    <p className="text-[11px] text-indigo-100 font-medium">
                                      {t(lang, 'directLinkCopiedDesc')} {directUrlLength ? `(${directUrlLength} tecken)` : ''}
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setCopiedDirectUrlCode(false)}
                                  className="text-indigo-100 hover:text-white p-1 font-black text-sm shrink-0"
                                >
                                  ✕
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Clipboard Notice Box for Quiz Code */}
                          <AnimatePresence>
                            {copiedConfigCode && (
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
                                  <div>
                                    <p className="font-black text-xs sm:text-sm">{t(lang, 'quizCodeCopiedTitle')}</p>
                                    <p className="text-[11px] text-emerald-100 font-medium">{t(lang, 'quizCodeCopiedDesc')}</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setCopiedConfigCode(false)}
                                  className="text-emerald-100 hover:text-white p-1 font-black text-sm shrink-0"
                                >
                                  ✕
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Clipboard Notice Box for App URL */}
                          <AnimatePresence>
                            {copiedAppUrlCode && (
                              <motion.div 
                                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                className="p-4 bg-amber-500 text-white rounded-2xl shadow-lg flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                    <Check className="w-5 h-5 text-white stroke-[3]" />
                                  </div>
                                  <div>
                                    <p className="font-black text-xs sm:text-sm">{t(lang, 'appUrlCopiedTitle')}</p>
                                    <p className="text-[11px] text-amber-100 font-medium">{t(lang, 'appUrlCopiedDesc')}</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setCopiedAppUrlCode(false)}
                                  className="text-amber-100 hover:text-white p-1 font-black text-sm shrink-0"
                                >
                                  ✕
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Stats Overview */}
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest">{t(lang, 'overviewDataHeading')}</h3>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-100 text-center">
                            <p className="text-[10px] font-black text-amber-600 uppercase">{t(lang, 'childrenQuestionsCategory')}</p>
                            <p className="text-xl sm:text-2xl font-black text-amber-800">{quizConfig.barnQuestions.length}</p>
                          </div>
                          <div className="bg-pink-50 p-3.5 rounded-2xl border border-pink-100 text-center">
                            <p className="text-[10px] font-black text-pink-600 uppercase">{t(lang, 'adultQuestionsCategory')}</p>
                            <p className="text-xl sm:text-2xl font-black text-pink-800">{quizConfig.vuxenQuestions.length}</p>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase">{t(lang, 'participantsTab')}</p>
                            <p className="text-xl sm:text-2xl font-black text-slate-800">{participants.length}</p>
                          </div>
                        </div>
                      </div>

                      {/* Geotag Unlock Distance */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-indigo-600" />
                            <h3 className="font-black text-xs text-slate-500 uppercase tracking-widest">{t(lang, 'geotagDistanceHeading')}</h3>
                          </div>
                          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                            {newGeotagDistance} {t(lang, 'metersUnit')}
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                          {t(lang, 'geotagDistanceDesc')}
                        </p>

                        <div className="flex items-center gap-3">
                          <input 
                            type="range"
                            min={5}
                            max={100}
                            step={1}
                            disabled={!isAdmin}
                            value={newGeotagDistance}
                            onChange={(e) => {
                              const val = Math.max(5, parseInt(e.target.value) || 5);
                              setNewGeotagDistance(val);
                            }}
                            className="flex-1 accent-indigo-600 cursor-pointer disabled:opacity-50"
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input 
                              type="number" 
                              min={5}
                              max={500}
                              disabled={!isAdmin}
                              className={`w-20 p-2.5 text-center border rounded-xl text-sm font-black outline-none transition-all ${
                                isAdmin 
                                  ? 'bg-white border-slate-200 focus:border-indigo-500 text-slate-800' 
                                  : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                              }`}
                              value={newGeotagDistance}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) {
                                  setNewGeotagDistance(val);
                                } else {
                                  setNewGeotagDistance(5);
                                }
                              }}
                              onBlur={() => {
                                if (newGeotagDistance < 5) {
                                  setNewGeotagDistance(5);
                                }
                              }}
                            />
                            <span className="text-xs font-bold text-slate-400">m</span>
                          </div>
                          {isAdmin && (
                            <button 
                              onClick={() => {
                                const safeVal = Math.max(5, newGeotagDistance || 20);
                                setNewGeotagDistance(safeVal);
                                setQuizConfig({ ...quizConfig, geotagUnlockDistance: safeVal });
                                setSaveConfirmationMessage(t(lang, 'geotagDistanceUpdatedAlert'));
                              }}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase shadow-sm transition-all active:scale-95 shrink-0"
                            >
                              {t(lang, 'saveBtn')}
                            </button>
                          )}
                        </div>

                        {/* Quick preset buttons: 5m, 10m, 15m, 20m (Standard), 35m, 50m */}
                        {isAdmin && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {[5, 10, 15, 20, 35, 50].map((meters) => (
                              <button
                                key={meters}
                                type="button"
                                onClick={() => {
                                  setNewGeotagDistance(meters);
                                  setQuizConfig({ ...quizConfig, geotagUnlockDistance: meters });
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                                  newGeotagDistance === meters
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-200/70 text-slate-600 hover:bg-slate-300/80'
                                }`}
                              >
                                {meters} m {meters === 20 ? `(${t(lang, 'defaultPreset')})` : ''}
                              </button>
                            ))}
                          </div>
                        )}

                        <p className="text-[11px] text-slate-400 font-medium">
                          {t(lang, 'currentGeotagDistanceLabel')} <span className="font-mono font-bold text-slate-600">{quizConfig.geotagUnlockDistance || 20} m</span>
                        </p>
                      </div>

                      </div>
                        <AnimatePresence>
                    {showSettingsHelp && (
                      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setShowSettingsHelp(false)}
                          className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                        />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 20 }}
                          className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
                        >
                          <div className="bg-indigo-600 p-6 sm:p-8 text-white relative">
                            <button 
                              onClick={() => setShowSettingsHelp(false)}
                              className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                              <HelpCircle className="w-7 h-7" />
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black leading-tight">{t(lang, 'settingsHelpTitle')}</h2>
                            <p className="text-xs text-indigo-100 font-medium mt-1">{t(lang, 'settingsHelpSubtitle')}</p>
                          </div>
                          
                          <div className="p-6 sm:p-8 space-y-4 overflow-y-auto max-h-[65vh]">
                            <div className="flex gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 font-black text-sm">1</div>
                              <div className="space-y-1">
                                <h3 className="font-black text-base text-slate-800">{t(lang, 'settingsHelpStep1')}</h3>
                                <p className="text-slate-500 text-xs leading-relaxed font-medium">{t(lang, 'settingsHelpStep1Desc')}</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0 font-black text-sm">2</div>
                              <div className="space-y-1">
                                <h3 className="font-black text-base text-slate-800">{t(lang, 'settingsHelpStep2')}</h3>
                                <p className="text-slate-500 text-xs leading-relaxed font-medium">{t(lang, 'settingsHelpStep2Desc')}</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0 font-black text-sm">3</div>
                              <div className="space-y-1">
                                <h3 className="font-black text-base text-slate-800">{t(lang, 'settingsHelpStep3')}</h3>
                                <p className="text-slate-500 text-xs leading-relaxed font-medium">{t(lang, 'settingsHelpStep3Desc')}</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                              <div className="w-10 h-10 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center shrink-0 font-black text-sm">4</div>
                              <div className="space-y-1">
                                <h3 className="font-black text-base text-slate-800">{t(lang, 'settingsHelpStep4')}</h3>
                                <p className="text-slate-500 text-xs leading-relaxed font-medium">{t(lang, 'settingsHelpStep4Desc')}</p>
                              </div>
                            </div>

                            <div className="flex gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 font-black text-sm">5</div>
                              <div className="space-y-1">
                                <h3 className="font-black text-base text-slate-800">{t(lang, 'settingsHelpStep5')}</h3>
                                <p className="text-slate-500 text-xs leading-relaxed font-medium">{t(lang, 'settingsHelpStep5Desc')}</p>
                              </div>
                            </div>

                            <div className="flex gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 font-black text-sm">6</div>
                              <div className="space-y-1">
                                <h3 className="font-black text-base text-slate-800">{t(lang, 'settingsHelpStep6')}</h3>
                                <p className="text-slate-500 text-xs leading-relaxed font-medium">{t(lang, 'settingsHelpStep6Desc')}</p>
                              </div>
                            </div>

                            <div className="flex gap-4 p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 font-black text-sm">7</div>
                              <div className="space-y-1">
                                <h3 className="font-black text-base text-slate-800">{t(lang, 'settingsHelpStep7')}</h3>
                                <p className="text-slate-500 text-xs leading-relaxed font-medium">{t(lang, 'settingsHelpStep7Desc')}</p>
                              </div>
                            </div>

                            {/* Copyright & Contact Notice */}
                            <div className="pt-5 border-t border-slate-200/80 text-center space-y-1.5">
                              <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                                © 2020-2026 Bo-Göran L.<br />
                                Intellectual property of Bo-Göran L. All rights reserved.
                              </p>
                              <div>
                                <a 
                                  href="mailto:BadmintonMatchCoach@gmail.com?subject=FamilyQuizPWA"
                                  className="inline-flex items-center justify-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-100"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  <span>BadmintonMatchCoach@gmail.com</span>
                                </a>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-6 bg-slate-50 border-t border-slate-100">
                            <button 
                              onClick={() => setShowSettingsHelp(false)}
                              className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                            >
                              {t(lang, 'confirm')}
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
      <AnimatePresence>
        {saveConfirmationMessage && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSaveConfirmationMessage(null)}
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white shadow-2xl"
            >
              <div className="bg-emerald-600 p-7 text-white sm:p-8">
                <button
                  type="button"
                  aria-label={t(lang, 'close')}
                  onClick={() => setSaveConfirmationMessage(null)}
                  className="absolute right-6 top-6 rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-black">{saveConfirmationMessage}</h2>
              </div>
              <div className="space-y-5 p-7 sm:p-8">
                <p className="text-sm font-medium leading-relaxed text-slate-500">
                  {lang === 'sv' ? 'Ändringen har sparats.' : 'Your change has been saved.'}
                </p>
                <button
                  type="button"
                  onClick={() => setSaveConfirmationMessage(null)}
                  className="w-full rounded-2xl bg-slate-800 py-4 font-black uppercase tracking-widest text-white shadow-md transition-all hover:bg-slate-900 active:scale-95"
                >
                  {t(lang, 'confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
