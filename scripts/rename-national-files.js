const fs = require('fs');
const path = require('path');

const NATIONAL_CONTENT_PATH = path.join(__dirname, '../app/national_content');

function sanitizeFilename(name) {
    // Remove or replace characters that are invalid in Windows filenames
    return name
        .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
        .replace(/\s+/g, ' ')          // Normalize whitespace
        .trim()
        .substring(0, 150);            // Limit length to avoid path issues
}

function extractTopicName(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Remove all HTML comments first
        const contentWithoutComments = content.replace(/<!--[\s\S]*?-->/g, '');

        // Look for the first H1 heading (# Title)
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

function renameFiles() {
    const sections = fs.readdirSync(NATIONAL_CONTENT_PATH)
        .filter(item => fs.statSync(path.join(NATIONAL_CONTENT_PATH, item)).isDirectory())
        .sort((a, b) => {
            const numA = parseInt(a.match(/Section (\d+)/)?.[1] || '0');
            const numB = parseInt(b.match(/Section (\d+)/)?.[1] || '0');
            return numA - numB;
        });

    let renamedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const renameLog = [];

    for (const section of sections) {
        const sectionPath = path.join(NATIONAL_CONTENT_PATH, section);
        const files = fs.readdirSync(sectionPath)
            .filter(f => f.endsWith('.md'));

        for (const file of files) {
            const filePath = path.join(sectionPath, file);
            const topicName = extractTopicName(filePath);

            if (topicName) {
                const sanitizedName = sanitizeFilename(topicName);
                const newFileName = `${sanitizedName}.md`;
                const newFilePath = path.join(sectionPath, newFileName);

                // Skip if already renamed
                if (file === newFileName) {
                    console.log(`[SKIP] Already named: ${file}`);
                    skippedCount++;
                    continue;
                }

                // Check if target file already exists
                if (fs.existsSync(newFilePath)) {
                    console.log(`[CONFLICT] Target exists: ${newFileName} (from ${file})`);
                    // Add a suffix to make unique
                    const uniqueName = `${sanitizedName} (${file.replace('.audited.md', '').replace('.md', '')}).md`;
                    const uniquePath = path.join(sectionPath, uniqueName);
                    try {
                        fs.renameSync(filePath, uniquePath);
                        console.log(`[RENAMED] ${file} -> ${uniqueName}`);
                        renameLog.push({ section, from: file, to: uniqueName });
                        renamedCount++;
                    } catch (err) {
                        console.error(`[ERROR] Failed to rename ${file}:`, err.message);
                        errorCount++;
                    }
                } else {
                    try {
                        fs.renameSync(filePath, newFilePath);
                        console.log(`[RENAMED] ${file} -> ${newFileName}`);
                        renameLog.push({ section, from: file, to: newFileName });
                        renamedCount++;
                    } catch (err) {
                        console.error(`[ERROR] Failed to rename ${file}:`, err.message);
                        errorCount++;
                    }
                }
            } else {
                console.log(`[NO TOPIC] Skipping: ${file}`);
                skippedCount++;
            }
        }
    }

    console.log('\n========================================');
    console.log(`Rename complete!`);
    console.log(`  Renamed: ${renamedCount}`);
    console.log(`  Skipped: ${skippedCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log('========================================');

    // Write rename log
    const logPath = path.join(__dirname, '../rename-log.json');
    fs.writeFileSync(logPath, JSON.stringify(renameLog, null, 2));
    console.log(`Rename log saved to: ${logPath}`);
}

renameFiles();
