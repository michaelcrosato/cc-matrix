// The Coast 2 Coast Tour (plan §7.8, §8.8): fourteen postcards from four givers. Each is a fixed route with its rules:
// a race against pacers (the rivals drive the route at their pace and their curves; they don't collide), a set of road
// objects to collect or cut, a photo, a memory sequence, a count, or the Love in Bloom rules on the full pyramid.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const T = k => OB.tune(k);
const RANKS = ['C', 'B', 'A', 'AAA'];

/** the rivals (plan §8.5): their colour, their pace (a share of the car's top speed) and their habit */
OB.RIVALS = {
  kiki: { name: 'Kiki Rapido', color: '#8ad83a', pace: .97, late: 0 },
  brambles: { name: 'The Brambles', color: '#d8a03a', pace: .96, late: 0 },
  lustres: { name: 'Lance & Lacey', color: '#e8c040', pace: .95, late: 0 },
  ottavio: { name: 'Old Ottavio', color: '#8a2a3a', pace: .93, late: .6 },
};

/** a pacer: a rival's place on a fixed route, moved by its pace and the bends of the road it is on */
class Pacer {
  constructor(id, route, lane, carTop) {
    const r = OB.RIVALS[id];
    this.id = id; this.name = r.name; this.color = r.color; this.late = r.late; this.route = route;
    this.prog = 0; this.lane = lane; this.kmh = 0; this.top = carTop * r.pace; this.finishT = null;
    this.draftPts = 0; this.driftPts = 0; this.petals = 20; this.out = false;
    this.total = route.reduce((a, id2) => a + OB.World.stage(id2).len, 0);
  }
  /** the stage and the distance on it at the pacer's progress */
  place() {
    let p = this.prog;
    for (const id of this.route) { const st = OB.World.stage(id); if (p < st.len) return { id, z: p, st }; p -= st.len; }
    return null;
  }
  step(dt, elapsed) {
    if (this.out || this.finishT !== null) return;
    const pl = this.place(); if (!pl) { this.finishT = elapsed; return; }
    const info = OB.World.info(pl.st, pl.z, this.lane);
    const bend = Math.abs(info.curve) < .5 ? 1 : Math.min(1, Math.sqrt((2 / (Math.abs(info.curve) * T('curvePush'))) + this.late * .1));
    this.kmh = this.top * bend;
    if (Math.abs(info.curve) >= 4) this.driftPts += this.kmh * .4 * dt * 10;
    this.draftPts += dt * .5 * this.kmh / 100;
    this.prog += this.kmh * OB.KMH_UNITS * dt;
    if (this.prog >= this.total) this.finishT = elapsed;
  }
  /** the pacer's position on the stage the car is on (or null when it is on another stage) */
  onStage(race) {
    const pl = this.place(); if (!pl) return null;
    if (pl.id !== race.stage.def.id) return null;
    return pl.z;
  }
}
OB.Pacer = Pacer;

/** the road objects a mission needs, placed along the stage with a seeded stream */
function spreadObjects(route, kind, count, rng, opts = {}) {
  const st = OB.World.stage(route[0]), out = [];
  const usable = st.junction - 600 * OB.SEG / 200 * 0 - 1200;
  for (let i = 0; i < count; i++) {
    const z = 1600 + (usable - 1600) * (i + .5) / count;
    const x = opts.x ? opts.x(i, rng) : -.6 + 1.2 * rng();
    out.push(OB.Objects.make(kind, z, x, opts.extra ? opts.extra(i) : {}));
  }
  return out;
}

