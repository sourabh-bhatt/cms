
import React from 'react';
import { getNationalContentStructure, getApprovedResourcesStructure } from '@/lib/file-system';
import BuilderInterface from '@/components/course-creator/BuilderInterface';

export const dynamic = 'force-dynamic';

export default async function CourseCreatorPage() {
    const [nationalContent, approvedResources] = await Promise.all([
        getNationalContentStructure(),
        getApprovedResourcesStructure()
    ]);

    return (
        <div className="h-screen flex flex-col">
            <header className="h-16 border-b border-purple-700 flex items-center justify-between px-6 bg-gradient-to-r from-purple-700 to-purple-500 shrink-0 shadow-md">
                <h1 className="text-xl font-bold text-white tracking-wide">Visual Course Creator</h1>
                <div className="text-purple-100 text-sm">
                    Drag & Drop Course Builder
                </div>
            </header>

            <main className="flex-1 overflow-hidden">
                <BuilderInterface files={nationalContent} approvedFiles={approvedResources} />
            </main>
        </div>
    );
}
