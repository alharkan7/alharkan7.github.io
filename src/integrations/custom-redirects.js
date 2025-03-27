/**
 * Custom Astro integration to generate better-looking redirect pages
 */

export default function customRedirectsIntegration() {
  return {
    name: 'custom-redirects-integration',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        // Add a route to handle redirect templates
        injectRoute({
          pattern: '/_redirect-template',
          entrypoint: 'src/pages/_redirect-template.astro'
        });
      },
      'astro:build:done': ({ routes, dir }) => {
        // Find all redirects to customize
        const redirectRoutes = routes.filter(route => 
          route.type === 'redirect' && route.redirectRoute !== undefined
        );
        
        if (redirectRoutes.length > 0) {
          console.log(`🔀 Customizing ${redirectRoutes.length} redirect pages...`);
        }
      }
    }
  };
} 