// Beat registry: each beat module default-exports { Beat: React.FC, cues: Record<string, number> (absolute seconds) }.
// Missing modules fall back to a placeholder so the composition always builds while beats are developed in parallel.
import type React from 'react';
import { BEATS, type BeatId } from '../timeline';
import { makePlaceholder } from './_Placeholder';
export type BeatModule = { Beat: React.FC; cues: Record<string, number>; transition?: { kind: 'fade' | 'slide' | 'wipe' | 'bloom'; frames?: number; cx?: number; cy?: number } };
const reg: Record<BeatId, BeatModule> = {} as any;
const req = (id: BeatId, loader: () => BeatModule | null) => { try { const m = loader(); if (m && m.Beat) { reg[id] = m; return; } } catch (e) { /* missing */ } const b = BEATS.find((x) => x.id === id)!; reg[id] = { Beat: makePlaceholder(id, b.title), cues: {} }; };
import * as hook from './Hook';
import * as ui from './Ui';
import * as ux from './Ux';
import * as trap from './Trap';
import * as process_ from './Process';
import * as door from './Door';
import * as line from './Line';
import * as outro from './Outro';
req('hook', () => hook as any); req('ui', () => ui as any); req('ux', () => ux as any); req('trap', () => trap as any);
req('process', () => process_ as any); req('door', () => door as any); req('line', () => line as any); req('outro', () => outro as any);
export const beats = reg;
