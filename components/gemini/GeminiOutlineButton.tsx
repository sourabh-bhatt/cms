'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown, FileText, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeminiContext, OutlineOutput, OutlineSection } from '@/lib/gemini/types';

interface GeminiOutlineButtonProps {
    context: GeminiContext;
    onOutlineGenerated: (outline: OutlineSection[]) => void;
    onError?: (error: string) => void;
    disabled?: boolean;
}

export function GeminiOutlineButton({
    context,
    onOutlineGenerated,
    onError,
    disabled = false
}: GeminiOutlineButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [currentAction, setCurrentAction] = useState<'create' | 'update' | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setShowFeedback(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = async (action: 'create' | 'update') => {
        if (action === 'update' && !showFeedback) {
            setCurrentAction('update');
            setShowFeedback(true);
            return;
        }

        setIsLoading(true);
        setCurrentAction(action);

        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: action === 'create' ? 'create_outline' : 'update_outline',
                    context: {
                        ...context,
                        userFeedback: action === 'update' ? feedback : undefined
                    }
                })
            });

            const result = await response.json();

            if (result.success && result.data?.outline?.sections) {
                onOutlineGenerated(result.data.outline.sections);
                setIsOpen(false);
                setShowFeedback(false);
                setFeedback('');
            } else {
                onError?.(result.error || 'Failed to generate outline');
            }
        } catch (error) {
            onError?.(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setIsLoading(false);
            setCurrentAction(null);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled || isLoading}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                    "bg-gradient-to-r from-violet-500 to-purple-600 text-white",
                    "hover:from-violet-600 hover:to-purple-700 hover:shadow-lg",
                    "border border-purple-400/30",
                    "active:scale-95",
                    (disabled || isLoading) && "opacity-50 cursor-not-allowed"
                )}
            >
                {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Outline</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-purple-100">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-bold text-purple-800">Gemini Outline Actions</span>
                        </div>
                        <p className="text-[10px] text-purple-600 mt-1">
                            Context: {context.filenames.length} topics • {context.stateCode} • {context.targetHours}hrs
                        </p>
                    </div>

                    <div className="p-2">
                        <button
                            onClick={() => handleAction('create')}
                            disabled={isLoading}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                                "hover:bg-purple-50 group",
                                isLoading && currentAction === 'create' && "bg-purple-50"
                            )}
                        >
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                {isLoading && currentAction === 'create' ? (
                                    <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                                ) : (
                                    <FileText className="w-4 h-4 text-purple-600" />
                                )}
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-gray-800">Create Outline</div>
                                <div className="text-[10px] text-gray-500">Generate new course structure from National Content</div>
                            </div>
                        </button>

                        <div className="h-px bg-gray-100 my-1" />

                        <button
                            onClick={() => handleAction('update')}
                            disabled={isLoading || !context.existingOutline?.length}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                                "hover:bg-blue-50 group",
                                (!context.existingOutline?.length) && "opacity-50 cursor-not-allowed",
                                isLoading && currentAction === 'update' && "bg-blue-50"
                            )}
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                {isLoading && currentAction === 'update' ? (
                                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4 text-blue-600" />
                                )}
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-gray-800">Update Outline</div>
                                <div className="text-[10px] text-gray-500">
                                    {context.existingOutline?.length
                                        ? 'Refine with custom feedback'
                                        : 'Create outline first'}
                                </div>
                            </div>
                        </button>
                    </div>

                    {showFeedback && (
                        <div className="p-3 border-t border-gray-100 bg-gray-50">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                                Your Feedback / Instructions
                            </label>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="e.g., Add more topics on financing, reduce contract law section..."
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                rows={3}
                            />
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => {
                                        setShowFeedback(false);
                                        setFeedback('');
                                    }}
                                    className="flex-1 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleAction('update')}
                                    disabled={isLoading}
                                    className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-1"
                                >
                                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    Apply
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
