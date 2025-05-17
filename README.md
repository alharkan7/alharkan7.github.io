# raihankalla.id
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/alharkan7/alharkan7.github.io)

This is the source code for [raihankalla.id](https://www.raihankalla.id), my personal blog built with [Astro](https://astro.build) - the modern web framework for content-driven websites.

## 🚀 Project Structure

```
├── public/
│   └── assets/
├── src/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## 🧞 Technologies Used

- [Astro](https://astro.build)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com)
- [MDX](https://mdxjs.com)

## ✨ Features

- ⚡️ Fast performance with Astro's static site generation
- 📝 Write posts in MDX format
- 🎨 Tailwind CSS for styling
- 🌙 Dark mode support
- 📱 Responsive design
- 🔍 SEO optimized
- 📊 Analytics integration
- 🎯 TypeScript for type safety

## 🛠️ Development

### Prerequisites

- Node.js 18 or higher
- pnpm (recommended) or npm

### Getting Started

1. Clone the repository:
```bash
git clone https://github.com/alharkan7/raihankalla-id.git
cd raihankalla.id
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

4. Open [http://localhost:4321](http://localhost:4321) in your browser.

### Building for Production

```bash
pnpm build
```

This will generate a static site in the `dist/` directory.

## 📝 Writing Content

Posts are written in MDX format and stored in `src/content/blog/`. Each post should include frontmatter with the following fields:

```yaml
---
title: Your Post Title
description: A brief description of your post
pubDate: 2024-01-01
---
```

## 🔧 Configuration

Site configuration can be found in `src/config.ts`. You can modify:

- Site metadata
- Navigation links
- Social media links
- Analytics settings
- Theme configuration

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [Astro](https://astro.build)
- Deployed on [GitHub Pages](https://pages.github.com)
- Icons from [Heroicons](https://heroicons.com)

## 📬 Contact

- Website: [raihankalla.id](https://www.raihankalla.id)
- GitHub: [@alharkan7](https://github.com/alharkan7)
- Twitter: [@alhrkn](https://twitter.com/alhrkn)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Authentication in Static Mode

This project implements a fully client-side authentication strategy to ensure compatibility with static site hosting (GitHub Pages) while still providing secure authenticated routes.

### How it works:

1. **Client-side Authentication:**
   - All Firebase authentication happens in the browser
   - No server-side endpoints are required for auth flows
   - Session state is maintained using Firebase Auth + localStorage 

2. **Protected Routes:**
   - Protected pages include the `<ProtectedRoute />` component
   - This component checks auth status on page load
   - Unauthenticated users are automatically redirected to the login page

3. **Implementation Example:**
   ```astro
   ---
   import BaseLayout from "../layouts/BaseLayout.astro";
   import ProtectedRoute from "../components/ProtectedRoute.astro";
   ---

   <BaseLayout title="Protected Page">
     <ProtectedRoute />
     
     <!-- Your protected content here -->
     <div>This content is only visible to authenticated users</div>
   </BaseLayout>
   ```

### Deployment Notes:

- Works with both GitHub Pages and Vercel without requiring server-side rendering
- Authentication state persists across page reloads
- Logout will properly clear all auth state
