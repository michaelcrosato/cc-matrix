// writes <root>/exit-interview.json from the game's own About text (B.ABOUT), so the chat reply, the About pages and the
// file say the same thing. node tools/interview.mjs [--print] (--print: the Markdown sections for the reply)
import vm from 'node:vm'; import { readFileSync, writeFileSync } from 'node:fs'; import { dirname, join } from 'node:path'; import { fileURLToPath } from 'node:url';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, location: { hash: '', search: '' }, navigator: { maxTouchPoints: 0, getGamepads: () => [] }, matchMedia: () => ({ matches: false }), localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, addEventListener() {}, removeEventListener() {} };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(join(DEV, 'engine', 'my-3d2dge.js'), 'utf8'), ctx); vm.runInContext(readFileSync(join(DEV, 'build', 'game.js'), 'utf8'), ctx);
const A = ctx.__BENTOU.ABOUT;
const pairs = list => { const o = {}; for (let i = 0; i < list.length; i++) if (list[i].startsWith('# ')) o[list[i].slice(2)] = list[i + 1]; return o; };
const answers = list => list.filter(l => !l.startsWith('# '));
const S = pairs(A.source), gp = S['Genre and perspective'], cut = gp.indexOf('; '), genre = gp.slice(0, cut), perspective = gp.slice(cut + 2).replace(/^./, c => c.toUpperCase());
const out = {
  sourceInformation: { date: S.Date, source: S.Source, plan: S.Plan, genre, perspective, tech: S.Tech, artDirection: S['Art direction'], animation: S.Animation, audio: S.Audio, online: S.Online, testing: S.Testing, research: S.Research, environment: S.Environment, model: S.Model, usage: S.Usage },
  testingFeedback: answers(A.testing), engineFeedback: answers(A.engine), promptFeedback: answers(A.prompt),
  aiHub: { name: 'Bentou 2: Birth of the Lunchbox Assassins', tagline: 'Seen by none. Fed by all.',
    description: 'An isometric ninja stealth-action game: pack your bento of tools, slip past lantern-lit guards, land Silent Cuts and earn your rank across a feudal night of missions, bosses and a mission editor.',
    type: 'Game', genre: 'Stealth', source: 'Tenchu 2: Birth of the Stealth Assassins', series: 'Tenchu', players: '1–4',
    controls: 'Move WASD/left stick · Jump Space/✕ · Crouch C/○ · Strike click/□ · Grapple G/R1 · Tool R/R2 · Block right click/L1', tags: ['pixel art', 'isometric', 'third-person', 'story', 'boss fights', 'retro'] }
};
const bad = []; const walk = (o, p) => { for (const k in o) { const v = o[k], q = p + '.' + k; if (v && typeof v === 'object') walk(v, q); else if (!v || !String(v).trim()) bad.push(q); } }; walk(out, '');
if (bad.length || out.testingFeedback.length !== 4 || out.engineFeedback.length !== 6 || out.promptFeedback.length !== 4) { console.error('interview incomplete: ' + bad.join(' ')); process.exit(1); }
const file = join(DEV, '..', 'exit-interview.json'); writeFileSync(file, JSON.stringify(out, null, 2) + '\n'); JSON.parse(readFileSync(file, 'utf8'));
if (process.argv.includes('--print')) {
  const sec = (h, list) => '## ' + h + '\n\n' + list.reduce((s, l) => s + (l.startsWith('# ') ? '\n**' + l.slice(2) + '**\n' : l + '\n'), '');
  console.log(['## Source Information\n', ...Object.entries(S).map(([k, v]) => '- **' + k + ':** ' + v)].join('\n') + '\n\n' + sec('Testing Feedback', A.testing) + '\n' + sec('Engine Feedback', A.engine) + '\n' + sec('Prompt Feedback', A.prompt));
} else console.log('wrote ' + file);
