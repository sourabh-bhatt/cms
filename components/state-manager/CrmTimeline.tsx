'use client';

import React, { useState } from 'react';
import { Send, Phone, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { addStateActivity } from '@/app/actions/state-actions';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CrmTimelineProps {
    stateCode: string;
    initialLogs: any[];
}

export function CrmTimeline({ stateCode, initialLogs }: CrmTimelineProps) {
    const [logs, setLogs] = useState(initialLogs);
    const [note, setNote] = useState('');
    const [type, setType] = useState<any>('note');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!note.trim()) return;
        setIsSubmitting(true);
        const newLog = {
            type,
            summary: note,
            user: 'Sourabh', // Hardcoded for now
            date: new Date()
        };

        const res = await addStateActivity(stateCode, newLog);
        if (res.success) {
            setLogs([newLog, ...logs]); // Optimistic update
            setNote('');
        }
        setIsSubmitting(false);
    };

    const getIcon = (t: string) => {
        switch (t) {
            case 'email': return <Mail className="w-4 h-4" />;
            case 'call': return <Phone className="w-4 h-4" />;
            case 'submission': return <CheckCircle2 className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-black text-gray-900">Compliance Log</h3>
            </div>

            <div className="p-4 border-b border-gray-100 bg-white">
                <div className="flex gap-2 mb-3">
                    {['note', 'email', 'call', 'submission'].map(t => (
                        <button
                            key={t}
                            onClick={() => setType(t)}
                            className={cn(
                                "px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all flex items-center gap-1.5",
                                type === t ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                            )}
                        >
                            {getIcon(t)} {t}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Log correspondence or notes..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 resize-none h-24"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={!note.trim() || isSubmitting}
                        className="absolute bottom-3 right-3 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:bg-gray-400"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {logs.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-8 italic">No activity recorded yet.</div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-4 group">
                        <div className="flex flex-col items-center">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2",
                                log.type === 'submission' ? "bg-green-100 text-green-600 border-green-200" :
                                    log.type === 'email' ? "bg-blue-100 text-blue-600 border-blue-200" :
                                        log.type === 'call' ? "bg-amber-100 text-amber-600 border-amber-200" :
                                            "bg-gray-100 text-gray-500 border-gray-200"
                            )}>
                                {getIcon(log.type)}
                            </div>
                            {i !== logs.length - 1 && <div className="w-px h-full bg-gray-100 my-2 group-hover:bg-gray-200 transition-colors"></div>}
                        </div>
                        <div className="pb-2">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-xs font-black text-gray-900 uppercase">{log.user}</span>
                                <span className="text-[10px] font-bold text-gray-400">
                                    {log.date ? formatDistanceToNow(new Date(log.date), { addSuffix: true }) : 'Just now'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg rounded-tl-none border border-gray-100">
                                {log.summary}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
