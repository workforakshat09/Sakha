// The product reel's soundtrack (film/reel-mix.wav): 30 s of the Nirva cut from beat 64 (23.518 s), so the drop lands at
// 2.93 s, plus key ticks under the typed words, at about -13.5 LUFS.   node film/reel-music.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { maxBuffer: 1 << 26 });
const START = 0.1038 + 64 * 0.36585, LEN = 30;
const TYPE = [4, 6, 9, 11, 13, 16, 18, 21, 23, 25, 28, 30, 32]; // the same frames as reel/reel.js
const srcs = TYPE.map((n) => { const t = (n / 30).toFixed(4); return `aevalsrc='0.5*(random(0)-0.5)*exp(-max(0,t-${t})*220)*gt(t,${t})':s=48000:d=${LEN}`; });
const sfx = `${srcs.map((_, i) => `[${i + 1}:a]`).join('')}amix=inputs=${srcs.length}:normalize=0,highpass=f=1500,volume=0.55,aformat=channel_layouts=stereo[s]`;
const music = `[0:a]aresample=48000,atrim=${START.toFixed(4)}:${(START + LEN).toFixed(4)},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${LEN - 1.6}:d=1.6[m]`;
const raw = path.join(here, 'reel-raw.wav'), out = path.join(here, 'reel-mix.wav');
ff(['-i', path.join(here, 'music/nirva-long.wav'), ...srcs.flatMap((s) => ['-f', 'lavfi', '-i', s]), '-filter_complex', `${music};${sfx};[m][s]amix=inputs=2:normalize=0[o]`, '-map', '[o]', '-ar', '48000', '-ac', '2', raw]);
const meter = (f) => { const e = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr; const s = e.slice(e.lastIndexOf('Summary')); return { I: +/I:\s+(-?[\d.]+) LUFS/.exec(s)[1], TP: +/Peak:\s+(-?[\d.]+) dBFS/.exec(s)[1] }; };
let g = -13.5 - meter(raw).I, got;
for (let i = 0; i < 6; i++) {
  ff(['-i', raw, '-af', `volume=${g.toFixed(2)}dB,alimiter=limit=0.84:attack=1:release=60:level=false`, '-ar', '48000', out]);
  got = meter(out);
  if (got.TP <= -1.2 && Math.abs(got.I + 13.5) < 0.4) break;
  g += got.TP > -1.2 ? -0.7 : -13.5 - got.I;
}
console.log(`reel-mix.wav: ${got.I} LUFS, true peak ${got.TP} dBFS (gain ${g.toFixed(2)} dB)`);
