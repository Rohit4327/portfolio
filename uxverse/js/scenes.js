/*
 * Every chapter of "Into the UX-Verse" except the paper one (paper.js).
 * Times are absolute seconds on the master clock; see SCRIPT.md for the beat sheet.
 */
window.Scenes = (() => {
  const S = () => F; // late binding
  let f;

  // spiky comic burst behind titles and stats
  function burst(parent, o) {
    const { svgEl, css } = f;
    const n = o.points || 16, w = o.w, hh = o.h, cx = w / 2, cy = hh / 2;
    const r = f.rng(o.seed || 3);
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2, k = i % 2 ? 0.72 + r() * 0.08 : 0.96 + r() * 0.04;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * cx * k).toFixed(1) + ' ' + (cy + Math.sin(a) * cy * k).toFixed(1) + ' ';
    }
    const s = svgEl('svg', { width: w, height: hh, viewBox: `0 0 ${w} ${hh}` }, parent);
    css(s, { position: 'absolute', left: o.x + 'px', top: o.y + 'px', overflow: 'visible' });
    const id = 'bht' + (o.seed || 3) + Math.round(o.x);
    s.innerHTML = `<defs><pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="6" cy="6" r="2.6" fill="rgba(11,10,18,.22)"/></pattern></defs>
      <path d="${d}Z" fill="${o.fill}" stroke="#0b0a12" stroke-width="${o.stroke ?? 8}" stroke-linejoin="round"/>
      <path d="${d}Z" fill="url(#${id})"/>`;
    gsap.set(s, { autoAlpha: 0, transformOrigin: '50% 50%' });
    return s;
  }

  // =====================================================================
  // 00 · SIGNAL (0 to 10)
  // =====================================================================
  function S0() {
    const { tl, cue, h, css, scene, span, show, hide, fadeOut, typeText, blink, cap, popIn, popOut, FXS, shake, flash, spike, bars, shot, sp, chapter } = f;
    chapter(0, '', 'Signal', '');
    const s = scene(); span(s, 0.001, 10.1);
    shot(0.001, 'warp');
    tl.set(Space.S, { misreg: 1, halftone: 1, fade: 0, dim: 0 }, 0.001);
    bars(0.1, 96, 1.2);
    const term = h('div', 'abs', s);
    css(term, { left: '674px', top: '470px', fontFamily: 'var(--hud)', fontWeight: 700, fontSize: '64px', color: 'var(--cyan)', whiteSpace: 'nowrap', textShadow: '0 0 26px rgba(0,194,255,.65)' });
    term.innerHTML = '<span>&gt; </span><span class="t"></span>';
    const cur = h('div', 'abs', s);
    css(cur, { left: '1216px', top: '478px', width: '36px', height: '62px', background: 'var(--cyan)', boxShadow: '0 0 24px rgba(0,194,255,.8)' });
    const txt = term.querySelector('.t');
    blink(cur, 0.2, 1.0);
    tl.set(cur, { opacity: 1 }, 1.2);
    tl.fromTo(cur, { x: -460 }, { x: 0, duration: 1.3, ease: 'none' }, 1.2);
    const done = typeText(txt, 'hello, world', 1.2, 9.2);
    blink(cur, done + 0.1, 2.6);
    const c = cap(s, 'Every universe starts with a signal.', { x: 130, y: 170, rot: -1.5 });
    popIn(c, 3.0); popOut(c, 7.2);
    fadeOut(term, 5.1, 0.5, { filter: 'blur(8px)' });
    tl.set(cur, { opacity: 1 }, 5.1);
    tl.to(cur, { x: 960 - 1234, y: 540 - 509, width: 22, height: 22, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 40px 10px rgba(255,255,255,.9)', duration: 0.9, ease: 'power3.inOut' }, 5.2);
    tl.to(cur, { scale: 3, duration: 0.2, ease: 'power2.out' }, 6.05);
    tl.to(cur, { scale: 0, opacity: 0, duration: 0.5, ease: 'power2.in' }, 6.25);
    cue(6.05, 'twinkle', 1);
    tl.fromTo(FXS, { speed: 0, sx: 960, sy: 540, inner: 420 }, { speed: 1.3, duration: 3, ease: 'power2.in' }, 7.0);
    tl.set(FXS, { speed: 0 }, 10.0);
    sp(6.0, { misreg: 3.5 }, 3);
    cue(8.0, 'braam', 1.2);
    flash(8.0, 0.35, 0.4); spike(8.0, 9, 1.4); shake(8.0, 1.3, 1.6);
    bars(9.3, 0, 0.6);
    tl.fromTo(f.flashEl, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.in', immediateRender: false }, 9.55);
  }

  // =====================================================================
  // 01 · TITLE (10 to 22)
  // =====================================================================
  function S1() {
    const { tl, ctl, cue, h, css, scene, span, show, hide, fadeIn, fadeOut, K, rise, sink, bub, popIn, popOut, logo, FXS, shake, flash, spike, shot, sp, rohit, appear, vanish, place, poseTo, wave, talk, chapter } = f;
    chapter(10, '', 'Title', '');
    const s = scene(); span(s, 10.0, 22.0);
    shot(10.0, 'title');
    tl.set(Space.S, { misreg: 1 }, 10.0);
    tl.fromTo(f.flashEl, { opacity: 1 }, { opacity: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, 10.0);
    const b = burst(s, { x: 360, y: 150, w: 1200, h: 620, fill: '#ff2e88', points: 20, seed: 11 });
    show(b, 11.5);
    tl.fromTo(b, { scale: 0, rotate: -20 }, { scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(2)' }, 11.5);
    tl.to(b, { rotate: 8, duration: 8, ease: 'none' }, 12.0);
    const into = logo(s, 'Into the', { center: true, y: 232, size: 110, white: true, rot: -4 });
    const uxv = logo(s, 'UX-Verse', { center: true, y: 330, size: 300, rot: -4 });
    show(into, 11.45); tl.fromTo(into, { scale: 3, rotate: -16 }, { scale: 1, rotate: -4, duration: 0.4, ease: 'back.out(2.4)' }, 11.45);
    show(uxv, 11.62); tl.fromTo(uxv, { scale: 3.2, rotate: -18 }, { scale: 1, rotate: -4, duration: 0.45, ease: 'back.out(2.2)' }, 11.62);
    cue(11.62, 'titlehit', 1); shake(11.62, 1.4, 0.8); spike(11.62, 10, 1.2);
    tl.fromTo(FXS, { speed: 1.2, sx: 960, sy: 480, inner: 520 }, { speed: 0, duration: 1.4, ease: 'power2.out', immediateRender: false }, 11.62);
    // Rohit arrives on the logo
    const R = rohit(s);
    appear(R, 13.0, { ...Rohit.POSES.fly, x: 2150, y: 820, s: 0.6, flip: -1, flame: 1, bob: 0, mouth: 0, helmet: 0 });
    place(R, 13.0, { x: 1390 }, 1.3, 'power2.out');
    place(R, 13.0, { y: 262 }, 1.3, 'back.out(1.1)');
    cue(13.0, 'jet', 1.4);
    poseTo(R, 14.3, 'idle', 0.2, { flame: 0, flip: 1, rot: 0 });
    cue(14.35, 'land', 0.8);
    poseTo(R, 14.7, 'wave', 0.3, { mouth: 1 });
    wave(R, 15.0, 4);
    const inkText = { WebkitTextStroke: '10px #0b0a12', paintOrder: 'stroke fill' };
    const k1 = K(s, 'Starring Rohit Patle', 'logo', { left: '0px', width: '1920px', textAlign: 'center', top: '716px', fontSize: '66px', color: '#fbf7ee', fontFamily: 'var(--title)', textTransform: 'uppercase', letterSpacing: '.04em', ...inkText });
    const k2 = K(s, 'Senior UX/UI Designer · AI UX Designer', '', { left: '0px', width: '1920px', textAlign: 'center', top: '806px', fontSize: '50px', color: '#00c2ff', fontFamily: 'var(--cap)', fontWeight: 700, ...inkText });
    rise(k1, 15.2); rise(k2, 15.7);
    const bb = bub(s, "Hey, I'm Rohit.<br>Let me show you around.", { x: 860, y: 30, tail: 'br' });
    popIn(bb, 16.4, { sfx: 'pop' }); talk(R, 16.4, 1.8); popOut(bb, 19.2);
    sink(k1, 19.4); sink(k2, 19.45);
    poseTo(R, 19.7, 'fly', 0.3, { flame: 1, flip: 1 });
    place(R, 19.9, { x: -320, y: 760, rot: -12 }, 1.0, 'power2.in');
    cue(19.9, 'jet', 1.2);
    vanish(R, 21.0);
    fadeOut([into, uxv, b], 20.2, 0.5, { scale: 0.9 });
    tl.set(Space.S, { shot: 'none' }, 22.0);
  }

  // =====================================================================
  // 03 · LIFTOFF (48 to 56)
  // =====================================================================
  function S3() {
    const { tl, cue, scene, span, cap, popIn, popOut, sfx, slam, FXS, shot, sp, chapter, cmyWipe } = f;
    chapter(48, '03', 'Liftoff', '2020');
    const s = scene(); span(s, 48.9, 56.2);
    shot(48.9, 'rocket');
    tl.set(Space.S, { fade: 0, dim: 0 }, 48.9);
    cue(49.3, 'rumble', 5.5);
    const c = cap(s, '2020. Time to go further.', { x: 130, y: 170, rot: -1.5, cls: 'big' });
    popIn(c, 50.7); popOut(c, 54.8);
    const w = sfx(s, 'WHOOOSH!', { x: 980, y: 700, rot: -16, cls: 'cyan s120' });
    slam(w, 51.5, 1.1, { sfx: 'whoosh', shake: 0.5 });
    tl.fromTo(FXS, { speed: 0, sx: 960, sy: 380, inner: 460 }, { speed: 0.9, duration: 0.8 }, 50.4);
    tl.to(FXS, { speed: 0, duration: 1.8, ease: 'power2.in' }, 52.6);
    cmyWipe(55.3);
    tl.set(Space.S, { shot: 'orbit' }, 55.75);
  }

  // =====================================================================
  // 04 · ORBIT PUNE (56 to 78) · Atos-Syntel
  // =====================================================================
  function S4() {
    const { tl, ctl, cue, h, css, svgEl, scene, span, show, hide, fadeIn, fadeOut, cap, popIn, popOut, bub, hudbox, hudIn, panel, sfx, slam, shot, sp, chapter, rohit, appear, vanish, place, poseTo, talk, cmyWipe } = f;
    chapter(56, '04', 'Orbit Pune', 'Atos–Syntel · 2020');
    const s = scene(); span(s, 55.8, 78.0);
    const hb = hudbox(s, 'Atos–Syntel · <b>UX/UI Designer</b> · Jan 2020 → Nov 2022', { x: 120, y: 940 });
    hudIn(hb, 56.6); fadeOut(hb, 77.0, 0.3);
    const R = rohit(s);
    appear(R, 56.9, { ...Rohit.POSES.fly, x: -260, y: 520, s: 0.72, flip: -1, flame: 1, bob: 1, helmet: 0, mouth: 0 });
    place(R, 56.9, { x: 420, y: 640, rot: 0 }, 1.2, 'power3.out');
    cue(56.9, 'jet', 1.2);
    poseTo(R, 58.2, 'point', 0.35, { flame: 0.35, flip: 1, mouth: 1 });
    const c1 = cap(s, 'Enterprise dashboards. Data-heavy workflows. Screens people live in for eight hours a day.', { x: 120, y: 150, w: 820, rot: -1.2 });
    popIn(c1, 58.3); popOut(c1, 61.1);

    // three process panels
    const P = [
      { x: 1040, y: 150, rot: -3, title: 'User flows', draw: (b) => `<svg viewBox="0 0 440 250" width="440" height="250"><g stroke="#0b0a12" stroke-width="5" fill="none"><path d="M 110 70 L 170 70"/><path d="M 270 70 L 330 70"/><path d="M 220 100 L 220 150"/><path d="M 170 190 L 110 190 L 110 100" /></g><g stroke="#0b0a12" stroke-width="5"><rect x="20" y="40" width="90" height="60" fill="#ffd23f"/><rect x="170" y="40" width="100" height="60" fill="#00c2ff"/><rect x="330" y="40" width="90" height="60" fill="#ff2e88"/><rect x="170" y="150" width="100" height="70" fill="#fbf7ee"/></g><path d="M 160 64 L 170 70 L 160 76 M 320 64 L 330 70 L 320 76 M 214 140 L 220 150 L 226 140" stroke="#0b0a12" stroke-width="5" fill="none"/></svg>` },
      { x: 1330, y: 400, rot: 2.5, title: 'Heuristic evaluation', draw: () => `<svg viewBox="0 0 440 250" width="440" height="250">${Array.from({ length: 5 }, (_, i) => `<rect x="30" y="${24 + i * 44}" width="270" height="24" fill="#e3d2ae"/><text x="${340}" y="${46 + i * 44}" font-family="Bangers, sans-serif" font-size="40" fill="${i === 2 ? '#e11' : '#1a9c5b'}">${i === 2 ? '✗' : '✓'}</text>`).join('')}</svg>` },
      { x: 1060, y: 640, rot: -2, title: 'Journey maps', draw: () => `<svg viewBox="0 0 440 250" width="440" height="250"><path d="M 30 120 C 90 40 150 40 190 110 C 230 190 290 200 330 120 C 360 70 400 60 420 70" fill="none" stroke="#0b0a12" stroke-width="6" stroke-dasharray="14 10"/>${[[60, 80, 1], [190, 110, 0], [300, 180, -1], [410, 68, 1]].map(([x, y, m]) => `<circle cx="${x}" cy="${y}" r="26" fill="${m > 0 ? '#ffd23f' : m < 0 ? '#ff2e88' : '#fbf7ee'}" stroke="#0b0a12" stroke-width="5"/><circle cx="${x - 8}" cy="${y - 5}" r="3.5" fill="#0b0a12"/><circle cx="${x + 8}" cy="${y - 5}" r="3.5" fill="#0b0a12"/><path d="M ${x - 10} ${y + 10 - m * 2} Q ${x} ${y + 10 + m * 8} ${x + 10} ${y + 10 - m * 2}" fill="none" stroke="#0b0a12" stroke-width="4"/>`).join('')}</svg>` },
    ];
    P.forEach((p, i) => {
      const pn = panel(s, { x: p.x, y: p.y, w: 500, h: 330, rot: p.rot, title: p.title, cls: 'ht' });
      const body = h('div', 'abs', pn.body, p.draw()); css(body, { left: '30px', top: '66px' });
      const t = 61.2 + i * 1.1;
      show(pn.el, t);
      tl.fromTo(pn.el, { x: 700, rotate: p.rot + 12 }, { x: 0, rotate: p.rot, duration: 0.5, ease: 'back.out(1.4)' }, t);
      cue(t, 'panel', 0.8);
      tl.to(pn.el, { x: 900, rotate: p.rot - 10, duration: 0.4, ease: 'power3.in' }, 65.6 + i * 0.08);
      hide(pn.el, 66.2);
    });
    poseTo(R, 61.2, 'idle', 0.3, { mouth: 0 });

    // carbon portal, recognized
    const cp = panel(s, { x: 1180, y: 230, w: 560, h: 380, rot: 2, title: 'Carbon portal', cls: 'ht-c' });
    const chart = h('div', 'abs', cp.body, `<svg viewBox="0 0 500 280" width="500" height="280"><g stroke="#0b0a12" stroke-width="3" opacity=".25">${[60, 120, 180, 240].map((y) => `<line x1="20" y1="${y}" x2="480" y2="${y}"/>`).join('')}</g><path class="ln" d="M 20 60 L 80 80 L 140 70 L 200 120 L 260 130 L 320 170 L 380 190 L 440 230 L 480 238" fill="none" stroke="#1a9c5b" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/><text x="24" y="270" font-family="Space Mono, monospace" font-weight="700" font-size="22" fill="#0b0a12">tCO₂e ↓</text></svg>`);
    css(chart, { left: '30px', top: '76px' });
    const ln = chart.querySelector('.ln');
    show(cp.el, 66.6);
    tl.fromTo(cp.el, { y: -500, rotate: -10 }, { y: 0, rotate: 2, duration: 0.55, ease: 'back.out(1.4)' }, 66.6);
    cue(66.6, 'panel', 0.8);
    tl.fromTo(ln, { strokeDasharray: 700, strokeDashoffset: 700 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, 67.0);
    const stamp = h('div', 'abs', cp.el, 'RECOGNIZED');
    css(stamp, { right: '24px', bottom: '40px', fontFamily: 'var(--title)', fontSize: '64px', color: '#e11', border: '8px solid #e11', padding: '0 16px', borderRadius: '10px', background: 'rgba(255,255,255,.7)' });
    gsap.set(stamp, { autoAlpha: 0, rotate: -12 });
    show(stamp, 69.0); tl.fromTo(stamp, { scale: 3 }, { scale: 1, duration: 0.22, ease: 'power4.in' }, 69.0);
    cue(69.2, 'stamp', 1); f.shake(69.2, 0.5, 0.3);
    const c2 = cap(s, 'A carbon tracking portal for a CX challenge.', { x: 120, y: 150, rot: -1.4, w: 780 });
    popIn(c2, 67.1); popOut(c2, 71.0);
    const c3 = cap(s, 'It got recognized.', { x: 170, y: 330, rot: 1.5, cls: 'mag big' });
    popIn(c3, 69.4); popOut(c3, 71.0);
    poseTo(R, 69.2, 'cheer', 0.3, { mouth: 1 });
    tl.to(cp.el, { x: 800, rotate: 12, duration: 0.4, ease: 'power3.in' }, 70.8);
    hide(cp.el, 71.3);

    // two patches get stitched on
    poseTo(R, 71.2, 'idle', 0.4, { aSh: 24, aEl: -10, head: 10, mouth: 0 });
    place(R, 71.2, { x: 640, y: 720, s: 1.35 }, 0.8);
    ctl.fromTo(R.state, { patches: 0 }, { patches: 1, duration: 1.4, ease: 'none', immediateRender: false }, 72.0);
    for (let i = 0; i < 12; i++) cue(72.0 + i * 0.11, 'stitch', 0.7);
    const n1 = cap(s, '<small>Patch 1</small>Google UX Design Certificate', { x: 110, y: 300, rot: -1.5, cls: 'white', w: 400 });
    const n2 = cap(s, '<small>Patch 2</small>HFI Certified User Experience Analyst (CXA)', { x: 90, y: 600, rot: 1.2, cls: 'white', w: 420 });
    popIn(n1, 72.2); popIn(n2, 73.0);
    const lines = f.svgEl('svg', { width: 1920, height: 1080 }, s);
    css(lines, { position: 'absolute', left: 0, top: 0, overflow: 'visible' });
    const l1 = f.svgEl('path', { d: 'M 510 380 C 540 420 520 470 548 505', fill: 'none', stroke: '#fbf7ee', 'stroke-width': 5, 'stroke-dasharray': '10 8' }, lines);
    const l2 = f.svgEl('path', { d: 'M 520 620 C 560 600 548 560 566 534', fill: 'none', stroke: '#fbf7ee', 'stroke-width': 5, 'stroke-dasharray': '10 8' }, lines);
    gsap.set(lines, { autoAlpha: 0 }); show(lines, 72.4);
    const c4 = cap(s, 'Picked up two patches on the way.', { x: 1010, y: 170, rot: -1.2, cls: 'big' });
    popIn(c4, 73.8); popOut(c4, 76.4);
    popOut(n1, 76.3); popOut(n2, 76.4); hide(lines, 76.4);
    poseTo(R, 76.5, 'fly', 0.3, { flame: 1, head: 0 });
    place(R, 76.6, { x: 2200, y: -200, s: 0.8 }, 0.9, 'power2.in');
    cue(76.6, 'jet', 1);
    vanish(R, 77.6);
    cmyWipe(77.1);
    tl.set(Space.S, { shot: 'asteroids' }, 77.55);
  }

  // =====================================================================
  // 05 · THE LAWS OF THE UX-VERSE (78 to 104)
  // =====================================================================
  function S5() {
    const { tl, ctl, cue, h, css, svgEl, scene, span, show, hide, fadeIn, fadeOut, cap, popIn, popOut, bub, sfx, slam, logo, panel, sp, chapter, rohit, appear, vanish, place, poseTo, talk } = f;
    chapter(78, '05', 'Laws of the UX-Verse', '@rohitpatle03');
    const s = scene(); span(s, 77.6, 104.0);
    sp(77.8, { dim: 0.45 }, 0.8);
    const b = burst(s, { x: 410, y: 170, w: 1100, h: 520, fill: '#00c2ff', points: 18, seed: 5 });
    show(b, 78.1); tl.fromTo(b, { scale: 0 }, { scale: 1, duration: 0.45, ease: 'back.out(2)' }, 78.1);
    const l1 = logo(s, 'The laws of the', { center: true, y: 250, size: 96, white: true, rot: -3 });
    const l2 = logo(s, 'UX-Verse', { center: true, y: 342, size: 250, rot: -3 });
    show(l1, 78.2); tl.fromTo(l1, { scale: 3 }, { scale: 1, duration: 0.4, ease: 'back.out(2.4)' }, 78.2);
    show(l2, 78.35); tl.fromTo(l2, { scale: 3 }, { scale: 1, duration: 0.4, ease: 'back.out(2.4)' }, 78.35);
    cue(78.35, 'titlehit', 0.8); f.shake(78.35, 1, 0.6); f.spike(78.35, 7, 1);
    const c1 = cap(s, 'Out here, UX laws work like physics.', { x: 560, y: 700, rot: -1.4, cls: 'white big' });
    const c2 = cap(s, 'I teach them on Instagram: @rohitpatle03', { x: 620, y: 830, rot: 1.4, cls: 'mag' });
    popIn(c1, 79.2); popIn(c2, 80.0);
    const RL = rohit(s);
    appear(RL, 78.8, { ...Rohit.POSES.fly, x: 300, y: 1300, s: 0.72, flip: 1, flame: 1, bob: 1, mouth: 0 });
    place(RL, 78.8, { y: 930 }, 0.6, 'back.out(1.3)');
    poseTo(RL, 79.4, 'point', 0.3, { flame: 0.3, mouth: 1 });
    talk(RL, 79.4, 2.0);
    popOut(c1, 81.5); popOut(c2, 81.55);
    fadeOut([l1, l2, b], 81.5, 0.3);
    place(RL, 81.5, { y: 1400 }, 0.5, 'power2.in');
    vanish(RL, 82.0);

    const laws = [
      { n: '01', name: "Fitts's Law", cap: 'Big, close targets are faster to hit.', build: fitts },
      { n: '02', name: "Hick's Law", cap: 'More choices, slower decisions.', build: hick },
      { n: '03', name: "Miller's Law", cap: 'Chunk it. Working memory holds about seven things.', build: miller },
      { n: '04', name: "Jakob's Law", cap: 'People expect your product to work like the ones they already use.', build: jakob },
      { n: '05', name: 'Doherty Threshold', cap: 'Answer in under 400ms and people stay in flow.', build: doherty },
      { n: '06', name: 'Von Restorff Effect', cap: 'The one that is different is the one they remember.', build: restorff },
    ];
    laws.forEach((L, i) => {
      const T = 82.0 + i * 3.4;
      const rot = i % 2 ? 1.2 : -1.2;
      const pn = panel(s, { x: 180, y: 140, w: 1560, h: 810, rot, title: `Law ${L.n} · ${L.name}`, cap: L.cap, cls: i % 2 ? 'ht-c' : 'ht-m' });
      show(pn.el, T - 0.05);
      tl.fromTo(pn.el, { x: 1900, rotate: rot + 8 }, { x: 0, rotate: rot, duration: 0.45, ease: 'back.out(1.25)' }, T - 0.05);
      cue(T - 0.05, 'whoosh', 0.45, 0.6); cue(T + 0.35, 'lawhit', 1, i);
      if (i < laws.length - 1) { tl.to(pn.el, { x: -2000, rotate: rot - 8, duration: 0.35, ease: 'power3.in' }, T + 3.05); hide(pn.el, T + 3.45); }
      else { tl.to(pn.el, { scale: 0.9, autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, T + 3.1); }
      L.build(pn.body, T + 0.4);
    });
    const fin = cap(s, 'Break them and users feel it. Follow them and nobody notices. That\'s the job.', { x: 330, y: 400, w: 1260, rot: -1, cls: 'white big' });
    popIn(fin, 102.5); popOut(fin, 103.7);
    sp(103.4, { dim: 0, fade: 1 }, 0.5);

    // ---- law illustrations (T = when the panel settles) ----
    function fitts(p, T) {
      const big = h('div', 'abs', p, 'BIG + CLOSE');
      css(big, { left: '470px', top: '300px', width: '440px', height: '170px', background: 'var(--green)', border: '7px solid var(--ink)', borderRadius: '26px', fontFamily: 'var(--title)', fontSize: '64px', display: 'grid', placeItems: 'center', color: 'var(--ink)', boxShadow: '10px 10px 0 var(--ink)' });
      const tiny = h('div', 'abs', p, 'tiny + far');
      css(tiny, { left: '1330px', top: '100px', width: '110px', height: '44px', background: 'var(--yellow)', border: '4px solid var(--ink)', borderRadius: '8px', fontFamily: 'var(--hud)', fontSize: '14px', fontWeight: 700, display: 'grid', placeItems: 'center', color: 'var(--ink)' });
      const cur = h('div', 'abs', p, '<svg viewBox="0 0 40 56" width="60" height="84"><path d="M 4 4 L 4 44 L 14 34 L 22 52 L 30 48 L 22 31 L 36 31 Z" fill="#fbf7ee" stroke="#0b0a12" stroke-width="4" stroke-linejoin="round"/></svg>');
      css(cur, { left: '0px', top: '0px' });
      const trail = h('div', 'abs', p); css(trail, { left: '0px', top: '0px', width: '260px', height: '18px', background: 'linear-gradient(90deg, rgba(255,210,63,0), #ffd23f)', borderRadius: '9px', transformOrigin: '100% 50%' });
      gsap.set([cur, trail], { autoAlpha: 0 });
      show(cur, T); show(trail, T);
      tl.fromTo(cur, { x: 150, y: 420 }, { x: 660, y: 360, duration: 0.45, ease: 'power2.in' }, T + 0.1);
      tl.fromTo(trail, { x: -110, y: 450, rotate: -6 }, { x: 400, y: 390, rotate: -6, duration: 0.45, ease: 'power2.in' }, T + 0.1);
      tl.fromTo(big, { scale: 1 }, { scale: 0.9, duration: 0.08, yoyo: true, repeat: 1, ease: 'none', immediateRender: false }, T + 0.55);
      const boop = sfx(p, 'BOOP!', { x: 820, y: 180, rot: -10, cls: 's120' });
      slam(boop, T + 0.55, 0.6, { sfx: 'boop', shake: 0.3 });
      tl.to(cur, { x: 1500, y: 20, duration: 0.55, ease: 'power1.in' }, T + 1.4);
      tl.to(trail, { x: 1250, y: 50, rotate: -14, duration: 0.55, ease: 'power1.in' }, T + 1.4);
      const whiff = sfx(p, 'WHIFF...', { x: 1080, y: 220, rot: 8, cls: 'white s90' });
      slam(whiff, T + 1.95, 0.7, { sfx: 'whiff', shake: false });
      hide(trail, T + 2.1);
    }
    function hick(p, T) {
      const grid = h('div', 'abs', p); css(grid, { left: '90px', top: '110px', width: '760px', height: '440px' });
      const cols = ['#ff2e88', '#00c2ff', '#ffd23f', '#3ddc97', '#7b5cff', '#ff9a3d'];
      const btns = [];
      for (let i = 0; i < 24; i++) {
        const e = h('div', 'abs', grid, ['Buy', 'Help', 'Save', 'Menu', 'More', 'Next', 'Info', 'Edit', 'Share', 'Rate', 'Sort', 'View'][i % 12]);
        css(e, { left: (i % 6) * 126 + 'px', top: Math.floor(i / 6) * 108 + 'px', width: '110px', height: '88px', background: cols[i % 6], border: '5px solid var(--ink)', borderRadius: '12px', fontFamily: 'var(--hud)', fontWeight: 700, fontSize: '19px', display: 'grid', placeItems: 'center', color: 'var(--ink)' });
        btns.push(e);
      }
      const three = ['Book', 'Track', 'Help'].map((l, i) => {
        const e = h('div', 'abs', p, l);
        css(e, { left: 140 + i * 240 + 'px', top: '240px', width: '210px', height: '140px', background: ['#3ddc97', '#00c2ff', '#ffd23f'][i], border: '7px solid var(--ink)', borderRadius: '20px', fontFamily: 'var(--title)', fontSize: '54px', display: 'grid', placeItems: 'center', color: 'var(--ink)', boxShadow: '8px 8px 0 var(--ink)' });
        gsap.set(e, { autoAlpha: 0 });
        return e;
      });
      const qm = sfx(p, '???', { x: 1250, y: 30, rot: 10, cls: 'white s120' });
      show(qm, T + 0.1); tl.fromTo(qm, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, T + 0.1); hide(qm, T + 1.5);
      const RH = rohit(p);
      appear(RH, T - 0.4, { ...Rohit.POSES.sweat, x: 1150, y: 520, s: 0.95, flip: 1, flame: 0, bob: 0, mouth: 2, sweat: 1, brow: 6 });
      btns.forEach((e, i) => tl.to(e, { x: (f.hash(i, 3) - 0.5) * 1600, y: -600 - f.hash(i, 5) * 400, rotate: (f.hash(i, 7) - 0.5) * 200, duration: 0.5, ease: 'power2.in' }, T + 1.3 + (i % 6) * 0.02));
      cue(T + 1.3, 'whoosh', 0.5, 0.7);
      three.forEach((e, i) => { show(e, T + 1.75 + i * 0.1); tl.fromTo(e, { scale: 0 }, { scale: 1, duration: 0.35, ease: 'back.out(2.5)' }, T + 1.75 + i * 0.1); cue(T + 1.75 + i * 0.1, 'pop', 0.7); });
      poseTo(RH, T + 1.9, 'thumbs', 0.25, { mouth: 1, sweat: 0, brow: 0 });
      vanish(RH, T + 3.1);
    }
    function miller(p, T) {
      const digits = '4917302865'.split('');
      const chips = digits.map((d, i) => {
        const e = h('div', 'abs', p, d);
        css(e, { left: '0px', top: '0px', width: '112px', height: '140px', background: '#fbf7ee', border: '6px solid var(--ink)', borderRadius: '16px', fontFamily: 'var(--hud)', fontWeight: 700, fontSize: '92px', display: 'grid', placeItems: 'center', color: 'var(--ink)', boxShadow: '6px 6px 0 var(--ink)' });
        gsap.set(e, { autoAlpha: 0 });
        return e;
      });
      const grouped = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (i < 3 ? 150 + i * 124 : i < 6 ? 600 + (i - 3) * 124 : 1050 + (i - 6) * 124));
      chips.forEach((e, i) => {
        show(e, T - 0.2 + i * 0.05);
        tl.fromTo(e, { x: 70 + i * 142, y: -200 }, { x: 70 + i * 142, y: 210, duration: 0.4, ease: 'back.out(1.6)' }, T - 0.2 + i * 0.05);
        tl.to(e, { x: grouped[i], duration: 0.45, ease: 'back.out(1.8)' }, T + 1.2);
      });
      cue(T + 1.2, 'snap', 1);
      [[150, 494], [600, 494], [1050, 618]].forEach(([x, w], i) => {
        const br = h('div', 'abs', p, '<span>chunk</span>');
        css(br, { left: x + 'px', top: '380px', width: w - 20 + 'px', height: '40px', borderBottom: '8px solid var(--magenta)', borderLeft: '8px solid var(--magenta)', borderRight: '8px solid var(--magenta)', borderRadius: '0 0 14px 14px' });
        css(br.firstChild, { position: 'absolute', left: '50%', top: '52px', transform: 'translateX(-50%)', fontFamily: 'var(--cap)', fontWeight: 700, fontSize: '40px', color: 'var(--ink)' });
        gsap.set(br, { autoAlpha: 0 });
        show(br, T + 1.75 + i * 0.12); tl.fromTo(br, { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: 'back.out(2)' }, T + 1.75 + i * 0.12);
        cue(T + 1.75 + i * 0.12, 'tick', 0.8, 1400 + i * 200);
      });
    }
    function jakob(p, T) {
      const xs = [120, 400, 680, 960, 1240];
      xs.forEach((x, i) => {
        const odd = i === 3;
        const pl = h('div', 'abs', p, '<div class="bar"></div>');
        css(pl, { left: x + 'px', top: '120px', width: '200px', height: '200px', background: ['#00c2ff', '#ff2e88', '#ffd23f', '#7b5cff', '#3ddc97'][i], border: '7px solid var(--ink)', borderRadius: odd ? '0%' : '50%', boxShadow: '8px 8px 0 var(--ink)', overflow: 'hidden' });
        css(pl.firstChild, { position: 'absolute', left: '30px', right: '30px', top: '52px', height: '26px', background: 'rgba(251,247,238,.9)', borderRadius: '8px', border: '4px solid var(--ink)' });
        const alien = h('div', 'abs', p, `<svg viewBox="0 0 120 110" width="120" height="110"><path d="M 20 100 C 10 50 30 20 60 20 C 90 20 110 50 100 100 Z" fill="#3ddc97" stroke="#0b0a12" stroke-width="6"/><circle cx="45" cy="55" r="12" fill="#fff" stroke="#0b0a12" stroke-width="4"/><circle cx="75" cy="55" r="12" fill="#fff" stroke="#0b0a12" stroke-width="4"/><circle cx="47" cy="57" r="5" fill="#0b0a12"/><circle cx="77" cy="57" r="5" fill="#0b0a12"/></svg>`);
        css(alien, { left: x + 40 + 'px', top: '380px' });
        const mark = h('div', 'abs', p, odd ? '?!' : '✓');
        css(mark, { left: x + 60 + 'px', top: '320px', fontFamily: 'var(--sfx)', fontSize: '70px', color: odd ? '#ff2e88' : '#1a9c5b', WebkitTextStroke: '3px #0b0a12' });
        gsap.set([pl, alien, mark], { autoAlpha: 0 });
        show(pl, T - 0.2 + i * 0.08); tl.fromTo(pl, { y: -300 }, { y: 0, duration: 0.4, ease: 'back.out(1.6)' }, T - 0.2 + i * 0.08);
        show(alien, T + 0.3 + i * 0.06); show(mark, T + 0.6 + i * 0.06);
        if (odd) {
          tl.to(pl, { borderRadius: '50%', duration: 0.5, ease: 'back.out(2)' }, T + 1.7);
          tl.set(mark, { textContent: '!' }, T + 1.9);
          tl.fromTo(mark, { scale: 1.8 }, { scale: 1, duration: 0.3, ease: 'back.out(3)', immediateRender: false }, T + 1.9);
          cue(T + 1.7, 'morph', 1);
        }
      });
    }
    function doherty(p, T) {
      function gauge(x, label, color, target, happy) {
        const g = h('div', 'abs', p, `<svg viewBox="0 0 420 260" width="420" height="260"><path d="M 30 230 A 180 180 0 0 1 390 230" fill="none" stroke="#e3d2ae" stroke-width="44"/><path d="M 30 230 A 180 180 0 0 1 150 60" fill="none" stroke="#3ddc97" stroke-width="44"/><path d="M 270 60 A 180 180 0 0 1 390 230" fill="none" stroke="#ff2e88" stroke-width="44"/><path d="M 30 230 A 180 180 0 0 1 390 230" fill="none" stroke="#0b0a12" stroke-width="6"/></svg>`);
        css(g, { left: x + 'px', top: '120px' });
        const needle = h('div', 'abs', p); css(needle, { left: x + 206 + 'px', top: '160px', width: '10px', height: '190px', background: 'var(--ink)', borderRadius: '5px', transformOrigin: '50% 100%' });
        const hub = h('div', 'abs', p); css(hub, { left: x + 190 + 'px', top: '330px', width: '42px', height: '42px', borderRadius: '50%', background: 'var(--ink)' });
        const lb = h('div', 'abs', p, label); css(lb, { left: x + 'px', width: '420px', textAlign: 'center', top: '400px', fontFamily: 'var(--hud)', fontWeight: 700, fontSize: '56px', color: color });
        const face = h('div', 'abs', p, happy ? 'wheee!' : 'Zzz...'); css(face, { left: x + 'px', width: '420px', textAlign: 'center', top: '480px', fontFamily: 'var(--sfx)', fontSize: '64px', color: happy ? '#1a9c5b' : '#7b5cff' });
        gsap.set([g, needle, hub, lb, face], { autoAlpha: 0 });
        [g, needle, hub, lb].forEach((e) => show(e, T - 0.2));
        tl.fromTo(needle, { rotate: -88 }, { rotate: target, duration: happy ? 0.5 : 1.8, ease: happy ? 'back.out(2)' : 'power1.inOut' }, T + 0.1);
        show(face, happy ? T + 0.7 : T + 2.0);
        tl.fromTo(face, { y: 20 }, { y: -10, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1, immediateRender: false }, happy ? T + 0.7 : T + 2.0);
      }
      gauge(150, '380 ms', '#1a9c5b', -52, true);
      gauge(900, '2,400 ms', '#ff2e88', 70, false);
      cue(T + 0.6, 'ding', 0.7); cue(T + 2.0, 'snore', 1);
    }
    function restorff(p, T) {
      const stars = [];
      for (let i = 0; i < 40; i++) {
        const special = i === 27;
        const e = h('div', 'abs', p, `<svg viewBox="0 0 100 100" width="${special ? 90 : 64}" height="${special ? 90 : 64}"><path d="M 50 4 L 62 38 L 98 38 L 69 60 L 80 95 L 50 74 L 20 95 L 31 60 L 2 38 L 38 38 Z" fill="${special ? '#ff2e88' : '#fbf7ee'}" stroke="#0b0a12" stroke-width="6" stroke-linejoin="round"/></svg>`);
        css(e, { left: 90 + (i % 8) * 120 - (special ? 13 : 0) + 'px', top: 60 + Math.floor(i / 8) * 104 - (special ? 13 : 0) + 'px' });
        gsap.set(e, { autoAlpha: 0 });
        show(e, T - 0.3 + (i % 8) * 0.03);
        if (special) { tl.fromTo(e, { scale: 1 }, { scale: 1.35, duration: 0.3, yoyo: true, repeat: 5, ease: 'sine.inOut', immediateRender: false }, T + 0.6); }
        stars.push(e);
      }
      const ring = h('div', 'abs', p); css(ring, { left: 90 + 3 * 120 - 40 + 'px', top: 60 + 3 * 104 - 40 + 'px', width: '144px', height: '144px', borderRadius: '50%', border: '8px solid var(--yellow)' });
      gsap.set(ring, { autoAlpha: 0 }); show(ring, T + 0.6);
      tl.fromTo(ring, { scale: 2.4 }, { scale: 1, duration: 0.4, ease: 'back.out(2)' }, T + 0.6);
      cue(T + 0.6, 'twinkle', 1);
      const RV = rohit(p);
      appear(RV, T - 0.3, { ...Rohit.POSES.pointL, x: 1300, y: 560, s: 0.95, flip: 1, flame: 0, bob: 0, mouth: 1, sweat: 0, brow: -4 });
      const bb = bub(p, 'That one.', { x: 1080, y: 40, tail: 'br' });
      popIn(bb, T + 1.0); talk(RV, T + 1.0, 0.8);
      vanish(RV, T + 3.2);
    }
  }

  // =====================================================================
  // 06 · THE MOTHERSHIP (104 to 130) · TCS
  // =====================================================================
  function S6() {
    const { tl, ctl, cue, h, css, scene, span, show, hide, fadeIn, fadeOut, cap, popIn, popOut, bub, hudbox, hudIn, counter, shot, sp, bars, shake, spike, flash, chapter, rohit, appear, vanish, place, poseTo, talk, hooks, cmyWipe } = f;
    chapter(104, '06', 'The Mothership', 'TCS · 2022 → now');
    const s = scene(); span(s, 103.9, 130.0);
    shot(103.9, 'mothership');
    tl.set(Space.S, { dim: 0 }, 103.9);
    tl.fromTo(Space.S, { fade: 1 }, { fade: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, 104.0);
    cue(104.0, 'braam', 1.3); cue(104.2, 'rumble', 7.5);
    shake(104.0, 1.6, 2.5); spike(104.0, 8, 2);
    bars(104.1, 110, 1.2); bars(111.3, 0, 0.8);
    const hb = hudbox(s, 'TCS · Bangalore · <b>Senior UX/UI Designer · AI UX Designer</b> · Nov 2022 → now', { x: 120, y: 150 });
    hudIn(hb, 105.6); fadeOut(hb, 111.0, 0.3);
    const c1 = cap(s, 'Then the big ship. Enterprise HR platforms, admin panels, role-based workflows.', { x: 120, y: 760, w: 900, rot: -1.2 });
    popIn(c1, 107.6); popOut(c1, 111.1);

    const R = rohit(s);
    appear(R, 111.9, { ...Rohit.POSES.fly, x: -300, y: 640, s: 0.9, flip: -1, flame: 1, bob: 1, helmet: 0, mouth: 0 });
    place(R, 111.9, { x: 380, y: 780 }, 0.8, 'power3.out');
    poseTo(R, 112.7, 'thumbs', 0.3, { flame: 0.3, flip: 1, mouth: 1 });
    cue(111.9, 'jet', 1);
    const stats = [
      ['25%+', 'faster enterprise workflows', '', '#ffd23f'],
      ['30%', 'fewer user errors', '', '#00c2ff'],
      ['70%', 'better course completion', 'up to', '#ff2e88'],
      ['35%', 'faster handoff and QA', '', '#fbf7ee'],
    ];
    stats.forEach(([num, lbl, pre, col], i) => {
      const x = [720, 1280, 720, 1280][i], y = [110, 110, 540, 540][i];
      const w = h('div', 'stat', s); css(w, { left: x + 'px', top: y + 'px' });
      const bst = burst(w, { x: 0, y: 0, w: 520, h: 300, fill: col, points: 14, seed: 20 + i, stroke: 8 });
      gsap.set(bst, { autoAlpha: 1 });
      if (pre) h('div', 'pre', w, pre);
      const n = h('div', 'num', w, '0');
      h('div', 'lbl', w, lbl);
      gsap.set(w, { autoAlpha: 0, rotate: i % 2 ? 4 : -4 });
      const t = 112.4 + i * 1.3;
      show(w, t);
      tl.fromTo(w, { scale: 0.2, rotate: (i % 2 ? 4 : -4) - 30 }, { scale: 1, rotate: i % 2 ? 4 : -4, duration: 0.45, ease: 'back.out(2.2)' }, t);
      const target = parseInt(num, 10), suffix = num.replace(/[0-9]/g, '');
      counter(n, t + 0.1, 0.8, (p) => Math.round(target * p) + suffix);
      cue(t, 'stathit', 1, i);
      for (let k = 0; k < 6; k++) cue(t + 0.12 + k * 0.12, 'tick', 0.5, 1800 + k * 120);
      tl.to(w, { scale: 0, rotate: 30, duration: 0.3, ease: 'back.in(2)' }, 117.6 + i * 0.06);
    });

    // AI co-pilots
    poseTo(R, 118.0, 'fly', 0.3, { flame: 0.8 });
    place(R, 118.0, { x: 960, y: 760, s: 1.0 }, 0.8, 'power2.inOut');
    poseTo(R, 118.9, 'idle', 0.3, { flame: 0.3, mouth: 0 });
    const names = ['Claude', 'ChatGPT', 'Gemini', 'Cursor', 'Figma AI', 'Stitch', 'v0', 'Codex'];
    const tags = names.map((n, i) => {
      const e = h('div', 'chip', s, n);
      css(e, { position: 'absolute', left: '0px', top: '0px', fontSize: '28px', padding: '8px 18px', boxShadow: '5px 5px 0 #0b0a12', background: ['#00c2ff', '#ff2e88', '#ffd23f', '#7b5cff'][i % 4], color: i % 4 === 3 ? '#fff' : 'var(--ink)' });
      gsap.set(e, { autoAlpha: 0 });
      show(e, 119.0 + i * 0.12); hide(e, 126.2);
      cue(119.0 + i * 0.12, 'blip', 0.6, i);
      return e;
    });
    hooks.push((t) => {
      if (t < 118.9 || t > 126.3 || Space.S.shot !== 'mothership') return;
      const drones = Space.shots.mothership.drones;
      tags.forEach((e, i) => {
        const p = Space.project('mothership', drones[i]);
        e.style.transform = `translate(${(p.x - e.offsetWidth / 2).toFixed(1)}px, ${(p.y - 90).toFixed(1)}px)`;
      });
    });
    const c2 = cap(s, 'I fly with AI co-pilots. Faster research, prototypes and QA.', { x: 120, y: 150, w: 760, rot: -1.2 });
    popIn(c2, 119.4); popOut(c2, 122.1);
    const bb = bub(s, 'They draft. I decide.', { x: 1010, y: 300, tail: 'bl', cls: 'big' });
    poseTo(R, 122.3, 'point', 0.3, { mouth: 1 });
    popIn(bb, 122.4); talk(R, 122.4, 1.4); popOut(bb, 125.2);
    poseTo(R, 126.0, 'fly', 0.3, { flame: 1 });
    place(R, 126.1, { y: -400, x: 1300 }, 0.9, 'power2.in');
    cue(126.1, 'jet', 1);
    vanish(R, 127.2);
    cmyWipe(129.2);
    tl.set(Space.S, { shot: 'orchard' }, 129.65);
  }

  // =====================================================================
  // 07 · ORCHARD STUDIO (130 to 160)
  // =====================================================================
  function S7() {
    const { tl, ctl, cue, h, css, scene, span, show, hide, fadeIn, fadeOut, cap, popIn, popOut, bub, logo, sp, chapter, rohit, appear, vanish, place, poseTo, wave, talk, cmyWipe } = f;
    chapter(130, '07', 'Orchard Studio', '2021 → 2026');
    const s = scene(); span(s, 129.7, 160.0);
    tl.set(Space.S, { dim: 0, fade: 0 }, 129.7);
    const c1 = cap(s, 'Then came my boldest build.', { x: 120, y: 150, rot: -1.5, cls: 'big' });
    popIn(c1, 130.2); popOut(c1, 132.7);
    const lg = logo(s, 'Orchard Studio', { center: true, y: 330, size: 160, rot: -3 });
    show(lg, 130.75); tl.fromTo(lg, { scale: 3 }, { scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, 130.75);
    cue(130.75, 'titlehit', 0.8); f.shake(130.75, 0.8, 0.5);
    const sub = cap(s, 'A physical experience studio. I own the design and the AI-driven production.', { x: 380, y: 560, w: 1160, rot: 1, cls: 'white' });
    popIn(sub, 131.3);
    fadeOut(lg, 133.0, 0.3); popOut(sub, 133.0);
    const RO = rohit(s);
    appear(RO, 130.3, { ...Rohit.POSES.fly, x: 2200, y: 900, s: 0.7, flip: -1, flame: 1, bob: 1, mouth: 0 });
    place(RO, 130.3, { x: 1650, y: 880 }, 0.8, 'power3.out');
    poseTo(RO, 131.1, 'wave', 0.3, { flame: 0.3, flip: 1, mouth: 1 });
    wave(RO, 131.3, 3);
    place(RO, 133.0, { x: 2300, y: 700 }, 0.6, 'power2.in');
    vanish(RO, 133.7);

    const zones = [
      ['01', 'The Orientation Trail', 'Where visitors get their bearings.', 133.4, 135.2, '#ffd23f'],
      ['02', 'The Talk Zone', 'People and conversations.', 136.4, 141.6, '#ff2e88'],
      ['03', 'The Make Zone', 'Capability and craft, on show.', 142.6, 144.4, '#00c2ff'],
      ['04', 'The Feel Zone', 'Hands on the product.', 145.4, 147.2, '#ff9a3d'],
      ['05', 'The Capsule', 'The closing experience.', 148.2, 150.0, '#7b5cff'],
    ];
    zones.forEach(([n, name, line, a, b, col]) => {
      const e = h('div', 'abs', s, `<div style="display:inline-block;background:var(--ink);color:${col};font-family:var(--title);font-size:58px;padding:10px 24px 6px;text-transform:uppercase;letter-spacing:.02em;border:5px solid var(--ink)"><span style="color:#fbf7ee;margin-right:18px">${n}</span>${name}</div><div style="display:inline-block;margin-top:-4px;background:${col};color:var(--ink);font-family:var(--cap);font-weight:700;font-size:40px;padding:8px 22px 6px;border:5px solid var(--ink)">${line}</div>`);
      css(e, { left: '110px', top: '800px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', filter: 'drop-shadow(10px 10px 0 #0b0a12)' });
      gsap.set(e, { autoAlpha: 0, rotate: -1.5 });
      show(e, a + 0.1);
      tl.fromTo(e, { x: -700 }, { x: 0, duration: 0.45, ease: 'back.out(1.4)' }, a + 0.1);
      tl.to(e, { x: -900, duration: 0.3, ease: 'power3.in' }, b - 0.2);
      hide(e, b + 0.15);
      cue(a + 0.1, 'whoosh', 0.4, 0.5); cue(a + 0.4, 'zonehit', 0.8);
    });

    // Wall of Fame kiosk, in the Talk Zone
    const k = h('div', 'kiosk', s);
    css(k, { left: '1340px', top: '110px' });
    const kpi = ['#ff2e88', '#00c2ff', '#ffd23f', '#3ddc97', '#7b5cff', '#ff9a3d'];
    k.innerHTML = `<div class="kh">WALL OF FAME</div><div class="tabs"><span class="on">Showcase</span><span>My Wall</span><span>Admin</span></div>
      <div class="grid">${[['tall', 0], ['', 1], ['', 2], ['', 3], ['', 4], ['wide', 5]].map(([cls, i]) => `<div class="cell ${cls}"><div style="display:flex;gap:10px;align-items:center"><div class="av" style="background:${kpi[i]}"></div><div style="flex:1"><div class="nm"></div><div class="nm2"></div></div></div><div class="row"><span class="k" style="background:${kpi[(i + 2) % 6]}">${['Pollination', 'Adoption', 'Ideas', 'Collaboration', 'Coaching', 'Home Building'][i]}</span><span class="cheer">♥ ${[24, 18, 31, 12, 27, 40][i]}</span></div></div>`).join('')}</div>`;
    gsap.set(k, { autoAlpha: 0 });
    const cells = k.querySelectorAll('.cell');
    show(k, 136.9);
    tl.fromTo(k, { x: 500, scale: 0.6, rotate: 8 }, { x: 0, scale: 1, rotate: 2, duration: 0.55, ease: 'back.out(1.4)' }, 136.9);
    tl.fromTo(cells, { scale: 0.2, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, stagger: 0.08, ease: 'back.out(2)' }, 137.3);
    cue(136.9, 'whoosh', 0.5, 0.6);
    const cheer = cells[1].querySelector('.cheer');
    tl.set(cheer, { textContent: '♥ 19' }, 139.9);
    tl.fromTo(cheer, { scale: 1.8, color: '#ff2e88' }, { scale: 1, color: '#fbf7ee', duration: 0.4, ease: 'back.out(3)', immediateRender: false }, 139.9);
    cue(139.9, 'pop', 1);
    const n1 = cap(s, '<small>Wall of Fame</small>A recognition app for portrait kiosk screens. 46 screens. About 310 prototype interactions. One HTML file.', { x: 640, y: 150, w: 640, rot: -1.2, cls: 'white' });
    popIn(n1, 137.6); popOut(n1, 141.3);
    const n2 = cap(s, 'Cheers go one way. No back-scratching.', { x: 700, y: 520, w: 580, rot: 1.4, cls: 'mag' });
    popIn(n2, 138.8); popOut(n2, 141.35);
    tl.to(k, { x: 700, rotate: 12, duration: 0.4, ease: 'power3.in' }, 141.2);
    hide(k, 141.7);

    // the pitch, as a page-curl storyboard
    sp(150.0, { dim: 0.55 }, 0.6);
    const deck = h('div', 'abs', s); css(deck, { left: '260px', top: '130px', width: '1400px', height: '780px', perspective: '2600px' });
    gsap.set(deck, { autoAlpha: 0 });
    const pages = [
      { head: '2021', line: 'It started as an offshore delivery model.', art: `<svg viewBox="0 0 440 420" width="440" height="420"><circle cx="220" cy="210" r="170" fill="#00c2ff" stroke="#0b0a12" stroke-width="8"/><g fill="none" stroke="#0b0a12" stroke-width="3" opacity=".35"><ellipse cx="220" cy="210" rx="70" ry="170"/><ellipse cx="220" cy="210" rx="130" ry="170"/><path d="M 50 210 L 390 210 M 70 130 L 370 130 M 70 290 L 370 290"/></g><path d="M 250 170 L 282 176 L 290 214 L 270 250 L 256 226 L 244 196 Z" fill="#3ddc97" stroke="#0b0a12" stroke-width="5" stroke-linejoin="round"/><circle cx="268" cy="214" r="10" fill="#ff2e88" stroke="#0b0a12" stroke-width="4"/><g fill="none" stroke="#ff2e88" stroke-width="7" stroke-dasharray="14 10" stroke-linecap="round"><path d="M 268 214 C 200 90 120 90 96 120"/><path d="M 268 214 C 330 110 390 110 404 150"/><path d="M 268 214 C 200 320 150 350 110 330"/></g><g fill="#ffd23f" stroke="#0b0a12" stroke-width="4"><circle cx="96" cy="120" r="12"/><circle cx="404" cy="150" r="12"/><circle cx="110" cy="330" r="12"/></g></svg>`, bg: '#fbf7ee' },
      { head: 'January 2026', line: 'It grew into a studio.', art: `<svg viewBox="0 0 460 420" width="460" height="420"><path d="M 70 330 L 140 200 L 230 290 L 320 170 L 400 300" fill="none" stroke="#00c2ff" stroke-width="10" stroke-linecap="round"/>${[[70, 330, '#ffd23f', 'Trail'], [140, 200, '#ff2e88', 'Talk'], [230, 290, '#00c2ff', 'Make'], [320, 170, '#ff9a3d', 'Feel'], [400, 300, '#7b5cff', 'Capsule']].map(([x, y, c, n]) => `<path d="M ${x - 44} ${y} L ${x - 22} ${y - 38} L ${x + 22} ${y - 38} L ${x + 44} ${y} L ${x + 22} ${y + 38} L ${x - 22} ${y + 38} Z" fill="${c}" stroke="#0b0a12" stroke-width="6"/><text x="${x}" y="${y + 70}" text-anchor="middle" font-family="Kalam, cursive" font-weight="700" font-size="28" fill="#0b0a12">${n}</text>`).join('')}</svg>`, bg: '#fbf7ee' },
      { head: 'Then', line: 'It lost its review slot. Shelved.', art: `<div style="font-family:var(--title);font-size:170px;color:#e11;border:14px solid #e11;padding:0 30px;border-radius:18px;transform:rotate(-12deg);background:rgba(255,255,255,.6)">SHELVED</div>`, bg: '#d8d4cc' },
      { head: 'September', line: "It's back as the account's big pitch.", art: `<svg viewBox="0 0 460 420" width="460" height="420"><path d="M 230 20 L 262 150 L 400 120 L 290 210 L 380 330 L 240 270 L 180 400 L 170 262 L 40 300 L 150 200 L 60 90 L 190 140 Z" fill="#ffd23f" stroke="#0b0a12" stroke-width="8" stroke-linejoin="round"/><text x="222" y="238" text-anchor="middle" font-family="Bangers, sans-serif" font-size="92" fill="#ff2e88" stroke="#0b0a12" stroke-width="4">BACK!</text></svg>`, bg: '#fbf7ee' },
    ];
    const pageEls = pages.map((pg, i) => {
      const e = h('div', 'abs', deck, `<div style="position:absolute;left:60px;top:70px;font-family:var(--title);font-size:120px;color:var(--magenta);text-transform:uppercase;line-height:1;-webkit-text-stroke:5px var(--ink);paint-order:stroke fill">${pg.head}</div><div style="position:absolute;left:64px;top:230px;width:560px;font-family:var(--cap);font-weight:700;font-size:62px;line-height:1.12;color:var(--ink)">${pg.line}</div><div style="position:absolute;right:70px;top:120px;width:560px;height:520px;display:grid;place-items:center">${pg.art}</div><div style="position:absolute;left:60px;bottom:40px;font-family:var(--hud);font-weight:700;font-size:22px;letter-spacing:.14em;color:#6c6880">ORCHARD STUDIO · STORYBOARD · ${i + 1}/4</div><div class="curl" style="position:absolute;right:0;top:0;bottom:0;width:180px;background:linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,.18))"></div>`);
      css(e, { inset: 0, background: pg.bg, border: '8px solid var(--ink)', boxShadow: '14px 14px 0 var(--ink)', transformOrigin: '0% 50%', backfaceVisibility: 'hidden', zIndex: 10 - i });
      return e;
    });
    show(deck, 150.2);
    tl.fromTo(deck, { y: 900, rotate: -6 }, { y: 0, rotate: -1, duration: 0.6, ease: 'back.out(1.3)' }, 150.2);
    cue(150.2, 'whoosh', 0.6, 0.6);
    [152.4, 154.4, 156.2].forEach((t, i) => {
      tl.fromTo(pageEls[i], { rotateY: 0 }, { rotateY: -178, duration: 0.7, ease: 'power2.inOut' }, t);
      hide(pageEls[i], t + 0.72);
      cue(t, 'page', 1);
    });
    cue(154.9, 'stamp', 1.1); f.shake(154.9, 0.7, 0.4);
    cue(156.5, 'hit', 0.9);
    const c9 = cap(s, 'Sold with a comic storyboard and a live 3D walkthrough. A lot like this one.', { x: 300, y: 890, w: 1320, rot: -1, cls: 'big' });
    popIn(c9, 157.9); popOut(c9, 159.6);
    const RW = rohit(s);
    appear(RW, 157.7, { ...Rohit.POSES.thumbs, x: 1640, y: 420, s: 0.62, flip: 1, flame: 0.4, bob: 1, mouth: 1, autoBlink: 0, blink: 1 });
    ctl.set(RW.state, { blink: 0.1 }, 158.6);
    ctl.set(RW.state, { blink: 1 }, 158.9);
    cue(158.6, 'twinkle', 0.6);
    vanish(RW, 159.6);
    fadeOut(deck, 159.5, 0.3);
    cmyWipe(159.3);
    tl.set(Space.S, { shot: 'blackhole', dim: 0 }, 159.75);
  }

  // =====================================================================
  // 08 · THE HANDOFF BLACK HOLE (160 to 180)
  // =====================================================================
  function S8() {
    const { tl, ctl, cue, h, css, scene, span, show, hide, fadeIn, fadeOut, cap, popIn, popOut, bub, logo, sfx, slam, FXS, shake, flash, spike, sp, chapter, rohit, appear, vanish, place, poseTo, talk, hooks } = f;
    chapter(160, '08', 'The Handoff', 'Design ⇄ Dev');
    const s = scene(); span(s, 159.8, 180.0);
    tl.set(Space.S, { dim: 0, fade: 0 }, 159.8);
    cue(160.0, 'drone', 10);
    const c1 = cap(s, 'Every ship out here fears one thing.', { x: 120, y: 150, rot: -1.4, cls: 'big' });
    popIn(c1, 160.4); popOut(c1, 162.7);
    const lg = logo(s, 'The Handoff', { center: true, y: 120, size: 150, rot: -3 });
    show(lg, 162.8); tl.fromTo(lg, { scale: 3 }, { scale: 1, duration: 0.4, ease: 'back.out(2.2)' }, 162.8);
    cue(162.8, 'titlehit', 0.9); spike(162.8, 9, 1.2); shake(162.8, 0.8, 0.5);
    tl.to(lg, { autoAlpha: 0, scale: 0.9, duration: 0.3 }, 164.6);
    const c2 = cap(s, 'Where good designs go to die.', { x: 1100, y: 880, rot: 1.2, cls: 'white big' });
    popIn(c2, 163.3); popOut(c2, 166.8);
    for (let i = 0; i < 8; i++) cue(160.4 + i * 0.9, 'suck', 0.6);

    // ship tags and shouting match
    const tagD = h('div', 'chip', s, 'DESIGN'); css(tagD, { position: 'absolute', left: 0, top: 0, background: '#ff2e88', color: '#fff' });
    const tagV = h('div', 'chip', s, 'DEV'); css(tagV, { position: 'absolute', left: 0, top: 0, background: '#00c2ff' });
    gsap.set([tagD, tagV], { autoAlpha: 0 }); show(tagD, 161.0); show(tagV, 161.0); hide(tagD, 178.8); hide(tagV, 178.8);
    const bD = bub(s, "It's 16px!", { x: 0, y: 0, tail: 'bl' });
    const bV = bub(s, 'The spec said 13?', { x: 0, y: 0, tail: 'br' });
    popIn(bD, 164.8); popOut(bD, 166.9);
    popIn(bV, 166.0); popOut(bV, 167.8);
    hooks.push((t) => {
      if (t < 160.9 || t > 178.9 || Space.S.shot !== 'blackhole') return;
      const bh = Space.shots.blackhole;
      const pD = Space.project('blackhole', bh.shipD), pV = Space.project('blackhole', bh.shipV);
      tagD.style.transform = `translate(${(pD.x - 60).toFixed(1)}px, ${(pD.y + 50).toFixed(1)}px)`;
      tagV.style.transform = `translate(${(pV.x - 40).toFixed(1)}px, ${(pV.y + 50).toFixed(1)}px)`;
      bD.style.left = (pD.x - 60).toFixed(1) + 'px'; bD.style.top = (pD.y - 190).toFixed(1) + 'px';
      bV.style.left = (pV.x - 420).toFixed(1) + 'px'; bV.style.top = (pV.y - 190).toFixed(1) + 'px';
    });

    // Rohit flies into the middle
    const R = rohit(s);
    appear(R, 167.6, { ...Rohit.POSES.fly, x: 960, y: 1320, s: 0.78, flip: 1, flame: 1, bob: 1, helmet: 1, mouth: 0 });
    place(R, 167.6, { y: 560 }, 1.2, 'power3.out');
    cue(167.6, 'jet', 1.3);
    poseTo(R, 168.9, 'brace', 0.3, { flame: 0.4, mouth: 3 });
    const both = bub(s, 'I speak both.', { x: 1030, y: 150, tail: 'bl', cls: 'big' });
    popIn(both, 169.3, { sfx: false }); talk(R, 169.3, 0.7); popOut(both, 170.2, 0.15);
    // the drop
    cue(170.5, 'drop', 1.4);
    flash(170.5, 0.7, 0.9); shake(170.5, 1.8, 1.4); spike(170.5, 11, 1.6);
    tl.fromTo(FXS, { speed: 1.5, sx: 960, sy: 470, inner: 360 }, { speed: 0, duration: 1.8, ease: 'power2.out', immediateRender: false }, 170.5);
    poseTo(R, 170.5, 'cheer', 0.15, { mouth: 1, flame: 1 });
    const boom = sfx(s, 'BOTH!', { x: 620, y: 700, rot: -8 });
    slam(boom, 170.55, 0.8, { sfx: false, shake: false });
    // ride the bridge left to right while it builds (positions come from the 3D arc)
    poseTo(R, 171.1, 'fly', 0.3, { flame: 1, mouth: 1 });
    const bh = () => Space.shots.blackhole;
    hooks.push((t) => {
      if (t < 171.0 || t > 175.6 || Space.S.shot !== 'blackhole') return;
      const tq = F.q(t, 12), u = Math.min(1, Math.max(0, (tq - 171.0) / 4.4));
      const p = bh().arc(0.04 + u * 0.92).clone(); p.y += 0.9;
      const sp2 = Space.project('blackhole', p);
      R.state.x = sp2.x; R.state.y = Math.max(330, sp2.y); R.state.s = 0.6; R.state.rot = (u - 0.5) * -24;
    });
    place(R, 175.7, { x: 1600, y: 360, s: 0.7, rot: 0 }, 0.4);
    poseTo(R, 175.8, 'thumbs', 0.3, { flame: 0.4 });
    const tokens = [
      [3, 172.2, '<span class="d">space/16</span> <span class="a">⇄</span> <span class="c">--space-4</span>'],
      [7, 173.0, '<span class="d">color/brand</span> <span class="a">⇄</span> <span class="c">--brand</span>'],
      [11, 173.8, '<span class="d">radius/12</span> <span class="a">⇄</span> <span class="c">--radius-md</span>'],
      [15, 174.6, '<span class="d">Button/Primary</span> <span class="a">⇄</span> <span class="c">&lt;Button/&gt;</span>'],
    ].map(([tile, t, html], i) => {
      const e = h('div', 'token', s, html);
      gsap.set(e, { autoAlpha: 0 });
      show(e, t); tl.fromTo(e, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(2.5)' }, t);
      cue(t, 'token', 1, i);
      hide(e, 178.8);
      return { e, tile, i };
    });
    hooks.push((t) => {
      if (t < 172.1 || t > 178.9 || Space.S.shot !== 'blackhole') return;
      tokens.forEach(({ e, tile, i }) => {
        const p = Space.project('blackhole', bh().tiles[tile]);
        e.style.left = (p.x - e.offsetWidth / 2).toFixed(1) + 'px';
        e.style.top = (p.y + (i % 2 ? 40 : -96)).toFixed(1) + 'px';
      });
    });
    const c3 = cap(s, 'Tokens, components, annotated specs. Nothing gets lost.', { x: 120, y: 880, w: 1000, rot: -1.2, cls: 'big' });
    popIn(c3, 175.7); popOut(c3, 178.8);
    place(R, 178.7, { y: -380 }, 0.6, 'power2.in');
    vanish(R, 179.5);
    tl.fromTo(f.flashEl, { opacity: 0 }, { opacity: 0.95, duration: 0.3, ease: 'power2.in', immediateRender: false }, 179.6);
    tl.set(Space.S, { shot: 'finale' }, 179.9);
  }

  // =====================================================================
  // 09 · GOOD EXPERIENCES (180 to 200)
  // =====================================================================
  function S9() {
    const { tl, ctl, cue, h, css, scene, span, show, hide, fadeIn, fadeOut, K, rise, cap, popIn, popOut, bub, sfx, slam, logo, FXS, sp, chapter, rohit, appear, vanish, place, poseTo, wave, talk, hooks, setConstellation } = f;
    chapter(180, '09', 'Good Experiences', 'Mission complete');
    const s = scene(); span(s, 179.9, 200);
    tl.fromTo(f.flashEl, { opacity: 0.95 }, { opacity: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, 180.0);
    const R = rohit(s);
    appear(R, 180.0, { ...Rohit.POSES.fly, x: 960, y: -300, s: 0.5, flip: 1, flame: 1, bob: 0, helmet: 0, mouth: 1, flag: 0 });
    cue(180.1, 'jet', 1);
    hooks.push((t) => {
      if (t < 180.0 || t > 189.7 || Space.S.shot !== 'finale') return;
      const tq = F.q(t, 12);
      const top = new (Space.THREE().Vector3)(0, 6.0, 0), up = new (Space.THREE().Vector3)(0, 7.0, 0);
      const a = Space.project('finale', top), b = Space.project('finale', up);
      const ppu = Math.hypot(a.x - b.x, a.y - b.y);
      const sLand = Math.max(0.05, (1.9 * ppu) / 480);
      const land = { x: a.x, y: a.y - 172 * sLand };
      const u = Math.min(1, Math.max(0, (tq - 180.0) / 1.2)), e = 1 - Math.pow(1 - u, 3);
      R.state.x = 960 + (land.x - 960) * e;
      R.state.y = -300 + (land.y + 300) * e;
      R.state.s = 0.5 + (sLand - 0.5) * e;
    });
    poseTo(R, 181.2, 'idle', 0.15, { flame: 0 });
    cue(181.2, 'land', 1);
    poseTo(R, 181.5, 'plant', 0.3, { mouth: 1 });
    ctl.fromTo(R.state, { flag: 0 }, { flag: 1, duration: 0.25, immediateRender: false }, 181.6);
    cue(181.6, 'flag', 1);
    const c1 = cap(s, 'Mission: rid the universe of bad experiences.', { x: 120, y: 150, w: 900, rot: -1.4, cls: 'big' });
    popIn(c1, 182.4); popOut(c1, 186.2);
    vanish(R, 189.6);

    // constellation: his initials in the stars
    // one polyline; a point with brk ends a stroke so the next letter starts fresh
    const pts = [];
    [[1260, 420], [1260, 150], [1370, 150], [1412, 204], [1370, 262], [1262, 262], [1410, 420, 1]].forEach(([x, y, br]) => pts.push({ x, y, brk: !!br }));
    [[1500, 420], [1500, 150], [1622, 150], [1664, 206], [1622, 266], [1502, 266, 1]].forEach(([x, y, br]) => pts.push({ x, y, brk: !!br }));
    setConstellation(pts);
    tl.fromTo(FXS, { constel: 0 }, { constel: 1, duration: 2.4, ease: 'power1.inOut' }, 187.0);
    tl.to(FXS, { constel: 0, duration: 0.5 }, 189.4);
    for (let i = 0; i < 12; i++) cue(187.0 + i * 0.2, 'star', 0.5, i);

    // end card, drawn as a comic cover
    sp(189.5, { dim: 0.82 }, 0.6);
    cue(189.6, 'endhit', 1.2);
    f.flash(189.6, 0.45, 0.6); f.shake(189.6, 0.8, 0.6);
    const mast = logo(s, 'Into the UX-Verse', { x: 110, y: 70, size: 80, rot: -2 });
    show(mast, 189.6); tl.fromTo(mast, { scale: 2.2 }, { scale: 1, duration: 0.4, ease: 'back.out(2)' }, 189.6);
    const issue = h('div', 'abs', s, 'No. 1 · Sept 2026');
    css(issue, { right: '110px', top: '86px', background: 'var(--yellow)', color: 'var(--ink)', border: '5px solid var(--ink)', boxShadow: '7px 7px 0 var(--ink)', fontFamily: 'var(--hud)', fontWeight: 700, fontSize: '24px', padding: '10px 18px', letterSpacing: '.08em', textTransform: 'uppercase' });
    gsap.set(issue, { autoAlpha: 0, rotate: 3 }); show(issue, 189.9);
    const name = logo(s, 'Rohit Patle', { x: 110, y: 260, size: 200, rot: -2, white: true });
    show(name, 189.85); tl.fromTo(name, { scale: 2.6, x: -80 }, { scale: 1, x: 0, duration: 0.45, ease: 'back.out(2)' }, 189.85);
    cue(189.85, 'hit', 0.9);
    const ink = { WebkitTextStroke: '9px #0b0a12', paintOrder: 'stroke fill' };
    const k1 = K(s, 'Senior UX/UI Designer · AI UX Designer · Pune, India', '', { left: '118px', top: '500px', fontFamily: 'var(--cap)', fontWeight: 700, fontSize: '46px', color: '#00c2ff', ...ink });
    const k2 = K(s, '7+ years · Enterprise UX · Design systems · Design to code', '', { left: '120px', top: '580px', fontFamily: 'var(--hud)', fontWeight: 700, fontSize: '28px', color: '#fbf7ee', letterSpacing: '.02em', ...ink });
    rise(k1, 190.5); rise(k2, 190.9);
    const links = h('div', 'abs', s, ['in · linkedin.com/in/rohitpatle03', 'Be · behance.net/gallery/227904585', '@ · arohitp43@gmail.com'].map((l) => `<div style="display:inline-block;background:var(--white);color:var(--ink);border:4px solid var(--ink);box-shadow:6px 6px 0 var(--ink);font-family:var(--hud);font-weight:700;font-size:28px;padding:8px 16px;margin-bottom:16px">${l}</div>`).join('<br>'));
    css(links, { left: '120px', top: '660px' });
    gsap.set(links, { autoAlpha: 0 });
    show(links, 191.4); tl.fromTo(links.children, { x: -60, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.4, stagger: 0.15, ease: 'back.out(1.6)' }, 191.4);
    [191.4, 191.55, 191.7].forEach((t) => cue(t, 'pop', 0.6));
    const RE = rohit(s);
    appear(RE, 190.1, { ...Rohit.POSES.fly, x: 2200, y: 700, s: 1.15, flip: -1, flame: 1, bob: 1, helmet: 0, mouth: 0, flag: 0 });
    place(RE, 190.1, { x: 1500, y: 860 }, 0.8, 'power3.out');
    poseTo(RE, 190.9, 'wave', 0.3, { flame: 0.3, flip: 1, mouth: 1 });
    wave(RE, 191.2, 5);
    const bb = bub(s, 'hello, world.', { x: 1080, y: 200, tail: 'br', cls: 'big' });
    popIn(bb, 192.0); talk(RE, 192.0, 1.0);
    const tbc = sfx(s, 'To be continued...', { x: 1020, y: 940, rot: -4, cls: 's90' });
    show(tbc, 193.6); tl.fromTo(tbc, { scale: 0 }, { scale: 1, duration: 0.4, ease: 'back.out(2.4)' }, 193.6);
    cue(193.6, 'hit', 0.6);
    tl.fromTo(f.fadeEl, { opacity: 0 }, { opacity: 1, duration: 1.8, ease: 'power1.in', immediateRender: false }, 198.1);
  }

  function build() {
    f = F;
    S0(); S1(); PaperScene.build(); S3(); S4(); S5(); S6(); S7(); S8(); S9();
    f.chapter(22, '02', 'Planet Nagpur', '2015 · Orange City');
    f.finishChapters(189.4);
    f.hudBL.textContent = 'Into the UX-Verse · Rohit Patle';
    f.tl.fromTo(f.hud, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 21.6);
    f.tl.to(f.hud, { autoAlpha: 0, duration: 0.4 }, 189.4);
    f.CHAPTERS.sort((a, b) => a.t - b.t);
    f.CUES.sort((a, b) => a[0] - b[0]);
  }
  return { build };
})();
