// Custom @remotion/transitions presentation: the amber bloom. Also re-exports the stock ones used in the reel.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { TransitionPresentation, TransitionPresentationComponentProps } from '@remotion/transitions';
import { PALETTE } from './theme';
export { fade } from '@remotion/transitions/fade';
export { slide } from '@remotion/transitions/slide';
export { wipe } from '@remotion/transitions/wipe';
export { linearTiming, springTiming, TransitionSeries } from '@remotion/transitions';
type Props = { cx?: number; cy?: number };
const AmberBloomPresentation: React.FC<TransitionPresentationComponentProps<Props>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const p = presentationProgress; const cx = passedProps.cx ?? 540, cy = passedProps.cy ?? 960;
  // exiting scene: visible until p 0.5, bloom grows over it; entering: revealed from the bloom after 0.5
  const isExit = presentationDirection === 'exiting';
  const e = isExit ? Math.min(1, p / 0.55) : Math.max(0, (p - 0.45) / 0.55);
  const r = 2600 * (isExit ? e * e : 1 - (1 - e) * (1 - e));
  const active = isExit ? p > 0.001 : p < 0.999;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: isExit ? 1 : 1 }}>{children}</AbsoluteFill>
      {isExit && active ? <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(circle ${r}px at ${cx}px ${cy}px, ${PALETTE.amber} 0%, ${PALETTE.amber} 60%, rgba(255,171,91,0) 100%)` }} /> : null}
      {!isExit && active ? <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(circle ${2616 - r}px at ${cx}px ${cy}px, rgba(255,171,91,0) 0%, rgba(255,171,91,0) 50%, ${PALETTE.amber} 100%)`, opacity: 1 - e * 0.1 }} /> : null}
    </AbsoluteFill>
  );
};
export const amberBloom = (props: Props = {}): TransitionPresentation<Props> => ({ component: AmberBloomPresentation, props });
