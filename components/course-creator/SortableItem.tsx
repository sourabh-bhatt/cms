'use client';

import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, FileText, Folder, Trash2, ChevronDown, ChevronRight, Clock, AlignLeft, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileNode } from '@/lib/file-system';

export type CourseItemType = 'file' | 'folder' | 'group';

export interface CourseItem {
    id: string; // unique instance ID
    nodeId: string; // original file ID
    name: string;
    type: CourseItemType;
    hours?: number; // Manual override or calculated
    content?: string; // The actual body text
    wordCount?: number;
    estimatedMinutes?: number;
    tags?: ('national' | 'state')[];
    citation?: string;
    verified?: boolean;
    children?: CourseItem[];
}

interface SortableProps {
    item: CourseItem;
    onRemove: (id: string) => void;
    onSelect?: (item: CourseItem) => void;
    onUpdate?: (id: string, updates: Partial<CourseItem>) => void;
    onAddChild?: (parentId: string) => void;
}

export function SortableItem({ item, onRemove, onSelect, onUpdate, onAddChild }: SortableProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        data: {
            type: 'course-item',
            item,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const [isExpanded, setIsExpanded] = useState(item.type === 'group'); // Default expanded for groups
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [localName, setLocalName] = useState(item.name);
    const [localContent, setLocalContent] = useState(item.content || '');

    // Auto-calculate word count and time
    useEffect(() => {
        const words = localContent.trim().split(/\s+/).filter(w => w.length > 0).length;
        const minutes = Math.ceil(words / 150); // Reading speed approx 150 wpm
        const hours = parseFloat((minutes / 60).toFixed(2));

        if (onUpdate && (item.wordCount !== words || item.content !== localContent)) {
            // Only update if changed to avoid loop
            // Debouncing would be better here in real app
        }
    }, [localContent]);


    const handleBlurName = () => {
        setIsEditingTitle(false);
        if (onUpdate && localName !== item.name) {
            onUpdate(item.id, { name: localName });
        }
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setLocalContent(newContent);

        const words = newContent.trim().split(/\s+/).filter(w => w.length > 0).length;
        const minutes = Math.ceil(words / 150);
        const calcHours = Number((minutes / 60).toFixed(2));

        if (onUpdate) {
            onUpdate(item.id, {
                content: newContent,
                wordCount: words,
                estimatedMinutes: minutes,
                hours: calcHours // Auto-update hours based on content
            });
        }
    };

    // --- MODULE / GROUP RENDER ---
    if (item.type === 'group') {
        const totalModuleHours = (item.hours || 0) + (item.children?.reduce((acc, child) => acc + (child.hours || 0), 0) || 0);

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={cn(
                    'group mb-6 rounded-xl border-2 transition-all bg-white shadow-sm overflow-hidden',
                    isDragging ? 'opacity-50 ring-2 ring-purple-500 z-50 border-purple-500' : 'border-purple-100'
                )}
            >
                {/* Module Header */}
                <div className="bg-purple-50 p-4 flex items-center gap-3 border-b border-purple-100">
                    <div {...attributes} {...listeners} className="cursor-grab text-purple-400 hover:text-purple-600 p-1">
                        <GripVertical className="w-5 h-5" />
                    </div>

                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-purple-700 hover:bg-purple-100 p-1 rounded">
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>

                    <div className="flex-1">
                        {isEditingTitle ? (
                            <input
                                autoFocus
                                value={localName}
                                onChange={(e) => setLocalName(e.target.value)}
                                onBlur={handleBlurName}
                                className="font-bold text-lg text-purple-900 bg-white px-2 py-0.5 rounded border border-purple-300 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        ) : (
                            <h3
                                className="font-bold text-lg text-purple-900 cursor-pointer hover:underline decoration-purple-300 underline-offset-4"
                                onClick={() => setIsEditingTitle(true)}
                            >
                                {localName}
                            </h3>
                        )}
                        <div className="flex gap-4 mt-1">
                            <span className="text-xs font-bold text-purple-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {totalModuleHours.toFixed(1)} Hours Total
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => onRemove(item.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-500 hover:text-red-600 transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>

                {/* Module Body */}
                {isExpanded && (
                    <div className="bg-white p-4 min-h-[50px] border-t border-dashed border-purple-100 flex flex-col gap-3">
                        {item.children && item.children.length > 0 ? (
                            <div className="space-y-3">
                                {item.children.map(child => (
                                    <div key={child.id} className="pl-4 border-l-2 border-purple-100">
                                        <SortableItem
                                            item={child}
                                            onRemove={onRemove}
                                            onUpdate={onUpdate}
                                            onSelect={onSelect}
                                            onAddChild={onAddChild}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-center text-purple-300 italic mb-2 select-none">
                                Drag topics here or click below to add a topic
                            </p>
                        )}

                        <button
                            onClick={() => onAddChild?.(item.id)}
                            className="w-full py-2 mt-2 border border-dashed border-purple-200 rounded-lg text-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 text-xs font-semibold uppercase"
                        >
                            <Plus className="w-4 h-4" /> Add Page / Topic
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // --- CONTENT ITEM RENDER ---
    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'group relative ml-8 mb-3 rounded-lg border transition-all bg-white shadow-sm overflow-hidden',
                isDragging ? 'opacity-50 ring-2 ring-blue-500 z-50 border-blue-500' : 'border-gray-200 hover:border-purple-300'
            )}
            onClick={() => onSelect?.(item)}
        >
            {/* Item Header */}
            <div
                className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer",
                    isExpanded ? "bg-gray-50 border-b border-gray-100" : "bg-white"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500" onClick={(e) => e.stopPropagation()}>
                    <GripVertical className="w-4 h-4" />
                </div>

                <div className="p-1.5 bg-blue-50 rounded text-blue-500">
                    {item.type === 'folder' ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                    {isEditingTitle ? (
                        <input
                            autoFocus
                            value={localName}
                            onChange={(e) => setLocalName(e.target.value)}
                            onBlur={handleBlurName}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleBlurName();
                                }
                            }}
                            className="font-semibold text-gray-800 text-sm bg-white px-1.5 py-0.5 rounded border border-blue-300 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    ) : (
                        <h4
                            className="font-semibold text-gray-800 text-sm truncate cursor-pointer hover:underline decoration-blue-300 underline-offset-2 hover:text-blue-700 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditingTitle(true);
                            }}
                            title="Click to rename"
                        >
                            {item.name}
                        </h4>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                        {item.wordCount ? (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <AlignLeft className="w-3 h-3" /> {item.wordCount} words
                            </span>
                        ) : null}
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {(item.hours || 0).toFixed(2)} hrs
                        </span>

                        {item.verified ? (
                            <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5 bg-green-50 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                <AlertCircle className="w-3 h-3" /> Draft
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-gray-400 hover:text-purple-600 p-1"
                    >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => onRemove(item.id)}
                        className="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Item Body (Rich Editor) */}
            {isExpanded && (
                <div className="p-4 bg-white cursor-auto" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-xs font-bold text-black uppercase mb-2">Content Body</label>
                    <textarea
                        value={localContent}
                        onChange={handleContentChange}
                        className="w-full h-32 p-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-y font-mono"
                        placeholder="Paste content here or write directly..."
                    />

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Tags:</span>
                                <button className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded hover:bg-purple-100 hover:text-purple-600 transition-colors">
                                    + National
                                </button>
                                <button className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded hover:bg-green-100 hover:text-green-600 transition-colors">
                                    + State
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={item.verified}
                                    onChange={(e) => onUpdate && onUpdate(item.id, { verified: e.target.checked })}
                                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-gray-500 group-hover:text-purple-700 transition-colors">Mark Verified</span>
                            </label>
                        </div>
                    </div>

                    <div className="mt-3">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Citation / Reference</label>
                        <input
                            type="text"
                            value={item.citation || ''}
                            onChange={(e) => onUpdate && onUpdate(item.id, { citation: e.target.value })}
                            placeholder="e.g. 26 V.S.A. § 2211"
                            className="w-full px-3 py-1.5 text-xs font-medium text-gray-900 placeholder:text-gray-400 bg-white border border-gray-300 rounded focus:outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
