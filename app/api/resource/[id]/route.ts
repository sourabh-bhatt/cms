
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Resource from '@/lib/models/Resource';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Params are promises in Next.js 15+ (and likely 16)
) {
    try {
        await dbConnect();
        const { id } = await params;

        const resource = await Resource.findById(id);

        if (!resource) {
            return new NextResponse('Resource not found', { status: 404 });
        }

        if (resource.type === 'link') {
            // Ideally redirect? Or return 404 as it is not a file?
            // User can open link url directly. This route is for files.
            return NextResponse.redirect(resource.url);
        }

        // It's a file (PDF)
        const headers = new Headers();
        headers.set('Content-Type', resource.contentType || 'application/octet-stream');
        headers.set('Content-Disposition', `inline; filename="${resource.title}"`);
        headers.set('Content-Length', resource.size?.toString() || '0');

        return new NextResponse(resource.data, {
            status: 200,
            headers,
        });

    } catch (error) {
        console.error('Error serving resource:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
