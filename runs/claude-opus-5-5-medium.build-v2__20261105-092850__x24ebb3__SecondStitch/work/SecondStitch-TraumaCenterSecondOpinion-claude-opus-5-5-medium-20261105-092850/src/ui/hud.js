// The operating HUD: top strip, comm strip, tool wheel, pop-ups, Code Blue, Massage.
import { CAST } from '../content/cast.js';
import { TOOL_ICONS } from '../content/icons.js';
import { TOOLS } from '../sim/tools.js';
import { defOf } from '../sim/op.js';

const RCOL = { CLEAN: 0x7fffa0, GOOD: 0x8ad0ff, SLOPPY: 0xffb04d, MISTAKE: 0xff5a5a };

export class OpHud {
  constructor(app, ctx) {
    this.app = app; this.ctx = ctx;
    this.ekg = new Array(70).fill(0); this.ekgT = 0; this.ekgPhase = 0;
    this.popups = []; this.comm = []; this.current = null; this.typed = 0; this.promptText = null; this.promptT = 0;
    this.wheelT = 0; this.wheelSlot = -1; this.stageFlash = 0; this.toast = null;
    this.tabHit = []; this.wheelHit = null;
  }
  say(who, text) { if (!text) return; this.comm.push({ who, text }); if (this.comm.length > 4) this.comm.splice(0, this.comm.length - 3); }
  prompt(text) { this.promptText = text; this.promptT = 7; }
  rating(r, x, y, pts, streak) { this.popups.push({ r, x, y, t: 1, pts, streak }); }

