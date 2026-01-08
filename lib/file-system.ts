
import fs from 'fs';
import path from 'path';
import dbConnect from './db';
import Content from './models/Content';
import Resource from './models/Resource';

export type FileNode = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  metadata?: {
    wordCount?: number;
    size?: number;
    contentType?: string;
  };
};

const NATIONAL_CONTENT_PATH = path.join(process.cwd(), 'app/national_content');
const APPROVED_RESOURCES_PATH = path.join(process.cwd(), 'app/approved_resources');

export async function getNationalContentStructure(): Promise<FileNode[]> {
  await dbConnect();
  try {
    // 1. Check if DB needs migration
    const count = await Content.estimatedDocumentCount();
    if (count === 0) {
      console.log('Migrating National Content to MongoDB...');
      await migrateNationalContentRecursive(NATIONAL_CONTENT_PATH, '');
    }

    // 2. Query DB
    const allContent = await Content.find({}).lean();

    // 3. Build Tree
    return buildTree(allContent, 'national_content');
  } catch (error) {
    console.error('Error in getNationalContentStructure:', error);
    return [];
  }
}

export async function getApprovedResourcesStructure(): Promise<FileNode[]> {
  await dbConnect();
  try {
    const count = await Resource.estimatedDocumentCount();
    if (count === 0) {
      console.log('Migrating Resources to MongoDB...');
      await migrateResources(APPROVED_RESOURCES_PATH);
    }

    const allResources = await Resource.find({}).lean();
    return buildResourceTree(allResources);
  } catch (error) {
    console.error('Error in getApprovedResourcesStructure:', error);
    return [];
  }
}

// --- Migration Logic for Content ---
async function migrateNationalContentRecursive(dirPath: string, relativePath: string) {
  if (!fs.existsSync(dirPath)) return;

  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    // In DB we store "national_content/Section 1" etc.
    const dbPath = `national_content/${entryRelativePath}`;

    if (entry.isDirectory()) {
      // Create Folder Entry
      await Content.create({
        title: entry.name,
        type: 'folder',
        path: dbPath,
      });
      await migrateNationalContentRecursive(fullPath, entryRelativePath);
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      // Create File Entry
      const content = await fs.promises.readFile(fullPath, 'utf-8');
      await Content.create({
        title: entry.name,
        type: 'file',
        path: dbPath,
        content: content
      });
    }
  }
}

// --- Migration Logic for Resources ---
async function migrateResources(dirPath: string) {
  if (!fs.existsSync(dirPath)) return;

  // Structure: approved_resources / VT / file.pdf
  const states = await fs.promises.readdir(dirPath, { withFileTypes: true });

  for (const stateDir of states) {
    if (!stateDir.isDirectory()) continue;
    const state = stateDir.name;
    const statePath = path.join(dirPath, state);

    const files = await fs.promises.readdir(statePath, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(statePath, file.name);

      if (file.isDirectory()) continue; // Assuming flat structure inside state for now

      if (file.name.endsWith('.link')) {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        try {
          const json = JSON.parse(content);
          await Resource.create({
            title: json.title || file.name,
            type: 'link',
            state: state,
            url: json.url
          });
        } catch (e) { }
      } else if (file.name.endsWith('.pdf')) {
        const buffer = await fs.promises.readFile(filePath);
        await Resource.create({
          title: file.name, // Keep extension for now or strip it?
          type: 'pdf',
          state: state,
          data: buffer,
          contentType: 'application/pdf',
          size: buffer.length
        });
      }
    }
  }
}

// --- Tree Building Logic ---

function buildTree(items: any[], rootPrefix: string): FileNode[] {
  const root: FileNode[] = [];
  const map = new Map<string, FileNode>();

  // First, map all items
  items.forEach(item => {
    // Calculate word count for files
    let wordCount = 0;
    if (item.type === 'file' && item.content) {
      // Simple word count: split by whitespace
      wordCount = item.content.trim().split(/\s+/).length;
    }

    const node: FileNode = {
      id: item._id.toString(),
      name: item.title,
      type: item.type,
      path: item.path,
      metadata: {
        wordCount: wordCount
      },
      children: item.type === 'folder' ? [] : undefined
    };
    map.set(item.path, node);
  });

  // Determine relationships
  items.forEach(item => {
    const node = map.get(item.path);
    if (!node) return;

    // Parent path: "national_content/A/B" -> "national_content/A"
    const parts = item.path.split('/');
    if (parts.length > 2) {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = map.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      } else {
        root.push(node);
      }
    } else {
      root.push(node);
    }
  });

  return sortNodes(root);
}

function buildResourceTree(resources: any[]): FileNode[] {
  // Group by state
  const states = [...new Set(resources.map(r => r.state))];
  const nodes: FileNode[] = states.map(state => {
    const stateResources = resources.filter(r => r.state === state);
    return {
      id: `state-${state}`,
      name: state,
      type: 'folder' as const,
      path: `state-${state}`,
      children: stateResources.map(r => ({
        id: r._id.toString(),
        name: r.title,
        type: 'file' as const,
        path: r._id.toString(),
        metadata: {
          size: r.size,
          contentType: r.contentType,
          // Estimate word count for now if not available, or just leave it undefined
          // and let context builder handle it?
          // For now, let's leave wordCount undefined for resources unless they are text.
        }
      })).sort((a, b) => a.name.localeCompare(b.name))
    }
  });
  return nodes.sort((a, b) => a.name.localeCompare(b.name));
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return nodes.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    }
    return a.type === 'folder' ? -1 : 1;
  });
}
