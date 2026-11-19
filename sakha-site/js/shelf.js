/* The story shelf: the stories stand as cloth-bound volumes, spine out.
   Point at one and it opens in place to show its painted cover; choose one and it comes off the shelf
   into a reading view with its feeling, its source and a play button. Feeling chips pull matching volumes forward.
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
  const HEIGHTS = [300, 316, 290, 308, 296, 320, 286, 312, 298, 304, 292, 318, 302, 288];
  const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // a cloth hardcover: a gold-ruled window onto the painting, the title stamped in gold beneath
  const hardcover = (b, lazy) => '<span class="hc"><span class="hc__win"><img src="' + b.src + '" alt=""' + (lazy ? ' loading="lazy" decoding="async"' : '') + ' style="object-position:' + b.pos + '"></span><span class="hc__title">' + esc(b.title) + '</span><span class="hc__by mono">' + esc(b.name) + ' · ' + b.dur + '</span></span>';
  // the left leaf of the open book: the painting printed as a plate, named beneath
  const plateHTML = (b) => '<span class="reader__leaf reader__leaf--l"><span class="reader__paper reader__plate"><span class="reader__fig"><img src="' + b.src + '" alt="' + esc(b.alt) + '" style="object-position:' + b.pos + '"></span><span class="reader__dev">' + (DEV[b.id] || '') + '</span><span class="reader__en mono">' + esc(b.name) + '</span></span></span>';
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
      dur: S ? fmt(S.dur) : '', n: String(i + 1).padStart(2, '0'), h: HEIGHTS[i % HEIGHTS.length]
    };
  });

  const shelf = document.createElement('div');
  shelf.className = 'shelf';
  shelf.innerHTML =
    '<div class="shelf__chips" role="group" aria-label="Find a story by feeling">' +
      '<button type="button" class="shelf__chip is-on" data-feel="" aria-pressed="true">All stories</button>' +
      Object.entries(FEEL).map(([k, f]) => '<button type="button" class="shelf__chip" data-feel="' + k + '" aria-pressed="false">' + f.label + '</button>').join('') +
    '</div>' +
    '<div class="shelf__row">' +
      books.map((b) =>
        '<button type="button" class="book" data-id="' + b.id + '" style="--cloth:' + CLOTH[b.id] + ';--h:' + b.h + 'px" aria-label="' + esc(b.name) + '’s story. ' + esc(b.forWhen) + '">' +
          '<span class="book__spine" aria-hidden="true"><span class="book__dev">' + (DEV[b.id] || '') + '</span><span class="book__name">' + esc(b.name) + '</span><span class="book__n mono">' + b.n + '</span></span>' +
          '<span class="book__cover" aria-hidden="true">' + hardcover(b, true) + '</span>' +
        '</button>').join('') +
    '</div>' +
    '<div class="shelf__plank" aria-hidden="true"></div>';
  rail.hidden = true;
  rail.after(shelf);

  const row = shelf.querySelector('.shelf__row');
  const els = [...row.querySelectorAll('.book')];
  let hooks = {}, current = null;

  // feeling chips: the matching volumes stay on the shelf, the rest slide out of the row
  shelf.querySelectorAll('.shelf__chips .shelf__chip').forEach((c) => c.addEventListener('click', () => {
    shelf.querySelectorAll('.shelf__chips .shelf__chip').forEach((o) => { o.classList.toggle('is-on', o === c); o.setAttribute('aria-pressed', String(o === c)); });
    const ids = c.dataset.feel ? FEEL[c.dataset.feel].ids : null;
    els.forEach((el) => { const away = !!ids && !ids.includes(el.dataset.id); el.classList.toggle('is-away', away); el.tabIndex = away ? -1 : 0; el.setAttribute('aria-hidden', String(away)); });
  }));

  /* ---------- taking a volume down ---------- */
  // the reader: the book held open over the page, its painting on the left leaf and what the story is for on the right
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  let busy = false;

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
      '<div class="fly__spine" style="--cloth:' + CLOTH[b.id] + '"><span class="book__spine"><span class="book__dev">' + (DEV[b.id] || '') + '</span><span class="book__name">' + esc(b.name) + '</span><span class="book__n mono">' + b.n + '</span></span></div>' +
      '<div class="fly__leaf"><div class="fly__front">' + hardcover(b) + '</div><div class="fly__back">' + plateHTML(b) + '</div></div>' +
      '</div>';
    document.body.appendChild(f);
    return f;
  }

  // the path from the shelf to the reader: rise out of the row, arc toward you, turn spine to cover
  function path(f, from, to, spineEnd) {
    const inner = f.firstChild, W = to.width, H = to.height;
    const sy0 = from.height / H, sx0 = spineEnd ? sy0 : from.width / W, T = spineEnd ? from.width / sx0 : 40;
    f.style.setProperty('--t', T + 'px');
    const ax = from.left + from.width / 2, ay = from.top + from.height / 2, bx = to.left + W / 2, by = to.top + H / 2;
    const ry0 = spineEnd ? 90 : 10;
    return (p) => {
      const lift = smooth(0, 0.22, p), q = smooth(0.12, 1, p);
      const x = ax + (bx - ax) * q, y = ay + (by - ay) * q - 40 * lift * (1 - q) - 70 * Math.sin(Math.PI * q);
      const sx = sx0 + (1 - sx0) * q, sy = sy0 + (1 - sy0) * q, ry = ry0 * (1 - smooth(0.15, 0.9, p)), rz = -5 * Math.sin(Math.PI * q);
      f.style.transform = 'translate(' + (x - W / 2) + 'px,' + (y - H / 2) + 'px)';
      inner.style.transform = 'scale(' + sx + ',' + sy + ') rotateZ(' + rz + 'deg) rotateY(' + ry + 'deg)';
    };
  }
  const leafTo = (f, a) => { f.querySelector('.fly__leaf').style.transform = 'translateZ(calc(var(--t) / 2)) rotateY(' + a + 'deg)'; };
  const twoPages = () => matchMedia('(min-width:700px)').matches;

  function openBook(b, el) {
    if (busy) return;
    current = b; fill(b);
    b.card.dispatchEvent(new Event('pointerenter')); // fetch its first painting now, so play starts at once
    const from = el.getBoundingClientRect(), spineEnd = from.width < 120;
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
    const tl = gsap.timeline({ onComplete: () => { f.remove(); finish(); } });
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
    if (!current || busy) return;
    const b = current, el = els.find((e) => e.dataset.id === b.id);
    const done = () => {
      busy = false; current = null; reader.hidden = true;
      [plate, pageEl, textEl, xBtn, scrim].forEach((n) => { n.style.opacity = ''; });
      el.classList.remove('is-out');
      hooks.close && hooks.close();
    };
    if (instant || REDUCED || !window.gsap) { done(); return; }
    busy = true;
    const two = twoPages(), to = (two ? pageEl : plate).getBoundingClientRect(), from = el.getBoundingClientRect();
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

  els.forEach((el, i) => {
    const b = books[i];
    el.addEventListener('click', () => openBook(b, el));
    el.addEventListener('pointerenter', () => b.card.dispatchEvent(new Event('pointerenter')), { once: true });
    // arrows walk along the shelf
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const live = els.filter((o) => !o.classList.contains('is-away')), j = live.indexOf(el) + (e.key === 'ArrowRight' ? 1 : -1);
      if (live[j]) live[j].focus();
    });
  });

  window.SakhaShelf = { init: (h) => { hooks = h || {}; } };
})();
