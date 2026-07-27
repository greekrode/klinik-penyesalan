(function () {
  'use strict';

  var themeButton = document.getElementById('theme-toggle');
  var share = document.querySelector('.article-share');
  var status = document.getElementById('share-status');
  var preparedShareImage = null;

  function syncTheme() {
    var light = document.documentElement.getAttribute('data-theme') === 'light';
    var label = light ? 'Switch to dark mode' : 'Switch to light mode';
    themeButton.innerHTML = '<i class="fa-solid fa-' + (light ? 'moon' : 'sun') + '" aria-hidden="true"></i>';
    themeButton.setAttribute('aria-label', label);
    themeButton.title = label;
  }

  function setStatus(message) {
    if (!status) return;
    status.textContent = message || '';
    window.clearTimeout(setStatus.timer);
    if (message) setStatus.timer = window.setTimeout(function () { status.textContent = ''; }, 3200);
  }

  async function copyLink(message) {
    try {
      await navigator.clipboard.writeText(share.dataset.shareUrl);
      setStatus(message || 'LINK COPIED');
    } catch (_error) {
      setStatus('COPY FAILED');
    }
  }

  async function prepareShareImage() {
    if (!share || !share.dataset.shareImage) return;
    try {
      var response = await fetch(share.dataset.shareImage, { mode: 'cors' });
      if (!response.ok) return;
      var blob = await response.blob();
      if (!/^image\/(png|jpeg|webp|gif)$/.test(blob.type)) return;
      var extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[blob.type];
      preparedShareImage = new File([blob], (share.dataset.shareSlug || 'klinik-article') + '.' + extension, { type: blob.type });
    } catch (_error) {}
  }

  syncTheme();
  themeButton.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('kp-theme', next);
    syncTheme();
  });

  var documentFrame = document.querySelector('.article-document');
  if (documentFrame && window.KPDocumentFrame) window.KPDocumentFrame.fit(documentFrame);

  if (!share) return;
  prepareShareImage();
  document.getElementById('share-copy').addEventListener('click', function () { copyLink(); });
  document.getElementById('share-instagram').addEventListener('click', async function () {
    if (navigator.share) {
      try {
        if (preparedShareImage && navigator.canShare && navigator.canShare({ files: [preparedShareImage] })) {
          await navigator.share({
            files: [preparedShareImage],
            title: share.dataset.shareTitle,
            text: share.dataset.shareText + '\n\n' + share.dataset.shareUrl
          });
        } else {
          await navigator.share({ title: share.dataset.shareTitle, text: share.dataset.shareText, url: share.dataset.shareUrl });
        }
        setStatus('SHARED');
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }
    await copyLink('LINK COPIED FOR INSTAGRAM');
  });
})();
