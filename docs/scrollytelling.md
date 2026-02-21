# Scrollytelling Pages

This repo supports reusable “scrollytelling” pages built with Astro (Option B):
- One reusable layout component (HTML structure)
- One reusable runtime (scroll tracking, viz switching)
- Per-page data (hero + sections + which viz to use + viz datasets)
- Optional new viz modules when you need a new viz type

The reference implementation is:
- Live example: https://raihankalla.id/scrolly-example
- Route: [src/pages/scrolly-example.astro](../src/pages/scrolly-example.astro)
- Layout: [src/components/scrolly/ScrollyTemplate.astro](../src/components/scrolly/ScrollyTemplate.astro)
- Runtime entry: [src/scrolly/scrolly-entry.ts](../src/scrolly/scrolly-entry.ts)
- Runtime logic: [src/scrolly/scrolly-runtime.ts](../src/scrolly/scrolly-runtime.ts)
- Page data: [src/content/scrolly-example.ts](../src/content/scrolly-example.ts)
- Viz modules: [src/scrolly/viz](../src/scrolly/viz)

## What You Create For A New Story

For a new page at `/ai-explainer` you typically add **two** files:
- `src/pages/ai-explainer.astro` (the route)
- `src/content/ai-explainer.ts` (the story content + section definitions)

You only add new visualization code if you need a visualization type that does not exist yet.

You do **not** create a new per-page template component.

## Step-by-Step: Create `/ai-explainer`

### 1) Create the route file

Create `src/pages/ai-explainer.astro` by copying the structure of [src/pages/scrolly-example.astro](../src/pages/scrolly-example.astro).

The route file’s responsibilities are:
- Provide `<head>` metadata (`<title>`, description)
- Load external libraries your vizzes need (e.g. D3)
- Render the shared scrollytelling layout (`ScrollyTemplate`)
- Load the shared runtime (`scrolly-entry.ts`) as an ES module script

In short, it is a “thin shell” around shared building blocks.

### 2) Create the page-data file

Create `src/content/ai-explainer.ts` using the same shape as:
- [src/content/scrolly-example.ts](../src/content/scrolly-example.ts)

The data file is the single source of truth for:
- `metadata`: title/description/brand/home link
- `hero`: top section text + animated stats
- `sections[]`: each section’s text + nav labels + which viz to render
- `footerHtml`: footer markup

### 3) Define `sections[]` correctly

Each section in `sections[]` must include:
- `id`: a stable identifier (e.g. `"context"`, `"bigpicture"`)
- `navLabel`: label shown on the nav dots tooltip
- `mobileLabel`: label shown on the mobile viz tab bar
- `contentHtml`: the left-column section markup
- `viz`: which visualization to show on the right when the section is active

The layout generates consistent DOM ids automatically:
- Text container id: `section-${id}` (example: `section-bigpicture`)
- Viz panel id: `viz-${id}` (example: `viz-bigpicture`)

This is important because URL hashes use the `section-*` ids:
- `/ai-explainer#section-bigpicture`

### 4) Choose a viz type using `viz.key`

Each section’s `viz.key` chooses which viz renderer module to load.

Currently supported keys are defined by the runtime loader map in:
- [src/scrolly/scrolly-runtime.ts](../src/scrolly/scrolly-runtime.ts)

Examples (from the election demo):
- `timeline`, `bubbles`, `sem`, `scatter`, `matrix`, `bars`, `map`

If your new page can reuse these viz types, you don’t add any new viz code.

### 4b) Provide viz datasets via `viz.props`

In this repo, visualization datasets live in the page data file, inside each section’s `viz.props`.

- You reuse an existing viz “template” by keeping the same `viz.key` and changing only `viz.props`.
- This avoids duplicating code and keeps each story self-contained.

Data flow:
- The route renders the layout component with your page data.
- The layout embeds `viz.props` into each `.viz-panel` as JSON.
- The runtime reads that JSON and passes it into the viz renderer.

Reference implementation:
- Page data: [src/content/scrolly-example.ts](../src/content/scrolly-example.ts)
- Layout embed: [src/components/scrolly/ScrollyTemplate.astro](../src/components/scrolly/ScrollyTemplate.astro)
- Runtime pass-through: [src/scrolly/scrolly-runtime.ts](../src/scrolly/scrolly-runtime.ts)

### 5) Add a new viz type (only when needed)

If you need a brand new viz type (say `sankey`):

1) Add a new module:
- `src/scrolly/viz/sankey.ts`

2) Register it in the loader map:
- Edit [src/scrolly/scrolly-runtime.ts](../src/scrolly/scrolly-runtime.ts) to add a loader entry:
  - `sankey: () => import("./viz/sankey")`

3) Use it in page data:
- Set `viz.key: "sankey"` in the relevant section(s)
- Put the viz dataset/config in `viz.props`

### 6) Mount element ids (CSS compatibility)

Some of the original election CSS targets specific ids like `#chart-matrix` and `#chart-map`.
The shared template assigns these ids automatically based on `viz.key`:
- See the id mapping in [src/components/scrolly/ScrollyTemplate.astro](../src/components/scrolly/ScrollyTemplate.astro)

If you introduce a new viz key and need id-based styling, extend that mapping.

## Folder Conventions

Recommended locations:
- Routes: `src/pages/*.astro`
- Scrolly page data: `src/content/*.ts`
- Shared layout: `src/components/scrolly/ScrollyTemplate.astro`
- Shared runtime: `src/scrolly/scrolly-runtime.ts`
- Shared viz types: `src/scrolly/viz/*.ts`

If you want a viz that’s truly page-specific and not reusable, you can still put it in a page-namespaced folder, but then you’ll also need to change the runtime loader to point to that path. The current setup optimizes for reuse across multiple stories.

## Common Pitfalls

- **The runtime doesn’t run:** make sure the route includes the module script:
  - `src="/src/scrolly/scrolly-entry.ts"` (dev) or the equivalent built asset in production
- **Hash anchors don’t work on hard reload:** sections must use ids like `section-...`, and the runtime preserves the initial hash before scroll tracking updates it.
- **A viz is blank:** confirm:
  - The section uses the right `viz.key`
  - The viz module exists and is registered in the runtime loader map
  - The section provides the expected `viz.props` shape for that viz
  - External libs (e.g. D3) are loaded in the route file if the viz needs them
