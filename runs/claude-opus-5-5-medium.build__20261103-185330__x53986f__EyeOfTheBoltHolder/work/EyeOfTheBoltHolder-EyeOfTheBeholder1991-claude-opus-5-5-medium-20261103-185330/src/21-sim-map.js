/* SIM: the map at run time. Cell queries (walls, doors, secret walls, pits), what stands where, the party's field of
 * view (E.Grid's symmetric shadowcasting) for the automap and for monsters noticing the party. */
B.R = { F: {} };
B.buildRuntime = () => {
  B.R.F = {};
  for (const fid of Object.keys(B.S.floors)) {
    const F = B.FLOORS[fid], R = { doorAt: {}, plateAt: {}, pitAt: {}, tpAt: {}, secretAt: {}, illusionAt: {}, trapAt: {}, featAt: {}, featById: {}, safe: new Set((F.safe || []).map(([x, y]) => key(x, y))), w: F.map[0].length, h: F.map.length };
    for (const [id, d] of Object.entries(F.doors || {})) R.doorAt[key(...d.at)] = id;
    for (const [id, d] of Object.entries(F.plates || {})) R.plateAt[key(...d.at)] = id;
    for (const [id, d] of Object.entries(F.pits || {})) R.pitAt[key(...d.at)] = id;
    for (const [id, d] of Object.entries(F.teleports || {})) R.tpAt[key(...d.at)] = id;
    for (const [id, d] of Object.entries(F.secrets || {})) R.secretAt[key(...d)] = id;
    for (const [id, d] of Object.entries(F.illusions || {})) R.illusionAt[key(...d)] = id;
    for (const [id, d] of Object.entries(F.traps || {})) R.trapAt[key(...d)] = id;
    for (const f of F.features || []) { const [id, kind, x, y, face, o = {}] = f; const e = { id, kind, x, y, d: FACE[face], o }; R.featAt[key(x, y) + ',' + FACE[face]] = e; R.featById[id] = e; }
    R.grid = new E.Grid(R.w, R.h, { walkable: (x, y) => B.monWalk(fid, x, y), opaque: (x, y) => B.opaque(fid, x, y) });
    B.R.F[fid] = R;
  }
};
B.F = () => B.FLOORS[B.S.floor];
B.FS = (fid = B.S.floor) => B.S.floors[fid];
B.RF = (fid = B.S.floor) => B.R.F[fid];
B.ch = (fid, x, y) => { const row = B.FLOORS[fid].map[y]; return row ? row[x] || '#' : '#'; };
B.doorIn = (fid, x, y) => { const id = B.R.F[fid].doorAt[key(x, y)]; return id ? [id, B.S.floors[fid].doors[id]] : null; };
B.pitIn = (fid, x, y) => { const id = B.R.F[fid].pitAt[key(x, y)]; if (!id) return null; const p = B.S.floors[fid].pits[id]; return { id, p, data: B.FLOORS[fid].pits[id] }; };
B.isWall = (fid, x, y) => {
  const c = B.ch(fid, x, y);
  if (c === '#') return true;
  if (c === 'H') { const id = B.R.F[fid].secretAt[key(x, y)]; return !(id && B.S.floors[fid].secrets[id].open > .9); }
  return false;
};
/** a cell a body may stand in (doors open, secret walls gone; illusions are open) */
B.open = (fid, x, y) => {
  if (B.isWall(fid, x, y)) return false;
  const d = B.doorIn(fid, x, y); if (d && d[1].open < .85) return false;
  return true;
};
B.opaque = (fid, x, y) => { const c = B.ch(fid, x, y); if (c === '#' || c === 'I') return true; if (B.isWall(fid, x, y)) return true; const d = B.doorIn(fid, x, y); return !!(d && d[1].open < .5); };
/** an open pit (not bridged): a body that walks in falls */
B.pitOpen = (fid, x, y) => { const p = B.pitIn(fid, x, y); return !!(p && p.p.open && !p.p.bridged); };
B.monWalk = (fid, x, y) => B.open(fid, x, y) && !((p) => p && !p.p.bridged)(B.pitIn(fid, x, y)) && B.ch(fid, x, y) !== '<' && B.ch(fid, x, y) !== '>' && B.ch(fid, x, y) !== 'I' && B.ch(fid, x, y) !== '^';
B.monsAt = (x, y, fid = B.S.floor) => B.S.floors[fid].mons.filter(m => m.hp > 0 && m.cx === x && m.cy === y);
B.unitsAt = (x, y, fid, except) => B.monsAt(x, y, fid).reduce((n, m) => n + (m === except ? 0 : B.MONSTERS[m.type].size), 0);
B.itemsAt = (x, y, fid = B.S.floor) => B.S.floors[fid].items[key(x, y)] || [];
B.featAt = (x, y, d, fid = B.S.floor) => B.R.F[fid].featAt[key(x, y) + ',' + d] || null;
B.safeCell = (x, y) => B.RF().safe.has(key(x, y));
B.front = () => { const P = B.S.party; return [P.cx + DX[P.dir], P.cy + DY[P.dir]]; };

