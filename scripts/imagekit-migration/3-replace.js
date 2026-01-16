/**
 * Step 3: Replace local image paths with ImageKit CDN URLs
 * 
 * This script reads the mapping file and replaces all local image paths
 * in source files (markdown, HTML, Astro) with CDN URLs.
 * 
 * Run: node scripts/imagekit-migration/3-replace.js
 * 
 * Options:
 *   --dry-run    Preview changes without modifying files
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PROJECT_ROOT = join(__dirname, '../..');
const MAPPING_FILE = join(__dirname, 'mapping.json');
const REPORT_FILE = join(__dirname, 'replacement-report.json');

// Files to exclude from replacement
const EXCLUDE_PATTERNS = [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
    '**/scripts/imagekit-migration/**',
    '**/fonts.css', // Explicitly excluded as per user request
];

// File patterns to search
const FILE_PATTERNS = [
    'src/**/*.md',
    'src/**/*.html',
    'src/**/*.astro',
];

const isDryRun = process.argv.includes('--dry-run');

// Load mapping
if (!existsSync(MAPPING_FILE)) {
    console.error('❌ Mapping file not found. Run 2-upload.js first.');
    process.exit(1);
}

const mapping = JSON.parse(readFileSync(MAPPING_FILE, 'utf-8'));
const mappingEntries = Object.entries(mapping);

if (mappingEntries.length === 0) {
    console.error('❌ Mapping file is empty. Upload images first.');
    process.exit(1);
}

console.log(`📂 Loaded ${mappingEntries.length} image mappings\n`);

// Sort by path length (longest first) to avoid partial replacements
mappingEntries.sort((a, b) => b[0].length - a[0].length);

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceInContent(content, filePath) {
    let newContent = content;
    const replacements = [];

    for (const [localPath, cdnUrl] of mappingEntries) {
        // Various patterns to match:
        // 1. src="/path/to/image.png"
        // 2. src='/path/to/image.png'
        // 3. ![alt](/path/to/image.png)
        // 4. ](/path/to/image.png)
        // 5. url(/path/to/image.png)

        const escapedPath = escapeRegex(localPath);

        // Pattern 1 & 2: src attribute (both quotes)
        const srcPatterns = [
            new RegExp(`(src=")${escapedPath}(")`, 'g'),
            new RegExp(`(src=')${escapedPath}(')`, 'g'),
        ];

        // Pattern 3 & 4: Markdown image syntax
        const mdPatterns = [
            new RegExp(`(\\]\\()${escapedPath}(\\))`, 'g'),  // ](path)
            new RegExp(`(!\\[[^\\]]*\\]\\()${escapedPath}(\\))`, 'g'), // ![alt](path)
        ];

        // Pattern 5: CSS url()
        const cssPatterns = [
            new RegExp(`(url\\()${escapedPath}(\\))`, 'g'),
            new RegExp(`(url\\(")${escapedPath}("\\))`, 'g'),
            new RegExp(`(url\\(')${escapedPath}('\\))`, 'g'),
        ];

        const allPatterns = [...srcPatterns, ...mdPatterns, ...cssPatterns];

        for (const pattern of allPatterns) {
            const matches = newContent.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    replacements.push({
                        original: match,
                        localPath: localPath,
                        cdnUrl: cdnUrl
                    });
                });
                newContent = newContent.replace(pattern, `$1${cdnUrl}$2`);
            }
        }
    }

    return { newContent, replacements };
}

function processFiles() {
    const report = {
        processedAt: new Date().toISOString(),
        isDryRun: isDryRun,
        files: [],
        summary: {
            totalFiles: 0,
            modifiedFiles: 0,
            totalReplacements: 0
        }
    };

    // Find all matching files
    const files = [];
    for (const pattern of FILE_PATTERNS) {
        const found = globSync(pattern, {
            cwd: PROJECT_ROOT,
            ignore: EXCLUDE_PATTERNS,
            absolute: true
        });
        files.push(...found);
    }

    console.log(`🔍 Found ${files.length} files to process\n`);
    console.log('─'.repeat(60));

    for (const filePath of files) {
        const relativePath = relative(PROJECT_ROOT, filePath);
        const content = readFileSync(filePath, 'utf-8');

        const { newContent, replacements } = replaceInContent(content, filePath);

        report.summary.totalFiles++;

        if (replacements.length > 0) {
            report.summary.modifiedFiles++;
            report.summary.totalReplacements += replacements.length;

            console.log(`\n📄 ${relativePath}`);
            console.log(`   Replacements: ${replacements.length}`);

            replacements.forEach((r, i) => {
                console.log(`   ${i + 1}. ${r.localPath}`);
                console.log(`      → ${r.cdnUrl}`);
            });

            report.files.push({
                path: relativePath,
                replacements: replacements.map(r => ({
                    from: r.localPath,
                    to: r.cdnUrl
                }))
            });

            if (!isDryRun) {
                writeFileSync(filePath, newContent);
            }
        }
    }

    console.log('\n' + '─'.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   Total files scanned: ${report.summary.totalFiles}`);
    console.log(`   Files modified: ${report.summary.modifiedFiles}`);
    console.log(`   Total replacements: ${report.summary.totalReplacements}`);

    if (isDryRun) {
        console.log('\n⚠️  DRY RUN - No files were modified');
        console.log('   Run without --dry-run to apply changes');
    } else {
        console.log('\n✅ All replacements applied!');
    }

    // Save report
    writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`\n📝 Report saved to: ${REPORT_FILE}`);
}

processFiles();
