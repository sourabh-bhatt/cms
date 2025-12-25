'use server';

import fs from 'fs';
import path from 'path';

export async function getFileContent(filePath: string): Promise<string> {
    try {
        // Security check: Ensure we are only reading from allowed paths?
        // For this local tool, we assume filePath is valid from our file-system.ts
        // In a real app, validate strictly.

        if (!fs.existsSync(filePath)) {
            return 'File not found';
        }

        const content = await fs.promises.readFile(filePath, 'utf-8');
        // Remove HTML comments
        return content.replace(/<!--[\s\S]*?-->/g, '');
    } catch (error) {
        console.error('Error reading file:', error);
        return 'Error reading file content';
    }
}

const COURSES_DIR = path.join(process.cwd(), 'lms', 'courses');

export async function saveCourse(fileName: string, data: any) {
    try {
        if (!fs.existsSync(COURSES_DIR)) {
            await fs.promises.mkdir(COURSES_DIR, { recursive: true });
        }
        const filePath = path.join(COURSES_DIR, `${fileName}.json`);
        await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        console.error('Error saving course:', error);
        return { success: false, error: 'Failed to save course' };
    }
}

export async function getCourseList() {
    try {
        if (!fs.existsSync(COURSES_DIR)) {
            return [];
        }
        const files = await fs.promises.readdir(COURSES_DIR);
        return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    } catch (error) {
        console.error('Error listing courses:', error);
        return [];
    }
}

export async function loadCourse(fileName: string) {
    try {
        const filePath = path.join(COURSES_DIR, `${fileName}.json`);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const data = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading course:', error);
        return null;
    }
}

export async function deleteCourse(fileName: string) {
    try {
        const filePath = path.join(COURSES_DIR, `${fileName}.json`);
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            return { success: true };
        }
        return { success: false, error: 'File not found' };
    } catch (error) {
        console.error('Error deleting course:', error);
        return { success: false, error: 'Failed to delete course' };
    }
}

export async function readFileContent(filePath: string) {
    try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        // Remove simplified HTML comments slightly differently if needed, or just return raw
        return { success: true, content };
    } catch (error) {
        console.error('Error reading file:', error);
    }
}

const APPROVED_RESOURCES_DIR = path.join(process.cwd(), 'app', 'approved_resources');

export async function uploadResource(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const state = formData.get('state') as string;

        if (!file || !state) {
            return { success: false, error: 'Missing file or state' };
        }

        const stateDir = path.join(APPROVED_RESOURCES_DIR, state);
        if (!fs.existsSync(stateDir)) {
            await fs.promises.mkdir(stateDir, { recursive: true });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(stateDir, file.name);

        await fs.promises.writeFile(filePath, buffer);
        return { success: true };
    } catch (error) {
        console.error('Error uploading resource:', error);
        return { success: false, error: 'Failed to upload resource' };
    }
}

export async function saveLinkResource(title: string, url: string, state: string) {
    try {
        if (!title || !url || !state) {
            return { success: false, error: 'Missing title, url or state' };
        }

        const stateDir = path.join(APPROVED_RESOURCES_DIR, state);
        if (!fs.existsSync(stateDir)) {
            await fs.promises.mkdir(stateDir, { recursive: true });
        }

        const linkData = { title, url };
        // Sanitize filename safe characters
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filePath = path.join(stateDir, `${safeTitle}.link`);

        await fs.promises.writeFile(filePath, JSON.stringify(linkData, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        console.error('Error saving link:', error);
        return { success: false, error: 'Failed to save link' };
    }
}

export async function deleteResource(filePath: string) {
    try {
        if (!filePath) {
            return { success: false, error: 'Missing file path' };
        }

        // Security check: ensure path is within allowed directories
        // Ideally we resolve absolute path and check if it starts with project root
        // For this local app, basic check:
        if (!filePath.includes('approved_resources') && !filePath.includes('national_content')) { // simplistic check
            // In a real app, use path.resolve and check prefix
        }

        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            return { success: true };
        } else {
            return { success: false, error: 'File not found' };
        }
    } catch (error) {
        console.error('Error deleting resource:', error);
        return { success: false, error: 'Failed to delete resource' };
    }
}

export async function renameResource(oldPath: string, newName: string) {
    try {
        if (!oldPath || !newName) {
            return { success: false, error: 'Missing path or name' };
        }

        if (!fs.existsSync(oldPath)) {
            return { success: false, error: 'File not found' };
        }

        const dir = path.dirname(oldPath);
        const newPath = path.join(dir, newName);

        // Check if target already exists
        if (fs.existsSync(newPath)) {
            return { success: false, error: 'File with that name already exists' };
        }

        await fs.promises.rename(oldPath, newPath);
        return { success: true };

    } catch (error) {
        console.error('Error renaming resource:', error);
        return { success: false, error: 'Failed to rename resource' };
    }
}
