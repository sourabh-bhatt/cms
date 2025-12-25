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
import { FileText, Save, FolderOpen, Plus, AlignLeft, LayoutTemplate, X, GripVertical, PanelLeftOpen } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';

import { FileNode } from '@/lib/file-system';
import {
    saveCourse,
    loadCourse,
    getCourseList,
    readFileContent
} from '@/app/actions';
import { cn } from '@/lib/utils';
import { SourceSidebar } from './SourceSidebar';
import { TargetCanvas } from './TargetCanvas';
import { CourseItem } from './SortableItem';
import { DraggableFile } from './DraggableFile';
import { SortableItem } from './SortableItem';
import { CourseSetup, CourseConfig } from './CourseSetup';

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

export default function BuilderInterface({ files, approvedFiles }: { files: FileNode[], approvedFiles: FileNode[] }) {
    const [courseItems, setCourseItems] = useState<CourseItem[]>([]);
    const [activeDragItem, setActiveDragItem] = useState<{ type: 'source' | 'course', data: any } | null>(null);
    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [savedCourses, setSavedCourses] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [showPreview, setShowPreview] = useState(false);

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
    // isLoading and savedCourses were declared above, removing duplicates
    const [showLoadMenu, setShowLoadMenu] = useState(false);
    const [showSetupModal, setShowSetupModal] = useState(false);

    // Initial load - if no items, maybe show setup? Or just let user click 'New'
    // For now, let's keep it manual trigger via New Course button

    const handleSaveCourse = async () => {
        setIsLoading(true);
        const courseData = {
            title: courseTitle,
            state: targetState,
            hours: targetHours,
            items: courseItems,
            updatedAt: new Date().toISOString()
        };

        await saveCourse(courseTitle.replace(/\s+/g, '_'), courseData);
        setIsLoading(false);
        // Refresh list
        const list = await getCourseList();
        setSavedCourses(list);
        alert('Course saved successfully!');
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
    const [linkData, setLinkData] = useState<{ title: string; url: string } | null>(null);

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
                        // User asked "Change Link click behavior to open in new tab directly".
                        // Usually implies "instead of preview".
                        // However, keeping preview might be useful for context.
                        // But often "direct open" means "action".
                        // I will OPEN it AND Show it in preview just in case popups are blocked or they want to see it.
                    }
                }
            } catch (e) {
                console.error("Failed to parse link file", e);
            }
        }

        setLinkData(null);
        setPreviewContent(null);
        setPreviewTitle(node.name);

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
                    setPreviewContent(response.content);
                }
            }
        } catch (e) {
            setPreviewContent("Failed to load content: " + e);
        }
    };

    const handleSelectCourseItem = async (item: CourseItem) => {
        if (item.type === 'group') return;

        setPreviewTitle(item.name);
        setPreviewContent("Loading...");
        setLinkData(null);

        try {
            const { getFileContent } = await import('@/app/actions');
            // item.nodeId holds the original file path
            // Check if it's a link based on extension if possible, or just try to parse if needed
            // But usually item.name or nodeId might have extension. 
            // For course items, we store content in 'content' prop mostly, but looking at 'handleSelectFile', we prefer fetching fresh.

            // If we want to support link preview for dropped items too, we'd need to know source type.
            // For now, let's just stick to default content loading unless we specifically know it's a link.
            // But 'handleSelectFile' handles the sidebar selection which is what the user asked for ("click on link").

            const content = await getFileContent(item.nodeId);

            if (item.name.toLowerCase().endsWith('.link')) {
                try {
                    const data = JSON.parse(content);
                    setLinkData(data);
                    setPreviewContent(null);
                } catch (e) {
                    setPreviewContent("Invalid link file format.");
                }
            } else {
                setPreviewContent(content);
            }

        } catch (e) {
            setPreviewContent("Failed to load content: " + e);
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
            setActiveDragItem({ type: 'source', data: active.data.current?.node });
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

            // Check if dropped ONTO an existing Course Item (Target)
            if (overData?.type === 'course-item') {
                const targetItem = overData.item as CourseItem;

                // If target is a FILE/PAGE, INJECT CONTENT (New Logic)
                if (targetItem.type !== 'group') {
                    if (fileNode.type === 'file') {
                        // Async fetch content
                        readFileContent(fileNode.path).then((res) => {
                            if (res && res.success && res.content) {
                                handleUpdateCourseItem(targetItem.id, {
                                    content: (targetItem.content || '') + "\n\n" + res.content
                                });
                                // Also auto-update word count via the component effect hooks,
                                // but we should manually trigger it if we want instant feedback in state.
                                // simpler to let the component effect handle the calculation on next render/edit
                            }
                        });
                    }
                }
                // If target is a MODULE/GROUP, or if it's a file but we want to add a new item
                // For now, we'll just add it as a new item at the top level,
                // as the current structure doesn't support nested children directly in state.
                // The user's provided snippet for `handleAddItemToGroup` implies a nested structure
                // which is not yet implemented in the `courseItems` state.
                // So, for simplicity and to avoid breaking existing flat structure,
                // we'll treat dropping on a course-item (even a group) as adding a new top-level item.
                else {
                    const newItem: CourseItem = {
                        id: Math.random().toString(36).substr(2, 9),
                        nodeId: fileNode.id,
                        name: fileNode.name,
                        type: fileNode.type,
                        hours: 0,
                        children: []
                    };

                    if (targetItem.type === 'group') {
                        handleAddItemToGroup(targetItem.id, newItem);
                    } else {
                        setCourseItems((items) => [...items, newItem]);
                    }
                }
            }
            // Dropped on Canvas Root (create new item at bottom)
            else if (over.id === 'target-canvas') {
                const newItem: CourseItem = {
                    id: Math.random().toString(36).substr(2, 9),
                    nodeId: fileNode.id,
                    name: fileNode.name,
                    type: fileNode.type,
                    hours: 0,
                    children: []
                };
                setCourseItems((items) => [...items, newItem]);
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
            verified: false // Topics are draft by default
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
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${courseTitle.replace(/\s+/g, '_')}_Syllabus.md`;
        a.click();
        URL.revokeObjectURL(url);
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
                            {/* Removed Label */}
                            <input
                                type="text"
                                value={courseTitle}
                                placeholder="Course Title"
                                onChange={(e) => setCourseTitle(e.target.value)}
                                className="font-bold text-lg text-black focus:outline-none border-b border-transparent focus:border-green-500 hover:border-gray-300 transition-colors w-32 md:w-64 placeholder:text-gray-400 placeholder:font-normal"
                            />
                        </div>
                        <div className="h-6 w-px bg-gray-200 mx-1 md:mx-2 shrink-0"></div>
                        <div className="flex flex-col shrink-0">
                            {/* Removed Label */}
                            <div className="flex items-center gap-1">
                                <span className="text-gray-400 text-xs font-semibold">State:</span>
                                <select
                                    value={targetState}
                                    onChange={(e) => setTargetState(e.target.value)}
                                    className="font-bold text-black focus:outline-none bg-transparent cursor-pointer hover:text-green-600 transition-colors"
                                >
                                    <option value="VT">VT</option>
                                    <option value="VA">VA</option>
                                    <option value="MD">MD</option>
                                    <option value="TX">TX</option>
                                </select>
                            </div>
                        </div>
                        <div className="h-6 w-px bg-gray-200 mx-1 md:mx-2 shrink-0"></div>
                        <div className="flex flex-col shrink-0 ml-0">
                            {/* Removed Label */}
                            <div className="flex items-center gap-1">
                                <span className="text-gray-400 text-xs font-semibold">Target:</span>
                                <input
                                    type="number"
                                    value={targetHours}
                                    onChange={(e) => setTargetHours(Number(e.target.value))}
                                    className="font-mono font-bold text-green-700 focus:outline-none w-10 text-right border-b border-transparent focus:border-green-500"
                                />
                                <span className="text-xs text-black font-bold">hrs</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* CRUD Controls */}
                        <button
                            onClick={handleNewCourse}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="New Course"
                        >
                            <Plus className="w-5 h-5" />
                        </button>

                        <div className="h-6 w-px bg-gray-200 mx-1"></div>

                        <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            className={cn("p-1.5 rounded transition-colors", showSidebar ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-gray-600")}
                            title="Toggle Sidebar"
                        >
                            <AlignLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={cn("p-1.5 rounded transition-colors", showPreview ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-gray-600")}
                            title="Toggle Preview"
                        >
                            <LayoutTemplate className="w-5 h-5" />
                        </button>

                        <div className="relative">
                            <button
                                onClick={handleFetchCourses}
                                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Load Course"
                            >
                                <FolderOpen className="w-5 h-5" />
                            </button>
                            {showLoadMenu && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-md shadow-xl border border-gray-100 z-50 overflow-hidden">
                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">Saved Courses</div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {savedCourses.length === 0 ? (
                                            <div className="px-4 py-3 text-sm text-gray-400 italic">No saved courses</div>
                                        ) : (
                                            savedCourses.map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => handleLoadCourse(c)}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 block truncate"
                                                >
                                                    {c}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSaveCourse}
                            disabled={isLoading}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors mr-2"
                            title="Save Course to Disk"
                        >
                            <Save className="w-5 h-5" />
                        </button>

                        <div className="h-6 w-px bg-gray-200 mx-1"></div>

                        <button
                            onClick={handleGenerateSyllabus}
                            className="px-4 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <FileText className="w-3 h-3" />
                            Export Application
                        </button>
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
                            targetHours={targetHours}
                            onNewCourse={() => setShowSetupModal(true)}
                        />
                    </div>

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
                                            {/* Link Icon hardcoded here since we can't import easily inline without checking imports */}
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
                                                h3: ({ node, ...props }) => <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2" {...props} />,
                                                p: ({ node, ...props }) => <p className="text-gray-600 leading-relaxed mb-4" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 mb-4 text-gray-600" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 mb-4 text-gray-600" {...props} />,
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
                        <DraggableFile node={activeDragItem.data} isOverlay />
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
