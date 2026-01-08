'use client';

import React, { useState } from 'react';
import { Check, X, FileText, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileSelectionStepProps {
    selectedFiles: string[];
    availableFiles: string[];
    onConfirm: (selectedFiles: string[]) => void;
    onCancel: () => void;
    isLoading?: boolean;
    maxFiles: number;
}

export function FileSelectionStep({
    selectedFiles: initialSelected,
    availableFiles,
    onConfirm,
    onCancel,
    isLoading = false,
    maxFiles
}: FileSelectionStepProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
    const [searchQuery, setSearchQuery] = useState('');
    const [showAll, setShowAll] = useState(false);

    const filteredFiles = availableFiles.filter(f =>
        f.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const displayedFiles = showAll ? filteredFiles : filteredFiles.slice(0, 20);

    const toggleFile = (file: string) => {
        const newSelected = new Set(selected);
        if (newSelected.has(file)) {
            newSelected.delete(file);
        } else if (newSelected.size < maxFiles) {
            newSelected.add(file);
        }
        setSelected(newSelected);
    };

    const selectAll = () => {
        const toAdd = filteredFiles.slice(0, maxFiles);
        setSelected(new Set(toAdd));
    };

    const deselectAll = () => {
        setSelected(new Set());
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white shrink-0">
                    <h2 className="font-bold text-lg">Step 1: Select Files for Outline</h2>
                    <p className="text-blue-200 text-xs mt-1">
                        Gemini suggested these files. Adjust selection before generating content.
                    </p>
                </div>

                {/* Search & Stats */}
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
                    <div className="flex items-center gap-4">
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="text-sm">
                            <span className="font-bold text-blue-600">{selected.size}</span>
                            <span className="text-gray-400"> / {maxFiles} max</span>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={selectAll}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                            Select All ({Math.min(filteredFiles.length, maxFiles)})
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                            onClick={deselectAll}
                            className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                        >
                            Deselect All
                        </button>
                    </div>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-1 gap-1">
                        {displayedFiles.map((file) => {
                            const isSelected = selected.has(file);
                            return (
                                <button
                                    key={file}
                                    onClick={() => toggleFile(file)}
                                    disabled={!isSelected && selected.size >= maxFiles}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                                        isSelected
                                            ? "bg-blue-50 border-2 border-blue-300"
                                            : "bg-white border border-gray-200 hover:border-blue-200 hover:bg-blue-50/50",
                                        !isSelected && selected.size >= maxFiles && "opacity-40 cursor-not-allowed"
                                    )}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                                        isSelected
                                            ? "bg-blue-500 border-blue-500"
                                            : "border-gray-300"
                                    )}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <FileText className={cn(
                                        "w-4 h-4 shrink-0",
                                        isSelected ? "text-blue-600" : "text-gray-400"
                                    )} />
                                    <span className={cn(
                                        "text-sm truncate",
                                        isSelected ? "font-medium text-blue-800" : "text-gray-600"
                                    )}>
                                        {file}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Show More */}
                    {filteredFiles.length > 20 && !showAll && (
                        <button
                            onClick={() => setShowAll(true)}
                            className="w-full mt-3 py-2 text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1"
                        >
                            <ChevronDown className="w-4 h-4" />
                            Show {filteredFiles.length - 20} more files
                        </button>
                    )}
                    {showAll && filteredFiles.length > 20 && (
                        <button
                            onClick={() => setShowAll(false)}
                            className="w-full mt-3 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
                        >
                            <ChevronUp className="w-4 h-4" />
                            Show less
                        </button>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 flex items-center gap-1"
                    >
                        <X className="w-4 h-4" />
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(Array.from(selected))}
                        disabled={selected.size === 0 || isLoading}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white transition-all",
                            "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700",
                            "shadow-lg hover:shadow-xl active:scale-95",
                            (selected.size === 0 || isLoading) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        Confirm & Generate ({selected.size} files)
                    </button>
                </div>
            </div>
        </div>
    );
}