/** the mission rules: hooks for the race (onStart, onStep, onEvent, the end, and the result) */
const Rules = {
  /** B1: reach the checkpoint with the clock from 52 seconds; the rank is the time left */
  sprint(m) {
    return { clock: 52, route: m.route, result(r) { const left = Math.max(0, r.clock); return { cleared: r.status === 'finish' || r.stage.def.id !== m.route[0], value: +left.toFixed(1), rank: rankBy(left, m.ranks, true) }; } };
  },
  /** B2, B3: a duel against a pacer; the score is the car's own (drift or draft) against the rival's */
  driftduel(m) {
    return { pacers: [['kiki', 0.67]], result(r) { const p = r.pacers[0], mine = r.car.stats.driftTotal + r.car.drift.score, theirs = p.driftPts; const ratio = theirs ? mine / theirs : 2; return { cleared: ratio >= 1, value: Math.round(mine), rank: rankRatio(ratio, m.ranks) }; } };
  },
  draftdash(m) {
    return { pacers: [['brambles', -0.67]], result(r) { const p = r.pacers[0], mine = r.counters.draftPts; const ratio = p.draftPts ? mine / p.draftPts : 2; const won = r.status === 'finish' && (p.finishT === null || r.elapsed <= p.finishT); return { cleared: won || ratio >= 1, value: Math.round(mine), rank: won ? rankRatio(Math.max(1, ratio), m.ranks) : null }; } };
  },
  /** B4: five racers; the last at each checkpoint is out; finish in the top two, with the time margin for the rank */
  knockout(m) {
    return { pacers: [['kiki', -.6], ['brambles', .6], ['lustres', -.1], ['ottavio', .4]], knockout: true,
      result(r) {
        const alive = r.pacers.filter(p => !p.out);
        const pl = r.car.z;
        const you = r.status === 'goal' ? r.elapsed : null, theirs = r.pacers.filter(p => p.finishT !== null).sort((a, b) => a.finishT - b.finishT);
        const first = you !== null && (!theirs.length || you <= theirs[0].finishT);
        const second = you !== null && (theirs.length < 2 || you <= theirs[1].finishT);
        const margin = theirs.length ? theirs[0].finishT - you : 0;
        const rank = !you ? null : first ? (margin >= 5 ? 'AAA' : margin >= 2 ? 'A' : 'B') : second ? 'C' : null;
        return { cleared: !!you && second, value: you ? +you.toFixed(1) : null, rank, stats: { eliminated: r.pacers.filter(p => p.out).map(p => p.name) } };
      } };
  },
  /** M1: collect forty balloons; M2: gnomes, with the bees costing two each */
  collect(m) {
    return { objects: m.objects, result(r) { const n = r.counters.collected || 0; const net = m.net ? n - 2 * (r.counters.stings || 0) : n; return { cleared: net >= m.ranks[0], value: net, rank: rankBy(net, m.ranks) }; } };
  },
  /** M3: a sequence of five colours shown first; then five gate sets, each with one gate of the wanted colour */
  memory(m) {
    return { objects: m.objects, sequence: m.sequence, result(r) { const ok = r.counters.gatesOk || 0; const wrong = r.counters.gatesWrong || 0; const v = ok - wrong; return { cleared: ok >= m.ranks[0], value: v, rank: wrong ? rankBy(v, [m.ranks[0], m.ranks[1], m.ranks[2], 99]) : rankBy(ok, [m.ranks[0], m.ranks[1], m.ranks[2], m.ranks[3]]) }; } };
  },
  /** V1: zero contacts, ranked by the time against the stage's par */
  clean(m) {
    return { route: m.route, result(r) { const clean = (r.counters.contacts || 0) === 0; const par = OB.STAGES.find(s => s.id === m.route[0]).par; const t = r.elapsed; const over = t - par; const rank = !clean ? null : over <= -0 ? 'AAA' : over <= 2 ? 'A' : over <= 6 ? 'B' : over <= 12 ? 'C' : null; return { cleared: clean && rank !== null, value: +t.toFixed(1), rank, stats: { par } }; } };
  },
  /** V2: above 240 km/h for the share of the stage's time */
  speedkeep(m) {
    return { route: m.route, result(r) { const share = r.counters.fastT / Math.max(1, r.elapsed); return { cleared: share >= .7, value: Math.round(share * 100), rank: rankBy(share * 100, [70, 80, 88, 95]) }; } };
  },
  /** V3: the rival couple (Lance & Lacey) start with twenty petals each; behind them drains, passing steals two */
  heartbreak(m) {
    return { route: m.route, pacers: [['lustres', 0]], couple: true, goal: 'A',
      result(r) { const p = r.pacers[0], mine = r.petals; const theirs = p.petals; const won = theirs <= 0 || mine > theirs && mine > 0; const rank = mine > 0 && theirs <= 0 ? 'AAA' : mine >= 18 ? 'A' : mine >= 10 ? 'B' : mine > 0 ? 'C' : null; return { cleared: mine > 0 && (won || mine > 0), value: mine, rank, stats: { theirs } }; } };
  },
  /** J1: near misses; J2: ribbons cut; J3: three photos, their points summed */
  count(m) {
    return { route: m.route, result(r) { const n = m.measure === 'ribbons' ? (r.counters.cuts || 0) : (r.counters.nearmisses || 0); return { cleared: n >= m.ranks[0], value: n, rank: rankBy(n, m.ranks) }; } };
  },
  photo3(m) {
    return { route: m.route, objects: m.objects, result(r) { const pts = r.counters.photoPts || 0; return { cleared: pts >= m.ranks[0], value: pts, rank: rankBy(pts, m.ranks) }; } };
  },
  /** F: the Love in Bloom rules on the whole pyramid: a goal at any grade B or better, the rank by the grade */
  love() {
    return { route: null, result(r) { const g = r.grade ? r.grade() : null; const rank = !g || !r.goal ? null : ({ AAA: 'AAA', AA: 'A', A: 'A', B: 'B' })[g.grade] || null; return { cleared: !!rank, value: g ? g.grade : 'none', rank }; } };
  },
};
/** the rank by a value against thresholds [C, B, A, AAA]; higher is better, or lower with `lower` */
function rankBy(v, th, lower = false) {
  if (lower) { if (v >= th[3]) return 'AAA'; if (v >= th[2]) return 'A'; if (v >= th[1]) return 'B'; if (v >= th[0]) return 'C'; return null; }
  if (v >= th[3]) return 'AAA'; if (v >= th[2]) return 'A'; if (v >= th[1]) return 'B'; if (v >= th[0]) return 'C'; return null;
}
/** the rank by a ratio of the car's score to the rival's: win is C, then +10 %, +25 %, +45 % */
function rankRatio(ratio, th) {
  const t = th || [1, 1.1, 1.25, 1.4];
  if (ratio >= 1.4) return 'AAA'; if (ratio >= 1.25) return 'A'; if (ratio >= 1.1) return 'B'; if (ratio >= 1) return 'C'; return null;
}
OB.rankBy = rankBy;

