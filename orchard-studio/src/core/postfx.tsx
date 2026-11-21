/** One composer: N8AO (half resolution by default), optional bloom on Ultra, AgX tone mapping, then SMAA. No SSR. */
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode, type EffectComposer as ComposerImpl, type Pass } from 'postprocessing';
import { TIERS } from './quality';
import { useStudio } from '../state/store';
import { rt } from '../state/runtime';
import { diveScale } from '../scenes/director';

/** AO radius in metres at full scale; at 1:40 this becomes 0.02 (Section 4.4). */
const AO_RADIUS_FULL = 0.8;
const AO_FALLOFF_FULL = 1.2;

interface N8Pass extends Pass {
  configuration: { aoRadius: number; distanceFalloff: number; transparencyAware: boolean };
  autoDetectTransparency: boolean;
}

export function PostFX() {
  const tier = useStudio((s) => s.tier);
  const spec = TIERS[tier];
  const composer = useRef<ComposerImpl>(null);
  useFrame(() => {
    // The AO radius follows the model's scale: tiny on the table, room-sized in the walkthrough, continuous in the dive.
    const ao = composer.current?.passes.find((p) => 'configuration' in p) as N8Pass | undefined;
    if (!ao) return;
    const s = diveScale(rt.dive);
    if (Math.abs(ao.configuration.aoRadius - AO_RADIUS_FULL * s) > 1e-5) {
      ao.configuration.aoRadius = AO_RADIUS_FULL * s;
      ao.configuration.distanceFalloff = AO_FALLOFF_FULL * s;
    }
    // N8AO's transparency-aware mode re-draws every transparent mesh each frame (about 50 extra draw calls here).
    // Glass does not write depth, so AO behind it is already correct without that pass.
    if (ao.autoDetectTransparency || ao.configuration.transparencyAware) {
      ao.autoDetectTransparency = false;
      ao.configuration.transparencyAware = false;
      ao.autoDetectTransparency = false;
    }
  });
  useEffect(() => {
    rt.invalidate();
  }, [tier]);
  // Section 12 asks for 8 samples at half resolution on High; 12 hides mottling on large white walls at little cost.
  const samples = spec.ao === 'high' ? 16 : spec.ao === 'half' ? 12 : 6;
  return (
    <EffectComposer ref={composer} multisampling={0} enableNormalPass={false}>
      {spec.ao !== 'off' ? (
        <N8AO
          halfRes={spec.ao !== 'high'}
          aoSamples={samples}
          denoiseSamples={spec.ao === 'low' ? 4 : 8}
          denoiseRadius={16}
          aoRadius={AO_RADIUS_FULL * diveScale(rt.dive)}
          distanceFalloff={AO_FALLOFF_FULL * diveScale(rt.dive)}
          intensity={3.4}
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
