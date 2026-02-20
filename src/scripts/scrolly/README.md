# Scrolly System (Reusable Scrollytelling)

This folder contains the reusable “scrolly” system used to build interactive scrollytelling pages in this repo:
- A shared runtime that tracks scroll position and activates sections
- A shared set of visualization modules (loaded on demand)
- A shared layout component (outside this folder) that renders the DOM structure the runtime expects
- Per-page data files (outside this folder) that provide text + section definitions + viz datasets

Live example: https://raihankalla.id/scrolly-example

If you want the high-level docs first, read:
- [docs/scrollytelling.md](../../../docs/scrollytelling.md)

If you want to learn by example, open:
- Route shell: [src/pages/scrolly-example.astro](../../pages/scrolly-example.astro)
- Layout component: [src/components/scrolly/ScrollyTemplate.astro](../../components/scrolly/ScrollyTemplate.astro)
- Story data: [src/data/scrolly/scrolly-example.ts](../../data/scrolly/scrolly-example.ts)

## Mental Model

Think of a scrolly page as four layers:

1) **Route shell** (`src/pages/...`)  
   A thin Astro page that sets `<head>` metadata, loads external libraries (like D3), renders the shared layout component, and loads the scrolly runtime module.

2) **Layout template** (`src/components/scrolly/ScrollyTemplate.astro`)  
   Renders the consistent DOM structure:
   - `#hero` + `.stat-num` counters
   - left-column `.scroll-section` blocks with ids like `section-...`
   - right-column `.viz-panel` blocks with ids like `viz-...`

3) **Runtime** (this folder)  
   Attaches event listeners and handles:
   - progress bar + nav dot updates
   - desktop `IntersectionObserver` section activation
   - mobile scroll-position based activation
   - visualization switching + “init once” per panel
   - hash anchor behavior on hard reload

4) **Per-page story data** (`src/data/scrolly/...`)  
   Provides the content + section definitions (text + which viz to use per section).

You usually only change #1 and #4 when creating a new story.

## Folder Layout

This directory:
- `scrolly-entry.ts` — entrypoint loaded by the page; waits for DOM then calls runtime
- `scrolly-runtime.ts` — the “engine” (scroll tracking, viz switching, etc.)
- `viz/` — visualization modules; each exports a default render function that accepts `props`

Related directories:
- Layout: `src/components/scrolly/ScrollyTemplate.astro`
- Page data: `src/data/scrolly/*.ts`

## Quick Start: Create A New Scrolly Page

Example target route: `/ai-explainer`

### Step 1 — Create the page data

Create a new data file:
- `src/data/scrolly/ai-explainer.ts`

Start by copying the structure from:
- [src/data/scrolly/scrolly-example.ts](../../data/scrolly/scrolly-example.ts)

You’ll typically update:
- `metadata.title`, `metadata.description`, `metadata.brand`, `metadata.homeNavUrl`
- `hero` content and `hero.stats`
- `sections[]`:
  - `id` (unique per section)
  - `navLabel` (desktop dot tooltip label)
  - `mobileLabel` (mobile tab label)
  - `contentHtml` (left column HTML)
  - `viz.key` (which viz to use)
  - `viz.props` (the dataset/config for that viz)
  - `viz.title`, `viz.captionHtml`
  - `viz.mount` (`"svg"` or `"div"`)

Important: section ids drive URL anchors:
- If your section `id` is `"bigpicture"`, the DOM id becomes `section-bigpicture`
- The URL anchor will be `#section-bigpicture`

### Step 2 — Create the route file

Create:
- `src/pages/ai-explainer.astro` (routes to `/ai-explainer`)

Copy the structure from:
- [src/pages/scrolly-example.astro](../../pages/scrolly-example.astro)

Then change:
- The imported data module (`ai-explainer.ts`)
- `<title>` and `<meta name="description">` to use your new `page.metadata`

Notes:
- If you name it `ai-explainer.astro` → route is `/ai-explainer`
- If you name it `ai-explainer.html.astro` → route is `/ai-explainer.html`

### Step 3 — Use existing visualization types (preferred)

Most new stories should reuse existing viz types.

In your `sections[]`, set `viz.key` to one of the built-in keys currently supported by the runtime loader map:
- `timeline`, `bubbles`, `sem`, `scatter`, `matrix`, `bars`, `map`

Those keys correspond to modules under:
- `src/scripts/scrolly/viz/*.ts`

## Viz Data: `viz.props`

Visualization datasets live in the page data file (per section) under `viz.props`.

Data flow:
- The layout embeds each section’s `viz.props` into the corresponding `.viz-panel` as JSON.
- The runtime reads that JSON and passes it into the renderer as `props`.
- The viz module renders using `props` (and may provide fallbacks).

This makes it easy to reuse the same viz module (“template”) with different datasets across pages.

### Step 4 — Add a new visualization type (only when needed)

If you need a brand-new visualization type (example: `sankey`):

1) Create a new module:
- `src/scripts/scrolly/viz/sankey.ts`

2) Register it in the runtime loader map:
- Edit [scrolly-runtime.ts](./scrolly-runtime.ts) and add:
  - `sankey: () => import("./viz/sankey")`

3) Use it in your page data:
- In a section: `viz: { key: "sankey", mount: "svg", ... }`
- Provide the dataset/config in `viz.props`

### Step 5 — Verify in dev

Run the dev server and open your route:
- `/ai-explainer` (or `/ai-explainer.html` if you intentionally used the `.astro` naming)

## Runtime Conventions (What The DOM Must Contain)

The runtime expects:
- Left column sections:
  - `.scroll-section` elements
  - each with an `id="section-..."` and a `data-viz-id="viz-..."`
- Right column panels:
  - `.viz-panel` elements
  - each with an `id="viz-..."`
  - each with `data-viz-key="..."` (the viz type)
- Each panel includes a mount element:
  - `[data-viz-mount="svg"]` or `[data-viz-mount="div"]`

You generally don’t hand-write these. They’re generated by:
- [src/components/scrolly/ScrollyTemplate.astro](../../components/scrolly/ScrollyTemplate.astro)

## Styling

The current demo page reuses the original election CSS:
- `public/featured/media-election-2019/style.css`

This is totally optional. For a new story you can:
- Reuse the same CSS (fastest)
- Or create a new CSS file and link it from your route shell

### ID-targeted CSS (important)

Some styles target specific ids such as:
- `#chart-matrix`, `#chart-map`, etc.

The template assigns these mount ids automatically based on `viz.key`.
If you add a new viz type and want id-based styling, update the mapping in:
- [src/components/scrolly/ScrollyTemplate.astro](../../components/scrolly/ScrollyTemplate.astro)

## Troubleshooting

### “The page loads but nothing animates / counters stay 0”

The runtime is not running. Check:
- Your route includes the module script to `scrolly-entry.ts`
- The browser console for a failed module load (404) or runtime exception

### “A specific viz panel is blank”

Check:
- The section’s `viz.key` matches a loader entry in `scrolly-runtime.ts`
- The viz module exists in `src/scripts/scrolly/viz/`
- The section provides the expected `viz.props` shape for that viz
- Any required global libraries are loaded (example: D3 script tag)

### “Opening /page#section-... doesn’t scroll on hard reload”

This is handled in the runtime. Confirm:
- Your section ids follow the `section-${id}` pattern
- Your link uses `#section-...` (not `#bigpicture`)
