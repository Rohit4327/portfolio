/**
 * The shared PBR material library. One instance per material, never per mesh: builders reference M.<name>,
 * and static geometry is merged per material afterwards (core/build.ts mergeStatic), so the material count
 * is also the draw-call floor. Screens with unique artwork use screenMaterial().
 */
import * as THREE from 'three';
import { brushedRoughness, carpetTextures, fabricTextures, facadeTextures, leafTexture, noiseNormal, oakTextures, porcelainTextures, terrazzoTextures } from './textures';

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);

const oak = oakTextures(false);
const oakPlank = oakTextures(true);
const terrazzo = terrazzoTextures();
const carpet = carpetTextures();
const porcelain = porcelainTextures();
const fabric = fabricTextures();
const frostN = noiseNormal(0.2, 1.0);
const brushed = brushedRoughness();
const facade = facadeTextures();

const leaf = (tone: 'ficus' | 'olive' | 'mixed') =>
  std({ map: leafTexture(tone), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55, metalness: 0, emissive: tone === 'olive' ? 0x1c2416 : 0x0f2410, emissiveIntensity: 0.35 });

export const M = {
  // Architecture
  wall: std({ color: 0xf4f3f0, roughness: 0.92 }),
  lobbyWall: std({ color: 0xf1f0ec, roughness: 0.9 }),
  ceiling: std({ color: 0xf6f5f2, roughness: 0.95 }),
  pillar: std({ color: 0xf3f2ee, roughness: 0.88 }),
  terrazzo: std({ map: terrazzo.map, roughness: 0.42, metalness: 0 }),
  porcelain: std({ map: porcelain.map, roughness: 0.3, metalness: 0 }),
  carpet: std({ map: carpet.map, normalMap: carpet.normalMap, roughness: 0.98 }),
  oakFloor: std({ map: oakPlank.map, roughnessMap: oakPlank.roughnessMap, roughness: 1 }),
  floorStrip: std({ color: 0xc9cbcc, roughness: 0.35, metalness: 1 }),
  bronze: std({ color: 0x3a342e, roughness: 0.45, metalness: 0.8 }),
  doorGrey: std({ color: 0xb9bbbd, roughness: 0.6 }),
  redLine: std({ color: 0xc0392b, roughness: 0.7 }),
  // Glass
  glassClear: phys({ color: 0xf2fbf8, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.1, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide }),
  glassWindow: phys({ color: 0xeef8f6, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.07, envMapIntensity: 1.2, depthWrite: false, side: THREE.DoubleSide }),
  glassFrosted: std({ color: 0xffffff, roughness: 0.35, transparent: true, opacity: 0.55, normalMap: frostN, normalScale: new THREE.Vector2(0.25, 0.25), depthWrite: false, side: THREE.DoubleSide }),
  glassBand: std({ color: 0xffffff, roughness: 0.4, transparent: true, opacity: 0.7, normalMap: frostN, normalScale: new THREE.Vector2(0.25, 0.25), depthWrite: false, side: THREE.DoubleSide }),
  /** Entry door leaves: one of the only two transmissive panes (7.5). */
  glassDoor: phys({ color: 0xf4fbf9, roughness: 0.03, transmission: 1, thickness: 0.012, ior: 1.5, envMapIntensity: 1.4 }),
  /** PRISM pane of the frosted entry glass: the other transmissive pane. */
  glassPrism: phys({ color: 0xffffff, roughness: 0.42, transmission: 0.9, thickness: 0.012, ior: 1.5, normalMap: frostN, normalScale: new THREE.Vector2(0.3, 0.3) }),
  vitrine: phys({ color: 0xf6fcfa, roughness: 0.02, transparent: true, opacity: 0.12, envMapIntensity: 1.8, depthWrite: false }),
  vinylWhite: std({ color: 0xffffff, roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.12 }),
  // Metals
  steel: std({ color: 0xcfd1d2, roughness: 0.32, roughnessMap: brushed, metalness: 1 }),
  aluminium: std({ color: 0xd9dadb, roughness: 0.42, roughnessMap: brushed, metalness: 1 }),
  aluminiumMatte: std({ color: 0xd4d5d6, roughness: 0.62, metalness: 0.9 }),
  chrome: std({ color: 0xf0f0f0, roughness: 0.12, metalness: 1 }),
  // Wood, stone, white
  oak: phys({ map: oak.map, roughnessMap: oak.roughnessMap, roughness: 0.85, clearcoat: 0.12, clearcoatRoughness: 0.4 }),
  tableOak: phys({ map: oak.map, roughnessMap: oak.roughnessMap, roughness: 0.82, clearcoat: 0.15, clearcoatRoughness: 0.4 }),
  white: std({ color: 0xf5f5f3, roughness: 0.55 }),
  whiteMineral: std({ color: 0xf2f1ee, roughness: 0.7 }),
  stone: std({ color: 0xdcd9d2, roughness: 0.6 }),
  paper: std({ color: 0xfaf8f2, roughness: 0.9, side: THREE.DoubleSide }),
  // Textiles and soft things
  fabricGrey: std({ color: 0xb4aca0, map: fabric.map, normalMap: fabric.normalMap, roughness: 1 }),
  fabricWhite: std({ color: 0xece9e2, map: fabric.map, normalMap: fabric.normalMap, roughness: 1 }),
  rug: std({ color: 0xa9a297, map: fabric.map, normalMap: fabric.normalMap, roughness: 1 }),
  rugLight: std({ color: 0xcbc6bc, map: fabric.map, normalMap: fabric.normalMap, roughness: 1 }),
  felt: std({ color: 0x8d8982, roughness: 1 }),
  charcoal: std({ color: 0x2c2d30, roughness: 0.7 }),
  rubber: std({ color: 0x1b1b1d, roughness: 0.85 }),
  // Devices
  blackGlass: std({ color: 0x08090a, roughness: 0.08, metalness: 0.3 }),
  bezel: std({ color: 0x1a1b1d, roughness: 0.4, metalness: 0.4 }),
  beigePlastic: std({ color: 0xd8cfb8, roughness: 0.6 }),
  whitePlastic: std({ color: 0xf2f2f0, roughness: 0.35 }),
  tealTranslucent: phys({ color: 0x3fa6a0, roughness: 0.25, transparent: true, opacity: 0.72, depthWrite: false }),
  // Plants
  leafFicus: leaf('ficus'),
  leafOlive: leaf('olive'),
  leafMixed: leaf('mixed'),
  succulent: std({ color: 0x6f9a78, roughness: 0.6 }),
  bark: std({ color: 0x6b5a48, roughness: 0.9 }),
  soil: std({ color: 0x3b332b, roughness: 1 }),
  // Foosball
  field: std({ color: 0x8fa58c, roughness: 0.75 }),
  teamBlue: std({ color: 0x3b6fb5, roughness: 0.45 }),
  teamAmber: std({ color: 0xe0a02e, roughness: 0.45 }),
  ball: std({ color: 0xfafafa, roughness: 0.35 }),
  // Five Point Anyone tints (L1 bottom to L5 top): warm grey, sage, blue-grey, lilac-grey, sand
  fp1: std({ color: 0xe5e1da, roughness: 0.85 }),
  fp2: std({ color: 0xdde5da, roughness: 0.85 }),
  fp3: std({ color: 0xdae1e7, roughness: 0.85 }),
  fp4: std({ color: 0xe2dde8, roughness: 0.85 }),
  fp5: std({ color: 0xece4d2, roughness: 0.85 }),
  // Light sources (emissive surfaces; the paired RectAreaLights are in InteriorLights)
  lightSlot: std({ color: 0xffffff, emissive: 0xfff4e6, emissiveIntensity: 2.2, roughness: 1 }),
  lightPanel: std({ color: 0xffffff, emissive: 0xfff6ea, emissiveIntensity: 1.25, roughness: 1 }),
  vitrineGlow: std({ color: 0xffffff, emissive: 0xfff6ea, emissiveIntensity: 1.0, roughness: 1 }),
  vitrineGlowBright: std({ color: 0xffffff, emissive: 0xfff8f0, emissiveIntensity: 2.0, roughness: 1 }),
  ringWhite: std({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 }),
  ringGreen: std({ color: 0x66d48a, emissive: 0x39c46c, emissiveIntensity: 1.6 }),
  exitGreen: std({ color: 0x1f9d57, emissive: 0x1f9d57, emissiveIntensity: 0.7, roughness: 0.6 }),
  ledAmber: std({ color: 0xffb648, emissive: 0xffa630, emissiveIntensity: 1.6 }),
  // Presentation mode
  baseBoard: std({ color: 0xf7f6f3, roughness: 0.8 }),
  context: std({ color: 0xc3c8ce, roughness: 0.9, transparent: true, opacity: 0.6, depthWrite: false }),
  contextFloor: std({ color: 0xe6e8ea, roughness: 0.95 }),
  engrave: std({ color: 0xbfbfbd, roughness: 0.9 }),
  // City
  facade: std({ map: facade.map, emissiveMap: facade.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.05, roughness: 0.35, metalness: 0.35 }),
  cityConcrete: std({ color: 0xb9b6b0, roughness: 0.95 }),
  cityRoad: std({ color: 0x55575a, roughness: 0.95 }),
  cityTree: std({ color: 0x4d6b45, roughness: 1 }),
} satisfies Record<string, THREE.Material>;

