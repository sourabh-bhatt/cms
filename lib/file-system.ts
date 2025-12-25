
import fs from 'fs';
import path from 'path';

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
  try {
    const rootPath = NATIONAL_CONTENT_PATH;
    if (!fs.existsSync(rootPath)) {
      console.error('National content directory not found at:', rootPath);
      return [];
    }

    const nodes = await readDirectoryRecursive(rootPath);
    // Sort: Folders first, then files. Alphanumeric sort.
    return sortNodes(nodes);
  } catch (error) {
    console.error('Error reading national content:', error);
    return [];
  }
}

export async function getApprovedResourcesStructure(): Promise<FileNode[]> {
  try {
    // Check if path exists first, if not create it (safe fallback for demo)
    if (!fs.existsSync(APPROVED_RESOURCES_PATH)) {
      console.log('Creating approved resources dir at:', APPROVED_RESOURCES_PATH);
      await fs.promises.mkdir(APPROVED_RESOURCES_PATH, { recursive: true });
    }

    const nodes = await readDirectoryRecursive(APPROVED_RESOURCES_PATH);
    return sortNodes(nodes);
  } catch (error) {
    console.error('Error reading approved resources:', error);
    return [];
  }
}

async function readDirectoryRecursive(dirPath: string): Promise<FileNode[]> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  const nodes: FileNode[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    // Create a relative path from the app root or just use the name for display
    // We use the full path as ID for simplicity in checking uniqueness/reading

    if (entry.isDirectory()) {
      const children = await readDirectoryRecursive(fullPath);
      nodes.push({
        id: fullPath,
        name: entry.name,
        type: 'folder',
        path: fullPath,
        children: sortNodes(children),
      });
    } else {
      // Filter for markdown files if needed, or just include all
      if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx') || entry.name.endsWith('.pdf') || entry.name.endsWith('.link')) {
        nodes.push({
          id: fullPath,
          name: entry.name,
          type: 'file',
          path: fullPath,
        });
      }
    }
  }

  return nodes;
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return nodes.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    }
    return a.type === 'folder' ? -1 : 1;
  });
}
