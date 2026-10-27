// ---------------------------------------------------------------- Rail path, stage data (designer-facing), dialogue database
class Rail {
  constructor(ctrl) {
    const curve = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => V3(x, 0, z)), false, 'centripetal');
    this.len = curve.getLength(); const n = this.n = Math.ceil(this.len); this.p = []; this.f = [];
    for (let i = 0; i <= n; i++) { const u = Math.min(1, i / n), p = curve.getPointAt(u), t = curve.getTangentAt(u); t.y = 0; t.normalize(); this.p.push(p); this.f.push(t); }
  }
  frame(s) {
    const n = this.n; if (s <= 0) { const f = this.f[0]; return [this.p[0].clone().addScaledVector(f, s), f]; }
    if (s >= n) { const f = this.f[n]; return [this.p[n].clone().addScaledVector(f, s - n), f]; }
    const i = Math.floor(s), t = s - i, a = this.p[i], b = this.p[i + 1], fa = this.f[i], fb = this.f[i + 1];
    return [a.clone().lerp(b, t), fa.clone().lerp(fb, t).normalize()];
  }
  toWorld(s, x, y, out = V3()) { const [p, f] = this.frame(s); return out.set(p.x - f.z * x, y, p.z + f.x * x); }
  heading(s) { const [, f] = this.frame(s); return Math.atan2(-f.x, -f.z); }
  fwd(s) { return this.frame(s)[1]; }
  right(s) { const f = this.frame(s)[1]; return V3(-f.z, 0, f.x); }
}
// per-stage lateral bounds (interpolated)
function boundsAt(st, s) {
  const b = st.bounds; if (s <= b[0].s) return b[0].bx; for (let i = 1; i < b.length; i++) if (s <= b[i].s) return lerp(b[i - 1].bx, b[i].bx, (s - b[i - 1].s) / (b[i].s - b[i - 1].s)); return b[b.length - 1].bx;
}

