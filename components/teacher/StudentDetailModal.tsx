'use client';

import { useState } from 'react';
import { Student, MISCONCEPTIONS, CONCEPTS } from '@/types/database';
import { X, Calendar, Clock, AlertCircle, Bookmark, Save, Sparkles } from 'lucide-react';

interface StudentDetailModalProps {
  student: Student | null;
  onClose: () => void;
  onSaveNote: (studentId: string, note: string) => Promise<void>;
}

export default function StudentDetailModal({ student, onClose, onSaveNote }: StudentDetailModalProps) {
  const [note, setNote] = useState(student?.notes || '');
  const [saving, setSaving] = useState(false);

  if (!student) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveNote(student.id, note);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-[rgba(225,29,72,0.12)] text-[#BE123C] border-[rgba(225,29,72,0.25)]';
      case 'suspected':
        return 'bg-[rgba(217,119,6,0.12)] text-[#B45309] border-[rgba(217,119,6,0.25)]';
      case 'resolved':
        return 'bg-[rgba(16,185,129,0.12)] text-[#047857] border-[rgba(16,185,129,0.25)]';
      default:
        return 'bg-[rgba(154,140,152,0.18)] text-[#22223B] border-white/60';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#22223B]/45 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="glass-panel rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/90"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[rgba(34,34,59,0.08)] flex items-center justify-between bg-[rgba(242,233,228,0.5)]">
          <div className="flex items-center gap-3.5">
            <div className="glass-icon glass-icon-indigo w-12 h-12 rounded-xl text-lg font-black">
              {student.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-[#22223B] tracking-tight">{student.name}</h3>
                {student.isDemoStudent && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[rgba(154,140,152,0.2)] text-[#22223B] border border-white/70 flex items-center gap-1 backdrop-blur-xs">
                    <Sparkles className="w-3 h-3 text-[#22223B]" />
                    Live Demo Student
                  </span>
                )}
              </div>
              <p className="text-xs text-[#4A4E69] font-medium">{student.email} • Last active {new Date(student.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="glass-btn p-2 rounded-xl text-[#4A4E69] hover:text-[#22223B] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top stats bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-panel-subtle p-4 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4E69]">Overall Mastery</span>
              <p className="text-2xl font-black text-[#22223B] mt-0.5">{student.overallMastery}%</p>
            </div>
            <div className="glass-panel-subtle p-4 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#BE123C]">Active Gaps</span>
              <p className="text-2xl font-black text-[#BE123C] mt-0.5">
                {student.misconceptions.filter(m => m.status !== 'resolved').length}
              </p>
            </div>
            <div className="glass-panel-subtle p-4 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#047857]">Resolved Flaws</span>
              <p className="text-2xl font-black text-[#047857] mt-0.5">
                {student.misconceptions.filter(m => m.status === 'resolved').length}
              </p>
            </div>
          </div>

          {/* Root Misconception Diagnostic Log (Key Differentiator) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-extrabold text-[#22223B] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#BE123C]" />
                Misconception Diagnostic Evidence
              </h4>
              <span className="text-xs text-[#4A4E69] font-medium">Captured in Socratic Dialogue</span>
            </div>

            {student.misconceptions.length === 0 ? (
              <p className="text-xs text-[#4A4E69] italic p-4 text-center border border-dashed border-white/70 rounded-xl bg-white/40">
                No misconceptions logged for this student yet.
              </p>
            ) : (
              <div className="space-y-3">
                {student.misconceptions.map((log) => {
                  const meta = MISCONCEPTIONS[log.misconception_id];
                  return (
                    <div 
                      key={log.id}
                      className="glass-panel-subtle p-4 rounded-xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="glass-icon glass-icon-indigo w-7 h-7 rounded-lg font-black text-xs">
                            {log.misconception_id}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-[#22223B]">
                              {meta?.name || log.misconception_id}
                            </p>
                            {log.problem && (
                              <p className="text-[11px] text-[#4A4E69] font-mono">
                                Problem: {log.problem}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#4A4E69] font-medium">
                            Confidence: {Math.round(log.confidence * 100)}%
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-xs ${getStatusBadge(log.status)}`}>
                            {log.status}
                          </span>
                        </div>
                      </div>

                      {/* Evidence quote */}
                      <div className="bg-white/80 p-2.5 rounded-lg border border-white/90">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A4E69]">
                          Student Diagnostic Evidence
                        </span>
                        <p className="text-xs text-[#22223B] font-medium italic mt-0.5">
                          "{log.evidence}"
                        </p>
                      </div>

                      {/* Socratic remedy tip */}
                      {meta && (
                        <p className="text-[11px] text-[#22223B] font-medium bg-[rgba(201,173,167,0.22)] px-2.5 py-1.5 rounded-md border border-white/70 leading-relaxed">
                          <strong className="text-[#B45309]">Cognitive Conflict Remedy:</strong> {meta.remedyHint}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Concept Mastery Grid */}
          <div>
            <h4 className="text-sm font-extrabold text-[#22223B] mb-3">
              Concept Mastery Levels
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(student.masteryByConcept).map(([conceptId, mastery]) => {
                const meta = CONCEPTS[conceptId as keyof typeof CONCEPTS];
                return (
                  <div key={conceptId} className="p-2.5 rounded-lg glass-panel-subtle text-xs flex items-center justify-between">
                    <span className="text-[#4A4E69] font-medium truncate mr-2">{meta?.name || conceptId}</span>
                    <span className={`font-black ${
                      mastery >= 70 ? 'text-[#047857]' : mastery >= 50 ? 'text-[#B45309]' : 'text-[#BE123C]'
                    }`}>
                      {mastery}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Retention & Revisit Queue */}
          <div>
            <h4 className="text-sm font-extrabold text-[#22223B] mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#B45309]" />
              Spaced Retention Queue (Day 1, 3, 7)
            </h4>
            {student.revisitQueue.length === 0 ? (
              <p className="text-xs text-[#4A4E69] italic p-3 glass-panel-subtle rounded-lg">
                No active revisits due. Revisits are auto-scheduled when misconceptions are resolved.
              </p>
            ) : (
              <div className="space-y-2">
                {student.revisitQueue.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg glass-panel-subtle text-xs">
                    <div className="flex items-center gap-2 font-medium text-[#22223B]">
                      <Calendar className="w-3.5 h-3.5 text-[#4A4E69]" />
                      <span>{item.misconception_id} (Day {item.intervalDays} check)</span>
                    </div>
                    <span className={item.completed ? 'text-[#047857] font-bold' : 'text-[#B45309] font-semibold'}>
                      {item.completed ? 'Passed Retest' : `Due: ${new Date(item.dueDate).toLocaleDateString()}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Teacher Private Notes & Interventions */}
          <div className="p-4 rounded-xl glass-panel-subtle border border-[rgba(201,173,167,0.5)]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#B45309] flex items-center gap-1.5 mb-2">
              <Bookmark className="w-3.5 h-3.5 text-[#B45309]" />
              Teacher Intervention Note
            </h4>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add observation or personalized follow-up instructions for this student..."
              className="w-full text-xs p-3 rounded-lg bg-white/85 border border-white/90 text-[#22223B] placeholder-[#4A4E69]/60 focus:outline-hidden focus:ring-2 focus:ring-[#22223B]/30"
              rows={3}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="glass-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
