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
            backgroundColor: "#ffffff",
            position: "relative",
            fontFamily: "Noto Sans",
          },
          children: [
            // Background dots
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                },
              },
            },
            // Bottom left triangle
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "200px",
                  height: "150px",
                  display: "flex",
                  background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
                  opacity: 0.08,
                  clipPath: "polygon(0 100%, 100% 100%, 0 0)",
                },
              },
            },
            // Bottom right triangle
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: "300px",
                  height: "250px",
                  display: "flex",
                  background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
                  opacity: 0.04,
                  clipPath: "polygon(100% 100%, 0 100%, 100% 0)",
                },
              },
            },
            // Top left geometric cluster
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  top: "80px",
                  left: "80px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                },
                children: [
                  { type: "div", props: { style: { width: "24px", height: "24px", background: "#0d9488", opacity: 0.15 } } },
                  { type: "div", props: { style: { width: "16px", height: "16px", background: "#0d9488", opacity: 0.105, marginTop: "8px" } } },
                  { type: "div", props: { style: { width: "16px", height: "16px", background: "#0d9488", opacity: 0.105, marginLeft: "-8px" } } },
                ],
              },
            },
            // Main content
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "80px",
                  paddingTop: subtitle ? "40px" : "60px",
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "12px",
                        fontWeight: 600,
                        letterSpacing: "3px",
                        color: "#0d9488",
                        opacity: 0.8,
                        marginBottom: "10px",
                      },
                      children: "PERSONAL BLOG",
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "64px",
                        fontWeight: 700,
                        color: "#18181b",
                        lineHeight: 1.1,
                        maxWidth: "900px",
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
                              fontSize: "26px",
                              fontWeight: 400,
                              color: "#52525b",
                              marginTop: "16px",
                              maxWidth: "800px",
                            },
                            children: subtitle,
                          },
                        },
                      ]
                    : []),
                  {
                    type: "div",
                    props: {
                      style: { width: "60px", height: "4px", background: "#0d9488", marginTop: "20px" },
                    },
                  },
                ],
              },
            },
            // URL badge
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
                      style: { width: "8px", height: "8px", background: "#0d9488", opacity: 0.4, borderRadius: "50%" },
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        padding: "12px 24px",
                        background: "rgba(13, 148, 136, 0.1)",
                        borderRadius: "22px",
                        border: "1px solid #0d9488",
                        display: "flex",
                      },
                      children: {
                        type: "span",
                        props: {
                          style: { fontSize: "16px", fontWeight: 600, color: "#0d9488" },
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
