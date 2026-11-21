import { useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { PostFX } from './core/postfx';
import { initialTier, stepTier, TIERS } from './core/quality';
import { PlanView } from './debug/PlanView';
import { Stage } from './scenes/Stage';
import { rt } from './state/runtime';
import { DEBUG, useStudio } from './state/store';
import { Overlay } from './ui/Overlay';

function FrameStats() {
  // Records frame times for getFps() and flips the loading flag after the first real frames.
  useFrame((_, dt) => {
    if (rt.frameMs.length < 4000) rt.frameMs.push(dt * 1000);
    if (rt.frame === 4) useStudio.getState().set({ loading: { progress: 1, done: true } });
  }, 2);
  return null;
}

export function App() {
  const mode = useStudio((s) => s.mode);
  const quality = useStudio((s) => s.quality);
  const tier = useStudio((s) => s.tier);
  useEffect(() => {
    useStudio.getState().set({ tier: initialTier(quality), loading: { progress: 0.3, done: false } });
  }, [quality]);
  if (DEBUG === 'plan') return <PlanView />;
  const spec = TIERS[tier];
  return (
    <>
      <Canvas
        frameloop={mode === 'presentation' ? 'demand' : 'always'}
        dpr={[1, spec.dprMax]}
        shadows={false}
        camera={{ fov: 30, near: 0.05, far: 120, position: [0, 3.8, 1.6] }}
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false, depth: true }}
        onCreated={({ gl }) => {
          // Colour management (4.4): sRGB output; tone mapping is done once, in the composer (AgX).
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.NoToneMapping;
          gl.toneMappingExposure = 0.95;
        }}
      >
        <Stage />
        <PostFX />
        <FrameStats />
        {quality === 'auto' ? (
          <PerformanceMonitor
            bounds={() => [45, 58]}
            flipflops={2}
            onDecline={() => useStudio.getState().set({ tier: stepTier(useStudio.getState().tier, -1) })}
            onIncline={() => useStudio.getState().set({ tier: stepTier(useStudio.getState().tier, 1) })}
          />
        ) : null}
        <AdaptiveDpr />
      </Canvas>
      <Overlay />
    </>
  );
}