/** the missions: the giver, the title, the route, the rule, the thresholds, the base seeds, the unlock order */
OB.MISSIONS = [
  { id: 'B1', giver: 'bruno', title: 'First Light Sprint', route: ['S1'], rule: 'sprint', ranks: [0, 5, 9, 13], base: 150, brief: 'Reach the checkpoint before the sun gets ahead of you. Start the clock at 52 seconds.' },
  { id: 'B2', giver: 'bruno', title: 'Drift Duel', route: ['S2'], rule: 'driftduel', ranks: [1, 1.1, 1.25, 1.45], base: 200, brief: 'Kiki Rapido wants to see who drifts better. Earn more drift score than she does.', unlocks: 'gardenia' },
  { id: 'B3', giver: 'bruno', title: 'Draft Dash', route: ['S4'], rule: 'draftdash', ranks: [1, 1.1, 1.25, 1.4], base: 250, brief: 'The Brambles brothers are drafting for the win. Draft better, and finish first.' },
  { id: 'B4', giver: 'bruno', title: 'Last One Wilts', route: ['S5', 'S8', 'S12'], rule: 'knockout', ranks: [2, 1, 2, 5], base: 300, brief: 'Five racers, three checkpoints. The last one at each checkpoint is out. Finish in the top two.', unlocks: 'lemon-drop' },
  { id: 'M1', giver: 'marisol', title: 'Balloon Bonanza', route: ['S1'], rule: 'collect', obj: 'balloon', count: 40, ranks: [20, 26, 32, 38], base: 150, brief: 'Forty balloons, all over the beach. Pop as many as you can.' },
  { id: 'M2', giver: 'marisol', title: 'Gnome Patrol', route: ['S9'], rule: 'collect', obj: 'gnome', count: 24, bees: 8, net: true, ranks: [10, 14, 18, 22], base: 200, brief: 'Bonk the gnomes. The bees will sting you, and each sting costs two.', unlocks: 'moonflower' },
  { id: 'M3', giver: 'marisol', title: 'Memory Lane', route: ['S2'], rule: 'memory', ranks: [3, 4, 5, 5], base: 250, brief: 'Remember the colours she shows you, then drive through the right gate in each set.', unlocks: 'outfit-marisol' },
  { id: 'V1', giver: 'vivi', title: 'Not a Scratch', route: ['S8'], rule: 'clean', ranks: [0, 0, 0, 0], base: 200, brief: 'Not one scratch, darling. Ranked by time against the par.' },
  { id: 'V2', giver: 'vivi', title: 'Fashionably Fast', route: ['S10'], rule: 'speedkeep', ranks: [70, 80, 88, 95], base: 250, brief: 'Stay above 240 in the crosswinds. It is not a suggestion.', unlocks: 'magnolia' },
  { id: 'V3', giver: 'vivi', title: 'Heartbreakers', route: ['S11'], rule: 'heartbreak', goal: 'A', ranks: [1, 10, 18, 0], base: 300, brief: 'Lance and Lacey are your rivals, and their petals are yours to take. Win them over.', unlocks: 'outfit-vivi' },
  { id: 'J1', giver: 'juni', title: 'Close Calls', route: ['S3'], rule: 'count', measure: 'nearmisses', ranks: [8, 12, 15, 20], base: 150, brief: 'Close, closer, closest. Get the near misses.' },
  { id: 'J2', giver: 'juni', title: 'Ribbon Cutter', route: ['S7'], rule: 'count', measure: 'ribbons', ranks: [8, 11, 14, 16], base: 200, brief: 'Cut sixteen ribbons. Through the middle, Juni says.', unlocks: 'outfit-juni' },
  { id: 'J3', giver: 'juni', title: 'The Perfect Shot', route: ['S6'], rule: 'photo3', ranks: [3, 5, 6, 9], base: 250, brief: 'Three photo boxes. Stop in the box, slow, and centred for the perfect shot.', unlocks: 'mirror' },
  { id: 'F', giver: 'all', title: 'Coast 2 Coast', route: null, rule: 'love', ranks: [0, 0, 0, 0], base: 500, brief: 'The whole pyramid, your passenger, and every request. A goal at grade B or better.', unlocks: 'girasole' },
];
OB.GIVERS = {
  bruno: { name: 'Bruno Brezza', line: 'Morning, champ! Let\'s go, the coast is waiting!' },
  marisol: { name: 'Marisol', line: 'Oh, a postcard! Let\'s make it a pretty one!' },
  vivi: { name: 'Vivi', line: 'Darling, this one is beneath us. Do it anyway.' },
  juni: { name: 'Juni', line: 'Okay, I have a shot list, and it is INSANE!' },
  all: { name: 'Bruno and all', line: 'One last road, every one of us, and the sun.' },
};
/** the Tour's order: each giver's postcards in order; the first of each giver is open from the start */
OB.TOUR_ORDER = { bruno: ['B1', 'B2', 'B3', 'B4'], marisol: ['M1', 'M2', 'M3'], vivi: ['V1', 'V2', 'V3'], juni: ['J1', 'J2', 'J3'] };
OB.missionOpen = id => {
  const m = OB.MISSIONS.find(x => x.id === id);
  if (m.id === 'F') return OB.Progress.finaleDone() || (OB.Progress.cleared().length >= 9);
  const order = OB.TOUR_ORDER[m.giver]; const i = order.indexOf(id);
  return i <= 0 || !!(OB.profile.career[order[i - 1]] && OB.profile.career[order[i - 1]].cleared);
};

