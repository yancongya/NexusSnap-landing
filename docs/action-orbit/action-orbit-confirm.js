// Shared final confirmation for Action Orbit.
// It edits a temporary intent only and never performs I/O.
(function(global, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.NexusActionOrbitConfirm = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function create(options) {
    options = options || {};
    function t(key, fallback, params) {
      var value = typeof options.translate === 'function' ? options.translate(key, fallback, params || {}) : fallback;
      if (value === undefined || value === null || value === key) value = fallback;
      return String(value).replace(/\{(\w+)\}/g, function(match, name) {
        return params && params[name] !== undefined ? params[name] : match;
      });
    }
    var root = options.root;
    var Icons = options.icons || {};
    var intent = null;
    if (!root) throw new Error('Action Orbit confirmation requires a root');

    root.classList.add('nexus-orbit-confirm');
    root.hidden = true;
    root.innerHTML =
      '<form class="nexus-orbit-confirm-card" data-orbit-confirm-form>' +
        '<header><strong>' + t('confirm.title', '确认资源') + '</strong><span data-orbit-confirm-count></span></header>' +
        '<div class="nexus-orbit-confirm-fields" data-orbit-confirm-fields></div>' +
        '<div class="nexus-orbit-confirm-list" data-orbit-confirm-list></div>' +
        '<fieldset class="nexus-orbit-confirm-package" data-orbit-confirm-package hidden>' +
          '<legend>' + t('confirm.packaging', '资源包装') + '</legend>' +
          '<div role="radiogroup" aria-label="' + t('confirm.packaging', '资源包装') + '">' +
            choice('data-orbit-package', 'regular', 'package-regular', t('confirm.regularAsset', '普通素材')) +
            choice('data-orbit-package', 'precompose', 'package-precompose', t('confirm.precompose', '预合成')) +
          '</div>' +
        '</fieldset>' +
        '<fieldset class="nexus-orbit-confirm-svg" data-orbit-confirm-svg hidden>' +
          '<legend>' + t('confirm.svgHandling', 'SVG 处理方式') + '</legend>' +
          '<div role="radiogroup" aria-label="' + t('confirm.svgHandling', 'SVG 处理方式') + '">' +
            choice('data-orbit-svg-mode', 'original', 'svg-original', t('confirm.keepSvg', '保留 SVG')) +
            choice('data-orbit-svg-mode', 'shapes', 'svg-shapes', t('confirm.shapeLayer', '形状图层')) +
            choice('data-orbit-svg-mode', 'image', 'svg-image', t('confirm.convertImage', '转为图片')) +
          '</div>' +
          '<small data-orbit-confirm-svg-hint></small>' +
        '</fieldset>' +
        '<footer>' +
          '<button type="button" data-orbit-confirm-cancel>' + t('confirm.cancel', '取消') + '</button>' +
          '<button type="submit" class="is-primary">' + t('confirm.continue', '继续') + '</button>' +
        '</footer>' +
      '</form>';

    var form = root.querySelector('[data-orbit-confirm-form]');
    var count = root.querySelector('[data-orbit-confirm-count]');
    var fields = root.querySelector('[data-orbit-confirm-fields]');
    var list = root.querySelector('[data-orbit-confirm-list]');
    var packageOptions = root.querySelector('[data-orbit-confirm-package]');
    var svgOptions = root.querySelector('[data-orbit-confirm-svg]');
    var svgHint = root.querySelector('[data-orbit-confirm-svg-hint]');
    var cancel = root.querySelector('[data-orbit-confirm-cancel]');

    function choice(attribute, value, icon, label) {
      return '<button type="button" ' + attribute + '="' + value + '" aria-pressed="false" title="' +
        label + '">' + (Icons[icon] || '') + '<span>' + label + '</span></button>';
    }

    function setChoice(group, attribute, value) {
      var buttons = group.querySelectorAll('[' + attribute + ']');
      for (var i = 0; i < buttons.length; i += 1) {
        var active = buttons[i].getAttribute(attribute) === value;
        buttons[i].classList.toggle('is-active', active);
        buttons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
      }
    }

    function isSvgName(value) {
      return /\.svg(?:$|[?#])/i.test(String(value || '').trim());
    }

    function hasSvgResource() {
      var inputs = list.querySelectorAll('[data-resource-id]');
      for (var i = 0; i < inputs.length; i += 1) {
        if (isSvgName(inputs[i].value)) return true;
      }
      return false;
    }

    function setSvgMode(mode) {
      setChoice(svgOptions, 'data-orbit-svg-mode', mode);
    }

    function updateSvgOptions() {
      if (!intent) return;
      var visible = hasSvgResource();
      svgOptions.hidden = !visible;
      if (!visible) return;
      var saveOnly = intent.storage && intent.storage.action === 'save-only';
      var compTarget = intent.ae && intent.ae.target === 'comp';
      var shapes = svgOptions.querySelector('[data-orbit-svg-mode="shapes"]');
      var image = svgOptions.querySelector('[data-orbit-svg-mode="image"]');
      shapes.disabled = !compTarget;
      shapes.title = compTarget ? t('confirm.convertShapeLayer', '转为形状图层') : t('confirm.shapesOnlyComp', '形状图层只能导入合成');
      image.disabled = saveOnly;
      image.title = saveOnly ? t('confirm.downloadKeepsSvg', '直接下载不会执行 SVG 转换') : t('confirm.convertImage', '转为图片');
      var mode = intent.file && intent.file.svgMode || 'original';
      if ((mode === 'shapes' && shapes.disabled) || (mode === 'image' && image.disabled)) mode = 'original';
      setSvgMode(mode);
      svgHint.textContent = saveOnly
        ? t('confirm.directDownloadOriginalSvg', '直接下载保留原始 SVG')
        : compTarget ? t('confirm.continueWithSelectedSvgMode', '确认后按所选方式继续导入') : t('confirm.shapeOnlyCompImport', '形状图层仅适用于合成导入');
    }

    function open(nextIntent) {
      intent = nextIntent;
      count.textContent = t('confirm.itemCount', '{count} 项', { count: (intent.resources || []).length });
      fields.innerHTML = '';
      list.innerHTML = '';

      if (intent.storage && intent.storage.directoryMode === 'custom') {
        fields.appendChild(field(t('confirm.storagePath', '磁盘保存路径'), 'storage-directory', intent.storage.directory || ''));
      }
      if (intent.ae && intent.ae.target === 'folder' && !intent.ae.folderPath) {
        fields.appendChild(field(t('confirm.aeFolder', 'AE 文件夹'), 'ae-folder', ''));
      }
      packageOptions.hidden = !(intent.ae && intent.ae.target !== 'none');
      if (!packageOptions.hidden) setChoice(packageOptions, 'data-orbit-package', intent.ae.precompose === true ? 'precompose' : 'regular');

      (intent.resources || []).forEach(function(resource) {
        var label = document.createElement('label');
        label.className = 'nexus-orbit-confirm-row';
        label.innerHTML = '<span title="' + escapeHtml(resource.originalName) + '">' +
          escapeHtml(resource.originalName) +
          '</span><input type="text" data-resource-id="' + escapeHtml(resource.id) +
          '" value="' + escapeHtml(resource.finalName) + '" aria-label="' + t('confirm.finalFileName', '最终文件名') + '">';
        list.appendChild(label);
      });

      updateSvgOptions();
      root.hidden = false;
      var first = root.querySelector('input');
      if (first) first.focus();
    }

    function close(cancelled) {
      root.hidden = true;
      if (cancelled && typeof options.onCancel === 'function') options.onCancel(intent);
      intent = null;
    }

    function field(labelText, fieldName, value) {
      var label = document.createElement('label');
      label.className = 'nexus-orbit-confirm-field';
      label.innerHTML = '<span>' + escapeHtml(labelText) + '</span><input type="text" data-orbit-field="' +
        fieldName + '" value="' + escapeHtml(value) + '">';
      return label;
    }

    form.addEventListener('submit', function(event) {
      event.preventDefault();
      if (!intent) return;
      Array.prototype.forEach.call(list.querySelectorAll('[data-resource-id]'), function(input) {
        for (var i = 0; i < intent.resources.length; i += 1) {
          if (String(intent.resources[i].id) !== String(input.dataset.resourceId)) continue;
          var name = input.value.trim();
          if (name) intent.resources[i].finalName = name;
          intent.resources[i].renamed = intent.resources[i].finalName !== intent.resources[i].originalName;
        }
      });
      var directory = fields.querySelector('[data-orbit-field="storage-directory"]');
      var folder = fields.querySelector('[data-orbit-field="ae-folder"]');
      if (directory) intent.storage.directory = directory.value.trim();
      if (folder) intent.ae.folderPath = folder.value.trim();
      if (!svgOptions.hidden) {
        var selectedSvgMode = svgOptions.querySelector('[data-orbit-svg-mode].is-active');
        if (selectedSvgMode) intent.file.svgMode = selectedSvgMode.dataset.orbitSvgMode;
      }
      if (!packageOptions.hidden) {
        var selectedPackage = packageOptions.querySelector('[data-orbit-package].is-active');
        intent.ae.precompose = !!(selectedPackage && selectedPackage.dataset.orbitPackage === 'precompose');
      }
      var completed = intent;
      close(false);
      if (typeof options.onConfirm === 'function') options.onConfirm(completed);
    });
    list.addEventListener('input', updateSvgOptions);
    svgOptions.addEventListener('click', function(event) {
      var button = event.target.closest('[data-orbit-svg-mode]');
      if (!button || button.disabled) return;
      setSvgMode(button.dataset.orbitSvgMode);
    });
    packageOptions.addEventListener('click', function(event) {
      var button = event.target.closest('[data-orbit-package]');
      if (!button) return;
      setChoice(packageOptions, 'data-orbit-package', button.dataset.orbitPackage);
    });
    cancel.addEventListener('click', function() { close(true); });
    root.addEventListener('pointerdown', function(event) {
      if (event.target === root) close(true);
    });
    root.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') { event.preventDefault(); close(true); }
    });
    root.addEventListener('contextmenu', function(event) {
      if (root.hidden) return;
      event.preventDefault();
      close(true);
    });

    return Object.freeze({ open: open, close: function() { close(true); } });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return Object.freeze({ create: create });
});
