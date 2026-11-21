/**
 * Image-based lighting generated in code (no HDRI download needed): a soft studio for the table model and a
 * partly cloudy daytime sky for the walkthrough. If public/hdri contains the fetched CC0 HDRIs they are used
 * instead (see Stage). Both are prefiltered once with PMREM.
 */
import * as THREE from 'three';

const emissive = (color: number, intensity: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });

/** Studio: one large overhead softbox, two tall side strips, a faint warm fill, on a light grey surround. */
export function studioEnv(gl: THREE.WebGLRenderer): THREE.Texture {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x8a8a88, side: THREE.BackSide }));
  s.add(room);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), emissive(0xffffff, 5.5));
  top.position.set(0, 7, 0);
  top.rotation.x = Math.PI / 2;
  s.add(top);
  for (const sx of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 7), emissive(0xffffff, 3.2));
    strip.position.set(sx * 9, 3, -1);
    strip.rotation.y = -sx * Math.PI / 2;
    s.add(strip);
  }
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), emissive(0xffe9d2, 0.9));
  fill.position.set(0, 2.5, 10);
  s.add(fill);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(20, 32), new THREE.MeshBasicMaterial({ color: 0xcfcfcd }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.5;
  s.add(floor);
  const pm = new THREE.PMREMGenerator(gl);
  const tex = pm.fromScene(s, 0.03).texture;
  pm.dispose();
  s.traverse((n) => {
    const m = n as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  });
  return tex;
}

/** Sky dome shader: horizon haze to zenith blue, soft procedural clouds, a sun glow toward `sunDir`. */
export function skyMaterial(sunDir: THREE.Vector3, forEnv = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: !forEnv,
    uniforms: { sunDir: { value: sunDir.clone().normalize() }, gain: { value: forEnv ? 1.0 : 1.0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.99999; }`,
    fragmentShader: `
      varying vec3 vDir; uniform vec3 sunDir; uniform float gain;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for(int i=0;i<5;i++){ s += a*noise(p); p *= 2.03; a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.2, 1.0);
        vec3 zenith = vec3(0.24, 0.47, 0.86);
        vec3 horizon = vec3(0.80, 0.88, 0.96);
        vec3 col = mix(horizon, zenith, pow(max(h, 0.0), 0.55));
        // clouds on a plane above
        if (d.y > 0.02) {
          vec2 uv = d.xz / (d.y + 0.12) * 1.3;
          float c = smoothstep(0.52, 0.78, fbm(uv + vec2(3.1, 1.7)));
          float fade = smoothstep(0.02, 0.25, d.y);
          col = mix(col, vec3(1.0, 1.0, 0.99), c * 0.75 * fade);
        }
        float sd = max(dot(d, sunDir), 0.0);
        col += vec3(1.0, 0.93, 0.80) * (pow(sd, 350.0) * 6.0 + pow(sd, 12.0) * 0.22);
        // ground bounce below the horizon
        col = mix(col, vec3(0.42, 0.42, 0.40), smoothstep(0.0, -0.08, d.y));
        gl_FragColor = vec4(col * gain, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

export function skyEnv(gl: THREE.WebGLRenderer, sunDir: THREE.Vector3): THREE.Texture {
  const s = new THREE.Scene();
  const mat = skyMaterial(sunDir, true);
  // PMREM renders to a linear target, so skip the output colour-space conversion for the env version.
  mat.fragmentShader = mat.fragmentShader.replace('#include <colorspace_fragment>', '');
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), mat));
  const pm = new THREE.PMREMGenerator(gl);
  const tex = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  return tex;
}

/** Sun direction (toward the sun) in model-local world axes from the time of day and window facing. */
export function sunDirection(timeOfDay: string, facing: 'east' | 'north' | 'south' | 'west'): THREE.Vector3 {
  const [hh, mm] = timeOfDay.split(':').map(Number);
  const hours = hh + (mm || 0) / 60;
  // Simple solar arc for Bangalore (13°N): sunrise 06:15, noon 12:20; 10:30 gives azimuth ≈110°, elevation ≈45°.
  const t = Math.min(1, Math.max(0, (hours - 6.25) / 12.2)); // 0 sunrise … 1 sunset
  const elevation = Math.max(4, 50.7 * Math.sin(Math.PI * t));
  // Near the tropics the sun stays close to due east all morning and swings south quickly around noon.
  const azimuth = t <= 0.5 ? 75 + 105 * Math.pow(2 * t, 3) : 285 - 105 * Math.pow(2 * (1 - t), 3); // compass degrees
  // The plan's +x is "east" by assumption; if the hero windows face another way, rotate the sun instead of the model.
  const turn = { east: 0, south: -90, west: 180, north: 90 }[facing];
  const az = THREE.MathUtils.degToRad(azimuth + turn);
  const el = THREE.MathUtils.degToRad(elevation);
  // compass → plan (x east, y north) → world (x, y up, -north)
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}
