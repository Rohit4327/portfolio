import { startServer, launch, openFilm, renderFrame } from './browser.mjs';
const { server, port } = await startServer(); const browser = await launch();
try {
  const { page } = await openFilm(browser, port, { query: 'shadows=0', label: 'p' });
  await renderFrame(page, 30.5, 732);
  async function measure(name, setup) {
    await page.evaluate(setup);
    let ts = 0; const N = 2;
    for (let i = 0; i < N; i++) { await page.evaluate((t) => { const s = window.__stage; const sc = window.__scenes.find(x => x.id === 's02'); sc.update(t, s); s.render(); }, 30.5 + i * 0.1); const t1 = Date.now(); await page.screenshot({ type: 'png' }); ts += Date.now() - t1; }
    console.log(`${name.padEnd(34)} ${(ts / N).toFixed(0)} ms`);
  }
  await measure('baseline (shadows off)', () => {});
  await measure('env map off', () => { window.__stage.scene.environment = null; });
  await measure('+ sprites hidden', () => { window.__stage.scene.traverse(o => { if (o.isSprite) o.visible = false; }); });
  await measure('+ floor lambert', () => { const THREE_floor = window.__scenes[1].group.children.find(c => c.geometry && c.geometry.type === 'PlaneGeometry'); if (THREE_floor) { THREE_floor.material = new THREE_floor.material.constructor({ color: 0x1a1f28 }); } });
  await measure('+ gl canvas 960x540', () => { const s = window.__stage; s.renderer.setSize(960, 540, false); s.glCanvas.style.width = '1920px'; s.glCanvas.style.height = '1080px'; });
  await measure('+ gl canvas 480x270', () => { const s = window.__stage; s.renderer.setSize(480, 270, false); s.glCanvas.style.width = '1920px'; s.glCanvas.style.height = '1080px'; });
  await measure('gl hidden entirely', () => { window.__stage.glCanvas.style.display = 'none'; });
  await measure('ui canvas hidden too', () => { window.__stage.uiCanvas.style.display = 'none'; });
} finally { await browser.close(); server.close(); }
