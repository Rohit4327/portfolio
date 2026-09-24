/*
 * Rohit, the character. A layered SVG rig: every joint is a <g> whose transform is
 * written from a plain state object, so GSAP can tween poses and the film can
 * sample them on twos (12fps) for the hand-animated look.
 * Local space: origin at the hips, y grows downward, head top near y = -310.
 */
window.Rohit = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const INK = '#0b0a12';
  let uid = 0;

  const PALETTE = {
    skin: '#b97a56', skinDark: '#8a5236', skinHi: '#d59a72',
    hair: '#17110f', beard: '#1c1616', tee: '#16151d', teeHi: '#34313f',
    pants: '#2b3a67', pantsDark: '#1d2748', shoe: '#f4eee1', sole: '#9aa0b4',
    tank: '#ff4a3d', tankDark: '#c42a22', metal: '#c9ccd8', rimC: '#00c2ff', rimM: '#ff2e88',
  };
  const PAPER = {
    skin: '#c9906c', skinDark: '#a06a4c', skinHi: '#dcae8c',
    hair: '#2a2220', beard: '#2c2422', tee: '#2a2833', teeHi: '#45414f',
    pants: '#4d5a86', pantsDark: '#39446a', shoe: '#f6f0e2', sole: '#b9bccb',
    tank: '#e8604f', tankDark: '#b9443a', metal: '#d6d2c6', rimC: '#7fd4ee', rimM: '#f08bb4',
  };

  // Poses: joint angles in degrees. Arms: 0 = hanging down; positive swings the
  // screen-left arm (A) outward, negative swings the screen-right arm (B) outward.
  const POSES = {
    idle:   { aSh: 8, aEl: -12, bSh: -8, bEl: 12, lA: 4, kA: -2, lB: -4, kB: 2, head: 0, lean: 0 },
    wave:   { aSh: 10, aEl: -14, bSh: -150, bEl: -28, lA: 4, kA: -2, lB: -4, kB: 2, head: -6, lean: -2 },
    fly:    { aSh: 38, aEl: -40, bSh: -38, bEl: 40, lA: 14, kA: 26, lB: -6, kB: 34, head: -4, lean: 10 },
    point:  { aSh: 10, aEl: -14, bSh: -98, bEl: -6, lA: 4, kA: -2, lB: -4, kB: 2, head: -8, lean: -3 },
    pointL: { aSh: 98, aEl: 6, bSh: -8, bEl: 12, lA: 4, kA: -2, lB: -4, kB: 2, head: 8, lean: 3 },
    type:   { aSh: -24, aEl: -70, bSh: 24, bEl: 70, lA: 30, kA: -60, lB: -30, kB: 60, head: 6, lean: 0 },
    think:  { aSh: 12, aEl: -16, bSh: -34, bEl: -128, lA: 4, kA: -2, lB: -4, kB: 2, head: 8, lean: 0 },
    cheer:  { aSh: 150, aEl: 20, bSh: -150, bEl: -20, lA: 10, kA: -4, lB: -10, kB: 4, head: -10, lean: 0 },
    thumbs: { aSh: 10, aEl: -14, bSh: -60, bEl: -100, lA: 4, kA: -2, lB: -4, kB: 2, head: -4, lean: -2 },
    plant:  { aSh: 14, aEl: -18, bSh: -40, bEl: -120, lA: 10, kA: -4, lB: -8, kB: 4, head: -8, lean: -3 },
    sweat:  { aSh: 30, aEl: -120, bSh: -30, bEl: 120, lA: 6, kA: -4, lB: -6, kB: 4, head: 4, lean: 2 },
    brace:  { aSh: 70, aEl: -30, bSh: -70, bEl: 30, lA: 22, kA: -10, lB: -22, kB: 10, head: 0, lean: 0 },
  };
  const MOUTHS = ['smile', 'grin', 'o', 'flat', 'talk'];

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const g = (parent, attrs = {}) => el('g', attrs, parent);
  const stroke = (w = 5) => ({ stroke: INK, 'stroke-width': w, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });

  function make(parent, opts = {}) {
    const id = 'r' + (++uid);
    const C = opts.paper ? PAPER : PALETTE;
    const wrap = document.createElement('div');
    wrap.className = 'rohit' + (opts.paper ? ' paperish' : '');
    Object.assign(wrap.style, { position: 'absolute', left: '-160px', top: '-340px', width: '320px', height: '560px', transformOrigin: '160px 340px', pointerEvents: 'none' });
    parent.appendChild(wrap);
    const svg = el('svg', { viewBox: '-160 -340 320 560', width: 320, height: 560, overflow: 'visible' }, null);
    wrap.appendChild(svg);

    const defs = el('defs', {}, svg);
    defs.innerHTML = `
      <pattern id="${id}ht" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.9" fill="${C.skinDark}"/></pattern>
      <pattern id="${id}htp" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="2" fill="${C.pantsDark}"/></pattern>
      <pattern id="${id}htt" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.8" fill="${C.tankDark}"/></pattern>
      <radialGradient id="${id}flame" cx="50%" cy="20%" r="80%"><stop offset="0" stop-color="#fff7c2"/><stop offset=".35" stop-color="#ffd23f"/><stop offset=".7" stop-color="#ff6a2a"/><stop offset="1" stop-color="#ff2e88" stop-opacity="0"/></radialGradient>`;

    const root = g(svg);
    const body = g(root);

    // ---- jetpack (behind everything) ----
    const pack = g(body);
    const flames = [];
    [-1, 1].forEach((sx) => {
      const x0 = sx * 58;
      const fl = g(pack, { transform: `translate(${x0} -46)` });
      el('path', { d: 'M -13 0 C -16 30 -6 60 0 92 C 6 60 16 30 13 0 Z', fill: `url(#${id}flame)` }, fl);
      el('path', { d: 'M -6 0 C -7 18 -3 34 0 52 C 3 34 7 18 6 0 Z', fill: '#fffbe6' }, fl);
      flames.push(fl);
      el('rect', { x: x0 - 17, y: -178, width: 34, height: 124, rx: 16, fill: C.tank, ...stroke() }, pack);
      el('rect', { x: x0 + (sx > 0 ? 2 : -12), y: -168, width: 10, height: 104, rx: 5, fill: `url(#${id}htt)` }, pack);
      el('rect', { x: x0 - 17, y: -136, width: 34, height: 10, fill: '#f4eee1', ...stroke(3) }, pack);
      el('path', { d: `M ${x0 - 12} -56 L ${x0 + 12} -56 L ${x0 + 9} -42 L ${x0 - 9} -42 Z`, fill: C.metal, ...stroke(4) }, pack);
    });

    // ---- legs ----
    function leg(sx) {
      const hip = g(body);
      const thigh = g(hip);
      el('rect', { x: -18, y: -6, width: 36, height: 92, rx: 16, fill: C.pants, ...stroke() }, thigh);
      el('rect', { x: sx > 0 ? 2 : -14, y: 4, width: 12, height: 74, rx: 6, fill: `url(#${id}htp)` }, thigh);
      const shin = g(thigh);
      el('rect', { x: -16, y: -6, width: 32, height: 90, rx: 14, fill: C.pants, ...stroke() }, shin);
      el('rect', { x: sx > 0 ? 2 : -12, y: 4, width: 10, height: 70, rx: 5, fill: `url(#${id}htp)` }, shin);
      const shoe = g(shin, { transform: 'translate(0 84)' });
      el('path', { d: `M -18 -8 C -18 -22 16 -22 20 -8 L ${sx > 0 ? 40 : 38} 4 C ${sx > 0 ? 44 : 42} 14 40 18 30 18 L -20 18 C -26 18 -26 8 -18 -8 Z`, fill: C.shoe, ...stroke(4.5) }, shoe);
      el('path', { d: 'M -22 12 L 40 12', stroke: C.sole, 'stroke-width': 5, fill: 'none' }, shoe);
      return { hip, thigh, shin };
    }
    const LA = leg(-1), LB = leg(1);

    // ---- torso ----
    const torso = g(body);
    el('path', { d: 'M -58 -154 C -70 -110 -60 -50 -48 4 L 48 4 C 60 -50 70 -110 58 -154 C 30 -166 -30 -166 -58 -154 Z', fill: C.tee, ...stroke() }, torso);
    el('path', { d: 'M -50 -140 C -58 -100 -52 -52 -42 -6', stroke: C.teeHi, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, torso);
    // white crescent print, like the tee in Rohit's photo
    el('path', { d: 'M 10 -120 A 27 27 0 0 0 10 -66 A 36 36 0 0 1 10 -120 Z', fill: '#f4eee1' }, torso);
    el('path', { d: 'M -46 -2 L 46 -2', stroke: '#26252f', 'stroke-width': 8 }, torso);
    // rim lights
    el('path', { d: 'M 60 -150 C 68 -110 62 -60 50 -4', stroke: C.rimC, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round', opacity: 0.9 }, torso);

    // ---- neck + head ----
    const neck = g(body);
    el('path', { d: 'M -16 -176 L 16 -176 L 18 -150 C 6 -144 -6 -144 -18 -150 Z', fill: C.skin, ...stroke(4.5) }, neck);
    el('path', { d: 'M -18 -156 C -6 -150 6 -150 18 -156 L 18 -150 C 6 -144 -6 -144 -18 -150 Z', fill: `url(#${id}ht)` }, neck);

    const head = g(body);
    const H = g(head);
    // ears
    el('ellipse', { cx: -46, cy: -226, rx: 10, ry: 15, fill: C.skin, ...stroke(4.5) }, H);
    el('ellipse', { cx: 46, cy: -226, rx: 10, ry: 15, fill: C.skin, ...stroke(4.5) }, H);
    // face
    el('path', { d: 'M -44 -252 C -46 -296 46 -296 44 -252 L 45 -206 C 45 -170 22 -150 0 -148 C -22 -150 -45 -170 -45 -206 Z', fill: C.skin, ...stroke() }, H);
    el('path', { d: 'M 20 -262 C 38 -256 44 -236 44 -212 C 40 -214 32 -224 26 -238 Z', fill: `url(#${id}ht)` }, H);
    // beard
    el('path', { d: 'M -45 -234 L -45 -206 C -45 -168 -22 -144 0 -142 C 22 -144 45 -168 45 -206 L 45 -234 C 40 -216 36 -200 27 -192 C 17 -183 8 -186 0 -186 C -8 -186 -17 -183 -27 -192 C -36 -200 -40 -216 -45 -234 Z', fill: C.beard, ...stroke(4) }, H);
    el('path', { d: 'M -30 -168 C -20 -156 -8 -152 0 -152', stroke: '#3b3232', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, H);
    // mouth variants (drawn inside the beard)
    const mouths = {};
    mouths.smile = el('path', { d: 'M -13 -178 Q 0 -168 13 -178', fill: 'none', stroke: '#f4eee1', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, H);
    mouths.grin = g(H);
    el('path', { d: 'M -15 -180 Q 0 -160 15 -180 Z', fill: '#f4eee1', stroke: '#f4eee1', 'stroke-width': 2, 'stroke-linejoin': 'round' }, mouths.grin);
    mouths.o = el('ellipse', { cx: 0, cy: -174, rx: 6, ry: 8, fill: '#5a1f22', stroke: '#f4eee1', 'stroke-width': 2 }, H);
    mouths.flat = el('path', { d: 'M -10 -176 L 10 -176', fill: 'none', stroke: '#f4eee1', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, H);
    mouths.talk = el('path', { d: 'M -12 -179 Q 0 -166 12 -179 Q 0 -174 -12 -179 Z', fill: '#5a1f22', stroke: '#f4eee1', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, H);
    // mustache
    el('path', { d: 'M -22 -190 C -13 -199 -4 -197 0 -193 C 4 -197 13 -199 22 -190 C 13 -187 4 -189 0 -186 C -4 -189 -13 -187 -22 -190 Z', fill: C.beard, stroke: C.beard, 'stroke-width': 2 }, H);
    // nose
    el('path', { d: 'M -1 -226 C 4 -214 9 -206 2 -201 C -2 -199 -6 -201 -8 -203', fill: 'none', stroke: INK, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, H);
    // eyes
    const eyes = g(H);
    [-18, 18].forEach((x) => {
      const e = g(eyes, {});
      el('ellipse', { cx: x, cy: -230, rx: 10, ry: 8, fill: '#fbf7ee', stroke: INK, 'stroke-width': 3 }, e);
      el('circle', { cx: x + 0.8, cy: -229.5, r: 4.8, fill: '#2a1a12' }, e);
      el('circle', { cx: x + 2.4, cy: -231.6, r: 1.6, fill: '#fff' }, e);
    });
    // brows
    const brows = g(H);
    el('path', { d: 'M -30 -244 C -22 -251 -12 -251 -6 -247', fill: 'none', stroke: C.hair, 'stroke-width': 7, 'stroke-linecap': 'round' }, brows);
    el('path', { d: 'M 6 -247 C 12 -251 22 -251 30 -244', fill: 'none', stroke: C.hair, 'stroke-width': 7, 'stroke-linecap': 'round' }, brows);
    // hair: short sides, textured quiff
    el('path', { d: 'M -47 -238 C -52 -282 -30 -310 2 -312 C 36 -316 58 -290 48 -240 C 46 -256 40 -266 30 -268 C 20 -282 -2 -286 -16 -276 C -30 -272 -42 -260 -47 -238 Z', fill: C.hair, ...stroke(4.5) }, H);
    el('path', { d: 'M -20 -300 C -6 -306 14 -306 28 -298 M -30 -290 C -16 -298 2 -299 16 -294', fill: 'none', stroke: '#3c3431', 'stroke-width': 3, 'stroke-linecap': 'round' }, H);
    el('path', { d: 'M 34 -300 C 48 -290 52 -270 48 -246', fill: 'none', stroke: C.rimM, 'stroke-width': 3.5, 'stroke-linecap': 'round', opacity: 0.95 }, H);
    el('path', { d: 'M -44 -212 C -44 -190 -34 -170 -20 -158', fill: 'none', stroke: C.rimC, 'stroke-width': 3.5, 'stroke-linecap': 'round', opacity: 0.9 }, H);
    // sweat drop (for Hick's law)
    const sweat = el('path', { d: 'M 52 -262 C 58 -250 62 -244 58 -238 C 54 -233 47 -236 48 -243 C 48 -248 50 -254 52 -262 Z', fill: '#7fd8ff', ...stroke(3) }, H);
    // helmet
    const helmet = g(head);
    el('circle', { cx: 0, cy: -228, r: 96, fill: 'rgba(160,220,255,0.10)', stroke: 'rgba(235,248,255,0.85)', 'stroke-width': 4 }, helmet);
    el('path', { d: 'M -62 -286 A 82 82 0 0 1 -8 -312', fill: 'none', stroke: '#fff', 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0.8 }, helmet);
    el('path', { d: 'M 70 -196 A 82 82 0 0 1 44 -160', fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.55 }, helmet);
    el('ellipse', { cx: 0, cy: -148, rx: 58, ry: 14, fill: C.metal, ...stroke(4.5) }, helmet);

    // ---- arms (in front) ----
    function arm(sx) {
      const sh = g(body);
      const upper = g(sh);
      el('rect', { x: -15, y: -10, width: 30, height: 76, rx: 14, fill: C.skin, ...stroke() }, upper);
      el('path', { d: 'M -19 -14 L 19 -14 L 20 30 C 8 36 -8 36 -20 30 Z', fill: C.tee, ...stroke() }, upper);
      const patches = g(upper);
      const fore = g(upper);
      el('rect', { x: -13, y: -8, width: 26, height: 68, rx: 12, fill: C.skin, ...stroke() }, fore);
      el('rect', { x: sx > 0 ? 0 : -9, y: 2, width: 9, height: 50, rx: 4, fill: `url(#${id}ht)` }, fore);
      const hand = g(fore, { transform: 'translate(0 66)' });
      el('circle', { cx: 0, cy: 0, r: 15, fill: C.skin, ...stroke(4.5) }, hand);
      el('path', { d: `M ${sx * 10} -8 C ${sx * 20} -12 ${sx * 22} -2 ${sx * 13} 3`, fill: C.skin, ...stroke(4) }, hand);
      return { sh, upper, fore, patches };
    }
    const AA = arm(-1), AB = arm(1);

    // mission patches on the screen-left sleeve
    const pG = g(AA.patches, { transform: 'translate(0 8)' });
    const patch1 = g(pG, { transform: 'translate(-5 0)' });
    el('circle', { cx: 0, cy: 0, r: 12, fill: '#fbf7ee', stroke: '#4285f4', 'stroke-width': 3 }, patch1);
    el('text', { x: 0, y: 4, 'text-anchor': 'middle', 'font-family': 'Anton, Impact, sans-serif', 'font-size': 11, fill: '#0b0a12' }, patch1).textContent = 'UX';
    const patch2 = g(pG, { transform: 'translate(12 16)' });
    el('path', { d: 'M -9 -10 L 9 -10 L 9 2 C 9 8 3 12 0 13 C -3 12 -9 8 -9 2 Z', fill: '#ffd23f', ...stroke(2.5) }, patch2);
    el('text', { x: 0, y: 3, 'text-anchor': 'middle', 'font-family': 'Anton, Impact, sans-serif', 'font-size': 7, fill: '#0b0a12' }, patch2).textContent = 'CXA';

    // flag planted beside him; the plant pose puts the hand on the pole
    const flag = g(body);
    body.insertBefore(flag, AB.sh);
    el('rect', { x: 112, y: -340, width: 9, height: 516, fill: C.metal, ...stroke(3.5) }, flag);
    el('path', { d: 'M 121 -336 L 250 -312 L 121 -262 Z', fill: '#ff2e88', ...stroke(4) }, flag);
    el('text', { x: 150, y: -294, 'font-family': 'Anton, Impact, sans-serif', 'font-size': 30, fill: '#fff' }, flag).textContent = 'RP';

    if (opts.paper) wrap.style.filter = 'url(#paperEdge) drop-shadow(0 8px 0 rgba(60,40,20,.28))';

    const state = { x: 0, y: 0, s: 1, rot: 0, flip: 1, o: 1, ...POSES.idle, bob: 0, flame: 0, blink: 1, mouth: 0, brow: 0, helmet: 0, sweat: 0, patches: 0, flag: 0, autoBlink: 1 };
    const rig = {
      el: wrap, state, poses: POSES,
      pose(name) { return { ...POSES[name] }; },
      apply(t) {
        const s = state;
        wrap.style.opacity = s.o;
        wrap.style.visibility = s.o > 0.001 ? 'visible' : 'hidden';
        if (s.o <= 0.001) return;
        wrap.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.rot}deg) scale(${s.s * s.flip}, ${s.s})`;
        const bob = Math.sin(t * 2.4) * 6 * s.bob;
        body.setAttribute('transform', `translate(0 ${bob}) rotate(${s.lean} 0 0)`);
        head.setAttribute('transform', `rotate(${s.head} 0 -160)`);
        AA.sh.setAttribute('transform', 'translate(-54 -142)');
        AA.upper.setAttribute('transform', `rotate(${s.aSh})`);
        AA.fore.setAttribute('transform', `translate(0 62) rotate(${s.aEl})`);
        AB.sh.setAttribute('transform', 'translate(54 -142)');
        AB.upper.setAttribute('transform', `rotate(${s.bSh})`);
        AB.fore.setAttribute('transform', `translate(0 62) rotate(${s.bEl})`);
        LA.hip.setAttribute('transform', 'translate(-24 -2)');
        LA.thigh.setAttribute('transform', `rotate(${s.lA})`);
        LA.shin.setAttribute('transform', `translate(0 84) rotate(${s.kA})`);
        LB.hip.setAttribute('transform', 'translate(24 -2)');
        LB.thigh.setAttribute('transform', `rotate(${s.lB})`);
        LB.shin.setAttribute('transform', `translate(0 84) rotate(${s.kB})`);
        // automatic blink every ~3.7s unless the scene overrides it
        let bl = s.blink;
        if (s.autoBlink) { const ph = (t + 1.3) % 3.7; if (ph < 0.12) bl = Math.min(bl, 0.1); }
        eyes.setAttribute('transform', `translate(0 -230) scale(1 ${Math.max(0.08, bl)}) translate(0 230)`);
        brows.setAttribute('transform', `translate(0 ${s.brow})`);
        const m = MOUTHS[Math.round(s.mouth) % MOUTHS.length];
        for (const k in mouths) mouths[k].style.display = k === m ? '' : 'none';
        helmet.style.display = s.helmet > 0.01 ? '' : 'none';
        helmet.setAttribute('opacity', s.helmet);
        sweat.style.display = s.sweat > 0.01 ? '' : 'none';
        sweat.setAttribute('transform', `translate(0 ${(1 - s.sweat) * -10})`);
        pG.style.display = s.patches > 0.01 ? '' : 'none';
        patch1.setAttribute('opacity', Math.min(1, s.patches * 2));
        patch2.setAttribute('opacity', Math.max(0, Math.min(1, s.patches * 2 - 1)));
        flag.style.display = s.flag > 0.01 ? '' : 'none';
        flag.setAttribute('opacity', s.flag);
        const fl = s.flame * (0.82 + 0.18 * Math.sin(t * 40) * Math.sin(t * 23));
        flames.forEach((f, i) => {
          f.style.display = s.flame > 0.02 ? '' : 'none';
          f.setAttribute('transform', `translate(${(i ? 58 : -58)} -46) scale(${0.8 + 0.2 * fl} ${fl})`);
        });
      },
    };
    return rig;
  }

  return { make, POSES, MOUTHS };
})();
