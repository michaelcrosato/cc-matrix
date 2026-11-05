import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto('file://' + process.argv[2] + '#lodge'); await p.waitForTimeout(2500);
const r = await p.evaluate(() => {
  const G = My3D2dge.current, L = BB.lodgeState; G.stop(); G.lights.enabled = false;   // a steady frame: no flicker
  const grab = () => { G.advance(1 / 120, { draw: true }); const cv = G.screen.buf, g = cv.getContext('2d'); return { d: g.getImageData(0, 0, cv.width, cv.height).data, w: cv.width }; };
  let dubAt = null; const d0 = L.dub.draw.bind(L.dub), h0 = L.hound.draw.bind(L.hound);
  L.dub.draw = (g, ox, oy, v) => { dubAt = [ox, oy]; return d0(g, ox, oy, v); };
  const a = grab(); L.t = 0;
  L.dub.draw = () => {}; L.hound.draw = () => {}; const bb = grab();
  let diff = 0, near = 0; for (let i = 0; i < a.d.length; i += 4) { if (Math.abs(a.d[i] - bb.d[i]) + Math.abs(a.d[i + 1] - bb.d[i + 1]) + Math.abs(a.d[i + 2] - bb.d[i + 2]) > 30) { diff++; const x = (i / 4) % a.w, y = Math.floor(i / 4 / a.w); if (dubAt && Math.abs(x - dubAt[0]) < 60 && Math.abs(y - dubAt[1]) < 70) near++; } }
  L.dub.draw = d0; L.hound.draw = h0; G.start();
  return { pixelsFromRigs: diff, ofThemNearDub: near, dubAt, humanoid: L.dub instanceof My3D2dge.Humanoid, blob: L.hound instanceof My3D2dge.Blob, errors: G.errors.length };
});
console.log(JSON.stringify(r)); await b.close();
