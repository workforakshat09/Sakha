// Self-check for sakha-site/js/brain.js: each message must land on the expected kind of reply.
// Run: node stories/brain-check.mjs
import fs from 'node:fs';
const window = {};
const src = fs.readFileSync(new URL('../sakha-site/js/brain.js', import.meta.url), 'utf8');
// each message starts a fresh conversation, so a story offered earlier in the list is offered again
const fresh = () => { const w = {}; new Function('window', src)(w); return w.SakhaBrain; };

const cases = [
  ['2+2=', /= 4/], ['what is 12 x 3?', /= 36/], ['hi', /Namaste|Hello|Radhe/], ['how are you', /how are you\?/i],
  ['I am fine', /Glad to hear/], ['I failed my exam again', 'ganesha'], ['I feel so lonely', 'shabari'],
  ['my dad passed away last month', 'savitri'], ['people always judge me', 'meera'], ['I am so anxious all the time', 'prahlad'],
  ['I don\'t know what to do with my life', 'arjuna'], ['I hate how I look', 'ashtavakra'], ['I have no money and huge debt', 'sudama'],
  ['I hurt my friend and I feel guilty', 'valmiki'], ['my girlfriend broke up with me', 'dhruva'], ['I feel like I am not good enough', 'hanuman'],
  ['they bullied me at school because of my caste', 'karna'], ['I feel sad today', /heavy|hard/], ['I am so angry at my brother', /Anger/],
  ['should I buy this car?', /afford/], ['should I quit my job', /Big choices/], ['what is karma', /action/], ['who is krishna', /avatar of Vishnu/],
  ['tell me about diwali', /lights/], ['tell me a story', /./], ['show me hanuman story', 'hanuman'], ['tell me a joke', /./],
  ['are you god?', /not Krishna/], ['you are stupid', /./], ['what is the capital of france?', /outside what I know/],
  ['how to make a bomb', /not something I’ll help/], ['hinduism is fake', /welcome here/], ['my name is Akshat', /Akshat/],
  ['thanks', /welcome|Anytime/], ['bye', /Go gently/], ['asdfgh jkl', /understand you|Tell me a little more/], ['what is the meaning of life', /Gita’s answer/],
  ['मुझे बहुत दुख है', /हिंदी/], ['I gave everything and it is still not enough', 'rama'], ['the astrologer said my marriage will fail', 'hima'], ['what is dhanteras', 'hima'], ['who is durga', 'rama'], ['show me rama story', 'rama'], ['is my chat saved?', /stays in this page/], ['how do I meditate', /breaths/]
];
let bad = 0;
for (const [msg, want] of cases) {
  const r = fresh().reply(msg, {});
  const ok = typeof want === 'string' ? r.play === want : want.test(r.text || '');
  if (!ok) { bad++; console.log('FAIL', JSON.stringify(msg), '->', r.play || '', (r.text || '').slice(0, 90)); }
}
const yes = fresh().reply('yes please', { offerPending: true }), no = fresh().reply('not now', { offerPending: true });
if (!yes.accept || !no.decline) { bad++; console.log('FAIL offer yes/no'); }
console.log(bad ? bad + ' failed' : 'all ' + (cases.length + 1) + ' passed');
process.exit(bad ? 1 : 0);