  updateComm(dt, audio) {
    if (!this.current && this.comm.length) { this.current = { ...this.comm.shift(), t: 0, i: 0, n: 0 }; this.typedChar = 0; }
    if (this.current) {
      const c = this.current, plain = c.text.replace(/\{[^}]+\}|\*/g, '');
      const speed = 40 * (this.app.settings.textSpeed ?? 1) * (CAST[c.who]?.voice?.speed ?? 1);
      const prev = Math.floor(c.i);
      c.i = Math.min(plain.length, c.i + dt * speed);
      const now = Math.floor(c.i);
      for (let k = prev; k < now; k++) {
        const end = plain.slice(k).search(/[.!?]/);
        const punct = end >= 0 ? plain[k + end] : '';
        if (this.app.voice.letter(audio, plain[k], c.who, CAST[c.who], k, punct)) c.talk = 0.1;
      }
      c.talk = Math.max(0, (c.talk ?? 0) - dt);
      if (c.i >= plain.length) { c.t += dt; if (c.t > 1.8 + plain.length * 0.018 || (this.comm.length && c.t > 0.9)) this.current = null; }
    }
    return this.current;
  }

  draw(sim, dt, seatsInfo, opts = {}) {
    const { hud, input } = this.ctx, app = this.app, W = hud.width, H = hud.height, P = app.prompts;
    hud.clear();
    const seat = sim.seats[opts.mySeat ?? 0] ?? sim.seats[0];
    const t = sim.tables[seat?.table ?? 0] ?? sim.tables[0];
    const def = defOf(sim) ?? opts.def;
    const shown = t.fake ?? t.vitals;
    const crit = shown < 30;
    // top strip
    hud.rect(0, 0, W, 21, 0x0d0b14);
    hud.rect(0, 21, W, 1, crit ? 0xff3a3a : 0x2a3142);
    hud.text(4, 3, 'VITALS', { color: crit ? 0xff6b6b : 0x7fffa0 });
    hud.text(44, 3, String(Math.ceil(shown)).padStart(2, '0'), { color: crit ? 0xff5a5a : 0x7fffa0, scale: 2, shadow: false });
    // EKG
    const rate = crit ? 2.2 : 1.1, sdt = dt * (sim.quiet ? 0.25 : 1);
    this.ekgT += sdt * 60;
    while (this.ekgT > 1) {
      this.ekgT -= 1;
      this.ekgPhase = (this.ekgPhase + (rate / 60) * 1.0) % 1;
      const p = this.ekgPhase;
      let v = p < 0.08 ? 3 : p < 0.1 ? 12 : p < 0.13 ? -6 : p < 0.2 ? 1 : p < 0.3 ? 3 : 0;
      if (t.fake != null) v += Math.sin(this.ekg.length * p * 40) * 3; // the monitor lies; the trace can't
      if (sim.phase === 'codeblue') v = 0;
      this.ekg.push(v); this.ekg.shift();
    }
    const ekgX = 70;
    const narrow = W < 400;
    if (!narrow) for (let i = 1; i < this.ekg.length; i++) hud.rect(ekgX + i, 11 - Math.round(this.ekg[i]) / 1.6, 1, 1, crit ? 0xff3a3a : 0x46e0a0);
    // clock
    const c = Math.max(0, sim.clock), mm = String(Math.floor(c / 60)).padStart(1, '0'), ss = String(Math.floor(c % 60)).padStart(2, '0');
    const clockStr = `${mm}:${ss}`, cw = hud.measure(clockStr, 2).width;
    hud.text(Math.round(W / 2 - cw / 2), 3, clockStr, { color: c < 30 ? 0xff5a5a : 0xffffff, scale: 2 });
    // table tabs
    this.tabHit = [];
    if (sim.tables.length > 1) {
      sim.tables.forEach((tb, i) => {
        const x = Math.round(W / 2 - 66 + i * 46), y = 25, on = i === seat.table;
        hud.rect(x, y, 42, 14, on ? 0x8a1f38 : 0x1a1f2b);
        hud.text(x + 3, y + 3, 'ABC'[i], { color: 0xffffff });
        hud.text(x + 14, y + 3, String(Math.ceil(tb.vitals)), { color: tb.vitals < 30 ? (Math.floor(this.ctx.time * 6) % 2 ? 0xff5a5a : 0xffffff) : 0x7fffa0 });
        this.tabHit.push({ i, x, y, w: 42, h: 14 });
      });
    }
    // composure
    if (sim.giftOn) {
      const bw = Math.min(100, Math.round(W * 0.2)), bx = W - bw - 4;
      hud.text(bx, 2, seat.gift === 'look' ? (narrow ? 'LOOK' : 'THE SECOND LOOK') : (narrow ? 'QUIET' : 'THE QUIET'), { color: sim.quiet ? 0xffffff : 0xb8c0d0 });
      hud.rect(bx, 12, bw, 6, 0x2a3142);
      hud.rect(bx, 12, Math.round((bw * sim.composure) / 100), 6, sim.quiet ? 0xffffff : seat.gift === 'look' ? 0xc08bff : 0x57c7ff);
      const need = seat.gift === 'look' ? sim.cfg?.lookCost ?? 60 : 20;
      hud.rect(bx + Math.round((bw * need) / 100), 11, 1, 8, 0xffd24d);
      if (sim.tagOn) hud.text(bx - 56, 12, sim.doctor === 'ilya' ? 'MARSH' : 'ACHTERBERG', { color: 0xffd24d });
    }
    // score & streak
    const scoreStr = `${sim.score}`;
    if (!narrow) hud.text(W - (sim.giftOn ? Math.min(100, Math.round(W * 0.2)) + 10 : 4) - hud.measure(scoreStr).width - 60, 3, scoreStr, { color: 0xffd24d });
    if (sim.streak > 1 && !narrow) hud.text(W - (sim.giftOn ? Math.min(100, Math.round(W * 0.2)) + 10 : 4) - 60 - hud.measure(`X${1 + Math.min(sim.streak, 10) * 0.1}`).width, 12, `X${(1 + Math.min(sim.streak, 10) * 0.1).toFixed(1)}`, { color: 0xffffff });
    if (sim.mistakes > 0) for (let i = 0; i < sim.mistakes; i++) hud.rect(W / 2 + cw / 2 + 8 + i * 6, 6, 4, 8, 0xff5a5a);
    // cold bar
    if (sim.cold) {
      const bw = 90, bx = Math.round(W / 2 - 45), y = 25;
      hud.text(bx, y, `COLD ${Math.ceil(sim.cold.t)}`, { color: 0x8ad0ff });
      hud.rect(bx, y + 9, bw, 4, 0x2a3142);
      hud.rect(bx, y + 9, Math.round((bw * sim.cold.t) / sim.cold.max), 4, 0x8ad0ff);
    }
    // heart bpm
    if (sim.heart) {
      const sys = sim.heart.phase < 0.35;
      hud.text(4, 26, `${Math.round(sim.heart.bpm)} BPM`, { color: sim.heart.bpm >= 108 ? 0xff5a5a : 0xffffff });
      hud.rect(4, 36, 54, 6, 0x2a3142);
      hud.rect(4 + Math.round(54 * sim.heart.phase), 35, 2, 8, 0xffffff);
      hud.rect(4, 36, Math.round(54 * 0.35), 6, 0xb5202a);
      hud.text(4, 45, sys ? 'WAIT' : 'CUT', { color: sys ? 0xff5a5a : 0x7fffa0 });
    }
    if (sim.pain != null) { hud.text(4, 26, 'PAIN', { color: 0xffd24d }); for (let i = 0; i < 5; i++) hud.rect(32 + i * 7, 26, 5, 7, i < sim.pain ? 0xffd24d : 0x2a3142); }

    // comm strip
    const comm = this.updateComm(dt, this.ctx.audio);
    const wheelSize = 54, textW = W - wheelSize - 12 - 32 - (narrow ? 0 : 46);
    const stripH = Math.max(33, comm ? 12 + P.lineCount(comm.text, hud, textW) * 11 : 33), sy = H - stripH;
    hud.rect(33, sy, W - 33, stripH, 0x0d0b14);
    hud.rect(0, sy, 33, stripH - 31, 0x0d0b14); hud.rect(0, H - 33, 2, 33, 0x0d0b14); hud.rect(0, H - 2, 33, 2, 0x0d0b14);
    hud.rect(0, sy, W, 1, 0x2a3142);
    if (sim.voiceOff && !comm) {
      const flick = Math.floor(this.ctx.time * 3) % 7 !== 0;
      hud.text(36, sy + 5, 'NO SIGNAL', { color: flick ? 0x5a6172 : 0x2a3142, scale: 2 });
    } else if (comm) {
      const col = CAST[comm.who]?.color ?? 0xffffff;
      hud.text(36, sy + 3, CAST[comm.who]?.name ?? comm.who.toUpperCase(), { color: col });
      P.draw(hud, 36, sy + 12, comm.text, { width: textW, limit: Math.floor(comm.i) });
    } else if (opts.objective) {
      hud.text(36, sy + 3, 'OBJECTIVE', { color: 0x5a6172 });
      P.draw(hud, 36, sy + 12, opts.objective, { width: textW, color: 0x8a93a6 });
    }
    // bust frame: the 3D face shows through it
    if (!comm) hud.rect(2, H - 32, 31, 30, 0x1a1f2b);
    // prompt banner
    if (this.promptT > 0) {
      this.promptT -= dt;
      const tw = Math.min(W - 2 * (wheelSize + 8), P.items(this.promptText, hud, 0).reduce((n, i) => n + i.w, 0) + 4);
      const lines = P.lineCount(this.promptText, hud, tw);
      const by = H - stripH - 13 - (lines - 1) * 11;
      hud.rect(Math.round(W / 2 - tw / 2 - 5), by - 3, tw + 10, lines * 11 + 4, 0x000000);
      P.draw(hud, Math.round(W / 2 - tw / 2), by, this.promptText, { width: tw, color: 0xffffff, center: true });
    }
    // tool wheel
    this.drawWheel(sim, seat, W, H, wheelSize);
    // dose count
    if (sim.tools.includes('syringe')) {
      hud.text(W - wheelSize - 42, narrow ? sy + 3 : H - 11, `DOSE ${sim.doses}`, { color: sim.doses ? 0xff9ab0 : 0x5a6172 });
    }
    // hint arrow text
    if (sim.hint && seat.tool !== sim.hint.tool && sim.hint.tool && !sim.noHint) {
      const n = TOOLS.indexOf(sim.hint.tool) + 1;
      const label = `${sim.hint.tool.toUpperCase()}: {tool:${n}}`;
      const w = P.items(label, hud, 0).reduce((q, i) => q + i.w, 0);
      P.draw(hud, W - w - 6, H - wheelSize - 14, label, { width: w + 6, color: 0xffd24d });
    }
    // pop-ups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.t -= dt * 0.9;
      if (p.t <= 0) { this.popups.splice(i, 1); continue; }
      const y = p.y - (1 - p.t) * 14, label = p.r;
      const w = hud.measure(label, 2).width;
      hud.text(Math.round(Math.max(2, Math.min(W - w - 2, p.x - w / 2))), Math.round(Math.max(24, y)), label, { color: RCOL[p.r], scale: 2 });
      if (p.streak > 1 && p.r === 'CLEAN') hud.text(Math.round(p.x + w / 2 + 3), Math.round(y + 4), `+${p.streak}`, { color: 0xffffff });
    }
    // red pulse at low vitals
    if (crit && sim.phase === 'play') { const a = Math.floor(this.ctx.time * 4) % 2; if (a) { hud.rect(0, 22, W, 1, 0xff3a3a); hud.rect(0, sy - 1, W, 1, 0xff3a3a); } }
    // Code Blue overlay
    if (sim.codeBlue) this.drawCodeBlue(sim, W, H);
    if (sim.massage) this.drawMassage(sim, W, H);
    // ghost hint
    if (sim.ghost) hud.text(Math.round(W / 2 - 60), 42, 'THE SECOND LOOK', { color: 0xc08bff });
    void input;
  }

  drawWheel(sim, seat, W, H, size) {
    const { hud } = this.ctx, cx = W - size / 2 - 2, cy = H - size / 2 - 2;
    const R = 20;
    hud.rect(W - size - 4, H - size - 4, size + 4, size + 4, 0x0d0b14);
    this.wheelHit = [];
    TOOLS.forEach((id, i) => {
      const a = -Math.PI / 2 + (i / 8) * Math.PI * 2, x = Math.round(cx + Math.cos(a) * R), y = Math.round(cy + Math.sin(a) * R);
      const on = id === seat.tool, avail = sim.tools.includes(id);
      if (on) hud.rect(x - 4, y - 4, 9, 9, 0xffd24d);
      else hud.rect(x - 3, y - 3, 7, 7, avail ? (this.wheelSlot === i ? 0xffffff : 0x57606f) : 0x1a1f2b);
      this.wheelHit.push({ i, x: x - 5, y: y - 5, w: 11, h: 11 });
    });
    const ic = TOOL_ICONS[seat.tool];
    if (ic) hud.sprite(Math.round(cx - 6), Math.round(cy - 5), ic.rows, ic.colors);
    if (this.wheelT > 0 && this.wheelSlot < 0) {
      const name = seat.tool.toUpperCase();
      hud.text(Math.round(W - size - hud.measure(name).width - 8), H - size - 4, name, { color: 0xffd24d });
    }
    if (this.wheelSlot >= 0) { // the big wheel, while the stick is pushed
      const bx = Math.round(W / 2), by = Math.round(H / 2 - 12), BR = 50;
      TOOLS.forEach((id, i) => {
        const a = -Math.PI / 2 + (i / 8) * Math.PI * 2, x = Math.round(bx + Math.cos(a) * BR), y = Math.round(by + Math.sin(a) * BR * 0.85);
        const on = id === seat.tool, avail = sim.tools.includes(id);
        hud.rect(x - 9, y - 8, 18, 16, on ? 0xffd24d : 0x0d0b14);
        const ic2 = TOOL_ICONS[id];
        if (ic2 && avail) hud.sprite(x - 6, y - 5, ic2.rows, ic2.colors);
      });
      const name = seat.tool.toUpperCase(), mid = hud.measure(name).width;
      hud.rect(bx - mid / 2 - 3, by - 6, mid + 6, 11, 0x0d0b14);
      hud.text(Math.round(bx - mid / 2), by - 4, name, { color: 0xffd24d });
    }
  }

  /** Couch play: every other seat's wheel near its own corner; seat 1 has the big one, bottom right. */
  drawSeatWheels(sim, seats, colors) {
    const { hud } = this.ctx, W = hud.width, H = hud.height, S = 34;
    const corners = [null, [2, H - 36 - S], [W - S - 2, 24], [2, 24]];
    this.seatWheels = 0;
    seats.forEach((seat, i) => {
      const at = corners[i];
      if (!at) return;
      this.seatWheels++;
      const cx = at[0] + S / 2, cy = at[1] + S / 2;
      hud.rect(at[0], at[1], S, S, 0x0d0b14);
      hud.rect(at[0], at[1], S, 1, colors[i]);
      TOOLS.forEach((id, k) => {
        const a = -Math.PI / 2 + (k / 8) * Math.PI * 2, x = Math.round(cx + Math.cos(a) * 13), y = Math.round(cy + Math.sin(a) * 13);
        hud.rect(x - 1, y - 1, 3, 3, id === seat.tool ? colors[i] : sim.tools.includes(id) ? 0x57606f : 0x1a1f2b);
      });
      const ic = TOOL_ICONS[seat.tool];
      if (ic) hud.sprite(Math.round(cx - 6), Math.round(cy - 5), ic.rows, ic.colors);
    });
  }

  drawCodeBlue(sim, W, H) {
    const { hud } = this.ctx, cb = sim.codeBlue, P = this.app.prompts;
    const flicker = Math.floor(this.ctx.time * 4) % 2 ? 0xff3a3a : 0xffffff;
    const panelW = 240, x = Math.round(W / 2 - panelW / 2), y = Math.round(H / 2 - 54);
    hud.rect(x - 2, y - 2, panelW + 4, 98, 0x3a0a14);
    hud.rect(x, y, panelW, 94, 0x0d0b14);
    hud.text(x + 6, y + 5, 'CODE BLUE', { color: flicker, scale: 2 });
    hud.text(x + panelW - 58, y + 9, `${Math.ceil(cb.t)}S`, { color: 0xffffff, scale: 1 });
    hud.text(x + panelW - 30, y + 9, `${cb.shocks}/${cb.need}`, { color: 0x7fffa0 });
    const bw = panelW - 24, bx = x + 12, by = y + 32;
    hud.rect(bx, by, bw, 14, 0x2a3142);
    const zx = bx + Math.round(bw * (cb.centre - cb.zone / 2)), zw = Math.round(bw * cb.zone);
    hud.rect(zx, by, zw, 14, 0x2bb673);
    const nx = bx + Math.round(bw * cb.needle);
    hud.rect(nx - 1, by - 3, 3, 20, cb.charging ? 0xffffff : 0x8a93a6);
    P.draw(hud, x + 12, y + 56, cb.charging ? 'RELEASE IN THE GREEN!' : 'HOLD {paddles} TO CHARGE', { width: bw, color: 0xffffff, center: true });
    hud.text(x + 12, y + 74, 'TWO GOOD SHOCKS. CLEAR!', { color: 0x8a93a6 });
  }

  drawMassage(sim, W, H) {
    const { hud } = this.ctx, m = sim.massage, P = this.app.prompts;
    const panelW = 220, x = Math.round(W / 2 - panelW / 2), y = Math.round(H / 2 - 44);
    hud.rect(x, y, panelW, 76, 0x0d0b14);
    hud.text(x + 6, y + 5, 'MASSAGE', { color: 0xff6b6b, scale: 2 });
    hud.text(x + panelW - 34, y + 9, `${m.count}/${m.need}`, { color: 0x7fffa0 });
    const ph = (m.t % m.period) / m.period, near = Math.min(ph, 1 - ph) * m.period <= m.window;
    const size = near ? 22 : 12, cx = x + panelW / 2;
    hud.rect(Math.round(cx - size / 2), y + 28 + (22 - size) / 2 | 0, size, size, near ? 0xff5a5a : 0x5a1f28);
    const nextL = m.last !== 1;
    hud.text(x + 22, y + 34, nextL ? '>LEFT<' : 'LEFT', { color: nextL ? 0xffd24d : 0x5a6172 });
    hud.text(x + panelW - 60, y + 34, !nextL ? '>RIGHT<' : 'RIGHT', { color: !nextL ? 0xffd24d : 0x5a6172 });
    P.draw(hud, x + 8, y + 58, 'ALTERNATE {squeeze} ON THE BEAT', { width: panelW - 16, color: 0xffffff, center: true });
  }
}
