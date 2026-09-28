(function () {
  'use strict';

  var stylesheet = '/assets/css/newsletter-content.css';

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function ensureStyles(doc) {
    if (!doc || !doc.head || doc.getElementById('kp-newsletter-content-styles')) return;
    var link = doc.createElement('link');
    link.id = 'kp-newsletter-content-styles';
    link.rel = 'stylesheet';
    link.href = stylesheet;
    doc.head.appendChild(link);
  }

  function markCaptions(root) {
    if (!root) return;
    root.querySelectorAll('p').forEach(function (paragraph) {
      var text = paragraph.textContent.trim();
      if (/^(figure|fig\.|table|exhibit|source(?:s)?\s*:)/i.test(text) && text.length < 420) {
        paragraph.classList.add('kp-newsletter-caption');
      }
    });
  }

  function wrapTables(root) {
    if (!root) return;
    root.querySelectorAll('table').forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains('kp-table-scroll')) return;
      var wrapper = table.ownerDocument.createElement('div');
      wrapper.className = 'kp-table-scroll';
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', 'Scrollable data table');
      wrapper.tabIndex = 0;
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  function hideDuplicateCover(doc, title) {
    var heading = doc.querySelector('h1');
    if (!heading) return;
    var expected = normalize(title);
    var actual = normalize(heading.textContent);
    if (!expected || !actual || (expected !== actual && expected.indexOf(actual) !== 0 && actual.indexOf(expected) !== 0)) return;
    var cover = heading.closest('header');
    (cover || heading).classList.add('kp-document-cover');
  }

  function documentRoot(doc) {
    if (!doc || !doc.body) return null;
    return doc.querySelector('main, article, [role="main"]') || doc.body.firstElementChild || doc.body;
  }

  function processDocument(doc, options) {
    if (!doc || !doc.documentElement || !doc.body) return;
    var root = documentRoot(doc);
    doc.documentElement.classList.add('kp-newsletter-document');
    doc.body.classList.add('kp-newsletter-document-body');
    if (root) root.classList.add('kp-newsletter-root');
    ensureStyles(doc);
    hideDuplicateCover(doc, options && options.title);
    markCaptions(root);
    wrapTables(root);
  }

  function processContainer(root) {
    if (!root) return;
    root.classList.add('kp-newsletter-rich');
    markCaptions(root);
    wrapTables(root);
  }

  window.KPNewsletterProcessor = {
    processContainer: processContainer,
    processDocument: processDocument
  };

  function processPage() {
    document.querySelectorAll('.article-content:not(.article-content--document)').forEach(processContainer);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', processPage);
  else processPage();
})();
