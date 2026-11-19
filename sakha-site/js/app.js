(function () {
  'use strict';

  // always open on the hero: browsers restore the last scroll position on reload, which landed visitors mid-page
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const wait = (ms) => new Promise((r) => setTimeout(r, REDUCED ? Math.min(ms, 150) : ms));

  const stage = new SakhaStage($('#stage'));
  const dust = new SakhaDust($('#dust'));
  const audio = new SakhaAudio();

  /* ---------------- sound toggle ---------------- */
  const soundBtn = $('#soundBtn'), soundLabel = $('#soundLabel');
  function setSound(on) {
    if (on) audio.start(); else audio.stop();
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundLabel.textContent = on ? 'Sound on' : 'Sound off';
  }
  soundBtn.addEventListener('click', () => setSound(!audio.on));
  // say so plainly when the track file isn't there, instead of a silent "Sound on"
  audio.onMissing = () => { soundBtn.setAttribute('aria-pressed', 'false'); soundLabel.textContent = 'No track yet'; audio.on = false; };

  /* ---------------- word splitting ---------------- */
  function split(el) {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--i', i++);
            w.appendChild(inner); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  }
  $$('.split').forEach(split);

  /* ---------------- gate ---------------- */
  const gate = $('#gate'), pct = $('#gatePct');
  // the gate waits only for the two paintings it shows; the rest arrive while the visitor reads
  stage.load((p) => { pct.textContent = Math.round(p * 100) + '%'; }, ['diya', 'hero']).then(() => {
    stage.set('diya'); stage.state.zA = 1.12; stage.start();
    gate.classList.add('is-ready');
    stage.preload();
  });

  $$('[data-enter]').forEach((b) => b.addEventListener('click', () => {
    if (gate.classList.contains('is-gone')) return; // a double click must not set the scroll up twice
    if (b.dataset.enter === 'sound') setSound(true);
    gate.classList.add('is-gone');
    document.body.classList.remove('is-loading');
    dust.start();
    stage.go('hero', { dur: 2.8, zoomFrom: 1.18, zoomTo: 1.04, drift: 6 });
    setTimeout(() => { $$('#top .split, #top .rv').forEach((el, i) => { el.style.setProperty('--d', (0.15 + i * 0.12) + 's'); el.classList.add('in'); }); }, 900);
    initScroll();
  }));

  /* ---------------- scroll ---------------- */
  let lenis = null;
  let sceneOfSection = 'hero';
  function initScroll() {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.clearScrollMemory('manual'); // ScrollTrigger keeps its own copy of the old position
    scrollTo(0, 0);
    if (!REDUCED && window.Lenis) {
      lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const t = $(a.getAttribute('href')); if (!t) return;
      e.preventDefault(); lenis ? lenis.scrollTo(t, { duration: 2.2 }) : t.scrollIntoView();
    }));

    // which painting is behind which chapter
    $$('.ch[data-scene]').forEach((sec) => {
      const k = sec.dataset.scene;
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 45%',
        onToggle: (self) => {
          if (!self.isActive || document.body.classList.contains('is-chat')) return;
          if (k === 'dim') { stage.dim(0.72); dust.amount = 0.4; return; }
          if (k === 'void') { stage.dim(0.94); dust.amount = 0.15; return; }
          stage.dim(k === 'diya' ? 0.15 : 0); dust.amount = 1;
          sceneOfSection = k;
          stage.go(k, { dur: 2.4, zoomFrom: 1.16, zoomTo: 1.04, drift: 9 });
        }
      });
      // slow push while you read
      ScrollTrigger.create({
        trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true,
        onUpdate: (self) => { if (self.isActive && k !== 'dim' && !document.body.classList.contains('is-chat')) stage.szT = 1 + self.progress * 0.06; }
      });
    });

    if (window.SakhaForms) SakhaForms.init('#forms', (on) => {
      if (document.body.classList.contains('is-chat')) return;
      stage.dim(on ? 0.94 : 0); dust.amount = on ? 0.15 : 1;
    });

    // reveal text as it arrives
    $$('.split, .rv').forEach((el) => {
      if (el.closest('#top')) return;
      ScrollTrigger.create({ trigger: el, start: 'top 86%', once: true, onEnter: () => el.classList.add('in') });
    });
    $$('.steps .step').forEach((el, i) => el.style.setProperty('--d', (i * 0.12) + 's'));

    // stories: the shelf stays put; only the arrows move it, one card per click
    const track = $("#track");
    const [prev, next] = $$(".stories__arrows .arrow");
    const ends = () => { prev.disabled = track.scrollLeft < 4; next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 4; };
    track.addEventListener("scroll", ends, { passive: true });
    addEventListener("resize", ends);
    ends();
    [prev, next].forEach((b) => b.addEventListener("click", () => {
      const step = ($(".card", track).offsetWidth + parseFloat(getComputedStyle(track).columnGap || 0)) * +b.dataset.dir;
      track.scrollBy({ left: step, behavior: "smooth" });
    }));

    // triggers were made out of page order and the pins add scroll length, so recompute every start/end
    ScrollTrigger.sort();
    ScrollTrigger.refresh();

    // tilt on hover
    $$('.card').forEach((card) => {
      const img = $('.card__img', card);
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(img, { rotateX: -y * 8, rotateY: x * 10, duration: 0.8, ease: 'power3.out' });
      });
      card.addEventListener('pointerleave', () => gsap.to(img, { rotateX: 0, rotateY: 0, duration: 1.2, ease: 'power3.out' }));
    });
  }

  /* ================= chat ================= */
  const chat = $('#chat'), log = $('#chatLog'), scroller = $('#chatScroll');
  const form = $('#chatForm'), input = $('#chatInput'), stateEl = $('#chatState');
  let busy = false, flow = null, started = false, ownWordsHook = null;

  const FLAME = '<svg class="flame" aria-hidden="true" width="12" height="19" viewBox="0 0 40 64"><path d="M20 2 C 26 18, 31 26, 30 36 C 29 43, 25 47, 20 47 C 15 47, 11 43, 10 36 C 9 26, 14 18, 20 2 Z" fill="#F2C46B"/><path d="M20 44 C 22 44, 23 42, 23 40 C 23 37, 21 35, 20 32 C 19 35, 17 37, 17 40 C 17 42, 18 44, 20 44 Z" fill="#FFF8E6"/></svg>';

  const CRISIS = /(kill myself|killing myself|suicid|end my life|end it all|don'?t want to (live|be here|exist)|want to die|wanna die|self[- ]?harm|hurt myself|no reason to live|better off dead|marna chahta|marna chahti|jeena nahi)/i;
  const STUCK = /(stuck|lost in life|feel lost|don'?t know what to do|no purpose|directionless|can'?t move forward|unmotivated)/i;
  const JUDGED = /(judg|what (people|others|they) (think|say)|people think|others think|embarrass|ashamed|shame|laugh at|mock|log kya|what will people|insecur)/i;

  const FLOWS = {
    meera: {
      felt: [
        'That sounds exhausting. Like you’re always on a stage you never asked to stand on.',
        'And a little lonely, too, because no one sees how much it costs you.'
      ],
      ask: 'Where do you feel those eyes the most?',
      options: [
        { label: 'My family', reflect: 'The people who should feel safest. That’s the hardest kind, because you can’t just walk away from their opinion.' },
        { label: 'Work or college', reflect: 'So every day you walk into a room where you feel measured. No wonder you’re tired before the day even starts.' },
        { label: 'Online', reflect: 'A crowd that never sleeps and never stops scoring. Anyone would feel watched in that.' },
        { label: 'Inside my own head', reflect: 'So the loudest judge is the one you can’t leave. That’s worth noticing: some of those voices may not even be theirs.' }
      ],
      bridge: 'A whole kingdom once called a woman mad. Her own family too. Can I show you what she did?',
      cta: 'Show me her story',
      scene: {
        title: 'Scene 02 · Meera', dur: 44, audio: 'meera', cut: 1.1,
        // one painting and one keyword per line, cut like a bhajan montage
        shots: [
          { at: 0,    k: 'm01',     zf: 1.14, zt: 1.04, kw: 'Chittor',    cap: 'Five hundred years ago, in Chittor,' },
          { at: 4.2,  k: 'm02',     zf: 1.04, zt: 1.12, kw: 'Devotion',   cap: 'a young queen sang to Krishna every night.' },
          { at: 8.4,  k: 'm03',     zf: 1.14, zt: 1.04, kw: 'Whispers',   cap: 'The court began to whisper.' },
          { at: 12.6, k: 'm04',     zf: 1.04, zt: 1.12, kw: 'Shame',      cap: 'Her own family turned away.' },
          { at: 16.8, k: 'm05',     zf: 1.14, zt: 1.04, kw: 'बावरी', dev: true, cap: 'They said she had lost her mind.' },
          { at: 21,   k: 'm06',     zf: 1.04, zt: 1.12, kw: 'Heard',      cap: 'Meera heard every word.' },
          { at: 25.2, k: 'm07',     zf: 1.14, zt: 1.04, kw: 'Anklets',    cap: 'Then she tied on her anklets,' },
          { at: 29.4, k: 'meera',   zf: 1.04, zt: 1.14, kw: 'Anyway',     cap: 'and danced anyway.' },
          { at: 33.6, k: 'm08',     zf: 1.14, zt: 1.04, kw: 'Still sung', cap: 'Five hundred years later, her songs are still sung.' },
          { at: 38.4, k: 'krishna', zf: 1.12, zt: 1.04, kw: 'Forgotten',  cap: 'No one remembers the whispers.' }
        ]
      },
      verse: {
        ref: 'Bhagavad Gita 12.19 · Krishna to Arjuna',
        dv: 'तुल्यनिन्दास्तुतिर्मौनी सन्तुष्टो येन केनचित् ।\nअनिकेतः स्थिरमतिर्भक्तिमान्मे प्रियो नरः ॥',
        tr: 'tulya-nindā-stutir maunī santuṣṭo yena kenacit · aniketaḥ sthira-matir bhaktimān me priyo naraḥ',
        en: '“The one who takes blame and praise alike, who is quiet and content with what comes, whose mind is steady: that one is dear to me.”',
        forYou: 'Praise and blame are weather. Krishna doesn’t ask you to stop hearing them, only to stop living inside them. Meera heard every word. She kept dancing.'
      },
      step: {
        title: 'Do one small thing your way today. Don’t explain it to anyone.',
        items: ['Pick it now, while you’re reading this. The shirt, the opinion, the unedited message.', 'When the fear comes, say it quietly: “praise and blame are weather.”', 'Tonight, tell me how it felt.']
      }
    },
    arjuna: {
      felt: [
        'That heavy, frozen feeling. Like everything is waiting on you, and you can’t move.',
        'You’re not lazy, and you’re not broken. Being stuck is usually a sign that something matters to you.'
      ],
      ask: 'What does stuck feel like for you right now?',
      options: [
        { label: 'Too many choices', reflect: 'So it isn’t that you have nowhere to go. It’s that every road feels like it closes the others.' },
        { label: 'No energy to start', reflect: 'So even the first step feels heavy. That isn’t a character flaw. That’s a tired heart.' },
        { label: 'Scared of choosing wrong', reflect: 'So you’re holding still because a wrong move feels worse than no move. That makes sense. It’s also what keeps you here.' },
        { label: 'I don’t know what I want', reflect: 'So the map itself has gone blank. That’s a lonely place to stand.' }
      ],
      bridge: 'The greatest archer who ever lived once sat down in the middle of a battlefield and couldn’t lift his bow. Can I show you what his friend did?',
      cta: 'Show me Arjuna’s story',
      scene: {
        title: 'Scene 01 · The bow falls', dur: 36, audio: 'arjuna',
        shots: [
          { at: 0, k: 'chariot', zf: 1.3, zt: 1.1, cap: 'Kurukshetra. Two armies. <em>One man</em> who could not move.' },
          { at: 6, cap: 'Arjuna let his bow fall.', dv: 'विसृज्य सशरं चापं शोकसंविग्नमानसः' },
          { at: 12, k: 'vishvarupa', zf: 1.35, zt: 1.08, cap: 'His friend didn’t pull him up. He showed him <em>how big the world was.</em>', flute: [['P', -1, 1], ['S', 0, 1], ['R', 0, 1], ['G', 0, 2], ['R', 0, 1], ['S', 0, 3]] },
          { at: 19, cap: 'Bigger than this war. Bigger than this fear.' },
          { at: 25, k: 'krishna', zf: 1.2, zt: 1.05, cap: 'Then he told him one thing.' },
          { at: 30, cap: 'Do your part. <em>Let go of the rest.</em>' }
        ]
      },
      verse: {
        ref: 'Bhagavad Gita 2.47 · Krishna to Arjuna',
        dv: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥',
        tr: 'karmaṇy evādhikāras te mā phaleṣu kadācana · mā karma-phala-hetur bhūr mā te saṅgo ’stv akarmaṇi',
        en: '“Your right is to the work alone, never to its fruits. Don’t let the reward be your reason, and don’t cling to doing nothing.”',
        forYou: 'You don’t have to fix your whole life tonight. You only have to take the next honest step, and let the outcome be someone else’s problem for a while.'
      },
      step: {
        title: 'Take one ten-minute step. Then stop judging how it went.',
        items: ['Write down one thing you could do in ten minutes.', 'Do it before you sleep, badly if needed.', 'Tonight, tell me what you did, not how it turned out.']
      }
    }
  };

  // a narrated five-minute telling, when its generated timeline is loaded, replaces the short one
  ['meera', 'arjuna'].forEach((id) => { if (window.SAKHA_STORIES && SAKHA_STORIES[id]) FLOWS[id].scene = SAKHA_STORIES[id]; });

  function scrollDown() { scroller.scrollTo({ top: scroller.scrollHeight, behavior: REDUCED ? 'auto' : 'smooth' }); }

  function you(text) {
    const m = document.createElement('div'); m.className = 'msg msg--you';
    const p = document.createElement('p'); p.textContent = text; m.appendChild(p);
    log.appendChild(m); scrollDown();
  }

  function whoRow(label) {
    const r = document.createElement('div'); r.className = 'msg__who';
    r.innerHTML = FLAME + '<span class="mono">' + (label || 'Sakha') + '</span>';
    return r;
  }

  async function typing(ms) {
    const t = document.createElement('div'); t.className = 'typing';
    t.innerHTML = FLAME + '<span class="mono">Sakha is listening</span>';
    log.appendChild(t); scrollDown();
    stateEl.textContent = 'Listening';
    await wait(ms);
    t.remove();
    stateEl.textContent = 'Sakha is here';
  }

  async function say(lines, opts) {
    opts = opts || {};
    const m = document.createElement('div'); m.className = 'msg msg--sakha';
    m.appendChild(whoRow(opts.who));
    log.appendChild(m);
    for (const text of lines) {
      const p = document.createElement('p'); p.className = 'line';
      const words = text.split(' ');
      words.forEach((w, i) => { const s = document.createElement('span'); s.className = 'wd'; s.textContent = w + (i < words.length - 1 ? ' ' : ''); p.appendChild(s); });
      m.appendChild(p); scrollDown();
      for (const s of $$(".wd", p)) { s.classList.add("on"); await wait(32); }
      await wait(360);
    }
    return m;
  }

  // equal: answers to a question, so none is pushed as the default
  function actions(parent, list, equal) {
    return new Promise((resolve) => {
      const row = document.createElement('div'); row.className = 'acts';
      list.forEach((a, i) => {
        const b = document.createElement('button'); b.type = 'button';
        b.className = 'btn ' + (i === 0 && !equal ? 'btn--solid' : 'btn--ghost');
        b.innerHTML = a.label + (a.meta ? ' <span class="meta">' + a.meta + '</span>' : '');
        b.addEventListener('click', () => { row.remove(); resolve(a.id); });
        row.appendChild(b);
      });
      parent.appendChild(row); scrollDown();
    });
  }

  function openChat(first) {
    if (document.body.classList.contains('is-chat')) return;
    document.body.classList.add('is-chat');
    lenis && lenis.stop();
    chat.hidden = false;
    stage.szT = 1;
    stage.dim(0.2);
    dust.amount = 0.8;
    stage.go('deity', { dur: 2.2, zoomFrom: 1.15, zoomTo: 1.05, drift: 10 });
    setTimeout(() => input.focus({ preventScroll: true }), 400);
    if (!started) {
      started = true;
      (async () => {
        await wait(700);
        await say(['I’m here. Tell me what’s been heavy.']);
        if (first) send(first);
      })();
    } else if (first) send(first);
  }

  function closeChat() {
    if (playing) return;
    document.body.classList.remove('is-chat');
    chat.hidden = true;
    lenis && lenis.start();
    stage.go(sceneOfSection, { dur: 2, zoomFrom: 1.12, zoomTo: 1.04 });
  }
  $('#chatClose').addEventListener('click', closeChat);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !chat.hidden) closeChat(); });
  $$('[data-open-chat]').forEach((b) => b.addEventListener('click', () => openChat()));

  $('#heroAsk').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#heroInput').value.trim();
    if (v) drop($('#heroAsk .ask__field'));
    openChat(v || null);
    $('#heroInput').value = ''; grow($('#heroInput'));
  });
  $$('.chip').forEach((c) => c.addEventListener('click', () => openChat(c.dataset.prompt)));
  const heroInput = $('#heroInput');
  heroInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#heroAsk').requestSubmit(); } });
  heroInput.addEventListener('input', () => grow(heroInput));

  // on a phone both stop at about four lines; on desktop they keep their original, taller limits
  function grow(el) {
    const cap = matchMedia('(max-width:860px)').matches ? 120 : el.id === 'heroInput' ? 160 : 140;
    el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, cap) + 'px'; el.style.overflowY = el.scrollHeight > cap ? 'auto' : 'hidden';
  }
  input.addEventListener('input', () => grow(input));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim(); if (!v) return;
    input.value = ''; grow(input);
    drop(form);
    send(v);
  });

  // words let go of fall into the painting: a ripple runs out from where they were, and the dust gathers there
  function drop(el) {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    stage.ripple(x, y, 1.4); dust.gather(x, y);
  }
  // touch the painting itself (not the words or controls on it) and the ink ripples and petals scatter
  addEventListener('pointerdown', (e) => {
    if (playing || e.button > 0 || document.body.classList.contains('is-chat')) return;
    if (e.target.closest('a,button,input,textarea,label,.ask__field,.card,.nav,.folio,p,h1,h2,h3,li,.gate__inner')) return;
    stage.ripple(e.clientX, e.clientY); dust.burst(e.clientX, e.clientY);
    $('.hero__touch') && $('.hero__touch').classList.add('gone');
  });

  async function send(text) {
    // a crisis always gets through, whatever the flow is waiting on
    if (CRISIS.test(text)) {
      $$('.acts', log).forEach((a) => a.remove());
      busy = false;
      you(text);
      await safety();
      return;
    }
    if (ownWordsHook) { you(text); ownWordsHook(text); return; }
    if (busy) { you(text); ask(text); return; }
    busy = true;
    you(text);
    try {
      if (!flow && JUDGED.test(text)) { flow = 'meera'; await journey(FLOWS.meera); }
      else if (!flow && STUCK.test(text)) { flow = 'arjuna'; await journey(FLOWS.arjuna); }
      else await ask(text);
    } finally { busy = false; }
  }

  async function journey(F) {
    // 1. felt: name the feeling, no advice yet
    await typing(1900);
    await say(F.felt);
    // 2. one gentle question, so they name it further
    await wait(500);
    const q = await say([F.ask]);
    const choice = await actions(q, F.options.map((o, i) => ({ id: i, label: o.label })).concat([{ id: 'own', label: 'In my own words' }]), true);
    let reflect;
    if (choice === 'own') {
      reflect = await ownWords();
    } else {
      you(F.options[choice].label);
      reflect = F.options[choice].reflect;
    }
    // 3. mirror it back, then ask permission before the story
    await typing(1500);
    const m = await say([reflect, F.bridge]);
    const pick = await actions(m, [{ id: 'story', label: F.cta, meta: fmt(F.scene.dur) }, { id: 'talk', label: 'Just talk for now' }]);
    if (pick === 'talk') {
      await typing(1200);
      await say(['Of course. I’m listening. Tell me more about when it gets loudest.']);
      flow = flow; return;
    }
    await play(F.scene);
    await verse(F.verse);
    const vm = log.lastElementChild;
    const go = await actions(vm, [{ id: 'step', label: 'What do I do today?' }]);
    if (go !== 'step') return;
    await typing(1100);
    const sc = await stepCard(F.step);
    const ans = await actions(sc, [{ id: 'yes', label: 'I’ll try it today' }, { id: 'smaller', label: 'Something smaller, please' }]);
    await typing(1000);
    if (ans === 'yes') {
      stage.go('diya', { dur: 2.6, zoomFrom: 1.2, zoomTo: 1.1 });
      await say(['Then I’ll keep the lamp on for you tonight.', 'One more thing. Is there one person you could tell this to this week? Not everything. Just that it’s been heavy.']);
    } else {
      await say(['Smaller is wise. Just notice the fear once today, and don’t obey it. That’s all.', 'And if there’s someone you trust, let them know it’s been a heavy week. You don’t have to carry it only with me.']);
    }
    const end = log.lastElementChild;
    await actions(end, [{ id: 'done', label: 'Done for now' }]);
    await say(['Go gently. Krishna didn’t fight Arjuna’s battle for him. He just never left the chariot.']);
  }

  // the person answers the question in their own words; the reply mirrors them, never echoes generic comfort
  function ownWords() {
    return new Promise((resolve) => {
      ownWordsHook = (text) => {
        ownWordsHook = null;
        const short = text.length > 90 ? text.slice(0, 87).replace(/\s+\S*$/, '') + '…' : text;
        resolve('“' + short.replace(/[.!?]+$/, '') + '.” Thank you for saying it that plainly. That takes more courage than it looks.');
      };
      input.focus();
    });
  }


  async function safety() {
    stage.go('diya', { dur: 2.4, zoomFrom: 1.2, zoomTo: 1.12 });
    stateEl.textContent = 'Stories paused';
    await typing(900);
    const m = await say(['I’m really glad you told me. I’m not going anywhere.', 'I also want a real person with you right now. Will you call one of them while we keep talking?']);
    const h = document.createElement('div'); h.className = 'helplines';
    h.innerHTML =
      '<a href="tel:14416"><span><span class="mono">India · Tele-MANAS · 24 hours</span><strong>Call 14416</strong></span><span aria-hidden="true">→</span></a>' +
      '<a href="tel:988"><span><span class="mono">United States · call or text</span><strong>988</strong></span><span aria-hidden="true">→</span></a>' +
      '<a href="https://findahelpline.com" rel="noopener"><span><span class="mono">Another country</span><strong>findahelpline.com</strong></span><span aria-hidden="true">→</span></a>';
    m.appendChild(h); scrollDown();
  }

  async function verse(V) {
    await typing(900);
    const m = document.createElement('div'); m.className = 'msg msg--sakha';
    m.appendChild(whoRow(V.ref));
    const box = document.createElement('div'); box.className = 'verse';
    const dv = document.createElement('p'); dv.className = 'dv';
    V.dv.split('\n').forEach((ln, li) => {
      if (li) dv.appendChild(document.createElement('br'));
      ln.split(' ').forEach((w, wi) => {
        if (wi) dv.appendChild(document.createTextNode(' '));
        const s = document.createElement('span'); s.className = 'ch2'; s.textContent = w; dv.appendChild(s);
      });
    });
    const tr = document.createElement('p'); tr.className = 'tr'; tr.textContent = V.tr;
    const en = document.createElement('p'); en.className = 'en'; en.textContent = V.en;
    const fy = document.createElement('p'); fy.className = 'for'; fy.innerHTML = '<span class="mono">For you</span><br>' + V.forYou;
    box.append(dv, tr, en, fy);
    m.appendChild(box); log.appendChild(m);
    [tr, en, fy].forEach((el) => { el.style.opacity = 0; });
    scrollDown();
    for (const s of $$('.ch2', dv)) { s.classList.add('on'); await wait(160); }
    for (const el of [tr, en, fy]) { await wait(400); gsap.to(el, { opacity: 1, duration: 1.2, ease: 'power2.out' }); scrollDown(); }
    await wait(600);
  }

  async function stepCard(S) {
    const m = document.createElement('div'); m.className = 'msg msg--sakha';
    m.appendChild(whoRow('One step for today'));
    const c = document.createElement('div'); c.className = 'stepcard';
    const h = document.createElement('h3'); h.textContent = S.title;
    const ol = document.createElement('ol');
    S.items.forEach((t, i) => { const li = document.createElement('li'); li.innerHTML = '<span class="mono">0' + (i + 1) + '</span><span></span>'; li.lastChild.textContent = t; ol.appendChild(li); });
    c.append(h, ol); m.appendChild(c); log.appendChild(m);
    if (!REDUCED) gsap.from([h, ...ol.children], { opacity: 0, y: 14, filter: 'blur(6px)', duration: 1, stagger: 0.14, ease: 'power3.out' });
    scrollDown();
    await wait(900);
    return m;
  }

  /* ================= open conversation: Sakha's own brain (js/brain.js), no AI service ================= */
  async function ask(text) {
    const offer = $$('.acts .btn--solid', log).find((b) => /^Show me/.test(b.textContent));
    const r = SakhaBrain.reply(text, { offerPending: !!offer });
    if (r.accept && offer) { offer.click(); return; }
    if (r.decline && offer) offer.parentElement.lastElementChild.click();
    $$('.acts--chips', log).forEach((a) => a.remove()); // old suggestions go once they type
    await typing(Math.min(2200, 700 + r.text.length * 5));
    const m = await say(r.text.split(/\n\s*\n/));
    if (r.chips) {
      actions(m, r.chips.map((c, i) => ({ id: i, label: c })), true).then((i) => send(r.chips[i]));
      m.lastElementChild.classList.add('acts--chips');
    }
    if (r.play && window.SAKHA_STORIES && SAKHA_STORIES[r.play] && CARD_VERSE[r.play]) await offerFull(m, r.play);
  }

  // offer one of the narrated films, then its verse
  async function offerFull(m, id) {
    const S = SAKHA_STORIES[id];
    const name = id === 'hima' ? 'King Hima' : id[0].toUpperCase() + id.slice(1);
    warm(S);
    const pick = await actions(m, [{ id: 'story', label: 'Show me ' + name + '’s story', meta: fmt(S.dur) }, { id: 'talk', label: 'Not now' }]);
    if (pick !== 'story') return;
    await play(S);
    await verse(CARD_VERSE[id]);
  }

  /* ================= story player ================= */
  const player = $('#player'), cap = $('#playerCap'), bar = $('#playerBar'), tEl = $('#playerTime');
  const scrub = $('#playerScrub'), peek = $('#playerPeek'), ppBtn = $('#playerPause');
  let playing = false, skipFn = null, ctl = null; // ctl: the playing story's seek, pause and clock
  const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  function caption(html, dv) {
    $$('.cap, .cap-dv', cap).forEach((el) => { el.classList.add('out'); setTimeout(() => el.remove(), 700); });
    const p = document.createElement('p'); p.className = 'cap'; p.innerHTML = html; split(p);
    cap.appendChild(p);
    if (dv) { const d = document.createElement('p'); d.className = 'cap-dv'; d.textContent = dv; cap.appendChild(d); if (!REDUCED) gsap.from(d, { opacity: 0, y: 10, filter: 'blur(8px)', duration: 1.6, delay: 0.8, ease: 'power2.out' }); }
    requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('in')));
  }

  // montage line: a big keyword with the sentence beneath it
  function keyword(sh) {
    $$('.cap, .cap-dv, .kw, .kw-line', cap).forEach((el) => el.remove()); // hard cut, like the montage it copies
    const k = document.createElement('p'); k.className = 'kw' + (sh.dev ? ' kw--dev' : ''); k.textContent = sh.kw;
    const l = document.createElement('p'); l.className = 'kw-line'; l.textContent = sh.cap;
    cap.append(k, l);
    if (!REDUCED) {
      gsap.fromTo(k, { opacity: 0, scale: 1.18, filter: 'blur(12px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out' });
      gsap.fromTo(l, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.35, ease: 'power3.out' });
    }
  }

  // fetch a story's opening frame while the viewer is still deciding, so play starts at once
  const warm = (S) => { const k = (S.shots.find((sh) => sh.k) || {}).k; if (k) stage.ensure([k]); };

  function play(S) {
    // only the opening frame and the first moments of sound hold the start; the rest stream in, in story order
    const frames = [...new Set(S.shots.map((sh) => sh.k).filter(Boolean))];
    const first = Promise.all([stage.ensure(frames.slice(0, 1)), S.mix && audio.load(S.mix)]);
    first.then(() => frames.slice(1).reduce((p, k) => p.then(() => stage.ensure([k])), Promise.resolve()));
    return first.then(() => run(S));
  }

  function run(S) {
    return new Promise((resolve) => {
      playing = true;
      chat.style.visibility = 'hidden';
      player.hidden = false;
      $('#playerTitle').textContent = S.title;
      $('#playerDur').textContent = fmt(S.dur);
      cap.innerHTML = '';
      dust.amount = 1.3;
      stage.dim(0.22, 1.5);
      stage.storyOn = true; // on a phone, paintings frame into a band above the captions
      // a mixed story plays one finished soundtrack; others get the score and per-line voice
      const mix = S.mix ? audio.playMix(S.mix) : (audio.scene(), null);
      let next = 0, onMix = !!mix, paused = false, wall = 0, last = performance.now();
      const clock = () => (onMix ? mix.currentTime : wall);
      $('#playerTicks').innerHTML = S.shots.filter((sh) => sh.k).map((sh) => '<b style="left:' + (sh.at / S.dur * 100).toFixed(2) + '%"></b>').join('');
      scrub.setAttribute('aria-valuemax', Math.round(S.dur));
      // jump anywhere: land on the painting and the words that belong to that moment
      const seek = (to) => {
        to = Math.max(0, Math.min(S.dur - 0.5, to));
        if (onMix) mix.currentTime = to;
        wall = to;
        next = S.shots.findIndex((sh) => sh.at > to); if (next < 0) next = S.shots.length;
        const before = S.shots.slice(0, next).reverse();
        const k = before.find((sh) => sh.k), c = before.find((sh) => sh.kw || sh.cap);
        if (k) stage.go(k.k, { dur: 0.9, zoomFrom: 1, zoomTo: 1.04, drift: k.len || 6 });
        if (!c) cap.innerHTML = ''; else if (c.kw) keyword(c); else caption(c.cap, c.dv);
      };
      const toggle = () => {
        paused = !paused;
        if (onMix) { if (paused) mix.pause(); else { const p = mix.play(); p && p.catch && p.catch(() => {}); } }
        player.classList.toggle('is-paused', paused);
        ppBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
        stage.dim(paused ? 0.5 : 0.22, 0.6);
      };
      ctl = { S, seek, toggle, clock };
      const fire = (sh) => {
        // narrated scenes drift for exactly as long as their line is spoken
        // full-bleed, but only a 4% push so faces near the top edge stay in frame
        if (sh.k) stage.go(sh.k, { dur: S.cut || 2.2, zoomFrom: 1, zoomTo: 1.04, drift: sh.len || (S.cut ? 4 : 8) });
        else if (sh.zt) stage.zoom(sh.zt, 6);
        if (sh.kw) keyword(sh); else if (sh.cap) caption(sh.cap, sh.dv);
      };
      const raf = () => {
        if (!playing) return;
        const now = performance.now();
        if (!paused) wall += (now - last) / 1000;
        last = now;
        if (onMix && (mix.error || mix.blocked)) { onMix = false; wall = mix.currentTime || wall; } // the mix can't play: keep time ourselves
        // the mix is the clock: while it buffers the picture holds, so captions never run ahead of the voice
        const s = clock();
        while (next < S.shots.length && S.shots[next].at <= s) fire(S.shots[next++]);
        bar.style.width = Math.min(100, (s / S.dur) * 100) + '%';
        tEl.textContent = fmt(Math.min(s, S.dur));
        scrub.setAttribute('aria-valuenow', Math.round(s)); scrub.setAttribute('aria-valuetext', fmt(s));
        if (s >= S.dur || (onMix && mix.ended)) return end();
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
      const end = () => {
        if (!playing) return;
        playing = false; ctl = null;
        player.classList.remove('is-paused'); peek.hidden = true;
        gsap.to(player, { opacity: 0, duration: 0.9, onComplete: () => { player.hidden = true; player.style.opacity = ''; cap.innerHTML = ''; } });
        chat.style.visibility = '';
        dust.amount = 0.8;
        stage.dim(0.2, 1.5);
        stage.storyOn = false;
        audio.endScene();
        stage.go('deity', { dur: 2, zoomFrom: 1.12, zoomTo: 1.05 });
        resolve();
      };
      skipFn = end;
    });
  }
  $('#playerSkip').addEventListener('click', () => skipFn && skipFn());

  // pause, and a scrubber that previews each scene's painting before you jump to it
  ppBtn.addEventListener('click', () => ctl && ctl.toggle());
  player.addEventListener('click', (e) => { if (ctl && !e.target.closest('.player__hud, .player__foot')) ctl.toggle(); });
  const scenes = () => ctl.S.shots.filter((sh) => sh.k).map((sh) => sh.at);
  const step = (dir) => {
    const s = ctl.clock(), all = scenes();
    const to = dir > 0 ? all.find((a) => a > s + 0.5) : [...all].reverse().find((a) => a < s - 1.5);
    ctl.seek(to == null ? (dir > 0 ? ctl.S.dur : 0) : to);
  };
  addEventListener('keydown', (e) => {
    if (!ctl || e.target.closest('textarea, input')) return;
    if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); ctl.toggle(); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
  });
  let dragging = false;
  const timeAt = (e) => { const r = scrub.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * ctl.S.dur; };
  const showPeek = (e) => {
    const s = timeAt(e), before = ctl.S.shots.filter((sh) => sh.at <= s + 0.01).reverse();
    const k = before.find((sh) => sh.k), w = before.find((sh) => sh.kw);
    const img = $('img', peek), src = k && stage.src(k.k);
    if (src && !img.src.endsWith(src)) img.src = src;
    img.hidden = !src;
    $('span', peek).textContent = (w ? w.kw + ' · ' : '') + fmt(s);
    const r = scrub.getBoundingClientRect(), half = 84;
    peek.style.left = Math.max(half - r.left, Math.min(innerWidth - half - r.left, e.clientX - r.left)) + 'px';
    peek.hidden = false;
  };
  scrub.addEventListener('pointerdown', (e) => { if (!ctl) return; dragging = true; scrub.setPointerCapture(e.pointerId); showPeek(e); });
  scrub.addEventListener('pointermove', (e) => { if (ctl && (dragging || e.pointerType === 'mouse')) showPeek(e); });
  scrub.addEventListener('pointerup', (e) => { if (!ctl || !dragging) return; dragging = false; ctl.seek(timeAt(e)); if (e.pointerType !== 'mouse') peek.hidden = true; });
  scrub.addEventListener('pointercancel', () => { dragging = false; peek.hidden = true; });
  scrub.addEventListener('pointerleave', () => { if (!dragging) peek.hidden = true; });

  /* ================= story cards ================= */
  // each card plays its full narrated story, then its verse
  const CARD_VERSE = {
    meera: FLOWS.meera.verse,
    arjuna: FLOWS.arjuna.verse,
    hanuman: {
      ref: 'Bhagavad Gita 6.5 · Krishna to Arjuna',
      dv: 'उद्धरेदात्मनात्मानं नात्मानमवसादयेत् ।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ॥',
      tr: 'uddhared ātmanātmānaṁ nātmānam avasādayet · ātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ',
      en: '“Lift yourself by your own self. Do not let yourself sink. You are your own friend, and you can be your own enemy.”',
      forYou: 'Write down one hard thing you once got through. That strength did not go anywhere. It is waiting, like Hanuman’s, to be remembered.'
    },
    sudama: {
      ref: 'Bhagavad Gita 9.26 · Krishna to Arjuna',
      dv: 'पत्रं पुष्पं फलं तोयं यो मे भक्त्या प्रयच्छति ।\nतदहं भक्त्युपहृतमश्नामि प्रयतात्मनः ॥',
      tr: 'patraṁ puṣpaṁ phalaṁ toyaṁ yo me bhaktyā prayacchati · tad ahaṁ bhakty-upahṛtam aśnāmi prayatātmanaḥ',
      en: '“Whoever offers me with love a leaf, a flower, a fruit or a little water, I accept it.”',
      forYou: 'What you bring does not have to be big. Bring it with your whole heart, and it is enough.'
    },
    karna: {
      ref: 'Bhagavad Gita 5.18 · Krishna to Arjuna',
      dv: 'विद्याविनयसम्पन्ने ब्राह्मणे गवि हस्तिनि ।\nशुनि चैव श्वपाके च पण्डिताः समदर्शिनः ॥',
      tr: 'vidyā-vinaya-sampanne brāhmaṇe gavi hastini · śuni caiva śva-pāke ca paṇḍitāḥ sama-darśinaḥ',
      en: '“The wise see with an equal eye a learned priest, a cow, an elephant, a dog and the one the world calls an outcaste.”',
      forYou: 'Where you come from was never the measure of you. Today, see yourself the way the wise would see you.'
    },
    dhruva: {
      ref: 'Bhagavad Gita 6.30 · Krishna to Arjuna',
      dv: 'यो मां पश्यति सर्वत्र सर्वं च मयि पश्यति ।\nतस्याहं न प्रणश्यामि स च मे न प्रणश्यति ॥',
      tr: 'yo māṁ paśyati sarvatra sarvaṁ ca mayi paśyati · tasyāhaṁ na praṇaśyāmi sa ca me na praṇaśyati',
      en: '“Whoever sees me everywhere and sees everything in me, I am never lost to them, and they are never lost to me.”',
      forYou: 'Being pushed away by someone does not take away your place in the world. There is a love that never lets go of you.'
    },
    savitri: {
      ref: 'Bhagavad Gita 2.20 · Krishna to Arjuna',
      dv: 'न जायते म्रियते वा कदाचिन्नायं भूत्वा भविता वा न भूयः ।\nअजो नित्यः शाश्वतोऽयं पुराणो न हन्यते हन्यमाने शरीरे ॥',
      tr: 'na jāyate mriyate vā kadācin nāyaṁ bhūtvā bhavitā vā na bhūyaḥ · ajo nityaḥ śāśvato ’yaṁ purāṇo na hanyate hanyamāne śarīre',
      en: '“The soul is never born and never dies. Unborn, eternal, ancient, it is not destroyed when the body is destroyed.”',
      forYou: 'Love does not end where a life ends. If you are afraid of losing someone, tell them today what they mean to you.'
    },
    valmiki: {
      ref: 'Bhagavad Gita 9.30 · Krishna to Arjuna',
      dv: 'अपि चेत्सुदुराचारो भजते मामनन्यभाक् ।\nसाधुरेव स मन्तव्यः सम्यग्व्यवसितो हि सः ॥',
      tr: 'api cet su-durācāro bhajate mām ananya-bhāk · sādhur eva sa mantavyaḥ samyag vyavasito hi saḥ',
      en: '“Even someone who has done great wrong, if they turn to me with their whole heart, should be seen as good, for they have resolved rightly.”',
      forYou: 'Your past is a chapter, not the whole book. What you choose today is what you become.'
    },
    shabari: {
      ref: 'Bhagavad Gita 18.65 · Krishna to Arjuna',
      dv: 'मन्मना भव मद्भक्तो मद्याजी मां नमस्कुरु ।\nमामेवैष्यसि सत्यं ते प्रतिजाने प्रियोऽसि मे ॥',
      tr: 'man-manā bhava mad-bhakto mad-yājī māṁ namaskuru · mām evaiṣyasi satyaṁ te pratijāne priyo ’si me',
      en: '“Fix your mind on me, love me, offer to me, bow to me. You will come to me, I promise you truly, for you are dear to me.”',
      forYou: 'Waiting with love is not wasted time. Keep doing the small things well; they are being seen.'
    },
    ganesha: {
      ref: 'Bhagavad Gita 2.48 · Krishna to Arjuna',
      dv: 'योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय ।\nसिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते ॥',
      tr: 'yoga-sthaḥ kuru karmāṇi saṅgaṁ tyaktvā dhanañjaya · siddhy-asiddhyoḥ samo bhūtvā samatvaṁ yoga ucyate',
      en: '“Steady in yourself, do your work, letting go of attachment. Be the same in success and failure. That evenness is called yoga.”',
      forYou: 'You do not have to be the fastest. Ask what matters most here, and give that your best.'
    },
    ashtavakra: {
      ref: 'Bhagavad Gita 13.1 · Krishna to Arjuna',
      dv: 'इदं शरीरं कौन्तेय क्षेत्रमित्यभिधीयते ।\nएतद्यो वेत्ति तं प्राहुः क्षेत्रज्ञ इति तद्विदः ॥',
      tr: 'idaṁ śarīraṁ kaunteya kṣetram ity abhidhīyate · etad yo vetti taṁ prāhuḥ kṣetra-jña iti tad-vidaḥ',
      en: '“This body, Arjuna, is called the field. The one who knows it is called the knower of the field.”',
      forYou: 'Your body is something you have, not all that you are. The one looking out through your eyes is whole.'
    },
    rama: {
      ref: 'Bhagavad Gita 2.40 · Krishna to Arjuna',
      dv: 'नेहाभिक्रमनाशोऽस्ति प्रत्यवायो न विद्यते ।\nस्वल्पमप्यस्य धर्मस्य त्रायते महतो भयात् ॥',
      tr: 'nehābhikrama-nāśo ’sti pratyavāyo na vidyate · sv-alpam apy asya dharmasya trāyate mahato bhayāt',
      en: '“On this path no effort is ever lost, and no harm is ever done. Even a little of it protects you from great fear.”',
      forYou: 'When you gave everything and still came up one short, nothing you offered sincerely was wasted. The goddess was counting Rama’s heart, not his lotuses.'
    },
    hima: {
      ref: 'Bhagavad Gita 10.11 · Krishna to Arjuna',
      dv: 'तेषामेवानुकम्पार्थमहमज्ञानजं तमः ।\nनाशयाम्यात्मभावस्थो ज्ञानदीपेन भास्वता ॥',
      tr: 'teṣām evānukampārtham aham ajñāna-jaṁ tamaḥ · nāśayāmy ātma-bhāva-stho jñāna-dīpena bhāsvatā',
      en: '“Out of compassion for them, I, living in their hearts, destroy the darkness born of ignorance with the shining lamp of knowledge.”',
      forYou: 'A frightening prediction is not the end of your story. The princess did not argue with the stars; she kept the lights on and kept love close. Light one small lamp tonight, and keep it burning till morning.'
    },
    prahlad: {
      ref: 'Bhagavad Gita 9.22 · Krishna to Arjuna',
      dv: 'अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते ।\nतेषां नित्याभियुक्तानां योगक्षेमं वहाम्यहम् ॥',
      tr: 'ananyāś cintayanto māṁ ye janāḥ paryupāsate · teṣāṁ nityābhiyuktānāṁ yoga-kṣemaṁ vahāmy aham',
      en: '“Those who think of me alone, always devoted: I carry what they lack, and I keep what they have.”',
      forYou: 'Fear can be loud and still not be in charge. Name one fear today, and take one small step past it.'
    }
  };
  // cards keep their own flag: a chat left mid-conversation must not block them
  let cardBusy = false;
  $$('.card[data-story]').forEach((card) => {
    const id = card.dataset.story;
    const S = window.SAKHA_STORIES && SAKHA_STORIES[id];
    if (!S) { card.querySelector('.card__play').hidden = true; return; }
    card.querySelector('.card__play span').textContent = '· ' + fmt(S.dur);
    const go = async () => {
      if (playing || cardBusy) return;
      cardBusy = true;
      started = true; // the story is the opening, so skip the greeting
      openChat();
      try {
        await play(S);
        await verse(CARD_VERSE[id]);
        await say(['Take a breath. If any part of that felt like yours, tell me about it.']);
      } finally { cardBusy = false; }
    };
    card.addEventListener('click', go);
    card.addEventListener('pointerenter', () => warm(S), { once: true });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });

  // a volume taken off the shelf: its opening painting rises behind the reading view
  if (window.SakhaShelf) SakhaShelf.init({
    open: (id) => {
      const S = window.SAKHA_STORIES && SAKHA_STORIES[id], k = S && (S.shots.find((sh) => sh.k) || {}).k;
      if (k) stage.go(k, { dur: 1.6, zoomFrom: 1.1, zoomTo: 1.04, drift: 10 });
      stage.dim(0.45);
    },
    close: () => stage.dim(0.72)
  });
})();
