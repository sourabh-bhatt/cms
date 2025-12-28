'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, FileText, ListChecks, Eye, EyeOff, Sparkles, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { CourseItem, QuizQuestion } from './SortableItem';
import { generateAIContent, generateAIQuiz } from '@/app/actions';

interface TopicEditorModalProps {
    item: CourseItem;
    onUpdate: (id: string, updates: Partial<CourseItem>) => void;
    onClose: () => void;
}

export function TopicEditorModal({ item, onUpdate, onClose }: TopicEditorModalProps) {
    const [activeTab, setActiveTab] = useState<'content' | 'quizzes'>('content');
    const [localContent, setLocalContent] = useState(item.content || '');
    const [localQuizzes, setLocalQuizzes] = useState<QuizQuestion[]>(item.quizzes || []);
    const [isSaving, setIsSaving] = useState(false);
    const [isAIGenerating, setIsAIGenerating] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Debounced Autosave
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localContent !== item.content || JSON.stringify(localQuizzes) !== JSON.stringify(item.quizzes)) {
                handleSave();
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [localContent, localQuizzes]);

    const handleSave = useCallback(() => {
        setIsSaving(true);
        onUpdate(item.id, {
            content: localContent,
            quizzes: localQuizzes
        });
        setLastSaved(new Date());
        setTimeout(() => setIsSaving(false), 500);
    }, [item.id, localContent, localQuizzes, onUpdate]);

    const addQuizQuestion = () => {
        const newQuestion: QuizQuestion = {
            id: Math.random().toString(36).substr(2, 9),
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
            explanation: ''
        };
        setLocalQuizzes([...localQuizzes, newQuestion]);
    };

    const updateQuizQuestion = (id: string, updates: Partial<QuizQuestion>) => {
        setLocalQuizzes(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
    };

    const removeQuizQuestion = (id: string) => {
        setLocalQuizzes(prev => prev.filter(q => q.id !== id));
    };

    const handleAIElaborate = async () => {
        if (!confirm("Are you sure? This will replace your current content with AI-generated elaboration.")) return;

        setIsAIGenerating(true);
        const res = await generateAIContent(item.name, "Professional real estate education, 1000 words, highly detailed");
        if (res.success && res.content) {
            setLocalContent(res.content);
        } else {
            alert(res.error || "AI Generation failed");
        }
        setIsAIGenerating(false);
    };

    const handleAIAutoQuiz = async () => {
        if (!localContent) {
            alert("Please add content first so AI can generate questions from it.");
            return;
        }

        setIsAIGenerating(true);
        const res = await generateAIQuiz(localContent);
        if (res.success && res.questions) {
            setLocalQuizzes(res.questions);
            alert("5 Questions generated successfully!");
        } else {
            alert(res.error || "AI Quiz Generation failed");
        }
        setIsAIGenerating(false);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
            <div className="bg-white w-full h-full max-w-7xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900 tracking-tight">{item.name}</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Writing Studio</span>
                                <div className="h-1 w-1 rounded-full bg-gray-300"></div>
                                {isSaving ? (
                                    <span className="text-[10px] font-bold text-purple-600 animate-pulse uppercase">Autosaving...</span>
                                ) : (
                                    <span className="text-[10px] font-bold text-green-600 uppercase">
                                        {lastSaved ? `Synced at ${lastSaved.toLocaleTimeString()}` : 'Cloud Ready'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('content')}
                                className={cn(
                                    "px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                                    activeTab === 'content' ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <FileText className="w-3.5 h-3.5" /> Content
                            </button>
                            <button
                                onClick={() => setActiveTab('quizzes')}
                                className={cn(
                                    "px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                                    activeTab === 'quizzes' ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <ListChecks className="w-3.5 h-3.5" /> Quizzes {localQuizzes.length > 0 && `(${localQuizzes.length})`}
                            </button>
                        </div>
                        <div className="w-px h-6 bg-gray-200 mx-1"></div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Main Body */}
                <div className="flex-1 overflow-hidden">
                    {activeTab === 'content' ? (
                        <div className="flex h-full divide-x divide-gray-100">
                            {/* Editor Panel */}
                            <div className="flex-1 flex flex-col bg-white">
                                <div className="p-3 border-b border-gray-50 bg-white/50 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Source Markdown</span>
                                    <button
                                        onClick={handleAIElaborate}
                                        disabled={isAIGenerating}
                                        className={cn(
                                            "text-[10px] font-bold text-purple-600 flex items-center gap-1.5 hover:bg-purple-50 px-2 py-1 rounded-md transition-all",
                                            isAIGenerating && "animate-pulse opacity-50"
                                        )}
                                    >
                                        <Sparkles className="w-3 h-3" /> {isAIGenerating ? 'Generating...' : 'AI Elaborate'}
                                    </button>
                                </div>
                                <textarea
                                    value={localContent}
                                    onChange={(e) => setLocalContent(e.target.value)}
                                    placeholder="Start writing your course content here..."
                                    className="flex-1 p-8 text-lg text-gray-900 leading-relaxed font-serif focus:outline-none resize-none placeholder:text-gray-300"
                                />
                            </div>

                            {/* Preview Panel */}
                            <div className="flex-1 flex flex-col bg-gray-50/30">
                                <div className="p-3 border-b border-gray-50 bg-white/50 flex items-center">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Preview</span>
                                </div>
                                <div className="flex-1 p-12 overflow-y-auto">
                                    <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-gray-900 prose-p:leading-relaxed prose-li:text-gray-900 prose-strong:text-gray-900 text-gray-900">
                                        <ReactMarkdown>{localContent || '_No content yet. Start writing on the left to see the magic happen._'}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-gray-50/50 overflow-y-auto p-8 flex flex-col items-center">
                            <div className="w-full max-w-3xl flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Topic Quizzes</h3>
                                        <p className="text-sm text-gray-500">Add questions to verify student comprehension.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAIAutoQuiz}
                                            disabled={isAIGenerating}
                                            className={cn(
                                                "px-4 py-2 bg-purple-50 text-purple-700 font-bold text-sm rounded-xl border border-purple-100 hover:bg-purple-100 transition-all flex items-center gap-2",
                                                isAIGenerating && "animate-pulse opacity-50"
                                            )}
                                        >
                                            <Sparkles className="w-4 h-4" /> {isAIGenerating ? 'AI Working...' : 'AI Auto-Quiz'}
                                        </button>
                                        <button
                                            onClick={addQuizQuestion}
                                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Add Question
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6 pb-20">
                                    {localQuizzes.length === 0 ? (
                                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center text-center">
                                            <div className="p-4 bg-gray-50 rounded-full mb-4">
                                                <ListChecks className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <h4 className="text-gray-900 font-bold">No Questions Yet</h4>
                                            <p className="text-gray-500 text-sm mt-1 max-w-xs">Use the button above to add your first assessment question for this topic.</p>
                                        </div>
                                    ) : (
                                        localQuizzes.map((q, qIndex) => (
                                            <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 group transition-all hover:border-purple-200 hover:shadow-md">
                                                <div className="flex items-start justify-between mb-4">
                                                    <span className="h-8 w-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-black text-sm">{qIndex + 1}</span>
                                                    <button
                                                        onClick={() => removeQuizQuestion(q.id)}
                                                        className="p-2 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Question</label>
                                                        <input
                                                            type="text"
                                                            value={q.question}
                                                            onChange={(e) => updateQuizQuestion(q.id, { question: e.target.value })}
                                                            placeholder="What is the primary requirement for...?"
                                                            className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-purple-500/10 focus:border-purple-200 rounded-xl px-4 py-3 font-bold text-gray-900 transition-all outline-none"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {q.options.map((opt, oIndex) => (
                                                            <div key={oIndex} className="relative">
                                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Option {String.fromCharCode(65 + oIndex)}</label>
                                                                <div className="relative">
                                                                    <input
                                                                        type="text"
                                                                        value={opt}
                                                                        onChange={(e) => {
                                                                            const newOptions = [...q.options];
                                                                            newOptions[oIndex] = e.target.value;
                                                                            updateQuizQuestion(q.id, { options: newOptions });
                                                                        }}
                                                                        className={cn(
                                                                            "w-full bg-gray-50 border-2 rounded-xl px-4 py-3 font-medium text-gray-700 transition-all outline-none pl-12",
                                                                            q.correctAnswer === oIndex ? "border-green-500 bg-green-50/30" : "border-transparent focus:bg-white focus:border-purple-200"
                                                                        )}
                                                                        placeholder={`Enter option ${String.fromCharCode(65 + oIndex)}...`}
                                                                    />
                                                                    <button
                                                                        onClick={() => updateQuizQuestion(q.id, { correctAnswer: oIndex })}
                                                                        className={cn(
                                                                            "absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                                            q.correctAnswer === oIndex ? "bg-green-500 border-green-500 text-white" : "border-gray-200 hover:border-purple-300"
                                                                        )}
                                                                    >
                                                                        {q.correctAnswer === oIndex && <CheckCircle2 className="w-4 h-4" />}
                                                                        {q.correctAnswer !== oIndex && <span className="text-[10px] font-black text-gray-400">{String.fromCharCode(65 + oIndex)}</span>}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Explanation</label>
                                                        <textarea
                                                            value={q.explanation}
                                                            onChange={(e) => updateQuizQuestion(q.id, { explanation: e.target.value })}
                                                            placeholder="Explain why this is the correct answer..."
                                                            className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-purple-500/10 focus:border-purple-200 rounded-xl px-4 py-3 text-sm text-gray-600 transition-all outline-none resize-none h-20"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
