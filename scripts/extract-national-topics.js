const fs = require('fs');
const path = require('path');

const NATIONAL_CONTENT_PATH = path.join(__dirname, '../app/national_content');
const OUTPUT_PATH = path.join(__dirname, '../national-content-outline.md');

function extractTopicName(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Remove all HTML comments first
        const contentWithoutComments = content.replace(/<!--[\s\S]*?-->/g, '');

        // Look for the first H1 heading (# Title) that's NOT "AUDIT LOG"
        const h1Matches = contentWithoutComments.match(/^#\s+(.+)$/gm);
        if (h1Matches) {
            for (const match of h1Matches) {
                const topicName = match.replace(/^#\s+/, '').trim();
                // Skip AUDIT LOG or similar headers
                if (!topicName.toLowerCase().includes('audit log')) {
                    return topicName;
                }
            }
        }
        return null;
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return null;
    }
}

function processDirectory() {
    const sections = fs.readdirSync(NATIONAL_CONTENT_PATH)
        .filter(item => fs.statSync(path.join(NATIONAL_CONTENT_PATH, item)).isDirectory())
        .sort((a, b) => {
            const numA = parseInt(a.match(/Section (\d+)/)?.[1] || '0');
            const numB = parseInt(b.match(/Section (\d+)/)?.[1] || '0');
            return numA - numB;
        });

    let outline = `# National Content Outline\n\n`;
    outline += `Generated: ${new Date().toISOString()}\n`;
    outline += `Total Sections: ${sections.length}\n\n`;
    outline += `---\n\n`;

    let allTopics = [];
    let totalFiles = 0;
    let missingTopics = [];

    for (const section of sections) {
        const sectionPath = path.join(NATIONAL_CONTENT_PATH, section);
        const files = fs.readdirSync(sectionPath)
            .filter(f => f.endsWith('.md'))
            .sort((a, b) => {
                const numA = parseFloat(a.match(/([\d.]+)/)?.[1] || '0');
                const numB = parseFloat(b.match(/([\d.]+)/)?.[1] || '0');
                return numA - numB;
            });

        outline += `## ${section}\n\n`;

        for (const file of files) {
            const filePath = path.join(sectionPath, file);
            const topicName = extractTopicName(filePath);
            const fileNum = file.replace('.audited.md', '').replace('.md', '');

            if (topicName) {
                outline += `- ${topicName}\n`;
                allTopics.push({
                    section,
                    fileNum,
                    originalName: file,
                    topicName
                });
                totalFiles++;
            } else {
                outline += `- [NO TOPIC FOUND] ${file}\n`;
                missingTopics.push({ section, file });
                totalFiles++;
            }
        }

        outline += `\n`;
    }

    outline += `---\n\n`;
    outline += `## Summary\n\n`;
    outline += `Total Files: ${totalFiles}\n`;
    outline += `Files with Topics: ${allTopics.length}\n`;
    outline += `Files Missing Topics: ${missingTopics.length}\n\n`;

    if (missingTopics.length > 0) {
        outline += `### Files Missing Topics:\n`;
        for (const m of missingTopics) {
            outline += `- ${m.section}/${m.file}\n`;
        }
    }

    fs.writeFileSync(OUTPUT_PATH, outline, 'utf-8');
    console.log(`Outline written to: ${OUTPUT_PATH}`);
    console.log(`Total topics extracted: ${allTopics.length}`);
    console.log(`Missing topics: ${missingTopics.length}`);

    // Also output just the copiable topic names
    const topicNamesOnly = allTopics.map(t => t.topicName).join('\n');
    const topicNamesPath = path.join(__dirname, '../national-content-topics.txt');
    fs.writeFileSync(topicNamesPath, topicNamesOnly, 'utf-8');
    console.log(`Topic names list written to: ${topicNamesPath}`);
}

processDirectory();
