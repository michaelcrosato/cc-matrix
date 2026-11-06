// The beat language. A beat runs once per claim: it waits for its trigger, then runs its steps in order.
//   trigger: { on: 'start' } | { on: 'enter', zone: [c0, r0, c1, r1], floor? } | { on: 'flag', flag } | { on: 'kills', n }
//   steps:   say, radio, cut, spawn, objective, music, flag, until, wait, openGate, hint, run, checkpoint, mood
export class BeatRunner {
  constructor(area, beats) {
    this.area = area;
    this.running = [];
    this.pending = [];
    const done = area.savedBeats();
    const pos = area.run.areaData(area.id).beatPos ?? {};
    for (const b of beats ?? []) {
      if (done[b.id]) continue;
      // A beat that checkpointed mid-way carries on from just after that checkpoint.
      if (pos[b.id] !== undefined) { this.running.push({ beat: b, i: pos[b.id], t: 0, wait: null }); continue; }
      this.pending.push(b);
    }
  }

  triggered(b) {
    const { area } = this;
    const on = b.trigger ?? { on: 'start' };
    switch (on.on) {
      case 'start': return true;
      case 'enter': {
        const p = area.player;
        if (!p || !p.alive) return false;
        if (on.floor !== undefined && p.floor !== on.floor) return false;
        const c = area.level.info.col(p.x); const r = area.level.info.row(p.z);
        return c >= on.zone[0] && c <= on.zone[2] && r >= on.zone[1] && r <= on.zone[3];
      }
      case 'flag': return !!area.run?.flag(on.flag);
      case 'when': return !!on.fn(area);
      default: return false;
    }
  }

  step(dt) {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const b = this.pending[i];
      if (this.triggered(b)) {
        this.pending.splice(i, 1);
        this.running.push({ beat: b, i: 0, t: 0, wait: null });
      }
    }
    for (let i = this.running.length - 1; i >= 0; i--) {
      const r = this.running[i];
      if (this.advance(r, dt)) {
        this.running.splice(i, 1);
        this.area.markBeat(r.beat.id);
      }
    }
  }

  /** Returns true when the beat has finished. */
  advance(r, dt) {
    let guard = 0;
    while (guard++ < 64) {
      if (r.wait) {
        if (!r.wait(dt)) return false;
        r.wait = null;
      }
      const s = r.beat.steps[r.i++];
      if (!s) return true;
      this.exec(s, r);
    }
    return false;
  }

  exec(s, r) {
    const { area } = this;
    if (s.say) { area.talk.bark(s.say[0], s.say[1], { prio: 2 }); }
    if (s.lines) { const d = area.talk.lines(s.lines); if (s.block !== false) r.wait = d; }
    if (s.radio) { const d = area.radioCall(s.radio, s.jingle !== false); if (s.block !== false) r.wait = d; }
    if (s.cut) { const d = area.playCut(s.cut); r.wait = d; }
    if (s.spawn) area.beatSpawn(s.spawn);
    if (s.objective !== undefined) area.setObjective(s.objective);
    if (s.music !== undefined) area.setMusic(s.music);
    if (s.flag) area.run?.setFlag(s.flag, s.value ?? true);
    if (s.hint) area.showHint(s.hint, s.action, s.time);
    if (s.openGate) area.openGateAt(s.openGate[0], s.openGate[1]);
    if (s.checkpoint) {
      const data = area.run.areaData(area.id);
      (data.beatPos = data.beatPos ?? {})[r.beat.id] = r.i;
      area.checkpoint(area.entry);
    }
    if (s.mood) area.world.setMood(s.mood);
    if (s.run) s.run(area, r);
    if (s.wait !== undefined) { let t = s.wait; r.wait = (dt) => { t -= dt; return t <= 0; }; }
    if (s.until) { const f = s.until; r.wait = () => f(area); }
  }
}
