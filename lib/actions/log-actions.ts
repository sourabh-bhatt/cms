'use server';

import dbConnect from '@/lib/db';
import ActivityLog, { ActivityCategory, ActivityAction } from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';

export interface LogUserInfo {
    userId: string;
    userName: string;
    userEmail: string;
}

export interface LogActivityParams {
    user: LogUserInfo;
    category: ActivityCategory;
    action: ActivityAction;
    description: string;
    targetType?: 'course' | 'content' | 'resource' | 'state' | 'outline' | 'topic';
    targetId?: string;
    targetName?: string;
    metadata?: Record<string, any>;
}

/**
 * Log an activity to the database
 * This is the main function to track user actions
 */
export async function logActivity(params: LogActivityParams) {
    await dbConnect();
    try {
        const log = await ActivityLog.create({
            userId: params.user.userId,
            userName: params.user.userName,
            userEmail: params.user.userEmail,
            category: params.category,
            action: params.action,
            description: params.description,
            targetType: params.targetType,
            targetId: params.targetId,
            targetName: params.targetName,
            metadata: params.metadata
        });

        return { success: true, logId: log._id.toString() };
    } catch (error: any) {
        console.error('Failed to log activity:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get recent activity logs with pagination
 */
export async function getActivityLogs(options?: {
    limit?: number;
    offset?: number;
    userId?: string;
    category?: ActivityCategory;
    startDate?: Date;
    endDate?: Date;
}) {
    await dbConnect();
    try {
        const limit = options?.limit || 50;
        const offset = options?.offset || 0;

        const query: any = {};

        if (options?.userId) {
            query.userId = options.userId;
        }
        if (options?.category) {
            query.category = options.category;
        }
        if (options?.startDate || options?.endDate) {
            query.createdAt = {};
            if (options.startDate) query.createdAt.$gte = options.startDate;
            if (options.endDate) query.createdAt.$lte = options.endDate;
        }

        const [logs, total] = await Promise.all([
            ActivityLog.find(query)
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit)
                .lean(),
            ActivityLog.countDocuments(query)
        ]);

        return {
            success: true,
            logs: JSON.parse(JSON.stringify(logs)),
            total,
            hasMore: offset + logs.length < total
        };
    } catch (error: any) {
        console.error('Failed to get activity logs:', error);
        return { success: false, error: error.message, logs: [], total: 0 };
    }
}

/**
 * Get activity summary (counts by category for a user)
 */
export async function getActivitySummary(userId?: string) {
    await dbConnect();
    try {
        const match = userId ? { userId } : {};

        const summary = await ActivityLog.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    lastActivity: { $max: '$createdAt' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const total = await ActivityLog.countDocuments(match);

        return {
            success: true,
            summary: summary.map(s => ({
                category: s._id,
                count: s.count,
                lastActivity: s.lastActivity
            })),
            total
        };
    } catch (error: any) {
        console.error('Failed to get activity summary:', error);
        return { success: false, error: error.message, summary: [], total: 0 };
    }
}

/**
 * Delete old logs (older than X days)
 * Useful for maintenance
 */
export async function cleanupOldLogs(daysOld: number = 90) {
    await dbConnect();
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await ActivityLog.deleteMany({
            createdAt: { $lt: cutoffDate }
        });

        return { success: true, deleted: result.deletedCount };
    } catch (error: any) {
        console.error('Failed to cleanup old logs:', error);
        return { success: false, error: error.message };
    }
}
