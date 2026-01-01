'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Save, FileText } from 'lucide-react';
import { updateStateRequirements } from '@/app/actions/state-actions';

interface RequirementEditorProps {
    stateCode: string;
    initialTopics: any[];
    initialTotalHours: number;
}

export function RequirementEditor({ stateCode, initialTopics, initialTotalHours }: RequirementEditorProps) {
    const [topics, setTopics] = useState(initialTopics);
    const [totalHours, setTotalHours] = useState(initialTotalHours);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        const res = await updateStateRequirements(stateCode, totalHours, topics);
        if (res.success) {
            // success feedback
        } else {
            alert("Failed to save requirements");
        }
        setIsSaving(false);
    };

    const addTopic = () => {
        setTopics([...topics, { name: '', hours: 0, keywords: [] }]);
    };

    const updateTopic = (index: number, field: string, value: any) => {
        const newTopics = [...topics];
        newTopics[index] = { ...newTopics[index], [field]: value };
        setTopics(newTopics);
    };

    const removeTopic = (index: number) => {
        setTopics(topics.filter((_, i) => i !== index));
    };

    const calculateTotal = () => topics.reduce((acc, t) => acc + (Number(t.hours) || 0), 0);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Mandatory Requirements
                </h3>
                <div className="flex items-center gap-4">
                    <div className="bg-white px-3 py-1 rounded-lg border text-sm font-bold shadow-sm">
                        Total: <span className={calculateTotal() === totalHours ? "text-green-600" : "text-amber-600"}>{calculateTotal()}</span> / {totalHours} hrs
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-gray-800 transition-all disabled:opacity-50"
                    >
                        <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="p-6">
                <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                        <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">State Total Hours</label>
                        <input
                            type="number"
                            value={totalHours}
                            onChange={(e) => setTotalHours(Number(e.target.value))}
                            className="w-32 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-4 px-2 py-1 text-[10px] uppercase font-black text-gray-400">
                        <div className="col-span-1">#</div>
                        <div className="col-span-5">Topic Name</div>
                        <div className="col-span-2 text-right">Hours</div>
                        <div className="col-span-3">Keywords (comma sep)</div>
                        <div className="col-span-1"></div>
                    </div>

                    {topics.map((topic, i) => (
                        <div key={i} className="grid grid-cols-12 gap-4 items-center group">
                            <div className="col-span-1 flex justify-center">
                                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                            </div>
                            <div className="col-span-5">
                                <input
                                    value={topic.name}
                                    onChange={(e) => updateTopic(i, 'name', e.target.value)}
                                    placeholder="e.g. Agency Law"
                                    className="w-full bg-white border border-gray-200 focus:bg-white rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:border-purple-300 transition-all"
                                />
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="number"
                                    value={topic.hours}
                                    onChange={(e) => updateTopic(i, 'hours', Number(e.target.value))}
                                    className="w-full text-right bg-white border border-gray-200 focus:bg-white rounded-lg px-3 py-2 text-sm font-bold font-mono text-gray-900 focus:outline-none focus:border-purple-300 transition-all"
                                />
                            </div>
                            <div className="col-span-3">
                                <input
                                    value={Array.isArray(topic.keywords) ? topic.keywords.join(', ') : topic.keywords}
                                    onChange={(e) => updateTopic(i, 'keywords', e.target.value.split(',').map(s => s.trim()))}
                                    placeholder="agent, fiduciary..."
                                    className="w-full bg-white border border-gray-200 focus:bg-white rounded-lg px-3 py-2 text-xs font-medium text-gray-600 focus:outline-none focus:border-purple-300 transition-all"
                                />
                            </div>
                            <div className="col-span-1 flex justify-end">
                                <button
                                    onClick={() => removeTopic(i)}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={addTopic}
                        className="w-full py-3 mt-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold text-sm hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Mandatory Topic
                    </button>
                </div>
            </div>
        </div>
    );
}
