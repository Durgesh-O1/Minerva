'use client';

import { useState } from 'react';
import { Student, MISCONCEPTIONS, CONCEPTS } from '@/types/database';
import { X, Calendar, Clock, AlertCircle, CheckCircle2, Bookmark, Save, Sparkles } from 'lucide-react';

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
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'suspected':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-sm">
              {student.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900">{student.name}</h3>
                {student.isDemoStudent && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Live Demo Student
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{student.email} • Last active {new Date(student.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top stats bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Overall Mastery</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{student.overallMastery}%</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Gaps</span>
              <p className="text-2xl font-extrabold text-rose-600 mt-0.5">
                {student.misconceptions.filter(m => m.status !== 'resolved').length}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Resolved Flaws</span>
              <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                {student.misconceptions.filter(m => m.status === 'resolved').length}
              </p>
            </div>
          </div>

          {/* Root Misconception Diagnostic Log (Key Differentiator) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Misconception Diagnostic Evidence
              </h4>
              <span className="text-xs text-slate-400">Captured in Socratic Dialogue</span>
            </div>

            {student.misconceptions.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-4 text-center border border-dashed rounded-xl">
                No misconceptions logged for this student yet.
              </p>
            ) : (
              <div className="space-y-3">
                {student.misconceptions.map((log) => {
                  const meta = MISCONCEPTIONS[log.misconception_id];
                  return (
                    <div 
                      key={log.id}
                      className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
                            {log.misconception_id}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {meta?.name || log.misconception_id}
                            </p>
                            {log.problem && (
                              <p className="text-[11px] text-slate-500 font-mono">
                                Problem: {log.problem}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-medium">
                            Confidence: {Math.round(log.confidence * 100)}%
                          </span>
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadge(log.status)}`}>
                            {log.status}
                          </span>
                        </div>
                      </div>

                      {/* Evidence quote */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Student Diagnostic Evidence
                        </span>
                        <p className="text-xs text-slate-800 italic mt-0.5">
                          "{log.evidence}"
                        </p>
                      </div>

                      {/* Socratic remedy tip */}
                      {meta && (
                        <p className="text-[11px] text-indigo-700 bg-indigo-50/50 px-2.5 py-1 rounded-md border border-indigo-100">
                          <strong>Cognitive Conflict Remedy:</strong> {meta.remedyHint}
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
            <h4 className="text-sm font-bold text-slate-900 mb-3">
              Concept Mastery Levels
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(student.masteryByConcept).map(([conceptId, mastery]) => {
                const meta = CONCEPTS[conceptId as keyof typeof CONCEPTS];
                return (
                  <div key={conceptId} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <span className="text-slate-700 truncate mr-2">{meta?.name || conceptId}</span>
                    <span className={`font-bold ${
                      mastery >= 70 ? 'text-emerald-600' : mastery >= 50 ? 'text-amber-600' : 'text-rose-600'
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
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Spaced Retention Queue (Day 1, 3, 7)
            </h4>
            {student.revisitQueue.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg">
                No active revisits due. Revisits are auto-scheduled when misconceptions are resolved.
              </p>
            ) : (
              <div className="space-y-2">
                {student.revisitQueue.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.misconception_id} (Day {item.intervalDays} check)</span>
                    </div>
                    <span className={item.completed ? 'text-emerald-600 font-bold' : 'text-amber-600 font-medium'}>
                      {item.completed ? 'Passed Retest' : `Due: ${new Date(item.dueDate).toLocaleDateString()}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Teacher Private Notes & Interventions */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5 mb-2">
              <Bookmark className="w-3.5 h-3.5 text-amber-600" />
              Teacher Intervention Note
            </h4>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add observation or personalized follow-up instructions for this student..."
              className="w-full text-xs p-3 rounded-lg bg-white border border-amber-300/80 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              rows={3}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer"
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
