import mongoose, { Schema, Document } from 'mongoose';

// Gemini Log Entry for MongoDB persistence
export interface IGeminiLog extends Document {
    action: 'select_files' | 'create_outline' | 'update_outline' | 'create_topic' | 'update_topic';
    type: 'user_action' | 'gemini_response';

    // User input context
    userInput?: {
        prompt: string;
        filenames?: string[];
        stateCode?: string;
        targetHours?: number;
        settings?: {
            maxSections?: number;
            topicsPerSection?: number;
            wordsPerTopic?: number;
            maxFilesToRead?: number;
        };
    };

    // Gemini response data
    geminiResponse?: {
        model: string;
        tokensUsed?: number;
        selectedFiles?: string[];
        outline?: {
            sections: any[];
            totalHours: number;
        };
        topic?: any;
        processingTimeMs: number;
    };

    // Error tracking
    error?: string;

    // Metadata
    courseId?: string;
    userId?: string;

    createdAt: Date;
    updatedAt: Date;
}

const GeminiLogSchema = new Schema<IGeminiLog>(
    {
        action: {
            type: String,
            required: true,
            enum: ['select_files', 'create_outline', 'update_outline', 'create_topic', 'update_topic']
        },
        type: {
            type: String,
            required: true,
            enum: ['user_action', 'gemini_response']
        },
        userInput: {
            prompt: String,
            filenames: [String],
            stateCode: String,
            targetHours: Number,
            settings: {
                maxSections: Number,
                topicsPerSection: Number,
                wordsPerTopic: Number,
                maxFilesToRead: Number
            }
        },
        geminiResponse: {
            model: String,
            tokensUsed: Number,
            selectedFiles: [String],
            outline: {
                sections: Schema.Types.Mixed,
                totalHours: Number
            },
            topic: Schema.Types.Mixed,
            processingTimeMs: Number
        },
        error: String,
        courseId: String,
        userId: String
    },
    {
        timestamps: true
    }
);

// Index for faster queries
GeminiLogSchema.index({ createdAt: -1 });
GeminiLogSchema.index({ action: 1, createdAt: -1 });
GeminiLogSchema.index({ courseId: 1, createdAt: -1 });

export default mongoose.models.GeminiLog || mongoose.model<IGeminiLog>('GeminiLog', GeminiLogSchema);
