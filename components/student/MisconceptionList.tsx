'use client';

import { MisconceptionLogEntry, MISCONCEPTIONS } from '@/types/database';
import { AlertCircle, CheckCircle2, Search, Zap, Target } from 'lucide-react';

interface MisconceptionListProps {
  misconceptions: MisconceptionLogEntry[];
}

export default function MisconceptionList({ misconceptions }: MisconceptionListProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Fixed / Mastered
          </span>
        );
      case 'improving':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Search className="w-3.5 h-3.5 text-amber-600" />
            Improving
          </span>
        );
      case 'active':
      case 'confirmed':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Active Gap
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>My Diagnosed Misconceptions</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              {misconceptions.length} Recorded
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Root thinking flaws uncovered by Socratic inquiry, not just test scores
          </p>
        </div>
      </div>

      {misconceptions.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Target className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No active misconceptions logged yet!</p>
          <p className="text-xs text-slate-500 mt-1">
            Head over to the Socratic Tutor Chat to explore fraction problems.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {misconceptions.map((item) => {
            const meta = MISCONCEPTIONS[item.misconception_id];
            const isFixed = item.status === 'resolved';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  isFixed
                    ? 'bg-gradient-to-r from-emerald-50/60 to-white border-emerald-200'
                    : 'bg-gradient-to-r from-rose-50/50 to-white border-rose-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-black text-xs">
                      {item.misconception_id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {meta?.name || item.misconception_id}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(item.status)}
                    <span className="text-[11px] font-semibold text-slate-400">
                      {Math.round(item.confidence * 100)}% match
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {meta?.description || 'Conceptual pattern diagnosed during chat.'}
                </p>

                {/* Evidence snippet */}
                {item.evidence && (
                  <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/80 text-[11px] text-slate-600 mb-3">
                    <span className="font-bold text-slate-700">Student Evidence: </span>
                    <span className="italic font-medium">&ldquo;{item.evidence}&rdquo;</span>
                  </div>
                )}

                {/* Before / After Score Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-rose-50/80 border border-rose-200 p-2.5 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                        Initial Belief (Before)
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {meta?.example || '1/2 + 1/3 = 2/5'}
                      </span>
                    </div>
                    <span className="text-rose-600 font-bold text-sm">❌ Gap</span>
                  </div>

                  <div className="bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        Target Insight (After)
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {item.misconception_id === 'M1' ? '1/2 + 1/3 = 5/6' : 'Common unit partitions'}
                      </span>
                    </div>
                    <span className="text-emerald-600 font-bold text-sm">
                      {isFixed ? '✅ Mastered' : '🎯 In Progress'}
                    </span>
                  </div>
                </div>

                {/* Targeted Remedy Hint */}
                {meta?.remedyHint && (
                  <div className="mt-2.5 pt-2 border-t border-black/5 flex items-center gap-1.5 text-[11px] text-indigo-700 font-medium">
                    <Zap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Targeted Fix: {meta.remedyHint}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
