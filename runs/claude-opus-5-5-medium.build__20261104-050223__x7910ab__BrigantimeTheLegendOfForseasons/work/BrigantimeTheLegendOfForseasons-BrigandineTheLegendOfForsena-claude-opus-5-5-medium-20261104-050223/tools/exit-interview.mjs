// writes ../exit-interview.json from the same data the About screen shows (G.ABOUT), so the two always agree
import vm from 'node:vm'; import { readFileSync, writeFileSync } from 'node:fs';
const here = new URL('../', import.meta.url), ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(new URL(f, here), 'utf8'), ctx);
const A = ctx.__G.ABOUT, si = A.sourceInformation;
const out = { sourceInformation: { date: si.date, source: si.source, plan: si.plan, genre: si.genre, perspective: si.perspective, tech: si.tech, artDirection: si.artDirection, animation: si.animation, audio: si.audio, online: si.online, testing: si.testing, research: si.research, environment: si.environment, model: si.model, usage: si.usage },
  testingFeedback: A.testingFeedback, engineFeedback: A.engineFeedback, promptFeedback: A.promptFeedback,
  aiHub: { name: 'Brigantime: The Legend of Forseasons', tagline: 'Four seasons. Four crowns. One stopped clock.', description: 'A seasonal war of monster-binding knights: muster castles, summon beasts and fight twelve-bell hex battles to restart the Wheel of Seasons before time stops forever.', type: 'Game', genre: 'Strategy', source: 'Brigandine: The Legend of Forsena', series: 'Brigandine', players: '1–4', controls: 'Stick/WASD: cursor · ✕/Enter: select · ○/Esc: back · □/Space: commands · △/I: info · L1/R1 or Tab: cycle', tags: ['fantasy', 'story', 'versus', 'pixel art', 'retro', 'boss fights'] } };
writeFileSync(new URL('../exit-interview.json', here), JSON.stringify(out, null, 2) + '\n');
JSON.parse(readFileSync(new URL('../exit-interview.json', here), 'utf8'));
console.log('exit-interview.json written and parses');
