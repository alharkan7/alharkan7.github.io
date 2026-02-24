# Scrolly System (Reusable Scrollytelling)

This folder contains the reusable “scrolly” system used to build interactive scrollytelling pages in this repo. The system is designed to separate narrative content (MDX) from technical visualization data (TypeScript/JSON).

## Mental Model

Think of a scrollytelling page as four distinct layers:

1.  **Narrative (MDX)**: Located in `src/posts/scrolly/*.mdx`. This is where you write your story using Markdown. It uses a `configId` to link to its technical data.
2.  **Configuration (Data)**: Located in `src/scrolly/data/*.ts`. These are standalone TypeScript files that export the visualization datasets, hero stats, and metadata.
3.  **Layout (Astro)**: The `src/layouts/ScrollyLayout.astro` component. It acts as the "glue"—fetching the data, merging it with MDX frontmatter (including optional `theme` overrides), and rendering the sidecar structure.
4.  **Engine (Runtime)**: The `src/scrolly/scrolly-runtime.ts`. This script tracks the user's scroll position and dynamically initializes/switches the visualizations on the right column.

## Theming
You can provide a `theme` object in the MDX frontmatter to override default colors:
```yaml
theme:
  accent: "#4DE1FF"
  paper: "#070A12"
  # ... see docs/scrollytelling.md for more
```

## Data Flow

1.  User visits a route (e.g., `/scrolly/test-scrolly`).
2.  `[slug].astro` renders the MDX file.
3.  `ScrollyLayout.astro` reads the `configId` from MDX frontmatter.
4.  The Layout dynamically imports the matching file from `src/scrolly/data/`.
5.  The Layout renders the Hero, the Markdown content (left), and the Viz Panels (right).
6.  `scrolly-runtime.ts` activates, tracking the `.scroll-section` elements and updating the `.viz-panel` states.

## Folder Layout

- `scrolly-entry.ts`: The browser entry point that waits for DOM ready.
- `scrolly-runtime.ts`: The core logic for scroll tracking and viz management.
- `viz/`: D3/SVG visualization modules (e.g., `scatter.ts`, `timeline.ts`).
- `data/`: Configuration files for each story.

## Related Components
- `src/layouts/ScrollyLayout.astro`: The primary layout.
- `src/components/scrolly/ScrollySection.astro`: The wrapper for Markdown sections.
