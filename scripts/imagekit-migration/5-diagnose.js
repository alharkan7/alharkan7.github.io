/**
 * Diagnose ImageKit 400 errors and verify which images work
 * 
 * This script checks each uploaded image URL to identify which ones
 * are returning 400 Bad Request errors (likely due to size/resolution limits).
 * 
 * Run: node scripts/imagekit-migration/5-diagnose.js
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MAPPING_FILE = join(__dirname, 'mapping.json');
const INVENTORY_FILE = join(__dirname, 'inventory.json');

if (!existsSync(MAPPING_FILE)) {
    console.error('❌ Mapping file not found.');
    process.exit(1);
}

const mapping = JSON.parse(readFileSync(MAPPING_FILE, 'utf-8'));
const inventory = existsSync(INVENTORY_FILE)
    ? JSON.parse(readFileSync(INVENTORY_FILE, 'utf-8'))
    : null;

// Create lookup for file sizes
const sizeMap = {};
if (inventory) {
    inventory.images.forEach(img => {
        sizeMap[img.publicPath] = {
            sizeBytes: img.sizeBytes,
            sizeKB: img.sizeKB,
            sizeMB: (img.sizeBytes / (1024 * 1024)).toFixed(2)
        };
    });
}

async function checkUrl(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return {
            status: response.status,
            ok: response.ok,
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
        };
    } catch (error) {
        return {
            status: 0,
            ok: false,
            error: error.message
        };
    }
}

async function main() {
    console.log('🔍 Diagnosing ImageKit uploads...\n');
    console.log('─'.repeat(70));

    const entries = Object.entries(mapping);
    const results = {
        working: [],
        failing: [],
        unknown: []
    };

    console.log(`Checking ${entries.length} URLs...\n`);

    for (let i = 0; i < entries.length; i++) {
        const [localPath, cdnUrl] = entries[i];
        const size = sizeMap[localPath];
        const sizeStr = size ? `(${size.sizeMB} MB)` : '';

        process.stdout.write(`[${i + 1}/${entries.length}] ${localPath} ${sizeStr}... `);

        const result = await checkUrl(cdnUrl);

        if (result.ok) {
            console.log('✅');
            results.working.push({ localPath, cdnUrl, size });
        } else if (result.status === 400) {
            console.log('❌ 400 Bad Request');
            results.failing.push({ localPath, cdnUrl, size, status: 400 });
        } else {
            console.log(`⚠️  Status: ${result.status || result.error}`);
            results.unknown.push({ localPath, cdnUrl, size, status: result.status, error: result.error });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('\n' + '─'.repeat(70));
    console.log('\n📊 Diagnosis Summary:\n');
    console.log(`   ✅ Working: ${results.working.length}`);
    console.log(`   ❌ Failing (400): ${results.failing.length}`);
    console.log(`   ⚠️  Unknown: ${results.unknown.length}`);

    if (results.failing.length > 0) {
        console.log('\n' + '─'.repeat(70));
        console.log('\n❌ FAILING IMAGES (400 Bad Request):\n');
        console.log('These images likely exceed ImageKit free plan limits:');
        console.log('- Max file size: 25 MB');
        console.log('- Max resolution: 25 megapixels (e.g., 5000x5000)\n');

        results.failing.forEach((f, i) => {
            console.log(`${i + 1}. ${f.localPath}`);
            console.log(`   Size: ${f.size?.sizeMB || '?'} MB`);
            console.log(`   URL: ${f.cdnUrl}`);
            console.log('');
        });

        console.log('─'.repeat(70));
        console.log('\n💡 SOLUTIONS:\n');
        console.log('1. RESIZE: Reduce image dimensions before uploading');
        console.log('   - Keep under 5000x5000 pixels (25 megapixels)');
        console.log('   - Use: sips --resampleWidth 4000 image.png -o image_resized.png\n');
        console.log('2. COMPRESS: Reduce file size');
        console.log('   - Convert PNG to WebP for smaller sizes');
        console.log('   - Use: cwebp -q 85 image.png -o image.webp\n');
        console.log('3. UPGRADE: ImageKit paid plans support larger files');
        console.log('   - Lite plan: 40 MB, higher resolution limits');
        console.log('   - Pro plan: 50 MB, up to 100 megapixels\n');
        console.log('4. KEEP LOCALLY: Leave large images in public/ folder');
        console.log('   - Only migrate smaller images to CDN');
    }

    // Output failing paths for easy scripting
    if (results.failing.length > 0) {
        console.log('\n' + '─'.repeat(70));
        console.log('\n📝 Failing image paths (for scripting):\n');
        results.failing.forEach(f => console.log(f.localPath));
    }
}

main().catch(console.error);
