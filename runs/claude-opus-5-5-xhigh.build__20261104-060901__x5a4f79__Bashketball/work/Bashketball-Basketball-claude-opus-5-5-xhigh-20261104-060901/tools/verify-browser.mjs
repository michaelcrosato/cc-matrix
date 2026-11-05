// Real-browser verification with real key presses on the deliverable: Dev Mode from the pause menu (a live slider
// changed, the game reacting, reset to defaults) and the attract mode (10 s idle on the title, any key leaves).
import { chromium } from 'playwright';
const file = 'file://' + process.argv[2];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } }); const errs = [];
p.on('pageerror', e => errs.push(e.message));
const st = () => p.evaluate(() => { const bb = window.__bb; return { scene: bb.game.sceneName, paused: bb.game.paused, shell: bb.game.shell && bb.game.shell.screen, dev: bb.S.dev.open, tab: bb.DEV.tab, row: bb.DEV.row, runSpeed: bb.TUNING.runSpeed.v, attract: bb.S.attract && bb.S.attract.phase }; });
const out = [];
// 1. attract: idle 10 s on the title
await p.goto(file); await p.waitForTimeout(1500); out.push(['title', await st()]);
await p.waitForTimeout(11000); out.push(['after 11 s idle', await st()]); await p.screenshot({ path: 'check-output/verify-attract.png' });
await p.keyboard.press('KeyW'); await p.waitForTimeout(600); out.push(['after a key', await st()]);
// 2. dev mode from the pause menu, by keyboard: title -> menu -> exhibition flow
await p.keyboard.press('Enter'); await p.waitForTimeout(500); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
await p.keyboard.press('Enter'); await p.waitForTimeout(250); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
await p.keyboard.press('Enter'); await p.waitForTimeout(350); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
await p.keyboard.press('Enter'); await p.waitForTimeout(800);
await p.keyboard.press('Enter'); await p.waitForTimeout(350); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
await p.waitForTimeout(800); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); out.push(['exhibition by keyboard', await st()]);
await p.keyboard.press('Escape'); await p.waitForTimeout(700); out.push(['Escape: pause', await st()]);
const labels = await p.evaluate(() => [...document.querySelectorAll('.esh button')].map(x => x.textContent.trim()));
out.push(['pause menu buttons', labels.join(' | ')]);
await p.evaluate(() => { const btn = [...document.querySelectorAll('.esh button')].find(x => x.textContent.trim().toLowerCase() === 'dev mode'); btn.focus(); });
await p.keyboard.press('Enter'); await p.waitForTimeout(800); out.push(['Dev Mode chosen', await st()]);
// TUNING tab, Movement group: row 1 is Run speed; three presses right
await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150);
for (let k = 0; k < 20; k++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(60); }
out.push(['Run speed slider +20', await st()]); await p.screenshot({ path: 'check-output/verify-dev.png' });
// the game reacts: a player runs farther in a second at the new speed
const react = await p.evaluate(async () => { const bb = window.__bb, S = bb.S, pl = S.players[1], meas = async v => { bb.setTune('runSpeed', v); pl.x = bb.OX + 30; pl.y = bb.CMY + 60; pl.vx = 0; pl.setState('run'); const src = pl.source; pl.source = { kind: 'script', read: () => ({ mx: 1, my: 0 }) }; await new Promise(r => setTimeout(r, 300)); const x0 = pl.x; await new Promise(r => setTimeout(r, 1000)); pl.source = src; return pl.x - x0; }; const cur = bb.TUNING.runSpeed.v, a = await meas(108), c = await meas(cur); bb.setTune('runSpeed', cur); return { at108: Math.round(a), atSlider: Math.round(c), slider: cur }; });
out.push(['game reacts', react]);
// RESET ALL TO DEFAULTS: the row after the group's sliders
const resetRow = await p.evaluate(() => window.__bb.devRows().findIndex(r => r.label === 'RESET ALL TO DEFAULTS'));
for (let k = 1; k < resetRow; k++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(80); }
await p.keyboard.press('Enter'); await p.waitForTimeout(300);
out.push(['RESET ALL', await p.evaluate(() => ({ runSpeed: window.__bb.TUNING.runSpeed.v, allDefault: Object.values(window.__bb.TUNING).every(t => t.v === t.def) }))]);
await p.keyboard.press('Escape'); await p.waitForTimeout(400); out.push(['Escape closes the panel', await st()]);
for (const [k, v] of out) console.log(k.padEnd(26), typeof v === 'string' ? v : JSON.stringify(v));
console.log('page errors:', errs.length ? errs : 'none'); await b.close();
