/*
 * NexusSnap landing — Carousel cards v3.
 * Clean separation: DOM build once, events bound once, state drives updates.
 */
(function (global, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.NexusFeatures = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var REDUCED = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

  var STEPS = [
    { zh: "收集", en: "Collect" },
    { zh: "整理", en: "Organize" },
    { zh: "面板", en: "Panel" },
    { zh: "路由", en: "Route" },
    { zh: "传输", en: "Transfer" },
    { zh: "归位", en: "Place" }
  ];

  var ICONS = {
    sniff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    basket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 13l3-8h12l3 8"/><path d="M3 13v6h18v-6"/><path d="M9 13v6M15 13v6"/></svg>',
    panel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
    orbit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/></svg>',
    local: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
    hosts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/></svg>'
  };

  var CHEV_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  var CHEV_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  function langOf() {
    var l = (document.documentElement.getAttribute('lang') || 'zh-CN').toLowerCase();
    return l.indexOf('en') === 0 ? 'en' : 'zh';
  }

  function pick(n) {
    if (!n) return '';
    return n[langOf()] != null ? n[langOf()] : (n.zh || n.en || '');
  }

  function L(zh, en) { return langOf() === 'en' ? en : zh; }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ========== create ========== */

  function create(options) {
    options = options || {};
    var root = options.root;
    var config = options.config || globalThis.NEXUS_FEATURES_CONFIG;
    if (!root || !config) return null;

    var features = (Array.isArray(config.features) ? config.features : [])
      .slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

    var state = { active: -1 };
    var els = {};
    var langObserver = null;

    /* --- build DOM once --- */

    function buildDOM() {
      var head = config.header || {};
      root.classList.add('nexus-fx-carousel');

      var stepsH = STEPS.map(function (s, i) {
        return '<span class="nexus-fx-step" data-step="' + i + '">' +
          '<span class="nexus-fx-step-dot"></span>' +
          '<span class="nexus-fx-step-label">' + esc(pick(s)) + '</span>' +
          (i < STEPS.length - 1 ? '<span class="nexus-fx-step-line"></span>' : '') +
        '</span>';
      }).join('');

      root.innerHTML =
        '<div class="nexus-fx-head">' +
          '<div class="nexus-fx-tag"></div>' +
          '<h2 class="nexus-fx-title"></h2>' +
          '<p class="nexus-fx-desc"></p>' +
        '</div>' +
        '<div class="nexus-fx-steps">' + stepsH + '</div>' +
        '<div class="nexus-fx-carousel-wrap">' +
          '<button type="button" class="nexus-fx-nav-btn is-prev" aria-label="' + L('上一张','Previous') + '">' + CHEV_L + '</button>' +
          '<div class="nexus-fx-track" tabindex="0" role="list" aria-label="' + L('功能卡片','Feature cards') + '"></div>' +
          '<button type="button" class="nexus-fx-nav-btn is-next" aria-label="' + L('下一张','Next') + '">' + CHEV_R + '</button>' +
        '</div>' +
        '<div class="nexus-fx-dots" role="tablist"></div>';

      /* cache elements */
      els.tag = root.querySelector('.nexus-fx-tag');
      els.title = root.querySelector('.nexus-fx-title');
      els.desc = root.querySelector('.nexus-fx-desc');
      els.track = root.querySelector('.nexus-fx-track');
      els.dots = root.querySelector('.nexus-fx-dots');
      els.prev = root.querySelector('.is-prev');
      els.next = root.querySelector('.is-next');
      els.steps = root.querySelectorAll('[data-step]');
      els.cards = [];

      /* header text */
      els.tag.textContent = pick(head.tag);
      els.title.textContent = pick(head.title);
      els.desc.textContent = pick(head.desc);

      /* cards */
      features.forEach(function (f, i) {
        var card = document.createElement('article');
        card.className = 'nexus-fx-card';
        card.setAttribute('role', 'listitem');
        card.setAttribute('tabindex', '0');
        card.dataset.idx = i;

        var bulletsH = (f.bullets || []).map(function (b) {
          return '<li class="nexus-fx-bullet">' + esc(pick(b)) + '</li>';
        }).join('');

        card.innerHTML =
          '<div class="nexus-fx-card-top">' +
            '<span class="nexus-fx-card-icon">' + (ICONS[f.icon] || ICONS.sniff) + '</span>' +
            '<div class="nexus-fx-card-meta">' +
              '<span class="nexus-fx-card-tag">' + esc(pick(f.tag)) + '</span>' +
              '<span class="nexus-fx-card-num">' + String(i + 1).padStart(2, '0') + ' / ' + String(features.length).padStart(2, '0') + '</span>' +
            '</div>' +
          '</div>' +
          '<h3 class="nexus-fx-card-title">' + esc(pick(f.title)) + '</h3>' +
          '<p class="nexus-fx-card-summary">' + esc(pick(f.summary)) + '</p>' +
          '<div class="nexus-fx-card-detail">' +
            '<ul class="nexus-fx-card-bullets">' + bulletsH + '</ul>' +
          '</div>' +
          '<span class="nexus-fx-card-cta">' +
            L('查看详情','Details') +
            '<span class="nexus-fx-card-cta-arrow">→</span>' +
          '</span>';

        els.track.appendChild(card);
        els.cards.push(card);
      });

      /* dots */
      features.forEach(function (f, i) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'nexus-fx-dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', esc(pick(f.title)));
        dot.dataset.idx = i;
        els.dots.appendChild(dot);
      });
    }

    /* --- bind events once --- */

    function bindEvents() {
      /* card click */
      els.track.addEventListener('click', function (e) {
        var card = e.target.closest('.nexus-fx-card');
        if (!card) return;
        var i = Number(card.dataset.idx);
        toggle(i);
      });

      /* card keyboard */
      els.track.addEventListener('keydown', function (e) {
        var card = e.target.closest('.nexus-fx-card');
        if (!card) return;
        var i = Number(card.dataset.idx);
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(i); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(i + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(i - 1); }
        else if (e.key === 'Escape') { e.preventDefault(); collapse(i); card.blur(); }
      });

      /* nav buttons */
      els.prev.addEventListener('click', function () { goTo(state.active > 0 ? state.active - 1 : 0); });
      els.next.addEventListener('click', function () { goTo(state.active < features.length - 1 ? state.active + 1 : features.length - 1); });

      /* dots */
      els.dots.addEventListener('click', function (e) {
        var dot = e.target.closest('.nexus-fx-dot');
        if (!dot) return;
        goTo(Number(dot.dataset.idx));
      });

      /* track scroll -> update dots */
      els.track.addEventListener('scroll', function () {
        window.requestAnimationFrame(updateScrollState);
      }, { passive: true });
    }

    /* --- state mutations --- */

    function toggle(i) {
      if (state.active === i) collapse(i);
      else expand(i);
    }

    function expand(i) {
      if (i < 0 || i >= features.length) return;
      state.active = i;
      syncUI();
      scrollTo(i);
    }

    function collapse(i) {
      if (state.active !== i) return;
      state.active = -1;
      syncUI();
    }

    function goTo(i) {
      var idx = Math.max(0, Math.min(features.length - 1, i));
      state.active = idx;
      syncUI();
      scrollTo(idx);
    }

    function scrollTo(i) {
      var card = els.cards[i];
      if (!card) return;
      var left = card.offsetLeft - (els.track.clientWidth - card.offsetWidth) / 2;
      els.track.scrollTo({ left: Math.max(0, left), behavior: REDUCED ? 'auto' : 'smooth' });
    }

    /* --- sync DOM to state --- */

    function syncUI() {
      var i = state.active;

      /* cards */
      els.cards.forEach(function (c, idx) {
        c.classList.toggle('is-expanded', idx === i);
      });

      /* dots */
      var dots = els.dots.querySelectorAll('.nexus-fx-dot');
      dots.forEach(function (d, idx) {
        d.classList.toggle('is-active', idx === i);
        d.setAttribute('aria-selected', idx === i ? 'true' : 'false');
      });

      /* steps */
      els.steps.forEach(function (s, idx) {
        s.classList.toggle('is-active', idx === i);
        s.classList.toggle('is-done', idx < i);
      });
    }

    function updateScrollState() {
      /* find card closest to center, update dots (but don't change active) */
      var cards = els.cards;
      var center = els.track.scrollLeft + els.track.clientWidth / 2;
      var best = 0, bestDist = Infinity;
      cards.forEach(function (c, idx) {
        var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
        if (d < bestDist) { bestDist = d; best = idx; }
      });
      var dots = els.dots.querySelectorAll('.nexus-fx-dot');
      dots.forEach(function (d, idx) {
        if (idx === best) {
          d.classList.add('is-active');
          d.setAttribute('aria-selected', 'true');
        } else if (idx !== state.active) {
          d.classList.remove('is-active');
          d.setAttribute('aria-selected', 'false');
        }
      });
    }

    /* --- lang change --- */

    function onLang() {
      var head = config.header || {};
      els.tag.textContent = pick(head.tag);
      els.title.textContent = pick(head.title);
      els.desc.textContent = pick(head.desc);

      /* rebuild cards text */
      els.cards.forEach(function (card, i) {
        var f = features[i];
        card.querySelector('.nexus-fx-card-tag').textContent = esc(pick(f.tag));
        card.querySelector('.nexus-fx-card-title').textContent = esc(pick(f.title));
        card.querySelector('.nexus-fx-card-summary').textContent = esc(pick(f.summary));
        card.querySelector('.nexus-fx-card-cta').childNodes[0].textContent = L('查看详情', 'Details') + ' ';
        var bullets = card.querySelectorAll('.nexus-fx-bullet');
        (f.bullets || []).forEach(function (b, j) { if (bullets[j]) bullets[j].textContent = esc(pick(b)); });
      });

      /* steps text */
      els.steps.forEach(function (s, i) {
        s.querySelector('.nexus-fx-step-label').textContent = esc(pick(STEPS[i]));
      });
    }

    /* --- init --- */

    buildDOM();
    bindEvents();
    syncUI();

    langObserver = new MutationObserver(onLang);
    langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    return Object.freeze({
      scrollTo: goTo,
      render: onLang,
      destroy: function () {
        if (langObserver) langObserver.disconnect();
        root.innerHTML = '';
        root.classList.remove('nexus-fx-carousel');
      }
    });
  }

  function boot() {
    var root = document.getElementById('featuresRoot');
    var config = globalThis.NEXUS_FEATURES_CONFIG;
    if (!root || !config) return;
    globalThis.NexusFeaturesInstance = create({ root: root, config: config });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }

  return Object.freeze({ create: create, boot: boot, ICONS: ICONS });
});
