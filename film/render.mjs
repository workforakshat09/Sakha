// Renders the Sakha film: asks the composition for each frame, saves it, then joins the frames with the soundtrack.
// Adapted from portfolio-cinematic-review/video/render.mjs (same frame-exact approach, 1080x1350).
//   node film/render.mjs                    the whole film -> film/out/sakha-film.mp4
//   node film/render.mjs --sheet 30         a contact sheet of every 30th frame
//   node film/render.mjs --from 360 --to 780 [--sheet 10]
//   node film/render.mjs --blur 3           motion blur from 3 sub-frames per frame
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launch } from './tools/cdp.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(here, '../sakha-site');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
// --page reel --w 1920 --h 1080 --mix reel-mix.wav renders another composition in this folder
const PORT = +arg("port", 5199), W = +arg('w', 1080), H = +arg('h', 1350), fps = 30, PAGE = arg('page', 'comp');
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const file = p.startsWith('/site/') ? path.join(SITE, p.slice(6)) : path.join(here, p);
  if (!file.startsWith(SITE) && !file.startsWith(here)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, buf) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(buf); });
}).listen(PORT, '127.0.0.1');
await new Promise((r) => server.on('listening', r));
if (arg('serve')) { console.log(`http://127.0.0.1:${PORT}/${PAGE}/?f=0`); await new Promise(() => {}); }

const sheet = +arg('sheet', 0), SUB = sheet ? 1 : +arg('blur', 1), SHUTTER = 0.5;
const b = await launch({ width: W, height: H, gpu: true, port: 9391 });
await b.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await b.goto(`http://127.0.0.1:${PORT}/${PAGE}/`, 800);
await b.eval('window.__comp.ready');
const TOTAL = await b.eval('window.__comp.TOTAL');
const from = +arg('from', 0), to = Math.min(TOTAL, +arg('to', TOTAL)), step = sheet || 1;
const dir = path.join(here, sheet ? 'out/sheet' : 'out/frames');
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const t0 = Date.now(); let n = 0;
for (let f = from; f < to; f += step) for (let j = 0; j < SUB; j++) {
  await b.eval(`(async()=>{await window.__comp.seek(${(f + j * SHUTTER / SUB).toFixed(4)});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})()`);
  const r = await b.send('Page.captureScreenshot', { format: 'jpeg', quality: sheet ? 80 : 95, optimizeForSpeed: SUB > 1 });
  fs.writeFileSync(path.join(dir, 'f' + String(n++).padStart(5, '0') + '.jpg'), Buffer.from(r.data, 'base64'));
  if (!sheet && n % 300 === 0) console.log(`  ${n}/${(to - from) * SUB}  (${((Date.now() - t0) / n).toFixed(0)} ms each)`);
}
if (b.consoleErrors.length) console.log('page errors:', b.consoleErrors.slice(0, 6));
await b.close(); server.close();

const out = path.join(here, 'out');
if (sheet) {
  const cols = +arg('cols', 6), rows = Math.ceil(n / cols), name = arg('name', 'sheet');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', dir + '/f%05d.jpg', '-vf', `scale=${Math.round((W > H ? 2400 : 1800) / cols) - 4}:-1,tile=${cols}x${rows}:padding=4:color=0x444444`, '-frames:v', '1', '-update', '1', `${out}/${name}.png`]);
  console.log(`${n} frames (every ${step}, from ${from}) -> film/out/${name}.png  ${cols}x${rows}`);
} else {
  const name = arg('name', 'sakha-film');
  // highlights bleed softly into the dark; done in RGB, since doing it on YUV planes tints the picture
  const GLOW = `format=gbrp,split[m][g];[g]scale=540:-1,lutrgb=r='clip((val-150)*2.6,0,255)':g='clip((val-150)*2.6,0,255)':b='clip((val-150)*2.6,0,255)',gblur=sigma=9,scale=${W}:${H}:flags=bicubic[gl];[m][gl]blend=all_mode=screen:all_opacity=0.28,format=yuv420p`;
  const vf = (SUB > 1 ? `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/(${fps}*TB),` : '') + (arg('glow', '1') === '0' ? 'format=yuv420p' : GLOW); // --glow 0 for light films, where everything would bloom
  const a = ['-v', 'error', '-y', '-framerate', String(fps * SUB), '-i', dir + '/f%05d.jpg'];
  const sound = path.join(here, arg('mix', 'mix.wav'));
  if (fs.existsSync(sound)) a.push('-ss', String(from / fps), '-i', sound, '-shortest', '-c:a', 'aac', '-b:a', '256k');
  a.push('-filter_complex', `[0:v]${vf}[v]`, '-map', '[v]'); if (a.includes('-shortest')) a.push('-map', '1:a');
  a.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-maxrate', '16M', '-bufsize', '32M', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', String(fps), `${out}/${name}.mp4`);
  execFileSync('ffmpeg', a);
  console.log(`${n} pictures in ${Math.round((Date.now() - t0) / 1000)} s -> film/out/${name}.mp4`);
}
