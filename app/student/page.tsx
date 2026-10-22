'use client';

import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { GraduationCap, ArrowRight, Sparkles, MessageSquare, BookOpen, Clock } from 'lucide-react';

export default function StudentPagePlaceholder() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-6 shadow-sm">
          <GraduationCap className="w-8 h-8" />
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200 mb-3">
          Student Domain
        </span>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          Student AI Tutor & Dashboard
        </h1>

        <p className="mt-4 text-base text-slate-600 max-w-xl">
          This area is designated for the student experience (Socratic AI chat, Knowledge Map, Notes, Voice, and Revisit Queue).
        </p>

        {/* Status card */}
        <div className="mt-8 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs max-w-md w-full text-left space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Assigned Workspace Separation
          </h2>
          <div className="flex items-center gap-2.5 text-xs text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span><strong>Teacher Dashboard:</strong> Fully active & seeded at <code>/teacher</code></span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-700">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span><strong>Student Dashboard:</strong> Managed by your teammate</span>
          </div>
          <div className="pt-3 border-t border-slate-100">
            <Link
              href="/teacher"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              <span>View Teacher Command Center</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
