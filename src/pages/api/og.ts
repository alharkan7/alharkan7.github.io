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
    let fontData;
    const fontFileName = "noto-sans-latin-700-normal.woff";
    const possiblePaths = [
      // Vercel serverless function bundle path
      resolve(process.cwd(), "node_modules/.pnpm/@fontsource+noto-sans@5.2.10/node_modules/@fontsource/noto-sans/files/", fontFileName),
      // Standard node_modules path
      resolve(process.cwd(), "node_modules/@fontsource/noto-sans/files/", fontFileName),
      // Fallback for different pnpm store structures
      resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../../node_modules/.pnpm/@fontsource+noto-sans@5.2.10/node_modules/@fontsource/noto-sans/files/", fontFileName),
    ];

    for (const path of possiblePaths) {
      try {
        fontData = await readFile(path);
        break;
      } catch {
        // Try next path
      }
    }

    if (!fontData) {
      throw new Error("Could not load font file");
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
            backgroundColor: "#F5F1E8",
            position: "relative",
            fontFamily: "Noto Sans",
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
                  backgroundImage: "radial-gradient(#a8a29e 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                },
              },
            },
            // Main content (vertically centered, slightly higher)
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  top: "35%",
                  left: 0,
                  right: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 80px",
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "56px",
                        fontWeight: 700,
                        color: "#1c1917",
                        lineHeight: 1.1,
                        maxWidth: "900px",
                        textAlign: "center",
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
                              fontSize: "24px",
                              fontWeight: 400,
                              color: "#57534e",
                              marginTop: "16px",
                              maxWidth: "800px",
                              textAlign: "center",
                            },
                            children: subtitle,
                          },
                        },
                      ]
                    : []),
                  {
                    type: "div",
                    props: {
                      style: { width: "60px", height: "3px", background: "#78716c", marginTop: "24px" },
                    },
                  },
                ],
              },
            },
            // URL badge (monochrome, bottom right)
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  bottom: "60px",
                  right: "60px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: { width: "8px", height: "8px", background: "#78716c", opacity: 0.6, borderRadius: "50%" },
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        padding: "12px 24px",
                        background: "rgba(120, 113, 108, 0.15)",
                        borderRadius: "22px",
                        border: "1px solid #78716c",
                        display: "flex",
                      },
                      children: {
                        type: "span",
                        props: {
                          style: { fontSize: "16px", fontWeight: 600, color: "#44403c" },
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
      },
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Noto Sans",
            data: fontData,
            weight: 700,
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
