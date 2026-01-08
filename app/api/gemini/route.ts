import { NextRequest, NextResponse } from 'next/server';
import {
    GeminiRequest,
    GeminiResponse,
    OutlineOutput,
    TopicOutput,
    FileSelectionOutput,
    GeminiLogEntry
} from '@/lib/gemini/types';
import {
    getFileSelectionPrompt,
    getOutlineSystemPrompt,
    getOutlineUpdatePrompt,
    getTopicSystemPrompt,
    getTopicUpdatePrompt
} from '@/lib/gemini/context-builder';
import dbConnect from '@/lib/db';
import GeminiLog from '@/lib/models/GeminiLog';

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Connect to database
        await dbConnect();

        const body: GeminiRequest = await request.json();
        const { action, context, userPrompt, settings } = body;

        // Save user action to database
        const userLogDoc = await GeminiLog.create({
            action,
            type: 'user_action',
            userInput: {
                prompt: userPrompt || '',
                filenames: context.filenames.slice(0, 50), // Store up to 50 filenames
                stateCode: context.stateCode,
                targetHours: context.targetHours,
                settings: settings ? {
                    maxSections: settings.maxSections,
                    topicsPerSection: settings.topicsPerSection,
                    wordsPerTopic: settings.wordsPerTopic,
                    maxFilesToRead: settings.maxFilesToRead
                } : undefined
            }
        });
        console.log(`[Gemini] Logged user action: ${userLogDoc._id}`);

        // Determine which prompt to use
        let systemPrompt: string;
        switch (action) {
            case 'select_files':
                systemPrompt = getFileSelectionPrompt(context);
                break;
            case 'create_outline':
                systemPrompt = getOutlineSystemPrompt(context);
                break;
            case 'update_outline':
                systemPrompt = getOutlineUpdatePrompt(context);
                break;
            case 'create_topic':
                systemPrompt = getTopicSystemPrompt(context);
                break;
            case 'update_topic':
                systemPrompt = getTopicUpdatePrompt(context);
                break;
            default:
                return NextResponse.json({
                    success: false,
                    error: 'Invalid action'
                }, { status: 400 });
        }

        // Check for API key
        const apiKey = process.env.GEMINI_API_KEY;

        let result: OutlineOutput | TopicOutput | FileSelectionOutput;

        if (!apiKey) {
            // DEMO MODE: Return mock data when no API key is set
            console.log('[Gemini API] No API key found - using demo mode');
            result = generateMockResponse(action, context);
        } else {
            // PRODUCTION MODE: Call actual Gemini API
            result = await callGeminiAPI(apiKey, systemPrompt, userPrompt);
        }

        // Save Gemini response to database
        const responseLogDoc = await GeminiLog.create({
            action,
            type: 'gemini_response',
            geminiResponse: {
                model: apiKey ? 'gemini-pro' : 'demo-mode',
                selectedFiles: 'selectedFiles' in result ? result.selectedFiles : undefined,
                outline: 'outline' in result ? result.outline : undefined,
                topic: 'topic' in result ? result.topic : undefined,
                processingTimeMs: Date.now() - startTime
            }
        });
        console.log(`[Gemini] Logged response: ${responseLogDoc._id} (${Date.now() - startTime}ms)`);

        const response: GeminiResponse = {
            success: true,
            data: result,
            logId: responseLogDoc._id.toString()
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('[Gemini API Error]', error);

        // Try to log error to database
        try {
            await dbConnect();
            await GeminiLog.create({
                action: 'create_outline',
                type: 'gemini_response',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        } catch (logError) {
            console.error('[Gemini] Failed to log error:', logError);
        }

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// GET endpoint to retrieve logs from database
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        // Get query params for filtering
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const action = searchParams.get('action');

        // Build query
        const query: any = {};
        if (action) query.action = action;

        // Fetch logs from database
        const logs = await GeminiLog.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        // Convert to API format
        const formattedLogs: GeminiLogEntry[] = logs.map((log: any) => ({
            id: log._id.toString(),
            timestamp: log.createdAt,
            type: log.type,
            action: log.action,
            userInput: log.userInput ? {
                prompt: log.userInput.prompt || '',
                context: {
                    filenames: log.userInput.filenames || [],
                    stateCode: log.userInput.stateCode,
                    targetHours: log.userInput.targetHours
                }
            } : undefined,
            geminiResponse: log.geminiResponse ? {
                model: log.geminiResponse.model,
                output: log.geminiResponse.outline || log.geminiResponse.topic ||
                    { selectedFiles: log.geminiResponse.selectedFiles },
                processingTimeMs: log.geminiResponse.processingTimeMs
            } : undefined,
            error: log.error
        }));

        return NextResponse.json({
            logs: formattedLogs,
            total: await GeminiLog.countDocuments(query),
            fromDatabase: true
        });
    } catch (error) {
        console.error('[Gemini GET Error]', error);
        return NextResponse.json({
            logs: [],
            error: error instanceof Error ? error.message : 'Database error'
        }, { status: 500 });
    }
}

// Call actual Gemini API
async function callGeminiAPI(
    apiKey: string,
    systemPrompt: string,
    userPrompt?: string
): Promise<OutlineOutput | TopicOutput | FileSelectionOutput> {
    // Use gemini-1.5-flash (stable model for Google AI Studio)
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: systemPrompt + (userPrompt ? `\n\nUser Request: ${userPrompt}` : '')
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096
                }
            })
        }
    );

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error('Empty response from Gemini');
    }

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON found in response');
    }

    return JSON.parse(jsonMatch[0]);
}

