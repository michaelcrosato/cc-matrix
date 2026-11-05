// 34-range: TRAINING, the CREST RANGE. Juno instructs four drills that teach every mechanic: R-1 AIM & FIRE (pop-up
// cut-outs), R-2 COVER & RELOAD (the turret robot telegraphs three shots; reload in cover), R-3 WEAPONS (an orange
// vest's ammo, drones for the machine gun, a shield for the shotgun, a crate stack for the grenade launcher), R-4 READ
// THE CRISIS (a Red Tide cut-out, a grenade to shoot down, a civilian cut-out, then 8 targets against the clock).

const RG = F(0, 0, 0, 0), slR = RG.slots({ gap: 22 });
def('stage', 'R', { name: 'CREST RANGE', place: 'CREST HQ, sublevel 2', clock: '--:--', music: 'range', amb: 'range',
  env: { sky: { stops: ['#14161c', '#1a1d24', '#20242c'], stars: false }, fog: ['#1a1d24', 500, 1400], ambient: .55, ambientColor: '#e0e4f0', sun: { dir: [0, 0, 1], color: '#ffffff', k: .35 } },
  build(G) {
    G.push(RG.x, RG.y, RG.z, RG.yaw);
    G.box(-60, -160, -2, 460, 160, 0, 'concrete', { surf: 'concrete' });
    G.box(-60, -162, 0, 460, -160, 110, 'rangewall'); G.box(-60, 160, 0, 460, 162, 110, 'rangewall'); G.box(458, -160, 0, 460, 160, 110, 'rangewall'); G.box(-62, -160, 0, -60, 160, 110, 'rangewall');
    G.box(-60, -160, 110, 460, 160, 112, 'steel', { collide: false, bottom: true });
    for (const l of [-90, -30, 30, 90]) G.box(40, l - 2, 0, 400, l + 2, 12, 'concrete-dark', { surf: 'concrete' });
    for (let d = 40; d < 460; d += 60) { G.box(d, -150, 104, d + 30, 150, 108, 'lamp', { collide: false }); G.light(d + 15, 0, 100, 220, .5, '#f0f4ff'); }
    for (const [d, l] of [[340, -120], [340, 0], [340, 120]]) G.box(d - 6, l - 20, 0, d + 6, l + 20, 26, 'plywood', { surf: 'wood' });
    G.box(456, -60, 30, 457.5, 60, 60, 'screen-teal', { collide: false });
    G.pop();
    PF.slotProp(G, slR[0], 'sandbags'); PF.slotProp(G, slR[1], 'sandbags');
  },
  scenes: ['R-1', 'R-2', 'R-3', 'R-4'] });
const rc = (d, l) => RG.p(d, l, 0);
const cut = (d, l, o = {}) => ['cutout', null, Object.assign({ at: rc(d, l), entry: 'stand', stay: 1 }, o)];
def('scene', 'R-1', { title: 'AIM & FIRE', time: 60,
  slots: slR, covers: {},
  waves: [{ at: .5, spawn: [cut(140, -60), cut(180, 20), cut(220, -100), cut(260, 60), cut(300, -20), cut(240, 110)] }],
  cues: [{ at: 0, say: ['juno', 'Welcome to the range, agent. Shoot every cut-out.'] }, { at: 0, prompt: 'aim' }, { on: 'clear', say: ['juno', 'Nice grouping! Next: cover.'] }] });
def('scene', 'R-2', { title: 'COVER & RELOAD', time: 60,
  slots: slR, covers: {},
  waves: [{ at: .5, spawn: [['turret', null, { at: rc(300, 0), entry: 'stand', shots: 3, target: 0 }]] }, { after: 'clear', spawn: [cut(160, -40), cut(200, 40), cut(240, -80), cut(260, 80)] }],
  enter: sim => { sim.flags.reloadsAt = sim.players[0].stats.saves; },
  cues: [{ at: 0, say: ['juno', 'That turret telegraphs every shot. Red ring means DUCK.'] }, { at: 0, prompt: 'cover' }, { at: 8, prompt: 'reload' }, { at: 8, say: ['juno', 'Empty the magazine, then reload in cover.'] }],
  objective: sim => { const t = sim.enemies.find(e => e.type === 'turret'); return !t || t.done; },
  step(sim) { const t = sim.enemies.find(e => e.type === 'turret'); if (t && t.done && !t.gone) { t.gone = true; sim.say('juno', 'Cover works! Now the targets.'); } } });
