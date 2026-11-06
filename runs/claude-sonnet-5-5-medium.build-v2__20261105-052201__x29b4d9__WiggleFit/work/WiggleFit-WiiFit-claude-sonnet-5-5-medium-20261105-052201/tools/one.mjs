import { launch } from './lib.mjs';
import { S, adv, press, newGame, newProfile, playEvent } from './drive.mjs';
const id = process.argv[2] || 'poses'; const b = await launch({}); const p = await newGame(b);
await newProfile(p); await adv(p, 3); await p.evaluate(() => { const g = window.__TEST__.game; g.go('island', {}); }); await adv(p, 1);
const s = await playEvent(p, id, 0, { skill: 'sharp', maxS: 300 }); console.log(id, s.screen, JSON.stringify(s.event && s.event.lanes[0]), JSON.stringify(s.errors)); console.log(p.errs.join('\n')); await b.close();
