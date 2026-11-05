// WIRETAP: people. The cast (all original), civilians from seeded palettes, the Agent (a Body, a Humanoid rig, a goal it
// walks to on the cached flow fields, an activity, barks in speech bubbles), and poses for sitting, phoning, the camera.
const SKIN = ['#3a2418', '#4a2e20', '#5a3a28', '#6b4630', '#8a5a3c', '#c8946a', '#e0b89a', '#f0c8a8'];
const CAST = {
  dana: { name: 'Det. Dana Whitlock', short: 'DANA', rig: { size: 1.25, build: 'heroic', hair: 'short', outfit: 'coat', sleeves: 'long', colors: { skin: '#6b4630', hair: '#1a1210', cloth: '#e8dcc0', coat: '#6a4228', pants: '#3a4a6a', boot: '#2a1e16' } } },
  lou: { name: 'Det. Lou Szabo', short: 'LOU', rig: { size: 1.25, build: 'heroic', hair: 'bald', outfit: 'coat', sleeves: 'long', hunch: .15, colors: { skin: '#e0b89a', hair: '#8a7a6a', cloth: '#e8e4dc', coat: '#b09a6a', pants: '#5a5048', boot: '#2a2018' } } },
  hal: { name: 'Det. Hal Pettiford', short: 'HAL', rig: { size: 1.2, build: 'heroic', hair: 'short', sleeves: 'long', hunch: .2, colors: { skin: '#4a2e20', hair: '#b8b4ac', cloth: '#7a5a3a', pants: '#4a4440', boot: '#2a2018' } } },
  ren: { name: 'Officer Ren Ocasio', short: 'REN', rig: { size: 1.15, build: 'heroic', hair: 'ponytail', sleeves: 'long', colors: { skin: '#c8946a', hair: '#1a1210', cloth: '#2a3a5a', pants: '#2a2a30', boot: '#e8e8e8' } } },
  navarre: { name: 'Lt. Gil Navarre', short: 'NAVARRE', rig: { size: 1.25, build: 'heroic', hair: 'short', colors: { skin: '#8a5a3c', hair: '#2a2018', cloth: '#d8dce8', trim: '#6a1a2a', pants: '#3a3a44', boot: '#1a1a1a' } } },
  pruitt: { name: 'Maj. Leland Pruitt', short: 'PRUITT', rig: { size: 1.3, build: 'bulky', hat: { style: 'cap', color: '#1a2448' }, outfit: 'coat', sleeves: 'long', colors: { skin: '#f0c8a8', hair: '#6a5a4a', cloth: '#1a2448', coat: '#1a2448', trim: '#d8b040', pants: '#1a2448', boot: '#0a0a0a' } } },
  vance: { name: 'ASA Corinne Vance', short: 'VANCE', rig: { size: 1.2, build: 'heroic', hair: 'long', outfit: 'coat', sleeves: 'long', colors: { skin: '#e0b89a', hair: '#4a2a1a', cloth: '#e8e8e8', coat: '#3a3a40', pants: '#3a3a40', boot: '#1a1a1a' } } },
  halloway: { name: 'Judge Abner Halloway', short: 'HALLOWAY', rig: { size: 1.2, build: 'heroic', hair: 'short', outfit: 'robe', sleeves: 'long', hunch: .25, colors: { skin: '#f0c8a8', hair: '#f0f0f0', cloth: '#141418', pants: '#141418', boot: '#0a0a0a' } } },
  easy: { name: 'Darnell "Easy" Booker', short: 'EASY', rig: { size: 1.3, build: 'heroic', hair: 'short', outfit: 'coat', sleeves: 'long', colors: { skin: '#4a2e20', hair: '#141010', cloth: '#d8d0c0', coat: '#141414', pants: '#2a2a2a', boot: '#3a2a1a' } } },
  lonnie: { name: 'Lonnie Fitch', short: 'LONNIE', rig: { size: 1.25, build: 'bulky', hat: { style: 'cap', color: '#6a6a6a' }, outfit: 'coat', colors: { skin: '#5a3a28', cloth: '#5a5a5a', coat: '#3a3a3a', pants: '#2a2a30', boot: '#1a1a1a' } } },
  tee: { name: 'Terrence "Tee" Mabry', short: 'TEE', shoes: 'wheat Timbs', rig: { size: 1.25, build: 'heroic', hat: { style: 'cap', color: '#141414' }, colors: { skin: '#5a3a28', cloth: '#f4f2ee', pants: '#3a4a6a', boot: '#c8963a' } } },
  rook: { name: 'Ricky "Rook" Batts', short: 'ROOK', shoes: 'black Air Force, red check', rig: { size: 1.35, build: 'bulky', hat: { style: 'band', color: '#0a0a0a' }, hood: true, sleeves: 'long', colors: { skin: '#3a2418', cloth: '#1a1a1e', hair: '#1a1a1e', pants: '#2a2a2e', boot: '#141414', trim: '#c82a2a' } } },
  corey: { name: 'Corey "Stash" Lyle', short: 'COREY', shoes: 'Nikes with duct tape', rig: { size: 1.15, build: 'heroic', hood: true, sleeves: 'long', hunch: .25, colors: { skin: '#6b4630', cloth: '#7a7a80', hair: '#7a7a80', pants: '#3a3a44', boot: '#b8b8b8' } } },
  pigeon: { name: 'Junior "Pigeon" Hollis', short: 'PIGEON', shoes: 'light-up sneakers', rig: { size: 1.0, build: 'heroic', hood: true, sleeves: 'long', colors: { skin: '#4a2e20', cloth: '#c82a2a', hair: '#c82a2a', pants: '#3a4a6a', boot: '#e8e8f0' } } },
  moe: { name: 'Maurice "Lil Moe" Dorsey', short: 'MOE', rig: { size: 1.0, build: 'heroic', hat: { style: 'cap', color: '#2a8a3a' }, colors: { skin: '#3a2418', cloth: '#e8c82a', pants: '#3a3a44', boot: '#e8e8e8' } } },
  dink: { name: 'Darius "Dink" Pratt', short: 'DINK', rig: { size: 1.1, build: 'heroic', hair: 'short', colors: { skin: '#5a3a28', hair: '#141010', cloth: '#2a5ac8', trim: '#e8e8e8', pants: '#3a3a44', boot: '#e8e8e8' } } },
  tavon: { name: 'Tavon Gibbs', short: 'TAVON', rig: { size: 1.15, build: 'heroic', hat: { style: 'band', color: '#c82a2a' }, outfit: 'coat', sleeves: 'long', colors: { skin: '#4a2e20', cloth: '#1a1a1e', coat: '#141416', pants: '#3a4a6a', boot: '#c8963a' } } },
  pockets: { name: 'Wesley "Pockets" Gaines', short: 'POCKETS', rig: { size: 1.15, build: 'heroic', hat: { style: 'cap', color: '#8a2a22' }, outfit: 'coat', sleeves: 'long', hunch: .3, colors: { skin: '#6b4630', cloth: '#6a6a4a', coat: '#5a5a3a', pants: '#4a4440', boot: '#3a3028' } } },
  odessa: { name: 'Miss Odessa Tillman', short: 'ODESSA', rig: { size: 1.1, build: 'heroic', hair: 'short', outfit: 'robe', sleeves: 'long', hunch: .2, colors: { skin: '#4a2e20', hair: '#c8c8c8', cloth: '#6a2a5a', pants: '#6a2a5a', boot: '#2a1a1a' } } },
  sunday: { name: 'Royal "Sunday" Odom', short: 'SUNDAY', rig: { size: 1.25, build: 'heroic', hat: { style: 'cap', color: '#5a4a3a' }, sleeves: 'long', colors: { skin: '#3a2418', cloth: '#6a6a4a', pants: '#3a3a30', boot: '#2a2018' } } },
  dale: { name: 'Dale Kucharski', short: 'DALE', rig: { size: 1.25, build: 'bulky', hat: { style: 'cap', color: '#b02a22' }, colors: { skin: '#f0c8a8', cloth: '#5a6a8a', pants: '#3a3a44', boot: '#3a2a1a' } } },
  ostrowski: { name: 'Dep. Comm. Raymond Ostrowski', short: 'OSTROWSKI', rig: { size: 1.3, build: 'bulky', hair: 'short', outfit: 'coat', sleeves: 'long', colors: { skin: '#f0c8a8', hair: '#c8c8c8', cloth: '#e8e8e8', coat: '#2a2a30', pants: '#2a2a30', boot: '#0a0a0a' } } },
  gloria: { name: 'Gloria Whitlock', short: 'GLORIA', rig: { size: 1.15, build: 'heroic', hair: 'short', colors: { skin: '#6b4630', hair: '#9a9a9a', cloth: '#6a5a8a', pants: '#3a3a44' } } },
  dukes: { name: 'Officer Dukes', short: 'DUKES', rig: { size: 1.25, build: 'heroic', hat: { style: 'cap', color: '#1a2448' }, sleeves: 'long', colors: { skin: '#5a3a28', cloth: '#1a2448', pants: '#1a2448', boot: '#0a0a0a' } } },
  cop: { name: 'Officer', short: 'OFFICER', rig: { size: 1.25, build: 'heroic', hat: { style: 'cap', color: '#1a2448' }, sleeves: 'long', colors: { skin: '#e0b89a', cloth: '#1a2448', pants: '#1a2448', boot: '#0a0a0a' } } }
};
const RIGS = {};
const rigOf = id => RIGS[id] || (RIGS[id] = new E.Humanoid(Object.assign({ weapon: null }, CAST[id].rig)));
const nameOf = id => (CAST[id] && CAST[id].short) || String(id).toUpperCase();
/** a civilian's look from a seed: one of six palette families, age and build varying */
function civRig(seed, kind = 'civ') {
  const r = E.rng(seed * 7919 + 13), pick = a => a[Math.floor(r() * a.length)];
  const FAM = { warm: ['#c84a2a', '#e8a83a', '#a83a3a'], cool: ['#3a6a9a', '#4a8a8a', '#5a5aa0'], earth: ['#6a5a3a', '#8a6a4a', '#5a4a3a'], sport: ['#e8e8e8', '#1a1a1a', '#2a5ac8', '#c82a2a'],
    church: ['#6a2a5a', '#2a3a6a', '#e8e0d0'], work: ['#4a5a3a', '#3a4a5a', '#8a8a8a'] };
  const fam = FAM[pick(Object.keys(FAM))], kid = kind === 'kid' || r() < .12, woman = r() < .5, old = !kid && r() < .2;
  const o = { weapon: null, build: r() < .2 ? 'bulky' : 'heroic', size: kid ? 1.0 + r() * .1 : 1.15 + r() * .15, hunch: old ? .2 : kind === 'fiend' ? .3 : r() * .08,
    hair: woman ? pick(['long', 'ponytail', 'short']) : pick(['short', 'bald', 'short']), sleeves: pick(['short', 'long']), outfit: r() < .3 ? 'coat' : woman && r() < .3 ? 'robe' : undefined,
    colors: { skin: pick(SKIN.slice(0, 6).concat(SKIN)), hair: old ? '#c8c8c8' : pick(['#141010', '#2a1a10', '#4a2a1a']), cloth: pick(fam), coat: pick(fam), pants: pick(['#2a2a30', '#3a4a6a', '#4a4440', '#5a5048']), boot: pick(['#e8e8e8', '#1a1a1a', '#c8963a', '#5a3a2a']) } };
  if (r() < .3) o.hat = { style: pick(['cap', 'band']), color: pick(fam) };
  if (kind === 'fiend') { o.colors.cloth = pick(['#6a6a4a', '#5a4a3a', '#4a4a5a']); o.colors.coat = '#5a5040'; o.outfit = 'coat'; }
  return { rig: new E.Humanoid(o), voice: kid ? 'kid' : woman ? 'woman' : 'man', woman, kid };
}
const POSE = { sit: 'kneel', lean: 'hips', phone: 'wave', camera: 'cast', smoke: 'hips', count: 'guard', cuffed: 'kneel', handsup: 'cheer', dice: 'crouch', down: 'down', crouch: 'crouch' };

