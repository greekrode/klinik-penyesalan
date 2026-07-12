import { getPublishedPostUrls } from '../lib/blog-data.js';

export const config = { runtime: 'edge' };

const SITE_URL = 'https://www.klinikpenyesalan.com';

function escapeXml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

export default async function handler() {
  try {
    const posts = await getPublishedPostUrls();
    const staticPages = [
      { loc: `${SITE_URL}/`, priority: '1.0' },
      { loc: `${SITE_URL}/blog.html`, priority: '0.8' },
    ];
    const urls = staticPages.concat(posts.map((post) => ({
      loc: `${SITE_URL}/articles/${encodeURIComponent(post.slug)}`,
      lastmod: new Date(post.updated_at).toISOString(),
      priority: '0.7',
    })));
    const entries = urls.map((item) => `  <url>\n    <loc>${escapeXml(item.loc)}</loc>${item.lastmod ? `\n    <lastmod>${escapeXml(item.lastmod)}</lastmod>` : ''}\n    <changefreq>weekly</changefreq>\n    <priority>${item.priority}</priority>\n  </url>`).join('\n');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`, {
      status: 200,
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  } catch (_error) {
    return new Response('Sitemap temporarily unavailable.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
}
