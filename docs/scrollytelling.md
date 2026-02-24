# Scrollytelling Guide

This repository uses a modular system to create scrollytelling stories. Narrative content is written in **MDX**, while visualization data is stored in **TypeScript** configuration files.

## Step-by-Step: Create a New Story

### 1. Create the Data Configuration
Create a file in `src/scrolly/data/my-story.ts`. This file must export a `config` object.

```typescript
export const config = {
  metadata: {
    title: "Story Title",
    brand: "Brand Name",
    homeNavUrl: "/data"
  },
  hero: {
    label: "Category",
    titleHtml: "Hero Title",
    stats: [
      { target: 100, label: "Stat Label" }
    ]
  },
  sections: [
    {
      id: "intro",
      navLabel: "Intro",
      viz: { key: "timeline", props: { ... } }
    }
  ]
};
```

### 2. Create the MDX Content
Create `src/posts/scrolly/my-story.mdx`. Link it to your data using the `configId`.

```mdx
---
layout: ../../layouts/ScrollyLayout.astro
configId: my-story
---
import ScrollySection from '../../components/scrolly/ScrollySection.astro';

<ScrollySection id="intro">
  <div class="section-label">Section 01</div>
  ## The Beginning
  
  Your story narrative goes here in **Markdown**.
</ScrollySection>
```

## How Merging Works

The `ScrollyLayout.astro` automatically merges the external configuration with your MDX frontmatter.
- **Frontmatter Overrides**: If you define `metadata`, `hero`, or `theme` properties in the MDX frontmatter, they will override the values in the `.ts` config file.
- **Content Pairing**: The `id` property in your `<ScrollySection>` component **must match** the `id` in the `sections` array of your config file.

## Theming Your Story

You can customize the colors of your story by adding a `theme` object to your MDX frontmatter or your data config file.

```yaml
---
layout: ../../layouts/ScrollyLayout.astro
configId: my-story
theme:
  accent: "#FFD166"      # Overrides --accent-blue
  paper: "#121212"       # Overrides --paper (background)
  paperDark: "#000000"   # Overrides --paper-dark (viz column background)
  ink: "#FFFFFF"         # Overrides --ink (main text color)
  secondary: "#06D6A0"   # Overrides --political-red
---
```

## Styling Conventions

To maintain a consistent look:
- Use `<div class="section-label">Section XX</div>` at the top of your `ScrollySection`.
- Use standard Markdown headers (`##`, `###`) for section titles.
- Use `<div class="data-source-tag">Source: ...</div>` at the bottom of sections.

## Common Pitfalls

- **Broken Links**: Ensure `configId` matches the filename in `src/scrolly/data/` exactly.
- **Missing Viz**: Ensure the `viz.key` you are using (e.g., `scatter`) is registered in `src/scrolly/scrolly-runtime.ts`.
- **Mobile Layout**: On mobile, the visualizations are sticky to the top. Ensure your `ScrollySection` has enough content to allow for a comfortable scroll experience.
