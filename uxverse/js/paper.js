/*
 * Chapter 02 · Planet Nagpur, in cut paper. Everything here moves on the paper
 * timeline (8fps) and every piece "boils" (a slight re-cut wobble each frame), the
 * way real stop motion does. Ends with the rocket punching through the paper into 3D.
 */
window.PaperScene = (() => {
  function build() {
    const { tl, ptl, cue, h, css, svgEl, paperEl, show, hide, fadeIn, fadeOut, cap, popIn, popOut, sfx, slam, shake, flash, spike, FXS, rohit, appear, vanish, place, poseTo, talk, boils, hash, rng } = F;

    // paper grain overlay, generated once
    const grainURL = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d'), id = g.createImageData(256, 256), r = rng(5);
      for (let i = 0; i < id.data.length; i += 4) { const v = 200 + r() * 55; id.data[i] = v; id.data[i + 1] = v - 6; id.data[i + 2] = v - 18; id.data[i + 3] = 255; }
      g.putImageData(id, 0, 0);
      g.strokeStyle = 'rgba(120,90,50,.18)';
      for (let i = 0; i < 90; i++) { g.beginPath(); const x = r() * 256, y = r() * 256; g.moveTo(x, y); g.quadraticCurveTo(x + r() * 20 - 10, y + r() * 20 - 10, x + r() * 30 - 15, y + r() * 30 - 15); g.stroke(); }
      return c.toDataURL();
    })();

    const back = svgEl('svg', { width: 1920, height: 1080, viewBox: '0 0 1920 1080' }, paperEl);
    css(back, { position: 'absolute', left: 0, top: 0, overflow: 'visible' });
    back.innerHTML = `<defs>
      <filter id="pp" x="-8%" y="-8%" width="116%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" result="d"/>
        <feDropShadow in="d" dx="0" dy="6" stdDeviation="2.4" flood-color="#4a3218" flood-opacity="0.38"/>
      </filter>
      <filter id="paperEdge" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G"/>
      </filter></defs>`;

    let pieceN = 0;
    const pending = [];
    function piece(parent, inner, o = {}) {
      const outer = svgEl('g', { filter: o.flat ? '' : 'url(#pp)' }, parent);
      const b = svgEl('g', {}, outer);
      b.innerHTML = inner;
      pending.push({ g: b, i: ++pieceN });
      return outer;
    }
    const grp = (parent, attrs = {}) => svgEl('g', attrs, parent);

    // ---------------- exterior ----------------
    const ext = grp(back);
    piece(ext, `<rect x="-40" y="-40" width="2000" height="880" fill="#bfe3e3"/>`, { flat: true });
    const sun = piece(ext, `<g transform="translate(1600 190)">${Array.from({ length: 12 }, (_, i) => `<path d="M -16 -118 L 0 -168 L 16 -118 Z" fill="#ffd23f" transform="rotate(${i * 30})"/>`).join('')}<circle r="92" fill="#ffb347"/><circle r="70" fill="#ffc86a"/></g>`);
    [[300, 170, 1], [820, 120, 0.8], [1240, 240, 0.9]].forEach(([x, y, s]) => piece(ext, `<g transform="translate(${x} ${y}) scale(${s})"><path d="M -120 30 C -130 -10 -80 -30 -60 -10 C -50 -60 20 -70 40 -20 C 70 -40 120 -20 110 30 Z" fill="#fbf7ee"/></g>`));
    piece(ext, `<path d="M -40 780 C 200 640 360 700 560 660 C 760 620 900 700 1120 650 C 1340 600 1500 690 1700 640 C 1820 610 1900 650 1960 640 L 1960 820 L -40 820 Z" fill="#9fd3b5"/>`);
    const sky = grp(ext);
    const bld = [[40, 150, 130], [180, 110, 220], [300, 150, 150], [460, 120, 270], [590, 130, 190], [1290, 120, 210], [1420, 90, 150], [1740, 140, 240], [1850, 110, 170]];
    const bcol = ['#e7d5b1', '#d9c19a', '#cdb48b'];
    const buildings = bld.map(([x, w, hh], i) => {
      let win = '';
      for (let yy = 800 - hh + 24; yy < 780; yy += 34) for (let xx = x + 16; xx < x + w - 20; xx += 30) win += `<rect x="${xx}" y="${yy}" width="14" height="18" fill="#fbf7ee"/>`;
      return piece(sky, `<rect x="${x}" y="${800 - hh}" width="${w}" height="${hh}" fill="${bcol[i % 3]}"/>${win}`);
    });
    const dome = piece(sky, `<rect x="1508" y="700" width="184" height="100" fill="#f4eee1"/><path d="M 1500 704 C 1500 560 1700 560 1700 704 Z" fill="#fbf7ee"/><path d="M 1600 572 L 1600 530" stroke="#d9a066" stroke-width="10"/><circle cx="1600" cy="524" r="12" fill="#ffd23f"/><rect x="1530" y="730" width="140" height="10" fill="#e3d2ae"/>`);
    const zero = piece(sky, `<rect x="1178" y="770" width="150" height="34" fill="#c9965a"/><rect x="1226" y="600" width="54" height="172" fill="#d9a066"/><rect x="1216" y="586" width="74" height="22" fill="#c9965a"/><circle cx="1253" cy="660" r="20" fill="#fbf7ee"/><text x="1253" y="668" text-anchor="middle" font-family="Anton, sans-serif" font-size="22" fill="#0b0a12">0</text>`);
    piece(ext, `<rect x="-40" y="796" width="2000" height="330" fill="#e3d2ae"/><rect x="-40" y="890" width="2000" height="60" fill="#cdbd9a"/>${Array.from({ length: 14 }, (_, i) => `<rect x="${i * 150}" y="916" width="80" height="8" fill="#fbf7ee"/>`).join('')}`);
    const trees = [[170, 890], [560, 910], [1780, 900]].map(([x, y]) => {
      const g = grp(ext, { transform: `translate(${x} ${y})` });
      const t = piece(g, `<rect x="-12" y="-130" width="24" height="130" fill="#8a5a3a"/><circle cx="0" cy="-190" r="95" fill="#4f9f6a"/><circle cx="-50" cy="-150" r="55" fill="#5fb37a"/><circle cx="48" cy="-160" r="60" fill="#5fb37a"/>`);
      const oranges = [[-50, -210], [30, -240], [55, -170], [-20, -150], [-70, -170]].map(([ox, oy]) => piece(g, `<circle cx="${ox}" cy="${oy}" r="15" fill="#ff9a3d"/><path d="M ${ox} ${oy - 15} l 5 -8" stroke="#3f7a4f" stroke-width="4"/>`));
      return { g, t, oranges };
    });
    const college = grp(ext);
    const collegeBody = piece(college, `
      <rect x="690" y="590" width="540" height="310" fill="#f6f0e2"/>
      <path d="M 660 594 L 960 478 L 1260 594 Z" fill="#e3d2ae"/>
      ${[716, 806, 896, 994, 1084, 1174].map((x) => `<rect x="${x}" y="612" width="32" height="270" fill="#fbf7ee" stroke="#d9c19a" stroke-width="3"/>`).join('')}
      <rect x="925" y="770" width="70" height="130" fill="#8a5a3a"/>
      <rect x="670" y="880" width="580" height="22" fill="#d9c19a"/><rect x="650" y="900" width="620" height="18" fill="#cdb48b"/>`);
    const plaque = piece(college, `<rect x="800" y="636" width="320" height="86" fill="#0b0a12"/><text x="960" y="672" text-anchor="middle" font-family="Anton, sans-serif" font-size="30" fill="#ffd23f">NAGPUR UNIVERSITY</text><text x="960" y="708" text-anchor="middle" font-family="Space Mono, monospace" font-weight="700" font-size="22" fill="#fbf7ee">2015 to 2019</text>`);
    const banner = piece(college, `<path d="M 640 458 L 1280 458 L 1260 490 L 1280 522 L 640 522 L 660 490 Z" fill="#ff2e88"/><text x="960" y="502" text-anchor="middle" font-family="Kalam, cursive" font-weight="700" font-size="36" fill="#fff">B.E. Information Technology</text>`);
    const dust = [0, 1, 2, 3, 4, 5].map((i) => piece(college, `<circle cx="${650 + i * 124}" cy="905" r="30" fill="#fbf7ee"/>`));
    // launch site (shown on the way back out)
    const launch = grp(ext);
    const tower = piece(launch, `<rect x="1120" y="520" width="44" height="380" fill="#c9965a"/>${Array.from({ length: 9 }, (_, i) => `<path d="M 1120 ${540 + i * 40} L 1164 ${560 + i * 40}" stroke="#8a5a3a" stroke-width="5"/>`).join('')}<rect x="1060" y="600" width="64" height="14" fill="#8a5a3a"/>`);
    const pad = piece(launch, `<rect x="790" y="880" width="340" height="44" fill="#8f8a9a"/><rect x="820" y="862" width="280" height="22" fill="#b0acb9"/>`);
    const rocket = grp(launch);
    const flames = piece(rocket, `<path d="M 905 880 L 960 1060 L 1015 880 Z" fill="#ff9a3d"/><path d="M 930 880 L 960 1000 L 990 880 Z" fill="#ffd23f"/><path d="M 948 880 L 960 950 L 972 880 Z" fill="#fffbe6"/>`);
    const rBody = piece(rocket, `<path d="M 885 870 L 885 660 C 885 606 925 566 960 548 C 995 566 1035 606 1035 660 L 1035 870 Z" fill="#f6f0e2"/><rect x="885" y="780" width="150" height="30" fill="#ff4a3d"/>`);
    const rNose = piece(rocket, `<path d="M 895 620 C 910 588 935 562 960 548 C 985 562 1010 588 1025 620 Z" fill="#ff4a3d"/>`);
    const finL = piece(rocket, `<path d="M 885 760 L 820 860 L 820 900 L 885 850 Z" fill="#ff4a3d"/>`);
    const finR = piece(rocket, `<path d="M 1035 760 L 1100 860 L 1100 900 L 1035 850 Z" fill="#ff4a3d"/>`);
    const port = piece(rocket, `<circle cx="960" cy="690" r="46" fill="#c9ccd8"/><circle cx="960" cy="690" r="34" fill="#9fd8f0"/>${miniFace(960, 694, 26)}`);
    const smoke = [[-140, 0], [-60, 20], [30, 26], [120, 8], [-200, 40], [190, 36]].map(([dx, dy], i) => piece(launch, `<circle cx="${960 + dx}" cy="${900 + dy}" r="${60 + (i % 3) * 18}" fill="#fbf7ee"/>`));

    // ---------------- interior ----------------
    const int = grp(back);
    piece(int, `<rect x="-40" y="-40" width="2000" height="900" fill="#d9c9a8"/>${Array.from({ length: 24 }, (_, i) => `<rect x="${i * 84}" y="-40" width="30" height="900" fill="#d2c09c"/>`).join('')}`, { flat: true });
    piece(int, `<rect x="-40" y="850" width="2000" height="280" fill="#b98d62"/>${Array.from({ length: 10 }, (_, i) => `<rect x="-40" y="${870 + i * 26}" width="2000" height="4" fill="#a57a51"/>`).join('')}`);
    piece(int, `<rect x="1330" y="150" width="420" height="330" fill="#f6f0e2"/><rect x="1352" y="172" width="376" height="286" fill="#bfe3e3"/><circle cx="1620" cy="360" r="90" fill="#4f9f6a"/><circle cx="1590" cy="330" r="14" fill="#ff9a3d"/><circle cx="1650" cy="380" r="14" fill="#ff9a3d"/><circle cx="1600" cy="400" r="14" fill="#ff9a3d"/><rect x="1536" y="172" width="10" height="286" fill="#f6f0e2"/>`);
    piece(int, `<rect x="300" y="170" width="230" height="300" fill="#fbf7ee"/><text x="415" y="320" text-anchor="middle" font-family="Space Mono, monospace" font-weight="700" font-size="84" fill="#0b0a12">&lt;/&gt;</text><text x="415" y="400" text-anchor="middle" font-family="Kalam, cursive" font-weight="700" font-size="30" fill="#ff2e88">hello, world</text><circle cx="415" cy="186" r="9" fill="#ff2e88"/>`);

    // Rohit, in paper, behind the desk
    const R = rohit(paperEl, { paper: true });

    const front = svgEl('svg', { width: 1920, height: 1080, viewBox: '0 0 1920 1080' }, paperEl);
    css(front, { position: 'absolute', left: 0, top: 0, overflow: 'visible' });
    const fint = grp(front);
    const desk = piece(fint, `<rect x="560" y="702" width="900" height="44" fill="#9a6a44"/><rect x="590" y="744" width="840" height="190" fill="#b27b4f"/><rect x="620" y="930" width="40" height="110" fill="#8a5a3a"/><rect x="1360" y="930" width="40" height="110" fill="#8a5a3a"/><rect x="900" y="690" width="250" height="18" fill="#e8dcc0"/>`);
    const mug = piece(fint, `<rect x="640" y="638" width="62" height="66" rx="8" fill="#ff2e88"/><path d="M 702 652 C 728 652 728 690 702 690" fill="none" stroke="#ff2e88" stroke-width="10"/><path d="M 656 620 C 646 600 668 590 658 570 M 684 620 C 674 600 696 590 686 570" fill="none" stroke="#fbf7ee" stroke-width="5"/>`);
    const monitor = piece(fint, `<rect x="1070" y="452" width="340" height="262" rx="18" fill="#e8dcc0"/><rect x="1094" y="476" width="292" height="200" rx="8" fill="#16242a"/><rect x="1196" y="712" width="90" height="16" fill="#cdbd9a"/>`);
    const lines = [];
    for (let i = 0; i < 6; i++) lines.push(piece(fint, `<rect x="1112" y="${494 + i * 28}" width="${60 + ((i * 53) % 170)}" height="12" fill="${i % 3 === 1 ? '#ffd23f' : '#7dff9a'}"/>`, { flat: true }));
    const strips = ['if (it_works) {', 'for (i = 0; ...)', '</div>', 'return true;', 'SELECT * FROM', 'console.log()', '{ }'].map((txt, i) => {
      const w = 40 + txt.length * 17;
      return piece(fint, `<g><rect x="${-w / 2}" y="-26" width="${w}" height="52" fill="#fbf7ee"/><text x="0" y="10" text-anchor="middle" font-family="Space Mono, monospace" font-weight="700" font-size="26" fill="#0b0a12">${txt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text></g>`);
    });
    // "on screen" inset: a form no one enjoys
    const inset = grp(front);
    const insetPanel = piece(inset, `
      <rect x="480" y="200" width="960" height="600" fill="#fbf7ee" stroke="#0b0a12" stroke-width="10"/>
      <rect x="500" y="220" width="600" height="46" fill="#9aa0b4"/><text x="516" y="252" font-family="Space Mono, monospace" font-weight="700" font-size="22" fill="#0b0a12">Registration_Form_v3.2_FINAL</text>
      ${Array.from({ length: 18 }, (_, i) => `<rect x="${510 + (i % 3) * 196}" y="${290 + Math.floor(i / 3) * 70}" width="170" height="16" fill="#cdbd9a"/><rect x="${510 + (i % 3) * 196}" y="${310 + Math.floor(i / 3) * 70}" width="170" height="30" fill="#fff" stroke="#9aa0b4" stroke-width="3"/>`).join('')}
      <text x="512" y="742" font-family="Space Mono, monospace" font-weight="700" font-size="22" fill="#e11">* Error 0x80004005. Invalid input.</text>
      <rect x="1030" y="720" width="90" height="36" fill="#cdbd9a"/><text x="1075" y="745" text-anchor="middle" font-family="Space Mono, monospace" font-size="16" fill="#0b0a12">SUBMIT</text>`);
    const user = piece(inset, `
      <g transform="translate(1270 640)">
        <path d="M -52 -40 C -80 -140 -30 -200 0 -200" fill="none" stroke="#b97a56" stroke-width="18" stroke-linecap="round"/>
        <path d="M 52 -40 C 80 -140 30 -200 0 -200" fill="none" stroke="#b97a56" stroke-width="18" stroke-linecap="round"/>
        <rect x="-50" y="-60" width="100" height="150" rx="30" fill="#4d7cc9"/>
        <circle cx="0" cy="-120" r="48" fill="#c9906c"/><path d="M -24 -126 l 14 8 M 24 -126 l -14 8" stroke="#0b0a12" stroke-width="6" stroke-linecap="round"/>
        <path d="M -18 -96 C -8 -106 8 -106 18 -96" fill="none" stroke="#0b0a12" stroke-width="6" stroke-linecap="round"/>
        <rect x="-40" y="90" width="26" height="80" fill="#39446a"/><rect x="14" y="90" width="26" height="80" fill="#39446a"/>
      </g>`);
    const scribble = piece(inset, `<g transform="translate(1270 360)"><path d="M -110 30 C -130 -30 -60 -60 -30 -40 C -10 -90 70 -80 80 -30 C 130 -40 140 30 100 40 C 80 70 -70 70 -110 30 Z" fill="#fbf7ee" stroke="#0b0a12" stroke-width="6"/><text x="-10" y="18" text-anchor="middle" font-family="Bangers, sans-serif" font-size="56" fill="#e11">#@!%?</text></g>`);
    const bulb = piece(front, `<g transform="translate(800 330)">${Array.from({ length: 8 }, (_, i) => `<path d="M -8 -76 L 0 -112 L 8 -76 Z" fill="#ffd23f" transform="rotate(${i * 45})"/>`).join('')}<circle r="52" fill="#ffd23f"/><circle r="36" fill="#fff4b0"/><rect x="-22" y="44" width="44" height="34" fill="#9aa0b4"/><path d="M -22 56 L 22 56 M -22 68 L 22 68" stroke="#6c6880" stroke-width="4"/></g>`);
    // first job: badge and wireframes
    const badgeOuter = grp(front);
    const badge = grp(badgeOuter, { transform: 'translate(1300 -20)' });
    piece(badge, `<path d="M -60 0 L -10 400 M 60 0 L 10 400" stroke="#ff2e88" stroke-width="10"/><rect x="-150" y="400" width="300" height="430" rx="18" fill="#fbf7ee"/><rect x="-150" y="400" width="300" height="84" rx="18" fill="#ff2e88"/><rect x="-150" y="460" width="300" height="24" fill="#ff2e88"/><text x="0" y="440" text-anchor="middle" font-family="Anton, sans-serif" font-size="30" fill="#fff">KLOUDS ANCYBER</text><text x="0" y="472" text-anchor="middle" font-family="Space Mono, monospace" font-weight="700" font-size="16" fill="#fff">TECHNOLOGIES</text>${miniFace(0, 580, 70)}<text x="0" y="712" text-anchor="middle" font-family="Anton, sans-serif" font-size="46" fill="#0b0a12">WEB DESIGNER</text><text x="0" y="760" text-anchor="middle" font-family="Space Mono, monospace" font-weight="700" font-size="24" fill="#6c6880">NAGPUR · 2019</text><rect x="-100" y="782" width="200" height="22" fill="#0b0a12"/>`);
    const wires = [['STUDENT PORTAL', 90, 200, -4], ['SINGLE-PAGE APP', 150, 470, 3], ['UI GUIDELINES', 60, 720, -2]].map(([label, x, y, rot]) => piece(front, `<g transform="translate(${x} ${y}) rotate(${rot})"><rect width="330" height="220" fill="#fbf7ee"/><rect x="18" y="18" width="294" height="30" fill="#9fd3b5"/><rect x="18" y="62" width="130" height="100" fill="#cdbd9a"/><rect x="162" y="62" width="150" height="16" fill="#cdbd9a"/><rect x="162" y="88" width="120" height="16" fill="#cdbd9a"/><rect x="162" y="114" width="150" height="16" fill="#cdbd9a"/><text x="18" y="200" font-family="Kalam, cursive" font-weight="700" font-size="28" fill="#0b0a12">${label}</text><circle cx="165" cy="6" r="10" fill="#ff2e88"/></g>`));
    const edgeSvg = svgEl('svg', { class: 'edge', width: 1920, height: 1080, viewBox: '0 0 1920 1080' }, paperEl);
    const grain = h('div', 'grain', paperEl); css(grain, { backgroundImage: `url(${grainURL})` });
    const tornPath = svgEl('path', { d: '', fill: 'none', stroke: '#fbf7ee', 'stroke-width': 18, 'stroke-linejoin': 'round' }, edgeSvg);
    const tornShadow = svgEl('path', { d: '', fill: 'none', stroke: 'rgba(60,40,20,.45)', 'stroke-width': 30, 'stroke-linejoin': 'round', transform: 'translate(0 6)' }, edgeSvg);
    edgeSvg.insertBefore(tornShadow, tornPath);

    function miniFace(cx, cy, r) {
      const s = r / 30;
      return `<g transform="translate(${cx} ${cy}) scale(${s})"><circle r="30" fill="#c9906c"/><path d="M -30 -4 C -32 -30 -14 -40 2 -40 C 22 -42 34 -28 30 -6 C 26 -18 16 -24 4 -24 C -10 -26 -22 -18 -30 -4 Z" fill="#2a2220"/><path d="M -28 2 C -28 24 -14 34 0 34 C 14 34 28 24 28 2 C 22 14 12 18 0 18 C -12 18 -22 14 -28 2 Z" fill="#2c2422"/><circle cx="-10" cy="-2" r="4" fill="#0b0a12"/><circle cx="10" cy="-2" r="4" fill="#0b0a12"/><path d="M -8 16 Q 0 22 8 16" fill="none" stroke="#fbf7ee" stroke-width="3" stroke-linecap="round"/></g>`;
    }

    // boil centers need layout, so collect them once everything is in the DOM
    F.hooks.unshift(function initBoil() {
      if (initBoil.done) return;
      initBoil.done = true;
      pending.forEach((p) => { let b = { x: 960, y: 540, width: 0, height: 0 }; try { b = p.g.getBBox(); } catch (e) { /* not laid out */ } boils.push({ g: p.g, i: p.i, cx: (b.x + b.width / 2).toFixed(1), cy: (b.y + b.height / 2).toFixed(1) }); });
    });

    // ================= timing =================
    // paper world comes down like a sheet, stepped at 8fps
    const P = F.paperEl;
    show(P, 21.0);
    ptl.fromTo(P, { y: -1100 }, { y: 0, duration: 0.9, ease: 'power2.in' }, 21.0);
    cue(21.0, 'rustle', 1.0);
    tl.set(F.hud, { attr: { class: 'onpaper' } }, 21.6);
    tl.set(F.hud, { attr: { class: '' } }, 50.3);
    gsap.set([int, fint, inset, bulb, badgeOuter, ...wires, launch, college], { autoAlpha: 0 });

    // skyline and oranges
    buildings.concat([dome, zero]).forEach((b, i) => ptl.fromTo(b, { y: 420 }, { y: 0, duration: 0.25, ease: 'back.out(1.6)' }, 22.1 + i * 0.12));
    for (let i = 0; i < 5; i++) cue(22.1 + i * 0.25, 'snip', 0.7);
    trees.forEach((tr, i) => {
      ptl.fromTo(tr.t, { scale: 0, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.5, ease: 'back.out(2)' }, 22.9 + i * 0.2);
      tr.oranges.forEach((o, j) => ptl.fromTo(o, { y: -420 }, { y: 0, duration: 0.6, ease: 'bounce.out' }, 23.5 + i * 0.25 + j * 0.12));
    });
    for (let i = 0; i < 6; i++) cue(23.9 + i * 0.22, 'boing', 0.5);
    ptl.fromTo(sun, { rotation: 0, svgOrigin: '1600 190' }, { rotation: 40, duration: 27, ease: 'none' }, 21.5);

    const c1 = cap(F.world, 'Nagpur. The Orange City.', { x: 110, y: 150, rot: -1.5 });
    popIn(c1, 22.8); popOut(c1, 29.4);
    const c2 = cap(F.world, 'Zero Mile: the dead center of India.', { x: 1010, y: 330, rot: 1.2, cls: 'white' });
    popIn(c2, 24.4); popOut(c2, 25.9);

    // college stamps down
    show(college, 25.95);
    ptl.fromTo(collegeBody, { y: -760 }, { y: 0, duration: 0.25, ease: 'power3.in' }, 25.95);
    ptl.fromTo(plaque, { y: -760 }, { y: 0, duration: 0.25, ease: 'power3.in' }, 25.95);
    cue(26.2, 'stamp', 1); shake(26.2, 0.8, 0.4);
    dust.forEach((d, i) => ptl.fromTo(d, { scale: 0, opacity: 1, transformOrigin: 'center' }, { scale: 1.6, opacity: 0, x: (i - 2.5) * 30, duration: 0.8, ease: 'power2.out' }, 26.2));
    ptl.fromTo(banner, { scaleX: 0, svgOrigin: '960 490' }, { scaleX: 1, duration: 0.4, ease: 'back.out(1.5)' }, 26.6);
    cue(26.6, 'rustle', 0.4);
    const c3 = cap(F.world, 'Four years of engineering taught me to make things work.', { x: 110, y: 270, rot: -1, w: 760 });
    popIn(c3, 27.3); popOut(c3, 29.5);

    // slide to the room
    show(int, 29.75); show(fint, 29.75);
    ptl.fromTo(ext, { x: 0 }, { x: -1920, duration: 0.75, ease: 'power2.inOut' }, 29.8);
    ptl.fromTo([int, fint], { x: 1920 }, { x: 0, duration: 0.75, ease: 'power2.inOut' }, 29.8);
    cue(29.8, 'whoosh', 0.7, 0.6);
    hide(ext, 30.6);
    appear(R, 29.8, { ...Rohit.POSES.type, x: 800 + 1920, y: 752, s: 1.0, autoBlink: 1, mouth: 0 });
    place(R, 29.8, { x: 800 }, 0.75);
    // code strips flutter up and across
    const sPos = [[520, 560], [1500, 610], [640, 330], [1240, 300], [460, 430], [1520, 420], [900, 250]];
    strips.forEach((s, i) => {
      const [x, y] = sPos[i];
      ptl.fromTo(s, { x: x - 60, y: y + 160, rotation: -10 + i * 4, opacity: 0 }, { x, y, rotation: 6 - i * 3, opacity: 1, duration: 1.2, ease: 'power1.out' }, 30.9 + i * 0.22);
      ptl.to(s, { y: y - 40, rotation: -4 + i * 2, duration: 1.4, ease: 'sine.inOut' }, 32.1 + i * 0.22);
      ptl.to(s, { opacity: 0, y: y - 140, duration: 0.4, ease: 'power1.in' }, 33.2 + i * 0.05);
    });
    lines.forEach((l, i) => ptl.fromTo(l, { scaleX: 0, svgOrigin: '1112 0' }, { scaleX: 1, duration: 0.25, ease: 'none' }, 30.9 + i * 0.3));
    for (let i = 0; i < 16; i++) cue(30.9 + i * 0.12, 'key', 0.55);

    // the struggling user
    show(inset, 33.35);
    ptl.fromTo(inset, { scale: 0.25, x: 700, y: 180, svgOrigin: '960 500' }, { scale: 1, x: 0, y: 0, duration: 0.5, ease: 'back.out(1.4)' }, 33.4);
    cue(33.4, 'whoosh', 0.5, 0.6);
    ptl.fromTo(user, { rotation: -6, svgOrigin: '1270 640' }, { rotation: 6, duration: 0.25, yoyo: true, repeat: 11, ease: 'none' }, 33.9);
    ptl.fromTo(scribble, { scale: 0, svgOrigin: '1270 360' }, { scale: 1, duration: 0.35, ease: 'back.out(3)' }, 34.4);
    const argh = sfx(F.world, 'ARGH!', { x: 1290, y: 120, rot: 10, cls: 'mag' });
    slam(argh, 34.6, 1.2, { sfx: 'argh' });
    const c4 = cap(F.world, 'Things worked. People still struggled.', { x: 150, y: 860, rot: -1.2, cls: 'white' });
    popIn(c4, 35.0); popOut(c4, 37.2);
    ptl.to(inset, { scale: 0.2, x: 700, y: 180, opacity: 0, duration: 0.4, ease: 'power2.in' }, 37.2);
    hide(inset, 37.7);

    // the idea
    poseTo(R, 37.75, 'think', 0.35, { mouth: 3 });
    show(bulb, 38.35);
    ptl.fromTo(bulb, { scale: 0, svgOrigin: '800 330' }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, 38.4);
    const ding = sfx(F.world, 'DING!', { x: 900, y: 250, rot: -12, cls: 's120' });
    slam(ding, 38.45, 0.9, { sfx: 'ding', shake: 0.2 });
    poseTo(R, 38.8, 'point', 0.3, { mouth: 1, brow: -6 });
    const c5 = cap(F.world, 'So I started designing for the people, not just the code.', { x: 120, y: 150, rot: -1.4, w: 820 });
    popIn(c5, 39.2); popOut(c5, 41.0);
    ptl.to(bulb, { scale: 0, duration: 0.25, ease: 'back.in(2)' }, 40.8);

    // first job
    show(badgeOuter, 40.95);
    ptl.fromTo(badgeOuter, { rotation: -38, y: -500, svgOrigin: '1300 -20' }, { rotation: 0, y: 0, duration: 1.0, ease: 'elastic.out(1, 0.45)' }, 41.0);
    cue(41.0, 'whoosh', 0.5, 0.5); cue(41.4, 'clink', 0.8);
    wires.forEach((w, i) => { show(w, 41.2 + i * 0.25); ptl.fromTo(w, { scale: 0.3, opacity: 0, transformOrigin: 'center' }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' }, 41.2 + i * 0.25); cue(41.2 + i * 0.25, 'pin', 0.7); });
    poseTo(R, 41.6, 'thumbs', 0.3, { mouth: 1, brow: 0 });
    const c6 = cap(F.world, '<small>First job · 2019</small>Web Designer. Design it, then build it: HTML, CSS, JavaScript.', { x: 560, y: 120, rot: -1, w: 700 });
    popIn(c6, 41.8); popOut(c6, 43.5);

    // back outside, build the rocket
    F.reshow(ext, 43.55); show(launch, 43.55); hide(college, 43.55);
    ptl.fromTo([int, fint, badgeOuter, ...wires], { x: 0 }, { x: 1920, duration: 0.75, ease: 'power2.inOut' }, 43.6);
    ptl.fromTo(ext, { x: -1920 }, { x: 0, duration: 0.75, ease: 'power2.inOut', immediateRender: false }, 43.6);
    place(R, 43.6, { x: 800 + 1920 }, 0.75);
    vanish(R, 44.4);
    hide(int, 44.4); hide(fint, 44.4); hide(badgeOuter, 44.4); wires.forEach((w) => hide(w, 44.4));
    cue(43.6, 'whoosh', 0.7, 0.6);
    gsap.set([flames, ...smoke], { opacity: 0 });
    ptl.fromTo(pad, { y: 200 }, { y: 0, duration: 0.25, ease: 'back.out(2)' }, 44.3);
    ptl.fromTo(tower, { y: 500 }, { y: 0, duration: 0.3, ease: 'back.out(1.5)' }, 44.4);
    ptl.fromTo(rBody, { x: -1100, rotation: -30, svgOrigin: '960 700' }, { x: 0, rotation: 0, duration: 0.4, ease: 'back.out(1.3)' }, 44.55);
    ptl.fromTo(finL, { x: -700, y: 200 }, { x: 0, y: 0, duration: 0.3, ease: 'back.out(2)' }, 44.95);
    ptl.fromTo(finR, { x: 700, y: 200 }, { x: 0, y: 0, duration: 0.3, ease: 'back.out(2)' }, 45.15);
    ptl.fromTo(rNose, { y: -800 }, { y: 0, duration: 0.3, ease: 'bounce.out' }, 45.35);
    ptl.fromTo(port, { scale: 0, svgOrigin: '960 690' }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, 45.7);
    [44.3, 44.55, 44.95, 45.15, 45.35, 45.7].forEach((t) => cue(t, 'snip', 0.9));

    // countdown
    ['3', '2', '1'].forEach((n, i) => {
      const t = 46.0 + i * 0.8;
      const e = F.h('div', 'abs', F.world, n);
      css(e, { left: '360px', top: '330px', width: '240px', height: '240px', borderRadius: '50%', background: 'var(--yellow)', border: '8px solid var(--ink)', boxShadow: '12px 12px 0 var(--ink)', fontFamily: 'var(--sfx)', fontSize: '200px', lineHeight: '250px', textAlign: 'center', color: 'var(--ink)' });
      gsap.set(e, { autoAlpha: 0 });
      show(e, t); tl.fromTo(e, { scale: 1.8, rotate: -20 }, { scale: 1, rotate: -6, duration: 0.3, ease: 'back.out(3)' }, t);
      hide(e, t + 0.75);
      cue(t, 'count', 1, i);
    });

    // ignition and liftoff
    ptl.set(flames, { opacity: 1 }, 48.0);
    ptl.fromTo(flames, { scaleY: 0.6, svgOrigin: '960 880' }, { scaleY: 1.3, duration: 0.125, yoyo: true, repeat: 12, ease: 'none' }, 48.0);
    smoke.forEach((s, i) => ptl.fromTo(s, { scale: 0.2, opacity: 1, transformOrigin: 'center' }, { scale: 2.4, opacity: 1, x: (i % 2 ? 1 : -1) * (80 + i * 40), duration: 1.4, ease: 'power2.out' }, 48.0 + i * 0.08));
    ptl.fromTo(rocket, { y: 0 }, { y: -900, duration: 1.3, ease: 'power2.in' }, 48.25);
    const boom = sfx(F.world, 'KA-BOOM!', { x: 1150, y: 560, rot: -10 });
    slam(boom, 48.05, 0.9, { sfx: 'boom', shake: 1.3 });
    cue(48.0, 'braam', 1);

    // the rocket punches through the paper: an evenodd clip with a jagged hole
    const rr = rng(7);
    const star = Array.from({ length: 34 }, (_, i) => ({ a: (i / 34) * Math.PI * 2, k: 0.72 + rr() * 0.5 }));
    const tear = { r: 0 };
    const cx = 960, cy = 250;
    function applyTear() {
      if (tear.r <= 0.5) { P.style.clipPath = ''; tornPath.setAttribute('d', ''); tornShadow.setAttribute('d', ''); return; }
      const pts = star.map((s) => [cx + Math.cos(s.a) * tear.r * s.k, cy + Math.sin(s.a) * tear.r * s.k * 0.9]);
      P.style.clipPath = `polygon(evenodd, 0px 0px, 1920px 0px, 1920px 1080px, 0px 1080px, 0px 0px, ${pts.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(', ')}, ${pts[0][0].toFixed(1)}px ${pts[0][1].toFixed(1)}px)`;
      const d = 'M ' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ') + ' Z';
      tornPath.setAttribute('d', d); tornShadow.setAttribute('d', d);
    }
    tl.fromTo(tear, { r: 0 }, { r: 1900, duration: 1.1, ease: 'power2.in', onUpdate: applyTear, onComplete: applyTear }, 49.0);
    applyTear();
    tl.set(FXS, { shredX: 960, shredY: 250 }, 49.0);
    tl.fromTo(FXS, { shred: 0 }, { shred: 1.3, duration: 1.3, ease: 'none', immediateRender: false }, 49.0);
    tl.set(FXS, { shred: 0 }, 50.45);
    cue(49.1, 'rip', 1);
    flash(49.1, 0.35, 0.3);
    spike(49.2, 7, 1.2);
    hide(P, 50.35);
  }
  return { build };
})();
