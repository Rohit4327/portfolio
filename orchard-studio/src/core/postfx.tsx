/** One composer: N8AO (half resolution by default), optional bloom on Ultra, AgX tone mapping, then SMAA. No SSR. */
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { TIERS } from './quality';
import { useStudio } from '../state/store';
import { rt } from '../state/runtime';
import { diveScale } from '../scenes/director';

/** AO radius in metres at full scale; at 1:40 this becomes 0.025 (Section 4.4). */
const AO_RADIUS_FULL = 1.0;
const AO_FALLOFF_FULL = 1.2;

interface N8Config {
  configuration: { aoRadius: number; distanceFalloff: number };
}

export function PostFX() {
  const tier = useStudio((s) => s.tier);
  const spec = TIERS[tier];
  const ao = useRef<N8Config>(null);
  useFrame(() => {
    const s = diveScale(rt.dive);
    if (ao.current && Math.abs(ao.current.configuration.aoRadius - AO_RADIUS_FULL * s) > 1e-5) {
      ao.current.configuration.aoRadius = AO_RADIUS_FULL * s;
      ao.current.configuration.distanceFalloff = AO_FALLOFF_FULL * s;
    }
  });
  useEffect(() => {
    rt.invalidate();
  }, [tier]);
  const samples = spec.ao === 'high' ? 16 : spec.ao === 'half' ? 8 : 6;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {spec.ao !== 'off' ? (
        <N8AO
          ref={ao as never}
          halfRes={spec.ao !== 'high'}
          aoSamples={samples}
          denoiseSamples={spec.ao === 'low' ? 4 : 8}
          denoiseRadius={12}
          aoRadius={AO_RADIUS_FULL * diveScale(rt.dive)}
          distanceFalloff={AO_FALLOFF_FULL * diveScale(rt.dive)}
          intensity={2.6}
          color="#1b1a18"
        />
      ) : (
        <></>
      )}
      {spec.bloom ? <Bloom luminanceThreshold={1.6} intensity={0.12} mipmapBlur radius={0.6} /> : <></>}
      <ToneMapping mode={ToneMappingMode.AGX} />
      <SMAA />
    </EffectComposer>
  );
}
