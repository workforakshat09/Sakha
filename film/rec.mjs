// Records the real Sakha site, frame by frame, as a phone sees it. Each clip is a folder of frames.
// The page's clock is replaced (film/tools/rec/clock.js), so motion is perfectly even.
// Audio is blocked: stories then run on the page's own timer, which the recording clock drives.
//   node film/rec.mjs [clip ...]      needs the site on http://127.0.0.1:5178
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { launch } from './tools/cdp.mjs';

const CLOCK = fs.readFileSync(new URL('./tools/rec/clock.js', import.meta.url), 'utf8');
const SITE = 'http://127.0.0.1:5178/';
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), 'clips');
const fps = 30;

// type a line into a textarea, a few characters per frame
const typeInto = (sel, text, t, t0, cps = 20) => {
  const n = Math.max(0, Math.min(text.length, Math.floor((t - t0) * cps)));
  return `{const e=document.querySelector('${sel}');const v=${JSON.stringify(text)}.slice(0,${n});if(e.value!==v){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));}}`;
};
const once = (key, js) => `if(!window.__did_${key}){window.__did_${key}=1;${js}}`;
const enter = `document.querySelector('[data-enter="quiet"]').click();`;

const LINE = 'I feel stuck. I don’t know what to do with my life.';
const CLIPS = {
  // the whole conversation: the hero, typing, Sakha's reply, the story it plays, and the verse after it
  talk: { secs: 40, frame: (t) => [
    t >= 0 && once('enter', enter),
    t >= 1.6 && typeInto('#heroInput', LINE, t, 1.6, 21),
    t >= 4.4 && once('send', `document.querySelector('#heroAsk').requestSubmit();`),
    // then follow the conversation as a person would: answer Sakha's question, take the story, skip to the verse
    t >= 4.4 && `{const W=window,now=performance.now(),btn=(re)=>[...document.querySelectorAll('#chatLog button')].find(b=>re.test(b.textContent)&&!b.disabled);
      const after=(key,ok,ms,go)=>{if(!ok||W['__'+key])return;W['__s'+key]=W['__s'+key]||now;if(now-W['__s'+key]>ms){W['__'+key]=1;go();}};
      const chip=btn(/Scared of choosing wrong/);after('chip',chip,1300,()=>chip.click());
      const show=btn(/Show me/);after('show',show,1500,()=>show.click());
      const pl=document.querySelector('#player');after('skip',pl&&!pl.hidden,9000,()=>document.querySelector('#playerSkip').click());}`,
  ].filter(Boolean).join('') },
  // the shelf of stories: a volume lifted off and opened like a book
  shelf: { secs: 7.5, frame: (t) => [
    t >= 0 && once('enter', enter),
    t >= 0.2 && once('go', `document.querySelector('.ch--stories').scrollIntoView();window.scrollBy(0,-40);`),
    t >= 2.2 && once('open', `document.querySelector('.book[data-id="arjuna"]').click();`),
  ].filter(Boolean).join('') },
};

async function record(name, c) {
  const dir = path.join(OUT, name);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const b = await launch({ width: 390, height: 844, gpu: true, port: 9381, args: ['--autoplay-policy=user-gesture-required'] });
  await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await b.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await b.block(['*.mp3']);
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: CLOCK });
  await b.goto(SITE, 1500);
  // real-time loading: fonts and the gate's own load count; the page's clock has not moved yet
  await b.eval(`(async()=>{for(let i=0;i<120;i++){if(document.fonts.status==='loaded'&&document.readyState==='complete'&&/100/.test(document.querySelector('#gatePct').textContent))return;
    await window.__clock.wait(150);window.__clock.step(150);}})()`);
  const dt = 1000 / fps, frames = Math.round(c.secs * fps), t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const js = c.frame(i / fps);
    await b.eval(`(async()=>{const c=window.__clock;${js};await c.frames(2);c.step(${dt});await c.frames(2);c.sync();await c.frames(1);})()`);
    const r = await b.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
    fs.writeFileSync(path.join(dir, 'f' + String(i).padStart(5, '0') + '.jpg'), Buffer.from(r.data, 'base64'));
  }
  const errors = await b.eval('window.__clock.errors.slice(0,5)');
  await b.close();
  console.log(name, frames, 'frames in', Math.round((Date.now() - t0) / 1000), 's', errors.length ? errors : '', b.consoleErrors.filter((e) => !/mp3|ERR_BLOCKED/.test(e)).slice(0, 4));
  const every = Math.max(1, Math.round(frames / 24));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', dir + '/f%05d.jpg', '-vf', `select='not(mod(n,${every}))',scale=260:-1,tile=8x3:padding=3:color=gray`, '-frames:v', '1', '-update', '1', path.join(OUT, name + '.png')]);
}

const want = process.argv.slice(2);
for (const [name, c] of Object.entries(CLIPS)) if (!want.length || want.includes(name)) await record(name, c);
