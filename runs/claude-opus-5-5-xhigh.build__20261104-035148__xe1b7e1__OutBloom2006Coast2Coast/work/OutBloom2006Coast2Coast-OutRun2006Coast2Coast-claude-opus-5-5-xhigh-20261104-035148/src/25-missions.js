/* OutBloom — the Coast 2 Coast Tour's rules: one rule set per mission kind, each with the race's hooks (onStart,
 * onStep, onEvent, hud, isOver, result -> { cleared, rank C | B | A | AAA, stats }). Clearing is rank C or better.
 * Rival missions show the rival's portrait and a live gap. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E, SEG = OB.SEG;
const UI = OB.UI, C = UI.COL;
const rankBy = (v, th, higher = true) => { let r = null; th.forEach((t, i) => { if (higher ? v >= t : v <= t) r = OB.RANKS[i]; }); return r; };
OB.rankBy = rankBy;
const panel = (g, vp, lines, icon) => { const x = vp.x + 6, y = vp.y + 62, w = 150; UI.panel(g, x, y, w, 12 + lines.length * 11, { alpha: .82 }); lines.forEach((l, i) => UI.text(g, l[0], x + 6, y + 6 + i * 11, { color: l[1] || '#ffffff' })); };
const bar = (g, x, y, w, a, b, ca, cb) => { const t = Math.max(1, a + b); px.rect(g, x, y, w, 5, '#2a1a3a'); px.rect(g, x, y, Math.round(w * a / t), 5, ca); px.rect(g, x + Math.round(w * a / t), y, w - Math.round(w * a / t), 5, cb); };
const R = OB.Rules = {
  /** B1: reach the checkpoint with the clock from 52 s */
  sprint: m => ({ result: race => { const p = race.p1, left = race.clock; return { cleared: p.finished, rank: p.finished ? rankBy(left, m.ranks) || 'C' : null, stats: { 'Time left': left.toFixed(1) + ' s' }, best: left }; } }),
  /** B2: out-drift Kiki by the stage's end */
  driftduel: m => { const s = { me: 0, them: 0 }; return {
    onEvent(race, n, e) { if (n !== 'drift:end' || !e) return; const d = race.drivers.find(q => q.id === e.car); if (!d) return; if (d.kind === 'player') s.me += e.score; else s.them += e.score; },
    onStep(race) { const r = race.drivers.find(d => d.kind === 'rival'); if (r && r.car.drift.on) s.live = r.car.drift.score; else s.live = 0; },
    hud(g, race, d, vp) { panel(g, vp, [['DRIFT DUEL vs KIKI', C.sun], ['YOU  ' + Math.round(s.me + (d.car.drift.on ? d.car.drift.score : 0)), '#ffffff'], ['KIKI ' + Math.round(s.them + (s.live || 0)), '#a8e040']]); bar(g, vp.x + 12, vp.y + 98, 138, s.me + 1, s.them + 1, C.pink, '#a8e040'); },
    result(race) { const margin = (s.me - s.them) / Math.max(1, s.them), cleared = race.p1.finished && s.me > s.them; return { cleared, rank: cleared ? rankBy(margin, m.ranks) || 'C' : null, stats: { 'Your drift': Math.round(s.me), 'Kiki': Math.round(s.them) }, best: Math.round(s.me) }; } }; },
  /** B3: slipstream points (seconds x speed) plus finishing first, against the Bramble Brothers */
  draftdash: m => { const s = { me: 0, them: 0 }; return {
    onStep(race, dt) { for (const d of race.drivers) { if (d.car.slip > .5) { const pts = dt * d.car.v * 10; if (d.kind === 'player') s.me += pts; else s.them += pts; } } },
    hud(g, race, d, vp) { const r = race.drivers.find(q => q.kind === 'rival'), gap = r ? (r.car.z - d.car.z) / 12 / Math.max(50, d.car.v) : 0; panel(g, vp, [['DRAFT DASH vs BRAMBLES', C.sun], ['YOU  ' + Math.round(s.me), '#ffffff'], ['BROS ' + Math.round(s.them), '#c8905a'], [(gap > 0 ? 'BEHIND ' : 'AHEAD ') + Math.abs(gap).toFixed(1) + ' s', gap > 0 ? C.bad : C.good]]); },
    result(race) { const r = race.drivers.find(q => q.kind === 'rival'), first = race.finishOrder[0] === race.p1.id; const me = s.me + (first ? 2000 : 0), them = s.them + (!first && r && r.finished ? 2000 : 0); const margin = (me - them) / Math.max(1, them), cleared = race.p1.finished && me > them;
      return { cleared, rank: cleared ? rankBy(margin, m.ranks) || 'C' : null, stats: { 'Your points': Math.round(me), 'Brambles': Math.round(them) }, best: Math.round(me) }; } }; },
  /** B4: five racers; the last at each checkpoint is out; win at the goal */
  knockout: m => ({
    onEvent(race, n, e) {
      if (n !== 'stage:enter' || !e || e.car === undefined) return; const d = race.drivers.find(q => q.id === e.car); if (!d || d.routeIdx === 0) return;
      const idx = d.routeIdx; if (race.koDone && race.koDone[idx]) return;
      const alive = race.drivers.filter(q => !q.out);
      if (alive.filter(q => q.routeIdx >= idx).length === alive.length - 1) {   // all but one through: the last is out
        const last = alive.find(q => q.routeIdx < idx); if (!last) return; (race.koDone || (race.koDone = {}))[idx] = true; last.out = true;
        race.emit('rival:out', { id: last.id, persona: last.persona });
        OB.HUD.banner(race.p1.id, last.kind === 'player' ? 'YOU WILT!' : (OB.PERSONAS[last.persona] || {}).name.toUpperCase() + ' WILTS!', { color: last.kind === 'player' ? C.bad : C.sun, life: 2.5 });
      }
    },
    isOver: race => race.p1.out, overReason: 'knockout',
    hud(g, race, d, vp) { const alive = race.drivers.filter(q => !q.out).length; panel(g, vp, [['LAST ONE WILTS', C.sun], ['PLACE ' + d.place + ' / ' + alive, d.place === alive ? C.bad : '#ffffff'], ['OUT AT EACH CHECKPOINT: LAST', C.dim]]); },
    result(race) { const p = race.p1; if (p.out) return { cleared: false, rank: null, stats: { 'Knocked out': 'yes' } };
      const others = race.drivers.filter(q => q.kind === 'rival' && q.finished).map(q => q.finishTime), gap = others.length ? Math.min(...others) - p.finishTime : 99, place = p.finished ? race.finishOrder.indexOf(p.id) + 1 : 9;
      const rank = place === 1 ? (gap >= m.ranks[3] ? 'AAA' : gap >= m.ranks[2] ? 'A' : 'B') : place <= m.ranks[0] ? 'C' : null;
      return { cleared: !!rank && p.finished, rank, stats: { Place: place, 'Lead': (gap > 50 ? '-' : gap.toFixed(1) + ' s') }, best: place === 1 ? gap : -place }; } }),
  /** M1, M2: collect objects along the stage (bees cost two) */
  collect: m => { const P = m.params; let got = 0, stung = 0, objs = []; return {
    onStart(race) { const road = OB.World.stage(m.route[0]), n = P.n, rnd = OB.rand.stream('collect:' + m.id, race.seed), len = (road.stageLen - 60) * SEG, lanes = road.stage.lanes;
      for (let i = 0; i < n; i++) { const z = 40 * SEG + (i + .5) * (len - 40 * SEG) / n, pat = Math.floor(i / 5) % 3; const x = pat === 0 ? Math.sin(i * .9) * .6 : pat === 1 ? OB.laneX(i % lanes, lanes) : (rnd() - .5) * 1.4; objs.push(OB.mkObj({ id: i, kind: P.obj, stage: road.id, z, x: clamp(x, -.85, .85) })); }
      for (let i = 0; i < (P.bees || 0); i++) objs.push(OB.mkObj({ id: 100 + i, kind: 'bee', stage: road.id, z: 60 * SEG + (i + .5) * (len - 60 * SEG) / P.bees, x: 0, x0: (rnd() - .5) * .8, amp: .6, w: 1.4 + rnd() * .6, ph: rnd() * 6 }));
      race.objects.push(...objs); },
    onStep(race, dt) { const d = race.p1, ax = d.absX();
      for (const o of objs) { if (o.kind === 'bee') { o.x = clamp(o.x0 + Math.sin(race.t * o.w + o.ph) * o.amp, -1, 1); if (!o.done && Math.abs(o.z - d.car.z) < 260) { if (Math.abs(o.x - ax) < .26 && !OB.cheats.perfectRequests) { o.done = true; stung++; d.car.vx += .9; race.emit('obj:sting', { car: d.id }); } else if (o.z < d.car.z) o.done = true; } } if (o.flyT !== undefined) o.flyT += dt;
        if (OB.cheats.perfectRequests && !o.done && o.kind !== 'bee' && o.z > d.car.z && o.z - d.car.z < 1800) o.x += (ax - o.x) * Math.min(1, dt * 6); }
      OB.objPass(race, d, objs, (o, dx) => { if (Math.abs(dx) < .32) { o.hit = true; got++; if (o.kind === 'gnome') { o.flyT = 0; o.flyDir = dx > 0 ? -1 : 1; } race.emit(o.kind === 'balloon' ? 'obj:pop' : 'obj:bonk', { car: d.id }); OB.sfx && OB.sfx(o.kind === 'balloon' ? 'pop' : 'boink'); } }); },
    targets(d) { return objs.filter(o => !o.done && o.stage === d.stage).map(o => ({ kind: o.kind === 'bee' ? 'avoid' : 'hit', dz: o.z - d.car.z, x: o.x })); },
    hud(g, race, d, vp) { panel(g, vp, [[m.title.toUpperCase(), C.sun], [(P.obj === 'balloon' ? 'POPPED ' : 'BONKED ') + got + ' / ' + P.n, '#ffffff']].concat(P.bees ? [['STINGS ' + stung + ' (-' + stung * P.beeCost + ')', C.bad]] : [])); },
    result(race) { const net = got - stung * (P.beeCost || 0), rank = rankBy(net, m.ranks); return { cleared: race.p1.finished && !!rank, rank, stats: { Got: got, Stings: stung, Net: net }, best: net }; } }; },
  /** M3: watch five colours, then pick the right gate in each set */
  memory: m => { const s = { seq: [], sets: [], right: 0, hints: 0, showT: 0, objs: [] }; return {
    onStart(race) { const rnd = OB.rand.stream('memory', race.seed), road = OB.World.stage(m.route[0]); for (let i = 0; i < 5; i++) s.seq.push(Math.floor(rnd() * 5)); s.showT = 0;
      for (let k = 0; k < 5; k++) { const z = (260 + k * 120) * SEG, cols = [s.seq[k]]; while (cols.length < 3) { const c = Math.floor(rnd() * 5); if (!cols.includes(c)) cols.push(c); } cols.sort(() => rnd() - .5);
        const set = { z, cols, done: false }; s.sets.push(set); cols.forEach((c, i) => { const o = OB.mkObj({ id: k * 3 + i, kind: 'gate', stage: road.id, z, x: OB.laneX(i, 3), color: c, set }); s.objs.push(o); }); }
      race.objects.push(...s.objs); },
    onStep(race, dt) { s.showT += dt; const d = race.p1, I = d.input; if (I && I.pressed('alt') && race.phase === 'race') { s.hints++; s.showT = 0; s.replay = true; }
      const ax = d.absX();
      for (const set of s.sets) if (!set.done && d.prevZ < set.z && d.car.z >= set.z) { set.done = true; const pick = s.objs.filter(o => o.set === set).sort((a, b) => Math.abs(a.x - ax) - Math.abs(b.x - ax))[0], idx = s.sets.indexOf(set);
        const ok = pick && Math.abs(pick.x - ax) < .34 && pick.color === s.seq[idx]; if (ok || OB.cheats.perfectRequests) { s.right++; pick && (pick.hit = true); OB.HUD.banner(d.id, 'RIGHT!', { color: C.good, life: 1 }); OB.sfx && OB.sfx('chime'); } else { OB.HUD.banner(d.id, 'WRONG GATE', { color: C.bad, life: 1 }); OB.sfx && OB.sfx('error'); } } },
    targets(d) { const set = s.sets.find(q => !q.done); if (!set) return []; const k = s.sets.indexOf(set), o = s.objs.find(q => q.set === set && q.color === s.seq[k]); return o ? [{ kind: 'hit', dz: set.z - d.car.z, x: o.x }] : []; },
    hud(g, race, d, vp) {
      const showing = s.showT < 10 && (s.replay || race.t < 13);
      if (showing) { const i = Math.min(4, Math.floor(s.showT / 2)), col = OB.MEMORY_COLORS[s.seq[i]]; UI.panel(g, vp.x + vp.w / 2 - 80, vp.y + 60, 160, 54, { border: col[1] }); UI.text(g, 'REMEMBER ' + (i + 1) + ' / 5', vp.x + vp.w / 2, vp.y + 66, { align: 'center', color: C.sun }); px.rect(g, Math.round(vp.x + vp.w / 2 - 20), vp.y + 78, 40, 18, col[1]); OB.Art.icon(g, col[2], vp.x + vp.w / 2 - 4, vp.y + 82); UI.text(g, col[0], vp.x + vp.w / 2, vp.y + 100, { align: 'center' }); }
      const next = s.sets.findIndex(q => !q.done);
      panel(g, vp, [['MEMORY LANE', C.sun], ['RIGHT ' + s.right + ' / 5', '#ffffff'], [next >= 0 ? 'GATE SET ' + (next + 1) : 'ALL SETS DONE', C.dim]]);
      if (!showing) UI.prompt(g, vp.x + 12, vp.y + 104, 'alt', 'HINT (costs AAA)', {});
    },
    result(race) { const rank = s.right >= 5 ? (s.hints ? 'A' : 'AAA') : rankBy(s.right, m.ranks.slice(0, 3)); return { cleared: race.p1.finished && !!rank, rank, stats: { Right: s.right + ' / 5', Hints: s.hints }, best: s.right }; } }; },
  /** V1: zero contacts, ranked by time against par */
  clean: m => { let contacts = 0; return {
    onEvent(race, n, e) { if (e && e.car === race.p1.id && (n === 'car:bump' || n === 'car:crash' || n === 'car:scrape')) { contacts++; OB.HUD.banner(race.p1.id, 'SCRATCHED!', { color: C.bad, life: 2 }); } },
    isOver: race => contacts > 0, overReason: 'scratched',
    hud(g, race, d, vp) { panel(g, vp, [['NOT A SCRATCH', C.sun], [contacts ? 'SCRATCHED' : 'SPOTLESS', contacts ? C.bad : C.good], ['PAR ' + m.params.par + ' s', C.dim]]); },
    result(race) { const t = race.p1.finishTime, over = t - m.params.par, rank = contacts ? null : rankBy(over, m.ranks, false); return { cleared: !contacts && race.p1.finished && !!rank, rank, stats: { Time: t ? t.toFixed(2) + ' s' : '-', Contacts: contacts }, best: t ? -t : null }; } }; },
  /** V2: above 240 for as much of the stage as possible */
  speedkeep: m => { let tin = 0, tab = 0; return {
    onStep(race, dt) { if (race.phase !== 'race' || race.p1.finished || race.t < 9) return; tin += dt; if (race.p1.car.v >= m.params.v) tab += dt; },
    hud(g, race, d, vp) { const share = tin ? tab / tin : 1; panel(g, vp, [['FASHIONABLY FAST', C.sun], ['OVER ' + OB.HUD.speedTxt(m.params.v).join(' ') + ': ' + Math.round(share * 100) + '%', share >= .7 ? C.good : C.bad], [race.t < 9 ? 'GET UP TO SPEED!' : d.car.v >= m.params.v ? 'GORGEOUS, DARLING' : 'FASTER!', C.dim]]); },
    result(race) { const share = tin ? tab / tin : 0, rank = rankBy(share, m.ranks); return { cleared: race.p1.finished && !!rank, rank, stats: { 'Above 240': Math.round(share * 100) + '%' }, best: share }; } }; },
  /** V3: both couples start with 20 petals; behind them you lose them, passing steals two */
  heartbreak: m => { const s = { me: m.params.petals, them: m.params.petals, t: 0 }; return {
    onStep(race, dt) { if (race.phase !== 'race') return; const r = race.drivers.find(q => q.kind === 'rival'); if (!r || r.finished || race.p1.finished) return; s.t += dt; if (s.t >= 2) { s.t -= 2; if (r.progress() > race.p1.progress()) s.me = Math.max(0, s.me - 1); else s.them = Math.max(0, s.them - 1); } },
    onEvent(race, n, e) { if (n !== 'rival:pass' || !e) return; if (e.by === race.p1.id) { const k = Math.min(2, s.them); s.them -= k; s.me += k; OB.HUD.banner(race.p1.id, 'HEARTBREAKER! +2', { color: C.pink, life: 1.4 }); } else { const k = Math.min(2, s.me); s.me -= k; s.them += k; OB.HUD.banner(race.p1.id, 'THEY STOLE 2!', { color: C.bad, life: 1.4 }); } },
    isOver: () => s.me <= 0, overReason: 'heartbroken',
    hud(g, race, d, vp) { panel(g, vp, [['HEARTBREAKERS', C.sun], ['YOU  ♥ ' + s.me, C.pink], ['LUSTRES ♥ ' + s.them, '#e8c050']]); bar(g, vp.x + 12, vp.y + 98, 138, s.me, s.them, C.pink, '#e8c050'); },
    result(race) { const rank = s.them <= 0 ? 'AAA' : rankBy(s.me, m.ranks.slice(0, 3)); return { cleared: s.me > 0 && race.p1.finished && !!rank, rank: s.me > 0 ? rank : null, stats: { 'Your petals': s.me, 'Theirs': s.them }, best: s.me }; } }; },
  /** J1, J2: count near misses, or ribbons cut */
  count: m => { let n = 0, spawned = 0, at = []; return {
    onStart(race) { if (m.params.what === 'ribbon') { const road = OB.World.stage(m.route[0]); for (let i = 0; i < m.params.n; i++) at.push(60 * SEG + (i + .5) * ((road.stageLen - 80) * SEG - 60 * SEG) / m.params.n); } },
    onStep(race) { const d = race.p1; while (at.length && d.car.z > at[0] - 9000) { const z = at.shift(); if (race.traffic.spawnRibbon(d.stage, z)) spawned++; } },
    targets(d) { if (m.params.what !== 'ribbon') return []; const out = []; for (const v of d.race.traffic.of(d.stage)) if (v.pair && v.ribbon && !v.ribbon.snapped) out.push({ kind: 'hit', dz: v.z - d.car.z, x: (v.x + v.pair.x) / 2 }); return out; },
    onEvent(race, nm, e) { if (!e || e.car !== race.p1.id) return; if ((m.params.what === 'nearmiss' && nm === 'nearmiss') || (m.params.what === 'ribbon' && nm === 'obj:snap')) n++; },
    hud(g, race, d, vp) { panel(g, vp, [[m.title.toUpperCase(), C.sun], [(m.params.what === 'ribbon' ? 'RIBBONS ' + n + ' / ' + m.params.n : 'NEAR MISSES ' + n), '#ffffff']]); },
    result(race) { const rank = rankBy(n, m.ranks); return { cleared: race.p1.finished && !!rank, rank, stats: { [m.params.what === 'ribbon' ? 'Ribbons' : 'Near misses']: n }, best: n }; } }; },
  /** J3: three photo boxes; Perfect 5, Great 3, Good 1 */
  photo3: m => { const s = { boxes: [], pts: 0, ratings: [] }; return {
    onStart(race) { const road = OB.World.stage(m.route[0]); for (const f of [.25, .52, .8]) { const z = Math.floor(road.stageLen * f) * SEG; s.boxes.push({ z0: z, z1: z + 2 * SEG, half: .5, done: false, obj: OB.mkObj({ id: s.boxes.length, kind: 'photographer', stage: road.id, z: z + SEG, x: 1.35, flash: 0 }) }); } race.objects.push(...s.boxes.map(b => b.obj));
      race.photoBoxes = s.boxes; },
    onStep(race, dt) { const d = race.p1, car = d.car, ax = d.absX();
      for (const b of s.boxes) { if (b.done) continue; if (car.z > b.z0 - 3000 && car.z < b.z1 && car.v < 150) b.slow = (b.slow || 0) + dt; if (car.z >= b.z0 && car.z <= b.z1 + 200) b.minV = Math.min(b.minV === undefined ? 999 : b.minV, car.v);
        const inside = car.z >= b.z0 + OB.CAR_LEN / 2 && car.z <= b.z1 && Math.abs(ax) < b.half - OB.PLAYER_HW * .5;
        if (inside && car.v < 5) { b.stopT = (b.stopT || 0) + dt; if (b.stopT > .5) this.shot(race, b, (b.slow || 0) < 4.5 ? 5 : 3); }
        else if (car.z > b.z1 + 100) this.shot(race, b, b.minV !== undefined && b.minV < 100 ? 1 : 0);
        if (OB.cheats.perfectRequests && car.z > b.z0) this.shot(race, b, 5);
        if (b.obj.flash > 0) b.obj.flash -= dt * 2; } },
    shot(race, b, pts) { if (b.done) return; b.done = true; s.pts += pts; const name = { 5: 'PERFECT SHOT!', 3: 'GREAT SHOT!', 1: 'GOOD SHOT', 0: 'MISSED IT' }[pts]; s.ratings.push(pts); b.obj.flash = pts ? 1 : 0; if (pts) { OB.game.flash('#ffffff', .1, .5); OB.sfx && OB.sfx('shutter'); } OB.HUD.banner(race.p1.id, name, { color: pts >= 5 ? C.pink : pts ? C.sun : C.bad, life: 1.6 }); race.emit('obj:photo', { car: race.p1.id, rating: pts }); },
    targets(d) { const b = s.boxes.find(q => !q.done); return b ? [{ kind: 'stop', dz: b.z0 + 120 - d.car.z, x: 0 }] : []; },
    hud(g, race, d, vp) { const next = s.boxes.find(b => !b.done); panel(g, vp, [['THE PERFECT SHOT', C.sun], ['POINTS ' + s.pts, '#ffffff'], [next ? 'STOP IN BOX ' + (s.boxes.indexOf(next) + 1) + ' IN ' + Math.max(0, Math.round((next.z0 - d.car.z) / 100)) + ' m' : 'ALL SHOTS TAKEN', C.dim]]); },
    result(race) { const rank = rankBy(s.pts, m.ranks); return { cleared: race.p1.finished && !!rank, rank, stats: { Points: s.pts, Shots: s.ratings.join(' / ') }, best: s.pts }; } }; },
  /** F: Love in Bloom rules, every request type, forks open: the grade at any goal */
  love: m => ({ result(race) { const g = race.req ? race.req.grade() : 'E', idx = { B: 0, A: 1, AA: 2, AAA: 3 }[g]; const rank = idx === undefined ? null : OB.RANKS[idx]; return { cleared: race.p1.finished && !!rank, rank, stats: { Grade: g, Petals: race.req ? race.req.petals : 0 }, best: race.req ? race.req.ratio() : 0 }; } })
};
/** a mission's race: its route, rivals, rules, clock and what comes after */
OB.Missions = {
  configure(c) {
    const m = OB.MISSION[c.mission];
    if (m.kind === 'love') { c.route = { pyramid: true }; c.rules = [OB.Requests.director({ passenger: c.passenger, allTypes: true }), R.love(m)]; c.clockUp = false; }
    else {
      c.route = { stages: m.route.slice(), sprint: !m.goal, goal: m.goal || null, end: m.end || null };
      c.rules = [R[m.kind](m)]; c.clockUp = m.kind !== 'sprint'; if (m.kind === 'sprint') c.startTime = m.params.start;
      const rv = m.rivals || (m.rival ? [m.rival] : []); c.rivals = rv.map(p => ({ persona: p }));
      if (m.kind === 'collect' || m.kind === 'memory' || m.kind === 'photo3') c.trafficMul = .6;
      if (m.kind === 'clean') c.trafficMul = 1.3;
      if (m.kind === 'count' && m.params.what === 'nearmiss') c.trafficMul = 1.7;
    }
    c.returnTo = 'tour'; c.returnData = { focus: m.id };
    c.after = (res, race) => { if (m.kind === 'love' && res.players[0].goal) { c.afterEnding = 'debrief'; res.missionId = m.id; OB.game.go('ending', res, { fade: 'white', seconds: .5 }); } else OB.game.go('debrief', Object.assign(res, { missionId: m.id }), { fade: 'wipe' }); };
    return c;
  }
};
})();
