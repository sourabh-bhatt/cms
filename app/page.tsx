import Link from "next/link";
import { BookOpen, Map, ArrowRight, ShieldCheck, PenTool } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Blue Sky Operating System</h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">Select a workspace to begin. Manage course content or track state expansion.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Workspace 1: Course Creator */}
          <Link href="/course-creator" className="group relative bg-white rounded-3xl p-8 shadow-sm border border-gray-100 transition-all hover:shadow-xl hover:scale-[1.02] hover:border-purple-200 overflow-hidden">
            <div className="absolute top-0 right-0 p-3 bg-gray-50 rounded-bl-3xl">
              <ArrowRight className="w-6 h-6 text-gray-300 group-hover:text-purple-600 group-hover:-rotate-45 transition-all" />
            </div>

            <div className="h-16 w-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
              <PenTool className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-gray-900 mb-3">Course Studio</h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              Create, edit, and bundle 40-180 hour pre-licensing courses.
              Features drag-and-drop builder, AI verification, and Master ZIP export.
            </p>

            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-purple-600 transition-colors">
              <span>Builder</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span>AI Audits</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span>Export</span>
            </div>
          </Link>

          {/* Workspace 2: State Manager */}
          <Link href="/state-manager" className="group relative bg-white rounded-3xl p-8 shadow-sm border border-gray-100 transition-all hover:shadow-xl hover:scale-[1.02] hover:border-blue-200 overflow-hidden">
            <div className="absolute top-0 right-0 p-3 bg-gray-50 rounded-bl-3xl">
              <ArrowRight className="w-6 h-6 text-gray-300 group-hover:text-blue-600 group-hover:-rotate-45 transition-all" />
            </div>

            <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Map className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-gray-900 mb-3">Expansion Tower</h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              The "Control Tower" for state licensing. Manage requirements,
              upload raw compliance sources, and track approval status for 50 states.
            </p>

            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors">
              <span>Requirements</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span>CRM Log</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span>Sources</span>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm text-xs font-bold text-gray-400">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            System Operational • v2.4.0 (SaaS Ready)
          </div>
        </div>
      </div>
    </div>
  );
}
