'use client';

import React, { useState } from 'react';
import { Upload, FileText, ExternalLink, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { uploadStateResource, deleteStateResource } from '@/app/actions/state-actions';

interface RawSourceManagerProps {
    stateCode: string;
    initialFiles: any[];
}

export function RawSourceManager({ stateCode, initialFiles }: RawSourceManagerProps) {
    const [files, setFiles] = useState(initialFiles || []);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validations
        if (file.size > 5 * 1024 * 1024) { // 5MB limit for prototype
            alert("File is too large (Max 5MB for prototype storage)");
            return;
        }

        setIsUploading(true);

        // Convert to Base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result as string;

            const res = await uploadStateResource(stateCode, {
                name: file.name,
                type: file.type,
                size: file.size,
                base64: base64
            });

            if (res.success) {
                // Refresh list logic would go here, but we can optimistically add or refresh page
                // For now, let's just reload to fetch fresh data or simpler: router.refresh() 
                // But since we are inside a client component passed with initialFiles, let's reload.
                window.location.reload();
            } else {
                alert("Upload failed: " + res.error);
                setIsUploading(false);
            }
        };
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to remove this verified source?")) return;

        const res = await deleteStateResource(stateCode, id);
        if (res.success) {
            setFiles(files.filter(f => f._id !== id));
        } else {
            alert("Delete failed");
        }
    };

    const openFile = (url: string) => {
        // Open Base64 PDF in new tab
        const win = window.open();
        if (win) {
            win.document.write(`<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black text-gray-900">Raw Approved Sources</h3>
                    <p className="text-xs text-gray-500 mt-1">Ground Truth for AI Verification</p>
                </div>
                <div className="relative">
                    <input
                        type="file"
                        accept=".pdf,.txt,.md"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        disabled={isUploading}
                    />
                    <button disabled={isUploading} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all shadow-sm">
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {isUploading ? "Uploading..." : "Upload Source"}
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-3">
                {files.length === 0 && (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center text-center text-gray-400 transition-colors hover:border-purple-200 hover:bg-purple-50/10 hover:text-purple-600 relative">
                        <input
                            type="file"
                            accept=".pdf,.txt,.md"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs font-bold">Drop State Regulation PDFs here</span>
                        <span className="text-[10px] mt-1 text-gray-300">Supported: PDF, TXT (Max 5MB)</span>
                    </div>
                )}

                {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 truncate max-w-[180px]">{file.name}</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">
                                    {file.size} • {new Date(file.uploadedAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openFile(file.url)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                                <ExternalLink className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(file._id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
