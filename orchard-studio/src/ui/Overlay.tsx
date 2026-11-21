/** All HTML UI sits in this one overlay layer above the canvas. */
import { useEffect, useState } from 'react';
import { audio } from '../audio/engine';
import { CONFIG, LAYOUT_IDS, LAYOUT_NAMES, type LayoutId, type QualityTier } from '../config';
import { SUMMARY } from '../data/plan';
import { resetPresentationCamera } from '../scenes/Stage';
import { startDive } from '../scenes/transition/dive';
import { rt, touch } from '../state/runtime';
import { DEBUG, useStudio, type LabelsMode } from '../state/store';
import { InspectCard, ZoneCard } from './Cards';
import { Icon } from './icons';
import { Labels } from './Labels';
import { Hotspots, Joystick, Minimap, nudgeIfBlocked, Toasts, TourCaption, useAudioMuted, WalkDock } from './Walk';

const click = () => audio.play('click');

function switchLayout(l: LayoutId) {
  const st = useStudio.getState();
  if (st.layout === l) return;
  st.setLayout(l);
  audio.play('layoutSwitch');
  if (st.mode === 'walkthrough') nudgeIfBlocked();
}

function LayoutSwitcher() {
  const layout = useStudio((s) => s.layout);
  return (
    <div className="switcher">
      <div className="segmented" role="tablist">
        {LAYOUT_IDS.map((l, i) => (
          <button key={l} role="tab" aria-selected={layout === l} className={`${layout === l ? 'on' : ''}${l === 'rejected' ? ' rej' : ''}`} data-layout={l} onClick={() => switchLayout(l)} title={`Key ${i + 1}`}>
            {LAYOUT_NAMES[l]}
          </button>
        ))}
      </div>
      <div className={`chip${layout === 'rejected' ? ' rej' : ''}`} data-testid="summary-chip">
        {layout === 'rejected' ? <b>Rejected</b> : null}
        {SUMMARY[layout]}
      </div>
    </div>
  );
}

