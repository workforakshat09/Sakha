// Narrate text with Sarvam Bulbul.
// CLI: node stories/tts.mjs <speaker> <out.wav> "<text>"   ·   module: import { narrate } from './tts.mjs'
// Reads SARVAM_API_KEY from the project's .env so the key never lands in code or the published site.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split('\n').filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2)));
const key = env.SARVAM_API_KEY;
if (!key) throw new Error('SARVAM_API_KEY missing from .env');

// pace slows tender lines; a higher temperature lets the voice vary more with the feeling
export async function narrate(text, speaker, { pace = 0.9, temperature = 0.75 } = {}) {
  if (text.length > 2500) throw new Error('Bulbul takes at most 2500 characters per request; split the text');
  const res = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language_code: 'en-IN', speaker, model: 'bulbul:v4-flash', pace, temperature, speech_sample_rate: 44100 })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.audios?.length) throw new Error('Sarvam ' + res.status + ': ' + JSON.stringify(body).slice(0, 300));
  return Buffer.concat(body.audios.map((a) => Buffer.from(a, 'base64')));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [speaker, out, text] = process.argv.slice(2);
  if (!speaker || !out || !text) throw new Error('usage: node stories/tts.mjs <speaker> <out.wav> "<text>"');
  writeFileSync(out, await narrate(text, speaker));
  console.log('wrote', out);
}
