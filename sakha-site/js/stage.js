/* Sakha stage: one WebGL plane that paints the current scene.
   Paintings breathe (flow warp), follow the pointer (parallax), throw light (god rays),
   and dissolve into gold embers when the scene changes. */
(function () {
  'use strict';

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // focus / light are in image space (0..1, y down). "pf" is the focus on portrait screens.
  const SCENES = {
    hero:       { src: 'img/halo.webp',         f: [0.5, 0.5],  pf: [0.5, 0.5],   light: [0.5, 0.4],   ray: 0.12, zoom: 0.74 },
    deity:      { src: 'img/halo-krishna.webp', f: [0.5, 0.4],  pf: [0.5, 0.4],   light: [0.5, 0.3],   ray: 0.1 },
    krishna:    { src: 'img/krishna-hero.webp', f: [0.6, 0.5],  pf: [0.79, 0.42], light: [0.78, 0.30], ray: 0.18 },
    chariot:    { src: 'img/chariot.webp',      f: [0.56, 0.5], pf: [0.7, 0.5],   light: [0.12, 0.3],  ray: 0.3 },
    vishvarupa: { src: 'img/vishvarupa.webp',   f: [0.5, 0.42], pf: [0.5, 0.42],  light: [0.5, 0.25],  ray: 0.22 },
    meera:      { src: 'img/meera.webp',        f: [0.45, 0.5], pf: [0.43, 0.5],  light: [0.63, 0.88], ray: 0.15 },
    hanuman:    { src: 'img/hanuman.webp',      f: [0.5, 0.4],  pf: [0.45, 0.5],  light: [0.72, 0.3],  ray: 0.25 },
    prahlad:    { src: 'img/prahlad.webp',      f: [0.5, 0.5],  pf: [0.5, 0.55],  light: [0.5, 0.6],   ray: 0.15 },
    diya:       { src: 'img/diya.webp',         f: [0.6, 0.5],  pf: [0.64, 0.5],  light: [0.64, 0.38], ray: 0.2 },
    // Meera's story, one painting per line, fetched when the story starts
    m01: { src: 'img/meera/01.webp', f: [0.6, 0.42],  pf: [0.6, 0.5],  light: [0.18, 0.15], ray: 0.12, lazy: true },
    m02: { src: 'img/meera/02.webp', f: [0.5, 0.42],  pf: [0.4, 0.5],  light: [0.75, 0.4],  ray: 0.12, lazy: true },
    m03: { src: 'img/meera/03.webp', f: [0.45, 0.42], pf: [0.35, 0.5], light: [0.5, 0.2],   ray: 0.1,  lazy: true },
    m04: { src: 'img/meera/04.webp', f: [0.55, 0.42], pf: [0.85, 0.5], light: [0.9, 0.5],   ray: 0.1,  lazy: true },
    m05: { src: 'img/meera/05.webp', f: [0.5, 0.42],  pf: [0.5, 0.5],  light: [0.55, 0.2],  ray: 0.1,  lazy: true },
    m06: { src: 'img/meera/06.webp', f: [0.5, 0.42],  pf: [0.35, 0.5], light: [0.8, 0.3],   ray: 0.1,  lazy: true },
    m07: { src: 'img/meera/07.webp', f: [0.5, 0.42],  pf: [0.5, 0.5],  light: [0.92, 0.7],  ray: 0.12, lazy: true },
    m08: { src: 'img/meera/08.webp', f: [0.5, 0.42],  pf: [0.5, 0.5],  light: [0.5, 0.3],   ray: 0.1,  lazy: true },
    // the five-minute narrated telling adds these
    mx01: { src: 'img/meera/x01.webp', f: [0.4, 0.42],  pf: [0.2, 0.5], light: [0.65, 0.3],  ray: 0.12, lazy: true },
    mx02: { src: 'img/meera/x02.webp', f: [0.4, 0.42],  pf: [0.4, 0.5], light: [0.8, 0.2],   ray: 0.1,  lazy: true },
    mx03: { src: 'img/meera/x03.webp', f: [0.45, 0.42], pf: [0.3, 0.5], light: [0.85, 0.2],  ray: 0.1,  lazy: true },
    mx04: { src: 'img/meera/x04.webp', f: [0.4, 0.42],  pf: [0.4, 0.5], light: [0.85, 0.3],  ray: 0.1,  lazy: true },
    mx05: { src: 'img/meera/x05.webp', f: [0.45, 0.42], pf: [0.45, 0.5], light: [0.5, 0.2],  ray: 0.1,  lazy: true },
    mx06: { src: 'img/meera/x06.webp', f: [0.5, 0.42],  pf: [0.4, 0.5], light: [0.85, 0.1],  ray: 0.1,  lazy: true },
    mx07: { src: 'img/meera/x07.webp', f: [0.5, 0.42],  pf: [0.5, 0.5], light: [0.4, 0.4],   ray: 0.1,  lazy: true },
    mx08: { src: 'img/meera/x08.webp', f: [0.5, 0.42],  pf: [0.6, 0.5], light: [0.85, 0.1],  ray: 0.1,  lazy: true },
    mx09: { src: 'img/meera/x09.webp', f: [0.4, 0.42],  pf: [0.35, 0.5], light: [0.85, 0.3], ray: 0.12, lazy: true },
    mx10: { src: 'img/meera/x10.webp', f: [0.55, 0.42], pf: [0.75, 0.5], light: [0.2, 0.6],  ray: 0.12, lazy: true },
    mx11: { src: 'img/meera/x11.webp', f: [0.58, 0.42], pf: [0.62, 0.5], light: [0.85, 0.3], ray: 0.1,  lazy: true },
    mx12: { src: 'img/meera/x12.webp', f: [0.5, 0.42],  pf: [0.2, 0.5],  light: [0.85, 0.4], ray: 0.15, lazy: true },
    mx13: { src: 'img/meera/x13.webp', f: [0.45, 0.42], pf: [0.5, 0.5],  light: [0.12, 0.2], ray: 0.1,  lazy: true },
    mx14: { src: 'img/meera/x14.webp', f: [0.5, 0.42],  pf: [0.5, 0.5],  light: [0.5, 0.2],  ray: 0.12, lazy: true },
    mx15: { src: 'img/meera/x15.webp', f: [0.5, 0.42],  pf: [0.6, 0.5],  light: [0.6, 0.15], ray: 0.12, lazy: true }
  };
  // the other narrated stories' paintings (a01–a15, h01–h17, p01–p19), loaded when their story plays
  [['a', 'arjuna', 15], ['h', 'hanuman', 17], ['p', 'prahlad', 19], ['s', 'sudama', 17], ['k', 'karna', 17], ['d', 'dhruva', 17], ['v', 'savitri', 18], ['r', 'valmiki', 18], ['b', 'shabari', 15], ['g', 'ganesha', 15], ['t', 'ashtavakra', 15], ['l', 'rama', 17], ['y', 'hima', 15]].forEach(([p, dir, n]) => {
    for (let i = 1; i <= n; i++) {
      const nn = String(i).padStart(2, '0');
      SCENES[p + nn] = { src: 'img/' + dir + '/' + nn + '.webp', f: [0.5, 0.42], pf: [0.5, 0.5], light: [0.5, 0.2], ray: 0.1, lazy: true };
    }
  });
  SCENES.h13.f = [0.5, 0]; // giant Hanuman's head touches the top edge of the painting

  const VS = `attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;

  const FS = `
precision highp float;
varying vec2 v;
uniform sampler2D uA,uB;
uniform vec2 uRes,uSA,uSB,uFA,uFB,uLA,uLB,uMouse;
uniform float uP,uT,uZA,uZB,uRA,uRB,uDim,uWarp,uFit,uFitY,uFitW,uLamp;
uniform vec4 uTap[4]; // x, y (screen, y down), age in seconds, strength

float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p*=2.02;a*=.5;}return s;}

