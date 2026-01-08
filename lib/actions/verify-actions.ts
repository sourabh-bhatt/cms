'use server';

import dbConnect from '@/lib/db';
import Content from '@/lib/models/Content';
import Resource from '@/lib/models/Resource';
import { logActivity } from './log-actions';

const WORDS_PER_HOUR = 7800; // ~130 wpm
const TOLERANCE_PERCENT = 0.2; // Allow 20% deviation before flagging

export interface VerificationResult {
    success: boolean;
    totalHours: number;
    totalWords: number;
    issues: string[];
    itemDetails: {
        id: string;
        name: string;
        status: 'ok' | 'warning' | 'error';
        message?: string;
        expectedHours?: number;
        actualHours?: number;
    }[];
}

export async function verifyCourseStructure(items: any[], targetHours: number, user?: any): Promise<VerificationResult> {
    await dbConnect();

    const result: VerificationResult = {
        success: true,
        totalHours: 0,
        totalWords: 0,
        issues: [],
        itemDetails: []
    };

    try {
        // Flatten items (handle groups)
        const flatItems: any[] = [];
        const processItems = (list: any[]) => {
            list.forEach(item => {
                if (item.type === 'group' && item.children) {
                    processItems(item.children); // Recurse
                } else if (item.type === 'file') {
                    flatItems.push(item);
                }
            });
        };
        processItems(items);

        if (flatItems.length === 0) {
            result.issues.push("Course has no content files.");
            result.success = false;
            return result;
        }

        // Verify each item
        for (const item of flatItems) {
            const detail: any = {
                id: item.id,
                name: item.name,
                status: 'ok',
                actualHours: item.hours || 0
            };

            // 1. Check File Existence
            // nodeId should be the filename or path
            const filename = item.nodeId;
            let contentStr = "";
            let fileExists = false;

            // Try finding by path (exact match)
            // Or try finding by name (loose match if path incorrect)
            const contentDoc = await Content.findOne({
                $or: [
                    { path: filename },
                    { title: filename } // Fallback
                ]
            });

            if (contentDoc) {
                fileExists = true;
                contentStr = contentDoc.content || "";
            } else {
                // Try Resource
                const resourceDoc = await Resource.findOne({ title: filename });
                if (resourceDoc) {
                    fileExists = true;
                    // Binary resource vs link
                    contentStr = resourceDoc.url || ""; // If link
                }
            }

            if (!fileExists && !item.nodeId.startsWith('gemini-') && !item.nodeId.startsWith('topic-')) {
                // If it's a virtual ID (gemini/topic), we might not have a file YET, 
                // but the user asked if names match an EXISTING file.
                // So strictly speaking, this is an error if we expect them to map to National Content.
                detail.status = 'error';
                detail.message = `File not found: ${filename}`;
                result.issues.push(`File not found for topic "${item.name}"`);
            } else if (fileExists) {
                // 2. Check Word Count vs Hours
                const wordCount = contentStr.split(/\s+/).length;
                result.totalWords += wordCount;

                const expectedHours = wordCount / WORDS_PER_HOUR;
                detail.expectedHours = parseFloat(expectedHours.toFixed(2));

                const setHours = item.hours || 0;

                // If hours are set, verify they make sense
                if (setHours > 0) {
                    const diff = Math.abs(setHours - expectedHours);
                    const percentDiff = diff / (expectedHours || 1); // Avoid div by zero

                    // Only complain if significant diff AND significant text
                    if (percentDiff > TOLERANCE_PERCENT && wordCount > 500) {
                        detail.status = 'warning';
                        detail.message = `Time mismatch: Content length (${wordCount} words) suggests ${expectedHours.toFixed(2)} hrs, but set to ${setHours.toFixed(2)} hrs.`;
                        // Note: We don't fail validation for this, just warn
                    }
                }
            }

            result.itemDetails.push(detail);
        }

        // 3. Check Total Hours
        const calculatedTotal = flatItems.reduce((acc, i) => acc + (i.hours || 0), 0);
        result.totalHours = calculatedTotal;

        if (Math.abs(calculatedTotal - targetHours) > 0.5) {
            result.issues.push(`Total hours (${calculatedTotal.toFixed(1)}) does not match target (${targetHours}).`);
            result.success = false;
        }

        // 4. Log the Verification
        if (user) {
            await logActivity({
                user,
                category: 'system',
                action: 'verify_course',
                description: `Verified course structure: ${result.success ? 'PASSED' : 'FAILED'}`,
                metadata: {
                    issues: result.issues,
                    totalWords: result.totalWords,
                    calculatedHours: result.totalHours
                }
            });
        }

        return result;

    } catch (error) {
        console.error("Verification failed:", error);
        return {
            success: false,
            totalHours: 0,
            totalWords: 0,
            issues: ["Internal verification error detected"],
            itemDetails: []
        };
    }
}
