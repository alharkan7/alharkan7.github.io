# raihankalla.id

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
- Deployed on [Netlify](https://netlify.com)
- Icons from [Heroicons](https://heroicons.com)

## 📬 Contact

- Website: [raihankalla.id](https://www.raihankalla.id)
- GitHub: [@alharkan7](https://github.com/alharkan7)
- Twitter: [@yalhrkn](https://twitter.com/alhrkn)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