// screen uv -> image uv for an object-fit: cover crop around focus f, zoomed by z
void crop(vec2 size,vec2 f,float z,out vec2 off,out vec2 s){
  float ra=uRes.x/uRes.y, ri=size.x/size.y;
  s = ra>ri ? vec2(1.,ri/ra) : vec2(ra/ri,1.);
  s/=z;
  // zoom below 1 shows the whole painting with black around it, so the window may be larger than the image
  vec2 lo=min(vec2(0.),vec2(1.)-s), hi=max(vec2(0.),vec2(1.)-s);
  off=clamp(f-s*.5,lo,hi);
}

// the painting's own cover crop, softly blurred and darkened: the backdrop around a framed story painting
vec3 haze(sampler2D t,vec2 uv,vec2 size,vec2 f){
  vec2 off,s; crop(size,f,1.,off,s);
  vec3 b=vec3(0.);
  for(int i=0;i<16;i++){
    float a=float(i)*2.39996, r=.012+.05*sqrt(float(i)/16.);
    b+=texture2D(t,off+clamp(uv+vec2(cos(a),sin(a))*r,0.,1.)*s).rgb;
  }
  return b/16.*.5;
}

vec3 paint(sampler2D t,vec2 uv,vec2 size,vec2 f,float z,vec2 L,float ray,float depth){
  vec2 off,s; crop(size,f,z,off,s);
  if(uFit>0.){
    // a story on a phone: most of the painting's width (uFitW), in a band above the captions
    vec2 sf=vec2(uFitW,uFitW*s.y/s.x)/z;
    vec2 of=vec2(clamp(f.x-sf.x*.5,0.,1.-sf.x),.5-uFitY*sf.y);
    s=mix(s,sf,uFit); off=mix(off,of,uFit);
  }
  vec2 par=(uMouse-.5)*.014*depth;
  vec2 w=(vec2(fbm(uv*2.4+uT*.035),fbm(uv*2.4+vec2(9.1,3.7)-uT*.03))-.5)*uWarp;
  vec2 q=off+(uv+par+w)*s;
  // feather the edges so a zoomed-out painting melts into the black instead of showing its rectangle
  float fy=mix(.04,.12,uFit); // a framed story painting melts into its haze over a softer edge
  float m=smoothstep(0.,.04,q.x)*smoothstep(1.,.96,q.x)*smoothstep(0.,fy,q.y)*smoothstep(1.,1.-fy,q.y);
  vec3 c=texture2D(t,q).rgb*m;
  if(uFit>0.) c+=haze(t,uv,size,f)*(1.-m)*uFit;
  // god rays: march from this pixel toward the light, collecting bright paint
  vec2 Ls=(L-off)/s;
  vec2 d=(Ls-uv)/14.;
  vec2 u=uv; float wgt=1.; vec3 acc=vec3(0.);
  for(int i=0;i<14;i++){u+=d; vec3 sc=texture2D(t,off+clamp(u+par,0.,1.)*s).rgb; acc+=max(sc-.55,0.)*wgt; wgt*=.9;}
  float pulse=.85+.15*sin(uT*.6);
  c+=acc*ray*.22*pulse*vec3(1.,.86,.62);
  return c;
}

