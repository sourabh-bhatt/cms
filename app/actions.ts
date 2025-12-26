'use server';

import dbConnect from '@/lib/db';
import Content from '@/lib/models/Content';
import Resource from '@/lib/models/Resource';
import Course from '@/lib/models/Course';
import { revalidatePath } from 'next/cache';

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

export async function saveCourse(title: string, data: any) {
    await dbConnect();
    try {
        await Course.findOneAndUpdate(
            { title },
            { data },
            { upsert: true, new: true }
        );
        return { success: true };
    } catch (error) {
        console.error('Error saving course:', error);
        return { success: false, error: 'Failed to save course' };
    }
}

export async function getCourseList() {
    await dbConnect();
    try {
        const courses = await Course.find({}, 'title').lean();
        return courses.map((c: any) => c.title);
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

export async function deleteCourse(title: string) {
    await dbConnect();
    try {
        const res = await Course.findOneAndDelete({ title });
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

export async function uploadResource(formData: FormData) {
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

        await Resource.create({
            title: file.name,
            type,
            state,
            data: buffer,
            contentType: file.type || 'application/octet-stream',
            size: buffer.length
        });

        revalidatePath('/course-creator');
        return { success: true };
    } catch (error) {
        console.error('Error uploading resource:', error);
        return { success: false, error: 'Failed to upload resource' };
    }
}

export async function saveLinkResource(title: string, url: string, state: string) {
    await dbConnect();
    try {
        if (!title || !url || !state) {
            return { success: false, error: 'Missing title, url or state' };
        }

        await Resource.create({
            title,
            type: 'link',
            state,
            url
        });

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
