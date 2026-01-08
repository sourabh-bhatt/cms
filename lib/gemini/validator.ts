
import { OutlineOutput, OutlineSection } from './types';

// Standard reading speed (Words Per Minute)
// 150 wpm = 9,000 words per hour
// This can be adjusted based on content density/complexity requirements.
const WORDS_PER_MINUTE = 150;

export interface ValidationContext {
    availableFiles: { name: string; wordCount?: number; type?: string }[];
}

export function validateAndFixOutline(output: OutlineOutput, context: ValidationContext): OutlineOutput {
    const { outline } = output;
    const { availableFiles } = context;

    // Create a lookup map for faster access
    const fileMap = new Map(availableFiles.map(f => [f.name, f]));

    let totalCourseMinutes = 0;
    const missingTopics: string[] = [];

    const validatedSections = outline.sections.map(section => {
        let sectionMinutes = 0;

        const validatedTopics = section.topics.map(topic => {
            // 1. Verify File Existence
            const fileNode = fileMap.get(topic.sourceFile);

            if (!fileNode) {
                missingTopics.push(topic.sourceFile);
                return {
                    ...topic,
                    sourceFile: `${topic.sourceFile} (MISSING)`,
                    estimatedMinutes: 0 // Cannot estimate time for missing file
                };
            }

            // 2. Validate/Fix Time Estimates
            let calculatedMinutes = topic.estimatedMinutes;

            // If we have a word count, strict math overrides the AI's guess
            if (fileNode.wordCount) {
                calculatedMinutes = Math.ceil(fileNode.wordCount / WORDS_PER_MINUTE);
                // Ensure at least 1 minute if file exists but is very short
                if (calculatedMinutes === 0) calculatedMinutes = 1;
            }

            sectionMinutes += calculatedMinutes;

            return {
                ...topic,
                estimatedMinutes: calculatedMinutes
            };
        });

        totalCourseMinutes += sectionMinutes;

        return {
            ...section,
            hours: Number((sectionMinutes / 60).toFixed(2)), // Update section hours
            topics: validatedTopics
        };
    });

    return {
        ...output,
        outline: {
            sections: validatedSections,
            totalHours: Number((totalCourseMinutes / 60).toFixed(2)) // Update course total
        },
        missingTopics: [...(output.missingTopics || []), ...missingTopics],
        reasoning: output.reasoning + `\n[System Validation]: Recalculated times based on ${WORDS_PER_MINUTE} WPM. Verified file existence.`
    };
}
