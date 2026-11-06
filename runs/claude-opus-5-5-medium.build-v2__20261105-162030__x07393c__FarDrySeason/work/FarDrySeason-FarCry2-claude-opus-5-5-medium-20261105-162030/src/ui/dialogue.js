// Subtitles, voices and the short first-person scenes: the camera holds on the speaker, two buttons at most.
import { LINES, SPEAKERS } from '../content/dialogue.js';
import { pressed } from '../core/actions.js';
export class Talk {
  queue = []; current = null; scene = null; barkText = null; barkT = 0;
  constructor(game) { this.game = game; }
  voiceOf(id) { return SPEAKERS[id]?.voice ?? 'soldier'; }
  say(who, text, secs) { const t = text.toUpperCase(); const line = { who, text: t, secs: secs ?? Math.max(1.6, t.length * 0.062) }; if (this.current?.text === t || this.queue.some((l) => l.text === t)) return; this.queue.push(line); }
  linesOf(id) { const l = LINES[id]; return l ?? []; }
  /** Play a named set of lines as subtitles, no lock. */
  playLines(id, speaker) { for (const [who, text] of this.linesOf(id)) this.say(speaker ?? who, text); }
  bark(name, text) { this.barkText = `${name}: ${text.toUpperCase()}`; this.barkT = 2.4; }
  clear() { this.game.scenes.clear(); this.queue.length = 0; this.current = null; this.scene?.key?.release(); this.scene = null; this.barkText = null; }
  locksPlayer() { return !!this.scene || this.game.scenes.locks; }
  /** A scene: the camera holds on `at` (a speaker's head), lines play, optional choices end it. */
  startScene({ lines = [], speaker, at, camera, choices, onDone, skippable = true }) {
    const g = this.game, npc = speaker ? g.people.npcs[speaker] : null;
    const focus = at ?? (npc ? [npc.x, npc.y + 1.3, npc.z] : null);
    const items = lines.flatMap((id) => (typeof id === 'string' ? this.linesOf(id) : [id]));
    this.scene = { items, i: -1, t: 0, focus, camera, choices, onDone, skippable, choosing: false, focusI: 0, npc };
    if (focus && !camera) {
      const p = g.player, e = p.eyeNow().clone(); const dx = focus[0] - e.x, dz = focus[2] - e.z, l = Math.hypot(dx, dz) || 1;
      const dist = Math.min(l, 1.5); this.scene.camera = { position: [focus[0] - (dx / l) * dist, focus[1] + 0.12, focus[2] - (dz / l) * dist], target: focus };
    }
    if (this.scene.camera) g.cam.override = this.scene.camera;
    if (focus) this.scene.key = g.ctx.lights.request({ position: [(focus[0] + this.scene.camera.position[0]) / 2, focus[1] + 0.5, (focus[2] + this.scene.camera.position[2]) / 2], color: 0xffe6c0, intensity: 7, radius: 6, priority: 6 });
    this.queue.length = 0; this.current = null;
    if (npc) { const k = Math.atan2(g.player.x - npc.x, g.player.z - npc.z); npc.turned = npc.yaw; npc.yaw = k; }
    this.nextLine();
  }
  nextLine() {
    const s = this.scene; if (!s) return;
    s.i++; s.t = 0;
    if (s.i >= s.items.length) {
      if (s.choices) { s.choosing = true; this.current = null; return; }
      this.endScene(); return;
    }
    const [who, text] = s.items[s.i], tx = text.toUpperCase();
    s.dur = Math.max(1.8, tx.length * 0.07);
    this.current = { who, text: tx, secs: 1e9 };
    this.game.audio.voice(this.voiceOf(who), tx);
  }
  endScene(choice) {
    const s = this.scene, g = this.game; this.scene = null; this.current = null; s.key?.release();
    if (s.camera) g.cam.override = null;
    if (s.npc && s.npc.turned !== undefined) { s.npc.yaw = s.npc.turned; }
    s.onDone?.(choice);
  }
  /** In update(): menus and scenes live here, with dt that may be zero. */
  update(dt, realDt) {
    const g = this.game, input = g.ctx.input;
    if (this.barkT > 0) this.barkT -= realDt;
    const s = this.scene;
    if (s) {
      if (s.choosing) {
        const n = s.choices.length;
        if (pressed(input, 'left') || pressed(input, 'up')) { s.focusI = (s.focusI + n - 1) % n; g.audio.play('ui-move'); }
        if (pressed(input, 'right') || pressed(input, 'down')) { s.focusI = (s.focusI + 1) % n; g.audio.play('ui-move'); }
        const hit = g.hud.choiceHit(s, n);
        if (hit !== null) s.focusI = hit;
        if (pressed(input, 'confirm') || g.hud.clicked(s, n)) { g.audio.play('ui-confirm'); const c = s.choices[s.focusI]; this.endScene(c); c.fn?.(); }
        return;
      }
      s.t += realDt;
      if (s.t >= s.dur || (s.skippable && s.t > 0.15 && pressed(input, 'confirm'))) this.nextLine();
      return;
    }
    if (this.current) { this.current.secs -= realDt; if (this.current.secs <= 0) this.current = null; }
    if (!this.current && this.queue.length) { this.current = this.queue.shift(); const v = this.voiceOf(this.current.who); if (v !== 'none') g.audio.voice(v, this.current.text); }
  }
  subtitle() { const l = this.game.scenes.line(); if (l) return { who: SPEAKERS[l.who]?.name ?? '', color: SPEAKERS[l.who]?.color ?? 'white', text: l.text }; return this.current ? { who: SPEAKERS[this.current.who]?.name ?? '', color: SPEAKERS[this.current.who]?.color ?? 'white', text: this.current.text } : null; }
}
