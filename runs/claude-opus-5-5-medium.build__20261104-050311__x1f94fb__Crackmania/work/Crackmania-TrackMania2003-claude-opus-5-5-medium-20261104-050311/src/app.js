// The app: what every scene shares. Tracks compiled and cached with their geometry, physics and route; the medal times
// (the bot's author runs, worked out once and on demand); the environment views; the profile; the story's dialog box
// and characters; sound helpers.
import { compileTurtle, Track } from './track.js';
import { TRACKS, PUZZLES, ENV_INFO } from './data.js';
import { buildTrack } from './geometry.js';
import { TrackPhysics } from './physics.js';
import { decoFor } from './deco.js';
import { Course, botRun } from './run.js';
import { CFG } from './config.js';
import { babble } from './audio.js';
import { text, panel, COL } from './ui.js';

const E = globalThis.My3D2dge;
export const STEPS_PER_S = 120;
export function medalTimes(author) {
  const up = (v, q) => Math.ceil(v / q) * q, s = author / 120;
  return { author, gold: Math.round(up(s * CFG.medalGold, .1) * 120), silver: Math.round(up(s * CFG.medalSilver, 1) * 120), bronze: Math.round(up(s * CFG.medalBronze, 1) * 120) };
}
export function medalFor(steps, M) { if (!M || steps == null) return 0; return steps <= M.author ? 4 : steps <= M.gold ? 3 : steps <= M.silver ? 2 : steps <= M.bronze ? 1 : 0; }

export class App {
  constructor(game, o = {}) {
    this.game = game; this.headless = !!o.headless; this.views = {}; this.cache = new Map(); this.authors = {}; this.flags = {};
    this.dialog = new DialogBox(this); this.typed = [];
  }
  trackProg(id) { return TRACKS.find(t => t.id === id) || null; }
  puzzle(id) { return PUZZLES.find(p => p.id === id) || null; }
  /** a shipped track by id (compiled once) */
  track(id) {
    const p = this.trackProg(id); if (p) return compileTurtle({ ...p, heading: 0 });
    const z = this.puzzle(id); if (z) return compileTurtle({ id: z.id, env: z.env, name: z.name, start: z.start, code: z.solution, heading: 0 });
    return null;
  }
  /** everything a track needs to race: { track, geo, deco, phys, course } (cached by key) */
  prepare(track, key = null) {
    const k = key || (track.id ? track.id + ':' + track.version : null);
    if (k && this.cache.has(k)) return this.cache.get(k);
    const geo = buildTrack(track), deco = decoFor(track), phys = new TrackPhysics(track, geo, deco), course = new Course(track, geo, phys);
    const P = { track, geo, deco, phys, course, key: k };
    if (k) this.cache.set(k, P);   // (shipped tracks and puzzles: 21 at most, kept for the visit; editor tracks aren't cached)
    return P;
  }
  /** show a prepared track in its environment's world (not headless) */
  show(P) {
    const v = this.views[P.track.env]; if (!v) return null;
    if (v.loaded !== P) { v.load(P.track, P.geo, P.deco); v.loaded = P; }
    this.view = v; return v;
  }
  /** the author time (steps) of a shipped track or puzzle: the bot at skill 1 */
  author(id) {
    if (this.authors[id]) return this.authors[id];
    const t = this.track(id); if (!t) return null;
    const P = this.prepare(t, id), r = botRun(P.course, ENV_INFO[t.env].car, { skill: 1 });
    return (this.authors[id] = r.finished ? r.steps : null);
  }
  medals(id) { const a = this.author(id); return a ? medalTimes(a) : null; }
  rebake(id) { delete this.authors[id]; if (id) return this.author(id); for (const t of TRACKS) this.author(t.id); }
}

