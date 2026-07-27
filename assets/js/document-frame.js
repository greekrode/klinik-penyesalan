(function () {
  'use strict';

  function fit(frame) {
    var resize = function () {
      try {
        var inner = frame.contentDocument;
        if (!inner || !inner.documentElement) return;
        // Measure at the real viewport height so vh-based sections resolve
        // against it; measuring at the frame's own height would feed the
        // result back into the next measurement and grow the frame forever.
        frame.style.height = window.innerHeight + 'px';
        var height = Math.max(inner.documentElement.scrollHeight, inner.body ? inner.body.scrollHeight : 0);
        frame.style.height = (height || window.innerHeight) + 'px';
      } catch (_error) {}
    };
    // Imported documents opt into theming by declaring data-theme attributes
    // or [data-theme="dark"] styles; the site's toggle is mirrored onto them.
    var syncTheme = function () {
      try {
        var inner = frame.contentDocument;
        if (!inner || !inner.documentElement) return;
        var theme = document.documentElement.getAttribute('data-theme') || 'dark';
        inner.documentElement.setAttribute('data-theme', theme);
        inner.querySelectorAll('[data-theme]').forEach(function (element) { element.setAttribute('data-theme', theme); });
      } catch (_error) {}
    };
    var arm = function () {
      syncTheme();
      resize();
      try {
        frame.contentDocument.addEventListener('load', resize, true);
      } catch (_error) {}
      var settle = window.setInterval(resize, 600);
      window.setTimeout(function () { window.clearInterval(settle); }, 6000);
    };
    frame.addEventListener('load', arm);
    window.addEventListener('resize', resize);
    try {
      new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    } catch (_error) {}
    arm();
  }

  window.KPDocumentFrame = { fit: fit };
})();
