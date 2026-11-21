/** Per-frame callbacks registered by systems (tour, interactions, dive). Each returns true while it animates. */
export type FrameHook = (dt: number) => boolean;
interface Hooks extends Array<FrameHook> {
  /** Set while a system (dive, inspect pose) drives the camera itself. */
  cameraOverride: boolean;
  /** Set when walking is allowed during an inspect state (headset passthrough). */
  walkWhileInspecting: boolean;
}
export const frameHooks = Object.assign([] as FrameHook[], { cameraOverride: false, walkWhileInspecting: false }) as Hooks;
export function addFrameHook(h: FrameHook): () => void {
  frameHooks.push(h);
  return () => {
    const i = frameHooks.indexOf(h);
    if (i >= 0) frameHooks.splice(i, 1);
  };
}
