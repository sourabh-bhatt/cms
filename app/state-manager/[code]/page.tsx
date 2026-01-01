import { getStateDetails, updateStateStatus } from '@/app/actions/state-actions';
import { RequirementEditor } from '@/components/state-manager/RequirementEditor';
import { CrmTimeline } from '@/components/state-manager/CrmTimeline';
import { RawSourceManager } from '@/components/state-manager/RawSourceManager';
import { ChevronLeft, ExternalLink, Activity } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: { code: string };
}

export default async function StateDetailPage({ params }: PageProps) {
    const state = await getStateDetails(params.code);

    if (!state) {
        redirect('/state-manager');
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/state-manager" className="p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black text-gray-900 tracking-tight">{state.name}</h1>
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-gray-200">
                                    {state.code}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href={`/course-creator?state=${state.code}`} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-purple-600 transition-colors">
                            Open Builder <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: Requirements & Sources (2/3 width) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Status Card (Could be its own component) */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">Current Status</h2>
                                <div className="text-2xl font-black text-gray-900">{state.status.replace('_', ' ')}</div>
                            </div>
                            {/* Simple Status Toggles for Demo */}
                            <div className="flex gap-1">
                                {['RESEARCHING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED'].map(s => (
                                    <form key={s} action={async () => {
                                        'use server';
                                        await updateStateStatus(params.code, s);
                                    }}>
                                        <button className={`w-3 h-3 rounded-full border ${state.status === s ? 'bg-purple-500 border-purple-500' : 'bg-gray-100 border-gray-200 hover:border-purple-300'}`} title={s}></button>
                                    </form>
                                ))}
                            </div>
                        </div>

                        <RequirementEditor
                            stateCode={state.code}
                            initialTopics={state.mandatoryTopics || []}
                            initialTotalHours={state.totalHours}
                        />

                        <RawSourceManager
                            stateCode={state.code}
                            initialFiles={state.rawSources || []}
                        />
                    </div>

                    {/* RIGHT COLUMN: CRM (1/3 width) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 h-[calc(100vh-8rem)]">
                            <CrmTimeline stateCode={state.code} initialLogs={state.activityLog || []} />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
