// Family Hour join screen, the AI Hub card, and the Medley podium.
import { BaseScene } from './base.js';
import { place, tileFloor, slab } from '../art/world.js';
import { makeAvatar, PLAYER_LOOKS, NPC_LOOKS } from '../art/avatar.js';
import { laneCamera, matXs } from './activity/lane.js';
import { Menu, panel, layoutLog, inRect } from '../ui/widgets.js';
import { say, sayWrapped, wrap } from '../ui/font.js';
import { drawPrompts } from '../ui/prompts.js';
import { glyph, GLYPH_MAP, promptRow } from '../art/glyphs.js';
import { MedleyState, windowStart } from '../core/medley.js';
import { SEAT_COLORS_HEX, SEAT_PALETTE } from '../core/seats.js';
import { MEDALS } from '../data/medley.js';
import { ACTIVITIES } from '../data/activities.js';
import { applySky, skyAt, THREE, toonMaterial, PALETTE } from '../../pixel-engine.js';
import { TITLE } from '../data/title.js';

const BOTS = [{ name: 'Dennis', look: 'dennis', skill: 'sloppy' }, { name: 'June', look: 'june', skill: 'good' }, { name: 'Marguerite', look: 'marguerite', skill: 'expert' }, { name: 'Kevin', look: 'coach', skill: 'average' }];
const padsNow = () => (typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()] : []);

