'use client';

import { useState } from 'react';
import { RevisitScheduleItem, MISCONCEPTIONS } from '@/types/database';
import { Clock, Calendar, CheckCircle2, FastForward, Play, HelpCircle } from 'lucide-react';

interface RevisitQueueProps {
  revisitQueue: RevisitScheduleItem[];
  clockOffsetDays: number;
  onAdvanceClock: (days: number) => Promise<void>;
  onResolveRetest: (revisitId: string, passed: boolean) => Promise<void>;
}

export default function RevisitQueue({
  revisitQueue,
  clockOffsetDays,
  onAdvanceClock,
  onResolveRetest,
}: RevisitQueueProps) {
  const [advancing, setAdvancing] = useState(false);
  const [activeRetest, setActiveRetest] = useState<RevisitScheduleItem | null>(null);
  const [retestAnswerInput, setRetestAnswerInput] = useState('');
  const [resolving, setResolving] = useState(false);

  const handleSimulateTime = async () => {
    setAdvancing(true);
    try {
      await onAdvanceClock(3);
    } finally {
      setAdvancing(false);
    }
  };

  const handleRetestSubmit = async (passed: boolean) => {
    if (!activeRetest) return;
    setResolving(true);
    try {
      await onResolveRetest(activeRetest.id, passed);
      setActiveRetest(null);
      setRetestAnswerInput('');
    } finally {
      setResolving(false);
    }
  };

  const getQuestionForMisconception = (mId: string) => {
    switch (mId) {
      case 'M1':
        return {
          question: 'What is 1/4 + 2/4? Do we add the denominators together?',
          expected: '3/4. No, denominators stay 4 because the unit partition is unchanged.',
        };
      case 'M2':
        return {
          question: 'Which is larger: 1/10 or 1/4? Explain why.',
          expected: '1/4 is larger. Cutting into 4 pieces gives bigger pieces than 10 pieces.',
        };
      default:
        return {
          question: 'Quick check: What is 2/6 + 3/6? Why do the denominators match?',
          expected: '5/6. Both fractions are already partitioned into sixths.',
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>Forgetting-Aware Revisit Queue</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
              Spaced Repetition (D1, D3, D7)
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Guarantees permanent mastery by scheduling targeted retests before memory decays
          </p>
        </div>

        {/* Fake Clock & Simulation Button */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Clock Offset: +{clockOffsetDays} Days</span>
          </div>

          <button
            onClick={handleSimulateTime}
            disabled={advancing}
            title="Simulate time passage by 3 days to trigger due revisits"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs hover:brightness-105 transition shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <FastForward className={`w-3.5 h-3.5 ${advancing ? 'animate-spin' : ''}`} />
            <span>Simulate +3 Days</span>
          </button>
        </div>
      </div>

      {revisitQueue.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Revisit queue is currently empty</p>
          <p className="text-xs text-slate-500 mt-1">
            When you resolve a misconception in the Socratic Tutor Chat, spaced checkups will automatically queue here!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {revisitQueue.map((item) => {
            const isCompleted = item.completed;
            const isDue = !isCompleted && clockOffsetDays >= item.intervalDays;
            const meta = MISCONCEPTIONS[item.misconception_id];
            const q = getQuestionForMisconception(item.misconception_id);

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCompleted
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : isDue
                    ? 'bg-amber-50/70 border-amber-300 shadow-xs ring-1 ring-amber-300/60'
                    : 'bg-slate-50/60 border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-black text-[10px]">
                      {item.misconception_id}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      Scheduled Interval: +{item.intervalDays} Day(s)
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Completed & Retained
                      </span>
                    )}
                    {isDue && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 animate-pulse">
                        ⚠️ Retest Due Now
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    {q.question}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {isDue ? (
                    <button
                      onClick={() => setActiveRetest(item)}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Take Retest</span>
                    </button>
                  ) : isCompleted ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">
                      Due at +{item.intervalDays}d
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Retest Modal Dialog */}
      {activeRetest && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-indigo-200 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                Q
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Spaced Retention Retest • {activeRetest.misconception_id}
                </span>
                <h3 className="text-base font-bold text-slate-900">Confirming Long-Term Memory</h3>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-sm font-semibold text-slate-800">
                {getQuestionForMisconception(activeRetest.misconception_id).question}
              </p>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Passing keeps the concept resolved; failing flags it for review.</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Your Answer:</label>
              <textarea
                value={retestAnswerInput}
                onChange={(e) => setRetestAnswerInput(e.target.value)}
                placeholder="Type your explanation or answer here..."
                rows={3}
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-slate-800"
              />
            </div>

            <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900">
              <span className="font-bold">Expected Reasoning: </span>
              <span>{getQuestionForMisconception(activeRetest.misconception_id).expected}</span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveRetest(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={resolving}
                  onClick={() => handleRetestSubmit(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                >
                  Mark as Failed (Re-activate)
                </button>
                <button
                  type="button"
                  disabled={resolving}
                  onClick={() => handleRetestSubmit(true)}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Pass & Retain</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
