// Dialogue: the camera holds on the speaker, subtitles run line by line, then at most two big buttons.
import { SEQ } from '../content/dialogue.js';
import { pressed } from '../core/actions.js';

export class DialogueSystem {
  name = 'dialogue';
  queue = []; cur = null; t = 0; done = null; npcId = null; held = false; speakerName = {};
  setup(g) { this.g = g; g.dialogue = this; g.dialogueOn = false; }
  /** play a sequence id (or an array of [who,text]); focus = NPC id to hold the camera on; cb runs at the end */
  play(seq, { focus = null, cb = null, choices = null } = {}) {
    const g = this.g; const lines = Array.isArray(seq) ? seq : (SEQ[seq] || []);
    this.queue = lines.map((l) => [...l]); this.cb = cb; this.choices = choices; this.focus = focus; g.dialogueOn = true; this.cur = null; this.t = 0;
    if (!lines.length) this.finish();
  }
  speakerOf(who) { const g = this.g; if (who === 'buddy') return g.buddies?.focusBuddyId() || 'ines'; if (who === 'civ') return 'concord'; return who; }
  next() {
    const g = this.g; const l = this.queue.shift(); if (!l) return this.finish();
    const who = this.speakerOf(l[0]); const text = l[1]; const secs = Math.max(2.2, Math.min(7, text.length * 0.07)); this.cur = { who, text, until: secs }; this.t = 0;
    g.subtitle = null; g.say(text, who, secs);
    const npc = g.npcs?.view(who === 'player' ? this.focus : who);
    if (npc && who !== 'player') { const f = g.player.feet; const dx = f.x - npc.pos.x, dz = f.z - npc.pos.z, d = Math.hypot(dx, dz) || 1; npc.yaw = Math.atan2(-dx, -dz); const cx = npc.pos.x + dx / d * 2.8, cz = npc.pos.z + dz / d * 2.8; g.camState.override = { position: [cx, npc.pos.y + 1.65, cz], target: [npc.pos.x, npc.pos.y + 1.55, npc.pos.z] }; }
  }
  finish() {
    const g = this.g; g.dialogueOn = false; g.camState.override = null; this.cur = null; g.subtitle = null;
    const cb = this.cb; this.cb = null;
    if (this.choices) { const spec = this.choices; this.choices = null; g.ui.open('choice', { title: spec.title, options: spec.options.map((o) => ({ label: o.label, run: (gg) => { o.run?.(gg); cb?.(o); } })), top: 180 }); } else cb?.();
  }
  skipAll() { this.queue = []; this.finish(); }
  fixed(g, dt) {
    if (!g.dialogueOn) return;
    if (!this.cur) { this.next(); return; }
    this.t += dt;
    if (this.t > this.cur.until) this.next();
  }
  frame(g) {
    if (!g.dialogueOn) return;
    if (pressed(g.ctx.input, 'skip') && this.t > 0.4) { this.t = 99; }
    if (g.ctx.input.wasPressed('Backspace') || g.ctx.input.wasPressed('PadCircle')) this.skipAll();
  }
  state() { return { dialogue: this.cur ? { who: this.cur.who, text: this.cur.text } : null }; }
}
