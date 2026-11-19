/* Sakha launch film, phonk cut. 30 fps, 1560 frames (52 s), cut to "Nirva - Modern Funk" (from 1.1 s), 164 BPM.
   B(n) is the frame of beat n, measured on the track: first beat 0.1038 s, one beat 0.36585 s.
   The track: intro with hats (beats 0-37) · bass hits on 38, 46, 53-54 · breakdown 55-67 · pickups 68-70 · a breath on 71 ·
   drop 72-103 (kick on even beats) · break 104-109 · drop 110-133 · outro 134+.
   window.__comp.seek(n) draws frame n (fractional n is allowed, for motion blur); nothing depends on wall time. */
(() => {
  'use strict';
  const TOTAL = 1560;
  const B = (n) => Math.round((0.1038 + n * 0.36585) * 30);
  const stage = document.getElementById('stage');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const k = (f, a, b) => clamp((f - a) / (b - a));
  const expo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const quart = (t) => 1 - Math.pow(1 - t, 4);
  const inout = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rng = (s) => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const el = (tag, cls, parent, html, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (css) e.style.cssText = css; (parent || stage).appendChild(e); return e; };
  // 'inherit', never 'visible': a child set visible would show through its hidden scene
  const show = (e, o) => { e.style.opacity = o; e.style.visibility = o > 0.001 ? 'inherit' : 'hidden'; };
  const IMG = (p) => '/site/img/' + p + '.webp';

  /* ---------- finishing layers ---------- */
  const leak = el('div', 'leak');
  const dust = el('canvas'); dust.id = 'dust'; dust.width = 1080; dust.height = 1350;
  el('div', 'vig');
  const flash = el('div', 'flash');
  const grain = el('canvas'); grain.id = 'grain'; grain.width = 540; grain.height = 675;
  const hud = el('div', 'hud', null, '<span class="mono tl">Sakha · सखा</span><span class="mono tr"></span><span class="mono bl"></span><span class="mono br">A concept by Akshat Jamwal</span><span class="bar"><i></i></span>');
  // grain: eight fixed noise tiles, one per frame in turn
  const tiles = [...Array(8)].map((_, i) => { const c = document.createElement('canvas'); c.width = 540; c.height = 675; const x = c.getContext('2d'), d = x.createImageData(540, 675), r = rng(11 + i); for (let p = 0; p < d.data.length; p += 4) { const v = r() * 255; d.data[p] = d.data[p + 1] = d.data[p + 2] = v; d.data[p + 3] = 255; } x.putImageData(d, 0, 0); return c; });
  const motes = [...Array(110)].map((_, i) => { const r = rng(300 + i); return { x: r() * 1080, y: r() * 1350, v: .4 + r() * 1.3, s: .8 + r() * 2.6, ph: r() * 6.28, a: .25 + r() * .6 }; });

  // the hits, in beats: a cut that lands hard carries a flash, a shake and a colour split
  const HB = [[0, .3], [2, .35], [8, .6],
    ...[...Array(12)].map((_, i) => [10 + i, .28]), ...[...Array(16)].map((_, i) => [22 + i / 2, .16]),
    [30, .6], [34, .55], [38, 1], [42, .45], [46, 1], [48, .5], [50, .5], [52, .55], [53, .9], [54, 1], [59, .35],
    [68, .8], [69, .9], [70, 1], [72, 1.1], [78, .4], [82, .7], [88, .6], [94, .7], [104, .55], [107, .5],
    [110, 1], [111, .9], [112, .9], [113, .9], [114, .5], [120, .4], [126, .35], [132, .6]];
  const HITS = HB.map(([b, s]) => [B(b), s]);
  // the kick: a small zoom pulse on every bass hit (even beats in the drops, and the big hits before them)
  const KICKS = [38, 46, 53, 54, 68, 69, 70, ...[...Array(16)].map((_, i) => 72 + 2 * i), ...[...Array(12)].map((_, i) => 110 + 2 * i)].map(B);
  function fx(f) {
    let fl = 0, sh = 0, ch = 0, pu = 0;
    for (const [h, s] of HITS) { const d = f - h; if (d < 0 || d > 12) continue; fl += s * .3 * Math.exp(-d / 1.1); if (d < 4) sh += s * 14 * (1 - d / 4); if (d < 6) ch += s * 9 * (1 - d / 6); }
    for (const h of KICKS) { const d = f - h; if (d >= 0 && d < 10) pu = Math.max(pu, Math.exp(-d / 2.5)); }
    const r = rng(Math.floor(f) * 7 + 3);
    return { fl: Math.min(.4, fl), dx: (r() - .5) * 2 * sh, dy: (r() - .5) * 2 * sh, ch, pu };
  }
  const split = (c) => (c > .2 ? `${c}px 0 rgba(255,50,70,.55),${-c}px 0 rgba(60,150,255,.55)` : 'none');

  /* ---------- building blocks ---------- */
  // a painting filling the frame: focus fx (0..1 across the image), a push s, drifting dx
  function paint(parent, src, fxp = .5, fy = .5) {
    const w = el('div', 'paint', parent); const im = el('img', '', w); im.src = IMG(src);
    return { w, im, set(s, dx = 0, dy = 0) { im.style.transform = `translate(calc(-50% + ${(0.5 - fxp) * 2400 + dx}px), calc(-50% + ${(0.5 - fy) * 200 + dy}px)) scale(${s})`; } };
  }
  // fit a line of display type to a width, up to a cap
  function fit(e, maxW, cap) { cap = +e.dataset.cap || cap; maxW = +e.dataset.maxw || maxW; e.dataset.cap = cap; e.dataset.maxw = maxW; e.style.fontSize = cap + 'px'; const w = e.scrollWidth; if (w > maxW) e.style.fontSize = Math.floor(cap * maxW / w) + 'px'; }
  // a line that rises out of a soft blur
  function rise(e, f, at, dur = 14, dist = 26) { const t = expo(k(f, at, at + dur)); e.style.opacity = t; e.style.transform = `translateY(${(1 - t) * dist}px)`; e.style.filter = t < 1 ? `blur(${(1 - t) * 10}px)` : 'none'; }
  // display type slamming in: big and blurred to sharp in six frames, with a colour split
  function slam(e, f, at, s0 = 1.45) { const d = f - at; if (d < 0) { e.style.opacity = 0; return; } const t = expo(clamp(d / 6)); e.style.opacity = lerp(.65, 1, clamp(d / 2)); e.style.transform = `scale(${lerp(s0, 1, t)})`; e.style.filter = t < 1 ? `blur(${(1 - t) * 12}px)` : 'none'; e.style.textShadow = split(9 * (1 - clamp(d / 6))); }
  const out = (e, f, at, dur = 6) => { if (f >= at) e.style.opacity = Math.min(+e.style.opacity, 1 - k(f, at, at + dur)); };
  // words that replace each other on beats: only the latest one shows
  const sequence = (items, f) => items.forEach(([at, e], j) => { slam(e, f, at, 1.35); const nx = items[j + 1]; if (nx && f >= nx[0]) e.style.opacity = 0; });

  /* ---------- the real site, recorded on a phone ---------- */
  const CLIP = { talk: '/clips/talk/f', shelf: '/clips/shelf/f' };
  // film frame -> clip frame, as straight lines between keys (a speed ramp)
  const ramp = (keys, f) => { if (f <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (f <= keys[i][0]) { const [a, x] = keys[i - 1], [b, y] = keys[i]; return x + (y - x) * (f - a) / (b - a); } return keys[keys.length - 1][1]; };
  // cut inside the phone on the beats: typing, the reply and its question, the story starting, the verse
  const TALK = [[B(78), 52], [B(82), 48], [B(88), 135], [B(88) + .01, 200], [B(94), 360], [B(94) + .01, 450], [B(104), 700], [B(104) + .01, 860], [B(110), 990]];
  const SHELF = [[B(114), 62], [B(120), 140]];
  const pending = [];
  function phone(parent) {
    const p = el('div', 'phone', parent, '<div class="scr"><img alt=""></div><span class="island"></span><span class="glare"></span>');
    const im = p.querySelector('img');
    return { p, setFrame(kind, n) { const src = CLIP[kind] + String(Math.round(n)).padStart(5, '0') + '.jpg'; if (!im.src.endsWith(src)) { im.src = src; pending.push(im.decode().catch(() => {})); } } };
  }

  /* ---------- scenes ---------- */
  const scenes = [];
  const scene = (a, b, build) => { const root = el('div', 'sc'); const draw = build(root); scenes.push({ a, b, root, draw }); };

  // ACT 1 · THE NOISE (beats 0-37, the intro: hats, no bass) ---------------------------------
  // 2 a.m.: the clock, then a search typed one word per beat, then enter on beat 8
  scene(0, B(10), (r) => {
    const clock = el('p', 'mono abs center', r, '02:14 AM', 'left:0;right:0;top:600px;font-size:96px;letter-spacing:.12em;color:var(--ink)');
    const box = el('div', 'search', r, '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="q"></span><span class="caret"></span>');
    const q = box.querySelector('.q'), caret = box.querySelector('.caret');
    const count = el('p', 'count', r, '', 'top:560px;font-size:44px');
    const WORDS = [['why', 3], [' do I', 4], [' feel', 5], [' so', 6], [' stuck', 7]];
    return (f) => {
      slam(clock, f, B(0), 1.25);
      const upC = expo(k(f, B(2), B(2) + 7));
      clock.style.transform += ` translateY(${-upC * 230}px) scale(${lerp(1, .62, upC)})`;
      out(clock, f, B(8), 4);
      q.textContent = WORDS.map(([w, b]) => w.slice(0, Math.ceil(w.length * k(f, B(b), B(b) + 4)))).join('');
      caret.style.opacity = f < B(8) && Math.floor(f / 6) % 2 ? 0 : 1;
      // the box slams in, presses on enter, then lifts away as the count races
      const d = f - B(2), inT = expo(clamp(d / 6)), up = quart(k(f, B(8) + 1, B(8) + 9)), press = f >= B(8) && f < B(8) + 2 ? .95 : 1;
      box.style.opacity = d < 0 ? 0 : lerp(.6, 1, clamp(d / 2)) * (1 - k(f, B(9) + 4, B(10)));
      box.style.transform = `translateY(${-up * 300}px) scale(${press * lerp(1.3, 1, inT) * lerp(1, .8, up)})`;
      const n = Math.round(240000000 * expo(k(f, B(8) + 1, B(10) - 1)));
      count.innerHTML = 'About <b>' + n.toLocaleString('en-US') + '</b> results'; show(count, k(f, B(8) + 1, B(8) + 3));
      r.style.transform = `scale(${1 + .1 * expo(k(f, B(8), B(8) + 8))})`;
    };
  });

  // the answers: one piece of advice per beat, each a post filling the frame, contradicting the last
  const QUOTES = [['Productivity · 1.2M views', 'Wake up at 5 AM.', '♡ 88K'], ['Mindset', 'Just stay positive.', '♡ 12K'], ['Hustle · reel', 'Work harder than everyone.', '♡ 230K'], ['Thread · 2.1K likes', 'Quit your job.', '♡ 2.1K'],
    ['Reply', 'Don’t quit your job.', '♡ 2.4K'], ['Podcast · ep. 212', 'Manifest it.', '♡ 9K'], ['Wellness', 'Cold showers fix everything.', '♡ 41K'], ['Comment', 'Everyone feels this. Move on.', '♡ 3'],
    ['Self-help', 'You are the problem.', '♡ 17K'], ['Forum', 'Just stop overthinking.', '♡ 640'], ['Thread', 'Nobody cares. Grind.', '♡ 51K'], ['Ad · sponsored', 'Unlock your potential in 7 days.', '♡ 1.1K']];
  QUOTES.forEach(([s, t, likes], i) => scene(B(10 + i), B(11 + i), (r) => {
    const R = rng(70 + i), tilt = (i % 2 ? 1 : -1) * (1.5 + R() * 2), ox = (R() - .5) * 60, oy = (R() - .5) * 120;
    const c = el('div', 'qcard', r, `<small>${s}</small>${t}<span class="meta">${likes} · ↻ · ⋯</span>`);
    const idx = el('p', 'mono abs', r, String(i + 1).padStart(2, '0') + ' / 240,000,000', 'left:90px;top:300px');
    return (f) => {
      const d = f - B(10 + i), t2 = expo(clamp(d / 5));
      c.style.transform = `translate(${ox}px, calc(-50% + ${oy}px)) rotate(${tilt * (1 - .3 * t2)}deg) scale(${lerp(1.24, 1, t2) * (1 + .015 * d / 11)})`;
      c.style.filter = t2 < 1 ? `blur(${(1 - t2) * 8}px)` : 'none';
      idx.style.opacity = .8;
    };
  }));

  // then the storm: a new one every half beat, piling up, until it all collapses to a point
  const ADVICE = [['Productivity', 'Wake up at 5 AM. Every day.'], ['Mindset', 'Just stay positive.'], ['Hustle', 'Work harder than everyone.'], ['Thread · 2.1k likes', 'Quit your job. Follow your passion.'], ['Reply', 'Don’t quit your job. Be practical.'], ['Video · 4M views', '10 habits of successful people'], ['Wellness', 'Cold showers fix everything.'], ['Podcast', 'Manifest it and it will come.'], ['Comment', 'Everyone feels like this. Move on.'], ['Self-help', 'You are the problem. Fix yourself.'], ['Forum', 'Have you tried just not overthinking?'], ['Ad', 'Unlock your potential in 7 days'], ['Thread', 'Nobody cares. Grind.'], ['Reel', 'Romanticise your life'], ['Coach', 'Have you tried journaling?'], ['Uncle', 'At your age, I had a house.']];
  scene(B(22), B(30), (r) => {
    const cards = ADVICE.map(([s, t], i) => { const R = rng(40 + i); const c = el('div', 'card', r, `<small>${s}</small>${t}`); c._x = -60 + R() * 640; c._y = 180 + R() * 1000; c._r = (R() - .5) * 22; c._at = B(22 + i / 2); return c; });
    const count = el('p', 'count', r, 'About <b>240,000,000</b> results', 'top:120px');
    return (f) => {
      const col = inout(k(f, B(29), B(30) - 1));
      cards.forEach((c) => {
        const t = expo(k(f, c._at, c._at + 5)), drift = Math.max(0, f - c._at) * .3;
        const x = lerp(c._x, 280, col), y = lerp(c._y - drift, 560, col);
        c.style.transform = `translate(${x}px,${y}px) rotate(${c._r * (1 - col)}deg) scale(${lerp(1.5, 1, t) * (1 - col)})`;
        c.style.opacity = lerp(.5, 1, t); c.style.visibility = f >= c._at ? 'inherit' : 'hidden';
      });
      show(count, 1 - col);
      r.style.transform = `scale(${1 + .1 * k(f, B(22), B(29))})`;
    };
  });
  // the line the noise was hiding, in two slams
  scene(B(30), B(38), (r) => {
    const a = el('p', 'big', r, 'Everyone has advice.', 'top:600px'); fit(a, 960, 150);
    const b = el('p', 'big gold', r, 'Nobody stays.', 'top:590px'); fit(b, 960, 190);
    return (f) => { slam(a, f, B(30)); if (f >= B(34)) a.style.opacity = 0; slam(b, f, B(34), 1.3); r.style.transform = `scale(${1 + .04 * k(f, B(30), B(38))})`; };
  });

  // ACT 2 · THE FRIEND (the bass arrives on beat 38) --------------------------------------------
  // each shot cuts in a little too close and settles, then drifts
  function shot(a, b, src, fxp, build) {
    scene(B(a), B(b), (r) => {
      const p = paint(r, src, fxp); el('div', 'shade', r);
      const extra = build ? build(r, p) : null;
      return (f) => {
        const t = k(f, B(a), B(b));
        p.set(lerp(1.2, 1.07, expo(k(f, B(a), B(a) + 8))) - .04 * t, lerp(-16, 16, t));
        if (extra) extra(f);
      };
    });
  }
  const line = (r, t, top = 1030) => el('p', 'say', r, t, `top:${top}px`);
  shot(38, 42, 'arjuna/01', .5, (r) => { const m = el('p', 'mono abs', r, 'Kurukshetra · The Bhagavad Gita, chapter 1', 'left:84px;top:960px'); const s = line(r, 'Long before therapy,'); return (f) => { rise(m, f, B(38) + 2, 10); rise(s, f, B(38) + 4, 12); }; });
  shot(42, 46, 'arjuna/02', .42, (r) => { const s = line(r, 'the greatest archer alive'); return (f) => rise(s, f, B(42) + 2, 12); });
  shot(46, 48, 'arjuna/06', .36, (r) => { const b = el('p', 'big', r, 'Sat down.', 'top:1000px'); fit(b, 940, 200); return (f) => slam(b, f, B(46)); });
  // three words on three beats, then two zoom cuts into his face on the double hit
  shot(48, 55, 'arjuna/07', .44, (r, p) => {
    const ws = [[48, 'Stuck.'], [50, 'Afraid.'], [52, 'Tired.']].map(([b, t], j) => { const e = el('p', 'big' + (j === 2 ? ' gold' : ''), r, t, 'top:1020px'); fit(e, 900, 190); return [B(b), e]; });
    return (f) => {
      sequence(ws, f);
      const z = f >= B(54) ? 1.62 : f >= B(53) ? 1.3 : 0;
      if (z) p.set(z * lerp(1.06, 1, expo(k(f, f >= B(54) ? B(54) : B(53), (f >= B(54) ? B(54) : B(53)) + 6))), f >= B(54) ? 60 : -40, -80);
    };
  });
  // the breakdown: the music drops away, the story slows down
  scene(B(55), B(63) + 4, (r) => {
    const p = paint(r, 'arjuna/08', .47); el('div', 'shade', r);
    const s = line(r, 'His friend didn’t lecture him.');
    const b = el('p', 'big gold', r, 'He stayed.', 'top:1130px'); fit(b, 900, 170);
    return (f) => {
      p.set(lerp(1.14, 1.0, inout(k(f, B(55), B(63)))), lerp(-10, 10, k(f, B(55), B(63))));
      rise(s, f, B(55) + 4, 16); out(s, f, B(59) - 4, 4); slam(b, f, B(59), 1.25);
      r.style.opacity = 1 - k(f, B(63), B(63) + 4);
    };
  });
  scene(B(63), B(68), (r) => {
    const p = paint(r, 'arjuna/14', .38); el('div', 'shade', r);
    const s = line(r, 'And Arjuna stood back up.');
    const m = el('p', 'mono abs', r, 'Bhagavad Gita 18.73', 'left:84px;top:1180px');
    return (f) => { p.set(lerp(1.08, 1.0, k(f, B(63), B(68)))); rise(s, f, B(63) + 2, 14); rise(m, f, B(64) + 4, 12); };
  });
  // the pickups: three words on three hits, pushing into the lamp until its light fills the frame
  scene(B(68), B(71), (r) => {
    const p = paint(r, 'arjuna/09', .5); el('div', 'shade', r);
    const ws = [[68, 'That friend'], [69, 'has'], [70, 'a name.']].map(([b, t], j) => { const e = el('p', 'big' + (j === 2 ? ' gold' : ''), r, t, 'top:1040px'); fit(e, 940, 190); return [B(b), e]; });
    return (f) => {
      const step = f >= B(70) ? 2 : f >= B(69) ? 1 : 0, at = B(68 + step);
      p.set(lerp([1.08, 1.24, 1.44][step] * 1.06, [1.08, 1.24, 1.44][step], expo(k(f, at, at + 6))) + .04 * k(f, B(70), B(71)), 0, -30 * step);
      sequence(ws, f);
      const g = k(f, B(70) + 3, B(71));
      flash.style.opacity = Math.max(+flash.style.opacity || 0, g * g * .95);
    };
  });

  // ACT 3 · SAKHA (the drop, beat 72) ---------------------------------------------------------
  // beat 71 is the breath: the lamp's light fading to black; the name lands on the drop
  scene(B(71), B(78) + 2, (r) => {
    const glow = el('div', 'fill', r, '', 'background:radial-gradient(60% 45% at 50% 45%,rgba(242,196,107,.28),transparent 70%)');
    const name = el('p', 'big', r, 'Sakha'.split('').map((c) => `<span class="word">${c}</span>`).join(''), 'top:430px;font-size:300px');
    const dev = el('p', 'abs center', r, 'सखा', 'left:0;right:0;top:740px;font-family:"Tiro Devanagari Sanskrit",serif;font-size:96px;color:var(--ink2)');
    const mean = el('p', 'mono abs center', r, 'means <span class="gold">friend</span>', 'left:0;right:0;top:900px;font-size:30px');
    const ls = [...name.children];
    return (f) => {
      if (f < B(72)) flash.style.opacity = Math.max(+flash.style.opacity || 0, .95 * Math.exp(-(f - B(71)) / 2.2));
      ls.forEach((c, j) => { const t = expo(k(f, B(72) + j * 2, B(72) + 9 + j * 2)); c.style.opacity = t; c.style.transform = `translateY(${(1 - t) * 60}px) scale(${lerp(1.4, 1, t)})`; c.style.filter = t < 1 ? `blur(${(1 - t) * 14}px)` : 'none'; });
      rise(dev, f, B(74), 12); rise(mean, f, B(76), 12);
      glow.style.opacity = k(f, B(72), B(72) + 4) * (.6 + .4 * Math.sin(f / 9));
      r.style.transform = `scale(${1 + .05 * k(f, B(72), B(78))})`;
      r.style.opacity = 1 - k(f, B(78) - 4, B(78) + 2);
    };
  });

  // the phone carries the real product from "So I built one." to the verse
  scene(B(78) - 4, B(110), (r) => {
    const bg = paint(r, 'arjuna/03', .45); bg.w.style.filter = 'blur(10px) brightness(.42)';
    el('div', 'fill', r, '', 'background:radial-gradient(55% 40% at 50% 55%,rgba(242,196,107,.18),transparent 70%)');
    const built = el('p', 'say center', r, 'So I built one.', 'top:130px;font-size:62px');
    const lines = [[82, 'You talk.'], [88, 'It listens.'], [94, 'A story answers.'], [104, 'One real verse.']].map(([b, t]) => { const e = el('p', 'big', r, t, 'top:110px'); fit(e, 960, 130); return [B(b), e]; });
    const cited = el('p', 'big gold', r, 'Cited.', 'top:240px'); fit(cited, 600, 110);
    const ph = phone(r);
    const chips = [[82, '01', 'Plain words'], [88, '02', 'Feels heard'], [94, '03', 'Painted · narrated'], [104, '04', 'Gita 2.47 · cited']].map(([b, n, t]) => [B(b) + 4, el('span', 'chip', r, `<i>${n}</i>${t}`)]);
    return (f) => {
      bg.w.style.opacity = k(f, B(93), B(94)) * (1 - k(f, B(104), B(105)));
      bg.set(lerp(1.15, 1.05, k(f, B(93), B(104))));
      rise(built, f, B(78), 12); out(built, f, B(82) - 3, 3);
      lines.forEach(([at, b], j) => { slam(b, f, at, 1.3); const nx = lines[j + 1]; if (nx) out(b, f, nx[0] - 3, 3); });
      slam(cited, f, B(107), 1.3);
      // the phone rises in, then breathes slightly
      const up = expo(k(f, B(78), B(78) + 26)), tilt = Math.sin((f - B(78)) / 40) * 3;
      ph.p.style.left = '314px'; ph.p.style.top = '330px';
      ph.p.style.transform = `perspective(1800px) translateY(${(1 - up) * 1100}px) rotateX(${(1 - up) * 18}deg) rotateY(${tilt}deg)`;
      ph.setFrame('talk', ramp(TALK, f));
      chips.forEach(([at, c], j) => { const t = expo(k(f, at, at + 10)); const nx = chips[j + 1]; const gone = nx ? k(f, nx[0] - 8, nx[0] - 4) : 0; c.style.opacity = t * (1 - gone); c.style.left = (j % 2 ? 560 : 120) + 'px'; c.style.top = (1180 + (1 - t) * 30) + 'px'; });
      r.style.opacity = k(f, B(78) - 4, B(78) + 4) * (1 - k(f, B(110) - 3, B(110)));
    };
  });

  // the second drop: every kind of pain, one painting and one word per beat
  const FEEL = [[110, 'karna/10', .36, 'Rejected?'], [111, 'prahlad', .5, 'Afraid?'], [112, 'hanuman', .5, 'Not enough?'], [113, 'chariot', .7, 'Stuck?']];
  FEEL.forEach(([a, src, fxp, word], i) => scene(B(a), B(a + 1), (r) => {
    const p = paint(r, src, fxp); p.w.style.filter = 'brightness(.62)'; el('div', 'shade', r);
    const b = el('p', 'big' + (i === 3 ? ' gold' : ''), r, word, 'top:560px'); fit(b, 940, 210);
    const m = el('p', 'mono abs center', r, '14 stories · one for every kind of day', 'left:0;right:0;top:1190px');
    return (f) => { p.set(lerp(1.16, 1.04, expo(k(f, B(a), B(a + 1))))); slam(b, f, B(a), 1.35); m.style.opacity = 1; };
  }));

  scene(B(114), B(120), (r) => {
    const ph = phone(r);
    const items = ['Plain words.', 'Works offline.', 'Your words stay on your phone.'].map((t, i) => el('p', 'say', r, `<span class="chip" style="position:static;margin-right:18px;padding:6px;vertical-align:middle"><i>✓</i></span>${t}`, `top:${400 + i * 190}px;left:70px;right:520px;font-size:46px`));
    return (f) => {
      const t = expo(k(f, B(114), B(114) + 18));
      ph.p.style.left = '580px'; ph.p.style.top = '200px';
      ph.p.style.transform = `perspective(1800px) translateX(${(1 - t) * 500}px) rotateY(${-16 + 4 * k(f, B(114), B(120))}deg) scale(.96)`;
      ph.setFrame('shelf', ramp(SHELF, f));
      items.forEach((e, i) => rise(e, f, B(114 + 2 * i) + 1, 10, 30));
      r.style.opacity = 1 - k(f, B(120) - 4, B(120));
    };
  });

  scene(B(120), B(126), (r) => {
    const glow = el('div', 'fill', r, '', 'background:radial-gradient(50% 35% at 50% 48%,rgba(120,150,255,.14),transparent 70%)');
    const a = el('p', 'big', r, 'Not a therapist.', 'top:520px'); fit(a, 900, 150);
    const b = el('p', 'say center', r, 'It knows when to point you to one.', 'top:700px;font-size:46px');
    return (f) => { slam(a, f, B(120), 1.25); rise(b, f, B(121) + 4, 14); r.style.opacity = 1 - k(f, B(126) - 5, B(126)); glow.style.opacity = k(f, B(120), B(121)); };
  });

  // ACT 4 · FOR YOU ----------------------------------------------------------------
  scene(B(126), B(132), (r) => {
    const c = el('p', 'mono abs center', r, '02:14 AM', 'left:0;right:0;top:520px;font-size:26px');
    const a = el('p', 'say center', r, 'For the <b>2 a.m.</b> thoughts.', 'top:600px;font-size:68px');
    return (f) => { rise(c, f, B(126), 10); rise(a, f, B(126) + 5, 14); r.style.opacity = 1 - k(f, B(132) - 4, B(132)); };
  });
  // the end card lands on the last kick, then holds through the outro
  scene(B(132), TOTAL, (r) => {
    const p = paint(r, 'halo', .5); p.w.style.filter = 'brightness(.5)';
    el('div', 'fill', r, '', 'background:radial-gradient(70% 55% at 50% 45%,rgba(6,6,10,.2),rgba(6,6,10,.85))');
    const name = el('p', 'big', r, 'Sakha', 'top:400px;font-size:250px');
    const dev = el('p', 'abs center', r, 'सखा', 'left:0;right:0;top:665px;font-family:"Tiro Devanagari Sanskrit",serif;font-size:70px;color:var(--ink2)');
    const ln = el('p', 'say center', r, 'A friend for <b>every kind of day.</b>', 'top:790px;font-size:52px');
    const url = el('p', 'abs center', r, '<span style="display:inline-block;padding:16px 34px;border-radius:44px;box-shadow:0 0 0 2px rgba(242,196,107,.6);background:rgba(14,13,20,.7);font-family:Geist Mono,monospace;font-size:30px;letter-spacing:.02em;color:var(--ink)">sakha.akshatjamwal.workers.dev</span>', 'left:0;right:0;top:930px');
    return (f) => {
      const a = B(132);
      p.set(lerp(1.06, 1.0, k(f, a, TOTAL)));
      slam(name, f, a, 1.3); rise(dev, f, a + 6, 14); rise(ln, f, a + 14, 14); rise(url, f, a + 24, 14);
      r.style.opacity = k(f, a, a + 3) * (1 - k(f, TOTAL - 20, TOTAL));
    };
  });

  /* ---------- the frame ---------- */
  const CH = [[0, '01 — The noise'], [B(38), '02 — The friend'], [B(71), '03 — Sakha'], [B(126), '04 — For you']];
  const tc = (f) => { const s = Math.floor(f / 30); return '00:' + String(s).padStart(2, '0') + ':' + String(Math.floor(f % 30)).padStart(2, '0'); };
  const dx = dust.getContext('2d'), gx = grain.getContext('2d');
  // how much dust floats in each part
  const dustAt = (f) => (f < B(38) ? .15 : f < B(71) ? .8 : f < B(78) ? 1.4 : f < B(126) ? .5 : .9);
  const drop = (f) => (f >= B(72) && f < B(104)) || (f >= B(110) && f < B(134));

  async function seek(n) {
    const f = n;
    flash.style.opacity = 0;
    for (const s of scenes) { const on = f >= s.a && f < s.b; s.root.style.visibility = on ? 'visible' : 'hidden'; if (on) s.draw(f); }
    const e = fx(f);
    flash.style.opacity = Math.max(+flash.style.opacity, e.fl);
    // shake on the hits; a 1.3% zoom pulse on the kicks
    stage.style.transform = `translate(${e.dx}px,${e.dy}px) scale(${1 + .013 * e.pu})`;
    // dust rises slowly and twinkles
    dx.clearRect(0, 0, 1080, 1350); const amt = dustAt(f) * (drop(f) ? 1 + .6 * e.pu : 1);
    for (const m of motes) { const y = ((m.y - f * m.v) % 1350 + 1350) % 1350, x = m.x + Math.sin(f / 40 + m.ph) * 14; dx.globalAlpha = Math.min(1, m.a * amt * (.55 + .45 * Math.sin(f / 7 + m.ph * 3))); dx.fillStyle = '#F7D58C'; dx.beginPath(); dx.arc(x, y, m.s, 0, 6.283); dx.fill(); }
    gx.drawImage(tiles[Math.floor(f) % 8], 0, 0);
    leak.style.transform = `translate(${-300 + Math.sin(f / 90) * 260}px,${-250 + Math.cos(f / 110) * 200}px)`;
    leak.style.opacity = f >= B(38) && f < B(71) ? .9 : f >= B(132) ? .7 : .25;
    hud.querySelector('.tr').textContent = CH.filter(([a]) => f >= a).pop()[1];
    hud.querySelector('.bl').textContent = tc(f);
    hud.querySelector('.bar i').style.width = (f / TOTAL * 100) + '%';
    hud.style.opacity = f >= B(132) ? 1 - k(f, B(132), B(132) + 20) : 1;
    while (pending.length) await pending.shift();
  }

  window.__comp = { TOTAL, B, seek, ready: (async () => {
    await document.fonts.ready;
    // the display lines were fitted before the fonts arrived; fit them again
    stage.querySelectorAll('.big[data-cap]').forEach((b) => fit(b));
    await Promise.all([...stage.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
    await seek(+(new URLSearchParams(location.search).get('f') || 0));
    return true;
  })() };
})();
