// Beats are a small step language. A new chapter is a new data file: see docs/CONTENT.md.
// Steps: {wait}, {until}, {run}, {zone}, {scene,shots}, {lines}, {say}, {objective}, {music}, {flag}, {spawn}, {wave}, {waitWave}, {openGate}, {hint}, {radio}, {checkpoint}, {cover}.
import { PYM_HINTS, PYM_OPEN, SCENES } from '../data/dialogue.js';
export class Script {
  constructor(area, steps, o = {}) { this.area = area; this.steps = steps; this.i = 0; this.t = 0; this.id = o.id; this.done = false; this.started = false; this.onDone = o.onDone; }
  fixed(dt) {
    const A = this.area;
    for (let guard = 0; guard < 40 && !this.done; guard++) {
      if (this.area.scripts.indexOf(this) < 0 && this.started0) return; this.started0 = true;
      const s = this.steps[this.i]; if (!s) { this.done = true; if (this.id) A.markBeat(this.id); this.onDone?.(); return; }
      if (!this.started) { this.started = true; this.t = 0; this.begin(s); }
      this.t += guard === 0 ? dt : 0;
      if (!this.ready(s)) return;
      this.i++; this.started = false;
    }
  }
  begin(s) {
    const A = this.area;
    if (s.run) s.run(A);
    if (s.stage) { A.enterStage(s.stage); this.done = true; }
    if (s.objective !== undefined) A.setObjective(s.objective);
    if (s.music !== undefined) A.app.mix.play(s.music);
    if (s.flag) A.run.flags[s.flag] = true;
    if (s.openGate) A.openGateNamed(s.openGate);
    if (s.hint) A.showHint(s.hint);
    if (s.radio) A.radio(s.radio);
    if (s.spawn) for (const [type, col, row, o] of s.spawn) A.spawnEnemy(type, A.level.wx(col), A.level.wz(row), o);
    if (s.wave) this.waveObj = A.startWave(s.wave);
    if (s.scene) { A.player && (A.player.locked = true); A.playCutscene({ shots: typeof s.shots === 'function' ? s.shots(A) : s.shots, lines: SCENES[s.scene], cues: s.cues, duration: s.duration }); }
    if (s.lines) A.sayLines(SCENES[s.lines]);
    if (s.say) A.say(s.say[0], s.say[1], s.say[2]);
    if (s.checkpoint) A.checkpoint();
    if (s.cover) A.fadeOut = s.cover;
  }
  ready(s) {
    const A = this.area;
    if (s.wait != null && this.t < s.wait) return false;
    if (s.until && !s.until(A)) return false;
    if (s.zone) { const P = A.player, [x0, y0, x1, y1] = s.zone, c = A.level.col(P.pos.x), r = A.level.row(P.pos.z); if (P.floor || c < x0 || c > x1 || r < y0 || r > y1) return false; }
    if (s.scene) { if (A.cutscene && !A.cutscene.finished) return false; A.endCutscene(); if (A.player) A.player.locked = false; }
    if (s.lines && s.block && A.subsBusy()) return false;
    if (s.waitWave && !(this.waveObj?.finished)) return false;
    return true;
  }
}
/** Spawns a list through doors, respecting maxActive. */
export class Wave {
  constructor(area, o) { this.area = area; this.o = o; this.queue = []; for (const [type, n, extra] of o.groups) for (let k = 0; k < n; k++) this.queue.push({ type, extra }); if (o.shuffle !== false) area.rng.shuffle(this.queue); this.every = o.every ?? 1.2; this.t = o.delay ?? 0; this.alive = 0; this.spawned = []; }
  get finished() { return !this.queue.length && this.spawned.every((e) => e.dead) && !this.stopped || this.stopped; }
  fixed(dt) {
    if (this.stopped || !this.queue.length) return; this.t -= dt * (1 + (this.area.rank() - 2) * 0.08); if (this.t > 0) return;
    const A = this.area, cap = this.o.maxActive ?? A.maxActiveNow(); if (A.enemies.filter((e) => !e.dead).length >= cap) { this.t = 0.4; return; }
    const q = this.queue.shift(); const doors = this.o.doors ?? '12345'; const spot = this.o.at ? A.rng.pick(this.o.at) : this.pickDoor(doors); if (!spot) return;
    const e = A.spawnEnemy(q.type, spot.x + A.rng.range(-0.3, 0.3), spot.z + A.rng.range(-0.3, 0.3), { ...(this.o.spawnOpt || {}), ...(q.extra || {}) }); this.spawned.push(e); this.t = this.every;
  }
  pickDoor(doors) { const A = this.area, P = A.player; const list = doors.split('').map((d) => A.level.spawns[d]).filter(Boolean); if (!list.length) return null; const far = list.filter((s) => !P || Math.hypot(s.x - P.pos.x, s.z - P.pos.z) > 7); return A.rng.pick(far.length ? far : list); }
  stop() { this.stopped = true; this.queue = []; }
}
export const pymLine = (key) => [{ who: 'PYM', text: PYM_OPEN }, { who: 'PYM', text: PYM_HINTS[key] ?? PYM_HINTS.general }];
