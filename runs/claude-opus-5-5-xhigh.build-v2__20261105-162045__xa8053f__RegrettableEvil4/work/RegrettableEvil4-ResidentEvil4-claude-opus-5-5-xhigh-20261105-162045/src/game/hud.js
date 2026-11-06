// The in-game HUD: sparse, and gone during cutscenes. Coverage bars, ammo, one context prompt, the laser
// dot, damage arcs. All drawn on the engine HUD, in art pixels, cleared and redrawn every frame.
import { THREE } from '../../pixel-engine.js';
import { app } from '../core/app.js';
import { WEAPONS } from '../data/weapons.js';
import { iconOf } from '../models/icons.js';
import { CAM } from '../data/tuning.js';

const { Vector3 } = THREE;
const v = new Vector3();

export class GameHud {
  constructor(area) {
    this.area = area;
    this.arcs = [];
    this.moneyT = 0;
    this.lastMoney = null;
    this.objectiveT = 0;
    this.flash = null;
    this.mash = false;
    this.dot = { x: 0, y: 0, on: false, zone: null };
  }

  addHurtArc(dx, dz) {
    const yaw = this.area.cam.yaw;
    const a = Math.atan2(dx, dz) - yaw;
    this.arcs.push({ a, t: 0.8 });
  }
  flashText(text, t = 1.4) { this.flash = { text, t }; }
  drawFlash(ui) {
    // Big, unless this one's too long to be.
    const scale = ui.width(this.flash.text, 2) <= ui.W - 8 ? 2 : 1;
    ui.centerText(ui.H / 2 - 50 | 0, this.flash.text, { scale, color: 'orange' });
  }
  showMash(on) { this.mash = on; }

