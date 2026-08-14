// NexusSnap Action Orbit local icon registry.
// Icons are host-local SVG files rendered as masks so they continue to inherit currentColor.
(function(global, factory) {
  var api = factory(global);
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.NexusActionOrbitIcons = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(global) {
  'use strict';

  function resolvePageUrl(relative, fallback) {
    try {
      if (global.location && global.location.href) return new URL(relative, global.location.href).href;
    } catch (error) {}
    return fallback;
  }

  var isCep = Boolean(
    global.__NEXUS_CEP_PREVIEW__ ||
    global.__adobe_cep__ ||
    (global.location && /\/ae-cep-ext\/client\//.test(global.location.pathname || ''))
  );
  var hasExtensionUrl = Boolean(global.chrome && global.chrome.runtime && typeof global.chrome.runtime.getURL === 'function');
  var base = isCep
    ? resolvePageUrl('icons/', '../icons/')
    : hasExtensionUrl
      ? global.chrome.runtime.getURL('icons/ui/')
      : resolvePageUrl('icons/ui/', 'icons/ui/');
  function icon(name) {
    return '<span class="nexus-local-icon" style="--nexus-icon-url:url(' + base + name + '.svg)" aria-hidden="true"></span>';
  }

  return Object.freeze({
    'path-current': icon('path-current'),
    'path-project': icon('file'),
    'path-desktop': icon('desktop'),
    'path-downloads': icon('download'),
    'edit': icon('edit'),
    'download': icon('download'),
    'download-local': icon('download'),
    'local-resource': icon('upload'),
    'image': icon('image'),
    'file': icon('file'),
    'folder': icon('folder'),
    'composition': icon('monitor'),
    'home': icon('home'),
    'folder-selected': icon('folder-selected'),
    'layer-top': icon('layer-top'),
    'layer-above': icon('layer-above'),
    'layer-bottom': icon('layer-bottom'),
    'time-start': icon('start-comp'),
    'time-playhead': icon('clock'),
    'time-selected-in': icon('time-selected-in'),
    'time-selected-range': icon('time-selected-range'),
    'package-regular': icon('package-regular'),
    'package-precompose': icon('package-precompose'),
    'svg-original': icon('svg-original'),
    'svg-shapes': icon('svg-shapes'),
    'svg-image': icon('svg-image'),
    'back': icon('back'),
    'confirm': icon('confirm'),
    'cancel': icon('close')
  });
});
