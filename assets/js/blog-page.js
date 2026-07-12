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
    document.querySelector('meta[name="description"]').content = post.excerpt || 'An article from the Klinik Penyesalan newsletter.';
    document.querySelector('link[rel="canonical"]').href = url;
    document.querySelector('meta[property="og:title"]').content = title;
    document.querySelector('meta[property="og:description"]').content = post.excerpt || '';
    if (post.thumbnail_url) document.querySelector('meta[property="og:image"]').content = post.thumbnail_url;
  }

  function setShareStatus(message) {
    $('share-status').textContent = message || '';
    window.clearTimeout(setShareStatus.timer);
    if (message) setShareStatus.timer = window.setTimeout(function () { $('share-status').textContent = ''; }, 3200);
  }

  async function copyLink(url, successMessage) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        var field = document.createElement('textarea');
        field.value = url;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        var copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('Copy command was rejected');
      }
      setShareStatus(successMessage || 'LINK COPIED');
    } catch (_error) {
      setShareStatus('COPY FAILED');
    }
  }

  function setupSharing(post) {
    var url = 'https://www.klinikpenyesalan.com/blog.html?slug=' + encodeURIComponent(post.slug);
    var shareData = { title: post.title, text: post.excerpt || post.title, url: url };
    $('share-x').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(post.title) + '&url=' + encodeURIComponent(url);
    $('share-facebook').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
    $('share-copy').onclick = function () { copyLink(url); };
    $('share-instagram').onclick = async function () {
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          setShareStatus('SHARED');
        } catch (error) {
          if (error && error.name !== 'AbortError') await copyLink(url, 'LINK COPIED FOR INSTAGRAM');
        }
      } else {
        await copyLink(url, 'LINK COPIED FOR INSTAGRAM');
      }
    };
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
    setupSharing(post);
    var text = window.DOMPurify.sanitize(post.content_html || '', { ALLOWED_TAGS: [] });
    $('read-time').textContent = Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 220)) + ' MIN READ';
    $('article-content').innerHTML = window.DOMPurify.sanitize(post.content_html || '', {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['form', 'input', 'button', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick']
    });
    var firstBlock = $('article-content').firstElementChild;
    var normalize = function (value) { return String(value || '').replace(/\s+/g, ' ').trim(); };
    if (firstBlock && /^(P|H1|H2)$/.test(firstBlock.tagName) && normalize(firstBlock.textContent) === normalize(post.title)) firstBlock.remove();
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
      return '<a class="post-card" href="blog.html?slug=' + encodeURIComponent(post.slug) + '"><div class="post-card-image"' + imageStyle + '></div><div class="post-card-body"><div class="post-card-meta"><span>NEWSLETTER</span><time>' + escapeHtml(formatDate(post.published_at)) + '</time></div><h2>' + escapeHtml(post.title) + '</h2><p>' + escapeHtml(post.excerpt || '') + '</p><span class="post-card-open">READ ARTICLE →</span></div></a>';
    }).join('') : '<div class="newsletter-empty"><div class="empty-visual" aria-hidden="true"><span class="empty-kicker">KP / NEWSLETTER</span><strong>01</strong><div class="empty-bars"><i></i><i></i><i></i><i></i><i></i></div></div><div class="empty-copy"><span class="eyebrow">NO ARTICLES PUBLISHED</span><h2>The first edition is in progress.</h2><p>New research will appear here when it is ready.</p></div></div>';
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
