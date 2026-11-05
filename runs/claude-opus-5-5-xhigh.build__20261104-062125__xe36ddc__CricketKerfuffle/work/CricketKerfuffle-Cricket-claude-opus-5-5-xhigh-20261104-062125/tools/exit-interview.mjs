// node tools/exit-interview.mjs: writes ../exit-interview.json (beside the game's .html) from the same data the About
// pages show (src/58-about.js), in TASK.md's exact shape, and checks it parses.
import vm from 'node:vm'; import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url), ctx = { console: { log() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('engine/my-3d2dge.js', root), 'utf8'), ctx); vm.runInContext(readFileSync(new URL('dist/game.js', root), 'utf8'), ctx);
const K = ctx.__kerfuffle, A = K.ABOUT_INFO, F = K.FEEDBACK;
const out = {
  sourceInformation: { date: A.date, source: A.source, plan: A.plan, genre: A.genre, perspective: A.perspective, tech: A.tech, artDirection: A.artDirection, animation: A.animation, audio: A.audio, online: A.online, testing: A.testing, research: A.research, environment: A.environment, model: A.model, usage: A.usage },
  testingFeedback: F.testing.slice(), engineFeedback: F.engine.slice(), promptFeedback: F.prompt.slice(),
  aiHub: { name: 'Cricket Kerfuffle', tagline: 'Over-the-top arcade cricket, with tea',
    description: 'Smash sixes through the pub window, bowl flaming yorkers and save the village green from Lord Thrumpton across five outrageous grounds. Up to four players on one screen, or Super Over showdowns in AI Hub sessions.',
    type: 'Game', genre: 'Sports', source: 'Cricket', series: '', players: '1–4',
    controls: 'Stick/WASD/mouse aim · Cross/J/click hit · Square/K/right-click loft · Circle/L block · R1/Space run',
    tags: ['sports', 'arcade', 'comedy', 'versus', 'co-op', 'retro'] }
};
const file = new URL('../exit-interview.json', root);
writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
JSON.parse(readFileSync(file, 'utf8'));
console.log('wrote ' + file.pathname);
