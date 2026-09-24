/*
 * The 3D layer. three.js scenes rendered into a render target, then pushed through
 * one "comic print" pass: toon bands, halftone dots in the shadows, CMYK-style
 * misregistration, paper grain and a vignette. Every shot is a pure function of
 * film time, so any frame can be rendered in any order.
 */
window.Space = (() => {
  const W = 1920, H = 1080;
  const INK = 0x0b0a12;
  const C = { cyan: 0x00c2ff, magenta: 0xff2e88, yellow: 0xffd23f, paper: 0xefe3c8, red: 0xff4a3d, teal: 0x14b8a6, violet: 0x7b5cff, orange: 0xff9a3d };
  const S = { shot: 'none', misreg: 1, halftone: 1, fade: 0, dim: 0, flash: 0, dot: 8, grain: 1 };
  let renderer, rt, post, postScene, postCam;
  const shots = {};

  function rng(seed) {
    let a = seed | 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  const lerp = (a, b, u) => a + (b - a) * u;
  const easeIO = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

  // ---------------------------------------------------------------- materials
  let GM;
  function gradient() {
    const g = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
    g.minFilter = g.magFilter = THREE.NearestFilter; g.needsUpdate = true; return g;
  }
  const toon = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: GM, ...o });
  const OUTLINE_VS = 'uniform float th; void main(){ vec3 p = position + normal * th; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }';
  const OUTLINE_FS = 'uniform vec3 col; void main(){ gl_FragColor = vec4(col, 1.0); }';
  function ink(mesh, th = 0.05) {
    const m = new THREE.ShaderMaterial({ uniforms: { th: { value: th }, col: { value: new THREE.Color(INK) } }, vertexShader: OUTLINE_VS, fragmentShader: OUTLINE_FS, side: THREE.BackSide });
    const o = new THREE.Mesh(mesh.geometry, m);
    mesh.add(o);
    return mesh;
  }
  function ctex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }
  function lights(scene, k = 1) {
    scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x2a1d44, 0.55 * k));
    const d = new THREE.DirectionalLight(0xffffff, 0.95 * k); d.position.set(-6, 9, 7); scene.add(d);
    const r = new THREE.DirectionalLight(0xff2e88, 0.35 * k); r.position.set(8, -2, -6); scene.add(r);
  }

  // ---------------------------------------------------------------- shared backdrop
  let nebulaTex, starGeo, starMat;
  function backdrop(scene, seed = 1) {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.MeshBasicMaterial({ map: nebulaTex, side: THREE.BackSide, depthWrite: false }));
    sky.rotation.y = seed * 1.3;
    scene.add(sky);
    const pts = new THREE.Points(starGeo, starMat);
    scene.add(pts);
    return { sky, pts };
  }
  function makeStars() {
    const r = rng(77), N = 2600;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N), ph = new Float32Array(N);
    const pal = [[1, 1, 1], [0.6, 0.9, 1], [1, 0.6, 0.85], [1, 0.9, 0.6]];
    for (let i = 0; i < N; i++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, rad = 180 + r() * 200;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(th) * s * rad; pos[i * 3 + 1] = u * rad; pos[i * 3 + 2] = Math.sin(th) * s * rad;
      const c = pal[r() < 0.7 ? 0 : 1 + Math.floor(r() * 3)];
      col.set(c, i * 3); sz[i] = 1.5 + Math.pow(r(), 3) * 6; ph[i] = r() * 6.28;
    }
    starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    starGeo.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
    starMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: 'attribute float size; attribute float phase; attribute vec3 color; varying vec3 vC; varying float vT; uniform float time; void main(){ vC = color; vT = 0.65 + 0.35 * sin(time * 2.0 + phase * 3.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * 1.4; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vC; varying float vT; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; float a = smoothstep(0.5, 0.15, r); gl_FragColor = vec4(vC * vT, a); }',
      transparent: true, depthWrite: false,
    });
  }
  function makeNebula() {
    nebulaTex = ctex(2048, 1024, (g, w, h) => {
      g.fillStyle = '#080716'; g.fillRect(0, 0, w, h);
      const r = rng(9);
      const cols = ['255,46,136', '0,194,255', '123,92,255', '255,210,63'];
      for (let i = 0; i < 70; i++) {
        const x = r() * w, y = h * (0.2 + r() * 0.6), rad = 80 + r() * 380, c = cols[Math.floor(r() * (i < 60 ? 3 : 4))];
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, `rgba(${c},${0.08 + r() * 0.12})`); gr.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`; const s = r() < 0.9 ? 1 : 2; g.fillRect(r() * w, r() * h, s, s); }
    });
  }

  // ---------------------------------------------------------------- textures for UI objects
  function dashTex(kind, seed) {
    return ctex(512, 320, (g, w, h) => {
      const r = rng(seed);
      g.fillStyle = '#fbf7ee'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e3dccb'; g.fillRect(0, 0, w, 40);
      ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(22 + i * 20, 20, 6, 0, 7); g.fill(); });
      g.fillStyle = '#0b0a12'; g.font = '700 20px sans-serif'; g.fillText(['Workflows', 'Approvals', 'Headcount', 'SLA status', 'Emissions', 'Tickets'][kind % 6], 90, 27);
      g.lineWidth = 10; g.strokeStyle = '#0b0a12'; g.strokeRect(5, 5, w - 10, h - 10);
      g.lineWidth = 6;
      if (kind % 3 === 0) {
        for (let i = 0; i < 9; i++) { const bh = 40 + r() * 180; g.fillStyle = i === 6 ? '#ff2e88' : '#00c2ff'; g.fillRect(34 + i * 50, h - 30 - bh, 30, bh); }
      } else if (kind % 3 === 1) {
        g.strokeStyle = '#ffd23f'; g.beginPath();
        for (let i = 0; i <= 12; i++) { const x = 30 + i * 38, y = 120 + Math.sin(i * 0.8 + seed) * 40 + r() * 50; i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
        for (let i = 0; i < 3; i++) { g.fillStyle = ['#00c2ff', '#ff2e88', '#3ddc97'][i]; g.fillRect(30 + i * 150, 250, 120, 36); }
      } else {
        const cx = 140, cy = 180, rr = 90; let a0 = -Math.PI / 2;
        [0.42, 0.28, 0.18, 0.12].forEach((f, i) => { g.strokeStyle = ['#00c2ff', '#ff2e88', '#ffd23f', '#7b5cff'][i]; g.lineWidth = 34; g.beginPath(); g.arc(cx, cy, rr, a0, a0 + f * 6.283); g.stroke(); a0 += f * 6.283; });
        for (let i = 0; i < 5; i++) { g.fillStyle = '#e3dccb'; g.fillRect(270, 80 + i * 44, 210, 26); g.fillStyle = '#00c2ff'; g.fillRect(270, 80 + i * 44, 60 + r() * 150, 26); }
      }
    });
  }
  function cardTex(seed) {
    return ctex(400, 260, (g, w, h) => {
      const r = rng(seed);
      g.fillStyle = '#fbf7ee'; g.fillRect(0, 0, w, h);
      const hue = ['#ff2e88', '#00c2ff', '#ffd23f', '#7b5cff', '#ff9a3d'][seed % 5];
      g.fillStyle = hue; g.fillRect(0, 0, w, 110);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(300, 55, 30, 0, 7); g.fill();
      g.fillStyle = '#16151d'; g.fillRect(24, 132, 220, 22); g.fillStyle = '#8a8694'; g.fillRect(24, 168, 330, 12); g.fillRect(24, 190, 260, 12);
      g.fillStyle = hue; g.fillRect(24, 214, 130, 32);
      g.lineWidth = 8; g.strokeStyle = '#0b0a12'; g.strokeRect(4, 4, w - 8, h - 8);
    });
  }
  function wallTex() {
    return ctex(600, 1066, (g, w, h) => {
      g.fillStyle = '#0f0e17'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd23f'; g.font = '700 50px Anton, sans-serif'; g.fillText('WALL OF FAME', 36, 84);
      ['Showcase', 'My Wall', 'Admin'].forEach((t, i) => { g.fillStyle = i === 0 ? '#ff2e88' : '#262436'; g.fillRect(36 + i * 176, 110, 164, 44); g.fillStyle = '#fff'; g.font = '600 22px sans-serif'; g.fillText(t, 54 + i * 176, 140); });
      const cells = [[36, 180, 348, 300], [396, 180, 168, 140], [396, 332, 168, 148], [36, 492, 168, 200], [216, 492, 348, 200], [36, 704, 260, 170], [308, 704, 256, 170], [36, 886, 528, 140]];
      const cols = ['#ff2e88', '#00c2ff', '#ffd23f', '#7b5cff', '#3ddc97', '#ff9a3d'];
      cells.forEach(([x, y, cw, ch], i) => {
        g.fillStyle = '#1c1a29'; g.fillRect(x, y, cw, ch);
        g.fillStyle = cols[i % 6]; g.beginPath(); g.arc(x + 44, y + 48, 26, 0, 7); g.fill();
        g.fillStyle = '#e9e4f3'; g.fillRect(x + 84, y + 34, Math.min(160, cw - 110), 14); g.fillStyle = '#6c6880'; g.fillRect(x + 84, y + 56, Math.min(110, cw - 110), 10);
        g.fillStyle = cols[(i + 2) % 6]; g.fillRect(x + 20, y + ch - 44, 110, 28);
        g.fillStyle = '#fff'; g.font = '600 16px sans-serif'; g.fillText('♥ ' + (12 + i * 7), x + cw - 70, y + ch - 24);
      });
    });
  }
  function screenTex(color, label) {
    return ctex(256, 460, (g, w, h) => {
      g.fillStyle = '#0f0e17'; g.fillRect(0, 0, w, h);
      g.fillStyle = color; g.fillRect(20, 30, w - 40, 170);
      for (let i = 0; i < 4; i++) { g.fillStyle = '#2a2838'; g.fillRect(20, 220 + i * 52, w - 40, 38); g.fillStyle = color; g.fillRect(20, 220 + i * 52, 30 + i * 40, 38); }
      g.fillStyle = '#fff'; g.font = '700 30px sans-serif'; g.fillText(label, 30, 130);
    });
  }

  // ---------------------------------------------------------------- shots
  function camera(fov = 45) { const c = new THREE.PerspectiveCamera(fov, W / H, 0.1, 2000); return c; }

  function shotWarp() {
    const scene = new THREE.Scene(), cam = camera(70);
    backdrop(scene, 0.2);
    const N = 2600, r = rng(3);
    const base = [];
    for (let i = 0; i < N; i++) {
      let x, y; do { x = (r() * 2 - 1) * 60; y = (r() * 2 - 1) * 34; } while (x * x + y * y < 6);
      base.push([x, y, r() * 240, r()]);
    }
    const pos = new Float32Array(N * 6), col = new Float32Array(N * 6);
    base.forEach((b, i) => {
      const c = b[3] < 0.6 ? [1, 1, 1] : b[3] < 0.8 ? [0.2, 0.9, 1] : [1, 0.3, 0.7];
      col.set([...c, ...c.map((v) => v * 0.35)], i * 6);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true }));
    scene.add(lines);
    const dist = (t) => 0.8 * t + 520 * Math.pow(Math.max(0, (t - 6) / 4), 4);
    const vel = (t) => 0.8 + 520 * 4 / 4 * Math.pow(Math.max(0, (t - 6) / 4), 3);
    return {
      scene, cam,
      update(t) {
        const d = dist(t), v = vel(t), len = Math.min(120, 0.25 + v * 0.045);
        base.forEach((b, i) => {
          const z = -((b[2] - d) % 240 + 240) % 240 - 2;
          pos[i * 6] = b[0]; pos[i * 6 + 1] = b[1]; pos[i * 6 + 2] = z;
          pos[i * 6 + 3] = b[0]; pos[i * 6 + 4] = b[1]; pos[i * 6 + 5] = z - len;
        });
        geo.attributes.position.needsUpdate = true;
        cam.position.set(0, 0, 0);
        cam.rotation.set(0, 0, Math.sin(t * 0.3) * 0.05 + Math.max(0, t - 7) * 0.08);
      },
    };
  }

  function planetTex(bands, seed, spots = 0) {
    return ctex(1024, 512, (g, w, h) => {
      const r = rng(seed);
      let y = 0;
      while (y < h) { const bh = 20 + r() * 70; g.fillStyle = bands[Math.floor(r() * bands.length)]; g.fillRect(0, y, w, bh + 2); y += bh; }
      for (let i = 0; i < 60; i++) { g.fillStyle = bands[Math.floor(r() * bands.length)]; const yy = r() * h; g.beginPath(); g.ellipse(r() * w, yy, 40 + r() * 160, 6 + r() * 14, 0, 0, 7); g.fill(); }
      for (let i = 0; i < spots; i++) { g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(r() * w, h * (0.2 + r() * 0.6), 30 + r() * 90, 20 + r() * 50, r() * 3, 0, 7); g.fill(); }
    });
  }

  function shotTitle() {
    const scene = new THREE.Scene(), cam = camera(40);
    backdrop(scene, 1);
    lights(scene);
    const planet = ink(new THREE.Mesh(new THREE.SphereGeometry(6, 64, 48), toon(0xffffff, { map: planetTex(['#7b5cff', '#ff2e88', '#ffb3d1', '#5b3fc4', '#ffd23f', '#9f7bff'], 4) })), 0.08);
    planet.rotation.z = 0.35;
    scene.add(planet);
    const ringGeo = new THREE.RingGeometry(7.6, 12.5, 160, 1);
    const p = ringGeo.attributes.position, uv = ringGeo.attributes.uv, v3 = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v3.fromBufferAttribute(p, i); uv.setXY(i, (v3.length() - 7.6) / 4.9, 0.5); }
    const ringTex = ctex(512, 8, (g, w) => { const r = rng(12); for (let x = 0; x < w; x += 4) { g.fillStyle = `rgba(${r() < 0.5 ? '255,210,63' : '255,190,220'},${0.25 + r() * 0.7})`; g.fillRect(x, 0, 4, 8); } });
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -1.05; ring.rotation.y = 0.3;
    planet.add(ring);
    const moon = ink(new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 24), toon(C.cyan)), 0.06);
    scene.add(moon);
    return {
      scene, cam,
      update(t) {
        const u = smooth(10, 22, t);
        planet.position.set(lerp(9, 5.5, u), lerp(-7, -3.5, u), 0);
        planet.rotation.y = t * 0.12;
        const a = t * 0.5;
        moon.position.set(planet.position.x + Math.cos(a) * 13, planet.position.y + 3 + Math.sin(a) * 2, Math.sin(a) * 13);
        cam.position.set(lerp(-6, 0, u), lerp(3, 1, u), lerp(44, 26, u));
        cam.lookAt(lerp(2, 1.5, u), lerp(-2, 0, u), 0);
      },
    };
  }

  function rocketMesh() {
    const grp = new THREE.Group();
    const prof = [[0, -2.35], [0.62, -2.35], [0.84, -2.1], [0.96, -1.6], [0.96, 0.6], [0.88, 1.6], [0.66, 2.4], [0.32, 3.0], [0, 3.3]].map(([x, y]) => new THREE.Vector2(x, y));
    const body = ink(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), toon(0xf4eee1)), 0.05);
    grp.add(body);
    const nose = ink(new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 1.6)].concat(prof.slice(5)), 48), toon(C.red)), 0.05);
    nose.scale.set(1.012, 1, 1.012); grp.add(nose);
    const band = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.985, 0.985, 0.34, 48, 1, true), toon(C.red, { side: THREE.DoubleSide })), 0.03);
    band.position.y = -0.9; grp.add(band);
    const win = ink(new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.09, 12, 32), toon(0xc9ccd8)), 0.03);
    win.position.set(0, 0.7, 0.93); grp.add(win);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ color: C.cyan }));
    glass.position.set(0, 0.7, 0.955); grp.add(glass);
    const finShape = new THREE.Shape(); finShape.moveTo(0, 0); finShape.lineTo(1.1, -1.2); finShape.lineTo(1.1, -2.0); finShape.lineTo(0, -1.4); finShape.lineTo(0, 0);
    for (let i = 0; i < 3; i++) {
      const fin = ink(new THREE.Mesh(new THREE.ExtrudeGeometry(finShape, { depth: 0.14, bevelEnabled: false }), toon(C.red)), 0.03);
      const piv = new THREE.Group(); piv.rotation.y = (i / 3) * Math.PI * 2 + 0.5; fin.position.set(0.8, -0.6, -0.07); piv.add(fin); grp.add(piv);
    }
    const noz = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.5, 24), toon(0x3a3848)), 0.04);
    noz.position.y = -2.55; grp.add(noz);
    const flameA = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.2, 24), new THREE.MeshBasicMaterial({ color: C.yellow }));
    flameA.rotation.x = Math.PI; flameA.position.y = -4.3; grp.add(flameA);
    const flameB = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2, 24), new THREE.MeshBasicMaterial({ color: 0xfffbe6 }));
    flameB.rotation.x = Math.PI; flameB.position.y = -3.7; grp.add(flameB);
    grp.userData.flames = [flameA, flameB];
    return grp;
  }

  function shotRocket() {
    const scene = new THREE.Scene(), cam = camera(50);
    backdrop(scene, 2.2);
    lights(scene, 1.1);
    const rocket = rocketMesh(); scene.add(rocket);
    const puffGeo = new THREE.IcosahedronGeometry(1, 1);
    const puffs = [], r = rng(21);
    for (let i = 0; i < 70; i++) {
      const m = ink(new THREE.Mesh(puffGeo, toon(r() < 0.5 ? 0xf4eee1 : 0xd9d3e6)), 0.06);
      m.userData = { te: 48 + i * 0.09, dx: (r() - 0.5) * 2.5, dz: (r() - 0.5) * 2.5, s: 0.6 + r() * 0.9 };
      puffs.push(m); scene.add(m);
    }
    const path = (t) => {
      const u = clamp((t - 48) / 8);
      return new THREE.Vector3(Math.sin(u * 2.2) * 3, -8 + 60 * Math.pow(u, 1.7), -u * 18);
    };
    const pune = ink(new THREE.Mesh(new THREE.SphereGeometry(5, 48, 32), toon(0xffffff, { map: planetTex(['#14b8a6', '#0e8f82', '#2dd4bf', '#0b6f66'], 31, 30) })), 0.07);
    scene.add(pune);
    return {
      scene, cam,
      update(t) {
        const p = path(t), p2 = path(t + 0.05);
        rocket.position.copy(p);
        const dir = p2.clone().sub(p).normalize();
        rocket.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.lengthSq() > 0 ? dir : new THREE.Vector3(0, 1, 0));
        rocket.rotateY(t * 1.2);
        const fl = 0.8 + 0.2 * Math.sin(t * 50) * Math.sin(t * 31);
        rocket.userData.flames.forEach((f, i) => f.scale.set(1, fl * (i ? 1.1 : 1) * (t < 48.2 ? 0.2 : 1), 1));
        puffs.forEach((m) => {
          const d = m.userData, age = t - d.te;
          if (age < 0 || age > 5) { m.visible = false; return; }
          m.visible = true;
          const at = path(d.te).add(new THREE.Vector3(0, -3, 0));
          m.position.set(at.x + d.dx * age, at.y - age * 1.2, at.z + d.dz * age);
          m.scale.setScalar(d.s * (0.4 + Math.min(1.6, age * 1.2)));
        });
        pune.position.set(22, 48, -70);
        pune.rotation.y = t * 0.1;
        const u = clamp((t - 48) / 8);
        const lookY = p.y + 2;
        if (t < 51) cam.position.set(6, -9, 16);
        else cam.position.set(p.x + 9 - (t - 51) * 0.5, p.y - 4 + (t - 51) * 0.8, p.z + 16 - (t - 51) * 0.6);
        cam.lookAt(p.x * 0.6, t < 51 ? Math.min(lookY, 6) : lookY, p.z);
        cam.rotateZ(Math.sin(t * 0.8) * 0.06 + u * 0.1);
      },
    };
  }

  function shotOrbit() {
    const scene = new THREE.Scene(), cam = camera(42);
    backdrop(scene, 3);
    lights(scene);
    const planet = ink(new THREE.Mesh(new THREE.SphereGeometry(5, 64, 48), toon(0xffffff, { map: planetTex(['#14b8a6', '#0e8f82', '#2dd4bf', '#0b6f66', '#5eead4'], 31, 30) })), 0.07);
    scene.add(planet);
    const sats = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Group();
      const panel = ink(new THREE.Mesh(new THREE.BoxGeometry(3.2, 2, 0.14), [toon(0x26252f), toon(0x26252f), toon(0x26252f), toon(0x26252f), new THREE.MeshBasicMaterial({ map: dashTex(i, 40 + i) }), toon(0x26252f)]), 0.05);
      s.add(panel);
      [-1, 1].forEach((sx) => {
        const wing = ink(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.05), toon(0x2b5fd9)), 0.03);
        wing.position.set(sx * 2.6, 0, -0.1); s.add(wing);
      });
      s.userData = { r: 9 + (i % 3) * 1.4, inc: (i - 2.5) * 0.28, ph: (i / 6) * Math.PI * 2, sp: 0.16 + (i % 2) * 0.05 };
      sats.push(s); scene.add(s);
    }
    const moon = ink(new THREE.Mesh(new THREE.SphereGeometry(1.5, 40, 30), toon(0x3ddc97)), 0.05);
    scene.add(moon);
    return {
      scene, cam,
      update(t) {
        planet.rotation.y = t * 0.08;
        sats.forEach((s) => {
          const d = s.userData, a = d.ph + t * d.sp;
          s.position.set(Math.cos(a) * d.r, Math.sin(a) * d.r * Math.sin(d.inc), Math.sin(a) * d.r * Math.cos(d.inc));
          s.lookAt(cam.position);
        });
        const mu = smooth(66, 69, t) * (1 - smooth(76, 78, t));
        moon.visible = mu > 0.01;
        moon.position.set(lerp(20, 6.5, mu), lerp(8, 3.2, mu), lerp(-10, 7, mu));
        const a = -0.5 + (t - 56) * 0.045;
        cam.position.set(Math.sin(a) * 24, 5 + Math.sin(t * 0.2), Math.cos(a) * 24);
        cam.lookAt(t > 66 && t < 72 ? lerp(0, 3, mu) : 0, 0.5, 0);
      },
    };
  }

  function shotAsteroids() {
    const scene = new THREE.Scene(), cam = camera(55);
    backdrop(scene, 4);
    lights(scene, 0.9);
    const r = rng(8), rocks = [];
    const geos = [0, 1, 2].map((k) => { const gg = new THREE.IcosahedronGeometry(1, 0); const p = gg.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.8 + ((i * 7 + k * 3) % 5) * 0.08), p.getY(i), p.getZ(i) * (0.85 + ((i + k) % 3) * 0.1)); gg.computeVertexNormals(); return gg; });
    for (let i = 0; i < 110; i++) {
      const m = ink(new THREE.Mesh(geos[i % 3], toon(r() < 0.8 ? 0x5a4d7a : 0x8b6f5c)), 0.06);
      m.position.set((r() - 0.5) * 70, (r() - 0.5) * 36, -r() * 120);
      m.scale.setScalar(0.4 + Math.pow(r(), 2) * 2.4);
      m.userData = { rx: (r() - 0.5) * 0.8, ry: (r() - 0.5) * 0.8 };
      rocks.push(m); scene.add(m);
    }
    return {
      scene, cam,
      update(t) {
        rocks.forEach((m) => { m.rotation.set(t * m.userData.rx, t * m.userData.ry, 0); });
        cam.position.set(Math.sin(t * 0.1) * 3, Math.cos(t * 0.13) * 2, 20 - (t - 78) * 1.2);
        cam.lookAt(0, 0, cam.position.z - 30);
      },
    };
  }

  function shotMothership() {
    const scene = new THREE.Scene(), cam = camera(48);
    backdrop(scene, 5);
    lights(scene, 1.05);
    const ship = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(-16, -6); shape.lineTo(18, 0); shape.lineTo(-16, 6); shape.lineTo(-13, 0); shape.lineTo(-16, -6);
    const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2 });
    hullGeo.rotateX(Math.PI / 2); hullGeo.center();
    const hull = ink(new THREE.Mesh(hullGeo, toon(0x7a80c4)), 0.12);
    ship.add(hull);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(26, 0.1, 0.9), new THREE.MeshBasicMaterial({ color: C.magenta }));
    stripe.position.set(0, 1.72, 0); ship.add(stripe);
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 0.4), new THREE.MeshBasicMaterial({ color: C.cyan }));
    stripe2.position.set(-2, 1.73, 1.1); ship.add(stripe2);
    const tower = ink(new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4.5), toon(0x959bd6)), 0.1);
    tower.position.set(-9, 3.2, 0); ship.add(tower);
    const bridgeWin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 3.6), new THREE.MeshBasicMaterial({ color: C.yellow }));
    bridgeWin.position.set(-6.95, 3.8, 0); ship.add(bridgeWin);
    const r = rng(14);
    for (let i = 0; i < 46; i++) {
      const b = ink(new THREE.Mesh(new THREE.BoxGeometry(0.4 + r() * 1.6, 0.3 + r() * 0.9, 0.4 + r() * 1.4), toon(r() < 0.7 ? 0x8d93d0 : r() < 0.85 ? 0x5a60a0 : C.yellow)), 0.04);
      const x = -13 + r() * 24, zmax = 5.6 * (1 - (x + 16) / 34);
      b.position.set(x, 1.8, (r() * 2 - 1) * Math.max(0.3, zmax - 0.6)); ship.add(b);
    }
    const winGeo = new THREE.PlaneGeometry(0.28, 0.18), winMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, side: THREE.DoubleSide });
    const wins = new THREE.InstancedMesh(winGeo, winMat, 120), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < 120; i++) {
      const side = i % 2 ? 1 : -1, x = -14 + (i >> 1) * 0.5;
      const z = side * (6 * (1 - (x + 16) / 34) - 0.05);
      q.setFromEuler(new THREE.Euler(0, side > 0 ? 0.18 : Math.PI - 0.18, 0));
      m4.compose(new THREE.Vector3(x, 0.4 + ((i * 7) % 3) * 0.35, z), q, sc); wins.setMatrixAt(i, m4);
    }
    ship.add(wins);
    for (let i = 0; i < 3; i++) {
      const eng = ink(new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 2.4, 24), toon(0x5a60a0)), 0.06);
      eng.rotation.z = Math.PI / 2; eng.position.set(-16.5, 0, (i - 1) * 3); ship.add(eng);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), new THREE.MeshBasicMaterial({ color: 0xbff4ff }));
      glow.rotation.y = -Math.PI / 2; glow.position.set(-17.75, 0, (i - 1) * 3); ship.add(glow);
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.9, 5, 24, 1, true), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      plume.rotation.z = Math.PI / 2; plume.position.set(-20.3, 0, (i - 1) * 3); ship.add(plume);
    }
    ship.scale.setScalar(1.7);
    scene.add(ship);
    const drones = [];
    for (let i = 0; i < 8; i++) {
      const d = new THREE.Group();
      const core = ink(new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), toon([C.cyan, C.magenta, C.yellow, C.violet][i % 4])), 0.04);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eye.position.z = 0.4; d.add(core); d.add(eye);
      d.userData = { ph: (i / 8) * Math.PI * 2, r: 3.6 + (i % 3) * 0.5, y: ((i % 4) - 1.5) * 0.9 };
      drones.push(d); scene.add(d);
    }
    const focus = new THREE.Vector3(0, 0, 0);
    return {
      scene, cam, drones, focus,
      update(t) {
        const u = clamp((t - 104) / 26);
        // 104-112 overhead pass, 112-118 side view, 118-126 close with drones, 126-130 pull away
        if (t < 112) {
          // the opening pass: nose first, straight over the camera
          const k = clamp((t - 104) / 8);
          ship.position.set(lerp(-62, 30, k), 11, -4);
          ship.rotation.set(Math.PI, 0, 0.04);
          cam.position.set(0, -4, 18);
          cam.lookAt(lerp(-6, 4, k), 7, -6);
        } else {
          const k = (t - 112);
          ship.position.set(4 - k * 0.5, -1.5, -30);
          ship.rotation.set(0.2, 0.62 + k * 0.008, 0.05);
          cam.position.set(0, 2.5, 13);
          cam.lookAt(-1, 0.4, -8);
        }
        const dv = smooth(118, 119.5, t) * (1 - smooth(126, 127.5, t));
        drones.forEach((d) => {
          const a = d.userData.ph + t * 0.9;
          d.visible = dv > 0.01;
          d.position.set(Math.cos(a) * d.userData.r * dv, d.userData.y + Math.sin(t * 2 + d.userData.ph) * 0.3, Math.sin(a) * d.userData.r * 0.6 * dv + 2);
          d.scale.setScalar(Math.max(0.01, dv));
          d.lookAt(cam.position);
        });
      },
    };
  }

  function shotOrchard() {
    const scene = new THREE.Scene(), cam = camera(46);
    backdrop(scene, 6);
    lights(scene, 1.05);
    const floorTex = ctex(1024, 1024, (g, w, h) => {
      g.fillStyle = '#1b1830'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(0,194,255,.18)'; g.lineWidth = 2;
      for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    });
    const floor = ink(new THREE.Mesh(new THREE.CylinderGeometry(27, 27.5, 1, 96), [toon(0x2a2548), toon(0xffffff, { map: floorTex }), toon(0x2a2548)]), 0.14);
    floor.position.y = -0.5; scene.add(floor);
    const zones = [
      { p: [-17, 0, 9], c: C.yellow, n: 'orientation' },
      { p: [-7, 0, -6], c: C.magenta, n: 'talk' },
      { p: [4, 0, 7], c: C.cyan, n: 'make' },
      { p: [14, 0, -5], c: C.orange, n: 'feel' },
      { p: [19, 0, 11], c: C.violet, n: 'capsule' },
    ];
    const curve = new THREE.CatmullRomCurve3(zones.map((z) => new THREE.Vector3(...z.p)));
    const trail = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.22, 8, false), new THREE.MeshBasicMaterial({ color: C.cyan }));
    trail.position.y = 0.12; scene.add(trail);
    const beads = [];
    for (let i = 0; i < 16; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); beads.push(b); scene.add(b); }
    zones.forEach((z, i) => {
      const pad = ink(new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 0.5, 6), toon(z.c)), 0.08);
      pad.position.set(z.p[0], 0.25, z.p[2]); scene.add(pad);
      z.grp = new THREE.Group(); z.grp.position.set(z.p[0], 0.5, z.p[2]); scene.add(z.grp);
    });
    // 1 orientation trail: signposts and floor arrows
    const arrowShape = new THREE.Shape(); arrowShape.moveTo(0, -0.35); arrowShape.lineTo(1.4, -0.35); arrowShape.lineTo(1.4, -0.6); arrowShape.lineTo(2.1, 0); arrowShape.lineTo(1.4, 0.6); arrowShape.lineTo(1.4, 0.35); arrowShape.lineTo(0, 0.35); arrowShape.lineTo(0, -0.35);
    [[-1.6, 0.9, 0.3, C.cyan], [1.2, -1.2, -0.6, C.magenta], [0.4, 1.8, 2.2, 0xf4eee1]].forEach(([x, z, rot, col], i) => {
      const pole = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 12), toon(0xc9ccd8)), 0.03);
      pole.position.set(x, 1.7, z); zones[0].grp.add(pole);
      const sign = ink(new THREE.Mesh(new THREE.ExtrudeGeometry(arrowShape, { depth: 0.14, bevelEnabled: false }), toon(col)), 0.04);
      sign.position.set(x, 2.6 - i * 0.2, z); sign.rotation.y = rot; zones[0].grp.add(sign);
    });
    // 2 talk zone: wall of fame kiosks, seats, speech bubbles
    const wt = wallTex();
    [-2.2, 0, 2.2].forEach((x, i) => {
      const k = ink(new THREE.Mesh(new THREE.BoxGeometry(1.7, 3, 0.16), [toon(0x26252f), toon(0x26252f), toon(0x26252f), toon(0x26252f), new THREE.MeshBasicMaterial({ map: wt }), toon(0x26252f)]), 0.04);
      k.position.set(x, 2.3, -1.2 + Math.abs(x) * 0.25); k.rotation.y = -x * 0.18; zones[1].grp.add(k);
      const st = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.35, 0.8, 12), toon(0xc9ccd8)), 0.03);
      st.position.set(x, 0.4, -1.2 + Math.abs(x) * 0.25); zones[1].grp.add(st);
    });
    for (let i = 0; i < 3; i++) {
      const seat = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.5, 20), toon([C.yellow, C.cyan, 0xf4eee1][i])), 0.03);
      seat.position.set(-1.6 + i * 1.6, 0.25, 2.2); zones[1].grp.add(seat);
    }
    const bubbles = [];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Group();
      const disc = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 24), toon([0xffffff, C.yellow, C.cyan][i])), 0.04);
      disc.rotation.x = Math.PI / 2; disc.scale.set(1.35, 1, 1); b.add(disc);
      const tail = ink(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 3), toon([0xffffff, C.yellow, C.cyan][i])), 0.03);
      tail.position.set(-0.3, -0.55, 0); tail.rotation.z = 0.5; tail.rotation.x = Math.PI; b.add(tail);
      zones[1].grp.add(b); bubbles.push(b);
    }
    // 3 make zone: bench, robot arm, cubes
    const bench = ink(new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1.6), toon(0x4a4f7a)), 0.05);
    bench.position.set(0, 0.5, 0.6); zones[2].grp.add(bench);
    const armBase = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.6, 16), toon(0xc9ccd8)), 0.04);
    armBase.position.set(-1.2, 1.3, 0.6); zones[2].grp.add(armBase);
    const armA = new THREE.Group(); armA.position.set(-1.2, 1.6, 0.6); zones[2].grp.add(armA);
    const seg1 = ink(new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.8, 0.3), toon(C.orange)), 0.03); seg1.position.y = 0.9; armA.add(seg1);
    const armB = new THREE.Group(); armB.position.y = 1.8; armA.add(armB);
    const seg2 = ink(new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.4, 0.26), toon(C.orange)), 0.03); seg2.position.y = 0.7; armB.add(seg2);
    const cubes = [];
    for (let i = 0; i < 5; i++) {
      const c = ink(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), toon([C.cyan, C.magenta, C.yellow, 0xf4eee1, C.violet][i])), 0.03);
      c.position.set(0.6 + (i % 3) * 0.7, 1.3 + Math.floor(i / 3) * 0.62, 0.6); zones[2].grp.add(c); cubes.push(c);
    }
    // 4 feel zone: pedestals with devices
    const devices = [];
    [[-1.8, C.cyan, [0.9, 1.7, 0.1], 'APP'], [0, C.magenta, [1.9, 1.3, 0.1], 'DASH'], [1.8, C.yellow, [0.9, 1.7, 0.1], 'KIOSK']].forEach(([x, col, dims, label]) => {
      const ped = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 1.4, 20), toon(0xf4eee1)), 0.04);
      ped.position.set(x, 0.7, 0); zones[3].grp.add(ped);
      const dev = ink(new THREE.Mesh(new THREE.BoxGeometry(...dims), [toon(0x26252f), toon(0x26252f), toon(0x26252f), toon(0x26252f), new THREE.MeshBasicMaterial({ map: screenTex('#' + col.toString(16).padStart(6, '0'), label) }), toon(0x26252f)]), 0.03);
      dev.position.set(x, 2.3, 0); zones[3].grp.add(dev); devices.push(dev);
    });
    // 5 capsule
    const cap = ink(new THREE.Mesh(new THREE.CapsuleGeometry(1.4, 2.2, 8, 24), toon(0xf4eee1)), 0.06);
    cap.position.set(0, 2.5, 0); zones[4].grp.add(cap);
    const capRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.12, 12, 48), new THREE.MeshBasicMaterial({ color: C.magenta }));
    capRing.position.set(0, 2.5, 0); capRing.rotation.x = Math.PI / 2; zones[4].grp.add(capRing);
    const capDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshBasicMaterial({ color: C.violet }));
    capDoor.position.set(0, 2.5, 1.42); zones[4].grp.add(capDoor);

    // camera choreography: overview, then a guided walk with dwell at each zone
    const stops = [[133.4, 135.2], [136.4, 141.6], [142.6, 144.4], [145.4, 147.2], [148.2, 150]];
    function along(t) {
      if (t <= stops[0][0]) return 0;
      for (let i = 0; i < stops.length; i++) {
        const [a, b] = stops[i];
        if (t <= b) return i / 4;
        if (i < stops.length - 1 && t < stops[i + 1][0]) return (i + easeIO((t - b) / (stops[i + 1][0] - b))) / 4;
      }
      return 1;
    }
    const tmp = new THREE.Vector3();
    const YAW = [0.55, -0.25, 0.35, -0.45, 0.7];
    function zoneCam(k, t) {
      const z = zones[k].p, yaw = YAW[k] + Math.sin(t * 0.3) * 0.05;
      return { pos: new THREE.Vector3(z[0] + Math.sin(yaw) * 14, 8, z[2] + Math.cos(yaw) * 14), look: new THREE.Vector3(z[0], 1.9, z[2]) };
    }
    return {
      scene, cam, zones, curve,
      update(t) {
        beads.forEach((b, i) => { curve.getPointAt(((i / beads.length) + t * 0.04) % 1, tmp); b.position.set(tmp.x, 0.5, tmp.z); });
        bubbles.forEach((b, i) => b.position.set(-1.5 + i * 1.5, 3.2 + Math.sin(t * 2 + i) * 0.25, 2.2));
        armA.rotation.y = Math.sin(t * 1.2) * 0.8; armB.rotation.z = -0.6 + Math.sin(t * 1.7) * 0.4;
        cubes.forEach((c, i) => { const s = smooth(142.4 + i * 0.3, 142.7 + i * 0.3, t) || (t > 150 ? 1 : 0); c.scale.setScalar(Math.max(0.001, t < 142 ? 1 : s)); });
        devices.forEach((d, i) => { d.rotation.y = Math.sin(t * 0.8 + i) * 0.5; d.position.y = 2.3 + Math.sin(t * 1.5 + i) * 0.12; });
        capDoor.scale.x = 1 - smooth(148.4, 149.4, t) * 0.9;
        if (t < 133.4 || t > 150.2) {
          const a = (t - 130) * 0.06 + (t > 150 ? 1.2 : 0);
          cam.position.set(Math.sin(a) * 42, 26, Math.cos(a) * 42);
          cam.lookAt(0, 0, 0);
        } else {
          const u = along(t) * 4, i = Math.min(3, Math.floor(u)), e = u - i;
          const A = zoneCam(i, t), Bc = zoneCam(Math.min(4, i + 1), t);
          const k = easeIO(e);
          cam.position.lerpVectors(A.pos, Bc.pos, k); cam.position.y += Math.sin(Math.PI * k) * 5;
          tmp.lerpVectors(A.look, Bc.look, k);
          cam.lookAt(tmp);
        }
      },
    };
  }

  function shotBlackHole() {
    const scene = new THREE.Scene(), cam = camera(46);
    backdrop(scene, 7);
    lights(scene, 1);
    const hole = new THREE.Mesh(new THREE.SphereGeometry(2.4, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    scene.add(hole);
    const photon = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.07, 12, 96), new THREE.MeshBasicMaterial({ color: 0xfff1c9 }));
    scene.add(photon);
    const diskMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float time; varying vec2 vP;
        void main(){ float r = length(vP); float a = atan(vP.y, vP.x);
          float u = clamp((r - 2.9) / 7.0, 0.0, 1.0);
          float swirl = 0.5 + 0.5 * sin(a * 7.0 + r * 2.4 - time * 2.6) * sin(a * 3.0 - r * 1.3 + time * 1.1);
          vec3 hot = mix(vec3(1.0, 0.9, 0.62), vec3(1.0, 0.55, 0.15), smoothstep(0.0, 0.3, u));
          vec3 col = mix(hot, vec3(1.0, 0.18, 0.53), smoothstep(0.35, 0.9, u));
          float band = step(0.5, fract(r * 1.6 - time * 0.3));
          float alpha = (1.0 - smoothstep(0.75, 1.0, u)) * smoothstep(0.0, 0.04, u) * (0.45 + 0.45 * swirl) * (0.7 + 0.3 * band) * 0.72;
          gl_FragColor = vec4(col * (0.7 + 0.35 * swirl), alpha); }`,
      transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const disk = new THREE.Mesh(new THREE.RingGeometry(2.9, 9.9, 192, 1), diskMat);
    disk.rotation.x = -Math.PI / 2 + 0.22; scene.add(disk);
    const halo = new THREE.Mesh(new THREE.RingGeometry(2.7, 6.2, 192, 1), diskMat);
    halo.position.z = -0.4; scene.add(halo);
    const cards = [], r = rng(33);
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.17), new THREE.MeshBasicMaterial({ map: cardTex(i), transparent: true, side: THREE.DoubleSide }));
      m.userData = { t0: 160 + i * 0.55, a0: r() * 6.28, r0: 15 + r() * 4, y0: (r() - 0.5) * 3 };
      cards.push(m); scene.add(m);
    }
    const mkShip = (col) => {
      const s = new THREE.Group();
      const b = ink(new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 5), toon(col)), 0.05); b.rotation.z = -Math.PI / 2; s.add(b);
      const w = ink(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 2.8), toon(0xf4eee1)), 0.04); w.position.x = -0.4; s.add(w);
      return s;
    };
    const shipD = mkShip(C.magenta), shipV = mkShip(C.cyan);
    shipV.rotation.y = Math.PI;
    scene.add(shipD); scene.add(shipV);
    const tiles = [];
    const arc = (u) => new THREE.Vector3(lerp(-11, 11, u), 2.6 + Math.sin(u * Math.PI) * 5.2, 2.5);
    for (let i = 0; i < 18; i++) {
      const m = ink(new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.26, 1.4), toon(i % 2 ? C.cyan : C.magenta, { emissive: i % 2 ? 0x003a55 : 0x55002a })), 0.04);
      const u = (i + 0.5) / 18, p = arc(u), p2 = arc(u + 0.01);
      m.position.copy(p); m.rotation.z = Math.atan2(p2.y - p.y, p2.x - p.x);
      m.userData = { t0: 171 + i * 0.26 };
      tiles.push(m); scene.add(m);
    }
    const riders = [];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.85), new THREE.MeshBasicMaterial({ map: cardTex(i + 3), side: THREE.DoubleSide }));
      m.userData = { t0: 175 + i * 0.7 }; riders.push(m); scene.add(m);
    }
    return {
      scene, cam, tiles, arc, shipD, shipV,
      update(t) {
        diskMat.uniforms.time.value = t;
        halo.lookAt(cam.position);
        cards.forEach((m) => {
          const d = m.userData, age = t - d.t0;
          const rr = d.r0 - age * 2.1;
          if (age < 0 || rr < 2.5 || t > 171) { m.visible = false; return; }
          m.visible = true;
          const a = d.a0 + age * (0.3 + 3.2 / Math.max(0.6, rr));
          m.position.set(Math.cos(a) * rr, d.y0 * (rr / d.r0) + Math.sin(a) * rr * 0.22, Math.sin(a) * rr * 0.9);
          const spag = 1 + 5 * Math.pow(clamp((7 - rr) / 4.5), 2);
          m.lookAt(0, 0, 0);
          m.scale.set(1 / Math.sqrt(spag), 1 / Math.sqrt(spag), 1);
          m.scale.x = spag * 0.35; m.scale.y = 1 / spag;
          m.rotation.z += a;
          m.material.opacity = clamp((rr - 2.5) / 1.5);
        });
        shipD.position.set(-13.5, 2.4 + Math.sin(t * 1.4) * 0.3, 2.5);
        shipV.position.set(13.5, 2.4 + Math.sin(t * 1.3 + 1) * 0.3, 2.5);
        tiles.forEach((m) => { const k = clamp((t - m.userData.t0) / 0.25); m.visible = k > 0; const s = k < 1 ? k * 1.25 - Math.max(0, k - 0.8) * 1.25 : 1; m.scale.setScalar(Math.max(0.001, s)); });
        riders.forEach((m) => {
          const u = (t - m.userData.t0) / 3.2;
          m.visible = u > 0 && u < 1;
          if (!m.visible) return;
          const p = arc(u); m.position.set(p.x, p.y + 0.72, p.z); m.lookAt(cam.position);
        });
        const push = smooth(160, 170, t), pull = smooth(170.2, 173, t);
        cam.position.set(Math.sin(t * 0.1) * 1.5, lerp(lerp(7, 4, push), 5, pull), lerp(lerp(30, 20, push), 27, pull));
        cam.lookAt(0, lerp(0.5, 2.2, pull), 0);
        cam.rotateZ(Math.sin(t * 0.3) * 0.04 * (1 - pull));
      },
    };
  }

  function shotFinale() {
    const scene = new THREE.Scene(), cam = camera(40);
    backdrop(scene, 8);
    lights(scene, 1.1);
    const planet = ink(new THREE.Mesh(new THREE.SphereGeometry(6, 64, 48), toon(0xffffff, { map: planetTex(['#ffb347', '#ffd23f', '#ff8fb8', '#ffcf7a', '#ff9a3d'], 55, 20) })), 0.08);
    scene.add(planet);
    const r = rng(90);
    for (let i = 0; i < 9; i++) {
      const tree = new THREE.Group();
      const trunk = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.7, 8), toon(0x6b4a33)), 0.02); trunk.position.y = 0.35; tree.add(trunk);
      const top = ink(new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), toon(r() < 0.5 ? 0xff9a3d : 0x3ddc97)), 0.03); top.position.y = 0.9; tree.add(top);
      const th = (r() < 0.5 ? -1 : 1) * (0.42 + r() * 0.42), ph = r() * 6.28;
      const n = new THREE.Vector3(Math.sin(th) * Math.cos(ph) * 0.5, Math.cos(th), Math.sin(th) * Math.sin(ph) * 0.5).normalize();
      tree.position.copy(n.clone().multiplyScalar(6));
      tree.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      planet.add(tree);
    }
    return {
      scene, cam, planet,
      update(t) {
        planet.rotation.y = t * 0.04;
        const u = easeIO(smooth(185.5, 192, t));
        cam.position.set(lerp(0, 0, u), lerp(8.2, 6, u), lerp(9, 34, u));
        cam.lookAt(0, lerp(6.4, 1.5, u), 0);
      },
    };
  }

  // ---------------------------------------------------------------- post pass
  function makePost() {
    post = new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: rt.texture }, res: { value: new THREE.Vector2(W, H) }, time: { value: 0 },
        misreg: { value: 1 }, halftone: { value: 1 }, fade: { value: 0 }, dim: { value: 0 }, flash: { value: 0 }, dotSize: { value: 7 }, grain: { value: 1 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tex; uniform vec2 res; uniform float time, misreg, halftone, fade, dim, flash, dotSize, grain;
        varying vec2 vUv;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
        float screenDot(vec2 frag, float ang, float cell, float amt){
          mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
          vec2 q = R * frag; vec2 g = fract(q / cell) - 0.5;
          float r = sqrt(clamp(amt, 0.0, 1.0)) * 0.62;
          return 1.0 - smoothstep(r - 0.08, r + 0.08, length(g));
        }
        void main(){
          vec2 uv = vUv; vec2 d = uv - 0.5;
          float m = misreg * (0.0012 + 0.0045 * dot(d, d) * 4.0);
          vec3 c;
          c.r = texture2D(tex, uv + vec2(m, m * 0.35)).r;
          c.g = texture2D(tex, uv).g;
          c.b = texture2D(tex, uv - vec2(m, m * 0.35)).b;
          float L = luma(c);
          // halftone: dots darken the shadows, and a second screen tints midtones magenta
          float shadow = 1.0 - smoothstep(0.06, 0.55, L);
          float dk = screenDot(gl_FragCoord.xy, 0.785, dotSize, shadow);
          c = mix(c, c * 0.38, dk * halftone * step(0.03, L));
          float mid = smoothstep(0.25, 0.5, L) * (1.0 - smoothstep(0.55, 0.85, L));
          float dm = screenDot(gl_FragCoord.xy + 2.0, 0.26, dotSize * 0.9, mid * 0.35);
          c = mix(c, c * vec3(1.0, 0.82, 0.92), dm * halftone * 0.6);
          // grain and paper tooth
          float n = hash(gl_FragCoord.xy + fract(floor(time * 12.0) * 0.618) * 100.0);
          c += (n - 0.5) * 0.05 * grain;
          // vignette
          c *= 1.0 - dot(d, d) * 0.9;
          c = mix(c, c * 0.35, dim);
          c = mix(c, vec3(1.0), flash);
          c *= 1.0 - fade;
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    postScene = new THREE.Scene();
    const tri = new THREE.Mesh(geo, post); tri.frustumCulled = false; postScene.add(tri);
    postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x07060f, 1);
    rt = new THREE.WebGLRenderTarget(W, H, { samples: 2 });
    GM = gradient();
    makeNebula(); makeStars(); makePost();
    Object.assign(shots, {
      warp: shotWarp(), title: shotTitle(), rocket: shotRocket(), orbit: shotOrbit(), asteroids: shotAsteroids(),
      mothership: shotMothership(), orchard: shotOrchard(), blackhole: shotBlackHole(), finale: shotFinale(),
    });
  }

  function render(t) {
    const sh = shots[S.shot];
    starMat.uniforms.time.value = t;
    if (!sh) { renderer.setRenderTarget(null); renderer.clear(); return; }
    sh.update(t);
    renderer.setRenderTarget(rt);
    renderer.render(sh.scene, sh.cam);
    renderer.setRenderTarget(null);
    const u = post.uniforms;
    u.time.value = t; u.misreg.value = S.misreg; u.halftone.value = S.halftone; u.fade.value = S.fade; u.dim.value = S.dim; u.flash.value = S.flash; u.dotSize.value = S.dot; u.grain.value = S.grain;
    renderer.render(postScene, postCam);
  }

  // screen position (stage px) of a point in a shot, for DOM labels that ride 3D objects
  const _v = new THREE.Vector3();
  function project(shotName, obj3dOrVec) {
    const sh = shots[shotName];
    if (obj3dOrVec.isObject3D) obj3dOrVec.getWorldPosition(_v); else _v.copy(obj3dOrVec);
    _v.project(sh.cam);
    return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, z: _v.z };
  }

  return { init, render, S, shots, project, THREE: () => THREE };
})();
