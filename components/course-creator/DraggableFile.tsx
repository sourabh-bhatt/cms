'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { FileText, Folder, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileNode } from '@/lib/file-system';

interface DraggableProps {
    node: FileNode;
    isOverlay?: boolean;
    tag?: 'national' | 'state';
}

export function DraggableFile({ node, isOverlay, tag }: DraggableProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: node.id,
        data: {
            type: 'source-item',
            node,
            tag,
        },
    });

    const getIcon = () => {
        if (node.type === 'folder') return <Folder className="w-4 h-4 text-green-500 fill-green-50" />;
        if (node.name.toLowerCase().endsWith('.pdf')) return <FileText className="w-4 h-4 text-red-500" />;
        if (node.name.toLowerCase().endsWith('.link')) return <LinkIcon className="w-4 h-4 text-blue-500" />;
        return <FileText className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />;
    };

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                'flex items-center gap-2.5 p-2 rounded-md cursor-grab hover:bg-green-50 text-sm border border-transparent group w-full',
                isDragging && 'opacity-50 bg-green-50 border-green-200',
                isOverlay && 'bg-white shadow-xl border-green-200 opacity-100 cursor-grabbing',
                'transition-all duration-200'
            )}
        >
            {getIcon()}
            <span className="truncate text-gray-600 group-hover:text-gray-900 flex-1 min-w-0 text-left">{node.name.replace('.link', '')}</span>
        </div>
    );
}
