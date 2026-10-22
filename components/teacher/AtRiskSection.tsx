'use client';

import { AlertTriangle, Clock, ArrowUpRight } from 'lucide-react';

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
    <div className="glass-panel rounded-2xl p-6 transition-all duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-[rgba(34,34,59,0.08)]">
        <div className="flex items-center gap-3">
          <div className="glass-icon glass-icon-coral w-9 h-9 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-[#BE123C]" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#22223B] tracking-tight">
              Students Needing Immediate Teacher Intervention
            </h2>
            <p className="text-xs text-[#4A4E69] font-medium">
              Triggered by persistent misconceptions (&ge;2 active gaps or mastery &lt;50%)
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[rgba(225,29,72,0.12)] text-[#BE123C] border border-white/70 backdrop-blur-xs">
          {students.length} High Risk
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {students.map((student) => (
          <div
            key={student.id}
            onClick={() => onSelectStudent && onSelectStudent(student.id)}
            className="glass-panel-subtle p-4 rounded-xl border border-[rgba(225,29,72,0.2)] hover:border-[rgba(225,29,72,0.4)] hover:translate-y-[-2px] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="glass-icon glass-icon-indigo w-9 h-9 rounded-xl font-bold text-xs">
                    {student.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-xs text-[#22223B]">{student.name}</h3>
                      {student.isDemoStudent && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[rgba(154,140,152,0.2)] text-[#22223B] border border-white/60">
                          Demo
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#4A4E69] font-medium">Mastery: {student.overallMastery}%</span>
                  </div>
                </div>
                <span className="text-[11px] font-black text-[#BE123C] px-2 py-0.5 rounded-full bg-[rgba(225,29,72,0.12)] border border-white/60">
                  Risk: {student.riskScore}
                </span>
              </div>

              {/* Active Misconceptions in this student */}
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#4A4E69]">
                  Unresolved Mental Models
                </p>
                {student.activeMisconceptions.map((m, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-white/75 border border-[rgba(225,29,72,0.15)] text-xs backdrop-blur-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#BE123C]">{m.id}</span>
                      <span className="text-[10px] text-[#4A4E69] font-medium">
                        {Math.round(m.confidence * 100)}% conf.
                      </span>
                    </div>
                    <p className="text-[11px] text-[#22223B] font-medium line-clamp-2 mt-0.5 italic">
                      "{m.evidence}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[rgba(34,34,59,0.08)] flex items-center justify-between text-[11px] text-[#4A4E69]">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 text-[#4A4E69]" />
                Active {new Date(student.lastActive).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-[#22223B] font-bold flex items-center gap-0.5 hover:underline">
                View Diagnostics <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
