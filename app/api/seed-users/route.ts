import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

// POST /api/seed-users - Seed the 3 admin users
export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const users = [
            { name: 'Sourabh', email: 'sourabh@bluesky.com', password: 'sourabh@123', role: 'admin' },
            { name: 'Kaveh', email: 'kaveh@bluesky.com', password: 'kaveh@123', role: 'admin' },
            { name: 'Ayush', email: 'ayush@bluesky.com', password: 'ayush@123', role: 'admin' }
        ];

        const results = [];

        for (const userData of users) {
            // Check if user exists
            const existing = await User.findOne({ email: userData.email });

            if (existing) {
                results.push({ email: userData.email, status: 'exists' });
                continue;
            }

            // Hash password manually
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.password, salt);

            // Create user with pre-hashed password using insertOne to bypass hooks
            const result = await User.collection.insertOne({
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
                role: userData.role,
                stats: {
                    coursesCreated: 0,
                    outlinesGenerated: 0,
                    topicsEdited: 0,
                    lastActive: new Date()
                },
                createdAt: new Date(),
                updatedAt: new Date()
            });

            results.push({ email: userData.email, status: 'created', id: result.insertedId.toString() });
        }

        return NextResponse.json({
            success: true,
            results,
            message: 'Users seeded successfully!'
        });

    } catch (error) {
        console.error('[Seed Users Error]', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to seed users'
        }, { status: 500 });
    }
}

// GET /api/seed-users - List all users (for verification)
export async function GET() {
    try {
        await dbConnect();

        const users = await User.find({}).select('-password').lean();

        return NextResponse.json({
            success: true,
            count: users.length,
            users: users.map((u: any) => ({
                id: u._id.toString(),
                name: u.name,
                email: u.email,
                role: u.role,
                stats: u.stats,
                createdAt: u.createdAt
            }))
        });

    } catch (error) {
        console.error('[List Users Error]', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list users'
        }, { status: 500 });
    }
}
