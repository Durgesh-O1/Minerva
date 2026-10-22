'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Diagnosis, TutorResponse } from '@/types/database';
import ProblemCard, { PROBLEMS } from './ProblemCard';
import DiagnosisPanel from './DiagnosisPanel';
import { Send, Sparkles, Zap, Bot, User, Volume2, VolumeX, Mic, MicOff, FileText, ArrowRight, Paperclip, X, Lightbulb } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  diagnosis?: Diagnosis;
  hintLevel?: number;
  understood?: boolean;
  shortcut?: string;
  trick?: string;
  attachmentName?: string;
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
  const [attachedDoc, setAttachedDoc] = useState<{ name: string; size: string; content: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeStr = file.size < 1024 
      ? `${file.size} B` 
      : file.size < 1024 * 1024 
      ? `${(file.size / 1024).toFixed(1)} KB` 
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawContent = (event.target?.result as string) || '';
      // Limit to 4000 characters to stay within prompt budget
      const truncated = rawContent.slice(0, 4000);
      setAttachedDoc({
        name: file.name,
        size: sizeStr,
        content: truncated,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Web Speech API STT Support Check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
      }
    }
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.');
      return;
    }

    // Always stop and clean up any previous instance before creating a fresh one
    stopListening();

    try {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = 'en-US';

      const baseText = input.trim();

      recog.onstart = () => {
        setIsListening(true);
      };

      recog.onresult = (event: any) => {
        let interim = '';
        let currentFinal = '';

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentFinal += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const spoken = (currentFinal + interim).trim();
        if (spoken) {
          setInput(baseText ? `${baseText} ${spoken}` : spoken);
        }
      };

      recog.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          alert('Microphone access was denied. Please allow microphone permission in your browser address bar.');
        }
        if (event.error !== 'no-speech') {
          stopListening();
        }
      };

      recog.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recog;
      recog.start();
      setIsListening(true);
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
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

    const currentDoc = attachedDoc;
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      attachmentName: currentDoc?.name,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAttachedDoc(null);
    setLoading(true);

    try {
      const historyToSend = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Combine studentNotes with uploaded document content
      const docHeader = currentDoc ? `[Uploaded Document: "${currentDoc.name}"]:\n${currentDoc.content}` : '';
      const combinedNotes = docHeader
        ? (studentNotes ? `${studentNotes}\n\n${docHeader}` : docHeader)
        : studentNotes;

      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyToSend,
          studentId: 'demo_student',
          notes: combinedNotes,
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
        trick: data.trick,
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
            <div className="w-5 h-5 rounded-md overflow-hidden shrink-0 border border-white/60 shadow-xs bg-[#22223B]">
              <Image src="/logo.png" alt="Minerva Logo" width={20} height={20} className="w-full h-full object-cover" />
            </div>
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
                  className={`w-8 h-8 rounded-xl shrink-0 overflow-hidden flex items-center justify-center ${
                    isUser
                      ? 'glass-icon glass-icon-indigo text-xs'
                      : 'border border-white/60 shadow-xs bg-[#22223B]'
                  }`}
                >
                  {isUser ? (
                    <User className="w-4 h-4 text-[#22223B]" />
                  ) : (
                    <Image src="/logo.png" alt="Minerva AI" width={32} height={32} className="w-full h-full object-cover" />
                  )}
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
                    {/* User Attachment Tag */}
                    {isUser && msg.attachmentName && (
                      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-100 bg-indigo-700/70 border border-indigo-400/40 px-2.5 py-1 rounded-lg w-fit">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>Attached Document: {msg.attachmentName}</span>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{cleanContent(msg.content)}</div>

                    {/* Socratic Cognitive Conflict Highlight */}
                    {!isUser && msg.content.includes('absurd') && (
                      <div className="mt-2.5 p-2 rounded-lg bg-[rgba(217,119,6,0.12)] border border-[rgba(217,119,6,0.25)] text-[#B45309] text-xs font-bold flex items-center gap-2">
                        <span className="text-base">⚡</span>
                        <span>Cognitive Conflict: Can a sum be smaller than the pieces you started with?</span>
                      </div>
                    )}

                    {/* Easiest Solution & Trick Callout */}
                    {!isUser && (msg.trick || msg.shortcut) && (
                      <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 text-amber-950 text-xs space-y-1 shadow-2xs">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <Zap className="w-4 h-4 fill-amber-500 text-amber-600" />
                          <span>💡 Easiest Solution & Trick:</span>
                        </div>
                        <p className="font-medium text-amber-950/90 leading-relaxed whitespace-pre-wrap">
                          {msg.trick || msg.shortcut}
                        </p>
                      </div>
                    )}

                    {/* Weak Concept & Micro-Concepts Tag */}
                    {!isUser && (msg.diagnosis?.weak_concept || (msg.diagnosis?.micro_concepts && msg.diagnosis.micro_concepts.length > 0)) && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-1.5 text-[11px]">
                        {msg.diagnosis.weak_concept && (
                          <div className="flex items-center gap-1 mr-1">
                            <span className="font-semibold text-slate-500">Identified Gap:</span>
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px]">
                              {msg.diagnosis.weak_concept.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}
                        {msg.diagnosis.micro_concepts && msg.diagnosis.micro_concepts.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-slate-400 font-medium">Micro-Concepts:</span>
                            {msg.diagnosis.micro_concepts.map((mc, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-indigo-700 font-medium text-[10px] shadow-2xs"
                              >
                                🎯 {mc.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
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
              <div className="w-8 h-8 rounded-xl shrink-0 overflow-hidden border border-white/60 shadow-xs bg-[#22223B] flex items-center justify-center">
                <Image src="/logo.png" alt="Minerva AI" width={32} height={32} className="w-full h-full object-cover" />
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

        {/* Attached Document Banner */}
        {attachedDoc && (
          <div className="px-4 py-2 bg-indigo-50/90 border-t border-indigo-100 flex items-center justify-between text-xs text-indigo-950 shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-100 text-indigo-600">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-slate-800">{attachedDoc.name}</span>
                <span className="ml-2 text-[10px] text-slate-500">({attachedDoc.size})</span>
                <span className="ml-2 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Ready for AI Analysis
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAttachedDoc(null)}
              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition cursor-pointer"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input box */}
        <div className="p-3 bg-[rgba(242,233,228,0.75)] border-t border-white/60 flex items-center gap-2 shrink-0">
          {/* File Upload Hidden Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.md,.json,.csv,.ts,.js,.py,.pdf,.doc,.docx"
            className="hidden"
          />

          {/* Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach notes or study document (TXT, MD, PDF, Code)"
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              attachedDoc
                ? 'bg-[#22223B] text-white border-white/40 shadow-xs'
                : 'glass-btn text-[#4A4E69] hover:text-[#22223B] border-white/60'
            }`}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Microphone Voice Input Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center shrink-0 ${
              isListening
                ? 'bg-[#E11D48] text-white border-white shadow-md shadow-rose-300 animate-pulse ring-2 ring-rose-400'
                : 'glass-btn text-[#4A4E69] hover:text-[#22223B]'
            }`}
            title={isListening ? 'Click to stop listening' : 'Click to speak your question/answer'}
          >
            {isListening ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <Mic className="w-5 h-5 fill-current" />
              </span>
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder={
              isListening
                ? "🎙️ Listening to your voice... Speak now (click mic again to stop)"
                : attachedDoc
                ? `Ask anything about "${attachedDoc.name}" or hit send for a breakdown...`
                : "Ask any study question, trick, or problem (e.g., 'Trick for 9 table', '1/2 + 1/3 = 2/5')..."
            }
            disabled={loading}
            className={`flex-1 bg-white/85 border border-white/90 rounded-xl px-4 py-2.5 text-sm text-[#22223B] placeholder-[#4A4E69]/60 focus:outline-hidden transition ${
              isListening ? 'ring-2 ring-rose-500/70 bg-rose-50/40' : 'focus:ring-2 focus:ring-[#22223B]/30 focus:bg-white'
            }`}
          />

          <button
            onClick={() => handleSendMessage(input || (attachedDoc ? 'Please analyze and explain my attached study document' : ''))}
            disabled={(!input.trim() && !attachedDoc) || loading}
            className="glass-btn-primary p-2.5 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-200">
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
