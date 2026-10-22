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

function cleanContent(content: string): string {
  if (typeof content === 'string' && content.trim().startsWith('{') && content.includes('"reply"')) {
    const match = content.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (match && match[1]) {
      try {
        return JSON.parse(`"${match[1]}"`);
      } catch {
        return match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
      }
    }
  }
  return content;
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

      let cleanReply = data.reply;
      if (typeof cleanReply === 'string' && cleanReply.trim().startsWith('{') && cleanReply.includes('"reply"')) {
        const match = cleanReply.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (match && match[1]) {
          try {
            cleanReply = JSON.parse(`"${match[1]}"`);
          } catch {
            cleanReply = match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
          }
        }
      }

      const tutorMessage: ChatMessage = {
        id: `tutor_${Date.now()}`,
        role: 'assistant',
        content: cleanReply,
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

      speakText(cleanReply);
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

      {/* 3. Main Chat Container */}
      <div className="glass-panel rounded-2xl flex flex-col h-[540px] sm:h-[600px] overflow-hidden shadow-md transition-all duration-300">
        {/* Chat toolbar / status */}
        <div className="px-4 py-3 bg-[rgba(242,233,228,0.7)] backdrop-blur-md border-b border-[rgba(34,34,59,0.08)] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-[#4A4E69] font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse shadow-xs" />
            <span className="font-extrabold text-[#22223B]">Minerva AI Tutor</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(16,185,129,0.12)] text-[#047857] border border-white/70 backdrop-blur-xs">
              Live AI Active
            </span>
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                isConceptUnderstood
                  ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-xs hover:brightness-105 animate-bounce'
                  : 'bg-[rgba(34,34,59,0.06)] text-[#9A8C98] border border-white/50 cursor-not-allowed'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current text-[#D97706]" />
              <span>Show Easiest Method</span>
              {!isConceptUnderstood && <span className="text-[10px] opacity-75">🔒</span>}
            </button>

            {/* TTS Voice Toggle */}
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title={ttsEnabled ? 'Disable Tutor Voice' : 'Enable Tutor Voice'}
              className={`glass-btn p-1.5 rounded-xl transition cursor-pointer ${
                ttsEnabled ? 'bg-white/90 text-[#22223B]' : 'text-[#4A4E69]'
              }`}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4 text-[#047857]" /> : <VolumeX className="w-4 h-4 text-[#9A8C98]" />}
            </button>

            {/* Notes button */}
            {onOpenNotes && (
              <button
                onClick={onOpenNotes}
                title="View or edit your math notes"
                className="glass-btn flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[#22223B] text-xs font-bold cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#4A4E69]" />
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
                  className={`glass-icon w-8 h-8 rounded-xl shrink-0 text-xs ${
                    isUser
                      ? 'glass-icon-indigo'
                      : 'glass-icon-grape'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4 text-[#22223B]" /> : <Bot className="w-4 h-4 text-[#22223B]" />}
                </div>

                {/* Message bubble */}
                <div className="space-y-1.5">
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#22223B] text-white rounded-tr-xs shadow-md border border-white/20'
                        : 'glass-panel-subtle text-[#22223B] rounded-tl-xs border border-white/80 shadow-2xs font-medium'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{cleanContent(msg.content)}</div>

                    {!isUser && msg.content.includes('absurd') && (
                      <div className="mt-2.5 p-2 rounded-lg bg-[rgba(217,119,6,0.12)] border border-[rgba(217,119,6,0.25)] text-[#B45309] text-xs font-bold flex items-center gap-2">
                        <span className="text-base">⚡</span>
                        <span>Cognitive Conflict: Can a sum be smaller than the pieces you started with?</span>
                      </div>
                    )}
                  </div>

                  <div
                    className={`flex items-center gap-2 text-[10px] text-[#4A4E69] px-1 font-medium ${
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
              <div className="glass-icon glass-icon-grape w-8 h-8 rounded-xl">
                <Bot className="w-4 h-4 text-[#22223B]" />
              </div>
              <div className="glass-panel-subtle rounded-2xl rounded-tl-xs p-4 flex items-center gap-2 text-xs font-medium text-[#4A4E69]">
                <span className="w-2 h-2 rounded-full bg-[#22223B] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[#22223B] animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-[#22223B] animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-[#22223B] font-bold">Diagnosing student mental model...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Related concept suggestion chips */}
        {relatedConcepts.length > 0 && (
          <div className="px-4 py-2 bg-[rgba(242,233,228,0.5)] border-t border-[rgba(34,34,59,0.08)] flex flex-wrap items-center gap-2 text-xs shrink-0">
            <span className="text-[10px] font-bold text-[#4A4E69] uppercase tracking-wider shrink-0">
              Prerequisite Links:
            </span>
            {relatedConcepts.map((c) => (
              <button
                key={c}
                onClick={() => onConceptSelect && onConceptSelect(c)}
                className="glass-btn px-2.5 py-1 rounded-full text-[#4A4E69] hover:text-[#22223B] transition shrink-0 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Review: {c.replace(/_/g, ' ')}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

        {/* Quick Demo Shortcuts */}
        <div className="px-4 py-2 bg-[rgba(201,173,167,0.2)] border-t border-white/60 flex flex-wrap items-center gap-2 text-xs shrink-0">
          <span className="text-[10px] font-extrabold text-[#22223B] uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#22223B]" />
            <span>Pitch Demo Steps:</span>
          </span>
          {quickDemoSteps.map((step, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(step.text)}
              disabled={loading}
              className="glass-btn px-2.5 py-1 rounded-lg text-[#22223B] font-bold text-[11px] transition shrink-0 cursor-pointer"
            >
              {step.label}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="p-3 bg-[rgba(242,233,228,0.75)] border-t border-white/60 flex items-center gap-2 shrink-0">
          {speechSupported && (
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                isListening
                  ? 'bg-[#E11D48] text-white border-white animate-pulse'
                  : 'glass-btn text-[#4A4E69]'
              }`}
              title={isListening ? 'Stop listening' : 'Speak your answer (Web Speech API)'}
            >
              {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-[#9A8C98]" />}
            </button>
          )}

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Ask any study question or explain your approach (e.g., 'What is gravity?', '1/2 + 1/3 = 2/5')..."
            disabled={loading}
            className="flex-1 bg-white/85 border border-white/90 rounded-xl px-4 py-2.5 text-sm text-[#22223B] placeholder-[#4A4E69]/60 focus:outline-hidden focus:ring-2 focus:ring-[#22223B]/30 focus:bg-white transition"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || loading}
            className="glass-btn-primary p-2.5 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
