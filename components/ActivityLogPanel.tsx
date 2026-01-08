'use client';

import React, { useState, useEffect } from 'react';
import {
    History,
    X,
    User,
    Clock,
    ChevronDown,
    ChevronUp,
    Filter,
    RefreshCw,
    BookOpen,
    FileText,
    Upload,
    Sparkles,
    MapPin,
    LogIn,
    Settings,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getActivityLogs, getActivitySummary } from '@/lib/actions/log-actions';

interface ActivityLog {
    _id: string;
    userId: string;
    userName: string;
    userEmail: string;
    category: string;
    action: string;
    description: string;
    targetType?: string;
    targetId?: string;
    targetName?: string;
    metadata?: Record<string, any>;
    createdAt: string;
}

interface ActivityLogPanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserId?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
    course: <BookOpen className="w-4 h-4" />,
    content: <FileText className="w-4 h-4" />,
    resource: <Upload className="w-4 h-4" />,
    gemini: <Sparkles className="w-4 h-4" />,
    state: <MapPin className="w-4 h-4" />,
    auth: <LogIn className="w-4 h-4" />,
    system: <Settings className="w-4 h-4" />
};

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    course: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    content: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    resource: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
    gemini: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    state: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
    auth: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
    system: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' }
};

export function ActivityLogPanel({ isOpen, onClose, currentUserId }: ActivityLogPanelProps) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');
    const [showOnlyMine, setShowOnlyMine] = useState(false);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState<{ category: string; count: number }[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadLogs();
            loadSummary();
        }
    }, [isOpen, filter, showOnlyMine]);

    const loadLogs = async () => {
        setLoading(true);
        const result = await getActivityLogs({
            limit: 100,
            userId: showOnlyMine && currentUserId ? currentUserId : undefined,
            category: filter !== 'all' ? filter as any : undefined
        });

        if (result.success) {
            setLogs(result.logs);
            setTotal(result.total);
        }
        setLoading(false);
    };

    const loadSummary = async () => {
        const result = await getActivitySummary(showOnlyMine && currentUserId ? currentUserId : undefined);
        if (result.success) {
            setSummary(result.summary);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatFullTimestamp = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        });
    };

    if (!isOpen) return null;

    const colors = (category: string) => categoryColors[category] || categoryColors.system;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <History className="w-5 h-5" />
                        <div>
                            <h2 className="font-bold text-lg">Activity Log</h2>
                            <p className="text-indigo-200 text-xs">{total} total activities recorded</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadLogs}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Summary Bar */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2 overflow-x-auto">
                    {summary.map(s => (
                        <button
                            key={s.category}
                            onClick={() => setFilter(filter === s.category ? 'all' : s.category)}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap",
                                filter === s.category
                                    ? `${colors(s.category).bg} ${colors(s.category).text} ring-2 ring-offset-1 ring-indigo-400`
                                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                            )}
                        >
                            {categoryIcons[s.category]}
                            {s.category}
                            <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px]">
                                {s.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                            {filter === 'all' ? 'All categories' : `Filtered: ${filter}`}
                        </span>
                        {filter !== 'all' && (
                            <button
                                onClick={() => setFilter('all')}
                                className="text-xs text-indigo-600 hover:underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showOnlyMine}
                            onChange={(e) => setShowOnlyMine(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-gray-600">Only my activities</span>
                    </label>
                </div>

                {/* Log List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No activities found</p>
                            <p className="text-sm">Activities will appear here as you use the app</p>
                        </div>
                    ) : (
                        logs.map((log) => {
                            const c = colors(log.category);
                            return (
                                <div
                                    key={log._id}
                                    className={cn(
                                        "border rounded-xl overflow-hidden transition-all",
                                        c.border, c.bg
                                    )}
                                >
                                    {/* Log Header */}
                                    <button
                                        onClick={() => setExpandedId(expandedId === log._id ? null : log._id)}
                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                                c.bg, c.text
                                            )}>
                                                {categoryIcons[log.category]}
                                            </div>
                                            <div className="text-left">
                                                <div className="font-semibold text-sm text-gray-800">
                                                    {log.description}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <User className="w-3 h-3" />
                                                    <span>{log.userName}</span>
                                                    <span className="text-gray-300">•</span>
                                                    <Clock className="w-3 h-3" />
                                                    <span>{formatTime(log.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                                c.bg, c.text
                                            )}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                            {expandedId === log._id ? (
                                                <ChevronUp className="w-4 h-4 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>
                                    </button>

                                    {/* Expanded Details */}
                                    {expandedId === log._id && (
                                        <div className="px-4 pb-4 space-y-3 border-t border-gray-200/50 bg-white/50">
                                            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">User</div>
                                                    <div className="text-gray-700">{log.userName}</div>
                                                    <div className="text-gray-400 text-xs">{log.userEmail}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Timestamp</div>
                                                    <div className="text-gray-700 text-xs">{formatFullTimestamp(log.createdAt)}</div>
                                                </div>
                                            </div>

                                            {log.targetName && (
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Target</div>
                                                    <div className="text-gray-700 text-sm">
                                                        <span className="text-gray-400">{log.targetType}: </span>
                                                        {log.targetName}
                                                    </div>
                                                </div>
                                            )}

                                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Details</div>
                                                    <pre className="text-xs overflow-x-auto max-h-32 overflow-y-auto bg-gray-100 p-2 rounded text-gray-700">
                                                        {JSON.stringify(log.metadata, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
