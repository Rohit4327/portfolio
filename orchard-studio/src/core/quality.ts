import type { QualityTier } from '../config';
import type { Tier } from '../state/store';

export interface TierSpec {
  shadowWalk: number;
  shadowModel: number;
  ao: 'high' | 'half' | 'low' | 'off';
  /** Reflector resolution for the presentation floor, 0 = environment only. */
  reflector: number;
  dprMax: number;
  bloom: boolean;
  pathTrace: boolean;
  simpleCity: boolean;
}
/** Section 15 quality tiers. */
export const TIERS: Record<Tier, TierSpec> = {
  ultra: { shadowWalk: 4096, shadowModel: 2048, ao: 'high', reflector: 1024, dprMax: 1.5, bloom: true, pathTrace: true, simpleCity: false },
  high: { shadowWalk: 4096, shadowModel: 2048, ao: 'half', reflector: 512, dprMax: 1.5, bloom: false, pathTrace: false, simpleCity: false },
  medium: { shadowWalk: 2048, shadowModel: 2048, ao: 'low', reflector: 0, dprMax: 1.25, bloom: false, pathTrace: false, simpleCity: false },
  low: { shadowWalk: 1024, shadowModel: 1024, ao: 'off', reflector: 0, dprMax: 1.0, bloom: false, pathTrace: false, simpleCity: true },
};
export const TIER_ORDER: Tier[] = ['low', 'medium', 'high', 'ultra'];
/** Auto starts at High and lets PerformanceMonitor move it; an explicit choice is used as is. */
export const initialTier = (q: QualityTier): Tier => (q === 'auto' ? 'high' : q);
export const stepTier = (t: Tier, dir: -1 | 1): Tier => TIER_ORDER[Math.max(0, Math.min(2, TIER_ORDER.indexOf(t) + dir))];
