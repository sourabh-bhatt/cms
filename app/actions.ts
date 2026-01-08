'use server';

import dbConnect from '@/lib/db';
import Content from '@/lib/models/Content';
import Resource from '@/lib/models/Resource';
import Course from '@/lib/models/Course';
import { revalidatePath } from 'next/cache';
import { getRequirementForState } from '@/lib/state-requirements';
import { logActivity, LogUserInfo } from '@/lib/actions/log-actions';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// Helper to check if string is ObjectId
const isObjectId = (str: string) => /^[0-9a-fA-F]{24}$/.test(str);

export async function getFileContent(idOrPath: string): Promise<string> {
    await dbConnect();
    try {
        // Try Resource first (by ID)
        if (isObjectId(idOrPath)) {
            const resource = await Resource.findById(idOrPath);
            if (resource) {
                if (resource.type === 'link') {
                    // Return JSON for link editing
                    return JSON.stringify({ title: resource.title, url: resource.url });
                }
                // For PDF/File, user logic is to open in new tab via separate link.
                // This function might be called for preview?
                // Returning null or message if not text.
                return 'Binary content';
            }
            // Try Content by ID (if we switched to IDs)
            const contentById = await Content.findById(idOrPath);
            if (contentById) return contentById.content || '';
        }

        // Try Content by Path
        const contentByPath = await Content.findOne({ path: idOrPath });
        if (contentByPath) {
            return contentByPath.content || '';
        }

        return 'File not found';
    } catch (error) {
        console.error('Error reading file:', error);
        return 'Error reading file content';
    }
}

