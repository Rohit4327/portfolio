/** Frosted cards: the presentation zone card and the walkthrough inspect card with each interaction's controls. */
import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../config';
import { CONTENT } from '../data/manifest';
import { zonesFor } from '../data/plan';
import { exitToModel } from '../scenes/transition/dive';
import { rt } from '../state/runtime';
import { useStudio, type InspectState } from '../state/store';
import { boardPenUp, boardStroke } from '../systems/interactions';
import { endInspect, inspectAction } from '../systems/inspect';
import { startTour } from '../systems/tour';
import { resetPresentationCamera } from '../scenes/Stage';
import { Icon } from './icons';
import { zoneCopy } from './zoneText';

export function ZoneCard() {
  const id = useStudio((s) => s.activeZone);
  const layout = useStudio((s) => s.layout);
  const z = zonesFor(layout).find((q) => q.id === id);
  if (!z) return null;
  const c = zoneCopy(z, layout);
  return (
    <div className="card zone" data-testid="zone-card">
      <small>{z.n ? `Zone ${String(z.n).padStart(2, '0')}` : 'Context'}</small>
      <h3>{z.name}</h3>
      <div className="meta">{c.size}</div>
      <ul>
        {c.components.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <p>{c.why}</p>
      <button
        className="txt"
        onClick={() => {
          useStudio.getState().set({ activeZone: null });
          resetPresentationCamera();
        }}
      >
        Close
      </button>
    </div>
  );
}

const D = (s: InspectState, k: string) => s.data[k];

function Body({ s }: { s: InspectState }) {
  const [q, setQ] = useState('Show me apps built for retail');
  switch (s.kind) {
    case 'kiosk':
    case 'journey':
      return (
        <div className="row">
          <button className="txt" onClick={() => inspectAction('prev')}>
            Back
          </button>
          <span className="dots">{s.kind === 'kiosk' ? `${s.page + 1} / ${s.pages}` : 'West to east'}</span>
          <button className="txt strong" onClick={() => inspectAction('next')}>
            Next
          </button>
        </div>
      );
    case 'landing':
    case 'corridorScreen':
      return (
        <div className="row">
          <button className="txt strong" onClick={() => inspectAction('play')}>
            {D(s, 'playing') ? 'Pause' : 'Play'}
          </button>
          <button className="txt" onClick={() => inspectAction('mute')}>
            {D(s, 'muted') ? 'Unmute' : 'Mute'}
          </button>
        </div>
      );
    case 'galleria':
      return (
        <>
          <div className="row">
            <button className="txt" onClick={() => inspectAction('prev')}>
              Back
            </button>
            <span className="dots">
              Screen {s.page + 1} / {s.pages}
            </span>
            <button className="txt" onClick={() => inspectAction('next')}>
              Next
            </button>
          </div>
          <div className="row">
            <button className="txt" data-testid="scan" onClick={() => inspectAction('scan')}>
              {D(s, 'scanning') ? 'Scanning…' : D(s, 'scanned') ? 'Opened' : 'Scan QR'}
            </button>
            <button className="txt strong" data-testid="put-back" onClick={() => endInspect()}>
              Put back
            </button>
          </div>
          <form
            className="ask"
            onSubmit={(e) => {
              e.preventDefault();
              inspectAction('ask', q);
            }}
          >
            <i className="orb" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Ask" />
            <button className="txt">Ask</button>
          </form>
          {D(s, 'asked') ? <div className="meta">{(D(s, 'hits') as number[]).length} matching devices glow on the rail.</div> : null}
        </>
      );
    case 'plinth':
      return (
        <div className="row">
          <button className="txt" onClick={() => inspectAction('prev')}>
            Previous
          </button>
          <span className="dots">
            {s.page + 1} / {s.pages}
          </span>
          <button className="txt strong" onClick={() => inspectAction('next')}>
            Next
          </button>
        </div>
      );
    case 'voices': {
      const v = CONTENT.voices[s.page % CONTENT.voices.length];
      return (
        <>
          <blockquote>“{v.quote}”</blockquote>
          <div className="meta">
            {v.by} · {v.role}
          </div>
          <div className="row">
            <button className="txt" onClick={() => useStudio.getState().set({ inspect: { ...s, page: (s.page + s.pages - 1) % s.pages } })}>
              Back
            </button>
            <button className="txt" onClick={() => useStudio.getState().toast('Video placeholder: add the file to public/media')}>
              Play
            </button>
            <button className="txt strong" onClick={() => useStudio.getState().set({ inspect: { ...s, page: (s.page + 1) % s.pages } })}>
              Next
            </button>
          </div>
        </>
      );
    }
    case 'fivePoint':
      return (
        <ol className="levels">
          {CONTENT.fivePoint.map((l) => (
            <li key={l.level}>
              <b>{l.level}</b> {l.name}
              <span>{l.text}</span>
            </li>
          ))}
        </ol>
      );
    case 'board':
      return (
        <div className="row">
          {D(s, 'session') ? (
            <>
              <button className="txt" onClick={() => inspectAction('clear')}>
                Clear
              </button>
              <button className="txt strong" data-testid="board-end" onClick={() => inspectAction('end')}>
                End session
              </button>
            </>
          ) : (
            <button className="txt strong" data-testid="board-start" onClick={() => inspectAction('start')}>
              Start session
            </button>
          )}
        </div>
      );
    case 'foosball':
      return (
        <>
          <div className="score">
            <b className="blue">{(D(s, 'blue') as number) ?? 0}</b>
            <span>:</span>
            <b className="amber">{(D(s, 'amber') as number) ?? 0}</b>
          </div>
          {D(s, 'winner') ? <div className="meta">{D(s, 'winner') === 'blue' ? 'You win.' : 'The house wins.'}</div> : null}
          {D(s, 'playing') ? (
            <>
              <div className="row roles">
                {['Keeper', 'Defence', 'Midfield', 'Attack'].map((r, i) => (
                  <button key={r} className={`txt${D(s, 'role') === i ? ' strong' : ''}`} onClick={() => inspectAction('role', i)}>
                    {i + 1} {r}
                  </button>
                ))}
              </div>
              <div className="row touch">
                <button className="txt" onPointerDown={() => inspectAction('slide', -1)} onPointerUp={() => inspectAction('slide', 0)}>
                  ▲
                </button>
                <button className="txt" onPointerDown={() => inspectAction('slide', 1)} onPointerUp={() => inspectAction('slide', 0)}>
                  ▼
                </button>
                <button className="txt strong" onPointerDown={() => inspectAction('kick')}>
                  Kick
                </button>
                <button className="txt" onClick={() => inspectAction('pause')}>
                  {D(s, 'paused') ? 'Resume' : 'Pause'}
                </button>
                <button className="txt" onClick={() => inspectAction('restart')}>
                  Restart
                </button>
              </div>
            </>
          ) : (
            <div className="row">
              <button className="txt strong" data-testid="foos-start" onClick={() => inspectAction('start')}>
                Start match
              </button>
            </div>
          )}
        </>
      );
    case 'selfie':
      return D(s, 'phase') === 'print' ? null : (
        <div className="row">
          <button className="txt strong" data-testid="shoot" disabled={D(s, 'phase') !== 'ready'} onClick={() => inspectAction('shoot')}>
            Take a photo
          </button>
        </div>
      );
    case 'readNote':
      return D(s, 'open') ? (
        <>
          <p className="note">{CONTENT.readNote.body}</p>
          <div className="row">
            <button
              className="txt"
              onClick={() => {
                endInspect(true);
                exitToModel();
              }}
            >
              Back to model
            </button>
            <button
              className="txt strong"
              onClick={() => {
                endInspect(true);
                startTour(1);
              }}
            >
              Restart tour
            </button>
          </div>
        </>
      ) : null;
    default:
      return null;
  }
}

/** Whiteboard drawing: pointer strokes on the canvas map to the board's texture while a session is open. */
function useBoardDrawing(active: boolean) {
  useEffect(() => {
    const el = rt.gl?.domElement;
    if (!active || !el) return;
    let down = false;
    const pd = (e: PointerEvent) => {
      down = true;
      boardStroke(e.clientX, e.clientY, true);
    };
    const pm = (e: PointerEvent) => down && boardStroke(e.clientX, e.clientY, false);
    const pu = () => {
      down = false;
      boardPenUp();
    };
    el.addEventListener('pointerdown', pd);
    window.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);
    return () => {
      el.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
    };
  }, [active]);
}