export class JoinScene extends BaseScene {
  static id = 'join';
  static camera = { preset: 'fixed', position: [0, 3, 9.5], target: [0, 1, 0], fov: 32 };
  constructor(app, args) { super(app, args); this.seats = [null, null, null, null]; this.bots = true; this.prev = {}; this.phase = 'join'; this.attractOK = true; }
  async build(ctx) {
    applySky(ctx.engine, skyAt(10)); tileFloor(ctx, 16, 8, [0, 0, 0]); slab(ctx, [40, 0.2, 14], [0, -0.1, -9], 'cyan');
    this.avs = [];
    const xs = matXs(4);
    for (let i = 0; i < 4; i++) { place(ctx, 'yoga-mat', [xs[i], 0, 0.8], { palette: { mat: ['red', 'blue', 'green', 'sand'][i] === 'sand' ? 'orange' : ['red', 'blue', 'green'][i] } }); const a = await makeAvatar(ctx, PLAYER_LOOKS[i]); a.setPos(xs[i], 0, 0.8, 0); a.addTo(ctx.scene); a.play('Idle'); a.root.visible = false; a.shadow.visible = false; this.avs.push(a); }
    this.app.music('hoop');
  }
  claim(dev) {
    if (this.seats.some((s) => s?.dev === dev)) return false;
    const i = this.seats.findIndex((s) => !s); if (i < 0) return false;
    this.seats[i] = { dev, name: dev === 'kb' ? 'Keyboard + mouse' : `Pad ${+dev.slice(3) + 1}` };
    this.avs[i].root.visible = true; this.avs[i].shadow.visible = true; this.avs[i].play('Wave', { loop: false }); this.app.sfx('confirm'); return true;
  }
  count() { return this.seats.filter(Boolean).length; }
  tick(ctx, dt, blocked) {
    this.avs.forEach((a) => a.root.visible && a.update(dt));
    if (blocked) return; const nav = this.app.nav, inp = ctx.input;
    const pads = padsNow();
    pads.forEach((p, i) => { if (!p) return; const b = !!p.buttons?.[0]?.pressed, was = !!this.prev['p' + i]; this.prev['p' + i] = b; if (b && !was) { if (!this.claim('pad' + i) && this.seats.findIndex((s) => s?.dev === 'pad' + i) === 0 && false) this.start(); else if (this.seats.some((s) => s?.dev === 'pad' + i) && this.pressedTwice('pad' + i)) this.start(); } });
    const kbPress = inp.wasPressed('Enter', 'KeyE', 'Space') || inp.wasPressed('MouseLeft');
    if (kbPress) { if (!this.claim('kb')) { if (this.pressedTwice('kb')) this.start(); } }
    // headless: PadCross through the engine counts as pad 0
    if (inp.wasPressed('PadCross') && !pads.some(Boolean)) { if (!this.claim('pad0')) { if (this.pressedTwice('pad0')) this.start(); } }
    if (nav.triangle) { this.bots = !this.bots; this.app.sfx('confirm', { volume: 0.5 }); }
    if (nav.back || nav.rclick) { this.app.sfx('back'); this.app.go('title', { menu: true }); }
    if (nav.pause && this.count()) this.start();
    this.last = { kb: kbPress };
  }
  pressedTwice(dev) { const k = 'tw' + dev; const t = this.t; const prev = this.prev[k] ?? -9; this.prev[k] = t; return t - prev < 1.2 && t - prev > 0.15 ? true : false; }
  specs() {
    const out = [];
    this.seats.forEach((s, i) => { if (s) out.push({ kind: s.dev === 'kb' ? 'local' : 'pad', pad: s.dev.startsWith('pad') ? +s.dev.slice(3) : undefined, name: this.seats.filter(Boolean).length > 1 || true ? `Player ${i + 1}` : 'You', look: PLAYER_LOOKS[i], seat: i }); });
    if (this.bots) { let b = 0; while (out.length < (out.length === 1 ? 3 : 4) && b < BOTS.length) { const bt = BOTS[b++]; out.push({ kind: 'bot', skill: bt.skill, name: bt.name, look: bt.look, seat: out.length }); } }
    return out;
  }
  start() { if (!this.count() || this.starting) return; this.starting = true; this.app.startMedley(this.specs()); }
  draw(hud) {
    const w = hud.width;
    say(hud, w / 2, 10, 'Family Hour', { anchor: 'c', scale: 3, color: 'white', shadow: 'navy' });
    say(hud, w / 2, 40, 'Join a mat. Pads and a keyboard. Everyone wobbles.', { anchor: 'c', color: 'white' });
    const cw = Math.min(100, (w - 30) / 4);
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(w / 2 - cw * 2 + i * cw + 2), y = hud.height - 92;
      hud.rect(x, y, cw - 4, 56, 'night'); hud.rect(x, y, cw - 4, 6, SEAT_PALETTE[i]);
      const s = this.seats[i];
      say(hud, x + (cw - 4) / 2, y + 14, s ? s.name : 'Empty mat', { anchor: 'c', color: s ? 'white' : 'slate' });
      if (s) say(hud, x + (cw - 4) / 2, y + 28, 'Ready', { anchor: 'c', color: 'lime' }); else promptRow(hud, this.app.device.glyphSet, [['confirm', 'Join']], x + 4, y + 30);
    }
    say(hud, w / 2, hud.height - 30, `Bots fill empty mats: ${this.bots ? 'On' : 'Off'}`, { anchor: 'c', color: 'sand' });
    drawPrompts(this.app, hud, this.count() ? [['confirm', 'Join / Start again'], ['triangle', 'Bots'], ['back', 'Back']] : [['confirm', 'Join'], ['back', 'Back']]);
  }
  status() { return `join | ${this.count()} joined | bots ${this.bots}`; }
  extraState() { return { seats: this.seats.map((s) => s?.dev ?? null), bots: this.bots }; }
}

