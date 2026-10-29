/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Users,
  MapPin,
  Trophy,
  Settings,
  FolderOpen,
  ChevronDown,
  Download,
  Lock
} from 'lucide-react';
import { Language, SUPPORTED_LANGUAGES, t } from '../../i18n';
import { QuizConfig } from '../../types';
import { defaultQuiz } from '../../data/defaultQuiz';
import { OfflineImage } from '../Common/OfflineImage';

export interface HeaderProps {
  lang: Language;
  quizConfig: QuizConfig;
  view: 'setup' | 'quiz' | 'results' | 'config';
  setView: (v: 'setup' | 'quiz' | 'results' | 'config') => void;
  handleQuizIconClick: () => void;
  isLanguageMenuOpen: boolean;
  setIsLanguageMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  languageMenuButtonRef: React.RefObject<HTMLButtonElement>;
  selectedLanguage: { code: Language; name: string; flag: string };
  deferredInstallPrompt: any;
  handleInstallPwa: () => void;
  isQuizModeLocked: boolean;
  isFacitUnlocked: boolean;
  isAdmin: boolean;
  getQuizAnswerProgress: () => { totalRequired: number; answeredCount: number; isAllAnswered: boolean };
  setShowConfigInput: (show: boolean) => void;
  setConfigTab: (tab: 'general' | 'questions' | 'ai' | 'db' | 'library') => void;
}