export type MatName = keyof typeof M;
for (const [k, m] of Object.entries(M)) m.name = k;

/** Materials that should not cast shadows (glass, light sources, decals). */
export const NO_SHADOW = new Set<THREE.Material>([
  M.glassClear, M.glassWindow, M.glassFrosted, M.glassBand, M.glassDoor, M.glassPrism, M.vitrine, M.lightSlot, M.lightPanel,
  M.vitrineGlow, M.vitrineGlowBright, M.context, M.tealTranslucent, M.vinylWhite, M.ringWhite, M.ringGreen,
]);

/** An emissive screen showing a texture. Each screen with unique artwork owns one of these. */
export function screenMaterial(tex: THREE.Texture | null, intensity = 1): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: intensity, roughness: 0.25, metalness: 0 });
  m.name = 'screen';
  m.userData.screen = true;
  return m;
}
/** A matte print (posters, PRISM, timeline, photos): lit by the room, not emissive. */
export function printMaterial(tex: THREE.Texture | null, o: { emissive?: number; transparent?: boolean } = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, emissiveMap: o.emissive ? tex : null, emissive: o.emissive ? 0xffffff : 0x000000, emissiveIntensity: o.emissive ?? 0, transparent: !!o.transparent, alphaTest: o.transparent ? 0.02 : 0 });
  m.name = 'print';
  return m;
}

/**
 * Transmission is expensive (it re-renders the opaque scene), so it is only on in the walkthrough and only on
 * the two panes above. At model scale they fall back to ordinary thin transparency.
 */
export function setTransmission(on: boolean): void {
  M.glassDoor.transmission = on ? 1 : 0;
  M.glassDoor.transparent = !on;
  M.glassDoor.opacity = on ? 1 : 0.12;
  M.glassDoor.depthWrite = on;
  M.glassPrism.transmission = on ? 0.9 : 0;
  M.glassPrism.transparent = !on;
  M.glassPrism.opacity = on ? 1 : 0.55;
  M.glassPrism.depthWrite = on;
  M.glassDoor.needsUpdate = true;
  M.glassPrism.needsUpdate = true;
}
