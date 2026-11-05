/* 13-art-people: the cast as engine Humanoid rigs (portraits in dialog, figures on the line) and Haro-kun the Blob
 * mascot; the crowds on the platforms (queued at the door marks, turning to the train, boarding and alighting, kids
 * waving, staff pointing and flagging at departure, everyone bowing at the finale), the track workers and the people
 * at crossings. Figures draw into the rail view through a cached engine View at k pixels a metre (1 m = 15 units);
 * beyond 60 m they are two-tone silhouettes. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, game = DH.game;
const H = o => new E.Humanoid(Object.assign({ size: 1, weapon: null }, o));
DH.CAST = {
  hoshino: H({ build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#1a2a4a' }, colors: { cloth: '#1e2c4e', coat: '#1a2846', pants: '#1a2440', hair: '#c8c8cc', glove: '#f8f8f4', trim: '#f2c230', skin: '#e0b896', boot: '#1a1a1e' } }),
  mika: H({ outfit: 'coat', sleeves: 'long', hair: 'ponytail', hat: { style: 'cap', color: '#1a2a4a' }, colors: { cloth: '#24365e', coat: '#24365e', pants: '#1e2c4e', hair: '#3a2418', glove: '#f8f8f4', trim: '#f2c230', skin: '#f0c8a8' } }),
  driver: H({ outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#1a2a4a' }, colors: { cloth: '#24365e', coat: '#24365e', pants: '#1e2c4e', hair: '#2a1a12', glove: '#f8f8f4', trim: '#f2c230' } }),
  kota: H({ size: .8, outfit: 'shirt', hair: 'spiky', hat: { style: 'cap', color: '#f8d020' }, colors: { cloth: '#3a8ad8', pants: '#3a3a5a', hair: '#2a1a12', skin: '#f0c8a8' } }),
  fuji: H({ outfit: 'robe', sleeves: 'long', hair: 'long', hunch: .5, colors: { cloth: '#8a4a7a', pants: '#5a2a4a', hair: '#d8d8d8', trim: '#f0c8d8', skin: '#e8c0a0' } }),
  kenji: H({ build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'short', colors: { cloth: '#f0f0f0', coat: '#3a3a44', pants: '#3a3a44', hair: '#1a1a1a', trim: '#c03030', boot: '#1a1a1a' } }),
  ren: H({ build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'spiky', hat: { style: 'cap', color: '#5a2a8a' }, colors: { cloth: '#5a2a8a', coat: '#4a2278', pants: '#2a1a40', hair: '#1a1a1a', trim: '#c8c8d8', glove: '#f8f8f4' } }),
  sato: H({ build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#1a2a4a' }, colors: { cloth: '#1e2c4e', coat: '#1a2846', pants: '#1a2440', hair: '#e8e8e8', glove: '#f8f8f4', skin: '#d8b090' } }),
  ota: H({ build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#2a2a30' }, colors: { cloth: '#5a5a62', coat: '#5a5a62', pants: '#3a3a42', hair: '#7a7a7a', trim: '#d02a2a', glove: '#f8f8f4' } }),
  pa: H({ outfit: 'coat', sleeves: 'long', hair: 'long', colors: { cloth: '#2a5a9a', coat: '#2a5a9a', hair: '#1a1a1a', trim: '#f2c230' } }),
  dispatch: H({ outfit: 'shirt', hair: 'short', colors: { cloth: '#e8e8e0', hair: '#1a1a1a', trim: '#3a8a4a' } })
};
/** Haro-kun: a white blob with a gold halo ring and headlight eyes; DH.drawHaro(g, x, y, scale, t) draws him anywhere */
const HARO = new E.Blob({ R: 7, colors: { dk: '#c8c0b0', base: '#fff8ec', lt: '#ffffff', spec: '#ffffff', eye: '#ffe890', pupil: '#3a2a1a' }, wings: true, feet: true, mouth: true });
DH.HARO = HARO;
const haroView = new E.View('haro', 'Haro', 0, 20, 2, 1);
DH.drawHaro = (g, x, y, scale = 1, t = 0) => {
  const bob = Math.sin(t * 5) * .2; HARO.update(1 / 60, { squash: bob * .3, walk: 0, flap: .6 + Math.sin(t * 3) * .3, look: [Math.sin(t * .7), 0] });
  const v = scale === 1 ? haroView : (DH._haroV && DH._haroV.scale === 2 * scale ? DH._haroV : (DH._haroV = new E.View('haro', 'Haro', 0, 20, 2 * scale, 1)));
  HARO.draw(g, Math.round(x), Math.round(y), v);
  // the halo: a gold ring that spins and glows
  const r = 9 * scale, cy = y - 22 * scale, sp = Math.cos(t * 2.4);
  px.blend(g, .4, 'add', () => { for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; px.dot(g, x + Math.cos(a) * r, cy + Math.sin(a) * r * .32 * (1 + sp * .2), '#f2c230'); } });
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; px.rect(g, x + Math.cos(a) * r, cy + Math.sin(a) * r * .3, Math.max(1, scale), Math.max(1, scale), Math.sin(a) < 0 ? '#c89a20' : '#ffe070'); }
};
DH.portrait = who => who === 'haro' ? ((g, x, y, size) => { E.ui.box(g, x, y, size, size, { bg: ['#3aa0e0', '#1a5a9a'], border: '#f2c230' }); DH.drawHaro(g, x + size / 2, y + size - 6, size / 40, game.real); }) : DH.CAST[who] || null;

