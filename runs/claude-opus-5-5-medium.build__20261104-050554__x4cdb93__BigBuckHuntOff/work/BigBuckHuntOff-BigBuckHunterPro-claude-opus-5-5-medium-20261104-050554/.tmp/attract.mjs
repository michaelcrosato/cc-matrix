import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + process.argv[2] + '#attract'); await p.waitForTimeout(1500);
// the playlist run at 6x by the page's own engine; record each clip index with the scene and site it shows
const r = await p.evaluate(() => { const G = My3D2dge.current, B = BB; G.stop(); const seen = []; let t = 0;
  while (t < 150 && B.attract) { const i = B.attract.i, s = G.debug.snapshot(), k = i + ' ' + B.ATTRACT_CLIPS[i].kind + ' -> ' + s.scene + (s.site ? ':' + s.site : ''); if (G._fade == null && !seen.includes(k) && (seen.length === 0 || seen[seen.length - 1].split(' ')[0] != i || true)) { if (!seen.some(x => x.split(' ')[0] == i)) seen.push(k); } G.advance(.25); t += .25; if (B.attract.n > 7) break; }
  const loopedTo = B.attract ? B.attract.i : null; G.start(); return { seen, loopedTo, errors: G.errors.length }; });
console.log(r.seen.join('\n'), '\nlooped back to clip', r.loopedTo, 'errors', r.errors, 'page errors', errs.length);
await b.close();
