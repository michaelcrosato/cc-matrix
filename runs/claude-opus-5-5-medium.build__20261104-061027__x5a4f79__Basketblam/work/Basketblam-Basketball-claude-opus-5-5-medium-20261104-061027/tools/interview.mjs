// writes ../exit-interview.json from the report text in the game (src/05-report.js), so the About screen and the file agree
import vm from 'node:vm'; import { readFileSync, writeFileSync } from 'node:fs';
const rd = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const ctx = { console: { log() {}, warn() {}, info() {}, error() {} }, addEventListener() {}, location: { hash: '' }, navigator: { maxTouchPoints: 0, getGamepads: () => [] }, matchMedia: () => ({ matches: true }) };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['vendor/aihub-session.js', 'engine/my-3d2dge.js', 'build/game.js']) vm.runInContext(rd(f), ctx);
const b = ctx.__bb, I = b.REPORT_INFO;
const out = {
  sourceInformation: { date: I.date, source: I.source, plan: I.plan, genre: I.genre, perspective: I.perspective, tech: I.tech, artDirection: I.artDirection, animation: I.animation, audio: I.audio, online: I.online, testing: I.testing, research: I.research, environment: I.environment, model: I.model, usage: I.usage },
  testingFeedback: [...b.TESTING_FEEDBACK], engineFeedback: [...b.ENGINE_FEEDBACK], promptFeedback: [...b.PROMPT_FEEDBACK],
  aiHub: { name: 'BASKETBLAM', tagline: 'No fouls. No mercy. All BLAM.', description: 'Over-the-top 2-on-2 arcade basketball: turbo dunks that leave the atmosphere, legal shoves, shattered backboards and SUPERNOVA hot streaks across five wild courts, with a story Tour against a robot league, a tutorial camp and up to four players.', type: 'Game', genre: 'Sports', source: 'Basketball (over-the-top arcade style)', series: '', players: '1–4',
    controls: 'Stick/WASD move, Square/Space shoot (release at the top), R2/Shift turbo (+ shoot near the rim to dunk), Cross/E pass or steal, Circle/Q shove or spin, Triangle/F alley-oop', tags: ['2d', 'arcade', 'versus', 'co-op', 'comedy', 'pixel art'] }
};
const json = JSON.stringify(out, null, 2); JSON.parse(json);
writeFileSync(new URL('../../exit-interview.json', import.meta.url), json + '\n'); console.log('exit-interview.json written');
