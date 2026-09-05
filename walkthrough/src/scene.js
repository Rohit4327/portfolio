/**
 * scene.js — renderer, camera, lighting and the environment used for glass.
 * Lighting mirrors the reference render: broad soft ambient, one warm-neutral
 * key with soft shadows, and restrained screen emission.
 */
import * as THREE from 'three';
import * as PL from './plan.js';
import { mat } from './materials.js';

export function detectQuality() {
  const forced = new URLSearchParams(location.search).get('q');
  if (forced) return forced;
  const mobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 620;
  if (mobile || cores <= 4 || small) return 'low';
  if (cores <= 8) return 'medium';
  return 'high';
}

function environmentTexture(renderer) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.00, '#ffffff');
  grad.addColorStop(0.42, '#f4f1ea');
  grad.addColorStop(0.58, '#e6e2d9');
  grad.addColorStop(1.00, '#c8c3ba');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 256);
  // soft light bands so glass picks up believable highlights
  g.globalAlpha = 0.5;
  for (let i = 0; i < 5; i++) {
    g.fillStyle = '#ffffff';
    g.fillRect(i * 110 + 20, 40, 46, 70);
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return env;
}

export function createStage(canvas, quality) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: quality !== 'low', powerPreference: 'high-performance',
    alpha: false, stencil: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,
    quality === 'low' ? 1.6 : quality === 'medium' ? 1.9 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = quality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x16110d);
  scene.environment = environmentTexture(renderer);
  scene.environmentIntensity = 0.30;   // the env map is for glass, not for flooding the room

  const camera = new THREE.PerspectiveCamera(65, 1, 0.05, 400);
  camera.position.set(0, 40, 20);

  /* ---- lighting ---- */
  const lights = new THREE.Group();
  lights.name = 'lighting';

  const hemi = new THREE.HemisphereLight(0xfff4e6, 0xd6d0c4, 0.72);
  lights.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.10);
  lights.add(ambient);

  const key = new THREE.DirectionalLight(0xfff1dc, 2.75);
  key.position.set(15, 34, 17);
  key.castShadow = true;
  const sm = quality === 'high' ? 2048 : quality === 'medium' ? 1536 : 1024;
  key.shadow.mapSize.set(sm, sm);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 90;
  const s = 22;
  Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s });
  key.shadow.camera.updateProjectionMatrix();   // the ortho frustum is 10x10 until this runs
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.025;
  lights.add(key);

  const fill = new THREE.DirectionalLight(0xe4ecff, 0.30);
  fill.position.set(-18, 15, -13);
  lights.add(fill);

  // a second, very soft bounce from the front glazing keeps interiors readable
  const bounce = new THREE.DirectionalLight(0xfff6ec, 0.20);
  bounce.position.set(-4, 6, 26);
  lights.add(bounce);

  // brighter arrival / open zones
  for (const [x, z, i] of [[4.6, -7.6, 2.2], [4.6, -3.8, 1.7], [-7.5, 3.2, 1.6],
    [-2.5, -2.0, 1.3], [10.5, 2.0, 1.4], [-10.0, -2.0, 1.3]]) {
    const p = new THREE.PointLight(0xfff1de, i, 18, 2);
    p.position.set(x, 3.05, z);
    lights.add(p);
  }
  scene.add(lights);

  return { renderer, scene, camera, key, hemi, ambient, quality };
}

/** Camera pose that reproduces the supplied reference viewpoint. */
export function referencePose(camera, aspect) {
  const R = PL.REFERENCE_CAMERA;
  // keep the plate framed the same way the source render frames it, whatever
  // the viewport aspect happens to be
  const targetAspect = 2048 / 1436;
  const dist = R.height * Math.max(1, targetAspect / aspect);
  camera.fov = R.fov;
  camera.up.set(0, 0, -1);
  camera.position.set(R.aim.x, dist, R.aim.z);
  camera.lookAt(R.aim.x, 0, R.aim.z);
  camera.updateProjectionMatrix();
}

export function restoreUp(camera) {
  camera.up.set(0, 1, 0);
}
