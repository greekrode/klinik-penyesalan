(function () {
  'use strict';

  function fit(frame) {
    var resize = function () {
      try {
        var inner = frame.contentDocument;
        if (!inner || !inner.documentElement) return;
        var height = Math.max(inner.documentElement.scrollHeight, inner.body ? inner.body.scrollHeight : 0);
        if (height) frame.style.height = height + 'px';
      } catch (_error) {}
    };
    var arm = function () {
      resize();
      try {
        if (window.ResizeObserver && frame.contentDocument) new ResizeObserver(resize).observe(frame.contentDocument.documentElement);
      } catch (_error) {}
      var settle = window.setInterval(resize, 600);
      window.setTimeout(function () { window.clearInterval(settle); }, 6000);
    };
    frame.addEventListener('load', arm);
    window.addEventListener('resize', resize);
    arm();
  }

  window.KPDocumentFrame = { fit: fit };
})();
