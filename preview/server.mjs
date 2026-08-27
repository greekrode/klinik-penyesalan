// Local-only visual review. Does not change index.html or publish the campaign.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const campaignPath = '/assets/promotions/capital-market-2026/';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const analyticsStub = `window.va = function(command, event) {
  if (command !== 'event') return;
  console.info('[PREVIEW ONLY]', event.name, JSON.stringify(event.data || {}));
  var output = document.getElementById('preview-event-log');
  if (output) output.textContent = event.name + ' · ' + JSON.stringify(event.data || {});
};`;
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    res.setHeader('Cache-Control', 'no-store');
    if (url.pathname.startsWith('/api/')) {
      // Do not invent market data or invoke live production functions in this preview.
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Market data unavailable in local design preview.' }));
    }
    if (url.pathname === '/preview/analytics.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      return res.end(analyticsStub);
    }
    if (url.pathname === '/preview/phone') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(await readFile(path.join(root, 'preview/phone.html')));
    }
    if (url.pathname === '/' || url.pathname === '/preview/masterclass') {
      let html = await readFile(path.join(root, 'index.html'), 'utf8');
      const banner = await readFile(path.join(root, campaignPath, 'banner.html'), 'utf8');
      html = html.replace('<head>', '<head><base href="/"><meta name="robots" content="noindex,nofollow">');
      html = html.replace('data-kp-root', 'data-kp-root data-promo-preview');
      html = html.replace('</head>', `<link rel="stylesheet" href="${campaignPath}banner.css"><script defer src="${campaignPath}campaign.js"></script></head>`);
      html = html.replace('</header>', '</header>' + banner);
      html = html.replace('src="/_vercel/insights/script.js"', 'src="/preview/analytics.js"');
      html = html.replace('</body>', `<details style="position:fixed;bottom:8px;left:8px;z-index:100;background:#20342f;color:#d9eee5;border:1px solid #486b60;padding:8px 12px;font:10px monospace;max-width:calc(100vw - 16px)"><summary style="cursor:pointer">DESIGN PREVIEW · NOT LIVE</summary><p>Analytics are logged locally, never sent to Vercel.</p><a href="/preview/masterclass?mode=first-visit" style="display:inline-block;padding:8px 0">Test first-visit behavior</a><p id="preview-event-log" role="status">No interaction events yet.</p></details></body>`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    const pathname = decodeURIComponent(url.pathname);
    const file = path.resolve(root, '.' + pathname);
    // Serve only public assets and the unchanged homepage, never repo/config/secret files.
    if (!(pathname.startsWith('/assets/') || pathname === '/index.html') ||
        !file.startsWith(root + path.sep)) {
      res.writeHead(404); return res.end('Not found');
    }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});
server.listen(4173, '127.0.0.1', () => console.log('Local design preview: http://127.0.0.1:4173/preview/masterclass'));