/* ---- figures in the rail view ---- */
const views = new Map();
const viewFor = (k, yaw) => { const q = Math.max(1 / 16, Math.round(k / 15 * 16) / 16), key = q + ':' + yaw; let v = views.get(key); if (!v) { if (views.size > 300) views.clear(); v = new E.View('rail', 'Rail', yaw, 6, q, 1); views.set(key, v); } return v; };
DH.viewFor = viewFor;
const LOOKS = {
  commuter: [{ outfit: 'coat', sleeves: 'long', hair: 'short', colors: { coat: '#3a3a44', cloth: '#e8e8e8', pants: '#2a2a32', hair: '#1a1a1a' } }, { outfit: 'coat', sleeves: 'long', hair: 'long', colors: { coat: '#8a6a4a', cloth: '#f0e8d8', pants: '#3a3a44', hair: '#3a2418' } }, { outfit: 'coat', sleeves: 'long', hair: 'short', colors: { coat: '#2a3a5a', cloth: '#d8e0f0', pants: '#1a2030', hair: '#2a1a12' } }],
  student: [{ outfit: 'shirt', sleeves: 'long', hair: 'short', colors: { cloth: '#1a2a4a', pants: '#1a2a4a', hair: '#1a1a1a', trim: '#f2c230' } }, { outfit: 'tunic', sleeves: 'short', hair: 'ponytail', colors: { cloth: '#f0f0f0', pants: '#2a3a6a', hair: '#2a1a12', trim: '#c03030' } }],
  elder: [{ outfit: 'robe', sleeves: 'long', hair: 'short', hunch: .4, colors: { cloth: '#7a7068', pants: '#5a5048', hair: '#d8d8d8' } }],
  kid: [{ size: .7, outfit: 'shirt', hair: 'spiky', hat: { style: 'cap', color: '#e84a3a' }, colors: { cloth: '#f8c030', pants: '#3a5a9a', hair: '#2a1a12' } }, { size: .72, outfit: 'tunic', hair: 'ponytail', colors: { cloth: '#f080a0', pants: '#5a3a6a', hair: '#3a2418' } }],
  yukata: [{ outfit: 'robe', sleeves: 'long', hair: 'ponytail', colors: { cloth: '#3a5ab0', pants: '#2a3a7a', hair: '#1a1a1a', trim: '#f8f0e0', belt: '#e84a3a' } }, { outfit: 'robe', sleeves: 'long', hair: 'long', colors: { cloth: '#e86a8a', pants: '#a03a5a', hair: '#2a1a12', trim: '#fff0d0', belt: '#f2c230' } }],
  staff: [{ outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#1a2a4a' }, colors: { coat: '#24365e', cloth: '#24365e', pants: '#1e2c4e', glove: '#f8f8f4', trim: '#f2c230', hair: '#1a1a1a' } }],
  worker: [{ outfit: 'shirt', sleeves: 'long', hat: { style: 'helmet', color: '#f8f8f0' }, colors: { cloth: '#f87a20', pants: '#3a4a6a', trim: '#e8f040', boot: '#2a2a2a' } }]
};
/** a rig for a look (cached by kind and index) */
const rigOf = (kind, i) => { const L = LOOKS[kind]; return H(Object.assign({}, L[i % L.length])); };
/** a person in the view: { s, x, y (height of what they stand on), kind, i, facing, pose, vx, vy, umbrella, flag, bag } */
function personThing(p) {
  return { kind: 'person', s: p.s, x: p.x, y: p.y || 0, w: .6, h: 1.7, near: 1.4, person: p, draw: drawPerson };
}
function drawPerson(g, sx, sy, k, C, th) {
  const p = th.person, sz = (p.size || 1);
  if (k < .35) return;
  if (k < 4.5) {   // far: a two-tone silhouette
    const h = 1.65 * sz * k, w = Math.max(1, .45 * k), c = C.T(p.col || '#3a3a44'), c2 = C.T('#d8b090');
    px.rect(g, Math.round(sx - w / 2), Math.round(sy - h), Math.max(1, Math.round(w)), Math.max(1, Math.round(h * .8)), c); px.rect(g, Math.round(sx - w / 3), Math.round(sy - h - w * .3), Math.max(1, Math.round(w * .7)), Math.max(1, Math.round(w * .7)), c2);
    if (p.umbrella && k > 1.5) px.rect(g, Math.round(sx - w * 1.4), Math.round(sy - h * 1.15), Math.round(w * 2.8), Math.max(1, Math.round(k * .12)), C.T(p.umbrella));
    return;
  }
  const rig = p.rig, v = viewFor(k, -90 + (C.dir < 0 ? 180 : 0));
  rig.draw(g, Math.round(sx), Math.round(sy), v);
  if (p.umbrella) { const r = .55 * k, ux = sx + .1 * k, uy = sy - 2.05 * k; px.ell(g, ux, uy, r, r * .35, C.T(p.umbrella)); px.ell(g, ux, uy + 1, r * .9, r * .2, C.T(E.tones(p.umbrella).sh)); px.line(g, ux, uy, ux, uy + .7 * k, C.T('#3a3a3a')); }
  if (p.flagUp) { const hx = sx + .25 * k * (C.dir || 1), hy = sy - 2.1 * k; px.line(g, hx, hy, hx, hy - .5 * k, C.T('#5a3a2a')); px.rect(g, hx, hy - .5 * k, .4 * k, .28 * k, C.T(p.flagCol || '#e8402a')); }
  if (p.bag && k > 8) { px.rect(g, sx - .35 * k, sy - .75 * k, .3 * k, .25 * k, C.T('#3a2a1a')); }
  if (p.camera && k > 8) { px.rect(g, sx + .1 * k, sy - 1.45 * k, .2 * k, .14 * k, C.T('#202020')); }
}
DH.personThing = personThing;
/** the crowd for a run: people at each stopping station's door marks, staff at the head end, workers, crossing walkers */
class People {
  constructor(run) {
    this.run = run; this.list = []; this.items = []; this.t = 0; const R = run.R, r = DH.rng('crowd:' + run.id);
    const tod = run.tod, todK = tod < 7 || tod > 22 ? .5 : tod > 16.5 && tod < 19 ? 1.3 : 1, festK = run.stage.festival ? 2 : 1, rain = run.weather === 'rain';
    const kinds = tod > 13 && tod < 17 && run.stage.festival ? ['yukata', 'yukata', 'kid', 'elder', 'student'] : tod < 9 ? ['commuter', 'commuter', 'student', 'student', 'elder'] : tod > 16.5 ? ['commuter', 'commuter', 'commuter', 'student', 'kid'] : ['commuter', 'student', 'elder', 'kid', 'commuter'];
    const umb = ['#e84a3a', '#3a6ad0', '#f8d040', '#e8e8e8', '#3a3a3a', '#5ac080'];
    for (const p of run.stops) {
      const st = p.st, side = st.doors[run.track] === 'R' ? 1 : -1, tx = R.trackX(run.track, st.s0 + st.len / 2) || 0, edge = tx + side * 1.6;
      const crowd = (st.crowd || 1) * todK * festK, n = run.cars;
      for (let c = 0; c < n; c++) for (const dp of DH.DOOR_POS) {
        const ds = p.target - c * (DH.TRAIN_CAR + DH.TRAIN_GAP) - dp, q = Math.min(3, Math.floor(r() * (crowd + 1)));
        for (let j = 0; j < q; j++) {
          const kind = kinds[Math.floor(r() * kinds.length)], i = Math.floor(r() * 3);
          this.add({ s: ds + (r() - .5) * .8, x: edge + side * (.9 + j * .7), y: 1.1, kind, i, home: p, state: 'queue', facing: side > 0 ? -Math.PI / 2 : Math.PI / 2, umbrella: rain ? umb[Math.floor(r() * umb.length)] : null, bag: kind === 'commuter', board: r() < .8, delay: 1.2 + j * 1.6 + r() * 4, col: LOOKS[kind][i % LOOKS[kind].length].colors.coat || LOOKS[kind][i % LOOKS[kind].length].colors.cloth });
        }
      }
      // the platform staff at the head end, and at the terminal the station master
      this.add({ s: p.target + 6, x: edge + side * 1.2, y: 1.1, kind: 'staff', i: 0, home: p, state: 'staff', facing: Math.PI, col: '#24365e' });
      if (st.id === 'akari' && run.stage.finale) for (let k = 0; k < 8; k++) this.add({ s: p.target - 10 - k * 6, x: edge + side * 1.4, y: 1.1, kind: 'staff', i: 0, home: p, state: 'staff', facing: side > 0 ? -Math.PI / 2 : Math.PI / 2, col: '#24365e', finale: true });
      if (st.id === 'hanabatake' && run.id === 'S1') this.add({ s: p.target - 3 * 20 - 7, x: edge + side * 1.2, y: 1.1, kind: 'kid', i: 0, home: p, state: 'fan', facing: Math.PI, rig: DH.CAST.kota, camera: true, col: '#3a8ad8', name: 'kota' });
      if (st.id === 'yuhi' && run.id === 'S3') this.add({ s: p.target - 40, x: edge + side * 1.3, y: 1.1, kind: 'elder', i: 0, home: p, state: 'fuji', facing: side > 0 ? -Math.PI / 2 : Math.PI / 2, rig: DH.CAST.fuji, col: '#8a4a7a', name: 'fuji' });
      if (st.id === 'daigaku' && run.id === 'S4') this.add({ s: p.target - 150, x: edge + side * 3.5, y: 1.1, kind: 'commuter', i: 0, home: p, state: 'kenji', facing: 0, rig: DH.CAST.kenji, col: '#3a3a44', name: 'kenji', bag: true, hidden: true });
      if (st.id === 'akari' && run.stage.finale) this.add({ s: p.target + 2, x: edge + side * 1.2, y: 1.1, kind: 'staff', i: 0, home: p, state: 'staff', facing: Math.PI, rig: DH.CAST.ota, col: '#5a5a62', finale: true, name: 'ota' });
    }
    // track workers (they wave at the horn, bow if we keep under the limit) and people waiting at crossings
    for (const w of R.workers) if (run._inStage(w.s)) { for (const c of w.crew) this.add({ s: run.U(c.s), x: c.x, y: 0, kind: 'worker', i: 0, state: 'worker', facing: c.x < 0 ? Math.PI / 2 : -Math.PI / 2, work: w, col: '#f87a20' }); this.add({ s: run.U(w.lookout), x: -3.2, y: 0, kind: 'worker', i: 0, state: 'lookout', facing: Math.PI, work: w, flagUp: true, flagCol: '#e8402a', col: '#f87a20' }); }
    for (const c of R.crossings) if (run._inStage(c.s)) for (let k = 0; k < (c.peds || 1); k++) this.add({ s: run.U(c.s) + 2 + k * 1.2, x: (k % 2 ? 1 : -1) * (6 + k), y: 0, kind: kinds[k % kinds.length], i: k, state: 'xing', facing: k % 2 ? -Math.PI / 2 : Math.PI / 2, umbrella: rain ? umb[k % umb.length] : null, col: '#4a4a5a' });
  }
  add(p) { p.rig = p.rig || rigOf(p.kind, p.i || 0); p.pose = null; p.vx = 0; p.vy = 0; p.t = 0; this.list.push(p); p.thing = personThing(p); return p; }
  /** per step: who looks where, who boards, who waves and bows */
  update(dt) {
    const run = this.run, d = run.dwell, here = d && !d.done ? d.stop : null; this.t += dt;
    this.acc = (this.acc || 0) + dt; const animate = !game.headless && this.acc >= 1 / 30, adt = this.acc; if (animate) this.acc = 0;
    for (const p of this.list) {
      const dist = p.s - run.s; p.t += dt; let pose = null, walk = 0;
      if (Math.abs(dist) > 420 && p.state !== 'board') { p.far = true; continue; } p.far = false;
      if (p.state === 'queue') {
        if (here === p.home && run.doors > .6 && d.opened && p.board && run.clock >= d.openAt + (p.delay || 0)) { p.state = 'board'; p.bt = 0; }
        else if (dist > 0 && dist < 260 && run.train.v > 1) p.facingT = Math.PI;   // they turn to the train coming in
      }
      if (p.state === 'board') { p.bt += dt; const dirx = -Math.sign(p.x - (run.R.trackX(run.track, p.s) || 0)); if (p.bt > .2) { p.x += dirx * dt * 1.1; walk = 1; p.facingT = dirx > 0 ? -Math.PI / 2 : Math.PI / 2; if (Math.abs(p.x - (run.R.trackX(run.track, p.s) || 0)) < 1.7) { p.state = 'gone'; p.hidden = true; } } }
      if (p.state === 'staff') { if (here === p.home && d.closing) pose = d.pilot ? 'flag' : 'point'; if (p.finale && run.finale) pose = 'bow'; if (here === p.home && d.pilot && !p.finale) p.flagUp = true; else if (!p.finale) p.flagUp = false; }
      if (p.state === 'fan') { pose = dist < 200 && dist > -200 ? 'wave' : null; }
      if (p.state === 'fuji') { if (here === p.home) pose = 'bow'; }
      if (p.state === 'kenji') { if (here === p.home && d.rush && !p.ran) { p.hidden = false; p.ran = true; p.rt = 0; } if (p.ran && p.rt !== undefined) { p.rt += dt; p.s += dt * 6; walk = 1; p.facingT = 0; if (p.rt > 2.4) { p.hidden = true; p.rt = undefined; } } }
      if (p.state === 'worker' || p.state === 'lookout') { const ev = run.events && run.events.workers.find(w => w.src === p.work); const st = ev ? ev.state : 'work'; pose = st === 'wave' ? 'wave' : st === 'bow' ? 'bow' : st === 'look' ? null : (p.state === 'worker' ? 'crouch' : null); if (p.state === 'lookout') { p.flagUp = true; p.flagCol = st === 'look' || st === 'wave' || st === 'bow' ? '#3ac04a' : '#e8402a'; } }
      if (run.finale && p.home && p.home.st.id === 'akari') pose = 'bow';
      if (p.state === 'xing') { const X = run.R.crossings.find(c => Math.abs(run.U(c.s) - p.s) < 15); pose = null; if (X && !X.warn && X.gate >= 1) { p.x += (p.x < 0 ? 1 : -1) * dt * 1.2; walk = 1; if (Math.abs(p.x) < 1) p.x = (p.x < 0 ? 12 : -12); } }
      if (p.kind === 'kid' && p.state === 'queue' && dist < 120 && dist > -60) pose = 'wave';
      const f = p.facingT !== undefined ? p.facingT : p.facing; p.facing = f;
      if (animate && Math.abs(dist) < 300) p.rig.update(adt, { x: 0, y: 0, z: 0, vx: walk ? Math.cos(f) * 40 : 0, vy: walk ? Math.sin(f) * 40 : 0, facing: f, pose });
    }
  }
  /** the people near the camera as dynamic items for the rail renderer */
  itemsNear(s, range = 260) {
    const out = this.items; out.length = 0;
    for (const p of this.list) { if (p.hidden || p.state === 'gone') continue; const d = p.s - s; if (d > -40 && d < range) { const th = p.thing; th.s = p.s; th.x = p.x; th.y = p.y; out.push(th); } }
    return out;
  }
}
DH.People = People;
})();