export class CardScene extends BaseScene {
  static id = 'card';
  static camera = { preset: 'fixed', position: [0, 3, 9.5], target: [0, 1, 0], fov: 32 };
  constructor(app, args) { super(app, args); this.phase = 'card'; this.avs = []; }
  async build(ctx) {
    const app = this.app, info = app.session; applySky(ctx.engine, skyAt(10));
    tileFloor(ctx, 16, 8, [0, 0, 0]); slab(ctx, [40, 0.2, 14], [0, -0.1, -9], 'cyan');
    const n = Math.min(4, info.players.length), xs = matXs(Math.max(n, 2));
    const r = app.rng('card');
    for (let i = 0; i < n; i++) {
      const base = PLAYER_LOOKS[Math.floor(r() * 6) % 6];
      place(ctx, 'yoga-mat', [xs[i], 0, 0.8], { palette: { mat: SEAT_PALETTE[i] === 'sand' ? 'orange' : SEAT_PALETTE[i] } });
      const a = await makeAvatar(ctx, { ...base, top: SEAT_PALETTE[i] === 'sand' ? 'orange' : SEAT_PALETTE[i] }); a.setPos(xs[i], 0, 0.8, 0); a.addTo(ctx.scene); a.play('Idle'); this.avs.push(a);
    }
    app.music('plaza');
    this.enter = (e) => { if (e.key === 'Enter') app.net?.answer('ready'); };
    if (typeof window !== 'undefined') window.addEventListener('keydown', this.enter);
  }
  dispose() { if (typeof window !== 'undefined') window.removeEventListener('keydown', this.enter); super.dispose?.(); }
  tick(ctx, dt, blocked) {
    const app = this.app, net = app.net, nav = app.nav; this.avs.forEach((a, i) => { a.update(dt); const rd = net?.cardState.ready?.includes(i); if (rd && a.curName !== 'Cheer') a.play('Cheer'); });
    if (nav.confirm && !(ctx.input.wasPressed('Enter'))) net?.answer('ready');
    if (nav.triangle) net?.answer('more');
    if (net?.started && !this.leaving) { this.leaving = true; app.beginSessionMedley(); }
    const t = net ? net.time() : -Infinity; this.countdown = t > -Infinity && t < 0 ? Math.ceil(-t) : null;
  }
  draw(hud) {
    const w = hud.width, app = this.app, net = app.net, info = app.session, cs = net?.cardState ?? {};
    say(hud, w / 2, 10, TITLE, { anchor: 'c', scale: 4, color: 'white', shadow: 'navy' });
    say(hud, w / 2, 40, 'Score the most across three events. Stay in the circle.', { anchor: 'c', color: 'sand' });
    info.players.slice(0, 4).forEach((p, i) => {
      const [x, y] = this.projectMat(hud, i);
      const rd = cs.ready?.includes(p.id);
      say(hud, x, y, p.name, { anchor: 'c', color: SEAT_PALETTE[i] === 'sand' ? 'sand' : 'white' });
      say(hud, x, y + 11, rd ? 'Ready' : 'Not yet', { anchor: 'c', color: rd ? 'lime' : 'slate' });
      hud.rect(Math.round(x) - 18, Math.round(y) - 6, 36, 2, SEAT_PALETTE[i]);
    });
    const set = app.device.glyphSet, dev = app.device.last === 'pad' ? 'pad' : app.device.last;
    const cy = hud.height - 46;
    hud.rect(0, cy - 8, w, 54, 'night');
    say(hud, 12, cy, 'Lean: stick, WASD or mouse. Breathe: R2, Space or click. Step: L1/R1, F/J.', { color: 'white' });
    promptRow(hud, set, [['ready', 'Ready'], ['more', 'More time']], 12, cy + 14);
    const left = cs.left == null ? '' : `Starts in ${Math.ceil(cs.left / 1000)}s`;
    say(hud, w - 12, cy + 16, cs.paused ? 'Paused: more time' : left, { anchor: 'r', color: 'sand' });
    if (this.countdown) say(hud, w / 2, hud.height / 2 - 20, String(this.countdown), { anchor: 'c', scale: 8, color: 'white', shadow: 'navy' });
    layoutLog.add('card-foot', 0, cy - 8, w, 54);
  }
  projectMat(hud, i) { const xs = matXs(Math.max(this.avs.length, 2)), v = new THREE.Vector3(xs[i], 0, 1.6).project(this.ctx.camera.camera); return [(v.x + 1) / 2 * hud.width, (1 - v.y) / 2 * hud.height]; }
  status() { return `card | ready ${JSON.stringify(this.app.net?.cardState.ready ?? [])}`; }
}

