/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, X, Users, MapPin, CheckCircle2, Trophy } from 'lucide-react';
import { Language, t } from '../../i18n';

export interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden max-w-lg w-full"
        >
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black">{t(lang, 'howItWorksBtn')}</h3>
            <p className="text-xs text-indigo-100 font-medium mt-1">{t(lang, 'heroSubtitle')}</p>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100">
              <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 font-black text-sm">
                1
              </div>
              <div className="space-y-0.5">
                <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  {t(lang, 'settingsHelpStep1')}
                </h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {t(lang, 'settingsHelpStep1Desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100">
              <div className="w-9 h-9 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0 font-black text-sm">
                2
              </div>
              <div className="space-y-0.5">
                <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  {t(lang, 'settingsHelpStep2')}
                </h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {t(lang, 'settingsHelpStep2Desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 font-black text-sm">
                3
              </div>
              <div className="space-y-0.5">
                <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {t(lang, 'settingsHelpStep3')}
                </h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {t(lang, 'settingsHelpStep3Desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100">
              <div className="w-9 h-9 bg-purple-600 text-white rounded-xl flex items-center justify-center shrink-0 font-black text-sm">
                4
              </div>
              <div className="space-y-0.5">
                <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-purple-600" />
                  {t(lang, 'settingsHelpStep4')}
                </h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {t(lang, 'settingsHelpStep4Desc')}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <button
              onClick={onClose}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase shadow-md transition-all active:scale-95"
            >
              {t(lang, 'confirm')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
