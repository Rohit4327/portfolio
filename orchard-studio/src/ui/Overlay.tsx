/** All HTML UI sits in this one overlay layer above the canvas. */
import { useStudio } from '../state/store';

export function Overlay() {
  const loading = useStudio((s) => s.loading);
  return (
    <div className="overlay">
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
