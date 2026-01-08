import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Content from '@/lib/models/Content';

// API endpoint to clear and re-migrate National Content
export async function POST() {
    try {
        await dbConnect();

        // Clear all existing content
        const deleteResult = await Content.deleteMany({});
        console.log(`Deleted ${deleteResult.deletedCount} Content documents`);

        return NextResponse.json({
            success: true,
            message: `Cleared ${deleteResult.deletedCount} cached items. Refresh the page to re-migrate from disk.`,
            deletedCount: deleteResult.deletedCount
        });
    } catch (error) {
        console.error('Error clearing content cache:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'POST to this endpoint to clear the National Content cache'
    });
}
