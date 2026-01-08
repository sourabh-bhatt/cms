import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logActivity } from '@/lib/actions/log-actions';

const JWT_SECRET = process.env.JWT_SECRET || 'course-creator-secret-key-change-in-production';

// POST /api/auth - Login
export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const { email, password, action } = await request.json();

        // Handle logout
        if (action === 'logout') {
            // Try to get user info from token for logging
            const token = request.cookies.get('auth_token')?.value;
            if (token) {
                try {
                    const decoded = jwt.verify(token, JWT_SECRET) as any;
                    await logActivity({
                        user: {
                            userId: decoded.userId,
                            userName: decoded.name,
                            userEmail: decoded.email
                        },
                        category: 'auth',
                        action: 'user_logout',
                        description: `User logged out: ${decoded.name}`
                    });
                } catch (e) {
                    // Token expired or invalid, skip logging
                }
            }

            const response = NextResponse.json({ success: true, message: 'Logged out' });
            response.cookies.set('auth_token', '', { maxAge: 0 });
            return response;
        }

        // Handle login
        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'Email and password required' },
                { status: 400 }
            );
        }

        // Find user with password field
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Check password using bcrypt directly
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return NextResponse.json(
                { success: false, error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Update last active using updateOne to bypass hooks
        await User.updateOne(
            { _id: user._id },
            { $set: { 'stats.lastActive': new Date() } }
        );

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Log successful login
        await logActivity({
            user: {
                userId: user._id.toString(),
                userName: user.name,
                userEmail: user.email
            },
            category: 'auth',
            action: 'user_login',
            description: `User logged in: ${user.name}`,
            metadata: { role: user.role }
        });

        // Set cookie
        const response = NextResponse.json({
            success: true,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                stats: user.stats,
                createdAt: user.createdAt
            }
        });

        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return response;

    } catch (error) {
        console.error('[Auth Error]', error);
        return NextResponse.json(
            { success: false, error: 'Authentication failed' },
            { status: 500 }
        );
    }
}

// GET /api/auth - Get current user
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET) as {
            userId: string;
            name: string;
            email: string;
            role: string;
        };

        await dbConnect();

        // Get fresh user data
        const user = await User.findById(decoded.userId);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                stats: user.stats,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('[Auth GET Error]', error);
        return NextResponse.json(
            { success: false, error: 'Invalid token' },
            { status: 401 }
        );
    }
}
