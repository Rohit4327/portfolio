// Shared render stage: one WebGL renderer + one 2D overlay. Everything is a pure function of film time t (seconds).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const W = 1920, H = 1080, FPS = 24;

export const PALETTE = {
  graphite: '#0D1016', graphite2: '#161B24', graphite3: '#1F2632',
  ivory: '#F6F2E8', ivory2: '#E9E3D6',
  amber: '#FFAB5B', amberDeep: '#E8862E',
  cyan: '#80C9F8', cyanDeep: '#3F97D6',
  gray: '#8A8F98', gray2: '#5B6069', metal: '#B8BCC4', white: '#F2F3F5',
  beige: '#D9CFB8', beige2: '#C9BFA6', green: '#9CFF9C', crtGreen: '#33FF66', brass: '#C9A14A',
};

export const PARAMS = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const QUALITY = { aa: PARAMS.get('aa') !== '0', shadows: PARAMS.get('shadows') !== '0', shadowSize: Number(PARAMS.get('shadowSize') || 1024), softShadows: PARAMS.get('soft') === '1', env: PARAMS.get('env') === '1' };
export class Stage {
  constructor(glCanvas, uiCanvas) {
    this.glCanvas = glCanvas; this.uiCanvas = uiCanvas;
    this.renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: QUALITY.aa, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = QUALITY.shadows;
    this.renderer.shadowMap.type = QUALITY.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.graphite);
    this.camera = new THREE.PerspectiveCamera(35, W / H, 0.05, 400);
    this.camera.position.set(0, 1.5, 6);
    // Image-based lighting is OFF by default: PMREM/IBL costs ~3 s per frame in SwiftShader. Scenes light with direct lights (see props.rig).
    if (QUALITY.env) { const pmrem = new THREE.PMREMGenerator(this.renderer); this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; this.scene.environment = this.envTexture; this.scene.environmentIntensity = 0.35; }
    this.ui = uiCanvas.getContext('2d');
    this.frame = 0;
  }
  setBackground(hex) { this.scene.background = new THREE.Color(hex); }
  setFog(hex, near, far) { this.scene.fog = hex ? new THREE.Fog(hex, near, far) : null; }
  setExposure(e) { this.renderer.toneMappingExposure = e; }
  setEnvIntensity(k) { this.scene.environmentIntensity = k; }
  render() { this.renderer.render(this.scene, this.camera); }
  clearUI() { this.ui.setTransform(1, 0, 0, 1, 0, 0); this.ui.clearRect(0, 0, W, H); }
}
