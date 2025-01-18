import redirectData from '../../vercel.json';

interface Redirect {
  source: string;
  destination: string;
  permanent: boolean;
}

// Function to normalize paths
function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}
export function findRedirect(slug: string | undefined): Redirect | undefined {
  if (!slug) return undefined;

  // Debug logging
  // console.log('All Redirects:', redirectData.redirects);
  // console.log('Current Slug:', slug);

  const normalizedSlug = normalizePath(slug);

  // Check Vercel redirects
  const vercelRedirect = redirectData.redirects.find(r => 
    normalizePath(r.source) === normalizedSlug
  );

  if (vercelRedirect) {
    return vercelRedirect;
  }

  // For Netlify, we don't need to check here since redirects are handled by Netlify's _redirects file
  return undefined;
}

export function getAllRedirects(): Record<string, string> {
  const redirectMap: Record<string, string> = {};

  redirectData.redirects.forEach(redirect => {
    redirectMap[redirect.source] = redirect.destination;
  });

  return redirectMap;
}