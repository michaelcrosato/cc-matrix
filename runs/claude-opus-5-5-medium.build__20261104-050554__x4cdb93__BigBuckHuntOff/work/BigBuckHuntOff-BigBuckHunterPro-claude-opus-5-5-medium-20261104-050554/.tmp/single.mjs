import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + process.argv[2] + '#menu'); await p.waitForTimeout(2500);
// from the real menu: SINGLE HUNT -> MUSKEG LAKE with keys, then the bot plays; confirm through cards, tallies and results
await p.keyboard.press('ArrowDown'); await p.waitForTimeout(200); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
const r = await p.evaluate(() => { const G = My3D2dge.current, B = BB; G.stop(); const segs = [], sites = []; let t = 0;
  while (t < 1500 && G.sceneName === 'hunt') { const s = G.debug.snapshot(); if (segs[segs.length - 1] !== s.seg) segs.push(s.seg); if (s.seg === 'site') { if (sites[sites.length - 1] !== s.site) { sites.push(s.site); B.play.players[0].bot = new B.Bot(B.play.players[0], { skill: 'expert', cheat: true }); } G.advance(.25); t += .25; } else { G.input.tap('confirm'); G.advance(.3); t += .3; } }
  const out = { mode: B.curRun().mode, hunt: B.curRun().hunts[0], sites, segs: segs.join('>'), end: G.sceneName, score: B.curRun().players[0].huntScore, best: B.records.best['hunt-muskeg'], errors: G.errors.length }; G.start(); return out; });
console.log(JSON.stringify(r, null, 1), 'page errors', errs.length);
await b.close();
