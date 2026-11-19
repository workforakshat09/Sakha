/* "Every form": coloured motes that become a lamp, Krishna's wheel, a peacock feather and ॐ as you scroll.
   Each form is painted once on a 2D canvas; motes are sampled mostly along its outlines (so it reads like
   engraved linework) and take the colour of the paint they land on. The shader swirls them between forms. */
(function () {
  'use strict';

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GOLD = '#E9C27A', PALE = '#FFF1CF', CORAL = '#E8875E', TEAL = '#2FA39A', BLUE = '#2B4FA8', DEEP = '#1B2E6B';

  const TAU = Math.PI * 2, rnd = Math.random;
  const P = (cx, cy, a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];

  const FORMS = [
    function lamp(x) {
      x.lineCap = 'round';
      // a halo of short rays and rising sparks above the flame
      x.strokeStyle = GOLD; x.lineWidth = 1.6;
      for (let i = 0; i < 40; i++) {
        const a = Math.PI + 0.12 + (i / 39) * (Math.PI - 0.24), r0 = 150 + (i % 3) * 12, r1 = r0 + 34 + (i % 2) * 26;
        x.beginPath(); x.moveTo(...P(256, 250, a, r0)); x.lineTo(...P(256, 250, a, r1)); x.stroke();
      }
      for (let i = 0; i < 60; i++) {
        x.fillStyle = i % 3 ? GOLD : PALE;
        x.beginPath(); x.arc(256 + (rnd() - 0.5) * 150 * rnd(), 12 + rnd() * 110, 1.4 + rnd() * 2.2, 0, TAU); x.fill();
      }
      // clay diya: bowl, engraved lotus band, rim, foot
      const body = x.createLinearGradient(0, 380, 0, 476);
      body.addColorStop(0, GOLD); body.addColorStop(1, CORAL);
      x.fillStyle = body;
      x.beginPath(); x.moveTo(126, 384); x.quadraticCurveTo(136, 474, 256, 476); x.quadraticCurveTo(376, 474, 386, 384); x.closePath(); x.fill();
      x.strokeStyle = CORAL; x.lineWidth = 2.4;
      for (let i = 0; i < 9; i++) {
        const px = 166 + i * 22.5;
        x.beginPath(); x.moveTo(px, 452); x.quadraticCurveTo(px - 11, 432, px, 412); x.quadraticCurveTo(px + 11, 432, px, 452); x.stroke();
      }
      x.fillStyle = PALE;
      for (let i = 0; i < 15; i++) { x.beginPath(); x.arc(176 + i * 11.4, 462 - Math.sin(i / 14 * Math.PI) * 3, 2.4, 0, TAU); x.fill(); }
      x.fillStyle = '#9A5B2C'; x.beginPath(); x.ellipse(256, 384, 128, 20, 0, 0, TAU); x.fill(); // oil
      x.strokeStyle = PALE; x.lineWidth = 4; x.beginPath(); x.ellipse(256, 384, 130, 21, 0, 0, TAU); x.stroke();
      x.fillStyle = GOLD; x.beginPath(); x.ellipse(256, 486, 54, 10, 0, 0, TAU); x.fill();
      // wick, then the flame in layers: coral skin, gold body, white core, blue root
      x.strokeStyle = '#C08A4A'; x.lineWidth = 4; x.beginPath(); x.moveTo(256, 384); x.lineTo(256, 360); x.stroke();
      const flame = (top, w, base, fill) => {
        x.fillStyle = fill; x.beginPath(); x.moveTo(256, top);
        x.bezierCurveTo(256 + w * 0.7, top + (base - top) * 0.45, 256 + w, base - 70, 256 + w * 0.92, base - 40);
        x.bezierCurveTo(256 + w * 0.8, base - 6, 256 + w * 0.4, base, 256, base);
        x.bezierCurveTo(256 - w * 0.4, base, 256 - w * 0.8, base - 6, 256 - w * 0.92, base - 40);
        x.bezierCurveTo(256 - w, base - 70, 256 - w * 0.7, top + (base - top) * 0.45, 256, top); x.fill();
      };
      const g = x.createLinearGradient(0, 40, 0, 366); g.addColorStop(0, CORAL); g.addColorStop(0.5, GOLD); g.addColorStop(1, PALE);
      flame(40, 86, 366, g);
      flame(130, 58, 362, GOLD);
      flame(210, 32, 356, PALE);
      x.fillStyle = '#4A7BE0'; x.beginPath(); x.ellipse(256, 354, 22, 9, 0, 0, TAU); x.fill();
    },
    function chakra(x) {
      // Sudarshana: flames that lean with the spin, a beaded band, sixteen ornate spokes, a lotus hub
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * TAU, big = i % 2 === 0, r = big ? 252 : 230, w = big ? 0.07 : 0.045;
        x.fillStyle = big ? GOLD : CORAL;
        x.beginPath(); x.moveTo(...P(256, 256, a - w, 200));
        x.quadraticCurveTo(...P(256, 256, a - w * 0.4, r - 20), ...P(256, 256, a + w * 0.6, r));
        x.quadraticCurveTo(...P(256, 256, a + w * 0.5, r - 30), ...P(256, 256, a + w, 200)); x.fill();
      }
      x.strokeStyle = GOLD;
      x.lineWidth = 12; x.beginPath(); x.arc(256, 256, 198, 0, TAU); x.stroke();
      x.fillStyle = PALE;
      for (let i = 0; i < 64; i++) { x.beginPath(); x.arc(...P(256, 256, (i / 64) * TAU, 181), 3, 0, TAU); x.fill(); }
      x.lineWidth = 3; x.beginPath(); x.arc(256, 256, 168, 0, TAU); x.stroke();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU, h = a + TAU / 32;
        x.strokeStyle = GOLD; x.lineWidth = 6;
        x.beginPath(); x.moveTo(...P(256, 256, a, 58)); x.lineTo(...P(256, 256, a, 166)); x.stroke();
        x.fillStyle = CORAL; x.beginPath(); // diamond on each spoke
        x.moveTo(...P(256, 256, a, 96)); x.lineTo(...P(256, 256, a + 0.07, 112)); x.lineTo(...P(256, 256, a, 128)); x.lineTo(...P(256, 256, a - 0.07, 112)); x.fill();
        x.strokeStyle = GOLD; x.lineWidth = 2; // small arch between spokes
        x.beginPath(); x.arc(...P(256, 256, h, 166), 18, h + Math.PI * 0.55, h + Math.PI * 1.45); x.stroke();
      }
      x.lineWidth = 5; x.strokeStyle = GOLD; x.beginPath(); x.arc(256, 256, 56, 0, TAU); x.stroke();
      x.fillStyle = CORAL;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        x.beginPath(); x.moveTo(...P(256, 256, a - 0.32, 20)); x.quadraticCurveTo(...P(256, 256, a, 64), ...P(256, 256, a + 0.32, 20)); x.fill();
      }
      x.fillStyle = PALE; x.beginPath(); x.arc(256, 256, 17, 0, TAU); x.fill();
    },
    function feather(x) {
      // after a close photo of a real feather: tilted, fine barbs that clump into strands, bronze barbs low down,
      // and the eye from outside in: green, a thin blue edge, a wide copper oval, a sky-blue ring, a navy heart
      x.translate(256, 256); x.rotate(-0.32); x.scale(0.9, 0.9); x.translate(-256, -256);
      x.lineCap = 'round';
      const qx = (y) => 256 + Math.pow((y - 170) / 340, 2) * 30; // the quill bows gently
      const strand = (sy, tx, ty, c0, c1, w) => {
        const sx = qx(sy), g = x.createLinearGradient(sx, sy, tx, ty);
        g.addColorStop(0, c0); g.addColorStop(1, c1);
        x.strokeStyle = g; x.lineWidth = w;
        // leaves the quill almost flat, then sweeps up into its tip
        x.beginPath(); x.moveTo(sx, sy);
        x.bezierCurveTo(sx + (tx - sx) * 0.4, sy + (ty - sy) * 0.1, tx - (tx - sx) * 0.2, ty + (sy - ty) * 0.12, tx, ty); x.stroke();
      };
      for (const side of [-1, 1]) {
        // loose bronze wisps on the lower quill, with gaps
        for (let k = 0; k < 16; k++) {
          if (rnd() < 0.3) continue;
          const sy = 500 - k * 7, len = 80 + rnd() * 110;
          strand(sy, qx(sy) + side * len, sy - 60 - rnd() * 80, '#6A5732', '#9A8A4C', 1.1);
        }
        // the vane: barbs gather in clumps of 3-6 that share a tip, with small gaps between clumps
        for (let i = 0; i < 120;) {
          const n = 2 + Math.floor(rnd() * 3), f = i / 119;
          const a = (1 - f) * 2.0 + (rnd() - 0.5) * 0.06, r = 0.84 + rnd() * 0.18;
          const tx = 256 + side * Math.sin(a) * 190 * r, ty = 205 - Math.cos(a) * 200 * r;
          for (let k = 0; k < n && i < 120; k++, i++) {
            strand(400 - (i / 119) * 380, tx + (rnd() - 0.5) * 18, ty + (rnd() - 0.5) * 18, f > 0.22 ? '#2F8A5A' : '#5E5A30', f > 0.22 ? '#5CC28C' : '#8E8B4A', 1.2);
          }
          if (rnd() < 0.5) i++;
        }
      }
      // thin quill
      x.strokeStyle = '#B9B07A';
      for (let y = 505; y > 250; y -= 4) {
        x.lineWidth = 1.6 + (y - 250) / 255 * 3.4;
        x.beginPath(); x.moveTo(qx(y), y); x.lineTo(qx(y - 5), y - 5); x.stroke();
      }
      const E = (rx, ry, dx, dy, col) => { x.fillStyle = col; x.beginPath(); x.ellipse(256 + dx, 200 + dy, rx, ry, 0, 0, TAU); x.fill(); };
      E(77, 91, 0, 3, '#3DAE67');  // green halo
      E(69, 82, 0, 2, '#2DB59C');  // teal
      E(62, 74, 0, 0, '#3E6FDB');   // thin blue edge
      E(58, 69, 2, 2, '#B57B4F');   // copper oval
      x.strokeStyle = '#9C653F'; x.lineWidth = 1.2; // fine grain in the copper
      for (let i = 0; i < 80; i++) { const a = (i / 80) * TAU; x.beginPath(); x.moveTo(258 + Math.cos(a) * 40, 206 + Math.sin(a) * 46); x.lineTo(258 + Math.cos(a) * 57, 203 + Math.sin(a) * 67); x.stroke(); }
      E(37, 35, 8, 18, '#43A8EE'); // sky-blue ring, sitting low in the copper
      E(28, 26, 9, 18, '#0F2272'); // navy heart
      x.strokeStyle = '#2C52C8'; x.lineWidth = 3;
      x.beginPath(); x.ellipse(265, 218, 21, 19, 0, Math.PI * 1.05, Math.PI * 1.6); x.stroke();
    },
    function om(x) {
      x.fillStyle = GOLD; x.strokeStyle = GOLD;
      x.font = '400 330px "Tiro Devanagari Sanskrit", serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('ॐ', 256, 290);
      // a lotus of twenty-four petals around it, between two rings
      x.lineWidth = 2; x.beginPath(); x.arc(256, 256, 190, 0, TAU); x.stroke();
      x.lineWidth = 2.4;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU;
        x.beginPath(); x.moveTo(...P(256, 256, a, 192));
        x.quadraticCurveTo(...P(256, 256, a - 0.14, 212), ...P(256, 256, a, 230));
        x.quadraticCurveTo(...P(256, 256, a + 0.14, 212), ...P(256, 256, a, 192)); x.stroke();
      }
      x.lineWidth = 3; x.beginPath(); x.arc(256, 256, 244, 0, TAU); x.stroke();
      x.fillStyle = CORAL;
      for (let i = 0; i < 24; i++) { x.beginPath(); x.arc(...P(256, 256, ((i + 0.5) / 24) * TAU, 226), 3, 0, TAU); x.fill(); }
    }
  ];

  // positions + colours, about 60% from outlines and 40% from fills
  function sample(draw, n) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d');
    draw(x);
    const d = x.getImageData(0, 0, 512, 512).data;
    const on = (px, py) => px >= 0 && py >= 0 && px < 512 && py < 512 && d[(py * 512 + px) * 4 + 3] > 128;
    const step = (p, q) => { const i = (p[1] * 512 + p[0]) * 4, j = (q[1] * 512 + q[0]) * 4; return Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]) > 90; };
    const edge = [], fill = [];
    for (let py = 0; py < 512; py += 2) for (let px = 0; px < 512; px += 2) {
      if (!on(px, py)) continue;
      (on(px - 3, py) && on(px + 3, py) && on(px, py - 3) && on(px, py + 3) && !step([px, py], [px + 3, py]) && !step([px, py], [px, py + 3]) ? fill : edge).push(px, py);
    }
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const src = (Math.random() < 0.6 && edge.length) || !fill.length ? edge : fill;
      const k = Math.floor(Math.random() * (src.length / 2)) * 2;
      const px = src[k], py = src[k + 1], o = (py * 512 + px) * 4;
      pos[i * 3] = (px / 512 - 0.5) * 2 + (Math.random() - 0.5) * 0.006;
      pos[i * 3 + 1] = -(py / 512 - 0.5) * 2 + (Math.random() - 0.5) * 0.006;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      col[i * 3] = d[o] / 255; col[i * 3 + 1] = d[o + 1] / 255; col[i * 3 + 2] = d[o + 2] / 255;
    }
    return { pos, col };
  }

  const VS = `
attribute vec3 p0; attribute vec3 p1; attribute vec3 p2; attribute vec3 p3;
attribute vec3 c0; attribute vec3 c1; attribute vec3 c2; attribute vec3 c3;
attribute float seed;
uniform float uStage, uTime, uSize, uPx, uSpin;
varying vec3 vC; varying float vA;
float ease(float t){ t=clamp(t,0.,1.); return t*t*(3.-2.*t); }
vec2 rot(vec2 v, float a){ float s=sin(a), c=cos(a); return vec2(c*v.x-s*v.y, s*v.x+c*v.y); }
void main(){
  vec3 q1 = vec3(rot(p1.xy, uSpin), p1.z);           // the wheel keeps turning, slowly
  float seg = min(floor(uStage), 2.);
  float t = clamp((uStage - seg - seed * .35) / .65, 0., 1.);
  vec3 a = seg < .5 ? p0 : seg < 1.5 ? q1 : p2;
  vec3 b = seg < .5 ? q1 : seg < 1.5 ? p2 : p3;
  vec3 ca = seg < .5 ? c0 : seg < 1.5 ? c1 : c2;
  vec3 cb = seg < .5 ? c1 : seg < 1.5 ? c2 : c3;
  float e = ease(t), travel = sin(t * 3.14159);
  vec3 p = mix(a, b, e);
  // swirl outward and around while in flight, then settle exactly on the form
  p.xy = rot(p.xy, travel * (seed - .5) * 2.4) * (1. + travel * .28);
  p += vec3(sin(uTime*.7 + seed*40.), cos(uTime*.6 + seed*31.), sin(uTime*.5 + seed*17.)) * (.004 + travel * .06);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPx * (.5 + seed * .9) / -mv.z;
  vC = mix(ca, cb, e);
  vA = (.55 + .45 * fract(seed * 7.13)) * (.7 + .3 * sin(uTime * (1.5 + seed * 3.) + seed * 60.));
}`;
  const FS = `
varying vec3 vC; varying float vA;
void main(){
  float d = length(gl_PointCoord - .5);
  float a = smoothstep(.5, .1, d);
  gl_FragColor = vec4(vC * (1.25 + .6 * smoothstep(.22, .0, d)), a * vA);
}`;

  function init(sectionSel, onActive) {
    const sec = document.querySelector(sectionSel);
    if (!sec || !window.THREE) return;
    const canvas = sec.querySelector('canvas');
    const caps = Array.from(sec.querySelectorAll('[data-form]'));
    const N = innerWidth < 700 ? 8000 : 24000;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    cam.position.z = 4.2;

    const geo = new THREE.BufferGeometry();
    const seeds = new Float32Array(N);
    for (let i = 0; i < N; i++) seeds[i] = Math.random();
    geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uStage: { value: REDUCED ? 3 : 0 }, uTime: { value: 0 }, uSize: { value: 10.5 }, uPx: { value: renderer.getPixelRatio() }, uSpin: { value: 0 } }
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    // ॐ needs the Devanagari font loaded before it is sampled
    const ready = document.fonts ? document.fonts.load('400 400px "Tiro Devanagari Sanskrit"', 'ॐ') : Promise.resolve();
    ready.catch(() => {}).then(() => {
      FORMS.forEach((f, i) => {
        const s = sample(f, N);
        geo.setAttribute('p' + i, new THREE.BufferAttribute(s.pos, 3));
        geo.setAttribute('c' + i, new THREE.BufferAttribute(s.col, 3));
      });
      geo.setAttribute('position', geo.getAttribute('p0'));
      resize();
      active = true;
    });

    function resize() {
      // on phones the canvas sits above the lesson, so it is sized by the tallest lesson
      sec.style.setProperty('--capH', Math.max(...caps.map((c) => c.offsetHeight)) + 'px');
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.position.z = w / h < 0.8 ? 5.6 : 4.2; // pull back on phones so the forms fit
      cam.updateProjectionMatrix();
    }
    addEventListener('resize', resize);
    if (document.fonts) document.fonts.ready.then(resize); // lesson text reflows once its fonts land

    let active = false, target = mat.uniforms.uStage.value;
    const mouse = { x: 0, y: 0 };
    addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });

    const setCaption = (s) => {
      const i = Math.min(3, Math.round(s));
      caps.forEach((c, k) => c.classList.toggle('on', k === i));
    };
    setCaption(target);

    if (!REDUCED) {
      ScrollTrigger.create({
        trigger: sec, start: 'top top', end: '+=300%', pin: true, scrub: true,
        onUpdate: (self) => {
          // hold each form for half its stretch of scroll, morph in the other half
          const s = self.progress * 3, seg = Math.min(Math.floor(s), 2), l = s - seg;
          target = seg + (l < 0.25 ? 0 : l > 0.75 ? 1 : (l - 0.25) * 2);
        },
        onToggle: (self) => { onActive && onActive(self.isActive); }
      });
    }

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!active || document.hidden) return;
      const r = sec.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return; // off screen: skip the GPU work
      const u = mat.uniforms;
      if (!REDUCED) { u.uTime.value += dt; u.uSpin.value += dt * 0.18; }
      u.uStage.value += (target - u.uStage.value) * 0.08;
      setCaption(u.uStage.value); // caption follows the particles, not the scrollbar
      pts.rotation.y += ((mouse.x * 0.5) - pts.rotation.y) * 0.05;
      pts.rotation.x += ((mouse.y * 0.3) - pts.rotation.x) * 0.05;
      renderer.render(scene, cam);
    });
  }

  window.SakhaForms = { init, FORMS };
})();
