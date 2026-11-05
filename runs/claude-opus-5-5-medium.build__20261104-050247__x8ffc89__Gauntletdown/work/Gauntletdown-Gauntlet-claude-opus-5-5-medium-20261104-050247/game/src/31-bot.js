/* 31-bot: the autopilot. Plays a hero from the sim's state (attract mode, the playthrough tests, Dev "bot plays P1").
 * Goals, re-chosen four times a second: eat when low, fight what is near, break generators, fetch keys and open doors
 * when the stairs are shut away, take treasure on the way, then the stairs. Fields know the transporters. */

function padLinks() { const L = new Map(); for (const p of W.pads) if (p.pair !== undefined) { const q = W.pads[p.pair]; L.set(p.cy * W.map.w + p.cx, q.cy * W.map.w + q.cx); } return L; }
function linkedField(sources) {
  // a BFS like buildField, but walking through transporter pairs (monsters never use them; heroes do)
  const map = W.map, w = map.w, h = map.h, d = new Int32Array(w * h).fill(1e9), q = new Int32Array(w * h * 2), links = padLinks();
  let qh = 0, qt = 0;
  for (const s of sources) { const k = s.cy * w + s.cx; if (d[k] === 0) continue; d[k] = 0; q[qt++] = k; }
  while (qh < qt) {
    const k = q[qh++], cx = k % w, cy = (k / w) | 0, nd = d[k] + 1;
    const nb = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
    for (const [nx, ny] of nb) { if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const nk = ny * w + nx; if (d[nk] <= nd || !map.walkable(nx, ny)) continue; d[nk] = nd; q[qt++] = nk; }
    if (links.has(k)) { const nk = links.get(k); if (d[nk] > nd) { d[nk] = nd; q[qt++] = nk; } }
  }
  return { d, w, h, links };
}
function makeBot(h, o = {}) { return { h, cheat: !!o.cheat, noSkip: !!o.noSkip, t: 0, goal: null, field: null, fkey: '', last: { x: h.x, y: h.y, t: 0 }, side: 0, think: 'start', tgt: null }; }

function botIntent(bot, dt) {
  const h = bot.h; bot.t += dt;
  if (!h.alive) return { ...IDLE_INTENT, rise: bot.t % 1 < dt * 2 };
  if (!W) return IDLE_INTENT;
  if (bot.t - (bot.decided || -9) > .25) { bot.decided = bot.t; botDecide(bot); }
  // movement down the goal's field
  let mx = 0, my = 0;
  const g = bot.goal;
  if (g) {
    const key = g.cx + ',' + g.cy + ':' + W.map.version;
    if (bot.fkey !== key) { bot.field = linkedField([{ cx: g.cx, cy: g.cy }]); bot.fkey = key; }
    const F = bot.field, cx = Math.floor(h.x / T), cy = Math.floor(h.y / T), here = F.d[cy * F.w + cx];
    if (here === 0 || (Math.abs(g.x - h.x) < 10 && Math.abs(g.y - h.y) < 10)) { const d = Math.hypot(g.x - h.x, g.y - h.y) || 1; mx = (g.x - h.x) / d; my = (g.y - h.y) / d; if (d < 2) { mx = my = 0; } }
    else {
      let best = null, bd = here;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= F.w || ny >= F.h) continue;
        if (dx && dy && (!W.map.walkable(cx + dx, cy) || !W.map.walkable(cx, cy + dy))) continue;
        const nd = F.d[ny * F.w + nx] + (dx && dy ? .5 : 0); if (nd < bd) { bd = nd; best = [nx, ny]; }
      }
      if (best) { const tx = (best[0] + .5) * T, ty = (best[1] + .5) * T, d = Math.hypot(tx - h.x, ty - h.y) || 1; mx = (tx - h.x) / d; my = (ty - h.y) / d; }
      else if (here >= 1e9) bot.goal = null;
    }
  }
  if (bot.side > 0) { bot.side -= dt; const a = bot.sideA; mx = Math.cos(a); my = Math.sin(a); }
  // fighting: aim at the target and fire; keep a little distance as a thrower
  let aim = null, fire = false, magic = false;
  const t = bot.tgt;
  if (t && !t.dead && (t.hp > 0 || t.alive)) {
    aim = Math.atan2(t.y - h.y, t.x - h.x); fire = true;
    const d = Math.hypot(t.x - h.x, t.y - h.y);
    if ((h.cls === 'ranger' || h.cls === 'hexer') && d < 40 && t.type !== 'tithe' && !t.maxHp) { mx = mx * .3 - Math.cos(aim) * .7; my = my * .3 - Math.sin(aim) * .7; }
  }
  const onScreen = W.mons.filter(m => !m.dead && Math.abs(m.x - h.x) < 200 && Math.abs(m.y - h.y) < 120).length;
  if (h.flasks > 0 && (onScreen >= 12 || (t && t.type === 'tithe' && Math.hypot(t.x - h.x, t.y - h.y) < 60) || (W.boss && W.boss.alive && W.boss.intro <= 0 && bot.t % 9 < dt))) magic = true;
  if (bot.cheat && h.flasks < 3) h.flasks = 3;
  // stuck: little progress in 3 s -> sidestep; with cheats, hop ahead along the field
  if (bot.t - bot.last.t > 3) {
    const moved = Math.hypot(h.x - bot.last.x, h.y - bot.last.y);
    if (moved < 8 && bot.goal) {
      bot.side = .5; bot.sideA = R() * TAU; bot.think += ' (stuck)';
      if (bot.cheat && bot.field) hopAhead(bot);
    }
    bot.last = { x: h.x, y: h.y, t: bot.t };
  }
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  return { mx, my, aim, fire, kbFire: false, magic, plant: false, rise: false };
}
function hopAhead(bot) {
  const h = bot.h, F = bot.field;
  let cx = Math.floor(h.x / T), cy = Math.floor(h.y / T);
  for (let i = 0; i < 4; i++) {
    let best = null, bd = F.d[cy * F.w + cx];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= F.w || ny >= F.h) continue; const nd = F.d[ny * F.w + nx]; if (nd < bd) { bd = nd; best = [nx, ny]; } }
    if (!best) break; [cx, cy] = best;
  }
  h.x = (cx + .5) * T; h.y = (cy + .5) * T; h.body.x = h.x; h.body.y = h.y;
}

