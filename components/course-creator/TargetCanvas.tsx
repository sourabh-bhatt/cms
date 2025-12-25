'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem, CourseItem } from './SortableItem';
import { cn } from '@/lib/utils';
import { Plus, BookOpen, Download, Trash2, Clock, CheckCircle } from 'lucide-react';

interface CanvasProps {
    items: CourseItem[];
    onRemoveItem: (id: string) => void;
    onClear: () => void;
    onSave: () => void;
    onAddGroup: () => void;
    onSelectItem?: (item: CourseItem) => void;
    onUpdateItem?: (id: string, updates: Partial<CourseItem>) => void;
    targetHours?: number; // Prop passed from parent
    onNewCourse?: () => void;
    onAddItemToGroup?: (groupId: string) => void;
}

export function TargetCanvas({ items, onRemoveItem, onClear, onSave, onAddGroup, onSelectItem, onUpdateItem, targetHours = 40, onNewCourse, onAddItemToGroup }: CanvasProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: 'target-canvas',
    });

    // Calculate total hours
    const currentHours = items.reduce((acc, item) => {
        const itemHours = item.hours || 0;
        const childrenHours = item.children?.reduce((cAcc, child) => cAcc + (child.hours || 0), 0) || 0;
        return acc + itemHours + childrenHours;
    }, 0);

    const progressPercent = Math.min((currentHours / targetHours) * 100, 100);

    return (
        <div className="flex-1 h-[calc(100vh-4rem)] bg-gray-100/80 flex flex-col font-sans">
            {/* Professional Toolbar / Header */}
            <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-8 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs font-black text-black uppercase tracking-wider">Course Progress</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-black">{currentHours.toFixed(1)}</span>
                            <span className="text-sm text-black font-bold">/ {targetHours} Hours</span>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 mx-12 max-w-lg">
                    <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${progressPercent >= 100 ? 'bg-green-600' : 'bg-purple-700'}`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px] font-bold text-black">0%</span>
                        <span className="text-[10px] font-bold text-black">100% (Complete)</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={onNewCourse} className="hidden sm:flex px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm items-center gap-2 transition-all">
                        <BookOpen className="w-4 h-4" /> New Course
                    </button>
                    <button
                        onClick={onAddGroup}
                        className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transaction-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> New Module
                    </button>
                    <button
                        onClick={onClear}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Clear All"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Canvas Area - Document Style */}
            <div className="flex-1 overflow-y-auto p-8 relative">
                <div
                    ref={setNodeRef}
                    className={cn(
                        'min-h-[800px] max-w-4xl mx-auto bg-white rounded-xl shadow-sm border transition-all p-12 relative',
                        isOver ? 'border-purple-400 ring-4 ring-purple-500/10' : 'border-gray-200',
                    )}
                >
                    {/* Watermark / Background hint */}
                    {items.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 pointer-events-none z-0">
                            <BookOpen className="w-24 h-24 mb-4 text-purple-100" />
                            <h3 className="text-xl font-bold text-gray-600">Start Your Course</h3>
                            <p className="max-w-md text-center mt-2 text-gray-400 mb-6">
                                Create a structured outline for your state verification.
                            </p>
                            <button
                                onClick={(e) => { e.stopPropagation(); onNewCourse?.(); }}
                                className="pointer-events-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" /> Launch Course Wizard
                            </button>
                        </div>
                    )}

                    <SortableContext
                        items={items.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-4">
                            {items.map((item) => (
                                <SortableItem
                                    key={item.id}
                                    item={item}
                                    onRemove={onRemoveItem}
                                    onUpdate={onUpdateItem}
                                    onSelect={onSelectItem}
                                    onAddChild={onAddItemToGroup}
                                />
                            ))}
                        </div>
                    </SortableContext>

                    {/* Add Button at bottom for convenience */}
                    {items.length > 0 && (
                        <button
                            onClick={onAddGroup}
                            className="w-full py-4 mt-8 border-2 border-dashed border-gray-100 rounded-lg text-gray-400 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider"
                        >
                            <Plus className="w-5 h-5" /> Add New Section
                        </button>
                    )}
                </div>

                <div className="max-w-4xl mx-auto mt-8 text-center text-xs text-gray-400 pb-8">
                    Autosaving enabled • Vermont Real Estate Commission Compliant Format
                </div>
            </div>
        </div>
    );
}
