/* ═══════════════════════════════════════════════════════════════════════════
   MUTANT X · DOCUMENTATION RUNTIME
   Nav filtering, dual scroll-spy, code reveal, copy-to-clipboard, and the
   live behaviour behind every interactive specimen.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── 1 · SPRITE ─────────────────────────────────────────────────────────
     Inlined so <use href="#i-x"> resolves without a network hop and the page
     works straight off the filesystem. */
  fetch('assets/icons.svg')
    .then(function (r) { return r.text(); })
    .then(function (svg) {
      var host = document.createElement('div');
      host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      host.setAttribute('aria-hidden', 'true');
      host.innerHTML = svg;
      document.body.insertBefore(host, document.body.firstChild);
      buildIconGrid();
    })
    .catch(function () { /* file:// without a server — specimens still read */ });

  /* ── 2 · NAV FILTER ─────────────────────────────────────────────────── */
  var navInput = $('#d-navfilter');
  if (navInput) {
    navInput.addEventListener('input', function () {
      var q = navInput.value.trim().toLowerCase();
      $$('.d-navgroup').forEach(function (g) {
        var any = false;
        $$('.d-navlink', g).forEach(function (a) {
          var hit = !q || a.textContent.toLowerCase().indexOf(q) > -1;
          a.hidden = !hit;
          if (hit) any = true;
        });
        g.hidden = !any;
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== navInput &&
          ['INPUT', 'TEXTAREA'].indexOf(document.activeElement.tagName) < 0) {
        e.preventDefault(); navInput.focus(); navInput.select();
      }
    });
  }

  /* ── 3 · MOBILE NAV ─────────────────────────────────────────────────── */
  var menuBtn = $('#d-menu');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () { document.body.classList.toggle('d-navopen'); });
    $$('.d-navlink').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('d-navopen'); });
    });
  }

  /* ── 4 · SCROLL SPY ─────────────────────────────────────────────────────
     One observer drives both rails. The left rail tracks top-level sections,
     the right rail tracks every heading inside the section in view. */
  var mainPane = $('#d-main');
  var sections = $$('section.d-sec');
  var subs     = $$('.d-sub[id]');
  var tocBox   = $('#d-toc');

  function buildToc(sec) {
    if (!tocBox) return;
    var out = ['<h4>On this page</h4>'];
    out.push('<a class="d-toclink" href="#' + sec.id + '">' + sec.dataset.title + '</a>');
    $$('.d-sub[id]', sec).forEach(function (s) {
      var h = $('h3', s);
      out.push('<a class="d-toclink d-toclink--sub" href="#' + s.id + '">' + (h ? h.textContent : s.id) + '</a>');
    });
    out.push(
      '<div class="d-tocmeta"><dl>' +
      '<dt>Status</dt><dd>' + (sec.dataset.status || 'Stable') + '</dd>' +
      '<dt>Version</dt><dd>1.0.0</dd>' +
      '<dt>Owner</dt><dd>' + (sec.dataset.owner || 'Design Systems') + '</dd>' +
      '</dl></div>'
    );
    tocBox.innerHTML = out.join('');
  }

  var currentSec = null;
  function spy() {
    var probe = 140, best = null;
    sections.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) best = s;
    });
    if (!best) {
      // above the first / below the last — take the nearest
      var min = Infinity;
      sections.forEach(function (s) {
        var d = Math.abs(s.getBoundingClientRect().top - probe);
        if (d < min) { min = d; best = s; }
      });
    }
    if (best && best !== currentSec) {
      currentSec = best;
      $$('.d-navlink').forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + best.id);
      });
      buildToc(best);
      var act = $('.d-navlink.is-active');
      if (act && act.getBoundingClientRect) {
        var nav = $('#d-nav'), nr = nav.getBoundingClientRect(), ar = act.getBoundingClientRect();
        if (ar.top < nr.top + 60 || ar.bottom > nr.bottom - 40) {
          act.scrollIntoView({ block: 'center' });
        }
      }
    }
    // sub-heading highlight inside the current section
    if (currentSec && tocBox) {
      var activeSub = null;
      $$('.d-sub[id]', currentSec).forEach(function (s) {
        if (s.getBoundingClientRect().top <= probe + 60) activeSub = s.id;
      });
      $$('.d-toclink--sub', tocBox).forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + activeSub);
      });
      var head = $('.d-toclink:not(.d-toclink--sub)', tocBox);
      if (head) head.classList.toggle('is-active', !activeSub);
    }
  }
  if (mainPane) {
    mainPane.addEventListener('scroll', function () {
      if (spy.raf) return;
      spy.raf = requestAnimationFrame(function () { spy.raf = null; spy(); });
    }, { passive: true });
  }

  /* smooth in-pane anchor scroll (the pane scrolls, not the window) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var t = document.getElementById(id);
    if (!t || !mainPane) return;
    e.preventDefault();
    mainPane.scrollTo({ top: t.offsetTop - 24, behavior: 'smooth' });
    history.replaceState(null, '', '#' + id);
  });

  /* ── 5 · SPECIMEN TOOLS ─────────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-spec-code]');
    if (b) {
      var spec = b.closest('.d-spec');
      spec.classList.toggle('is-code');
      b.classList.toggle('is-on');
      b.textContent = spec.classList.contains('is-code') ? 'hide code' : '</> code';
    }
  });

  function flash(el, msg) {
    var old = el.textContent;
    el.textContent = msg;
    el.classList.add('is-on');
    setTimeout(function () { el.textContent = old; el.classList.remove('is-on'); }, 1100);
  }
  function copy(text, el, label) {
    var done = function () { if (el) flash(el, label || 'copied'); toast('Copied ' + text); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (err) {}
      document.body.removeChild(ta);
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy]');
    if (b) copy(b.getAttribute('data-copy'), b.matches('.d-spec__btn') ? b : null);
    var s = e.target.closest && e.target.closest('.d-swatch');
    if (s && s.dataset.token) copy(s.dataset.token);
    var i = e.target.closest && e.target.closest('.d-icon');
    if (i && i.dataset.icon) copy('<svg><use href="#' + i.dataset.icon + '"></use></svg>');
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy-spec]');
    if (!b) return;
    var pre = $('pre', b.closest('.d-spec'));
    if (pre) copy(pre.textContent.trim(), b, 'copied');
  });

  /* ── 6 · TOAST ──────────────────────────────────────────────────────── */
  var toastTimer;
  function toast(msg) {
    var host = $('#d-toasthost');
    if (!host) return;
    host.innerHTML =
      '<div class="mx-toast" role="status"><svg><use href="#i-check"></use></svg>' +
      String(msg).replace(/[<>]/g, '') + '</div>';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { host.innerHTML = ''; }, 2400);
  }
  window.mxToast = toast;

  /* ── 7 · LIVE SPECIMENS ─────────────────────────────────────────────── */

  /* toggle */
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.mx-toggle:not([disabled])');
    if (!t) return;
    var on = t.getAttribute('aria-checked') === 'true';
    t.setAttribute('aria-checked', on ? 'false' : 'true');
    var lbl = $('[data-toggle-state]', t);
    if (lbl) lbl.textContent = on ? (lbl.dataset.off || 'Off') : (lbl.dataset.on || 'On');
  });

  /* radio-style groups: segmented, tabs, state pills, choice pills, cards */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest(
      '.mx-seg button, .mx-tabs button, .mx-tabgroup button, .mx-statepills button');
    if (b) {
      var group = b.parentElement;
      $$('button', group).forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      var panelSet = group.getAttribute('data-panels');
      if (panelSet) {
        var idx = $$('button', group).indexOf(b);
        $$('[data-panel="' + panelSet + '"]').forEach(function (p, i) { p.hidden = i !== idx; });
      }
    }
    var p = e.target.closest && e.target.closest('.mx-pill[aria-pressed], .mx-choicecard[aria-pressed]');
    if (p) {
      if (p.dataset.single !== 'false') {
        $$('[aria-pressed]', p.parentElement).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        p.setAttribute('aria-pressed', 'true');
      } else {
        p.setAttribute('aria-pressed', p.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      }
    }
  });

  /* chip removal */
  document.addEventListener('click', function (e) {
    var x = e.target.closest && e.target.closest('.mx-chip__x');
    if (x) { var c = x.closest('.mx-chip'); c.style.opacity = '0'; setTimeout(function () { c.remove(); }, 140); }
  });

  /* menus, modal, drawer */
  function closeAll() {
    $$('[data-pop]').forEach(function (p) { p.hidden = true; });
  }
  document.addEventListener('click', function (e) {
    var trig = e.target.closest && e.target.closest('[data-pop-for]');
    if (trig) {
      var pop = document.getElementById(trig.dataset.popFor);
      var wasOpen = pop && !pop.hidden;
      closeAll();
      if (pop) pop.hidden = wasOpen;
      return;
    }
    if (!(e.target.closest && e.target.closest('[data-pop]'))) closeAll();
  });

  function openOverlay(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.hidden = false;
    var f = el.querySelector('button, [href], input, textarea, select');
    if (f) f.focus();
    document.addEventListener('keydown', escClose);
  }
  function closeOverlay(el) {
    el.hidden = true;
    document.removeEventListener('keydown', escClose);
  }
  function escClose(e) {
    if (e.key !== 'Escape') return;
    $$('[data-overlay]:not([hidden])').forEach(closeOverlay);
  }
  document.addEventListener('click', function (e) {
    var o = e.target.closest && e.target.closest('[data-open]');
    if (o) { openOverlay(o.dataset.open); return; }
    var c = e.target.closest && e.target.closest('[data-close]');
    if (c) { closeOverlay(c.closest('[data-overlay]')); return; }
    var ov = e.target.closest && e.target.closest('[data-overlay]');
    if (ov && e.target === ov) closeOverlay(ov);
  });

  /* toast demo */
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-toast]');
    if (t) toast(t.dataset.toast);
  });

  /* ── 8 · FIELD VALIDATION DEMO ──────────────────────────────────────────
     The live error state. Employee IDs in this account are 7 digits. */
  var demo = $('#d-fielddemo');
  if (demo) {
    var input = $('input', demo);
    var msg   = $('.mx-field__msg', demo);
    var check = function () {
      var v = input.value.trim();
      if (!v) { demo.classList.remove('is-error', 'is-valid'); msg.textContent = 'Seven digits, from your Mutant profile.'; msg.className = 'mx-field__msg'; return; }
      if (/^\d{7}$/.test(v)) {
        demo.classList.remove('is-error'); demo.classList.add('is-valid');
        msg.textContent = 'Matched — Priya Raghavan, Delivery.'; msg.className = 'mx-field__msg';
      } else {
        demo.classList.add('is-error'); demo.classList.remove('is-valid');
        msg.textContent = 'Wrong Employee ID, Please use correct one.'; msg.className = 'mx-field__msg mx-field__msg--error';
      }
    };
    input.addEventListener('input', check);
    input.addEventListener('blur', check);
  }

  /* character counter */
  $$('[data-counter]').forEach(function (wrap) {
    var ta = $('textarea, input', wrap), out = $('.mx-field__count', wrap);
    var max = parseInt(wrap.dataset.counter, 10);
    var tick = function () {
      out.textContent = ta.value.length + ' / ' + max;
      out.classList.toggle('mx-field__count--over', ta.value.length > max);
      wrap.classList.toggle('is-error', ta.value.length > max);
    };
    ta.addEventListener('input', tick); tick();
  });

  /* ── 9 · ICON GRID ──────────────────────────────────────────────────── */
  function buildIconGrid() {
    var grid = $('#d-icongrid');
    if (!grid) return;
    var names = $$('symbol').map(function (s) { return s.id; }).filter(function (n) { return n.indexOf('i-') === 0; });
    grid.innerHTML = names.map(function (n) {
      return '<button class="d-icon" data-icon="' + n + '" title="Copy &lt;use href=&quot;#' + n + '&quot;&gt;">' +
             '<svg aria-hidden="true"><use href="#' + n + '"></use></svg><span>' + n + '</span></button>';
    }).join('');
    var count = $('#d-iconcount');
    if (count) count.textContent = names.length;
    var filter = $('#d-iconfilter');
    if (filter) filter.addEventListener('input', function () {
      var q = filter.value.trim().toLowerCase();
      $$('.d-icon', grid).forEach(function (b) { b.hidden = !!q && b.dataset.icon.indexOf(q) < 0; });
    });
  }

  /* ── 10 · MOTION SWITCH ─────────────────────────────────────────────── */
  var motionBtn = $('#d-motion');
  if (motionBtn) {
    var modes = ['auto', 'on', 'off'];
    motionBtn.addEventListener('click', function () {
      var cur = document.documentElement.dataset.motion || 'auto';
      var next = modes[(modes.indexOf(cur) + 1) % modes.length];
      document.documentElement.dataset.motion = next;
      motionBtn.querySelector('span').textContent = 'Motion: ' + next;
      toast('Motion set to ' + next);
    });
  }

  /* ── 11 · BOOT ──────────────────────────────────────────────────────── */
  document.documentElement.dataset.motion = 'auto';
  spy();
  if (location.hash) {
    var t = document.getElementById(location.hash.slice(1));
    if (t && mainPane) setTimeout(function () { mainPane.scrollTo({ top: t.offsetTop - 24 }); spy(); }, 60);
  }
})();
