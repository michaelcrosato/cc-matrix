/* HUD (§7.19): minimal, like Killer7, inside the 5% safe margin. Top left the persona, HP and the Red vial; top right
 * Rime (and the Edelweiss slots in Target 01); bottom centre the prompts. In aim mode: the reticle, ammo pips, the scan
 * ring, warm-spot diamonds, laugh ripples, damage chevrons, the scope. Splashes, toasts, tutorials, talks, choices,
 * title cards and the letterbox. The mouse picks markers through worldPick (an intent, never a sim change). */
class Hud {
  constructor(game, sim) {
    this.game = game; this.sim = sim; this.ripples = []; this.chevrons = []; this.markers = []; this.ringBoxes = []; this.choiceBoxes = []; this.redFlash = 0; this.hpShow = {}; this.t = 0; this.vignette = 0; this.talkSel = 0;
    S7.bus.on('laugh', d => { if (this.ripples.length > 24) this.ripples.shift(); this.ripples.push({ at: d.at, loud: d.loud, t: 0 }); });
    S7.bus.on('hurt', d => { this.chevrons.push({ from: d.from, t: 0 }); this.vignette = .5; });
    S7.bus.on('noRed', () => { this.redFlash = 1; });
  }
  /** project a world point to game pixels through the presenter's (or the sim's) camera */
  proj(x, y, z) {
    const p = S7.project(this.sim.cam.pose, x, y, z, this.game.W / this.game.H);
    return p ? [p[0] * this.game.W, p[1] * this.game.H, p[2]] : null;
  }
  /** the mouse in the world: hovering a marker focuses it, a click takes it (filled into this step's intents) */
  worldPick(I) {
    const p = I.pointer, sim = this.sim; if (!p) return;
    if (sim.ring) { this.ringBoxes.forEach((b, i) => { if (b && Math.hypot(p[0] - b[0], p[1] - b[1]) < b[2]) I.ringPick = i; }); return; }
    if (sim.prompt && sim.prompt.choice) { this.choiceBoxes.forEach((b, i) => { if (b && UI.hit(p, b[0], b[1], b[2], b[3])) { I.choicePick = i; if (I.clicked) I.choiceClick = i; } }); return; }
    if (sim.aim.on) return;
    for (const m of this.markers) {
      if (Math.hypot(p[0] - m.x, p[1] - m.y) < 13) {
        if (m.kind === 'branch') { I.branchPick = m.i; if (!I.clicked) I.clicked = null; }
        else if (m.kind === 'spot' && I.clicked && Math.hypot(I.clicked[0] - m.x, I.clicked[1] - m.y) < 13) I.spotPick = m.id;
      }
    }
    if (I.clicked && I.branchPick === null) I.clicked = null;
  }
  update(dt) {
    this.t += dt;
    for (const r of this.ripples) r.t += dt; this.ripples = this.ripples.filter(r => r.t < 1.4);
    for (const c of this.chevrons) c.t += dt; this.chevrons = this.chevrons.filter(c => c.t < 1.2);
    this.redFlash = Math.max(0, this.redFlash - dt * 2); this.vignette = Math.max(0, this.vignette - dt * 1.6);
  }
  draw(r) {
    const sim = this.sim; if (!sim.st) return;
    r.overlay(g => {
      const S = UI.safe(r), hide = CHEAT.hideHud || sim.cutscene || sim.mode === 'interview';
      if (sim.letterbox) { const h = Math.round(r.H * .12); UI.rect(g, 0, 0, r.W, h, '#000'); UI.rect(g, 0, r.H - h, r.W, h, '#000'); }
      if (this.vignette > 0) { g.save(); g.globalAlpha = this.vignette * .5; g.fillStyle = '#ff2030'; g.fillRect(0, 0, r.W, 4); g.fillRect(0, r.H - 4, r.W, 4); g.fillRect(0, 0, 4, r.H); g.fillRect(r.W - 4, 0, 4, r.H); g.restore(); }
      this.markers = [];
      if (!hide && sim.areaDef.kind !== 'room7') this.drawStatus(g, r, S);
      if (!hide && sim.areaDef.kind === 'room7') this.drawRoom7(g, r, S);
      if (!hide && sim.aim.k > .5) this.drawAim(g, r, S);
      if (!hide && !sim.aim.on && !sim.talk && !sim.ring) { this.drawJunction(g, r, S); this.drawNear(g, r, S); this.drawSkiFork(g, r, S); this.drawStatue(g, r, S); }
      if (sim.ring) this.drawRing(g, r, S);
      this.drawSplashes(g, r, S);
      if (!sim.talk && !sim.card) this.drawToasts(g, r, S);
      if (sim.tutorial && !hide && !sim.talk) this.drawTutorial(g, r, S);
      if (sim.boss && !hide) this.drawBoss(g, r, S);
      if (S7.drawAreaHud) S7.drawAreaHud(g, r, S, sim, this);
      if (sim.talk) this.drawTalk(g, r, S);
      if (sim.prompt && sim.prompt.choice) this.drawChoice(g, r, S);
      if (sim.card) this.drawCard(g, r);
      if (CHEAT.showFps) { const now = typeof performance !== 'undefined' ? performance.now() : 0; this.fpsN = (this.fpsN || 0) + 1; if (now - (this.fpsAt || 0) > 1000) { this.fps = this.fpsN * 1000 / Math.max(1, now - (this.fpsAt || now - 1000)); this.fpsN = 0; this.fpsAt = now; } UI.text(g, 'FPS ' + Math.round(this.fps || 0) + '  HASH ' + sim.hash(), S.x0, r.H - 12, '#8affc8'); }
      if (CHEAT.freeCam) UI.text(g, 'FREE CAMERA · ' + S7.label('up') + S7.label('left') + S7.label('down') + S7.label('right') + ' MOVE · Q/E DOWN/UP', r.W / 2, S.y1 - 10, '#8affc8', { align: 'center' });
    });
  }
  /* ---- the persona, HP, Red, Rime ---- */
  drawStatus(g, r, S) {
    const sim = this.sim, st = sim.st, P = sim.personaDef(), ps = sim.pstate(), max = sim.maxHp();
    UI.portrait(g, S7.personaRig(st.persona), S.x0, S.y0, 30, { bg: '#1a1014' });
    const nx = S.x0 + 34;
    UI.text(g, P.short, nx, S.y0 - 1, PAPER, { scale: 2 });
    UI.text(g, P.epithet, nx, S.y0 + 14, MUTED);
    // HP: white, recent damage in red
    const key = st.persona; this.hpShow[key] = this.hpShow[key] === undefined ? ps.hp : E.approach(this.hpShow[key], ps.hp, 40 / 60);
    const bw = 70, y = S.y0 + 24;
    UI.rect(g, nx - 1, y - 1, bw + 2, 7, INK); UI.rect(g, nx, y, bw * clamp(this.hpShow[key] / max, 0, 1), 5, RED); UI.rect(g, nx, y, bw * clamp(ps.hp / max, 0, 1), 5, ps.hp < max * .3 && Math.floor(this.t * 4) % 2 ? '#ffb0b0' : '#f4f1ea');
    UI.text(g, Math.ceil(ps.hp) + '', nx + bw + 4, y - 1, MUTED);
    // the Red thermos: a vertical vial right of the name block
    const vx = Math.max(nx + UI.width(P.short, 2), nx + bw + 22) + 8, vy = S.y0, vh = 28, k = clamp(st.red / 999, 0, 1), fl = this.redFlash > 0 && Math.floor(this.t * 12) % 2;
    UI.rect(g, vx - 1, vy - 1, 8, vh + 2, fl ? '#ffffff' : INK); UI.rect(g, vx, vy + vh * (1 - k), 6, vh * k, '#c8102a'); UI.rect(g, vx + 1, vy + vh * (1 - k), 1, vh * k, '#ff5060');
    UI.text(g, 'RED', vx + 10, vy + 4, '#ff6070'); UI.text(g, String(Math.floor(st.red)), vx + 10, vy + 14, '#ffb0b8', { scale: 1 });
    // Rime, top right; Target 01's Edelweiss slots
    const rx = S.x1;
    UI.text(g, 'RIME ' + st.rime, rx, S.y0 + 2, '#9af0ff', { scale: 2, align: 'right' });
    if (st.target >= 1) { const n = st.items.edelweiss || 0; for (let i = 0; i < 3; i++) { const x0 = rx - 46 + i * 16, y0 = S.y0 + 22; S7.drawFlower(g, x0 + 6, y0 + 6, i < n); } }
    // the area's name, briefly, on entry
    if (sim.areaTitleT === undefined || this._area !== sim.st.area) { this._area = sim.st.area; this.areaT = 0; }
    this.areaT = (this.areaT || 0) + 1 / 60;
    if (this.areaT < 3.2 && !sim.cutscene && !sim.talk && !sim.ring && sim.aim.k < .5) { const A = sim.areaDef, a = this.areaT < 2.6 ? 1 : 1 - (this.areaT - 2.6) / .6; g.save(); g.globalAlpha = a; UI.title(g, A.title, r.W / 2, r.H * .36, 3); if (A.sub) UI.text(g, A.sub, r.W / 2, r.H * .36 + 30, RED, { align: 'center', scale: 2 }); g.restore(); }
    // other personas' state (frozen) as small marks under the portrait
    let fx = S.x0; for (const id of PERSONA_ORDER) { const rr = st.roster[id]; if (!rr.unlocked) continue; UI.rect(g, fx, S.y0 + 34, 4, 4, rr.frozen ? '#8ae0ff' : id === st.persona ? RED : '#5a5560'); fx += 6; }
  }
  drawRoom7(g, r, S) {
    const sim = this.sim, st = sim.st;
    UI.text(g, 'ROOM 7', S.x0, S.y0, PAPER, { scale: 2 });
    UI.text(g, 'RED ' + Math.floor(st.red) + '   RIME ' + st.rime, S.x0, S.y0 + 16, MUTED);
    UI.portrait(g, S7.personaRig(st.persona), S.x1 - 30, S.y0, 30);
  }
  /* ---- junction markers: an arrow per branch, the highlighted one large and red ---- */
  drawJunction(g, r, S) {
    const sim = this.sim, J = sim.junction; if (!J || sim.W.edge || !J.exits.length) return;
    const n = sim.rails.nodes[J.node];
    J.exits.forEach((x, i) => {
      const yaw = sim.rails.branchYaw(x, x.dir), d = 1.6 * M;
      const p = this.proj(n.x + Math.cos(yaw) * d, n.y + Math.sin(yaw) * d, n.z + 10); if (!p) return;
      const f = i === J.i, e = x.edge, end = sim.rails.nodes[sim.rails.endNode(e, x.dir)];
      const sa = sim.branchScreenAngle(x, sim.cam.pose, this.game.W / this.game.H), rr = f ? 9 : 6;
      const tip = [p[0] + Math.cos(sa) * rr, p[1] + Math.sin(sa) * rr], l = [p[0] + Math.cos(sa + 2.4) * rr, p[1] + Math.sin(sa + 2.4) * rr], rt = [p[0] + Math.cos(sa - 2.4) * rr, p[1] + Math.sin(sa - 2.4) * rr];
      E.px.poly(g, [tip, l, p, rt], INK); E.px.poly(g, [[tip[0], tip[1] - 1], [l[0], l[1] - 1], [p[0], p[1] - 1], [rt[0], rt[1] - 1]], f ? RED : PAPER);
      const gate = e.gate && !sim.gateOpen(e.gate) ? sim.areaDef.gates[e.gate] : null;
      let label = e.label || (end && end.label) || '';
      if (e.kind === 'lift') label = 'LIFT'; if (e.kind === 'jump') label = 'JUMP';
      if (f && label) UI.text(g, label, p[0], p[1] + 12, f ? '#ffffff' : MUTED, { align: 'center' });
      if (gate) { UI.text(g, gate.label || 'SHUT', p[0], p[1] - 22, '#ffb0a0', { align: 'center' }); const who = gate.solver || gate.who; if (who && S7.PERSONAS[who]) UI.portrait(g, S7.personaRig(who), p[0] - 7, p[1] - 38, 14, { frame: false }); }
      this.markers.push({ kind: 'branch', i, x: p[0], y: p[1] });
    });
    const go = S7.label('move');
    if (J.exits.length > 1) UI.prompt(g, [['move', 'GO'], ['left', 'CHOOSE']], r.W / 2, S.y1 - 10, { align: 'center', labels: { left: this.game.input.lastDevice === 'gamepad' ? 'L' : '◆' } });
    else UI.prompt(g, [['move', 'GO'], ['turn', 'TURN']], r.W / 2, S.y1 - 10, { align: 'center' });
    void go;
  }
  drawSkiFork(g, r, S) {
    const sim = this.sim, F = sim.skiForkAt; if (!F) return;
    const n = sim.rails.nodes[F.node];
    F.exits.forEach((x, i) => {
      const yaw = sim.rails.branchYaw(x, x.dir), p = this.proj(n.x + Math.cos(yaw) * 40, n.y + Math.sin(yaw) * 40, n.z + 20); if (!p) return;
      const f = i === F.i, lab = x.edge.label || (x.edge.kind === 'jump' ? 'JUMP' : 'RUN');
      UI.diamond(g, p[0], p[1], f ? 8 : 5, f ? RED : PAPER, true);
      UI.text(g, lab, p[0], p[1] + 10, f ? '#ffffff' : MUTED, { align: 'center', scale: f ? 2 : 1 });
      this.markers.push({ kind: 'branch', i, x: p[0], y: p[1] });
    });
  }
  /* ---- what △ would do here: a diamond over it and the prompt ---- */
  drawNear(g, r, S) {
    const sim = this.sim, N = sim.near;
    for (const o of sim.nearList || []) { if (N && o === N.spot) continue; const q = this.proj(o.x, o.y, o.z + 30); if (q) { UI.diamond(g, q[0], q[1], 4, MUTED, true); this.markers.push({ kind: 'spot', id: o.id, x: q[0], y: q[1] }); } }
    if (N) {
      const s = N.spot, p = this.proj(s.x, s.y, s.z + 34);
      if (p) { UI.diamond(g, p[0], p[1] - Math.sin(this.t * 4) * 2, 5, INK, true); UI.diamond(g, p[0], p[1] - Math.sin(this.t * 4) * 2, 4, '#ffe0a0', true); this.markers.push({ kind: 'spot', id: s.id, x: p[0], y: p[1] }); }
      UI.prompt(g, [['interact', N.verb]], r.W / 2, S.y1 - 26, { align: 'center', scale: 2 });
      if (N.label) UI.text(g, N.label, r.W / 2, S.y1 - 40, MUTED, { align: 'center' });
      if (sim.holdSpot) { const k = clamp(sim.holdSpot.t / 1.5, 0, 1); UI.rect(g, r.W / 2 - 40, S.y1 - 4, 80, 4, '#3a3438'); UI.rect(g, r.W / 2 - 40, S.y1 - 4, 80 * k, 4, '#8ae0ff'); }
    }
    // heal prompt when hurt
    const ps = sim.pstate(); if (ps.hp < sim.maxHp() * .5 && sim.st.red > 0 && !N && !sim.junction) UI.prompt(g, [['heal', 'DRINK RED']], S.x0, S.y1 - 10, {});
  }
  drawStatue(g, r, S) {
    const sim = this.sim, st = sim.st; if (st.persona !== 'ansel') return;
    for (const id of PERSONA_ORDER) {
      const s = st.roster[id]; if (!s.frozen || !s.statue || s.statue.area !== st.area) continue;
      const h = sim.hero, d = Math.hypot(s.statue.at[0] - h.x, s.statue.at[1] - h.y) / M, p = this.proj(s.statue.at[0], s.statue.at[1], s.statue.at[2] + 40);
      if (p && p[0] > 0 && p[0] < r.W) { UI.diamond(g, p[0], p[1], 6, '#8ae0ff', true); UI.text(g, S7.PERSONAS[id].short + ' ' + Math.round(d) + ' M', p[0], p[1] + 9, '#c8f4ff', { align: 'center' }); }
      else UI.text(g, '◆ ' + S7.PERSONAS[id].short + ' — ' + Math.round(d) + ' M', r.W / 2, S.y0 + 50, '#8ae0ff', { align: 'center', scale: 2 });
    }
  }
  /* ---- the Featherbed ring ---- */
  drawRing(g, r, S) {
    const sim = this.sim, R = sim.ring, cx = r.W / 2, cy = r.H / 2 + 6, rad = Math.min(78, r.H * .32);
    UI.veil(g, r, .45, '#0a0610');
    UI.big(g, 'THE FEATHERBED', cx, S.y0, 2);
    this.ringBoxes = [];
    PERSONA_ORDER.forEach((id, i) => {
      const a = -Math.PI / 2 + i * TAU / 7, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad, f = i === R.i, why = sim.whyNot(id), sz = f ? 36 : 26;
      const P = S7.PERSONAS[id];
      UI.portrait(g, S7.personaRig(id), x - sz / 2, y - sz / 2, sz, { bg: id === sim.st.persona ? '#4a1018' : '#1a1418', tint: why ? '#606068' : undefined });
      if (f) { UI.rect(g, x - sz / 2 - 2, y + sz / 2 + 1, sz + 4, 2, RED); }
      UI.text(g, String(P.n), x - sz / 2 - 2, y - sz / 2 - 2, f ? RED : MUTED);
      if (why) UI.text(g, why, x, y + sz / 2 + 4, '#8ae0ff', { align: 'center' });
      this.ringBoxes[i] = [x, y, sz / 2 + 4];
    });
    const P = S7.PERSONAS[PERSONA_ORDER[R.i]];
    UI.text(g, P.short, cx, cy - 12, '#ffffff', { scale: 2, align: 'center' });
    UI.text(g, P.epithet, cx, cy + 4, RED, { align: 'center' });
    UI.text(g, S7.WEAPONS[P.weapon].name + ' · ' + P.skill.name, cx, cy + 14, MUTED, { align: 'center' });
    UI.prompt(g, [['ring', 'RELEASE TO SWITCH']], cx, S.y1 - 8, { align: 'center' });
  }
  /* ---- aim mode ---- */
  drawAim(g, r, S) {
    const sim = this.sim, a = sim.aim, W = sim.weaponDef(), m = sim.mag();
    const ret = a.reticle ? [a.reticle[0] * r.W, a.reticle[1] * r.H] : [r.W / 2, r.H / 2];
    const [cx, cy] = [Math.round(ret[0]), Math.round(ret[1])];
    if (a.scope) {   // the scope: a ring vignette and crosshair
      g.save(); g.fillStyle = '#000'; g.beginPath(); g.rect(0, 0, r.W, r.H); g.arc(cx, cy, r.H * .42, 0, TAU, true); g.fill(); g.restore();
      UI.rect(g, cx - r.H * .42, cy, r.H * .84, 1, INK); UI.rect(g, cx, cy - r.H * .42, 1, r.H * .84, INK); UI.rect(g, cx - 1, cy - 1, 3, 3, RED);
    }
    // warm-spot diamonds on revealed Whiteouts within 30 m
    const eye = sim.eye();
    for (const e of sim.enemies) {
      if (!e.alive || !sim.isRevealed(e) || e.warmOpen === false) continue;
      const wp = sim.warmPos(e); if (V.dist(eye, wp) > 30 * M) continue;
      const p = this.proj(wp[0], wp[1], wp[2]); if (!p) continue;
      const pul = 4 + Math.sin(this.t * 10 + e.id) * 1.2; UI.diamond(g, p[0], p[1], pul + 1, INK); UI.diamond(g, p[0], p[1], pul, '#ffb040');
    }
    if (sim.boss) for (const w of sim.bossWarmSpots()) { if (!w.open) continue; const p = this.proj(w.p[0], w.p[1], w.p[2]); if (p) { UI.diamond(g, p[0], p[1], 7, INK); UI.diamond(g, p[0], p[1], 6, '#ffb040'); } }
    for (const s of sim.spots) if (s.target && !sim.spotUsed(s)) { const p = this.proj(s.x, s.y, s.z); if (p && p[2] < 140 * M) { UI.diamond(g, p[0], p[1], 5, '#a0e0ff'); if (s.far) UI.text(g, 'FAR', p[0], p[1] + 7, '#a0e0ff', { align: 'center' }); } }
    // the reticle, per persona
    const col = PAPER, pid = sim.st.persona;
    if (!a.scope) {
      if (pid === 'rurik' || pid === 'kasimir') { for (let k = 0; k < 12; k++) { const an = k / 12 * TAU, rr = pid === 'rurik' ? 12 : 16; E.px.dot(g, cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, col); } }
      else if (pid === 'brigid') { UI.rect(g, cx - 6, cy, 13, 1, col); UI.rect(g, cx, cy, 1, 8, col); UI.rect(g, cx - 3, cy + 4, 7, 1, col); UI.rect(g, cx - 2, cy + 8, 5, 1, col); }
      else { const gp = pid === 'dagny' ? 5 : 3; UI.rect(g, cx - gp - 5, cy, 5, 1, col); UI.rect(g, cx + gp + 1, cy, 5, 1, col); UI.rect(g, cx, cy - gp - 5, 1, 5, col); UI.rect(g, cx, cy + gp + 1, 1, 5, col); }
      UI.rect(g, cx, cy, 1, 1, RED);
    }
    // the scan cooldown ring round the reticle
    if (sim.scanCd > 0) { const k = 1 - sim.scanCd / 1.2, n = 24; for (let i = 0; i < n * k; i++) { const an = -Math.PI / 2 + i / n * TAU; E.px.dot(g, cx + Math.cos(an) * 20, cy + Math.sin(an) * 20, '#ff6070'); } }
    // ammo pips (or the Alphorn's heat)
    const n = W.mag, pw = n > 12 ? 2 : 4, tot = n * (pw + 1); for (let i = 0; i < n; i++) UI.rect(g, cx - tot / 2 + i * (pw + 1), cy + 24, pw, 4, i < m.n ? (W.heat ? '#ffb040' : PAPER) : '#3a3438');
    if (m.reload > 0) { const k = W.perShell ? m.n / W.mag : 1 - m.reload / (W.reload * (1 - .08 * sim.stats().speed)); UI.rect(g, cx - 20, cy + 31, 40, 2, '#3a3438'); UI.rect(g, cx - 20, cy + 31, 40 * clamp(k, 0, 1), 2, '#ffe0a0'); UI.text(g, W.heat ? 'OVERHEAT' : 'RELOADING', cx, cy + 35, MUTED, { align: 'center' }); }
    // laugh ripples: red arcs at the screen edge, toward each laugh, as thick as it is loud (the four loudest)
    if (this.game.settings.laughCues !== false) {
      const top = this.ripples.slice().sort((a2, b) => b.loud - a2.loud).slice(0, 4), pose = sim.cam.pose;
      for (const rp of top) {
        const ang = Math.atan2(rp.at[1] - pose.y, rp.at[0] - pose.x) - pose.yaw, k = 1 - rp.t / 1.4, th = Math.max(1, Math.round(rp.loud * 4 * k));
        const sx = Math.sin(ang), sy = -Math.cos(ang), ex = r.W / 2 + sx * (r.W / 2 - 10), ey = r.H / 2 + sy * (r.H / 2 - 10);
        for (let q = -3; q <= 3; q++) { const an2 = ang + q * .06, x2 = r.W / 2 + Math.sin(an2) * (r.W / 2 - 10), y2 = r.H / 2 - Math.cos(an2) * (r.H / 2 - 10); UI.rect(g, x2 - th / 2, y2 - th / 2, th, th, '#ff3040'); }
        void ex; void ey;
      }
    }
    // damage chevrons
    for (const c of this.chevrons) if (c.from) { const pose = sim.cam.pose, ang = Math.atan2(c.from[1] - pose.y, c.from[0] - pose.x) - pose.yaw, x2 = cx + Math.sin(ang) * 46, y2 = cy - Math.cos(ang) * 46; UI.diamond(g, x2, y2, 5, '#ff2030', true); }
    UI.prompt(g, [['fire', 'FIRE'], ['scan', 'SCAN'], ['skill', S7.PERSONAS[pid].skill.name.toUpperCase()]], r.W / 2, S.y1 - 8, { align: 'center' });
  }
  /* ---- splashes: THAW. (big), TOO FAR. (at the hit), RED +n ---- */
  drawSplashes(g, r, S) {
    for (const s of this.sim.splashes) {
      const u = s.t / s.life;
      if (s.small && s.at) { const p = this.proj(s.at[0], s.at[1], s.at[2]); if (p) UI.text(g, s.text, p[0], p[1] - 10 - u * 8, '#ffffff', { align: 'center', scale: 1 }); continue; }
      const sc = s.crit ? (u < .1 ? 5 : 4) : 3, y = r.H * .28 - u * 6;
      g.save(); g.globalAlpha = u < .8 ? 1 : 1 - (u - .8) / .2;
      UI.title(g, s.text, r.W / 2, y, sc, { colors: ['#ffffff', '#ffffff', '#e8e4dc'] });
      UI.rect(g, r.W / 2 - 40, y + sc * 9, 80, 3, RED);
      g.restore();
    }
  }
  drawToasts(g, r, S) {
    let y = S.y0 + (this.sim.tutorial ? 74 : 44);
    for (const t of this.sim.toasts) {
      const a = t.t < .15 ? t.t / .15 : t.t > t.life - .4 ? (t.life - t.t) / .4 : 1;
      g.save(); g.globalAlpha = clamp(a, 0, 1);
      if (t.line && t.who) { const P = S7.PERSONAS[t.who] || S7.PEOPLE[t.who]; const name = P ? (P.short || P.name || '').toUpperCase() : ''; UI.text(g, name, r.W / 2, y, RED, { align: 'center' }); UI.text(g, t.text, r.W / 2, y + 9, PAPER, { align: 'center', scale: 2, wrap: r.W * .8 }); y += 30; }
      else { UI.text(g, t.text, r.W / 2, y, t.big ? '#ffffff' : PAPER, { align: 'center', scale: t.big ? 2 : 1 }); y += t.big ? 18 : 11; }
      g.restore();
    }
  }
  drawTutorial(g, r, S) {
    const T0 = S7.TUTORIALS[this.sim.tutorial.id]; if (!T0) return;
    const y = S.y0 + 44, parts = T0.parts.map(p => [p[0], p[1]]);
    UI.panel(g, r.W / 2 - 110, y - 4, 220, T0.text ? 30 : 18, .7);
    UI.prompt(g, parts, r.W / 2, y, { align: 'center', scale: 1 });
    if (T0.text) UI.text(g, T0.text, r.W / 2, y + 13, MUTED, { align: 'center' });
  }
  drawBoss(g, r, S) {
    const b = this.sim.boss; if (!b || !b.hud) return;
    const w = r.W * .5, x = r.W / 2 - w / 2, y = S.y1 - 34;
    UI.text(g, b.hud.name, r.W / 2, y - 11, '#ffffff', { align: 'center', scale: 1 });
    UI.rect(g, x - 1, y - 1, w + 2, 6, INK); UI.rect(g, x, y, w * clamp(b.hud.k, 0, 1), 4, RED);
    if (b.hud.sub) UI.text(g, b.hud.sub, r.W / 2, y + 7, MUTED, { align: 'center' });
  }
  /* ---- the talk box: the name in red capitals, the text at scale 2 ---- */
  drawTalk(g, r, S) {
    const T0 = this.sim.talk, l = T0.lines[T0.i]; if (!l || l.card) return;
    const large = this.game.settings.textSize === 'large', sc = large ? 3 : 2, bw = Math.round(r.W * (large ? .92 : .8)), bx = Math.round((r.W - bw) / 2);
    const text = (l.text || '').slice(0, Math.floor(T0.shown));
    const lines = E.font.wrap ? E.font.wrap(l.text || '', bw - 16, { scale: sc }) : [l.text];
    const bh = 18 + (Array.isArray(lines) ? lines.length : 3) * (8 * sc + 2) + 6, by = S.y1 - bh;
    const P = S7.PEOPLE[l.who] || S7.PERSONAS[l.who], name = P ? (P.short || P.name).toUpperCase() : (l.who || '').toUpperCase();
    UI.panel(g, bx, by, bw, bh, .88);
    UI.rect(g, bx, by, bw, 2, RED);
    const rig = P && (S7.PERSONAS[l.who] ? S7.personaRig(l.who) : S7.peopleRig(l.who));
    if (rig) UI.portrait(g, rig, bx + 6, by - 30, 34, { bg: '#1a1014' });
    if (P && P.icon) S7.drawIcon(g, P.icon, bx + 8, by - 28, 30);
    UI.text(g, name, bx + (rig || (P && P.icon) ? 46 : 8), by - 11, RED, { scale: 2 });
    UI.text(g, text, bx + 8, by + 8, PAPER, { scale: sc, wrap: bw - 16 });
    if (T0.shown >= (l.text || '').length && Math.floor(this.t * 3) % 2) UI.diamond(g, bx + bw - 10, by + bh - 8, 3, RED, true);
    // a name card pops in big when the speaker changes
    if (T0.t < .45 && (T0.i === 0 || T0.lines[T0.i - 1].who !== l.who)) { const k = 1 - T0.t / .45; g.save(); g.globalAlpha = k; UI.title(g, name, r.W / 2, r.H * .3, 3); g.restore(); }
  }
  drawChoice(g, r, S) {
    const P = this.sim.prompt, w = 200, h = 22 + P.items.length * 16, x = r.W / 2 - w / 2, y = r.H / 2 - h / 2;
    UI.panel(g, x, y, w, h, .92); UI.rect(g, x, y, w, 2, RED);
    UI.text(g, P.title, r.W / 2, y + 5, RED, { align: 'center' });
    this.choiceBoxes = [];
    P.items.forEach((it, i) => { const yy = y + 18 + i * 16, f = i === P.i; if (f) UI.rect(g, x + 8, yy + 1, 4, 12, RED); UI.text(g, it, r.W / 2, yy, f ? '#ffffff' : MUTED, { align: 'center', scale: 2 }); this.choiceBoxes[i] = [x, yy - 2, w, 16]; });
  }
  /* ---- title cards: black, the title huge, a red subtitle, a sting ---- */
  drawCard(g, r) {
    const C = this.sim.card;
    UI.rect(g, 0, 0, r.W, r.H, '#000');
    if (C.silhouette) { const rig = S7.PEOPLE[C.silhouette] ? S7.peopleRig(C.silhouette) : null; if (rig) UI.portrait(g, rig, r.W / 2 - 40, r.H * .52, 80, { bg: '#000', frame: false, tint: '#000000' }); }
    const words = C.title.length > 22 ? 3 : 4;
    const lines = E.font.wrap(C.title, r.W * .9, { scale: words }) || [C.title];
    (Array.isArray(lines) ? lines : [C.title]).forEach((ln, i) => UI.title(g, ln, r.W / 2, r.H * .3 + i * (words * 9 + 4), words));
    if (C.sub) UI.text(g, C.sub, r.W / 2, r.H * .3 + (Array.isArray(lines) ? lines.length : 1) * (words * 9 + 4) + 6, RED, { align: 'center', scale: 2 });
  }
}
S7.Hud = Hud;
/** a little Edelweiss for the HUD slots and the Delegate Gate */
S7.drawFlower = (g, x, y, on) => {
  const c = on ? '#f4f1ea' : '#3a3438', k = on ? '#f0c030' : '#2a2428';
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; E.px.disc(g, x + Math.cos(a) * 4, y + Math.sin(a) * 4, 2, c); }
  E.px.disc(g, x, y, 2, k);
};
/** small drawn icons (items, Murmel's face) */
S7.drawIcon = (g, kind, x, y, s) => {
  const c = x + s / 2, m = y + s / 2;
  if (kind === 'key') { E.px.disc(g, c - s * .2, m, s * .18, '#e0b040'); UI.rect(g, c - s * .05, m - 1, s * .4, 3, '#e0b040'); UI.rect(g, c + s * .25, m, 2, s * .15, '#e0b040'); E.px.disc(g, c - s * .2, m, s * .07, '#0b0a0c'); }
  else if (kind === 'flower') S7.drawFlower(g, c, m, true);
  else if (kind === 'ember') { E.px.disc(g, c, m, s * .3, '#c0c4cc'); E.px.disc(g, c, m, s * .2, '#ff5020'); E.px.disc(g, c - 1, m - 1, s * .08, '#ffe0a0'); }
  else if (kind === 'bell') { E.px.poly(g, [[c - s * .25, m + s * .2], [c + s * .25, m + s * .2], [c + s * .15, m - s * .2], [c - s * .15, m - s * .2]], '#d8b040'); E.px.disc(g, c, m + s * .25, s * .06, '#8a6020'); }
  else if (kind === 'pin') { E.px.disc(g, c, m, s * .28, '#d8202a'); UI.text(g, '7', c - 2, m - 3, '#ffffff'); }
  else if (kind === 'paper') { UI.rect(g, c - s * .25, m - s * .32, s * .5, s * .64, '#f0ead8'); for (let i = 0; i < 4; i++) UI.rect(g, c - s * .18, m - s * .2 + i * 4, s * .36, 1, '#8a8590'); }
  else if (kind === 'murmel') { E.px.disc(g, c, m, s * .4, '#f4f4f0'); E.px.disc(g, c - s * .32, m - s * .32, s * .12, '#f4f4f0'); E.px.disc(g, c + s * .32, m - s * .32, s * .12, '#f4f4f0'); E.px.dot(g, c - s * .14, m - s * .05, '#000'); E.px.dot(g, c + s * .14, m - s * .05, '#000'); E.px.disc(g, c, m + s * .1, s * .06, '#2a1a1a'); }
  else if (kind === 'phone') { UI.rect(g, c - s * .3, m - s * .1, s * .6, s * .3, '#1a1a1e'); E.px.disc(g, c, m - s * .15, s * .15, '#1a1a1e'); }
  else if (kind === 'sign') { UI.rect(g, c - s * .3, m - s * .2, s * .6, s * .35, '#c8b48a'); UI.rect(g, c - 1, m + s * .15, 2, s * .3, '#5a3a1a'); }
};
