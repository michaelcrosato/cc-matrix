// On-hold jingle over black, the credits, and one last shot.
import { CREDIT_LINES } from '../data/about.js';
import { buildProp } from '../game/actor.js';
import { SCENES } from '../data/dialogue.js';
export class CreditsScreen {
  constructor(A) { this.A = A; this.t = 0; A.app.mix.play('onhold', 0.1); }
  update(ui) {
    this.t += 1 / 60; const A = this.A; const lines = CREDIT_LINES; const y0 = ui.H - this.t * 14; if (this.t < 2 + (lines.length * 12 + ui.H) / 14) { ui.rect(0, 0, ui.W, ui.H, 'ink'); lines.forEach((l, i) => { const y = y0 + i * 12; if (y > -10 && y < ui.H) ui.center(y, l[0], { color: l[1] ?? 'mist', scale: l[2] ?? 1 }); }); ui.prompts([['confirm', 'SKIP']]); if (ui.confirm || ui.click) this.t = 9999; return; }
    if (!this.shot) { this.shot = 0.001; A.menu = this; A.ctx.engine.timeScale = 1; A.ctx.scene.background; this.limpet = buildProp('limpet'); this.limpet.object.position.set(0.2, -0.5, -4.93); this.limpet.object.rotation.x = -Math.PI / 2; this.limpet.object.scale.setScalar(1.3); A.ctx.scene.add(this.limpet.object); A.camOverride = () => ({ position: [0.9, -0.1, -7.4], target: [0.2, -0.5, -4.9], fov: 22 }); A.hideHud = true; }
    this.shot += 1 / 60; const o = this.limpet.object; o.scale.y = 1.3 + Math.min(1, this.shot / 4) * 0.9; ui.hud.clear();
    if (this.shot > 6 || ((ui.confirm || ui.click) && this.shot > 0.5)) { A.menu = null; A.app.saveClear?.(); A.app.goTitle(); }
  }
}
