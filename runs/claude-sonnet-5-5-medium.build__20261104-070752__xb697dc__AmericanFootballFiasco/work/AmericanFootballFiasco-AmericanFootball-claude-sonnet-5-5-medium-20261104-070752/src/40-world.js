/* AMERICAN FOOTBALL FIASCO — the world: stadium map, painted field, crowd, rigs and the pose codes that drive them. */
(() => {
'use strict';
const E = My3D2dge, FF = globalThis.FF, { px, clamp, lerp } = E, game = FF.game;
const { Y, GL0, GL1, FX, YMIN, YMAX, CY } = FF.FIELD;
const COLS = 75, ROWS = 36, T = 16;

/* ---- the stadium map: stands along the far side (rows 0-5), the field, a track and benches along the near side ---- */
FF.buildMap = (stadiumId, homeId) => {
  const st = FF.STADIUMS[stadiumId] || FF.STADIUMS.junction, home = FF.TEAMS[homeId] || FF.TEAMS.fiascos;
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    let s = '';
    for (let c = 0; c < COLS; c++) s += r < 2 ? '1' : r < 4 ? '2' : r < 6 ? '3' : '.';
    rows.push(s);
  }
  const hex = E.hex;
  const ez = st.ez.map(c => c.slice()), line = [236, 238, 232];
  const floorTex = (x, y) => {
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .4;
    if (y >= YMAX + 8) { const t = Math.floor(x / 24) % 2 ? 0 : 1; return y > YMAX + 56 ? [38 + n * 12, 38 + n * 12, 46 + n * 12] : [150 + t * 20 + n * 14, 70 + t * 10 + n * 10, 50 + n * 10]; }   // track / ad boards
    if (y < YMIN - 6) return [60 + n * 10, 56 + n * 10, 64 + n * 10];
    const inY = y >= YMIN && y <= YMAX;
    if (!inY) return [226, 226, 220];   // sideline paint
    const inEZ = x < GL0 || x > GL1;
    let base;
    if (inEZ) { const stripe = (Math.floor((x + y) / 14) % 2) ? .9 : 1; const col = ez[x < GL0 ? 0 : 1]; base = [col[0] * stripe + n * 14, col[1] * stripe + n * 14, col[2] * stripe + n * 14]; }
    else { const k = Math.floor((x - GL0) / 50) % 2 ? 1 : 0, g = st.grass, g2 = st.grass2, src = k ? g : g2, q = n * 18 + m * 14; base = [src[0] + q, src[1] + q * 1.1, src[2] + q]; }
    // midfield logo
    const dm = Math.hypot(x - 600, y - CY);
    if (dm < 42 && !inEZ) { const c1 = hex(home.c1), c2 = hex(home.c2); if (dm > 38) return [236, 236, 230]; return dm > 24 ? [c2[0] + n * 8, c2[1] + n * 8, c2[2] + n * 8] : [c1[0] + n * 8, c1[1] + n * 8, c1[2] + n * 8]; }
    // lines
    const rel = x - GL0, lx = Math.abs(rel - Math.round(rel / 50) * 50), onGoal = Math.abs(x - GL0) < 2 || Math.abs(x - GL1) < 2;
    if (x >= GL0 - 2 && x <= GL1 + 2 && (lx < 1.1 || onGoal || Math.abs(y - YMIN) < 1.6 || Math.abs(y - YMAX) < 1.6)) { const w = line[0] + n * 14; return [w, w + 2, w - 4]; }
    // hash marks every yard
    if (!inEZ && x > GL0 && x < GL1 && (Math.abs(y - (CY - 28)) < 3 || Math.abs(y - (CY + 28)) < 3) && Math.abs(rel - Math.round(rel / 10) * 10) < .9) return [line[0] - 20, line[1] - 20, line[2] - 20];
    return base;
  };
  const map = new E.TileMap({
    rows, legend: { '.': { floor: 'grass' }, 1: 1, 2: 2, 3: 3 }, floorTex, outside: '#16141c', ao: 3,
    types: {
      1: { h: 64, face: 'stone', side: '#3a3650', top: '#58526e' }, 2: { h: 50, face: 'stone', side: '#403c58', top: '#625c78' }, 3: { h: 36, face: 'stone', side: '#464262', top: '#6a6482' }
    }
  });
  map.stadium = st;
  return map;
};

/* ---- the crowd: figures on the tiers; they bob, and jump when their side scores ---- */
FF.makeCrowd = (st) => {
  const list = [], R = E.rng(FF.hash(st.name));
  const tiers = [[64, 14, 8], [50, 46, 8], [36, 78, 8]];   // z (top height), y of the figure row
  for (const [z, y0] of tiers) for (let c = 0; c < COLS * 2; c++) {
    const x = c * 8 + 4; const h = R();
    list.push({ x, y: y0 + 3 + (c % 3), z, c1: st.crowd[Math.floor(h * 3) % 3], skin: ['#f0c8a8', '#d8a070', '#a06a40', '#6a4028'][Math.floor(R() * 4)], ph: R() * 6, big: R() < .3 });
  }
  return list;
};
FF.drawCrowd = (r, list, t, excite) => {
  for (const f of list) {
    if (!r.visible(f.x, f.y, f.z + 10)) continue;
    const bob = Math.sin(t * (4 + excite * 6) + f.ph) * (1 + excite * 2.4), up = Math.max(0, bob);
    r.queue(f.x, f.y, f.z + up, g => {
      const p = r.w(f.x, f.y, f.z + up);
      px.rect(g, p[0] - 2, p[1] - 7, 4, 4, f.c1);
      px.rect(g, p[0] - 1, p[1] - 10, 3, 3, f.skin);
      if (excite > .5 && f.big) { px.rect(g, p[0] - 4, p[1] - 12 - (bob > 0 ? 2 : 0), 2, 4, f.skin); px.rect(g, p[0] + 3, p[1] - 12 - (bob > 0 ? 2 : 0), 2, 4, f.skin); }
    }, { bias: -2 });
  }
};

/* ---- rigs ---- */
const SKINS = ['#f0c8a8', '#d8a070', '#a06a40', '#6a4028'];
const BUILD = ['chibi', 'heroic', 'heroic', 'heroic', 'bulky', 'bulky', 'bulky'];
FF.makeRig = (team, k, extra) => {
  const h = FF.hash(team.id + 'rig' + k);
  const o = Object.assign({ size: 1.02, build: BUILD[k % 7], weapon: null, outfit: 'shirt', sleeves: 'short', hat: { style: 'helmet', color: team.c2 === '#12121c' ? '#1c1c2c' : team.c2 },
    colors: { cloth: team.c1, pants: team.c2, trim: team.c2, belt: team.c2, boot: '#1a1a22', glove: '#f0f0f0', skin: SKINS[h % 4], hair: team.hair[h % team.hair.length] } }, extra || {});
  return new E.Humanoid(o);
};
FF.makeSpeakerRigs = () => {
  const mk = (o) => new E.Humanoid(Object.assign({ size: 1.2, weapon: null }, o));
  return {
    CHUCK: mk({ build: 'chibi', outfit: 'coat', hair: 'short', colors: { cloth: '#d8d0c0', coat: '#3a4a8a', hair: '#8a8a90', skin: '#e8c0a0', pants: '#2a2a40' } }),
    DOTTIE: mk({ build: 'chibi', outfit: 'coat', hair: 'ponytail', colors: { cloth: '#f0e0d0', coat: '#c03060', hair: '#d86030', skin: '#c89070', pants: '#2a2a40' } }),
    COACH: mk({ build: 'bulky', hat: { style: 'cap', color: '#e8a020' }, hair: 'short', colors: { cloth: '#e8a020', pants: '#5a2a10', skin: '#d8a070', hair: '#888' } }),
    GLOVES: FF.makeRig(FF.TEAMS.fiascos, 2, { size: 1.2 }),
    TANK: FF.makeRig(FF.TEAMS.bruisers, 5, { size: 1.5, build: 'bulky' }),
    FROSTY: FF.makeRig(FF.TEAMS.gladiators, 2, { size: 1.25 }),
    COMMISSIONER: mk({ build: 'heroic', outfit: 'coat', hair: 'bald', hat: { style: 'crown', color: '#c040ff' }, colors: { cloth: '#101018', coat: '#201030', skin: '#e0c0b0', pants: '#101018', trim: '#c040ff' } })
  };
};

/* the render state of every player: live, or from a replay frame */
FF.pose = (rig, p, dt, M, extra) => {
  const o = { x: p.x, y: p.y, z: p.z || 0, vx: p.vx, vy: p.vy, facing: p.face };
  const sp = Math.hypot(p.vx, p.vy), st = p.state, e = extra || {};
  p.downK = p.downK || 0;
  const wantDown = st === 'down' ? 1 : st === 'dive' ? .85 : 0;
  p.downK += (wantDown - p.downK) * Math.min(1, dt * (wantDown > p.downK ? 14 : 6));
  if (p.downK > .02) o.down = p.downK;
  if (sp > 64) o.sprint = true;
  if (st === 'stun') { o.hurt = true; o.expr = 'wince'; }
  if (p.engaged || e.block) { o.stance = 'guard'; }
  if (e.cheer) { o.pose = 'cheer'; o.expr = 'shout'; }
  if (e.sad) { o.pose = 'kneel'; o.expr = 'wince'; }
  if (e.wave) { o.pose = 'wave'; }
  if (e.hips) { o.pose = 'hips'; }
  if (p.z > 3) { o.air = true; }
  if (e.attack) o.attack = e.attack;
  if (e.ready) o.pose = 'crouch';
  rig.update(dt, o);
};

/* ---- art made in code: the football, a trophy-sized hot dog, goalposts ---- */
FF.BALL = E.sprite(['..bbbb..', '.bBBBBb.', 'bBwBwBBb', '.bBBBBb.', '..bbbb..'], { b: '#7a3a14', B: '#a8561e', w: '#f4f0e0' });
FF.drawPosts = (r, side, t) => {
  const gx = side === 0 ? GL1 + 100 : GL0 - 100;
  r.queue(gx, CY, 0, g => {
    const base = r.w(gx, CY, 0), l = r.w(gx, CY - 28, 40), rr = r.w(gx, CY + 28, 40), lb = r.w(gx, CY - 28, 8), rb = r.w(gx, CY + 28, 8), top = r.w(gx, CY - 28, 80), top2 = r.w(gx, CY + 28, 80), mid = r.w(gx, CY, 36), cen = r.w(gx, CY, 6);
    px.line(g, mid[0], mid[1], cen[0], cen[1], '#e8c840', 2);
    px.line(g, lb[0], lb[1], rb[0], rb[1], '#f0d040', 2);   // crossbar
    px.line(g, lb[0], lb[1], top[0], top[1], '#f0d040', 2); px.line(g, rb[0], rb[1], top2[0], top2[1], '#f0d040', 2);
    px.rect(g, base[0] - 1, base[1] - 6, 3, 6, '#c0a030');
    void l; void rr;
  }, { bias: 4 });
};
})();
