// Narrate a story script and write its timeline for the site.
// node stories/build-story.mjs meera [--force]
//   reads   stories/<id>.json
//   writes  sakha-site/audio/vo/<id>/NN.mp3 (one per scene) and sakha-site/js/story-<id>.js
// Existing clips are reused unless --force, so re-running only pays for new or changed scenes.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { narrate } from './tts.mjs';

const [id, flag] = process.argv.slice(2);
if (!id) throw new Error('usage: node stories/build-story.mjs <id> [--force]');
const story = JSON.parse(readFileSync(new URL(`./${id}.json`, import.meta.url), 'utf8'));
const voDir = new URL(`../sakha-site/audio/vo/${id}/`, import.meta.url);
mkdirSync(voDir, { recursive: true });

// livelier feelings get more variation in the voice
const LIVELY = new Set(['tense', 'joyful', 'grand', 'wonder', 'hopeful', 'resolve']);
// silence after each line, seconds: the score swells here; heavier moments get a longer breath
const SLOW = new Set(['grief', 'pained', 'heavy', 'tender', 'quiet', 'sacred', 'peace']);
const gap = (feel) => (SLOW.has(feel) ? 3 : 2.2);
const seconds = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

let at = 0.8;
const shots = [];
for (const [i, s] of story.scenes.entries()) {
  const nn = String(i + 1).padStart(2, '0');
  const mp3 = new URL(`${nn}.mp3`, voDir).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  if (flag === '--force' || !existsSync(mp3)) {
    const wav = mp3.replace(/\.mp3$/, '.wav');
    writeFileSync(wav, await narrate(s.text, story.voice, { pace: s.pace, temperature: LIVELY.has(s.feel) ? 0.85 : 0.7 }));
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-b:a', '96k', mp3]);
    rmSync(wav);
    console.log('narrated', nn, s.kw);
  }
  const d = seconds(mp3);
  shots.push({ at: +at.toFixed(2), len: +(d + gap(s.feel)).toFixed(2), k: s.k, kw: s.kw, dev: !!s.dev, feel: s.feel, cap: s.text.replace(/…/g, '...'), vo: `${id}/${nn}` });
  at += d + gap(s.feel);
}
const dur = Math.ceil(at + 0.6);

// Studio mix: one file per story, the voice over one steady score from start to end.
// The first scene names it: "score": [track in stories/music, seconds into the track].
// The score gets a presence dip where the voice sits and is gently ducked by the voice (sidechain).
const toPath = (u) => u.pathname.replace(/^\/([A-Za-z]:)/, '$1');
const [track, off] = story.scenes[0].score || [];
if (!track) throw new Error('the first scene needs "score": [track, offset]');
const src = toPath(new URL(`./music/${track}.mp3`, import.meta.url));
if (off + dur > seconds(src)) throw new Error(`${track} from ${off}s is shorter than the story (${dur}s)`);
const inputs = ['-i', src], fc = [];
fc.push(`[0:a]atrim=start=${off}:duration=${dur},asetpts=PTS-STARTPTS,afade=t=in:d=3:curve=qsin,highpass=f=40,equalizer=f=2500:t=q:w=1:g=-4,volume=4dB[mus]`);
shots.forEach((sh, j) => {
  inputs.push('-i', toPath(new URL(`${String(j + 1).padStart(2, '0')}.mp3`, voDir)));
  fc.push(`[${j + 1}:a]aformat=channel_layouts=stereo,adelay=delays=${Math.round(sh.at * 1000)}:all=1[v${j}]`);
});
fc.push(`${shots.map((_, j) => `[v${j}]`).join('')}amix=inputs=${shots.length}:normalize=0,apad=whole_dur=${dur},asplit[vsc][vox]`);
fc.push('[mus][vsc]sidechaincompress=threshold=0.02:ratio=4:attack=150:release=1800[duck]');
const mixdown = `[duck][vox]amix=inputs=2:normalize=0,atrim=duration=${dur},afade=t=out:st=${dur - 4}:d=4`;
const mixDir = new URL('../sakha-site/audio/story/', import.meta.url);
mkdirSync(mixDir, { recursive: true });
const mixFile = toPath(new URL(`${id}.mp3`, mixDir));
const graph = toPath(new URL(`./.mix-${id}.txt`, import.meta.url));
// pass 1 measures loudness; pass 2 applies one fixed gain and a peak limiter, so the balance set above is kept
writeFileSync(graph, [...fc, mixdown + ',ebur128[out]'].join(';\n'));
const log = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...inputs, '-/filter_complex', graph, '-map', '[out]', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1e9 }).stderr;
const measured = Number(((log.match(/I:\s+-?[\d.]+ LUFS/g) || []).pop() || '').replace(/[^-\d.]/g, ''));
if (!measured) throw new Error('could not measure the mix loudness');
writeFileSync(graph, [...fc, mixdown + `,volume=${(-16 - measured).toFixed(2)}dB,alimiter=limit=0.84:level=false[out]`].join(';\n'));
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-/filter_complex', graph, '-map', '[out]', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '160k', mixFile]);
rmSync(graph);
if (Math.abs(seconds(mixFile) - dur) > 0.5) throw new Error(`the mix is ${seconds(mixFile)}s but the timeline is ${dur}s`);
console.log(`mixed over ${track}, ${measured} LUFS before gain`);

const out = { title: story.title, dur, audio: id, mix: `audio/story/${id}.mp3`, cut: 1.4, narrated: true, shots };
const js = `/* generated by stories/build-story.mjs from stories/${id}.json — do not edit by hand */\n` +
  `window.SAKHA_STORIES = window.SAKHA_STORIES || {};\nwindow.SAKHA_STORIES[${JSON.stringify(id)}] = ${JSON.stringify(out, null, 1)};\n`;
writeFileSync(new URL(`../sakha-site/js/story-${id}.js`, import.meta.url), js);
console.log(`${shots.length} scenes, ${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')} total`);
