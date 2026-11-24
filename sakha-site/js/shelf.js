/* The story shelf: the stories stand spine out, edge to edge, on a plank across the whole page.
   Each volume is a small 3D book: point at one and it turns on its spine to show its painted cover (a glint of
   lamplight crosses it) while the last one turns back, and the caption beneath changes over. The arrows walk the
   shelf; feeling tabs restock it. Choose one and it comes off the shelf into the reader, the cover swinging open.
   Built from the story cards already in the page, which stay (hidden) as the no-script fallback and do the playing. */
(function () {
  'use strict';
  const rail = document.querySelector('.stories__rail');
  if (!rail) return;
  const cards = [...rail.querySelectorAll('.card[data-story]')];

  const DEV = { arjuna: 'अर्जुन', meera: 'मीरा', hanuman: 'हनुमान', prahlad: 'प्रह्लाद', sudama: 'सुदामा', karna: 'कर्ण', dhruva: 'ध्रुव', savitri: 'सावित्री', valmiki: 'वाल्मीकि', shabari: 'शबरी', ganesha: 'गणेश', ashtavakra: 'अष्टावक्र', rama: 'राम', hima: 'राजा हिम' };
  // the cloth each volume is bound in
  const CLOTH = { arjuna: '#23305e', meera: '#55203a', hanuman: '#7e3814', prahlad: '#6a1e1c', sudama: '#46552a', karna: '#6f5418', dhruva: '#1d4856', savitri: '#3a2a4c', valmiki: '#2d3a2b', shabari: '#5e4226', ganesha: '#7c2a1b', ashtavakra: '#2a4566', rama: '#173a4a', hima: '#4c3416' };
  const FEEL = {
    afraid: { label: 'Afraid', ids: ['prahlad', 'hima', 'savitri', 'meera'] },
    enough: { label: 'Not enough', ids: ['sudama', 'ganesha', 'ashtavakra', 'rama', 'hanuman'] },
    unwanted: { label: 'Unwanted', ids: ['karna', 'dhruva', 'valmiki'] },
    stuck: { label: 'Stuck', ids: ['arjuna', 'shabari'] }
  };
  // each volume's own thickness and height, so the row looks collected rather than printed
  const W = [58, 64, 54, 68, 60, 72, 56, 66, 62, 58, 70, 54, 64, 60];
  const H = [0.92, 0.98, 0.88, 0.95, 0.9, 1, 0.86, 0.97, 0.91, 0.94, 0.89, 0.99, 0.93, 0.87];
  const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOVER = matchMedia('(hover: hover) and (pointer: fine)');

  const books = cards.map((card, i) => {
    const id = card.dataset.story, img = card.querySelector('.card__img img');
    const S = window.SAKHA_STORIES && SAKHA_STORIES[id];
    return {
      id, card,
      name: (card.getAttribute('aria-label').match(/Play (.+)’s story/) || [, id])[1],
      label: card.querySelector('.mono').textContent,
      title: card.querySelector('h3').textContent,
      forWhen: card.querySelector('.card__for').textContent,
      src: img.getAttribute('src'), pos: img.style.objectPosition || '50% 50%', alt: img.alt,
      secs: S ? S.dur : 0, dur: S ? fmt(S.dur) : '', n: String(i + 1).padStart(2, '0'),
      w: W[i % W.length], h: H[i % H.length]
    };
  });
  const total = Math.round(books.reduce((a, b) => a + b.secs, 0) / 60);

  // the front board: cloth, the painting in a window, the title over it, Sakha's stamp at the foot
  const cover = (b, lazy) => '<span class="cov" style="--cloth:' + CLOTH[b.id] + '">' +
    '<span class="cov__win"><img src="' + b.src + '" alt=""' + (lazy ? ' loading="lazy" decoding="async"' : '') + ' style="object-position:' + b.pos + '"></span>' +
    '<span class="cov__title">' + esc(b.title) + '</span>' +
    '<span class="cov__foot"><span class="cov__by">A Sakha story · ' + b.n + '</span><span class="cov__stamp">सखा</span></span></span>';
  // the spine: an engraving of the painting up top, the name running down, a stamp at the foot
  const spine = (b) => '<span class="spn" style="--cloth:' + CLOTH[b.id] + '">' +
    '<span class="spn__art"><img src="' + b.src + '" alt="" loading="lazy" decoding="async" style="object-position:' + b.pos + '"></span>' +
    '<span class="spn__name">' + esc(b.name) + '</span>' +
    '<span class="spn__foot"><span class="spn__dev">' + (DEV[b.id] || '') + '</span><span class="spn__n">' + b.n + '</span></span></span>';
  // the left leaf of the open book: the painting printed as a plate, named beneath
  const plateHTML = (b) => '<span class="reader__leaf reader__leaf--l"><span class="reader__paper reader__plate"><span class="reader__fig"><img src="' + b.src + '" alt="' + esc(b.alt) + '" style="object-position:' + b.pos + '"></span><span class="reader__dev">' + (DEV[b.id] || '') + '</span><span class="reader__en mono">' + esc(b.name) + '</span></span></span>';

  const arc = document.createElement('div');
  arc.className = 'arc';
  arc.innerHTML =
    '<div class="arc__top"><p class="arc__meta">The scene library</p>' +
      '<p class="arc__brand"><span class="arc__dev">कथा-संग्रह</span><span class="arc__en">The story shelf</span></p>' +
      '<p class="arc__meta arc__meta--r">' + books.length + ' stories · ' + total + ' min</p></div>' +
    '<div class="arc__tabs" role="group" aria-label="Find a story by feeling">' +
      '<button type="button" class="arc__tab is-on" data-feel="" aria-pressed="true">All stories</button>' +
      Object.entries(FEEL).map(([k, f]) => '<button type="button" class="arc__tab" data-feel="' + k + '" aria-pressed="false">' + f.label + '</button>').join('') +
    '</div>' +
    '<div class="arc__shelf"><div class="arc__row"></div></div>' +
    '<div class="arc__cap">' +
      '<button type="button" class="arc__arrow" data-dir="-1" aria-label="Previous story"><svg aria-hidden="true" width="22" height="12" viewBox="0 0 22 12"><path d="M21 6H2m5-5L1.5 6 7 11" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></button>' +
      '<div class="arc__now"><div class="arc__words" aria-live="polite"><p class="arc__title"></p><p class="arc__who"><span class="arc__whodev"></span><span class="arc__whoen"></span></p><p class="arc__line"></p></div>' +
        '<button type="button" class="arc__open">Open the story</button></div>' +
      '<button type="button" class="arc__arrow" data-dir="1" aria-label="Next story"><svg aria-hidden="true" width="22" height="12" viewBox="0 0 22 12"><path d="M1 6h19m-5-5 5.5 5-5.5 5" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></button>' +
    '</div>' +
    '<div class="arc__bot"><span>Painted · narrated · one verse each</span><span class="arc__count"></span></div>';
  rail.hidden = true;
  rail.after(arc);

  const $ = (s) => arc.querySelector(s);
  const row = $('.arc__row'), words = $('.arc__words');
  let list = books, active = null, hooks = {};
  const bookOf = (el) => books.find((x) => x.id === el.dataset.id);

  /* ---------- stocking the shelf ---------- */
  // the chosen stories, repeated until the row runs past both edges; the middle run is the one you can tab through
  function stock(animate) {
    const set = list.reduce((a, b) => a + b.w, 0) || 1;
    let runs = Math.max(3, Math.ceil((innerWidth * 1.3) / set)); if (runs % 2 === 0) runs++;
    const mid = (runs - 1) / 2;
    let html = '', k = 0;
    for (let r = 0; r < runs; r++) list.forEach((b) => {
      const real = r === mid;
      html += '<button type="button" class="vol" data-id="' + b.id + '" style="--w:' + b.w + 'px;--h:' + b.h + ';--i:' + (k++) + '"' +
        (real ? ' aria-label="' + esc(b.name) + '’s story. ' + esc(b.forWhen) + '" data-real' : ' tabindex="-1" aria-hidden="true"') + '>' +
        '<span class="vol__box" aria-hidden="true"><span class="vol__front">' + cover(b, true) + '</span><span class="vol__spine">' + spine(b) + '</span></span></button>';
    });
    row.innerHTML = html;
    row.classList.toggle('is-in', !!animate && !REDUCED);
    const reals = [...row.querySelectorAll('[data-real]')];
    pick(reals[Math.floor((reals.length - 1) / 2)], true);
  }

  // turn one volume out to its cover, the last one back to its spine, and change the caption over
  function pick(el, quiet) {
    if (!el || el === active) return;
    if (active) active.classList.remove('is-pulled');
    active = el; el.classList.add('is-pulled');
    const b = bookOf(el);
    $('.arc__title').textContent = b.title;
    $('.arc__whodev').textContent = DEV[b.id] || '';
    $('.arc__whoen').textContent = b.name;
    $('.arc__line').textContent = [b.dur, b.label].filter(Boolean).join(' · ');
    $('.arc__count').textContent = String(list.indexOf(b) + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
    if (!quiet && !REDUCED && words.animate) words.animate([{ opacity: 0, transform: 'translateY(12px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
    b.card.dispatchEvent(new Event('pointerenter')); // fetch its first painting now, so play starts at once
  }
  // step along the shelf, staying on the run you can see best (the middle one)
  function step(dir) {
    const reals = [...row.querySelectorAll('[data-real]')];
    const at = reals.findIndex((e) => e.dataset.id === active.dataset.id);
    pick(reals[(at + dir + reals.length) % reals.length]);
  }

  row.addEventListener('pointerover', (e) => { const v = e.target.closest('.vol'); if (v && HOVER.matches) pick(v); });
  row.addEventListener('click', (e) => {
    const v = e.target.closest('.vol'); if (!v) return;
    // on touch the first tap turns the volume out, the second takes it down
    if (v !== active && !HOVER.matches) { pick(v); return; }
    pick(v); openBook(bookOf(v), v);
  });
  row.addEventListener('focusin', (e) => { const v = e.target.closest('.vol'); if (v) pick(v); });
  row.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); active.focus({ preventScroll: true });
  });
  arc.querySelectorAll('.arc__arrow').forEach((a) => a.addEventListener('click', () => step(+a.dataset.dir)));
  $('.arc__open').addEventListener('click', () => openBook(bookOf(active), active));
  arc.querySelectorAll('.arc__tab').forEach((t) => t.addEventListener('click', () => {
    arc.querySelectorAll('.arc__tab').forEach((o) => { o.classList.toggle('is-on', o === t); o.setAttribute('aria-pressed', String(o === t)); });
    const ids = t.dataset.feel ? FEEL[t.dataset.feel].ids : null;
    list = ids ? books.filter((b) => ids.includes(b.id)) : books;
    active = null; stock(true);
  }));
  let lastW = innerWidth;
  addEventListener('resize', () => { if (Math.abs(innerWidth - lastW) < 80) return; lastW = innerWidth; const id = active && active.dataset.id; active = null; stock(false); if (id) pick(row.querySelector('[data-real][data-id="' + id + '"]'), true); });
  stock(false);

  /* ---------- taking a volume down ---------- */
  // the reader: the book held open over the page, its painting on the left leaf and what the story is for on the right
  const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const reader = document.createElement('div');
  reader.className = 'reader'; reader.hidden = true;
  reader.setAttribute('role', 'dialog'); reader.setAttribute('aria-modal', 'true'); reader.setAttribute('aria-labelledby', 'readerTitle');
  reader.setAttribute('data-lenis-prevent', '');
  reader.innerHTML =
    '<div class="reader__scrim"></div>' +
    '<button type="button" class="iconbtn reader__x" data-act="back" aria-label="Back to the shelf"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" stroke-width="1.5"/></svg></button>' +
    '<div class="reader__book">' +
      '<div class="reader__l"></div>' +
      '<div class="reader__leaf reader__leaf--r"><div class="reader__paper reader__page"><div class="reader__text">' +
        '<p class="mono reader__label"></p><h3 class="reader__title" id="readerTitle"></h3>' +
        '<p class="reader__name"></p><p class="reader__for"></p>' +
        '<div class="reader__acts"><button type="button" class="btn btn--solid" data-act="play">▶ Play the story <span class="mono"></span></button>' +
        '<button type="button" class="btn btn--ghost" data-act="back">Back to the shelf</button></div>' +
      '</div><p class="reader__folio mono"></p></div></div>' +
    '</div>';
  document.body.appendChild(reader);
  const $r = (s) => reader.querySelector(s);
  const scrim = $r('.reader__scrim'), xBtn = $r('.reader__x'), plate = $r('.reader__l'), pageEl = $r('.reader__leaf--r'), textEl = $r('.reader__text');
  const playBtn = $r('[data-act="play"]');
  let busy = false, current = null, currentEl = null, openTl = null;

  function fill(b) {
    reader.style.setProperty('--cloth', CLOTH[b.id]);
    plate.innerHTML = plateHTML(b);
    $r('.reader__folio').textContent = '— ' + b.n + ' —';
    $r('.reader__label').textContent = b.label;
    $r('.reader__title').textContent = b.title;
    $r('.reader__name').textContent = b.name + '’s story';
    $r('.reader__for').textContent = b.forWhen;
    $r('[data-act="play"] .mono').textContent = b.dur;
  }

  // a stand-in for the volume while it is in the hand: spine, front cover, and the inside of the cover
  function flyer(b, box) {
    const f = document.createElement('div');
    f.className = 'fly'; f.style.setProperty('--cloth', CLOTH[b.id]);
    f.style.width = box.width + 'px'; f.style.height = box.height + 'px';
    f.innerHTML = '<div class="fly__b">' +
      '<div class="fly__spine">' + spine(b) + '</div>' +
      '<div class="fly__leaf"><div class="fly__front">' + cover(b) + '</div><div class="fly__back">' + plateHTML(b) + '</div></div>' +
      '</div>';
    document.body.appendChild(f);
    return f;
  }

  // the path from the shelf to the reader: rise out of the row, arc toward you, turn spine to cover
  function path(f, from, to, spineEnd) {
    const inner = f.firstChild, Wd = to.width, Ht = to.height;
    const sy0 = from.height / Ht, sx0 = spineEnd ? sy0 : from.width / Wd, T = spineEnd ? from.width / sx0 : 40;
    f.style.setProperty('--t', T + 'px');
    const ax = from.left + from.width / 2, ay = from.top + from.height / 2, bx = to.left + Wd / 2, by = to.top + Ht / 2;
    const ry0 = spineEnd ? 90 : 10;
    return (p) => {
      const lift = smooth(0, 0.22, p), q = smooth(0.12, 1, p);
      const x = ax + (bx - ax) * q, y = ay + (by - ay) * q - 40 * lift * (1 - q) - 70 * Math.sin(Math.PI * q);
      const sx = sx0 + (1 - sx0) * q, sy = sy0 + (1 - sy0) * q, ry = ry0 * (1 - smooth(0.15, 0.9, p)), rz = -5 * Math.sin(Math.PI * q);
      f.style.transform = 'translate(' + (x - Wd / 2) + 'px,' + (y - Ht / 2) + 'px)';
      inner.style.transform = 'scale(' + sx + ',' + sy + ') rotateZ(' + rz + 'deg) rotateY(' + ry + 'deg)';
    };
  }
  const leafTo = (f, a) => { f.querySelector('.fly__leaf').style.transform = 'translateZ(calc(var(--t) / 2)) rotateY(' + a + 'deg)'; };
  const twoPages = () => matchMedia('(min-width:700px)').matches;
  // where the turned-out cover sits on the shelf, so the flight starts from the board itself
  const boardOf = (el) => el.querySelector('.vol__front').getBoundingClientRect();

  function openBook(b, el) {
    if (busy || !b) return;
    current = b; currentEl = el; fill(b);
    b.card.dispatchEvent(new Event('pointerenter'));
    const from = boardOf(el), spineEnd = from.width < 120;
    reader.hidden = false;
    hooks.open && hooks.open(b.id);
    const two = twoPages(), to = (two ? pageEl : plate).getBoundingClientRect();
    const finish = () => { busy = false; [plate, pageEl, textEl, xBtn, scrim].forEach((n) => { n.style.opacity = ''; }); [...textEl.children].forEach((n) => { n.style.opacity = ''; n.style.transform = ''; }); playBtn.focus({ preventScroll: true }); };
    el.classList.add('is-out');
    if (REDUCED || !window.gsap) return finish();
    busy = true;
    plate.style.opacity = 0; pageEl.style.opacity = 0; xBtn.style.opacity = 0;
    [...textEl.children].forEach((n) => { n.style.opacity = 0; n.style.transform = 'translateY(14px)'; });
    gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out' });
    const f = flyer(b, to), go = path(f, from, to, spineEnd), st = { p: 0, a: 0 };
    leafTo(f, 0); go(0);
    const tl = openTl = gsap.timeline({ onComplete: () => { f.remove(); finish(); } });
    tl.to(st, { p: 1, duration: 1.05, ease: 'power3.inOut', onUpdate: () => go(st.p) });
    if (two) {
      // it lands closed on the right; the cover swings open over the fold onto the left
      tl.add(() => { pageEl.style.opacity = 1; });
      tl.to(st, { a: -180, duration: 0.95, ease: 'power2.inOut', onUpdate: () => leafTo(f, st.a) });
      tl.add(() => { plate.style.opacity = 1; });
    } else {
      tl.add(() => { plate.style.opacity = 1; pageEl.style.opacity = 1; f.style.opacity = 0; });
    }
    tl.to([...textEl.children], { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' }, two ? '-=0.55' : '>');
    tl.to(xBtn, { opacity: 1, duration: 0.4 }, '<');
  }

  function closeBook(instant) {
    // Play closes at once, even mid-animation, so the reader never sits over the story
    if (!current || (busy && !instant)) return;
    const b = current, el = currentEl;
    const done = () => {
      busy = false; current = null; currentEl = null; reader.hidden = true;
      [plate, pageEl, textEl, xBtn, scrim].forEach((n) => { n.style.opacity = ''; });
      el.classList.remove('is-out');
      hooks.close && hooks.close();
    };
    if (instant || REDUCED || !window.gsap) { if (openTl) openTl.kill(); if (window.gsap) gsap.killTweensOf(scrim); document.querySelectorAll('.fly').forEach((n) => n.remove()); [...textEl.children].forEach((n) => { n.style.opacity = ''; n.style.transform = ''; }); done(); return; }
    busy = true;
    const two = twoPages(), to = (two ? pageEl : plate).getBoundingClientRect(), from = boardOf(el);
    const f = flyer(b, to), go = path(f, from, to, from.width < 120), st = { p: 1, a: two ? -180 : 0 };
    leafTo(f, st.a); go(1);
    plate.style.opacity = 0;
    const tl = gsap.timeline({ onComplete: () => { f.remove(); done(); el.focus({ preventScroll: true }); } });
    tl.to([textEl, xBtn], { opacity: 0, duration: 0.25 });
    if (two) {
      tl.to(st, { a: 0, duration: 0.75, ease: 'power2.inOut', onUpdate: () => leafTo(f, st.a) }, '<0.05');
      tl.add(() => { pageEl.style.opacity = 0; });
    } else tl.add(() => { pageEl.style.opacity = 0; });
    tl.to(st, { p: 0, duration: 0.95, ease: 'power3.inOut', onUpdate: () => go(st.p) });
    tl.to(scrim, { opacity: 0, duration: 0.6 }, '<0.3');
  }

  reader.querySelectorAll('[data-act="back"]').forEach((n) => n.addEventListener('click', () => closeBook()));
  scrim.addEventListener('click', () => closeBook());
  playBtn.addEventListener('click', () => { const c = current && current.card; closeBook(true); c && c.click(); });
  reader.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeBook(); }
    // keep the keyboard inside the open book
    if (e.key === 'Tab') {
      const f = [...reader.querySelectorAll('button')], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });

  window.SakhaShelf = { init: (h) => { hooks = h || {}; } };
})();