function botDecide(bot) {
  const h = bot.h, map = W.map;
  const [hx, hy] = cellOf(h), me = linkedField([{ cx: hx, cy: hy }]), at = e => me.d[Math.floor(e.y / T) * me.w + Math.floor(e.x / T)];
  const reach = e => at(e) < 1e9, set = (e, why) => { bot.goal = { cx: Math.floor(e.x / T), cy: Math.floor(e.y / T), x: e.x, y: e.y }; bot.think = why; };
  // a target to shoot: the nearest monster in sight within 7 tiles, else a generator within 10, else the boss
  bot.tgt = null;
  let bd = 1e9;
  for (const m of W.mons) { if (m.dead || m.emerge > 0) continue; const d = Math.hypot(m.x - h.x, m.y - h.y); if (d < 7 * T && d < bd && (m.type !== 'tithe' || h.flasks > 0) && map.los(h.x, h.y, m.x, m.y)) { bd = d; bot.tgt = m; } }
  if (!bot.tgt) for (const g of W.gens) { if (g.dead) continue; const d = Math.hypot(g.x - h.x, g.y - h.y); if (d < 10 * T && map.los(h.x, h.y, g.x, g.y)) { bot.tgt = g; break; } }
  if (W.boss && W.boss.alive && W.boss.intro <= 0) {
    const pl = W.boss.phase === 2 && W.items.find(i => i.kind === 'platter' && !i.gone && Math.hypot(i.x - h.x, i.y - h.y) < 160);
    if (!bot.tgt || Math.hypot(W.boss.x - h.x, W.boss.y - h.y) < 120) bot.tgt = pl ? Object.assign(Object.create(null), { x: pl.x, y: pl.y, hp: 1 }) : W.boss;
  }
  const items = W.items.filter(i => !i.gone && !(i.delay > 0) && reach(i));
  const nearest = (list) => list.reduce((a, b) => !a || at(b) < at(a) ? b : a, null);
  // 0. the Iron Gauntlet
  const gl = items.find(i => i.kind === 'gauntlet'); if (gl) return set(gl, 'the gauntlet');
  // 1. food when low
  if (h.hp < 250) { const f = nearest(items.filter(i => get('items', i.kind).food && at(i) < 20)); if (f) return set(f, 'eat'); }
  // the hoard: everything shiny
  if (W.hoard) { const t = nearest(items.filter(i => get('items', i.kind).treasure && i.kind !== 'lchest')); if (t) return set(t, 'hoard'); }
  // the boss: keep at a throwing distance from him
  if (W.boss && W.boss.alive) { const B = W.boss, a = Math.atan2(h.y - B.y, h.x - B.x) + .3; return set({ x: clamp(B.x + Math.cos(a) * 90, 24, map.w * T - 24), y: clamp(B.y + Math.sin(a) * 90, 24, map.h * T - 24) }, 'circle the king'); }
  // 2. the stairs, if they can be reached (taking treasure and food close on the way)
  const exits = W.exits.filter(e => reach(e) && (!e.to || (e.to > W.no && !bot.noSkip))), exit = nearest(exits.filter(e => !e.to)) || nearest(exits);
  const close = nearest(items.filter(i => at(i) < 5 && ['gold', 'gem', 'crown', 'chest', 'key', 'flask', 'special', 'amulet'].includes(i.kind) || (at(i) < 8 && get('items', i.kind).food && h.hp < 600 && i.kind !== 'stew')));
  if (close && !(close.kind === 'key' && h.keys >= limitOf(h)) && !(close.kind === 'flask' && h.flasks >= limitOf(h)) && !(close.kind === 'special' && h.specials[close.sub])) return set(close, 'grab ' + close.kind);
  if (exit) return set(exit, 'stairs');
  // 3. doors: open the nearest run we can reach, with a key; else fetch a key
  const doors = W.doorGroups.filter(g => !g.open).map(g => ({ g, c: g.cells.reduce((a, c) => { const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => me.d[(c.cy + dy) * me.w + c.cx + dx]).reduce((x, y) => Math.min(x, y), 1e9); return n < a.n ? { c, n } : a; }, { c: null, n: 1e9 }) })).filter(o => o.c.c && o.c.n < 1e9);
  if (doors.length && h.keys > 0) { const d = doors.sort((a, b) => a.c.n - b.c.n)[0].c.c; return set(d, 'open a door'); }
  const key = nearest(items.filter(i => i.kind === 'key')); if (key) return set(key, 'fetch a key');
  // 4. trap plates, then anything left, then wander toward the stairs
  const plate = W.plates.find(p => !p.used && reach(p)); if (plate) return set(plate, 'step on the plate');
  const any = nearest(items.filter(i => i.kind !== 'stew' && i.kind !== 'lchest')); if (any) return set(any, 'explore');
  bot.goal = null; bot.think = 'wait for the Gaunt';
}
