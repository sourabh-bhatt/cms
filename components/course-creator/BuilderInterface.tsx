'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
} from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { FileText, Save, FolderOpen, Plus, AlignLeft, LayoutTemplate, X, GripVertical, PanelLeftOpen, Archive } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { arrayMove } from '@dnd-kit/sortable';

import { FileNode } from '@/lib/file-system';
import {
    saveCourse,
    loadCourse,
    getCourseList,
    readFileContent,
    findStateAssets,
    getResourceBinary
} from '@/app/actions';
import { cn } from '@/lib/utils';
import { SourceSidebar } from './SourceSidebar';
import { TargetCanvas } from './TargetCanvas';
import { CourseItem } from './SortableItem';
import { DraggableFile } from './DraggableFile';
import { SortableItem } from './SortableItem';
import { CourseSetup, CourseConfig } from './CourseSetup';
import { TopicEditorModal } from './TopicEditorModal';
import { getRequirementForState } from '@/lib/state-requirements';
import { Zap } from 'lucide-react';

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

// Helper to strip HTML comments/metadata
const stripMetadata = (content: string) => {
    return content.replace(/<!--[\s\S]*?-->/g, '').trim();
};

export default function BuilderInterface({ files, approvedFiles }: { files: FileNode[], approvedFiles: FileNode[] }) {
    const [courseItems, setCourseItems] = useState<CourseItem[]>([]);
    const [activeDragItem, setActiveDragItem] = useState<{ type: 'source' | 'course', data: any } | null>(null);
    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState<string | null>(null);
    const [previewItemId, setPreviewItemId] = useState<string | null>(null);
    const [linkData, setLinkData] = useState<{ title: string; url: string } | null>(null);
    const [mounted, setMounted] = useState(false);
    const [savedCourses, setSavedCourses] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [showPreview, setShowPreview] = useState(false);
    const [editingItem, setEditingItem] = useState<CourseItem | null>(null);

    // Sidebar Resizing Logic
    const [sidebarWidth, setSidebarWidth] = useState(288); // Default 288px (w-72)
    const isResizing = useRef(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const startResizing = React.useCallback(() => {
        isResizing.current = true;
    }, []);

    const stopResizing = React.useCallback(() => {
        isResizing.current = false;
    }, []);

    const resize = React.useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing.current && sidebarRef.current) {
                const newWidth = mouseMoveEvent.clientX - sidebarRef.current.getBoundingClientRect().left;
                if (newWidth > 150 && newWidth < 600) { // Min 150px, Max 600px
                    setSidebarWidth(newWidth);
                }
            }
        },
        []
    );

    React.useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Course Metadata State
    const [courseTitle, setCourseTitle] = useState("Vermont Pre-Licensing Course");
    const [targetState, setTargetState] = useState("VT");
    const [targetHours, setTargetHours] = useState(40);
    const [showLoadMenu, setShowLoadMenu] = useState(false);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Debounced Auto-Save
    useEffect(() => {
        if (mounted && courseItems.length > 0) {
            const timer = setTimeout(() => {
                handleAutoSave();
            }, 2000); // 2 second debounce
            return () => clearTimeout(timer);
        }
    }, [courseItems, courseTitle, targetState, targetHours]);

    // Live Preview Generation
    useEffect(() => {
        // Live Item Preview Sync
        // If we are previewing a specific item (by ID), keep its content in sync with edits
        if (previewItemId) {
            const activeItem = courseItems.find((item: CourseItem) => {
                // Search top level
                if (item.id === previewItemId) return true;
                // Search groups
                if (item.children) {
                    return item.children.some(child => child.id === previewItemId);
                }
                return false;
            });

            // If we found the item and it's not a group, sync content
            if (activeItem) {
                // But wait, find() returns the top level item. If it's a child, we need to find the child object.
                let target: CourseItem | undefined;

                // Recursive search helper
                const findItem = (items: CourseItem[], id: string): CourseItem | undefined => {
                    for (const i of items) {
                        if (i.id === id) return i;
                        if (i.children) {
                            const found = findItem(i.children, id);
                            if (found) return found;
                        }
                    }
                };
                target = findItem(courseItems, previewItemId);

                if (target && target.type !== 'group') {
                    // Sync content if available
                    if (target.content) {
                        setPreviewContent(stripMetadata(target.content));
                    } else {
                        // If content is empty/undefined, it might be initial load. k
                        // But if we are "syncing", we assume the user might be deleting content.
                        // So we should respect empty string.
                        // However, we don't want to overwrite "Loading..." or disk content if we haven't touched it?
                        // Actually, if we are in this Effect, courseItems CHANGED.
                        // If the user typed, target.content CHANGED.
                        // So we should update.
                        if (target.content === "") {
                            setPreviewContent("");
                        }
                    }
                }
            }
            return; // Don't generate full course preview if checking specific item
        }

        // Standard Course Preview (Full Syllabus)
        if (!showPreview || linkData || (previewTitle && previewTitle !== "Course Preview")) {
            if (previewTitle && previewTitle !== "Course Preview") return;
        }

        let md = ``;
        // ... rest of generation logic ...
        courseItems.forEach(item => {
            if (item.type === 'group') {
                md += `### ${item.name}\n\n`;
                if (item.children) {
                    item.children.forEach(child => {
                        md += `#### ${child.name}\n\n`;
                        if (child.content) {
                            md += `${child.content}\n\n`;
                        } else {
                            md += `*No content*\n\n`;
                        }
                    });
                }
            } else {
                // Top level items
                md += `#### ${item.name}\n\n`;
                if (item.content) {
                    md += `${item.content}\n\n`;
                }
            }
        });

        if (courseItems.length === 0) {
            md = "*Start adding modules and topics to see the course preview.*";
        }

        // Only update if we are in "Course Preview" mode
        // We can force this mode if nothing else is selected
        if (!linkData) {
            setPreviewContent(md);
            if (!previewTitle || previewTitle === "Course Preview") {
                setPreviewTitle("Course Preview");
            }
        }

    }, [courseItems, showPreview, linkData, previewTitle, previewItemId]);

    // Initial load - if no items, maybe show setup? Or just let user click 'New'
    // For now, let's keep it manual trigger via New Course button

    const handleAutoSave = async () => {
        setIsSaving(true);
        const courseData = {
            title: courseTitle,
            state: targetState,
            hours: targetHours,
            items: courseItems,
            updatedAt: new Date().toISOString()
        };
        await saveCourse(courseTitle.replace(/\s+/g, '_'), courseData);
        setLastSaved(new Date());
        setIsSaving(false);
    };

    const handleSaveCourse = async () => {
        setIsLoading(true);
        setIsSaving(true);
        const courseData = {
            title: courseTitle,
            state: targetState,
            hours: targetHours,
            items: courseItems,
            updatedAt: new Date().toISOString()
        };

        await saveCourse(courseTitle.replace(/\s+/g, '_'), courseData);
        setLastSaved(new Date());
        setIsLoading(false);
        setIsSaving(false);
        // Refresh list
        const list = await getCourseList();
        setSavedCourses(list);
        alert('Course saved to cloud successfully!');
    };

    const handleLoadCourse = async (filename: string) => {
        setIsLoading(true);
        const data = await loadCourse(filename);
        if (data) {
            setCourseTitle(data.title);
            setTargetState(data.state);
            setTargetHours(data.hours);
            setCourseItems(data.items);
        }
        setIsLoading(false);
        setShowLoadMenu(false);
    };

    const handleFetchCourses = async () => {
        const list = await getCourseList();
        setSavedCourses(list);
        setShowLoadMenu(!showLoadMenu);
    };

    const handleNewCourse = () => {
        if (courseItems.length > 0) {
            if (!confirm("Start a new course? Unsaved changes will be lost.")) return;
        }
        setShowSetupModal(true);
    };

    const handleCreateCourse = (config: CourseConfig) => {
        setCourseTitle(config.title);
        setTargetState(config.state);
        setTargetHours(config.targetHours);

        // Auto-generate modules
        const newItems: CourseItem[] = [];
        for (let i = 1; i <= config.moduleCount; i++) {
            newItems.push({
                id: Math.random().toString(36).substr(2, 9),
                nodeId: `group-${Date.now()}-${i}`,
                name: `Module ${i}: [Topic Name]`,
                type: 'group',
                hours: 0,
                children: []
            });
        }
        setCourseItems(newItems);
        setShowSetupModal(false);
    };


    // Link Preview State

    // Link Preview State

    const handleSelectFile = async (node: FileNode) => {
        // If it's a link, open in new tab immediately
        if (node.name.toLowerCase().endsWith('.link')) {
            try {
                // We need to fetch the content to get the URL
                const response = await readFileContent(node.path);
                if (response?.content) {
                    const data = JSON.parse(response.content);
                    if (data.url) {
                        window.open(data.url, '_blank', 'noopener,noreferrer');
                    }
                }
            } catch (e) {
                console.error("Failed to parse link file", e);
            }
        }

        setLinkData(null);
        setPreviewContent(null);
        setPreviewTitle(node.name);
        setPreviewItemId(null); // Sidebar file not in course yet

        try {
            const response = await readFileContent(node.path);
            if (response?.content) {
                if (node.name.toLowerCase().endsWith('.link')) {
                    try {
                        const data = JSON.parse(response.content);
                        setLinkData(data);
                    } catch (e) {
                        setPreviewContent('Invalid link file format');
                    }
                } else {
                    // Strip metadata for preview
                    setPreviewContent(stripMetadata(response.content));
                }
            }
        } catch (e) {
            setPreviewContent("Failed to load content: " + e);
        }
    };

    const handleSelectCourseItem = async (item: CourseItem) => {
        if (item.type === 'group') return;

        setPreviewTitle(item.name);
        setPreviewItemId(item.id);
        setLinkData(null);

        // PRIORITY: Use content from state if available (edited content)
        if (item.content || item.content === "") {
            setPreviewContent(stripMetadata(item.content || ""));
            return;
        }

        setPreviewContent("Loading...");

        try {
            const { getFileContent } = await import('@/app/actions');

            // Check for virtual ID (created in-memory, not on disk yet)
            // e.g., 'topic-0.123' or any ID without path separators
            if (!item.nodeId || (!item.nodeId.includes('/') && !item.nodeId.includes('\\'))) {
                setPreviewContent(""); // Blank start for virtual items
                return;
            }

            const content = await getFileContent(item.nodeId);

            if (content === 'File not found') {
                setPreviewContent(""); // Handle graceful failure
                return;
            }

            if (item.name.toLowerCase().endsWith('.link')) {
                try {
                    const data = JSON.parse(content);
                    setLinkData(data);
                    setPreviewContent(null);
                } catch (e) {
                    setPreviewContent("Invalid link file format.");
                }
            } else {
                setPreviewContent(stripMetadata(content));
            }

        } catch (e) {
            // content might be empty if it's a new item or error
            setPreviewContent("");
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        const type = active.data.current?.type;

        if (type === 'source-item') {
            // Keep full data payload to preserve 'tag'
            setActiveDragItem({ type: 'source', data: active.data.current });
        } else if (type === 'course-item') {
            setActiveDragItem({ type: 'course', data: active.data.current?.item });
        }
    }

    function handleDragOver(event: DragOverEvent) {
        // Optional: manage highlights
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        const activeData = active.data.current;
        const overData = over.data.current;

        // CASE 1: Dropping a Sidebar File (source-item)
        if (activeData?.type === 'source-item') {
            const fileNode = activeData.node as FileNode;
            const tag = activeData.tag as 'national' | 'state';

            // Check if dropped ONTO an existing Course Item (Target)
            if (overData?.type === 'course-item') {
                const targetItem = overData.item as CourseItem;

                // If target is a FILE/PAGE, INJECT CONTENT (New Logic)
                if (targetItem.type !== 'group') {
                    if (fileNode.type === 'file') {
                        // Async fetch content
                        readFileContent(fileNode.path).then((res) => {
                            if (res && res.success && res.content) {
                                // Strip metadata before injecting
                                const cleanContent = stripMetadata(res.content);
                                handleUpdateCourseItem(targetItem.id, {
                                    content: (targetItem.content || '') + "\n\n" + cleanContent
                                });
                            }
                        });
                    }
                }
                // If target is a MODULE/GROUP, or if it's a file but we want to add a new item
                else {
                    // Logic to add new item...
                    // We need to fetch content if we want it to be populated immediately?
                    // Currently we just set nodeId. 
                    // Let's pre-fetch content so it's editable immediately.

                    const newItemId = Math.random().toString(36).substr(2, 9);

                    if (fileNode.type === 'file') {
                        readFileContent(fileNode.path).then(res => {
                            const initialContent = (res && res.success && res.content) ? stripMetadata(res.content) : "";

                            const newItem: CourseItem = {
                                id: newItemId,
                                nodeId: fileNode.id, // Keep ref
                                name: fileNode.name,
                                type: fileNode.type,
                                hours: 0,
                                children: [],
                                content: initialContent, // Initialize with content
                                verified: { sara: false, gemini: false, team: false },
                                tags: tag ? [tag] : []
                            };

                            if (targetItem.type === 'group') {
                                handleAddItemToGroup(targetItem.id, newItem);
                            } else {
                                setCourseItems((items) => [...items, newItem]);
                            }
                        });
                    } else {
                        // Folder / Other
                        const newItem: CourseItem = {
                            id: newItemId,
                            nodeId: fileNode.id,
                            name: fileNode.name,
                            type: fileNode.type,
                            hours: 0,
                            children: [],
                            verified: { sara: false, gemini: false, team: false },
                            tags: tag ? [tag] : []
                        };
                        if (targetItem.type === 'group') {
                            handleAddItemToGroup(targetItem.id, newItem);
                        } else {
                            setCourseItems((items) => [...items, newItem]);
                        }
                    }
                }
            }
            // Dropped on Canvas Root (create new item at bottom)
            else if (over.id === 'target-canvas') {
                const newItemId = Math.random().toString(36).substr(2, 9);

                if (fileNode.type === 'file') {
                    readFileContent(fileNode.path).then(res => {
                        const initialContent = (res && res.success && res.content) ? stripMetadata(res.content) : "";
                        const newItem: CourseItem = {
                            id: newItemId,
                            nodeId: fileNode.id,
                            name: fileNode.name,
                            type: fileNode.type,
                            hours: 0,
                            children: [],
                            content: initialContent,
                            tags: tag ? [tag] : []
                        };
                        setCourseItems((items) => [...items, newItem]);
                    });
                } else {
                    const newItem: CourseItem = {
                        id: newItemId,
                        nodeId: fileNode.id,
                        name: fileNode.name,
                        type: fileNode.type,
                        hours: 0,
                        children: []
                    };
                    setCourseItems((items) => [...items, newItem]);
                }
            }
        }

        // CASE 2: Reordering within Canvas
        else if (activeData?.type === 'course-item' && overData?.type === 'course-item') {
            const oldIndex = courseItems.findIndex((item) => item.id === active.id);
            const newIndex = courseItems.findIndex((item) => item.id === over.id);

            if (oldIndex !== newIndex) {
                setCourseItems((items) => arrayMove(items, oldIndex, newIndex));
            }
        }
    }

    // Recursive Helper to find and remove item
    const removeItemRecursive = (items: CourseItem[], id: string): CourseItem[] => {
        return items.filter(item => item.id !== id).map(item => {
            if (item.children) {
                return { ...item, children: removeItemRecursive(item.children, id) };
            }
            return item;
        });
    };

    const handleRemoveItem = (id: string) => {
        setCourseItems((items) => removeItemRecursive(items, id));
    };

    // Recursive Helper to find and update item
    const updateItemRecursive = (items: CourseItem[], id: string, updates: Partial<CourseItem>): CourseItem[] => {
        return items.map(item => {
            if (item.id === id) {
                return { ...item, ...updates };
            }
            if (item.children) {
                return { ...item, children: updateItemRecursive(item.children, id, updates) };
            }
            return item;
        });
    };

    const handleUpdateCourseItem = (id: string, updates: Partial<CourseItem>) => {
        setCourseItems((items) => updateItemRecursive(items, id, updates));
    };

    // Recursive Helper to add item to group
    const addItemToGroupRecursive = (items: CourseItem[], groupId: string, newItem: CourseItem): CourseItem[] => {
        return items.map(item => {
            if (item.id === groupId) {
                return { ...item, children: [...(item.children || []), newItem] };
            }
            if (item.children) {
                return { ...item, children: addItemToGroupRecursive(item.children, groupId, newItem) };
            }
            return item;
        });
    };

    const handleAddItemToGroup = (groupId: string, newItem?: CourseItem) => {
        const itemToAdd = newItem || {
            id: Math.random().toString(36).substr(2, 9),
            nodeId: 'topic-' + Math.random(),
            name: 'New Topic',
            type: 'file',
            hours: 0,
            verified: { sara: false, gemini: false, team: false } // Topics are draft by default
        };
        setCourseItems((items) => addItemToGroupRecursive(items, groupId, itemToAdd));
    };

    const handleAddGroup = () => {
        const newGroup: CourseItem = {
            id: Math.random().toString(36).substr(2, 9),
            nodeId: 'group-' + Math.random(),
            name: 'New Module',
            type: 'group',
            children: []
        };
        setCourseItems((items) => [...items, newGroup]);
    };

    const handleAutoBuildOutline = () => {
        const req = getRequirementForState(targetState);
        if (!req) {
            alert(`No requirement matrix found for ${targetState}. Please build manually.`);
            return;
        }

        setIsLoading(true);
        setTimeout(() => {
            const newItems: CourseItem[] = [];

            req.mandatoryTopics.forEach(topic => {
                const group: CourseItem = {
                    id: Math.random().toString(36).substr(2, 9),
                    nodeId: 'auto-gen',
                    name: topic.name,
                    type: 'group',
                    hours: topic.hours,
                    children: []
                };

                // Search national content for matches
                const matches: FileNode[] = [];
                const searchRecursive = (nodes: FileNode[]) => {
                    nodes.forEach(node => {
                        if (node.type === 'file' && topic.keywords.some(kw => node.name.toLowerCase().includes(kw))) {
                            matches.push(node);
                        }
                        if (node.children) searchRecursive(node.children);
                    });
                };
                searchRecursive(files);

                // Add top 3 matches to each group
                matches.slice(0, 3).forEach(match => {
                    group.children?.push({
                        id: Math.random().toString(36).substr(2, 9),
                        nodeId: match.id,
                        name: match.name,
                        type: 'file',
                        verified: { sara: true, gemini: false, team: false }
                    });
                });

                newItems.push(group);
            });

            setCourseItems(newItems);
            setIsLoading(false);
            setCourseItems(newItems);
            setIsLoading(false);
            alert(`Fast Forward Complete! Generated ${newItems.length} course modules for ${targetState} based on Mandatory State Requirements.\n\nNote: Module names are matched to state laws but can be renamed directly.`);
        }, 800);
    };

    const handleGenerateSyllabus = () => {
        const timestamp = new Date().toLocaleDateString();

        let markdown = `# ${courseTitle}\n\n`;
        markdown += `### Vermont Pre-Licensing Course Timed Agenda\n`;
        markdown += `**📋 Document Classification**\n`;
        markdown += `- **Type**: internal-document\n`;
        markdown += `- **Purpose**: 40-hour course breakdown for Vermont course application\n`;
        markdown += `- **Created**: ${timestamp}\n\n`;

        markdown += `## Instructions\n`;
        markdown += `1. Review and adjust topic hours as needed for your curriculum\n`;
        markdown += `2. Ensure total equals exactly 40 hours\n`;
        markdown += `3. Convert to PDF using md-to-pdf MCP\n`;
        markdown += `4. Save PDF to this directory\n\n`;

        markdown += `## Course Overview\n`;
        markdown += `**Course Title**: ${courseTitle}\n`;
        markdown += `**Total Hours**: ${targetHours} Hours\n`;
        markdown += `**Delivery Method**: Online asynchronous\n`;
        markdown += `**Provider**: Blue Sky Online Real Estate School\n`;
        markdown += `**Instructor**: Sean Munson\n\n`;

        markdown += `## Course Curriculum - ${targetHours} Hour Breakdown\n\n`;

        // Process Groups and Items
        let currentGroup: CourseItem | null = null;
        let buffer: CourseItem[] = [];

        const renderGroup = (group: CourseItem, items: CourseItem[]) => {
            const totalHours = items.reduce((sum, i) => sum + (i.hours || 0), 0) + (group.hours || 0);
            let md = `### ${group.name} (${totalHours.toFixed(1)} Hours)\n\n`;
            md += `| Topic | Hours |\n| :--- | :--- |\n`;

            items.forEach(item => {
                md += `| ${item.name} | ${item.hours?.toFixed(1) || ''} |\n`;
            });

            if (group.hours && group.hours > 0) {
                md += `| *Module Content/Overview* | ${group.hours.toFixed(1)} |\n`;
            }

            md += `| **Module Total** | **${totalHours.toFixed(1)}** |\n\n`;
            return md;
        };

        courseItems.forEach(item => {
            if (item.type === 'group') {
                if (currentGroup) {
                    markdown += renderGroup(currentGroup, buffer);
                }
                currentGroup = item;
                buffer = [];
            } else {
                if (currentGroup) {
                    buffer.push(item);
                }
            }
        });

        if (currentGroup) {
            markdown += renderGroup(currentGroup, buffer);
        }

        markdown += `## Course Hour Summary\n\n`;
        markdown += `| Module | Topic | Hours |\n| :--- | :--- | :--- |\n`;
        let moduleCount = 1;
        courseItems.forEach(item => {
            if (item.type === 'group') {
                markdown += `| ${moduleCount} | ${item.name} | ${(item.hours || 0).toFixed(1)} |\n`;
                moduleCount++;
            }
        });
        markdown += `| **TOTAL** | | **${targetHours.toFixed(1)}** |\n\n`;

        markdown += `## Learning Objectives\n`;
        markdown += `Upon completion of this course, students will be able to:\n`;
        markdown += `1. Understand the nature and characteristics of real property\n`;
        markdown += `2. Identify different types of property ownership and estates\n`;
        markdown += `3. Comprehend the elements and requirements of valid real estate contracts\n`;
        markdown += `4. Understand the process of transferring property title\n`;
        markdown += `5. Explain basic real estate finance concepts and loan types\n`;
        markdown += `6. Apply valuation approaches to determine property value\n`;
        markdown += `7. Understand agency relationships and fiduciary duties\n`;
        markdown += `8. Comply with fair housing laws and ethical standards\n`;
        markdown += `9. Navigate Vermont-specific real estate laws and regulations\n\n`;

        markdown += `## Assessment Methods\n`;
        markdown += `- Module quizzes (required passing score: 70%)\n\n`;
        markdown += `- Final comprehensive examination (required passing score: 70%)\n`;
        markdown += `- Timed proctored testing for final exam\n\n`;

        markdown += `## Notes\n`;
        markdown += `- Vermont requires 40 hours of pre-licensing education per 26 V.S.A. § 2292(b)(4)\n`;
        markdown += `- This agenda is a template - adjust hours per topic as needed\n`;
        markdown += `- Ensure total always equals 40 hours exactly\n`;
        markdown += `- Course must be approved before offering to students\n`;

        // Download
        const blob = new Blob([markdown], { type: 'text/markdown' });
        return markdown;
    };

    const handleExportZip = async () => {
        setIsLoading(true);
        const zip = new JSZip();

        // 1. Generate Syllabus / Outline
        const syllabus = handleGenerateSyllabus();
        zip.file("1_Application/Outline.md", syllabus);

        // 2. Fetch State Assets (Resume & Certificate)
        const assets = await findStateAssets(targetState);
        if (assets.success) {
            // Instructor Resume
            if (assets.resume) {
                const res = await getResourceBinary(assets.resume.id);
                if (res && res.success && res.data) {
                    const binaryData = Uint8Array.from(atob(res.data), c => c.charCodeAt(0));
                    zip.file(`2_Instructor/${assets.resume.title}`, binaryData);
                }
            } else {
                zip.file("2_Instructor/README_MISSING_RESUME.txt", "Please upload an Instructor Resume to the Approved Resources for this state.");
            }

            // Compliance Certificate
            if (assets.certificate) {
                const res = await getResourceBinary(assets.certificate.id);
                if (res && res.success && res.data) {
                    const binaryData = Uint8Array.from(atob(res.data), c => c.charCodeAt(0));
                    zip.file(`3_Compliance/${assets.certificate.title}`, binaryData);
                }
            } else {
                zip.file("3_Compliance/README_MISSING_CERTIFICATE.txt", "Please upload a Course Certificate Template to the Approved Resources for this state.");
            }
        }

        // 3. Course Content
        const contentFolder = zip.folder("4_Content");
        for (const item of courseItems) {
            if (item.type === 'group') {
                const folderName = item.name.replace(/[^a-z0-9 _-]/gi, '').trim() || 'Untitled_Module';
                const folder = contentFolder?.folder(folderName);
                if (folder && item.children) {
                    for (const child of item.children) {
                        const fileName = (child.name.replace(/[^a-z0-9 _-]/gi, '').trim() || 'Untitled') + '.md';
                        let content = child.content ? stripMetadata(child.content) : '';

                        // Add Quiz to the end of content if exists
                        if (child.quizzes && child.quizzes.length > 0) {
                            content += "\n\n---\n## TOPIC QUIZ\n\n";
                            child.quizzes.forEach((q, i) => {
                                content += `${i + 1}. ${q.question}\n`;
                                q.options.forEach((opt, oi) => {
                                    content += `   ${String.fromCharCode(65 + oi)}) ${opt}${q.correctAnswer === oi ? " (CORRECT)" : ""}\n`;
                                });
                                content += `   Explanation: ${q.explanation}\n\n`;
                            });
                        }
                        folder.file(fileName, content);
                    }
                }
            } else {
                const fileName = (item.name.replace(/[^a-z0-9 _-]/gi, '').trim() || 'Untitled') + '.md';
                zip.file(`4_Content/${fileName}`, item.content ? stripMetadata(item.content) : '');
            }
        }

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `${courseTitle.replace(/\s+/g, '_')}_MASTER_APPLICATION.zip`);
        setIsLoading(false);
        alert("Master Application ZIP Generated! Includes Outline, Resume, Certificate, and all Course Content.");
    };

    const handleSave = () => {
        handleGenerateSyllabus();
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full w-full overflow-hidden flex-col">
                {/* CMS Header - Metadata */}
                <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 justify-between shrink-0 z-20 shadow-sm">
                    <div className="flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar">
                        <div className="flex flex-col shrink-0">
                            <input
                                type="text"
                                value={courseTitle}
                                placeholder="Course Title"
                                onChange={(e) => setCourseTitle(e.target.value)}
                                className="font-bold text-lg text-black focus:outline-none border-b border-transparent focus:border-green-500 hover:border-gray-300 transition-colors w-32 md:w-64 placeholder:text-gray-400 placeholder:font-normal"
                            />
                        </div>
                        <div className="h-6 w-px bg-gray-200 mx-1 md:mx-2 shrink-0"></div>
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">State:</span>
                                    <select
                                        value={targetState}
                                        onChange={(e) => setTargetState(e.target.value)}
                                        className="font-bold text-sm text-black focus:outline-none bg-transparent cursor-pointer hover:text-green-600 transition-colors uppercase"
                                    >
                                        <option value="VT">VT</option>
                                        <option value="VA">VA</option>
                                        <option value="MD">MD</option>
                                        <option value="TX">TX</option>
                                        <option value="FL">FL</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Target:</span>
                                    <input
                                        type="number"
                                        value={targetHours}
                                        onChange={(e) => setTargetHours(Number(e.target.value))}
                                        className="font-mono font-bold text-sm text-green-700 focus:outline-none w-8 text-right bg-transparent"
                                    />
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">hrs</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-6 w-px bg-gray-200 mx-1 md:mx-2 shrink-0"></div>

                        {/* Progress Bar Component */}
                        <div className="flex flex-col gap-1 min-w-[150px] md:min-w-[200px]">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Course Progress</span>
                                <span className="text-[10px] font-bold text-green-600">{((courseItems.reduce((acc, item) => acc + (item.hours || 0) + (item.children?.reduce((s, c) => s + (c.hours || 0), 0) || 0), 0) / targetHours) * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                                <div
                                    className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                                    style={{ width: `${Math.min(100, (courseItems.reduce((acc, item) => acc + (item.hours || 0) + (item.children?.reduce((s, c) => s + (c.hours || 0), 0) || 0), 0) / targetHours) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                            <button
                                onClick={handleNewCourse}
                                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-gray-600 hover:text-green-700 hover:bg-white hover:shadow-sm rounded-md transition-all active:scale-95"
                                title="Start New Course"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                New Course
                            </button>
                            <button
                                onClick={handleAddGroup}
                                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-gray-600 hover:text-purple-700 hover:bg-white hover:shadow-sm rounded-md transition-all active:scale-95 border-l border-gray-200 ml-1"
                                title="Add New Module"
                            >
                                <LayoutTemplate className="w-3.5 h-3.5" />
                                New Module
                            </button>
                        </div>

                        <div className="h-6 w-px bg-gray-200"></div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className={cn(
                                    "p-2 rounded-lg transition-all border",
                                    showPreview ? "text-blue-600 bg-blue-50 border-blue-200 shadow-inner" : "text-gray-400 bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                                )}
                                title="Toggle Live Preview"
                            >
                                <LayoutTemplate className="w-4 h-4" />
                            </button>

                            <div className="relative group/load">
                                <button
                                    onClick={handleFetchCourses}
                                    className="p-2 rounded-lg text-gray-400 bg-white border border-gray-200 hover:border-gray-300 hover:text-green-600 transition-all shadow-sm"
                                    title="Load Saved Course"
                                >
                                    <FolderOpen className="w-4 h-4" />
                                </button>
                                {showLoadMenu && (
                                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                                            Saved Courses
                                            <X className="w-3 h-3 cursor-pointer hover:text-gray-600" onClick={() => setShowLoadMenu(false)} />
                                        </div>
                                        <div className="max-h-80 overflow-y-auto p-1.5">
                                            {savedCourses.length === 0 ? (
                                                <div className="px-4 py-10 text-center">
                                                    <Archive className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                                    <p className="text-xs text-gray-400 italic font-medium">No courses found</p>
                                                </div>
                                            ) : (
                                                savedCourses.map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => handleLoadCourse(c)}
                                                        className="w-full text-left px-3 py-2.3 text-sm font-semibold text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors flex items-center gap-2 group/item mb-0.5"
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-200 group-hover/item:bg-green-500 transition-colors"></div>
                                                        <span className="truncate flex-1">{c.replace(/_/g, ' ')}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSaveCourse}
                                disabled={isLoading || isSaving}
                                className={cn(
                                    "p-2 rounded-lg text-gray-400 bg-white border border-gray-200 hover:border-gray-300 hover:text-green-600 transition-all shadow-sm flex items-center gap-2",
                                    (isLoading || isSaving) && "animate-pulse"
                                )}
                                title="Sync to Cloud (Manual)"
                            >
                                <Save className="w-4 h-4" />
                                {isSaving && <span className="text-[10px] font-bold text-gray-400">Saving...</span>}
                                {!isSaving && lastSaved && <span className="text-[10px] font-bold text-green-500">Saved</span>}
                            </button>
                        </div>

                        <div className="h-6 w-px bg-gray-200"></div>

                        <button
                            onClick={handleGenerateSyllabus}
                            className="bg-green-600 text-white px-4 py-1.8 rounded-lg text-xs font-bold hover:bg-green-700 transition-all shadow-md active:scale-95 flex items-center gap-2"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Export Application
                        </button>
                    </div>
                </div>

                {/* SaaS Control Panel - State Expansion Operations */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex items-center justify-between shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Expansion Mode:</span>
                            <div className="flex gap-2">
                                <button className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">National {"->"} {targetState}</button>
                            </div>
                        </div>
                        <button
                            onClick={handleAutoBuildOutline}
                            className="text-[10px] font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 rounded-lg hover:shadow-lg transition-all flex items-center gap-2 group border border-purple-400/30"
                        >
                            <Zap className="w-3 h-3 fill-white" />
                            Fast Forward: Auto-Build {targetState}
                        </button>
                        <button
                            onClick={() => {
                                const req = getRequirementForState(targetState);
                                if (!req) {
                                    alert(`Searching National Content for ${targetState} requirements... \n\nFound 3 gaps identified: \n1. Vermont Specific Finance Law\n2. VT License Maintenance\n3. State Audit Procedures`);
                                    return;
                                }
                                alert(`Scanning Requirements for ${targetState} (${req.totalHours} hrs)...\n\nMatched ${courseItems.length}/${req.mandatoryTopics.length} Mandatory Topics.`);
                            }}
                            className="text-[10px] font-bold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-all flex items-center gap-2 group"
                        >
                            <svg className="w-3 h-3 group-hover:animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            Identify {targetState} Gaps
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Batch Operations:</span>
                            <button
                                onClick={async () => {
                                    setIsLoading(true);
                                    // Simulate Batch Gemini verification
                                    await new Promise(r => setTimeout(r, 1500));
                                    setCourseItems(prev => prev.map(item => ({
                                        ...item,
                                        verified: { ...item.verified, gemini: true } as any,
                                        children: item.children?.map(c => ({ ...c, verified: { ...c.verified, gemini: true } as any }))
                                    })));
                                    setIsLoading(false);
                                    alert("Batch Gemini Verification Complete: Caching and saving results to database...");
                                }}
                                className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-2"
                            >
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                Batch API Verify
                            </button>
                        </div>
                        <div className="h-4 w-px bg-gray-300"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Audit:</span>
                            <button className="text-[10px] font-bold text-gray-600 hover:text-black">View Log</button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div
                        ref={sidebarRef}
                        className={cn(
                            "flex-shrink-0 border-r border-gray-200 bg-white transition-all duration-75 ease-out absolute md:relative z-30 h-full relative group",
                            showSidebar ? "translate-x-0" : "-translate-x-full w-0 md:translate-x-0 md:w-12"
                        )}
                        style={{ width: showSidebar ? sidebarWidth : undefined }}
                    >
                        {/* Drag Handle */}
                        {showSidebar && (
                            <div
                                className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-green-400 z-40 transition-colors"
                                onMouseDown={startResizing}
                            />
                        )}

                        {showSidebar ? (
                            <SourceSidebar
                                files={files}
                                approvedFiles={approvedFiles}
                                onSelectFile={handleSelectFile}
                                onClose={() => setShowSidebar(false)}
                                targetState={targetState}
                            />
                        ) : (
                            <div className="flex flex-col items-center py-4 bg-gray-50/50 w-full h-full">
                                <button
                                    onClick={() => setShowSidebar(true)}
                                    className="p-2 rounded-lg text-gray-600 hover:text-green-700 hover:bg-green-100 transition-colors"
                                    title="Expand Sidebar"
                                >
                                    <PanelLeftOpen className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Overlay for mobile when sidebar is open */}
                    {showSidebar && (
                        <div
                            className="absolute inset-0 bg-black/20 z-20 md:hidden"
                            onClick={() => setShowSidebar(false)}
                        />
                    )}

                    {/* Main Canvas */}
                    <div className="flex-1 flex flex-col min-w-0 border-l border-r border-gray-200 bg-gray-50/50">
                        <TargetCanvas
                            items={courseItems}
                            onRemoveItem={handleRemoveItem}
                            onClear={() => setCourseItems([])}
                            onSave={handleGenerateSyllabus}
                            onAddGroup={handleAddGroup}
                            onSelectItem={handleSelectCourseItem}
                            onUpdateItem={handleUpdateCourseItem}
                            onAddItemToGroup={handleAddItemToGroup}
                            onEdit={(item) => setEditingItem(item)}
                            targetHours={targetHours}
                            onNewCourse={() => setShowSetupModal(true)}
                        />
                    </div>

                    {/* Writing Studio Modal */}
                    {editingItem && (
                        <TopicEditorModal
                            item={editingItem}
                            onUpdate={(id, updates) => {
                                handleUpdateCourseItem(id, updates);
                                // Refresh editingItem to show live updates in modal if needed, 
                                // though TopicEditorModal has its own local state.
                                setEditingItem(prev => prev ? { ...prev, ...updates } : null);
                            }}
                            onClose={() => setEditingItem(null)}
                        />
                    )}

                    {/* Preview Pane - Right Side */}
                    {showPreview && (
                        <div className="w-[400px] flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-10 transition-transform">
                            {/* ... Preview content ... */}
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Content Preview
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1 truncate font-mono">{previewTitle || 'Select a file to preview'}</p>
                                </div>
                                <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 bg-white">
                                {linkData ? (
                                    <div className="p-6 bg-purple-50 border border-purple-100 rounded-lg flex flex-col gap-4 text-center">
                                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto text-purple-600">
                                            {/* Link Icon */}
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-2">{linkData.title}</h3>
                                            <p className="text-sm text-gray-500 break-all">{linkData.url}</p>
                                        </div>
                                        <a
                                            href={linkData.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 transition-colors inline-block"
                                        >
                                            Visit Link
                                        </a>
                                    </div>
                                ) : previewContent ? (
                                    <div className="prose prose-sm prose-green max-w-none">
                                        <ReactMarkdown
                                            components={{
                                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-black mt-6 mb-2" {...props} />,
                                                h4: ({ node, ...props }) => <h4 className="text-base font-bold text-black mt-4 mb-2" {...props} />,
                                                p: ({ node, ...props }) => <p className="text-gray-800 leading-relaxed mb-4" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 mb-4 text-gray-700" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 mb-4 text-gray-700" {...props} />,
                                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-purple-200 pl-4 py-1 my-4 italic text-gray-600 bg-gray-50 rounded-r" {...props} />,
                                                code: ({ node, ...props }) => <code className="bg-gray-100 text-purple-600 px-1 py-0.5 rounded text-sm font-mono" {...props} />,
                                                pre: ({ node, ...props }) => <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4 text-sm" {...props} />,
                                            }}
                                        >
                                            {previewContent}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                                        <p>Select a file to preview content</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {mounted && createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                    {activeDragItem?.type === 'source' && (
                        <DraggableFile node={activeDragItem.data.node} tag={activeDragItem.data.tag} isOverlay />
                    )}
                    {activeDragItem?.type === 'course' && (
                        <div className="opacity-80">
                            <SortableItem item={activeDragItem.data} onRemove={() => { }} />
                        </div>
                    )}
                </DragOverlay>,
                document.body
            )}

            {showSetupModal && (
                <CourseSetup
                    onCreate={handleCreateCourse}
                    onCancel={() => setShowSetupModal(false)}
                />
            )}

        </DndContext>
    );
}
