#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { generateRedirectPages } from '../src/utils/buildRedirects.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

// Generate custom redirect pages
(async () => {
  try {
    await generateRedirectPages(distDir);
    console.log('✅ Custom redirect pages generated successfully!');
  } catch (error) {
    console.error('❌ Error generating redirect pages:', error);
    process.exit(1);
  }
})(); 