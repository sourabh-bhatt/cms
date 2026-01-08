'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Sparkles, FileText, Clock, Layers, BookOpen, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OutlineSettings {
    targetHours: number;
    maxSections: number;
    topicsPerSection: number;
    wordsPerTopic: number;
    maxFilesToRead: number;
    includeRawSources: boolean;
}

interface OutlineSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (settings: OutlineSettings) => void;
    availableFilesCount: number;
    currentTargetHours: number;
    isLoading?: boolean;
}

export function OutlineSettingsModal({
    isOpen,
    onClose,
    onGenerate,
    availableFilesCount,
    currentTargetHours,
    isLoading = false
}: OutlineSettingsModalProps) {
    const [settings, setSettings] = useState<OutlineSettings>({
        targetHours: currentTargetHours,
        maxSections: 8,
        topicsPerSection: 5,
        wordsPerTopic: 500,
        maxFilesToRead: 50,
        includeRawSources: false
    });

    // Sync with parent when opened
    useEffect(() => {
        if (isOpen) {
            setSettings(s => ({ ...s, targetHours: currentTargetHours }));
        }
    }, [isOpen, currentTargetHours]);

    // Calculate estimates
    const estimatedTopics = settings.maxSections * settings.topicsPerSection;
    const estimatedWords = estimatedTopics * settings.wordsPerTopic;
    const estimatedReadingMinutes = Math.round(estimatedWords / 200); // 200 wpm average
    const wordsPerHour = estimatedWords / settings.targetHours;

    // Budget warning
    const budgetWarning = settings.maxFilesToRead > availableFilesCount;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5" />
                        <div>
                            <h2 className="font-bold text-lg">Outline Generation Settings</h2>
                            <p className="text-purple-200 text-xs">Configure before generating with Gemini</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Target Hours */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                            <Clock className="w-4 h-4 text-purple-600" />
                            Target Hours
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min={10}
                                max={100}
                                step={5}
                                value={settings.targetHours}
                                onChange={(e) => setSettings(s => ({ ...s, targetHours: Number(e.target.value) }))}
                                className="flex-1 accent-purple-600"
                            />
                            <div className="w-16 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-center font-bold text-purple-700">
                                {settings.targetHours}h
                            </div>
                        </div>
                    </div>

                    {/* Sections & Topics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <Layers className="w-4 h-4 text-blue-600" />
                                Max Sections
                            </label>
                            <input
                                type="range"
                                min={3}
                                max={15}
                                value={settings.maxSections}
                                onChange={(e) => setSettings(s => ({ ...s, maxSections: Number(e.target.value) }))}
                                className="w-full accent-blue-600"
                            />
                            <div className="text-center font-bold text-blue-700">{settings.maxSections}</div>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <FileText className="w-4 h-4 text-green-600" />
                                Topics per Section
                            </label>
                            <input
                                type="range"
                                min={2}
                                max={10}
                                value={settings.topicsPerSection}
                                onChange={(e) => setSettings(s => ({ ...s, topicsPerSection: Number(e.target.value) }))}
                                className="w-full accent-green-600"
                            />
                            <div className="text-center font-bold text-green-700">{settings.topicsPerSection}</div>
                        </div>
                    </div>

                    {/* Words per Topic */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                            <BookOpen className="w-4 h-4 text-orange-600" />
                            Target Words per Topic
                        </label>
                        <div className="flex gap-2">
                            {[300, 500, 800, 1000].map(words => (
                                <button
                                    key={words}
                                    onClick={() => setSettings(s => ({ ...s, wordsPerTopic: words }))}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg font-semibold text-sm transition-all",
                                        settings.wordsPerTopic === words
                                            ? "bg-orange-500 text-white shadow-md"
                                            : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                                    )}
                                >
                                    {words}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Budget Control */}
                    <div className="space-y-2">
                        <label className="flex items-center justify-between text-sm font-bold text-gray-700">
                            <span className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-600" />
                                API Budget: Max Files to Read
                            </span>
                            <span className="text-xs text-gray-400">Available: {availableFilesCount}</span>
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min={10}
                                max={Math.min(100, availableFilesCount)}
                                value={Math.min(settings.maxFilesToRead, availableFilesCount)}
                                onChange={(e) => setSettings(s => ({ ...s, maxFilesToRead: Number(e.target.value) }))}
                                className="flex-1 accent-purple-600"
                            />
                            <div className={cn(
                                "w-16 px-3 py-1.5 rounded-lg text-center font-bold border",
                                budgetWarning
                                    ? "bg-red-50 border-red-200 text-red-700"
                                    : "bg-purple-50 border-purple-200 text-purple-700"
                            )}>
                                {settings.maxFilesToRead}
                            </div>
                        </div>
                    </div>

                    {/* Estimates Card */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                            Estimated Output
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold text-gray-800">{estimatedTopics}</div>
                                <div className="text-xs text-gray-500">Total Topics</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-800">{(estimatedWords / 1000).toFixed(1)}k</div>
                                <div className="text-xs text-gray-500">Est. Words</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-800">{Math.round(wordsPerHour)}</div>
                                <div className="text-xs text-gray-500">Words/Hour</div>
                            </div>
                        </div>

                        {/* Hours validation warning */}
                        {wordsPerHour < 400 && (
                            <div className="mt-3 flex items-center gap-2 text-amber-600 text-xs bg-amber-50 px-3 py-2 rounded-lg">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>Low word density. Consider adding more topics or increasing words per topic.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onGenerate(settings)}
                        disabled={isLoading}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white transition-all",
                            "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700",
                            "shadow-lg hover:shadow-xl active:scale-95",
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Sparkles className="w-4 h-4" />
                        {isLoading ? 'Generating...' : 'Generate Outline'}
                    </button>
                </div>
            </div>
        </div>
    );
}