// ---- Stage 1 event script. s = trigger/placement distance along the rail. t: spawn | comm | hint | boss | banner | obst | pickup
function catnipEvents() {
  const ev = []; const E = (s, t, o = {}) => ev.push(Object.assign({ s, t }, o));
  const sp = (s, type, x, y, o = {}) => E(s, 'spawn', Object.assign({ type, x, y }, o));
  const pk = (s, kind, x, y) => E(s, 'pickup', { kind, x, y });
  const ob = (s, kind, x, o = {}) => E(s, 'obst', Object.assign({ kind, x }, o));
  const ringRow = (s, n, x0, y0, dx, dy, gap = 14) => { for (let i = 0; i < n; i++) pk(s + i * gap, 'ring', x0 + dx * i, y0 + dy * i); };
  const vee = (s, n, cx, cy, spread = 6, o = {}) => { for (let i = 0; i < n; i++) { const k = i - (n - 1) / 2; sp(s + Math.abs(k) * 14, 'drone', cx + k * spread, cy + Math.abs(k) * 1.2, Object.assign({ amp: 3, phase: i }, o)); } };
  // opening
  E(8, 'banner', { text: 'STAGE 1  ·  CATNIP COAST' }); E(18, 'comm', { id: 'intro' });
  E(120, 'hint', { id: 'move' }); E(210, 'hint', { id: 'fire' });
  sp(250, 'drone', -10, 7, { amp: 2 }); sp(264, 'drone', 0, 9, { amp: 2 }); sp(278, 'drone', 10, 7, { amp: 2 });
  E(300, 'comm', { id: 'bogeys' });
  vee(340, 5, 0, 8); ringRow(380, 5, -16, 4, 8, 1.2, 16);
  ob(520, 'pillar', -9, { h: 24 }); ob(560, 'pillar', 10, { h: 24 }); ob(600, 'pillar', -3, { h: 24 }); E(500, 'hint', { id: 'bank' });
  sp(640, 'turret', -14, 0); sp(640, 'turret', 14, 0); sp(680, 'turret', 0, 0); E(655, 'comm', { id: 'roll' }); E(665, 'hint', { id: 'roll' });
  vee(760, 5, -12, 10, 5, { pat: 'strafe' }); vee(800, 5, 12, 6, 5, { pat: 'strafe' });
  E(900, 'hint', { id: 'lock' }); E(905, 'comm', { id: 'lock' });
  for (let i = 0; i < 6; i++) sp(930 + (i % 3) * 6, 'drone', -16 + i * 6.4, 5 + (i % 2) * 5, { amp: 1.5, slow: true });
  pk(990, 'bomb', 0, 7); ringRow(1010, 4, 8, 5, -5, 2, 14);
  sp(1100, 'walker', -8, 0); E(1085, 'comm', { id: 'walker' }); E(1110, 'hint', { id: 'bomb' });
  vee(1190, 7, 0, 9, 5, { pat: 'loop' }); pk(1240, 'laser', 0, 8);
  E(1290, 'comm', { id: 'pip_help' }); E(1300, 'chase', { n: 3 });
  ringRow(1500, 6, -18, 3, 7, 1, 12);
  // canyon (bounds narrow 1560..3000)
  E(1560, 'banner', { text: 'CANYON RUN' }); E(1570, 'comm', { id: 'canyon' });
  for (let i = 0; i < 10; i++) { const s = 1650 + i * 90; ob(s, i % 3 === 0 ? 'archHigh' : i % 3 === 1 ? 'archLow' : 'pillarPair', 0); if (i % 2) sp(s + 40, 'turret', (i % 4 === 1 ? -9 : 9), 0); }
  vee(1700, 4, 0, 8, 5); sp(1890, 'walker', 6, 0); vee(2050, 5, 0, 10, 4, { pat: 'strafe' });
  for (let i = 0; i < 4; i++) sp(2200 + i * 20, 'drone', -8 + i * 5.4, 8 + (i % 2) * 3, { amp: 2 });
  pk(2150, 'repair', 0, 6); sp(2330, 'walker', -6, 0); sp(2330, 'walker', 6, 0);
  vee(2520, 5, 0, 8, 5, { pat: 'loop' }); pk(2700, 'ring', 0, 6); pk(2714, 'ring', 0, 8); pk(2728, 'ring', 0, 10); pk(2742, 'gold', 0, 12);
  for (let i = 0; i < 5; i++) sp(2780 + i * 22, 'drone', (i % 2 ? 8 : -8), 9, { amp: 4 });
  // carrier battle
  E(3080, 'banner', { text: 'GNARL CARRIER' }); E(3085, 'comm', { id: 'carrier' }); sp(3180, 'carrier', 0, 14);
  vee(3290, 5, 0, 8, 6); vee(3380, 5, 0, 10, 6, { pat: 'strafe' }); pk(3320, 'bomb', -12, 6); ringRow(3400, 4, -10, 4, 6, 1, 14);
  // doghouse town
  E(3700, 'comm', { id: 'town' }); for (let i = 0; i < 5; i++) sp(3730 + i * 55, 'turret', ((i * 7) % 3 - 1) * 12, 0);
  sp(3800, 'walker', -10, 0); sp(3950, 'walker', 10, 0); vee(3870, 5, 0, 10, 5, { pat: 'loop' }); pk(4120, 'life', 0, 8); vee(4180, 6, 0, 8, 5);
  for (let i = 0; i < 3; i++) sp(4280 + i * 40, 'carrier', (i - 1) * 12, 15, { mini: true });
  pk(4260, 'repair', 8, 6);
  // factory
  E(4560, 'banner', { text: 'KIBBLE WORKS' }); E(4570, 'comm', { id: 'factory' });
  for (let i = 0; i < 9; i++) { const s = 4640 + i * 70; ob(s, i % 2 ? 'beamHigh' : 'beamLow', 0); sp(s + 30, 'turret', i % 2 ? -12 : 12, 0); }
  vee(4700, 5, 0, 12, 5, { pat: 'strafe' }); sp(4900, 'walker', 0, 0); vee(5060, 7, 0, 9, 5, { pat: 'loop' }); sp(5180, 'walker', -10, 0); sp(5180, 'walker', 10, 0);
  pk(5260, 'repair', 0, 6); pk(5290, 'bomb', 8, 8); ringRow(5330, 4, -6, 5, 4, 1, 14);
  for (let i = 0; i < 6; i++) sp(5400 + i * 18, 'drone', (i % 2 ? 10 : -10), 8 + i, { amp: 5 });
  E(5560, 'comm', { id: 'prep_boss' }); pk(5600, 'repair', 0, 6); pk(5620, 'bomb', 6, 8);
  E(5700, 'boss', {});
  return ev.sort((a, b) => a.s - b.s);
}
const STAGES = {
  catnip: {
    id: 'catnip', name: 'Catnip Coast', sub: 'Planet Meowtia · Rail Mission', kind: 'rail', music: 'stage1', speed: 46, length: 6400, bossS: 5700,
    path: [[0, 0], [0, -700], [140, -1400], [220, -2100], [120, -2900], [-90, -3600], [-140, -4300], [-40, -5100], [60, -5800], [60, -6700], [60, -7400]],
    bounds: [{ s: 0, bx: 20 }, { s: 1500, bx: 20 }, { s: 1600, bx: 12 }, { s: 3000, bx: 12 }, { s: 3100, bx: 20 }, { s: 99999, bx: 20 }],
    zones: [[0, 1500, 'coast'], [1500, 3050, 'canyon'], [3050, 4550, 'coast'], [4550, 99999, 'factory']],
    palette: { top: 0x3f97ff, hor: 0xffe9c4, bot: 0x9bc79a, sun: 0xfff2b0, sunDir: [0.35, 0.55, -0.75], fog: 0xffe9c4, fogNear: 150, fogFar: 720, hemiSky: 0xe6f4ff, hemiGround: 0x7bbd7a, hemiI: 1.1, sunI: 2.3, ga: 0x69cf6e, gb: 0x56bd8c },
    medalAt: 0.7, events: null,
    brief: [['biscuit', "Star Paw Squadron! General Gnarl and his mutt militia have seized the Catnip Coast Kibble Works!"], ['hop', "We'll fly in low, clear the coast and canyon, and take down his walking doghouse, Gnarlbot Mk-IV."], ['pip', "I'll keep the engines purring! Try not to scratch the paint, okay?"]],
  },
  belt: {
    id: 'belt', name: 'Dread Belt', sub: 'Pawlon Asteroid Field · All-Range Mission', kind: 'allrange', music: 'allrange', speed: 55, bossS: 0, medalAt: 0.8, quota: 18,
    palette: { top: 0x05020f, hor: 0x2e1566, bot: 0x120a2e, sun: 0xffd0f0, sunDir: [-0.5, 0.3, -0.8], fog: 0x24104e, fogNear: 260, fogFar: 1500, hemiSky: 0xa9b4ff, hemiGround: 0x4a3a7a, hemiI: 1.2, sunI: 2.4 },
    brief: [['biscuit', "Gnarl's fighter wing is regrouping in the Dread Belt. This is all-range combat, so fly anywhere you like!"], ['rook', "Watch for Night Claw Squadron. The black ship with the orange stripe? That's their boss."], ['hop', "Use boost and pull down for a U-turn to shake anyone on your tail. Good hunting!"]],
  },
};
STAGES.catnip.events = catnipEvents();
STAGES.catnip.totalEnemies = STAGES.catnip.events.filter((e) => e.t === 'spawn').length + 14;
const STAGE_ORDER = ['catnip', 'belt'];

