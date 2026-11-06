// Regression: a press that arrives right after a screen opens, before the next (slow) frame, must count.
import { Bot, G, UI } from './bot.mjs';
import { menu } from '../../src/ui/kit.js';
const b = await Bot.make(); b.step(10); let hit = 0;
const m = menu({ id: 'probe', title: 'x', items: [{ label: 'A', action: () => { hit++; } }] }); UI.push(m);
b.i.setKey('Enter', true); b.e.step(1); b.i.setKey('Enter', false); b.e.step(1);
// and a press must not fall through: the frame that opens a screen doesn't also activate it
UI.clear(); b.step(3); let hit2 = 0; const m2 = menu({ id: 'probe2', items: [{ label: 'B', action: () => { hit2++; } }] }); const m1 = menu({ id: 'probe1', items: [{ label: 'A', action: () => UI.push(m2) }] }); UI.push(m1); b.step(10); b.i.setKey('Enter', true); b.e.step(1); b.i.setKey('Enter', false); b.e.step(6);
const bad = []; if (hit !== 1) bad.push(`press right after open dropped (hit ${hit})`); if (UI.top?.id !== 'probe2') bad.push('nested open failed'); if (hit2 !== 0) bad.push('press fell through');
for (const x of bad) console.log('input FAIL', x); console.log(`input: ${bad.length ? 'failed' : 'ok'}`); process.exitCode = bad.length ? 1 : 0;
