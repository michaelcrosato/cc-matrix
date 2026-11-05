import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + process.argv[2] + '#menu'); await p.waitForTimeout(2500);
await p.keyboard.press('Enter'); await p.waitForTimeout(1500);   // HUNT-OFF, the first menu entry
const r = await p.evaluate(() => { const G = My3D2dge.current, B = BB; G.stop(); const sites = [], hunts = []; let t = 0, cam = false, results = 0, last = null;
  while (t < 3000 && G.sceneName === 'hunt') { const s = G.debug.snapshot(); if (s.hunt && hunts[hunts.length - 1] !== s.hunt) hunts.push(s.hunt); if (s.trophyCam) cam = true; if (s.seg === 'results' && last !== 'results') results++; last = s.seg;
    if (s.seg === 'site') { if (sites[sites.length - 1] !== s.site) { sites.push(s.site); B.play.players[0].bot = new B.Bot(B.play.players[0], { skill: 'expert', cheat: true }); } G.advance(.25); t += .25; } else { G.input.tap('confirm'); G.advance(.3); t += .3; } }
  for (let k = 0; k < 10; k++) G.advance(.2);
  const out = { mode: 'hunt-off', hunts, sites, results, trophyCam: cam, end: G.sceneName, total: B.curRun().players[0].total, trophiesBagged: Object.keys(B.records.trophies).filter(k => B.records.trophies[k].bagged), champion: B.records.champion, errors: G.errors.length }; G.start(); return out; });
console.log(JSON.stringify(r, null, 1), '\npage errors', errs.length);
await b.close();
