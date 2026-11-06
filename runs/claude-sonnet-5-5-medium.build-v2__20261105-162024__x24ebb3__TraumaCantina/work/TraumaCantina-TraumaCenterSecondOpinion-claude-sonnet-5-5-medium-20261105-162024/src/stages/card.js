// The game's own AI Hub card: OR-7 wide shot, a masked figure per player in their seat colour, ready marks, how to win, controls, time left.
import { THREE } from '../../pixel-engine.js';
import { app } from '../app.js';
import { ctext, mtext, textW, wrap, prompts, COL } from '../ui/hud.js';
import { buildSet } from '../view/sets.js';
import { LOOK } from '../core/look.js';
import { TITLE } from '../core/meta.js';
import { PAD } from '../input/devices.js';
const SEATC = ['red', 'blue', 'green', 'sand'];
export class CardStage {
  name = 'Card';
  constructor(a) { this.a = a; this.card = { left: null, ready: [], asked: false, starting: false }; }
  async setup(ctx) {
    this.ctx = ctx; this.t = 0; ctx.engine.setLook(LOOK(1, 0.45, 0)); const { ensureKit } = await import('../view/sets.js'); await ensureKit(); this.set = buildSet(ctx, 'or7'); ctx.engine.sun.intensity = 0.3;
    const info = this.a.info; this.players = info.players;
    // masked figures per player in their seat colour
    this.set.figures.forEach((f) => f.group.removeFromParent()); this.set.figures.length = 0;
    this.players.forEach((p, i) => { const f = this.set.fig('ilya', -3 + i * 2, 1.8, 0.2 - i * 0.15, 'Idle'); f.group.traverse((o) => { if (o.isMesh && o.material) { } }); });
    app.director.start(ctx, 'or-calm', 0); this.me = info.players.findIndex((p) => p.id === info.me); this.hover = null;
  }
  setCard(c) { Object.assign(this.card, c); }
  cameraTarget() { return new THREE.Vector3(0, 1.6, 0); }
  status() { return `card ready=${(this.card.ready || []).length}`; }
  update(ctx, dt) {
    const hud = ctx.hud, dev = app.devices, inp = ctx.input; dev.poll(dt, ctx); this.t += dt; this.set.update(dt, this.t); const cam = ctx.camera.camera; cam.position.set(Math.sin(this.t * 0.3) * 1.2, 3.6, 8.6); cam.fov = 46; cam.updateProjectionMatrix(); cam.lookAt(0, 1.5, 0); cam.updateMatrixWorld?.(true);
    const nav = dev.nav; const AIHub = window.AIHub;
    if (inp.wasPressed('Enter') || dev.anyPadPress(PAD.X) || (nav.click && nav.click[0] > hud.width - 130 && nav.click[1] > hud.height - 40)) AIHub.answer('ready');
    if (inp.wasPressed('KeyM') || dev.anyPadPress(PAD.TRI) || (nav.click && nav.click[0] < 130 && nav.click[1] > hud.height - 40)) AIHub.answer('more');
    hud.clear(); const w = hud.width, h = hud.height; hud.rect(0, 0, w, 54, 'ink'); hud.rect(0, h - 74, w, 74, 'ink');
    ctext(hud, 6, TITLE, { scale: 3, color: 'white' }); ctext(hud, 36, 'CONSULT - SHARED TABLE', { color: 'sand' });
    this.players.forEach((p, i) => { const x = 30 + i * 112, rd = (this.card.ready || []).includes(p.id); hud.rect(x, 62, 104, 16, SEATC[i]); hud.rect(x + 1, 63, 102, 14, 'ink'); hud.text(x + 5, 66, String(p.name || '').slice(0, 11).toUpperCase(), { color: typeof p.color === 'string' ? parseInt(p.color.replace('#', ''), 16) : COL[SEATC[i]] }); if (rd) hud.text(x + 80, 66, 'OK', { color: 'lime' }); });
    const left = this.card.left; mtext(hud, 8, h - 70, 'GOAL: KEEP THE PATIENT ALIVE AND TOP THE TEAM SCORE.', { color: 'white' });
    const pad = dev.last === 'pad'; mtext(hud, 8, h - 58, pad ? 'LEFT STICK MOVES. R2 USES. RIGHT STICK PICKS A TOOL. L2 GIFT.' : 'MOUSE MOVES. CLICK USES. 1-8 PICK A TOOL. SPACE GIFT.', { color: 'mist' });
    mtext(hud, 8, h - 46, 'ODD SEATS HOLD THE QUIET. EVEN SEATS PRESS THE SECOND LOOK.', { color: 'mist' });
    ctext(hud, h - 34, this.card.starting ? 'STARTING...' : this.card.paused ? 'COUNTDOWN HELD' : left != null ? `ROUND STARTS IN ${Math.ceil(left / 1000)}` : 'WAITING FOR PLAYERS', { color: 'sand' });
    hud.rect(w - 126, h - 30, 120, 22, 'green'); hud.text(w - 110, h - 24, 'READY', { color: 'ink', scale: 1, shadow: false }); hud.rect(6, h - 30, 120, 22, this.card.asked ? 'orange' : 'navy'); hud.text(18, h - 24, 'MORE TIME', { color: 'white' });
    prompts(hud, app, [{ act: 'confirm', label: 'READY' }, { act: 'extra', label: 'MORE TIME' }], 'center', h - 14);
  }
}
