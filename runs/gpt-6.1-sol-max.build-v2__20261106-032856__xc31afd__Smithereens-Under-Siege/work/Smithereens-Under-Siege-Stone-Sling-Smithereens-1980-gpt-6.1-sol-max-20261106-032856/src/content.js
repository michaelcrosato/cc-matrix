import { ARENA, clamp } from './config.js';
const specs = [
  {
    name: 'The Village Exhibition',
    short: 'VILLAGE',
    subtitle: 'A most uncivil afternoon',
    mood: 'day',
    stone: '#b5b3a2',
    grass: '#6f8855',
    rows: ['SS.SS.SS', 'SS.SS.SS', 'WW.WW.WW'],
    boast: 'A fine day to lower the neighbourhood!',
    hint: 'Hold, watch the landing diamond, release.',
    music: 0,
  },
  {
    name: 'The Quarry Meet',
    short: 'QUARRY',
    subtitle: 'Mind the load-bearing bits',
    mood: 'desert',
    stone: '#d6bd95',
    grass: '#999262',
    rows: ['.R..R..R', 'SSSSSSSS', 'SSSSSSSS', 'W.WW.W.W'],
    boast: 'My columns have impeccable manners.',
    hint: 'Masonry stones break a support in one hit.',
    music: 1,
  },
  {
    name: 'The High Keep',
    short: 'HIGH KEEP',
    subtitle: 'Lofty ideas. Loose masonry.',
    mood: 'dusk',
    stone: '#a3a6bb',
    grass: '#7b827a',
    rows: [
      'SS..SS.S',
      'SS..SS.S',
      'SS..SS.S',
      'RS..SS.R',
      'WW..WW.W',
      'W....W.W',
    ],
    boast: 'Try not to miss the entire building.',
    hint: 'Split stones fan out at their apex. Finish small pieces with roundstone.',
    music: 2,
  },
  {
    name: 'Lakeside After Dark',
    short: 'LAKESIDE',
    subtitle: 'Torchlight and terrible decisions',
    mood: 'castle-night',
    stone: '#878ca7',
    grass: '#576b70',
    rows: ['SS..SSSS', 'WS..WWSS', 'WW..SSWW', '.W..W.WW', '....W..W'],
    boast: 'A protected return! How terribly sporting.',
    hint: 'Gold shields protect returning crew and launchers.',
    music: 3,
  },
  {
    name: 'The Royal Final',
    short: 'ROYAL FINAL',
    subtitle: 'By appointment to His Rubbleness',
    mood: 'dusk',
    stone: '#c7bdac',
    grass: '#74826a',
    rows: [
      'RR..RRSS',
      'SSSSSSSS',
      'SS.SS.SS',
      'WS.WS.SW',
      'WW.WW.WW',
      'W..WW..W',
    ],
    boast: 'There is only room for one royal ruin.',
    hint: 'Read the surviving silhouette. Every support is an opportunity.',
    music: 4,
  },
];
export const MATERIAL = {
  W: { name: 'timber', hp: 24 },
  S: { name: 'masonry', hp: 38 },
  R: { name: 'reinforced', hp: 72 },
};
export function layout(rows) {
  const b = [],
    w = 19,
    h = 18,
    x0 = 42,
    gap = 1;
  for (let col = 0; col < 8; col++)
    b.push({
      id: b.length,
      x: x0 + col * (w + gap),
      z: ARENA.ground - 9,
      w,
      h: 9,
      material: 'S',
      foundation: true,
      support: [],
    });
  rows.forEach((row, r) =>
    [...row].forEach((m, c) => {
      if (!MATERIAL[m]) return;
      b.push({
        id: b.length,
        x: x0 + c * (w + gap),
        z: ARENA.ground + r * h,
        w,
        h,
        material: m,
        foundation: false,
        support: [],
      });
    }),
  );
  for (const a of b.filter((a) => !a.foundation))
    a.support = b
      .filter(
        (q) =>
          q.id !== a.id &&
          ((Math.abs(q.z + q.h - a.z) < 0.1 && Math.abs(q.x - a.x) < w + 2) ||
            (q.z === a.z && Math.abs(q.x - a.x) <= w + gap + 0.1)),
      )
      .map((q) => q.id);
  return b;
}
export const COURTS = specs.map((c, id) => ({
  ...c,
  id,
  blocks: layout(c.rows),
}));
export const RIVALS = [
  {
    name: 'Sir Crumb',
    title: 'The enthusiastic amateur',
    kind: 'rookie',
    reaction: 2.4,
    error: 0.075,
    harass: 0.15,
    quote: 'I practised on a very small shed.',
  },
  {
    name: 'Dame Pebble',
    title: 'The cheerful nuisance',
    kind: 'harasser',
    reaction: 1.6,
    error: 0.045,
    harass: 0.65,
    quote: 'Your winch looks unusually hittable.',
  },
  {
    name: 'Baron Bedrock',
    title: 'The careful mason',
    kind: 'mason',
    reaction: 1.5,
    error: 0.025,
    harass: 0.12,
    quote: 'A wall is only as good as its bottom.',
  },
  {
    name: 'Lady Clatter',
    title: 'The winch inspector',
    kind: 'harasser',
    reaction: 1.15,
    error: 0.028,
    harass: 0.8,
    quote: 'Do take your time repairing that.',
  },
  {
    name: 'Abbot Rubble',
    title: 'The lofty demolisher',
    kind: 'broad',
    reaction: 1.25,
    error: 0.024,
    harass: 0.08,
    quote: 'Bless this mess.',
  },
  {
    name: 'Count Topple',
    title: 'The patient finisher',
    kind: 'mason',
    reaction: 1.05,
    error: 0.022,
    harass: 0.22,
    quote: 'A smaller target is still a target.',
  },
  {
    name: 'Duchess Aftershock',
    title: 'The night owl',
    kind: 'adaptive',
    reaction: 1,
    error: 0.025,
    harass: 0.55,
    quote: 'Your return is most illuminating.',
  },
  {
    name: 'Sir Plonk',
    title: 'The relentless rumbler',
    kind: 'adaptive',
    reaction: 0.85,
    error: 0.019,
    harass: 0.4,
    quote: 'A moment of peace? Not on my watch.',
  },
  {
    name: 'Queen Quarry',
    title: 'Her Falling Majesty',
    kind: 'final',
    reaction: 0.8,
    error: 0.015,
    harass: 0.35,
    quote: 'I hereby declare your castle optional.',
  },
  {
    name: 'Queen Quarry',
    title: 'The royal rematch',
    kind: 'final',
    reaction: 0.65,
    error: 0.012,
    harass: 0.5,
    quote: 'Once more, with considerably less castle.',
  },
];
export function castleBlocks(court, seat, scale = 1) {
  return court.blocks.map((b) => ({
    ...b,
    x: seat ? ARENA.width - b.x - b.w : b.x,
    support: [...b.support],
    hp: b.foundation ? 0 : MATERIAL[b.material].hp * scale,
    max: b.foundation ? 0 : MATERIAL[b.material].hp * scale,
  }));
}
export function connected(blocks, omit = new Set()) {
  const alive = new Set(
    blocks
      .filter((b) => (b.foundation || b.hp > 0) && !omit.has(b.id))
      .map((b) => b.id),
  );
  const seen = new Set(blocks.filter((b) => b.foundation).map((b) => b.id)),
    queue = [...seen],
    edges = new Map(blocks.map((b) => [b.id, []]));
  for (const b of blocks)
    for (const id of b.support)
      if (edges.has(id)) {
        edges.get(b.id).push(id);
        edges.get(id).push(b.id);
      }
  while (queue.length) {
    for (const id of edges.get(queue.shift()) || [])
      if (alive.has(id) && !seen.has(id)) {
        seen.add(id);
        queue.push(id);
      }
  }
  return seen;
}
export function validateCourt(raw) {
  const errors = [];
  if (
    !raw ||
    raw.version !== 1 ||
    !raw.court ||
    !Array.isArray(raw.court.blocks)
  )
    return { ok: false, errors: ['Expected a version 1 court definition.'] };
  const c = raw.court,
    b = c.blocks,
    ids = new Set();
  if (b.length < 2 || b.length > 70) errors.push('Use 2–70 blocks.');
  for (const a of b) {
    if (!Number.isInteger(a.id) || ids.has(a.id))
      errors.push('Block IDs must be unique integers.');
    ids.add(a.id);
    if (
      ![a.x, a.z, a.w, a.h].every(Number.isFinite) ||
      a.x < 20 ||
      a.x + a.w > 205 ||
      a.z < 20 ||
      a.z + a.h > 180 ||
      a.w < 6 ||
      a.w > 60 ||
      a.h < 5 ||
      a.h > 40
    )
      errors.push('Block dimensions outside the castle stage.');
    if (
      !MATERIAL[a.material] ||
      !Array.isArray(a.support) ||
      typeof a.foundation !== 'boolean'
    )
      errors.push('Invalid material, foundation or support role.');
  }
  for (const a of b)
    if (
      Array.isArray(a.support) &&
      a.support.some((id) => !ids.has(id) || id === a.id)
    )
      errors.push('Support references must name another block.');
  if (!b.some((a) => a.foundation) || !b.some((a) => !a.foundation))
    errors.push('A court needs a foundation and objective blocks.');
  if (!errors.length) {
    const con = connected(b.map((a) => ({ ...a, hp: 1 })));
    if (b.some((a) => !a.foundation && !con.has(a.id)))
      errors.push('An objective block is not connected to a foundation.');
  }
  return {
    ok: !errors.length,
    errors: [...new Set(errors)],
    court: errors.length
      ? null
      : { ...COURTS[0], ...c, id: clamp(Number(c.id) || 0, 0, 4) },
  };
}
export function exportCourt(court) {
  return JSON.stringify(
    {
      version: 1,
      court: { ...court, blocks: court.blocks.map((b) => ({ ...b })) },
    },
    null,
    2,
  );
}