// ---- the story's dialog box: a portrait, typewriter text, gibberish voices ----
export const CAST = {};
export function makeCast() {
  if (CAST.coco) return CAST;
  CAST.coco = { name: 'COCO', voice: 'coco', rig: new E.Humanoid({ build: 'heroic', hair: 'ponytail', hat: { style: 'helmet', color: '#ffd030' }, outfit: 'coat', weapon: null, colors: { skin: '#f0c8a0', hair: '#5a2a1a', coat: '#ff7a1a', cloth: '#ff9a2a', pants: '#3a4a6a', trim: '#e8f0f0', belt: '#d8e8e8' } }) };
  CAST.drapeau = { name: 'MONSIEUR DRAPEAU', voice: 'drapeau', rig: new E.Humanoid({ hat: 'cap', outfit: 'shirt', weapon: null, colors: { skin: '#f0c8a0', hair: '#2a2a2a', cloth: '#f4f4f4', pants: '#1a1a20', hat: '#1a1a20' } }) };
  CAST.tex = { name: 'TEX MIRAGE', voice: 'tex', rig: new E.Humanoid({ hat: { style: 'cap', color: '#c8964a' }, outfit: 'tunic', cape: { len: 5, width: 5, seg: 2.5 }, weapon: null, colors: { skin: '#d8a070', hair: '#3a2a1a', cloth: '#ff8a2a', cape: '#c86a2a', pants: '#5a4a3a' } }) };
  CAST.grav = { name: 'MLLE GRAVILLON', voice: 'grav', rig: new E.Humanoid({ hat: { style: 'band', color: '#2a2a3a' }, hair: 'long', outfit: 'coat', weapon: null, colors: { skin: '#f4d0b0', hair: '#1a1a2a', coat: '#9a5ae8', cloth: '#ffffff', pants: '#2a2a3a' } }) };
  CAST.bobo = { name: 'BOBO YETI', voice: 'bobo', rig: new E.Humanoid({ build: 'bulky', hood: true, weapon: null, colors: { skin: '#c8d8e8', hair: '#f4f8ff', cloth: '#e8f0ff', pants: '#c8d4e8' } }) };
  for (const k in CAST) CAST[k].rig.update(.01, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 });
  return CAST;
}
export class DialogBox {
  constructor(app) { this.app = app; this.q = []; this.cur = null; this.t = 0; this.open = false; }
  /** lines: [[who, text, expr?], ...]; o: { modal (true), auto (seconds per line when not modal), onDone } */
  say(lines, o = {}) { this.q = lines.map(l => Array.isArray(l) ? l : ['coco', l]); this.o = Object.assign({ modal: true }, o); this.next(); }
  next() {
    this.cur = this.q.shift() || null; this.t = 0; this.open = !!this.cur;
    if (!this.cur) { const f = this.o && this.o.onDone; this.o = null; if (f) f(); return; }
    const c = makeCast()[this.cur[0]] || CAST.coco; babble(this.app.game, this.cur[1], c.voice);
  }
  get modal() { return this.open && this.o && this.o.modal; }
  update(dt) {
    if (!this.open) return false;
    this.t += dt; const c = CAST[this.cur[0]] || CAST.coco; c.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: this.cur[2] === 'cheer' ? 'cheer' : this.cur[2] === 'wave' ? 'wave' : this.cur[2] === 'hips' ? 'hips' : undefined, expr: this.cur[3] || 'smile' });
    const I = this.app.game.input, full = this.t * 30 >= this.cur[1].length;
    if (this.o.modal) {
      if (I.pressed('confirm') || I.clicked()) { if (full) this.next(); else this.t = 99; }
      else if (I.pressed('cancel')) { this.q = []; this.next(); }
      return true;
    }
    if (this.t > (this.o.auto || 3)) this.next();
    return false;
  }
  draw(g, W, H, o = {}) {
    if (!this.open) return;
    const c = makeCast()[this.cur[0]] || CAST.coco, modal = this.o.modal, w = Math.min(W - 24, modal ? 420 : 330), x = Math.round((W - w) / 2), h = modal ? 84 : 52, y = modal ? H - h - 30 : 46;
    const ps = modal ? 56 : 40, tx = x + ps + 14;
    panel(g, x, y, w, h, { accent: '#ffd23a', alpha: modal ? .92 : .8 });
    c.rig.drawPortrait(g, x + 6, y + 6, ps, { zoom: modal ? 3 : 2.2, turn: .5, bg: '#1a2050', frame: true });
    E.font.text(g, c.name, tx, y + 6, '#ffd23a', { outline: '#10101a' });
    const shown = this.cur[1].slice(0, Math.floor(this.t * 30));
    E.font.text(g, shown, tx, y + 18, COL.text, { scale: modal ? 2 : 1, outline: '#10101a', wrap: w - ps - 22 });
    if (this.o.modal && this.t * 30 >= this.cur[1].length && Math.floor(this.t * 3) % 2) E.font.text(g, '▸', x + w - 12, y + h - 12, '#ffd23a', {});
  }
}
