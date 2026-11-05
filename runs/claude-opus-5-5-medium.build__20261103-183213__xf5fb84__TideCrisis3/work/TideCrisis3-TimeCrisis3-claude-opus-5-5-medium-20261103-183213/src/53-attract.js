// 53-attract: the Autopilot (a bot that gives the same Commands a player does: perception of the Sim, target
// priority, a damped aim with a reaction delay, cover timing against threats, reloads, weapon choice) in three
// skills: fair (tests and balance), expert, showoff (attract: uses every weapon and bonus target). And the attract
// controller: 10 s idle on the title or menu -> DEMO (a highlight, with cheats) -> HIGH SCORES -> DEMO -> TITLE ...
// Reads: Sim (20), assist targets (46).

const SKILL = { fair: { react: .3, speed: 2.2, head: .3 }, expert: { react: .18, speed: 3.5, head: .6 }, showoff: { react: .16, speed: 3.6, head: .6, show: true } };
class Autopilot {
  constructor(skill = 'fair') { this.skill = SKILL[skill] || SKILL.fair; this.name = skill; this.aim = [0, -.1]; this.tgt = null; this.react = 0; this.head = false; this.coverT = 0; this.t = 0; this.R = mkRng(hashStr('bot' + skill)); this.wpT = 0; }
  // candidates: { key, p (world point), r, pri, kind, ref }
  candidates(sim, i) {
    const out = [], mine = sim.threats.filter(t => !t.done && t.target === i);
    const srcIds = new Set(mine.map(t => t.src));
    for (const e of sim.enemies) {
      if (e.dead || !e.vols || e.A.ai === 'turret' || (e.o && e.o.civ)) continue;
      const exposed = e.up > .85 && (e.state !== 'hide' || (e.cover && e.cover.h >= 30 && e.side));
      if (!exposed && e.state !== 'enter' && e.A.ai !== 'drone' && e.A.ai !== 'runner' && e.A.ai !== 'rusher' && e.A.ai !== 'jetski') continue;
      const head = e.vols.find(v => v.part === 'head'), body = e.vols.find(v => v.part === 'body'), ski = e.vols.find(v => v.part === 'ski');
      let pri = 6; if (srcIds.has(e.id)) pri = 1; else if (e.A.elite) pri = 3; else if (e.A.ai === 'rusher') pri = 4; else if (e.A.ai === 'shield') pri = 5; else if (e.A.ai === 'runner') pri = 4.5;
      const p = body ? (body.cap ? vlerp(body.a, body.b, .55) : body.c) : head ? head.c : [e.x, e.y, e.z + 18];
      const shielded = e.A.ai === 'shield' && e.shieldDown <= 0;
      if (shielded && !(e.state === 'aim' || e.state === 'fire')) { out.push({ key: 'e' + e.id, p, hp: head ? head.c : p, r: body ? body.r : 5, pri: 9, kind: 'enemy', ref: e, shield: true }); continue; }
      out.push({ key: 'e' + e.id, p: shielded && head ? head.c : p, hp: head ? head.c : p, r: shielded && head ? head.r : body ? body.r : 5, pri, kind: 'enemy', ref: e, shield: shielded, headOnly: shielded });
      if (ski && e.skiHp > 0) out.push({ key: 's' + e.id, p: ski.c, hp: ski.c, r: ski.r, pri: pri + .5, kind: 'enemy', ref: e });
    }
    for (const pr of sim.projectiles) if (pr.shootable && pr.team === 'enemy') out.push({ key: 'p' + pr.id, p: pr.pos, hp: pr.pos, r: pr.r, pri: pr.kind === 'torpedo' ? .5 : 2, kind: 'proj', ref: pr });
    if (sim.boss && !sim.boss.defeated) for (const pt of sim.boss.parts) if (pt.alive && pt.pos && !pt.hidden && (pt.hp < 900 || pt.link)) out.push({ key: 'b' + pt.id, p: pt.pos, hp: pt.pos, r: pt.r, pri: pt.id === 'lever' ? 0 : pt.armor ? 9 : srcIds.has('boss') ? 1.5 : 6.5, kind: 'boss', ref: pt, armor: pt.armor });
    for (const ob of sim.objects) if (!ob.dead && (ob.K.objective || (this.skill.show && (ob.K.bonus || ob.explosive)))) out.push({ key: 'o' + ob.id, p: ob.pos, hp: ob.pos, r: ob.r || 5, pri: ob.K.objective ? 6.2 : ob.explosive ? 8 : 7, kind: 'object', ref: ob });
    return out;
  }
  visible(sim, i, c) {
    const cs = sim.camSetupFor(i), d = vnorm(vsub(c.p, cs.pos)), hit = sim.raycast(cs.pos, d);
    if (!hit) return false;
    if (c.kind === 'enemy') return hit.kind === 'enemy' && hit.e === c.ref || (c.shield && !c.headOnly && hit.kind === 'shield' && hit.e === c.ref && (sim.players[i].ammo.sg > 0 || sim.players[i].ammo.gl > 0));
    if (c.kind === 'proj') return hit.kind === 'proj' && hit.pr === c.ref;
    if (c.kind === 'boss') return hit.kind === 'boss' && hit.part === c.ref;
    if (c.kind === 'object') return hit.kind === 'object' && hit.ob === c.ref;
    return false;
  }
  command(sim, i, dt) {
    const p = sim.players[i], S = this.skill; this.t += dt;
    const cmd = { aim: this.aim.slice(), fireDown: false, fireP: false, cover: false, next: false, prev: false, sel: 0, reload: false, advance: false, skip: false, autoFire: true };
    if (!p) return cmd;
    if (sim.phase === 'cut') { cmd.advance = sim.cut && sim.cut.line && sim.cut.lineT > (this.name === 'showoff' ? 1.4 : .9); cmd.skip = this.name === 'fair'; return cmd; }
    if (p.out) { cmd.advance = true; return cmd; }
    if (sim.phase !== 'action') { this.aim[0] *= .9; this.aim[1] = lerp(this.aim[1], -.05, .05); cmd.aim = this.aim.slice(); return cmd; }
    const cs = sim.camSetupFor(i), mine = sim.threats.filter(t => !t.done && t.target === i && !t.unblockable).sort((a, b) => a.left - b.left), soon = mine[0];
    const torpedo = sim.threats.some(t => !t.done && t.target === i && t.unblockable);
    // cover: hide when an impact is due, to reload, or while switching
    let hide = false;
    if (soon && soon.left < .28 && !torpedo) hide = true;
    if (sim.boss && sim.boss.id === 'hammerhead' && sim.boss.mode === 'sweepFire') hide = true;
    if (p.w === 'hg' && p.mag === 0) hide = true;
    if (p.w === 'hg' && p.mag <= 2 && !soon && !this.tgt) hide = true;
    if (p.c >= .5 && p.mag < 9 && p.reloadT > 0 && !(soon && soon.left < .1)) hide = hide || p.mag < 9 && p.reloadT < tune.player.reload;
    if (soon && soon.left > .3 && p.mag > 0 && p.c > .5 && !(p.w === 'hg' && p.mag < 9 && p.reloadT > 0)) hide = false;
    this.coverT = hide ? this.coverT + dt : 0;
    cmd.cover = hide;
    // targets
    const cands = this.candidates(sim, i).filter(c => !(c.kind === 'boss' && c.armor && p.w !== 'gl' && p.w !== 'sg' && !(sim.boss && sim.boss.id === 'hammerhead')));
    cands.sort((a, b) => a.pri - b.pri || vdist(a.p, cs.pos) - vdist(b.p, cs.pos));
    let target = null;
    if (this.tgt) target = cands.find(c => c.key === this.tgt && c.pri <= (cands[0] ? cands[0].pri : 9)) || null;
    let headOnly = false;
    if (!target) for (const c of cands.slice(0, 6)) { if (this.visible(sim, i, c)) { target = c; break; } if (c.kind === 'enemy' && c.hp !== c.p && this.visible(sim, i, Object.assign({}, c, { p: c.hp }))) { target = c; headOnly = true; break; } }
    if (target && target.key !== this.tgt) { this.tgt = target.key; this.react = S.react * (sim.mode === 'attract' ? .8 : 1); this.head = headOnly || (target.kind === 'enemy' && this.R() < S.head && !target.shield); }
    if (!target) this.tgt = null;
    // weapon choice
    this.wpT -= dt;
    if (this.wpT <= 0 && p.c < .5) {
      const have = id => p.ammo[id] > 0 || ((sim.cheats.ammo || tune.player.infAmmo) && p.owned[id]);
      let want = 'hg';
      if (target) {
        const e = target.ref, d = vdist(target.p, cs.pos);
        if (target.shield && have('sg')) want = 'sg';
        else if (target.kind === 'boss' && target.armor && have('gl')) want = 'gl';
        else if (target.kind === 'boss' && have('mg')) want = 'mg';
        else if (target.kind === 'enemy' && (e.A.ai === 'drone' || e.A.ai === 'jetski') && have('mg')) want = 'mg';
        else if (target.kind === 'enemy' && e.A.ai === 'rusher' && have('sg')) want = 'sg';
        else if (target.kind === 'enemy' && d < 160 && have('sg') && S.show) want = 'sg';
        else if (S.show && have('mg') && cands.filter(c => c.kind === 'enemy').length >= 3) want = 'mg';
        else if (S.show && have('gl') && target.kind === 'enemy' && this.R() < .08) want = 'gl';
      }
      if (p.w === 'hg' && p.mag === 0 && want === 'hg') want = 'hg';
      if (want !== p.w) cmd.sel = TC.WEAPONS.indexOf(want) + 1;
      this.wpT = .5;
    }
    // aim: a damped move toward the target's head or chest
    if (target) {
      const pt = this.head ? target.hp : target.p, v = projectVU(cs, pt);
      if (v) {
        if (this.react > 0) this.react -= dt;
        else {
          const dx = v[0] - this.aim[0], dy = v[1] - this.aim[1], d = Math.hypot(dx, dy), step = S.speed * dt;
          if (d <= step) { this.aim[0] = v[0]; this.aim[1] = v[1]; } else { this.aim[0] += dx / d * step; this.aim[1] += dy / d * step; }
          const rv = (target.r * (this.head ? .7 : .9)) / (v[2] * cs.t);
          if (Math.hypot(v[0] - this.aim[0], v[1] - this.aim[1]) < rv && p.c < .2 && !hide) { cmd.fireDown = true; cmd.fireP = p.cool <= 0; }
        }
      }
    } else if (!hide) { this.aim[0] *= .98; }
    const asp = p.aspect || 16 / 9; this.aim[0] = clamp(this.aim[0], -asp, asp); this.aim[1] = clamp(this.aim[1], -1, 1);
    cmd.aim = this.aim.slice();
    return cmd;
  }
}
TC.Autopilot = Autopilot;

