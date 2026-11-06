// Briefing: a clipboard chart over a dim OR-7, then the camera dives to the field behind an iris.
import { THREE } from '../../pixel-engine.js';
import { app } from '../app.js';
import { go, swap } from '../core/nav.js';
import { BY_ID } from '../content/ops/index.js';
import { LINES } from '../content/lines.js';
import { ctext, mtext, wrap, prompts, textW } from '../ui/hud.js';
import { buildSet } from '../view/sets.js';
import { LOOK } from '../core/look.js';
const OBJ = { op1: 'REMOVE ALL THE HOOKS. CLOSE THE ARM.', op2: 'FIND WHAT HE SWALLOWED. REMOVE IT. CLOSE.', op3: 'KEEP ALL THREE PATIENTS ALIVE.', op4: 'REBUILD THE BONE. SEAL IT. SURVIVE THE CODE.', op5: 'FIND THE KNOCK. PULL THE STRAIN OUT.', op6: 'TRANSPLANT THE KIDNEY BEFORE IT GOES COLD.', op7: 'CALM THE WEEPER. DRAIN THE TEARS.', op8: 'WORK ON THE BEAT. STOP THE HEART\'S RAGE.', op9: 'NO SIGNAL. TRUST YOUR HANDS.', op10: 'DO NO HARM. TAKE YOUR TIME.', pileup: 'EVERYONE SCRUBS IN. CLOSE THE WOUND.' };
export class BriefingStage {
  name = 'Briefing';
  constructor(a) { this.a = a; this.def = BY_ID[a.opId]; }
  async setup(ctx) {
    this.ctx = ctx; this.t = 0; ctx.engine.setLook(LOOK(0.9, 0.5, 0)); this.set = buildSet(ctx, 'or7'); const c = ctx.camera.camera; c.position.set(0, 4.6, 8.6); c.fov = 46; c.updateProjectionMatrix(); c.lookAt(0, 1.6, 0);
    app.director.start(ctx, 'or-calm', 0); this.go = false; this.gt = 0; this.act0 = app.devices.activity;
  }
  cameraTarget() { return new THREE.Vector3(0, 1.6, 0); }
  status() { return `briefing ${this.def.id}`; }
  update(ctx, dt) {
    const hud = ctx.hud, dev = app.devices; dev.poll(dt, ctx); const nav = dev.nav; this.t += dt; this.set.update(dt, this.t);
    hud.clear(); const w = hud.width, h = hud.height; const p = this.def.patient;
    if (this.go) { this.gt += dt; const k = Math.min(1, this.gt / 1.3), c = ctx.camera.camera; const e = k * k * (3 - 2 * k); c.position.set(0.5 * e, 4.6 + (9.6 - 4.6) * e, 8.6 + (3.1 - 8.6) * e); c.lookAt(0, 1.6 * (1 - e), 0.1 * e); if (this.gt > 1.0 && !this.cov) { this.cov = true; this.start(ctx); } return; }
    const drop = Math.min(1, this.t / 0.5), y0 = Math.round(14 - 240 * Math.pow(1 - drop, 3)), cw = 290, cx = Math.round((w - cw) / 2) - 20;
    hud.rect(cx - 2, y0 - 2, cw + 4, 224, 'slate'); hud.rect(cx, y0, cw, 220, 'white'); hud.rect(cx + cw / 2 - 20, y0 - 6, 40, 9, 'ink');
    hud.text(cx + 10, y0 + 10, 'PATIENT CHART', { color: 'navy', shadow: false }); hud.text(cx + 10, y0 + 22, p.name, { color: 'ink', scale: 2, shadow: false });
    hud.text(cx + 10, y0 + 42, p.age ? `AGE ${p.age}   ${p.job}` : p.job, { color: 'navy', shadow: false });
    hud.rect(cx + 10, y0 + 54, cw - 20, 1, 'mist'); wrap(hud, p.hook, cw - 24).slice(0, 3).forEach((l, i) => hud.text(cx + 10, y0 + 62 + i * 10, l, { color: 'ink', shadow: false }));
    hud.text(cx + 10, y0 + 100, 'OBJECTIVE', { color: 'red', shadow: false }); wrap(hud, OBJ[this.def.id] || '', cw - 24).slice(0, 3).forEach((l, i) => hud.text(cx + 10, y0 + 110 + i * 10, l, { color: 'ink', shadow: false }));
    hud.text(cx + 10, y0 + 146, `SURGEON: ${this.def.surgeon === 'sabine' ? 'DR. ACHTERBERG' : this.def.partner ? 'DR. MARSH + DR. ACHTERBERG' : 'DR. MARSH'}`, { color: 'navy', shadow: false });
    // op title stamp
    const st = Math.min(1, Math.max(0, (this.t - 0.9) / 0.25)); if (st > 0) { const sc = 3 - Math.round(st); const tw = textW(hud, this.def.title, sc) ; hud.rect(cx + 8, y0 + 170, cw - 16, 40, 'white'); for (let i = 0; i < 4; i++) hud.rect(cx + 8 + i, y0 + 170 + i, cw - 16 - 2 * i, 1, 'red'); hud.text(Math.round(cx + cw / 2 - tw / 2), y0 + 182, this.def.title, { color: 'red', scale: sc, shadow: false }); if (!this.sd) { this.sd = true; ctx.audio.play('stamp'); ctx.engine.shake.add(0.3); } }
    prompts(hud, app, [{ act: 'confirm', label: 'SCRUB IN' }, { act: 'back', label: 'BACK' }], 'center', h - 14);
    if (this.t > 0.6 && nav.confirm) { this.go = true; this.gt = 0; ctx.audio.play('uiOk'); } if (nav.click && this.t > 0.6) { this.go = true; this.gt = 0; } if (nav.back) go.menu(ctx);
  }
  start(ctx) { go.operation(ctx, { opId: this.def.id, difficulty: app.save.difficulty, noDive: true }); }
  dispose() {}
}
