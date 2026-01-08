'use client';

import React from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HoursValidationBarProps {
    targetHours: number;
    currentHours: number;
    totalTopics: number;
    onRecalculate: () => void;
}

export function HoursValidationBar({
    targetHours,
    currentHours,
    totalTopics,
    onRecalculate
}: HoursValidationBarProps) {
    const difference = currentHours - targetHours;
    const isValid = Math.abs(difference) < 0.5;
    const isOver = difference > 0.5;
    const isUnder = difference < -0.5;
    const percentage = Math.min(100, (currentHours / targetHours) * 100);

    return (
        <div className={cn(
            "flex items-center gap-4 px-4 py-2 rounded-lg border transition-all",
            isValid && "bg-green-50 border-green-200",
            isOver && "bg-amber-50 border-amber-200",
            isUnder && "bg-blue-50 border-blue-200"
        )}>
            {/* Status Icon */}
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                isValid && "bg-green-100",
                isOver && "bg-amber-100",
                isUnder && "bg-blue-100"
            )}>
                {isValid ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                    <AlertTriangle className={cn(
                        "w-5 h-5",
                        isOver ? "text-amber-600" : "text-blue-600"
                    )} />
                )}
            </div>

            {/* Hours Progress */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700">
                            {currentHours.toFixed(1)} / {targetHours} hours
                        </span>
                        {!isValid && (
                            <span className={cn(
                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                isOver ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                            )}>
                                {isOver ? `+${difference.toFixed(1)}h over` : `${Math.abs(difference).toFixed(1)}h short`}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FileText className="w-3 h-3" />
                        {totalTopics} topics
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full transition-all duration-500",
                            isValid && "bg-green-500",
                            isOver && "bg-amber-500",
                            isUnder && "bg-blue-500"
                        )}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                </div>
            </div>

            {/* Recalculate Button */}
            {!isValid && (
                <button
                    onClick={onRecalculate}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0",
                        isOver
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    )}
                >
                    <RefreshCw className="w-3 h-3" />
                    Auto-Fix
                </button>
            )}
        </div>
    );
}
