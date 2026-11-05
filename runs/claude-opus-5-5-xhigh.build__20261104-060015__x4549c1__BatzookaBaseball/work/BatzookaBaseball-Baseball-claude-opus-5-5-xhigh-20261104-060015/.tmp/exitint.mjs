import { load } from '../tests/lib/load.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
const { BZ } = load();
const src = Object.fromEntries(BZ.INFO.source.map(l => { const i = l.indexOf(':'); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const gp = src['Genre and Perspective'];
const answer = l => l.slice(l.indexOf('?') + 1).trim();
const out = {
  sourceInformation: {
    date: src.Date, source: src.Source, plan: src.Plan,
    genre: 'Arcade sports (baseball), with a slapstick brawler mini-game (the Rhubarb) and a story Tour with light upgrades',
    perspective: 'Plate Cam: a Mode 7 view from behind the catcher for every pitch and swing; Broadcast Cam: a three-quarter ground view of the park for fielding and running; Moonshot Cam: a Mode 7 chase of home runs; Replay Cam: the isometric view at half speed',
    tech: src.Tech, artDirection: src['Art Direction'], animation: src.Animation, audio: src.Audio, online: src.Online, testing: src.Testing, research: src.Research,
    environment: src.Environment, model: src.Model, usage: src.Usage
  },
  testingFeedback: BZ.INFO.testing.map(answer),
  engineFeedback: BZ.INFO.engine.map(answer),
  promptFeedback: BZ.INFO.prompt.map(answer),
  aiHub: {
    name: 'Batzooka Baseball', tagline: 'Swing for the moon. Literally.',
    description: 'Over-the-top arcade baseball: fireball pitches, a rocket-powered bat, wall-climbing catches and bench-clearing rhubarbs on a barnstorming tour to save a cornfield ballpark.',
    type: 'Game', genre: 'Sports', source: 'Baseball (over-the-top arcade style)', series: '', players: '1–4',
    controls: 'Stick/WASD/mouse aim · ✕/Space/click swing · □/J/right-click power · R1/E Batzooka',
    tags: ['arcade', 'comedy', 'versus', 'pixel art', 'boss fights', 'retro']
  }
};
void gp;
const p = '../exit-interview.json';
writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
const back = JSON.parse(readFileSync(p, 'utf8'));
const empty = [];
const walk = (o, k) => { if (typeof o === 'string') { if (!o.trim() && k !== 'aiHub.series') empty.push(k); } else if (Array.isArray(o)) o.forEach((v, i) => walk(v, k + '[' + i + ']')); else for (const [kk, v] of Object.entries(o)) walk(v, k ? k + '.' + kk : kk); };
walk(back, '');
console.log('parsed OK; empty fields:', empty.length ? empty.join(', ') : 'none', '; testing', back.testingFeedback.length, 'engine', back.engineFeedback.length, 'prompt', back.promptFeedback.length);
