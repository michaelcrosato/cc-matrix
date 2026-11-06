// Level scripts are generator functions: `yield 2` waits seconds, `yield () => cond` waits for a condition, `yield* a.say(...)`.
// Also dialogue, cutscenes (engine Timeline), and quick-time events.
import { Timeline } from '../../pixel-engine.js';
import { TUNING } from '../data/tuning.js';
import { blip, SPEAKERS } from '../audio/voice.js';

export class Scripts {
  constructor(area) {
    this.area = area; this.tasks = []; this.dlg = null; this.cut = null; this.qte = null; this.barks = []; this.skipHeld = 0; this.lineKey = null; this.lineBlip = 0;
  }
  start(fn, name = 'script') {
    const gen = fn(this.area);
    const task = { gen, wait: null, name, t: 0, done: false };
    this.tasks.push(task); this._advance(task);
    return task;
  }
  _advance(task) {
    try {
      const r = task.gen.next();
      if (r.done) { task.done = true; return; }
      task.wait = r.value;
      task.t = 0;
    } catch (err) { task.done = true; this.area.scriptError(err); }
  }
  /** Advance all tasks one fixed step. */
  update(dt) {
    for (const task of [...this.tasks]) {
      if (task.done) continue;
      const w = task.wait; let ready = false;
      if (w === undefined || w === null) ready = true;
      else if (typeof w === 'number') { task.t += dt; ready = task.t >= w; }
      else if (typeof w === 'function') ready = !!w();
      else ready = true;
      if (ready) this._advance(task);
    }
    this.tasks = this.tasks.filter((t) => !t.done);
  }
  get busy() { return !!(this.dlg || this.cut || this.qte); }
  // ---- dialogue ----
  *say(who, text, o = {}) {
    const a = this.area;
    const dlg = { who, text: text.toUpperCase(), typed: 0, advanced: false, last: -1, live: !!o.live, auto: o.auto ?? 0, t: 0, portrait: o.portrait };
    this.dlg = dlg;
    if (!dlg.live) a.freezeFor('dlg', true);
    yield () => dlg.advanced;
    this.dlg = null; if (!dlg.live) a.freezeFor('dlg', false);
  }
  /** Radio call: Pym with the on-hold jingle first. */
  *radio(who, text) { const a = this.area; a.audio('bell'); yield* this.say(who, text, { live: false, portrait: who }); }
  updateDialogue(dt, confirmPressed) {
    const d = this.dlg; if (!d) return;
    d.t += dt;
    const prev = Math.floor(d.typed);
    d.typed = Math.min(d.text.length, d.typed + 30 * dt);
    for (let i = prev; i < Math.floor(d.typed); i++) blip(this.area.ctx.audio, d.who in SPEAKERS ? d.who : 'ISLANDER', d.text, i, 0);
    if (confirmPressed || this.area.opts?.attract) { if (d.typed < d.text.length) d.typed = d.text.length; else d.advanced = true; }
    if (d.typed >= d.text.length && d.auto > 0 && d.t > d.text.length / 30 + d.auto) d.advanced = true;
  }
  /** A one-off line that doesn't pause the game: Max and the Dame bark. */
  bark(who, text, secs = 2.5) {
    this.barks = this.barks.filter((b) => b.who !== who);
    this.barks.push({ who, text, t: secs, typed: 0 });
    if (who in SPEAKERS) { const s = SPEAKERS[who]; /* a couple of blips */ for (let i = 0; i < 4; i += 2) blip(this.area.ctx.audio, who, text.toUpperCase(), i, 0); }
  }
  updateBarks(dt) { for (const b of this.barks) b.t -= dt; this.barks = this.barks.filter((b) => b.t > 0); }
  // ---- cutscenes ----
  *cutscene(def) {
    const a = this.area;
    let ended = false;
    const tl = new Timeline({ shots: def.shots || [], cues: (def.cues || []).map((c) => ({ ...c })), lines: def.lines || [], duration: def.duration, bars: def.bars ?? 0.6, onEnd: () => { ended = true; } });
    this.cut = { tl, def }; this.skipHeld = 0; this.lineKey = null;
    if (a.opts?.attract) { /* demo: no cutscenes */ }
    a.freezeFor('cut', true); a.onCutsceneStart?.(def);
    tl.play(); if (a.opts?.attract) tl.skip();
    yield () => ended;
    this.cut = null; a.freezeFor('cut', false); a.onCutsceneEnd?.(def);
  }
  updateCut(dt, skipHeld) {
    const c = this.cut; if (!c) return;
    if (skipHeld) { this.skipHeld += dt; if (this.skipHeld >= 0.6) c.tl.skip(); } else this.skipHeld = Math.max(0, this.skipHeld - dt * 2);
    c.tl.update(dt);
    const line = c.tl.line();
    if (line) {
      const key = line.at + ':' + line.text;
      if (this.lineKey !== key) { this.lineKey = key; this.lineBlip = 0; }
      const chars = Math.floor((c.tl.time - line.at) * 30);
      while (this.lineBlip < Math.min(chars, line.text.length)) { blip(this.area.ctx.audio, (line.who || 'ISLANDER').toUpperCase(), line.text.toUpperCase(), this.lineBlip, 0); this.lineBlip++; }
    }
  }
  // ---- quick-time events ----
  *qteRun(o) {
    const a = this.area;
    if (this.qte) { a.lastQte = false; return; } // one quick-time event at a time
    const q = { type: o.type || 'press', verb: o.verb || 'action', window: (o.window ?? 0.9) * (TUNING.qteWindow / 0.9), t: 0, need: o.need || (o.type === 'mash' ? 12 : 1), count: 0, result: null, label: o.label || '', last: null, bar: 0 };
    this.qte = q; a.qteBlocks = true; a.ctx.engine.timeScale = 0.5; a.audio('qte');
    yield () => q.result !== null;
    a.qteBlocks = false; a.ctx.engine.timeScale = 1; this.qte = null; a.lastQte = q.result;
    if (!q.result) a.audio('qteFail'); else a.audio('qte');
  }
  /** Fixed-step QTE update with this step's presses. */
  updateQte(dt, pressed) {
    const q = this.qte; if (!q || q.result !== null) return;
    q.t += dt * 2; // realtime: timeScale 0.5 halves dt
    if (q.type === 'press') { if (pressed[q.verb]) q.result = true; else if (pressed.wrong) q.result = false; }
    else if (q.type === 'mash') { if (pressed[q.verb]) q.count++; q.bar = q.count / q.need; if (q.count >= q.need) q.result = true; }
    else if (q.type === 'alternate') { for (const v of ['action', 'dodge']) if (pressed[v] && q.last !== v) { q.last = v; q.count++; } if (q.count >= q.need) q.result = true; q.bar = q.count / q.need; }
    if (q.result === null && q.t >= q.window) q.result = q.type === 'press' ? false : q.count >= q.need;
  }
}
