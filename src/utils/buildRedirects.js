// This utility creates nicer-looking redirect pages at build time
// instead of the default minimal meta refresh

import fs from 'fs';
import path from 'path';
import astroConfig from '../../astro.config.mjs';

// Get all redirects from the Astro config
export async function generateRedirectPages(outDir) {
  const redirects = astroConfig.redirects || {};
  console.log(`Generating custom redirect pages for ${Object.keys(redirects).length} redirects...`);

  // Create redirect template HTML
  const templateFile = path.join(process.cwd(), 'dist', '_redirects_template.html');
  if (!fs.existsSync(templateFile)) {
    console.log('Creating redirect template file...');
    const templateHTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="refresh" content="0;url=DESTINATION_PLACEHOLDER" />
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
      <h1 class="destination">DESTINATION_PLACEHOLDER</h1>
      <div class="spinner"></div>
    </div>
    <script>
      // Redirect immediately
      window.location.href = "DESTINATION_PLACEHOLDER";
    </script>
  </body>
</html>`;
    fs.writeFileSync(templateFile, templateHTML);
  }

  let template = fs.readFileSync(templateFile, 'utf-8');

  // Process each redirect
  for (const [source, destination] of Object.entries(redirects)) {
    const dest = typeof destination === 'string' 
      ? destination 
      : destination.destination;
    
    // Skip if destination is not a string (should not happen)
    if (typeof dest !== 'string') continue;
    
    // Create directory for the redirect if it doesn't exist
    const sourcePath = source.startsWith('/') ? source.substring(1) : source;
    const targetDir = path.join(outDir, sourcePath);
    
    try {
      // Create the directory structure
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Create the redirect HTML file
      const targetPath = path.join(targetDir, 'index.html');
      const content = template.replaceAll('DESTINATION_PLACEHOLDER', dest);
      
      fs.writeFileSync(targetPath, content);
      console.log(`Created redirect: ${sourcePath} -> ${dest}`);
    } catch (error) {
      console.error(`Error creating redirect for ${source}:`, error);
    }
  }
} 