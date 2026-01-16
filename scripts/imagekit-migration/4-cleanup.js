/**
 * Step 4: Remove migrated image files from local public folder
 * 
 * This script reads the inventory and removes all image files that were
 * successfully migrated to ImageKit. It also cleans up empty directories.
 * 
 * Run: node scripts/imagekit-migration/4-cleanup.js
 * 
 * Options:
 *   --dry-run    Preview files to be deleted without actually deleting
 *   --force      Skip confirmation prompt
 */

import { readFileSync, existsSync, unlinkSync, rmdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PROJECT_ROOT = join(__dirname, '../..');
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');
const INVENTORY_FILE = join(__dirname, 'inventory.json');
const MAPPING_FILE = join(__dirname, 'mapping.json');

const isDryRun = process.argv.includes('--dry-run');
const forceDelete = process.argv.includes('--force');

// Load inventory
if (!existsSync(INVENTORY_FILE)) {
    console.error('❌ Inventory file not found. Cannot proceed with cleanup.');
    process.exit(1);
}

// Load mapping to verify images were uploaded
if (!existsSync(MAPPING_FILE)) {
    console.error('❌ Mapping file not found. Run 2-upload.js first to upload images.');
    process.exit(1);
}

const inventory = JSON.parse(readFileSync(INVENTORY_FILE, 'utf-8'));
const mapping = JSON.parse(readFileSync(MAPPING_FILE, 'utf-8'));

// Get list of successfully uploaded images
const uploadedPaths = new Set(Object.keys(mapping));

// Filter inventory to only include uploaded images
const filesToDelete = inventory.images.filter(img => uploadedPaths.has(img.publicPath));

if (filesToDelete.length === 0) {
    console.log('ℹ️  No files to delete. Either no images were uploaded or they were already deleted.');
    process.exit(0);
}

// Calculate total size to be freed
const totalBytes = filesToDelete.reduce((sum, img) => sum + img.sizeBytes, 0);
const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

console.log('🗑️  ImageKit Migration Cleanup\n');
console.log('─'.repeat(60));
console.log(`\n📊 Summary:`);
console.log(`   Files to delete: ${filesToDelete.length}`);
console.log(`   Space to free: ${totalMB} MB`);
console.log(`   Mode: ${isDryRun ? 'DRY RUN (no files will be deleted)' : 'LIVE'}`);
console.log('\n─'.repeat(60));

// Group by folder for display
const byFolder = {};
for (const img of filesToDelete) {
    const folder = dirname(img.imagekitPath);
    const displayFolder = folder === '.' ? '(root)' : folder;
    if (!byFolder[displayFolder]) {
        byFolder[displayFolder] = [];
    }
    byFolder[displayFolder].push(img);
}

console.log('\n📁 Files to delete by folder:\n');
for (const [folder, files] of Object.entries(byFolder).sort()) {
    const folderSize = files.reduce((sum, f) => sum + f.sizeBytes, 0);
    const folderSizeMB = (folderSize / (1024 * 1024)).toFixed(2);
    console.log(`   ${folder}/ (${files.length} files, ${folderSizeMB} MB)`);
    if (files.length <= 5) {
        files.forEach(f => console.log(`     - ${f.filename}`));
    } else {
        files.slice(0, 3).forEach(f => console.log(`     - ${f.filename}`));
        console.log(`     ... and ${files.length - 3} more`);
    }
}

console.log('\n' + '─'.repeat(60));

async function confirmDelete() {
    if (forceDelete || isDryRun) {
        return true;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question('\n⚠️  Are you sure you want to delete these files? (y/N): ', answer => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

function isDirectoryEmpty(dirPath) {
    try {
        const files = readdirSync(dirPath);
        return files.length === 0;
    } catch {
        return false;
    }
}

function cleanupEmptyDirectories(dirPath) {
    const emptiedDirs = [];

    // Get all unique directories that contained deleted files
    const dirsToCheck = new Set();
    for (const img of filesToDelete) {
        let dir = dirname(img.localPath);
        while (dir !== PUBLIC_DIR && dir.startsWith(PUBLIC_DIR)) {
            dirsToCheck.add(dir);
            dir = dirname(dir);
        }
    }

    // Sort by depth (deepest first) to clean up from leaves
    const sortedDirs = Array.from(dirsToCheck).sort((a, b) => b.length - a.length);

    for (const dir of sortedDirs) {
        if (existsSync(dir) && isDirectoryEmpty(dir)) {
            if (!isDryRun) {
                rmdirSync(dir);
            }
            emptiedDirs.push(relative(PUBLIC_DIR, dir));
        }
    }

    return emptiedDirs;
}

async function main() {
    const confirmed = await confirmDelete();

    if (!confirmed) {
        console.log('\n❌ Cleanup cancelled.');
        process.exit(0);
    }

    console.log('\n🔄 Deleting files...\n');

    let deletedCount = 0;
    let failedCount = 0;
    const failedFiles = [];

    for (const img of filesToDelete) {
        const { localPath, publicPath } = img;

        try {
            if (existsSync(localPath)) {
                if (!isDryRun) {
                    unlinkSync(localPath);
                }
                console.log(`   ✅ ${publicPath}`);
                deletedCount++;
            } else {
                console.log(`   ⏭️  Already deleted: ${publicPath}`);
            }
        } catch (error) {
            console.log(`   ❌ Failed: ${publicPath} - ${error.message}`);
            failedFiles.push({ path: publicPath, error: error.message });
            failedCount++;
        }
    }

    // Clean up empty directories
    console.log('\n🧹 Cleaning up empty directories...');
    const emptiedDirs = cleanupEmptyDirectories(PUBLIC_DIR);

    if (emptiedDirs.length > 0) {
        console.log(`   Removed ${emptiedDirs.length} empty directories:`);
        emptiedDirs.forEach(dir => console.log(`     - ${dir}/`));
    } else {
        console.log('   No empty directories to remove.');
    }

    console.log('\n' + '─'.repeat(60));
    console.log('\n📊 Cleanup Summary:');
    console.log(`   ✅ Deleted: ${deletedCount} files`);
    console.log(`   ❌ Failed: ${failedCount} files`);
    console.log(`   📁 Empty dirs removed: ${emptiedDirs.length}`);
    console.log(`   💾 Space freed: ${totalMB} MB`);

    if (isDryRun) {
        console.log('\n⚠️  DRY RUN - No files were actually deleted');
        console.log('   Run without --dry-run to delete files');
    } else {
        console.log('\n✅ Cleanup complete!');
    }

    if (failedFiles.length > 0) {
        console.log('\n⚠️  Failed files:');
        failedFiles.forEach(f => console.log(`   - ${f.path}: ${f.error}`));
    }
}

main().catch(console.error);
