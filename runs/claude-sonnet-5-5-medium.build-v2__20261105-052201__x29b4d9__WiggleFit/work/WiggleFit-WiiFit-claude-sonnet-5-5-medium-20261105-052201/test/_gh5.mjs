import { makeStub } from './headless.mjs';
import { GrandHold } from '../src/events/grandHold.js';
const game = await makeStub();
const ev = new GrandHold(game, { tier: 0, seed: 4, lanes: [{ kind: 'bot', skill: 'sharp' }] }); ev.begin(); for (let i = 0; i < 600; i++) ev.fixed(1 / 120);
const l = ev.lanes[0]; const q = l.bal.body.rotation(); console.log('state pre-fall: wish', l.bal.wishX, l.bal.wishZ, 'push', l.bal.pushX, l.bal.pushZ, 'kick', l.bal.kickX, l.bal.kickT, 'sway', l.bal.sway, 'tremor', l.bal.tremor, 'nx', l.bal.nx, l.bal.nz, 'maxLean', l.bal.par.maxLean, 'margin', l.bal.par.margin, 'ankle', l.bal.par.ankleMax);
