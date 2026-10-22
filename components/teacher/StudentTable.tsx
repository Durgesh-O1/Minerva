'use client';

import { useState } from 'react';
import { Student } from '@/types/database';
import { Search, Sparkles, AlertCircle, CheckCircle2, ChevronRight, Eye } from 'lucide-react';
import StudentDetailModal from './StudentDetailModal';

interface StudentTableProps {
  students: Student[];
  onRefreshData?: () => void;
}

export default function StudentTable({ students, onRefreshData }: StudentTableProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'demo' | 'at-risk' | 'm1'>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const handleSaveNote = async (studentId: string, note: string) => {
    try {
      await fetch('/api/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_student_note', studentId, note })
      });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to save student note:', err);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filter === 'demo') return !!student.isDemoStudent;
    if (filter === 'at-risk') {
      const activeCount = student.misconceptions.filter(m => m.status !== 'resolved').length;
      return student.overallMastery < 50 || activeCount >= 2;
    }
    if (filter === 'm1') {
      return student.misconceptions.some(m => m.misconception_id === 'M1');
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header & Controls */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Student Cohort
            </span>
            <span className="text-xs text-slate-500">Live & Seeded Profiles</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Student Roster & Misconception Log
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 w-full sm:w-56"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-medium">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filter === 'all' ? 'bg-white text-indigo-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({students.length})
            </button>
            <button
              onClick={() => setFilter('demo')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                filter === 'demo' ? 'bg-white text-indigo-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Demo
            </button>
            <button
              onClick={() => setFilter('at-risk')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filter === 'at-risk' ? 'bg-white text-rose-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              At-Risk
            </button>
            <button
              onClick={() => setFilter('m1')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filter === 'm1' ? 'bg-white text-indigo-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Has M1
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-5">Student</th>
              <th className="py-3 px-4">Mastery</th>
              <th className="py-3 px-4">Active Misconceptions</th>
              <th className="py-3 px-4">Resolved Gaps</th>
              <th className="py-3 px-4">Last Activity</th>
              <th className="py-3 px-4 text-right">Diagnostics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                  No students found matching your search criteria.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => {
                const activeGaps = student.misconceptions.filter(m => m.status !== 'resolved');
                const resolvedGaps = student.misconceptions.filter(m => m.status === 'resolved');

                return (
                  <tr 
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                  >
                    {/* Student Info */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs ${
                          student.isDemoStudent 
                            ? 'bg-linear-to-tr from-indigo-600 to-sky-500 text-white shadow-xs' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {student.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors">
                              {student.name}
                            </span>
                            {student.isDemoStudent && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200">
                                Live
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">{student.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Mastery Meter */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${
                          student.overallMastery >= 70 ? 'text-emerald-600' :
                          student.overallMastery >= 50 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {student.overallMastery}%
                        </span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              student.overallMastery >= 70 ? 'bg-emerald-500' :
                              student.overallMastery >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${student.overallMastery}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Active Misconceptions */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {activeGaps.length === 0 ? (
                          <span className="text-emerald-600 font-medium text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> None
                          </span>
                        ) : (
                          activeGaps.map(gap => (
                            <span
                              key={gap.id}
                              className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                                gap.misconception_id === 'M1' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                gap.misconception_id === 'M2' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-purple-50 text-purple-700 border-purple-200'
                              }`}
                              title={`${gap.misconception_id}: ${gap.status} (${Math.round(gap.confidence * 100)}% confidence)`}
                            >
                              {gap.misconception_id}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Resolved Gaps */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {resolvedGaps.length === 0 ? (
                          <span className="text-slate-400 text-[11px]">-</span>
                        ) : (
                          resolvedGaps.map(gap => (
                            <span
                              key={gap.id}
                              className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                              {gap.misconception_id} ✓
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Last Active */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(student.lastActive).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      at {new Date(student.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudent(student);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-semibold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onSaveNote={handleSaveNote}
        />
      )}
    </div>
  );
}