/** the party looks: its field of view marks the map seen (4 cells) and wakes the monsters that see it */
B.look = () => {
  const S = B.S, P = S.party, FS = B.FS(), R = B.RF();
  const vis = R.grid.fov([P.cx, P.cy], 8); B.R.vis = vis; B.R.visFloor = S.floor;
  for (const k of vis) { const [x, y] = k.split(',').map(Number); if (Math.abs(x - P.cx) + Math.abs(y - P.cy) <= 5) FS.seen[k] = 1; }
  FS.seen[key(P.cx, P.cy)] = 1;
};
B.visible = (x, y) => B.R.vis && B.R.visFloor === B.S.floor && B.R.vis.has(key(x, y));
/** the cells along the facing from the party: up to n, stopping at the first that blocks (returned last, with blocked) */
B.line = (x, y, d, n, fid = B.S.floor) => {
  const out = [];
  for (let k = 1; k <= n; k++) { x += DX[d]; y += DY[d]; const ok = B.open(fid, x, y); out.push({ x, y, ok }); if (!ok) break; }
  return out;
};
/** doors, gates and secret walls ease toward where they are wanted (gates 0.9 s, doors 0.5 s, secret walls 1.2 s) */
B.updateDoors = dt => {
  for (const fid of Object.keys(B.S.floors)) {
    const FS = B.S.floors[fid]; let changed = false;
    for (const [id, d] of Object.entries(FS.doors)) {
      if (d.blockedClose) { const at = B.FLOORS[fid].doors[id].at, P = B.S.party; if (!(fid === B.S.floor && P.cx === at[0] && P.cy === at[1]) && !B.monsAt(at[0], at[1], fid).length) { d.blockedClose = false; d.want = 0; } }
      const rate = d.kind === 'door' ? 2 : d.kind === 'undergate' ? .25 : 1.1, was = d.open;
      d.open = d.want > d.open ? Math.min(d.want, d.open + rate * dt) : Math.max(d.want, d.open - rate * dt);
      if ((was < .5) !== (d.open < .5) || (was < .85) !== (d.open < .85)) changed = true;
    }
    for (const s of Object.values(FS.secrets)) { const was = s.open; s.open = s.want ? Math.min(1, s.open + dt / 1.2) : s.open; if ((was <= .9) !== (s.open <= .9)) changed = true; }
    if (changed && fid === B.S.floor) B.look();
  }
};
B.setDoor = (id, want, fid = B.S.floor) => {
  const d = B.S.floors[fid].doors[id]; if (!d) return;
  const w = want === 'toggle' ? (d.want || d.blockedClose ? 0 : 1) : want ? 1 : 0;
  if (w) d.blockedClose = false;
  if (w === d.want) return;
  // a gate never shuts on a body standing under it: it waits open
  if (!w) { const at = B.FLOORS[fid].doors[id].at, P = B.S.party; if ((fid === B.S.floor && P.cx === at[0] && P.cy === at[1]) || B.monsAt(at[0], at[1], fid).length) { d.blockedClose = true; return; } }
  d.want = w; d.blockedClose = false;
  if (fid === B.S.floor) B.sfx(d.kind === 'door' ? (w ? 'doorOpen' : 'doorClose') : d.kind === 'gate' ? 'gate' : 'gate', { at: B.FLOORS[fid].doors[id].at });
  B.noise(B.FLOORS[fid].doors[id].at, 4);
};
B.revealSecret = (id, fid = B.S.floor, quiet) => { const s = B.S.floors[fid].secrets[id]; if (!s || s.want) return; s.want = 1; B.sfx('secretWall', { at: B.FLOORS[fid].secrets[id] }); if (!quiet) B.secretFound(); };
B.secretFound = () => { B.S.stats.secrets++; B.ev('sting', { name: 'secret' }); for (const m of B.alive()) B.gainXp(m, 25, true); };
