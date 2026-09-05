/**
 * minimap.js — collapsible top-down navigator drawn from the same plan data,
 * so it keeps the exact orientation of the supplied floor plan.
 */
import * as PL from './plan.js';

const { wx, wz } = PL;

export function createMiniMap(host) {
  const wrap = document.createElement('div');
  wrap.className = 'minimap';
  wrap.hidden = true;
  const canvas = document.createElement('canvas');
  canvas.width = 300; canvas.height = 170;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Floor plan navigator showing your position');
  wrap.appendChild(canvas);
  host.appendChild(wrap);
  const g = canvas.getContext('2d');

  const B = {
    x0: wx(PL.PLATE.x0), x1: wx(PL.PLATE.x1),
    z0: wz(PL.LOBBY.y0), z1: wz(PL.PLATE.y1),
  };
  const pad = 8;
  const sx = (canvas.width - pad * 2) / (B.x1 - B.x0);
  const sz = (canvas.height - pad * 2) / (B.z1 - B.z0);
  const s = Math.min(sx, sz);
  const ox = pad + ((canvas.width - pad * 2) - (B.x1 - B.x0) * s) / 2;
  const oz = pad + ((canvas.height - pad * 2) - (B.z1 - B.z0) * s) / 2;
  const px = (x) => ox + (x - B.x0) * s;
  const pz = (z) => oz + (z - B.z0) * s;

  function seg(list, style, width) {
    g.strokeStyle = style; g.lineWidth = width;
    for (const [a, b, c, d] of list) {
      g.beginPath();
      g.moveTo(px(wx(a)), pz(wz(b)));
      g.lineTo(px(wx(c)), pz(wz(d)));
      g.stroke();
    }
  }

  function base() {
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = 'rgba(245,242,236,0.92)';
    g.fillRect(px(wx(PL.PLATE.x0)), pz(wz(PL.PLATE.y0)),
      (wx(PL.PLATE.x1) - wx(PL.PLATE.x0)) * s, (wz(PL.PLATE.y1) - wz(PL.PLATE.y0)) * s);
    g.fillRect(px(wx(PL.LOBBY.x0)), pz(wz(PL.LOBBY.y0)),
      (wx(PL.LOBBY.x1) - wx(PL.LOBBY.x0)) * s, (wz(PL.PLATE.y0) - wz(PL.LOBBY.y0)) * s);
    seg(PL.PARTITIONS, 'rgba(40,38,34,0.55)', 1.6);
    seg(PL.SHELL_WALLS, 'rgba(30,28,25,0.8)', 2);
    seg(PL.GLAZING, 'rgba(90,150,180,0.75)', 1.2);
    // capsule footprint
    const C = PL.CAPSULE.shell;
    g.strokeStyle = 'rgba(70,130,170,0.9)'; g.lineWidth = 1.6;
    g.beginPath();
    const x0 = px(wx(C.x0)), x1 = px(wx(C.x1)), z0 = pz(wz(C.y0)), z1 = pz(wz(C.y1));
    const r = (wx(C.x0 + C.r) - wx(C.x0)) * s;
    g.moveTo(x0 + r, z0);
    g.arcTo(x1, z0, x1, z1, r); g.arcTo(x1, z1, x0, z1, r);
    g.arcTo(x0, z1, x0, z0, r); g.arcTo(x0, z0, x1, z0, r);
    g.closePath(); g.stroke();
    // four pods
    g.fillStyle = 'rgba(120,110,95,0.45)';
    for (const p of PL.PROWESS.pods) {
      g.fillRect(px(wx(p.x0)), pz(wz(p.y0)),
        (wx(p.x1) - wx(p.x0)) * s, (wz(p.y1) - wz(p.y0)) * s);
    }
  }

  const bg = document.createElement('canvas');
  bg.width = canvas.width; bg.height = canvas.height;

  function bake() {
    base();
    bg.getContext('2d').clearRect(0, 0, bg.width, bg.height);
    bg.getContext('2d').drawImage(canvas, 0, 0);
  }
  bake();

  return {
    element: wrap,
    toggle() { wrap.hidden = !wrap.hidden; return !wrap.hidden; },
    setVisible(v) { wrap.hidden = !v; },
    get visible() { return !wrap.hidden; },
    draw(x, z, yaw) {
      if (wrap.hidden) return;
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.drawImage(bg, 0, 0);
      const cx = px(x), cz = pz(z);
      g.save();
      g.translate(cx, cz);
      g.rotate(-yaw);
      g.fillStyle = '#c2452f';
      g.beginPath();
      g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(0, 3); g.lineTo(-5, 6);
      g.closePath(); g.fill();
      g.restore();
    },
  };
}
