/* The autopilot: produces the same intents a player's input would. Drives the attract mode, the Dev "Bot plays player 1" and the tests. */
const clearShot = (x0, y0, x1, y1) => { const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 5); for (let i = 1; i < n; i++) { const t = i / n; if (W.map.heightAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t) > 12) return false; } return true; };
const FOODS = { roast: 1, loaf: 1, cider: 1, platter: 1 };
function botIntent(h) {
  const it = h.int, b = h.bot;
  b.t -= 1 / 120;
  b.flow = b.flow || new Flow(W.map);
  if (b.flow.map !== W.map) b.flow = new Flow(W.map);
  const cheats = W.attract || DEV.bot || b.cheat;
  // goal choice every 0.25 s
  if (b.t <= 0) {
    b.t = .25; b.think = '';
    const cell = p => [Math.floor(p.x / TS), Math.floor(p.y / TS)];
    const reach = p => { b.flow2 = b.flow2 || new Flow(W.map); return true; };
    void reach;
    let goal = null;
    const d2 = p => Math.hypot(p.x - h.x, p.y - h.y);
    b.bad = b.bad || new Set(); b.badT = (b.badT || 0) + .25; if (b.badT > 20) { b.badT = 0; b.bad.clear(); }
    const nearest = (list, maxD, ok = () => true) => { let best = null, bd = maxD; for (const o of list) { if (o.gone || o.dead || b.bad.has(o) || !ok(o)) continue; const d = d2(o); if (d < bd) { bd = d; best = o; } } return best; };
    // target for shooting
    b.shootAt = null;
    const mon = nearest(W.mons, 7 * TS, m => !m.T.immune && !(m.ch === 'y' && m.vis <= 0) && m.emerge <= 0 && clearShot(h.x, h.y, m.x, m.y));
    const gen = nearest(W.gens, 10 * TS, g => clearShot(h.x, h.y, g.x, g.y));
    const boss = W.boss && !W.boss.dead && W.boss.state !== 'sleep' ? W.boss : null;
    if (boss && clearShot(h.x, h.y, boss.x, boss.y) && d2(boss) < 12 * TS) b.shootAt = boss;
    else if (mon) b.shootAt = mon; else if (gen) b.shootAt = gen;
    // goal: food > fight > key > door > treasure > stairs
    const food = h.hp < 250 ? nearest(W.items, 20 * TS, i => FOODS[i.kind]) : null;
    const closedDoors = W.doors.filter(d => !d.open);
    if (food) { goal = food; b.think = 'EAT'; }
    else if (W.kind === 'boss' && W.boss && !W.boss.dead) { goal = { x: W.boss.x - 70, y: W.boss.y + 36 }; b.think = 'KING'; }
    else if (b.shootAt && (b.shootAt.state !== undefined || b.shootAt.hp !== undefined) && mon) { goal = null; b.think = 'FIGHT'; }
    else if (closedDoors.length && h.keys === 0 && nearest(W.items, 40 * TS, i => i.kind === 'key')) { goal = nearest(W.items, 40 * TS, i => i.kind === 'key'); b.think = 'KEY'; }
    else if (closedDoors.length && h.keys > 0 && b.doorTry < 6) { const dd = closedDoors.slice().sort((a, c) => d2(a.cells[0].x * TS + 8 > 0 ? { x: (a.cells[0].x + .5) * TS, y: (a.cells[0].y + .5) * TS } : a) - d2({ x: (c.cells[0].x + .5) * TS, y: (c.cells[0].y + .5) * TS }))[0]; goal = { x: (dd.cells[0].x + .5) * TS, y: (dd.cells[0].y + .5) * TS }; b.think = 'DOOR'; }
    else if (nearest(W.items, 12 * TS, i => ['gold', 'gem', 'chest', 'crown', 'flask', 'potion', 'amulet', 'key'].includes(i.kind))) { goal = nearest(W.items, 12 * TS, i => ['gold', 'gem', 'chest', 'crown', 'flask', 'potion', 'amulet', 'key'].includes(i.kind)); b.think = 'LOOT'; }
    else if (W.kind === 'boss') { goal = W.boss && !W.boss.dead ? { x: W.boss.x - 70, y: W.boss.y + 20 } : null; b.think = 'KING'; }
    else if (W.stairs.length) { goal = W.stairs[0]; b.think = 'STAIRS'; }
    else if (W.hoard.on) { goal = nearest(W.items, 1e9, i => ['gold', 'gem', 'chest', 'crown'].includes(i.kind)) || W.stairs[0]; b.think = 'HOARD'; }
    if (goal) { b.flow.update([cell(goal)]); if (b.flow.at(h.x, h.y) >= 1e9 && goal.kind !== undefined) { b.bad.add(goal); goal = null; } else if (b.flow.at(h.x, h.y) >= 1e9) goal = W.stairs[0] || goal; }
    b.goal = goal;
    if (goal && b.flow.key.indexOf(cell(goal)[0] + ',' + cell(goal)[1]) !== 0) b.flow.update([cell(goal)]);
    // magic when the screen is crowded
    const box = visibleBox(h); let cnt = 0; for (const m of W.mons) if (!m.dead && m.x > box.x0 && m.x < box.x1 && m.y > box.y0 && m.y < box.y1) cnt++;
    b.wantMagic = (cnt >= 12 || (W.tithe && d2(W.tithe) < 60)) && (h.flasks > 0 || cheats);
    if (cheats && h.flasks < 3) h.flasks = 3;
  }
  // act
  it.magic = false; it.rise = false;
  if (b.wantMagic) { it.magic = true; b.wantMagic = false; }
  let mx = 0, my = 0;
  const tgt = b.shootAt;
  if (b.goal && b.flow) { const v = b.flow.dir(h.x, h.y); if (v) { mx = v[0]; my = v[1]; } else if (Math.hypot(b.goal.x - h.x, b.goal.y - h.y) < 8) { mx = 0; my = 0; } }
  const closeFoe = W.mons.some(m => !m.dead && Math.hypot(m.x - h.x, m.y - h.y) < 34 && m.ch !== 'g');
  if (tgt && !tgt.dead && !tgt.gone) {
    const ax = tgt.x - h.x, ay = tgt.y - h.y, d = Math.hypot(ax, ay) || 1;
    it.ax = ax / d; it.ay = ay / d; it.fire = true; it.aimed = true; it.plant = false;
    if (W.allyStun) for (const o of W.heroes) { if (o === h || o.down) continue; const ox = o.x - h.x, oy = o.y - h.y, along = ox * it.ax + oy * it.ay; if (along > 0 && along < Math.min(d, 170) && Math.abs(ox * it.ay - oy * it.ax) < 10) { it.fire = false; mx = -it.ay * (h.slot % 2 ? 1 : -1); my = it.ax * (h.slot % 2 ? 1 : -1); break; } }
    if (b.think === 'FIGHT') {
      const ranged = h.C.id === 'ranger' || h.C.id === 'hexer';
      if (ranged && d < 60) { mx = -it.ax; my = -it.ay; } else if (!ranged && d > 20 && d < 100) { mx = it.ax * .6; my = it.ay * .6; } else if (!b.goal) { mx = 0; my = 0; }
    }
  } else { it.fire = false; it.aimed = false; if (mx || my) { it.ax = mx; it.ay = my; } }
  void closeFoe;
  it.mx = mx; it.my = my;
  // stuck detection
  b.sx = b.sx === undefined ? h.x : b.sx; b.sy = b.sy === undefined ? h.y : b.sy; b.st = (b.st || 0) + 1 / 120;
  if (b.st > 3) {
    const moved = Math.hypot(h.x - b.sx, h.y - b.sy); b.sx = h.x; b.sy = h.y; b.st = 0;
    if (moved < 8 && b.goal && !tgt) {
      b.stuck = (b.stuck || 0) + 1; if (b.goal.kind !== undefined && b.think === 'LOOT') b.bad.add(b.goal);
      if (b.think === 'DOOR') b.doorTry = (b.doorTry || 0) + 1;
      if (cheats && b.flow) { for (let k = 0; k < 6; k++) { const v = b.flow.dir(h.x, h.y); if (!v) break; h.x += v[0] * 12; h.y += v[1] * 12; } }
    }
  }
}
function makeBot(cheat) { return { t: 0, think: '', goal: null, shootAt: null, cheat: !!cheat, doorTry: 0, flow: null }; }
