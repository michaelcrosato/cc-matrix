// 53-bot.js — the Autopilot (produces the same Commands a player's device does) and the attract mode controller:
// DEMO (highlight i, ~28 s) -> HIGH SCORES (6 s) -> DEMO (i+1) -> TITLE (8 s) -> repeat. Any input exits to the title.
const SKILL = { fair: { react: .30, speed: 2.2, head: .3 }, expert: { react: .18, speed: 3.5, head: .6 }, showoff: { react: .18, speed: 3.5, head: .6 } };
const Bot = {
  style: 'showoff', st: {},
  S(pid) { return this.st[pid] || (this.st[pid] = { ax: 0, ay: 0, seen: {}, cov: 0, fireT: 0, cooldown: 0 }); },
  setStyle(s) { this.style = s; },
  command(sim, p, dt) {
    const S = this.S(p.id), sk = SKILL[this.style] || SKILL.fair, cmd = { aim: [S.ax, S.ay], coverDown: false, autoFire: true };
    if (p.down) return cmd; const pose = sim.pose(p.id);
    // threats on me
    let soon = 9; for (const th of sim.threats) if (th.tgt === p.id) soon = Math.min(soon, th.at - sim.t);
    const hasShield = () => false;
    let needCover = soon < .3 + (this.style === 'fair' ? .05 : 0) && soon > -.1;
    if (needCover && S.onT && soon > .1) { const th0 = sim.threats.find(t => t.tgt === p.id && t.at - sim.t === soon); const src = th0 && sim.enemies.find(x => x.id === th0.src); if (src && !src.dead && src.hp <= (p.weapon === 0 ? tune.weapon.hgDmg : 1) * 1.0 + .01 && S.lastTarget === src.id) needCover = false; }
    if (S.cov > 0) { S.cov -= dt; needCover = true; }
    if (!needCover && p.weapon === 0 && p.mag <= (this.style === 'fair' ? 1 : 2) && soon > .6 && p.c < 1) { needCover = true; S.cov = Math.max(S.cov, .45); }
    if (needCover && soon < .3) S.cov = Math.max(S.cov, .35);
    // persisting until the reload is finished
    if (p.weapon === 0 && p.mag < 9 && p.c > .5 && soon > .5) needCover = true;
    // target
    const tg = this.pickTarget(sim, p, pose, S, sk); let want = 0;
    if (tg) {
      want = tg.w == null ? 0 : tg.w; if (want > 0 && p.ammo[want] <= 0) want = 0;
      const dx = tg.ax - S.ax, dy = tg.ay - S.ay, d = Math.hypot(dx, dy), gain = Math.min(1, dt * sk.speed * 3.2); S.ax += dx * gain; S.ay += dy * gain; if (d > 0) { const mx = sk.speed * dt * 1.0; const step = Math.min(d, Math.max(mx, d * gain)); }
      cmd.aim = [S.ax, S.ay]; S.onT = d < .045; S.lastTarget = typeof tg.id === 'string' ? parseInt(tg.id) : tg.id;
      if (p.weapon !== want && p.c < .3 && p.switchT <= 0) { cmd.select = want + 1; }
      if (S.onT && !tg.pre && p.c < .2 && p.weapon === want) { cmd.firePressed = true; cmd.fireDown = true; }
    } else { S.ax += (0 - S.ax) * Math.min(1, dt * 2); S.ay += (-.15 - S.ay) * Math.min(1, dt * 2); cmd.aim = [S.ax, S.ay]; if (p.weapon !== 0 && p.c < .3) cmd.select = 1; }
    cmd.coverDown = needCover;
    if (needCover) { cmd.fireDown = false; cmd.firePressed = false; }
    return cmd;
  },
  pickTarget(sim, p, pose, S, sk) {
    const cand = [], aimOf = (pt) => R3.aimOf(pose, pt);
    const add = (pt, pri, w, id, extra) => { const a = aimOf(pt); if (!a) return; if (Math.abs(a[0]) > p.aspect * 1.2 || Math.abs(a[1]) > 1.1) return; if (id != null) { const k = id; if (S.seen[k] == null) S.seen[k] = sim.t; if (sim.t - S.seen[k] < sk.react) return; } cand.push(Object.assign({ ax: a[0], ay: a[1], pri, w, id }, extra)); };
    for (const th of sim.threats) if (th.tgt === p.id) { const e = sim.enemies.find(x => x.id === th.src); if (e && !e.dead) { const v = sim.volumes(e).find(q => q.part === 'torso'); if (v) add(v.k === 's' ? v.c : [(v.a[0] + v.b[0]) / 2, (v.a[1] + v.b[1]) / 2, (v.a[2] + v.b[2]) / 2], 0, this.weaponFor(e), e.id); } }
    for (const pr of sim.proj) if (!pr.dead && pr.team !== 'p') add([pr.x, pr.y, pr.z], 1, 0, 'p' + pr.id);
    for (const e of sim.enemies) {
      if (e.dead || e.gone || e.civ || e.ally) continue; const vs = sim.volumes(e); if (!vs.length) continue; const d = reg('enemy', e.type);
      const pri = (e.type === 'quartermaster' ? 1 : d.elite ? 2 : d.ai === 'rush' ? 3 : e.type === 'shield' ? 4 : 5) + (e.exposedAt != null && sim.t - e.exposedAt < 1 ? 0 : 1);
      const centre = v => v.k === 's' ? v.c : v.k === 'c' ? [(v.a[0] + v.b[0]) / 2, (v.a[1] + v.b[1]) / 2, (v.a[2] + v.b[2]) / 2] : [(v.box.x0 + v.box.x1) / 2, (v.box.y0 + v.box.y1) / 2, (v.box.z0 + v.box.z1) / 2];
      const wantHead = d.elite || (e.id * 7 % 10) / 10 < sk.head, order = vs.filter(v => v.part !== 'shield').sort((a, b) => (wantHead ? (a.part === 'head' ? -1 : 0) - (b.part === 'head' ? -1 : 0) : (a.part === 'torso' ? -1 : 0) - (b.part === 'torso' ? -1 : 0)));
      let pick = null; for (const v of order) { const pt = centre(v), a = aimOf(pt); if (!a) continue; const ray = R3.ray(pose, a[0], a[1]), hit = sim.castRay(ray.o, ray.d, { skip: p.id }); if (hit.ent === e || (v.ski && hit.ent === e)) { pick = pt; break; } }
      if (pick) add(pick, pri, this.weaponFor(e), e.id + ':' + e.exposures);
    }
    if (sim.boss && !sim.boss.dead) for (const v of sim.bossVolumes()) { const pt = v.k === 's' ? v.c : [(v.box.x0 + v.box.x1) / 2, (v.box.y0 + v.box.y1) / 2, (v.box.z0 + v.box.z1) / 2]; const part = sim.boss.parts[v.key]; if (v.shield && (p.ammo[2] > 0 || p.ammo[3] > 0) && !(sim.boss.shieldDown > 0)) { const aa0 = aimOf([(v.box.x0 + v.box.x1) / 2, (v.box.y0 + v.box.y1) / 2, (v.box.z0 + v.box.z1) / 2]); if (aa0) { const r0 = R3.ray(pose, aa0[0], aa0[1]), h0 = sim.castRay(r0.o, r0.d, { skip: p.id }); if (h0.kind === 'boss') add([(v.box.x0 + v.box.x1) / 2, (v.box.y0 + v.box.y1) / 2, (v.box.z0 + v.box.z1) / 2], 3, p.ammo[2] > 0 ? 2 : 3, 'bshield'); } continue; } if (!part || part.vulnerable === false || v.shield) continue; const aa = aimOf(pt); if (!aa) continue; const rr = R3.ray(pose, aa[0], aa[1]), hh = sim.castRay(rr.o, rr.d, { skip: p.id }); if (hh.kind !== 'boss') continue; add(pt, 4, sim.boss.id === 'seawolf' ? 1 : sim.boss.id === 'scylla' || sim.boss.id === 'stingray' ? 3 : sim.boss.id === 'hammerhead' ? 2 : 0, 'b' + v.key + (v.mult || 0)); }
    for (const o of sim.objs) { if (o.dead || (!o.lock && !o.ring && !o.intel && !(o.kind === 'lever'))) continue; add([o.x, o.y, o.z + o.h / 2], o.lock || o.kind === 'lever' ? 3 : 8, 0, 'o' + o.id); }
    if (!cand.length) { let best = null; for (const e of sim.enemies) { if (e.dead || e.gone || e.civ || !e.cover) continue; const pt = sim.exposedPos(e); const a = aimOf(pt); if (!a || Math.abs(a[0]) > p.aspect || Math.abs(a[1]) > 1) continue; const d = Math.hypot(a[0] - S.ax, a[1] - S.ay); if (!best || d < best.d) best = { d, ax: a[0], ay: a[1], pri: 99, w: 0, pre: true }; } if (best) return best; return null; }
    cand.sort((a, b) => a.pri - b.pri || Math.hypot(a.ax - S.ax, a.ay - S.ay) - Math.hypot(b.ax - S.ax, b.ay - S.ay)); return cand[0];
  },
  weaponFor(e) { const t = e.type; if (this.style === 'fair') return t === 'drone' ? 1 : t === 'rusher' || t === 'shield' ? 2 : 0; return t === 'drone' ? 1 : t === 'rusher' ? 2 : t === 'shield' ? 2 : t === 'marine' || t === 'grenadier' ? 1 : 0; }
};
// ---- attract mode ----
const PLAYLIST = [['highlight', 1, '1-1'], ['highlight', 1, '1-4'], ['highlight', 1, '1-B'], ['highlight', 2, '2-1'], ['highlight', 2, '2-3'], ['highlight', 2, '2-B'], ['highlight', 3, '3-2'], ['highlight', 3, '3-3'], ['highlight', 3, '3-B']];
PLAYLIST.forEach(h => def('highlight', h[2], { stage: h[1], scene: h[2] }));
const Attract = { i: 0, phase: 'demo', t: 0, wd: 0, sig: '', demoT: 0, count: 0 };
function attractStart(i) { Attract.i = i % PLAYLIST.length; const [, stage, scene] = PLAYLIST[Attract.i]; Run.mode = 'attract'; Run.diff = 'normal'; Run.np = 1; Run.hub = null; Run.attract = true; Run.carry = null;
  const sim = new Sim({ mode: 'attract', stage, scene, difficulty: 'normal', players: [{}], cheats: { god: 1, ammo: 1 }, seed: 1000 + Attract.i, fast: true, lives: 99 }); Run.sim = sim; Run.stage = stage; Pres.reset(); resetHud(); HUD.shown = { cover: 1, reload: 1, shield: 1, laser: 1, torpedo: 1, final: 1 }; Bot.setStyle('showoff'); Bot.st = {}; Attract.phase = 'demo'; Attract.demoT = 0; Attract.wd = 0; Attract.sig = ''; Run._song = null; Run._layerOn = null; for (const p of sim.players) { p.ammo = [9, 240, 36, 6]; p.seen = { 1: 1, 2: 1, 3: 1 }; } }