def('scene', 'R-3', { title: 'WEAPONS', time: 75,
  slots: slR, covers: covers(RG, { s1: [330, 0, 26, ['up']] }),
  waves: [
    { at: .5, spawn: [['quartermaster', null, { route: [rc(250, -150), rc(250, 150)], drop: 'mg', speed: 45, noFire: true }]], say: ['juno', 'Orange vest! Drop him for machine-gun ammo.'] },
    { after: 'clear', spawn: [0, 1, 2].map(k => ['drone', null, { at: RG.p(220 + k * 30, -40 + k * 40, 50), noFire: true }]), say: ['juno', 'Switch to the machine gun and shred those drones.'] },
    { after: 'clear', spawn: [['shield', null, { route: [rc(360, 0), rc(300, 0)], noFire: true }]], say: ['juno', 'Shield! Shotgun knocks it aside.'], id: 'sh' },
    { after: 'sh', spawn: [cut(400, -36), cut(410, 36), ['marine', 's1', { entry: 'stand', noFire: true }]], say: ['juno', 'Grenade launcher on the crates—boom.'] } ],
  objects: [['crate', rc(330, -60), { size: [16, 16, 16] }], ['crate', rc(330, 60), { size: [16, 16, 16] }]],
  cues: [{ at: 0, prompt: 'switch' }, { on: 'spawn:shield', fn: sim => { for (const p of sim.players) sim.giveAmmo(p, 'sg', 8); } }],
  step(sim) { const w = sim.waves.find(x => x.id === 'sh'); if (w && w.fired && !sim.flags.glGiven && sim.enemies.filter(e => !e.dead && e.type === 'shield').length === 0) { sim.flags.glGiven = true; for (const p of sim.players) sim.giveAmmo(p, 'gl', 2); } } });
def('scene', 'R-4', { title: 'READ THE CRISIS', time: 40,
  slots: slR, covers: covers(RG, { r1: [300, -120, 26, ['up']], r2: [300, 120, 26, ['up']] }),
  waves: [
    { at: .5, spawn: [['redtide', 'r1', { entry: 'stand' }]], say: ['juno', "Red Tide never misses. Kill him first—or duck!"] },
    { after: 'clear', spawn: [['grenadier', 'r2', { entry: 'stand' }]], say: ['juno', 'Grenade! Shoot it out of the air!'] },
    { after: 'clear', spawn: [cut(200, 0, { civ: true, noClear: true, look: 0 }), cut(180, -70), cut(220, 70)], say: ['juno', "The blue one's a civilian. DON'T shoot it."] },
    { after: 'clear', id: 'timed', spawn: [cut(140, -100, { stay: 0 }), cut(170, 0, { stay: 0 }), cut(200, 100, { stay: 0 }), cut(230, -50, { stay: 0 }), cut(260, 50, { stay: 0 }), cut(290, -110, { stay: 0 }), cut(320, 0, { stay: 0 }), cut(350, 110, { stay: 0 })], say: ['juno', 'Final drill: eight targets. Beat the clock!'] } ],
  cues: [{ on: 'clear', say: ['juno', "Training complete! You're ready, agent."] }],
  step(sim) { const w = sim.waves.find(x => x.id === 'timed'); if (w && w.fired && !sim.flags.timedT) { sim.flags.timedT = true; sim.timer = 20 * sim.diff.timeMul; sim.timeMax = sim.timer; } } });