/** the nearest walkable point to (x, y): itself, or the centre of the nearest walkable cell */
function nearWalk(x, y) {
  const m = World.map; if (!m) return { x, y }; const [cx, cy] = m.toCell(x, y); if (m.walkable(cx, cy)) return { x, y };
  for (let r = 1; r < 6; r++) { let best = null, bd = 1e9; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !m.walkable(cx + dx, cy + dy)) continue; const p = C(cx + dx, cy + dy), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } } if (best) return best; }
  return { x, y };
}
class Agent {
  constructor(o) {
    Object.assign(this, { id: o.id, person: o.person || null, role: o.role || null, kind: o.kind || 'civ', speed: o.speed || 46, z: o.z || 0, facing: o.facing || 0,
      goal: null, path: null, wait: 0, act: null, actT: 0, pose: null, bubble: null, watcher: !!o.watcher, range: o.range || 150, fov: o.fov || 1.7,
      minds: {}, knows: new Set(), visible: true, carrying: 0, onArrive: null, stuckT: 0, lastP: null, tag: o.tag || null, voice: o.voice || (o.person && VOICES[o.person] ? o.person : 'man') });
    this.seedId = o.seed || 1; this.body = new E.Body({ x: o.x, y: o.y, r: 4.5 }); this.body.z = this.z;
    if (o.rig) this.rig = o.rig; else if (o.person && CAST[o.person]) this.rig = new E.Humanoid(Object.assign({ weapon: null }, CAST[o.person].rig));
    else { const c = civRig(o.seed || 1, o.kind); this.rig = c.rig; this.voice = c.voice; }
  }
  get x() { return this.body.x; } set x(v) { this.body.x = v; }
  get y() { return this.body.y; } set y(v) { this.body.y = v; }
  goTo(x, y, speed, onArrive) { const w = nearWalk(x, y); this.goal = { x: w.x, y: w.y }; if (speed) this.speed = speed; this.onArrive = onArrive || null; this.stuckT = 0; this.lastP = { x: this.x, y: this.y }; this.act = null; }
  goCell(cx, cy, speed, on) { const p = C(cx, cy); this.goTo(p.x, p.y, speed, on); }
  stop() { this.goal = null; this.body.vx = this.body.vy = 0; }
  say(text, o = {}) { this.bubble = { text: clean(text), t: o.t || 2.6, intel: o.intel || null }; BUS.emit('bark', this, text); }
  doAct(name, t, pose) { this.act = name; this.actT = t; this.pose = pose || null; }
  update(dt) {
    if (this.bubble && (this.bubble.t -= dt) <= 0) this.bubble = null;
    if (this.actT > 0) { this.actT -= dt; if (this.actT <= 0) { const a = this.act; this.act = null; this.pose = null; if (this.onAct) this.onAct(a); } }
    const b = this.body;
    if (this.goal && this.z < 1) {
      const d = Math.hypot(this.goal.x - b.x, this.goal.y - b.y);
      if (d < 5) { const f = this.onArrive; this.stop(); this.onArrive = null; if (f) f(this); }
      else {
        const c = World.map.toCell(this.goal.x, this.goal.y), cx = Array.isArray(c) ? c[0] : c.cx, cy = Array.isArray(c) ? c[1] : c.cy;
        let tx = this.goal.x, ty = this.goal.y;
        if (d > 18 || !World.map.los(b.x, b.y, tx, ty)) { const n = World.flow(cx, cy).next(b.x, b.y); if (n) { tx = n.x; ty = n.y; } }
        const l = Math.hypot(tx - b.x, ty - b.y) || 1, sp = this.speed;
        b.vx = (tx - b.x) / l * sp; b.vy = (ty - b.y) / l * sp; this.facing = E.approachAng ? E.approachAng(this.facing, Math.atan2(b.vy, b.vx), dt * 10) : Math.atan2(b.vy, b.vx);
        // the stuck rule: under 4 units of progress in 3 s, a nudge, then a jump to the goal's side out of sight
        this.stuckT += dt; if (this.stuckT > 3) { if (dist(this.lastP, b) < 4 && d < 24) { const f = this.onArrive; this.stop(); this.onArrive = null; this.stuckN = 0; if (f) f(this); return; } if (dist(this.lastP, b) < 4) { b.x += (RNG.cos() - .5) * 10; b.y += (RNG.cos() - .5) * 10; if (this.stuckN = (this.stuckN || 0) + 1, this.stuckN > 2) { b.x = this.goal.x; b.y = this.goal.y; this.stuckN = 0; } } this.stuckT = 0; this.lastP = { x: b.x, y: b.y }; }
      }
    } else { b.vx = 0; b.vy = 0; }
    if (this.z < 1) b.update(dt, World.map);
    this.rig.update(dt, { x: b.x, y: b.y, z: this.z, vx: b.vx, vy: b.vy, facing: this.facing, pose: this.pose ? POSE[this.pose] || this.pose : null });
  }
  /** chest point (photos, sight) */
  chest() { return { x: this.x, y: this.y, z: this.z + 22 }; }
  draw(r, o = {}) {
    if (!this.visible) return;
    if (this.z < 1) r.shadow(this.x, this.y, 6, .3);
    r.actor(this.x, this.y, this.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), Object.assign({ pick: this }, o));
    this.scr = r.w(this.x, this.y, this.z + 22); this.head = r.w(this.x, this.y, this.z + 44 * (this.rig.size || 1.2) / 1.25);
    if (this.person === 'pigeon' && Math.hypot(this.body.vx, this.body.vy) > 60 && Math.floor(game.time * 8) % 2) game.lights.add(this.x, this.y, 2, 10, .8, { color: '#ff4a8a' });   // light-up sneakers
  }
}
/** speech bubbles, in the overlay: readable near the player and while the speaker isn't onto them, else "..." */
function drawBubbles(r, agents, listener, readable) {
  r.overlay(g => {
    for (const a of agents) {
      if (!a.bubble || !a.head || !a.visible) continue;
      const can = readable ? readable(a) : true, txt = can ? a.bubble.text : '…', w = Math.min(150, E.font.width(txt) + 8);
      const lines = E.font.wrap ? E.font.wrap(txt, 142) : [txt], hgt = lines.length * 9 + 4, x = Math.round(a.head[0] - w / 2), y = Math.round(a.head[1] - hgt - 6);
      E.ui.box(g, x, y, w, hgt, { bg: '#f4f0e6', border: '#1a1612', gradient: false });
      px.rect(g, Math.round(a.head[0]) - 1, y + hgt, 3, 3, '#f4f0e6');
      lines.forEach((l, i) => E.font.text(g, l, x + 4, y + 3 + i * 9, a.bubble.intel && can ? '#8a2a12' : '#1a1612', { outline: false }));
    }
  });
}

