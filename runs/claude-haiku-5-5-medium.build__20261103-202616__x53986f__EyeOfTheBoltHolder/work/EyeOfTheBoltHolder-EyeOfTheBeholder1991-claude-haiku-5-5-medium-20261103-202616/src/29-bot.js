/* ===== 29 bot · the walkthrough runner (PLAN §14.4, §9) =====
 * The bot plays by the game's own commands: it walks its goals (each floor's `walk` list in 15-floors.js), faces and uses
 * what it needs to, fights what is in its way (a party strike when a hand is ready) and joins the NPCs when their story
 * offers it. It is the test's player, the attract mode's and the Dev Mode's auto-play; it has no powers a player lacks. */
/** a goal from its list form: ['take', x, y] ['takeAll', x, y] ['feature', id] ['door', id] ['insert', id] ['put', x, y, dir]
 *  ['zap', spell, x, y, dir] ['throwAt', x, y, dir] ['goto', x, y] ['clear', type] ['join', id] */
B.goalObj = a => {
  const [k, ...r] = a;
  switch (k) {
    case 'take': return { kind: 'take', x: r[0], y: r[1], all: false };
    case 'takeAll': return { kind: 'take', x: r[0], y: r[1], all: true };
    case 'feature': return { kind: 'feature', id: r[0] };
    case 'door': return { kind: 'door', id: r[0] };
    case 'insert': return { kind: 'insert', id: r[0] };
    case 'put': return { kind: 'put', x: r[0], y: r[1], dir: r[2], item: r[3] || 'rock' };
    case 'zap': return { kind: 'zap', spell: r[0], x: r[1], y: r[2], dir: r[3] };
    case 'throwAt': return { kind: 'throwAt', x: r[0], y: r[1], dir: r[2] };
    case 'goto': return { kind: 'goto', x: r[0], y: r[1] };
    case 'clear': return { kind: 'clear', type: r[0] };
    case 'join': return { kind: 'join', id: r[0] };
    default: throw new Error('no bot goal ' + k);
  }
};
B.goalsFor = id => ((B.FLOORS[id] && ((id === 'f3' && B.sim.S.flags.veilRefused && B.FLOORS[id].walkRefused) || B.FLOORS[id].walk)) || []).map(B.goalObj);
B.bot = {
  start() { return { gi: 0, goals: null, floor: null, done: false, steps: 0, fails: 0, took: 0, dead: false }; },
  /** one decision for the party: a command, or null (nothing to do this step) */
  decide(bs) {
    const S = B.sim.S, p = S.party;
    if (S.over || S.ended || bs.done) return null;
    bs.steps++;
    if (p.tween || (p.busyT || 0) > 0) return null;
    if (S.camp) return null;   // resting: the rest runs its own hours
    if (bs.floor !== S.floor) { bs.floor = S.floor; bs.goals = B.goalsFor(S.floor); bs.gi = 0; bs.fails = 0; bs.dead = new Set(); }
    // a monster that has died leaves its drops: take them up, next (once)
    for (const m of monsOn()) if (m.hp <= 0 && !bs.dead.has(m.id)) { bs.dead.add(m.id); if (topItem(m.cx, m.cy) && bs.goals) bs.goals.splice(bs.gi + 1, 0, { kind: 'take', x: m.cx, y: m.cy, all: true }); }
    // a foe beside the party: turn to it and strike
    const foe = monsOn().find(m => m.hp > 0 && manh(m.cx, m.cy, p.cx, p.cy) === 1);
    const readyHand = strikeReady();
    if (foe) { const face = dirTo(p.cx, p.cy, foe.cx, foe.cy); if (face !== p.dir) return turnTo(face); if (readyHand) return { c: 'strike' }; }
    // a hurt party rests in a quiet room, and a healer heals the worst hurt
    const worst = partyList().map(x => x[0]).filter(m => m.state === 'down' || (m.state === 'ok' && m.hp < m.max * .5)).sort((a, b) => (a.state === 'down' ? -1 : 0) - (b.state === 'down' ? -1 : 0)), healer = partyList().map(x => x[0]).find(m => m.cls === 'C' && m.state === 'ok' && m.prep[1].includes('mend') && slotsLeftOne(m));
    if (worst.length && healer && castReady(healer).ok) { const t = S.party.roster.indexOf(worst[0]); return { c: 'cast', m: S.party.roster.indexOf(healer), spell: 'mend', target: t }; }
    if (foe) return null;   // a foe beside us and no hand ready: wait for the cooldown
    // hurt, or out of slots, and the room is quiet: camp (the rest refuses while enemies are near)
    const hurt = partyList().some(([m]) => m.state !== 'ok' || m.hp < m.max * .6), spent = partyList().some(([m]) => m.cls === 'C' || m.cls === 'M' ? slotLeft(m, 1) <= 0 && slotsMax(m)[1] > 0 : false);
    if ((hurt || spent) && !S.camp && !S.race && !campBlocked() && !S.hungerLock) return { c: 'camp', op: 'rest' };
    const g = bs.goals && bs.goals[bs.gi];
    if (!g) { bs.done = true; return null; }
    // a goal gets two minutes of game time; past that it is dropped (a stalled path must not hold the run)
    bs.gsteps = (bs.gsteps || 0) + 1; if (bs.gsteps > 120 * 120) { bs.gi++; bs.gsteps = 0; bs.fails = 0; bs.took = 0; bs.takeStart = undefined; return null; }
    // the hand: a held item is stowed unless the goal uses it
    if (p.hand && !['insert', 'put', 'throwAt', 'zap', 'take'].includes(g.kind)) return { c: 'inv', op: 'stow' };
    return goalStep(bs, g);
  },
};
const slotsLeftOne = m => slotLeft(m, 1) > 0;
B.bot.pathTo = (x, y) => pathTo(x, y);   // (for the tests: the path the bot would walk)
const countAt = (x, y) => { const l = curFS().items[key(x, y)]; return l ? l.length : 0; };
const isAlcove = id => { const w = (curF().walls || []).find(x => x.id === id); return !!w && (w.k === 'alcove' || w.k === 'clock'); };
const turnTo = face => ({ c: 'turn', s: ((face - S.party.dir + 4) % 4) === 3 ? -1 : 1 });
/** the cells a party may walk: floor, open doors, bridged pits; not a trapdoor, a teleporter that is on, or a seal */
const openFor = (x, y) => {
  if (!passable(x, y, 'party')) return false;
  if (curF().stairs && curF().stairs[key(x, y)]) return false;   // a stair is a way out, not a place to stand
  const c = cellOf(x, y);
  if (c === 'o') return false;
  if (c === '^') { const t = curFS().teles[idAt(x, y)]; return !(t && t.on); }
  if (c === 'O') return !!((curFS().pits[idAt(x, y)] || {}).bridged);
  return true;
};
/** A* -free breadth-first path over open cells from the party's cell to (gx, gy); the cells, or null */
function pathTo(gx, gy) {
  const p = S.party, d = curF(), W = d.rows[0].length, H = d.rows.length, start = p.cy * W + p.cx, goal = gy * W + gx;
  if (start === goal) return [[gx, gy]];
  const prev = new Map([[start, -1]]), q = [start];
  for (let i = 0; i < q.length; i++) {
    const c = q[i], x = c % W, y = (c - x) / W;
    for (let k = 0; k < 4; k++) {
      const nx = x + DX[k], ny = y + DY[k]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx; if (prev.has(n)) continue;
      if (n !== goal && !openFor(nx, ny)) continue;
      if (n === goal && !(openFor(nx, ny) || passable(nx, ny, 'party'))) continue;
      prev.set(n, c); q.push(n);
      if (n === goal) break;
    }
    if (prev.has(goal)) break;
  }
  if (!prev.has(goal)) return null;
  const out = []; let c = goal; for (let guard = 0; c !== -1 && c !== undefined && guard < W * H; guard++) { out.push([c % W, Math.floor(c / W)]); c = prev.get(c); }
  return out.reverse();
}
/** the move that takes one step toward a neighbouring cell: forward, back or to the side (the facing is kept) */
function stepToward(cell) {
  const p = S.party, d = dirTo(p.cx, p.cy, cell[0], cell[1]); if (d < 0 || monAt(cell[0], cell[1])) return null;
  const rel = (d - p.dir + 4) % 4;
  return { c: 'move', d: rel === 0 ? 'f' : rel === 2 ? 'b' : rel === 1 ? 'r' : 'l' };
}
/** the cell a goal acts on: a wall feature (its cell and face), a door or gate (its cell), a floor cell */
function targetOf(g) {
  if (g.kind === 'feature' || g.kind === 'insert') { const w = (curF().walls || []).find(x => x.id === g.id); return w ? { cell: w.at, dir: w.dir } : null; }
  if (g.kind === 'door') { const c = curF().ids[g.id]; return c ? { cell: c } : null; }
  if (g.kind === 'take') return { cell: [g.x, g.y] };
  return null;
}
/** where the party stands to act on a target, and the way it faces */
function standFor(t) {
  if (t.dir !== undefined) return { stand: t.cell, face: t.dir };
  const [x, y] = t.cell, me = [S.party.cx, S.party.cy];
  // the first side the party can reach (a closed door is no way to the far side of it)
  for (const d of [0, 1, 2, 3]) { const sx = x - DX[d], sy = y - DY[d]; if (openFor(sx, sy) && (sx === me[0] && sy === me[1] || pathTo(sx, sy))) return { stand: [sx, sy], face: d }; }
  return null;
}
/** the goal's next command; a goal ends when its last action has been sent */
function goalStep(bs, g) {
  const p = S.party, done = () => { bs.gi++; bs.fails = 0; bs.took = 0; bs.takeStart = undefined; bs.gsteps = 0; };
  // a goal that cannot be reached is dropped after a long while; not while a fight keeps the way closed
  const fail = () => { if (!monsOn().some(m => m.hp > 0 && cheb(m.cx, m.cy, p.cx, p.cy) <= 6)) bs.fails++; if (bs.fails > 3000) { done(); } return null; };
  switch (g.kind) {
    case 'join': { const r = { c: 'npc', id: g.id, join: true }; done(); return r; }
    case 'goto': { if (p.cx === g.x && p.cy === g.y) { done(); return null; } const path = pathTo(g.x, g.y); if (path && path.length > 1) { const st = stepToward(path[1]); if (st) return st; } return fail(); }
    case 'clear': {
      const list = monsOn().filter(m => m.hp > 0 && m.type === g.type);
      if (!list.length) { if (bs.lastAt) { bs.goals.splice(bs.gi + 1, 0, { kind: 'take', x: bs.lastAt[0], y: bs.lastAt[1], all: true }); bs.lastAt = null; } done(); return null; }
        const m = list.sort((a, b) => manh(a.cx, a.cy, p.cx, p.cy) - manh(b.cx, b.cy, p.cx, p.cy))[0];
      bs.lastAt = [m.cx, m.cy];
      const path = pathTo(m.cx, m.cy); if (path && path.length > 1) { const st = stepToward(path[1]); if (st) return st; }
      return fail();
    }
    case 'take': {
      // done when the cell's count has dropped (one), or is empty (all); a stuck take gives up
      const now = countAt(g.x, g.y);
      if (bs.takeStart === undefined) bs.takeStart = now;
      if (now === 0 || (!g.all && now < bs.takeStart) || bs.took > 14) { bs.takeStart = undefined; done(); return null; }
      const t = targetOf(g), s = standFor(t); if (!s) return fail();
      if (p.cx === s.stand[0] && p.cy === s.stand[1]) { if (p.dir !== s.face) return turnTo(s.face); bs.took++; return { c: 'use' }; }
      return walkTo(s, fail);
    }
    case 'feature': case 'door': case 'insert': {
      if (g.kind === 'insert' && !p.hand) {
        // the item this alcove takes, out of the packs (the Hand's first)
        const w = (curF().walls || []).find(x => x.id === g.id);
        const found = w && S.party.roster.flatMap((m, mi) => m.pack.map((it, pi) => ({ it, mi, pi }))).find(x => x.it && fitsAlcove(w, x.it));
        if (!found) { done(); return null; }
        return { c: 'inv', op: 'take', from: { where: 'pack', m: found.mi, i: found.pi } };
      }
      const t = targetOf(g); if (!t) { done(); return null; }
      const s = standFor(t); if (!s) return fail();
      if (p.cx === s.stand[0] && p.cy === s.stand[1]) { if (p.dir !== s.face) return turnTo(s.face); done(); return { c: 'use' }; }
      return walkTo(s, fail);
    }
    case 'put': case 'throwAt': {
      if (g.kind === 'put' && !p.hand) {
        // the item to put down, out of the packs first
        const found = S.party.roster.flatMap((m, mi) => m.pack.map((it, pi) => ({ it, mi, pi }))).find(x => x.it && x.it.id === g.item);
        if (!found) { done(); return null; }
        return { c: 'inv', op: 'take', from: { where: 'pack', m: found.mi, i: found.pi } };
      }
      const s = { stand: [g.x, g.y], face: g.dir };
      if (p.cx === g.x && p.cy === g.y) { if (p.dir !== g.dir) return turnTo(g.dir); done(); return g.kind === 'put' ? { c: 'putDown' } : { c: 'throw' }; }
      return walkTo(s, fail);
    }
    case 'zap': {
      const s = { stand: [g.x, g.y], face: g.dir };
      if (p.cx === g.x && p.cy === g.y) {
        if (p.dir !== g.dir) return turnTo(g.dir);
        // a wand first (anyone may zap it); a scroll only for a mage, who reads it at once
        const cands = S.party.roster.flatMap((m, mi) => m.pack.map((it, pi) => ({ it, mi, pi, m }))).filter(x => x.it && B.ITEMS[x.it.id].spell === g.spell);
        const i = cands.find(x => B.ITEMS[x.it.id].k === 'wand') || cands.find(x => x.m.cls === 'M');
            return { c: 'inv', op: 'use', from: { where: 'pack', m: i.mi, i: i.pi } };
      }
      return walkTo(s, fail);
    }
    default: return fail();
  }
}
/** one step along the path to a stand cell (or turn when there, handled by the caller) */
function walkTo(s, fail) {
  const path = pathTo(s.stand[0], s.stand[1]);
  if (path && path.length > 1) { const st = stepToward(path[1]); if (st) return st; if (monAt(path[1][0], path[1][1])) return fail(); }
  return fail();
}
