import { getPublishedPost } from '../lib/blog-data.js';

export const config = { runtime: 'edge' };

const SITE_URL = 'https://www.klinikpenyesalan.com';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function decodeText(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function stripDuplicateTitle(content, title) {
  const match = String(content || '').match(/^\s*<(p|h1|h2)\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (!match || decodeText(match[2]) !== decodeText(title)) return content || '';
  return String(content).slice(match[0].length).replace(/^\s+/, '');
}

function formatDate(value) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}

function readTime(content) {
  const words = decodeText(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function pageShell({ title, description, canonical, image, robots, body, articleMeta = '', jsonLd = '' }) {
  const fullTitle = title ? `${title} · Klinik Penyesalan` : 'Article not found · Klinik Penyesalan';
  const safeTitle = escapeHtml(fullTitle);
  const safeDescription = escapeHtml(description);
  const safeCanonical = escapeHtml(canonical);
  const safeImage = escapeHtml(image || `${SITE_URL}/assets/og-image.png`);
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="${robots}">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <link rel="canonical" href="${safeCanonical}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Klinik Penyesalan">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${safeCanonical}">
  <meta property="og:image" content="${safeImage}">
  ${articleMeta}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="stylesheet" href="/assets/css/blog.css">
  <link rel="stylesheet" href="/assets/css/article-layout.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@7.3.0/css/fontawesome.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@7.3.0/css/brands.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@7.3.0/css/solid.min.css">
  <script>try{var t=localStorage.getItem('kp-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
  ${jsonLd}
</head>
<body>
  <header class="site-header">
    <div class="wrap header-inner">
      <a class="brand" href="/"><img src="/assets/favicon-256.png" alt="" width="30" height="30"><span>KLINIK PENYESALAN</span></a>
      <nav><a href="/">HOME</a><a href="/blog.html">ALL ARTICLES</a><button id="theme-toggle" type="button">LIGHT</button></nav>
    </div>
  </header>
  ${body}
  <footer><div class="wrap">© 2026 KLINIK PENYESALAN · NOT INVESTMENT ADVICE</div></footer>
  <script src="/assets/js/article-page.js"></script>
</body>
</html>`;
}

function renderNotFound(slug) {
  const canonical = `${SITE_URL}/articles/${encodeURIComponent(slug || '')}`;
  return pageShell({
    title: '',
    description: 'The requested Klinik Penyesalan article is not available.',
    canonical,
    robots: 'noindex, follow',
    body: `<main class="wrap"><section class="state"><span class="eyebrow">404 / NOT FOUND</span><h1>That article isn't available.</h1><p>It may still be a draft or it may have been removed.</p><a href="/blog.html">VIEW ALL ARTICLES →</a></section></main>`,
  });
}

function renderArticle(post) {
  const canonical = `${SITE_URL}/articles/${encodeURIComponent(post.slug)}`;
  const content = stripDuplicateTitle(post.content_html, post.title);
  const description = post.excerpt || 'An article from the Klinik Penyesalan newsletter.';
  const image = post.thumbnail_url || `${SITE_URL}/assets/og-image.png`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(canonical)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}`;
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description,
    image: [image],
    datePublished: post.published_at,
    dateModified: post.updated_at,
    mainEntityOfPage: canonical,
    author: { '@type': 'Organization', name: 'Klinik Penyesalan', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Klinik Penyesalan', url: SITE_URL },
  }).replace(/</g, '\\u003c');
  const thumbnail = post.thumbnail_url
    ? `<img class="article-thumbnail" src="${escapeHtml(post.thumbnail_url)}" alt="${escapeHtml(post.title)}">`
    : '';
  const body = `<main class="wrap">
    <article>
      <div class="article-context">
        <a class="back" href="/blog.html">← ALL ARTICLES</a>
        <p class="eyebrow">KLINIK NEWSLETTER</p>
      </div>
      <header class="article-hero">
        ${thumbnail}
        <div class="article-hero-shade"></div>
        <div class="article-head">
          <div class="article-head-copy">
            <h1>${escapeHtml(post.title)}</h1>
            <p class="article-excerpt">${escapeHtml(post.excerpt)}</p>
          </div>
        </div>
      </header>
      <div class="article-utility">
        <div class="article-meta"><time datetime="${escapeHtml(post.published_at)}">${escapeHtml(formatDate(post.published_at))}</time><span>${readTime(content)} MIN READ</span></div>
        <div class="article-share" aria-label="Share this article" data-share-url="${escapeHtml(canonical)}" data-share-title="${escapeHtml(post.title)}" data-share-text="${escapeHtml(description)}">
          <span class="share-label">SHARE</span>
          <a href="${escapeHtml(xUrl)}" target="_blank" rel="noopener" aria-label="Share on X" title="Share on X"><i class="fa-brands fa-x-twitter" aria-hidden="true"></i></a>
          <a href="${escapeHtml(facebookUrl)}" target="_blank" rel="noopener" aria-label="Share on Facebook" title="Share on Facebook"><i class="fa-brands fa-facebook-f" aria-hidden="true"></i></a>
          <button id="share-instagram" type="button" aria-label="Share to Instagram" title="Share to Instagram"><i class="fa-brands fa-instagram" aria-hidden="true"></i></button>
          <button id="share-copy" type="button" aria-label="Copy article link" title="Copy article link"><i class="fa-solid fa-link" aria-hidden="true"></i></button>
          <span id="share-status" class="share-status" role="status" aria-live="polite"></span>
        </div>
      </div>
      <div class="article-content">${content}</div>
    </article>
  </main>`;
  return pageShell({
    title: post.title,
    description,
    canonical,
    image,
    robots: 'index, follow, max-image-preview:large',
    body,
    articleMeta: `<meta property="article:published_time" content="${escapeHtml(post.published_at)}">
  <meta property="article:modified_time" content="${escapeHtml(post.updated_at)}">
  <meta property="article:author" content="Klinik Penyesalan">`,
    jsonLd: `<script type="application/ld+json">${schema}</script>`,
  });
}

export default async function handler(request) {
  const slug = new URL(request.url).searchParams.get('slug') || '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return new Response(renderNotFound(slug), {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, s-maxage=60' },
    });
  }
  try {
    const post = await getPublishedPost(slug);
    if (!post) {
      return new Response(renderNotFound(slug), {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, s-maxage=60' },
      });
    }
    return new Response(renderArticle(post), {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  } catch (_error) {
    return new Response('Article service temporarily unavailable.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
}
