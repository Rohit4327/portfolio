/*
 * "Hello, World": a portfolio film for Rohit R. Patle.
 * One paused GSAP timeline holds the whole film. Every frame is a pure function of
 * time: render(t) seeks the timeline and redraws the canvases. The player, the
 * scrubber and the frame-by-frame MP4 export all go through that one function.
 */
(() => {
  const DUR = 184;
  const W = 1920, H = 1080;
  const POSTER_T = 14.2;

  gsap.config({ force3D: true });
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  const CUES = [];
  const CHAPTERS = [];
  const cue = (t, type, a, b) => CUES.push([t, type, a, b]);

  const hash = (a, b) => {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  function rng(seed) {
    let a = seed | 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const stage = document.getElementById('stage');
  const world = document.getElementById('world');
  const flashEl = document.getElementById('flash');
  const fadeEl = document.getElementById('fade');

  // ---------- DOM helpers ----------
  function h(tag, cls, parent, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    (parent || world).appendChild(e);
    return e;
  }
  const css = (e, o) => (Object.assign(e.style, o), e);
  function splitInto(e, text) {
    e.textContent = '';
    const chars = [];
    const words = text.split(' ');
    words.forEach((word, i) => {
      const w = document.createElement('span');
      w.className = 'w';
      for (const c of word) {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = c;
        w.appendChild(s);
        chars.push(s);
      }
      e.appendChild(w);
      if (i < words.length - 1) e.appendChild(document.createTextNode(' '));
    });
    return chars;
  }
  // Kinetic line: one masked line of split characters.
  function K(parent, text, cls, style) {
    const el = h('div', 'k mask ' + (cls || ''), parent);
    if (style) css(el, style);
    const chars = splitInto(el, text);
    gsap.set(el, { autoAlpha: 0 });
    return { el, chars };
  }
  function scene() {
    const s = h('div', 'scene');
    return s;
  }
  function posIn(e) {
    let x = 0, y = 0, n = e;
    while (n && n !== world) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y, w: e.offsetWidth, h: e.offsetHeight };
  }

  // ---------- timeline helpers ----------
  const show = (e, t) => tl.fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, ease: 'none' }, t);
  const hide = (e, t) => tl.fromTo(e, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.01, ease: 'none', immediateRender: false }, t);
  function rise(k, t, o = {}) {
    const { dur = 1, st = 0.028, y = 112, rot = 0, ease = 'expo.out' } = o;
    show(k.el, t);
    tl.fromTo(k.chars, { yPercent: y, rotate: rot }, { yPercent: 0, rotate: 0, duration: dur, stagger: st, ease }, t);
  }
  function sink(k, t, o = {}) {
    const { dur = 0.5, st = 0.012, y = -112 } = o;
    tl.fromTo(k.chars, { yPercent: 0 }, { yPercent: y, duration: dur, stagger: st, ease: 'expo.in', immediateRender: false }, t);
    hide(k.el, t + dur + st * k.chars.length);
  }
  function pop(k, t, o = {}) {
    show(k.el, t);
    tl.fromTo(k.chars, { scale: 0, opacity: 0, yPercent: 40 }, { scale: 1, opacity: 1, yPercent: 0, duration: 0.7, stagger: o.st ?? 0.03, ease: 'back.out(2.4)' }, t);
  }
  const fadeIn = (e, t, d = 0.6, from = {}, to = {}) =>
    tl.fromTo(e, { autoAlpha: 0, ...from }, { autoAlpha: 1, duration: d, ease: 'power3.out', ...to }, t);
  const fadeOut = (e, t, d = 0.4, to = {}) =>
    tl.fromTo(e, { autoAlpha: 1 }, { autoAlpha: 0, duration: d, ease: 'power2.in', immediateRender: false, ...to }, t);
  function sceneSpan(s, a, b) { show(s, a); hide(s, b); }

  const GLY = '01<>/{}[]=+*#$%&ABCDEFGHJKLMNPQRSTUVWXYZ';
  function scrText(text, p, seed) {
    const n = text.length, r = p * n, f = Math.floor(p * 28);
    let s = '';
    for (let i = 0; i < n; i++) {
      const c = text[i];
      if (c === ' ' || i < r) s += c;
      else s += GLY[Math.floor(hash(i + seed, f) * GLY.length)];
    }
    return s;
  }
  function scramble(e, text, t, dur = 0.6, sfx = true) {
    const o = { p: 0 };
    const seed = Math.floor(t * 100);
    e.textContent = scrText(text, 0, seed);
    tl.fromTo(o, { p: 0 }, { p: 1, duration: dur, ease: 'none', onUpdate: () => { e.textContent = scrText(text, o.p, seed); } }, t);
    if (sfx) cue(t, 'scramble', dur);
  }
  function typeText(e, text, t, cps = 20, sfx = true) {
    const o = { p: 0 };
    const dur = text.length / cps;
    e.textContent = '';
    tl.fromTo(o, { p: 0 }, { p: 1, duration: dur, ease: 'none', onUpdate: () => { e.textContent = text.slice(0, Math.round(o.p * text.length)); } }, t);
    if (sfx) for (let i = 0; i < text.length; i++) if (text[i] !== ' ') cue(t + i / cps, 'key', 0.9);
    return t + dur;
  }
  function counter(e, t, dur, fn) {
    const o = { p: 0 };
    e.textContent = fn(0);
    tl.fromTo(o, { p: 0 }, { p: 1, duration: dur, ease: 'power2.out', onUpdate: () => { e.textContent = fn(o.p); } }, t);
  }
  function blink(e, t, dur, period = 0.5) {
    tl.fromTo(e, { opacity: 1 }, { opacity: 0, duration: period, ease: 'steps(1)', repeat: Math.max(0, Math.floor(dur / period) - 1), yoyo: true }, t);
  }
  function flash(t, v = 0.8, d = 0.7) {
    tl.fromTo(flashEl, { opacity: v }, { opacity: 0, duration: d, ease: 'power2.out', immediateRender: false }, t);
  }

  // Background state, tweened by the timeline and read by the canvas renderer.
  const B = { scan: 0, grid: 0, dots: 0, amber: 0, blue: 0, glyphs: 0, bridge: 0, shake: 0, ax: 560, ay: 420, bx: 1400, by: 640 };
  const bg = (t, props, d = 1.2) => tl.to(B, { ...props, duration: d, ease: 'power2.inOut' }, t);
  const shake = (t, v = 1, d = 0.7) => tl.fromTo(B, { shake: v }, { shake: 0, duration: d, ease: 'power2.out', immediateRender: false }, t);

  // HUD
  const hud = document.getElementById('hud');
  const hudTL = hud.querySelector('.tl'), hudTR = hud.querySelector('.tr'), hudBR = hud.querySelector('.br'), hudBL = hud.querySelector('.bl');
  const chapterEls = [];
  function chapter(t, num, name, meta) {
    CHAPTERS.push({ t, name: num ? `${num} · ${name}` : name });
    if (!num) return;
    const a = h('div', 'abs', hudTL, `<span class="num">${num}</span> <span>${name}</span>`);
    css(a, { position: 'static', whiteSpace: 'nowrap' });
    const b = h('div', 'abs', hudTR, '');
    css(b, { position: 'absolute', right: 0, top: 0, whiteSpace: 'nowrap' });
    gsap.set([a, b], { autoAlpha: 0 });
    chapterEls.push({ t, a, b, meta });
  }
  function finishChapters() {
    chapterEls.forEach((c, i) => {
      const end = i < chapterEls.length - 1 ? chapterEls[i + 1].t - 0.05 : 174.4;
      css(c.a, { position: 'absolute', left: 0, top: 0 });
      show(c.a, c.t); show(c.b, c.t);
      tl.fromTo(c.a, { x: -30 }, { x: 0, duration: 0.8 }, c.t);
      scramble(c.b, c.meta, c.t + 0.1, 0.7, false);
      hide(c.a, end); hide(c.b, end);
    });
  }

  // Figma selection box
  function selection(parent, box, tag, dim) {
    const s = h('div', 'sel', parent, `<i></i><i></i><i></i><i></i>${tag ? `<div class="tag">${tag}</div>` : ''}${dim ? `<div class="dim">${dim}</div>` : ''}`);
    css(s, { left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' });
    gsap.set(s, { autoAlpha: 0 });
    const dimEl = s.querySelector('.dim');
    if (dimEl) gsap.set(dimEl, { xPercent: -50 });
    return s;
  }
  function drawSel(s, t) {
    show(s, t);
    const w = s.offsetWidth || 1000, hh = s.offsetHeight || 400;
    tl.fromTo(s, { clipPath: `inset(-20px ${w + 20}px ${hh + 20}px -20px)` }, { clipPath: 'inset(-20px -20px -20px -20px)', duration: 0.6, ease: 'expo.out' }, t);
    tl.set(s, { clipPath: 'none' }, t + 0.61);
    const kids = s.querySelectorAll('i, .tag, .dim');
    tl.fromTo(kids, { scale: 0 }, { scale: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(3)' }, t + 0.25);
    cue(t, 'tick', 1, 1800);
  }

  // =====================================================================
  // 00 · COLD OPEN (0 to 12)
  // =====================================================================
  function S0() {
    const s = scene();
    sceneSpan(s, 0.001, 12);
    bg(0, { scan: 1, amber: 0.35, ax: 600, ay: 460 }, 1.5);

    const term = h('div', 'term', s);
    const l1 = h('div', '', term, '<span class="p">~ $ </span><span class="cmd"></span><span class="cursor"></span>');
    const l2 = h('div', '', term, '<span class="out"></span><span class="cursor"></span>');
    const cmd = l1.querySelector('.cmd'), c1 = l1.querySelector('.cursor');
    const out = l2.querySelector('.out'), c2 = l2.querySelector('.cursor');
    out.textContent = 'hello, world';
    gsap.set(l2, { autoAlpha: 0 });
    gsap.set(c2, { autoAlpha: 0 });

    blink(c1, 0.2, 0.8);
    const done = typeText(cmd, `node -e 'console.log("hello, world")'`, 1.0, 21);
    tl.set(c1, { opacity: 1 }, 1.0);
    cue(done + 0.35, 'thunk');
    hide(c1, done + 0.35);
    show(l2, done + 0.35);
    show(c2, done + 0.35);
    blink(c2, done + 0.4, 5.2);

    const a = K(s, "Every engineer's first words.", 'sans s72', { position: 'absolute', left: '260px', top: '640px' });
    rise(a, 4.3); sink(a, 6.4);
    const b = K(s, 'Mine needed better', 'sans s72', { position: 'absolute', left: '260px', top: '640px' });
    const b2 = K(s, 'kerning.', 'serif s96 amber', { position: 'absolute', left: '260px', top: '730px' });
    rise(b, 6.9); rise(b2, 7.3); sink(b, 8.9); sink(b2, 9.0);

    // the restyle: mono output becomes set type
    fadeOut(l1, 9.0, 0.4);
    tl.to(l2, { opacity: 0, filter: 'blur(14px)', duration: 0.6, ease: 'power2.in' }, 9.2);

    const big = h('div', 'k serif', s, 'hello, world');
    css(big, { position: 'absolute', left: '50%', top: '50%', fontSize: '250px', lineHeight: '1', whiteSpace: 'nowrap' });
    gsap.set(big, { autoAlpha: 0, xPercent: -50, yPercent: -50 });
    tl.fromTo(big, { autoAlpha: 0, letterSpacing: '0.5em', filter: 'blur(24px)', color: '#ffb547' },
      { autoAlpha: 1, letterSpacing: '-0.02em', filter: 'blur(0px)', color: '#eeeae3', duration: 1.6, ease: 'expo.out' }, 9.3);
    cue(9.2, 'shimmer', 2.4, 1);
    bg(9.2, { scan: 0, dots: 0.5, blue: 0.3, amber: 0.2 }, 1.4);

    S0.late = () => {
      const prev = big.style.letterSpacing;
      big.style.letterSpacing = '-0.02em';
      const bw = big.offsetWidth, bh = big.offsetHeight;
      big.style.letterSpacing = prev;
      const sel = selection(s, { x: W / 2 - bw / 2 - 24, y: H / 2 - bh / 2 - 10, w: bw + 48, h: bh + 20 }, 'Text / hello, world', `${Math.round(bw + 48)} × ${Math.round(bh + 20)}`);
      drawSel(sel, 10.3);
      fadeOut([big, sel], 11.5, 0.45, { scale: 1.06 });
    };
  }

  // =====================================================================
  // TITLE (12 to 22)
  // =====================================================================
  function S1() {
    const s = scene();
    sceneSpan(s, 12, 22);
    cue(12, 'impact', 0.9);
    flash(12, 0.75);
    bg(11.8, { dots: 0.35, amber: 0.28, blue: 0.28, ax: 520, ay: 380, bx: 1420, by: 700 }, 1.2);

    const g = h('div', 'center', s);
    const n1 = K(g, 'Rohit', 'sans-x s340');
    const row = h('div', '', g); css(row, { display: 'flex', alignItems: 'baseline', gap: '28px', marginTop: '-40px' });
    const r = K(row, 'R.', 'serif s260 amber');
    const n2 = K(row, 'Patle', 'sans-x s340');
    rise(n1, 12.05, { st: 0.05, dur: 1.2 });
    rise(n2, 12.3, { st: 0.05, dur: 1.2 });
    rise(r, 12.7, { dur: 1.2, rot: 8 });

    tl.fromTo(g, { scale: 1, y: 0 }, { scale: 0.36, y: -335, duration: 1.2, ease: 'expo.inOut' }, 14.5);

    const roles = h('div', 'center', s); css(roles, { top: '160px', gap: '18px' });
    const a = K(roles, 'Engineer by degree.', 'mono s72 amber');
    const b = K(roles, 'Designer by choice.', 'serif s120');
    const c = K(roles, 'The bridge between the two.', 'sans s96 grad');
    rise(a, 15.3); cue(15.3, 'tick');
    rise(b, 16.7); cue(16.7, 'tick');
    rise(c, 18.1); cue(18.1, 'tick', 1.2, 1500);
    sink(a, 20.6); sink(b, 20.7); sink(c, 20.8);
    fadeOut(g, 20.8, 0.5, { y: -420 });
  }

  // =====================================================================
  // 01 · ORIGIN (22 to 42)
  // =====================================================================
  function S2() {
    const s = scene();
    sceneSpan(s, 22, 42);
    chapter(22, '01', 'Origin', '2015 · Nagpur, India');
    bg(21.6, { grid: 1, glyphs: 1, dots: 0, amber: 0.4, blue: 0.05, ax: 960, ay: 540 }, 1.4);

    const c1 = h('div', 'center', s);
    const a = K(c1, 'Bachelor of Engineering.', 'sans s150');
    rise(a, 22.3); sink(a, 24.6);

    const c2 = h('div', 'center', s);
    const b1 = K(c2, 'Four years of', 'sans s120');
    const b2 = K(c2, 'logic.', 'mono s190 amber');
    rise(b1, 25.0); rise(b2, 25.5); sink(b1, 27.1); sink(b2, 27.15);

    const words = ['Inputs.', 'Outputs.', 'Edge cases.', 'Things that compile.'];
    words.forEach((w, i) => {
      const t = 27.6 + i * 0.5;
      const e = h('div', 'center', s);
      const txt = h('div', 'mono amber ' + (i === 3 ? 's120' : 's150'), e);
      gsap.set(e, { autoAlpha: 0 });
      show(e, t);
      scramble(txt, w, t, 0.35);
      if (i < 3) hide(e, t + 0.5);
      else fadeOut(e, 30.4, 0.3);
    });

    const c3 = h('div', 'center', s);
    const q = K(c3, 'But one thing kept bugging me.', 'serif s120');
    rise(q, 31.0); sink(q, 32.9);

    // the ugly enterprise form
    const win = h('div', 'win', s); css(win, { left: '300px', top: '150px', width: '1320px' });
    h('div', 'bar', win, '<span>Customer_Registration_FINAL.aspx · Internet Explorer</span><span>_ □ ×</span>');
    const body = h('div', 'body', win);
    const labels = ['Cust. ID', 'Legacy Ref No.', 'Sub-Acct Type', 'Region Code (3)', 'Title', 'First Nm', 'Mid Nm', 'Last Nm', 'DOB (MM/DD/YY)', 'Alt DOB', 'Addr Ln 1', 'Addr Ln 2', 'Addr Ln 3', 'Postal / PIN', 'Ph (Home)', 'Ph (Work)', 'Ph (Alt)', 'Fax', 'Email', 'Confirm Email', 'Branch Code', 'Officer ID', 'Remarks 1', 'Remarks 2', 'Ref Code', 'Verify Code', 'Channel', 'Batch No.', 'Nominee', 'Nominee Rel.', 'KYC Doc Type', 'KYC Doc No.'];
    labels.forEach((l, i) => h('div', 'f' + (i % 3 === 0 ? ' req' : ''), body, `<span>${l}</span><b></b>`));
    const btns = h('div', 'btns', body);
    ['Reset', 'Validate', 'Save Draft', 'Print Preview', 'Submit'].forEach((b) => h('div', 'btn95', btns, b));
    const submit = btns.lastChild;
    gsap.set(win, { autoAlpha: 0 });
    fadeIn(win, 33.2, 0.5, { scale: 0.9 }, { scale: 1, ease: 'back.out(1.4)' });
    cue(33.2, 'whoosh', 0.5, 0.6);

    const mouse = h('div', 'mouse', s, '<svg viewBox="0 0 24 24"><path d="M3 2l7 19 2.6-7.4L20 11z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>');
    gsap.set(mouse, { autoAlpha: 0 });

    const err = h('div', 'err', s, '<div class="bar">Error</div><div class="msg"><div class="x">×</div><div>Error 0x80004005: An unexpected error has occurred. Please contact your system administrator.</div></div><div class="ok">OK</div>');
    css(err, { left: '640px', top: '420px' });
    gsap.set(err, { autoAlpha: 0 });

    S2.late = () => {
      const p = posIn(submit);
      const tx = p.x + p.w * 0.6, ty = p.y + p.h * 0.5;
      show(mouse, 33.8);
      tl.fromTo(mouse, { x: 1500, y: 960 }, { x: tx, y: ty, duration: 1.1, ease: 'power3.inOut' }, 33.8);
      tl.fromTo(mouse, { scale: 1 }, { scale: 0.8, duration: 0.08, yoyo: true, repeat: 1, ease: 'none' }, 35.0);
      tl.fromTo(submit, { borderStyle: 'outset' }, { borderStyle: 'inset', duration: 0.01, yoyo: true, repeat: 1, repeatDelay: 0.12 }, 35.0);
      cue(35.0, 'tick', 1.2, 900);
      fadeIn(err, 35.25, 0.12, { scale: 0.95 }, { scale: 1, ease: 'none' });
      cue(35.25, 'error'); cue(35.3, 'glitch', 0.45, 0.8);
      shake(35.25, 1.2, 0.8);
      tl.to([win, err, mouse], { x: '-=420', scale: 0.7, opacity: 0.35, duration: 1, ease: 'expo.inOut' }, 36.5);
      fadeOut([win, err, mouse], 40.6, 0.6);
    };

    const r = h('div', 'abs', s); css(r, { left: '1120px', top: '330px', display: 'flex', flexDirection: 'column', gap: '26px' });
    const r1 = K(r, 'The code worked.', 'mono s72 amber');
    const r2 = K(r, 'Nobody wanted', 'sans s96');
    const r3 = K(r, 'to use it.', 'sans s96 red');
    rise(r1, 37.0); rise(r2, 38.0); rise(r3, 38.4);
    cue(38.4, 'tick', 1, 600);
    sink(r1, 40.5); sink(r2, 40.55); sink(r3, 40.6);
  }

  // =====================================================================
  // 02 · THE PIVOT (42 to 64)
  // =====================================================================
  function S3() {
    const s = scene();
    sceneSpan(s, 42, 64);
    chapter(42, '02', 'The pivot', 'Self-taught');
    bg(41.4, { grid: 0, glyphs: 0, amber: 0.15, blue: 0.12, dots: 0.25 }, 1.6);

    const c0 = h('div', 'center', s);
    const a = K(c0, 'So I changed the question.', 'sans s120');
    rise(a, 42.3); sink(a, 44.3);

    const c1 = h('div', 'center', s);
    const q1wrap = h('div', '', c1); css(q1wrap, { position: 'relative' });
    const q1 = K(q1wrap, 'Does it work?', 'mono s150 amber');
    const strikeLine = h('div', '', q1wrap); css(strikeLine, { position: 'absolute', left: '-20px', right: '-20px', top: '52%', height: '12px', background: 'var(--redline)', transformOrigin: '0 50%' });
    gsap.set(strikeLine, { scaleX: 0 });
    rise(q1, 44.7);
    tl.fromTo(strikeLine, { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: 'expo.inOut' }, 45.9);
    cue(45.9, 'strike');
    tl.to(q1wrap, { y: 90, opacity: 0, filter: 'blur(10px)', duration: 0.6, ease: 'power2.in' }, 46.6);

    const c2 = h('div', 'center', s);
    const q2 = K(c2, 'Does it feel right?', 'serif s190');
    rise(q2, 46.95, { dur: 1.4 });
    cue(46.95, 'shimmer', 1.6, 0.7);
    sink(q2, 49.5);

    const L = h('div', 'abs', s); css(L, { left: '180px', top: '300px', display: 'flex', flexDirection: 'column', gap: '10px' });
    const l1 = K(L, 'No design school.', 'sans s96');
    const l2 = K(L, 'No shortcut.', 'sans s96 mute');
    const sp = h('div', '', L); css(sp, { height: '40px' });
    const l3 = K(L, 'Tutorials. Teardowns.', 'serif s72 amber');
    const l4 = K(L, 'A lot of bad first drafts.', 'serif s72 amber');
    rise(l1, 50.0); rise(l2, 50.9); rise(l3, 52.3); rise(l4, 53.1);
    [l1, l2, l3, l4].forEach((k, i) => sink(k, 56.8 + i * 0.05));

    const layers = h('div', 'layers', s, '<h4>Layers · Pages</h4>');
    gsap.set(layers, { autoAlpha: 0 });
    fadeIn(layers, 51.8, 0.6, { x: 60 }, { x: 0 });
    const files = ['landing_v1.fig', 'landing_v2.fig', 'landing_v2_final.fig', 'landing_v2_final_FINAL.fig', 'landing_v3_actually_final.fig', 'landing_v3_use_THIS_one.fig'];
    files.forEach((f, i) => {
      const row = h('div', 'row', layers, `<span class="ico"></span><span>${f}</span>`);
      const t = 52.4 + i * 0.55;
      fadeIn(row, t, 0.35, { x: -20 }, { x: 0 });
      cue(t, 'tick', 0.9, 1600 + i * 120);
      if (i === files.length - 1) tl.fromTo(row, { backgroundColor: 'rgba(13,153,255,0)' }, { backgroundColor: 'rgba(13,153,255,0.22)', boxShadow: 'inset 3px 0 0 #0d99ff', duration: 0.3 }, t + 0.5);
    });
    fadeOut(layers, 56.8, 0.4, { x: 60 });

    const c3 = h('div', 'center', s);
    const st = K(c3, 'Self-taught.', 'sans s260');
    const lw = K(c3, 'The long way.', 'serif s120 amber');
    rise(st, 57.4, { st: 0.04 }); rise(lw, 58.2);

    const seal = h('div', 'seal', s, `
      <svg viewBox="0 0 300 300">
        <defs><path id="ring" d="M150,150 m-118,0 a118,118 0 1,1 236,0 a118,118 0 1,1 -236,0"/></defs>
        <circle cx="150" cy="150" r="146" fill="#0b0b0e" stroke="#ffb547" stroke-width="3"/>
        <circle cx="150" cy="150" r="96" fill="none" stroke="#ffb547" stroke-width="1.5" stroke-dasharray="3 6"/>
        <g class="ringtext"><text font-family="JetBrains Mono, monospace" font-size="20" fill="#ffb547"><textPath href="#ring" textLength="728" lengthAdjust="spacing">GOOGLE UX DESIGN · CERTIFICATE · </textPath></text></g>
        <text x="150" y="160" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="74" fill="#eeeae3" letter-spacing="-3">UX</text>
        <text x="150" y="196" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="15" fill="#8a8694" letter-spacing="3">CERTIFIED</text>
      </svg>`);
    css(seal, { left: '1480px', top: '640px' });
    gsap.set(seal, { autoAlpha: 0 });
    fadeIn(seal, 59.0, 0.5, { scale: 2.4, rotate: -40 }, { scale: 1, rotate: 0, ease: 'back.out(1.6)' });
    cue(59.1, 'stamp');
    tl.fromTo(seal.querySelector('.ringtext'), { rotate: 0, transformOrigin: '150px 150px' }, { rotate: 70, duration: 4, ease: 'none' }, 59.0);

    sink(st, 61.4); sink(lw, 61.5); fadeOut(seal, 61.5, 0.4, { scale: 0.8 });
    bg(61.6, { amber: 0.5, blue: 0.4, dots: 0.6 }, 2.4);
  }

  // =====================================================================
  // 03 · FREELANCE (64 to 80)
  // =====================================================================
  function S4() {
    const s = scene();
    sceneSpan(s, 64, 80);
    chapter(64, '03', 'Freelance', '2019 · PeoplePerHour');
    flash(64, 0.5);
    bg(64, { amber: 0.22, blue: 0.3, dots: 0.55, ax: 400, ay: 300, bx: 1500, by: 760 }, 1);

    const c = h('div', 'center', s);
    const y = K(c, '2019', 'sans-x s340');
    const p = K(c, 'Freelancing on PeoplePerHour.', 'serif s96 amber');
    rise(y, 64.0, { st: 0.06 }); rise(p, 64.7);
    sink(y, 66.5); sink(p, 66.6);

    const chat = h('div', 'chat', s);
    const msgs = [
      ['them', 'Client', 'Can the logo be bigger?'],
      ['them', 'Client', 'Can we see it on mobile?'],
      ['me', 'Rohit', 'Already responsive. Check your phone.'],
      ['them', 'Client', "Wait, it's already live?"],
      ['me', 'Rohit', 'Designed it. Built it. Shipped it.'],
    ];
    msgs.forEach(([who, name, text], i) => {
      const b = h('div', 'bub ' + who, chat, `<small>${name}</small>${text}`);
      const t = 67.0 + i * 0.95;
      fadeIn(b, t, 0.5, { scale: 0.6, y: 30, transformOrigin: who === 'me' ? '100% 100%' : '0% 100%' }, { scale: 1, y: 0, ease: 'back.out(1.8)' });
      cue(t, 'pop', who === 'me' ? 1.2 : 1);
    });
    fadeOut(chat, 72.2, 0.45, { y: -80 });

    const c2 = h('div', 'center', s); css(c2, { gap: '6px' });
    const d1 = K(c2, 'Design it.', 'serif s190');
    const d2 = K(c2, 'Build it.', 'mono s150 amber');
    const d3 = K(c2, 'Ship it.', 'sans s190 grad');
    rise(d1, 72.8, { st: 0.02 }); rise(d2, 73.3, { st: 0.02 }); rise(d3, 73.8, { st: 0.02 });
    cue(72.8, 'tick', 1.2, 1200); cue(73.3, 'tick', 1.2, 1500); cue(73.8, 'tick', 1.2, 1800);
    sink(d1, 75.5); sink(d2, 75.55); sink(d3, 75.6);

    const c3 = h('div', 'center', s); css(c3, { gap: '10px' });
    const e1 = K(c3, "Clients don't want Figma files.", 'sans s96');
    const e2 = K(c3, 'They want things that work.', 'serif s120 amber');
    rise(e1, 76.0); rise(e2, 77.2);
    sink(e1, 79.3); sink(e2, 79.35);
  }

  // =====================================================================
  // 04 · ATOS (80 to 108)
  // =====================================================================
  function S5() {
    const s = scene();
    sceneSpan(s, 80, 108);
    chapter(80, '04', 'Atos', '2020 · UI/UX Consultant');
    bg(79.8, { amber: 0.25, blue: 0.38, dots: 0.4 }, 1);

    const c = h('div', 'center', s);
    const y = K(c, '2020', 'sans-x s340');
    const p = K(c, 'UI/UX Consultant at Atos.', 'serif s96 amber');
    rise(y, 80.1, { st: 0.06 }); rise(p, 80.7);
    sink(y, 82.9); sink(p, 83.0);

    const c2 = h('div', 'center', s);
    const six = K(c2, 'Six industries.', 'sans s190');
    const sub = K(c2, 'Enterprise scale. Real users.', 'mono s40 mute');
    rise(six, 83.4); rise(sub, 83.8);
    sink(six, 84.6); sink(sub, 84.6);

    const dev = h('div', 'device', s, '<div class="chrome"><i></i><i></i><i></i><span></span></div>');
    const chromeLabel = dev.querySelector('.chrome span');
    css(chromeLabel, { position: 'relative', display: 'inline-block', width: '400px', height: '20px' });
    gsap.set(dev, { autoAlpha: 0 });
    fadeIn(dev, 85.0, 0.7, { x: 80, rotateY: -12, transformPerspective: 1600 }, { x: 0, rotateY: 0 });
    fadeOut(dev, 102.6, 0.4, { x: 80 });

    const items = [
      ['Allstate · Roadside', 'Roadside', 'rescue.', 'allstate / dispatch', visMap],
      ['FedEx · Logistics', 'Parcels', 'across oceans.', 'fedex / tracking', visTrack],
      ['IndianOil · Energy', 'Fuel for', 'a nation.', 'iocl / operations', visTiles],
      ['NMBS/SNCB · Rail', 'Trains across', 'Belgium.', 'nmbs / departures', visBoard],
      ['EcoAct · Climate', 'Carbon,', 'measured.', 'ecoact / emissions', visChart],
      ['Atos · HealthBLE', 'Health, over', 'Bluetooth.', 'healthble / vitals', visPhone],
    ];
    items.forEach(([eb, la, lb, url, vis], i) => {
      const T = 85 + i * 3;
      const col = h('div', 'abs', s); css(col, { left: '150px', top: '350px', display: 'flex', flexDirection: 'column', gap: '8px' });
      const e = h('div', 'eyebrow', col);
      gsap.set(e, { autoAlpha: 0 }); show(e, T); scramble(e, eb, T, 0.5, false);
      const sp = h('div', '', col); css(sp, { height: '14px' });
      const A = K(col, la, 'sans s120');
      const Bk = K(col, lb, 'serif s120 amber');
      rise(A, T + 0.1); rise(Bk, T + 0.3);
      const out = T + 2.55;
      sink(A, out); sink(Bk, out + 0.05); fadeOut(e, out, 0.3);
      cue(T - 0.15, 'whoosh', 0.55, 0.8);

      const lbl = h('span', '', chromeLabel, url); css(lbl, { position: 'absolute', left: 0, top: 0, lineHeight: '20px', whiteSpace: 'nowrap' });
      gsap.set(lbl, { autoAlpha: 0 }); show(lbl, T); hide(lbl, T + 3 - 0.01);

      const v = h('div', 'vis', dev);
      gsap.set(v, { autoAlpha: 0 });
      fadeIn(v, T + 0.05, 0.45, { x: 40 }, { x: 0 });
      if (i < items.length - 1) fadeOut(v, T + 2.75, 0.25, { x: -40 });
      vis(v, T);
    });

    const c3 = h('div', 'center', s); css(c3, { gap: '8px' });
    const d1 = K(c3, 'Different industries.', 'sans s150');
    const d2 = K(c3, 'Same recurring problem.', 'serif s150 amber');
    rise(d1, 103.0); rise(d2, 104.2);
    sink(d1, 106.5); sink(d2, 106.55);
    bg(105.5, { amber: 0.1, blue: 0.12, dots: 0.3 }, 2);
  }

  // montage visuals ---------------------------------------------------------
  const SVGNS = 'http://www.w3.org/2000/svg';
  function svg(parent, w, h2, inner) {
    const e = document.createElementNS(SVGNS, 'svg');
    e.setAttribute('viewBox', `0 0 ${w} ${h2}`);
    e.setAttribute('width', w); e.setAttribute('height', h2);
    e.innerHTML = inner;
    parent.appendChild(e);
    return e;
  }
  function drawPath(p, t, d, ease = 'power2.inOut') {
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len} ${len}`;
    tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: d, ease }, t);
    return len;
  }
  function follow(dot, path, t, d, ease = 'power2.inOut') {
    const len = path.getTotalLength();
    const o = { p: 0 };
    const place = () => { const pt = path.getPointAtLength(o.p * len); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); };
    place();
    tl.fromTo(o, { p: 0 }, { p: 1, duration: d, ease, onUpdate: place }, t);
  }

  function visMap(v, T) {
    const roads = [];
    for (let x = 40; x < 780; x += 130) roads.push(`<line x1="${x}" y1="0" x2="${x + 30}" y2="536" />`);
    for (let y = 30; y < 536; y += 110) roads.push(`<line x1="0" y1="${y}" x2="780" y2="${y - 20}" />`);
    const s = svg(v, 780, 536, `
      <rect width="780" height="536" fill="#121218"/>
      <g stroke="#23232c" stroke-width="16" stroke-linecap="round">${roads.join('')}</g>
      <g stroke="#1b1b22" stroke-width="4">${roads.join('')}</g>
      <path class="route" d="M 70 470 L 76 360 L 330 340 L 322 190 L 590 170 L 585 70 L 700 64" fill="none" stroke="#ffb547" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <circle class="ring" cx="700" cy="64" r="16" fill="none" stroke="#0d99ff" stroke-width="3"/>
      <circle cx="700" cy="64" r="10" fill="#0d99ff"/>
      <circle class="truck" r="13" fill="#ffb547" stroke="#0b0b0e" stroke-width="4"/>`);
    const route = s.querySelector('.route');
    drawPath(route, T + 0.2, 2.2);
    follow(s.querySelector('.truck'), route, T + 0.2, 2.2);
    tl.fromTo(s.querySelector('.ring'), { attr: { r: 12 }, opacity: 1 }, { attr: { r: 40 }, opacity: 0, duration: 0.9, repeat: 2, ease: 'power1.out' }, T + 0.2);
    const eta = h('div', 'chip', v); css(eta, { position: 'absolute', left: '24px', top: '24px', fontSize: '22px' });
    counter(eta, T + 0.2, 2.2, (p) => `ETA ${Math.round(12 - 8 * p)} min`);
    const tow = h('div', 'chip', v, 'Tow truck assigned'); css(tow, { position: 'absolute', left: '24px', bottom: '24px' });
  }

  function visTrack(v, T) {
    const s = svg(v, 780, 536, `
      <path class="arc" d="M 110 250 Q 390 10 670 250" fill="none" stroke="#3a3a46" stroke-width="3" stroke-dasharray="8 10"/>
      <path class="arc2" d="M 110 250 Q 390 10 670 250" fill="none" stroke="#ffb547" stroke-width="4"/>
      <circle cx="110" cy="250" r="9" fill="#eeeae3"/><circle cx="670" cy="250" r="9" fill="#0d99ff"/>
      <text x="110" y="292" text-anchor="middle" fill="#8a8694" font-family="JetBrains Mono, monospace" font-size="20">MEM</text>
      <text x="670" y="292" text-anchor="middle" fill="#8a8694" font-family="JetBrains Mono, monospace" font-size="20">BOM</text>
      <circle class="plane" r="11" fill="#ffb547"/>
      <line x1="90" y1="410" x2="690" y2="410" stroke="#2a2a33" stroke-width="6" stroke-linecap="round"/>
      <line class="fill" x1="90" y1="410" x2="690" y2="410" stroke="#ffb547" stroke-width="6" stroke-linecap="round"/>`);
    const arc2 = s.querySelector('.arc2');
    drawPath(arc2, T + 0.2, 2.3);
    follow(s.querySelector('.plane'), arc2, T + 0.2, 2.3);
    const fill = s.querySelector('.fill');
    tl.fromTo(fill, { attr: { x2: 90 } }, { attr: { x2: 490 }, duration: 2.2, ease: 'power2.inOut' }, T + 0.2);
    ['Picked up', 'In transit', 'Customs', 'Out for delivery'].forEach((l, i) => {
      const x = 90 + i * 200;
      const dot = h('div', '', v); css(dot, { position: 'absolute', left: x - 13 + 'px', top: 410 - 13 + 'px', width: '26px', height: '26px', borderRadius: '50%', background: '#2a2a33', boxShadow: '0 0 0 5px #141419' });
      const lab = h('div', '', v, l); css(lab, { position: 'absolute', left: x + 'px', top: 440 + 'px', transform: 'translateX(-50%)', fontFamily: 'var(--mono)', fontSize: '17px', color: 'var(--mute)', whiteSpace: 'nowrap' });
      if (i < 3) tl.to([dot], { backgroundColor: '#ffb547', duration: 0.2 }, T + 0.2 + i * 0.95);
      if (i < 3) tl.to(lab, { color: '#eeeae3', duration: 0.2 }, T + 0.2 + i * 0.95);
    });
    const id = h('div', 'chip', v, 'Tracking · 7829 4410 3302'); css(id, { position: 'absolute', left: '24px', top: '24px' });
  }

  function visTiles(v, T) {
    const grid = h('div', 'tiles', v);
    const pal = ['#ffb547', '#7dd3fc', '#f9a8d4', '#86efac', '#fde047', '#fca5a5', '#c4b5fd', '#fdba74'];
    const names = ['Depot', 'Tanker', 'Pipeline', 'Retail', 'Stock', 'Dispatch', 'Terminal', 'Refinery'];
    const r = rng(42);
    const tiles = [];
    for (let i = 0; i < 20; i++) {
      const n = names[Math.floor(r() * names.length)];
      const val = r() < 0.5 ? `${Math.floor(60 + r() * 39)}%` : `${Math.floor(100 + r() * 900)}`;
      const t = h('div', 'tile', grid, `<span>${n} ${String(i + 1).padStart(2, '0')}</span><b>${val}</b>`);
      css(t, { background: pal[Math.floor(r() * pal.length)] });
      tiles.push(t);
    }
    tl.fromTo(tiles, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)', stagger: { each: 0.045, from: 'start' } }, T + 0.15);
    for (let i = 0; i < 8; i++) cue(T + 0.15 + i * 0.11, 'tick', 0.45, 1400 + i * 90);
  }

  function visBoard(v, T) {
    const b = h('div', 'board', v, '<div class="hd"><span>Time</span><span>Vertrek · Départ</span><span>Spoor</span><span>Status</span></div>');
    const rows = [
      ['08:14', 'Brussel-Zuid', '3', 'On time'],
      ['08:22', 'Gent-Sint-Pieters', '7', 'On time'],
      ['08:31', 'Antwerpen-Centraal', '12', '+4 min'],
      ['08:40', 'Liège-Guillemins', '5', 'On time'],
      ['08:47', 'Brugge', '9', 'On time'],
      ['08:53', 'Leuven', '2', 'On time'],
    ];
    rows.forEach((r, i) => {
      const row = h('div', 'r', b, `<span>${r[0]}</span><span class="dst"></span><span>${r[2]}</span><span class="st ${r[3] !== 'On time' ? 'late' : ''}"></span>`);
      scramble(row.querySelector('.dst'), r[1], T + 0.2 + i * 0.12, 1.0, false);
      scramble(row.querySelector('.st'), r[3], T + 0.5 + i * 0.12, 0.8, false);
    });
    cue(T + 0.2, 'flap', 1.6);
  }

  function visChart(v, T) {
    const r = rng(7);
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const x = 70 + i * 55;
      const y = 120 + i * 22 + (r() - 0.5) * 50;
      pts.push([x, y]);
    }
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
    const area = line + ` L ${pts[pts.length - 1][0]} 470 L 70 470 Z`;
    const bars = pts.filter((_, i) => i % 2 === 0).map((p, i) => `<rect x="${p[0] - 14}" y="${p[1] + 40}" width="28" height="${470 - p[1] - 40}" rx="4" fill="#23232c"/>`).join('');
    const s = svg(v, 780, 536, `
      <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb547" stop-opacity=".45"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/></linearGradient>
      <clipPath id="clipc"><rect class="cr" x="0" y="0" width="0" height="536"/></clipPath></defs>
      <g stroke="#23232c" stroke-width="1">${[150, 250, 350, 450].map((y) => `<line x1="60" y1="${y}" x2="740" y2="${y}"/>`).join('')}</g>
      ${bars}
      <g clip-path="url(#clipc)"><path d="${area}" fill="url(#ga)"/><path d="${line}" fill="none" stroke="#ffb547" stroke-width="5" stroke-linejoin="round"/></g>
      <line x1="60" y1="380" x2="740" y2="380" stroke="#0d99ff" stroke-width="2" stroke-dasharray="10 8"/>
      <text x="740" y="370" text-anchor="end" fill="#0d99ff" font-family="JetBrains Mono, monospace" font-size="18">target</text>
      <text x="62" y="500" fill="#8a8694" font-family="JetBrains Mono, monospace" font-size="18">tCO₂e</text>`);
    tl.fromTo(s.querySelector('.cr'), { attr: { width: 0 } }, { attr: { width: 780 }, duration: 2.2, ease: 'power2.inOut' }, T + 0.2);
    const chips = h('div', '', v); css(chips, { position: 'absolute', left: '24px', top: '22px', display: 'flex', gap: '10px' });
    ['Scope 1', 'Scope 2', 'Scope 3'].forEach((l, i) => {
      const c = h('div', 'chip', chips, l);
      fadeIn(c, T + 0.3 + i * 0.2, 0.4, { y: -10 }, { y: 0 });
    });
  }

  function visPhone(v, T) {
    const ph = h('div', 'phone', v, '<div class="ph-top"><span>HealthBLE</span><span class="con">● Connected</span></div><div class="bpm"><span class="n">68</span><small>BPM</small></div>');
    css(ph.querySelector('.con'), { color: 'var(--ok)' });
    counter(ph.querySelector('.n'), T + 0.2, 2.2, (p) => String(Math.round(68 + 4 * p)));
    let d = 'M 0 100';
    for (let i = 0; i < 12; i++) {
      const x = i * 90;
      d += ` L ${x + 30} 100 L ${x + 38} 88 L ${x + 44} 100 L ${x + 50} 100 L ${x + 55} 40 L ${x + 61} 140 L ${x + 67} 100 L ${x + 90} 100`;
    }
    const wrap = h('div', '', ph); css(wrap, { position: 'absolute', left: 0, right: 0, top: '230px', height: '200px', overflow: 'hidden' });
    const s = svg(wrap, 1080, 200, `<path d="${d}" fill="none" stroke="#ff5a36" stroke-width="4" stroke-linejoin="round"/>`);
    css(s, { position: 'absolute', left: 0, top: 0 });
    tl.fromTo(s, { x: 0 }, { x: -540, duration: 3, ease: 'none' }, T);
    const ble = h('div', '', v); css(ble, { position: 'absolute', left: '610px', top: '180px', width: '90px', height: '90px' });
    for (let i = 0; i < 3; i++) {
      const ring = h('div', '', ble); css(ring, { position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #0d99ff' });
      tl.fromTo(ring, { scale: 0.3, opacity: 1 }, { scale: 1.6, opacity: 0, duration: 1.2, ease: 'power1.out', repeat: 1 }, T + 0.2 + i * 0.4);
    }
    const core = h('div', '', ble, '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M7 7l10 10-5 5V2l5 5L7 17" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>');
    css(core, { position: 'absolute', left: '22px', top: '22px', width: '46px', height: '46px', borderRadius: '50%', background: '#0d99ff', display: 'grid', placeItems: 'center' });
    const l = h('div', 'chip', v, 'Paired · Pulse oximeter'); css(l, { position: 'absolute', left: '24px', bottom: '24px' });
  }

  // =====================================================================
  // 05 · THE GAP (108 to 128) and 06 · THE BRIDGE (128 to 152)
  // =====================================================================
  const CARD = `<div class="img"></div><div class="body"><div class="tag">ROADSIDE</div><h3>Help is on the way.</h3><p>A tow truck is 12 minutes out. Track it live.</p><div class="cta">Track my tow</div></div>`;
  function panels(s) {
    const L = h('div', 'panel left', s, '<div class="ph"><span class="lbl">● Design</span><span>Card / Primary</span></div><div class="area"></div>');
    const R = h('div', 'panel right', s, '<div class="ph"><span class="lbl">● Production</span><span class="url">localhost:3000</span></div><div class="area"></div>');
    css(L, { left: '110px', width: '780px' });
    css(R, { left: '1030px', width: '780px' });
    const good = h('div', 'card good', L.querySelector('.area'), CARD);
    css(good, { left: '180px', top: '60px', width: '420px' });
    return { L, R, good };
  }

  function S6() {
    const s = scene();
    sceneSpan(s, 108, 128);
    chapter(108, '05', 'The gap', 'Design → Production');
    bg(108, { dots: 0.3, blue: 0.15, amber: 0.1 }, 1);

    const c = h('div', 'center', s); css(c, { gap: '6px' });
    const a = K(c, "Here's the part nobody puts", 'sans s96');
    const b = K(c, 'in a case study.', 'serif s150 amber');
    rise(a, 108.2); rise(b, 108.8);
    sink(a, 110.8); sink(b, 110.85);

    const { L, R, good } = panels(s);
    gsap.set([L, R], { autoAlpha: 0 });
    fadeIn(L, 111.2, 0.6, { x: -60 }, { x: 0 });
    fadeIn(R, 111.35, 0.6, { x: 60 }, { x: 0 });
    const ra = R.querySelector('.area');

    const skel = h('div', '', ra); css(skel, { position: 'absolute', left: '40px', top: '60px', width: '420px', display: 'flex', flexDirection: 'column', gap: '14px' });
    [150, 22, 34, 20, 20].forEach((hh, i) => { const r = h('div', '', skel); css(r, { height: hh + 'px', width: i > 1 ? 60 + (i * 9) + '%' : '100%', background: '#e7e7ea', borderRadius: '6px' }); });
    tl.fromTo(skel, { opacity: 0.5 }, { opacity: 1, duration: 0.4, repeat: 3, yoyo: true, ease: 'sine.inOut' }, 111.4);
    hide(skel, 113.55);

    const fly = h('div', 'flyfile', s, '<i></i><span>handoff_v3_FINAL.zip</span>');
    css(fly, { left: '330px', top: '560px' });
    gsap.set(fly, { autoAlpha: 0 });
    fadeIn(fly, 112.2, 0.3, { scale: 0.6 }, { scale: 1, ease: 'back.out(2)' });
    tl.fromTo(fly, { x: 0, y: 0, rotate: 0 }, { x: 440, y: -170, rotate: 8, duration: 0.5, ease: 'power2.out', immediateRender: false }, 112.6);
    tl.fromTo(fly, { x: 440, y: -170, rotate: 8 }, { x: 900, y: -20, rotate: -4, scale: 0.5, autoAlpha: 0, duration: 0.45, ease: 'power2.in', immediateRender: false }, 113.1);
    cue(112.6, 'whoosh', 0.9, 0.9);

    const bad = h('div', 'card bad', ra, CARD);
    css(bad, { left: '40px', top: '60px', width: '420px' });
    gsap.set(bad, { autoAlpha: 0 });
    show(bad, 113.55);
    tl.fromTo(bad, { x: -14, skewX: 8 }, { x: 0, skewX: 0, duration: 0.5, ease: 'power4.out' }, 113.55);
    tl.fromTo(bad, { filter: 'hue-rotate(90deg) contrast(2)' }, { filter: 'hue-rotate(0deg) contrast(1)', duration: 0.35, ease: 'steps(4)' }, 113.55);
    cue(113.55, 'glitch', 0.5, 1); shake(113.55, 0.6, 0.5);

    const notes = [
      ['Font: Times New Roman?', 150],
      ['padding 24 → 6', 205],
      ['#FF5A36 → #FF0000', 260],
      ['Hover state: missing', 315],
    ];
    const pills = notes.map(([txt, y], i) => {
      const p = h('div', 'redl l', ra, txt); css(p, { left: '505px', top: y + 'px', fontSize: '17px' });
      gsap.set(p, { autoAlpha: 0 });
      fadeIn(p, 114.8 + i * 0.75, 0.35, { x: -20, scale: 0.8 }, { x: 0, scale: 1, ease: 'back.out(2)' });
      cue(114.8 + i * 0.75, 'tick', 1, 700 - i * 60);
      return p;
    });

    tl.to([L, R, ...pills], { opacity: 0.07, scale: 0.94, duration: 0.8, ease: 'power2.inOut' }, 118.8);
    S6.late = () => {
      const sel = selection(L.querySelector('.area'), { x: 178, y: 58, w: good.offsetWidth + 4, h: good.offsetHeight + 4 }, 'Card / Primary', `${good.offsetWidth} × ${good.offsetHeight}`);
      drawSel(sel, 111.8);
    };

    const c2 = h('div', 'center', s); css(c2, { gap: '40px' });
    const d1 = K(c2, 'Designers speak in pixels and feelings.', 'serif s96');
    const d2 = K(c2, 'Developers speak in props and state.', 'mono s72 amber');
    rise(d1, 119.1); rise(d2, 120.6);
    sink(d1, 122.7); sink(d2, 122.75);

    const c3 = h('div', 'center', s); css(c3, { gap: '4px' });
    const e1 = K(c3, 'Everything in between', 'sans s120');
    const e2 = K(c3, 'gets lost in translation.', 'serif s150 amber');
    rise(e1, 123.2); rise(e2, 124.2);
    const r = rng(11);
    [...e1.chars, ...e2.chars].forEach((ch) => {
      tl.to(ch, { y: 700 + r() * 400, x: (r() - 0.5) * 300, rotate: (r() - 0.5) * 160, duration: 1.2 + r() * 0.5, ease: 'power2.in' }, 125.9 + r() * 0.5);
    });
    tl.set([e1.el, e2.el], { overflow: 'visible' }, 125.85);
    cue(125.9, 'fall');
    fadeOut([L, R, ...pills], 125.6, 0.5);
  }

  function S7() {
    const s = scene();
    sceneSpan(s, 128, 152);
    chapter(128, '06', 'The bridge', 'Design ↔ Code');
    bg(127.4, { dots: 0.5, amber: 0.35, blue: 0.4, ax: 480, ay: 560, bx: 1440, by: 520 }, 1.4);

    const c = h('div', 'center', s); css(c, { gap: '0px' });
    const a = K(c, 'I speak', 'sans s150');
    const both = h('div', 'k sans-x grad', c, 'both.');
    css(both, { fontSize: '380px', lineHeight: '0.95' });
    gsap.set(both, { autoAlpha: 0 });
    rise(a, 128.1, { dur: 0.8 });
    cue(128.1, 'key', 0.8); cue(128.25, 'key', 0.6);
    tl.fromTo(both, { autoAlpha: 0, scale: 2.4, filter: 'blur(30px)' }, { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.55, ease: 'expo.out' }, 129.0);
    flash(129.0, 0.6, 0.8); shake(129.0, 1.4, 0.9);
    sink(a, 130.7); fadeOut(both, 130.75, 0.4, { scale: 0.9, y: -60 });

    const { L, R, good } = panels(s);
    gsap.set([L, R], { autoAlpha: 0 });
    fadeIn(L, 131.1, 0.5, { y: 30 }, { y: 0 });
    fadeIn(R, 131.2, 0.5, { y: 30 }, { y: 0 });
    const ra = R.querySelector('.area');
    const bad = h('div', 'card bad', ra, CARD); css(bad, { left: '40px', top: '60px', width: '420px' });
    const fixed = h('div', 'card good', ra, CARD); css(fixed, { left: '180px', top: '60px', width: '420px' });
    tl.fromTo(fixed, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power2.inOut' }, 132.2);
    tl.fromTo(bad, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.9, ease: 'power2.inOut' }, 132.2);
    const scan = h('div', '', ra); css(scan, { position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px', background: '#0d99ff', boxShadow: '0 0 30px 6px rgba(13,153,255,.6)' });
    gsap.set(scan, { autoAlpha: 0 });
    show(scan, 132.2);
    tl.fromTo(scan, { x: 0 }, { x: 780, duration: 0.9, ease: 'power2.inOut' }, 132.2);
    hide(scan, 133.1);
    cue(132.2, 'sweep', 0.9);
    const ok = h('div', 'okpill', ra, '✓ Matches design'); css(ok, { left: '180px', top: '530px' });
    gsap.set(ok, { autoAlpha: 0 });
    fadeIn(ok, 133.1, 0.4, { scale: 0.7 }, { scale: 1, ease: 'back.out(2.5)' });
    cue(133.1, 'success');
    bg(131.3, { bridge: 1 }, 1);
    bg(133.9, { bridge: 0 }, 0.6);
    fadeOut([L, R], 133.9, 0.4, { y: -30 });

    // Figma variables mirrored as code tokens
    const vars = h('div', 'vars', s, '<h4>Local variables · Brand</h4>');
    const vRows = [
      ['space/4', '16', '#'],
      ['color/brand', '#FF5A36', 'sw'],
      ['radius/md', '12', '◜'],
      ['type/title', '34 / 38', 'T'],
    ].map(([n, v, g]) => h('div', 'v', vars, `${g === 'sw' ? '<span class="sw"></span>' : `<span class="glyph">${g}</span>`}<span>${n}</span><span class="val">${v}</span>`));
    const code = h('div', 'code', s, '<h4>tokens.css</h4>');
    const lines = [
      [[':root', 'tok-t'], [' {', '']],
      [['  --space-4', 'tok-v'], [': ', ''], ['16px', 'tok-n'], [';', '']],
      [['  --color-brand', 'tok-v'], [': ', ''], ['#FF5A36', 'tok-p'], [';', '']],
      [['  --radius-md', 'tok-v'], [': ', ''], ['12px', 'tok-n'], [';', '']],
      [['  --type-title', 'tok-v'], [': ', ''], ['700 34px/38px', 'tok-s'], [';', '']],
      [['}', '']],
    ];
    const lineEls = [];
    const lineChars = lines.map((segs, i) => {
      const ln = h('div', 'ln', code, `<em>${i + 1}</em>`);
      lineEls.push(ln);
      const chars = [];
      segs.forEach(([txt, cls]) => {
        const sp = h('span', cls, ln);
        for (const ch of txt) { const c2 = h('span', '', sp); c2.textContent = ch; chars.push(c2); }
      });
      gsap.set(chars, { opacity: 0 });
      return chars;
    });
    gsap.set([vars, code], { autoAlpha: 0 });
    fadeIn(vars, 134.2, 0.5, { x: -40 }, { x: 0 });
    fadeIn(code, 134.35, 0.5, { x: 40 }, { x: 0 });

    const links = document.createElementNS(SVGNS, 'svg');
    links.setAttribute('width', W); links.setAttribute('height', H);
    css(links, { position: 'absolute', left: 0, top: 0, overflow: 'visible' });
    links.innerHTML = '<defs><linearGradient id="lg" gradientUnits="userSpaceOnUse" x1="790" y1="0" x2="1130" y2="0"><stop offset="0" stop-color="#0d99ff"/><stop offset="1" stop-color="#ffb547"/></linearGradient></defs>';
    s.appendChild(links);

    S7.late = () => {
      let t = 134.8;
      const cps = 46;
      lineChars.forEach((chars, i) => {
        tl.fromTo(chars, { opacity: 0 }, { opacity: 1, duration: 0.001, stagger: 1 / cps, ease: 'none', immediateRender: false }, t);
        for (let k = 0; k < chars.length; k += 2) cue(t + k / cps, 'key', 0.6);
        t += chars.length / cps + 0.12;
        if (i >= 1 && i <= 4) {
          const vr = posIn(vRows[i - 1]), cl = posIn(lineEls[i]);
          const x1 = vr.x + vr.w, y1 = vr.y + vr.h / 2, x2 = cl.x, y2 = cl.y + cl.h / 2;
          const p = document.createElementNS(SVGNS, 'path');
          p.setAttribute('d', `M ${x1} ${y1} C ${x1 + 150} ${y1}, ${x2 - 150} ${y2}, ${x2} ${y2}`);
          p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'url(#lg)'); p.setAttribute('stroke-width', '3');
          links.appendChild(p);
          const dot1 = document.createElementNS(SVGNS, 'circle'); dot1.setAttribute('cx', x1); dot1.setAttribute('cy', y1); dot1.setAttribute('r', 6); dot1.setAttribute('fill', '#0d99ff');
          const dot2 = document.createElementNS(SVGNS, 'circle'); dot2.setAttribute('cx', x2); dot2.setAttribute('cy', y2); dot2.setAttribute('r', 6); dot2.setAttribute('fill', '#ffb547');
          links.appendChild(dot1); links.appendChild(dot2);
          gsap.set([dot1, dot2], { autoAlpha: 0 });
          drawPath(p, t - 0.1, 0.45, 'power2.out');
          show(dot1, t - 0.1); show(dot2, t + 0.3);
          tl.fromTo(vRows[i - 1], { backgroundColor: 'rgba(13,153,255,0)' }, { backgroundColor: 'rgba(13,153,255,0.18)', duration: 0.2, yoyo: true, repeat: 1 }, t - 0.1);
          cue(t + 0.3, 'tick', 0.8, 2400);
        }
      });
      fadeOut([vars, code, links], 138.9, 0.4);
    };

    const stmts = [
      ['Design tokens,', 'not guesswork.'],
      ['Components that live', 'in Figma and in React.'],
      ['Prototypes that run', 'on real code.'],
      ['Handoffs with', 'nothing lost.'],
    ];
    stmts.forEach(([x, y], i) => {
      const T = 139.3 + i * 1.6;
      const g = h('div', 'center', s); css(g, { gap: '4px' });
      const A = K(g, x, 'sans s120');
      const Bk = K(g, y, 'serif s120 amber');
      rise(A, T, { st: 0.018, dur: 0.8 }); rise(Bk, T + 0.25, { st: 0.018, dur: 0.8 });
      sink(A, T + 1.3, { dur: 0.3, st: 0.006 }); sink(Bk, T + 1.32, { dur: 0.3, st: 0.006 });
      cue(T, 'tick', 0.7, 1800);
    });

    // skills marquee
    const mqWrap = h('div', '', s); css(mqWrap, { position: 'absolute', inset: '-200px', transform: 'rotate(-8deg)' });
    const design = ['Figma', 'FigJam', 'UX Research', 'Journey Mapping', 'Wireframing', 'Interaction Design', 'Prototyping', 'Empathy Mapping', 'Motion Design', 'Axure RP', 'Adobe XD', 'Illustrator', 'Photoshop', 'Miro', 'InDesign', 'Sketch'];
    const dev = ['JavaScript', 'React', 'Angular', 'jQuery', 'Responsive Frontend', 'HTML', 'CSS', 'Node / NPM', 'VS Code', 'Design Tokens', 'Components', 'Accessibility'];
    const rows = [];
    for (let i = 0; i < 6; i++) {
      const isDesign = i % 2 === 0;
      const list = isDesign ? design : dev;
      const off = (i * 3) % list.length;
      const items = [...list.slice(off), ...list.slice(0, off), ...list];
      const row = h('div', 'mq ' + (isDesign ? 'serif' : 'mono'), mqWrap, items.map((x) => `<span>${x}</span>`).join(''));
      css(row, { top: 260 + i * 130 + 'px', fontSize: isDesign ? '84px' : '62px', color: isDesign ? 'rgba(238,234,227,.34)' : 'rgba(255,181,71,.38)' });
      rows.push(row);
      const dir = i % 2 ? 1 : -1;
      tl.fromTo(row, { x: dir > 0 ? -900 : 0 }, { x: dir > 0 ? 0 : -900, duration: 6.4, ease: 'none' }, 145.6);
    }
    gsap.set(mqWrap, { autoAlpha: 0 });
    fadeIn(mqWrap, 145.6, 0.6);
    const fl = h('div', 'center', s);
    const f1 = K(fl, 'Fluent in both.', 'sans-x s260');
    css(f1.el, { textShadow: '0 10px 60px rgba(11,11,14,.9)' });
    rise(f1, 146.4, { st: 0.035 });
    cue(146.4, 'impact', 0.5);
    sink(f1, 150.9); fadeOut(mqWrap, 151.0, 0.6);
  }

  // =====================================================================
  // 07 · OFF THE CLOCK (152 to 164)
  // =====================================================================
  function S8() {
    const s = scene();
    sceneSpan(s, 152, 164);
    chapter(152, '07', 'Off the clock', 'Player 1');
    bg(151.6, { dots: 0.25, amber: 0.25, blue: 0.25, ax: 700, ay: 300, bx: 1300, by: 800 }, 1);

    const c = h('div', 'center', s);
    const a = K(c, 'Off the clock?', 'serif s190');
    rise(a, 152.2); sink(a, 153.7);

    const g = h('div', 'center', s); css(g, { gap: '28px' });
    const p1 = h('div', 'pix amber s150', g);
    const rd = h('div', 'pix s56', g, 'READY');
    const xp = h('div', 'xp', g);
    const blocks = [];
    for (let i = 0; i < 20; i++) blocks.push(h('i', '', xp));
    const hg = K(g, 'Hardcore gamer.', 'sans s96');
    gsap.set([p1, rd, xp], { autoAlpha: 0 });
    show(p1, 154.0); scramble(p1, 'PLAYER 1', 154.0, 0.5);
    show(rd, 154.5); blink(rd, 154.5, 2.2, 0.25);
    show(xp, 154.4);
    tl.fromTo(blocks, { backgroundColor: '#1d1d24' }, { backgroundColor: '#ffb547', duration: 0.01, stagger: 0.06, ease: 'none' }, 154.5);
    for (let i = 0; i < 20; i += 2) cue(154.5 + i * 0.06, 'tick', 0.4, 900 + i * 60);
    rise(hg, 155.2);
    fadeOut([p1, rd, xp], 156.7, 0.3); sink(hg, 156.7);

    // travel
    const tr = svg(s, W, H, `
      <path class="fp" d="M 330 720 Q 960 120 1590 560" fill="none" stroke="#eeeae3" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round"/>
      <circle class="pl" r="12" fill="#ffb547"/>`);
    css(tr, { position: 'absolute', left: 0, top: 0 });
    gsap.set(tr, { autoAlpha: 0 });
    show(tr, 157.0);
    const fp = tr.querySelector('.fp');
    const flen = fp.getTotalLength();
    tl.fromTo(fp, { strokeDashoffset: 0, opacity: 0 }, { opacity: 1, duration: 0.3 }, 157.0);
    follow(tr.querySelector('.pl'), fp, 157.1, 2.4, 'power1.inOut');
    const places = [['Nagpur', 0], ['Pune', 0.47], ['Next?', 1]];
    places.forEach(([n, u], i) => {
      const pt = fp.getPointAtLength(u * flen);
      const pin = h('div', 'chip', s, n); css(pin, { position: 'absolute', left: pt.x + 'px', top: pt.y + 26 + 'px', fontSize: '22px' });
      gsap.set(pin, { xPercent: -50 });
      if (i === 2) css(pin, { background: 'var(--figma)', boxShadow: 'none', color: '#fff' });
      gsap.set(pin, { autoAlpha: 0 });
      fadeIn(pin, 157.1 + u * 2.3, 0.35, { y: 12 }, { y: 0 });
      cue(157.1 + u * 2.3, 'pop', 0.8);
      fadeOut(pin, 159.7, 0.3);
    });
    const tt = h('div', 'abs', s); css(tt, { left: 0, right: 0, top: '840px', textAlign: 'center' });
    const tk = K(tt, 'Always planning the next trip.', 'sans s96');
    rise(tk, 157.4); sink(tk, 159.7); fadeOut(tr, 159.7, 0.3);

    // friends
    const r = rng(5);
    const cols = ['#ffb547', '#0d99ff', '#eeeae3', '#ff5a36', '#3ddc97'];
    const dots = [];
    for (let i = 0; i < 14; i++) {
      const d = h('div', '', s);
      const ang = (i / 14) * Math.PI * 2;
      css(d, { position: 'absolute', left: '960px', top: '420px', width: '44px', height: '44px', marginLeft: '-22px', marginTop: '-22px', borderRadius: '50%', background: cols[i % cols.length] });
      gsap.set(d, { autoAlpha: 0 });
      const sx = (r() - 0.5) * 1700, sy = (r() - 0.5) * 800;
      const ex = Math.cos(ang) * 190, ey = Math.sin(ang) * 190;
      show(d, 160.0);
      tl.fromTo(d, { x: sx, y: sy, scale: 0.5 }, { x: ex, y: ey, scale: 1, duration: 1.1, ease: 'expo.inOut' }, 160.0 + r() * 0.2);
      dots.push(d);
    }
    cue(160.9, 'success', 0.8);
    const ft = h('div', 'abs', s); css(ft, { left: 0, right: 0, top: '760px', textAlign: 'center' });
    const fk = K(ft, 'Friends over followers.', 'serif s150');
    rise(fk, 160.6);
    sink(fk, 162.8); fadeOut(dots, 162.8, 0.4, { scale: 0 });
  }

  // =====================================================================
  // CLOSE (164 to 184)
  // =====================================================================
  function S9() {
    const s = scene();
    sceneSpan(s, 164, DUR);
    chapter(164, '08', 'The whole job', 'Rohit R. Patle');
    bg(163.6, { dots: 0.3, amber: 0.3, blue: 0.3, ax: 500, ay: 500, bx: 1400, by: 600 }, 1);

    const L = h('div', 'abs', s); css(L, { left: '150px', top: '360px', display: 'flex', flexDirection: 'column', gap: '10px' });
    const a1 = K(L, 'Call me a', 'sans s110');
    const a2 = K(L, 'Swiss Army Knife.', 'serif s120 amber');
    rise(a1, 164.2); rise(a2, 164.6);

    const knife = h('div', 'knife', s); css(knife, { left: '1240px', top: '760px' });
    const handle = h('div', 'handle', knife);
    const hub = h('div', 'hub', knife);
    const bl = [['Research', '#eeeae3', -18], ['UI Design', '#ffb547', -44], ['Prototyping', '#0d99ff', -70], ['Frontend', '#eeeae3', -96], ['Motion', '#ffb547', -122]];
    const blades = bl.map(([n, col, ang]) => {
      const b = h('div', 'blade', knife, `<span>${n}</span>`);
      css(b, { background: col, width: '470px', color: col === '#0d99ff' ? '#fff' : 'var(--ink)' });
      if (ang < -90) css(b.firstChild, { display: 'inline-block', transform: 'rotate(180deg)' });
      b.dataset.ang = ang;
      return b;
    });
    blades.forEach((b) => knife.insertBefore(b, handle));
    gsap.set(knife, { autoAlpha: 0 });
    fadeIn(knife, 164.6, 0.5, { scale: 0.8, x: 60 }, { scale: 1, x: 0 });
    blades.forEach((b, i) => {
      tl.fromTo(b, { rotate: 0 }, { rotate: +b.dataset.ang, duration: 0.7, ease: 'back.out(1.6)' }, 165.0 + i * 0.2);
      cue(165.0 + i * 0.2, 'tick', 1, 900 + i * 180);
    });
    sink(a1, 166.9); sink(a2, 166.95);
    fadeOut(knife, 167.0, 0.4, { scale: 0.9 });

    const c = h('div', 'center', s); css(c, { gap: '0px' });
    const b1 = K(c, 'I call it', 'sans s150');
    const b2 = K(c, 'doing the whole job.', 'serif s190 amber');
    rise(b1, 167.3); rise(b2, 168.1);
    cue(168.1, 'tick', 1, 1400);
    sink(b1, 170.1); sink(b2, 170.15);

    const c2 = h('div', 'center', s); css(c2, { gap: '0px' });
    const m1 = K(c2, 'On a mission to rid the world of', 'sans s96');
    const m2 = K(c2, 'bad experiences.', 'serif s190 red');
    rise(m1, 170.6); rise(m2, 171.6);
    tl.set(m2.el, { overflow: 'visible' }, 173.05);
    const r = rng(3);
    m2.chars.forEach((ch) => {
      tl.to(ch, { y: -60 - r() * 160, x: (r() - 0.5) * 140, opacity: 0, filter: 'blur(14px)', scale: 1.4, duration: 1 + r() * 0.5, ease: 'power2.out' }, 173.1 + r() * 0.4);
    });
    cue(173.1, 'dissolve');
    sink(m1, 173.7);

    // end card
    bg(174.6, { dots: 0.2, amber: 0.35, blue: 0.35, ax: 300, ay: 300, bx: 1700, by: 900 }, 1.2);
    const E = h('div', 'abs', s); css(E, { left: '150px', top: '210px', display: 'flex', flexDirection: 'column', gap: '8px' });
    const hello = h('div', '', E); css(hello, { display: 'flex', alignItems: 'baseline', gap: '26px' });
    const pr = K(hello, '~ $', 'mono s56 mute');
    const hw = K(hello, 'hello, world.', 'serif s96');
    const name = K(E, 'Rohit R. Patle', 'sans s190');
    css(name.el, { marginTop: '6px', alignSelf: 'flex-start' });
    const role = K(E, 'UI/UX Designer · Frontend Developer', 'mono s40 amber');
    css(role.el, { marginTop: '64px' });
    const spacer = h('div', '', E); css(spacer, { height: '24px' });
    const line = K(E, "Let's make something that works and feels right.", 'serif s72');
    const mail = h('div', 'abs mono', s, 'arohitp43@gmail.com'); css(mail, { left: '150px', top: '900px', fontSize: '40px', color: 'var(--bone)' });
    const loc = h('div', 'abs mono mute', s, 'Based in India'); css(loc, { right: '150px', top: '906px', fontSize: '30px', letterSpacing: '.08em', textTransform: 'uppercase' });
    gsap.set([mail, loc], { autoAlpha: 0 });

    rise(pr, 174.9, { dur: 0.6 }); rise(hw, 175.05);
    rise(name, 175.3, { st: 0.035, dur: 1.2 });
    flash(175.0, 0.4, 0.8);
    rise(role, 176.1, { st: 0.012 });
    rise(line, 176.8, { st: 0.012 });
    fadeIn(mail, 177.6, 0.6, { y: 20 }, { y: 0 });
    fadeIn(loc, 177.8, 0.6, { y: 20 }, { y: 0 });
    cue(177.6, 'tick', 0.8, 1600);

    S9.late = () => {
      const p = posIn(name.el);
      const top = 190 * 0.06, bot = 190 * 0.14;
      const box = { x: p.x - 18, y: p.y + top - 4, w: p.w + 36, h: p.h - top - bot + 14 };
      const sel = selection(s, box, null, `${Math.round(box.w)} × ${Math.round(box.h)}`);
      drawSel(sel, 178.4);
    };
    tl.fromTo(fadeEl, { opacity: 0 }, { opacity: 1, duration: 1.5, ease: 'power1.in' }, DUR - 1.6);
  }

  // =====================================================================
  // background canvas
  // =====================================================================
  const bgc = document.getElementById('bg'), g = bgc.getContext('2d');
  const fxc = document.getElementById('fx'), fx = fxc.getContext('2d');
  const grc = document.getElementById('grain'), gr = grc.getContext('2d');
  [bgc, fxc, grc].forEach((c) => { c.width = W; c.height = H; });

  function layer(w, h2, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h2; fn(c.getContext('2d')); return c; }
  const gridL = layer(W + 200, H + 200, (c) => {
    c.strokeStyle = 'rgba(238,234,227,0.05)'; c.lineWidth = 1;
    for (let x = 0; x <= W + 200; x += 40) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H + 200); c.stroke(); }
    for (let y = 0; y <= H + 200; y += 40) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(W + 200, y + 0.5); c.stroke(); }
    c.strokeStyle = 'rgba(255,181,71,0.12)';
    for (let x = 0; x <= W + 200; x += 200) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H + 200); c.stroke(); }
    for (let y = 0; y <= H + 200; y += 200) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(W + 200, y + 0.5); c.stroke(); }
  });
  const dotsL = layer(W + 64, H + 64, (c) => {
    c.fillStyle = 'rgba(238,234,227,0.22)';
    for (let x = 0; x < W + 64; x += 32) for (let y = 0; y < H + 64; y += 32) c.fillRect(x, y, 2, 2);
  });
  const scanL = layer(W, H, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.35)';
    for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 2);
  });
  const vigL = layer(W, H, (c) => {
    const grd = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = grd; c.fillRect(0, 0, W, H);
  });
  const grainT = [];
  {
    const r = rng(99);
    for (let k = 0; k < 6; k++) grainT.push(layer(256, 256, (c) => {
      const id = c.createImageData(256, 256);
      for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      c.putImageData(id, 0, 0);
    }));
  }
  const glyphs = (() => {
    const r = rng(2015);
    const set = ['∫', 'Σ', '∂', 'λ', 'π', '√', '∞', '≠', 'Δ', '0', '1', 'if', '=>', '{ }', 'f(x)', 'AND', 'OR', 'NOT', '&&', '||', 'x²', '∇', 'dy/dx', '⊕'];
    return Array.from({ length: 46 }, () => ({ x: r() * W, s: 22 + r() * 60, v: 18 + r() * 50, o: r() * 1400, a: 0.06 + r() * 0.14, g: set[Math.floor(r() * set.length)] }));
  })();
  const parts = (() => { const r = rng(128); return Array.from({ length: 520 }, () => ({ u: r(), sp: 0.18 + r() * 0.3, off: (r() + r() + r() - 1.5) * 34, sz: 1 + r() * 2.6 })); })();

  function glow(x, y, rad, rgb, a) {
    if (a <= 0.001) return;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(${rgb},${a})`); grd.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
  }

  function drawBG(t) {
    g.globalAlpha = 1;
    g.fillStyle = '#0b0b0e'; g.fillRect(0, 0, W, H);
    glow(B.ax + Math.sin(t * 0.3) * 60, B.ay + Math.cos(t * 0.23) * 40, 950, '255,181,71', 0.2 * B.amber);
    glow(B.bx + Math.cos(t * 0.27) * 60, B.by + Math.sin(t * 0.31) * 40, 950, '13,153,255', 0.2 * B.blue);
    if (B.grid > 0.001) { g.globalAlpha = B.grid; g.drawImage(gridL, -((t * 8) % 200), -((t * 5) % 200)); }
    if (B.dots > 0.001) { g.globalAlpha = B.dots; g.drawImage(dotsL, -((t * 4) % 32), -((t * 2) % 32)); }
    if (B.glyphs > 0.001) {
      g.fillStyle = '#ffb547';
      glyphs.forEach((q) => {
        const y = H + 100 - ((q.o + t * q.v) % 1400);
        g.globalAlpha = q.a * B.glyphs;
        g.font = `${q.s}px "JetBrains Mono", monospace`;
        g.fillText(q.g, q.x, y);
      });
    }
    if (B.scan > 0.001) {
      g.globalAlpha = B.scan; g.drawImage(scanL, 0, 0);
      const by = (t * 220) % (H + 300) - 150;
      const grd = g.createLinearGradient(0, by - 120, 0, by + 120);
      grd.addColorStop(0, 'rgba(255,181,71,0)'); grd.addColorStop(0.5, `rgba(255,181,71,${0.05 * B.scan})`); grd.addColorStop(1, 'rgba(255,181,71,0)');
      g.globalAlpha = 1; g.fillStyle = grd; g.fillRect(0, by - 120, W, 240);
    }
    g.globalAlpha = 1;
    g.drawImage(vigL, 0, 0);

    fx.clearRect(0, 0, W, H);
    if (B.bridge > 0.001) {
      const x0 = 500, y0 = 520, cx = 960, cy = 60, x2 = 1440, y2 = 520;
      fx.globalCompositeOperation = 'lighter';
      parts.forEach((p) => {
        const u = (p.u + t * p.sp) % 1;
        const iu = 1 - u;
        const x = iu * iu * x0 + 2 * iu * u * cx + u * u * x2;
        const y = iu * iu * y0 + 2 * iu * u * cy + u * u * y2;
        const dx = 2 * iu * (cx - x0) + 2 * u * (x2 - cx), dy = 2 * iu * (cy - y0) + 2 * u * (y2 - cy);
        const l = Math.hypot(dx, dy) || 1;
        const px = x + (-dy / l) * p.off, py = y + (dx / l) * p.off;
        const rr = Math.round(255 + (13 - 255) * u), gg = Math.round(181 + (153 - 181) * u), bb = Math.round(71 + (255 - 71) * u);
        const edge = Math.min(1, u * 8, (1 - u) * 8);
        fx.fillStyle = `rgba(${rr},${gg},${bb},${0.75 * B.bridge * edge})`;
        fx.beginPath(); fx.arc(px, py, p.sz, 0, Math.PI * 2); fx.fill();
      });
      fx.globalCompositeOperation = 'source-over';
    }

    const gi = Math.floor(t * 12) % grainT.length;
    gr.clearRect(0, 0, W, H);
    const tile = grainT[gi];
    for (let x = 0; x < W; x += 256) for (let y = 0; y < H; y += 256) gr.drawImage(tile, x, y);
  }

  // =====================================================================
  // build + render
  // =====================================================================
  const fmt = (t) => { const m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.floor((t % 1) * 30); return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`; };
  function render(t) {
    t = Math.max(0, Math.min(DUR, t));
    tl.time(t, false);
    drawBG(t);
    const k = B.shake;
    if (k > 0.001) world.style.transform = `translate(${(Math.sin(t * 91) + Math.sin(t * 57.3)) * 9 * k}px, ${(Math.cos(t * 83) + Math.sin(t * 41.7)) * 7 * k}px)`;
    else world.style.transform = '';
    hudBR.textContent = fmt(t);
  }

  const scenes = [S0, S1, S2, S3, S4, S5, S6, S7, S8, S9];
  chapter(0, '', 'Cold open', '');
  chapter(12, '', 'Title', '');
  function build() {
    scenes.forEach((f) => f());
    // pieces that depend on measured layout (hidden scenes still lay out)
    scenes.forEach((f) => f.late && f.late());
    finishChapters();
    hudBL.textContent = 'Hello, World · Rohit R. Patle';
    tl.fromTo(hud, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 21.8);
    tl.to(hud, { autoAlpha: 0, duration: 0.5 }, 174.4);
    CHAPTERS.sort((a, b) => a.t - b.t);
    CUES.sort((a, b) => a[0] - b[0]);
  }

  async function fontsReady() {
    const faces = ['700 100px "Bricolage Grotesque"', '800 100px "Bricolage Grotesque"', '500 100px "Bricolage Grotesque"', 'italic 400 100px "Instrument Serif"', '400 100px "JetBrains Mono"', '600 100px "JetBrains Mono"'];
    try { await Promise.all(faces.map((f) => document.fonts.load(f))); } catch (e) { /* fall back to system faces */ }
    try { await document.fonts.ready; } catch (e) { /* ignore */ }
  }

  const ready = fontsReady().then(() => { build(); render(0); });
  window.FILM = { DUR, POSTER_T, tl, CUES, CHAPTERS, render, ready, fmt };
})();
