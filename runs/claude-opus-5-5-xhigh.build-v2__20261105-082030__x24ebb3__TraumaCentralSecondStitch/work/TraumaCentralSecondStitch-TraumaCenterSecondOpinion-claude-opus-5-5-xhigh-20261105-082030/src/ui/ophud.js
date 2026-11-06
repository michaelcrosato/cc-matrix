// The operation HUD: top strip with vitals, EKG, clock and composure; comm strip below; the tool wheel;
// rating pop-ups; the paddles and the massage. Anchored to hud.width/height, which vary.
import { TOOL_ICONS } from '../content/icons.js';
import { SPEAKER_NAMES, TOOL_NAMES } from '../content/lines.js';
import { TOOLS } from '../sim/entities.js';
import { ZONE_CENTER } from '../sim/op.js';

const fmt = (t) => { const s = Math.max(0, Math.ceil(t)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const vitalColor = (v) => (v < 15 ? 'red' : v < 30 ? 'orange' : v < 50 ? 'sand' : 'lime');

export class Ekg {
  constructor(n = 90) { this.n = n; this.buf = new Array(n).fill(0); this.head = 0; this.phase = 0; this.acc = 0; this.flat = false; }
  /** rate in beats/s; jitter 0..1 */
  update(dt, rate, jitter = 0, flat = false) {
    this.acc += dt * 60;
    while (this.acc >= 1) {
      this.acc -= 1;
      this.phase += (rate / 60);
      if (this.phase >= 1) this.phase -= 1;
      const p = this.phase;
      let y = 0;
      if (!flat) {
        if (p < 0.08) y = Math.sin((p / 0.08) * Math.PI) * 1.4;
        else if (p > 0.14 && p < 0.17) y = -1.6;
        else if (p >= 0.17 && p < 0.21) y = 7 * Math.sin(((p - 0.17) / 0.04) * Math.PI);
        else if (p >= 0.21 && p < 0.25) y = -2.2;
        else if (p > 0.34 && p < 0.46) y = Math.sin(((p - 0.34) / 0.12) * Math.PI) * 2;
        if (jitter) y += Math.sin(this.head * 3.1) * jitter * 2.2;
      }
      this.buf[this.head] = y;
      this.head = (this.head + 1) % this.n;
    }
  }
  draw(ui, x, y, color) {
    for (let i = 0; i < this.n; i++) {
      const k = (this.head + i) % this.n;
      const v = Math.round(this.buf[k]);
      const age = i / this.n;
      ui.rect(x + i, y - v, 1, 1 + (Math.abs(v) > 2 ? Math.abs(v - Math.round(this.buf[(k + 1) % this.n])) : 0), age < 0.25 ? 'slate' : color);
    }
  }
}

export class OpHud {
  constructor(app) {
    this.app = app;
    this.popups = [];
    this.ekg = new Ekg(82);
    this.tabEkgs = [new Ekg(30), new Ekg(30), new Ekg(30)];
    this.stampMsg = null;
    this.bannerT = 0;
    this.banner = null;
    this.reminderT = 0;
    this.wheelHitBoxes = [];
  }

  popup(text, x, y, color, scale = 2, life = 0.8) {
    this.popups.push({ text, x, y, color, scale, life, t: 0 });
    if (this.popups.length > 8) this.popups.shift();
  }
  setBanner(text, color = 'white', t = 1.6) { this.banner = { text, color }; this.bannerT = t; }

  draw(ui, st, o, dt) {
    const w = ui.w, h = ui.h;
    const app = this.app;
    const table = st.tables[o.table ?? 0];
    const multi = st.tables.length > 1;
    const v = o.vitalsShown;
    // Top strip.
    const danger = v < 30;
    ui.rect(0, 0, w, 20, danger && Math.sin((o.t ?? 0) * 6) > -0.4 ? 0x4a0f1e : 'ink');
    ui.rect(0, 20, w, 1, danger ? 'red' : 'slate');
    ui.text(4, 2, 'VITALS', { color: 'mist', shadow: false });
    if (multi) {
      // Three monitors, clickable tabs.
      const tabW = Math.min(64, (w * 0.5 - 40) / 3);
      this.tabs = [];
      st.tables.forEach((t, i) => {
        const x = 4 + i * (tabW + 3);
        const on = i === table.i;
        ui.rect(x, 1, tabW, 18, on ? 'navy' : 'night');
        ui.outline(x, 1, tabW, 18, on ? 'sand' : 'slate');
        const shown = Math.round(t.fake ?? t.vitals);
        ui.text(x + 3, 3, t.name ?? 'ABC'[i], { color: on ? 'sand' : 'mist', shadow: false });
        ui.text(x + tabW - 15, 3, String(shown).padStart(2, '0'), { color: vitalColor(shown), shadow: false });
        ui.rect(x + 3, 13, tabW - 6, 3, 'ink');
        ui.rect(x + 3, 13, Math.round(((tabW - 6) * shown) / 99), 3, vitalColor(shown));
        // Work waiting at this table; a low monitor flashes.
        const waiting = !on && st.ents.some((e) => e.table === t.i && e.task && !e.dead);
        const alarm = shown < 30 && Math.sin((o.t ?? 0) * 9) > 0;
        if (waiting) ui.rect(x + 12, 4, 5, 5, alarm ? 'red' : 'sand');
        if (alarm) ui.outline(x, 1, tabW, 18, 'red');
        this.tabs.push({ x, y: 1, w: tabW, h: 18, i });
      });
    } else {
      this.tabs = null;
      ui.text(42, 3, String(Math.round(v)).padStart(2, '0'), { color: vitalColor(v), scale: 2, shadow: false });
      if (w >= 400) this.ekg.draw(ui, 74, 11, st.codeBlue ? 'red' : vitalColor(v));
      if (st.heart && !st.heart.calm) ui.text(74, w >= 400 ? 2 : 6, `${Math.round(st.heart.bpm)} BPM`, { color: st.heart.systole ? 'red' : 'lime', shadow: false });
    }
    // Clock, centre.
    const clockStr = fmt(st.clock);
    ui.center(3, clockStr, { color: st.clock < 30 ? 'red' : 'white', scale: 2, shadow: false });
    // Mistakes.
    const maxM = st.cfgMaxMistakes ?? app.config.maxMistakes;
    if (maxM > 0) {
      const mx = w / 2 + 28;
      for (let i = 0; i < maxM; i++) {
        const filled = i < st.mistakes;
        ui.rect(mx + i * 7, 7, 5, 5, filled ? 'red' : 'night');
        ui.outline(mx + i * 7, 7, 5, 5, filled ? 'white' : 'slate');
      }
    }
    // Composure.
    if (st.giftsUnlocked) {
      const barW = 70;
      const bx = w - barW - 6;
      const seat = st.seats[o.seatIndex ?? 0];
      const gift = seat?.gift;
      const label = gift === 'look' ? 'SECOND LOOK' : 'THE QUIET';
      ui.right(w - 6, 2, label, { color: st.quiet ? 'cyan' : 'mist', shadow: false });
      ui.rect(bx, 11, barW, 6, 'night');
      const cost = gift === 'look' ? app.config.secondLookCost : 20;
      ui.rect(bx, 11, Math.round((barW * st.composure) / 100), 6, st.composure >= cost ? 'cyan' : 'slate');
      ui.rect(bx + Math.round((barW * cost) / 100), 10, 1, 8, 'white');
      ui.outline(bx, 11, barW, 6, 'mist');
      if (st.composure >= cost && w >= 400) ui.action(bx - ui.actionWidth('gift') - 3, 9, 'gift');
    }
    // Cold-time bar (Op 6).
    if (st.cold != null) {
      const cw = 96, cx = (w - cw) / 2, cy = 24;
      ui.rect(cx, cy, cw, 9, 'navy');
      ui.rect(cx, cy, Math.round((cw * st.cold) / 120), 9, st.cold < 30 ? 'red' : 'sky');
      ui.outline(cx, cy, cw, 9, 'white');
      ui.center(cy + 1, `ICE ${fmt(st.cold)}`, { color: 'white', shadow: 'ink' });
    }
    this.drawPulses(ui, o);
    if (st.pain > 0) this.drawPain(ui, st);
    this.drawComm(ui, st, o);
    this.drawWheels(ui, st, o);
    this.drawHint(ui, st, o);
    this.drawCursorHud(ui, st, o);
    // Pop-ups.
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.t += dt;
      if (p.t >= p.life) { this.popups.splice(i, 1); continue; }
      const k = p.t / p.life;
      const yy = p.y - 8 - k * 12;
      const m = ui.hud.measure(p.text, p.scale);
      ui.text(Math.max(2, Math.min(w - m.width - 2, p.x - m.width / 2)), Math.max(22, yy), p.text, { color: p.color, scale: p.scale });
    }
    // Banner.
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.banner.text) {
        const m = ui.hud.measure(this.banner.text, 3);
        ui.rect((w - m.width) / 2 - 6, h * 0.34 - 5, m.width + 12, m.height + 10, 'ink');
        ui.outline((w - m.width) / 2 - 6, h * 0.34 - 5, m.width + 12, m.height + 10, this.banner.color);
        ui.center(h * 0.34, this.banner.text, { color: this.banner.color, scale: 3, shadow: false });
      }
    }
    // Big prompt.
    if (st.prompt) {
      const lines = ui.wrap(st.prompt.text, w - 60);
      const by = h * 0.16;
      ui.rect(20, by - 4, w - 40, lines.length * 11 + 8, 'ink');
      ui.outline(20, by - 4, w - 40, lines.length * 11 + 8, 'cyan');
      lines.forEach((l, i) => ui.richCenter(by + i * 11, l, { color: 'cyan' }));
    }
    if (this.reminderT > 0) {
      this.reminderT -= dt;
      const lines = ui.wrap(st.objective || '', w - 60);
      const by = h * 0.25;
      ui.rect(20, by - 4, w - 40, lines.length * 11 + 8, 'night');
      ui.outline(20, by - 4, w - 40, lines.length * 11 + 8, 'sand');
      lines.forEach((l, i) => ui.richCenter(by + i * 11, l, { color: 'sand' }));
    }
    if (st.codeBlue) this.drawCodeBlue(ui, st);
    if (st.massage) this.drawMassage(ui, st);
    if (st.quiet) {
      ui.rect(0, 21, w, 6, 'ink');
      ui.center(29, 'THE QUIET', { color: 'cyan' });
    }
    if (st.ghostPlay && !o.net) ui.center(29, 'THE SECOND LOOK', { color: 'white' });
    if (o.coachHints) this.drawCoach(ui, st, o);
  }

  drawWheels(ui, st, o) {
    this.wheelHitBoxes.length = 0;
    const seats = o.seats;
    const solo = seats.length === 1 || o.net;
    const corners = solo ? [[ui.w - 52, ui.h - 56], [ui.w - 52, ui.h - 56], [ui.w - 52, ui.h - 56], [ui.w - 52, ui.h - 56]] : [[ui.w - 50, ui.h - 84], [2, ui.h - 84], [ui.w - 50, 24], [2, 24]];
    seats.forEach((sv, i) => {
      if (sv.gone) return;
      if (o.net && sv.id !== o.viewSeat) return;
      const [x, y] = corners[sv.corner ?? i];
      this.wheel(ui, x, y, st, sv, solo || sv.showWheel);
    });
    // Doses.
    const sv = seats[0];
    if (st.tools.includes('syringe')) {
      const x = ui.w - 74, y = solo ? ui.h - 42 : ui.h - 72;
      ui.hud.sprite(x, y, TOOL_ICONS.syringe.rows, TOOL_ICONS.syringe.c);
      ui.text(x + 2, y + 13, `x${st.doses}`, { color: st.doses ? 'white' : 'red' });
      ui.action(x + 1, y - 11, 'syringe');
    }
    void sv;
  }
  wheel(ui, x, y, st, sv, full) {
    const seat = st.seats.find((s) => s.id === sv.id);
    const cx = x + 24, cy = y + 24;
    const tool = sv.tool ?? seat?.tool;
    const R = 19;
    ui.rect(x + 4, y + 4, 40, 40, 'ink');
    ui.outline(x + 4, y + 4, 40, 40, sv.color ?? 'slate');
    if (full || sv.wheelOpen) {
      TOOLS.forEach((t, i) => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const px = Math.round(cx + Math.cos(a) * R - 6), py = Math.round(cy + Math.sin(a) * R - 6);
        const on = st.tools.includes(t);
        if (!on) { ui.rect(px + 4, py + 4, 4, 4, 'night'); return; }
        const sel = t === tool;
        if (sel) ui.rect(px - 1, py - 1, 14, 14, 'sand');
        else ui.rect(px - 1, py - 1, 14, 14, 'night');
        ui.hud.sprite(px, py, TOOL_ICONS[t].rows, TOOL_ICONS[t].c);
        this.wheelHitBoxes.push({ x: px - 1, y: py - 1, w: 14, h: 14, tool: t, seat: sv.id });
      });
    }
    // The current tool, big in the centre.
    const shown = st.context && seat ? st.context : tool;
    const ic = TOOL_ICONS[shown] ?? TOOL_ICONS[tool];
    if (ic) ui.hud.sprite(cx - 6, cy - 6, ic.rows, ic.c);
    if (sv.showLabel !== false) {
      const label = TOOL_NAMES[shown] ?? '';
      ui.right(x + 46, y + 44 + 1, label, { color: 'sand' });
    }
  }

  drawComm(ui, st, o) {
    const w = ui.w, h = ui.h;
    const c = o.comm;
    const stripH = 32;
    const y = h - stripH;
    const bust = 38;
    const rightPad = o.seats.length > 1 && !o.net ? 4 : 56;
    // The bust's window is left open: a real 3D head sits there.
    ui.rect(bust, y, w - bust, stripH, 'ink');
    ui.rect(0, y, w, 1, 'slate');
    if (!c?.line) {
      ui.rect(0, y, bust, stripH, 'ink');
      // An idle monitor where the speaker's head will be.
      ui.rect(4, y + 4, bust - 8, stripH - 8, 'night');
      for (let i = 0; i < bust - 10; i++) ui.rect(5 + i, y + stripH / 2 + (((i + Math.floor((o.t ?? 0) * 18)) % 18) === 9 ? -4 : 0), 1, 1, 'teal');
    }
    ui.outline(0, y, bust, stripH, 'slate');
    const tx = bust + 5;
    const lineW = w - tx - rightPad - 4;
    if (c?.line) {
      ui.text(tx, y + 3, SPEAKER_NAMES[c.line.who] ?? c.line.who.toUpperCase(), { color: 'sand', shadow: false });
      const lines = c.wrapped ?? (c.wrapped = ui.wrap(c.line.text, lineW));
      let left = c.chars;
      lines.slice(0, 2).forEach((l, i) => {
        ui.rich(tx, y + 13 + i * 9, l, { chars: left, hi: 'orange', shadow: false });
        left -= l.replace(/\*/g, '').length + 1;
      });
    } else if (o.noSignal) {
      const on = Math.sin((o.t ?? 0) * 3) > -0.2;
      ui.text(tx, y + 12, 'NO SIGNAL', { color: on ? 'red' : 'plum', scale: 2, shadow: false });
    } else if (st.objective) {
      ui.text(tx, y + 3, 'OBJECTIVE', { color: 'slate', shadow: false });
      const lines = ui.wrap(st.objective, lineW);
      lines.slice(0, 2).forEach((l, i) => ui.rich(tx, y + 13 + i * 9, l, { color: 'mist', shadow: false }));
    }
  }

  /** Valid targets for the selected tool pulse softly. */
  drawPulses(ui, o) {
    if (!o.pulses?.length) return;
    const k = Math.sin((o.t ?? 0) * 4);
    if (k < -0.2) return;
    const R = 6 + Math.round(k * 2);
    for (const p of o.pulses) {
      const x = Math.round(p.sx), y = Math.round(p.sy);
      ui.rect(x - R - 2, y - R, 3, 1, 'white'); ui.rect(x - R, y - R - 2, 1, 3, 'white');
      ui.rect(x + R, y - R, 3, 1, 'white'); ui.rect(x + R, y - R - 2, 1, 3, 'white');
      ui.rect(x - R - 2, y + R, 3, 1, 'white'); ui.rect(x - R, y + R, 1, 3, 'white');
      ui.rect(x + R, y + R, 3, 1, 'white'); ui.rect(x + R, y + R, 1, 3, 'white');
    }
  }
  /** Op 10: what she can feel. */
  drawPain(ui, st) {
    const x = 6, y = 25;
    ui.rect(x - 2, y - 2, 94, 13, 'ink');
    ui.text(x, y, 'FEELING', { color: 'sand', shadow: false });
    for (let i = 0; i < 6; i++) ui.rect(x + 46 + i * 7, y, 5, 7, i < st.pain ? 'red' : 'night');
  }

  drawHint(ui, st, o) {
    if (!o.hint) return;
    const p = o.hint;
    const k = Math.sin((o.t ?? 0) * 5) * 2;
    const x = Math.round(p.sx), y = Math.round(p.sy - 14 + k);
    for (let d = 0; d < 5; d++) {
      ui.rect(x - d, y - 4 + d, d * 2 + 1, 1, 'sand');
      ui.rect(x - d, y + 4 - d, d * 2 + 1, 1, 'sand');
    }
    ui.rect(x - 1, y - 1, 3, 3, 'white');
    if (p.tool && p.tool !== p.have && TOOL_ICONS[p.tool]) {
      ui.rect(x + 7, y - 7, 14, 14, 'ink');
      ui.outline(x + 7, y - 7, 14, 14, Math.sin((o.t ?? 0) * 8) > 0 ? 'sand' : 'white');
      ui.hud.sprite(x + 8, y - 6, TOOL_ICONS[p.tool].rows, TOOL_ICONS[p.tool].c);
    }
  }

  drawCursorHud(ui, st, o) {
    for (const r of o.reticles ?? []) {
      const x = Math.round(r.sx), y = Math.round(r.sy);
      const c = r.color ?? (r.on ? 'lime' : 'white');
      const R = r.use ? 3 : 5;
      ui.rect(x - R - 2, y, 3, 1, c); ui.rect(x + R, y, 3, 1, c); ui.rect(x, y - R - 2, 1, 3, c); ui.rect(x, y + R, 1, 3, c);
      if (r.label) ui.text(x + 8, y - 12, r.label, { color: c });
      if (r.icon && TOOL_ICONS[r.icon]) ui.hud.sprite(x + 7, y + 5, TOOL_ICONS[r.icon].rows, TOOL_ICONS[r.icon].c);
      if (r.beatRing != null) {
        const n = 20;
        const rr = 12 + Math.round(r.beatRing * 6);
        for (let i = 0; i < n; i += 1) {
          const a = (i / n) * Math.PI * 2;
          ui.rect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr), 1, 1, r.beatBad ? 'red' : 'lime');
        }
      }
      if (r.draw > 0) {
        const bw = 22;
        ui.rect(x - bw / 2, y + 11, bw, 3, 'ink');
        ui.rect(x - bw / 2, y + 11, Math.round(bw * Math.min(1, r.draw / 0.45)), 3, r.draw >= 0.45 ? 'cyan' : 'mist');
      }
    }
  }

  drawCoach(ui, st) {
    const list = [['use', 'USE']];
    if (st.tools.length > 1) list.push(['tool', 'TOOL']);
    list.push(['steady', 'STEADY']);
    ui.hints(list, ui.h - 44, 'left');
  }

  drawCodeBlue(ui, st) {
    const cb = st.codeBlue;
    const w = ui.w, h = ui.h;
    const pw = Math.min(280, w - 40), ph = 78;
    const x = (w - pw) / 2, y = h * 0.11;
    ui.rect(x + 2, y + 2, pw, ph, 'ink');
    ui.rect(x, y, pw, ph, 0x2a0a18);
    ui.outline(x, y, pw, ph, 'red', 2);
    ui.center(y + 6, cb.fib ? 'FIBRILLATION' : 'CODE BLUE', { color: 'red', scale: 2, shadow: false });
    const gx = x + 14, gw = pw - 28, gy = y + 28;
    ui.rect(gx, gy, gw, 12, 'ink');
    const zw = st.cfgZone ?? this.app.config.codeBlueZone;
    ui.rect(gx + Math.round((ZONE_CENTER - zw / 2) * gw), gy, Math.round(zw * gw), 12, 'green');
    ui.outline(gx, gy, gw, 12, 'white');
    const nx = gx + Math.round(cb.charge * gw);
    ui.rect(nx - 1, gy - 3, 3, 18, cb.charging ? 'white' : 'mist');
    // Shocks needed.
    for (let i = 0; i < cb.need; i++) { ui.rect(gx + i * 12, gy + 17, 9, 6, i < cb.shocks ? 'lime' : 'night'); ui.outline(gx + i * 12, gy + 17, 9, 6, 'white'); }
    ui.right(gx + gw, gy + 16, `${Math.max(0, cb.t).toFixed(1)}S`, { color: cb.t < 4 ? 'red' : 'white', shadow: false });
    const label = cb.charging ? 'RELEASE IN THE GREEN!' : 'HOLD ';
    const lw = ui.hud.measure(label, 1).width + (cb.charging ? 0 : ui.actionWidth('paddles') + 26);
    let lx = (w - lw) / 2;
    const ly = y + ph - 13;
    ui.text(lx, ly, label, { color: 'white', shadow: false });
    if (!cb.charging) {
      lx += ui.hud.measure(label, 1).width;
      lx += ui.action(lx, ly - 1, 'paddles') + 3;
      ui.text(lx, ly, 'BOTH', { color: 'white', shadow: false });
    }
  }

  drawMassage(ui, st) {
    const m = st.massage;
    const w = ui.w, h = ui.h;
    const y = h * 0.3;
    ui.center(y - 16, 'MASSAGE', { color: 'red', scale: 2 });
    const beat = 1 - Math.min(m.phase, m.period - m.phase) / (m.period / 2);
    const R = 8 + Math.round(beat * 8);
    const cx = w / 2, cy = y + 18;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * 6.283;
      ui.rect(Math.round(cx + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R), 2, 2, beat > 0.6 ? 'lime' : 'mist');
    }
    const wantA = m.next === 'a';
    ui.action(cx - 44 - ui.actionWidth('left') / 2, cy - 4, wantA ? 'left' : 'left');
    if (wantA) ui.outline(cx - 48 - ui.actionWidth('left') / 2, cy - 8, ui.actionWidth('left') + 8, 17, 'sand');
    ui.action(cx + 44 - ui.actionWidth('right') / 2, cy - 4, 'right');
    if (!wantA) ui.outline(cx + 40 - ui.actionWidth('right') / 2, cy - 8, ui.actionWidth('right') + 8, 17, 'sand');
    for (let i = 0; i < m.need; i++) { ui.rect(cx - (m.need * 7) / 2 + i * 7, cy + 22, 5, 5, i < m.n ? 'lime' : 'night'); ui.outline(cx - (m.need * 7) / 2 + i * 7, cy + 22, 5, 5, 'white'); }
  }
}
