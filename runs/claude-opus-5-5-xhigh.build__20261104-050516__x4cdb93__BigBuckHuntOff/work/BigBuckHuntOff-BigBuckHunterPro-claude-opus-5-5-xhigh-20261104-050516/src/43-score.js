// 43-score: what a kill is worth (the rack, the distance, the zone, running, the trophy, a quick draw, multi-kills),
// the site's bonuses (accuracy, a clean sweep, no penalties), stars, and the rank a hunt earns against its par.
function scoreKill(H, p, a, R, o = {}) {
  const Z = ZONES[R.zone] || ZONES.body, base = a.sp.base(a.points), dist = R.dist;
  const distMult = clamp(1 + (dist - 25) / T('distanceSlope'), 1, 3.5), zoneMult = Z.mult(), run = o.running ? T('runningMult') : 1, trophy = a.trophy ? 3 : 1;
  let pts = Math.round(base * distMult * zoneMult * run * trophy);
  const quick = o.quick ? 50 : 0;
  let multi = 0, multiN = 1;
  if (H.time - (p.lastKillT === undefined ? -9 : p.lastKillT) <= 1.5) { p.multiN = (p.multiN || 1) + 1; multiN = p.multiN; multi = multiN === 2 ? 250 : multiN >= 3 ? 750 : 0; } else p.multiN = 1;
  p.lastKillT = H.time;
  pts += quick + multi;
  if (o.shared) pts = Math.round(pts / o.shared);
  return { a, id: a.id, zone: R.zone, dist, base, distMult, zoneMult, running: !!o.running, trophy: !!a.trophy, quick, multi, multiN, shared: o.shared || 0, points: pts, label: a.label, rack: a.sp.rack(a.points), species: a.sp.id, shots: a.hits.filter(h => h.pn === p.n).length, lethal: Z.lethal };
}
/** the end of a site: each player's bonuses and stars */
function siteBonuses(site) {
  const bucks = site.bucksSpawned, all = bucks.length, escaped = bucks.filter(a => a.escaped || a.lost).length, out = [];
  for (const res of site.results) {
    const p = res.p, B = res.bonuses;
    // a wounded animal that got away costs its hunter
    for (const a of bucks) if (a.lost && a.hits.length && a.hits[0].pn === p.n) { res.penalties.push({ label: 'WOUNDED AND LOST', points: -100 }); res.add(-100); p.addScore(-100); }
    const acc = res.shots ? res.hits / res.shots : 0;
    if (res.shots >= 2 && acc >= .5) { const v = Math.round(acc * 1000); B.push({ label: 'ACCURACY ' + Math.round(acc * 100) + '%', points: v }); }
    const myKills = res.kills, clean = all > 0 && escaped === 0 && myKills.length > 0 && myKills.every(k => k.shots === 1 && k.lethal) && !res.penalties.length && (site.H.players.length > 1 || myKills.length === all);
    if (clean) B.push({ label: 'CLEAN SWEEP', points: 1000 });
    if (!res.penalties.length && res.shots > 0) B.push({ label: 'NO PENALTIES', points: 200 });
    for (const b of B) { res.add(b.points); p.addScore(b.points); }
    res.clean = clean;
    res.stars = !myKills.length ? 0 : (escaped === 0 && (site.H.players.length > 1 || myKills.length === all)) ? (clean && !res.penalties.length ? 3 : 2) : 1;
    out.push(res);
  }
  return out;
}
const RANKS = [[.4, 'GREENHORN'], [.6, 'TENDERFOOT'], [.8, 'WOODSMAN'], [1, 'SHARPSHOOTER'], [1.25, 'BIG GAME PRO'], [Infinity, 'LEGEND OF THE LODGE']];
function rankFor(score, par) { const f = score / Math.max(1, par); for (const [lim, name] of RANKS) if (f < lim) return name; return RANKS[RANKS.length - 1][1]; }
