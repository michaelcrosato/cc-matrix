/* THE BOT (§14.3): plays through the same intents a person makes. It navigates the rails by BFS toward its route's
 * goal, fights honestly (aims at no more than 160°/s after a 0.25 s reaction, with a little noise; scans when it sees
 * nothing; reloads), switches personas for gates, heals below half, solves far bells, echoes, flashes, charges and the
 * safe, and fights the bosses. Attract mode runs it with cheats; the playthrough test runs it on the golden route. */
const DEGB = Math.PI / 180;
class Bot {
  constructor() { this.active = false; this.route = null; this.i = 0; this.t = 0; this.log = []; this.react = 0; this.target = null; this.stuck = 0; this.honest = true; this.metrics = {}; }
  run(route, o = {}) { this.active = true; this.route = route; this.i = 0; this.t = 0; this.stepT = 0; this.honest = o.honest !== false; this.onStep = o.onStep; this.done = false; this.failed = null; this.metrics = { hurt: {}, time: {}, red: 0, rime: 0, deaths: 0 }; S7.bus.on('hurt', d => { if (this.active && S7.sim) { const a = S7.sim.st.area; this.metrics.hurt[a] = (this.metrics.hurt[a] || 0) + d.dmg; } }); }
  stop() { this.active = false; }
  status() { return { active: this.active, i: this.i, step: this.route && this.route[this.i], done: this.done, failed: this.failed, t: Math.round(this.t) }; }
  /** this step's intents for the sim */
  intents(sim) {
    const I = S7.noIntents(); I.device = 'gamepad'; I.bot = true;
    this.t += 1 / 120; this.stepT += 1 / 120;
    if (!this.route || this.i >= this.route.length) { this.done = true; return I; }
    if (sim.st) this.metrics.time[sim.st.area] = (this.metrics.time[sim.st.area] || 0) + 1 / 120;
    if (sim.uiRequest) { const q = sim.uiRequest, st0 = this.route[this.i] || {}; if (!(q.kind === 'wardrobe' && st0.wardrobe) && !(q.kind === 'wax' && st0.wax) && !(q.kind === 'codelock' && st0.code)) sim.uiRequest = null; }
    if (sim.talk || sim.card) { if (Math.floor(this.t * 120) % 30 === 0) I.confirmP = true; return I; }
    if (sim.prompt && sim.prompt.choice) { I.confirmP = true; return I; }
    if (sim.mode === 'frozen') return I;
    const step = this.route[this.i];
    // a freeze happened: the Sweep goes to the statue and chips it free (any step)
    const statue = sim.statueHere();
    if (statue && sim.st.persona === 'ansel' && !sim.cutscene) return this.rescue(sim, I, statue);
    if (this.fightNeeded(sim, step)) return this.fight(sim, I);
    if (sim.aim.on && !step.shoot && !step.skillAt && !step.boss) { I.aimD = false; }
    // heal when below half, out of a fight
    const ps = sim.pstate(); if (ps.hp < sim.maxHp() * .5 && sim.st.red > 5 && !sim.W.edge && !sim.aim.on) { I.healD = true; return I; }
    const ok = this.doStep(sim, step, I);
    if (ok) { this.bossSeen = false; this.log.push(this.i + ':' + JSON.stringify(step).slice(0, 60) + ' @' + this.t.toFixed(1)); this.i++; this.stepT = 0; this.stuck = 0; if (this.onStep) this.onStep(this.i - 1, step, sim); }
    if (step.timeout && this.stepT > step.timeout) { this.failed = 'timeout at step ' + this.i + ' ' + JSON.stringify(step); this.active = false; }
    return I;
  }
  fightNeeded(sim, step) {
    if (step.noFight || sim.cutscene) return false;
    const h = sim.hero;
    if (sim.boss && step.boss) return false;
    return sim.enemies.some(e => e.alive && !e.passive && (V.dist2([e.x, e.y], [h.x, h.y]) < 26 * M || (e.type === 'snowballer' && V.dist2([e.x, e.y], [h.x, h.y]) < 50 * M)) && sim.grid.los(sim.eye(), [e.x, e.y, e.z + 20]));
  }
  /** turn toward (yaw, pitch) at human rates; true when on target */
  aimAt(sim, I, p, lob) {
    if (!lob && sim.weaponDef().kind === 'lob') lob = { v: 300, g: 300 };   // the Avalauncher's shells arc
    const eye = sim.eye(), d = V.sub(p, eye), yaw = Math.atan2(d[1], d[0]);
    let pitch = Math.atan2(d[2], Math.hypot(d[0], d[1]));
    if (lob) pitch = this.lobPitch(sim, p, lob);
    const a = sim.aim, rate = this.honest ? 160 * DEGB / 120 : 9;
    const dy = S7.angDiff(a.yaw, yaw), dp = pitch - a.pitch;
    const ny = a.yaw + clamp(dy, -rate, rate), np = a.pitch + clamp(dp, -rate * .7, rate * .7);
    I.lookAbs = [ny, np];
    return Math.abs(dy) < 1.2 * DEGB && Math.abs(dp) < 1.2 * DEGB;
  }
  /** the pitch that lobs a shell (speed, gravity, the shell's extra lift) onto point p */
  lobPitch(sim, p, lob) {
    const eye = sim.eye(), dx = Math.hypot(p[0] - eye[0], p[1] - eye[1]), dz = p[2] - eye[2];
    let best = 0, be = 1e9;
    for (let a = -.4; a < 1.2; a += .01) {
      const vx = Math.cos(a) * lob.v, vz = Math.sin(a) * lob.v + 40; const t = dx / vx; const z = vz * t - .5 * lob.g * t * t;
      const e = Math.abs(z - dz); if (e < be) { be = e; best = a; }
    }
    return best;
  }
  fight(sim, I) {
    I.aimD = true;
    if (!sim.aim.on) return I;
    const eye = sim.eye();
    // the nearest revealed warm spot in sight; else scan
    let best = null, bd = 1e9;
    for (const e of sim.enemies) {
      if (!e.alive || e.passive && !e.data.give) continue;
      const w = sim.warmPos(e), d = V.dist(eye, w);
      if (!sim.isRevealed(e) || d > 60 * M || !sim.grid.los(eye, w)) continue;
      const tgt = e.shield && !e.turned ? (sim.st.persona === 'rurik' || sim.st.persona === 'kasimir' ? [e.x, e.y, e.z + 20] : null) : w;
      if (tgt && d < bd) { bd = d; best = { e, p: tgt }; }
    }
    // snowballs and suitcases flying at us first
    for (const pr of sim.projectiles) if (pr.hostile && V.dist(eye, [pr.x, pr.y, pr.z]) < 18 * M) { best = { p: [pr.x, pr.y, pr.z] }; break; }
    if (!best) { if (sim.scanCd <= 0 && sim.enemies.some(e => e.alive && !sim.isRevealed(e))) I.scanP = true; return I; }
    if (this.target !== best.e) { this.target = best.e; this.react = this.honest ? .25 : 0; }
    if (this.react > 0) { this.react -= 1 / 120; return I; }
    const noise = this.honest ? (S7.rnd('fx') - .5) * .6 * DEGB : 0;
    const p = best.p.slice(); p[2] += noise * 40;
    const on = this.aimAt(sim, I, p);
    const m = sim.mag();
    if (m.n <= 0 && !sim.weaponDef().heat) I.reloadP = true;
    else if (on) { I.fireP = true; I.fireD = true; }
    return I;
  }
  rescue(sim, I, statue) {
    const h = sim.hero;
    if (V.dist(statue.at, [h.x, h.y, h.z]) < 2 * M && !sim.W.edge) { I.interactD = true; if (!sim.holdSpot) I.interactP = true; return I; }
    if (V.dist(statue.at, [h.x, h.y, h.z]) < 1.6 * M) { I.interactD = true; I.interactP = !sim.holdSpot; return I; }
    // walk toward the statue: the node nearest it, then along the edge
    const n = this.nearestNode(sim, statue.at);
    if (sim.W.node === n) { this.towardPoint(sim, I, statue.at); return I; }
    this.goto(sim, I, n);
    return I;
  }
  nearestNode(sim, p) { let b = null, bd = 1e9; for (const id in sim.rails.nodes) { const n = sim.rails.nodes[id], d = Math.hypot(n.x - p[0], n.y - p[1]); if (d < bd) { bd = d; b = id; } } return b; }
  towardPoint(sim, I, p) {
    const J = sim.junction; if (!J) return;
    let bi = 0, bd = 9; J.exits.forEach((x, i) => { const yaw = sim.rails.branchYaw(x, x.dir), d = Math.abs(S7.angDiff(yaw, Math.atan2(p[1] - sim.hero.y, p[0] - sim.hero.x))); if (d < bd) { bd = d; bi = i; } });
    I.branchPick = bi; I.move = true;
  }
  /** BFS over the rail graph toward node `to` (in the current area): the next edge from the walker's node */
  path(sim, from, to) {
    const G = sim.rails, prev = { [from]: null }, q = [from];
    while (q.length) {
      const n = q.shift(); if (n === to) break;
      for (const x of G.exits(n)) {
        if (x.edge.hidden) continue;
        if (x.edge.gate && !sim.gateOpen(x.edge.gate) && !this.canOpen(sim, x.edge)) continue;
        const m = G.endNode(x.edge, x.dir); if (m in prev) continue; prev[m] = { n, x }; q.push(m);
      }
    }
    if (!(to in prev)) return null;
    let k = to, first = null; while (prev[k]) { first = prev[k].x; k = prev[k].n; }
    return first;
  }
  canOpen(sim, e) { const g = sim.areaDef.gates[e.gate]; if (!g) return false; if (g.kind === 'patrol') return sim.st.persona === 'ansel'; if (g.kind === 'buyout') return sim.st.persona === 'rurik' && sim.st.red >= g.price; if (g.kind === 'key') return !!sim.st.items[g.item]; if (g.kind === 'icelock') return !!sim.st.items.ember; if (g.kind === 'delegate') return (sim.st.items.edelweiss || 0) >= 3; if (g.kind === 'flag') return !!sim.st.flags[g.flag]; return false; }
  /** walk toward node `to`; true once standing on it */
  goto(sim, I, to) {
    const W = sim.W;
    if (!sim.rails.nodes[to]) return true;   // (the exit was taken: a new area)
    if (W.node === to && !W.edge) return true;
    if (W.edge) {
      const e = sim.rails.edges[W.edge];
      I.move = e.kind !== 'lift' && e.kind !== 'jump';
      if (e.kind === 'ski') { I.move = true; if (sim.skiForkAt) { const want = this.path(sim, sim.skiForkAt.node, to); if (want) { const k = sim.skiForkAt.exits.findIndex(x => x.edge.id === want.edge.id); if (k >= 0) I.branchPick = k; } } if (sim.st.persona === 'dagny') I.skillD = true; }
      // turn back when walking away from the goal on a two-way edge
      if (e.kind === 'walk' || e.kind === 'stairs') { const end = sim.rails.endNode(e, W.dir), next = end === to ? null : this.path(sim, end, to); if (end !== to && !next) I.turnP = this.stepT % 1 < .01; }
      return false;
    }
    const x = this.path(sim, W.node, to);
    if (!x) { this.stuck += 1 / 120; return false; }
    if (sim.junction) { const k = sim.junction.exits.findIndex(y => y.edge.id === x.edge.id && y.dir === x.dir); if (k >= 0) { I.branchPick = k; sim.junction.i = k; } }
    I.move = true;
    if (x.edge.kind === 'lift') I.interactP = true;
    if (x.edge.kind === 'jump' || (x.edge.kind === 'ski' && sim.st.persona === 'dagny')) I.skillD = true;
    return false;
  }
  doStep(sim, s, I) {
    if (s.area) return sim.st.area === s.area && !sim.cutscene;
    if (s.wait) return this.stepT >= s.wait;
    if (s.until) return s.until(sim);
    if (s.flag) return !!sim.st.flags[s.flag];
    if (s.persona && !s.shoot && !s.skillAt && !s.skill) {
      if (sim.st.persona === s.persona && !sim.switching) return true;
      if (s.persona === 'ansel' && sim.areaDef.kind !== 'room7') { sim.trySwitch('ansel', true); return false; }
      if (sim.canSwitch() && !sim.switching) I.pick = PERSONA_ORDER.indexOf(s.persona);
      return false;
    }
    if (s.goto) { const at = this.goto(sim, I, s.goto); if (at && s.then === 'interact') { I.interactP = true; return true; } return at; }
    if (s.interact) {
      const sp = sim.spots.find(x => x.id === s.interact);
      if (!sp) return true;
      if ((sim.nearList || []).some(x => x.id === sp.id)) { I.interactP = true; I.spotPick = sp.id; return true; }
      const n = sp.node || this.nearestNode(sim, [sp.x, sp.y, sp.z]);
      if (this.goto(sim, I, n)) { if ((sim.nearList || []).some(x => x.id === sp.id)) { I.interactP = true; I.spotPick = sp.id; return true; } this.towardPoint(sim, I, [sp.x, sp.y, sp.z]); }
      return false;
    }
    if (s.shoot || s.skillAt) {
      const sp = sim.spots.find(x => x.id === (s.shoot || s.skillAt));
      if (!sp || sim.spotUsed(sp)) { I.aimD = false; return !sim.aim.on || true; }
      if (s.from && !(sim.W.node === s.from && !sim.W.edge)) { this.goto(sim, I, s.from); return false; }
      const who = s.persona; if (who && sim.st.persona !== who) { if (sim.canSwitch() && !sim.switching) I.pick = PERSONA_ORDER.indexOf(who); return false; }
      I.aimD = true; if (!sim.aim.on) return false;
      if (s.scope && !sim.aim.scope) { I.skillP = this.stepT % .5 < 1 / 120; return false; }
      const lob = s.skillAt && who === 'brigid' ? { v: 520, g: 240 } : null;
      const on = this.aimAt(sim, I, [sp.x, sp.y, sp.z], lob);
      if (on && this.stepT > .6) { if (s.skillAt) { if (this.stepT % 1.5 < 1 / 120) I.skillP = true; } else if (sim.mag().n > 0) { I.fireP = true; I.fireD = true; } else I.reloadP = true; }
      return false;
    }
    if (s.skill) { if (sim.st.persona !== s.persona) { if (sim.canSwitch()) I.pick = PERSONA_ORDER.indexOf(s.persona); return false; } I.skillP = true; return true; }
    if (s.code) { const sp = sim.spots.find(x => x.id === s.code); if (sim.uiRequest && sim.uiRequest.kind === 'codelock') { sim.uiRequest = null; sim.solveSpot(sp); return true; } if (sim.spotUsed(sp)) return true; return this.doStep(sim, { interact: s.code }, I) && false; }
    if (s.ui) { if (sim.uiRequest) { sim.uiRequest = null; return true; } return this.stepT > 2; }
    if (s.wardrobe) { if (sim.uiRequest && sim.uiRequest.kind === 'wardrobe') { sim.uiRequest = null; sim.trySwitch(s.wardrobe, true); return true; } return sim.st.persona === s.wardrobe; }
    if (s.wax) {
      if (!(sim.uiRequest && sim.uiRequest.kind === 'wax')) return this.stepT > 3;
      sim.uiRequest = null;
      const costs = [3, 5, 8, 12, 16];
      for (let k = 0; k < 20; k++) { let bought = false; for (const id of PERSONA_ORDER) { const r = sim.st.roster[id]; if (!r.unlocked) continue; const stat = Object.keys(r.stats).sort((a, b) => r.stats[a] - r.stats[b])[0], lv = r.stats[stat]; if (lv < 5 && sim.st.rime >= costs[lv]) { sim.st.rime -= costs[lv]; r.stats[stat]++; bought = true; } } if (!bought) break; }
      return true;
    }
    if (s.boss) return this.boss(sim, s, I);
    if (s.clear) { if (!sim.anyAlive()) return true; return false; }
    if (s.ski) { I.move = true; if (sim.st.persona === 'dagny') I.skillD = true; if (sim.skiForkAt && s.fork) { const k = sim.skiForkAt.exits.findIndex(x => x.edge.id === s.fork); if (k >= 0) I.branchPick = k; } return s.until2 ? s.until2(sim) : false; }
    if (s.do) { s.do(sim); return true; }
    return true;
  }
  boss(sim, s, I) {
    const B = sim.boss;
    if (B && B.id === s.boss) this.bossSeen = true;
    if (!B) return !!this.bossSeen;
    if (sim.resultsReady !== null && sim.resultsReady !== undefined) return true;
    if (B.id === 'hansi' && B.phase === 3) { if (sim.mode === 'interview') { this.aimAt(sim, I, B.actors[0] ? [B.actors[0].x, B.actors[0].y, B.actors[0].z + 30] : [0, 0, 0]); if (s.spare) return false; if (this.stepT > 3) { I.fireP = true; I.fireD = true; } } return false; }
    if (sim.cutscene || B.phase === 0) return false;
    const ps = sim.pstate(); if (ps.hp < sim.maxHp() * .35 && sim.st.red > 15 && sim.mode !== 'interview') { I.aimD = false; if (!sim.aim.on) I.healD = true; return false; }
    if (B.id === 'hansi' && B.phase === 2) { I.move = true; if (sim.st.persona === 'dagny') I.skillD = true; }
    const spots = sim.bossWarmSpots().filter(w => w.open);
    I.aimD = true;
    // an open warm spot first; else shoot down what is flying at us
    const warmOpen = spots.find(x => x.kind === 'warm');
    if (!warmOpen) for (const pr of sim.projectiles) if (pr.hostile && V.dist(sim.eye(), [pr.x, pr.y, pr.z]) < 22 * M) { if (sim.aim.on && this.aimAt(sim, I, [pr.x, pr.y, pr.z])) { I.fireP = true; I.fireD = true; } return false; }
    const near = sim.enemies.filter(e => e.alive && sim.isRevealed(e)).sort((a, b) => V.dist2([a.x, a.y], [sim.hero.x, sim.hero.y]) - V.dist2([b.x, b.y], [sim.hero.x, sim.hero.y]))[0];
    if (near && V.dist2([near.x, near.y], [sim.hero.x, sim.hero.y]) < 10 * M) { if (sim.aim.on && this.aimAt(sim, I, sim.warmPos(near))) { I.fireP = true; I.fireD = true; } return false; }
    const w = spots.find(x => x.kind === 'warm') || spots.find(x => x.kind === 'body');
    if (w && sim.aim.on) { if (this.aimAt(sim, I, w.p)) { if (sim.mag().n > 0) { I.fireP = true; I.fireD = true; } else I.reloadP = true; } }
    else if (!w && sim.aim.on && sim.scanCd <= 0 && sim.enemies.some(e => e.alive && !sim.isRevealed(e))) I.scanP = true;
    return false;
  }
}
S7.Bot = Bot;
S7.bot = new Bot();
