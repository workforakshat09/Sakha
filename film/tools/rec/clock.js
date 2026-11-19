/* Recording clock. Injected into the page before any of its scripts run.

   A browser cannot be screen-recorded smoothly from the outside: frames arrive late and unevenly. So the
   page's sense of time is replaced with a clock that only moves when the recorder says so. Each video frame
   the recorder advances the clock by exactly one frame's worth of time, lets the page draw, and takes a
   picture. The result is perfectly even motion at any frame rate, however long each picture takes.

   What is put on the clock: performance.now, Date.now, requestAnimationFrame, setTimeout/setInterval, and
   every CSS transition, CSS animation and Web Animation on the document timeline (scroll-driven animations
   are left alone: they follow the scroll position, which the recorder sets directly). */
(() => {
  if (window.__clock) return;
  const R = {
    raf: window.requestAnimationFrame.bind(window),
    st: window.setTimeout.bind(window),
    dnow: Date.now.bind(Date),
  };
  let vt = 0, nextId = 1, started = false, rafQ = new Map();
  const base = R.dnow(), timers = new Map(), seen = new Map(), errors = [];

  performance.now = () => vt;
  Date.now = () => base + vt;
  window.requestAnimationFrame = (cb) => { const id = nextId++; rafQ.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { rafQ.delete(id); };
  window.setTimeout = (cb, ms, ...args) => { const id = nextId++; if (typeof cb === 'function') timers.set(id, { due: vt + Math.max(0, +ms || 0), cb, args, every: 0 }); return id; };
  window.setInterval = (cb, ms, ...args) => { const id = nextId++; const every = Math.max(1, +ms || 0); if (typeof cb === 'function') timers.set(id, { due: vt + every, cb, args, every }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };

  const onClock = (a) => !a.timeline || a.timeline === document.timeline;
  // put every animation at the time the clock says; ones not seen before start now
  function syncAnimations() {
    for (const a of document.getAnimations()) {
      if (!onClock(a)) continue;
      if (!seen.has(a)) seen.set(a, vt);
      const local = vt - seen.get(a);
      let end = Infinity;
      try { end = a.effect ? a.effect.getComputedTiming().endTime : Infinity; } catch (e) { /* keep Infinity */ }
      try {
        if (local >= end) { a.finish(); seen.delete(a); }
        else { if (a.playState !== 'paused') a.pause(); a.currentTime = local; }
      } catch (e) { /* an animation that cannot be driven is left as it is */ }
    }
  }
  // until the recording starts, everything waits at its first frame
  (function hold() { if (started) return; syncAnimations(); R.raf(hold); })();

  window.__clock = {
    get time() { return vt; },
    errors,
    // wait for the browser itself to produce n real frames (layout, observers, painting)
    frames: (n = 1) => new Promise((res) => { const f = () => (--n <= 0 ? res() : R.raf(f)); R.raf(f); }),
    wait: (ms) => new Promise((res) => R.st(res, ms)),
    sync: syncAnimations,
    step(dt) {
      started = true;
      vt += dt;
      const due = [...timers].filter(([, t]) => t.due <= vt).sort((a, b) => a[1].due - b[1].due);
      for (const [id, t] of due) {
        if (!timers.has(id)) continue;
        if (t.every) t.due += t.every; else timers.delete(id);
        try { t.cb(...t.args); } catch (e) { errors.push(String(e && e.stack || e)); }
      }
      const q = rafQ; rafQ = new Map();
      for (const cb of q.values()) { try { cb(vt); } catch (e) { errors.push(String(e && e.stack || e)); } }
      syncAnimations();
    },
  };
})();
