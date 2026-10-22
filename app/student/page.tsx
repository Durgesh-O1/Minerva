'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import TutorChat from '@/components/tutor/TutorChat';
import KnowledgeMap from '@/components/student/KnowledgeMap';
import MisconceptionList from '@/components/student/MisconceptionList';
import RevisitQueue from '@/components/student/RevisitQueue';
import { Student } from '@/types/database';
import { Sparkles, Compass, MessageSquare, TrendingUp, FileText, X, Check } from 'lucide-react';

export default function StudentPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard'>('chat');
  const [student, setStudent] = useState<Student | null>(null);
  const [clockOffsetDays, setClockOffsetDays] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Notes state
  const [studentNotes, setStudentNotes] = useState<string>(
    'Remember: Denominator is like unit name (e.g., quarters). 1 quarter + 1 quarter = 2 quarters, not 2 eighths!'
  );
  const [notesOpen, setNotesOpen] = useState(false);
  const [tempNotes, setTempNotes] = useState(studentNotes);
  const [notesSaved, setNotesSaved] = useState(false);

  const fetchStudent = async () => {
    try {
      const res = await fetch('/api/student');
      if (!res.ok) throw new Error('Failed to load student data');
      const data = await res.json();
      setStudent(data.student);
      setClockOffsetDays(data.clockOffsetDays || 0);
      if (data.student?.notes) {
        setStudentNotes(data.student.notes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, []);

  const handleAdvanceClock = async (days: number) => {
    try {
      const res = await fetch('/api/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance_clock', days }),
      });
      if (!res.ok) throw new Error('Failed to advance clock');
      const data = await res.json();
      setClockOffsetDays(data.clockOffsetDays);
      setStudent(data.student);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveRetest = async (revisitId: string, passed: boolean) => {
    try {
      const res = await fetch('/api/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve_retest', revisitId, passed }),
      });
      if (!res.ok) throw new Error('Failed to resolve retest');
      const data = await res.json();
      setStudent(data.student);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNotes = async () => {
    setStudentNotes(tempNotes);
    try {
      await fetch('/api/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_notes',
          notes: tempNotes,
        }),
      });
      setNotesSaved(true);
      setTimeout(() => {
        setNotesSaved(false);
        setNotesOpen(false);
      }, 700);
    } catch (e) {
      console.error('Save notes error:', e);
      setNotesOpen(false);
    }
  };

  if (loading || !student) {
    return (
      <div className="min-h-screen flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold">Loading student profile...</span>
          </div>
        </div>
      </div>
    );
  }

  const activeGapsCount = student.misconceptions.filter((m) => m.status !== 'resolved').length;
  const resolvedCount = student.misconceptions.filter((m) => m.status === 'resolved').length;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar
        clockOffsetDays={clockOffsetDays}
        onAdvanceClock={(d) => handleAdvanceClock(d)}
        onResetData={fetchStudent}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-5">
        {/* Profile & Sub-Navigation Header */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
              AC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900">{student.name}</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Live Demo Session
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Focus Area: <span className="font-semibold text-slate-700">Adding & Comparing Fractions</span> • Overall Mastery: <span className="font-bold text-indigo-600">{student.overallMastery}%</span>
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Socratic AI Tutor</span>
            </button>
            <button
              onClick={() => {
                fetchStudent();
                setActiveTab('dashboard');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Knowledge Map & Revisits</span>
              {activeGapsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeGapsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Socratic AI Tutor Chat */}
        {activeTab === 'chat' && (
          <div className="animate-in fade-in duration-200">
            <TutorChat
              studentNotes={studentNotes}
              onOpenNotes={() => {
                setTempNotes(studentNotes);
                setNotesOpen(true);
              }}
              onConceptSelect={() => setActiveTab('dashboard')}
            />
          </div>
        )}

        {/* Tab 2: Knowledge Map & Misconception Log */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Quick Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
                <span className="block text-xs font-semibold text-slate-500 uppercase">Overall Mastery</span>
                <span className="text-2xl font-black text-indigo-600 mt-1 block">{student.overallMastery}%</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
                <span className="block text-xs font-semibold text-slate-500 uppercase">Active Conceptual Gaps</span>
                <span className="text-2xl font-black text-rose-600 mt-1 block">{activeGapsCount}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
                <span className="block text-xs font-semibold text-slate-500 uppercase">Resolved by Tutor</span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">{resolvedCount}</span>
              </div>
            </div>

            {/* Knowledge Map */}
            <KnowledgeMap
              masteryByConcept={student.masteryByConcept}
              onSelectConcept={() => setActiveTab('chat')}
            />

            {/* Recommended Next Step Alert */}
            <div className="bg-linear-to-r from-amber-500/10 via-orange-500/5 to-white p-4 sm:p-5 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">
                      Recommended Next Step
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">• Prerequisite Graph</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    Review: Common Denominators & Equivalent Fractions
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Before adding fractions with unlike denominators, solidify converting halves and thirds into equal sixths.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('chat')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shrink-0 self-start sm:self-auto shadow-2xs cursor-pointer"
              >
                Practice in Socratic Chat
              </button>
            </div>

            {/* Misconceptions & Revisit Queue Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MisconceptionList misconceptions={student.misconceptions || []} />

              <RevisitQueue
                revisitQueue={student.revisitQueue || []}
                clockOffsetDays={clockOffsetDays}
                onAdvanceClock={handleAdvanceClock}
                onResolveRetest={handleResolveRetest}
              />
            </div>
          </div>
        )}
      </main>

      {/* Notes Drawer / Modal */}
      {notesOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Student Study Notes</h3>
                  <p className="text-xs text-slate-500">Tutor adapts to your terminology and flags note errors</p>
                </div>
              </div>
              <button
                onClick={() => setNotesOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <textarea
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                rows={5}
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition resize-none text-slate-800"
                placeholder="Type or paste math notes here..."
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400 font-medium">
                Included in Grok AI reasoning context
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNotesOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {notesSaved ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{notesSaved ? 'Saved!' : 'Save Notes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