export const Header = React.memo<HeaderProps>(({
  lang,
  quizConfig,
  view,
  setView,
  handleQuizIconClick,
  isLanguageMenuOpen,
  setIsLanguageMenuOpen,
  languageMenuButtonRef,
  selectedLanguage,
  deferredInstallPrompt,
  handleInstallPwa,
  isQuizModeLocked,
  isFacitUnlocked,
  isAdmin,
  getQuizAnswerProgress,
  setShowConfigInput,
  setConfigTab
}) => {
  const theme = useTheme();
  const hasQuizPassword = Boolean(quizConfig.password && quizConfig.password.trim() !== '');
  const { isAllAnswered } = getQuizAnswerProgress();
  const canShowMenus = !isQuizModeLocked || isFacitUnlocked || isAdmin || (!hasQuizPassword && isAllAnswered);

  return (
    <header className="flex flex-col gap-3 mb-3 sm:mb-5 p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[2rem] backdrop-blur-md border border-white/20 shadow-xl"
            style={{ backgroundColor: theme.backgroundColor + '80', color: theme.textColor }}>
      <div className="flex flex-col gap-3.5 sm:gap-4">
        {/* Top Header Row: Logo & Full-Width Quiz Title */}
        <div className="flex items-center gap-3.5 w-full min-w-0">
          <button
            type="button"
            onClick={handleQuizIconClick}
            className={
              quizConfig.logoUrl
                ? "h-11 sm:h-14 w-auto max-w-[9.5rem] shrink-0 bg-transparent flex items-center justify-center cursor-default"
                : "w-11 h-11 sm:w-14 sm:h-14 shrink-0 bg-transparent flex items-center justify-center cursor-default"
            }
            aria-label="Quiz"
          >
            {quizConfig.logoUrl ? (
              <>
                <OfflineImage
                  src={quizConfig.logoUrl}
                  alt={`${quizConfig.title} logo`}
                  className="h-full w-auto max-w-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    const fallback = target.nextElementSibling as HTMLImageElement | null;
                    target.style.display = 'none';
                    if (fallback) {
                      fallback.style.display = 'block';
                    }
                  }}
                />
                <img
                  src={`${import.meta.env.BASE_URL}icon.png`}
                  alt="FamilyQuiz fallback icon"
                  referrerPolicy="no-referrer"
                  className="hidden h-full w-full object-cover"
                />
              </>
            ) : (
              <>
                <img
                  src={`${import.meta.env.BASE_URL}icon.png`}
                  alt="FamilyQuiz Icon"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    const fallback = target.nextElementSibling as HTMLImageElement | null;
                    target.style.display = 'none';
                    if (fallback) {
                      fallback.style.display = 'block';
                    }
                  }}
                />
                <img
                  src={`${import.meta.env.BASE_URL}icon.png`}
                  alt="FamilyQuiz fallback icon"
                  referrerPolicy="no-referrer"
                  className="hidden h-full w-full object-cover"
                />
              </>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-tight break-words [overflow-wrap:anywhere]" style={{ color: theme.textColor }}>
              {quizConfig.title === defaultQuiz.title ? t(lang, 'defaultQuizTitle').toUpperCase() : quizConfig.title.toUpperCase()}
            </h1>
          </div>
        </div>

        {/* Navigation Tabs + Far Right Language Selection & PWA Install */}
        <div className="flex flex-wrap items-center gap-1.5 bg-black/20 p-1.5 rounded-2xl border border-white/10 w-full overflow-visible">
          <button
            onClick={() => setView('setup')}
            className={`flex-1 px-3 sm:px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              view === 'setup' 
                ? 'shadow-md scale-[1.02]' 
                : 'hover:bg-black/10'
            }`}
            style={view === 'setup' 
              ? { backgroundColor: theme.contentBackgroundColor, color: theme.textColor } 
              : { color: theme.textColor }
            }
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t(lang, 'participantsTab')}</span>
          </button>

          <button
            onClick={() => setView('quiz')}
            className={`flex-1 px-3 sm:px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              view === 'quiz' 
                ? 'shadow-md scale-[1.02]' 
                : 'hover:bg-black/10'
            }`}
            style={view === 'quiz' 
              ? { backgroundColor: theme.contentBackgroundColor, color: theme.textColor } 
              : { color: theme.textColor }
            }
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{t(lang, 'walkQuizTab')}</span>
          </button>

          <button
            onClick={() => setView('results')}
            className={`flex-1 px-3 sm:px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              view === 'results' 
                ? 'shadow-md scale-[1.02]' 
                : 'hover:bg-black/10'
            }`}
            style={view === 'results' 
              ? { backgroundColor: theme.contentBackgroundColor, color: theme.textColor } 
              : { color: theme.textColor }
            }
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{t(lang, 'resultsTab')}</span>
          </button>

          {canShowMenus && (
            <button
              onClick={() => setView('config')}
              className={`flex-1 px-3 sm:px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                view === 'config' 
                  ? 'shadow-md scale-[1.02]' 
                  : 'hover:bg-black/10'
              }`}
              style={view === 'config' 
                ? { backgroundColor: theme.contentBackgroundColor, color: theme.textColor } 
                : { color: theme.textColor }
              }
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{t(lang, 'edit')}</span>
            </button>
          )}

          {canShowMenus && (
            <button 
              onClick={() => {
                setShowConfigInput(true);
                setConfigTab('library');
              }}
              className="flex-1 px-3 py-2.5 hover:opacity-90 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
              style={{ backgroundColor: theme.frameColor, color: theme.backgroundColor }}
              title={t(lang, 'libraryTitle')}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{t(lang, 'libraryTab')}</span>
            </button>
          )}

          {/* PWA Install Button when install prompt is available */}
          {deferredInstallPrompt && (
            <button
              onClick={handleInstallPwa}
              className="px-2.5 sm:px-3 py-2.5 hover:opacity-90 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 animate-bounce shrink-0 cursor-pointer"
              style={{ backgroundColor: theme.frameAccentColor, color: theme.backgroundColor }}
              title={t(lang, 'pwaInstallBtn')}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t(lang, 'pwaInstallBtn')}</span>
            </button>
          )}

          {/* Language Selector placed far to the right in the navigation menu bar */}
          <div className="relative z-[1300] shrink-0" data-language-menu-root>
            <button
              ref={languageMenuButtonRef}
              type="button"
              onClick={() => setIsLanguageMenuOpen((open) => !open)}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 hover:opacity-80 px-2.5 sm:px-3 py-2.5 transition-all shadow-md relative z-[1400] active:scale-95 cursor-pointer"
              style={{ backgroundColor: theme.contentBackgroundColor + '40', color: theme.textColor }}
              title={selectedLanguage.name}
              aria-label={`Selected language: ${selectedLanguage.name}`}
            >
              <span className="text-base sm:text-lg leading-none">{selectedLanguage.flag}</span>
              <span className="text-[11px] font-black uppercase tracking-wider">{selectedLanguage.code}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isLanguageMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
});
