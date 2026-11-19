/* Sakha product reel. 1920x1080, 30 fps, 900 frames (30 s), cut to "Nirva - Modern Funk" from beat 64 of the film's cut
   (23.518 s of it, i.e. 24.618 s of the original): quiet typing (64-67) · three pickups (68-70) · a breath (71) · the drop (72),
   kicks on even beats · fills on 85-86, 93-94, 101-102 · a break 104-109 · the second drop 110-133 · the outro 134-146.
   R(n) is the reel frame of track beat n. window.__comp.seek(n) draws frame n; nothing depends on wall time. */
(() => {
  'use strict';
  const TOTAL = 900;
  const R = (n) => Math.round((n - 64) * 10.9755);
  const stage = document.getElementById('stage');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const k = (f, a, b) => clamp((f - a) / (b - a));
  const expo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const back = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const inout = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rng = (s) => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const el = (tag, cls, parent, html, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (css) e.style.cssText = css; (parent || stage).appendChild(e); return e; };
  const show = (e, o) => { e.style.opacity = o; e.style.visibility = o > 0.001 ? 'inherit' : 'hidden'; };
  const IMG = (p) => '/site/img/' + p + '.webp';
  // a camera: the world point (fx, fy) sits at the centre of the frame, magnified s times
  const look = (e, s, fx = 960, fy = 540, extra = '') => { e.style.transform = `translate(${960 - fx * s}px,${540 - fy * s}px) scale(${s})${extra}`; };
  const split = (c) => (c > .2 ? `${c}px 0 rgba(255,60,80,.5),${-c}px 0 rgba(40,140,255,.5)` : 'none');

  /* ---------- finishing ---------- */
  const wipe = el('div', 'wipe');
  el('div', 'vig');
  const flash = el('div', 'flash');
  const grain = el('canvas'); grain.id = 'grain'; grain.width = 960; grain.height = 540;
  const tiles = [...Array(8)].map((_, i) => { const c = document.createElement('canvas'); c.width = 960; c.height = 540; const x = c.getContext('2d'), d = x.createImageData(960, 540), r = rng(21 + i); for (let p = 0; p < d.data.length; p += 4) { const v = r() * 255; d.data[p] = d.data[p + 1] = d.data[p + 2] = v; d.data[p + 3] = 255; } x.putImageData(d, 0, 0); return c; });

  // hits: a flash, a shake and a colour split; kicks: a 1.2% zoom pulse
  const HITS = [[R(68), .45], [R(69), .5], [R(70), .6], [R(72), 1], [R(74), .4], [R(76), .5], [R(78), .7], [R(80), .5], [R(82), .5], [R(84), .5], [R(85), .7], [R(86), .9],
    [R(88), .4], [R(90), .5], [R(92), .3], [R(93), .7], [R(94), .9], [R(96), .6], [R(98), .6], [R(100), 1], [R(101), .8], [R(102), .9], [R(107), .3],
    [R(110), 1], [R(112), .5], [R(114), .4], [R(116), .4], [R(117), .6], [R(118), .9], [R(120), .5], [R(122), .6], [R(124), .4], [R(125), .7], [R(126), 1], [R(128), .5], [R(130), .5], [R(132), .4], [R(134), .4]];
  const KICKS = [68, 69, 70, ...[...Array(16)].map((_, i) => 72 + 2 * i), 85, 93, 101, ...[...Array(12)].map((_, i) => 110 + 2 * i), 117, 125].map(R);
  function fx(f) {
    let fl = 0, sh = 0, ch = 0, pu = 0;
    for (const [h, s] of HITS) { const d = f - h; if (d < 0 || d > 10) continue; fl += s * .22 * Math.exp(-d / 1.2); if (d < 4) sh += s * 12 * (1 - d / 4); if (d < 6) ch += s * 7 * (1 - d / 6); }
    for (const h of KICKS) { const d = f - h; if (d >= 0 && d < 10) pu = Math.max(pu, Math.exp(-d / 2.5)); }
    const r = rng(Math.floor(f) * 7 + 3);
    return { fl: Math.min(.3, fl), dx: (r() - .5) * 2 * sh, dy: (r() - .5) * 2 * sh, ch, pu };
  }
  let CH = 0; // the colour split of the current frame, for type that lands on it

  /* ---------- building blocks ---------- */
  function rise(e, f, at, dur = 12, dist = 30) { const t = expo(k(f, at, at + dur)); e.style.opacity = t; e.style.transform = `translateY(${(1 - t) * dist}px)`; e.style.filter = t < 1 ? `blur(${(1 - t) * 10}px)` : 'none'; }
  function slam(e, f, at, s0 = 1.4, extra = '') { const d = f - at; if (d < 0) { e.style.opacity = 0; return; } const t = expo(clamp(d / 6)); e.style.opacity = lerp(.6, 1, clamp(d / 2)); e.style.transform = `${extra} scale(${lerp(s0, 1, t)})`; e.style.filter = t < 1 ? `blur(${(1 - t) * 12}px)` : 'none'; e.style.textShadow = split(Math.max(CH, 8 * (1 - clamp(d / 6)))); }
  // a highlighted word that swaps on beats: the marker slides to the new word's width
  function marker(parent, words) {
    const w = el('span', 'hlw', parent, '<i></i><b></b>'), i = w.firstChild, b = w.lastChild, size = new Map();
    const width = (t) => { if (!size.has(t)) { b.textContent = t; size.set(t, b.offsetWidth); } return size.get(t); };
    return (f, grow = 0) => {
      let j = 0; words.forEach(([at], n) => { if (f >= at) j = n; });
      const [at, t] = words[j], e = j ? expo(k(f, at, at + 7)) : 1;
      const wp = width(words[Math.max(0, j - 1)][1]), wc = width(t);
      b.textContent = t; b.style.display = 'inline-block'; b.style.opacity = j ? clamp((f - at) / 3) : 1; b.style.transform = `translateY(${(1 - e) * .45}em)`;
      w.style.width = `calc(${lerp(wp, wc, e)}px + .28em)`; w.style.whiteSpace = 'nowrap';
      i.style.transform = `scaleX(${grow})`;
    };
  }

  /* ---------- scenes ---------- */
  const scenes = [];
  const scene = (a, b, build) => { const root = el('div', 'sc'); const draw = build(root); scenes.push({ a, b, root, draw }); };
  const pending = [];
  const ARROW = '<svg viewBox="0 0 24 24"><path d="M4 2.5l15 9.2-6.6 1.4L16 20l-2.7 1.3-3.6-6.9L5 19.2z" fill="#1B1712" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';

  // 1 · you talk: extreme close-up on the words being typed, pulling back to the ask box; then the chat
  const TYPE = [4, 6, 9, 11, 13, 16, 18, 21, 23, 25, 28, 30, 32]; // "I feel stuck." one key per frame listed (reel-music.mjs ticks on these)
  const SAID = 'I feel stuck.';
  scene(0, 82, (r) => {
    el('div', 'blob', r, '', 'left:-200px;top:-300px;width:900px;height:900px;background:rgba(242,196,107,.45)');
    el('div', 'blob', r, '', 'right:-260px;bottom:-360px;width:1000px;height:1000px;background:rgba(232,134,42,.22)');
    const cam = el('div', 'cam', r);
    const ask = el('div', 'ask', cam, '<span class="q"></span><span class="caret"></span><span class="send"><svg viewBox="0 0 24 24"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg></span>');
    const q = ask.querySelector('.q'), caret = ask.querySelector('.caret'), send = ask.querySelector('.send');
    const chips = el('div', 'abs', cam, ['Scared of choosing wrong', 'Nobody gets it', 'I keep failing'].map((t) => `<span class="pill" style="position:static">${t}</span>`).join(''), 'left:470px;top:650px;width:980px;display:flex;gap:14px;justify-content:center');
    const me = el('div', 'bub me', cam, SAID, 'right:470px;top:190px;transform-origin:100% 100%');
    const av = el('div', 'av', cam, 'स', 'left:470px;top:330px');
    const words = 'That sounds heavy. You don’t have to figure it all out tonight.'.split(' ');
    const sa = el('div', 'bub sa', cam, words.map((w) => `<span>${w}</span>`).join(' '), 'left:556px;top:322px');
    const ws = [...sa.children];
    const offer = el('div', 'offer', cam, `<img src="${IMG('shabari/11')}" alt=""><div><div class="t">She waited her whole life.</div><div class="m mono">Story · Shabari · Narrated</div></div><span class="go">Show me ▸</span>`, 'left:556px;top:520px');
    const go = offer.querySelector('.go');
    const cur = el('div', 'cursor', cam, ARROW);
    return (f) => {
      const n = TYPE.filter((t) => f >= t).length;
      q.textContent = f < R(68) ? SAID.slice(0, n) : '';
      caret.style.opacity = (f < 4 || f > 32) && f < R(68) ? (Math.floor(f / 6) % 2 ? 0 : 1) : 1;
      // the camera starts on the caret, 3.6x, and pulls back as the words arrive
      const caretX = 522 + q.offsetWidth, z = inout(k(f, 4, R(68) - 2));
      const s0 = lerp(3.6, 1, z), fx0 = lerp(caretX - 30, 960, inout(k(f, 14, R(68) - 2)));
      const after = k(f, R(68), 82), punch = f >= R(70) ? .025 * Math.exp(-(f - R(70)) / 4) : 0;
      if (f < R(68)) look(cam, s0, fx0, 540); else look(cam, 1 + .05 * after + punch, 960, lerp(540, 500, inout(after)));
      // send: the box drops to the bottom, the words become a bubble
      const sent = expo(k(f, R(68), R(68) + 10));
      send.style.transform = `scale(${f >= R(68) && f < R(68) + 3 ? .82 : 1})`; send.style.background = f >= R(68) && f < R(68) + 5 ? 'var(--gold)' : '';
      ask.style.transform = `translateY(${sent * 386}px) scale(${lerp(1, .92, sent)})`;
      chips.style.opacity = 1 - k(f, R(68) - 4, R(68));
      const pop = back(clamp((f - R(68)) / 9));
      me.style.opacity = clamp((f - R(68)) / 3); me.style.transform = `translateY(${(1 - pop) * 260}px) scale(${lerp(.6, 1, clamp(pop))})`;
      // Sakha answers, a word at a time
      const ra = back(clamp((f - R(69)) / 8));
      av.style.opacity = sa.style.opacity = clamp((f - R(69)) / 3); av.style.transform = `scale(${ra})`; sa.style.transform = `translateY(${(1 - clamp(ra)) * 40}px)`;
      ws.forEach((w, i) => { const t = k(f, R(69) + 2 + i * 1.1, R(69) + 6 + i * 1.1); w.style.opacity = t; w.style.filter = t < 1 ? `blur(${(1 - t) * 6}px)` : 'none'; });
      // and offers a story
      const oc = back(clamp((f - R(70)) / 9));
      offer.style.opacity = clamp((f - R(70)) / 3); offer.style.transform = `translateY(${(1 - clamp(oc)) * 70}px) scale(${lerp(.92, 1, clamp(oc))})`;
      // a cursor glides in and taps "Show me"
      const cm = inout(k(f, R(70), R(70) + 9)), tap = f >= R(70) + 10 && f < R(70) + 13;
      cur.style.left = lerp(1640, 1236, cm) + 'px'; cur.style.top = lerp(1100, 618, cm) + 'px';
      cur.style.opacity = f >= R(70) ? 1 : 0; cur.style.transform = `scale(${tap ? .8 : 1})`;
      go.style.background = f >= R(70) + 10 ? 'var(--gold)' : ''; go.style.color = f >= R(70) + 10 ? 'var(--ink)' : '';
    };
  });

  // 2 · Meet Sakha, on the drop; then the camera dives into the highlighted word
  scene(82, R(78), (r) => {
    const cam = el('div', 'cam', r);
    const silk = el('div', 'silkbg', cam, '', 'opacity:.55');
    el('div', 'fill', cam, '', 'background:radial-gradient(42% 50% at 50% 52%,rgba(247,242,232,.95),rgba(247,242,232,.7) 55%,rgba(247,242,232,0) 90%)');
    const name = el('div', 'abs', cam, 'Sakha'.split('').map((c) => `<span style="display:inline-block">${c}</span>`).join(''), 'left:0;right:0;top:170px;text-align:center;font-family:Shaka,serif;font-size:340px;line-height:1;color:var(--ink)');
    const ls = [...name.children];
    const dev = el('div', 'abs', cam, 'सखा', 'left:0;right:0;top:560px;text-align:center;font-family:"Tiro Devanagari Sanskrit",serif;font-size:76px;color:var(--ink2)');
    const mean = el('div', 'head', cam, 'means ', 'top:720px');
    const mk = marker(mean, [[0, 'friend']]); mean.appendChild(document.createTextNode('.'));
    const hl = mean.querySelector('.hlw');
    let H = null;
    return (f) => {
      // where the marker sits in the world, measured with the camera at rest
      if (!H) { cam.style.transform = 'none'; const b = hl.getBoundingClientRect(), s = stage.getBoundingClientRect(); H = [b.left - s.left + b.width / 2, b.top - s.top + b.height / 2]; }
      silk.style.transform = `scale(${lerp(1.12, 1.02, k(f, 82, R(78)))}) translateX(${lerp(40, -40, k(f, 82, R(78)))}px)`;
      ls.forEach((c, j) => slam(c, f, R(72) + j * 1.5, 1.6));
      rise(dev, f, R(73), 10); rise(mean, f, R(74), 10);
      mk(f, expo(k(f, R(74) + 3, R(74) + 13)));
      const base = 1 + .04 * k(f, R(72), R(77)), dive = Math.pow(k(f, R(77) - 4, R(78)), 2.6);
      const s = base * Math.pow(60 / base, dive), m = Math.min(1, dive * 4);
      look(cam, s, lerp(960, H[0], m), lerp(540, H[1], m));
    };
  });

  // 3 · fourteen painted stories, a ring of covers turning one card per kick
  const BOOKS = [['karna/10', 'The one who didn’t belong.', 'Karna'], ['sudama/10', 'The friend with nothing to give.', 'Sudama'], ['shabari/11', 'She waited her whole life.', 'Shabari'], ['meera', 'They called her mad.', 'Meera'],
    ['hanuman', 'Hanuman remembers.', 'Hanuman'], ['prahlad', 'The boy who would not bow.', 'Prahlad'], ['dhruva/11', 'The boy who was pushed away.', 'Dhruva'], ['savitri/15', 'She followed death.', 'Savitri'],
    ['valmiki/17', 'The robber who wrote the Ramayana.', 'Valmiki'], ['ganesha/15', 'The race around the world.', 'Ganesha'], ['ashtavakra/09', 'They laughed at his body.', 'Ashtavakra'], ['rama/14', 'One lotus short.', 'Rama'], ['hima/08', 'She kept the lamps lit.', 'Raja Hima'], ['chariot', 'The bow falls.', 'Arjuna']];
  scene(R(78), R(86), (r) => {
    r.style.perspective = '2400px'; r.style.perspectiveOrigin = '50% 45%';
    el('div', 'blob', r, '', 'left:30%;top:20%;width:900px;height:700px;background:rgba(242,196,107,.35)');
    const cam = el('div', 'cam', r); cam.style.transformStyle = 'preserve-3d';
    const title = el('div', 'head', cam, '14 painted stories,', 'top:50px');
    const line = el('div', 'head', cam, 'for when you feel ', 'top:968px');
    const mk = marker(line, [[0, 'unwanted'], [R(82), 'not enough'], [R(84), 'stuck'], [R(85), 'afraid']]); line.appendChild(document.createTextNode('.'));
    const ring = el('div', 'ring', cam);
    const covers = BOOKS.map(([src, t, who]) => el('div', 'cover', ring, `<img src="${IMG(src)}" alt=""><span class="cap"><b>${t}</b><small>${who}</small></span><span class="rim"></span>`));
    const gold = el('div', 'fill', r, '', 'background:var(--gold2);z-index:5');
    return (f) => {
      gold.style.opacity = 1 - expo(k(f, R(78), R(78) + 9));
      const pos = -5 * (1 - expo(k(f, R(78), R(80) + 2))) + [R(82), R(84), R(85)].reduce((p, at) => p + expo(k(f, at, at + 8)), 0);
      ring.style.transform = 'rotateX(-7deg)';
      covers.forEach((c, i) => {
        let a = ((i - pos) * 360 / 14) % 360; if (a > 180) a -= 360; if (a < -180) a += 360;
        const z = Math.cos(a * Math.PI / 180);
        c.style.transform = `rotateY(${a}deg) translateZ(720px)`;
        c.style.filter = `blur(${(1 - z) * 3.5}px) brightness(${.6 + .4 * (z + 1) / 2})`;
        c.style.visibility = z > -.2 ? 'inherit' : 'hidden';
        c.lastChild.style.opacity = Math.max(0, 1 - Math.abs(i - pos) * 2) * k(f, R(80), R(80) + 6);
      });
      rise(title, f, R(78) + 2, 12); rise(line, f, R(80), 10);
      mk(f, expo(k(f, R(80) + 2, R(80) + 12)));
      // the fills: two punches into the front cover, then through it
      const p1 = f >= R(85) ? .06 * Math.exp(-(f - R(85)) / 4) : 0, dive = Math.pow(k(f, R(86) - 6, R(86)), 2.4);
      look(cam, (1 + p1) * Math.pow(4.6, dive), 960, lerp(540, 520, dive));
    };
  });

  // 4 · painted, narrated: the story playing, then the verse it ends on
  scene(R(86), R(94), (r) => {
    const full = el('div', 'full', r, `<img src="${IMG('meera')}" alt="">`); const im = full.firstChild;
    const dark = el('div', 'dark', r);
    const l1 = el('div', 'tlabel', r, 'Painted.', 'left:120px;top:90px'), l2 = el('div', 'tlabel', r, 'Narrated.', 'left:370px;top:90px');
    const cap = 'Five hundred years ago, in the desert town of Merta, a little girl named Meera was born.'.split(' ');
    const sub = el('div', 'sub', r, cap.map((w) => `<span>${w}</span>`).join('')); const sw = [...sub.children];
    const wave = el('div', 'wave', r, '<i></i>'.repeat(36)); const bars = [...wave.children];
    const bar = el('div', 'bar', r, '<i></i>' + [.12, .27, .41, .58, .74, .88].map((x) => `<u style="left:${x * 100}%"></u>`).join('')); const prog = bar.firstChild;
    const times = el('div', 'mono abs', r, '<span>00:41</span><span>05:48</span>', 'left:200px;right:200px;top:984px;display:flex;justify-content:space-between;font-size:18px;color:rgba(255,255,255,.8)');
    const verse = el('div', 'verse', r, '<div class="dv">कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।<br>मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥</div><div class="en">“Your right is to the work alone, never to its fruits.”</div><span class="ref">Bhagavad Gita 2.47 · cited</span>');
    const ref = verse.querySelector('.ref');
    const head = el('div', 'head', r, 'One real verse.', 'top:120px;color:#fff');
    return (f, e) => {
      const a = R(86), v = R(90), vt = k(f, v, v + 10);
      im.style.transform = `translate(-50%,-50%) scale(${lerp(1.4, 1.08, expo(k(f, a, a + 12))) - .04 * k(f, a + 12, R(94))})`;
      full.style.filter = `blur(${vt * 10}px) brightness(${1 - .38 * vt})`;
      slam(l1, f, a, 1.5); slam(l2, f, R(87), 1.5);
      const ui = 1 - k(f, v, v + 6);
      [l1, l2].forEach((x) => { x.style.opacity = +x.style.opacity * ui; });
      sw.forEach((w, i) => { w.style.opacity = (.35 + .65 * k(f, a + 6 + i * 2.2, a + 9 + i * 2.2)) * ui; });
      bars.forEach((b, i) => { const q = rng(i * 131 + Math.floor(f / 2))(); b.style.height = (8 + (16 + 34 * e.pu) * q * (.5 + .5 * Math.sin(i / 3 + f / 5))) + 'px'; });
      wave.style.opacity = bar.style.opacity = times.style.opacity = ui;
      prog.style.width = lerp(19, 34, k(f, a, v)) + '%';
      const up = expo(k(f, v, v + 12));
      verse.style.top = lerp(1150, 300, up) + 'px'; verse.style.opacity = clamp((f - v) / 2);
      verse.style.transform = `rotateX(${(1 - up) * 20}deg)`;
      slam(ref, f, R(91), 1.3);
      slam(head, f, R(93), 1.35);
    };
  });

  // 5 · trust, three cards flipping in on three kicks
  const ICONS = ['<path pathLength="1" d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.6v.1M3 3l18 18"/>',
    '<rect pathLength="1" x="6" y="2" width="12" height="20" rx="2.5"/><rect pathLength="1" x="9" y="11.5" width="6" height="5" rx="1"/><path pathLength="1" d="M10 11.5V10a2 2 0 0 1 4 0v1.5"/>',
    '<path pathLength="1" d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path pathLength="1" d="M12 10v5M9.5 12.5h5"/>'];
  const TRUST = [['Works offline.', 'Stories, verses and the chat all run on your phone.'], ['Private.', 'Your words stay on your phone.'], ['Not a therapist.', 'It knows when to point you to real help.']];
  scene(R(94), 390, (r) => {
    r.style.perspective = '2000px';
    el('div', 'blob', r, '', 'left:-10%;bottom:-30%;width:1100px;height:800px;background:rgba(242,196,107,.35)');
    const head = el('div', 'head', r, 'Built to be ', 'top:130px'); const mk = marker(head, [[0, 'trusted']]); head.appendChild(document.createTextNode('.'));
    const row = el('div', 'cam', r); row.style.transformStyle = 'preserve-3d'; row.style.transformOrigin = '50% 50%';
    const cards = TRUST.map(([t, p], i) => { const c = el('div', 'tc', row, `<span class="ic"><svg viewBox="0 0 24 24">${ICONS[i]}</svg></span><h4>${t}</h4><p>${p}</p>`, `left:${205 + i * 520}px`); c._paths = [...c.querySelectorAll('svg *')]; return c; });
    const AT = [R(94) + 1, R(96), R(98)];
    return (f) => {
      rise(head, f, R(94), 10); mk(f, expo(k(f, R(94) + 4, R(94) + 14)));
      row.style.transform = `rotateY(${lerp(6, -2, inout(k(f, R(94), 390)))}deg) translateZ(${lerp(-60, 0, expo(k(f, R(94), R(96))))}px)`;
      cards.forEach((c, i) => {
        const d = f - AT[i], t = expo(clamp(d / 10));
        c.style.opacity = clamp(d / 3); c.style.visibility = d >= 0 ? 'inherit' : 'hidden';
        c.style.transform = `rotateY(${(1 - t) * -80}deg) translateY(${(1 - t) * 90}px) scale(${lerp(.88, 1, t)})`;
        c.style.filter = t < 1 ? `blur(${(1 - t) * 8}px)` : 'none';
        c._paths.forEach((p) => { p.style.strokeDasharray = 1; p.style.strokeDashoffset = 1 - k(f, AT[i] + 4, AT[i] + 18); });
      });
    };
  });

  // 6 · how it works, three slams on the hits before the break
  scene(390, R(104), (r) => {
    el('div', 'blob', r, '', 'left:25%;top:10%;width:1000px;height:800px;background:rgba(242,196,107,.3)');
    const n = el('div', 'mono abs', r, '', 'left:0;right:0;top:330px;text-align:center;font-size:26px;color:var(--ink2)');
    const ws = [[R(100), 'You speak.'], [R(101), 'A story answers.'], [R(102), 'One step for today.']].map(([at, t], j) => [at, el('div', 'head', r, t, `top:420px;font-size:150px;letter-spacing:-.045em;${j === 2 ? 'color:var(--gold)' : ''}`)]);
    return (f) => {
      ws.forEach(([at, e], j) => { slam(e, f, at, 1.35); const nx = ws[j + 1]; if (nx && f >= nx[0]) e.style.opacity = 0; });
      const j = ws.filter(([at]) => f >= at).length;
      n.textContent = j ? `0${j} / 03` : ''; n.style.opacity = j ? 1 : 0;
      if (f >= R(104) - 5) ws[2][1].style.opacity = 1 - k(f, R(104) - 5, R(104));
    };
  });

  // 7 · the break: today's step, ticked off
  scene(R(104), R(110), (r) => {
    el('div', 'blob', r, '', 'left:-5%;top:30%;width:900px;height:900px;background:rgba(242,196,107,.35)');
    const cam = el('div', 'cam', r);
    const card = el('div', 'abs', cam, '<div class="mono" style="font-size:20px;color:var(--ink3)">Today’s step · from Gita 2.47</div><div style="margin-top:22px;font-family:Martel,serif;font-size:50px;line-height:1.35">Take one ten-minute step.<br>Then stop judging how it went.</div><div style="margin-top:38px;display:flex;align-items:center;gap:18px;font-size:28px;font-weight:500"><span class="box" style="display:grid;place-items:center;width:52px;height:52px;border-radius:50%;box-shadow:inset 0 0 0 3px var(--ink)"><svg viewBox="0 0 24 24" style="width:30px;height:30px;stroke:var(--ink);stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="lbl">Mark it done</span></div>',
      'left:410px;top:350px;width:1100px;padding:64px 72px;border-radius:40px;background:var(--card);box-shadow:0 0 0 1px var(--line),0 60px 120px -40px rgba(80,55,20,.45)');
    const box = card.querySelector('.box'), tick = card.querySelector('path'), lbl = card.querySelector('.lbl');
    const cur = el('div', 'cursor', cam, ARROW);
    return (f) => {
      const a = R(104), t = expo(k(f, a, a + 14));
      card.style.opacity = t; card.style.transform = `translateY(${(1 - t) * 60}px)`;
      look(cam, lerp(1, 1.07, inout(k(f, a, R(110)))), 960, 560);
      const cm = inout(k(f, a + 14, R(107) - 1)), tap = f >= R(107);
      cur.style.left = lerp(1500, 494, cm) + 'px'; cur.style.top = lerp(1150, 740, cm) + 'px'; cur.style.opacity = f >= a + 14 ? 1 : 0;
      cur.style.transform = `scale(${tap && f < R(107) + 3 ? .8 : 1})`;
      box.style.background = tap ? 'var(--gold2)' : ''; box.style.transform = `scale(${tap ? back(clamp((f - R(107)) / 8)) : 1})`;
      tick.style.strokeDasharray = 1; tick.style.strokeDashoffset = 1 - expo(k(f, R(107), R(107) + 8));
      lbl.textContent = tap ? 'Done. That’s enough for today.' : 'Mark it done';
    };
  });

  // 8 · the second drop: the real site on three phones, spread apart and fanned, one landing per beat
  const phone = (parent, css) => { const p = el('div', 'phone', parent, '<div class="scr"><img alt=""></div><span class="island"></span><span class="glare"></span>', css); const im = p.querySelector('img'); return { p, set(kind, n) { const src = `/clips/${kind}/f${String(Math.round(n)).padStart(5, '0')}.jpg`; if (!im.src.endsWith(src)) { im.src = src; pending.push(im.decode().catch(() => {})); } } }; };
  scene(R(110), R(118), (r) => {
    r.style.perspective = '1500px'; r.style.perspectiveOrigin = '50% 45%';
    el('div', 'blob', r, '', 'left:15%;top:35%;width:1400px;height:600px;background:rgba(242,196,107,.32)');
    const head = el('div', 'head', r, 'No app. Just open the ', 'top:62px'); const mk = marker(head, [[0, 'link']]); head.appendChild(document.createTextNode('.'));
    const rig = el('div', 'cam', r); rig.style.transformStyle = 'preserve-3d'; rig.style.transformOrigin = '50% 55%';
    // [clip, from, to, centre x, turn, depth, caption, beat it lands on]
    const SET = [['talk', 180, 330, 480, 30, -60, '01 · You talk', 111], ['talk', 560, 700, 960, 0, 90, '02 · A story plays', 110], ['shelf', 110, 200, 1440, -30, -60, '03 · Pick from the shelf', 112]];
    const ps = SET.map(([kind, n0, n1, x, ry, z, cap, b]) => {
      const holder = el('div', 'abs', rig, '', `left:${x - 160}px;top:205px;width:320px;height:681px;transform-style:preserve-3d`);
      const ph = phone(holder, 'left:0;top:0;transform-origin:0 0'); ph.p.style.transform = 'scale(.82)';
      const chip = el('div', 'mono abs', r, cap, `left:${x - 220}px;width:440px;top:912px;text-align:center;font-size:20px;white-space:nowrap;color:var(--ink2)`);
      return { kind, n0, n1, ry, z, at: R(b), holder, chip, ...ph };
    });
    return (f) => {
      const a = R(110);
      rig.style.transform = `rotateY(${lerp(5, -5, inout(k(f, a, R(118))))}deg)`;
      ps.forEach((p, i) => {
        const d = f - p.at, t = back(clamp(d / 12)), bob = Math.sin((f + i * 17) / 14) * 8;
        p.holder.style.opacity = clamp(d / 3); p.holder.style.visibility = d >= 0 ? 'inherit' : 'hidden';
        p.holder.style.transform = `translateY(${(1 - clamp(t)) * 620 + bob}px) translateZ(${p.z}px) rotateY(${p.ry * clamp(t)}deg) rotateX(${(1 - clamp(t)) * 25}deg)`;
        p.set(p.kind, lerp(p.n0, p.n1, k(f, a, R(118))));
        rise(p.chip, f, p.at + 6, 10, 16);
      });
      rise(head, f, R(112), 10); mk(f, expo(k(f, R(112) + 4, R(112) + 14)));
    };
  });

  // 9 · the site's own shelf: cloth spines on a plank; one opens to its cover like a hover, flies out, and opens as a book
  const SHELF = [['arjuna', 'Arjuna', 'अर्जुन', '#23305e'], ['meera', 'Meera', 'मीरा', '#55203a'], ['hanuman', 'Hanuman', 'हनुमान', '#7e3814'], ['prahlad', 'Prahlad', 'प्रह्लाद', '#6a1e1c'], ['sudama', 'Sudama', 'सुदामा', '#46552a'],
    ['karna', 'Karna', 'कर्ण', '#6f5418'], ['dhruva', 'Dhruva', 'ध्रुव', '#1d4856'], ['savitri', 'Savitri', 'सावित्री', '#3a2a4c'], ['valmiki', 'Valmiki', 'वाल्मीकि', '#2d3a2b'], ['shabari', 'Shabari', 'शबरी', '#5e4226'],
    ['ganesha', 'Ganesha', 'गणेश', '#7c2a1b'], ['ashtavakra', 'Ashtavakra', 'अष्टावक्र', '#2a4566'], ['rama', 'Rama', 'राम', '#173a4a'], ['hima', 'King Hima', 'राजा हिम', '#4c3416']];
  const HEIGHTS = [300, 316, 290, 308, 296, 320, 286, 312, 298, 304, 292, 318, 302, 288];
  const HC = (title, by) => `<span class="hc"><span class="hc__win"><img src="${IMG('hanuman')}" alt="" style="object-position:50% 35%"></span><span class="hc__title">${title}</span><span class="hc__by mono">${by}</span></span>`;
  scene(R(118), R(126), (r) => {
    r.style.perspective = '2200px';
    el('div', 'blob', r, '', 'left:25%;top:30%;width:1100px;height:700px;background:rgba(242,196,107,.3)');
    const head = el('div', 'head', r, 'Pick one off the ', 'top:62px'); const mk = marker(head, [[0, 'shelf']]); head.appendChild(document.createTextNode('.'));
    const SC = 1.55;
    const wrap = el('div', 'site abs', r, '', `left:960px;bottom:190px;width:1100px;transform-origin:50% 100%`);
    const row = el('div', 'shelf__row', wrap, '', 'justify-content:center;overflow:visible;min-height:0;padding:0');
    const books = SHELF.map(([id, name, dev, cloth], i) => el('div', 'book', row, `<span class="book__spine"><span class="book__dev">${dev}</span><span class="book__name">${name}</span><span class="book__n mono">${String(i + 1).padStart(2, '0')}</span></span><span class="book__cover">${id === 'hanuman' ? HC('Hanuman remembers.', 'Hanuman · 4:51') : ''}</span>`, `--cloth:${cloth};--h:${HEIGHTS[i]}px`));
    el('div', 'shelf__plank', wrap, '', 'margin-top:0');
    const pick = books[2];
    // the book in the hand: the right-hand page under a cover whose back is the left-hand plate
    const fly = el('div', 'site flyb', r, `<span class="reader__leaf reader__leaf--r"><span class="reader__paper reader__text"><p class="mono reader__label">Scene 03 · Ramayana</p><h3 class="reader__title">Hanuman remembers.</h3><p class="reader__name">Hanuman’s story</p><p class="reader__for">For when you’ve forgotten what you can do.</p><span class="reader__acts"><span class="btn btn--solid">▶ Play the story <span class="mono">4:51</span></span><span class="btn btn--ghost">Back to the shelf</span></span><p class="reader__folio mono">— 03 —</p></span></span>
      <span class="flyleaf"><span class="fly__front">${HC('Hanuman remembers.', 'Hanuman · 4:51')}</span><span class="fly__back reader__leaf reader__leaf--l"><span class="reader__paper reader__plate"><span class="reader__fig"><img src="${IMG('hanuman')}" alt="" style="object-position:50% 35%"></span><span class="reader__dev">हनुमान</span><span class="reader__en mono">Hanuman</span></span></span></span>`, '--cloth:#7e3814');
    const leaf = fly.querySelector('.flyleaf');
    let from = null;
    return (f) => {
      const a = R(118);
      wrap.style.transform = `translateX(-50%) scale(${SC})`;
      // the books drop onto the plank from the centre out
      books.forEach((b, i) => { const d = f - a - Math.abs(i - 6.5) * .9, t = expo(clamp(d / 9)); b.style.opacity = clamp(d / 3); b.style.transform = `translateY(${(1 - t) * -160}px)`; });
      rise(head, f, a + 4, 10); mk(f, expo(k(f, a + 8, a + 18)));
      // as on the site: the chosen spine widens into its cover and lifts
      const hov = expo(k(f, R(120), R(120) + 9));
      pick.style.setProperty('--w', lerp(56, 216, hov) + 'px');
      pick.style.transform = `translateY(${-14 * hov}px)`;
      pick.querySelector('.book__cover').style.opacity = hov; pick.querySelector('.book__spine').style.opacity = 1 - hov;
      // where the open cover sits on the shelf, measured with the hover finished
      if (!from) {
        const keep = [pick.style.cssText, stage.style.transform]; stage.style.transform = 'none';
        pick.style.setProperty('--w', '216px'); pick.style.transform = 'translateY(-14px)'; pick.style.opacity = 1;
        const b = pick.getBoundingClientRect(), s = stage.getBoundingClientRect();
        from = [b.left - s.left, b.top - s.top, b.width / 392];
        pick.style.cssText = keep[0]; stage.style.transform = keep[1];
      }
      const fl = inout(k(f, R(122), R(122) + 10)), open = expo(k(f, R(124) + 4, R(125) + 8));
      const S2 = 1.2, x = lerp(from[0], 960 - 392 * S2 / 2, fl) + open * 392 * S2 / 2, y = lerp(from[1], 560 - 541 * S2 / 2, fl);
      const on = f >= R(122);
      pick.style.visibility = on ? 'hidden' : 'inherit';
      fly.style.visibility = on ? 'inherit' : 'hidden';
      fly.style.transform = `translate(${x}px,${y}px) scale(${lerp(from[2], S2, fl)}) rotateY(${Math.sin(fl * Math.PI) * -14}deg)`;
      leaf.style.transform = `rotateY(${-180 * open}deg)`;
      wrap.style.filter = `blur(${fl * 6}px)`; wrap.style.opacity = 1 - .45 * fl;
    };
  });

  // 10 · made for 2 a.m.: the lights go out, and Sakha is still there
  scene(R(126), 762, (r) => {
    r.style.background = '#0B0A0E';
    el('div', 'blob', r, '', 'left:30%;top:25%;width:900px;height:700px;background:rgba(242,196,107,.16)');
    const clock = el('div', 'mono abs', r, '02:14 AM', 'left:0;right:0;top:185px;text-align:center;font-size:30px;color:#BFB8AC');
    const head = el('div', 'head', r, 'Made for ', 'top:250px;color:#EEE9E0'); const mk = marker(head, [[0, '2 a.m.']]);
    const me = el('div', 'bub', r, 'can’t sleep. thinking too much.', 'right:470px;top:420px;background:#EEE9E0;color:#0B0A0E;border-bottom-right-radius:10px');
    const av = el('div', 'av', r, 'स', 'left:470px;top:560px');
    const sa = el('div', 'bub', r, 'I’m here. Tell me what’s keeping you up.', 'left:556px;top:552px;background:#1A1920;color:#EEE9E0;box-shadow:0 0 0 1px rgba(255,255,255,.08);border-top-left-radius:10px');
    return (f) => {
      const a = R(126);
      slam(clock, f, a, 1.3); rise(head, f, a + 3, 10); mk(f, expo(k(f, a + 8, a + 18)));
      const p1 = back(clamp((f - R(128)) / 9)); me.style.opacity = clamp((f - R(128)) / 3); me.style.transform = `translateY(${(1 - clamp(p1)) * 80}px) scale(${lerp(.7, 1, clamp(p1))})`;
      const p2 = back(clamp((f - R(130)) / 9)); sa.style.opacity = av.style.opacity = clamp((f - R(130)) / 3); sa.style.transform = `translateY(${(1 - clamp(p2)) * 60}px)`; av.style.transform = `scale(${p2})`;
      r.style.transformOrigin = '50% 42%'; r.style.transform = `scale(${lerp(1.3, 1.38, k(f, a, 762))})`;
    };
  });

  // 11 · the end card on silk, in the outro: the name, the line with its word swapping, the address tapped
  scene(762, TOTAL, (r) => {
    const silk = el('div', 'silkbg', r);
    el('div', 'fill', r, '', 'background:radial-gradient(48% 52% at 50% 50%,rgba(247,242,232,.92),rgba(247,242,232,.55) 60%,rgba(247,242,232,0) 85%)');
    const name = el('div', 'abs', r, 'Sakha'.split('').map((c) => `<span style="display:inline-block">${c}</span>`).join(''), 'left:0;right:0;top:170px;text-align:center;font-family:Shaka,serif;font-size:250px;line-height:1;color:var(--ink)');
    const ls = [...name.children];
    const line = el('div', 'head', r, 'A friend for ', 'top:500px;font-size:60px');
    const mk = marker(line, [[0, 'the 2 a.m. thoughts'], [R(137), 'the hard choices'], [R(140), 'every kind of day']]); line.appendChild(document.createTextNode('.'));
    const url = el('div', 'url', r, '<span>sakha.akshatjamwal.workers.dev</span>'); const pill = url.firstChild;
    const ring = el('div', 'abs', r, '', 'left:960px;top:748px;width:10px;height:10px;margin:-5px;border-radius:50%;box-shadow:0 0 0 3px var(--gold)');
    const credit = el('div', 'mono abs', r, 'A concept by Akshat Jamwal', 'left:0;right:0;top:985px;text-align:center;font-size:20px;color:var(--ink2)');
    const cur = el('div', 'cursor', r, ARROW);
    return (f) => {
      const a = R(134), c0 = R(141) + 2, tp = R(142) + 6;
      silk.style.transform = `scale(${lerp(1.14, 1.0, expo(k(f, 762, TOTAL)))}) rotate(${lerp(-2, 0, k(f, 762, TOTAL))}deg)`;
      ls.forEach((c, j) => slam(c, f, a + j * 1.5, 1.4));
      rise(line, f, a + 6, 12); mk(f, expo(k(f, a + 9, a + 19)));
      rise(url, f, R(138), 12); rise(credit, f, R(140) + 4, 12);
      const cm = inout(k(f, c0, tp - 1)), tap = f >= tp;
      cur.style.left = lerp(1500, 1110, cm) + 'px'; cur.style.top = lerp(1120, 742, cm) + 'px';
      cur.style.opacity = f >= c0 ? 1 : 0; cur.style.transform = `scale(${tap && f < tp + 3 ? .8 : 1})`;
      pill.style.background = tap ? 'var(--ink)' : ''; pill.style.color = tap ? 'var(--paper)' : '';
      pill.style.transform = `scale(${tap ? lerp(.94, 1, expo(k(f, tp, tp + 8))) : 1})`;
      const rp = k(f, tp, tp + 16); ring.style.opacity = tap ? 1 - rp : 0; ring.style.transform = `scale(${1 + rp * 70})`; ring.style.boxShadow = `0 0 0 ${3 / (1 + rp * 70) * 6}px var(--gold)`;
    };
  });

  /* ---------- the frame ---------- */
  const gx = grain.getContext('2d');
  const WIPES = [82, 390, 762];

  async function seek(n) {
    const f = n, e = fx(f);
    CH = e.ch;
    flash.style.opacity = 0;
    for (const s of scenes) { const on = f >= s.a && f < s.b; s.root.style.visibility = on ? 'visible' : 'hidden'; if (on) s.draw(f, e); }
    flash.style.opacity = Math.max(+flash.style.opacity, e.fl);
    // silk sweeps across on the scene changes, covering the cut
    const w = WIPES.find((c) => f > c - 12 && f < c + 12);
    wipe.style.visibility = w ? 'visible' : 'hidden';
    if (w) wipe.style.transform = `translateX(${lerp(1920, -4800, inout(k(f, w - 12, w + 12)))}px) rotate(-8deg)`;
    stage.style.transform = `translate(${e.dx}px,${e.dy}px) scale(${1 + .012 * e.pu})`;
    gx.drawImage(tiles[Math.floor(f) % 8], 0, 0);
    while (pending.length) await pending.shift();
  }

  window.__comp = { TOTAL, R, seek, ready: (async () => {
    await document.fonts.ready;
    await Promise.all([...stage.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
    await seek(+(new URLSearchParams(location.search).get('f') || 0));
    return true;
  })() };
})();
