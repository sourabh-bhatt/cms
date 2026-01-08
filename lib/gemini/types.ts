// Gemini Integration Types

export interface GeminiContext {
    // File references from National Content
    filenames: string[];

    // State-specific requirements
    stateCode: string;
    targetHours: number;
    mandatoryTopics?: string[];

    // Existing content (for updates)
    existingOutline?: OutlineSection[];
    existingTopic?: TopicContent;

    // User customization
    userFeedback?: string;
}

export interface OutlineSection {
    id: string;
    title: string;
    hours: number;
    topics: OutlineTopic[];
}

export interface OutlineTopic {
    id: string;
    name: string;
    sourceFile: string;
    estimatedMinutes: number;
    order: number;
}

export interface TopicContent {
    title: string;
    content: string;
    keyPoints: string[];
    estimatedReadTime: number;
}

// Structured Outputs
export interface OutlineOutput {
    success: boolean;
    outline: {
        sections: OutlineSection[];
        totalHours: number;
    };
    missingTopics?: string[];
    reasoning?: string;
}

export interface TopicOutput {
    success: boolean;
    topic: TopicContent;
    citations?: string[];
    reasoning?: string;
}

// File Selection Output (Step 1 of two-step generation)
export interface FileSelectionOutput {
    success: boolean;
    selectedFiles: string[];
    reasoning?: string;
}

// Logging
export interface GeminiLogEntry {
    id: string;
    timestamp: Date;
    type: 'user_action' | 'gemini_response';
    action: 'select_files' | 'create_outline' | 'update_outline' | 'create_topic' | 'update_topic';

    userInput?: {
        prompt: string;
        context: Partial<GeminiContext>;
    };

    geminiResponse?: {
        model: string;
        tokensUsed?: number;
        output: OutlineOutput | TopicOutput | FileSelectionOutput;
        processingTimeMs: number;
    };

    error?: string;
}

// API Request/Response
export interface GeminiRequest {
    action: 'select_files' | 'create_outline' | 'update_outline' | 'create_topic' | 'update_topic';
    context: GeminiContext;
    userPrompt?: string;
    settings?: OutlineSettings;
}

// Outline Generation Settings
export interface OutlineSettings {
    targetHours: number;
    maxSections: number;
    topicsPerSection: number;
    wordsPerTopic: number;
    maxFilesToRead: number;
    includeRawSources: boolean;
}

export interface GeminiResponse {
    success: boolean;
    data?: OutlineOutput | TopicOutput | FileSelectionOutput;
    error?: string;
    logId?: string;
}
