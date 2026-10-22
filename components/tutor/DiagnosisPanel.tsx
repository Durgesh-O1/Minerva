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
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Brain className="w-4 h-4 text-slate-400 animate-pulse" />
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Resolved
        </span>
      );
    }
    if (isConfirmed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          Gap Confirmed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <Search className="w-3.5 h-3.5 text-amber-600" />
        Suspected Pattern
      </span>
    );
  };

  return (
    <div className={`rounded-xl border transition-all duration-300 shadow-xs overflow-hidden ${
      isResolved
        ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-200'
        : isConfirmed
        ? 'bg-gradient-to-r from-rose-50/70 via-orange-50/50 to-white border-rose-200'
        : 'bg-gradient-to-r from-amber-50/70 via-slate-50 to-white border-amber-200'
    }`}>
      {/* Header bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 flex items-center justify-between cursor-pointer select-none border-b border-black/5 hover:bg-black/[0.02] transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                Tutor&apos;s Live Diagnosis
              </span>
              <span className="text-[11px] font-semibold text-slate-400">• Key Differentiator</span>
            </div>
            <p className="text-sm font-bold text-slate-800 leading-snug">
              {diagnosis.misconception_id !== 'none' && diagnosis.misconception_id !== 'unknown' && (
                <span className="text-indigo-600 font-extrabold mr-1.5">[{diagnosis.misconception_id}]</span>
              )}
              {meta.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {statusBadge()}
          <button 
            type="button"
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition"
            aria-label={isOpen ? 'Collapse diagnosis panel' : 'Expand diagnosis panel'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isOpen && (
        <div className="p-4 space-y-3.5 text-xs text-slate-600">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Confidence metric */}
            <div className="bg-white/90 p-3 rounded-lg border border-slate-200/80 shadow-2xs">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Diagnosis Confidence
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-900">{confidencePercent}%</span>
                <span className="text-[11px] font-medium text-slate-500">probabilistic match</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isResolved ? 'bg-emerald-500' : isConfirmed ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
            </div>

            {/* Hint level */}
            <div className="bg-white/90 p-3 rounded-lg border border-slate-200/80 shadow-2xs">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Socratic Hint Level
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-900">{hintLevel}/3</span>
                <span className="text-[11px] font-medium text-slate-500">
                  {hintLevel === 0 ? 'Diagnostic Inquiry' : hintLevel === 1 ? 'Nudge' : hintLevel === 2 ? 'Partial Hint' : 'Worked Example'}
                </span>
              </div>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      hintLevel >= step ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Cognitive strategy */}
            <div className="bg-white/90 p-3 rounded-lg border border-slate-200/80 shadow-2xs">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pedagogical Strategy
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-slate-800 font-bold">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">
                  {isResolved ? 'Shortcut Unlocked' : isConfirmed ? 'Cognitive Conflict Probe' : 'Why Did You Choose This?'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 truncate">
                {isResolved ? 'Verified concept before trick' : 'Guide student to absurd result'}
              </p>
            </div>
          </div>

          {/* Evidence quote */}
          {diagnosis.evidence && (
            <div className="bg-white/80 p-3 rounded-lg border border-slate-200/80 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-slate-500 font-mono text-[10px]">
                🔍
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Observed Student Evidence:</span>
                <p className="text-xs text-slate-700 mt-0.5 font-medium italic">
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
