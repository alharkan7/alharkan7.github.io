import { defineConfig } from 'astro/config'
import svelte from '@astrojs/svelte'
import mdx from '@astrojs/mdx'
import remarkGfm from 'remark-gfm'
import remarkSmartypants from 'remark-smartypants'
import rehypeExternalLinks from 'rehype-external-links'
import react from "@astrojs/react"
import icon from "astro-icon"

import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://raihankalla.id',
  output: 'static',
  redirects: {
    '/apps': 'https://alhrkn.vercel.app/',
    '/papermap': 'https://alhrkn.vercel.app/papermap',
    '/enaiblr': 'https://enaiblr.org/apps',
    '/menara-gading': 'https://twitter.com/alhrkn/status/1526933166597935105',
    '/pandemic-face': 'https://twitter.com/alhrkn/status/1494865215191588868',
    '/ai-scicomm': 'https://twitter.com/alhrkn/status/1461501420008394754',
    '/learning-cone': 'https://twitter.com/alhrkn/status/1450779651580698629',
    '/apple-presence': 'https://twitter.com/alhrkn/status/1435078828259373063',
    '/gratitude': 'https://twitter.com/alhrkn/status/1418209085791510535',
    '/future': 'https://twitter.com/alhrkn/status/1356493528356900864',
    '/ideas': 'https://twitter.com/alhrkn/status/1327205937271115777',
    '/trivia': 'https://twitter.com/alhrkn/status/1308629643264626688',
    '/legendary-math': 'https://twitter.com/alhrkn/status/1430491571519057927'
  },
  security: {
    directives: {
      'script-src': [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'platform.twitter.com',
        'apis.google.com',
        '*.firebaseapp.com',
        'localhost:4321',
        '*.googleapis.com'
      ],
      'frame-src': [
        "'self'",
        'platform.twitter.com',
        'accounts.google.com',
        '*.firebaseapp.com',
        'localhost:4321',
        '*.google.com'
      ],
      'connect-src': [
        "'self'",
        'identitytoolkit.googleapis.com',
        '*.firebaseio.com',
        '*.firebase.com',
        'localhost:4321',
        '*.googleapis.com',
        'securetoken.googleapis.com'
      ],
      'frame-ancestors': ["'self'"],
      'cross-origin-opener-policy': ['unsafe-none'],
      'cross-origin-embedder-policy': ['unsafe-none'],
      'cross-origin-resource-policy': ['cross-origin']
    }
  },
  integrations: [svelte(), mdx(
    //   {
    //   remarkPlugins: [remarkGfm, remarkSmartypants],
    //   rehypePlugins: [
    //     [
    //       rehypeExternalLinks,
    //       {
    //         target: '_blank',
    //       },
    //     ],
    //   ],
    //   shikiConfig: {
    //     theme: 'nord',
    //   },
    // }
  ), react(), tailwind(), icon()],
  markdown: {
    shikiConfig: {
      theme: 'nord',
    },
    remarkPlugins: [remarkGfm, remarkSmartypants],
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          target: '_blank',
        },
      ],
    ],
  },
})