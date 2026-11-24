/* The story archive: a cream room with the stories standing spine out, edge to edge, across the whole shelf.
   Point at a volume and it swings out to show its painted cover while the caption beneath names it; the arrows
   walk along the shelf. Choose one and a page opens through a torn-paper reveal: the story on the left, its cover
   on the right. Feeling tabs restock the shelf. Built from the story cards already in the page, which stay (hidden)
   as the no-script fallback and do the playing. */
(function () {
  'use strict';
  const rail = document.querySelector('.stories__rail');
  if (!rail) return;
  const cards = [...rail.querySelectorAll('.card[data-story]')];

  const DEV = { arjuna: 'अर्जुन', meera: 'मीरा', hanuman: 'हनुमान', prahlad: 'प्रह्लाद', sudama: 'सुदामा', karna: 'कर्ण', dhruva: 'ध्रुव', savitri: 'सावित्री', valmiki: 'वाल्मीकि', shabari: 'शबरी', ganesha: 'गणेश', ashtavakra: 'अष्टावक्र', rama: 'राम', hima: 'राजा हिम' };
  // the binding: cloth for most, aged paper for a few, so the shelf reads like a real collection
  const CLOTH = { arjuna: '#23305e', meera: '#e2d6bb', hanuman: '#7e3814', prahlad: '#6a1e1c', sudama: '#d9ccab', karna: '#6f5418', dhruva: '#1d4856', savitri: '#e6dcc4', valmiki: '#2d3a2b', shabari: '#d4c4a0', ganesha: '#7c2a1b', ashtavakra: '#2a4566', rama: '#ddd0b2', hima: '#4c3416' };
  const PAPER = new Set(['meera', 'sudama', 'savitri', 'shabari', 'rama']);
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
    const first = S && S.shots && S.shots.find((s) => s.cap);
    return {
      id, card, i,
      name: (card.getAttribute('aria-label').match(/Play (.+)’s story/) || [, id])[1],
      label: card.querySelector('.mono').textContent,
      title: card.querySelector('h3').textContent,
      forWhen: card.querySelector('.card__for').textContent,
      opening: first ? first.cap : '',
      src: img.getAttribute('src'), pos: img.style.objectPosition || '50% 50%', alt: img.alt,
      secs: S ? S.dur : 0, dur: S ? fmt(S.dur) : '', n: String(i + 1).padStart(2, '0'),
      w: W[i % W.length], h: H[i % H.length], paper: PAPER.has(id)
    };
  });
  const total = Math.round(books.reduce((a, b) => a + b.secs, 0) / 60);

  // the front of a volume: a cloth (or paper) board, the painting in a window, the title over it, Sakha's stamp
  const cover = (b, lazy) => '<span class="cov' + (b.paper ? ' is-paper' : '') + '" style="--cloth:' + CLOTH[b.id] + '">' +
    '<span class="cov__win"><img src="' + b.src + '" alt=""' + (lazy ? ' loading="lazy" decoding="async"' : '') + ' style="object-position:' + b.pos + '"></span>' +
    '<span class="cov__title">' + esc(b.title) + '</span>' +
    '<span class="cov__foot"><span class="cov__by">A Sakha story · ' + b.n + '</span><span class="cov__stamp">सखा</span></span></span>';
  const spine = (b) => '<span class="spn' + (b.paper ? ' is-paper' : '') + '" style="--cloth:' + CLOTH[b.id] + '">' +
    '<span class="spn__art"><img src="' + b.src + '" alt="" loading="lazy" decoding="async" style="object-position:' + b.pos + '"></span>' +
    '<span class="spn__name">' + esc(b.name) + '</span>' +
    '<span class="spn__foot"><span class="spn__dev">' + (DEV[b.id] || '') + '</span><span class="spn__n">' + b.n + '</span></span></span>';

  const arc = document.createElement('div');
  arc.className = 'arc';
  arc.innerHTML =
    '<div class="arc__top"><p class="arc__meta">The scene library</p>' +
      '<p class="arc__brand"><span class="arc__dev">कथा-संग्रह</span><span class="arc__en">The story shelf</span></p>' +
      '<p class="arc__meta arc__meta--r">' + books.length + ' stories · ' + total + ' min</p></div>' +
    '<div class="arc__tabs" role="group" aria-label="Find a story by feeling">' +
      '<button type="button" class="arc__tab is-on" data-feel="" aria-pressed="true">All</button>' +
      Object.entries(FEEL).map(([k, f]) => '<button type="button" class="arc__tab" data-feel="' + k + '" aria-pressed="false">' + f.label + '</button>').join('') +
    '</div>' +
    '<div class="arc__shelf"><div class="arc__row"></div></div>' +
    '<div class="arc__cap">' +
      '<button type="button" class="arc__arrow" data-dir="-1" aria-label="Previous story"><svg aria-hidden="true" width="22" height="12" viewBox="0 0 22 12"><path d="M21 6H2m5-5L1.5 6 7 11" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></button>' +
      '<div class="arc__now" aria-live="polite"><p class="arc__title"></p><p class="arc__who"><span class="arc__whodev"></span><span class="arc__whoen"></span></p><p class="arc__line"></p>' +
        '<button type="button" class="arc__open">Open the story</button></div>' +
      '<button type="button" class="arc__arrow" data-dir="1" aria-label="Next story"><svg aria-hidden="true" width="22" height="12" viewBox="0 0 22 12"><path d="M1 6h19m-5-5 5.5 5-5.5 5" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></button>' +
    '</div>' +
    '<div class="arc__bot"><span>Painted · narrated · one verse each</span><span class="arc__count"></span></div>';
  rail.hidden = true;
  rail.after(arc);

  const $ = (s) => arc.querySelector(s);
  const row = $('.arc__row');
  let list = books, active = null, hooks = {};

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
        (real ? ' aria-label="' + esc(b.name) + '’s story. ' + esc(b.forWhen) + '"' : ' tabindex="-1" aria-hidden="true"') +
        (real ? ' data-real' : '') + '>' + spine(b) + '<span class="vol__front" aria-hidden="true">' + cover(b, true) + '</span></button>';
    });
    row.innerHTML = html;
    row.classList.toggle('is-in', !!animate && !REDUCED);
    const reals = [...row.querySelectorAll('[data-real]')];
    pick(reals[Math.floor((reals.length - 1) / 2)]);
  }

  function pick(el) {
    if (!el || el === active) return;
    if (active) active.classList.remove('is-pulled');
    active = el; el.classList.add('is-pulled');
    const b = books.find((x) => x.id === el.dataset.id);
    $('.arc__title').textContent = b.title;
    $('.arc__whodev').textContent = DEV[b.id] || '';
    $('.arc__whoen').textContent = b.name;
    $('.arc__line').textContent = [b.dur, b.label].filter(Boolean).join(' · ');
    $('.arc__count').textContent = String(list.indexOf(b) + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
    b.card.dispatchEvent(new Event('pointerenter')); // fetch its first painting now, so play starts at once
  }
  const bookOf = (el) => books.find((x) => x.id === el.dataset.id);
  // step along the shelf, staying on the run you can see best (the middle one)
  function step(dir) {
    const reals = [...row.querySelectorAll('[data-real]')];
    const at = reals.findIndex((e) => e.dataset.id === active.dataset.id);
    pick(reals[(at + dir + reals.length) % reals.length]);
  }

  row.addEventListener('pointerover', (e) => { const v = e.target.closest('.vol'); if (v && HOVER.matches) pick(v); });
  row.addEventListener('click', (e) => {
    const v = e.target.closest('.vol'); if (!v) return;
    // on touch the first tap pulls the volume out, the second opens it
    if (v !== active && !HOVER.matches) { pick(v); return; }
    pick(v); open(bookOf(v), v);
  });
  row.addEventListener('focusin', (e) => { const v = e.target.closest('.vol'); if (v) pick(v); });
  row.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); active.focus({ preventScroll: true });
  });
  arc.querySelectorAll('.arc__arrow').forEach((a) => a.addEventListener('click', () => step(+a.dataset.dir)));
  $('.arc__open').addEventListener('click', () => open(bookOf(active), active));
  arc.querySelectorAll('.arc__tab').forEach((t) => t.addEventListener('click', () => {
    arc.querySelectorAll('.arc__tab').forEach((o) => { o.classList.toggle('is-on', o === t); o.setAttribute('aria-pressed', String(o === t)); });
    const ids = t.dataset.feel ? FEEL[t.dataset.feel].ids : null;
    list = ids ? books.filter((b) => ids.includes(b.id)) : books;
    active = null; stock(true);
  }));
  let lastW = innerWidth;
  addEventListener('resize', () => { if (Math.abs(innerWidth - lastW) < 80) return; lastW = innerWidth; const id = active && active.dataset.id; active = null; stock(false); if (id) pick(row.querySelector('[data-real][data-id="' + id + '"]')); });
  stock(false);

  // the site's menu is light on dark; over the cream archive it switches to ink
  const nav = document.getElementById('nav');
  const paper = () => { const r = arc.getBoundingClientRect(), y = nav ? nav.offsetHeight / 2 : 36; document.documentElement.classList.toggle('on-paper', r.top <= y && r.bottom >= y); };
  addEventListener('scroll', paper, { passive: true }); paper();

  /* ---------- the page: a volume opened ---------- */
  // a torn-paper edge, made once: a ragged ring of points, used as a growing mask over the cover
  const torn = (() => {
    let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const pts = [...Array(46)].map((_, i) => { const a = (i / 46) * Math.PI * 2, d = 40 + r() * 9 - (i % 3 === 0 ? 5 : 0); return (50 + Math.cos(a) * d).toFixed(1) + ',' + (50 + Math.sin(a) * d * 1.08).toFixed(1); });
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="' + pts.join(' ') + '"/></svg>') + '")';
  })();

  const page = document.createElement('div');
  page.className = 'arcp'; page.hidden = true;
  page.setAttribute('role', 'dialog'); page.setAttribute('aria-modal', 'true'); page.setAttribute('aria-labelledby', 'arcpTitle');
  page.setAttribute('data-lenis-prevent', '');
  page.innerHTML =
    '<div class="arcp__bar"><button type="button" class="arcp__close" data-act="back">Close <span lang="hi">· बंद</span></button>' +
      '<p class="arcp__brand"><span class="arc__dev">कथा-संग्रह</span><span class="arc__en">The story shelf</span></p><span></span></div>' +
    '<div class="arcp__grid"><div class="arcp__text">' +
      '<p class="arcp__kick"></p><h3 class="arcp__title" id="arcpTitle"></h3><p class="arcp__meta"></p>' +
      '<p class="arcp__syn"></p><p class="arcp__for"></p>' +
      '<div class="arcp__acts"><button type="button" class="arcp__play" data-act="play">▶ Play the story <span></span></button></div>' +
    '</div><div class="arcp__art"><div class="arcp__cover"></div></div></div>';
  document.body.appendChild(page);
  const $p = (s) => page.querySelector(s);
  const coverBox = $p('.arcp__cover'), textEls = () => [...$p('.arcp__text').children];
  let current = null, from = null, busy = false;

  function fill(b) {
    $p('.arcp__kick').textContent = b.label;
    $p('.arcp__title').textContent = b.title;
    $p('.arcp__meta').textContent = [b.name, DEV[b.id], b.dur, 'Narrated'].filter(Boolean).join(' · ');
    $p('.arcp__syn').textContent = b.opening || b.forWhen;
    $p('.arcp__for').textContent = b.opening ? b.forWhen : '';
    $p('.arcp__play span').textContent = b.dur;
    coverBox.innerHTML = cover(b);
    coverBox.querySelector('img').alt = b.alt;
  }
  const clipOf = (r) => 'inset(' + r.top + 'px ' + (innerWidth - r.right) + 'px ' + (innerHeight - r.bottom) + 'px ' + r.left + 'px round 4px)';

  function open(b, el) {
    if (busy || !b) return;
    current = b; fill(b);
    page.hidden = false; document.documentElement.classList.add('arc-open');
    hooks.open && hooks.open(b.id);
    const done = () => { busy = false; page.style.clipPath = ''; coverBox.style.maskImage = coverBox.style.webkitMaskImage = ''; textEls().forEach((n) => { n.style.opacity = ''; n.style.transform = ''; }); $p('.arcp__play').focus({ preventScroll: true }); };
    if (REDUCED || !window.gsap) return done();
    busy = true;
    from = el.getBoundingClientRect();
    // the page grows out of the volume; the cover tears in from its middle; then the words arrive
    const st = { m: 0 };
    textEls().forEach((n) => { n.style.opacity = 0; n.style.transform = 'translateY(16px)'; });
    coverBox.style.maskImage = coverBox.style.webkitMaskImage = torn;
    const mask = () => { coverBox.style.maskSize = coverBox.style.webkitMaskSize = (st.m * 260) + '%'; };
    mask();
    gsap.timeline({ onComplete: done })
      .fromTo(page, { clipPath: clipOf(from) }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.7, ease: 'power3.inOut' })
      .to(st, { m: 1, duration: 1, ease: 'power2.inOut', onUpdate: mask }, '-=0.15')
      .to(textEls(), { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' }, '-=0.7');
  }

  function close(instant) {
    if (!current || busy) return;
    const back = active;
    const done = () => { busy = false; current = null; page.hidden = true; page.style.clipPath = ''; page.style.opacity = ''; document.documentElement.classList.remove('arc-open'); hooks.close && hooks.close(); };
    if (instant || REDUCED || !window.gsap) { done(); back && !instant && back.focus({ preventScroll: true }); return; }
    busy = true;
    const r = back && back.getBoundingClientRect(), seen = r && r.bottom > 0 && r.top < innerHeight;
    gsap.timeline({ onComplete: () => { done(); back && back.focus({ preventScroll: true }); } })
      .to(textEls(), { opacity: 0, duration: 0.2 })
      .to(page, seen ? { clipPath: clipOf(r), duration: 0.6, ease: 'power3.inOut' } : { opacity: 0, duration: 0.4 });
  }

  page.querySelectorAll('[data-act="back"]').forEach((n) => n.addEventListener('click', () => close()));
  $p('[data-act="play"]').addEventListener('click', () => { const c = current && current.card; close(true); c && c.click(); });
  page.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    // keep the keyboard inside the open page
    if (e.key === 'Tab') {
      const f = [...page.querySelectorAll('button')], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });

  window.SakhaShelf = { init: (h) => { hooks = h || {}; } };
})();
