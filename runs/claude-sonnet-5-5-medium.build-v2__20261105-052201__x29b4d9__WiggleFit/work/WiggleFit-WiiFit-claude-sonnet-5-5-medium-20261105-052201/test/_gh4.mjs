import { makeStub } from './headless.mjs';
import { GrandHold } from '../src/events/grandHold.js';
import { Poses } from '../src/events/poses.js';
const game = await makeStub();
const tryit = (E, at, mod) => { const ev = new E(game, { tier: 0, seed: 4, lanes: [{ kind: 'bot', skill: 'sharp' }] }); mod && mod(ev); ev.begin(); let ok = 'ok'; try { for (let i = 0; i < at * 120; i++) ev.fixed(1 / 120); const l = ev.lanes[0]; ev.fallLane(l); for (let i = 0; i < 700; i++) ev.fixed(1 / 120); } catch (e) { ok = 'PANIC'; } return ok; };
console.log('grand@4s', tryit(GrandHold, 4));