export async function saveCourse(title: string, data: any, user?: LogUserInfo) {
    await dbConnect();
    try {
        await Course.findOneAndUpdate(
            { title },
            { data },
            { upsert: true, new: true }
        );

        // Log the activity if user info provided
        if (user) {
            await logActivity({
                user,
                category: 'course',
                action: 'course_saved',
                description: `Saved course: ${title}`,
                targetType: 'course',
                targetName: title
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Error saving course:', error);
        return { success: false, error: 'Failed to save course' };
    }
}

export async function getCourseList() {
    await dbConnect();
    try {
        const courses = await Course.find({}, 'title updatedAt').sort({ updatedAt: -1 }).lean();
        return courses.map((c: any) => ({
            title: c.title,
            updatedAt: c.updatedAt
        }));
    } catch (error) {
        console.error('Error listing courses:', error);
        return [];
    }
}

export async function loadCourse(title: string) {
    await dbConnect();
    try {
        const course = await Course.findOne({ title }).lean();
        return course ? course.data : null;
    } catch (error) {
        console.error('Error loading course:', error);
        return null;
    }
}

export async function deleteCourse(title: string, user?: LogUserInfo) {
    await dbConnect();
    try {
        const res = await Course.findOneAndDelete({ title });

        if (res && user) {
            await logActivity({
                user,
                category: 'course',
                action: 'course_deleted',
                description: `Deleted course: ${title}`,
                targetType: 'course',
                targetName: title
            });
        }

        return { success: !!res };
    } catch (error) {
        console.error('Error deleting course:', error);
        return { success: false, error: 'Failed to delete course' };
    }
}

export async function readFileContent(idOrPath: string) {
    // Wrapper for consistency
    const content = await getFileContent(idOrPath);
    return { success: content !== 'Error reading file content', content };
}

export async function uploadResource(formData: FormData, user?: LogUserInfo) {
    await dbConnect();
    try {
        const file = formData.get('file') as File;
        const state = formData.get('state') as string; // 'VT', etc.

        if (!file || !state) {
            return { success: false, error: 'Missing file or state' };
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Check if PDF or other
        let type = 'file';
        if (file.name.toLowerCase().endsWith('.pdf')) type = 'pdf';

        const resource = await Resource.create({
            title: file.name,
            type,
            state,
            data: buffer,
            contentType: file.type || 'application/octet-stream',
            size: buffer.length
        });

        if (user) {
            await logActivity({
                user,
                category: 'resource',
                action: 'resource_uploaded',
                description: `Uploaded resource: ${file.name}`,
                targetType: 'resource',
                targetId: resource._id.toString(),
                targetName: file.name,
                metadata: { state, type, size: buffer.length }
            });
        }

        revalidatePath('/course-creator');
        return { success: true };
    } catch (error) {
        console.error('Error uploading resource:', error);
        return { success: false, error: 'Failed to upload resource' };
    }
}

export async function saveLinkResource(title: string, url: string, state: string, user?: LogUserInfo) {
    await dbConnect();
    try {
        if (!title || !url || !state) {
            return { success: false, error: 'Missing title, url or state' };
        }

        const resource = await Resource.create({
            title,
            type: 'link',
            state,
            url
        });

        if (user) {
            await logActivity({
                user,
                category: 'resource',
                action: 'link_saved',
                description: `Saved link: ${title}`,
                targetType: 'resource',
                targetId: resource._id.toString(),
                targetName: title,
                metadata: { url, state }
            });
        }

        revalidatePath('/course-creator');
        return { success: true };
    } catch (error) {
        console.error('Error saving link:', error);
        return { success: false, error: 'Failed to save link' };
    }
}

export async function deleteResource(idOrPath: string) {
    await dbConnect();
    try {
        if (isObjectId(idOrPath)) {
            // Try Resource First
            const delRes = await Resource.findByIdAndDelete(idOrPath);
            if (delRes) {
                revalidatePath('/course-creator');
                return { success: true };
            }
            // Try Content ID
            const delCont = await Content.findByIdAndDelete(idOrPath);
            // If it was a folder, we should delete children too... 
            // For now, simple delete. User said "every single thing can be saved... updated... deleted".
            // Implementing recursive delete if it was a folder is better.
            if (delCont && delCont.type === 'folder') {
                await Content.deleteMany({ path: { $regex: `^${delCont.path}/` } });
            }
            if (delCont) {
                revalidatePath('/course-creator');
                return { success: true };
            }
        }

        // Try Path (Content)
        const delContByPath = await Content.findOneAndDelete({ path: idOrPath });
        if (delContByPath) {
            if (delContByPath.type === 'folder') {
                await Content.deleteMany({ path: { $regex: `^${delContByPath.path}/` } });
            }
            revalidatePath('/course-creator');
            return { success: true };
        }

        return { success: false, error: 'File not found' };
    } catch (error) {
        console.error('Error deleting resource:', error);
        return { success: false, error: 'Failed to delete resource' };
    }
}

export async function renameResource(idOrPath: string, newName: string) {
    await dbConnect();
    try {
        if (isObjectId(idOrPath)) {
            // Resource
            const res = await Resource.findByIdAndUpdate(idOrPath, { title: newName }, { new: true });
            if (res) {
                revalidatePath('/course-creator');
                return { success: true };
            }
            // Content ID
            const cont = await Content.findById(idOrPath);
            if (cont) {
                // Update path logic is complex for folders. 
                // path: "root/oldname" -> "root/newname"
                // And all children "root/oldname/..." -> "root/newname/..."
                const oldPath = cont.path;
                const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
                const newPath = parentPath ? `${parentPath}/${newName}` : newName;

                await Content.updateOne({ _id: idOrPath }, { title: newName, path: newPath });

                // Update children
                if (cont.type === 'folder') {
                    // Regex to replace prefix
                    // This is tricky in one go. Fetch and update loop is safer for now or aggregation.
                    const children = await Content.find({ path: { $regex: `^${oldPath}/` } });
                    for (const child of children) {
                        const childNewPath = child.path.replace(oldPath, newPath);
                        await Content.updateOne({ _id: child._id }, { path: childNewPath });
                    }
                }
                revalidatePath('/course-creator');
                return { success: true };
            }
        }

        // Path (Content)
        const cont = await Content.findOne({ path: idOrPath });
        if (cont) {
            // Same logic as above
            const oldPath = cont.path;
            const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
            const newPath = parentPath ? `${parentPath}/${newName}` : newName;

            await Content.updateOne({ _id: cont._id }, { title: newName, path: newPath });

            if (cont.type === 'folder') {
                const children = await Content.find({ path: { $regex: `^${oldPath}/` } });
                for (const child of children) {
                    const childNewPath = child.path.replace(oldPath, newPath);
                    await Content.updateOne({ _id: child._id }, { path: childNewPath });
                }
            }
            revalidatePath('/course-creator');
            return { success: true };
        }

        return { success: false, error: 'Resource not found' };

    } catch (error) {
        console.error('Error renaming resource:', error);
        return { success: false, error: 'Failed to rename resource' };
    }
}

// --- AI Course Actions (SaaS Grade) ---

export async function generateAIContent(topicName: string, requirements: string, context?: string) {
    if (!GEMINI_API_KEY) return { success: false, error: "API Key missing" };

    try {
        const prompt = `You are a real estate course content creator. Generate a professional education module for the topic: "${topicName}". 
        Requirements: ${requirements}
        ${context ? `Use the following source material context: ${context}` : ''}
        Format in Markdown. 
        Focus on clarity, legal accuracy, and engagement.`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const content = data.candidates[0].content.parts[0].text;

        return { success: true, content };
    } catch (error) {
        console.error("AI Generation failed:", error);
        return { success: false, error: "AI Generation failed" };
    }
}

export async function verifyAIAccuracy(content: string, rawSource: string) {
    if (!GEMINI_API_KEY) return { success: false, error: "API Key missing" };

    try {
        const prompt = `Audit this real estate course content for accuracy against the following raw source material.
        
        CONTENT TO AUDIT:
        ${content}
        
        RAW SOURCE MATERIAL:
        ${rawSource}
        
        Identify any discrepancies, missing legal requirements, or factual errors. 
        Return your findings as a professional audit report with citations.`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const feedback = data.candidates[0].content.parts[0].text;

        return {
            success: true,
            isAccurate: !feedback.toLowerCase().includes('discrepancy') && !feedback.toLowerCase().includes('error'),
            feedback,
            citations: []
        };
    } catch (error) {
        console.error("AI Audit failed:", error);
        return { success: false, error: "AI Audit failed" };
    }
}

export async function generateAIQuiz(topicContent: string) {
    if (!GEMINI_API_KEY) return { success: false, error: "API Key missing" };

    try {
        const prompt = `Based on this real estate course content: "${topicContent}", generate 5 multiple choice questions. 
        Format as a JSON array of objects:
        [
          { 
            "id": "q1",
            "question": "...", 
            "options": ["A", "B", "C", "D"], 
            "correctAnswer": 0, 
            "explanation": "..." 
          }
        ]
        ONLY return the JSON array, no other text.`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        let text = data.candidates[0].content.parts[0].text;
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const questions = JSON.parse(text);

        return { success: true, questions };
    } catch (error) {
        console.error("Quiz Gen Error:", error);
        return { success: false, error: "AI Quiz Generation failed" };
    }
}

// --- State Asset Retrieval ---

export async function getResourceBinary(id: string) {
    await dbConnect();
    try {
        const resource = await Resource.findById(id).lean();
        if (!resource || !resource.data) return null;

        // Convert Buffer to base64 for Transfer over the wire
        return {
            success: true,
            data: resource.data.toString('base64'),
            title: resource.title,
            contentType: resource.contentType || 'application/pdf'
        };
    } catch (error) {
        return { success: false, error: 'Failed to fetch resource binary' };
    }
}

export async function findStateAssets(state: string) {
    await dbConnect();
    try {
        const resources = await Resource.find({ state }).lean();

        // Simple heuristic: find "Resume" or "Certificate" in titles
        const resume = resources.find(r => r.title.toLowerCase().includes('resume'));
        const certificate = resources.find(r => r.title.toLowerCase().includes('certificate') || r.title.toLowerCase().includes('cert'));

        return {
            success: true,
            resume: resume ? { id: resume._id.toString(), title: resume.title } : null,
            certificate: certificate ? { id: certificate._id.toString(), title: certificate.title } : null
        };
    } catch (error) {
        return { success: false, error: 'Failed to find state assets' };
    }
}
