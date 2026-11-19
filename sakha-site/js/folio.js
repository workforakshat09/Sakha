/* The peacock folio: a page of text that a painted peacock walks through.
   Every frame the lines are laid out again around the bird's own outline (read from the painting's alpha),
   so they part as he moves; press and he turns, spreads his train, and the words nearest him turn gold.
   The real paragraphs stay in the page for screen readers and for anyone without canvas. */
(function () {
  'use strict';
  const page = document.querySelector('.folio__page');
  const canvas = page && page.querySelector('canvas');
  const x = canvas && canvas.getContext('2d');
  if (!x) return;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOUCH = matchMedia('(hover: none)').matches;
  const textEl = page.querySelector('.folio__text');
  const hintEl = textEl.querySelector('.folio__hint');
  if (hintEl && TOUCH) hintEl.textContent = 'Touch the page and he will come. Hold, and he will dance.';
  const paras = [...textEl.querySelectorAll('p')].map((p) => ({ words: p.textContent.trim().split(/\s+/), hint: p === hintEl }));
  const cap = paras[0].words[0][0];
  paras[0].words[0] = paras[0].words[0].slice(1); // the drop cap takes the first letter

  const INK = [191, 184, 172], GOLD = [242, 196, 107], DIM = [142, 136, 126];
  const mixc = (a, b, t) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerpN = (a, b, t) => a + (b - a) * t;

  let W = 0, H = 0, lh = 28, font = '', capFont = '', capW = 0, sp = 5;
  const widths = new Map();
  const wid = (w) => { let v = widths.get(w); if (v == null) { v = x.measureText(w).width; widths.set(w, v); } return v; };

  /* ---------- the two paintings, and their outlines ---------- */
  // each sprite: the image, its outline as one [left, right] span per row (fractions), and where its feet and head are
  const SPRITES = { walk: 'img/peacock-walk.webp', fan: 'img/peacock-fan.webp' };
  const SP = {};
  const ROWS = 120;
  function outline(img) {
    const cw = 240, ch = Math.round(cw * img.naturalHeight / img.naturalWidth), o = document.createElement('canvas');
    o.width = cw; o.height = ch;
    const c = o.getContext('2d'); c.drawImage(img, 0, 0, cw, ch);
    const d = c.getImageData(0, 0, cw, ch).data, rows = [];
    let top = ROWS, bot = 0;
    for (let r = 0; r < ROWS; r++) {
      const y = Math.floor(r / ROWS * ch); let l = -1, rr = -1;
      for (let i = 0; i < cw; i++) if (d[(y * cw + i) * 4 + 3] > 70) { if (l < 0) l = i; rr = i; }
      rows.push(l < 0 ? null : [l / cw, (rr + 1) / cw]);
      if (l >= 0) { top = Math.min(top, r); bot = Math.max(bot, r); }
    }
    // feet: the middle of the lowest rows of the bird; head: the middle of the top rows
    const mid = (a) => a.reduce((s, q) => s + (q[0] + q[1]) / 2, 0) / a.length;
    const feet = rows.slice(bot - 3, bot + 1).filter(Boolean), head = rows.slice(top, top + 6).filter(Boolean);
    return { img, rows, aspect: ch / cw, fx: mid(feet), fy: (bot + 1) / ROWS, hx: mid(head), hy: top / ROWS + 0.08 };
  }
  const ready = Promise.all(Object.entries(SPRITES).map(([k, src]) => new Promise((ok) => {
    const img = new Image(); img.decoding = 'async';
    img.onload = () => { SP[k] = outline(img); ok(); };
    img.onerror = ok;
    img.src = src;
  })));

  /* ---------- layout ---------- */
  // the free stretches of the line [y, y+lh] once the bird's outline is cut out of it
  function free(y, blocks, from) {
    let l = Infinity, r = -Infinity;
    for (const b of blocks) if (b.y + b.h > y && b.y < y + lh) { l = Math.min(l, b.l); r = Math.max(r, b.r); }
    const spans = r < l ? [[from, W]] : [[from, l - 14], [r + 14, W]];
    return spans.filter(([a, b]) => b - a > lh * 2.4);
  }

  function layout(blocks, limit) {
    const out = []; let y = 0, guard = 0;
    paras.forEach((P, pi) => {
      let i = 0;
      while (i < P.words.length && y < limit && guard++ < 800) {
        const spans = free(y, blocks, pi === 0 && y < lh * 3 ? capW : 0);
        for (const [a, b] of spans) {
          let cx = a;
          while (i < P.words.length && cx + wid(P.words[i]) <= b) { out.push({ w: P.words[i], x: cx, y, hint: P.hint }); cx += wid(P.words[i]) + sp; i++; }
          if (i >= P.words.length) break;
        }
        // a word wider than every gap would never fit: a line with nothing in the way takes it anyway
        if (!spans.length && !blocks.length) { out.push({ w: P.words[i], x: 0, y, hint: P.hint }); i++; }
        y += lh;
      }
      y += lh * 0.55;
    });
    return { out, h: y };
  }

  /* ---------- the peacock ---------- */
  const B = { x: 0, y: 0, vx: 0, vy: 0, fd: 1, f: 0, walk: 0 }; // x, y: where his feet touch the page
  const ptr = { x: 0, y: 0, at: 0 };
  let pressed = false, pressAt = -1e9, placed = false, dw = 300, fw = 320;
  const fe = () => smooth(0, 1, B.f);

  // where a sprite sits: drawn w wide with its feet at (B.x, B.y), mirrored when flip < 0, lifted from the feet by lift
  function place(S, w, flip, lift) {
    const h = w * S.aspect;
    return { S, w, h, x0: B.x - S.fx * w * flip, y0: B.y - S.fy * h * lift, flip, lift };
  }
  function blocksOf(p) {
    const out = [], rh = p.h * p.lift / ROWS;
    p.S.rows.forEach((q, i) => {
      if (!q) return;
      const a = p.x0 + q[0] * p.w * p.flip, b = p.x0 + q[1] * p.w * p.flip;
      out.push({ y: p.y0 + i * rh, h: rh, l: Math.min(a, b), r: Math.max(a, b) });
    });
    return out;
  }
  const flipOf = () => (Math.abs(B.fd) < 0.12 ? 0.12 * Math.sign(B.fd || 1) : B.fd);
  function poses() {
    const e = fe(), p = [];
    if (SP.walk && e < 0.98) p.push({ ...place(SP.walk, dw, flipOf(), 1), a: 1 - smooth(0.05, 0.6, e) });
    if (SP.fan && e > 0.02) p.push({ ...place(SP.fan, fw, 1, 0.55 + 0.45 * e), a: smooth(0.15, 0.7, e), open: e });
    return p;
  }
  // the text follows whichever pose is mostly showing, so it parts once, cleanly, as he turns
  // and it only re-flows once he has really moved, so small steps never make the words shiver
  let held = null, heldAt = null;
  function obstacles() {
    const p = poses().sort((a, b) => b.a - a.a)[0];
    if (!p) return [];
    const k = { x: B.x, y: B.y, f: Math.sign(p.flip), fan: p.open != null, e: fe() };
    if (!held || !heldAt || k.f !== heldAt.f || k.fan !== heldAt.fan || Math.abs(k.e - heldAt.e) > 0.12 ||
        Math.hypot(k.x - heldAt.x, k.y - heldAt.y) > 10) { held = blocksOf(k.fan ? p : { ...p, ...place(p.S, p.w, k.f, 1) }); heldAt = k; }
    return held;
  }

  // keep the whole bird, train or fan, on the page
  function clamp() {
    const e = fe(), S = SP.walk, F = SP.fan;
    if (!S || !F) return;
    const back = S.fx * dw, front = (1 - S.fx) * dw;
    let lo = lerpN(B.fd > 0 ? back : front, fw * 0.4, e), hi = W - lerpN(B.fd > 0 ? front : back, fw * 0.4, e);
    if (hi < lo) lo = hi = W / 2;
    B.x = Math.max(lo, Math.min(hi, B.x));
    const top = lerpN(S.fy * dw * S.aspect, F.fy * fw * F.aspect, e);
    B.y = Math.max(top + 4, Math.min(H - 4, B.y));
  }

  function resize() {
    const cs = getComputedStyle(textEl.querySelector('p'));
    W = page.clientWidth; const fs = parseFloat(cs.fontSize); lh = parseFloat(cs.lineHeight) || fs * 1.7;
    font = cs.fontWeight + ' ' + fs + 'px ' + cs.fontFamily;
    capFont = Math.round(lh * 3.1) + 'px ' + getComputedStyle(document.documentElement).getPropertyValue('--head');
    dw = Math.max(210, Math.min(470, W * 0.62)); fw = Math.max(260, Math.min(540, W * 0.74));
    widths.clear(); held = null; x.font = capFont; capW = x.measureText(cap).width + 12; x.font = font; sp = x.measureText(' ').width;
    // tall enough for the text plus the room the open fan takes
    const F = SP.fan, area = F ? F.rows.reduce((s, q) => s + (q ? (q[1] - q[0]) * fw : 0), 0) * fw * F.aspect / ROWS : W * lh * 4;
    H = Math.ceil(layout([], 1e9).h + Math.ceil(area / W / lh + 2) * lh);
    const d = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * d); canvas.height = Math.round(H * d); canvas.style.height = H + 'px';
    x.setTransform(d, 0, 0, d, 0, 0);
    if (!placed) { placed = true; B.x = W * 0.62; B.y = H * 0.6; }
    clamp();
    draw(performance.now());
  }

  let face = 1, turnedAt = 0;
  function update(now) {
    // he only moves for a hand that is moving: once it rests, he settles and the text holds still
    const live = now - ptr.at < 1800;
    B.f += ((pressed || now - pressAt < 1400 ? 1 : 0) - B.f) * (REDUCED ? 1 : 0.06);
    if (REDUCED || !SP.walk) return;
    const e = fe(), S = SP.walk;
    // he turns only when the hand is clearly behind him, and never twice in quick succession
    const rel = ptr.x - B.x;
    if (live && e < 0.3 && now - turnedAt > 900 && (face > 0 ? rel < -0.22 * dw : rel > 0.22 * dw)) { face = -face; turnedAt = now; }
    B.fd += (face - B.fd) * 0.22;
    // his head goes where the hand is
    const hox = (S.hx - S.fx) * dw * face, hoy = (S.hy - S.fy) * dw * S.aspect;
    const dx = live ? ptr.x - hox - B.x : 0, dy = live ? ptr.y - hoy - B.y : 0, d = Math.hypot(dx, dy);
    if (d > 28) { B.vx += dx / d * 0.14; B.vy += dy / d * 0.14; }
    B.vx *= d > 28 ? 0.9 : 0.75; B.vy *= d > 28 ? 0.9 : 0.75;
    const max = 2.2 * (1 - e) * Math.max(0.7, W / 760), v = Math.hypot(B.vx, B.vy);
    if (v > max) { B.vx *= max / (v || 1); B.vy *= max / (v || 1); }
    if (v < 0.05) { B.vx = B.vy = 0; }
    B.x += B.vx; B.y += B.vy;
    B.walk += Math.hypot(B.vx, B.vy) * 0.09;
    clamp();
  }

  function drawPose(p, now) {
    const t = now / 1000, moving = Math.min(1, Math.hypot(B.vx, B.vy) / 1.2);
    x.save();
    x.globalAlpha = p.a;
    if (p.open != null) {
      // the fan spreads from its base: a widening, growing sector reveals the painted train, with a faint shiver
      const hh = p.h * p.lift, bx = B.x, by = p.y0 + hh * 0.7, rad = p.w * (0.25 + 0.4 * p.open), span = Math.PI * (0.15 + 0.85 * p.open);
      x.beginPath(); x.moveTo(bx, by); x.arc(bx, by, rad, -Math.PI / 2 - span / 2 - 0.3, -Math.PI / 2 + span / 2 + 0.3); x.closePath();
      x.rect(bx - p.w * 0.12, by - hh * 0.35, p.w * 0.24, hh); // the bird itself is always there
      x.clip();
      const sh = 1 + Math.sin(t * 28) * 0.004 * p.open;
      x.translate(bx, B.y); x.scale(sh, 1); x.translate(-bx, -B.y);
      x.drawImage(p.S.img, p.x0, p.y0, p.w, p.h * p.lift);
    } else {
      // a walk is a gentle bob and sway: the painting stays whole, only its weight moves
      const bob = Math.abs(Math.sin(B.walk)) * -3 * moving, sway = Math.sin(B.walk) * 0.012 * moving;
      x.translate(B.x, B.y + bob); x.rotate(sway); x.scale(p.flip, 1);
      x.drawImage(p.S.img, -p.S.fx * p.w, -p.S.fy * p.h, p.w, p.h);
    }
    x.restore();
  }

  function draw(now) {
    x.clearRect(0, 0, W, H);
    const e = fe(), P = poses(), fan = P.find((p) => p.open != null);
    const { out } = layout(obstacles(), H - lh);
    // the drop cap, in marigold, three lines tall
    x.font = capFont; x.fillStyle = '#E8862A'; x.textBaseline = 'top'; x.fillText(cap, 0, -lh * 0.1);
    x.font = font; x.textBaseline = 'middle';
    const gx = B.x, gy = fan ? fan.y0 + fan.h * fan.lift * 0.6 : B.y, gr = fw * 0.75;
    for (const w of out) {
      const d = Math.hypot(w.x + wid(w.w) / 2 - gx, w.y + lh / 2 - gy), g = e * Math.pow(Math.max(0, 1 - d / gr), 0.7);
      x.fillStyle = mixc(w.hint ? DIM : INK, GOLD, g);
      x.fillText(w.w, w.x, w.y + lh / 2);
    }
    x.imageSmoothingQuality = 'high';
    P.forEach((p) => drawPose(p, now));
  }

  // hand on the page
  const at = (e) => { const r = canvas.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.at = performance.now(); };
  page.addEventListener('pointermove', at);
  page.addEventListener('pointerdown', (e) => { at(e); pressed = true; pressAt = performance.now(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => page.addEventListener(n, (e) => { pressed = false; if (n === 'pointerleave' && e.pointerType === 'mouse') ptr.at = 0; }));

  // run only while the page is on screen
  let on = false;
  const frame = (now) => { if (!on) return; requestAnimationFrame(frame); if (!placed) return; update(now); draw(now); };
  new IntersectionObserver(([en]) => { const was = on; on = en.isIntersecting; if (on && !was) requestAnimationFrame(frame); }, { rootMargin: '200px' }).observe(page);
  new ResizeObserver(() => { if (placed && page.clientWidth !== W) resize(); }).observe(page);

  page.classList.add('folio__page--live');
  Promise.all([document.fonts ? document.fonts.ready : null, ready]).then(resize);
})();
