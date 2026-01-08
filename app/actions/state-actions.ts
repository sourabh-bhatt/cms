'use server';

import dbConnect from '@/lib/db';
import State from '@/lib/models/State';
import { revalidatePath } from 'next/cache';
import { logActivity, LogUserInfo } from '@/lib/actions/log-actions';

// --- State CRUD ---

export async function getAllStates() {
    await dbConnect();
    const states = await State.find({}).sort({ name: 1 });
    return JSON.parse(JSON.stringify(states));
}

export async function createState(data: { name: string; code: string; totalHours: number }, user?: LogUserInfo) {
    await dbConnect();
    try {
        const newState = await State.create(data);

        if (user) {
            await logActivity({
                user,
                category: 'state',
                action: 'state_created',
                description: `Created state: ${data.name} (${data.code})`,
                targetType: 'state',
                targetId: newState._id.toString(),
                targetName: data.name,
                metadata: { code: data.code, totalHours: data.totalHours }
            });
        }

        revalidatePath('/state-manager');
        return { success: true, state: JSON.parse(JSON.stringify(newState)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateStateStatus(code: string, status: string, user?: LogUserInfo) {
    await dbConnect();
    await State.findOneAndUpdate({ code: code.toUpperCase() }, { status });

    if (user) {
        await logActivity({
            user,
            category: 'state',
            action: 'state_updated',
            description: `Updated ${code} status to: ${status}`,
            targetType: 'state',
            targetName: code,
            metadata: { status }
        });
    }

    revalidatePath('/state-manager');
    return { success: true };
}

// --- Requirements Management ---

export async function updateStateRequirements(code: string, totalHours: number, topics: any[], user?: LogUserInfo) {
    await dbConnect();
    try {
        await State.findOneAndUpdate(
            { code: code.toUpperCase() },
            {
                totalHours,
                mandatoryTopics: topics
            }
        );

        if (user) {
            await logActivity({
                user,
                category: 'state',
                action: 'requirement_updated',
                description: `Updated requirements for: ${code}`,
                targetType: 'state',
                targetName: code,
                metadata: { totalHours, topicCount: topics.length }
            });
        }

        revalidatePath('/state-manager');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- CRM / Activity Log ---

export async function addStateActivity(code: string, activity: { type: string, summary: string, user: string }, logUser?: LogUserInfo) {
    await dbConnect();
    try {
        const state = await State.findOne({ code: code.toUpperCase() });
        if (!state) return { success: false, error: "State not found" };

        state.activityLog.push({ ...activity, date: new Date() });
        await state.save();

        if (logUser) {
            await logActivity({
                user: logUser,
                category: 'state',
                action: 'activity_logged',
                description: `Logged ${activity.type} for ${code}: ${activity.summary}`,
                targetType: 'state',
                targetName: code,
                metadata: { activityType: activity.type, summary: activity.summary }
            });
        }

        revalidatePath('/state-manager');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- Raw Source Management ---

export async function uploadStateResource(code: string, fileData: { name: string, type: string, size: number, base64: string }) {
    await dbConnect();
    try {
        const state = await State.findOne({ code: code.toUpperCase() });
        if (!state) return { success: false, error: "State not found" };

        const newSource = {
            name: fileData.name,
            type: fileData.type,
            size: (fileData.size / 1024 / 1024).toFixed(2) + ' MB',
            url: fileData.base64, // Storing base64 directly for prototype (use S3 in production)
            uploadedAt: new Date()
        };

        state.rawSources.push(newSource);
        await state.save();

        revalidatePath('/state-manager');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteStateResource(code: string, resourceId: string) {
    await dbConnect();
    try {
        await State.findOneAndUpdate(
            { code: code.toUpperCase() },
            { $pull: { rawSources: { _id: resourceId } } }
        );
        revalidatePath('/state-manager');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getStateDetails(code: string) {
    await dbConnect();
    const state = await State.findOne({ code: code.toUpperCase() });
    return state ? JSON.parse(JSON.stringify(state)) : null;
}
