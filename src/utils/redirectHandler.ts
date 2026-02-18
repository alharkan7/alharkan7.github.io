import redirectData from '../../vercel.json';
import astroConfig from '../../astro.config.mjs';

interface Redirect {
  source: string;
  destination: string;
  permanent: boolean;
}

interface AstroRedirect {
  [key: string]: string;
}

// Function to normalize paths
function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function findRedirect(slug: string | undefined): Redirect | undefined {
  if (!slug) return undefined;

  // Debug logging
  // // console.log('All Redirects:', redirectData.redirects);
  // // console.log('Current Slug:', slug);

  const normalizedSlug = normalizePath(slug);

  // Check Vercel redirects
  const vercelRedirect = redirectData.redirects.find(r => 
    normalizePath(r.source) === normalizedSlug
  );

  if (vercelRedirect) {
    return vercelRedirect;
  }

  // Check Astro config redirects
  const astroRedirects = astroConfig.redirects as AstroRedirect;
  if (astroRedirects && astroRedirects[normalizedSlug]) {
    return {
      source: normalizedSlug,
      destination: astroRedirects[normalizedSlug],
      permanent: true
    };
  }

  return undefined;
}

export function getAllRedirects(): Record<string, string> {
  const redirectMap: Record<string, string> = {};

  // Add Vercel redirects
  redirectData.redirects.forEach(redirect => {
    redirectMap[redirect.source] = redirect.destination;
  });

  // Add Astro config redirects
  const astroRedirects = astroConfig.redirects as AstroRedirect;
  if (astroRedirects) {
    Object.entries(astroRedirects).forEach(([source, destination]) => {
      redirectMap[source] = destination;
    });
  }

  return redirectMap;
}