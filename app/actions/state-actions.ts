'use server';

import dbConnect from '@/lib/db';
import State from '@/lib/models/State';
import { revalidatePath } from 'next/cache';

// --- State CRUD ---

export async function getAllStates() {
    await dbConnect();
    const states = await State.find({}).sort({ name: 1 });
    return JSON.parse(JSON.stringify(states));
}

export async function createState(data: { name: string; code: string; totalHours: number }) {
    await dbConnect();
    try {
        const newState = await State.create(data);
        revalidatePath('/state-manager');
        return { success: true, state: JSON.parse(JSON.stringify(newState)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateStateStatus(code: string, status: string) {
    await dbConnect();
    await State.findOneAndUpdate({ code: code.toUpperCase() }, { status });
    revalidatePath('/state-manager');
    return { success: true };
}

// --- Requirements Management ---

export async function updateStateRequirements(code: string, totalHours: number, topics: any[]) {
    await dbConnect();
    try {
        await State.findOneAndUpdate(
            { code: code.toUpperCase() },
            {
                totalHours,
                mandatoryTopics: topics
            }
        );
        revalidatePath('/state-manager');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- CRM / Activity Log ---

export async function addStateActivity(code: string, activity: { type: string, summary: string, user: string }) {
    await dbConnect();
    try {
        const state = await State.findOne({ code: code.toUpperCase() });
        if (!state) return { success: false, error: "State not found" };

        state.activityLog.push({ ...activity, date: new Date() });
        await state.save();

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
