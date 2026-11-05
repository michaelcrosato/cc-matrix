// 31-patterns: the spawn patterns site scripts call: how animals come into a site and go out of it.
// Points are [bearing, distance] from the site's vantage (degrees from its heading, metres).
const orderFor = (o, gait) => {
  const g = gait || o.gait || 'walk', list = [];
  if (o.stop) list.push([g === 'run' || g === 'bound' ? 'trot' : g, { to: o.stop[0] }], [o.look === false ? 'stand' : 'look', { secs: o.stop[1] }], [g, { to: 1 }]);
  else list.push([g, { to: 1 }]);
  list.push(['exit']); return list;
};
def('pattern', 'cross', { make(S, o) {
  if (o.follow) return [S.spawn(o.kind, Object.assign({}, o, { follow: o.follow, path: null, at: o.follow, back: o.back || 2.5, side: o.side || 0, orders: [['hold']], species: o.species || o.follow.o.species }))];
  return [S.spawn(o.kind, Object.assign({}, o, { orders: o.orders || orderFor(o) }))];
} });
def('pattern', 'emerge', { make(S, o) {   // waits hidden behind cover, steps out alert, then goes on
  const g = o.gait || 'run', list = [['look', { secs: o.alertSecs || .7 }]].concat(orderFor(o, g));
  return [S.spawn(o.kind, Object.assign({}, o, { orders: list, delay: (o.delay || 0) + .01, jumps: o.jump ? [{ d: o.jump }] : [] }))];
} });
def('pattern', 'graze', { make(S, o) {   // walks in, grazes with glances up, wanders off
  const path = [o.from, o.at, o.exit || [o.at[0] - 30, o.at[1] + 10]], f = 1 / 2;
  return [S.spawn(o.kind, Object.assign({}, o, { path, orders: [['walk', { to: f * .98 }], ['graze', { secs: o.secs || 4 }], ['look', { secs: 1.2 }], [o.leave || 'trot', { to: 1 }], ['exit']] }))];
} });
def('pattern', 'herdPass', { make(S, o) {   // a leader and followers on one path
  const kinds = o.kinds, out = [];
  const lead = S.spawn(kinds[0], Object.assign({}, o, { points: (o.points || [])[0], orders: orderFor(o), jumps: o.jump ? [{ d: o.jump }] : [] }));
  out.push(lead);
  for (let i = 1; i < kinds.length; i++) out.push(S.spawn(kinds[i], { species: o.species, follow: lead, at: lead, back: (o.spacing || 4) * i, side: (i % 2 ? 1 : -1) * (o.spread || 1.4), points: (o.points || [])[i], delay: o.delay, react: .1 + S.rng.f() * .3, orders: [['hold']] }));
  return out;
} });
def('pattern', 'ridgeRun', { make(S, o) { return [S.spawn(o.kind, Object.assign({}, o, { orders: orderFor(o, 'run') }))]; } });
def('pattern', 'wade', { make(S, o) { return [S.spawn(o.kind, Object.assign({}, o, { orders: orderFor(o, 'walk'), speedMul: .7 }))]; } });
def('pattern', 'bolt', { make(S, o) {   // bedded down unseen; jumps up and runs at the first shot or after a time
  const a = S.spawn(o.kind, Object.assign({}, o, { path: o.path, delay: o.after || 12, orders: [['run', { to: 1 }], ['exit']], jumps: [{ d: .02 }] }));
  if (!S.site.timeBoxed) { const off = bus.on('shot', () => { if (a.state === 'hidden') { a.delay = .25 + S.rng.f() * .3; } off(); }); S.cleanup.push(off); }
  return [a];
} });
def('pattern', 'decoyDoe', { make(S, o) { return [S.spawn(o.kind || (S.species === 'whitetail' ? 'doe' : 'cow'), Object.assign({}, o, { orders: orderFor(o, o.gait || 'walk'), decoy: true }))]; } });
def('pattern', 'stand', { make(S, o) {
  const path = [o.from, o.at, o.exit || [o.at[0] + 30, o.at[1] + 10]];
  return [S.spawn(o.kind, Object.assign({}, o, { path, orders: [['walk', { to: .49 }], ['stand', { secs: o.secs || 3 }], ['trot', { to: 1 }], ['exit']] }))];
} });
def('pattern', 'charge', { make(S, o) {   // runs straight at the vantage, then veers off
  const path = o.path || [o.from, [o.from[0] * .3, 18], [o.veer || 40, 12], [(o.veer || 40) * 1.5, 30]];
  return [S.spawn(o.kind, Object.assign({}, o, { path, orders: [['run', { to: 1 }], ['exit']], charge: true }))];
} });
def('pattern', 'fight', { make(S, o) {   // two bulls lock antlers, then split
  const A = S.spawn(o.kind || 'bull', Object.assign({}, o, { path: [o.fromA, o.at, o.exitA], points: o.pointsA, orders: [['walk', { to: .48 }], ['fight', { secs: o.secs || 5 }], ['run', { to: 1 }], ['exit']] }));
  const B = S.spawn(o.kind || 'bull', Object.assign({}, o, { path: [o.fromB, [o.at[0] + 3, o.at[1] + 3], o.exitB], points: o.pointsB, orders: [['walk', { to: .48 }], ['fight', { secs: o.secs || 5 }], ['run', { to: 1 }], ['exit']] }));
  for (const X of [A, B]) for (const q of [X.order].concat(X.orders)) if (q && q[0] === 'fight') q[1] = Object.assign({}, q[1], { with: X === A ? B : A });
  return [A, B];
} });