export function InspectCard() {
  const s = useStudio((st) => st.inspect);
  useBoardDrawing(s?.kind === 'board' && !!s.data.session);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!useStudio.getState().inspect) return;
      if (e.code === 'Escape' || e.code === 'KeyX') endInspect();
      if (e.code === 'ArrowRight') inspectAction('next');
      if (e.code === 'ArrowLeft') inspectAction('prev');
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  if (!s) return null;
  if (s.kind === 'headset') return <HeadsetHud s={s} />;
  return (
    <>
      {s.kind === 'selfie' ? <SelfieLayer s={s} /> : null}
      {s.kind === 'galleria' && s.data.scanning ? <div className="scan" /> : null}
      <div className={`card inspect k-${s.kind}`} data-testid="inspect-card">
        <button className="x" onClick={() => endInspect()} aria-label="Back">
          <Icon n="close" />
        </button>
        <h3>{s.title}</h3>
        {s.kind !== 'fivePoint' ? s.lines.filter(Boolean).map((l) => <p key={l}>{l}</p>) : null}
        <Body s={s} />
        <div className="row end">
          <button className="txt" data-testid="inspect-back" onClick={() => endInspect()}>
            Back
          </button>
        </div>
      </div>
    </>
  );
}

function SelfieLayer({ s }: { s: InspectState }) {
  const phase = s.data.phase as string;
  const a = useRef<HTMLAnchorElement>(null);
  return (
    <>
      {phase === 'countdown' ? <div className="countdown">{s.data.n as number}</div> : null}
      {phase === 'flash' ? <div className="flash" /> : null}
      {phase === 'print' ? (
        <div className="print" data-testid="selfie-print">
          {/* Right-click or long-press saves the image if the host blocks downloads. */}
          <img src={s.data.url as string} alt="Your photo" />
          <b>{CONFIG.brandName}</b>
          <small>{s.data.date as string}</small>
          <div className="row">
            <a ref={a} className="txt strong" href={s.data.url as string} download="orchard-studio.jpg">
              Download
            </a>
            <button className="txt" onClick={() => endInspect()}>
              Done
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function HeadsetHud({ s }: { s: InspectState }) {
  const phase = s.data.phase as string;
  const tile = s.data.tile as number | null | undefined;
  return (
    <div className={`headset ${phase}`} data-testid="headset-hud" data-phase={phase}>
      {phase === 'home' ? (
        <div className="home">
          {tile === null || tile === undefined ? (
            <div className="tiles">
              {CONTENT.headsetApps.slice(0, 6).map((t, i) => (
                <button key={t.name} onClick={() => inspectAction('tile', i)} style={{ background: `linear-gradient(140deg, hsl(${30 + i * 47} 30% 86%), hsl(${50 + i * 47} 28% 72%))` }}>
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="window" style={{ background: `linear-gradient(140deg, hsl(${30 + tile * 47} 30% 88%), hsl(${50 + tile * 47} 28% 70%))` }}>
              <b>{CONTENT.headsetApps[tile % CONTENT.headsetApps.length].name}</b>
              <button className="txt" onClick={() => inspectAction('closeTile')}>
                Close
              </button>
            </div>
          )}
        </div>
      ) : null}
      {phase === 'passthrough' || phase === 'home' ? (
        <button className="txt strong remove" data-testid="headset-remove" onClick={() => endInspect()}>
          Remove headset
        </button>
      ) : null}
    </div>
  );
}
