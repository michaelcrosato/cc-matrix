/* 06-people: the cast (§8.2) as data with their rigs and voices, the civilians of Penn Row from seeded palettes, and the
   game's own poses (sit, lean, phone, camera, smoke, count money, cuffed, hands up, sweep), joints moved after rig.update. */
const SKIN = ['#3a2418', '#4a2e20', '#5a3a28', '#6b4630', '#8a5a3c', '#c8946a', '#e0b89a', '#f0c8a8'];
const PEOPLE = {
  dana: { name: 'Det. Dana Whitlock', short: 'DANA', role: 'Western District narcotics', rig: { size: 1.25, build: 'heroic', outfit: 'coat', hair: 'short', sleeves: 'long', colors: { skin: '#6b4630', hair: '#1a1210', cloth: '#e8dcc0', coat: '#5a3a22', pants: '#3a4a6a', boot: '#2a1e18', trim: '#7a5a3a' } } },
  lou: { name: 'Det. Lou Szabo', short: 'LOU', role: 'Partner, ex-Homicide', rig: { size: 1.25, build: 'heroic', outfit: 'coat', hair: 'bald', sleeves: 'long', hunch: .15, colors: { skin: '#e0b89a', cloth: '#e8e4dc', coat: '#b8a070', pants: '#4a4a4a', boot: '#2a2420', trim: '#8a7040' } } },
  hal: { name: 'Det. Hal Pettiford', short: 'HAL', role: 'The wire room', rig: { size: 1.2, build: 'heroic', outfit: 'coat', hair: 'short', sleeves: 'long', hunch: .2, colors: { skin: '#5a3a28', hair: '#b8b4ac', cloth: '#e8e0d0', coat: '#6a4a2a', pants: '#5a5048', boot: '#2a2018' } } },
  ren: { name: 'Officer Ren Ocasio', short: 'REN', role: 'Photos, the van', rig: { size: 1.15, build: 'heroic', hair: 'ponytail', sleeves: 'long', colors: { skin: '#c8946a', hair: '#1a1210', cloth: '#2a3a6a', pants: '#2a2a32', boot: '#e8e8e8' } } },
  navarre: { name: 'Lt. Gil Navarre', short: 'NAVARRE', role: 'Runs the detail', rig: { size: 1.25, build: 'heroic', hair: 'short', sleeves: 'long', colors: { skin: '#8a5a3c', hair: '#1a1210', cloth: '#e8e4dc', trim: '#7a1a2a', belt: '#7a1a2a', pants: '#3a3a42', boot: '#1a1414' } } },
  pruitt: { name: 'Maj. Leland Pruitt', short: 'PRUITT', role: 'District commander', rig: { size: 1.3, build: 'bulky', outfit: 'coat', hat: { style: 'cap', color: '#1e2a4a' }, sleeves: 'long', colors: { skin: '#e0b89a', cloth: '#d8d8e0', coat: '#1e2a4a', trim: '#d8b040', pants: '#1e2a4a', boot: '#101010' } } },
  ostrowski: { name: 'Dep. Comm. Raymond Ostrowski', short: 'OSTROWSKI', role: 'The politics', rig: { size: 1.3, build: 'bulky', outfit: 'coat', hair: 'short', sleeves: 'long', colors: { skin: '#f0c8a8', hair: '#8a8a8a', cloth: '#e8e8e8', coat: '#2a2a30', trim: '#3a5a8a', pants: '#2a2a30', boot: '#101010' } } },
  vance: { name: 'ASA Corinne Vance', short: 'VANCE', role: 'Prosecutor', rig: { size: 1.2, build: 'heroic', outfit: 'coat', hair: 'ponytail', sleeves: 'long', colors: { skin: '#f0c8a8', hair: '#5a3a1e', cloth: '#e8e4e0', coat: '#3a3a40', pants: '#3a3a40', boot: '#101010' } } },
  halloway: { name: 'Judge Abner Halloway', short: 'HALLOWAY', role: 'Signs the wire, or doesn\'t', rig: { size: 1.2, build: 'heroic', outfit: 'robe', hair: 'short', sleeves: 'long', hunch: .25, colors: { skin: '#4a2e20', hair: '#e8e8e4', cloth: '#141418', trim: '#e8e8e4', boot: '#101010' } } },
  easy: { name: 'Darnell "Easy" Booker', short: 'EASY', role: 'Boss', shoes: 'Shoes that cost more than your car. Pockets never seen them on Ridley.', rig: { size: 1.3, build: 'heroic', outfit: 'coat', hair: 'short', sleeves: 'long', colors: { skin: '#3a2418', hair: '#141010', cloth: '#3a3a3a', coat: '#141414', pants: '#1e1e22', boot: '#141010' } } },
  lonnie: { name: 'Lonnie Fitch', short: 'LONNIE', role: 'Driver', rig: { size: 1.25, build: 'bulky', hat: { style: 'cap', color: '#6a6a6a' }, sleeves: 'long', colors: { skin: '#5a3a28', cloth: '#4a4a52', pants: '#2a2a2e', boot: '#1a1414' } } },
  tee: { name: 'Terrence "Tee" Mabry', short: 'TEE', role: 'Lieutenant', shoes: 'Wheat Timbs, laces tucked, not a scuff on \'em.', rig: { size: 1.25, build: 'heroic', hat: { style: 'cap', color: '#141414' }, sleeves: 'short', colors: { skin: '#4a2e20', cloth: '#f0f0ec', pants: '#3a5a8a', boot: '#c8a050', belt: '#2a2018' } } },
  rook: { name: 'Ricky "Rook" Batts', short: 'ROOK', role: 'Muscle', shoes: 'Black Air Force, red check, size thirteen.', rig: { size: 1.35, build: 'bulky', hat: { style: 'band', color: '#141414' }, sleeves: 'long', colors: { skin: '#3a2418', cloth: '#1a1a1e', pants: '#2a2a30', boot: '#141414', trim: '#c82a2a' } } },
  corey: { name: 'Corey "Stash" Lyle', short: 'COREY', role: 'Stash', shoes: 'Nikes with duct tape on the left toe.', rig: { size: 1.15, build: 'heroic', hood: true, sleeves: 'long', hunch: .25, colors: { skin: '#5a3a28', hair: '#7a7a7e', cloth: '#8a8a8e', pants: '#3a3a42', boot: '#c8c8c8' } } },
  pigeon: { name: 'Junior "Pigeon" Hollis', short: 'PIGEON', role: 'Lookout (roof)', shoes: 'Little sneakers that light up when he runs.', rig: { size: 1.0, build: 'heroic', hair: 'short', sleeves: 'long', colors: { skin: '#6b4630', hair: '#141010', cloth: '#c82a2a', pants: '#3a4a6a', boot: '#e8e8e8' } } },
  moe: { name: 'Maurice "Lil Moe" Dorsey', short: 'LIL MOE', role: 'Lookout (bike)', rig: { size: 1.0, build: 'heroic', hat: { style: 'cap', color: '#2a8a3a' }, sleeves: 'short', colors: { skin: '#4a2e20', cloth: '#e8c830', pants: '#3a3a42', boot: '#e8e8e8' } } },
  dink: { name: 'Darius "Dink" Pratt', short: 'DINK', role: 'Money', rig: { size: 1.1, build: 'heroic', hair: 'short', sleeves: 'short', colors: { skin: '#5a3a28', hair: '#141010', cloth: '#2a5ab0', trim: '#e8e8e8', pants: '#2a2a32', boot: '#e8e8e8' } } },
  tavon: { name: 'Tavon Gibbs', short: 'TAVON', role: 'Runner', rig: { size: 1.15, build: 'heroic', outfit: 'coat', hat: { style: 'band', color: '#c82a2a' }, sleeves: 'long', colors: { skin: '#3a2418', cloth: '#e8e8e8', coat: '#1a1a1e', pants: '#3a3a42', boot: '#141414' } } },
  pockets: { name: 'Wesley "Pockets" Gaines', short: 'POCKETS', role: 'Informant', rig: { size: 1.15, build: 'heroic', outfit: 'coat', hat: { style: 'cap', color: '#8a2a22' }, sleeves: 'long', hunch: .3, colors: { skin: '#4a2e20', cloth: '#8a7a5a', coat: '#4a5a32', pants: '#5a4a3a', boot: '#3a2a20' } } },
  odessa: { name: 'Miss Odessa Tillman', short: 'ODESSA', role: 'Pigeon\'s grandmother', rig: { size: 1.1, build: 'heroic', outfit: 'robe', hair: 'short', sleeves: 'short', hunch: .2, colors: { skin: '#3a2418', hair: '#c8c4bc', cloth: '#6a2a5a', trim: '#e8d8e8', boot: '#2a2020' } } },
  sunday: { name: 'Royal "Sunday" Odom', short: 'SUNDAY', role: 'Stick-up man', rig: { size: 1.25, build: 'heroic', outfit: 'coat', hat: { style: 'cap', color: '#5a4a3a' }, sleeves: 'long', colors: { skin: '#3a2418', cloth: '#e8e0d0', coat: '#7a6a4a', pants: '#3a3a32', boot: '#2a2018' } } },
  dale: { name: 'Dale Kucharski', short: 'DALE', role: 'Courier', rig: { size: 1.25, build: 'bulky', hat: { style: 'cap', color: '#b8261e' }, sleeves: 'short', colors: { skin: '#e0b89a', cloth: '#4a5a7a', pants: '#3a3a3a', boot: '#2a2018' } } },
  harstad: { name: 'Glenn Harstad', short: 'HARSTAD', role: 'The connect', rig: { size: 1.25, build: 'heroic', outfit: 'coat', hair: 'short', sleeves: 'long', colors: { skin: '#f0c8a8', hair: '#b8b4ac', cloth: '#e8e8f0', coat: '#1e2a4a', pants: '#8a8070', boot: '#3a2418' } } },
  dukes: { name: 'Officer Dukes', short: 'DUKES', role: 'Patrol', rig: { size: 1.25, build: 'heroic', hat: { style: 'cap', color: '#1e2a4a' }, sleeves: 'short', colors: { skin: '#c8946a', cloth: '#2a3a5a', pants: '#1e2a4a', boot: '#101010', belt: '#101010' } } },
  kowalczyk: { name: 'Officer Kowalczyk', short: 'KOWALCZYK', role: 'Patrol', rig: { size: 1.25, build: 'bulky', hat: { style: 'cap', color: '#1e2a4a' }, sleeves: 'short', colors: { skin: '#f0c8a8', cloth: '#2a3a5a', pants: '#1e2a4a', boot: '#101010', belt: '#101010' } } },
  knocker: { name: 'Knocker', short: 'KNOCKER', role: 'Jump-out', rig: { size: 1.25, build: 'bulky', hair: 'short', sleeves: 'short', colors: { skin: '#e0b89a', hair: '#3a2a1e', cloth: '#3a3a3a', trim: '#e8c830', pants: '#4a4a3a', boot: '#101010' } } },
  dutch: { name: 'Dutch', short: 'DUTCH', role: 'Customer', rig: { size: 1.15, build: 'heroic', outfit: 'coat', hat: { style: 'cap', color: '#3a5a3a' }, sleeves: 'long', hunch: .3, colors: { skin: '#5a3a28', cloth: '#7a6a5a', coat: '#4a3a2a', pants: '#4a4a52', boot: '#3a2a20' } } },
  smokey: { name: 'Smokey', short: 'SMOKEY', role: 'Sells hardware', rig: null },
  keisha: { name: 'Keisha', short: 'KEISHA', role: 'Rook\'s son\'s mother', rig: null },
  gloria: { name: 'Gloria Whitlock', short: 'GLORIA', role: 'Dana\'s mother', rig: null }
};
for (const id in PEOPLE) def('people', id, PEOPLE[id]);
const rigs = {};
const rigOf = id => { if (rigs[id]) return rigs[id]; const p = PEOPLE[id]; if (!p || !p.rig) return null; return (rigs[id] = new E.Humanoid(Object.assign({ weapon: null }, p.rig, { colors: Object.assign({}, p.rig.colors) }))); };
const nameOf = id => (PEOPLE[id] ? PEOPLE[id].short : String(id).toUpperCase());

