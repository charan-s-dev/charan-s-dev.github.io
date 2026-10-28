/* Charan S · portfolio interactions
   Plain classic script (no modules, no fetch) so the site works when opened
   straight from the file system. Every feature is optional: if an element is
   missing, that feature is skipped. Content is visible without JavaScript. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduceMotion = !!(motionQuery && motionQuery.matches);

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ---------- smooth scrolling for clicks only ---------- */
  // Turned on at the first interaction, so the browser's own jump on load (a #section
  // link, or a refresh restoring the scroll position) is instant rather than a long glide.
  var enableSmooth = function () { root.classList.add('smooth-scroll'); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (type) {
    window.addEventListener(type, enableSmooth, { once: true, passive: true });
  });

  /* ---------- footer year ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- header state, progress bar, back-to-top ---------- */
  var header = $('[data-header]');
  var progress = $('[data-progress]');
  var toTop = $('[data-to-top]');
  var pendingReveals = [];

  // Reveal any pending element that is on screen. Backs up the observer below,
  // which some browsers throttle (background tabs, low-power modes).
  function revealInView() {
    if (!pendingReveals.length) return;
    var vh = window.innerHeight || root.clientHeight;
    pendingReveals = pendingReveals.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.94 && r.bottom > 0) { el.classList.add('is-visible'); return false; }
      return !el.classList.contains('is-visible');
    });
  }

  // Cheap work only (two class toggles and one transform), so it runs on every scroll event.
  function onScroll() {
    var y = window.scrollY || window.pageYOffset || 0;
    var max = root.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    if (toTop) toTop.classList.toggle('is-shown', y > 900);
    revealInView();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------- mobile menu ---------- */
  var toggle = $('[data-nav-toggle]');
  var nav = $('[data-nav]');
  if (toggle && nav) {
    var setMenu = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
    });
    doc.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 920) setMenu(false); });
  }

  var hasIO = 'IntersectionObserver' in window;

  /* ---------- active nav link ---------- */
  if (hasIO && nav) {
    var links = $$('a[href^="#"]', nav);
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var sections = Object.keys(byId).map(function (id) { return doc.getElementById(id); }).filter(Boolean);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
        var link = byId[entry.target.id];
        if (link) { link.classList.add('is-active'); link.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- reveal on scroll ---------- */
  var reveals = $$('.reveal');
  if (hasIO && !reduceMotion && reveals.length) {
    // Stagger siblings that share a parent so grids cascade in.
    var groups = new Map();
    reveals.forEach(function (el) {
      var list = groups.get(el.parentNode) || [];
      list.push(el);
      groups.set(el.parentNode, list);
    });
    groups.forEach(function (list) {
      list.forEach(function (el, i) { el.style.setProperty('--d', Math.min(i * 0.08, 0.4) + 's'); });
    });

    root.classList.add('reveal-ready');
    pendingReveals = reveals.slice();
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { revealer.observe(el); });

    // Safety net: never leave content hidden (print, odd viewports, slow devices).
    window.addEventListener('beforeprint', function () {
      reveals.forEach(function (el) { el.classList.add('is-visible'); });
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }
  onScroll();

  /* ---------- animated counters ---------- */
  var counters = $$('[data-count]');
  if (hasIO && !reduceMotion && counters.length) {
    var animate = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var duration = 1400;
      var start = null;
      // The final value stays in the markup until the first frame runs, so a
      // throttled or skipped animation never leaves a counter stuck at zero.
      var step = function (ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = t < 1 ? (target * eased).toFixed(decimals) : target.toFixed(decimals);
        if (t < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
      // Guarantee the real number lands even if frames stop mid-count.
      window.setTimeout(function () { el.textContent = target.toFixed(decimals); }, duration + 200);
    };
    var counterIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animate(entry.target); counterIO.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { counterIO.observe(el); });
  }

  /* ---------- pointer spotlight on cards ---------- */
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer && !reduceMotion) {
    $$('[data-spotlight]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- toast ---------- */
  var toastEl = $('[data-toast]');
  var toastTimer = null;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-shown');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastEl.classList.remove('is-shown'); }, 2600);
  }

  /* ---------- copy to clipboard (with a fallback for file:// and older browsers) ---------- */
  function legacyCopy(text) {
    var ta = doc.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    doc.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = doc.execCommand('copy'); } catch (err) { ok = false; }
    doc.body.removeChild(ta);
    return ok;
  }
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var settled = false;
      var done = function (ok) {
        if (settled) return;
        settled = true;
        toast(ok ? 'Copied: ' + text : 'Copy blocked. Email: ' + text);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(legacyCopy(text)); });
        // Some browsers leave the promise pending (e.g. unfocused frames); fall back instead of staying silent.
        window.setTimeout(function () { if (!settled) done(legacyCopy(text)); }, 800);
      } else {
        done(legacyCopy(text));
      }
    });
  });
})();
