// node tools/exit.mjs : writes ../exit-interview.json (beside the game's html) from feedback.json and the facts below
import { readFileSync, writeFileSync } from 'node:fs'; import { resolve, dirname } from 'node:path'; import { fileURLToPath } from 'node:url';
const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '..'); const fb = JSON.parse(readFileSync(resolve(DEV, 'feedback.json'), 'utf8'));
const out = {
  sourceInformation: {
    date: '2026-11-04 01:17:20', source: 'Dead or Alive Xtreme Beach Volleyball', plan: 'PLAN.md (written by claude-opus-5-5 at max effort)',
    genre: 'Sports (arcade 2v2 beach volleyball) with life-sim (vacation calendar, friendship, shops) and minigames (rhythm, casino)',
    perspective: 'Side-on broadcast camera for matches with a serve cam; three-quarter view for places, island map and menus',
    tech: 'my-3D2dge engine v0.85.2 (patched, inlined in one html file), vanilla JavaScript, Web Audio synth, AI Hub session client 1.4.0 (unmodified), Playwright 1.63.0 for tests',
    artDirection: "The engine's native style: HD pixel-rigged Humanoids on a PS1-resolution canvas, with new beach, court, crowd, casino and pool art",
    animation: 'Engine Humanoid rigs and E.MOVES (cast, overhead) with timed swing phases, dives, celebrations and poses',
    audio: 'All code: 8 music tracks and a jingle, about 45 sound effects, Animalese-style voices per character. No audio files',
    online: 'AI Hub shared-world sessions (the host runs the match, the other copies send inputs, own card); local play for 1 to 4 players on one machine',
    testing: 'Headless scripted tests with game.advance and game.debug (rules, AI, a full scripted playthrough, UI, attract, dev mode), a browser test, the AI Hub harness (2 and 4 players, host-leave, server) and a few screenshots; no subagents',
    research: 'none beyond reading the engine handoff and the AI Hub README; the source is known from memory',
    environment: 'Claude Code CLI (headless); Linux; browser unknown (Chromium via Playwright for tests)',
    model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium', usage: 'unknown'
  },
  testingFeedback: fb.testing, engineFeedback: fb.engine, promptFeedback: fb.prompt,
  aiHub: {
    name: 'Ahead or Alive: Xtreme Beach Volleyball', tagline: 'Stay ahead. Stay alive. Stay tanned.',
    description: 'A five-day island vacation of 2-on-2 beach volleyball, friendship, shopping and casino nights, ending in the Fortuna Cup. Quick Beach Matches for 1 to 4 players, online or on one couch.',
    type: 'Game', genre: 'Sports', source: 'Dead or Alive Xtreme Beach Volleyball', series: 'Dead or Alive', players: '1–4',
    controls: 'Move: left stick or WASD. Play (serve, bump, set, spike): Cross or Space. Dive: Circle or K. Call: Square or L. Camera: Triangle or V.',
    tags: ['3d', 'sports', 'versus', 'co-op', 'comedy', 'retro']
  }
};
const f = resolve(DEV, '..', 'exit-interview.json'); writeFileSync(f, JSON.stringify(out, null, 2)); JSON.parse(readFileSync(f, 'utf8')); console.log('wrote', f);
