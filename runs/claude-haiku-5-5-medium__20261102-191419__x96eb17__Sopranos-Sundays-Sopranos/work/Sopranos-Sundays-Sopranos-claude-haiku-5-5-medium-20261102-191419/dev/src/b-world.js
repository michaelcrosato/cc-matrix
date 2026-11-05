/* ============================================================================
 * SOPRANOS SUNDAYS  (src/b-world.js)  the town, the people, the crew, the fights,
 * the objectives. One world object (G) is made per game; scenes read and change it.
 * ========================================================================== */
let MAP = null;          // the town (a TileMap, built once: its layout never changes)
let G = null;            // the running world: hero, foes, pickups, story, timers
const SPR = {
  cash: E.sprite(['.gggg.', 'gGGGGg', 'gGgGGg', 'gGGGGg', '.gggg.'], { g: '#2f6b2f', G: '#8fd08a' }, 2),
  ammo: E.sprite(['.yy.', '.yy.', 'yYYy', 'yYYy'], { y: '#8a7a3a', Y: '#e8d890' }, 2),
  meatball: E.sprite(['..bb..', '.bBBb.', 'bBBBBb', '.bBBb.', '..bb..'], { b: '#6a2e18', B: '#b0583a' }, 2)
};

// the town: a 46 x 30 grid painted in code, then handed to a TileMap
function ssTownRows() {
  const Wd = 46, Ht = 30, g = Array.from({ length: Ht }, () => Array(Wd).fill('_'));
  const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = c; };
  const put = (x, y, c) => { g[y][x] = c; };
  rect(0, 12, Wd, 4, '.');                         // Avenue of the Americas (street)
  rect(22, 0, 4, Ht, '.');                         // Vine Street, north to south
  rect(2, 2, 10, 7, '#');                          // Pork Palace (Lenny)
  rect(16, 2, 10, 7, 'H');                         // Bella Notte diner (Gino)
  rect(32, 2, 12, 7, 'N');                         // Lucky Lanes bowling (Pinky)
  rect(14, 20, 14, 7, '#');                        // the garage on Vine Street (Frankie's crew)
  rect(2, 20, 9, 7, 'H');                          // Dr. Marchetti's office
  rect(33, 18, 11, 7, 'H');                        // the Deluca house
  rect(31, 25, 14, 5, 'g');                        // the yard, with the pool
  rect(35, 26, 6, 3, '~');
  rect(8, 14, 2, 1, 'C'); rect(28, 13, 2, 1, 'C'); rect(17, 15, 2, 1, 'C');   // parked cars
  [[8, 16], [12, 17], [40, 12], [44, 22], [5, 27], [29, 4]].forEach(([x, y]) => put(x, y, 'T'));
  put(6, 10, 'L'); put(21, 10, 'G'); put(38, 10, 'P');        // the shopkeepers, on the sidewalk
  put(6, 28, 'D'); put(37, 16, 'R'); put(42, 27, 'F');       // the doctor, Mama Ricca, Frankie at the pool
  put(10, 27, 'x'); put(18, 28, 'x'); put(28, 28, 'x'); put(30, 27, 'x');   // the garage crew
  put(4, 17, 'z'); put(40, 15, 'z'); put(26, 6, 'z');        // Vine Street punks
  put(23, 13, '@');                                        // where Nunzio starts
  put(19, 13, 'o'); put(30, 15, 'o'); put(6, 15, 'a'); put(27, 10, 'a'); put(44, 9, '$'); put(12, 23, '$');
  return g.map(r => r.join(''));
}
function ssBuildMap() {
  return new E.TileMap({
    rows: ssTownRows(),
    legend: { '#': 1, 'H': 2, 'N': 3, 'T': 4, 'C': 5, '_': { floor: 'sidewalk' }, 'g': { floor: 'grass' }, '~': { floor: 'water', block: true },
      '@': 'hero', L: 'lenny', G: 'gino', P: 'pinky', D: 'doc', R: 'ricca', F: 'frankie', x: 'crew', z: 'thug', o: 'meatball', a: 'ammo', '$': 'cash' },
    types: {
      1: { h: 40, top: '#6a4030', side: '#3e2216', face: 'brick', roof: 'plain' },
      2: { h: 34, top: '#e6dccb', side: '#a79c86', face: 'none', roof: 'plain' },
      3: { h: 46, top: '#7a1450', side: '#360a24', face: 'none', roof: 'plain' },
      4: { h: 24, top: '#2e6a34', side: '#1b4020', face: 'none', roof: 'speckle' },
      5: { h: 8, top: '#8c2222', side: '#4a1212', face: 'none', roof: 'plain', cut: true }
    },
    floorTex: (x, y, tag) => tag === 'water' ? E.tex.water(x, y) : tag === 'grass' ? E.tex.grass(x, y) : tag === 'sidewalk' ? E.tex.plain(x, y, { base: '#5e5866' }) : E.tex.plain(x, y, { base: '#34323c' })
  });
}

