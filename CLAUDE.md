# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal blog ([raihankalla.id](https://raihankalla.id)) built with Astro 5.16.6 as a static site for GitHub Pages deployment. The site uses a hybrid architecture combining Astro, React, and Svelte components with MDX for content authoring.

## Development Commands

```bash
# Install dependencies (requires pnpm)
pnpm install

# Start development server (runs on localhost:4321)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

**Important**: The `pnpm build` command runs a post-build script (`scripts/replace-redirect-pages.js`) that enhances redirect pages with custom templates.

## Architecture

### Static Site Strategy
- **Output Mode**: Static (`output: 'static'` in `astro.config.mjs`)
- **Deployment**: GitHub Pages (primary) and Vercel
- **Authentication**: Fully client-side Firebase Auth (no server-side endpoints required)
- **Content**: MDX files with frontmatter stored in `/src/posts/`

### Directory Structure

```
src/
├── components/          # Reusable UI components (Astro, React, Svelte)
│   └── ProtectedRoute.astro  # Client-side auth wrapper for protected pages
├── posts/     # MDX content organized by category
│   ├── blog/           # Main blog posts
│   ├── misc/           # Miscellaneous posts
│   ├── ptm/            # PTM category posts
│   ├── stories/        # Story posts
│   └── uncategorized/  # Uncategorized content
├── layouts/            # Layout templates
│   ├── BaseLayout.astro      # Main layout wrapper
│   └── RedirectLayout.astro  # Template for redirect pages
├── lib/                # Utilities and configurations
│   ├── auth.js         # Client-side Firebase Auth utilities
│   ├── firebase.ts     # Firebase initialization
│   └── integrations/   # Third-party service integrations
├── pages/              # Route components mirroring posts structure
│   ├── api/           # API endpoints
│   └── [categories]/   # Category index pages
├── styles/             # Global CSS
└── utils/              # Helper functions
```

### Multi-Framework Integration

The project uses three UI frameworks:
- **Astro**: Primary framework for static page generation and layouts
- **React**: For interactive components (React Islands architecture)
- **Svelte**: For stateful components

Components can be imported and used interchangeably within Astro pages.

## Client-Side Authentication

This project uses a unique **client-side only authentication** strategy to work with static hosting:

### How It Works
1. Firebase Auth runs entirely in the browser
2. Session state maintained via Firebase Auth + localStorage
3. No server-side auth endpoints required

### Protecting Routes
```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import ProtectedRoute from "../components/ProtectedRoute.astro";
---

<BaseLayout title="Protected Page">
  <ProtectedRoute />
  <!-- Protected content here -->
</BaseLayout>
```

The `ProtectedRoute` component:
- Checks auth status on page load
- Redirects unauthenticated users to login
- Shows loading state during auth check

### Auth Utilities
Located in `src/lib/auth.js` and `src/lib/firebase.ts`

## Content Management

### Blog Posts
- Stored in `/src/posts/[category]/` as MDX files
- Each category has a corresponding page in `/src/pages/[category]/`
- Frontmatter required: `title`, `description`, `pubDate`

### Markdown Processing
Configured in `astro.config.mjs`:
- **Remark Plugins**: `remark-gfm`, `remark-smartypants`
- **Rehype Plugins**: `rehype-external-links` (opens external links in new tab)
- **Shiki Theme**: Nord (for code syntax highlighting)

## Key Technologies

### Core
- Astro 5.16.6 (static site generation)
- TypeScript (strict mode)
- Tailwind CSS (with dark mode support)

### Backend Services
- **Firebase**: Authentication (client-side only)
- **Supabase**: Database and backend operations

### UI Libraries
- Lucide React icons
- Astro Icon (icon management)
- Mermaid (diagrams)
- TOCbot (table of contents)

### Analytics
- Vercel Analytics
- Vercel Speed Insights

## Security Configuration

Content Security Policy configured in `astro.config.mjs` for:
- Firebase domains (`*.firebaseapp.com`, `*.firebase.com`)
- Google APIs (`*.googleapis.com`)
- Twitter embeds (`platform.twitter.com`)
- Development server (`localhost:4321`)

## Redirect System

The project uses a custom redirect system:
- Vercel redirects configured in `vercel.json` (18+ permanent redirects)
- Post-build script enhances redirect pages with animated templates
- Custom `RedirectLayout` used for redirect pages

## Environment Variables

Required environment variables in `.env`:
- Firebase configuration (API keys, auth domain, project ID)
- Supabase URL and anon key
- GitHub token (for repository data)

## Build Process Details

1. `astro build` generates static site in `/dist`
2. Post-build script (`scripts/replace-redirect-pages.js`) processes redirect pages
3. Custom templates injected for better UX
4. Output optimized for GitHub Pages deployment

## Development Notes

- Package manager: pnpm (version 10.26.2)
- Node.js requirement: 18 or higher
- No ESLint or Prettier configuration (uses Astro defaults)
- No testing framework configured
- TypeScript strict mode enabled
