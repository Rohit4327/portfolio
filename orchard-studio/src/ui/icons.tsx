const P: Record<string, string> = {
  prev: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
  play: 'M8 5.5v13l11-6.5z',
  pause: 'M8 5v14M16 5v14',
  reset: 'M4 12a8 8 0 1 0 3-6.2M4 4v4h4',
  labels: 'M4 7h10M4 12h16M4 17h7',
  settings: 'M4 8h10M18 8h2M4 16h2M10 16h10M16 6v4M8 14v4',
  close: 'M6 6l12 12M18 6L6 18',
  arrow: 'M5 12h14M13 6l6 6-6 6',
};
export function Icon({ n }: { n: keyof typeof P | string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={n === 'play' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[n]} />
    </svg>
  );
}
