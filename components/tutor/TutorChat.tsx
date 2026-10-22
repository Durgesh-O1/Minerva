'use client';

import { useState, useRef, useEffect } from 'react';
import { Diagnosis, TutorResponse } from '@/types/database';
import ProblemCard, { PROBLEMS } from './ProblemCard';
import DiagnosisPanel from './DiagnosisPanel';
import { Send, Sparkles, Zap, Bot, User, Volume2, VolumeX, Mic, MicOff, FileText, ArrowRight } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  diagnosis?: Diagnosis;
  hintLevel?: number;
  understood?: boolean;
  shortcut?: string;
  timestamp: string;
}

interface TutorChatProps {
  studentNotes?: string;
  onOpenNotes?: () => void;
  onConceptSelect?: (conceptId: string) => void;
}

export default function TutorChat({ studentNotes, onOpenNotes, onConceptSelect }: TutorChatProps) {
  const [problemIndex, setProblemIndex] = useState(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showShortcutModal, setShowShortcutModal] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_welcome',
      role: 'assistant',
      content: `Hello Alex! Let's explore fractions today. Look at the problem above: **What is 1/2 + 1/3?** What answer do you get, and how did you approach it?`,
      hintLevel: 0,
      understood: false,
      timestamp: 'Just now',
    },
  ]);

  const [currentDiagnosis, setCurrentDiagnosis] = useState<Diagnosis | null>(null);
  const [currentHintLevel, setCurrentHintLevel] = useState<number>(0);
  const [isConceptUnderstood, setIsConceptUnderstood] = useState<boolean>(false);
  const [relatedConcepts, setRelatedConcepts] = useState<string[]>(['common_denominators', 'equivalent_fractions']);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Web Speech API STT
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = false;
        recog.lang = 'en-US';

        recog.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        };

        recog.onerror = () => setIsListening(false);
        recog.onend = () => setIsListening(false);
        recognitionRef.current = recog;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  };

  const speakText = (text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const historyToSend = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyToSend,
          studentId: 'demo_student',
          notes: studentNotes,
        }),
      });

      if (!res.ok) throw new Error('Tutor response failed');
      const data: TutorResponse = await res.json();

      const tutorMessage: ChatMessage = {
        id: `tutor_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        diagnosis: data.diagnosis,
        hintLevel: data.hint_level,
        understood: data.understood,
        shortcut: data.shortcut,
        timestamp: 'Just now',
      };

      setMessages((prev) => [...prev, tutorMessage]);
      setCurrentDiagnosis(data.diagnosis);
      setCurrentHintLevel(data.hint_level);
      setRelatedConcepts(data.related_concepts || []);

      if (data.understood) {
        setIsConceptUnderstood(true);
      }

      speakText(data.reply);
    } catch (err) {
      console.error('Tutor chat error:', err);
      const fallbackMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: "Let's reflect on this: why did you choose that approach? How do the pieces compare in size?",
        hintLevel: 1,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProblem = (index: number) => {
    setProblemIndex(index);
    const prob = PROBLEMS[index];
    setMessages([
      {
        id: `init_${Date.now()}`,
        role: 'assistant',
        content: `Let's tackle this challenge: **${prob.question}** (${prob.displayMath}). What is your initial answer, and what logic did you use?`,
        hintLevel: 0,
        understood: false,
        timestamp: 'Just now',
      },
    ]);
    setCurrentDiagnosis(null);
    setCurrentHintLevel(0);
    setIsConceptUnderstood(false);
  };

  // Quick Demo Buttons for Hackathon Presenter
  const quickDemoSteps = [
    { label: '1. Answer "2/5" (Triggers M1)', text: '2/5' },
    { label: '2. "I added tops and bottoms"', text: 'I added 1+1 on top and 2+3 on the bottom' },
    { label: '3. "Wait, 2/5 is smaller!" (Absurdity realization)', text: 'Wait... 2/5 is actually smaller than 1/2! Adding two positive amounts cannot be smaller than half.' },
    { label: '4. "Convert to sixths: 5/6" (Mastery)', text: 'We need equal pieces! 1/2 is 3/6 and 1/3 is 2/6, so 3/6 + 2/6 = 5/6.' },
  ];

  return (
    <div className="flex flex-col max-w-5xl mx-auto w-full gap-4 pb-8">
      {/* 1. Problem Card */}
      <ProblemCard
        currentProblemIndex={problemIndex}
        onSelectProblem={handleSelectProblem}
      />

      {/* 2. Prominent Diagnosis Panel */}
      <DiagnosisPanel
        diagnosis={currentDiagnosis}
        hintLevel={currentHintLevel}
      />

      {/* 3. Main Chat Container with guaranteed tall, spacious height */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[540px] sm:h-[600px] overflow-hidden">
        {/* Chat toolbar / status */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold text-slate-700">Minerva Socratic Tutor</span>
            <span className="hidden sm:inline">• Active Session</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Easiest Method Button */}
            <button
              onClick={() => setShowShortcutModal(true)}
              disabled={!isConceptUnderstood}
              title={
                isConceptUnderstood
                  ? 'Show easiest method shortcut'
                  : 'Demonstrate conceptual understanding first to unlock shortcuts'
              }
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isConceptUnderstood
                  ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-xs hover:brightness-105 animate-bounce'
                  : 'bg-slate-200/80 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Show Easiest Method</span>
              {!isConceptUnderstood && <span className="text-[10px] opacity-75">🔒</span>}
            </button>

            {/* TTS Voice Toggle */}
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title={ttsEnabled ? 'Disable Tutor Voice' : 'Enable Tutor Voice'}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                ttsEnabled
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Notes button */}
            {onOpenNotes && (
              <button
                onClick={onOpenNotes}
                title="View or edit your math notes"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">My Notes</span>
              </button>
            )}
          </div>
        </div>

        {/* Message stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs shadow-2xs ${
                    isUser
                      ? 'bg-indigo-600 text-white'
                      : 'bg-linear-to-tr from-violet-600 to-indigo-600 text-white'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message bubble */}
                <div className="space-y-1.5">
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-xs shadow-xs shadow-indigo-100'
                        : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/60 shadow-2xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {!isUser && msg.content.includes('absurd') && (
                      <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
                        <span className="text-base">⚡</span>
                        <span>Cognitive Conflict: Can a sum be smaller than the pieces you started with?</span>
                      </div>
                    )}
                  </div>

                  <div
                    className={`flex items-center gap-2 text-[10px] text-slate-400 px-1 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{isUser ? 'You' : 'Minerva AI'}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 max-w-[80%] mr-auto items-center">
              <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center text-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-100 border border-slate-200/60 rounded-2xl rounded-tl-xs p-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-slate-600 font-semibold">Diagnosing student mental model...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Related concept suggestion chips */}
        {relatedConcepts.length > 0 && (
          <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Prerequisite Links:
            </span>
            {relatedConcepts.map((c) => (
              <button
                key={c}
                onClick={() => onConceptSelect && onConceptSelect(c)}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition shrink-0 font-medium flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <span>Review: {c.replace(/_/g, ' ')}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

        {/* Quick Demo Shortcuts */}
        <div className="px-4 py-2 bg-indigo-50/50 border-t border-indigo-100/60 flex flex-wrap items-center gap-2 text-xs shrink-0">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            <span>Pitch Demo Steps:</span>
          </span>
          {quickDemoSteps.map((step, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(step.text)}
              disabled={loading}
              className="px-2.5 py-1 rounded-md bg-white border border-indigo-200 text-indigo-900 font-semibold text-[11px] hover:bg-indigo-600 hover:text-white transition shrink-0 shadow-2xs cursor-pointer"
            >
              {step.label}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
          {speechSupported && (
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
              }`}
              title={isListening ? 'Stop listening' : 'Speak your answer (Web Speech API)'}
            >
              {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-slate-400" />}
            </button>
          )}

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Explain your approach (e.g., 'I got 2/5 because...')"
            disabled={loading}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Shortcut / Easiest Method Modal */}
      {showShortcutModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-200">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-600">
                  Concept Mastery Verified
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">Easiest Method / Shortcut</h3>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-sm text-slate-800 space-y-2">
              <p className="font-bold text-amber-900">
                🦋 The Butterfly Shortcut for Adding Fractions:
              </p>
              <div className="font-mono text-xs bg-white p-3 rounded-lg border border-amber-200 space-y-1">
                <div>1/2 + 1/3</div>
                <div>1. Cross-multiply 1 × 3 = 3</div>
                <div>2. Cross-multiply 2 × 1 = 2</div>
                <div>3. Add numerators: 3 + 2 = 5</div>
                <div>4. Multiply bottoms: 2 × 3 = 6</div>
                <div className="font-bold text-indigo-700 pt-1">Result = 5/6!</div>
              </div>
              <p className="text-xs text-amber-800/90 italic">
                &ldquo;Remember: This shortcut works because you are finding equivalent fractions with a common denominator of 6 behind the scenes!&rdquo;
              </p>
            </div>

            <button
              onClick={() => setShowShortcutModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition cursor-pointer"
            >
              Got it, continue practicing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