function attractNext() { Attract.phase = 'scores'; Attract.t = 0; Attract.count++; }
function attractWatch(sim, dt) {
  Attract.demoT += dt; const sig = sim.phase + ':' + sim.enemies.filter(e => !e.dead).length + ':' + sim.players[0].st.kills + ':' + Math.round(sim.pt) + ':' + Math.round(sim.rail) + ':' + (sim.boss ? Math.round(Object.values(sim.boss.parts).reduce((a, p) => a + p.hp, 0)) : 0);
  if (sig === Attract.sig) Attract.wd += dt; else { Attract.wd = 0; Attract.sig = sig; }
  if (Attract.wd > 8 || Attract.demoT > 28 || sim.phase === 'stageclear' || (sim.phase === 'clear' && sim.clearT > 1.2 && Attract.demoT > 14)) attractNext();
  const I = game.input; if (Idle.t === 0 || I.anyPressed()) { }
}
function attractOverlay(g, W, H) { px.blend(g, .8, 'normal', () => { px.rect(g, 0, 0, W, 14, '#000000'); }); T(g, 'DEMO PLAY', 8, 3, '#ffffff', { scale: 1 }); E.font.title(g, 'TIDE CRISIS 3', W - 60, 3, { scale: 1, colors: ['#ffffff', '#3aa0e8'], outline: '#08142a', align: 'center' }); if (Math.floor(game.real * 2) % 2) T(g, 'PRESS ' + (game.input.lastDevice === 'gamepad' ? game.input.label('start') : 'ENTER') + ' TO START', W / 2, H - 22, '#ffd36a', { scale: 2, align: 'center' }); }
Scenes.attract = { camera: { zoom: false }, touch: [], pausable: false,
  enter() { Idle.t = 0; Attract.count = 0; attractStart(Attract.i || 0); this.armed = 0; },
  update(dt) {
    this.armed += dt; const I = game.input; let any = this.armed > .5 && (I.anyPressed() || I.clicked()); const pt = I.pointer(); if (pt) { if (this.lastPt && Math.hypot(pt[0] - this.lastPt[0], pt[1] - this.lastPt[1]) > 4 && this.armed > .5) any = true; this.lastPt = pt.slice(); } if (this.armed > .5 && (I.padAim || (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .3))) any = true;
    if (any) { I.consumeAll(); Idle.t = 0; Run.mode = 'arcade'; Run.attract = false; Run.sim = null; game.go('title'); return; }
    if (Attract.phase === 'demo') playUpdate(dt);
    else { Attract.t += dt; if (Attract.phase === 'scores' && Attract.t > 6) { if (Attract.count % 2 === 0) { Attract.phase = 'title'; Attract.t = 0; } else attractStart(Attract.i + 1); } else if (Attract.phase === 'title' && Attract.t > 8) attractStart(Attract.i + 1); }
  },
  draw(r) { if (Attract.phase === 'demo') { playDraw(r); return; } r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .45); if (Attract.phase === 'scores') { arcade.drawTable(r, 'arcade', 36, 'HIGH SCORES'); } else { logo(g, W, 40, game.time); } attractOverlay(g, W, H); }); }
};
