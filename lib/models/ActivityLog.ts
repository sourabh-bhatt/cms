import mongoose, { Schema, Document } from 'mongoose';

/**
 * Unified Activity Log Model
 * Tracks all user actions across the Course Creator application
 */

export type ActivityCategory =
    | 'course'      // Course create, save, delete
    | 'content'     // Content edit, delete, rename
    | 'resource'    // Resource upload, link, delete
    | 'gemini'      // AI outline, topic generation
    | 'state'       // State manager actions
    | 'auth'        // Login, logout
    | 'system';     // System events

export type ActivityAction =
    // Course actions
    | 'course_created' | 'course_saved' | 'course_deleted' | 'course_loaded'
    // Content actions
    | 'content_created' | 'content_updated' | 'content_deleted' | 'content_renamed'
    // Resource actions
    | 'resource_uploaded' | 'link_saved' | 'resource_deleted'
    // Gemini actions
    | 'outline_created' | 'outline_updated' | 'topic_generated' | 'content_verified'
    // State actions
    | 'state_created' | 'state_updated' | 'requirement_updated' | 'activity_logged' | 'source_uploaded' | 'source_deleted'
    // Auth actions
    | 'user_login' | 'user_logout'
    // Generic
    | 'custom' | 'verify_course';

export interface IActivityLog extends Document {
    // User who performed the action
    userId: string;
    userName: string;
    userEmail: string;

    // Action details
    category: ActivityCategory;
    action: ActivityAction;
    description: string;

    // Target entity (what was affected)
    targetType?: 'course' | 'content' | 'resource' | 'state' | 'outline' | 'topic';
    targetId?: string;
    targetName?: string;

    // Additional metadata
    metadata?: Record<string, any>;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
    {
        // User info - required for every log
        userId: { type: String, required: true, index: true },
        userName: { type: String, required: true },
        userEmail: { type: String, required: true },

        // Action info
        category: {
            type: String,
            required: true,
            enum: ['course', 'content', 'resource', 'gemini', 'state', 'auth', 'system'],
            index: true
        },
        action: {
            type: String,
            required: true,
            index: true
        },
        description: { type: String, required: true },

        // Target entity
        targetType: { type: String },
        targetId: { type: String },
        targetName: { type: String },

        // Flexible metadata
        metadata: { type: Schema.Types.Mixed }
    },
    {
        timestamps: true
    }
);

// Compound indexes for common queries
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ category: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