/* ---- civilians: six palette families, seeded per person ---- */
const FAMILIES = {
  warm: ['#c84a2a', '#e8a040', '#a83a3a', '#e86a4a', '#d8b860'], cool: ['#3a5a9a', '#4a8ab0', '#2a3a6a', '#6a7aa0', '#3a6a7a'], earth: ['#6a5a3a', '#8a6a4a', '#5a4a32', '#7a7a5a', '#4a3a2a'],
  sport: ['#e8e8e8', '#c82a2a', '#2a5ab0', '#141414', '#e8c830'], church: ['#6a2a5a', '#e8e0d0', '#2a2a4a', '#8a2a3a', '#e8d8b0'], work: ['#4a5a7a', '#3a3a3a', '#7a6a4a', '#2a4a3a', '#5a5a6a']
};
function civilianRig(seed) {
  const r = E.rng(seed), fam = pick(r, Object.keys(FAMILIES)), P = FAMILIES[fam], kid = r() < .14, woman = r() < .5, old = !kid && r() < .2;
  const o = { size: kid ? 1.0 + r() * .1 : 1.12 + r() * .16, build: !kid && r() < .2 ? 'bulky' : 'heroic', weapon: null, sleeves: r() < .5 ? 'long' : 'short',
    outfit: old && woman && r() < .6 ? 'robe' : r() < .3 ? 'coat' : 'shirt', hair: woman ? pick(r, ['ponytail', 'long', 'short']) : pick(r, ['short', 'bald', 'short']),
    hunch: old ? .2 + r() * .1 : r() * .08, colors: { skin: pick(r, SKIN.slice(0, r() < .82 ? 5 : 8)), hair: old ? '#b8b4ac' : pick(r, ['#141010', '#2a1a10', '#3a2a1a']),
      cloth: pick(r, P), coat: pick(r, P), pants: pick(r, ['#2a2a32', '#3a4a6a', '#4a4a3a', '#2a3a5a', '#5a4a3a']), boot: pick(r, ['#e8e8e8', '#141414', '#3a2a20', '#c8a050']) } };
  if (r() < .3) o.hat = { style: pick(r, ['cap', 'band']), color: pick(r, P) };
  if (!kid && r() < .12) o.hood = true;
  return { rig: new E.Humanoid(o), kid, woman, old, voice: (kid ? 'kid' : woman ? 'woman' : 'man') + seed };
}

