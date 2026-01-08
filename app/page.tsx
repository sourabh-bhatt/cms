'use client';

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ArrowRight, ShieldCheck, PenTool, LogOut, History, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginPage } from "@/components/auth/LoginPage";
import { ActivityLogPanel } from "@/components/ActivityLogPanel";

export default function Home() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [showActivityLog, setShowActivityLog] = useState(false);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-purple-200/70">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* User Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Blue Sky OS</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Activity Log Button */}
            <button
              onClick={() => setShowActivityLog(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="View Activity Log"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Activity Log</span>
            </button>

            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center p-6" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="max-w-7xl w-full">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Welcome back, {user?.name}</h1>
            <p className="text-lg text-gray-500">Ready to build your next course? Your studio is ready.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Course Studio (Spans 2 columns) */}
            <div className="lg:col-span-2">
              <Link href="/course-creator" className="group relative bg-white rounded-[2rem] p-8 md:p-10 shadow-xl border border-gray-100 transition-all hover:shadow-2xl hover:scale-[1.01] hover:border-purple-200 overflow-hidden block h-full">
                <div className="absolute top-0 right-0 p-0 bg-gray-50 rounded-bl-3xl w-24 h-24 flex items-center justify-center">
                  <ArrowRight className="w-8 h-8 text-gray-300 group-hover:text-purple-600 group-hover:-rotate-45 transition-all duration-300" />
                </div>

                <div className="flex flex-col items-start gap-6 relative z-10">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="h-24 w-24 bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-600 rounded-3xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300">
                      <PenTool className="w-10 h-10" />
                    </div>

                    <div>
                      <h2 className="text-3xl font-black text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">Course Creation Studio</h2>
                      <p className="text-gray-500 leading-relaxed max-w-xl">
                        The all-in-one workspace for building state-approved real estate courses.
                        Features AI-powered outlines, structure verification, and instant master file exports.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <span className="px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider border border-purple-100">Drag & Drop Builder</span>
                    <span className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-100">Gemini AI Audit</span>
                    <span className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider border border-green-100">One-Click Export</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Right Column: User Stats (Spans 1 column, stacked vertically) */}
            {user?.stats && (
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Courses</span>
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-4xl font-black text-gray-900">{user.stats.coursesCreated}</p>
                  <p className="text-sm text-gray-500 mt-1">Total Created</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Outlines</span>
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <PenTool className="w-4 h-4 text-indigo-600" />
                    </div>
                  </div>
                  <p className="text-4xl font-black text-gray-900">{user.stats.outlinesGenerated}</p>
                  <p className="text-sm text-gray-500 mt-1">Generated with AI</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Edits</span>
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <PenTool className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-4xl font-black text-gray-900">{user.stats.topicsEdited}</p>
                  <p className="text-sm text-gray-500 mt-1">Manual Content Edits</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm text-xs font-bold text-gray-400">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Logged in as {user?.email} • {user?.role}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log Panel */}
      <ActivityLogPanel
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
        currentUserId={user?.id}
      />
    </div>
  );
}
