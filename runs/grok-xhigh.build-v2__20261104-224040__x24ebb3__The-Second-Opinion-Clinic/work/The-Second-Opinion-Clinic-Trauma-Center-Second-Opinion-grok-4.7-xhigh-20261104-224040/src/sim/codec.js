/** Fixed-point snapshots. Unreliable packs stay under 1,100 bytes. Keyframes stay under 16 KB. */

const KINDS = ['pool', 'hook', 'prop', 'magnet', 'debris', 'core', 'stalk', 'extraction', 'organ', 'fragment', 'clamp', 'unclamp', 'tether', 'incision', 'pore', 'tumor', 'wound', 'bleeder', 'polyp', 'egg', 'eye', 'cyst', 'gel', 'sob', 'film', 'dressing', 'ring', 'plate', 'droplet', 'nick'];
const TOOLS = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner', 'dressing'];

function kindId(kind) {
  const i = KINDS.indexOf(kind);
  return i < 0 ? 0 : i;
}

function packEntity(e) {
  let gel = 0;
  if (e.cells) {
    const n = Math.min(24, e.cells.length);
    for (let i = 0; i < n; i++) if (e.cells[i].on) gel |= 1 << i;
  }
  return [
    String(e.id).slice(0, 12),
    kindId(e.kind),
    Math.round(e.x * 20),
    Math.round(e.z * 20),
    e.done ? 1 : 0,
    Math.round((e.r || 0) * 20),
    Math.round((e.pulled || 0) * 20),
    e.phase === 'lift' ? 1 : e.phase === 'burn' ? 2 : e.phase === 'sob' ? 3 : 0,
    Math.round((e.ang || 0)),
    e.hidden ? 1 : 0,
    gel,
  ];
}

export function encodeFast(sim) {
  const open = [];
  const rest = [];
  for (const e of sim.entities) {
    if (e.kind === 'nick') continue;
    if (e.done) rest.push(e);
    else open.push(e);
  }
  const chosen = open.concat(rest).slice(0, 28);
  return {
    k: 0,
    p: sim.phase === 'codeblue' ? 1 : sim.phase === 'massage' ? 2 : sim.phase === 'won' ? 3 : sim.phase === 'lost' ? 4 : 0,
    s: sim.stageIndex,
    t: Math.round(sim.timeLeft * 10),
    c: sim.score,
    m: sim.mistakes,
    d: sim.doses,
    v: sim.tables.map((t) => Math.round(t.vitals)),
    u: sim.seats.map((s) => [Math.round(s.x * 20), Math.round(s.z * 20), Math.max(0, TOOLS.indexOf(s.tool))]),
    e: chosen.map(packEntity),
    f: sim.flags.strainDead ? 1 : 0,
  };
}

export function encodeKey(sim) {
  const body = encodeFast(sim);
  body.k = 1;
  body.bpm = Math.round(sim.bpm);
  body.lie = sim.lie ? 1 : 0;
  body.pain = Math.round(sim.pain);
  body.comp = Math.round(sim.composure);
  body.streak = sim.streak;
  body.e = sim.entities.filter((e) => e.kind !== 'nick').slice(0, 48).map(packEntity);
  return body;
}

export function decodeState(data) {
  const ents = (data.e || []).map((row) => ({
    id: row[0],
    kind: KINDS[row[1]] || 'pool',
    x: row[2] / 20,
    z: row[3] / 20,
    done: !!row[4],
    r: row[5] / 20,
    pulled: row[6] / 20,
    phase: row[7] === 1 ? 'lift' : row[7] === 2 ? 'burn' : row[7] === 3 ? 'sob' : 'cut',
    ang: row[8] || 0,
    hidden: !!row[9],
    gel: row[10] || 0,
  }));
  return {
    phase: ['play', 'codeblue', 'massage', 'won', 'lost'][data.p] || 'play',
    stageIndex: data.s,
    timeLeft: data.t / 10,
    score: data.c,
    mistakes: data.m,
    doses: data.d,
    vitals: data.v || [],
    seats: (data.u || []).map((s) => ({ x: s[0] / 20, z: s[1] / 20, tool: TOOLS[s[2]] || 'forceps' })),
    entities: ents,
    strainDead: !!data.f,
  };
}

export function applyDecoded(sim, data) {
  const view = decodeState(data);
  const byId = new Map(view.entities.map((e) => [e.id, e]));
  for (const e of sim.entities) {
    const n = byId.get(String(e.id).slice(0, 12));
    if (!n) continue;
    e.x = n.x;
    e.z = n.z;
    e.done = n.done;
    e.r = n.r;
    e.pulled = n.pulled;
    e.hidden = n.hidden;
  }
  sim.stageIndex = view.stageIndex;
  sim.timeLeft = view.timeLeft;
  sim.score = view.score;
  sim.mistakes = view.mistakes;
  sim.doses = view.doses;
  sim.tables.forEach((t, i) => {
    if (view.vitals[i] != null) t.vitals = view.vitals[i];
  });
  return view;
}

export function byteSize(data) {
  return JSON.stringify(data).length;
}

export function snapshotOf(sim) {
  const fast = encodeFast(sim);
  const key = encodeKey(sim);
  return { fast, key, fastBytes: byteSize(fast), keyBytes: byteSize(key) };
}
