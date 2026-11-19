// Builds the film's soundtrack (film/mix.wav): "Nirva - Modern Funk" (the user's track) from 1.1 s for 52 s, uncut,
// since the picture is cut to it (164 BPM; see comp.js). Typing ticks sit under the search; loudness about -13.5 LUFS.
//   node film/music.mjs
// (The first, 120 BPM version used "Cinematic Indian"; its mix is kept as mix-120bpm.wav.)
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, 'music/nirva-cut.wav'); // made with: ffmpeg -ss 1.1 -t 52 -i "Nirva - Modern Funk.mp3"
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { maxBuffer: 1 << 26 });
const beat = (n) => 0.1038 + n * 0.36585;

// the search is typed one word per beat (beats 3-7), a few keys in each word's first 4 frames
const KEYS = [[3, 3], [4, 5], [5, 5], [6, 3], [7, 6]].flatMap(([b, n]) => [...Array(n)].map((_, i) => beat(b) + i * (4 / 30) / n));
const tick = (t) => `aevalsrc='0.45*(random(0)-0.5)*exp(-max(0,t-${t.toFixed(4)})*200)*gt(t,${t.toFixed(4)})':s=48000:d=52`;
const srcs = KEYS.map(tick);
const sfx = `${srcs.map((_, i) => `[${i + 1}:a]`).join('')}amix=inputs=${srcs.length}:normalize=0,highpass=f=1200,volume=0.5,aformat=channel_layouts=stereo[s]`;
const music = '[0:a]aresample=48000,atrim=0:52,asetpts=PTS-STARTPTS,afade=t=out:st=50.4:d=1.6[m]';

const raw = path.join(here, 'mix-raw.wav'), out = path.join(here, 'mix.wav');
ff(['-i', SRC, ...srcs.flatMap((s) => ['-f', 'lavfi', '-i', s]), '-filter_complex', `${music};${sfx};[m][s]amix=inputs=2:normalize=0[o]`, '-map', '[o]', '-ar', '48000', '-ac', '2', raw]);

const meter = (f) => {
  const e = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const sum = e.slice(e.lastIndexOf('Summary'));
  return { I: +/I:\s+(-?[\d.]+) LUFS/.exec(sum)[1], TP: +/Peak:\s+(-?[\d.]+) dBFS/.exec(sum)[1] };
};
// gain toward -13.5 LUFS through a limiter at about -1.5 dBFS; back off if true peak still crosses -1
let g = -13.5 - meter(raw).I, got;
for (let i = 0; i < 6; i++) {
  ff(['-i', raw, '-af', `volume=${g.toFixed(2)}dB,alimiter=limit=0.84:attack=1:release=60:level=false`, '-ar', '48000', out]);
  got = meter(out);
  if (got.TP <= -1.2 && Math.abs(got.I + 13.5) < 0.4) break;
  g += got.TP > -1.2 ? -0.7 : -13.5 - got.I;
}
console.log(`mix.wav: ${got.I} LUFS, true peak ${got.TP} dBFS (gain ${g.toFixed(2)} dB)`);