/* ---- the game's own poses: joints moved after rig.update (E.ik3 for arms) ---- */
const V = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len: a => Math.hypot(a[0], a[1], a[2]) };
function armTo(rig, side, target, hint) {
  const J = rig.J, sh = J['sh' + side], el = J['elbow' + side], hd = J['hand' + side]; if (!sh || !el || !hd) return;
  const L1 = V.len(V.sub(el, sh)), L2 = V.len(V.sub(hd, el)), [e, h] = E.ik3(sh, target, L1, L2, hint || [0, side === 'R' ? 1 : -1, -1]);
  J['elbow' + side] = e; J['hand' + side] = h;
}
function applyPose(rig, pose, t = 0) {
  const J = rig.J; if (!pose || !J || !J.head) return;
  const hd = J.head, s = rig.o.size || 1.25;
  if (pose === 'sit') {
    const dz = J.hipC[2] - 8.5 * s / 1.25;
    for (const k of ['hipC', 'hipL', 'hipR', 'shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR']) if (J[k]) J[k] = [J[k][0], J[k][1], J[k][2] - dz];
    for (const sd of ['L', 'R']) { const hp = J['hip' + sd]; J['knee' + sd] = [hp[0] + 6 * s / 1.25, hp[1], hp[2] + .5]; J['foot' + sd] = [hp[0] + 7 * s / 1.25, hp[1], 0]; }
    armTo(rig, 'R', [J.hipR[0] + 5, J.hipR[1] + .5, J.hipR[2] + 2]); armTo(rig, 'L', [J.hipL[0] + 5, J.hipL[1] - .5, J.hipL[2] + 2]);
  } else if (pose === 'lean') {
    for (const k of ['shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR']) if (J[k]) J[k] = [J[k][0] - 1.6, J[k][1], J[k][2] - .3];
    J.footL = [J.footL[0] + 2, J.footL[1], J.footL[2]];
    armTo(rig, 'R', [J.hipR[0] - 2, J.hipR[1] + 1.5, J.hipR[2] + 1]);
  } else if (pose === 'phone') armTo(rig, 'R', [hd[0] + 1, hd[1] + 2.6, hd[2] - .5], [0, 1, -.3]);
  else if (pose === 'camera') { armTo(rig, 'R', [hd[0] + 4.5, hd[1] + 1.6, hd[2] - 1], [0, 1, -.5]); armTo(rig, 'L', [hd[0] + 4.5, hd[1] - 1.6, hd[2] - 1], [0, -1, -.5]); }
  else if (pose === 'smoke') { if ((t % 4) < 1.2) armTo(rig, 'R', [hd[0] + 2.5, hd[1] + .6, hd[2] - 2.5], [0, 1, -1]); else armTo(rig, 'R', [J.hipR[0] + 3, J.hipR[1] + 2, J.hipR[2] + 3]); }
  else if (pose === 'count') { const f = Math.sin(t * 14) * .6; armTo(rig, 'R', [7, 1.4, J.shC[2] - 8 + f]); armTo(rig, 'L', [7, -1.4, J.shC[2] - 8]); }
  else if (pose === 'cuffed') { armTo(rig, 'R', [-3.5, .8, J.hipC[2] + .5], [0, 1, 0]); armTo(rig, 'L', [-3.5, -.8, J.hipC[2] + .5], [0, -1, 0]); }
  else if (pose === 'handsUp') { armTo(rig, 'R', [1, 5, hd[2] + 6], [0, 1, 0]); armTo(rig, 'L', [1, -5, hd[2] + 6], [0, -1, 0]); }
  else if (pose === 'sweep') { const f = Math.sin(t * 3) * 3; armTo(rig, 'R', [7 + f, 1, J.hipC[2] - 2]); armTo(rig, 'L', [5 + f, -1, J.hipC[2] + 3]); }
  else if (pose === 'reach') armTo(rig, 'R', [9, 1.5, J.shC[2] - 4]);
  else if (pose === 'carry') armTo(rig, 'R', [3, 3.2, J.hipC[2] - 1]);
  else if (pose === 'point') armTo(rig, 'R', [10, 2, J.shC[2]], [0, 1, 0]);
  else if (pose === 'gun') { armTo(rig, 'R', [10, .5, J.shC[2] - 1], [0, 1, 0]); armTo(rig, 'L', [9, -.2, J.shC[2] - 1.5], [0, -1, 0]); }
}
const BUILT_IN_POSES = ['cheer', 'cast', 'guard', 'kneel', 'crouch', 'wave', 'hips', 'down', 'die', 'block'];
/** an agent's rig update with a pose of either kind */
function poseRig(rig, dt, st, pose, t) {
  const builtIn = BUILT_IN_POSES.includes(pose);
  rig.update(dt, Object.assign({}, st, builtIn ? { pose } : {}));
  if (!builtIn) applyPose(rig, pose, t);
}
/** a portrait drawn into a fresh canvas (polaroids, board cards); turn: how far they faced away from you */
const portraitCache = {};
function portraitURL(id, o = {}) {
  if (HEADLESS) return '';
  const key = id + ':' + (o.turn || 0).toFixed(1) + ':' + (o.bg || '') + (o.blur ? 'b' : ''); if (portraitCache[key]) return portraitCache[key];
  const rig = typeof id === 'string' ? rigOf(id) : id; const c = document.createElement('canvas'); c.width = 48; c.height = 48; const g = c.getContext('2d');
  g.fillStyle = o.bg || '#3a3630'; g.fillRect(0, 0, 48, 48);
  if (rig) { try { rig.drawPortrait(g, 0, 0, 48, { zoom: o.zoom || 1.15, turn: o.turn || 0, bg: o.bg || '#3a3630' }); } catch (e) { game.fail('portrait', e); } }
  if (o.blur) { g.globalAlpha = .55; g.fillStyle = '#8a8070'; for (let i = 0; i < 48; i += 2) g.fillRect(0, i, 48, 1); g.globalAlpha = 1; }
  const n = E.rng(hashStr(key)); for (let i = 0; i < 140; i++) { g.fillStyle = n() < .5 ? '#ffffff14' : '#00000018'; g.fillRect(Math.floor(n() * 48), Math.floor(n() * 48), 1, 1); }
  return (portraitCache[key] = c.toDataURL());
}
