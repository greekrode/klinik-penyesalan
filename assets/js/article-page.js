(function () {
  'use strict';

  var themeButton = document.getElementById('theme-toggle');
  var share = document.querySelector('.article-share');
  var status = document.getElementById('share-status');

  function syncTheme() {
    themeButton.textContent = document.documentElement.getAttribute('data-theme') === 'light' ? 'DARK' : 'LIGHT';
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

  syncTheme();
  themeButton.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('kp-theme', next);
    syncTheme();
  });

  if (!share) return;
  document.getElementById('share-copy').addEventListener('click', function () { copyLink(); });
  document.getElementById('share-instagram').addEventListener('click', async function () {
    if (navigator.share) {
      try {
        await navigator.share({ title: share.dataset.shareTitle, text: share.dataset.shareText, url: share.dataset.shareUrl });
        setStatus('SHARED');
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }
    await copyLink('LINK COPIED FOR INSTAGRAM');
  });
})();
