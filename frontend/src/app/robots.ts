import type { MetadataRoute } from 'next';

// Public pages are crawlable; the authenticated app is not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/projects',
          '/settings',
          '/purchases',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
        ],
      },
    ],
    sitemap: 'https://www.mon-urba.fr/sitemap.xml',
  };
}
