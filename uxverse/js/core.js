/*
 * Core of "Into the UX-Verse": three clocks, comic building blocks, FX canvas and
 * the frame renderer. Three timelines run side by side:
 *   tl  : camera, type, 3D and effects, sampled every frame (on ones)
 *   ctl : Rohit and other characters, sampled at 12fps (on twos, Spider-Verse style)
 *   ptl : the paper world, sampled at 8fps with boil (stop motion)
 * render(t) is a pure function of time, used by the player and the frame exporter.
 */
window.F = (() => {
  const DUR = 200, W = 1920, H = 1080;
  gsap.config({ force3D: true });
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  const ctl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
  const ptl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const CUES = [], CHAPTERS = [];
  const cue = (t, type, a, b) => CUES.push([t, type, a, b]);
  const q = (t, fps) => Math.floor(t * fps + 1e-6) / fps;

  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const $ = (id) => document.getElementById(id);
  const stage = $('stage'), world = $('world'), paperEl = $('paper'), fxc = $('fx'), hud = $('hud');
  const flashEl = $('flash'), fadeEl = $('fade');
  fxc.width = W; fxc.height = H;
  const fx = fxc.getContext('2d');

  // ---------------------------------------------------------------- DOM helpers
  function h(tag, cls, parent, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; (parent || world).appendChild(e); return e; }
  const css = (e, o) => (Object.assign(e.style, o), e);
  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function scene() { const s = h('div', 'abs', world); css(s, { inset: 0, visibility: 'hidden', opacity: 0 }); return s; }
  function span(s, a, b) { show(s, a); hide(s, b); }

  // ---------------------------------------------------------------- tween helpers (master timeline)
  const show = (e, t, T = tl) => T.fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, ease: 'none' }, t);
  // for something that starts visible, gets hidden, and comes back: no immediate render
  const reshow = (e, t, T = tl) => T.fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, ease: 'none', immediateRender: false }, t);
  const hide = (e, t, T = tl) => T.fromTo(e, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.01, ease: 'none', immediateRender: false }, t);
  const fadeIn = (e, t, d = 0.5, from = {}, to = {}, T = tl) => T.fromTo(e, { autoAlpha: 0, ...from }, { autoAlpha: 1, duration: d, ease: 'power3.out', ...to }, t);
  const fadeOut = (e, t, d = 0.35, to = {}, T = tl) => T.fromTo(e, { autoAlpha: 1 }, { autoAlpha: 0, duration: d, ease: 'power2.in', immediateRender: false, ...to }, t);
  function splitInto(e, text) {
    e.textContent = '';
    const chars = [];
    text.split(' ').forEach((word, i, arr) => {
      const w = document.createElement('span'); w.style.display = 'inline-block'; w.style.whiteSpace = 'nowrap';
      for (const c of word) { const s = document.createElement('span'); s.style.display = 'inline-block'; s.textContent = c; w.appendChild(s); chars.push(s); }
      e.appendChild(w); if (i < arr.length - 1) e.appendChild(document.createTextNode(' '));
    });
    return chars;
  }
  function K(parent, text, cls, style) {
    const el = h('div', cls || '', parent); css(el, { position: 'absolute', whiteSpace: 'nowrap', overflow: 'hidden', padding: '.08em .1em .14em', margin: '-.08em -.1em -.14em', ...(style || {}) });
    const chars = splitInto(el, text);
    gsap.set(el, { autoAlpha: 0 });
    return { el, chars };
  }
  function rise(k, t, o = {}) {
    const { dur = 0.9, st = 0.026, y = 115 } = o;
    show(k.el, t);
    tl.fromTo(k.chars, { yPercent: y }, { yPercent: 0, duration: dur, stagger: st, ease: 'expo.out' }, t);
  }
  function sink(k, t, o = {}) {
    const { dur = 0.45, st = 0.01 } = o;
    tl.fromTo(k.chars, { yPercent: 0 }, { yPercent: -115, duration: dur, stagger: st, ease: 'expo.in', immediateRender: false }, t);
    hide(k.el, t + dur + st * k.chars.length);
  }
  function scrText(text, p, seed) {
    const G = '01<>/{}[]=+*#%ABCDEFGHJKLMNPQRSTUVWXYZ', n = text.length, r = p * n, f = Math.floor(p * 26);
    let s = ''; for (let i = 0; i < n; i++) { const c = text[i]; s += c === ' ' || i < r ? c : G[Math.floor(hash(i + seed, f) * G.length)]; }
    return s;
  }
  function scramble(e, text, t, dur = 0.6, sfx = true) {
    const o = { p: 0 }, seed = Math.floor(t * 100);
    e.textContent = scrText(text, 0, seed);
    tl.fromTo(o, { p: 0 }, { p: 1, duration: dur, ease: 'none', onUpdate: () => { e.textContent = scrText(text, o.p, seed); } }, t);
    if (sfx) cue(t, 'scramble', dur);
  }
  function typeText(e, text, t, cps = 18, sfx = true) {
    const o = { p: 0 }, dur = text.length / cps;
    e.textContent = '';
    tl.fromTo(o, { p: 0 }, { p: 1, duration: dur, ease: 'none', onUpdate: () => { e.textContent = text.slice(0, Math.round(o.p * text.length)); } }, t);
    if (sfx) for (let i = 0; i < text.length; i++) if (text[i] !== ' ') cue(t + i / cps, 'key', 0.8);
    return t + dur;
  }
  function counter(e, t, dur, fn, ease = 'power2.out') {
    const o = { p: 0 }; e.textContent = fn(0);
    tl.fromTo(o, { p: 0 }, { p: 1, duration: dur, ease, onUpdate: () => { e.textContent = fn(o.p); } }, t);
  }
  function blink(e, t, dur, period = 0.5, T = tl) { T.fromTo(e, { opacity: 1 }, { opacity: 0, duration: period, ease: 'steps(1)', repeat: Math.max(0, Math.floor(dur / period) - 1), yoyo: true }, t); }

  // ---------------------------------------------------------------- comic helpers
  function cap(parent, html, o = {}) {
    const e = h('div', 'cap ' + (o.cls || ''), parent, html);
    css(e, { left: (o.x ?? 120) + 'px', top: (o.y ?? 150) + 'px', ...(o.w ? { width: o.w + 'px', maxWidth: 'none' } : {}), ...(o.style || {}) });
    gsap.set(e, { autoAlpha: 0, rotate: o.rot ?? -1.2, transformOrigin: '0% 0%' });
    e._rot = o.rot ?? -1.2;
    return e;
  }
  function popIn(e, t, o = {}) {
    show(e, t);
    tl.fromTo(e, { scale: o.from ?? 0.55, rotate: (e._rot ?? 0) - 7 }, { scale: 1, rotate: e._rot ?? 0, duration: o.d ?? 0.55, ease: 'back.out(2.4)' }, t);
    if (o.sfx !== false) cue(t, o.sfx || 'pop', o.v ?? 0.8);
  }
  function popOut(e, t, d = 0.25) { tl.fromTo(e, { scale: 1, autoAlpha: 1 }, { scale: 0.85, autoAlpha: 0, duration: d, ease: 'back.in(2)', immediateRender: false }, t); }
  function bub(parent, text, o = {}) {
    const e = h('div', 'bub ' + (o.cls || ''), parent, text);
    css(e, { left: (o.x ?? 0) + 'px', top: (o.y ?? 0) + 'px' });
    const tail = svgEl('svg', { class: 'tail', viewBox: '0 0 70 60' }, e);
    const side = o.tail || 'bl';
    const pos = { bl: { left: '40px', bottom: '-50px' }, br: { right: '40px', bottom: '-50px' }, tl: { left: '40px', top: '-50px' }, tr: { right: '40px', top: '-50px' } }[side];
    Object.assign(tail.style, pos);
    const d = { bl: 'M 8 0 L 12 52 L 44 0', br: 'M 26 0 L 58 52 L 62 0', tl: 'M 8 60 L 12 8 L 44 60', tr: 'M 26 60 L 58 8 L 62 60' }[side];
    svgEl('path', { d, fill: '#fbf7ee', stroke: '#0b0a12', 'stroke-width': 5, 'stroke-linejoin': 'round' }, tail);
    svgEl('rect', { x: side.includes('l') ? 10 : 28, y: side[0] === 'b' ? -6 : 58, width: 32, height: 8, fill: '#fbf7ee' }, tail);
    gsap.set(e, { autoAlpha: 0, transformOrigin: side === 'bl' ? '15% 100%' : side === 'br' ? '85% 100%' : side === 'tl' ? '15% 0%' : '85% 0%' });
    e._rot = o.rot ?? 0;
    return e;
  }
  function sfx(parent, text, o = {}) {
    const e = h('div', 'sfx ' + (o.cls || ''), parent, text);
    css(e, { left: (o.x ?? 0) + 'px', top: (o.y ?? 0) + 'px' });
    gsap.set(e, { autoAlpha: 0, rotate: o.rot ?? -8, transformOrigin: '50% 50%' });
    e._rot = o.rot ?? -8;
    return e;
  }
  function slam(e, t, hold = 1.1, o = {}) {
    show(e, t);
    tl.fromTo(e, { scale: 2.6, rotate: e._rot - 14 }, { scale: 1, rotate: e._rot, duration: 0.35, ease: 'back.out(2.8)' }, t);
    tl.fromTo(e, { scale: 1 }, { scale: 1.06, duration: hold, ease: 'none', immediateRender: false }, t + 0.35);
    tl.fromTo(e, { autoAlpha: 1, scale: 1.06 }, { autoAlpha: 0, scale: 1.25, duration: 0.2, ease: 'power2.in', immediateRender: false }, t + 0.35 + hold);
    if (o.sfx !== false) cue(t, o.sfx || 'hit', o.v ?? 1);
    if (o.shake !== false) shake(t, o.shake ?? 0.6, 0.4);
  }
  function logo(parent, text, o = {}) {
    const e = h('div', 'logo', parent);
    css(e, { left: (o.x ?? 0) + 'px', top: (o.y ?? 0) + 'px', fontSize: (o.size ?? 200) + 'px' });
    if (o.center) css(e, { left: '0px', width: '1920px', textAlign: 'center' });
    ['c', 'm', 'k'].forEach((c) => { const l = h('span', 'ly ' + c, e, text); if (o.center) l.style.width = '100%'; if (c === 'k') l.style.webkitTextStrokeWidth = Math.round((o.size ?? 200) / 20) + 'px'; });
    h('span', 'y' + (o.white ? ' w' : ''), e, text);
    gsap.set(e, { autoAlpha: 0, transformOrigin: '50% 50%', rotate: o.rot ?? -3 });
    e._rot = o.rot ?? -3;
    return e;
  }
  function hudbox(parent, html, o = {}) {
    const e = h('div', 'hudbox', parent, html);
    css(e, { left: (o.x ?? 0) + 'px', top: (o.y ?? 0) + 'px' });
    gsap.set(e, { autoAlpha: 0 });
    return e;
  }
  function hudIn(e, t, text) {
    show(e, t);
    tl.fromTo(e, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'power3.out' }, t);
    cue(t, 'scramble', 0.5);
  }
  function panel(parent, o = {}) {
    const e = h('div', 'panel ' + (o.cls || ''), parent);
    css(e, { left: o.x + 'px', top: o.y + 'px', width: o.w + 'px', height: o.h + 'px' });
    const body = h('div', 'abs', e); css(body, { inset: 0 });
    if (o.title) h('div', 'ptitle', e, o.title);
    if (o.cap) h('div', 'pcap', e, o.cap);
    gsap.set(e, { autoAlpha: 0, rotate: o.rot ?? 0, transformOrigin: '50% 50%' });
    e._rot = o.rot ?? 0;
    return { el: e, body };
  }

  // ---------------------------------------------------------------- global effects
  const FXS = { speed: 0, sx: 960, sy: 540, inner: 380, speedInk: 0, shred: 0, shredX: 960, shredY: 540, constel: 0, shake: 0 };
  function shake(t, v = 1, d = 0.6) { tl.fromTo(FXS, { shake: v }, { shake: 0, duration: d, ease: 'power2.out', immediateRender: false }, t); }
  function flash(t, v = 0.8, d = 0.6) { tl.fromTo(flashEl, { opacity: v }, { opacity: 0, duration: d, ease: 'power2.out', immediateRender: false }, t); }
  function spike(t, v = 6, d = 0.8) { tl.fromTo(Space.S, { misreg: v }, { misreg: 1, duration: d, ease: 'power2.out', immediateRender: false }, t); }
  const barsT = $('bars').querySelector('.top'), barsB = $('bars').querySelector('.bot');
  function bars(t, hgt, d = 0.8) { tl.to([barsT, barsB], { height: hgt, duration: d, ease: 'power3.inOut' }, t); }
  function shot(t, name) { tl.set(Space.S, { shot: name }, t); }
  const sp = (t, props, d = 1, ease = 'power2.inOut') => tl.to(Space.S, { ...props, duration: d, ease }, t);

  // wipe of offset-print color bars
  function cmyWipe(t, d = 0.7) {
    const g = h('div', 'abs', world); css(g, { inset: 0, zIndex: 50, pointerEvents: 'none' });
    ['#00c2ff', '#ff2e88', '#ffd23f', '#0b0a12'].forEach((c, i) => {
      const b = h('div', 'abs', g); css(b, { left: '-10%', width: '120%', top: 0, bottom: 0, background: c, transform: 'skewX(-12deg)' });
      tl.fromTo(b, { xPercent: -110 }, { xPercent: 110, duration: d, ease: 'power3.inOut' }, t + i * 0.06);
    });
    gsap.set(g, { autoAlpha: 0 }); show(g, t); hide(g, t + d + 0.3);
    cue(t, 'whoosh', d + 0.2, 0.9);
  }

  // chapters + HUD
  const hudTL = hud.querySelector('.tl'), hudTR = hud.querySelector('.tr'), hudBR = hud.querySelector('.br'), hudBL = hud.querySelector('.bl');
  const chapterEls = [];
  function chapter(t, num, name, meta) {
    CHAPTERS.push({ t, name: num ? `${num} · ${name}` : name });
    if (!num) return;
    const a = h('div', 'abs', hudTL, `<span class="num">${num}</span> ${name}`); css(a, { left: 0, top: 0, whiteSpace: 'nowrap' });
    const b = h('div', 'abs', hudTR, ''); css(b, { right: 0, top: 0, whiteSpace: 'nowrap' });
    gsap.set([a, b], { autoAlpha: 0 });
    chapterEls.push({ t, a, b, meta });
  }
  function finishChapters(end) {
    chapterEls.sort((x, y) => x.t - y.t);
    chapterEls.forEach((c, i) => {
      const e = i < chapterEls.length - 1 ? chapterEls[i + 1].t - 0.05 : end;
      show(c.a, c.t); show(c.b, c.t);
      tl.fromTo(c.a, { x: -30 }, { x: 0, duration: 0.7 }, c.t);
      scramble(c.b, c.meta, c.t + 0.1, 0.7, false);
      hide(c.a, e); hide(c.b, e);
    });
  }

  // ---------------------------------------------------------------- characters, hooks, paper boil
  const rigs = [];
  function rohit(parent, opts = {}) {
    const r = Rohit.make(parent, opts);
    r.state.o = 0;
    rigs.push({ r, fps: opts.paper ? 8 : 12 });
    return r;
  }
  const T = (rig) => (rigs.find((x) => x.r === rig).fps === 8 ? ptl : ctl);
  function place(rig, t, props, d = 0.001, ease = 'power2.inOut') { T(rig).to(rig.state, { ...props, duration: d, ease }, t); }
  function poseTo(rig, t, name, d = 0.35, extra = {}) { T(rig).to(rig.state, { ...Rohit.POSES[name], ...extra, duration: d, ease: 'power2.inOut' }, t); }
  function appear(rig, t, props) { T(rig).set(rig.state, { o: 1, ...props }, t); }
  function vanish(rig, t) { T(rig).set(rig.state, { o: 0 }, t); }
  function wave(rig, t, n = 4) { T(rig).fromTo(rig.state, { bEl: -10 }, { bEl: -55, duration: 0.25, yoyo: true, repeat: n * 2 - 1, ease: 'sine.inOut', immediateRender: false }, t); }
  function talk(rig, t, dur) { const n = Math.max(1, Math.round(dur / 0.16)); T(rig).fromTo(rig.state, { mouth: 0 }, { mouth: 4, duration: 0.08, ease: 'steps(1)', repeat: n, yoyo: true, immediateRender: false }, t); T(rig).set(rig.state, { mouth: 1 }, t + dur); }

  const hooks = [];
  const boils = [];
  function boil(g, i) { boils.push({ g, i }); }

  // ---------------------------------------------------------------- fx canvas
  const shredData = (() => { const r = rng(49); return Array.from({ length: 70 }, () => ({ a: r() * 6.283, v: 500 + r() * 1400, s: 12 + r() * 40, rot: (r() - 0.5) * 12, c: r() < 0.6 ? '#efe3c8' : r() < 0.8 ? '#e3d2ae' : '#ffd23f', k: r() })); })();
  let constelPts = null;
  function setConstellation(pts) { constelPts = pts; }
  function drawFx(t) {
    fx.clearRect(0, 0, W, H);
    if (FXS.speed > 0.01) {
      const f = Math.floor(t * 12), n = 110;
      fx.save();
      for (let i = 0; i < n; i++) {
        const a = hash(i, f) * 6.283, w = (2 + hash(i + 7, f) * 11) * FXS.speed;
        const r0 = FXS.inner + hash(i + 3, f) * 360, r1 = 1500;
        const x0 = FXS.sx + Math.cos(a) * r0, y0 = FXS.sy + Math.sin(a) * r0;
        const nx = -Math.sin(a), ny = Math.cos(a);
        fx.beginPath();
        fx.moveTo(x0, y0);
        fx.lineTo(FXS.sx + Math.cos(a) * r1 + nx * w, FXS.sy + Math.sin(a) * r1 + ny * w);
        fx.lineTo(FXS.sx + Math.cos(a) * r1 - nx * w, FXS.sy + Math.sin(a) * r1 - ny * w);
        fx.closePath();
        fx.fillStyle = FXS.speedInk > 0.5 ? `rgba(11,10,18,${0.85 * Math.min(1, FXS.speed)})` : `rgba(251,247,238,${0.55 * Math.min(1, FXS.speed)})`;
        fx.fill();
      }
      fx.restore();
    }
    if (FXS.shred > 0.001) {
      const age = FXS.shred;
      shredData.forEach((p, i) => {
        const d = p.v * age, x = FXS.shredX + Math.cos(p.a) * d, y = FXS.shredY + Math.sin(p.a) * d + 300 * age * age;
        fx.save(); fx.translate(x, y); fx.rotate(p.rot * age + p.k * 6);
        fx.fillStyle = p.c; fx.strokeStyle = 'rgba(60,40,20,.35)'; fx.lineWidth = 2;
        fx.beginPath(); fx.moveTo(-p.s, -p.s * 0.3); fx.lineTo(p.s * 0.8, -p.s * 0.5); fx.lineTo(p.s, p.s * 0.4); fx.lineTo(-p.s * 0.6, p.s * 0.5); fx.closePath(); fx.fill(); fx.stroke();
        fx.restore();
      });
    }
    if (constelPts && FXS.constel > 0.001) {
      const total = constelPts.length - 1, prog = FXS.constel * total;
      fx.save();
      fx.lineWidth = 4; fx.strokeStyle = 'rgba(0,194,255,.9)'; fx.lineCap = 'round';
      fx.shadowColor = 'rgba(0,194,255,.9)'; fx.shadowBlur = 16;
      for (let i = 0; i < total; i++) {
        const a = constelPts[i], b = constelPts[i + 1];
        if (!a || !b || a.brk) continue;
        const k = Math.max(0, Math.min(1, prog - i));
        if (k <= 0) break;
        fx.beginPath(); fx.moveTo(a.x, a.y); fx.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k); fx.stroke();
      }
      fx.shadowBlur = 24; fx.shadowColor = '#fff';
      constelPts.forEach((p, i) => { if (!p || i > prog + 1) return; fx.fillStyle = '#fff'; fx.beginPath(); fx.arc(p.x, p.y, 6 + 2 * Math.sin(t * 5 + i), 0, 7); fx.fill(); });
      fx.restore();
    }
  }

  // ---------------------------------------------------------------- render
  const fmt = (t) => { const m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.floor((t % 1) * 30); return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`; };
  function render(t) {
    t = Math.max(0, Math.min(DUR, t));
    tl.time(t, false);
    ctl.time(q(t, 12), false);
    ptl.time(q(t, 8), false);
    Space.render(t);
    for (const fn of hooks) fn(t);
    for (const { r, fps } of rigs) r.apply(q(t, fps));
    if (paperEl.style.visibility !== 'hidden' && paperEl.style.opacity !== '0') {
      const f = Math.floor(t * 8);
      for (const b of boils) {
        const r = (hash(b.i, f) - 0.5) * 1.3, dx = (hash(b.i + 91, f) - 0.5) * 2.6, dy = (hash(b.i + 57, f) - 0.5) * 2.6;
        b.g.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${r.toFixed(2)} ${b.cx} ${b.cy})`);
      }
    }
    drawFx(t);
    const k = FXS.shake;
    const tr = k > 0.001 ? `${((Math.sin(t * 91) + Math.sin(t * 57.3)) * 11 * k).toFixed(1)}px ${((Math.cos(t * 83) + Math.sin(t * 41.7)) * 8 * k).toFixed(1)}px` : '';
    // shake uses the independent CSS translate property so it never fights GSAP's transform
    world.style.translate = tr; $('gl').style.translate = tr; paperEl.style.translate = tr;
    hudBR.textContent = fmt(t);
  }

  return {
    DUR, W, H, tl, ctl, ptl, CUES, CHAPTERS, cue, q, hash, rng, $, stage, world, paperEl, hud, fadeEl, flashEl,
    h, css, svgEl, scene, span, show, reshow, hide, fadeIn, fadeOut, K, rise, sink, scramble, typeText, counter, blink,
    cap, popIn, popOut, bub, sfx, slam, logo, hudbox, hudIn, panel, FXS, shake, flash, spike, bars, shot, sp, cmyWipe,
    chapter, finishChapters, hudTL, hudTR, hudBR, hudBL, rohit, place, poseTo, appear, vanish, wave, talk, hooks, boil, boils,
    setConstellation, render, fmt,
  };
})();
