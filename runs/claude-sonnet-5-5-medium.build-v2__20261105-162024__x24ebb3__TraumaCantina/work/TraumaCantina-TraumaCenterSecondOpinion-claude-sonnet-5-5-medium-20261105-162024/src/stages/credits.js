// Shift Report (all ranks) and credits, then back to the title.
import { THREE } from '../../pixel-engine.js';
import { app } from '../app.js';
import { go } from '../core/nav.js';
import { OPS } from '../content/ops/index.js';
import { shiftReport } from '../sim/campaign.js';
import { ABOUT } from '../content/about.js';
import { ctext, prompts, wrap } from '../ui/hud.js';
import { buildSet } from '../view/sets.js';
import { LOOK } from '../core/look.js';
export class CreditsStage {
  name = 'Credits';
  async setup(ctx) { this.t = 0; this.set = buildSet(ctx, 'roof'); ctx.engine.setLook(LOOK(1, 0.4, 0)); app.director.start(ctx, 'credits', 0); app.save.finished = true; app.save.next = 0; app.flush(); }
  cameraTarget() { return new THREE.Vector3(0, 1.4, 0); }
  status() { return 'credits'; }
  update(ctx, dt) {
    const hud = ctx.hud, dev = app.devices; dev.poll(dt, ctx); this.t += dt; this.set.update(dt, this.t); const cam = ctx.camera.camera; cam.position.set(Math.sin(this.t * 0.1) * 2, 3.2, 9); cam.lookAt(0, 1.4, 0); cam.updateMatrixWorld?.(true);
    hud.clear(); const w = hud.width, h = hud.height; hud.rect(0, 0, w, h, 'ink'); ctext(hud, 10, 'SHIFT REPORT', { scale: 3, color: 'sand' });
    const rep = shiftReport(app.save); rep.forEach((r, i) => { const col = i < 5 ? 0 : 1, row = i % 5, x = 70 + col * 170, y = 52 + row * 22; hud.text(x, y, `OP ${i + 1}`, { color: 'mist' }); hud.text(x + 30, y, OPS[i].title, { color: 'white' }); hud.text(x + 130, y - 2, r.rank, { color: { S: 'sand', A: 'lime', B: 'sky', C: 'orange', '-': 'slate' }[r.rank], scale: 2 }); });
    const y0 = 170 - ((this.t * 14) % 400); let y = 180 - this.t * 12; ABOUT.credits.forEach((l) => { wrap(hud, l || ' ', w - 80).forEach((x) => { if (y > 160 && y < h - 8) ctext(hud, y, x, { color: 'white' }); y += 12; }); });
    prompts(hud, app, [{ act: 'confirm', label: 'BACK TO TITLE' }], 'center', h - 12); if ((dev.nav.confirm || dev.nav.click) && this.t > 1) go.title(ctx, {}); if (this.t > 60) go.title(ctx, {});
  }
}
