/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Settings, 
  Trophy, 
  CheckCircle2, 
  Lock, 
  ChevronRight, 
  Upload,
  Share2,
  XCircle,
  X,
  Edit2,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Participant, QuizConfig, AnswerRecord, UserType, Question } from './types';
import { defaultQuiz } from './data/defaultQuiz';

const STORAGE_KEY_ANSWERS = 'quiz_pwa_answers';
const STORAGE_KEY_PARTICIPANTS = 'quiz_pwa_participants';
const STORAGE_KEY_CONFIG = 'quiz_pwa_config';

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PARTICIPANTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [answers, setAnswers] = useState<AnswerRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ANSWERS);
    return saved ? JSON.parse(saved) : [];
  });

  const [quizConfig, setQuizConfig] = useState<QuizConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    return saved ? JSON.parse(saved) : defaultQuiz;
  });

  const [view, setView] = useState<'setup' | 'quiz' | 'results' | 'config'>('setup');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [viewingParticipantId, setViewingParticipantId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [configMasterPasswordInput, setConfigMasterPasswordInput] = useState('');
  const [isConfigUnlocked, setIsConfigUnlocked] = useState(false);
  const [isPasswordCorrect, setIsPasswordCorrect] = useState(false);
  const [showConfigInput, setShowConfigInput] = useState(false);
  const [configJsonInput, setConfigJsonInput] = useState('');
  const [editingQuestionsCategory, setEditingQuestionsCategory] = useState<UserType | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [newQuizPassword, setNewQuizPassword] = useState('');
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [importTarget, setImportTarget] = useState<UserType>('barn');

  const parseQuizText = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    const questions: any[] = [];
    const answersMap: Record<number, number> = {};
    
    let currentQuestion: any = null;
    let isInAnswers = false;

    for (const line of lines) {
      if (line.toUpperCase().includes('RÄTT SVAR') || line.toUpperCase().includes('FACIT')) {
        isInAnswers = true;
        continue;
      }

      if (isInAnswers) {
        const match = line.match(/^(\d+)\s*:\s*([1X2])/i);
        if (match) {
          const qNum = parseInt(match[1]);
          const ansChar = match[2].toUpperCase();
          const ansIdx = ansChar === '1' ? 0 : ansChar === 'X' ? 1 : 2;
          answersMap[qNum] = ansIdx;
        }
        continue;
      }

      if (line.toLowerCase().startsWith('fråga')) {
        if (currentQuestion) questions.push(currentQuestion);
        
        const qNumMatch = line.match(/fråga\s*(\d+)/i);
        const categoryMatch = line.match(/\(([^)]+)\)/);
        
        currentQuestion = {
          num: qNumMatch ? parseInt(qNumMatch[1]) : questions.length + 1,
          category: categoryMatch ? categoryMatch[1] : '',
          text: '',
          options: [],
          id: crypto.randomUUID()
        };
      } else if (currentQuestion) {
        if (line.match(/^[1X2]\.\s/i)) {
          currentQuestion.options.push(line.replace(/^[1X2]\.\s/i, ''));
        } else if (!currentQuestion.text) {
          currentQuestion.text = line;
        } else {
          currentQuestion.text += ' ' + line;
        }
      }
    }
    if (currentQuestion) questions.push(currentQuestion);

    return questions.map(q => ({
      id: q.id,
      text: q.text + (q.category ? ` (${q.category})` : ''),
      options: q.options,
      correctAnswer: answersMap[q.num] ?? 0
    }));
  };

  // Persist data to "cache" (localStorage)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PARTICIPANTS, JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(quizConfig));
  }, [quizConfig]);

  useEffect(() => {
    if (view === 'config') {
      setNewQuizPassword(quizConfig.password || '');
      setNewQuizTitle(quizConfig.title || '');
    }
  }, [view, quizConfig]);

  const totalQuestions = useMemo(() => {
    return Math.min(quizConfig.barnQuestions.length, quizConfig.vuxenQuestions.length);
  }, [quizConfig]);

  const addParticipant = (name: string, type: UserType) => {
    if (!name.trim()) return;
    const newParticipant: Participant = {
      id: crypto.randomUUID(),
      name: name.trim(),
      type
    };
    setParticipants([...participants, newParticipant]);
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
    setAnswers(answers.filter(a => a.participantId !== id));
  };

  const updateParticipantName = (id: string, newName: string) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const submitAnswer = (answerIndex: number) => {
    if (!selectedParticipantId || selectedQuestionIndex === null) return;

    const participant = participants.find(p => p.id === selectedParticipantId);
    if (!participant) return;

    const questions = participant.type === 'barn' ? quizConfig.barnQuestions : quizConfig.vuxenQuestions;
    const question = questions[selectedQuestionIndex];
    
    const isCorrect = answerIndex === question.correctAnswer;

    const newAnswer: AnswerRecord = {
      participantId: selectedParticipantId,
      questionIndex: selectedQuestionIndex,
      answerIndex,
      isCorrect,
      timestamp: Date.now()
    };

    const existingIndex = answers.findIndex(a => a.participantId === selectedParticipantId && a.questionIndex === selectedQuestionIndex);
    if (existingIndex > -1) {
      const newAnswers = [...answers];
      newAnswers[existingIndex] = newAnswer;
      setAnswers(newAnswers);
    } else {
      setAnswers([...answers, newAnswer]);
    }

    setSelectedParticipantId(null);
    setSelectedQuestionIndex(null);
  };

  const resetQuiz = () => {
    if (confirm('Vill du verkligen återställa alla svar?')) {
      setAnswers([]);
      setSelectedQuestionIndex(null);
      setView('setup');
      setIsPasswordCorrect(false);
      setPasswordInput('');
    }
  };

  const updateQuestion = (category: UserType, id: string, updates: Partial<Question>) => {
    setQuizConfig(prev => {
      const newConfig = { ...prev };
      const questions = category === 'barn' ? [...newConfig.barnQuestions] : [...newConfig.vuxenQuestions];
      const index = questions.findIndex(q => q.id === id);
      if (index > -1) {
        questions[index] = { ...questions[index], ...updates };
        if (category === 'barn') {
          newConfig.barnQuestions = questions;
        } else {
          newConfig.vuxenQuestions = questions;
        }
      }
      return newConfig;
    });
  };

  const deleteQuestion = (category: UserType | null, id: string) => {
    if (!category) return;
    if (!confirm('Är du säker på att du vill ta bort denna fråga?')) return;
    
    setQuizConfig(prev => {
      const newConfig = { ...prev };
      if (category === 'barn') {
        newConfig.barnQuestions = newConfig.barnQuestions.filter(q => q.id !== id);
      } else {
        newConfig.vuxenQuestions = newConfig.vuxenQuestions.filter(q => q.id !== id);
      }
      return newConfig;
    });
  };

  const addNewQuestion = (category: UserType) => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      text: 'Ny fråga...',
      options: ['Svar 1', 'Svar X', 'Svar 2'],
      correctAnswer: 0
    };
    
    setQuizConfig(prev => {
      const newConfig = { ...prev };
      if (category === 'barn') {
        newConfig.barnQuestions = [...newConfig.barnQuestions, newQuestion];
      } else {
        newConfig.vuxenQuestions = [...newConfig.vuxenQuestions, newQuestion];
      }
      return newConfig;
    });
    setExpandedQuestionId(newQuestion.id);
  };

  const xorEncryptDecrypt = (input: string, key: string): string => {
    let output = '';
    for (let i = 0; i < input.length; i++) {
      const charCode = input.charCodeAt(i) ^ key.charCodeAt(i % key.length);
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
      let decoded = '';
      try {
        decoded = decodeURIComponent(escape(atob(input)));
      } catch (e) {
        decoded = atob(input);
      }
      let output = '';
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        output += String.fromCharCode(charCode);
      }
      return output;
    } catch (e) {
      return input;
    }
  };

  const handleImportConfig = () => {
    try {
      let input = configJsonInput.trim();
      
      // Try to decrypt with "Password" if it's likely an encrypted string
      if (!input.startsWith('{')) {
        const decrypted = xorDecrypt(input, 'Password');
        if (decrypted.trim().startsWith('{')) {
          input = decrypted.trim();
        }
      }

      // Try JSON
      if (input.startsWith('{')) {
        const parsed = JSON.parse(input);
        if (parsed.barnQuestions && parsed.vuxenQuestions) {
          setQuizConfig(parsed);
          setShowConfigInput(false);
          setConfigJsonInput('');
          setAnswers([]);
          setParticipants([]); // Clear names on import
          setView('setup');
          alert('Quiz importerat och deltagarlistan rensad! ✨');
          return;
        }
      }
      
      // Otherwise, parse as text
      const newQuestions = parseQuizText(configJsonInput);
      if (newQuestions.length > 0) {
        const newConfig = { ...quizConfig };
        if (importTarget === 'barn') {
          newConfig.barnQuestions = newQuestions;
        } else {
          newConfig.vuxenQuestions = newQuestions;
        }
        setQuizConfig(newConfig);
        setShowConfigInput(false);
        setConfigJsonInput('');
        setAnswers([]);
        setParticipants([]); // Clear names on import
        setView('setup');
        alert(`Importerade ${newQuestions.length} frågor för ${importTarget} och rensade deltagarlistan! 📝`);
      } else {
        alert('Kunde inte hitta några frågor i texten. Kontrollera formatet.');
      }
    } catch (e) {
      alert('Kunde inte läsa inmatningen. Kontrollera formatet.');
    }
  };

  const shareConfig = () => {
    const configStr = JSON.stringify(quizConfig);
    const encrypted = xorEncryptDecrypt(configStr, 'Password');
    navigator.clipboard.writeText(encrypted).then(() => {
      alert('Quiz-koden har kopierats till urklipp (krypterad)! 🔐');
    });
  };

  const getProgress = () => {
    if (participants.length === 0) return 0;
    const totalPossibleAnswers = participants.length * totalQuestions;
    return (answers.length / totalPossibleAnswers) * 100;
  };

  return (
    <div className="min-h-screen bg-indigo-600 text-slate-900 font-sans p-4 md:p-8 flex flex-col overflow-hidden">
      <div className="max-w-4xl mx-auto w-full flex flex-col flex-1">
        
        {/* Header - Vibrant Theme */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/20 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
              <span className="text-2xl font-black text-indigo-900">?</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white leading-none tracking-tight">
                {quizConfig.title.toUpperCase()}
              </h1>
              <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                Quiz-o-matic • {totalQuestions} frågor
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowConfigInput(true)}
              className="bg-emerald-400 hover:bg-emerald-500 text-white px-6 py-2 rounded-2xl font-bold flex items-center gap-2 shadow-[0_4px_0_0_#059669] transition-all active:translate-y-1 active:shadow-none text-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Importera</span>
            </button>
            <button 
              onClick={() => setView('config')}
              className="bg-white text-indigo-600 px-6 py-2 rounded-2xl font-bold shadow-[0_4px_0_0_#cbd5e1] hover:bg-slate-50 transition-all active:translate-y-1 active:shadow-none text-sm"
            >
              Inställningar
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {view === 'setup' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1"
            >
              <div className="md:col-span-4 flex flex-col gap-4">
                <h2 className="text-indigo-100 text-xs font-bold uppercase tracking-widest px-2">Vilka spelar?</h2>
                <div className="bg-white rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 flex-1 border border-indigo-200/50">
                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {participants.length === 0 ? (
                      <div className="text-center py-10 opacity-30">
                        <Users className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-sm font-bold">Inga spelare än</p>
                      </div>
                    ) : (
                      participants.map(p => (
                        <div key={p.id} className="p-4 rounded-2xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-between group">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${
                              p.type === 'barn' ? 'bg-amber-400' : 'bg-pink-400'
                            }`}>
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              {editingParticipantId === p.id ? (
                                <input 
                                  autoFocus
                                  className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-sm font-black text-slate-800 outline-none focus:border-indigo-500"
                                  value={p.name}
                                  onChange={(e) => updateParticipantName(p.id, e.target.value)}
                                  onBlur={() => setEditingParticipantId(null)}
                                  onKeyDown={(e) => e.key === 'Enter' && setEditingParticipantId(null)}
                                />
                              ) : (
                                <p 
                                  className="font-black text-slate-800 leading-tight cursor-pointer hover:text-indigo-600 transition-colors"
                                  onClick={() => setEditingParticipantId(p.id)}
                                >
                                  {p.name}
                                </p>
                              )}
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                                p.type === 'barn' ? 'bg-amber-100 text-amber-700' : 'bg-pink-100 text-pink-700'
                              }`}>
                                {p.type}
                              </span>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeParticipant(p.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <input 
                      type="text" 
                      placeholder="Namn..."
                      className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold text-sm"
                      id="name-input"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => {
                          const el = document.getElementById('name-input') as HTMLInputElement;
                          addParticipant(el.value, 'barn');
                          el.value = '';
                        }}
                        className="py-3 bg-amber-400 text-white rounded-xl font-black text-xs uppercase shadow-[0_4px_0_0_#d97706] active:translate-y-1 active:shadow-none transition-all"
                      >
                        + Barn
                      </button>
                      <button 
                        onClick={() => {
                          const el = document.getElementById('name-input') as HTMLInputElement;
                          addParticipant(el.value, 'vuxen');
                          el.value = '';
                        }}
                        className="py-3 bg-pink-400 text-white rounded-xl font-black text-xs uppercase shadow-[0_4px_0_0_#db2777] active:translate-y-1 active:shadow-none transition-all"
                      >
                        + Vuxen
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col items-center justify-center text-center p-8">
                <div className="max-w-sm space-y-8">
                  <div className="w-32 h-32 bg-white/20 rounded-[2.5rem] flex items-center justify-center mx-auto backdrop-blur-sm border-2 border-white/30 rotate-6 shadow-2xl">
                    <Trophy className="w-16 h-16 text-yellow-300 drop-shadow-lg" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-5xl font-black text-white leading-tight drop-shadow-md">Redo för utmaningen?</h2>
                    <p className="text-indigo-100 font-bold opacity-80">Välj dina deltagare och starta spelet. Ni kan svara i vilken ordning ni vill!</p>
                  </div>
                  <button 
                    disabled={participants.length === 0}
                    onClick={() => setView('quiz')}
                    className="w-full py-6 bg-yellow-400 text-indigo-900 rounded-3xl font-black text-xl uppercase shadow-[0_8px_0_0_#b45309] hover:bg-yellow-300 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_8px_0_0_#b45309]"
                  >
                    Starta Quizzet 🚀
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'quiz' && (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1"
            >
              {/* Question Picker - Any order */}
              <div className="md:col-span-3 flex flex-col gap-4">
                <h2 className="text-indigo-100 text-xs font-bold uppercase tracking-widest px-2">Välj Fråga</h2>
                <div className="bg-white rounded-[2rem] p-6 shadow-2xl flex-1 border border-indigo-200/50">
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: totalQuestions }).map((_, idx) => {
                      // Status logic: Check if all participants answered this question
                      const answeredBy = participants.filter(p => answers.some(a => a.participantId === p.id && a.questionIndex === idx));
                      const isFullyAnswered = answeredBy.length === participants.length;
                      const isPartiallyAnswered = answeredBy.length > 0 && answeredBy.length < participants.length;
                      const isSelected = selectedQuestionIndex === idx;

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedQuestionIndex(idx);
                            setSelectedParticipantId(null);
                          }}
                          className={`aspect-square rounded-xl flex items-center justify-center font-black text-lg transition-all border-4 ${
                            isSelected 
                              ? 'bg-indigo-600 text-white border-indigo-800 scale-110 shadow-lg' 
                              : isFullyAnswered
                                ? 'bg-emerald-100 text-emerald-600 border-emerald-400 shadow-[0_4px_0_0_#34d399]'
                                : isPartiallyAnswered
                                  ? 'bg-amber-100 text-amber-600 border-amber-400 shadow-[0_4px_0_0_#fbbf24]'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                      <div className="w-3 h-3 bg-emerald-400 rounded-sm" /> Alla svarat
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                      <div className="w-3 h-3 bg-amber-400 rounded-sm" /> Några svarat
                    </div>
                    <button 
                      onClick={() => setView('results')}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase hover:bg-slate-800 transition-colors mt-auto"
                    >
                      Se Resultat 🏆
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Interaction Area */}
              <div className="md:col-span-9 flex flex-col gap-6">
                {selectedQuestionIndex === null ? (
                  <div className="bg-white/10 rounded-[3rem] border-4 border-dashed border-white/20 flex-1 flex flex-col items-center justify-center text-center p-12 backdrop-blur-sm">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4">
                      <ChevronRight className="w-10 h-10 text-white animate-bounce" />
                    </div>
                    <h3 className="text-3xl font-black text-white">Välj en fråga till vänster</h3>
                    <p className="text-indigo-100 mt-2 font-bold opacity-60 italic">Gå i ordning eller hoppa runt som ni vill!</p>
                  </div>
                ) : !selectedParticipantId ? (
                  <div className="bg-white rounded-[3rem] p-10 flex-1 shadow-2xl flex flex-col border border-indigo-200/50">
                    <div className="mb-10">
                      <span className="text-indigo-500 font-black text-xl uppercase tracking-tighter">Vems tur?</span>
                      <h3 className="text-4xl font-black mt-2 leading-tight text-slate-800">Vem ska svara på fråga {selectedQuestionIndex + 1}?</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {participants.map(p => {
                        const answer = answers.find(a => a.participantId === p.id && a.questionIndex === selectedQuestionIndex);
                        const hasAnswered = !!answer;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setSelectedParticipantId(p.id)}
                            className={`p-6 rounded-3xl border-4 transition-all flex items-center gap-4 relative text-left ${
                              hasAnswered 
                                ? 'bg-indigo-50 border-indigo-500' 
                                : 'bg-slate-50 border-slate-100 hover:border-indigo-300'
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-xl ${
                              p.type === 'barn' ? 'bg-amber-400' : 'bg-pink-400'
                            }`}>
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-xl text-slate-800">{p.name}</p>
                              <span className="text-xs font-black uppercase text-slate-400">{p.type}</span>
                            </div>
                            {hasAnswered && (
                              <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase">
                                Ändra svar
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <button 
                      onClick={() => setSelectedQuestionIndex(null)}
                      className="mt-auto text-slate-400 font-bold hover:text-slate-600 transition-colors pt-6"
                    >
                      ← Tillbaka till översikten
                    </button>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="bg-white rounded-[3rem] p-10 flex-1 shadow-2xl flex flex-col border border-indigo-200/50 relative overflow-hidden"
                  >
                    {/* Big Decorative Number */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-[0.03] pointer-events-none">
                      <span className="text-[20rem] font-black">{selectedQuestionIndex + 1}</span>
                    </div>

                    <div className="mb-10 relative">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${
                          participants.find(p => p.id === selectedParticipantId)?.type === 'barn' ? 'bg-amber-400' : 'bg-pink-400'
                        }`}>
                          {participants.find(p => p.id === selectedParticipantId)?.type} - {participants.find(p => p.id === selectedParticipantId)?.name}
                        </span>
                        <span className="text-indigo-500 font-black text-sm uppercase tracking-widest opacity-40">Fråga {selectedQuestionIndex + 1}</span>
                      </div>
                      <h3 className="text-4xl font-black leading-tight text-slate-800">
                        {participants.find(p => p.id === selectedParticipantId)?.type === 'barn' 
                          ? quizConfig.barnQuestions[selectedQuestionIndex].text
                          : quizConfig.vuxenQuestions[selectedQuestionIndex].text}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                      {(participants.find(p => p.id === selectedParticipantId)?.type === 'barn' 
                          ? quizConfig.barnQuestions[selectedQuestionIndex].options
                          : quizConfig.vuxenQuestions[selectedQuestionIndex].options
                      ).map((opt, idx) => {
                        const colors = ['border-rose-500 bg-rose-50 text-rose-600 hover:bg-rose-100', 'border-amber-500 bg-amber-50 text-amber-600 hover:bg-amber-100', 'border-emerald-500 bg-emerald-50 text-emerald-600 hover:bg-emerald-100', 'border-sky-500 bg-sky-50 text-sky-600 hover:bg-sky-100'];
                        const color = colors[idx % colors.length];
                        const isCurrentAnswer = answers.find(a => a.participantId === selectedParticipantId && a.questionIndex === selectedQuestionIndex)?.answerIndex === idx;

                        return (
                          <button
                            key={idx}
                            onClick={() => submitAnswer(idx)}
                            className={`p-6 rounded-[2rem] border-4 flex items-center justify-center text-xl font-black transition-all active:scale-95 shadow-[0_6px_0_0_rgba(0,0,0,0.1)] hover:shadow-none hover:translate-y-1 ${color} ${
                              isCurrentAnswer ? 'ring-4 ring-indigo-600 ring-offset-4' : ''
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button 
                      onClick={() => setSelectedParticipantId(null)}
                      className="mt-8 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                    >
                      ← Byt person
                    </button>
                  </motion.div>
                )}

                {/* Progress Lock Bar - Dark Theme */}
                <div className="bg-slate-900 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center justify-between text-white shadow-xl border border-slate-800">
                  <div className="flex items-center gap-4 mb-4 sm:mb-0">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-2xl">
                      🔒
                    </div>
                    <div>
                      <p className="font-bold">Resultaten är låsta</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Ange lösenord för att se ställningen</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input 
                      type="password" 
                      placeholder="Lösenord..." 
                      className="bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 ring-indigo-500 outline-none flex-1 sm:w-32 font-mono text-sm"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                    />
                    <button 
                      onClick={() => {
                        if (passwordInput === (quizConfig.password || '123')) {
                          setView('results');
                          setIsPasswordCorrect(true);
                        } else {
                          alert('Fel lösenord!');
                        }
                      }}
                      className="bg-indigo-500 px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-indigo-400 transition-colors active:scale-95"
                    >
                      Lås upp
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'results' && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto w-full space-y-6"
            >
              {viewingParticipantId ? (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-[3rem] p-8 shadow-2xl border border-indigo-100 flex flex-col max-h-[85vh]"
                >
                  <div className="flex items-center justify-between mb-8 shrink-0">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-xl ${
                        participants.find(p => p.id === viewingParticipantId)?.type === 'barn' ? 'bg-amber-400' : 'bg-pink-400'
                      }`}>
                        {participants.find(p => p.id === viewingParticipantId)?.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-800 leading-none mb-1">{participants.find(p => p.id === viewingParticipantId)?.name}</h3>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Detaljerad genomgång</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setViewingParticipantId(null)}
                      className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                    {Array.from({ length: totalQuestions }).map((_, idx) => {
                      const participant = participants.find(p => p.id === viewingParticipantId);
                      const questions = participant?.type === 'barn' ? quizConfig.barnQuestions : quizConfig.vuxenQuestions;
                      const question = questions[idx];
                      const answer = answers.find(a => a.participantId === viewingParticipantId && a.questionIndex === idx);
                      
                      return (
                        <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                          <div className="flex justify-between gap-4">
                            <h4 className="font-bold text-slate-800 text-sm leading-tight">
                              <span className="text-indigo-500 mr-2">{idx + 1}.</span>
                              {question.text}
                            </h4>
                            <div className="shrink-0">
                              {answer?.isCorrect ? (
                                <div className="flex items-center gap-1 text-emerald-600 font-black text-[10px] uppercase bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Rätt
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-rose-600 font-black text-[10px] uppercase bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                                  <span className="w-3 h-3 flex items-center justify-center">×</span>
                                  Fel
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {question.options.map((opt, oIdx) => {
                              const isUserAnswer = answer?.answerIndex === oIdx;
                              const isCorrectAnswer = question.correctAnswer === oIdx;
                              
                              let statusClass = "bg-white border-slate-100 text-slate-500";
                              if (isCorrectAnswer) statusClass = "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm";
                              if (isUserAnswer && !isCorrectAnswer) statusClass = "bg-rose-50 border-rose-200 text-rose-700 shadow-sm";

                              return (
                                <div key={oIdx} className={`p-3 rounded-xl border-2 flex items-center justify-between transition-all text-[11px] ${statusClass}`}>
                                  <div className="flex items-center gap-3">
                                    <span className={`w-5 h-5 flex items-center justify-center rounded-full font-black text-[10px] ${
                                      isCorrectAnswer ? 'bg-emerald-200/50 text-emerald-700' : 
                                      (isUserAnswer && !isCorrectAnswer) ? 'bg-rose-200/50 text-rose-700' : 'bg-black/5 text-slate-400'
                                    }`}>
                                      {oIdx === 0 ? '1' : oIdx === 1 ? 'X' : '2'}
                                    </span>
                                    <span className="font-medium">{opt}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isUserAnswer && (
                                      <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Svarat</span>
                                    )}
                                    {isCorrectAnswer && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                                    {isUserAnswer && !isCorrectAnswer && <XCircle className="w-4 h-4 shrink-0" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => setViewingParticipantId(null)}
                    className="w-full mt-6 py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all shrink-0"
                  >
                    Tillbaka till listan
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-indigo-200/50 text-center">
                    <div className="w-24 h-24 bg-yellow-400 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl rotate-6 border-4 border-white">
                      <Trophy className="text-indigo-900 w-12 h-12" />
                    </div>
                    <h2 className="text-5xl font-black text-slate-800 mb-2">Topplistan!</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-10">Klicka på ett namn för att se detaljer</p>
                    
                    <div className="space-y-4">
                      {participants
                        .map(p => ({
                          ...p,
                          score: answers.filter(a => a.participantId === p.id && a.isCorrect).length,
                          total: answers.filter(a => a.participantId === p.id).length
                        }))
                        .sort((a, b) => b.score - a.score)
                        .map((p, idx) => (
                          <button 
                            key={p.id} 
                            onClick={() => setViewingParticipantId(p.id)}
                            className={`w-full flex items-center justify-between p-6 rounded-3xl border-4 transition-all hover:scale-[1.02] active:scale-95 ${
                              idx === 0 ? 'bg-indigo-600 text-white border-indigo-800 shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-4 text-left">
                              <span className={`text-2xl font-black ${idx === 0 ? 'text-yellow-300' : 'text-slate-300'}`}>#{idx + 1}</span>
                              <div>
                                <span className="font-black text-2xl block leading-none">{p.name}</span>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${idx === 0 ? 'text-indigo-200' : 'text-slate-400'}`}>
                                  {p.type} • {p.total} svarade
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-4xl font-black">{p.score}</span>
                                <span className={`text-sm font-bold opacity-60 ml-1`}>poäng</span>
                              </div>
                              <ChevronRight className={`w-5 h-5 ${idx === 0 ? 'text-white/40' : 'text-slate-300'}`} />
                            </div>
                          </button>
                        ))}
                    </div>

                    <div className="pt-10 flex gap-4">
                      <button 
                        onClick={resetQuiz}
                        className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase hover:bg-slate-200 transition-colors active:scale-95"
                      >
                        Starta om 🔄
                      </button>
                      <button 
                        onClick={() => {
                          setView('quiz');
                          setSelectedQuestionIndex(null);
                          setSelectedParticipantId(null);
                        }}
                        className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase hover:bg-indigo-700 transition-colors shadow-lg active:scale-95"
                      >
                        Tillbaka till frågor 🎯
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'config' && (
            <motion.div 
              key="config"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-2xl mx-auto w-full"
            >
              {!isConfigUnlocked ? (
                <div className="bg-white rounded-[3rem] p-10 border border-indigo-200/50 shadow-2xl text-center space-y-6">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                    <Lock className="text-slate-600 w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Inställningar låsta</h2>
                    <p className="text-slate-500 text-sm mt-1">Ange administratörslösenordet.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <input 
                      type="password" 
                      placeholder="Admin lösenord..."
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 text-center"
                      value={configMasterPasswordInput}
                      onChange={(e) => setConfigMasterPasswordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && configMasterPasswordInput === 'Password') {
                          setIsConfigUnlocked(true);
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        if (configMasterPasswordInput === 'Password') {
                          setIsConfigUnlocked(true);
                        } else {
                          alert('Fel lösenord!');
                        }
                      }}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors"
                    >
                      Lås upp inställningar
                    </button>
                    <button 
                      onClick={() => setView('setup')}
                      className="w-full py-2 text-slate-400 text-sm hover:underline"
                    >
                      Avbryt
                    </button>

                    <div className="pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => {
                          if (confirm('Är du säker på att du vill ta bort ALLA deltagare och deras svar?')) {
                            setParticipants([]);
                            setAnswers([]);
                            alert('Alla namn och svar har raderats.');
                          }
                        }}
                        className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all font-black text-[10px] uppercase flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" /> Rensa alla deltagare
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-[3rem] p-10 border border-indigo-200/50 shadow-2xl space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                        <Settings className="text-white w-5 h-5" />
                      </div>
                      <h2 className="text-2xl font-black text-slate-800">Hantera Quiz</h2>
                    </div>
                    <button 
                      onClick={() => {
                        setView('setup');
                        setIsConfigUnlocked(false);
                        setConfigMasterPasswordInput('');
                      }} 
                      className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors font-black"
                    >
                      ×
                    </button>
                  </div>

                  {/* Quiz Configuration */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Edit2 className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest">Quiz Rubrik</h3>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Namn på quizet..."
                          className="flex-1 p-3 bg-white rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-500"
                          value={newQuizTitle}
                          onChange={(e) => setNewQuizTitle(e.target.value)}
                        />
                        <button 
                          onClick={() => {
                            setQuizConfig({ ...quizConfig, title: newQuizTitle });
                            alert('Rubriken har uppdaterats!');
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase"
                        >
                          Spara
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest">Lösenord för resultat</h3>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Nytt lösenord för resultat..."
                          className="flex-1 p-3 bg-white rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-500"
                          value={newQuizPassword}
                          onChange={(e) => setNewQuizPassword(e.target.value)}
                        />
                        <button 
                          onClick={() => {
                            setQuizConfig({ ...quizConfig, password: newQuizPassword });
                            alert('Resultatlösenordet har uppdaterats!');
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase"
                        >
                          Spara
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">Nuvarande: {quizConfig.password || 'Inget'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={shareConfig}
                      className="flex flex-col items-center gap-3 p-8 bg-indigo-50 rounded-[2rem] border-4 border-indigo-100 hover:border-indigo-500 transition-all text-indigo-600 font-black group"
                    >
                      <Share2 className="w-8 h-8 group-hover:scale-110 transition-transform" />
                      <span className="text-xs uppercase tracking-widest">Kopiera Kod (Messenger)</span>
                    </button>
                  </div>

                  <div className="pt-8 border-t border-slate-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest">Frågor i detta Quiz</h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingQuestionsCategory(editingQuestionsCategory === 'barn' ? null : 'barn')}
                          className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                            editingQuestionsCategory === 'barn' ? 'bg-amber-400 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          Barn 🧒
                        </button>
                        <button 
                          onClick={() => setEditingQuestionsCategory(editingQuestionsCategory === 'vuxen' ? null : 'vuxen')}
                          className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                            editingQuestionsCategory === 'vuxen' ? 'bg-pink-400 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          Vuxen 🧔
                        </button>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {editingQuestionsCategory && (
                        <motion.div 
                          key={editingQuestionsCategory}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4"
                        >
                          <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                            {(editingQuestionsCategory === 'barn' ? quizConfig.barnQuestions : quizConfig.vuxenQuestions).map((q, idx) => (
                              <div key={q.id} className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
                                <div 
                                  className="w-full p-4 flex items-center justify-between hover:bg-slate-100/50 transition-colors cursor-pointer"
                                  onClick={() => setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id)}
                                >
                                  <div className="flex items-center gap-3 text-left">
                                    <span className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">
                                      {idx + 1}
                                    </span>
                                    <span className="text-sm font-bold text-slate-700 truncate max-w-[180px]">{q.text}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteQuestion(editingQuestionsCategory, q.id);
                                      }}
                                      className="p-2 text-rose-400 hover:text-rose-600 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    {expandedQuestionId === q.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                  </div>
                                </div>

                                <AnimatePresence>
                                  {expandedQuestionId === q.id && (
                                    <motion.div 
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="p-4 pt-0 space-y-4 border-t border-slate-200/50"
                                    >
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frågetext</label>
                                        <textarea 
                                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 custom-scrollbar"
                                          value={q.text}
                                          rows={2}
                                          onChange={(e) => updateQuestion(editingQuestionsCategory, q.id, { text: e.target.value })}
                                        />
                                      </div>

                                      <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Svarsalternativ</label>
                                        <div className="space-y-2">
                                          {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex gap-2 items-center">
                                              <button 
                                                onClick={() => updateQuestion(editingQuestionsCategory, q.id, { correctAnswer: oIdx })}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-all ${
                                                  q.correctAnswer === oIdx ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400'
                                                }`}
                                              >
                                                {oIdx === 0 ? '1' : oIdx === 1 ? 'X' : '2'}
                                              </button>
                                              <input 
                                                type="text"
                                                className="flex-1 p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                                                value={opt}
                                                onChange={(e) => {
                                                  const newOpts = [...q.options];
                                                  newOpts[oIdx] = e.target.value;
                                                  updateQuestion(editingQuestionsCategory, q.id, { options: newOpts });
                                                }}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))}
                          </div>
                          
                          <button 
                            onClick={() => addNewQuestion(editingQuestionsCategory)}
                            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-bold hover:bg-slate-50 transition-all text-xs"
                          >
                            <Plus className="w-4 h-4" /> Lägg till fråga
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-4">
                      <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest">Statistik & Data</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Frågor</p>
                        <p className="text-2xl font-black text-slate-800">{totalQuestions}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Deltagare</p>
                        <p className="text-2xl font-black text-slate-800">{participants.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

        {/* Global Import Modal */}
        <AnimatePresence>
          {showConfigInput && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-indigo-900/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[3rem] p-8 max-w-xl w-full shadow-2xl space-y-6 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Upload className="text-blue-600 w-5 h-5" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">Importera Quiz</h2>
                  </div>
                  <button 
                    onClick={() => setShowConfigInput(false)}
                    className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Importera till:</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setImportTarget('barn')}
                        className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all ${
                          importTarget === 'barn' ? 'bg-amber-400 text-white shadow-lg' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        Barn 🧒
                      </button>
                      <button 
                        onClick={() => setImportTarget('vuxen')}
                        className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all ${
                          importTarget === 'vuxen' ? 'bg-pink-400 text-white shadow-lg' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        Vuxen 🧔
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Klistra in quiz-kod eller text:</p>
                    <textarea 
                      className="w-full h-64 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 text-[10px] font-mono outline-none focus:border-indigo-500 custom-scrollbar"
                      placeholder="Klistra in koden från Messenger eller din egen text..."
                      value={configJsonInput}
                      onChange={(e) => setConfigJsonInput(e.target.value)}
                    />
                  </div>

                  <button 
                    onClick={handleImportConfig}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    Läs in Quiz ✨
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Progress - Vibrant Palette */}
        <footer className="mt-8 flex items-center gap-6 pb-4">
          <div className="flex-1 h-4 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${getProgress()}%` }}
              className="h-full bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)]"
            />
          </div>
          <div className="text-white font-black text-lg whitespace-nowrap tracking-tighter">
            {Math.round(getProgress())}% KLART
          </div>
        </footer>
      </div>
    </div>
  );
}
