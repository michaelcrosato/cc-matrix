// The ceremonies: the podium, the prize reveal, the credits and the ending card. All are Timelines over a set.
import { Timeline, THREE, PALETTE, toonMaterial } from '../../../pixel-engine.js';
import { CAR_INFO } from '../../data/cars.js';
import { EVENTS } from '../../data/events.js';
import { ENDING_LINES } from '../../data/text.js';
import { TITLE, MAKER, SOURCE } from '../../data/meta.js';
import { makePerson } from '../../render/people.js';
const { BoxGeometry, Mesh, Vector3 } = THREE;
const P = (b, x, y, z) => [b.x + x, y, b.z + z];
function playShots(scene, tl) { const t = tl, v = new Vector3(); scene.camOverride = (cam) => { const shot = t.camera(); if (!shot) return; cam.position.set(...shot.position); v.set(...shot.target); cam.lookAt(v); if (shot.fov) { cam.fov = shot.fov; cam.updateProjectionMatrix(); } }; }
export class PodiumScreen {
  constructor(app, o) { this.id = 'podium'; this.app = app; this.o = o; this.t = 0; this.noBack = true; this.inputOff = false; }
  async enter() {
    const a = this.app, s = a.scene, o = this.o; a.mix.music('fanfare'); s.stage('podium', { orbit: false, radius: 22, height: 8, lookY: 2 });
    const b = s.base; const win = await makePerson(a.ctx, 'driver'), two = await makePerson(a.ctx, 'crew'), three = await makePerson(a.ctx, 'crew2');
    this.people = [win, two, three]; win.object.position.set(b.x, 2, b.z - 3); two.object.position.set(b.x - 4, 1.3, b.z - 3); three.object.position.set(b.x + 4, 0.8, b.z - 3); for (const q of this.people) { a.ctx.scene.add(q.object); q.play('Idle'); }
    win.play('PodiumCheer'); two.play('CrowdCheer'); three.play('PodiumBow');
    s.fx.push((dt) => { for (const q of this.people) q.update(dt); });
    // The winner's car rolls in.
    const v = s.showCar(o.carId, o.install, { y: 0 }); s.stageOpts.carFixed = true; s.stageOpts.carX = 12; s.stageOpts.carZ = 6; s.stageOpts.carYaw = -Math.PI / 2; s.carSpin = 2;
    s.fx.push((dt) => { const so = s.stageOpts; if (so.carX > 0.5) so.carX = Math.max(0.5, so.carX - dt * 3.2); else s.carSpin = 0; void v; });
    this.tl = new Timeline({ bars: 0.5, shots: [{ at: 0, position: P(b, 0, 2.2, 12), target: P(b, 0, 2.6, -3), fov: 42 }, { at: 3, position: P(b, -6, 4.4, 9), target: P(b, 0, 2.8, -3), fov: 34 }, { at: 3.01, cut: true, position: P(b, 9, 1.4, 11), target: P(b, 2, 0.9, 6), fov: 30 }, { at: o.short ? 6 : 7, position: P(b, 5, 2, 12), target: P(b, 0, 1.0, 6), fov: 34 }, { at: o.short ? 6.01 : 7.01, cut: true, position: P(b, 0, 3.5, 6), target: P(b, 0, 3.4, -3), fov: 40 }, { at: o.short ? 8 : 10.5, position: P(b, 0, 3.3, 4.5), target: P(b, 0, 3.2, -3), fov: 30 }], lines: [{ at: 0.4, until: 3.5, text: EVENTS[o.eventId]?.name ?? 'A WIN', who: 'DELL' }, { at: 3.6, until: 7, text: o.line ?? 'THE CAR WAS DRIVEN CORRECTLY. THE CROWD WAS INFORMED.', who: 'DELL' }], cues: [{ at: 0.3, run: () => { a.mix.sfx('fanfare2'); a.ctx.particles.burst('confetti', P(b, 0, 9, -3)); } }, { at: 1.3, run: () => a.ctx.particles.burst('confetti', P(b, -3, 9, -3)) }, { at: 2.3, run: () => a.ctx.particles.burst('confetti', P(b, 3, 9, -3)) }, { at: 3.6, run: () => a.mix.say(o.line ?? 'THE CAR WAS DRIVEN CORRECTLY.', 'dell') }, { at: 5, run: () => a.ctx.particles.burst('confetti', P(b, 0, 9, -3)) }], onEnd: () => { this.done = true; } });
    this.tl.play(); playShots(s, this.tl);
  }
  exit() { const s = this.app.scene; if (s) { s.camOverride = null; s.fx.length = 0; if (s.stageOpts) s.stageOpts.carFixed = false; s.carSpin = 0; for (const q of this.people ?? []) q.object.removeFromParent(); } }
  draw(ui, dt) {
    if (!this.tl) return; this.tl.update(dt);
    const barH = Math.round(this.tl.bars() * 22); ui.rect(0, 0, ui.w, barH, 'ink'); ui.rect(0, ui.h - barH, ui.w, barH, 'ink');
    const l = this.tl.line(); if (l) { ui.text(ui.cx, ui.h - 40 - (barH ? 0 : 0), `${l.who ? l.who + ': ' : ''}${l.text}`.slice(0, 66), { align: 'center', color: 'white' }); }
    ui.text(ui.cx, 4, 'THE WINNER', { align: 'center', color: 'sand' });
    if (this.done && !this.o.auto) { this.done = false; this.o.next(); } else if (this.done) this.o.next?.();
    if (this.app.actions.pressed('confirm') && !this.o.auto) this.tl.skip();
    ui.prompts([['confirm', 'SKIP']]);
  }
}
export class PrizeScreen {
  constructor(app, o) { this.id = 'prize'; this.app = app; this.o = o; this.noBack = true; this.lights = []; }
  enter() {
    const a = this.app, s = a.scene, o = this.o, ctx = a.ctx; s.stage('prize', { car: { carId: o.carId, install: null, y: 0.18 }, orbit: false, radius: 8, height: 2.2, angle: 0.5 }); s.stageOpts.carFixed = true; s.stageOpts.carYaw = 0.8;
    const b = s.base;
    this.cover = new Mesh(new BoxGeometry(2.6, 1.7, 5.2), toonMaterial(PALETTE.plum)); this.cover.position.set(b.x, 0.95, b.z); this.cover.rotation.y = 0.8; this.cover.castShadow = true; ctx.scene.add(this.cover);
    const light = (x, y, z, c, i) => { const h = ctx.lights.request({ position: [b.x + x, y, b.z + z], color: c, intensity: i, radius: 16, priority: 4, fadeIn: 0.6 }); this.lights.push(h); };
    const name = CAR_INFO[o.carId].name;
    this.tl = new Timeline({ bars: 0.5, shots: [{ at: 0, position: P(b, 0, 3.4, 10), target: P(b, 0, 1, 0), fov: 34 }, { at: 3, position: P(b, 3, 2.6, 8), target: P(b, 0, 1, 0), fov: 30 }, { at: o.short ? 6 : 9, position: P(b, 6, 1.5, 4.6), target: P(b, 0, 0.9, 0), fov: 34 }], lines: [{ at: 1, until: 3, text: 'A PRIZE.' }, { at: 4.2, until: o.short ? 6 : 9, text: name }], cues: [{ at: 0.7, run: () => light(-3, 5, 2, 0xffe0a0, 14) }, { at: 1.7, run: () => { light(3, 5, 2, 0xffe0a0, 14); a.mix.sfx('tick'); } }, { at: 2.6, run: () => { a.mix.sfx('whirr'); ctx.tweens.to(this.cover.position, { y: 6, z: b.z - 4 }, { duration: 1.5, ease: 'inOutQuad' }); } }, { at: 3.4, run: () => { a.mix.sfx('fanfare2'); light(0, 6, 5, 0xffffff, 18); ctx.engine.ambient.intensity = 1; ctx.particles.burst('confetti', P(b, 0, 6, 0)); } }, { at: 4.4, run: () => a.ui.say('fenn', o.line ?? 'PRIZE CARS ARE NOT FOR SALE. IT IS SIMPLY NOT DONE.', 4) }], onEnd: () => { this.done = true; } });
    this.tl.play(); playShots(s, this.tl);
  }
  exit() { const s = this.app.scene; if (s) { s.camOverride = null; if (s.stageOpts) s.stageOpts.carFixed = false; } this.cover?.removeFromParent(); for (const l of this.lights) l.release?.(); }
  draw(ui, dt) {
    if (!this.tl) return; this.tl.update(dt);
    const barH = Math.round(this.tl.bars() * 22); ui.rect(0, 0, ui.w, barH, 'ink'); ui.rect(0, ui.h - barH, ui.w, barH, 'ink');
    const l = this.tl.line(); if (l) ui.text(ui.cx, ui.h - 44, l.text, { align: 'center', scale: 2, color: 'sand' });
    if (this.done) { this.done = false; this.o.next?.(); }
    if (this.app.actions.pressed('confirm') && !this.o.auto) this.tl.skip();
    ui.prompts([['confirm', 'SKIP']]);
  }
}
// The credits, then the ending card in the catalogue voice.
export class EndingScreen {
  constructor(app, o) { this.id = 'ending'; this.app = app; this.o = o; this.t = 0; this.noBack = true; this.defaultFocus = 'go'; }
  enter() { const a = this.app; a.mix.music('longDrive'); a.scene.stage('map', { hour: 21, titleCam: true }); }
  draw(ui, dt) {
    this.t += dt; const rows = [TITLE, MAKER, '', 'INSPIRED BY', SOURCE.toUpperCase(), '', 'MS. ARAI, CHIEF EXAMINER', 'BENNO, MECHANIC', 'MR. FENN, DEALER', 'DELL, COMMENTATOR', '', 'BUILT ON PIXEL ENGINE 0.46.0', 'THREE.JS R186, RAPIER', 'THE SWEETIE 16 PALETTE BY GRAFXKID', '', 'THANK YOU FOR DRIVING.'], scroll = ui.h - this.t * 18;
    ui.panel(ui.cx - 140, 0, 280, ui.h, { color: 'ink', border: false, scan: true });
    if (scroll > -rows.length * 12 - 10) rows.forEach((r, k) => { const y = scroll + k * 12; if (y > -8 && y < ui.h - 20) ui.text(ui.cx, y, r, { align: 'center', color: k === 0 ? 'sand' : 'white' }); });
    else { ui.text(ui.cx, 96, ENDING_LINES[0], { align: 'center', scale: 2, color: 'white' }); ui.text(ui.cx, 118, ENDING_LINES[1], { align: 'center', scale: 2, color: 'sand' }); ui.button('go', ui.cx - 50, 160, 100, 16, 'CONTINUE', { confirm: () => this.o.next() }); }
    if (this.app.actions.pressed('confirm') && scroll > -rows.length * 12 - 10) this.t = 999;
    ui.prompts([['confirm', scroll > -rows.length * 12 - 10 ? 'SKIP' : 'CONTINUE']]);
  }
}
