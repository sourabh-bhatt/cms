'use client';

import React, { useState, useEffect } from 'react';
import { History, X, Sparkles, User, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeminiLogEntry } from '@/lib/gemini/types';

interface GeminiLogViewerProps {
    logs: GeminiLogEntry[];
    isOpen: boolean;
    onClose: () => void;
}

export function GeminiLogViewer({ logs, isOpen, onClose }: GeminiLogViewerProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (!isOpen) return null;

    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'create_outline': return 'Create Outline';
            case 'update_outline': return 'Update Outline';
            case 'create_topic': return 'Create Topic';
            case 'update_topic': return 'Update Topic';
            default: return action;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <History className="w-5 h-5" />
                        <div>
                            <h2 className="font-bold text-lg">Gemini Activity Log</h2>
                            <p className="text-purple-200 text-xs">{logs.length} interactions recorded</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Log List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {logs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No Gemini interactions yet</p>
                            <p className="text-sm">Use the Outline or Topic buttons to get started</p>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div
                                key={log.id}
                                className={cn(
                                    "border rounded-xl overflow-hidden transition-all",
                                    log.type === 'user_action'
                                        ? "border-blue-200 bg-blue-50/50"
                                        : "border-purple-200 bg-purple-50/50"
                                )}
                            >
                                {/* Log Header */}
                                <button
                                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                            log.type === 'user_action' ? "bg-blue-100" : "bg-purple-100"
                                        )}>
                                            {log.type === 'user_action' ? (
                                                <User className="w-4 h-4 text-blue-600" />
                                            ) : (
                                                <Sparkles className="w-4 h-4 text-purple-600" />
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-sm text-gray-800">
                                                {getActionLabel(log.action)}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(log.timestamp)}
                                                {log.geminiResponse && (
                                                    <span className="text-purple-600">
                                                        • {log.geminiResponse.processingTimeMs}ms
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {expandedId === log.id ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                </button>

                                {/* Expanded Details */}
                                {expandedId === log.id && (
                                    <div className="px-4 pb-4 space-y-3 border-t border-gray-200/50">
                                        {log.userInput && (
                                            <div className="mt-3">
                                                <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">User Input</div>
                                                <div className="bg-white rounded-lg p-3 text-sm">
                                                    {log.userInput.prompt || 'No custom prompt'}
                                                    {log.userInput.context?.filenames && (
                                                        <div className="mt-2 text-xs text-gray-500">
                                                            Context: {log.userInput.context.filenames.length} files
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {log.geminiResponse && (
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Gemini Response</div>
                                                <div className="bg-white rounded-lg p-3 text-sm">
                                                    <div className="text-xs text-gray-500 mb-2">
                                                        Model: {log.geminiResponse.model}
                                                        {log.geminiResponse.tokensUsed && ` • ${log.geminiResponse.tokensUsed} tokens`}
                                                    </div>
                                                    <pre className="text-xs overflow-x-auto max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
                                                        {JSON.stringify(log.geminiResponse.output, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}

                                        {log.error && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                                                Error: {log.error}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
