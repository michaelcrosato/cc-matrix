import { load } from './harness.mjs';
const t = load(); const { game, I, dbg, snap } = t; const step = s => game.advance(s);
step(.4); dbg.startAttract(); step(.3);
dbg.STAGE_START && 0;
// jump the pilot to the box
dbg.state().stage = 'box'; dbg.toBox(); step(1);
for (let i = 0; i < 40; i++) { step(.5); if (i % 4 === 0) console.log(i, JSON.stringify(snap()).slice(0, 260), JSON.stringify(dbg.pilot()), !!game.shell.screen); }
