// The reel's master timeline. Beat boundaries are the narration anchors (see audio/narration_reel.py); narration word timings
// come from audio/out/narration_timing.json. All beat modules read times through these helpers — never hard-code seconds.
import narration from '../audio/out/narration_timing.json';
export const FPS = 30;
export const WIDTH = 1080, HEIGHT = 1920;
export const TOTAL = 150;
export const BEATS = [
  { id: 'hook', title: 'The hook', start: 0.0, end: 8.6 },
  { id: 'ui', title: 'UI — what you see and touch', start: 8.6, end: 30.4 },
  { id: 'ux', title: 'UX — what you feel across the journey', start: 30.4, end: 52.4 },
  { id: 'trap', title: 'The trap — beautiful UI, frustrating UX', start: 52.4, end: 72.4 },
  { id: 'process', title: 'How it is made', start: 72.4, end: 100.4 },
  { id: 'door', title: 'The door', start: 100.4, end: 125.4 },
  { id: 'line', title: 'The line', start: 125.4, end: 142.2 },
  { id: 'outro', title: 'Outro', start: 142.2, end: 150.0 },
] as const;
export type BeatId = (typeof BEATS)[number]['id'];
export const beat = (id: BeatId) => BEATS.find((b) => b.id === id)!;
export const sec = (t: number) => Math.round(t * FPS);           // seconds -> frames
export const beatFrames = (id: BeatId) => sec(beat(id).end) - sec(beat(id).start);
export type Word = { w: string; s: number; e: number };
export type Sentence = { i: number; text: string; start: number; end: number; words: Word[] };
export const SENTENCES: Sentence[] = (narration as any).sentences;
export const WORDS: (Word & { si: number })[] = SENTENCES.flatMap((s) => s.words.map((w) => ({ ...w, si: s.i })));
/** first sentence whose text contains `needle` (case-insensitive) */
export const sent = (needle: string): Sentence => {
  const n = needle.toLowerCase(); const s = SENTENCES.find((x) => x.text.toLowerCase().includes(n));
  if (!s) throw new Error(`sentence not found: ${needle}`); return s;
};
/** absolute time (s) the word `needle` is spoken inside the sentence containing `sentenceNeedle` */
export const wordAt = (sentenceNeedle: string, needle: string): number => {
  const s = sent(sentenceNeedle); const n = needle.toLowerCase();
  const w = s.words.find((x) => x.w.toLowerCase().replace(/[^a-z0-9']/g, '') === n.replace(/[^a-z0-9']/g, ''));
  return w ? w.s : s.start;
};
/** local time (s) inside a beat for an absolute time */
export const local = (id: BeatId, tAbs: number) => tAbs - beat(id).start;
