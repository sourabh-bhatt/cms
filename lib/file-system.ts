
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
  // items have 'path' like "national_content/Folder/File.md"
  // We need to reconstruct the hierarchy.
  // A naive approach: direct mapping might be hard because we need to next them.
  // Better: Sort by path length?
  // Or: Convert to map.

  const root: FileNode[] = [];
  const map = new Map<string, FileNode>();

  // Sort by path length to ensure parents exist? 
  // Actually we stored folders explicitly.

  // First, map all items
  items.forEach(item => {
    const node: FileNode = {
      id: item._id.toString(),
      name: item.title,
      type: item.type,
      path: item.path, // Store the DB path ID (virtual path) or _id? 
      // Sidebar expects 'path' to be usable for actions.
      // Let's use the DB ID as the unique identifier for actions,
      // BUT sidebar might use path for display.
      // Actually, let's use the item._id as the path for FUTURE actions to identify the DB record.
      children: item.type === 'folder' ? [] : undefined
    };
    // We use path field for hierarchy logic, but expose _id as path for actions to work seamlessly
    map.set(item.path, node);
  });

  // Determine relationships
  items.forEach(item => {
    const node = map.get(item.path);
    if (!node) return;

    // Parent path: "national_content/A/B" -> "national_content/A"
    const parts = item.path.split('/');
    if (parts.length > 2) { // "national_content" is root-ish, but parts[0] is national_content
      // e.g. national_content/folder1
      const parentPath = parts.slice(0, -1).join('/');
      const parent = map.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      } else {
        // If parent doesn't exist (maybe missed?), add to root?
        // Or maybe "national_content" itself is a folder?
        // In migration, we started with children of national_content. 
        // We didn't create a 'national_content' folder record.
        // So "national_content/folder1" -> parent "national_content" (missing).
        // So these are top level.
        root.push(node);
      }
    } else {
      // "national_content/file.md" -> length 2. Parent is national_content. Top level.
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
        type: 'file' as const, // logic for sidebar icon?
        // For PDF, we want the sidebar to know it's a PDF.
        // Sidebar checks extension: .props.node.name.endsWith('.pdf')
        // So ensure name has extension if needed, or update sidebar.
        // Let's ensure name has extension or fake it.
        path: r._id.toString(), // Use DB ID.
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