void main(){
  vec2 uv=v; uv.y=1.-uv.y;               // image space, y down
  float asp=uRes.x/uRes.y;
  // ripples where the viewer touched the painting or let their words fall into it: the ink bends like water
  float ring=0.;
  for(int i=0;i<4;i++){
    vec4 T=uTap[i];
    if(T.z>3.) continue;
    vec2 tp=(uv-T.xy)*vec2(asp,1.);
    float dd=length(tp), r=T.z*.36, fade=(1.-T.z/3.)*T.w;
    float wv=sin((dd-r)*70.)*exp(-pow((dd-r)*8.,2.))*fade;
    uv+=tp/max(dd,1e-4)/vec2(asp,1.)*wv*.007;
    ring+=exp(-pow((dd-r)*34.,2.))*fade;
  }
  float zb=uZB*(1.+.10*(1.-uP));
  vec3 a=paint(uA,uv,uSA,uFA,uZA,uLA,uRA,1.);
  vec3 c=a;
  if(uP>0.){
    vec3 b=paint(uB,uv,uSB,uFB,zb,uLB,uRB,1.25);
    float d=fbm(uv*vec2(asp,1.)*2.2+3.);
    float e=uP*1.35-.18;
    float m=1.-smoothstep(e-.12,e,d);
    float burn=smoothstep(.07,0.,abs(d-e+.03))*sin(3.14159*uP);
    c=mix(a,b,m);
    c+=vec3(1.,.72,.32)*burn*2.2;
    c+=vec3(1.,.8,.5)*pow(burn,3.)*1.5;
  }
  c+=vec3(1.,.72,.32)*ring*.22;
  // a lamp follows the pointer and warms the ink beneath it
  vec2 lp=(uv-uMouse)*vec2(asp,1.);
  c*=1.+uLamp*.45*exp(-dot(lp,lp)*18.);
  // vignette + dim + grain
  vec2 vc=(v-.5)*vec2(uRes.x/uRes.y,1.);
  float vig=smoothstep(1.25,.25,length(vc));
  c*=mix(.42,1.,vig);
  c*=1.-uDim;
  c=c/(1.+c*.12);                         // soft shoulder so highlights glow, not clip
  float g=h(v*uRes+fract(uT*13.)*91.)-.5;
  c+=g*.055;
  gl_FragColor=vec4(c,1.);
}`;

  function Stage(canvas) {
    this.c = canvas;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    this.gl = gl;
    this.ok = !!gl;
    this.tex = {};
    this.sizes = {};
    this.state = { p: 0, zA: 1.04, zB: 1.04, dim: 0, warp: REDUCED ? 0 : 0.006, sz: 1, fit: 0 };
    this.storyOn = false;
    // scroll-driven push lives apart from the drift tween, so the two never fight over the same value
    this.szT = 1;
    this.mouse = [0.5, 0.5];
    this.mouseT = [0.5, 0.5];
    this.taps = []; this.tapBuf = new Float32Array(16);
    this.hover = false; this.lamp = 0;
    this.cur = null;
    this.next = null;
    this.t0 = performance.now();
    this.running = false;
    if (!this.ok) return;
    this._program();
    this._resize = this.resize.bind(this);
    addEventListener('resize', this._resize);
    addEventListener('pointermove', (e) => { this.mouseT = [e.clientX / innerWidth, e.clientY / innerHeight]; this.hover = e.pointerType === 'mouse'; }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { this.hover = false; });
    this.resize();
  }

  Stage.prototype._program = function () {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    ['uA', 'uB', 'uRes', 'uSA', 'uSB', 'uFA', 'uFB', 'uLA', 'uLB', 'uMouse', 'uP', 'uT', 'uZA', 'uZB', 'uRA', 'uRB', 'uDim', 'uWarp', 'uFit', 'uFitY', 'uFitW', 'uLamp', 'uTap']
      .forEach((k) => { this.u[k] = gl.getUniformLocation(pr, k); });
    gl.uniform1i(this.u.uA, 0);
    gl.uniform1i(this.u.uB, 1);
  };

  Stage.prototype.resize = function () {
    // cap pixel ratio: the paintings are 1536px, more pixels only cost frames
    const dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 900 ? 2 : 1.5);
    this.c.width = Math.round(innerWidth * dpr);
    this.c.height = Math.round(innerHeight * dpr);
    if (this.ok) this.gl.viewport(0, 0, this.c.width, this.c.height);
  };

  // Load paintings (all but the lazy story frames by default); onProgress(0..1)
  Stage.prototype.load = function (onProgress, only) {
    const keys = only || Object.keys(SCENES).filter((k) => !SCENES[k].lazy);
    let done = 0;
    return Promise.all(keys.map((k) => new Promise((res) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (this.ok) {
          const gl = this.gl;
          const t = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
          this.tex[k] = t;
        }
        this.sizes[k] = [img.naturalWidth, img.naturalHeight];
        done++; onProgress && onProgress(done / keys.length);
        res();
      };
      img.onerror = () => { done++; onProgress && onProgress(done / keys.length); res(); };
      img.src = SCENES[k].src + '?v=ink2'; // new art under old names: bust the cache
    })));
  };

  // the page's own paintings, fetched in the background after the gate opens
  Stage.prototype.preload = function () { return this.ensure(Object.keys(SCENES).filter((k) => !SCENES[k].lazy)); };

  // Fetch story frames just before a story plays
  Stage.prototype.ensure = function (keys) {
    // one fetch per frame, however many callers ask for it at once
    this.inflight = this.inflight || {};
    return Promise.all(keys.filter((k) => SCENES[k] && !this.sizes[k]).map((k) => this.inflight[k] || (this.inflight[k] = this.load(null, [k]))));
  };

  Stage.prototype.portrait = function () { return innerWidth / innerHeight < 0.9; };

  Stage.prototype.cfg = function (k) {
    const s = SCENES[k];
    const f = this.portrait() ? s.pf : s.f;
    return { k, f, light: s.light, ray: s.ray, zoom: s.zoom || 1, size: this.sizes[k] || [1536, 864] };
  };

  // Jump without a transition
  Stage.prototype.set = function (k) {
    if (!SCENES[k]) return;
    this.cur = k; this.next = null; this.state.p = 0;
    if (this._tw) this._tw.kill();
  };

  // Dissolve to a scene. opts: {dur, zoomFrom, zoomTo, drift}
  Stage.prototype.go = function (k, opts) {
    opts = opts || {};
    if (!SCENES[k] || !this.ok) return;
    // not fetched yet (a slow line): hold the current painting until it lands, unless something newer was asked for
    this.want = k;
    if (!this.sizes[k]) { this.ensure([k]).then(() => { if (this.want === k) this.go(k, opts); }); return; }
    if (this.cur === k && !this.next) { if (opts.zoomTo) this.zoom(opts.zoomTo, opts.drift || 8); return; }
    if (this.next === k) return;
    if (this._tw) { this._tw.progress(1); }
    if (REDUCED || !this.cur) { this.set(k); this.state.zA = opts.zoomTo || 1.04; return; }
    this.next = k;
    this.state.zB = opts.zoomFrom || 1.04;
    const st = this.state;
    this._tw = gsap.to(st, {
      p: 1, duration: opts.dur || 2.2, ease: 'power2.inOut',
      onComplete: () => {
        this.cur = this.next; this.next = null; st.p = 0; st.zA = st.zB; this._tw = null;
        if (opts.zoomTo) this.zoom(opts.zoomTo, opts.drift || 10);
      }
    });
    if (opts.zoomTo) gsap.to(st, { zB: opts.zoomTo, duration: (opts.dur || 2.2) + (opts.drift || 10), ease: 'none' });
  };

  Stage.prototype.zoom = function (z, dur) {
    if (REDUCED) { this.state.zA = z; return; }
    gsap.to(this.state, { zA: z, duration: dur || 8, ease: 'sine.inOut', overwrite: 'auto' });
  };

  // a ripple out from a point on screen (px); the newest four run at once
  Stage.prototype.ripple = function (x, y, w) {
    if (REDUCED) return;
    this.taps.push({ x: x / innerWidth, y: y / innerHeight, t: performance.now(), w: w || 1 });
    if (this.taps.length > 4) this.taps.shift();
  };

  Stage.prototype.src = function (k) { return SCENES[k] && SCENES[k].src + '?v=ink2'; };

  Stage.prototype.dim = function (d, dur) {
    gsap.to(this.state, { dim: d, duration: dur == null ? 1.2 : dur, ease: 'power2.out', overwrite: 'auto' });
  };

  Stage.prototype.start = function () {
    if (!this.ok || this.running) return;
    this.running = true;
    const gl = this.gl, u = this.u, st = this.state;
    const frame = (now) => {
      if (!this.running) return;
      requestAnimationFrame(frame);
      if (document.hidden || !this.cur || !this.tex[this.cur]) return;
      const t = REDUCED ? 0 : (now - this.t0) / 1000;
      this.mouse[0] += (this.mouseT[0] - this.mouse[0]) * 0.04;
      this.mouse[1] += (this.mouseT[1] - this.mouse[1]) * 0.04;
      const A = this.cfg(this.cur);
      const B = this.cfg(this.next || this.cur);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex[A.k]);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tex[B.k]);
      gl.uniform2f(u.uRes, this.c.width, this.c.height);
      gl.uniform2f(u.uSA, A.size[0], A.size[1]); gl.uniform2f(u.uSB, B.size[0], B.size[1]);
      gl.uniform2f(u.uFA, A.f[0], A.f[1]); gl.uniform2f(u.uFB, B.f[0], B.f[1]);
      gl.uniform2f(u.uLA, A.light[0], A.light[1]); gl.uniform2f(u.uLB, B.light[0], B.light[1]);
      gl.uniform1f(u.uRA, A.ray); gl.uniform1f(u.uRB, B.ray);
      gl.uniform2f(u.uMouse, REDUCED ? 0.5 : this.mouse[0], REDUCED ? 0.5 : this.mouse[1]);
      gl.uniform1f(u.uP, this.next ? st.p : 0);
      gl.uniform1f(u.uT, t);
      st.sz += (this.szT - st.sz) * 0.05;
      gl.uniform1f(u.uZA, st.zA * st.sz * A.zoom); gl.uniform1f(u.uZB, st.zB * st.sz * B.zoom);
      gl.uniform1f(u.uDim, st.dim);
      gl.uniform1f(u.uWarp, st.warp);
      for (let i = 0; i < 4; i++) {
        const tp = this.taps[i];
        this.tapBuf.set(tp ? [tp.x, tp.y, (now - tp.t) / 1000, tp.w] : [0, 0, 9, 0], i * 4);
      }
      gl.uniform4fv(u.uTap, this.tapBuf);
      // the lamp shows only for a mouse, and stays out of the way while a story plays
      this.lamp += ((this.hover && !this.storyOn && !REDUCED ? 1 : 0) - this.lamp) * 0.05;
      gl.uniform1f(u.uLamp, this.lamp);
      // story paintings on a portrait screen ease into their framed band
      st.fit += ((this.storyOn && this.portrait() ? 1 : 0) - st.fit) * (REDUCED ? 1 : 0.06);
      gl.uniform1f(u.uFit, st.fit < 0.002 ? 0 : st.fit);
      // the band's centre: a third of the way down, or higher on a short phone so the captions (about 290px) clear it
      // at least two-thirds of the width; more on a tablet, so the band never takes over half the screen
      const fitW = Math.min(1, Math.max(0.66, innerWidth * 0.5625 / (0.55 * innerHeight)));
      const band = innerWidth / fitW * 0.5625;
      gl.uniform1f(u.uFitW, fitW);
      gl.uniform1f(u.uFitY, Math.min(0.36, (innerHeight - 290 - band / 2) / innerHeight));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    requestAnimationFrame(frame);
  };

  /* Gold dust: a few hundred motes drifting up, brighter near the pointer */
  function Dust(canvas) {
    this.c = canvas; this.x = canvas.getContext('2d');
    this.n = innerWidth < 700 ? 70 : 140;
    this.amount = 1;
    this.p = [];
    this.petals = [];
    this.pull = null;
    this.resize();
    addEventListener('resize', () => this.resize());
    for (let i = 0; i < this.n; i++) this.p.push(this._mote(true));
  }
  Dust.prototype.resize = function () {
    const d = Math.min(devicePixelRatio || 1, 1.5);
    this.d = d; this.c.width = innerWidth * d; this.c.height = innerHeight * d;
  };
  Dust.prototype._mote = function (any) {
    return {
      x: Math.random() * innerWidth,
      y: any ? Math.random() * innerHeight : innerHeight + 10,
      r: Math.random() * 1.6 + 0.3,
      vy: -(Math.random() * 0.25 + 0.06),
      vx: (Math.random() - 0.5) * 0.12,
      a: Math.random() * 0.6 + 0.15,
      ph: Math.random() * 6.28
    };
  };
  Dust.prototype.start = function () {
    if (REDUCED) return;
    const x = this.x;
    const tick = (now) => {
      requestAnimationFrame(tick);
      if (document.hidden) return;
      x.setTransform(this.d, 0, 0, this.d, 0, 0);
      x.clearRect(0, 0, innerWidth, innerHeight);
      x.globalCompositeOperation = 'lighter';
      const g = this.pull && now < this.pull.until ? this.pull : null;
      for (const m of this.p) {
        m.x += m.vx + Math.sin(now / 1800 + m.ph) * 0.12; m.y += m.vy;
        if (g) { m.x += (g.x - m.x) * 0.018 * m.a; m.y += (g.y - m.y) * 0.018 * m.a; }
        if (m.y < -10) Object.assign(m, this._mote(false));
        const tw = 0.55 + 0.45 * Math.sin(now / 700 + m.ph * 3);
        x.globalAlpha = m.a * tw * this.amount;
        x.fillStyle = '#F7D58C';
        x.beginPath(); x.arc(m.x, m.y, m.r, 0, 6.283); x.fill();
      }
      if (this.petals.length) {
        x.globalCompositeOperation = 'source-over';
        this.petals = this.petals.filter((q) => (q.life -= 1 / 150) > 0);
        for (const q of this.petals) {
          q.vx *= 0.97; q.vy = q.vy * 0.97 + 0.045; q.x += q.vx + Math.sin(now / 400 + q.ph) * 0.5; q.y += q.vy; q.rot += q.spin;
          x.globalAlpha = Math.min(1, q.life * 2.5);
          x.save(); x.translate(q.x, q.y); x.rotate(q.rot); x.scale(Math.cos(now / 300 + q.ph), 1); // the flip of a falling petal
          x.fillStyle = q.c; x.beginPath(); x.ellipse(0, 0, q.r, q.r * 0.55, 0, 0, 6.283); x.fill();
          x.restore();
        }
      }
    };
    requestAnimationFrame(tick);
  };

  Dust.prototype.burst = function (cx, cy) {
    if (REDUCED) return;
    const C = ['#F2A23A', '#E8862A', '#E46A4E', '#F7D58C'];
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * 6.283, v = Math.random() * 4 + 1.5;
      this.petals.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: Math.random() * 5 + 5, rot: a, spin: (Math.random() - 0.5) * 0.12, ph: Math.random() * 6.28, life: 1, c: C[i % 4] });
    }
    if (this.petals.length > 120) this.petals.splice(0, this.petals.length - 120);
  };
  Dust.prototype.gather = function (gx, gy) { this.pull = { x: gx, y: gy, until: performance.now() + 1600 }; };

  window.SakhaStage = Stage;
  window.SakhaDust = Dust;
  window.SAKHA_SCENES = SCENES;
})();