/** the race setup for a mission: its route, its rules, its pacers and objects (called by the race once) */
OB.Missions = {
  /** build the race hooks for a mission id; the race holds the result */
  setup(id, race) {
    const m = OB.MISSIONS.find(x => x.id === id);
    const rule = Rules[m.rule](m);
    const rng = OB.rand.stream('mission', id);
    const carTop = race.carDef.top;
    if (m.rule === 'sprint') race.clockOverride = rule.clock;
    if (rule.pacers) race.pacers = rule.pacers.map(([pid, lane]) => new Pacer(pid, m.route, lane, carTop));
    if (m.rule === 'collect') {
      rule.objects = spreadObjects(m.route, m.obj === 'balloon' ? 'balloon' : 'gnome', m.count, rng);
      if (m.bees) rule.objects = rule.objects.concat(spreadObjects(m.route, 'bee', m.bees, rng));
    }
    if (m.rule === 'memory') {
      const cols = ['pink', 'blue', 'yellow'], seq = []; for (let i = 0; i < 5; i++) seq.push(cols[Math.floor(rng() * 3)]);
      rule.sequence = seq; rule.objects = [];
      for (let k = 0; k < 5; k++) {
        const z = 2600 + k * 2600;
        const want = seq[k];
        const xs = [-.6, 0, .6];
        const wantAt = Math.floor(rng() * 3);
        for (let j = 0; j < 3; j++) rule.objects.push(OB.Objects.make('gate', z, xs[j], { color: j === wantAt ? want : cols[(cols.indexOf(want) + 1 + j) % 3], want, set: k }));
      }
    }
    if (m.rule === 'photo3') {
      rule.objects = [0, 1, 2].map(i => OB.Objects.make('photo', 1800 + i * 4800, 0, { len: 400 }));
    }
    if (m.rule === 'count' && m.measure === 'ribbons') {
      rule.objects = spreadObjects(m.route, 'ribbon', 16, rng);
    }
    return { m, rule };
  },
};
})();
