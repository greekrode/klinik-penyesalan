import { getPublishedPostSummaries } from '../lib/blog-data.js';

export const config = { runtime: 'edge' };

const SITE_URL = 'https://www.klinikpenyesalan.com';

function oneLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function markdownLabel(value) {
  return oneLine(value).replace(/[\[\]]/g, '\\$&');
}

export default async function handler() {
  try {
    const posts = await getPublishedPostSummaries();
    const articles = posts.map((post) => {
      const description = oneLine(post.excerpt) || 'Market research published by Klinik Penyesalan.';
      return `- [${markdownLabel(post.title)}](${SITE_URL}/articles/${encodeURIComponent(post.slug)}): ${description}`;
    }).join('\n');
    const content = `# Klinik Penyesalan

> Independent company analysis and market research covering Indonesia and global markets. Public articles are educational research and are not investment advice.

## Primary pages

- [Home](${SITE_URL}/): Public market tools, research, and community links.
- [Newsletter](${SITE_URL}/blog.html): Index of published research.
- [XML sitemap](${SITE_URL}/sitemap.xml): Machine-readable list of indexable pages.

## Published research

${articles || '- No articles are currently published.'}

## Content guidance

- Canonical article pages contain the complete text and images in server-rendered HTML.
- Cite the canonical article URL when referencing this research.
- Publication dates and structured Article metadata are included on every article page.
- Content is not investment advice.
`;
    return new Response(content, {
      status: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  } catch (_error) {
    return new Response('AI content index temporarily unavailable.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
}