// a Humanoid for a person or a crew member, dressed from SS_PEOPLE
function ssRig(key, size = 1.3, extra = {}) {
  const p = SS_PEOPLE[key];
  return new E.Humanoid(Object.assign({ size, outfit: p.outfit, hair: p.hair, colors: p.colors, build: p.build || 'heroic', sleeves: 'long' }, extra));
}

// the story's vars: every value the game keeps, and what a save holds
function ssVars() {
  return { cash: 0, respect: 0, kills: 0, calm: 0, chapter: 1, meatballs: 0, ammo: 12, garageKills: 0, violence: 0, dead: [], sessions: 0, dinner: false, bossDead: false };
}

// ---- the people and the crew: bodies on the map's ground, with what they carry
function ssNpc(who, x, y) {
  const b = new E.Body({ x, y, r: 6 });
  b.facing = Math.PI * .5;
  return { who, body: b, rig: ssRig(who, 1.3, who === 'frankie' ? { weapon: null } : {}) };
}

function ssFoe(kind, x, y) {
  const b = new E.Body({ x, y, r: 6 });
  b.facing = 0; b.kind = kind; b.hp = kind === 'boss' ? 14 : kind === 'crew' ? 3 : 2; b.maxHp = b.hp;
  b.hit = 0; b.cool = E.rand(.4, 1.2); b.dead = false; b.dyingT = 0; b.home = { x, y }; b.goal = null; b.goalT = 0;
  b.id = kind + ':' + Math.round(x) + ',' + Math.round(y);
  b.susp = new E.Suspicion({ rise: 1.7, decay: .35, notice: .35, search: .7, alert: 1, forget: 5 });
  b.atk = new E.Attack(kind === 'boss' ? 'overhead' : 'haymaker');
  b.rig = ssRig(kind === 'boss' ? 'frankie' : kind === 'crew' ? 'crew' : 'thug', kind === 'boss' ? 1.55 : 1.3);
  b.speed = kind === 'boss' ? 46 : kind === 'crew' ? 54 : 48;
  b.shotCool = 2.2;
  return b;
}

// ---- a new game: the story, the hero, the town's people, the crew
function ssNewWorld(opts = {}) {
  if (!MAP) MAP = ssBuildMap();
  const game = GAME;
  const story = new E.Story(game, {
    people: Object.fromEntries(Object.entries(SS_PEOPLE).map(([k, p]) => [k, { name: p.name, portrait: ssRig(k, 1.3) }])),
    nodes: SS_NODES,
    vars: ssVars(),
    on: { collected: ssCollected, shakedown: ssShakedown, session: ssSession, dinner: ssDinner, bossfight: ssBossFight }
  });
  story.talk.voice = null;                              // the Animalese is ours: a blip per letter (see play)
  story.talk.lines = 3;
  story.auto = opts.bot ? 2.2 : 0;
  const sp = MAP.find('hero');
  const hero = new E.Body({ x: sp.x, y: sp.y, r: 5 });
  hero.facing = Math.PI * -.5; hero.hurt = 0; hero.sneak = false; hero.crouch = false; hero.exposure = 1; hero.z = 0;
  G = {
    game, bot: !!opts.bot, session: !!opts.session, story, V: story.vars, hero, spawn: { x: sp.x, y: sp.y },
    rig: ssRig('nunzio', 1.3), combo: new E.Combo(['jab', 'cross', 'haymaker'], { window: .35 }),
    shots: new E.Bullets(game, { plane: 'ground' }), flow: new E.FlowField(MAP),
    foes: [], pickups: [], npcs: {}, hp: SS.maxHp, invul: 0, dodgeT: 0, dodgeDir: [0, 0], gunT: 0, healT: 0,
    toast: '', toastT: 0, cooldown: 0, roundT: 0, scoreT: 0, reported: false, dying: 0, won: false, botT: 0, botTarget: null, lastShown: 0, lastLetter: 0, ended: false
  };
  for (const who of ['lenny', 'gino', 'pinky', 'doc', 'ricca', 'frankie']) {
    const s = MAP.find(who);
    if (who === 'frankie') continue;                     // Frankie joins the world at the pool, when the dinner is done
    G.npcs[who] = ssNpc(who, s.x, s.y);
  }
  if (!story.vars.dead) story.vars.dead = [];
  for (const s of MAP.findAll('thug')) ssSpawn('thug', s.x, s.y);
  if (story.vars.chapter >= 2 && !story.vars.bossDead) ssSpawnGarage();
  if (story.vars.dinner && !story.vars.bossDead) ssSpawnBoss();
  story.quest('shops', SS_QUESTS[0].title, SS_QUESTS[0].text);
  if (story.vars.garageKills >= 4) story.quest('doc', SS_QUESTS[2].title, SS_QUESTS[2].text);
  return G;
}

