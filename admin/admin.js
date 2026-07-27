(function () {
  'use strict';

  var config = window.KP_SUPABASE;
  var client = window.supabase.createClient(config.url, config.publishableKey);
  var state = { posts: [], currentId: null, filter: 'all', session: null, slugTouched: false, pendingDocx: null, contentMode: 'rich', documentHtml: null };
  var editorPromise = null;

  var $ = function (id) { return document.getElementById(id); };
  var views = { login: $('login-view'), unauthorized: $('unauthorized-view'), admin: $('admin-view') };
  var loginMessage = $('login-message');
  var editorMessage = $('editor-message');
  var busy = $('busy');

  function showView(name) {
    Object.keys(views).forEach(function (key) { views[key].hidden = key !== name; });
    $('sign-out').hidden = name === 'login';
  }

  function setMessage(element, text, type) {
    element.textContent = text || '';
    element.className = 'message' + (type ? ' is-' + type : '');
  }

  function setBusy(on, label) {
    busy.hidden = !on;
    busy.querySelector('p').textContent = label || 'Working…';
  }

  function slugify(value) {
    return String(value || '')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160);
  }

  function dateTimeLocal(value) {
    if (!value) return '';
    var date = new Date(value);
    var offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function sanitize(html) {
    return window.DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['form', 'input', 'button', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick']
    });
  }

  function isDocumentHtml(html) {
    return /^\s*<!doctype/i.test(String(html || ''));
  }

  function sanitizeDocument(html) {
    var clean = window.DOMPurify.sanitize(html, {
      WHOLE_DOCUMENT: true,
      USE_PROFILES: { html: true, svg: true, svgFilters: true },
      ADD_TAGS: ['style', 'link', 'meta', 'title'],
      ADD_ATTR: ['target', 'charset', 'content', 'property', 'media', 'crossorigin'],
      FORBID_TAGS: ['form', 'input', 'button', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick']
    });
    clean = clean.replace(/<head([^>]*)>/i, '<head$1><base target="_blank">');
    return '<!doctype html>\n' + clean;
  }

  function setContentMode(mode, documentHtml) {
    state.contentMode = mode;
    state.documentHtml = mode === 'document' ? documentHtml : null;
    $('rich-editor').hidden = mode === 'document';
    $('document-mode').hidden = mode !== 'document';
    $('document-preview').srcdoc = mode === 'document' ? documentHtml : '';
    if (mode === 'document' && window.tinymce.get('content')) window.tinymce.get('content').setContent('');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function currentPost() {
    return state.posts.find(function (post) { return post.id === state.currentId; }) || null;
  }

  function ensureEditor() {
    if (window.tinymce.get('content')) return Promise.resolve(window.tinymce.get('content'));
    if (!editorPromise) {
      editorPromise = window.tinymce.init({
        selector: '#content',
        license_key: 'gpl',
        height: 620,
        menubar: 'edit view insert format tools table help',
        plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime table help wordcount quickbars',
        toolbar: 'undo redo | styles blocks | fontfamily fontsize lineheight | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | blockquote hr | link image table charmap | removeformat code preview fullscreen',
        toolbar_mode: 'sliding',
        font_size_formats: '10px 12px 14px 15px 16px 17px 18px 20px 22px 24px 28px 32px 36px 40px 48px 56px 64px',
        line_height_formats: '1 1.2 1.4 1.5 1.6 1.8 2',
        content_style: 'body{font-family:Arial,sans-serif;font-size:14px;line-height:1.7;max-width:820px;margin:32px auto;padding:0 24px}img{max-width:100%;height:auto}blockquote{border-left:3px solid #3bbcb4;margin-left:0;padding-left:20px;color:#667}a{color:#168c84}table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #ccd2d7}',
        image_caption: true,
        link_default_target: '_blank',
        link_assume_external_targets: 'https',
        promotion: false,
        branding: false
      }).then(function (editors) { return editors[0]; });
    }
    return editorPromise;
  }

  function renderPosts() {
    var list = $('post-list');
    var posts = state.posts.filter(function (post) { return state.filter === 'all' || post.status === state.filter; });
    if (!posts.length) {
      list.innerHTML = '<p class="empty">No ' + (state.filter === 'all' ? '' : state.filter + ' ') + 'posts yet.</p>';
      return;
    }
    list.innerHTML = posts.map(function (post) {
      var date = new Date(post.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      return '<button class="post-item' + (post.id === state.currentId ? ' is-active' : '') + '" type="button" data-id="' + post.id + '">' +
        '<h3>' + escapeHtml(post.title) + '</h3><div class="post-meta"><span class="' + post.status + '">' + post.status + '</span><span>' + date + '</span></div></button>';
    }).join('');
  }

  function resetForm() {
    state.currentId = null;
    state.slugTouched = false;
    $('editor-form').reset();
    $('post-id').value = '';
    $('thumbnail-url').value = '';
    $('thumbnail-path').value = '';
    $('thumbnail-preview').hidden = true;
    $('thumbnail-preview').style.backgroundImage = '';
    $('delete-post').hidden = true;
    $('editor-kicker').textContent = 'NEW POST';
    $('editor-heading').textContent = 'Untitled article';
    setContentMode('rich');
    if (window.tinymce.get('content')) window.tinymce.get('content').setContent('');
    setMessage(editorMessage, '');
    renderPosts();
  }

  function fillForm(post) {
    state.currentId = post.id;
    state.slugTouched = true;
    $('post-id').value = post.id;
    $('title').value = post.title;
    $('slug').value = post.slug;
    $('status').value = post.status;
    $('excerpt').value = post.excerpt || '';
    $('published-at').value = dateTimeLocal(post.published_at);
    $('thumbnail-url').value = post.thumbnail_url || '';
    $('thumbnail-path').value = post.thumbnail_path || '';
    $('thumbnail').value = '';
    $('thumbnail-preview').hidden = !post.thumbnail_url;
    $('thumbnail-preview').style.backgroundImage = post.thumbnail_url ? 'url("' + post.thumbnail_url.replace(/"/g, '%22') + '")' : '';
    $('delete-post').hidden = false;
    $('editor-kicker').textContent = post.status === 'published' ? 'PUBLISHED POST' : 'DRAFT POST';
    $('editor-heading').textContent = post.title;
    if (isDocumentHtml(post.content_html)) {
      setContentMode('document', post.content_html);
    } else {
      setContentMode('rich');
      window.tinymce.get('content').setContent(post.content_html || '');
    }
    setMessage(editorMessage, '');
    renderPosts();
  }

  async function loadPosts() {
    var result = await client.from('blog_posts').select('*').order('updated_at', { ascending: false });
    if (result.error) throw result.error;
    state.posts = result.data || [];
    renderPosts();
    if (state.currentId) {
      var refreshed = currentPost();
      if (refreshed) fillForm(refreshed); else resetForm();
    }
  }

  async function isAdmin(userId) {
    var result = await client.from('blog_admins').select('user_id').eq('user_id', userId).maybeSingle();
    if (result.error) throw result.error;
    return Boolean(result.data);
  }

  async function routeSession(session) {
    state.session = session;
    $('user-email').textContent = session && session.user ? session.user.email : '';
    if (!session) {
      showView('login');
      return;
    }
    try {
      if (!(await isAdmin(session.user.id))) {
        showView('unauthorized');
        return;
      }
      showView('admin');
      await ensureEditor();
      await loadPosts();
      if (!state.currentId) resetForm();
    } catch (error) {
      showView('unauthorized');
      setMessage(editorMessage, error.message, 'error');
    }
  }

  async function uploadImage(file, folder) {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('Use a JPEG, PNG, WebP, or GIF image.');
    if (file.size > 10 * 1024 * 1024) throw new Error('Images must be 10 MB or smaller.');
    var extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[file.type];
    var path = folder + '/' + crypto.randomUUID() + '.' + extension;
    var upload = await client.storage.from(config.mediaBucket).upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
    if (upload.error) throw upload.error;
    var publicData = client.storage.from(config.mediaBucket).getPublicUrl(path).data;
    return { path: path, url: publicData.publicUrl };
  }

  function base64File(base64, type) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], 'docx-image', { type: type });
  }

  function clearDocxWarning() {
    state.pendingDocx = null;
    $('docx-warning').hidden = true;
    $('docx-warning-list').replaceChildren();
    $('docx-file').value = '';
  }

  function showDocxWarning(messages) {
    var list = $('docx-warning-list');
    list.replaceChildren();
    messages.forEach(function (message) {
      var item = document.createElement('li');
      item.textContent = message;
      list.appendChild(item);
    });
    $('docx-warning').hidden = false;
  }

  async function inspectDocx(file) {
    if (!file || !/\.docx$/i.test(file.name)) throw new Error('Choose a .docx file.');
    if (file.size > 25 * 1024 * 1024) throw new Error('DOCX files must be 25 MB or smaller.');
    setBusy(true, 'Checking Word document…');
    try {
      var arrayBuffer = await file.arrayBuffer();
      var report = await window.KPDocxPreflight.inspect(arrayBuffer);
      if (report.messages.length) {
        state.pendingDocx = { file: file, arrayBuffer: arrayBuffer };
        showDocxWarning(report.messages);
        setMessage(editorMessage, 'Review the flagged chart and graphic items before continuing.', 'error');
        return;
      }
      await importDocx(file, arrayBuffer);
    } finally {
      setBusy(false);
    }
  }

  async function importDocx(file, arrayBuffer) {
    setBusy(true, 'Importing Word document…');
    try {
      var result = await window.mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, {
        convertImage: window.mammoth.images.imgElement(async function (image) {
          if (!/^image\/(jpeg|png|webp|gif)$/.test(image.contentType)) return { src: '', alt: '' };
          var uploaded = await uploadImage(base64File(await image.read('base64'), image.contentType), 'content');
          return { src: uploaded.url, alt: '' };
        })
      });
      setContentMode('rich');
      window.tinymce.get('content').setContent(sanitize(result.value));
      var warnings = result.messages.filter(function (item) { return item.type === 'warning'; });
      setMessage(editorMessage, warnings.length ? 'DOCX imported with ' + warnings.length + ' formatting warning(s).' : 'DOCX imported successfully.', warnings.length ? '' : 'success');
    } finally {
      setBusy(false);
      clearDocxWarning();
    }
  }

  async function importHtml(file) {
    if (!file || !/\.html?$/i.test(file.name)) throw new Error('Choose an .html file.');
    if (file.size > 5 * 1024 * 1024) throw new Error('HTML files must be 5 MB or smaller.');
    clearDocxWarning();
    setBusy(true, 'Importing HTML document…');
    try {
      var raw = await file.text();
      var hadScripts = /<script\b/i.test(raw);
      var doc = sanitizeDocument(raw);
      setContentMode('document', doc);
      var parsed = new DOMParser().parseFromString(doc, 'text/html');
      if (!$('title').value.trim() && parsed.title.trim()) {
        $('title').value = parsed.title.trim().slice(0, 180);
        $('title').dispatchEvent(new Event('input'));
      }
      var description = parsed.querySelector('meta[name="description"]');
      if (!$('excerpt').value.trim() && description && description.content.trim()) $('excerpt').value = description.content.trim().slice(0, 360);
      setMessage(editorMessage, hadScripts ? 'HTML imported. Scripts were removed for safety.' : 'HTML imported. The article will render this document as designed.', 'success');
    } finally {
      setBusy(false);
      $('html-file').value = '';
    }
  }

  async function savePost(event) {
    event.preventDefault();
    setMessage(editorMessage, '');
    var title = $('title').value.trim();
    var slug = slugify($('slug').value);
    var status = $('status').value;
    var publishedAt = $('published-at').value ? new Date($('published-at').value).toISOString() : null;
    if (!title || !slug) return setMessage(editorMessage, 'Title and slug are required.', 'error');
    if (state.contentMode === 'document' && !state.documentHtml) return setMessage(editorMessage, 'Import an HTML file or switch back to the editor.', 'error');
    if (status === 'published' && !publishedAt) publishedAt = new Date().toISOString();
    setBusy(true, 'Saving post…');
    try {
      var thumbnailUrl = $('thumbnail-url').value || null;
      var thumbnailPath = $('thumbnail-path').value || null;
      var thumbnail = $('thumbnail').files[0];
      if (thumbnail) {
        var uploaded = await uploadImage(thumbnail, 'thumbnails');
        thumbnailUrl = uploaded.url;
        thumbnailPath = uploaded.path;
      }
      var payload = {
        title: title,
        slug: slug,
        status: status,
        excerpt: $('excerpt').value.trim(),
        content_html: state.contentMode === 'document' ? state.documentHtml : sanitize(window.tinymce.get('content').getContent()),
        published_at: publishedAt,
        thumbnail_url: thumbnailUrl,
        thumbnail_path: thumbnailPath,
        updated_at: new Date().toISOString()
      };
      var result;
      if (state.currentId) {
        result = await client.from('blog_posts').update(payload).eq('id', state.currentId).select().single();
      } else {
        payload.author_id = state.session.user.id;
        result = await client.from('blog_posts').insert(payload).select().single();
      }
      if (result.error) throw result.error;
      state.currentId = result.data.id;
      await loadPosts();
      setMessage(editorMessage, status === 'published' ? 'Post is live.' : 'Draft saved.', 'success');
    } catch (error) {
      setMessage(editorMessage, error.code === '23505' ? 'That slug is already in use.' : error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function deletePost() {
    var post = currentPost();
    if (!post || !window.confirm('Delete “' + post.title + '”? This cannot be undone.')) return;
    setBusy(true, 'Deleting post…');
    try {
      var result = await client.from('blog_posts').delete().eq('id', post.id);
      if (result.error) throw result.error;
      if (post.thumbnail_path) await client.storage.from(config.mediaBucket).remove([post.thumbnail_path]);
      state.currentId = null;
      await loadPosts();
      resetForm();
    } catch (error) {
      setMessage(editorMessage, error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function initTheme() {
    var button = $('theme-toggle');
    function sync() {
      var light = document.documentElement.getAttribute('data-theme') === 'light';
      var label = light ? 'Switch to dark mode' : 'Switch to light mode';
      button.innerHTML = '<i class="fa-solid fa-' + (light ? 'moon' : 'sun') + '" aria-hidden="true"></i>';
      button.setAttribute('aria-label', label);
      button.title = label;
    }
    sync();
    button.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('kp-theme', next);
      sync();
    });
  }

  async function init() {
    initTheme();
    $('login-form').addEventListener('submit', async function (event) {
      event.preventDefault();
      setMessage(loginMessage, 'Signing in…');
      var result = await client.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
      if (result.error) return setMessage(loginMessage, result.error.message, 'error');
      setMessage(loginMessage, '');
      await routeSession(result.data.session);
    });
    $('sign-out').addEventListener('click', function () { client.auth.signOut(); });
    $('unauthorized-sign-out').addEventListener('click', function () { client.auth.signOut(); });
    $('new-post').addEventListener('click', resetForm);
    $('editor-form').addEventListener('submit', savePost);
    $('delete-post').addEventListener('click', deletePost);
    $('post-list').addEventListener('click', function (event) {
      var button = event.target.closest('[data-id]');
      if (!button) return;
      var post = state.posts.find(function (item) { return item.id === button.dataset.id; });
      if (post) fillForm(post);
    });
    document.querySelectorAll('.filter').forEach(function (button) {
      button.addEventListener('click', function () {
        state.filter = button.dataset.filter;
        document.querySelectorAll('.filter').forEach(function (item) { item.classList.toggle('is-active', item === button); });
        renderPosts();
      });
    });
    $('title').addEventListener('input', function () {
      $('editor-heading').textContent = $('title').value.trim() || 'Untitled article';
      if (!state.slugTouched) $('slug').value = slugify($('title').value);
    });
    $('slug').addEventListener('input', function () { state.slugTouched = Boolean($('slug').value); });
    $('status').addEventListener('change', function () {
      if ($('status').value === 'published' && !$('published-at').value) $('published-at').value = dateTimeLocal(new Date());
    });
    $('thumbnail').addEventListener('change', function () {
      var file = $('thumbnail').files[0];
      if (!file) return;
      $('thumbnail-preview').style.backgroundImage = 'url("' + URL.createObjectURL(file) + '")';
      $('thumbnail-preview').hidden = false;
    });
    $('docx-file').addEventListener('change', function () {
      inspectDocx($('docx-file').files[0]).catch(function (error) { setBusy(false); clearDocxWarning(); setMessage(editorMessage, error.message, 'error'); });
    });
    $('html-file').addEventListener('change', function () {
      importHtml($('html-file').files[0]).catch(function (error) { setBusy(false); $('html-file').value = ''; setMessage(editorMessage, error.message, 'error'); });
    });
    $('discard-document').addEventListener('click', function () {
      if (!window.confirm('Switch to the rich text editor? The imported HTML document will be replaced when you save.')) return;
      setContentMode('rich');
      setMessage(editorMessage, 'Editing as rich text. Import an HTML file again to restore document mode.');
    });
    $('cancel-docx').addEventListener('click', function () {
      clearDocxWarning();
      setMessage(editorMessage, 'DOCX import cancelled. Convert flagged charts to PNG, then try again.');
    });
    $('continue-docx').addEventListener('click', function () {
      var pending = state.pendingDocx;
      if (!pending) return;
      importDocx(pending.file, pending.arrayBuffer).catch(function (error) { setBusy(false); clearDocxWarning(); setMessage(editorMessage, error.message, 'error'); });
    });
    client.auth.onAuthStateChange(function (_event, session) { setTimeout(function () { routeSession(session); }, 0); });
    var sessionResult = await client.auth.getSession();
    await routeSession(sessionResult.data.session);
  }

  init().catch(function (error) {
    showView('login');
    setMessage(loginMessage, 'Admin failed to initialize: ' + error.message, 'error');
  });
})();
