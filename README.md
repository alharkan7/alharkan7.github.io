# 👋 Hey, welcome to raihankalla.id

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/alharkan7/alharkan7.github.io)

This is the source code for **[raihankalla.id](https://www.raihankalla.id)** — my little corner of the internet where I write about media, data, technology, and everything in between. (Fun fact: the domain is an anagram of my full name.)

The blog is built with [Astro](https://astro.build), because fast, content-first websites deserve a content-first framework.

---

## 🗺️ What's on the site?

The site has more sections than a typical blog. Here's the full map:

| Section | What it is |
|---|---|
| **[Home](https://raihankalla.id/)** | Blog posts on media, tech, and life |
| **[Data](https://raihankalla.id/data)** | Research pages — data visualizations, analysis, and interactive studies |
| **[Curated → Videos](https://raihankalla.id/videos)** | My entire YouTube liked-video history, filterable by year and channel |
| **[Curated → Bookmarks](https://raihankalla.id/bookmarks)** | My Chrome bookmarks, auto-synced daily via Supabase |
| **[Curated → Repos](https://raihankalla.id/stars)** | My GitHub starred repositories |
| **[Curated → Readings](https://raihankalla.id/readings)** | My Chrome Reading List, synced automatically |
| **[Others → Profile](https://raihankalla.id/bio)** | Who I am and what I do |
| **[Apps ↗](https://alhrkn.vercel.app)** | Tools I've built: Papermap, Outliner, Inztagram |

The "Curated" section is basically a live snapshot of my digital brain — everything gets auto-synced from Supabase so it stays fresh without me doing anything.

---

## 📊 Research Pages

The `/data` section hosts special interactive pages that don't fit the standard blog format. They're built for proper research dissemination — charts, maps, visualizations. Current topics include:

- **Media Effects on Indonesia's 2019 Election** — SEM-PLS analysis across 34 provinces
- **Google Trends as an Election Predictor** — spoiler: it's not as reliable as you'd hope
- **Jakarta Labor Market Analysis** — 19K+ job postings scraped and analyzed
- **TurnBackHoax Analysis (2024 & 2025)** — topic modeling, text networks, sentiment analysis
- **National Budget Progression** — Indonesia's APBN over time
- **Kekayaan Bahasa Nusantara** — a celebration of Indonesia's linguistic richness
- **Green Financing for SMEs** — BRIN research reports
- ...and more

---

## 📜 ScrollyTelling Template

The coolest thing in this repo is the **ScrollyTelling system** — a reusable, scroll-driven storytelling framework built from scratch with Astro, D3.js, and TypeScript. It lives in [`src/scrolly/`](./src/scrolly/).

> **Feel free to copy and use it for your own projects!** There's even a [blog post](https://raihankalla.id/create-scrollytelling) walking through the architecture.

### The idea

When presenting research, a static PDF or a plain article just doesn't cut it. ScrollyTelling keeps visualizations **synchronized with the narrative** — as you scroll through the text, the chart on the right updates dynamically to reflect exactly what you're reading about.

See it live: [**Media Effects on Election**](https://raihankalla.id/media-effects-election) · [**Google Trends Prediction**](https://raihankalla.id/google-trends-prediction)

### Architecture: 4 clean layers

```
┌─────────────────────────────────────────────────────────────┐
│  src/posts/scrolly/my-story.mdx      ← your narrative       │
│  src/scrolly/data/my-story.ts        ← your data & charts   │
│  src/layouts/ScrollyLayout.astro     ← the layout glue      │
│  src/scrolly/scrolly-runtime.ts      ← scroll engine        │
└─────────────────────────────────────────────────────────────┘
```

| Layer | File | Purpose |
|---|---|---|
| 📖 **Narrative** | `src/posts/scrolly/*.mdx` | Write your story in Markdown with `<ScrollySection id="...">` blocks |
| 📊 **Data** | `src/scrolly/data/*.ts` | Export a `config` object with all viz configs, datasets, hero stats |
| 🎨 **Layout** | `src/layouts/ScrollyLayout.astro` | Assembles the two-column sticky layout; links data to narrative via `configId` |
| ⚙️ **Engine** | `src/scrolly/scrolly-runtime.ts` | Intersection Observer + scroll tracking → switches viz panels on cue |

### How the scroll engine works

The runtime uses the **Intersection Observer API** to watch each `<ScrollySection>` element. When a section enters the viewport, it fires `switchViz(vizId)` which fades in the matched visualization panel and (lazily) initializes its D3 module. No polling. No scroll event hammering.

On **mobile**, it falls back to a scroll-position calculation relative to the sticky viz column, and adds swipeable tab navigation so readers can jump between charts.

### D3 visualization modules (14 built-in)

All live in `src/scrolly/viz/`:

| Module | Type | Notes |
|---|---|---|
| `timeline` | SVG line/area | Multi-series time series |
| `bubbles` | SVG bubble chart | Proportional circles |
| `scatter` | SVG scatter plot | With highlight & annotation |
| `bars` | SVG bar chart | Horizontal / vertical |
| `matrix` | SVG heatmap | Grid with color scale |
| `map` | Div (Leaflet/D3) | Choropleth or dot maps |
| `dualmap` | Div | Two side-by-side maps |
| `sem` | SVG | Structural equation model diagram |
| `sentiment` | SVG | Sentiment distribution |
| `precision` | SVG | Precision/accuracy scatter |
| `accuracy` | SVG | Accuracy comparison |
| `equation` | SVG | Math formula rendering |
| `market` | SVG | Market/competitive positioning |
| `upgrade` | Div | Custom rich layout panels |

### Writing a new story

**1. Create your MDX file** at `src/posts/scrolly/my-story.mdx`:

```mdx
---
layout: ../../layouts/ScrollyLayout.astro
configId: my-story
theme:
  accent: "#4DE1FF"
  paper: "#070A12"
---

import ScrollySection from '../../components/scrolly/ScrollySection.astro';

<ScrollySection id="intro">
  ## Welcome to the Story
  Your narrative here. When this section is in view,
  the `intro` visualization panel will activate.
</ScrollySection>

<ScrollySection id="finding1">
  ## The Big Finding
  More text. The `finding1` chart will fade in now.
</ScrollySection>
```

**2. Create your data file** at `src/scrolly/data/my-story.ts`:

```typescript
export const config = {
  configId: "my-story",
  hero: {
    title: "My Data Story",
    subtitle: "A subtitle",
    stats: [{ label: "Data Points", value: 1234 }],
  },
  sections: [
    {
      id: "intro",
      navLabel: "Introduction",
      viz: {
        key: "bubbles",
        title: "Growth over time",
        mount: "svg",
        props: {
          series: ["internet", "tv"],
          data: [{ year: 2000, internet: 1.9, tv: 88 }],
        },
      },
    },
    {
      id: "finding1",
      navLabel: "Key Finding",
      viz: {
        key: "scatter",
        title: "The correlation",
        mount: "svg",
        props: { /* your data */ },
      },
    },
  ],
};
```

**3. Done.** Visit `/my-story` and scroll.

→ Full technical docs: [`src/scrolly/README.md`](./src/scrolly/README.md)  
→ Architecture deep-dive: [Creating Interactive Scrollytelling](https://raihankalla.id/create-scrollytelling)

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| **Framework** | [Astro](https://astro.build) — static site generation with island architecture |
| **UI** | [React](https://react.dev/) + [Svelte](https://svelte.dev/) components side by side |
| **Visualizations** | [D3.js](https://d3js.org/) — all chart modules are hand-rolled D3 |
| **Language** | [TypeScript](https://www.typescriptlang.org/) everywhere |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) + vanilla CSS where needed |
| **Content** | [MDX](https://mdxjs.com) — Markdown with embedded components |
| **Database** | [Supabase](https://supabase.com/) — stores bookmarks, readings, videos, GitHub stars |
| **Auth** | [Firebase Auth](https://firebase.google.com/docs/auth) — fully client-side |
| **Deployment** | [GitHub Pages](https://pages.github.com) + [Vercel](https://vercel.com) |
| **Icons** | [Heroicons](https://heroicons.com) + [Simple Icons](https://simpleicons.org) |

---

## 🚀 Running it locally

You'll need **Node.js 18+** and **pnpm**.

```bash
# 1. Clone it
git clone https://github.com/alharkan7/alharkan7.github.io.git
cd alharkan7.github.io

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your SUPABASE_URL, SUPABASE_ANON_KEY, and Firebase config

# 4. Start the dev server
pnpm dev
```

Open [http://localhost:4321](http://localhost:4321). The ScrollyTelling pages will work without any env vars. The Curated pages (Bookmarks, Videos, etc.) need Supabase.

```bash
# Build for production
pnpm build
```

---

## 📁 Project Structure

```
├── public/                   ← static assets
├── scripts/                  ← build/sync scripts
├── src/
│   ├── components/
│   │   └── scrolly/          ← ScrollySection, ScrollyLayout parts
│   ├── content/
│   │   └── featured.ts       ← data page registry
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── ScrollyLayout.astro  ← two-column sticky scrolly layout
│   ├── pages/
│   │   ├── index.astro       ← homepage
│   │   ├── bio.astro         ← profile
│   │   ├── bookmarks.astro   ← chrome bookmarks (Supabase)
│   │   ├── readings.astro    ← chrome reading list (Supabase)
│   │   ├── stars.astro       ← github stars (Supabase)
│   │   ├── videos.astro      ← youtube liked videos (Supabase)
│   │   └── data/             ← data research pages index
│   ├── posts/
│   │   ├── blog/             ← ~50 blog posts in MDX/MD
│   │   ├── scrolly/          ← scrollytelling stories
│   │   ├── stories/          ← long-form stories
│   │   ├── misc/             ← misc writings
│   │   └── ptm/              ← communication theory notes
│   ├── scrolly/
│   │   ├── data/             ← per-story data configs
│   │   ├── viz/              ← 14 D3 visualization modules
│   │   ├── scrolly-entry.ts  ← browser entry point
│   │   └── scrolly-runtime.ts← core scroll + viz engine
│   └── styles/               ← global CSS
├── astro.config.mjs
└── package.json
```

---

## 🔐 Authentication

Some pages are behind a login. The auth is **100% client-side** using Firebase Auth — no server required — making it compatible with static hosting.

Protected pages use a `<ProtectedRoute />` component that checks auth state on load and redirects unauthenticated users. Session state persists across reloads via Firebase + `localStorage`.

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import ProtectedRoute from "../components/ProtectedRoute.astro";
---
<BaseLayout title="Private Page">
  <ProtectedRoute />
  <!-- Content only visible to logged-in users -->
</BaseLayout>
```

---

## 📬 Say hi

- 🌐 [raihankalla.id](https://www.raihankalla.id)
- 🐙 [@alharkan7](https://github.com/alharkan7) on GitHub
- 🐦 [@alhrkn](https://twitter.com/alhrkn) on X/Twitter
- 📸 [@alhrkn](https://instagram.com/alhrkn) on Instagram
- 💼 [linkedin.com/in/alharkan](https://linkedin.com/in/alharkan)

---

## 📄 License

Open source under the [MIT License](LICENSE). Fork it, remix it, use the ScrollyTelling template — go wild.
