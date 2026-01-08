
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


            <main className="flex-1 overflow-hidden">
                <BuilderInterface files={nationalContent} approvedFiles={approvedResources} />
            </main>
        </div>
    );
}
