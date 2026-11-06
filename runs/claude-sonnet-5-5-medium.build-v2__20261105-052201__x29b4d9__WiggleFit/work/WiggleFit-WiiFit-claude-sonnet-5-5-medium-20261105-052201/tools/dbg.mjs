import { launch } from './lib.mjs';
import { S, adv, press, newGame, newProfile } from './drive.mjs';
const b = await launch({}); const p = await newGame(b);
await newProfile(p); await adv(p, 3); await p.evaluate(() => { window.__TEST__.game.go('island', {}); }); await adv(p, 1);
await p.evaluate(() => { const g = window.__TEST__.game; g.killScripts(); g.busy = false; g.endSpeech(); g.startEvent('poses', { programme: true, tier: 0 }); }); await adv(p, 1.5); let s = await S(p); console.log('1', s.screen, s.speech);
await press(p, 'ok'); await adv(p, 0.3); s = await S(p); console.log('2', s.screen, s.speech, JSON.stringify(s.errors));
await adv(p, 5); s = await S(p); console.log('3', s.screen, s.event && s.event.phase, s.event && s.event.t); console.log(p.errs.join('|')); await b.close();
