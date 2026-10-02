/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Globe,
  Upload,
  Key,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  MapPin,
  Settings,
  Copy,
  CheckCircle2,
  CheckSquare,
  Trophy,
  Layers
} from 'lucide-react';
import { Language, SUPPORTED_LANGUAGES, t } from '../../i18n';
import { QuizConfig, QuestionType } from '../../types';
import {
  getStoredApiKey,
  getStoredAiUseImages,
  setStoredAiUseImages,
  getStoredAiQuestionTypes,
  setStoredAiQuestionTypes,
  generateQuizClient
} from '../../geminiClient';
import { registerQuestionTranslation } from '../../translationCache';

export interface AiGeneratorTabProps {
  lang: Language;
  quizConfig: QuizConfig;
  setQuizConfig: React.Dispatch<React.SetStateAction<QuizConfig>>;
  isBatchTranslating: boolean;
  batchTranslateProgress: { current: number; total: number; langCode?: string; lang?: string } | null;
  handleBatchTranslateQuiz: () => Promise<void>;
  pastedJsonInput: string;
  setPastedJsonInput: (v: string) => void;
  handleImportPastedJson: (json: string) => Promise<void>;
  showApiKeyInput: boolean;
  setShowApiKeyInput: (v: boolean | ((prev: boolean) => boolean)) => void;
  customApiKey: string;
  setCustomApiKey: (v: string) => void;
  handleSaveCustomApiKey: () => void;
  userLocation: { lat: number; lng: number } | null;
}

