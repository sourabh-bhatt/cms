'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown, PenLine, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeminiContext, TopicContent } from '@/lib/gemini/types';

interface GeminiTopicButtonProps {
    topicName: string;
    existingContent?: string;
    stateCode: string;
    targetHours: number;
    onTopicGenerated: (topic: TopicContent) => void;
    onError?: (error: string) => void;
    disabled?: boolean;
    size?: 'sm' | 'md';
}

export function GeminiTopicButton({
    topicName,
    existingContent,
    stateCode,
    targetHours,
    onTopicGenerated,
    onError,
    disabled = false,
    size = 'sm'
}: GeminiTopicButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [currentAction, setCurrentAction] = useState<'create' | 'update' | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

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
            const context: GeminiContext = {
                filenames: [topicName],
                stateCode,
                targetHours,
                existingTopic: existingContent ? {
                    title: topicName,
                    content: existingContent,
                    keyPoints: [],
                    estimatedReadTime: 0
                } : undefined,
                userFeedback: action === 'update' ? feedback : undefined
            };

            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: action === 'create' ? 'create_topic' : 'update_topic',
                    context
                })
            });

            const result = await response.json();

            if (result.success && result.data?.topic) {
                onTopicGenerated(result.data.topic);
                setIsOpen(false);
                setShowFeedback(false);
                setFeedback('');
            } else {
                onError?.(result.error || 'Failed to generate topic');
            }
        } catch (error) {
            onError?.(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setIsLoading(false);
            setCurrentAction(null);
        }
    };

    const hasExisting = Boolean(existingContent && existingContent.trim().length > 0);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) setIsOpen(!isOpen);
                }}
                disabled={disabled || isLoading}
                className={cn(
                    "flex items-center gap-1 rounded transition-all",
                    size === 'sm'
                        ? "px-1.5 py-0.5 text-[9px]"
                        : "px-2 py-1 text-[10px]",
                    "bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold",
                    "hover:from-amber-500 hover:to-orange-600",
                    "active:scale-95",
                    (disabled || isLoading) && "opacity-50 cursor-not-allowed"
                )}
                title="Gemini Topic Actions"
            >
                {isLoading ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                    <Sparkles className="w-2.5 h-2.5" />
                )}
                <ChevronDown className={cn("w-2 h-2 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div
                    className="absolute top-full right-0 mt-1 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-orange-100">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                            <span className="text-[10px] font-bold text-orange-800">Topic AI Actions</span>
                        </div>
                        <p className="text-[9px] text-orange-600 mt-0.5 truncate" title={topicName}>
                            {topicName}
                        </p>
                    </div>

                    <div className="p-1.5">
                        <button
                            onClick={() => handleAction('create')}
                            disabled={isLoading}
                            className={cn(
                                "w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all text-left",
                                "hover:bg-orange-50 group",
                                isLoading && currentAction === 'create' && "bg-orange-50"
                            )}
                        >
                            <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors shrink-0">
                                {isLoading && currentAction === 'create' ? (
                                    <Loader2 className="w-3 h-3 text-orange-600 animate-spin" />
                                ) : (
                                    <PenLine className="w-3 h-3 text-orange-600" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-semibold text-gray-800">Create Topic</div>
                                <div className="text-[9px] text-gray-500">Generate content from scratch</div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleAction('update')}
                            disabled={isLoading || !hasExisting}
                            className={cn(
                                "w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all text-left",
                                "hover:bg-blue-50 group",
                                !hasExisting && "opacity-50 cursor-not-allowed",
                                isLoading && currentAction === 'update' && "bg-blue-50"
                            )}
                        >
                            <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors shrink-0">
                                {isLoading && currentAction === 'update' ? (
                                    <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-3 h-3 text-blue-600" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-semibold text-gray-800">Update Topic</div>
                                <div className="text-[9px] text-gray-500">
                                    {hasExisting ? 'Refine with feedback' : 'Add content first'}
                                </div>
                            </div>
                        </button>
                    </div>

                    {showFeedback && (
                        <div className="p-2 border-t border-gray-100 bg-gray-50">
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="How should the content be improved?"
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                                rows={2}
                            />
                            <div className="flex gap-1.5 mt-1.5">
                                <button
                                    onClick={() => {
                                        setShowFeedback(false);
                                        setFeedback('');
                                    }}
                                    className="flex-1 px-2 py-1 text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleAction('update')}
                                    disabled={isLoading}
                                    className="flex-1 px-2 py-1 text-[10px] font-semibold text-white bg-orange-500 rounded hover:bg-orange-600 flex items-center justify-center gap-1"
                                >
                                    {isLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
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