// ---------------------------------------------------------------- the attract mode
def('highlight', 'h1', { stage: 1, scene: '1-1', len: 26 });
def('highlight', 'h2', { stage: 1, scene: '1-4', len: 26 });
def('highlight', 'h3', { stage: 1, scene: '1-B', len: 30 });
def('highlight', 'h4', { stage: 2, scene: '2-1', len: 26 });
def('highlight', 'h5', { stage: 2, scene: '2-3', len: 28 });
def('highlight', 'h6', { stage: 2, scene: '2-B', len: 30 });
def('highlight', 'h7', { stage: 3, scene: '3-2', len: 28 });
def('highlight', 'h8', { stage: 3, scene: '3-3', len: 26 });
def('highlight', 'h9', { stage: 3, scene: '3-5', len: 30 });
const Attract = {
  idle: 0, phase: 'title', i: 0, t: 0, session: null, lastProgress: 0, lastHash: '',
  // input that wakes the title: any key or button, a pointer move over 4 px, the wheel, a stick past its dead zone
  anyInput(game) {
    const I = game.input; let any = I.anyPressed() || (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .3) || !!I.padAim || (I.clicked && I.clicked());
    const ptr = I.pointer ? I.pointer() : null; if (ptr) { if (this.lastPtr && Math.hypot(ptr[0] - this.lastPtr[0], ptr[1] - this.lastPtr[1]) > 4) any = true; this.lastPtr = ptr.slice(); }
    for (const q of game.players || []) if (q !== I && q.anyPressed && q.anyPressed()) any = true;
    return any;
  },
  playlist() { return all('highlight'); },
  startDemo(game) {
    const list = this.playlist(), h = list[this.i % list.length]; this.i++;
    this.phase = 'demo'; this.t = 0; this.len = h.len; this.lastProgress = 0;
    this.session = new Session(game, { mode: 'attract', simMode: 'attract', stages: [h.stage], stage: h.stage, scene: h.scene, cheats: { god: true, ammo: true }, bot: 'showoff', players: [{ input: null, agent: 'kai' }], seed: 7 + this.i, skipCuts: true });
    const p = this.session.sim.players[0]; for (const w of ['mg', 'sg', 'gl']) { p.owned[w] = true; p.ammo[w] = get('weapon', w).pool; }
    for (const h of this.session.huds) h.noPrompts = true;
    this.watch = { hash: '', t: 0 };
    return this.session;
  },
  // the watchdog: if nothing progresses for 8 s, move on
  progressed(sim) { const s = sim.phase + sim.sceneId + sim.enemies.filter(e => !e.dead).length + Math.round(sim.travelD / 50) + (sim.boss ? sim.boss.parts.map(p => Math.round(p.hp)).join() : ''); if (s !== this.watch.hash) { this.watch.hash = s; this.watch.t = 0; return true; } return false; }
};
TC.Attract = Attract;
