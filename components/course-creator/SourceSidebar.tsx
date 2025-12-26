'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileNode } from '@/lib/file-system';
import { DraggableFile } from './DraggableFile';
import { ChevronRight, ChevronDown, Folder, PanelLeftClose, Upload, Link as LinkIcon, Plus, MoreVertical, Pencil, Trash, FileText } from 'lucide-react';
import { uploadResource, saveLinkResource, deleteResource, renameResource, getFileContent } from '@/app/actions';

interface SidebarProps {
    files: FileNode[];
    approvedFiles: FileNode[];
    onSelectFile?: (node: FileNode) => void;
    onClose?: () => void;
    targetState?: string;
}

function FileMenu({ node, onDelete, onEdit, onRename }: { node: FileNode, onDelete: () => void, onEdit: () => void, onRename: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
                <MoreVertical className="w-3 h-3" />
            </button>
            {isOpen && (
                <div className="absolute right-0 top-6 w-32 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-50">
                    {node.name.endsWith('.link') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); onEdit(); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"
                        >
                            <Pencil className="w-3 h-3" /> Edit
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); onRename(); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"
                    >
                        <FileText className="w-3 h-3" /> Rename
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDelete(); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                        <Trash className="w-3 h-3" /> Delete
                    </button>
                </div>
            )}
        </div>
    );
}

