'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Map, BookOpen, User, ArrowRight, Loader2 } from 'lucide-react';
import { createState } from '@/app/actions/state-actions'; // We will ensure this path is correct
import { cn } from '@/lib/utils';

interface StateGridProps {
    initialStates: any[];
}

export function StateGrid({ initialStates }: StateGridProps) {
    const router = useRouter();
    const [states, setStates] = useState(initialStates);
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New State Form
    const [newState, setNewState] = useState({ name: '', code: '', totalHours: 40 });

    const handleCreate = async () => {
        if (!newState.name || !newState.code) return;
        setIsSubmitting(true);
        const res = await createState(newState);
        if (res.success) {
            setStates([...states, res.state]);
            setIsCreating(false);
            setNewState({ name: '', code: '', totalHours: 40 });
        } else {
            alert("Error creating state: " + res.error);
        }
        setIsSubmitting(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
            case 'SUBMITTED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'IN_PROGRESS': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'RESEARCHING': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">State Expansion Control Tower</h1>
                    <p className="text-gray-500 mt-2">Manage licensing requirements, raw sources, and approval status across all 50 states.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                    <Plus className="w-4 h-4" /> Add State
                </button>
            </div>

            {/* Creation Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-black text-gray-900 mb-4">Add New State</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">State Name</label>
                                <input
                                    autoFocus
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 font-bold text-gray-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                    placeholder="e.g. Nebraska"
                                    value={newState.name}
                                    onChange={e => setNewState({ ...newState, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">State Code</label>
                                    <input
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 font-bold text-gray-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none uppercase"
                                        placeholder="NB"
                                        maxLength={2}
                                        value={newState.code}
                                        onChange={e => setNewState({ ...newState, code: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Req. Hours</label>
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 font-bold text-gray-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                        placeholder="60"
                                        value={newState.totalHours}
                                        onChange={e => setNewState({ ...newState, totalHours: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!newState.name || !newState.code || isSubmitting}
                                    className="flex-1 px-4 py-2 bg-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create Target
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {states.map((state) => (
                    <div
                        key={state._id}
                        onClick={() => router.push(`/state-manager/${state.code}`)}
                        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-100 transition-all cursor-pointer group"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-gray-900 text-white rounded-xl font-black text-lg shadow-lg">
                                {state.code}
                            </div>
                            <span className={cn(
                                "text-[10px] font-black uppercase px-2 py-1 rounded-full border",
                                getStatusColor(state.status)
                            )}>
                                {state.status.replace('_', ' ')}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors">{state.name}</h3>
                        <p className="text-sm text-gray-500 mb-6 flex items-center gap-1.5">
                            <Map className="w-3.5 h-3.5" />
                            {state.totalHours} Hour Requirement
                        </p>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <span className="flex items-center gap-1.5 font-bold"><BookOpen className="w-3.5 h-3.5 text-gray-400" /> Mandatory Topics</span>
                                <span className="font-mono font-bold bg-white px-1.5 rounded border">{state.mandatoryTopics?.length || 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <span className="flex items-center gap-1.5 font-bold"><User className="w-3.5 h-3.5 text-gray-400" /> Contacts & Logs</span>
                                <span className="font-mono font-bold bg-white px-1.5 rounded border">{(state.contacts?.length || 0) + (state.activityLog?.length || 0)}</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-purple-600 font-bold text-xs uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                            Manage State <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                    </div>
                ))}

                {/* Empty State / Call to Action */}
                {states.length === 0 && (
                    <div
                        onClick={() => setIsCreating(true)}
                        className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-gray-400 hover:border-purple-200 hover:bg-purple-50/10 hover:text-purple-500 transition-all cursor-pointer min-h-[280px]"
                    >
                        <Plus className="w-12 h-12 mb-4 opacity-50" />
                        <h3 className="font-bold text-lg">Initialize First State</h3>
                        <p className="text-xs mt-2 max-w-[200px]">Start your expansion journey by creating a target.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
