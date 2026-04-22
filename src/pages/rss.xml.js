import rss from '@astrojs/rss';

export async function GET(context) {
  // Import all MDX posts using glob pattern (same as [slug].astro)
  const blogPostsGlob = import.meta.glob("../posts/blog/*.{md,mdx}", {
    eager: true,
  });
  const storyPostsGlob = import.meta.glob("../posts/stories/*.{md,mdx}", {
    eager: true,
  });
  const miscPostsGlob = import.meta.glob("../posts/misc/*.{md,mdx}", {
    eager: true,
  });
  const uncategorizedPostsGlob = import.meta.glob(
    "../posts/uncategorized/*.{md,mdx}",
    { eager: true },
  );
  const ptmPostsGlob = import.meta.glob("../posts/ptm/*.{md,mdx}", {
    eager: true,
  });
  const scrollyPostsGlob = import.meta.glob("../posts/scrolly/*.{md,mdx}", {
    eager: true,
  });

  // Helper to check if post has required frontmatter
  const hasRequiredFields = (post) => {
    const { title, description, publishDate } = post.frontmatter || {};
    return title && description && publishDate;
  };

  // Combine all MDX posts and add category
  const mdxPosts = [
    ...Object.values(blogPostsGlob).filter(hasRequiredFields).map((p) => ({ ...p, category: "Blog" })),
    ...Object.values(storyPostsGlob).filter(hasRequiredFields).map((p) => ({ ...p, category: "Stories" })),
    ...Object.values(miscPostsGlob).filter(hasRequiredFields).map((p) => ({ ...p, category: "Miscellaneous" })),
    ...Object.values(uncategorizedPostsGlob).filter(hasRequiredFields).map((p) => ({
      ...p,
      category: "Uncategorized",
    })),
    ...Object.values(ptmPostsGlob).filter(hasRequiredFields).map((p) => ({ ...p, category: "PTM" })),
    ...Object.values(scrollyPostsGlob).filter(hasRequiredFields).map((p) => ({
      ...p,
      category: "Scrollytelling",
    })),
  ];

  // Import featured HTML pages
  const htmlPagesGlob = import.meta.glob("../featured/*.html", {
    query: "?raw",
    eager: true,
  });

  // Helper to extract title from HTML content
  const extractTitle = (html) => {
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : null;
  };

  // Convert HTML pages to RSS items
  const htmlPosts = Object.entries(htmlPagesGlob)
    .map(([path, content]) => {
      const html = content.default;
      const title = extractTitle(html);
      if (!title) return null;

      const filename = path.split("/").pop()?.replace(".html", "") || "";
      const slug = filename;

      return {
        title,
        description: `Interactive data visualization: ${title}`,
        pubDate: new Date(), // Use current date as fallback for HTML pages
        link: `/${slug}/`,
        category: "Data Visualization",
      };
    })
    .filter(Boolean);

  // Combine all posts
  const allPosts = [...mdxPosts, ...htmlPosts];

  // Sort by publish date (newest first)
  const sortedPosts = allPosts.sort((a, b) => {
    const dateA = a.frontmatter?.publishDate
      ? new Date(a.frontmatter.publishDate)
      : a.pubDate || new Date(0);
    const dateB = b.frontmatter?.publishDate
      ? new Date(b.frontmatter.publishDate)
      : b.pubDate || new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  return rss({
    title: "Al Harkan's Blog",
    description: "Personal blog about data, media studies, and technology",
    site: context.site,
    items: sortedPosts.map((post) => ({
      title: post.frontmatter?.title || post.title,
      description: post.frontmatter?.description || post.description,
      pubDate: post.frontmatter?.publishDate
        ? new Date(post.frontmatter.publishDate)
        : post.pubDate,
      link: post.frontmatter
        ? `/${post.file.split("/").pop().split(".").shift()}/`
        : post.link,
      category: post.frontmatter?.category || post.category,
    })),
    customData: `<language>en-us</language><managingEditor>contact@raihankalla.id (Al Harkan)</managingEditor><webMaster>contact@raihankalla.id (Al Harkan)</webMaster>`,
  });
}
