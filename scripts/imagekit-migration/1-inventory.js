/**
 * Step 1: Generate inventory of all images to migrate
 * 
 * This script scans the public folder and creates a mapping file
 * of all images that need to be uploaded to ImageKit.
 * 
 * Run: node scripts/imagekit-migration/1-inventory.js
 */

import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PUBLIC_DIR = join(__dirname, '../../public');
const OUTPUT_FILE = join(__dirname, 'inventory.json');

// Image extensions to include
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

// Directories/files to exclude
const EXCLUDES = [
    'os-bookmarks',
    'favicon.ico',
    '.DS_Store',
    'robots.txt',
    '_redirects',
    'template.md',
    'template.mdx',
];

function isExcluded(name) {
    return EXCLUDES.some(exclude => name === exclude || name.startsWith(exclude));
}

function isImageFile(filename) {
    const ext = extname(filename).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
}

function scanDirectory(dir, images = []) {
    const entries = readdirSync(dir);

    for (const entry of entries) {
        if (isExcluded(entry)) {
            console.log(`  ⏭️  Skipping: ${entry}`);
            continue;
        }

        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            scanDirectory(fullPath, images);
        } else if (stat.isFile() && isImageFile(entry)) {
            const relativePath = relative(PUBLIC_DIR, fullPath);
            const publicPath = '/' + relativePath; // Path as used in source files
            const size = stat.size;

            images.push({
                localPath: fullPath,
                publicPath: publicPath,
                imagekitPath: relativePath, // Folder structure on ImageKit
                filename: entry,
                sizeBytes: size,
                sizeKB: (size / 1024).toFixed(2)
            });
        }
    }

    return images;
}

console.log('🔍 Scanning public folder for images...\n');
console.log(`   Public directory: ${PUBLIC_DIR}\n`);

const images = scanDirectory(PUBLIC_DIR);

// Sort by path for easier reading
images.sort((a, b) => a.publicPath.localeCompare(b.publicPath));

// Calculate totals
const totalSize = images.reduce((sum, img) => sum + img.sizeBytes, 0);
const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

const inventory = {
    generatedAt: new Date().toISOString(),
    summary: {
        totalImages: images.length,
        totalSizeMB: totalSizeMB,
        extensions: [...new Set(images.map(img => extname(img.filename).toLowerCase()))],
        folders: [...new Set(images.map(img => {
            const parts = img.imagekitPath.split('/');
            return parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)';
        }))]
    },
    images: images
};

writeFileSync(OUTPUT_FILE, JSON.stringify(inventory, null, 2));

console.log('\n📊 Inventory Summary:');
console.log(`   Total images: ${inventory.summary.totalImages}`);
console.log(`   Total size: ${totalSizeMB} MB`);
console.log(`   Extensions: ${inventory.summary.extensions.join(', ')}`);
console.log(`   Folders: ${inventory.summary.folders.length}`);
console.log('\n   Folders breakdown:');
inventory.summary.folders.forEach(folder => {
    const count = images.filter(img => {
        const parts = img.imagekitPath.split('/');
        const imgFolder = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)';
        return imgFolder === folder;
    }).length;
    console.log(`     - ${folder}: ${count} images`);
});

console.log(`\n✅ Inventory saved to: ${OUTPUT_FILE}`);
