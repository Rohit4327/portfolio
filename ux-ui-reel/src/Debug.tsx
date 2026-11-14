import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { Post } from './lib/Stage3D';
const Cube = () => (<><ambientLight intensity={0.3} /><directionalLight position={[3, 5, 4]} intensity={2.5} /><mesh rotation={[0.5, 0.8, 0]}><boxGeometry args={[2, 2, 2]} /><meshStandardMaterial color="#F6F2E8" /></mesh></>);
export const Debug: React.FC<{ mode: string }> = ({ mode }) => {
  const { width, height } = useVideoConfig();
  const gl: any = mode.includes('glopts') ? { antialias: false, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace } : { antialias: true };
  return (
    <AbsoluteFill style={{ backgroundColor: '#0D1016' }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 35, near: 0.05, far: 300, position: [0, 1, 6] }} gl={gl} shadows={mode.includes('shadows')}>
        {mode.includes('bg') ? <color attach="background" args={['#0D1016']} /> : null}
        {mode.includes('fog') ? <fog attach="fog" args={['#0D1016', 2.5, 6]} /> : null}
        <Cube />
        {mode.includes('post') ? <Post /> : null}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