// Generate mock response for demo mode
function generateMockResponse(
    action: string,
    context: GeminiRequest['context']
): OutlineOutput | TopicOutput | FileSelectionOutput {
    // Handle file selection (Step 1)
    if (action === 'select_files') {
        const maxFiles = 40;
        return {
            success: true,
            selectedFiles: context.filenames.slice(0, Math.min(maxFiles, context.filenames.length)),
            reasoning: `Selected ${Math.min(maxFiles, context.filenames.length)} files covering fundamental real estate topics for ${context.stateCode} ${context.targetHours}-hour course.`
        };
    }

    if (action.includes('outline')) {
        // Mock outline response
        const sections = [
            {
                id: 'section-1',
                title: 'Real Estate Fundamentals',
                hours: 8,
                topics: context.filenames.slice(0, 5).map((name, i) => ({
                    id: `topic-1-${i}`,
                    name,
                    sourceFile: name,
                    estimatedMinutes: 30,
                    order: i + 1
                }))
            },
            {
                id: 'section-2',
                title: 'Property Rights & Ownership',
                hours: 10,
                topics: context.filenames.slice(5, 12).map((name, i) => ({
                    id: `topic-2-${i}`,
                    name,
                    sourceFile: name,
                    estimatedMinutes: 35,
                    order: i + 1
                }))
            },
            {
                id: 'section-3',
                title: 'Contracts & Transactions',
                hours: 12,
                topics: context.filenames.slice(12, 20).map((name, i) => ({
                    id: `topic-3-${i}`,
                    name,
                    sourceFile: name,
                    estimatedMinutes: 40,
                    order: i + 1
                }))
            },
            {
                id: 'section-4',
                title: 'Financing & Mortgages',
                hours: 10,
                topics: context.filenames.slice(20, 28).map((name, i) => ({
                    id: `topic-4-${i}`,
                    name,
                    sourceFile: name,
                    estimatedMinutes: 30,
                    order: i + 1
                }))
            }
        ];

        return {
            success: true,
            outline: {
                sections,
                totalHours: context.targetHours
            },
            missingTopics: [],
            reasoning: `Generated ${sections.length} sections from ${context.filenames.length} available topics for ${context.stateCode} ${context.targetHours}-hour course.`
        } as OutlineOutput;
    } else {
        // Mock topic response
        const topicName = context.filenames[0] || 'New Topic';
        return {
            success: true,
            topic: {
                title: topicName,
                content: `# ${topicName}\n\nThis is AI-generated content for the topic "${topicName}".\n\n## Key Concepts\n\n- Important point 1\n- Important point 2\n- Important point 3\n\n## Summary\n\nThis topic covers essential real estate concepts relevant to the ${context.stateCode} pre-licensing curriculum.`,
                keyPoints: [
                    'Understanding core terminology',
                    'Practical applications',
                    `${context.stateCode}-specific requirements`
                ],
                estimatedReadTime: 15
            },
            citations: ['National Content Library'],
            reasoning: 'Content generated based on topic name and state context.'
        } as TopicOutput;
    }
}