// ---- dialogue (Starfox-64-style radio chatter). who -> portrait + name
const WHO = { hop: { name: 'HOP', c: '#e8e8d8', c2: '#4cc36b' }, pip: { name: 'PIP', c: '#9be15a', c2: '#ffd33d' }, rook: { name: 'ROOK', c: '#3b3350', c2: '#b35cff' }, biscuit: { name: 'GEN. BISCUIT', c: '#d9a066', c2: '#fff0d0' }, gnarl: { name: 'GEN. GNARL', c: '#8a7a68', c2: '#ff4a2a' }, claw: { name: 'NIGHT CLAW', c: '#2a2236', c2: '#ffb000' }, hero: { name: 'MARM', c: '#ff9a3a', c2: '#fff0d0' } };
const COMMS = {
  intro: [['biscuit', 'Star Paw Squadron, you are cleared for launch! The Pawlon System is counting on you!'], ['hop', "All wings report in! Stay on my tail, Marm. You're the cat's whiskers out there!"], ['pip', 'Pip here! All systems nominal. Mostly. Okay, a little squeaky.'], ['rook', 'Rook ready. Try to keep up, rookies.']],
  bogeys: [['hop', 'Bogeys ahead! Light them up, kid!']],
  roll: [['hop', 'Enemy fire incoming! Do a barrel roll! Tap L1 or R1 to bounce those shots right back!']],
  lock: [['pip', 'Hold the charge button to lock onto many targets, then let go and watch the fur fly!']],
  walker: [['rook', "Big dog on the ground. Aim for the head, it can't take much!"]],
  pip_help: [['pip', "Help! They're all over me! Somebody get these mutts off my tail!"], ['hop', "Hang on, Pip! Marm, shoot those fighters off him!"]],
  pip_saved: [['pip', "Whew! You're the cat's meow, Marm! Thanks a million!"]],
  pip_lost: [['pip', "I'm hit! Falling back to base... good luck, everybody!"], ['hop', 'Pip, no! Stay sharp, team.']],
  canyon: [['hop', 'Narrow canyon ahead! Watch those arches and stay in the middle!'], ['rook', 'Fly under, fly over, just do not fly into.']],
  carrier: [['biscuit', "That's a Gnarl Carrier! It launches fighters, so take down the escorts and then pound the hull!"]],
  town: [['pip', 'Aw, look at those little doghouses. Wait, they are shooting at us!'], ['rook', 'Doghouses with turrets. Typical Gnarl.']],
  factory: [['rook', 'Smells like cheap kibble down there.'], ['hop', 'The Kibble Works. Gnarlbot is parked right behind it. Almost there!']],
  prep_boss: [['hop', 'Big readings ahead! Grab those supplies and get ready!']],
  boss_intro: [['gnarl', "Hah hah hah! You'll make a fine chew toy, little kitten!"], ['hop', "That's Gnarlbot Mk-IV! Shoot the shoulder cannons first!"]],
  boss_cannons: [['hop', "Cannons down! The mouth is opening, hit the core inside!"], ['pip', "Aim for the glowing thing! It's the... glowing thing!"]],
  boss_half: [['gnarl', 'RRRUFF! Nobody calls me a poodle!'], ['rook', 'Nobody did. Keep shooting!']],
  boss_beam: [['pip', "Watch out for the red lines! That's a laser curtain, get out of its lane!"]],
  boss_dead: [['gnarl', 'Impossible! I was top dog!'], ['hop', 'Nice flying, Marm! That mutt is toast!'], ['rook', 'Not bad for a house cat.']],
  clear1: [['biscuit', 'Excellent work, Star Paw! But Gnarl is not done. Head to the Dread Belt!']],
  ar_intro: [['hop', "All-range mode! Fly anywhere you like, but don't leave the battle zone."], ['pip', 'Fighters inbound! There are so many of them!']],
  ar_tail: [['rook', "You've got someone on your six! Hold boost and pull down for a U-turn!"]],
  ar_boost: [['hop', 'Pull up with boost held for a loop. It makes the mutts overshoot!']],
  ar_half: [['biscuit', 'Fighter wing is thinning out. Keep it up, Star Paw!']],
  claw_intro: [['claw', 'Well, well. A fresh little kitten. Night Claw Squadron does not take prisoners.'], ['rook', 'Not him again... Marm, he is fast. Use lock-on bursts!']],
  claw_half: [['claw', 'Not bad, kitten. But I am just warming up.']],
  claw_low: [['claw', 'You scratch well... but not well enough! Come on, boys!'], ['pip', 'More fighters! I mean, I can handle it. Probably.']],
  claw_dead: [['claw', 'Impossible... I will be back, kitten!'], ['hop', 'He is gone! The Dread Belt is clear!']],
  pip_ar: [['pip', 'Somebody help! One of them is glued to my tail!']],
  clear2: [['biscuit', 'Mission accomplished! The Pawlon System is safe... for now. Return to base!'], ['hop', 'Good flying, Star Paw. Every last one of you.']],
  bye_ar: [['rook', 'Hey! Stay in the arena or I will leave you behind!']],
};
const ADVICE = {
  rail: ['Barrel roll with L1 or R1 to bounce enemy shots back at them.', 'Hold the charge button to lock on to multiple targets.', 'Silver rings repair your ship. Gold rings raise your max health!', 'The nova bomb clears the screen. Save it for the big ones.', 'Boost with R2 to catch up, brake with L2 to line up a shot.'],
  boss: ['Shoot the shoulder cannons first! Then the mouth opens.', 'Dodge the red laser curtains by moving to the other side.', 'Nova bombs hurt the core a lot when the mouth is open.'],
  ar: ['Hold boost and pull down for a U-turn. Up for a loop!', 'Lock on with the charge button to catch fast fighters.', 'Stay inside the arena or your wing will turn you around.', 'Night Claw is quick. Charged lock-on bursts are your best bet.'],
};
