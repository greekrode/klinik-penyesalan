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
    var arm = function () {
      resize();
      try {
        frame.contentDocument.addEventListener('load', resize, true);
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
