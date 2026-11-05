import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('file://' + process.cwd() + '/../AheadOrAliveXtremeBeachVolleyball-DeadOrAliveXtremeBeachVolleyball-claude-opus-5-5-medium-20261103-231145.html'); await p.waitForTimeout(1500);
// a sheet: every clip-backed move at three moments, drawn onto the page's canvas
await p.evaluate(() => {
  const G = AOA, g = My3D2dge.current; g.stop();
  const c = document.getElementById('screen'), ctx = c.getContext('2d'), kinds = Object.keys(G.CLIP_OF);
  const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360; const x = cv.getContext('2d'); x.fillStyle = '#f3d9a4'; x.fillRect(0, 0, 640, 360);
  kinds.forEach((k, i) => { for (let m = 0; m < 3; m++) { const rig = G.anim.rig(G.makeRig(G.FIGHTERS[i % 6])); const u = .2 + m * .3; for (let s = 0; s < 6; s++) { rig.vb = { kind: k, u, w: 1 }; rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); }
    const col = i % 8, row = Math.floor(i / 8); rig.draw(x, 14 + col * 80 + m * 22, 100 + row * 120, G.VIEW_COURT); }
    My3D2dge.font.text(x, k, 4 + (i % 8) * 80, 104 + Math.floor(i / 8) * 120, '#2a1a10', { outline: false }); });
  ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(cv, 0, 0, c.width, c.width * 9 / 16);
});
await p.screenshot({ path: 'test-output/clipsheet.png' }); await b.close();
