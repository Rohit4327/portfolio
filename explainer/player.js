/* Player: scales the 1920x1080 stage, drives the clock, plays the rendered soundtrack. */
(() => {
  const capture = /[?&]capture\b/.test(location.search);
  if (capture) document.body.classList.add('capture');

  const $ = (id) => document.getElementById(id);
  const screen = $('screen'), stage = $('stage'), poster = $('poster');
  const playBtn = $('play'), muteBtn = $('mute'), fsBtn = $('fs');
  const timeEl = $('time'), scrub = $('scrub'), fill = $('fill'), head = $('head');
  const chapterEl = $('chapter'), status = $('status');

  const ICON_PLAY = '<svg viewBox="0 0 16 16"><path d="M3 1l12 7-12 7z"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 16 16"><path d="M3 1h4v14H3zM9 1h4v14H9z"/></svg>';

  function fit() {
    if (capture) { stage.style.transform = 'none'; return; }
    const r = screen.getBoundingClientRect();
    const k = Math.min(r.width / 1920, r.height / 1080);
    stage.style.transform = `translate(${(r.width - 1920 * k) / 2}px, ${(r.height - 1080 * k) / 2}px) scale(${k})`;
  }
  window.addEventListener('resize', fit);
  new ResizeObserver(fit).observe(screen);
  fit();

  const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  FILM.ready.then(() => {
    const { DUR, CHAPTERS, render } = FILM;

    // ---------- capture API used by render/export.mjs ----------
    let wav = null;
    window.__film = {
      DUR,
      render: (t) => render(t),
      async audio() {
        const buf = await Score.render(FILM.CUES, DUR, 48000);
        wav = Score.toWav(buf);
        return wav.length;
      },
      audioChunk(i, size) {
        const part = wav.subarray(i, i + size);
        let s = '';
        for (let k = 0; k < part.length; k += 0x8000) s += String.fromCharCode.apply(null, part.subarray(k, k + 0x8000));
        return btoa(s);
      },
    };
    if (capture) { render(0); window.__filmReady = true; return; }

    // ---------- chapter ticks ----------
    CHAPTERS.forEach((c) => {
      if (c.t <= 0) return;
      const tk = document.createElement('div');
      tk.className = 'tick';
      tk.style.left = (c.t / DUR) * 100 + '%';
      tk.title = c.name;
      scrub.appendChild(tk);
    });

    // ---------- audio ----------
    let actx = null, gainNode = null, buffer = null, src = null, muted = false;
    // The export writes soundtrack.m4a next to the page. Decoding it is faster than
    // synthesizing; if it is missing, synthesize the same score in the browser.
    async function loadSoundtrack() {
      try {
        const r = await fetch('soundtrack.m4a');
        if (!r.ok) throw new Error(r.status);
        return await new OfflineAudioContext(2, 1, 44100).decodeAudioData(await r.arrayBuffer());
      } catch (e) {
        return Score.render(FILM.CUES, DUR, 44100, (p) => { status.textContent = `Scoring soundtrack… ${Math.round(p * 100)}%`; });
      }
    }
    loadSoundtrack().then((b) => {
      buffer = b;
      status.textContent = '';
      if (playing) startAudio(now());
    }).catch(() => { status.textContent = 'Sound unavailable'; });

    function ensureCtx() {
      if (actx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      gainNode = actx.createGain();
      gainNode.gain.value = muted ? 0 : 1;
      gainNode.connect(actx.destination);
    }
    function startAudio(t) {
      stopAudio();
      if (!actx || !buffer || t >= DUR) return;
      src = actx.createBufferSource();
      src.buffer = buffer;
      src.connect(gainNode);
      src.start(actx.currentTime + 0.03, t);
      clock = { ctx: true, t0: actx.currentTime + 0.03, off: t };
    }
    function stopAudio() {
      if (src) { try { src.stop(); } catch (e) { /* already stopped */ } src.disconnect(); src = null; }
    }

    // ---------- clock ----------
    let playing = false, cur = FILM.POSTER_T, clock = null, raf = 0;
    function now() {
      if (!playing || !clock) return cur;
      if (clock.ctx && actx) return Math.max(clock.off, clock.off + (actx.currentTime - clock.t0));
      return clock.off + (performance.now() - clock.p0) / 1000;
    }
    function frame() {
      const t = now();
      if (t >= DUR) { cur = DUR; pause(); draw(DUR); return; }
      draw(t);
      raf = requestAnimationFrame(frame);
    }
    function draw(t) {
      render(t);
      const p = t / DUR;
      fill.style.width = p * 100 + '%';
      head.style.left = p * 100 + '%';
      scrub.setAttribute('aria-valuenow', Math.round(t));
      timeEl.textContent = `${mmss(t)} / ${mmss(DUR)}`;
      let ch = CHAPTERS[0];
      for (const c of CHAPTERS) if (c.t <= t + 0.01) ch = c;
      chapterEl.textContent = ch.name;
    }
    function play() {
      if (playing) return;
      ensureCtx();
      if (actx && actx.state === 'suspended') actx.resume();
      if (cur >= DUR - 0.05) cur = 0;
      poster.hidden = true;
      playing = true;
      clock = { ctx: false, p0: performance.now(), off: cur };
      startAudio(cur);
      playBtn.innerHTML = ICON_PAUSE; playBtn.setAttribute('aria-label', 'Pause');
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    }
    function pause() {
      if (!playing) return;
      cur = Math.min(DUR, now());
      playing = false;
      stopAudio();
      cancelAnimationFrame(raf);
      playBtn.innerHTML = ICON_PLAY; playBtn.setAttribute('aria-label', 'Play');
    }
    function seek(t) {
      t = Math.max(0, Math.min(DUR, t));
      poster.hidden = true;
      if (playing) { cur = t; clock = { ctx: false, p0: performance.now(), off: t }; startAudio(t); }
      else { cur = t; draw(t); }
    }

    // ---------- controls ----------
    poster.addEventListener('click', () => { cur = 0; play(); });
    playBtn.addEventListener('click', () => {
      if (playing) return pause();
      if (!poster.hidden) cur = 0;
      play();
    });
    muteBtn.addEventListener('click', () => {
      muted = !muted;
      if (gainNode) gainNode.gain.value = muted ? 0 : 1;
      muteBtn.textContent = muted ? 'Sound off' : 'Sound on';
    });
    fsBtn.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await screen.requestFullscreen();
      } catch (e) { /* fullscreen not allowed here */ }
    });
    let dragging = false;
    const at = (e) => { const r = scrub.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * DUR; };
    scrub.addEventListener('pointerdown', (e) => { dragging = true; scrub.setPointerCapture(e.pointerId); seek(at(e)); });
    scrub.addEventListener('pointermove', (e) => { if (dragging) seek(at(e)); });
    scrub.addEventListener('pointerup', () => { dragging = false; });
    scrub.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { seek(now() + 5); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { seek(now() - 5); e.preventDefault(); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); playing ? pause() : (poster.hidden ? play() : (cur = 0, play())); }
      else if (e.key === 'ArrowRight' && e.target !== scrub) seek(now() + 5);
      else if (e.key === 'ArrowLeft' && e.target !== scrub) seek(now() - 5);
      else if (e.key === 'm') muteBtn.click();
      else if (e.key === 'f') fsBtn.click();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

    // poster frame: the name, fully set
    draw(cur);
    fit();
  });
})();
