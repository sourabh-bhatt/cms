import React, { useState, useEffect } from 'react';
import { BookOpen, MapPin, Clock, Layers, ArrowRight, CheckCircle2 } from 'lucide-react';

interface CourseSetupProps {
    onCreate: (config: CourseConfig) => void;
    onCancel: () => void;
}

export interface CourseConfig {
    title: string;
    state: string;
    targetHours: number;
    moduleCount: number;
    instructor: string;
}

export function CourseSetup({ onCreate, onCancel }: CourseSetupProps) {
    const [config, setConfig] = useState<CourseConfig>({
        title: '',
        state: 'VT',
        targetHours: 40,
        moduleCount: 12,
        instructor: 'Sean Munson'
    });

    // Auto-fill defaults based on state
    useEffect(() => {
        if (config.state === 'VT') {
            setConfig(c => ({
                ...c,
                title: 'Vermont Real Estate Salesperson Pre-Licensing Course',
                targetHours: 40,
                moduleCount: 12
            }));
        } else if (config.state === 'VA') {
            setConfig(c => ({
                ...c,
                title: 'Virginia Real Estate Salesperson Pre-Licensing Course',
                targetHours: 60,
                moduleCount: 15
            }));
        }
    }, [config.state]);

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-8 text-white shrink-0">
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Create New Course Application</h2>
                    <p className="text-purple-100 text-sm">Define the core requirements for your state submission.</p>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto space-y-6">

                    {/* Course Identity */}
                    <div className="space-y-4">
                        <label className="block">
                            <span className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-1 block">Target State</span>
                            <div className="grid grid-cols-4 gap-3">
                                {['VT', 'VA', 'MD', 'TX'].map(state => (
                                    <button
                                        key={state}
                                        onClick={() => setConfig({ ...config, state })}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${config.state === state
                                            ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm'
                                            : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <MapPin className={`w-5 h-5 mb-1 ${config.state === state ? 'fill-purple-200' : ''}`} />
                                        <span className="font-bold">{state}</span>
                                    </button>
                                ))}
                            </div>
                        </label>

                        <label className="block">
                            <span className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-1 block">Course Title</span>
                            <div className="relative">
                                <BookOpen className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={config.title}
                                    onChange={e => setConfig({ ...config, title: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-gray-800"
                                    placeholder="e.g. Vermont Real Estate Principles"
                                />
                            </div>
                        </label>
                    </div>

                    <div className="h-px bg-gray-100"></div>

                    {/* Requirements */}
                    <div className="grid grid-cols-2 gap-6">
                        <label className="block">
                            <span className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-1 block">Total Hours Required</span>
                            <div className="relative">
                                <Clock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="number"
                                    value={config.targetHours}
                                    onChange={e => setConfig({ ...config, targetHours: Number(e.target.value) })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono font-medium text-gray-800"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5 ml-1">State mandated duration</p>
                        </label>

                        <label className="block">
                            <span className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-1 block">Initial Modules</span>
                            <div className="relative">
                                <Layers className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="number"
                                    value={config.moduleCount}
                                    onChange={e => setConfig({ ...config, moduleCount: Number(e.target.value) })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono font-medium text-gray-800"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5 ml-1">Number of sections to generate</p>
                        </label>
                    </div>

                    {/* Instructor Info */}
                    <label className="block">
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-1 block">Instructor / Author</span>
                        <input
                            type="text"
                            value={config.instructor}
                            onChange={e => setConfig({ ...config, instructor: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-gray-800"
                        />
                    </label>

                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onCreate(config)}
                        className="px-8 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 flex items-center gap-2 transition-all transform hover:scale-[1.02]"
                    >
                        <span>Create & Generate Outline</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

            </div>
        </div>
    );
}