  update(dt) {
    for (let i = this.arcs.length - 1; i >= 0; i--) { this.arcs[i].t -= dt; if (this.arcs[i].t <= 0) this.arcs.splice(i, 1); }
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }
    this.moneyT -= dt;
    this.objectiveT -= dt;
    const run = this.area.run;
    if (run && run.money !== this.lastMoney) { if (this.lastMoney !== null) this.moneyT = 3; this.lastMoney = run.money; }
  }

  projectDot(ui, p) {
    const cam = this.area.ctx.camera.camera;
    cam.updateMatrixWorld();
    v.copy(p).project(cam);
    return [Math.round(((v.x + 1) / 2) * ui.W), Math.round(((1 - v.y) / 2) * ui.H)];
  }

  draw(ctx, ui) {
    const { area } = this;
    const { hud, W, H } = ui;
    const P = area.player;
    if (!P) return;
    const run = P.store;
    // Low health: a pulsing red edge.
    if (P.alive && P.hp < P.maxHp * 0.25) {
      const pulse = 1 + Math.floor(Math.abs(Math.sin(ui.rt * 4)) * 4);
      hud.rect(0, 0, W, pulse, 'red'); hud.rect(0, H - pulse, W, pulse, 'red');
      hud.rect(0, 0, pulse, H, 'red'); hud.rect(W - pulse, 0, pulse, H, 'red');
    }
    // Damage direction: a short arc at the screen edge.
    for (const a of this.arcs) {
      const s = Math.sin(a.a); const c = Math.cos(a.a);
      const cx = W / 2 - s * (W / 2 - 14); const cy = H / 2 - c * (H / 2 - 14);
      const nx = c; const ny = -s;
      for (let i = -9; i <= 9; i++) hud.rect(Math.round(cx + nx * i * 2), Math.round(cy + ny * i * 2), 3, 3, 'red');
    }
    // Laser dot, or the scope.
    const scoped = P.aiming && P.weapon.scope && P.aimBlend > 0.7;
    if (scoped) this.drawScope(ui, P);
    else if (P.laserOn) {
      const [x, y] = this.projectDot(ui, P.laserHit);
      const col = P.laserZone === 'head' ? 'lime' : P.laserZone === 'leg' ? 'sand' : 'red';
      hud.rect(x - 1, y - 1, 3, 3, col);
      hud.rect(x, y, 1, 1, 'white');
      if (P.aimZoneFlash > 0) hud.rect(x - 2, y - 2, 5, 1, 'white');
    }
    if (P.weapon && !this.solo) { /* the laser is above */ }
    // Bottom left: coverage.
    // The radio panel sits along the bottom during play: everything down here moves up above it.
    const B = H - this.panelLift(area);
    const hasDame = !!(area.dame && area.dame.withYou);
    const left = 6; const barW = 96; const baseY = B - (hasDame ? 29 : 18);
    const lapsed = P.hp < P.maxHp * 0.25;
    ui.text(left, baseY - 10, lapsed && ui.blink(3) ? 'LAPSED' : 'COVERAGE', { color: lapsed ? 'red' : 'sand' });
    ui.bar(left, baseY, barW, 8, P.hp / P.maxHp, lapsed ? 'red' : 'lime');
    if (hasDame) {
      const D = area.dame;
      ui.text(left, B - 17, 'THE INSURED', { color: 'mist' });
      ui.bar(left + 72, B - 18, 66, 7, D.hp / D.maxHp, D.taken ? 'red' : 'sand');
    }
    if (this.solo) {
      ui.text(6, B - 40, 'YOU ARE DAME OTTOLINE', { color: 'lime' });
      this.drawPrompt(ui, P, area);
      if (area.hint) this.drawHint(ui);
      if (this.flash) this.drawFlash(ui);
      return;
    }
    // Bottom right: ammo, icon, grenades.
    const s = P.weapon;
    const reserve = run.case.count(s.ammo);
    const ammo = `${P.mag}/${reserve}`;
    const aw = ui.width(ammo, 2);
    ui.text(W - aw - 6, B - 22, ammo, { scale: 2, color: P.mag === 0 ? 'red' : 'white' });
    const ic = iconOf(s.icon);
    if (ic) hud.sprite(W - ic.rows[0].length - 6, B - 22 - ic.rows.length - 2, ic.rows, ic.colors, { shadow: false });
    if (P.reloadT > 0) ui.bar(W - aw - 6, B - 6, aw, 3, 1 - P.reloadT / P.reloadDur, 'sand');
    const gid = P.pickGrenade();
    if (gid) {
      const gi = iconOf(gid);
      const n = run.case.count(gid);
      if (gi) hud.sprite(W - aw - 26, B - 30, gi.rows, gi.colors, { shadow: false });
      ui.text(W - aw - 14, B - 12, String(n), { color: 'sand' });
    }
    // Top right: doubloons, only after they change.
    if (this.moneyT > 0) {
      const t = `${run.money}`;
      const di = iconOf('doubloon');
      const tw = ui.width(t);
      if (di) hud.sprite(W - tw - 21, 5, di.rows, di.colors, { shadow: false });
      ui.text(W - tw - 6, 7, t, { color: 'sand' });
    }
    // Top left: the objective, fading after 6 s.
    if (area.objective && (this.objectiveT > 0 || area.paused)) ui.text(6, 6, area.objective, { color: 'sand' });
    // Bars for whatever the moment needs: tide, winch, boss.
    let topY = 16;
    if (area.gauge) {
      const G = area.gauge;
      ui.centerText(topY, G.label, { color: G.color ?? 'cyan' });
      ui.bar((W >> 1) - 70, topY + 9, 140, 6, G.frac, G.color ?? 'cyan');
      topY += 20;
    }
    if (area.bossBar) {
      const B = area.bossBar;
      ui.centerText(topY, B.name, { color: 'orange' });
      ui.bar((W >> 1) - 90, topY + 9, 180, 7, B.frac, 'red');
      topY += 20;
    }
    this.drawPrompt(ui, P, area);
    // The Dame command, when it means something.
    if (area.dame?.withYou && P.state === 'free' && !area.cut) {
      const label = area.dame.commandLabel();
      if (label) ui.prompt(6, B - 54, 'command', label, { color: 'mist' });
    }
    if (this.mash) {
      ui.centerText(H / 2 + 24 | 0, 'BREAK FREE', { scale: 2, color: 'white' });
      const pw = ui.promptWidth('qte1', 'MASH');
      ui.prompt((W >> 1) - (pw >> 1), (H >> 1) + 44, 'qte1', 'MASH');
      ui.bar((W >> 1) - 50, (H >> 1) + 58, 100, 7, P.grabMash, 'orange');
    }
    if (this.flash) this.drawFlash(ui);
    if (area.hint) this.drawHint(ui, topY);
    // The Dame in a Carrier's arms: red screen edge and a countdown.
    if (area.dame?.taken) {
      const D = area.dame;
      if (ui.blink(4)) { hud.rect(0, 0, W, 3, 'orange'); hud.rect(0, H - 3, W, 3, 'orange'); hud.rect(0, 0, 3, H, 'orange'); hud.rect(W - 3, 0, 3, H, 'orange'); }
      ui.centerText(B - 62, `DAME TAKEN ${Math.ceil(Math.max(0, D.takenT))}`, { scale: 2, color: 'orange' });
    }
    // Mouse players must click to lock the pointer.
    if (app.device.kind === 'kbm' && !app.pointerLocked && app.lockWanted && !area.bot && !area.attractMode && typeof document !== 'undefined') {
      if (ui.blink(2)) ui.centerText((H >> 1) + 44, 'CLICK TO AIM', { color: 'white', shadow: 'ink' });
    }
  }

  panelLift(area) { return area.talk?.box && !area.cut ? (area.talk.boxHeight ?? 44) + 2 : area.attractMode ? 16 : 0; }

  drawPrompt(ui, P, area) {
    const { hud, W } = ui;
    const H = ui.H - this.panelLift(area);
    const cur = area.interact?.current;
    if (cur && P.state === 'free' && !area.cut) {
      const pw = ui.promptWidth('action', cur.label, 1);
      const px = (W >> 1) - (pw >> 1);
      hud.rect(px - 5, H - 36, pw + 10, 15, 'ink');
      ui.prompt(px, H - 34, 'action', cur.label);
    }
  }

  drawHint(ui, below = 0) {
    const { hud, W } = ui;
    const h = this.area.hint;
    // Under the tide and the boss bars: the hint must never sit on the number that's keeping you alive.
    const x = 6; const y = Math.max(22, below + 1);
    // A long hint takes a second line rather than running off the screen.
    const glyphW = h.action ? ui.promptWidth(h.action, '') : 0;
    const lines = ui.fitLines(h.text, W - x * 2 - glyphW - 10);
    const bw = Math.max(...lines.map((l) => ui.width(l))) + glyphW + 10;
    const bh = 15 + (lines.length - 1) * 9;
    hud.rect(x, y, bw, bh, 'ink');
    hud.rect(x, y + bh - 1, bw, 1, 'orange');
    if (h.action) ui.prompt(x + 5, y + 2, h.action, lines[0]);
    else ui.text(x + 5, y + 4, lines[0]);
    for (let i = 1; i < lines.length; i++) ui.text(x + 5 + glyphW, y + 4 + i * 9, lines[i]);
  }

  drawScope(ui, P) {
    const { hud, W, H } = ui;
    const cx = W >> 1; const cy = H >> 1;
    const R = (H >> 1) - 10;
    // Scope: a dark frame with a round hole, stepped per row.
    hud.rect(0, 0, W, cy - R, 'ink');
    hud.rect(0, cy + R, W, H - cy - R, 'ink');
    for (let y = -R; y < R; y += 2) {
      const half = Math.round(Math.sqrt(Math.max(0, R * R - y * y)));
      hud.rect(0, cy + y, cx - half, 2, 'ink');
      hud.rect(cx + half, cy + y, W - cx - half, 2, 'ink');
    }
    const col = P.laserZone === 'head' ? 'lime' : P.laserZone === 'leg' ? 'sand' : 'red';
    hud.rect(cx - 16, cy, 12, 1, col); hud.rect(cx + 5, cy, 12, 1, col);
    hud.rect(cx, cy - 16, 1, 12, col); hud.rect(cx, cy + 5, 1, 12, col);
    hud.rect(cx, cy, 1, 1, 'white');
  }
}
export { WEAPONS, CAM };
