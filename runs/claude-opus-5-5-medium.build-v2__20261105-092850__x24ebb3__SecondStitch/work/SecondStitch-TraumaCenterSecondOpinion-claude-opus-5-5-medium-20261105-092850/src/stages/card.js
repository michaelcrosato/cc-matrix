// The game's own card: OR-7 wide with one masked figure per player; ready marks; how to win; controls; time left.
import { app } from '../core/app.js';
import { Stage, setView } from './stage.js';
import { buildSet, buildFigure } from '../view/sets.js';
import { TITLE } from '../core/meta.js';
import { BTN } from '../input/devices.js';
import { OperationStage } from './operation.js';

const CAPS = ['red', 'blue', 'green', 'sand'];
export class CardStage extends Stage {
  name = 'card';
  constructor(net, onReady) { super(); this.net = net; this.onReadyCb = onReady; this.card = { left: null, ready: [], asked: false }; this.t = 0; this.figs = []; }
  async build(ctx) {
    this.set = await buildSet(ctx, 'or7');
    app.applyLook(1, 0.4, 0);
    app.director?.play('or-calm');
    const P = this.net.players;
    P.forEach((p, i) => { const f = buildFigure(ctx, 'ilya', this.set.group, [-1.8 + i * 1.2, 0, 2.2], 0.2 - i * 0.1, { masked: true, scrub: CAPS[i], cap: CAPS[i], style: 'bald', tag: `card${i}` }); this.figs.push(f); });
    window.AIHub.on('card', (c) => { this.card = c; });
    window.AIHub.on('start', () => this.begin());
    this.hitReady = null; this.hitMore = null;
  }
  onReady() { this.onReadyCb?.(); }
  status() { return `card ready=${this.card.ready?.length ?? 0}`; }
  begin() { if (this.started) return; this.started = true; app.engine.loadGame(new OperationStage({ op: this.net.opId, state: this.net.state, net: this.net, seats: this.net.players.map(() => ({ device: 'net' })) })); }
  update(ctx, dt) {
    const hub = window.AIHub;
    app.devices.poll(ctx, dt);
    this.t += dt;
    this.set.update(dt); app.director?.update(dt);
    this.figs.forEach((f, i) => { f.update(dt); if (this.card.ready?.includes(this.net.players[i].id) && !f.wave) { f.wave = true; f.play('Wave'); } });
    setView(ctx, [2.6 + Math.sin(this.t * 0.2) * 0.4, 2.8, 7], [0, 1, 0], 34);
    const { hud } = ctx, W = hud.width, H = hud.height, P = app.prompts, input = ctx.input;
    hud.clear();
    const tw = hud.measure(TITLE, 3).width;
    hud.text(Math.round(W / 2 - tw / 2), 10, TITLE, { scale: 3, color: 0xf6f2e6, shadow: 0x5e1430 });
    const def = this.net.def;
    const label = def.title, lw = hud.measure(label, 2).width;
    hud.text(Math.round(W / 2 - lw / 2), 38, label, { scale: 2, color: 0xffd24d });
    P.draw(hud, 14, 60, 'KEEP THE PATIENT ALIVE AND TOP THE TEAM SCORE.', { width: W - 28, center: true, color: 0x8ad0ff });
    P.draw(hud, 14, 74, 'MOVE: {move}  USE: {use}  TOOL: {tool:1}  GIFT: {gift}', { width: W - 28, center: true });
    this.net.players.forEach((p, i) => {
      const x = Math.round(W / 2 - 170 + (i % 2) * 180), y = 92 + Math.floor(i / 2) * 14;
      const ready = this.card.ready?.includes(p.id);
      hud.rect(x, y + 1, 6, 6, this.net.colors[i]);
      hud.text(x + 10, y, String(p.name).slice(0, 18), { color: this.net.colors[i] });
      if (ready) hud.text(x + 124, y, 'READY', { color: 0x7fffa0 });
    });
    const left = this.card.left;
    const status = this.card.starting ? 'STARTING...' : this.card.paused ? 'HOLDING' : left != null ? `STARTS IN ${Math.ceil(left / 1000)}` : '';
    hud.text(Math.round(W / 2 - hud.measure(status).width / 2), H - 58, status, { color: 0xffffff });
    const by = H - 42, bw = 120, gap = 8, bx = Math.round(W / 2 - bw - gap / 2);
    const iAmReady = this.card.ready?.includes(this.net.info.me);
    hud.rect(bx, by, bw, 18, iAmReady ? 0x2bb673 : 0x8a1f38); P.draw(hud, bx, by + 5, 'READY {confirm}', { width: bw, center: true });
    hud.rect(bx + bw + gap, by, bw, 18, this.card.asked ? 0x5a6172 : 0x1a1f2b); P.draw(hud, bx + bw + gap, by + 5, 'MORE TIME {more}', { width: bw, center: true });
    const pad = app.devices.pads.find(Boolean);
    const hit = (b) => pad && pad.buttons[b] > 0.5 && !(pad.prev[b] > 0.5);
    if (!this.net.server) {
      if (input.wasPressed('Enter') || hit(BTN.CROSS)) { hub.answer('ready'); ctx.audio.play('uiConfirm'); }
      if (input.wasPressed('KeyM') || hit(BTN.TRIANGLE)) { hub.answer('more'); ctx.audio.play('uiMove'); }
      const c = app.devices.click(input);
      if (c && c.y >= by && c.y <= by + 18) { if (c.x < bx + bw) hub.answer('ready'); else hub.answer('more'); }
    }
  }
}
