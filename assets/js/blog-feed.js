(function () {
  'use strict';
  var container = document.getElementById('blog-grid');
  if (!container || !window.supabase || !window.KP_SUPABASE) return;
  var config = window.KP_SUPABASE;
  var client = window.supabase.createClient(config.url, config.publishableKey);

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function render(posts) {
    if (!posts.length) {
      container.innerHTML = '<div class="blog-empty"><span>NO ARTICLES YET</span><p>The first article will be published here.</p></div>';
      return;
    }
    container.innerHTML = posts.map(function (post, index) {
      var date = new Date(post.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      var image = post.thumbnail_url
        ? '<div class="blog-card-image" style="background-image:url(&quot;' + escapeHtml(post.thumbnail_url) + '&quot;)"></div>'
        : '<div class="blog-card-image blog-card-image--empty"><span>KP / ' + String(index + 1).padStart(2, '0') + '</span></div>';
      return '<a class="blog-card" href="/articles/' + encodeURIComponent(post.slug) + '">' + image +
        '<div class="blog-card-body"><div class="blog-card-meta"><span>NEWSLETTER</span><time>' + escapeHtml(date) + '</time></div>' +
        '<h3>' + escapeHtml(post.title) + '</h3><p>' + escapeHtml(post.excerpt || '') + '</p><span class="blog-card-open">READ ARTICLE →</span></div></a>';
    }).join('');
  }

  client.from('blog_posts')
    .select('slug,title,excerpt,thumbnail_url,published_at')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(6)
    .then(function (result) {
      if (result.error) throw result.error;
      render(result.data || []);
    })
    .catch(function () {
      container.innerHTML = '<div class="blog-empty"><span>NEWSLETTER OFFLINE</span><p>Articles could not be loaded right now.</p></div>';
    });
})();