function FolderItem({ node, onSelect }: { node: FileNode; onSelect?: (node: FileNode) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    if (node.type === 'file') {
        // FolderItem only used for recursive rendering of folders in "National" usually
        // But if a file ends up here, render it
        return (
            <div onClick={() => onSelect?.(node)}>
                <DraggableFile node={node} />
            </div>
        );
    }

    return (
        <div className="pl-2">
            <div
                className="flex items-center gap-1 p-1.5 hover:bg-green-50 rounded cursor-pointer text-sm mb-0.5"
                onClick={() => setIsOpen(!isOpen)}
            >
                <button className="p-0.5 hover:bg-green-100 rounded text-gray-500">
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                <Folder className="w-4 h-4 text-green-600 fill-green-100" />
                <span className="font-medium truncate select-none text-gray-700">{node.name}</span>
            </div>

            {isOpen && (
                <div className="pl-3 border-l-2 border-green-100 ml-2 mt-1 flex flex-col gap-0.5">
                    {node.children?.map((child) => (
                        child.type === 'folder' ? (
                            <FolderItem key={child.id} node={child} onSelect={onSelect} />
                        ) : (
                            <div key={child.id} onClick={() => onSelect?.(child)}>
                                <DraggableFile node={child} />
                            </div>
                        )
                    ))}
                </div>
            )}
        </div>
    );
}

export function SourceSidebar({ files, approvedFiles, onSelectFile, onClose, targetState = 'VT' }: SidebarProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'national' | 'approved'>('national');
    const [isUploading, setIsUploading] = useState(false);

    // Upload State
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkTitle, setLinkTitle] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit/Rename State
    const [editingNode, setEditingNode] = useState<FileNode | null>(null);
    const [renameNode, setRenameNode] = useState<FileNode | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Filter files based on search query
    const filterNodes = (nodes: FileNode[], query: string): FileNode[] => {
        if (!query) return nodes;

        return nodes.reduce((acc: FileNode[], node) => {
            if (node.type === 'file') {
                if (node.name.toLowerCase().includes(query.toLowerCase())) {
                    acc.push(node);
                }
            } else if (node.type === 'folder') {
                const filteredChildren = filterNodes(node.children || [], query);
                if (filteredChildren.length > 0) {
                    acc.push({ ...node, children: filteredChildren });
                }
            }
            return acc;
        }, []);
    };

    const activeSource = activeTab === 'national' ? files : approvedFiles;
    // For Approved tab, if we want to show ONLY the current state's folder or root
    // The structure returns root folders like "VT", "TX" etc.
    // If we want to show specific state, we might need to drill down.
    // For now, let's just filter the root nodes to find the folder matching targetState
    const displayNodes = useMemo(() => {
        if (activeTab === 'approved' && targetState) {
            const stateFolder = activeSource.find(n => n.name === targetState);
            return stateFolder ? (stateFolder.children || []) : [];
        }
        return activeSource;
    }, [activeSource, activeTab, targetState]);

    const filteredFiles = useMemo(() => filterNodes(displayNodes, searchQuery), [displayNodes, searchQuery]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !targetState) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('state', targetState);

        const res = await uploadResource(formData);
        if (res.success) {
            router.refresh();
        } else {
            alert('Upload failed: ' + res.error);
        }
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAddLink = async () => {
        if (!linkTitle || !linkUrl || !targetState) return;
        setIsUploading(true);

        if (editingNode) {
            // Updated link logic: Delete old, create new
            const deleteRes = await deleteResource(editingNode.path);
            if (!deleteRes.success) {
                alert('Update failed during delete phase: ' + deleteRes.error);
                setIsUploading(false);
                return;
            }
        }

        const res = await saveLinkResource(linkTitle, linkUrl, targetState);
        if (res.success) {
            setLinkUrl('');
            setLinkTitle('');
            setShowLinkInput(false);
            setEditingNode(null);
            router.refresh();
        } else {
            alert('Save failed: ' + res.error);
        }
        setIsUploading(false);
    };

    const handleDelete = async (node: FileNode) => {
        if (!confirm(`Are you sure you want to delete "${node.name}"?`)) return;
        setIsUploading(true);
        const res = await deleteResource(node.path);
        if (res.success) {
            router.refresh();
        } else {
            alert('Delete failed: ' + res.error);
        }
        setIsUploading(false);
    };

    const handleEdit = async (node: FileNode) => {
        if (node.name.endsWith('.link')) {
            // Load content to prefill
            // Assuming we can get content via server action usually, but here we might need to parse it
            // Since we don't have the content readily available in the node, let's fetch it
            try {
                // We need a way to read file content to pre-fill
                // Using a server action (we reused getFileContent but it needs to parse JSON)
                // Or we can just read it since it's a file path
                const contentStr = await getFileContent(node.path); // Function we need to make sure is available or use another way
                // getFileContent returns string. For .link it is JSON.
                if (contentStr) {
                    const data = JSON.parse(contentStr);
                    setLinkTitle(data.title || '');
                    setLinkUrl(data.url || '');
                    setEditingNode(node);
                    setShowLinkInput(true);
                }
            } catch (e) {
                console.error("Failed to load link for editing", e);
            }
        }
    };

    const handleRename = (node: FileNode) => {
        setRenameNode(node);
        setRenameValue(node.name);
    };

    const confirmRename = async () => {
        if (!renameNode || !renameValue) return;
        setIsUploading(true);
        const res = await renameResource(renameNode.path, renameValue);
        if (res.success) {
            setRenameNode(null);
            setRenameValue('');
            router.refresh();
        } else {
            alert('Rename failed: ' + res.error);
        }
        setIsUploading(false);
    };

    const handleNodeClick = (node: FileNode) => {
        if (activeTab === 'approved' && node.type === 'file') {
            if (node.name.toLowerCase().endsWith('.pdf') || node.name.toLowerCase().endsWith('.link')) {
                window.open(`/api/resource/${node.path}`, '_blank');
                return;
            }
        }
        onSelectFile?.(node);
    };

    return (
        <div className="w-full h-full flex flex-col bg-white z-20 relative">
            <div className="p-3 border-b border-gray-200 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-gray-700 tracking-wider">Resources</span>
                    {onClose && (
                        <button onClick={onClose} className="text-gray-600 hover:text-green-700 p-1 hover:bg-green-100 rounded-lg transition-colors" title="Collapse Sidebar">
                            <PanelLeftClose className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
                    {/* Tabs */}
                    <button
                        onClick={() => setActiveTab('national')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'national' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-300'}`}
                    >
                        National
                    </button>
                    <button
                        onClick={() => setActiveTab('approved')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'approved' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-300'}`}
                    >
                        Approved ({targetState})
                    </button>
                </div>

                {activeTab === 'approved' && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white border border-gray-200 text-xs font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-green-600 hover:border-green-200 transition-all shadow-sm"
                        >
                            <Upload className="w-3 h-3" />
                            PDF
                        </button>
                        <input
                            type="file"
                            accept=".pdf"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        <button
                            onClick={() => setShowLinkInput(true)}
                            disabled={isUploading}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white border border-gray-200 text-xs font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-green-600 hover:border-green-200 transition-all shadow-sm"
                        >
                            <LinkIcon className="w-3 h-3" />
                            Link
                        </button>
                    </div>
                )}

                {showLinkInput && (
                    <div className="p-2 bg-white border border-green-100 rounded-md shadow-sm space-y-2 animate-in fade-in slide-in-from-top-2">
                        <input
                            type="text"
                            placeholder="Link Title"
                            value={linkTitle}
                            onChange={(e) => setLinkTitle(e.target.value)}
                            className="w-full px-2 py-1 text-xs text-gray-900 border border-gray-200 rounded focus:border-green-500 outline-none placeholder:text-gray-400"
                        />
                        <input
                            type="text"
                            placeholder="https://..."
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            className="w-full px-2 py-1 text-xs text-gray-900 border border-gray-200 rounded focus:border-green-500 outline-none placeholder:text-gray-400"
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => { setShowLinkInput(false); setEditingNode(null); setLinkTitle(''); setLinkUrl(''); }} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                            <button onClick={handleAddLink} disabled={!linkTitle || !linkUrl} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                                {editingNode ? 'Update' : 'Add'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full pl-8 pr-3 py-2 text-xs font-medium text-gray-800 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <svg className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {isUploading && (
                    <div className="flex items-center justify-center p-4 text-xs text-green-600 animate-pulse">
                        Uploading...
                    </div>
                )}
                {filteredFiles.length > 0 ? (
                    filteredFiles.map((node) => (
                        node.type === 'folder' ? (
                            <FolderItem key={node.id} node={node} onSelect={handleNodeClick} />
                        ) : (
                            <div key={node.id} className="group relative hover:bg-green-50 rounded-lg transition-colors flex items-center justify-between pr-2">
                                <div onClick={() => handleNodeClick(node)} className="flex-1 min-w-0">
                                    <DraggableFile node={node} />
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                    <FileMenu
                                        node={node}
                                        onDelete={() => handleDelete(node)}
                                        onEdit={() => handleEdit(node)}
                                        onRename={() => handleRename(node)}
                                    />
                                </div>
                            </div>
                        )
                    ))
                ) : (
                    <div className="p-4 text-center text-gray-500 text-xs italic font-medium">
                        No files found
                    </div>
                )}
            </div>

            {/* Rename Modal */}
            {renameNode && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded-lg shadow-lg w-64">
                        <h3 className="text-sm font-bold mb-2">Rename File</h3>
                        <input
                            className="w-full border border-gray-300 rounded p-1 mb-2 text-sm"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setRenameNode(null)} className="text-xs text-gray-500">Cancel</button>
                            <button onClick={confirmRename} className="text-xs bg-green-600 text-white px-2 py-1 rounded">Rename</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
