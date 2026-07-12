(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var config = window.KP_SUPABASE;
  var client = window.supabase.createClient(config.url, config.publishableKey);
  var slug = new URLSearchParams(window.location.search).get('slug');

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function formatDate(value) {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function show(id) {
    ['loading', 'article-view', 'index-view', 'not-found'].forEach(function (name) { $(name).hidden = name !== id; });
  }

  function updateMeta(post) {
    var title = post.title + ' · Klinik Penyesalan';
    var url = 'https://www.klinikpenyesalan.com/blog.html?slug=' + encodeURIComponent(post.slug);
    document.title = title;
    document.querySelector('meta[name="description"]').content = post.excerpt || 'A desk note from Klinik Penyesalan.';
    document.querySelector('link[rel="canonical"]').href = url;
    document.querySelector('meta[property="og:title"]').content = title;
    document.querySelector('meta[property="og:description"]').content = post.excerpt || '';
    if (post.thumbnail_url) document.querySelector('meta[property="og:image"]').content = post.thumbnail_url;
  }

  async function renderArticle() {
    var result = await client.from('blog_posts').select('slug,title,excerpt,content_html,thumbnail_url,published_at,status').eq('slug', slug).eq('status', 'published').lte('published_at', new Date().toISOString()).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return show('not-found');
    var post = result.data;
    updateMeta(post);
    $('article-title').textContent = post.title;
    $('article-excerpt').textContent = post.excerpt || '';
    $('article-date').textContent = formatDate(post.published_at);
    var text = window.DOMPurify.sanitize(post.content_html || '', { ALLOWED_TAGS: [] });
    $('read-time').textContent = Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 220)) + ' MIN READ';
    $('article-content').innerHTML = window.DOMPurify.sanitize(post.content_html || '', {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['form', 'input', 'button', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick']
    });
    if (post.thumbnail_url) {
      $('article-thumbnail').src = post.thumbnail_url;
      $('article-thumbnail').alt = post.title;
      $('article-thumbnail').hidden = false;
    }
    show('article-view');
  }

  async function renderIndex() {
    var result = await client.from('blog_posts').select('slug,title,excerpt,thumbnail_url,published_at').eq('status', 'published').lte('published_at', new Date().toISOString()).order('published_at', { ascending: false });
    if (result.error) throw result.error;
    var posts = result.data || [];
    $('all-posts').innerHTML = posts.length ? posts.map(function (post) {
      var imageStyle = post.thumbnail_url ? ' style="background-image:url(&quot;' + escapeHtml(post.thumbnail_url) + '&quot;)"' : '';
      return '<a class="post-card" href="blog.html?slug=' + encodeURIComponent(post.slug) + '"><div class="post-card-image"' + imageStyle + '></div><div class="post-card-body"><div class="post-card-meta"><span>DESK NOTE</span><time>' + escapeHtml(formatDate(post.published_at)) + '</time></div><h2>' + escapeHtml(post.title) + '</h2><p>' + escapeHtml(post.excerpt || '') + '</p><span class="post-card-open">READ NOTE →</span></div></a>';
    }).join('') : '<div class="state"><span class="eyebrow">NO NOTES YET</span><p>The desk is being prepared.</p></div>';
    show('index-view');
  }

  function initTheme() {
    var button = $('theme-toggle');
    function sync() { button.textContent = document.documentElement.getAttribute('data-theme') === 'light' ? 'DARK' : 'LIGHT'; }
    sync();
    button.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('kp-theme', next);
      sync();
    });
  }

  initTheme();
  (slug ? renderArticle() : renderIndex()).catch(function () { show('not-found'); });
})();
