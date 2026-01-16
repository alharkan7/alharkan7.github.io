/**
 * Step 2: Upload images to ImageKit CDN
 * 
 * This script reads the inventory and uploads all images to ImageKit,
 * preserving the folder structure. It generates a mapping file for the next step.
 * 
 * Prerequisites:
 * - npm install imagekit dotenv
 * - Set IMAGEKIT_* variables in .env
 * 
 * Run: node scripts/imagekit-migration/2-upload.js
 */

import ImageKit from 'imagekit';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

// Configuration
const INVENTORY_FILE = join(__dirname, 'inventory.json');
const MAPPING_FILE = join(__dirname, 'mapping.json');
const PROGRESS_FILE = join(__dirname, 'upload-progress.json');

// ImageKit configuration
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Validate configuration
if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
    console.error('❌ Missing ImageKit configuration in .env file');
    console.error('   Required: IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT');
    process.exit(1);
}

// Load inventory
if (!existsSync(INVENTORY_FILE)) {
    console.error('❌ Inventory file not found. Run 1-inventory.js first.');
    process.exit(1);
}

const inventory = JSON.parse(readFileSync(INVENTORY_FILE, 'utf-8'));

// Load progress (for resumable uploads)
let progress = { uploaded: [], failed: [] };
if (existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
    console.log(`📝 Found existing progress: ${progress.uploaded.length} uploaded, ${progress.failed.length} failed\n`);
}

// Track mapping
let mapping = {};
if (existsSync(MAPPING_FILE)) {
    mapping = JSON.parse(readFileSync(MAPPING_FILE, 'utf-8'));
}

async function uploadImage(image) {
    const { localPath, publicPath, imagekitPath, filename } = image;

    // Get the folder path (without filename)
    const folderPath = dirname(imagekitPath);
    const folder = folderPath === '.' ? '/' : '/' + folderPath;

    try {
        const fileBuffer = readFileSync(localPath);

        const response = await imagekit.upload({
            file: fileBuffer,
            fileName: filename,
            folder: folder,
            useUniqueFileName: false, // Keep original filename
        });

        return {
            success: true,
            publicPath: publicPath,
            cdnUrl: response.url,
            fileId: response.fileId
        };
    } catch (error) {
        return {
            success: false,
            publicPath: publicPath,
            error: error.message
        };
    }
}

async function main() {
    console.log('🚀 Starting ImageKit upload...\n');
    console.log(`   URL Endpoint: ${process.env.IMAGEKIT_URL_ENDPOINT}`);
    console.log(`   Total images: ${inventory.images.length}`);
    console.log(`   Already uploaded: ${progress.uploaded.length}`);
    console.log('');

    const toUpload = inventory.images.filter(
        img => !progress.uploaded.includes(img.publicPath)
    );

    if (toUpload.length === 0) {
        console.log('✅ All images already uploaded!');
        return;
    }

    console.log(`   Remaining to upload: ${toUpload.length}\n`);
    console.log('─'.repeat(60));

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toUpload.length; i++) {
        const image = toUpload[i];
        const progressStr = `[${i + 1}/${toUpload.length}]`;

        process.stdout.write(`${progressStr} Uploading: ${image.publicPath}... `);

        const result = await uploadImage(image);

        if (result.success) {
            console.log('✅');
            mapping[result.publicPath] = result.cdnUrl;
            progress.uploaded.push(result.publicPath);
            successCount++;
        } else {
            console.log(`❌ ${result.error}`);
            progress.failed.push({ path: result.publicPath, error: result.error });
            failCount++;
        }

        // Save progress after each upload (for resumability)
        writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
        writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('─'.repeat(60));
    console.log('\n📊 Upload Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`\n✅ Mapping saved to: ${MAPPING_FILE}`);

    if (progress.failed.length > 0) {
        console.log('\n⚠️  Failed uploads:');
        progress.failed.forEach(f => console.log(`   - ${f.path}: ${f.error}`));
    }
}

main().catch(console.error);
