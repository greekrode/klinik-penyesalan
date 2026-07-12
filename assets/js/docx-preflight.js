(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(null);
  } else {
    root.KPDocxPreflight = factory(root.JSZip);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (JSZip) {
  'use strict';

  function classify(fileNames) {
    var names = fileNames.map(function (name) { return String(name).toLowerCase(); });
    var nativeCharts = names.filter(function (name) { return /^word\/charts\/chart\d*\.xml$/.test(name); });
    var diagrams = names.filter(function (name) { return /^word\/diagrams\/data\d*\.xml$/.test(name); });
    var embeddedObjects = names.filter(function (name) { return /^word\/embeddings\/[^/]+$/.test(name); });
    var unsupportedGraphics = names.filter(function (name) { return /^word\/media\/[^/]+\.(emf|wmf|svg)$/.test(name); });
    var messages = [];

    if (nativeCharts.length) {
      messages.push(nativeCharts.length + ' native Word chart' + (nativeCharts.length === 1 ? '' : 's') + ' detected. Export each chart as a high-resolution PNG and replace it after import.');
    }
    if (diagrams.length) {
      messages.push(diagrams.length + ' SmartArt/diagram object' + (diagrams.length === 1 ? '' : 's') + ' detected. These may not render correctly; replace them with PNG images.');
    }
    if (embeddedObjects.length) {
      messages.push(embeddedObjects.length + ' embedded Excel/OLE object' + (embeddedObjects.length === 1 ? '' : 's') + ' detected. Embedded workbooks and objects are not imported as web content.');
    }
    if (unsupportedGraphics.length) {
      var formats = Array.from(new Set(unsupportedGraphics.map(function (name) { return name.split('.').pop().toUpperCase(); }))).join(', ');
      messages.push(unsupportedGraphics.length + ' unsupported vector graphic' + (unsupportedGraphics.length === 1 ? '' : 's') + ' detected (' + formats + '). Convert them to PNG or WebP first.');
    }

    return {
      messages: messages,
      nativeCharts: nativeCharts.length,
      diagrams: diagrams.length,
      embeddedObjects: embeddedObjects.length,
      unsupportedGraphics: unsupportedGraphics.length
    };
  }

  async function inspect(arrayBuffer, zipLibrary) {
    var library = zipLibrary || JSZip;
    if (!library) throw new Error('The DOCX inspection library did not load. Refresh the page and try again.');
    var archive = await library.loadAsync(arrayBuffer);
    return classify(Object.keys(archive.files));
  }

  return { classify: classify, inspect: inspect };
});
