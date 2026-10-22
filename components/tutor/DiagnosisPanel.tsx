'use client';

import { useState } from 'react';
import { Diagnosis } from '@/types/database';
import { Brain, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Search, Sparkles } from 'lucide-react';

interface DiagnosisPanelProps {
  diagnosis: Diagnosis | null;
  hintLevel?: number;
}

const MISCONCEPTION_NAMES: Record<string, { title: string; color: string; badge: string }> = {
  M1: {
    title: 'Adds numerators and denominators across (1/2 + 1/3 = 2/5)',
    color: 'from-amber-500 to-orange-600',
    badge: 'Numerator/Denominator Confusion'
  },
  M2: {
    title: 'Bigger denominator means bigger fraction (1/8 > 1/3)',
    color: 'from-rose-500 to-red-600',
    badge: 'Inverse Scale Gap'
  },
  M3: {
    title: 'Equal numerators mean equal fractions (2/5 = 2/7)',
    color: 'from-purple-500 to-indigo-600',
    badge: 'Denominator Blindness'
  },
  M4: {
    title: 'Treats numerator and denominator as two separate numbers',
    color: 'from-blue-500 to-cyan-600',
    badge: 'Whole-Number Bias'
  },
  M5: {
    title: 'Ignores requirement for equal-sized units before adding',
    color: 'from-yellow-500 to-amber-600',
    badge: 'Unit Partition Gap'
  },
  careless_slip: {
    title: 'Careless Arithmetic Slip (non-conceptual)',
    color: 'from-blue-400 to-blue-600',
    badge: 'Calculation Typo'
  },
  none: {
    title: 'No Misconception Detected',
    color: 'from-emerald-500 to-teal-600',
    badge: 'Concept Mastered'
  },
  unknown: {
    title: 'Gathering Diagnostic Evidence...',
    color: 'from-slate-400 to-slate-600',
    badge: 'Inquiring'
  }
};