function ssSpawn(kind, x, y) {
  const f = ssFoe(kind, x, y);
  if (G.V.dead.includes(f.id)) return null;
  G.foes.push(f);
  return f;
}
function ssSpawnGarage() { for (const s of MAP.findAll('crew')) ssSpawn('crew', s.x, s.y); }
function ssSpawnBoss() {
  if (G.foes.some(f => f.kind === 'boss') || G.V.bossDead) return;
  const s = MAP.find('frankie'); const f = ssFoe('boss', s.x, s.y); G.foes.push(f); G.boss = f;
}

// ---- events from the talk: each one moves the story on
function ssToast(text, t = 3) { G.toast = text; G.toastT = t; }
function ssCollected(story, s) {
  const V = story.vars;
  V.cash += s.amount || 0; V.respect += 1; V[s.flag] = true;
  G.game.audio.sfx('cashin');
  ssToast('+$' + s.amount + '  ·  respect +1', 2.6);
  if (V.lenny && V.gino && V.pinky && V.chapter === 1) {
    V.chapter = 2; story.done('shops');
    story.quest('garage', SS_QUESTS[1].title, SS_QUESTS[1].text);
    ssSpawnGarage();
    ssToast('Frankie\'s crew is at the garage on Vine Street', 4);
    G.game.audio.music('fight');
  }
}
function ssShakedown(story, s) {
  const V = story.vars, who = G.npcs[s.who];
  V.violence += 1;
  ssCollected(story, s);
  if (who) for (let i = 0; i < 2; i++) {
    const a = E.rand(0, Math.PI * 2);
    ssSpawn('thug', who.body.x + Math.cos(a) * 26, who.body.y + Math.sin(a) * 26);
  }
  ssToast('The cousins came out of the back', 3);
}
function ssSession(story) {
  story.vars.sessions += 1; story.done('doc');
  story.quest('dinner', SS_QUESTS[3].title, SS_QUESTS[3].text);
  ssToast('Calm +1. Breathe.', 3);
}
function ssDinner(story) {
  story.vars.dinner = true; story.done('dinner');
  story.quest('pool', SS_QUESTS[4].title, SS_QUESTS[4].text);
  ssSpawnBoss();
  G.game.audio.music('dinner');
}
function ssBossFight(story) {
  ssSpawnBoss();
  if (G.boss) G.boss.susp.state = 'alert';
  story.vars.respect += 3;
}

// ---- objectives: what the story wants next, and where
function ssObjective() {
  const V = G.V;
  if (!V.lenny) return { text: 'Collect from Lenny at the Pork Palace', who: 'lenny' };
  if (!V.gino) return { text: 'Collect from Gino at the Bella Notte', who: 'gino' };
  if (!V.pinky) return { text: 'Collect from Pinky at Lucky Lanes', who: 'pinky' };
  if (V.chapter === 2) {
    const alive = G.foes.filter(f => f.kind === 'crew' && !f.dead);
    if (alive.length) return { text: 'Clear the crew at the garage (' + alive.length + ' left)', foe: alive[0] };
  }
  if (!V.sessions) return { text: 'Session with Dr. Marchetti', who: 'doc' };
  if (!V.dinner) return { text: 'Sunday dinner at the house', who: 'ricca' };
  if (!V.bossDead) return { text: 'Settle with Frankie at the pool', foe: G.boss && !G.boss.dead ? G.boss : null, who: G.boss ? null : 'frankie' };
  return null;
}
function ssObjectivePos(o) {
  if (!o) return null;
  if (o.foe) return o.foe;
  if (o.who && G.npcs[o.who]) return G.npcs[o.who].body;
  if (o.who === 'frankie') { const s = MAP.find('frankie'); return { x: s.x, y: s.y }; }
  return null;
}

// the talk a person starts when the player presses Talk near them, or null
function ssTalkNode(who) {
  const V = G.V;
  if (who === 'lenny' && !V.lenny) return 'lenny';
  if (who === 'gino' && !V.gino) return 'gino';
  if (who === 'pinky' && !V.pinky) return 'pinky';
  if (who === 'doc' && V.chapter >= 3 && !V.sessions) return 'doc';
  if (who === 'ricca' && V.sessions && !V.dinner) return 'ricca';
  if (who === 'frankie' && V.dinner && !V.bossDead) return 'frankie';
  return null;
}
function ssNearestNpc(x, y, range) {
  let best = null, bd = range;
  for (const who in G.npcs) { const d = E.dist(G.npcs[who].body, { x, y }); if (d < bd && ssTalkNode(who)) { bd = d; best = who; } }
  return best;
}
