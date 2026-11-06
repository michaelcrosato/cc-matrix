// Attract mode: after 10 s idle on the title or main menu, a looping scripted tour of the game. Any input exits.
import { BEATS } from './beats.js';
import { ALL_KB, ALL_PAD } from '../core/actions.js';
import { drawPrompt, codeFor } from '../ui/glyphs.js';

export class AttractSystem {
  name = 'attract';
  active = false; beat = -1; t = 0; botKeys = new Set(); from = null; loops = 0; lastPtr = null; sawUser = false; touched = false;
  setup(g) {
    this.g = g; g.attract = this;
    if (typeof window !== 'undefined') {
      const hit = () => { if (this.active) this.userInput = true; };
      for (const ev of ['keydown', 'mousedown', 'pointerdown', 'touchstart', 'wheel']) window.addEventListener(ev, hit, { passive: true });
      window.addEventListener('mousemove', (e) => { if (this.active && (Math.abs(e.movementX) + Math.abs(e.movementY) > 0)) this.userInput = true; });
    }
    const baseOverlay = g.overlayDraw;
    g.overlayDraw = (hud) => { baseOverlay?.(hud); if (this.active) this.overlay(hud); if (g.dev) g.dev.overlays(hud); };
  }
  key(code, on) { this.botKeys[on ? 'add' : 'delete'](code); this.g.ctx.input.setKey(code, on); }
  start() {
    const g = this.g; if (this.active || g.session) return;
    this.active = true; this.from = g.ui.screen ? g.ui.screen.id : 'title'; this.beat = -1; this.t = 0; this.userInput = false; this.loops = 0;
    g.save_disabled = true; g.ui.closeAll(); g.mode = 'attract'; g.hudHidden = false; g.godMode = true; g.infiniteAmmo = true; g.noJams = true; g.invisibleToAI = false; g.camState.override = null;
    this.reset(); this.next();
  }
  reset() { const g = this.g; g.soldierSys.clear(); g.vehSys.reset(); g.sitesSys.despawnAll(); g.fireSys.reset(); g.grassSys.reset(); g.ui.closeAll(); g.mapSys.raise(false); g.camState.override = null; g.body.hp = 100; g.body.fever.active = false; g.body.burning = false; g.player.seated = false; try { g.player.ctrl.body.setEnabled(true); } catch { /* ok */ } g.train.stop(); g.buddies.reset(); for (const c of [...this.botKeys]) this.key(c, false); g.hideViewmodel = false; g.weapons.views.hidden = false; g.surgeryActive = false; g.body.heal = null; g.itemHide?.(); g.monocularOn = false; }
  next() {
    const g = this.g; this.beat = (this.beat + 1) % (BEATS.length + 1); this.t = 0; if (this.beat === 0 && this.loops++ > 0) { /* looped */ }
    this.reset();
    if (this.beat === BEATS.length) { g.flow.titleCamera?.(0); g.mode = 'attract'; g.camState.override = { position: [-198, 60, -298], target: [-256, 38, -304] }; g.world.hour = 17.3; g.fireSys.grid.ignite(-300, -280, 14); this.cur = { name: 'The title', dur: 7, tick: (gg, dt, t) => { gg.flow.titleCamera?.(dt); } }; return; }
    this.cur = BEATS[this.beat]; g.mode = 'attract';
    try { this.cur.setup(g); } catch (e) { g.ctx.engine.errors?.push?.('attract beat ' + this.cur.name + ': ' + e.message); this.beat = this.beat; }
    g.audioSys.attractSong = ['day', 'fight', 'fight', 'night', 'fever', 'fever', 'day', 'fight', 'stalk', 'fight', 'title', 'title'][this.beat] || 'title';
    try { g.ctx.engine.screen.reveal('dither'); } catch { /* headless */ }
  }
  stop() {
    const g = this.g; if (!this.active) return; this.active = false; this.reset();
    g.godMode = false; g.infiniteAmmo = false; g.noJams = false; g.save_disabled = false; g.flow.resetWorld(); g.flow.startTitle();
    if (this.from === 'main') { g.ui.stack.pop(); g.ui.open('main'); }
    for (const c of ['MouseLeft', 'MouseRight', 'KeyT']) g.ctx.input.setKey(c, false);
    g.events.emit('attractend');
  }
  userActed() {
    const g = this.g, input = g.ctx.input;
    if (this.userInput) return true;
    for (const c of input.state().held) if (!this.botKeys.has(c) && !c.startsWith('Pad')) return true;
    for (const c of ALL_PAD) if (input.isDown(c)) return true;
    if (Math.hypot(input.padAxis.x, input.padAxis.y) > 0.3) return true;
    if (input.isDown('Touch') || input.isDown('MouseMiddle')) return true;
    if (input.mouseButtons > 0 && !this.botKeys.has('MouseLeft') && !this.botKeys.has('MouseRight')) return true;
    const p = input.pointer; const moved = this.lastPtr && (Math.abs(p.x - this.lastPtr.x) + Math.abs(p.y - this.lastPtr.y) > 1e-4); this.lastPtr = { x: p.x, y: p.y };
    return !!moved;
  }
  fixed(g, dt) {
    if (!this.active) return;
    if (this.beat >= 0 && this.t === 0) { this.userInput = false; this.lastPtr = null; }
    this.t += dt;
    if (this.cur?.tick) { try { this.cur.tick(g, dt, this.t); } catch { /* a beat may lose its target */ } }
    if (this.t > this.cur.dur - 0.7 && !this.covering) { this.covering = true; try { g.ctx.engine.screen.cover('dither'); } catch { /* headless */ } }
    if (this.t >= this.cur.dur) { this.covering = false; this.next(); }
    g.godMode = true; g.body.hp = Math.max(g.body.hp, this.beat === 5 || this.beat === 7 ? 0 : 60);
  }
  frame(g, dt) { if (this.active && this.userActed()) this.stop(); }
  overlay(hud) {
    const g = this.g, W = hud.width, H = hud.height;
    hud.rect(10, 10, 50, 12, 0x0d1020); hud.text(16, 13, 'DEMO', { color: 'red' }); hud.text(70, 13, (this.cur?.name || '').toUpperCase(), { color: 'sand' });
    if (Math.floor(g.ui.frameN / 30) % 2 === 0) { const w = hud.measure('PRESS ', 1).width + 16; const x = Math.round((W - w) / 2), y = H - 24; hud.text(x, y + 2, 'PRESS', { color: 'white' }); drawPrompt(hud, x + hud.measure('PRESS ').width, y, '@' + (codeFor('confirm', g.device) || 'Enter'), '', g.device, g.glyphSet); }
  }
  state() { return { attract: this.active ? { beat: this.beat, name: this.cur?.name, t: +this.t.toFixed(1), loops: this.loops } : null }; }
}
