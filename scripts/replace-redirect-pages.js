#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

// Custom HTML template for redirects
const REDIRECT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="refresh" content="0;url=DESTINATION_URL" />
    <title>Redirecting...</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: #f9f9f9;
        color: #333;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        flex-direction: column;
        text-align: center;
        padding: 0 20px;
      }
      .redirect-container {
        background-color: white;
        border-radius: 8px;
        padding: 40px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        max-width: 600px;
        width: 100%;
      }
      h1 {
        margin: 0 0 10px 0;
        color: #222;
        font-size: 24px;
        font-weight: 600;
      }
      p {
        margin: 0 0 20px 0;
        color: #666;
        font-size: 16px;
      }
      .destination {
        background-color: #f2f2f2;
        padding: 15px;
        border-radius: 6px;
        word-break: break-all;
        font-size: 18px;
        margin-bottom: 25px;
        color: #0066cc;
      }
      .spinner {
        display: inline-block;
        width: 30px;
        height: 30px;
        border: 3px solid rgba(0, 102, 204, 0.2);
        border-radius: 50%;
        border-top-color: #0066cc;
        animation: spin 1s ease-in-out infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="redirect-container">
      <p>Redirecting to</p>
      <h1 class="destination">DESTINATION_URL</h1>
      <div class="spinner"></div>
    </div>
    <script>
      // Redirect immediately
      window.location.href = "DESTINATION_URL";
    </script>
  </body>
</html>`;

// Find all redirect HTML files in the dist directory
async function findRedirectHtmlFiles() {
  // Look for files that might be redirect files
  const htmlFiles = await glob('**/*.html', { cwd: distDir });
  
  const redirectFiles = [];
  
  for (const file of htmlFiles) {
    const filePath = path.join(distDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if this is a redirect HTML file
    if (content.includes('<meta http-equiv="refresh"') && 
        content.includes('content="0;url=')) {
      redirectFiles.push({
        path: filePath,
        content
      });
    }
  }
  
  return redirectFiles;
}

// Extract destination URL from a redirect HTML
function extractDestinationUrl(html) {
  const metaTagMatch = html.match(/<meta\s+http-equiv="refresh"\s+content="0;url=([^"]+)"/i);
  if (metaTagMatch && metaTagMatch[1]) {
    return metaTagMatch[1];
  }
  return null;
}

// Replace the default redirect HTML with our custom template
async function replaceRedirectPages() {
  try {
    const redirectFiles = await findRedirectHtmlFiles();
    
    if (redirectFiles.length === 0) {
      console.log('No redirect pages found.');
      return;
    }
    
    console.log(`Found ${redirectFiles.length} redirect pages to enhance.`);
    
    for (const redirectFile of redirectFiles) {
      const destination = extractDestinationUrl(redirectFile.content);
      
      if (!destination) {
        console.log(`Could not extract destination URL from ${redirectFile.path}, skipping.`);
        continue;
      }
      
      // Create custom HTML with the destination
      const customHtml = REDIRECT_TEMPLATE.replaceAll('DESTINATION_URL', destination);
      
      // Replace the file
      fs.writeFileSync(redirectFile.path, customHtml);
      console.log(`Enhanced redirect page: ${redirectFile.path} -> ${destination}`);
    }
    
    console.log('✅ Successfully enhanced all redirect pages!');
  } catch (error) {
    console.error('Error enhancing redirect pages:', error);
    process.exit(1);
  }
}

// Run the script
replaceRedirectPages(); 