export class PodiumScene extends BaseScene {
  static id = 'podium';
  static camera = { preset: 'fixed', position: [0, 2.6, 9], target: [0, 1.4, 0], fov: 32 };
  constructor(app, args) { super(app, args); this.phase = 'podium'; this.attractOK = false; }
  async build(ctx) {
    const app = this.app, m = app.medley; applySky(ctx.engine, skyAt(16)); tileFloor(ctx, 16, 8, [0, 0, 0]); slab(ctx, [40, 0.2, 14], [0, -0.1, -9], 'cyan');
    this.rank = m.ranking(); this.awards = m.awards(); this.totals = m.totals();
    const xs = [0, -2.1, 2.1, 4.2], hs = [1.1, 0.8, 0.55, 0.3];
    this.avs = [];
    for (let k = 0; k < this.rank.length; k++) {
      const spec = m.specs[this.rank[k].i], hx = k === 0 ? 0 : k === 1 ? -2.1 : k === 2 ? 2.1 : -4.2;
      slab(ctx, [1.8, hs[k], 1.6], [hx, hs[k] / 2, 0], k === 0 ? 'sand' : k === 1 ? 'mist' : k === 2 ? 'orange' : 'slate'); ctx.scene.add;
      const look = typeof spec.look === 'string' ? NPC_LOOKS[spec.look] : (spec.look ?? PLAYER_LOOKS[k % 6]);
      const a = await makeAvatar(ctx, look); a.setPos(hx, hs[k], 0.2, 0); a.addTo(ctx.scene); a.play(k === 0 ? 'Victory' : k === 1 ? 'Cheer' : k === 2 ? 'Wave' : 'Slump'); this.avs.push(a);
    }
    this.ounce = place(ctx, 'ounce', [3.6, 0, 1.6], { scale: 1.2 }).object;
    app.music('plaza'); app.sfx('fanfare2');
    this.finalize();
    if (!app.session) this.menu = new Menu([{ label: 'Rematch', onSelect: () => app.startMedley(m.specs) }, { label: 'Back to the menu', onSelect: () => app.go('title', { menu: true }) }], { w: 170, rowH: 17, name: 'podium', onMove: () => app.sfx('move', { volume: 0.4 }) });
  }
  finalize() {
    const app = this.app, m = app.medley; if (!app.session || !app.net) return;
    const mi = m.specs.findIndex((s) => s.kind === 'local'); const me = Math.max(0, mi);
    app.net.result({ score: this.totals[me] ?? 0, stats: { Stillness: m.scores[0][me], Beat: m.scores[1][me], Balance: m.scores[2][me] }, awards: this.awards[me] ?? [] });
  }
  tick(ctx, dt, blocked) { this.avs.forEach((a) => a.update(dt)); this.ounce.position.y = Math.abs(Math.sin(this.t * 2)) * 0.1; if (this.menu && !blocked) this.menu.update(this.app.nav); }
  draw(hud) {
    const w = hud.width, m = this.app.medley, pw = Math.min(Math.floor(w * 0.42), 200), x = 10;
    panel(hud, x, 10, pw, 26 + this.rank.length * 15 + 6);
    say(hud, x + pw / 2, 15, 'The Medley', { anchor: 'c', scale: 2, color: 'teal', shadow: false });
    this.rank.forEach((r, k) => { const s = m.specs[r.i], y = 36 + k * 15; say(hud, x + 8, y, MEDALS[Math.min(k, 3)].slice(0, 6), { color: k === 0 ? 'orange' : 'slate', shadow: false }); say(hud, x + 56, y, s.name.slice(0, 10), { color: 'ink', shadow: false }); say(hud, x + pw - 8, y, String(r.v), { anchor: 'r', color: 'blue', shadow: false }); });
    const aw = this.awards[this.rank[0].i]?.[0];
    const winner = m.specs[this.rank[0].i];
    const lines = [aw ? `${aw.title}: ${aw.detail}` : '', winner.kind !== 'bot' ? 'Excellent! ...Compared to Dennis.' : 'The recording was better than you. It always is.'].filter(Boolean);
    hud.rect(0, hud.height - 100, w, 14 * lines.length + 6, 'night');
    lines.forEach((l, i) => say(hud, w / 2, hud.height - 96 + i * 13, l, { anchor: 'c', color: i === 0 ? 'white' : 'sand' }));
    if (this.menu) { this.menu.o.x = Math.floor((w - 170) / 2); this.menu.o.y = hud.height - 74; this.menu.draw(hud); }
    drawPrompts(this.app, hud, [['confirm', 'Choose']]);
  }
  status() { return `podium | ${this.totals.join(',')}`; }
  extraState() { return { totals: this.totals, rank: this.rank.map((r) => r.i) }; }
}
