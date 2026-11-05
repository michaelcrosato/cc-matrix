import { chromium } from 'playwright';
import { resolve } from 'node:path';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('file://' + resolve('../MashTV-SmashTV-claude-opus-5-5-medium-20261104-050259.html') + '#boss=1'); await p.waitForTimeout(2500);
for (const [x, y] of [[100, 60], [184, 120], [300, 200]]) {
  const s = await p.evaluate(([x, y]) => { const g = My3D2dge.current, pt = g.r.w(x, y, 0), cv = document.getElementById('screen'), rc = cv.getBoundingClientRect(), k = rc.width / g.r.W; return [rc.left + (pt[0] - g.r.ix) * k, rc.top + (pt[1] - g.r.iy) * k, g.r.ix, g.r.iy, rc.width, g.r.W, g.r.bw]; }, [x, y]);
  await p.mouse.move(s[0], s[1]); await p.waitForTimeout(100);
  console.log([x, y], s.map(v => +v.toFixed(1)), await p.evaluate(() => My3D2dge.current.mouseGround().map(v => +v.toFixed(1))));
}
await b.close();
