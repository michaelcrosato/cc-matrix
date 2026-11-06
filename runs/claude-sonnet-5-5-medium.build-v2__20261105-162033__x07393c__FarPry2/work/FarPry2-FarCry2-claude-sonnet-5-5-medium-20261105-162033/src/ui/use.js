// The Use system: finds the usable thing near the view centre, shows one prompt, runs hold-to-use rings.
import { THREE } from '../../pixel-engine.js';
import { consume, held } from '../core/actions.js';
import { promptWidth } from './glyphs.js';
import { INTERACTIONS } from '../content/interactions.js';

const V3 = THREE.Vector3;
export class UseSystem {
  name = 'use';
  holdT = 0; holding = null; cand = null; fwd = new V3();
  setup(g) { this.g = g; g.prompts = []; g.useTarget = null; g.extraUse = []; }
  candidates(g) {
    const out = [];
    for (const it of g.sitesSys.interactables) { const def = INTERACTIONS[it.kind]; if (!def) continue; if (def.when && !def.when(g, it)) continue; out.push({ it, def, x: it.x, z: it.z, y: g.world.heightAt(it.x, it.z) + 1, r: it.r || 3, verb: typeof def.verb === 'function' ? def.verb(g, it) : def.verb }); }
    for (const d of g.drops?.list || []) out.push({ it: d, def: INTERACTIONS.drop, x: d.x, z: d.z, y: d.y + 0.5, r: 2.5, verb: INTERACTIONS.drop.verb(g, d) });
    for (const c of g.sitesSys.cases) if (!c.taken) out.push({ it: c, def: INTERACTIONS.stonecase, x: c.x, z: c.z, y: g.world.heightAt(c.x, c.z) + 0.4, r: 2.5, verb: INTERACTIONS.stonecase.verb(g, c) });
    for (const e of g.extraUse) out.push(e);
    return out;
  }
  fixed(g, dt) {
    if (g.mode === 'round') { g.prompts = (g.extraPrompts?.() || []).map((p) => ({ ...p, text: p.verb, width: promptWidth(g.ctx.hud, p.action, p.verb, g.device, g.glyphSet) })); g.useTarget = null; return; }
    if (g.mode !== 'play' || g.ui?.screen || g.mapUp || g.surgeryActive || g.player.seated && !g.seatUse) { g.prompts = []; g.useTarget = null; this.holdT = 0; return; }
    const cam = g.ctx.camera.camera; const f = g.player.feet;
    cam.getWorldDirection(this.fwd);
    let best = null, bs = 0;
    for (const c of this.candidates(g)) {
      const dx = c.x - f.x, dz = c.z - f.z, d = Math.hypot(dx, dz); if (d > (c.r + 2.5)) continue;
      const dy = (c.y ?? f.y + 1) - (f.y + 1.5);
      const L = Math.hypot(dx, dy, dz) || 1; const dot = (dx * this.fwd.x + dy * this.fwd.y + dz * this.fwd.z) / L;
      if (dot < Math.cos(25 * Math.PI / 180) && d > 1.2) continue;
      const score = dot * 2 - d / 10; if (!best || score > bs) { best = c; bs = score; }
    }
    this.cand = best; g.useTarget = best;
    const prompts = [];
    if (best) {
      const hold = best.def.hold || 0;
      if (hold) {
        if (held(g.ctx.input, 'use')) { if (this.holding !== best.it) { this.holding = best.it; this.holdT = 0; } this.holdT += dt; if (this.holdT >= hold) { this.holdT = 0; this.holding = null; this.run(g, best); } }
        else { this.holdT = 0; this.holding = null; }
      } else if (consume(g.ctx.input, 'use')) this.run(g, best);
      prompts.push({ action: 'use', verb: best.verb, text: best.verb, width: promptWidth(g.ctx.hud, 'use', best.verb, g.device, g.glyphSet), progress: hold ? this.holdT / hold : 0 });
    } else { this.holdT = 0; this.holding = null; }
    if (best?.second) { const s = best.second; if (consume(g.ctx.input, 'swapGun')) s.run(g); prompts.push({ action: 'swapGun', verb: s.verb, text: s.verb, width: promptWidth(g.ctx.hud, 'swapGun', s.verb, g.device, g.glyphSet), progress: 0 }); }
    if (g.body.fever.active && !g.body.heal) { const v = 'TABLET'; prompts.push({ action: 'tablet', verb: v, text: v, width: promptWidth(g.ctx.hud, 'tablet', v, g.device, g.glyphSet), progress: 0 }); }
    for (const p of g.extraPrompts?.() || []) prompts.push({ ...p, width: promptWidth(g.ctx.hud, p.action, p.verb, g.device, g.glyphSet), text: p.verb });
    g.prompts = prompts;
  }
  run(g, c) { (c.run || c.def.run)?.(g, c.it, c); g.events.emit('use', c.it.kind || c.def.kind, c.it); }
  state() { return { prompts: (this.g.prompts || []).map((p) => `${p.action}:${p.verb}`) }; }
}