export const AiGeneratorTab: React.FC<AiGeneratorTabProps> = ({
  lang,
  quizConfig,
  setQuizConfig,
  isBatchTranslating,
  batchTranslateProgress,
  handleBatchTranslateQuiz,
  pastedJsonInput,
  setPastedJsonInput,
  handleImportPastedJson,
  showApiKeyInput,
  setShowApiKeyInput,
  customApiKey,
  setCustomApiKey,
  handleSaveCustomApiKey,
  userLocation
}) => {
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState<number | string>(5);
  const [aiTarget, setAiTarget] = useState<'barn' | 'vuxen' | 'båda'>('båda');
  const [aiKidAgeFrom, setAiKidAgeFrom] = useState<number | string>(5);
  const [aiKidAgeTo, setAiKidAgeTo] = useState<number | string>(10);
  const [aiGeotagLandmarks, setAiGeotagLandmarks] = useState(false);
  const [aiIncludeImages, setAiIncludeImages] = useState<boolean>(() => getStoredAiUseImages());
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>(() => getStoredAiQuestionTypes());
  const [promptLanguages, setPromptLanguages] = useState<Language[]>(['sv']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCustomPrompt, setCopiedCustomPrompt] = useState(false);

  const toggleQuestionType = (type: QuestionType) => {
    setSelectedQuestionTypes(prev => {
      let next: QuestionType[];
      if (prev.includes(type)) {
        if (prev.length <= 1) {
          alert(t(lang, 'aiAtLeastOneTypeAlert'));
          return prev;
        }
        next = prev.filter(t => t !== type);
      } else {
        next = [...prev, type];
      }
      setStoredAiQuestionTypes(next);
      return next;
    });
  };

  const handleSelectAllQuestionTypes = () => {
    const all: QuestionType[] = ['options', 'text', 'points', 'ladder'];
    setSelectedQuestionTypes(all);
    setStoredAiQuestionTypes(all);
  };

  const handleSelectOnlyOptions = () => {
    const only: QuestionType[] = ['options'];
    setSelectedQuestionTypes(only);
    setStoredAiQuestionTypes(only);
  };

  const togglePromptLanguage = (code: Language) => {
    setPromptLanguages(prev =>
      prev.includes(code)
        ? prev.length > 1 ? prev.filter(c => c !== code) : prev
        : [...prev, code]
    );
  };

  const copyCustomPromptToClipboard = async () => {
    const langNames: Record<string, string> = {
      sv: 'svenska',
      en: 'engelska',
      es: 'spanska',
      de: 'tyska',
      fr: 'franska',
    };
    const mainLang = langNames[promptLanguages[0]] || 'svenska';

    let typesDescription = '';
    const sampleItems: any[] = [];

    if (selectedQuestionTypes.includes('options')) {
      typesDescription += `\n1. "options" (Flervalsfråga / 1X2):
- "type": "options"
- "text": "Frågetext"
- "options": ["Alternativ 1", "Alternativ 2", "Alternativ 3"] (2 till 4 svarsalternativ)
- "correctAnswer": 0-baserat heltal (0, 1 eller 2) för rätt alternativ i options-listan`;
      sampleItems.push({
        type: "options",
        text: "Vad heter Sveriges huvudstad?",
        options: ["Stockholm", "Göteborg", "Malmö"],
        correctAnswer: 0
      });
    }

    if (selectedQuestionTypes.includes('text')) {
      typesDescription += `\n2. "text" (Fritextfråga / skrivet svar):
- "type": "text"
- "text": "Öppen kunskapsfråga där deltagaren själv skriver in svaret"
- "correctTextAnswer": "Exakt rätt svar (t.ex. Stockholm)"
- "acceptedTextAnswers": ["Alternativ stavning 1", "Synonym 2"] (valfria godkända varianter)
- "options": [] (lämna tom)`;
      sampleItems.push({
        type: "text",
        text: "Vilken stad kallas ofta för Ljusets stad?",
        correctTextAnswer: "Paris",
        acceptedTextAnswers: ["Staden Paris"]
      });
    }

    if (selectedQuestionTypes.includes('points')) {
      typesDescription += `\n3. "points" (Poängfråga / uppskattning / utmaning):
- "type": "points"
- "text": "Uppskattningsfråga eller utmaning (t.ex. gissa vikt, antal, eller fysisk utmaning)"
- "maxPoints": 10 (maximalt antal poäng som kan tilldelas)
- "options": [] (lämna tom)`;
      sampleItems.push({
        type: "points",
        text: "Gissa hur mycket en fullvuxen älg väger i kg (ca 400-500 kg). Närmast får max 10 poäng!",
        maxPoints: 10
      });
    }

    if (selectedQuestionTypes.includes('ladder')) {
      typesDescription += `\n4. "ladder" (Poängtrappa / På spåret):
- "type": "ladder"
- "text": "Övergripande rubrik/ämne (t.ex. 'Vart är vi på väg? (Resmål)' eller 'Vem är personen?')"
- "clues": Exakt 3 stegvisa ledtrådar i fallande svårighetsgrad:
  * Ledtråd 1: Klurig, svår ledtråd värd 10 poäng
  * Ledtråd 2: Medelsvår ledtråd med geografi eller historia värd 7 poäng
  * Ledtråd 3: Lätt ledtråd som leder direkt till svaret värd 4 poäng
- "ladderPoints": [10, 7, 4]
- "correctTextAnswer": "Rätt svar (t.ex. Rom)"
- "acceptedTextAnswers": ["Roma"] (valfria godkända varianter)
- "options": [] (lämna tom)`;
      sampleItems.push({
        type: "ladder",
        text: "Vart är vi på väg? (Resmål)",
        clues: [
          "10p: Vi lämnar hamnstaden och reser mot lejonens och kristallkronornas stad...",
          "7p: Denna historiska huvudstad pryds av Colosseum och Forum Romanum...",
          "4p: Alla vägar bär hit och Fontana di Trevi lockar miljoner turister..."
        ],
        ladderPoints: [10, 7, 4],
        correctTextAnswer: "Rom",
        acceptedTextAnswers: ["Roma"]
      });
    }

    const templateObj: any = {
      title: aiTopic ? `Tipspromenad: ${aiTopic}` : "Tipspromenad"
    };
    if (aiTarget === 'barn' || aiTarget === 'båda') {
      templateObj.barnQuestions = sampleItems;
    }
    if (aiTarget === 'vuxen' || aiTarget === 'båda') {
      templateObj.vuxenQuestions = sampleItems;
    }

    const promptText = `Skapa ${aiCount} tipspromenadfrågor med tema "${aiTopic || 'Allmänbildning'}" för ${
      aiTarget === 'barn' 
        ? `barn (${aiKidAgeFrom}-${aiKidAgeTo} år)` 
        : aiTarget === 'vuxen' 
        ? 'vuxna' 
        : `både barn (${aiKidAgeFrom}-${aiKidAgeTo} år) och vuxna`
    }.
Språk: Frågorna, ledtrådarna och svaren MÅSTE vara på ${mainLang}.

TILLÅTNA FRÅGETYPER (skapa en engagerande, varierad mix av följande):${typesDescription}

Svara med ett giltigt JSON-objekt enligt följande struktur utan kodblock eller extra text:
${JSON.stringify(templateObj, null, 2)}`;

    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedCustomPrompt(true);
      setTimeout(() => setCopiedCustomPrompt(false), 3000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  const generateWithAi = async () => {
    if (!aiTopic) {
      alert(t(lang, 'enterTopicAlert'));
      return;
    }

    const currentApiKey = getStoredApiKey();
    if (!currentApiKey) {
      setShowApiKeyInput(true);
      alert(t(lang, 'missingApiKeyAlert'));
      return;
    }

    if (selectedQuestionTypes.length === 0) {
      alert(t(lang, 'aiAtLeastOneTypeAlert'));
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
        questionTypes: selectedQuestionTypes,
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
            registerQuestionTranslation(q.id, origLang, q.text, tLang as Language, trans);
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
    } catch (err: any) {
      if (err.message === 'MISSING_API_KEY') {
        setShowApiKeyInput(true);
        alert(t(lang, 'missingApiKeyAlert'));
      } else {
        alert(t(lang, 'generationError') + err.message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-3xl border-2 border-indigo-100 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-indigo-900 uppercase tracking-wider">{t(lang, 'aiGenerateTitle')}</h3>
              <p className="text-xs text-indigo-700 font-medium">{t(lang, 'aiGenerateDesc')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowApiKeyInput(true)}
            className="self-start sm:self-auto px-3.5 py-2 bg-white/90 hover:bg-white text-indigo-900 border border-indigo-200 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t(lang, 'aiSettingsSectionTitle')}</span>
          </button>
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{t(lang, 'categoryLabel')}</label>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setAiTarget('barn')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
                  aiTarget === 'barn' ? 'bg-amber-400 text-white shadow-md' : 'bg-white text-slate-500 border border-indigo-100'
                }`}
              >
                {t(lang, 'kids')} 🧒
              </button>
              <button 
                type="button"
                onClick={() => setAiTarget('vuxen')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
                  aiTarget === 'vuxen' ? 'bg-pink-400 text-white shadow-md' : 'bg-white text-slate-500 border border-indigo-100'
                }`}
              >
                {t(lang, 'adults')} 🧔
              </button>
              <button 
                type="button"
                onClick={() => setAiTarget('båda')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
                  aiTarget === 'båda' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-indigo-100'
                }`}
              >
                {t(lang, 'bothCategory')} 🔄
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{t(lang, 'themeTopicLabel')}</label>
            <input 
              type="text" 
              placeholder={t(lang, 'themeTopicPlaceholder')}
              className="w-full p-3.5 bg-white rounded-xl border border-indigo-200 text-sm font-medium outline-none focus:border-indigo-500 shadow-sm"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
            />
            {/* Topic chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(t(lang, 'aiTopicPresets') as unknown as string[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAiTopic(preset)}
                  className="px-2.5 py-1 bg-white/80 hover:bg-white text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-100 shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">{t(lang, 'questionCountPerCategoryLabel')}</label>
              <input 
                type="text" 
                inputMode="numeric"
                className="w-full p-3 bg-white text-slate-900 font-extrabold text-sm rounded-xl border border-indigo-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                value={aiCount}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setAiCount(val);
                }}
                onBlur={() => {
                  const num = parseInt(String(aiCount), 10);
                  if (isNaN(num) || num < 1) setAiCount(5);
                  else if (num > 20) setAiCount(20);
                  else setAiCount(num);
                }}
              />
            </div>
            {(aiTarget === 'barn' || aiTarget === 'båda') && (
              <div className="flex-1 flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">{t(lang, 'kidAgeFromLabel')}</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    className="w-full p-3 bg-white text-slate-900 font-extrabold text-sm rounded-xl border border-indigo-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                    value={aiKidAgeFrom}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setAiKidAgeFrom(val);
                    }}
                    onBlur={() => {
                      const num = parseInt(String(aiKidAgeFrom), 10);
                      if (isNaN(num) || num < 3) setAiKidAgeFrom(3);
                      else if (num > 15) setAiKidAgeFrom(15);
                      else setAiKidAgeFrom(num);
                    }}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">{t(lang, 'kidAgeToLabel')}</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    className="w-full p-3 bg-white text-slate-900 font-extrabold text-sm rounded-xl border border-indigo-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                    value={aiKidAgeTo}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setAiKidAgeTo(val);
                    }}
                    onBlur={() => {
                      const num = parseInt(String(aiKidAgeTo), 10);
                      if (isNaN(num) || num < 4) setAiKidAgeTo(4);
                      else if (num > 18) setAiKidAgeTo(18);
                      else setAiKidAgeTo(num);
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Question Types To Include */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">
                  {t(lang, 'aiQuestionTypesLabel')}
                </label>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {selectedQuestionTypes.length}/4
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllQuestionTypes}
                  className="px-2.5 py-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-white/80 hover:bg-white border border-indigo-200 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  {t(lang, 'aiSelectAllTypes')}
                </button>
                <button
                  type="button"
                  onClick={handleSelectOnlyOptions}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white border border-indigo-200 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  {t(lang, 'aiOnlyOptionsType')}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              {t(lang, 'aiQuestionTypesDesc')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Options */}
              <button
                type="button"
                onClick={() => toggleQuestionType('options')}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-3 active:scale-[0.98] cursor-pointer ${
                  selectedQuestionTypes.includes('options')
                    ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                    : 'bg-white/60 border-slate-200 hover:bg-white text-slate-500 opacity-70'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                  selectedQuestionTypes.includes('options')
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                      <span>{t(lang, 'optionsQuestionType')}</span>
                    </span>
                    <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      selectedQuestionTypes.includes('options')
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {selectedQuestionTypes.includes('options') && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                    {t(lang, 'aiOptionsTypeDesc')}
                  </p>
                </div>
              </button>

              {/* Text */}
              <button
                type="button"
                onClick={() => toggleQuestionType('text')}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-3 active:scale-[0.98] cursor-pointer ${
                  selectedQuestionTypes.includes('text')
                    ? 'bg-white border-sky-500 shadow-md ring-2 ring-sky-200'
                    : 'bg-white/60 border-slate-200 hover:bg-white text-slate-500 opacity-70'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                  selectedQuestionTypes.includes('text')
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  <span className="text-sm">🔤</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                      <span>{t(lang, 'textQuestionType')}</span>
                    </span>
                    <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      selectedQuestionTypes.includes('text')
                        ? 'bg-sky-500 border-sky-500 text-white'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {selectedQuestionTypes.includes('text') && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                    {t(lang, 'aiTextTypeDesc')}
                  </p>
                </div>
              </button>

              {/* Points */}
              <button
                type="button"
                onClick={() => toggleQuestionType('points')}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-3 active:scale-[0.98] cursor-pointer ${
                  selectedQuestionTypes.includes('points')
                    ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-200'
                    : 'bg-white/60 border-slate-200 hover:bg-white text-slate-500 opacity-70'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                  selectedQuestionTypes.includes('points')
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                      <span>{t(lang, 'pointsQuestionType')}</span>
                    </span>
                    <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      selectedQuestionTypes.includes('points')
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {selectedQuestionTypes.includes('points') && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                    {t(lang, 'aiPointsTypeDesc')}
                  </p>
                </div>
              </button>

              {/* Ladder */}
              <button
                type="button"
                onClick={() => toggleQuestionType('ladder')}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-3 active:scale-[0.98] cursor-pointer ${
                  selectedQuestionTypes.includes('ladder')
                    ? 'bg-white border-purple-600 shadow-md ring-2 ring-purple-200'
                    : 'bg-white/60 border-slate-200 hover:bg-white text-slate-500 opacity-70'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                  selectedQuestionTypes.includes('ladder')
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  <span className="text-sm">🪜</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                      <span>{t(lang, 'ladderQuestionType')}</span>
                    </span>
                    <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      selectedQuestionTypes.includes('ladder')
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {selectedQuestionTypes.includes('ladder') && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                    {t(lang, 'aiLadderTypeDesc')}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Supported Output Languages */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">
              {t(lang, 'promptLanguagesLabel')} ({promptLanguages.length})
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SUPPORTED_LANGUAGES.map(item => {
                const isSelected = promptLanguages.includes(item.code);
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => togglePromptLanguage(item.code)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{item.flag}</span>
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-indigo-100 cursor-pointer hover:bg-indigo-50/50 transition-colors">
              <input
                type="checkbox"
                checked={aiGeotagLandmarks}
                onChange={(e) => setAiGeotagLandmarks(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  {t(lang, 'aiGeotagLandmarksLabel')}
                </span>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{t(lang, 'aiGeotagLandmarksDesc')}</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-indigo-100 cursor-pointer hover:bg-indigo-50/50 transition-colors">
              <input
                type="checkbox"
                checked={aiIncludeImages}
                onChange={(e) => {
                  setAiIncludeImages(e.target.checked);
                  setStoredAiUseImages(e.target.checked);
                }}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  {t(lang, 'aiIncludeImagesLabel') || t(lang, 'aiUseImagesLabel')}
                </span>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  {t(lang, 'aiIncludeImagesDesc') || t(lang, 'aiUseImagesDesc')}
                </p>
              </div>
            </label>
          </div>

          {/* AI Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button 
              type="button"
              onClick={generateWithAi}
              disabled={isGenerating || !aiTopic.trim()}
              className="flex-1 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t(lang, 'generatingWithAi')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    {t(lang, 'generateQuestionsNowBtn')}
                    {selectedQuestionTypes.length > 1 ? ` (${selectedQuestionTypes.length} typer)` : ''}
                  </span>
                </>
              )}
            </button>

            <button 
              type="button"
              onClick={copyCustomPromptToClipboard}
              className="flex-1 px-6 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-slate-300 flex items-center justify-center gap-2 active:scale-95 transition-all border border-slate-700 cursor-pointer"
              title="Genererar en färdig prompt med dina inställningar och kopierar till urklipp för ChatGPT/Claude"
            >
              {copiedCustomPrompt ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-extrabold">{t(lang, 'copyCustomPromptSuccess')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>{t(lang, 'copyCustomPromptBtn')}</span>
                </>
              )}
            </button>
          </div>

          {copiedCustomPrompt && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t(lang, 'copyCustomPromptSuccess')}</span>
            </div>
          )}

          <p className="text-[11px] text-indigo-700 font-bold bg-indigo-100/80 p-3 rounded-xl flex items-center gap-2">
            <span>💡</span>
            <span>{t(lang, 'aiGeneratedNotice')}</span>
          </p>

          {/* Quick Paste AI JSON Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span>{t(lang, 'pasteAiResponseTitle')}</span>
            </label>
            <textarea 
              rows={3}
              value={pastedJsonInput}
              onChange={(e) => setPastedJsonInput(e.target.value)}
              placeholder={t(lang, 'pasteAiResponsePlaceholder')}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => handleImportPastedJson(pastedJsonInput)}
              disabled={!pastedJsonInput.trim()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-100 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>{t(lang, 'importPastedJsonBtn')}</span>
            </button>
          </div>

          {/* Batch Translation Box for existing quiz questions */}
          <div className="p-4 bg-gradient-to-br from-indigo-50/90 to-blue-50/90 rounded-2xl border-2 border-indigo-200/80 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{t(lang, 'batchTranslateQuizBtn')}</span>
                </h4>
                <p className="text-[11px] text-indigo-800/90 font-medium leading-relaxed">
                  {t(lang, 'batchTranslateQuizDesc')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBatchTranslateQuiz}
              disabled={isBatchTranslating || isGenerating || (quizConfig.barnQuestions.length + quizConfig.vuxenQuestions.length === 0)}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              {isBatchTranslating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  <span>
                    {batchTranslateProgress 
                      ? t(lang, 'batchTranslatingProgress', { current: batchTranslateProgress.current.toString(), total: batchTranslateProgress.total.toString() })
                      : t(lang, 'generatingWithAi')}
                  </span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>{t(lang, 'batchTranslateQuizBtn')} ({quizConfig.barnQuestions.length + quizConfig.vuxenQuestions.length} {t(lang, 'questionsTab').toLowerCase()})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
