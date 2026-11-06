// Story scene: set + 3D busts. Confirm advances; hold the skip button to skip. Typewriter text with gibberish voice.
import { THREE } from '../../pixel-engine.js';
import { app } from '../app.js';
import { go } from '../core/nav.js';
import { SCENE_BY_ID } from '../content/scenes.js';
import { CAST } from '../content/cast.js';
import { buildSet } from '../view/sets.js';
import { buildBust } from '../view/bust.js';
import { Speaker } from '../audio/speak.js';
import { ctext, mtext, wrap, prompts, textW, tokens } from '../ui/hud.js';
import { LOOK } from '../core/look.js';
const BX = 300; // busts live far from the set
export class StoryStage {
  name = 'Story';
  constructor(a) { this.a = a; this.scene = SCENE_BY_ID[a.sceneId]; }
  async setup(ctx) {
    this.ctx = ctx; this.t = 0; this.i = -1; const eng = ctx.engine; eng.setLook(LOOK(1, 0.35, 0));
    const { ensureKit } = await import('../view/sets.js'); await ensureKit();
    this.set = buildSet(ctx, this.scene.set); if (this.scene.id === 'end' || this.scene.set === 'ward') { this.set.rain?.removeFromParent?.(); this.set.rain = null; } this.speaker = new Speaker(app); this.busts = {}; this.skipT = 0; this.cam = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 46 };
    // bust stage: backdrop and lights
    const m = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 0.4), (await import('../../pixel-engine.js')).toonMaterial(0x2a2f48)); m.position.set(BX, 1.6, -3); ctx.scene.add(m); this.backdrop = m;
    ctx.lights.request({ position: [BX + 2, 3.6, 4], color: 0xfff0e0, intensity: 10, radius: 12, priority: 9 }); ctx.lights.request({ position: [BX - 3, 2.4, 3], color: 0x8ab0ff, intensity: 5, radius: 10, priority: 8 });
    this.shotWide = this.set.shots.wide; this.mode = 'wide'; app.director.start(ctx, this.scene.music, 0);
    this.rainT = 0; this.sceneRain = ['ward', 'office', 'roof', 'or7'].includes(this.scene.set) && this.scene.id !== 'end'; this.mouth = 0; this.advance(ctx); this.act0 = app.devices.activity;
    this.leaving = false; this.wasSkip = false;
  }
  cameraTarget() { return this.cam.tgt; }
  status() { return `story ${this.scene.id} beat ${this.i}/${this.scene.beats.length}`; }
  bust(id) { if (!this.busts[id]) { const b = buildBust(id); b.group.position.set(BX, 0, 0); b.group.visible = false; this.ctx.scene.add(b.group); this.busts[id] = b; } return this.busts[id]; }
  advance(ctx) {
    this.i++; if (this.a.attract && this.i >= (this.a.attract.beats || 99)) return this.finish(ctx); if (this.i >= this.scene.beats.length) return this.finish(ctx);
    const b = this.scene.beats[this.i], prev = this.scene.beats[this.i - 1];
    this.mode = b.who === 'narrator' || b.who === 'system' ? 'wide' : 'talk'; this.beat = b; this.speaker.start(b.who, b.say, { silent: b.who === 'narrator' }); ctx.audio.play('uiMove', { volume: 0.4 });
    if (b.cue === 'horn') ctx.audio.play('horn'); if (b.cue === 'clipboard') { ctx.audio.play('stamp', { volume: 0.6 }); ctx.engine.shake.add(0.3); }
    for (const [id, bu] of Object.entries(this.busts)) bu.group.visible = false;
    if (this.mode === 'talk') {
      const sp = this.bust(b.who); sp.group.visible = true; sp.setEmotion(b.emo); this.speakerBust = sp; sp.group.position.x = BX + (prev && prev.who !== b.who && prev.who !== 'narrator' ? 0.9 : 0); sp.group.rotation.y = -0.1;
      if (prev && prev.who !== b.who && prev.who !== 'narrator' && prev.who !== 'system') { const ob = this.bust(prev.who); ob.group.visible = true; ob.group.position.set(BX - 1.9, -0.1, -0.6); ob.group.rotation.y = 0.5; ob.group.scale.setScalar(0.85); this.other = ob; ob.setEmotion('neutral'); } else this.other = null;
      this.cam.pos.set(BX + 0.3, 1.75, 5.1); this.cam.tgt.set(BX, 1.42, 0); this.cam.fov = 30;
    } else { const w = this.shotWide; this.cam.pos.set(...w.pos); this.cam.tgt.set(...w.target); this.cam.fov = w.fov; this.speakerBust = null; }
    // wide-shot figure animation
    const fi = { reyes: 0, ilya: 1, pem: 2 }; for (const f of this.set.figures) f.play('Idle');
    if (b.emo === 'angry' && this.set.figures[0]) this.set.figures[0].play('Shout');
    ctx.camera.camera.fov = this.cam.fov; ctx.camera.camera.updateProjectionMatrix();
  }
  finish(ctx) { if (this.leaving) return; this.leaving = true; app.devices.rumbleAll(0, 0, 1); if (this.a.attract) return go.attractNext?.(ctx, this.a.attract); if (this.a.next) this.a.next(); else if (this.a.back === 'menu') go.menu(ctx); else go.menu(ctx); }
  update(ctx, dt) {
    const hud = ctx.hud, dev = app.devices; dev.poll(dt, ctx); const nav = dev.nav; this.t += dt; this.set.update(dt, this.t); this.speaker.update(ctx, dt);
    const cam = ctx.camera.camera, k = Math.min(1, dt * 6);
    if (this.mode === 'wide') { const wob = Math.sin(this.t * 0.2) * 0.4; cam.position.lerp(new THREE.Vector3(this.cam.pos.x + wob, this.cam.pos.y, this.cam.pos.z), k); cam.lookAt(this.cam.tgt); } else { cam.position.copy(this.cam.pos); cam.position.x += Math.sin(this.t * 0.4) * 0.06; cam.lookAt(this.cam.tgt); }
    cam.updateMatrixWorld?.(true);
    for (const [id, b] of Object.entries(this.busts)) if (b.group.visible) { const mine = b === this.speakerBust; b.update(dt, mine ? this.speaker.mouth : 0, this.t); b.group.traverse((o) => { if (o.material && o.isMesh && o.material.color) { } }); }
    if (this.set.rain || this.sceneRain) { this.rainT -= dt; if (this.rainT <= 0) { this.rainT = 0.5; ctx.audio.play('rain', { volume: 0.5 }); } }
    // attract: auto advance
    if (this.a.attract) { if (dev.activity !== this.act0 && this.t > 0.4) return go.title(ctx, { swallow: true }); if (this.speaker.done) { this.hold = (this.hold || 0) + dt; if (this.hold > 1.2) { this.hold = 0; this.advance(ctx); } } }
    else {
      if (nav.confirm || nav.click) { if (!this.speaker.done) this.speaker.skip(); else this.advance(ctx); }
      this.skipT = nav.skipHeld ? this.skipT + dt : 0; if (this.skipT > 0.7 && !this.leaving) this.finish(ctx);
    }
    // HUD
    hud.clear(); const w = hud.width, h = hud.height, b = this.beat; if (!b) return;
    if (this.mode === 'wide') { hud.rect(0, 0, w, 20, 'ink'); hud.rect(0, h - 70, w, 70, 'ink'); } else { hud.rect(0, h - 70, w, 70, 'ink'); hud.rect(0, h - 71, w, 1, 'navy'); }
    const nm = b.who === 'narrator' ? '' : (CAST[b.who]?.name || b.who.toUpperCase()); if (nm) { const lx = this.other && this.mode === 'talk' ? Math.round(w * 0.55) : 8; hud.rect(lx, h - 82, textW(hud, nm) + 12, 12, 'navy'); hud.text(lx + 6, h - 80, nm, { color: 'sand' }); }
    const lines = wrap(hud, tokens(app, this.speaker.shown), w - 40, 1).slice(0, 3); lines.forEach((l, i) => mtext(hud, 20, h - 62 + i * 12, l, { color: 'white', hi: 'sand' }));
    if (this.speaker.done) { const b2 = Math.round(Math.sin(this.t * 6) * 2); hud.sprite(w - 24, h - 20 + b2, ['xxxxx', '.xxx.', '..x..'], { x: 'sand' }); }
    ctext(hud, 5, this.scene.title, { color: 'mist' });
    prompts(hud, app, [{ act: 'confirm', label: 'NEXT' }, { act: 'skip', label: 'HOLD TO SKIP' }], w - 190, h - 20);
    if (this.skipT > 0) hud.rect(0, h - 3, Math.round(w * Math.min(1, this.skipT / 0.7)), 3, 'sand');
    if (this.a.attract) ctext(hud, 30, 'DEMO - PRESS ANY BUTTON', { scale: 2, color: ((this.t * 2) | 0) % 2 ? 'sand' : 'white' });
  }
  dispose() {}
}
