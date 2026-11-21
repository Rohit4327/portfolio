export type LayoutId = 'today' | 'recommended' | 'keep9' | 'rejected';
export type QualityTier = 'auto' | 'ultra' | 'high' | 'medium' | 'low';

/** Section 18: open decisions as switches. */
export const CONFIG = {
  brandName: 'Orchard Studio', // or 'Orchard Dojo'
  defaultLayout: 'recommended' as LayoutId,
  futureProvisionBuilt: false, // red-line partition at x=3
  x33GlassType: 'frostedTo7ft' as 'frosted' | 'clear' | 'frostedTo7ft',
  kioskCount: 4, // 4 to 6, re-spaced between x 36 and 54
  roomNames: ['Discussion Room A · 6', 'Discussion Room B · 6'],
  windowFacing: 'east' as 'east' | 'north' | 'south' | 'west', // drives sun direction
  timeOfDay: '10:30',
  music: false, // true only if public/audio/music.* is supplied
  quality: 'auto' as QualityTier,
};

export const LAYOUT_IDS: LayoutId[] = ['today', 'recommended', 'keep9', 'rejected'];
export const LAYOUT_NAMES: Record<LayoutId, string> = {
  today: 'Today',
  recommended: 'Recommended',
  keep9: 'Keep 9 seats',
  rejected: 'Rejected',
};