function Settings() {
  const s = useStudio();
  const a = useAudio();
  if (!s.settingsOpen) return null;
  const tiers: QualityTier[] = ['auto', 'ultra', 'high', 'medium', 'low'];
  return (
    <div className="sheet" data-testid="settings">
      <header>
        <h3>Settings</h3>
        <button className="x" onClick={() => s.set({ settingsOpen: false })} aria-label="Close">
          <Icon n="close" />
        </button>
      </header>
      <label>Quality</label>
      <div className="segmented small">
        {tiers.map((t) => (
          <button key={t} className={s.quality === t ? 'on' : ''} onClick={() => s.set({ quality: t })}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <Toggle label="Sound" on={!a.muted} set={(v) => audio.setMuted(!v)} />
      <label>Volume</label>
      <input type="range" min={0} max={1} step={0.05} value={a.volume} onChange={(e) => audio.setVolume(Number(e.target.value))} />
      <Toggle label={CONFIG.music ? 'Music' : 'Music (no track supplied)'} on={a.music && CONFIG.music} set={(v) => CONFIG.music && audio.setMusic(v)} />
      <Toggle label="Reduce motion" on={s.reducedMotion} set={(v) => s.set({ reducedMotion: v })} />
      <Toggle label="Auto-orbit (0.3°/s)" on={s.autoOrbit} set={(v) => (s.set({ autoOrbit: v }), touch(4))} />
      {DEBUG ? <Toggle label="Floor-plan underlay (debug)" on={s.underlay} set={() => (location.search = '?debug=plan')} /> : null}
    </div>
  );
}
function useAudio() {
  const [st, setSt] = useState(audio.getState());
  useEffect(() => audio.subscribe(setSt), []);
  return st;
}
function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button className="toggle" role="switch" aria-checked={on} onClick={() => (click(), set(!on))}>
      <span>{label}</span>
      <i className={on ? 'on' : ''} />
    </button>
  );
}

const NEXT_LABELS: Record<LabelsMode, LabelsMode> = { zones: 'doors', doors: 'off', off: 'zones' };
const LABEL_TEXT: Record<LabelsMode, string> = { zones: 'Labels · Zones', doors: 'Labels · Zones + Doors', off: 'Labels · Off' };

export function Overlay() {
  const loading = useStudio((s) => s.loading);
  const mode = useStudio((s) => s.mode);
  const labels = useStudio((s) => s.labels);
  const sheet = useStudio((s) => s.layoutSheetOpen);
  const hint = useStudio((s) => s.hint);
  const refining = useStudio((s) => s.refining);
  const tier = useStudio((s) => s.tier);
  useAudioMuted();

  useEffect(() => {
    // Audio unlocks on the first user gesture.
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    const key = (e: KeyboardEvent) => {
      const st = useStudio.getState();
      if (e.target instanceof HTMLInputElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4 && (st.mode === 'presentation' || st.layoutSheetOpen) && !st.inspect) switchLayout(LAYOUT_IDS[n - 1]);
    };
    const dbl = (e: MouseEvent) => {
      if (useStudio.getState().mode === 'presentation' && e.target === rt.gl?.domElement) resetPresentationCamera();
    };
    window.addEventListener('keydown', key);
    window.addEventListener('dblclick', dbl);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('keydown', key);
      window.removeEventListener('dblclick', dbl);
    };
  }, []);
  useEffect(() => {
    if (mode === 'presentation') audio.setBed('presentation');
  }, [mode]);

  const pres = mode === 'presentation';
  const walkMode = mode === 'walkthrough';
  return (
    <div className={`overlay mode-${mode}`}>
      {loading.done ? (
        <>
          <div className={`chrome${pres ? '' : ' out'}`}>
            <div className="brand">
              <b>{CONFIG.brandName}</b>
              <span>Yeshwanthpur, Bangalore</span>
            </div>
            <div className="topright">
              <div className="pill">
                ADC-05 <i /> Level 09
              </div>
              <button className="round" aria-label="Settings" data-testid="settings-btn" onClick={() => (click(), useStudio.getState().set({ settingsOpen: !useStudio.getState().settingsOpen }))}>
                <Icon n="settings" />
              </button>
            </div>
            <LayoutSwitcher />
            {pres ? <Labels /> : null}
            <div className="dock">
              <button className="primary" data-testid="start" onClick={() => (click(), startDive())}>
                Start experience <Icon n="arrow" />
              </button>
              <span className="sep" />
              <button className="txt" onClick={() => (click(), resetPresentationCamera(), useStudio.getState().set({ activeZone: null }))}>
                <Icon n="reset" /> Reset
              </button>
              <button className="txt" data-testid="labels-btn" onClick={() => (click(), useStudio.getState().set({ labels: NEXT_LABELS[labels] }))}>
                <Icon n="labels" /> {LABEL_TEXT[labels]}
              </button>
            </div>
            {pres ? <ZoneCard /> : null}
            {refining > 0 && tier === 'ultra' ? <div className="refining">Refining · {refining}</div> : null}
          </div>
          {walkMode ? (
            <>
              <Hotspots />
              <Minimap />
              <button className="round walk-settings" aria-label="Settings" onClick={() => useStudio.getState().set({ settingsOpen: !useStudio.getState().settingsOpen })}>
                <Icon n="settings" />
              </button>
              <TourCaption />
              <WalkDock />
              <InspectCard />
              <Joystick />
              {sheet ? (
                <div className="sheet layout-sheet">
                  <header>
                    <h3>Layout</h3>
                    <button className="x" onClick={() => useStudio.getState().set({ layoutSheetOpen: false })} aria-label="Close">
                      <Icon n="close" />
                    </button>
                  </header>
                  <LayoutSwitcher />
                </div>
              ) : null}
            </>
          ) : null}
          <Settings />
          <Toasts />
          {DEBUG === '1' ? <DebugStats /> : null}
        </>
      ) : null}
      <div className={`fade${hint === 'fade' ? ' on' : ''}`} />
      {!loading.done ? (
        <div className="loading">
          <div className="loading-title">Preparing the studio</div>
          <div className="loading-bar">
            <i style={{ width: `${Math.round(loading.progress * 100)}%` }} />
          </div>
          <div className="loading-pct">{Math.round(loading.progress * 100)}%</div>
        </div>
      ) : null}
    </div>
  );
}

/** ?debug=1 only: renderer numbers. Never part of the production UI. */
function DebugStats() {
  const [t, setT] = useState('');
  useEffect(() => {
    const id = setInterval(() => {
      const i = rt.gl?.info;
      if (i) setT(`${i.render.calls} calls · ${(i.render.triangles / 1000).toFixed(0)}k tris · ${i.memory.textures} tex · ${useStudio.getState().tier}`);
    }, 500);
    return () => clearInterval(id);
  }, []);
  return <div className="debug-stats">{t}</div>;
}
