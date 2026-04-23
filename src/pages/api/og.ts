import satori from "satori";
import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = url.searchParams;
    const title = searchParams.get("title") || "Al Harkan's Blog";
    const subtitle = searchParams.get("subtitle") || "";

    // Try multiple possible paths for the font file
    const loadFont = async (fileName: string) => {
      const possiblePaths = [
        // Vercel serverless function bundle path
        resolve(process.cwd(), "node_modules/.pnpm/@fontsource+playfair-display@5.2.8/node_modules/@fontsource/playfair-display/files/", fileName),
        // Standard node_modules path
        resolve(process.cwd(), "node_modules/@fontsource/playfair-display/files/", fileName),
        // Fallback for different pnpm store structures
        // @ts-ignore
        resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../../node_modules/.pnpm/@fontsource+playfair-display@5.2.8/node_modules/@fontsource/playfair-display/files/", fileName),
      ];

      for (const path of possiblePaths) {
        try {
          return await readFile(path);
        } catch {
          // Try next path
        }
      }
      return null;
    };

    const fontDataBold = await loadFont("playfair-display-latin-700-normal.woff");
    const fontDataRegular = await loadFont("playfair-display-latin-400-normal.woff");

    if (!fontDataBold || !fontDataRegular) {
      throw new Error("Could not load font files");
    }

    const svg = await satori(
      {
        type: "div",
        props: {
          style: {
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#FCFBF9",
            position: "relative",
            fontFamily: "Playfair Display",
          },
          children: [
            // Background dots (monochrome)
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  backgroundImage: "radial-gradient(#e7e5e4 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                },
              },
            },
            // Main content (vertically centered, aligned left)
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: "80px",
                  right: "80px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "center",
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "64px",
                        fontWeight: 700,
                        color: "#1c1917",
                        lineHeight: 1.1,
                        maxWidth: "900px",
                        textAlign: "left",
                      },
                      children: title,
                    },
                  },
                  ...(subtitle
                    ? [
                      {
                        type: "div",
                        props: {
                          style: {
                            fontSize: "28px",
                            fontWeight: 400,
                            color: "#57534e",
                            marginTop: "24px",
                            maxWidth: "800px",
                            textAlign: "left",
                          },
                          children: subtitle,
                        },
                      },
                    ]
                    : []),
                  {
                    type: "div",
                    props: {
                      style: { width: "60px", height: "3px", background: "#78716c", marginTop: "32px" },
                    },
                  },
                ],
              },
            },
            // Footer row (Blog name on left, URL badge on right)
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  bottom: "60px",
                  left: "80px",
                  right: "60px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: { fontSize: "20px", fontWeight: 700, color: "#57534e", display: "flex", alignItems: "center" },
                      children: "Al Harkan's Blog",
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        padding: "12px 24px",
                        borderRadius: "22px",
                        border: "1px solid #78716c",
                        display: "flex",
                      },
                      children: {
                        type: "span",
                        props: {
                          style: { fontSize: "16px", fontWeight: 700, color: "#44403c" },
                          children: "raihankalla.id",
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      } as any,
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Playfair Display",
            data: fontDataBold,
            weight: 700,
            style: "normal",
          },
          {
            name: "Playfair Display",
            data: fontDataRegular,
            weight: 400,
            style: "normal",
          },
        ],
      }
    );

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (error: any) {
    return new Response(`Error: ${error?.message || error?.toString() || "Unknown"}`, { status: 500 });
  }
};
