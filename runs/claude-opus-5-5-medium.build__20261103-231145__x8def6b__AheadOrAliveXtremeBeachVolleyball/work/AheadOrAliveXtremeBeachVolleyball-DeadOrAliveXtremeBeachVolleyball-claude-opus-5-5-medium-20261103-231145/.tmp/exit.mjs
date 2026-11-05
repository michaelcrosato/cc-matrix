import { writeFileSync, readFileSync } from 'node:fs';
import { load } from '../test/lib/load.mjs';
const { G } = load();
const A = G.ABOUT_INFO, F = G.FEEDBACK;
const out = {
  sourceInformation: { date: A.date, source: A.source, plan: A.plan, genre: A.genre, perspective: A.perspective, tech: A.tech, artDirection: A.art, animation: A.animation, audio: A.audio, online: A.online, testing: A.testing, research: A.research, environment: A.environment, model: A.model, usage: A.usage },
  testingFeedback: F.testing, engineFeedback: F.engine, promptFeedback: F.prompt,
  aiHub: { name: 'Ahead or Alive: Xtreme Beach Volleyball', tagline: 'Stay ahead. Stay alive. Stay tanned.', description: 'A five-day island vacation of 2-on-2 beach volleyball, friendships, swimsuit shopping, pool hopping and casino nights, ending with a match for the island against its owner.', type: 'Game', genre: 'Sports', source: 'Dead or Alive Xtreme Beach Volleyball', series: 'Dead or Alive', players: '1–4', controls: 'Stick/WASD move · Cross/Space/click hit on time · Square/E shot and block · Circle/Shift dive · Triangle/Q call', tags: ['sports', 'versus', 'co-op', 'pixel art', 'comedy', 'arcade'] }
};
const path = new URL('../../exit-interview.json', import.meta.url);
writeFileSync(path, JSON.stringify(out, null, 2) + '\n');
const back = JSON.parse(readFileSync(path, 'utf8'));
const empty = []; const walk = (o, k) => { if (typeof o === 'string') { if (!o.trim()) empty.push(k); } else if (Array.isArray(o)) o.forEach((v, i) => walk(v, k + '[' + i + ']')); else for (const kk in o) walk(o[kk], k + '.' + kk); };
walk(back, 'root'); console.log('parses; empty fields:', empty.length, 'testing', back.testingFeedback.length, 'engine', back.engineFeedback.length, 'prompt', back.promptFeedback.length);
