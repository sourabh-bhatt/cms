import { GeminiContext, OutlineSection } from './types';
import { getRequirementForState } from '@/lib/state-requirements';
import { FileNode } from '@/lib/file-system';

/**
 * Extract topic names from National Content file nodes
 */
export function extractFilenames(files: FileNode[]): string[] {
  const names: string[] = [];

  const recurse = (nodes: FileNode[]) => {
    for (const node of nodes) {
      if (node.type === 'file' && node.name.endsWith('.md')) {
        // Remove .md extension and clean up
        const cleanName = node.name.replace(/\.md$/, '').replace(/\.audited$/, '');
        names.push(cleanName);
      }
      if (node.children) {
        recurse(node.children);
      }
    }
  };

  recurse(files);
  return names;
}

/**
 * Build context for Outline generation
 */
export function buildOutlineContext(
  files: FileNode[],
  stateCode: string,
  targetHours: number,
  existingOutline?: OutlineSection[],
  userFeedback?: string
): GeminiContext {
  const filenames = extractFilenames(files);
  const stateReq = getRequirementForState(stateCode);

  return {
    filenames,
    stateCode,
    targetHours,
    mandatoryTopics: stateReq?.mandatoryTopics.map(t => t.name),
    existingOutline,
    userFeedback
  };
}

/**
 * Build context for Topic generation
 */
export function buildTopicContext(
  topicName: string,
  existingContent: string | undefined,
  stateCode: string,
  targetHours: number,
  userFeedback?: string
): GeminiContext {
  return {
    filenames: [topicName],
    stateCode,
    targetHours,
    existingTopic: existingContent ? {
      title: topicName,
      content: existingContent,
      keyPoints: [],
      estimatedReadTime: 0
    } : undefined,
    userFeedback
  };
}

/**
 * Generate the system prompt for outline creation
 */
export function getOutlineSystemPrompt(context: GeminiContext): string {
  return `You are a course curriculum designer for real estate pre-licensing education.

TASK: Create a structured course outline for ${context.stateCode} Pre-Licensing Course.

REQUIREMENTS:
- Target Hours: ${context.targetHours} hours total
- Must organize content into logical modules/sections
- Each topic should reference a source file from National Content
${context.mandatoryTopics ? `- Mandatory Topics to Include: ${context.mandatoryTopics.join(', ')}` : ''}

AVAILABLE NATIONAL CONTENT FILES (use these names as sourceFile references):
${context.filenames.slice(0, 100).join('\n')}
${context.filenames.length > 100 ? `\n... and ${context.filenames.length - 100} more files` : ''}

OUTPUT FORMAT:
Return a valid JSON object matching this schema.
CRITICAL: The "sourceFile" field MUST be one of the exact strings from the "AVAILABLE NATIONAL CONTENT FILES" list above. Do not invent filenames. If a suitable file is not found, omit the topic.

{
  "success": true,
  "outline": {
    "sections": [
      {
        "id": "unique-id",
        "title": "Module Title",
        "hours": 5.0,
        "topics": [
          {
            "id": "topic-id",
            "name": "Topic Name",
            "sourceFile": "EXACT_FILENAME_FROM_LIST",
            "estimatedMinutes": 30,
            "order": 1
          }
        ]
      }
    ],
    "totalHours": ${context.targetHours}
  },
  "missingTopics": ["Any mandatory topics not found in National Content"],
  "reasoning": "Brief explanation of structure decisions"
}`;
}

/**
 * Generate the system prompt for outline update
 */
export function getOutlineUpdatePrompt(context: GeminiContext): string {
  return `You are a course curriculum designer for real estate pre-licensing education.

TASK: Update/refine the existing course outline based on user feedback.

CURRENT OUTLINE:
${JSON.stringify(context.existingOutline, null, 2)}

USER FEEDBACK:
${context.userFeedback || 'No specific feedback provided - optimize for clarity and coverage.'}

REQUIREMENTS:
- Target Hours: ${context.targetHours} hours total
- Maintain references to National Content files
${context.mandatoryTopics ? `- Mandatory Topics: ${context.mandatoryTopics.join(', ')}` : ''}

OUTPUT FORMAT:
Return the updated outline as valid JSON matching the same schema as the original.`;
}

/**
 * Generate the system prompt for topic creation
 */
export function getTopicSystemPrompt(context: GeminiContext): string {
  const topicName = context.filenames[0] || 'New Topic';

  return `You are a real estate education content writer.

TASK: Generate educational content for the topic: "${topicName}"

CONTEXT:
- State: ${context.stateCode}
- Course Target: ${context.targetHours} hours

REQUIREMENTS:
- Write clear, educational content suitable for pre-licensing students
- Include key points and definitions
- Use markdown formatting
- Be concise but comprehensive

OUTPUT FORMAT:
Return a valid JSON object:
{
  "success": true,
  "topic": {
    "title": "${topicName}",
    "content": "# Topic Title\\n\\nMarkdown content here...",
    "keyPoints": ["Point 1", "Point 2"],
    "estimatedReadTime": 15
  },
  "citations": ["Any sources referenced"],
  "reasoning": "Brief explanation of content approach"
}`;
}

/**
 * Generate the system prompt for topic update
 */
export function getTopicUpdatePrompt(context: GeminiContext): string {
  return `You are a real estate education content writer.

TASK: Update/improve the existing topic content based on user feedback.

CURRENT CONTENT:
${context.existingTopic?.content || 'No existing content'}

USER FEEDBACK:
${context.userFeedback || 'No specific feedback - improve clarity and accuracy.'}

REQUIREMENTS:
- Maintain educational focus for ${context.stateCode} pre-licensing
- Preserve core information while addressing feedback
- Use markdown formatting

OUTPUT FORMAT:
Return the updated topic as valid JSON matching the original schema.`;
}

/**
 * Generate the system prompt for file selection (Step 1 of two-step generation)
 * This only sends filenames to Gemini to select which ones to include
 */
export function getFileSelectionPrompt(context: GeminiContext): string {
  const settings = (context as any).settings || {
    maxSections: 8,
    topicsPerSection: 5,
    targetHours: context.targetHours
  };

  const maxTopics = settings.maxSections * settings.topicsPerSection;

  return `You are a course curriculum designer for real estate pre-licensing education.

TASK: Select the most relevant files for a ${context.stateCode} Pre-Licensing Course.

REQUIREMENTS:
- Target Hours: ${context.targetHours} hours total
- Maximum Sections: ${settings.maxSections}
- Topics per Section: ${settings.topicsPerSection}
- Select approximately ${maxTopics} files total
${context.mandatoryTopics ? `- Must include topics covering: ${context.mandatoryTopics.join(', ')}` : ''}

AVAILABLE FILES (${context.filenames.length} total):
${context.filenames.join('\n')}

SELECTION CRITERIA:
1. Cover all mandatory topics for the state
2. Balance across different subject areas
3. Prefer foundational topics before advanced ones
4. Include practical application topics

OUTPUT FORMAT:
Return a valid JSON object:
{
  "success": true,
  "selectedFiles": ["Exact filename 1", "Exact filename 2", ...],
  "reasoning": "Brief explanation of selection strategy"
}

IMPORTANT: Return ONLY the JSON object, no additional text.`;
}