export default function DiagnosisPanel({
  diagnosis,
  hintLevel = 0,
}: DiagnosisPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!diagnosis) {
    return (
      <div className="glass-panel rounded-2xl p-4 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#4A4E69]">
          <Brain className="w-4 h-4 text-[#22223B] animate-pulse" />
          <span>Tutor Diagnosis Engine Standing By (Send an answer to begin diagnosis)</span>
        </div>
      </div>
    );
  }

  const meta = MISCONCEPTION_NAMES[diagnosis.misconception_id] || MISCONCEPTION_NAMES.unknown;
  const isResolved = diagnosis.status === 'resolved';
  const isConfirmed = diagnosis.status === 'confirmed';
  const confidencePercent = Math.round(diagnosis.confidence * 100);

  const statusBadge = () => {
    if (isResolved) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[rgba(16,185,129,0.12)] text-[#047857] border border-[rgba(16,185,129,0.25)] backdrop-blur-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
          Resolved
        </span>
      );
    }
    if (isConfirmed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[rgba(225,29,72,0.12)] text-[#BE123C] border border-[rgba(225,29,72,0.25)] backdrop-blur-xs">
          <AlertCircle className="w-3.5 h-3.5 text-[#BE123C]" />
          Gap Confirmed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[rgba(217,119,6,0.12)] text-[#B45309] border border-[rgba(217,119,6,0.25)] backdrop-blur-xs">
        <Search className="w-3.5 h-3.5 text-[#B45309]" />
        Suspected Pattern
      </span>
    );
  };

  return (
    <div className={`glass-panel rounded-2xl transition-all duration-300 shadow-xs overflow-hidden ${
      isResolved
        ? 'border-[rgba(16,185,129,0.3)]'
        : isConfirmed
        ? 'border-[rgba(225,29,72,0.3)]'
        : 'border-[rgba(217,119,6,0.3)]'
    }`}>
      {/* Header bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3.5 flex items-center justify-between cursor-pointer select-none border-b border-[rgba(34,34,59,0.08)] hover:bg-white/30 transition"
      >
        <div className="flex items-center gap-3">
          <div className="glass-icon glass-icon-indigo w-9 h-9 rounded-xl">
            <Brain className="w-5 h-5 text-[#22223B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#22223B]">
                Tutor&apos;s Live Diagnosis
              </span>
              <span className="text-[11px] font-semibold text-[#4A4E69]">• Key Differentiator</span>
            </div>
            <p className="text-sm font-black text-[#22223B] leading-snug">
              {diagnosis.misconception_id !== 'none' && diagnosis.misconception_id !== 'unknown' && (
                <span className="text-[#22223B] font-black mr-1.5">[{diagnosis.misconception_id}]</span>
              )}
              {meta.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {statusBadge()}
          <button 
            type="button"
            className="glass-btn p-1.5 rounded-lg text-[#4A4E69] hover:text-[#22223B] cursor-pointer"
            aria-label={isOpen ? 'Collapse diagnosis panel' : 'Expand diagnosis panel'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isOpen && (
        <div className="p-4 space-y-3.5 text-xs text-[#4A4E69]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Confidence metric */}
            <div className="glass-panel-subtle p-3.5 rounded-xl">
              <span className="block text-[10px] font-bold text-[#4A4E69] uppercase tracking-wider">
                Diagnosis Confidence
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-[#22223B]">{confidencePercent}%</span>
                <span className="text-[11px] font-medium text-[#4A4E69]">probabilistic match</span>
              </div>
              <div className="w-full bg-[rgba(34,34,59,0.08)] rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isResolved ? 'bg-[#10B981]' : isConfirmed ? 'bg-[#E11D48]' : 'bg-[#D97706]'
                  }`}
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
            </div>

            {/* Hint level */}
            <div className="glass-panel-subtle p-3.5 rounded-xl">
              <span className="block text-[10px] font-bold text-[#4A4E69] uppercase tracking-wider">
                Socratic Hint Level
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-[#22223B]">{hintLevel}/3</span>
                <span className="text-[11px] font-medium text-[#4A4E69]">
                  {hintLevel === 0 ? 'Diagnostic Inquiry' : hintLevel === 1 ? 'Nudge' : hintLevel === 2 ? 'Partial Hint' : 'Worked Example'}
                </span>
              </div>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      hintLevel >= step ? 'bg-[#22223B]' : 'bg-[rgba(34,34,59,0.1)]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Cognitive strategy */}
            <div className="glass-panel-subtle p-3.5 rounded-xl">
              <span className="block text-[10px] font-bold text-[#4A4E69] uppercase tracking-wider">
                Pedagogical Strategy
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-[#22223B] font-bold">
                <Sparkles className="w-4 h-4 text-[#D97706] shrink-0" />
                <span className="truncate">
                  {isResolved ? 'Shortcut Unlocked' : isConfirmed ? 'Cognitive Conflict Probe' : 'Why Did You Choose This?'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#4A4E69] truncate font-medium">
                {isResolved ? 'Verified concept before trick' : 'Guide student to absurd result'}
              </p>
            </div>
          </div>

          {/* Weak Concept & Micro-Concepts */}
          {(diagnosis.weak_concept || (diagnosis.micro_concepts && diagnosis.micro_concepts.length > 0)) && (
            <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-100/90 flex flex-wrap items-center gap-2">
              {diagnosis.weak_concept && (
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                    Identified Weak Concept:
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 border border-rose-200 text-rose-800 text-[11px] font-bold">
                    {diagnosis.weak_concept.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
              {diagnosis.micro_concepts && diagnosis.micro_concepts.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Micro-Concepts:
                  </span>
                  {diagnosis.micro_concepts.map((mc, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 text-[11px] font-medium shadow-2xs"
                    >
                      🎯 {mc.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Evidence quote */}
          {diagnosis.evidence && (
            <div className="glass-panel-subtle p-3.5 rounded-xl flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-white/80 flex items-center justify-center shrink-0 mt-0.5 text-[#4A4E69] font-mono text-[10px] shadow-2xs">
                🔍
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#4A4E69] uppercase tracking-wider">Observed Student Evidence:</span>
                <p className="text-xs text-[#22223B] mt-0.5 font-medium italic">
                  &ldquo;{diagnosis.evidence}&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
