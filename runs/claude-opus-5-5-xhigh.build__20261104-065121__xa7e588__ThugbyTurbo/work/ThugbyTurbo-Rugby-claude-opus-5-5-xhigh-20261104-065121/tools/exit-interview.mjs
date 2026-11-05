// Writes ../exit-interview.json from the same text the in-game About & Credits screen shows (src/04-data-about.js).
import { writeFileSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'build/game.js']) vm.runInContext(readFileSync(new URL(f, root), 'utf8'), ctx);
const TT = ctx.__thugby.TT, I = TT.ABOUT_INFO;
const out = {
  sourceInformation: { date: I.date, source: I.source, plan: I.plan, genre: I.genre, perspective: I.perspective, tech: I.tech, artDirection: I.artDirection, animation: I.animation, audio: I.audio, online: I.online, testing: I.testing, research: I.research, environment: I.environment, model: I.model, usage: I.usage },
  testingFeedback: TT.FEEDBACK.testing.slice(), engineFeedback: TT.FEEDBACK.engine.slice(), promptFeedback: TT.FEEDBACK.prompt.slice(),
  aiHub: {
    name: 'THUGBY TURBO', tagline: 'Big hits, bigger hair, seven a side',
    description: 'Over-the-top arcade rugby sevens: turbo runs, monster hits, a referee who only sees half of it, and a pub team\'s run at the Mega Cup.',
    type: 'Game', genre: 'Sports', source: 'Rugby', series: '', players: '1–4',
    controls: 'Stick or WASD run, L1/R1 or Q/E pass, ✕ or Space tackle and sidestep, ○ or C kick, R2 or Shift turbo, △ or R super',
    tags: ['sports', 'arcade', 'comedy', 'pixel art', 'versus', 'co-op']
  }
};
const text = JSON.stringify(out, null, 2) + '\n';
JSON.parse(text);
writeFileSync(new URL('../exit-interview.json', root), text);
console.log('wrote exit-interview.json (' + text.length + ' bytes)');
