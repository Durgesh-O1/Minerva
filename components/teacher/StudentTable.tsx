'use client';

import { useState } from 'react';
import { Student } from '@/types/database';
import { Search, Sparkles, CheckCircle2, Eye } from 'lucide-react';
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
    <div className="glass-panel rounded-2xl shadow-xs overflow-hidden transition-all duration-300">
      {/* Header & Controls */}
      <div className="p-6 border-b border-[rgba(34,34,59,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[rgba(154,140,152,0.18)] text-[#22223B] border border-white/70 backdrop-blur-xs">
              Student Cohort
            </span>
            <span className="text-xs text-[#4A4E69] font-medium">Live & Seeded Profiles</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#22223B] tracking-tight mt-1">
            Student Roster & Misconception Log
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4E69]" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white/75 border border-white/80 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#22223B]/30 w-full sm:w-56 text-[#22223B] placeholder-[#4A4E69]/60 backdrop-blur-xs transition-all"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1 p-1 bg-[rgba(201,173,167,0.22)] rounded-xl border border-white/60 backdrop-blur-md text-xs font-semibold">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filter === 'all' 
                  ? 'bg-white/90 text-[#22223B] shadow-xs border border-white/80' 
                  : 'text-[#4A4E69] hover:text-[#22223B] hover:bg-white/40'
              }`}
            >
              All ({students.length})
            </button>
            <button
              onClick={() => setFilter('demo')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                filter === 'demo' 
                  ? 'bg-white/90 text-[#22223B] shadow-xs border border-white/80' 
                  : 'text-[#4A4E69] hover:text-[#22223B] hover:bg-white/40'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#22223B]" />
              Demo
            </button>
            <button
              onClick={() => setFilter('at-risk')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filter === 'at-risk' 
                  ? 'bg-white/90 text-[#BE123C] shadow-xs border border-white/80' 
                  : 'text-[#4A4E69] hover:text-[#22223B] hover:bg-white/40'
              }`}
            >
              At-Risk
            </button>
            <button
              onClick={() => setFilter('m1')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filter === 'm1' 
                  ? 'bg-white/90 text-[#22223B] shadow-xs border border-white/80' 
                  : 'text-[#4A4E69] hover:text-[#22223B] hover:bg-white/40'
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
            <tr className="border-b border-[rgba(34,34,59,0.08)] bg-[rgba(242,233,228,0.5)] text-[#4A4E69] font-extrabold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-5">Student</th>
              <th className="py-3 px-4">Mastery</th>
              <th className="py-3 px-4">Active Misconceptions</th>
              <th className="py-3 px-4">Resolved Gaps</th>
              <th className="py-3 px-4">Last Activity</th>
              <th className="py-3 px-4 text-right">Diagnostics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(34,34,59,0.06)]">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#4A4E69] italic">
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
                    className="hover:bg-white/60 transition-colors cursor-pointer group"
                  >
                    {/* Student Info */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl font-black flex items-center justify-center text-xs glass-icon ${
                          student.isDemoStudent 
                            ? 'glass-icon-indigo' 
                            : 'glass-icon-grape'
                        }`}>
                          {student.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-[#22223B] text-xs group-hover:text-[#4A4E69] transition-colors">
                              {student.name}
                            </span>
                            {student.isDemoStudent && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[rgba(154,140,152,0.2)] text-[#22223B] border border-white/60">
                                Live
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#4A4E69] font-medium">{student.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Mastery Meter */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-black ${
                          student.overallMastery >= 70 ? 'text-[#047857]' :
                          student.overallMastery >= 50 ? 'text-[#B45309]' : 'text-[#BE123C]'
                        }`}>
                          {student.overallMastery}%
                        </span>
                        <div className="w-16 bg-[rgba(34,34,59,0.08)] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              student.overallMastery >= 70 ? 'bg-[#10B981]' :
                              student.overallMastery >= 50 ? 'bg-[#D97706]' : 'bg-[#E11D48]'
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
                          <span className="text-[#047857] font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> None
                          </span>
                        ) : (
                          activeGaps.map(gap => (
                            <span
                              key={gap.id}
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] border backdrop-blur-xs ${
                                gap.misconception_id === 'M1' ? 'bg-[rgba(225,29,72,0.12)] text-[#BE123C] border-[rgba(225,29,72,0.25)]' :
                                gap.misconception_id === 'M2' ? 'bg-[rgba(217,119,6,0.12)] text-[#B45309] border-[rgba(217,119,6,0.25)]' :
                                'bg-[rgba(154,140,152,0.22)] text-[#22223B] border-[rgba(154,140,152,0.35)]'
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
                          <span className="text-[#4A4E69] text-[11px]">-</span>
                        ) : (
                          resolvedGaps.map(gap => (
                            <span
                              key={gap.id}
                              className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-[rgba(16,185,129,0.12)] text-[#047857] border border-[rgba(16,185,129,0.25)]"
                            >
                              {gap.misconception_id} ✓
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Last Active */}
                    <td className="py-3.5 px-4 text-[#4A4E69] text-[11px] font-medium">
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
                        className="glass-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[#22223B] font-bold cursor-pointer"
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
