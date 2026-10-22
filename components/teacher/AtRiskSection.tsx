'use client';

import { AlertTriangle, Clock, ArrowUpRight, Sparkles } from 'lucide-react';

interface AtRiskStudent {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isDemoStudent: boolean;
  overallMastery: number;
  activeMisconceptionsCount: number;
  activeMisconceptions: {
    id: string;
    name: string;
    status: string;
    confidence: number;
    evidence: string;
  }[];
  riskScore: number;
  lastActive: string;
}

interface AtRiskSectionProps {
  students: AtRiskStudent[];
  onSelectStudent?: (studentId: string) => void;
}

export default function AtRiskSection({ students, onSelectStudent }: AtRiskSectionProps) {
  if (students.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Students Needing Immediate Teacher Intervention
            </h2>
            <p className="text-xs text-slate-500">
              Triggered by persistent misconceptions (&ge;2 active gaps or mastery &lt;50%)
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
          {students.length} High Risk
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {students.map((student) => (
          <div
            key={student.id}
            onClick={() => onSelectStudent && onSelectStudent(student.id)}
            className="p-4 rounded-xl border border-rose-200/70 bg-rose-50/20 hover:border-rose-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                    {student.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-xs text-slate-900">{student.name}</h3>
                      {student.isDemoStudent && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">
                          Demo
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">Mastery: {student.overallMastery}%</span>
                  </div>
                </div>
                <span className="text-[11px] font-extrabold text-rose-700 px-2 py-0.5 rounded-full bg-rose-100">
                  Risk: {student.riskScore}
                </span>
              </div>

              {/* Active Misconceptions in this student */}
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Unresolved Mental Models
                </p>
                {student.activeMisconceptions.map((m, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-white border border-rose-200/60 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-700">{m.id}</span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {Math.round(m.confidence * 100)}% conf.
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 italic">
                      "{m.evidence}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-rose-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Active {new Date(student.lastActive).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-indigo-600 font-semibold flex items-center gap-0.5 hover:underline">
                View Full Trace <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
