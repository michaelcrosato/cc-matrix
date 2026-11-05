// 34-range.js — TRAINING: the CREST range, four short drills that teach every mechanic (Juno instructs).
def('stage', 0, { name: 'CREST RANGE', place: 'CREST HQ, Port Lumen', clock: '—', music: 'range', scenes: ['T-1', 'T-2', 'T-3', 'T-4'], brief: 'brief0' });
def('enemy', 'turretbot', { name: 'Turret Bot', hp: 3, score: 1000, ai: 'peek', exposed: [9, 9], burst: 1, gap: 0, chance: [1, 1, 1], always: true, tel: 1.3, peeks: ['none'], look: { build: 'chibi', size: 1.0, outfit: 'shirt', hat: 'helmet', weapon: 'gun', colors: { cloth: '#8a8f9a', pants: '#555a64', plate: '#c03a3a' } } });
const rangeBuild = b => { b.floor(-200, 420, -110, 110, 0, 'concrete'); b.raw(-200, -110, 0, 420, -100, 60, 'metal', { solid: 1 }); b.raw(-200, 100, 0, 420, 110, 60, 'metal', { solid: 1 }); b.raw(-200, -110, 60, 420, 110, 66, 'metal', { solid: 1 }); b.wall(400, -110, 110, 60, 'steel');
  for (let x = 100; x < 400; x += 60) { b.raw(x, -3, 0, x + 4, 3, 1, 'hazard', { floor: 1 }); b.lamppost(x, -96, 50); b.lamppost(x, 96, 50); }
  for (const y of [-60, 0, 60]) b.raw(150, y - 1, 0, 340, y + 1, 12, 'hazard', { solid: 0 }); b.box(396, 0, 2, 100, 20, 'screen', 24, { glow: 1, edge: false }); };
const rcv = (x, y, w = 24) => ({ x, y, w, h: 16, mat: 'crate', peek: ['up'] });
defScene('T-1', { title: 'AIM & FIRE', stage: 0, time: 90, env: 'range', from: [-150, 0, 24], whip: .5, build: rangeBuild, covers: { a: rcv(170, -50), b: rcv(200, 30), c: rcv(230, -20), d: rcv(260, 60), e: rcv(290, -60), f: rcv(320, 10) },
  waves: [W_at(.5, [['target', 'a'], ['target', 'b'], ['target', 'c'], ['target', 'd'], ['target', 'e'], ['target', 'f']])], cues: [{ at: 0, say: ['juno', 'Welcome to the CREST range, agent! Aim and shoot the cut-outs.'], prompt: 'cover' }, { at: 1, fn: s => { s.emit('prompt', { id: 'cover' }); } }] });
defScene('T-2', { title: 'COVER & RELOAD', stage: 0, time: 90, env: 'range', from: [-150, 0, 24], whip: .5, build: rangeBuild, covers: { a: rcv(180, -40), b: rcv(220, 40), c: rcv(260, -10), d: rcv(240, -70), e: rcv(300, 60), t: { x: 330, y: 0, w: 30, h: 18, mat: 'steel', peek: ['none'], hidden: 1 } },
  waves: [W_at(.5, [['turretbot', 't', {}]]), W_after([['target', 'a'], ['target', 'b'], ['target', 'c'], ['target', 'd'], ['target', 'e'], ['target', 'a'], ['target', 'b'], ['target', 'c'], ['target', 'd'], ['target', 'e'], ['target', 'c']])],
  cues: [{ at: 0, say: ['juno', 'The turret telegraphs every shot. Hold cover when the ring closes!'] }, { on: 'rl', say: ['juno', 'Magazine low? Duck behind cover. You reload in cover!'] }, { at: 14, fn: s => { s.flags.rl = 1; s.emit('prompt', { id: 'reload' }); } }] });
defScene('T-3', { title: 'WEAPONS', stage: 0, time: 120, env: 'range', from: [-150, 0, 24], whip: .5, build: rangeBuild, covers: { a: rcv(190, -40), b: rcv(230, 40), c: rcv(290, 0, 30), t: rcv(300, -60), u: rcv(330, 50) },
  waves: [W_at(.5, [['quartermaster', null, { route: [[380, -90, 0], [380, 90, 0]], drop: 'mg', speed: 36 }]]), W_after([['drone', null, { at: [220, -30, 0], z: 44 }], ['drone', null, { at: [250, 20, 0], z: 52 }], ['drone', null, { at: [240, 60, 0], z: 40 }]]),
    W_after([['quartermaster', null, { route: [[380, -90, 0], [380, 90, 0]], drop: 'sg', speed: 36 }]]), W_after([['shield', 'c', { from: [340, 0, 0], advance: [300, 260] }]]),
    W_after([['quartermaster', null, { route: [[380, -90, 0], [380, 90, 0]], drop: 'gl', speed: 36 }]]), W_after([['grenadier', 'u'], ['target', 't']])],
  objs: [['crate', 340, 20, 0], ['crate', 340, 36, 0], ['crate', 340, 28, 14]],
  cues: [{ at: 0, say: ['juno', 'Orange vest! Shoot him for machine-gun ammo, then switch weapons.'] }, { at: 3, fn: s => { s.emit('prompt', { id: 'switch' }); } }] });
defScene('T-4', { title: 'READ THE CRISIS', stage: 0, time: 90, env: 'range', from: [-150, 0, 24], whip: .5, build: rangeBuild, covers: { a: rcv(180, -40), b: rcv(220, 40), c: rcv(270, -20), d: rcv(250, -70), e: rcv(300, 60), g: rcv(320, 0), h: rcv(340, -50), i: rcv(340, 50) },
  waves: [W_at(.5, [['redtide', 'c']]), W_after([['grenadier', 'g']]), W_after([['target', 'a'], ['target', 'b'], ['target', 'd'], ['target', 'e'], ['target', 'h'], ['target', 'i'], ['target', 'c'], ['target', 'g']])],
  civ: [{ at: 8, route: [[120, 60, 0], [330, 10, 0]], speed: 28 }],
  cues: [{ at: 0, say: ['juno', 'Red Tide never miss! Hit them first, or duck.'] }, { on: 'gr', say: ['juno', 'Grenade! Shoot it out of the air. And never shoot civilians.'] }, { at: 12, fn: s => { s.flags.gr = 1; } }] });
def('brief', 'brief0', { title: 'CREST RANGE', pages: [] });
