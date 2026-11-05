/* VIEW: the Presenter. One World3D per floor; mirrors the sim every frame; turns events into effects. */
B.rigFor = (m) => {
  const E = My3D2dge, race = m.race, L = (B.LOOKS[race] || B.LOOKS.human)[(m.look || 0) % 6], a = m.appearance || {};
  const hat = { fighter: { style: 'helmet', color: '#8a92a0' }, paladin: { style: 'helmet', color: '#c8c8d8' }, cleric: 'band', mage: 'pointed', thief: null, ranger: null }[m.cls];
  const o = { size: race === 'halfling' ? 1.05 : race === 'dwarf' ? 1.15 : 1.3, build: race === 'dwarf' ? 'bulky' : race === 'halfling' ? 'chibi' : 'heroic', hat: a.hat === 'helmet' ? { style: 'helmet', color: '#9a9aa8' } : hat, hood: m.cls === 'thief' || a.hat === 'hood',
    hair: a.hair && a.hair !== 'bald' ? a.hair : (m.sex === 'f' ? 'long' : undefined), weapon: m.cls === 'mage' ? null : undefined,
    colors: { skin: a.skin || L.skin, hair: a.hairc || L.hair, cloth: a.cloth || L.cloth, pants: '#3a3440', hat: L.cloth, metal: '#b8c0cc' }, speedRef: 60 };
  return new E.Humanoid(o);
};
B.monLook = {
  rat: { b: { R: 3.6, ears: 'cat', tail: true, feet: true, mouth: 'fangs', colors: { base: '#6a5a50', dk: '#3e342e', lt: '#9a8a7a', eye: '#ff6a4a' } } },
  ratknot: { b: { R: 7, ears: 'cat', tail: true, feet: true, mouth: 'fangs', colors: { base: '#6a5a50', dk: '#3e342e', lt: '#9a8a7a', eye: '#ff6a4a' } } },
  leech: { b: { R: 4.4, mouth: true, colors: { base: '#b89a9a', dk: '#7a5a5a', lt: '#e0c0c0' } } },
  ooze: { b: { R: 8, face: 'front', mouth: true, colors: { base: '#5a8a3a', dk: '#2e5a22', lt: '#9ad06a', spec: '#e8ffd0' } } },
  rustling: { b: { R: 4.2, horns: true, feet: true, mouth: true, colors: { base: '#b8642a', dk: '#7a3a18', lt: '#e8a060' } } },
  spider: { b: { R: 4.4, feet: true, mouth: 'fangs', colors: { base: '#b8923a', dk: '#7a5a1a', lt: '#e8c870', eye: '#ff3a3a' } } },
  hound: { b: { R: 5, ears: 'cat', feet: true, tail: true, mouth: 'fangs', colors: { base: '#c8b8b0', dk: '#8a7a74', lt: '#e8dcd4', eye: '#c8b8b0' } } },
  latchkin: { h: { size: .85, build: 'chibi', hood: true, outfit: 'tunic', bladeLen: 5, eyeGlow: '#ffd24a', colors: { skin: '#7a8a5a', hair: '#4a3a2a', cloth: '#6a4a32', pants: '#3a2e22', metal: '#9a9aa8' } } },
  snick: { h: { size: 1.1, build: 'bulky', hat: { style: 'crown', color: '#c8a040' }, armor: true, outfit: 'coat', bladeLen: 9, eyeGlow: '#ffd24a', colors: { skin: '#7a8a5a', cloth: '#5a3a2a', plate: '#a08040' } } },
  skeleton: { h: { size: 1.2, build: 'skeleton', outfit: 'coat', bladeLen: 7, colors: { bone: '#d8cfb4', cloth: '#5a4030', metal: '#8a8a90' } } },
  sentinel: { h: { size: 1.6, build: 'bulky', armor: true, hat: { style: 'helmet', color: '#8a6a3a' }, bladeLen: 14, eyeGlow: '#ff8a3a', colors: { cloth: '#6a4a2a', plate: '#b08a4a', metal: '#c8a868', skin: '#5a4a3a' } } },
  seer: { h: { size: 1.25, build: 'heroic', outfit: 'robe', hood: true, weapon: 'staff', eyeGlow: '#8ae0ff', colors: { cloth: '#d8d0e8', hair: '#3a2a4a', skin: '#b8b0c8', trim: '#6a4a9a' } } },
  warden: { h: { size: 1.35, build: 'heroic', armor: true, hat: { style: 'helmet', color: '#2a2434' }, weapon: 'staff', eyeGlow: '#e8e8ff', colors: { cloth: '#2a2434', plate: '#4a4458', metal: '#9a98a8', skin: '#b8b0c8' } } },
  golem: { h: { size: 1.9, build: 'bulky', armor: true, weapon: null, eyeGlow: '#7ad8ff', colors: { cloth: '#3a3e46', plate: '#5a606a', skin: '#4a4e56' } } },
  gazer: { o: { color: '#e8a040', r: 4 } }
};
B.MONSIZE = { rat: .5, leech: .6, latchkin: .8, ooze: 1, snick: 1, skeleton: 1, rustling: .6, spider: .6, sentinel: 1.4, hound: .7, seer: 1, warden: 1, gazer: .5, golem: 1.5 };
B.View = (() => {
  const E = typeof My3D2dge !== 'undefined' ? My3D2dge : null, W3 = E && E.World3D, PI = Math.PI, C = 32, EYE = 25;
  const mid = c => c * C + C / 2, YAW = d => -PI / 2 + d * PI / 2;
  const V = { game: null, worlds: {}, cur: null, curId: null, hero: null, lamp: null, fx: [], swings: [], hot: [], hover: null, shake: 0, pop: null, fall: 0, fadeT: 0, lastEv: 0, active: false };
  const lerp = (a, b, t) => a + (b - a) * t, approach = (a, b, s) => a < b ? Math.min(b, a + s) : Math.max(b, a - s), clamp = B.clamp;
  const OPEN = d => '..'; 
  V.levelFor = (def) => {
    const rows = [];
    const wallAt = (x, y) => B.chAt(def.id, x, y) === '#';
    const niche = {}; // wall cell key -> tile index for the torch
    for (const f of def.features) if (f.k === 'torch') { const d = B.DIRS.indexOf(f.at[2]), wx = f.at[0] + B.DX[d], wy = f.at[1] + B.DY[d]; niche[B.key(wx, wy)] = (d + 2) % 4; }
    const NICHE = [['t#', '##'], ['#t', '##'], ['##', 't#'], ['t#', '##']];
    for (let y = 0; y < def.h; y++) for (let k = 0; k < 2; k++) { let row = ''; for (let x = 0; x < def.w; x++) { const c = def.rows[y][x]; if (c === '#') { const n = niche[B.key(x, y)]; row += n != null ? NICHE[n][k] : '##'; } else row += '..'; } rows.push(row); }
    const L = def.look; return { rows, ground: L.ground, colors: L.colors, side: L.side, color: L.color, legend: {} };
  };
  V.build = (game, only) => {
    V.game = game; if (!W3) return;
    for (const id of (only || [...B.ORDER, 'rr'])) { const def = B.FLOORS[id], L = def.look;
      const w = new W3(game, { level: V.levelFor(def), torchLights: id === 'rr' ? 4 : 6, torchShadows: 2, torchPower: 18, torchReach: 150, torchColor: '#ffb070', lights: 2, glowLights: 4, ambient: L.amb, fog: { color: L.fog, near: L.near, far: L.far }, sky: L.fog, camera: { mode: 'fixed' }, overlay: { fov: 62 }, look: 'card', res: 'pixels', onDraw: ww => V.onDraw(ww, id) });
      w.__id = id; w.__lamp = w.light({ color: '#ffd8a0', reach: 190, power: 10 }); w.__fxl = w.light({ color: '#ffffff', reach: 120, power: 0 }); V.worlds[id] = w; }
  };
  V.prepareAll = () => { for (const k in V.worlds) try { V.worlds[k].prepare(); } catch (e) { console.warn('prepare', k, e); } };
  /** switch to a floor and (re)populate it from the sim */
  V.enter = (id) => {
    if (!W3) return; const w = V.worlds[id]; if (!w) return; V.cur = w; V.curId = id; w.reset(); V.fx.length = 0; V.swings.length = 0;
    const def = B.FLOORS[id], F = B.S.floors[id], p = B.S.party, L = def.look;
    V.hero = w.hero({ x: mid(p.cx), y: mid(p.cy), r: 4, visible: false }); w.camera.follow(V.hero); w.camera.set('fixed');
    V.lamp = w.__lamp; V.fxLight = w.__fxl;
    V.things = { doors: {}, feat: {}, secrets: {}, stairs: [], misc: [] }; V.mobs = {}; V.npcs = {}; V.prop = {};
    for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) {
      const c = def.rows[y][x], k = B.key(x, y), X = mid(x), Y = mid(y), ns = B.chAt(id, x - 1, y) === '#' && B.chAt(id, x + 1, y) === '#', yaw = ns ? 0 : PI / 2;
      if (c === '+' || c === 'L') V.things.doors[k] = { t: w.thing('door', X, Y, 0, { yaw, w: 32, h: 46, swing: true, color: c === 'L' ? '#4a4a58' : '#6a4a2e', frame: c === 'L' ? '#3a3a48' : '#5a4a3a', locked: c === 'L' ? (def.locks[k] || {}).key : null }), kind: 'door', open: 0 };
      else if (c === 'M') V.things.doors[k] = { t: w.thing('door', X, Y, 0, { yaw, w: 32, h: 46, color: '#3a2a5a', frame: '#5a4a8a', locked: 'seal' }), kind: 'seal', open: 0 };
      else if (c === '=') V.things.doors[k] = { t: w.thing('door', X, Y, 0, { yaw, w: 32, h: 46, color: id === 'f3' ? '#33303c' : '#26242c', frame: '#3a3444' }), kind: 'gate', open: 0, gid: def.gates[k] };
      else if (c === 'H' || c === 'I') { const bx = w.box({ x: X, y: Y, z: 0, w: 31.5, d: 31.5, h: 48, color: def.look.color, side: def.look.side, fixed: true }); V.things.secrets[k] = { box: bx, kind: c, sunk: 0 }; }
      else if (c === 'P') V.things.misc.push({ k: 'plate', key: k, t: w.thing('plateB', X, Y, 0, { color: '#6e6878' }) });
      else if (c === 'O') V.things.misc.push({ k: 'pit', t: w.thing('pitHole', X, Y, 0, {}) });
      else if (c === '^' && !(def.tele[k] || {}).silent) V.things.misc.push({ k: 'tele', t: w.thing('telefield', X, Y, 0, {}) });
      else if (c === '>' || c === '<') { const st = def.stairs[k]; const dir = B.DIRS.map((_, d) => d).find(d => B.chAt(id, x + B.DX[d], y + B.DY[d]) === '#' && B.chAt(id, x - B.DX[d], y - B.DY[d]) !== '#'); const dd = dir == null ? 0 : dir; V.things.stairs.push({ t: w.thing(c === '>' ? 'stairDown' : 'stairUp', X + B.DX[dd] * 12, Y + B.DY[dd] * 12, 0, { yaw: Math.atan2(-B.DY[dd], -B.DX[dd]) - PI / 2 }) }); }
    }
    for (const ft of def.features) {
      if (ft.k === 'torch') continue; const d = B.DIRS.indexOf(ft.at[2]), o = (d + 2) % 4, X = mid(ft.at[0]) + B.DX[d] * 15.8, Y = mid(ft.at[1]) + B.DY[d] * 15.8, yaw = Math.atan2(B.DY[o], B.DX[o]) - PI / 2;
      const kind = { lever: 'wallLever', button: 'wallButton', catch: 'catchStone', alcove: 'alcove', plaque: 'plaque', candle: 'candle', clock: 'clock', undergate: 'undergate', greatLock: 'greatLock', shrine: 'shrine' }[ft.k];
      const th = w.thing(kind, X, Y, 0, { yaw, n: ft.n }); V.things.feat[ft.id || ft.at.join(',')] = { t: th, ft };
    }
    // monsters, npcs
    V.syncMobs(true);
    V.snapAll();
  };
  V.makeMob = (m) => {
    const w = V.cur, look = B.monLook[m.type] || {}, X = mid(m.cx), Y = mid(m.cy); let e;
    if (m.type === 'boltholder') return null;
    if (look.b) e = w.mob({ x: X, y: Y, r: 5, half: 0, mass: 1, blob: new E.Blob(look.b) });
    else if (look.o) e = w.mob({ x: X, y: Y, z: 18, r: 4, half: 0, fly: true, orb: look.o });
    else e = w.mob({ x: X, y: Y, r: B.MONS[m.type].size >= 4 ? 8 : 4.5, half: B.MONS[m.type].size >= 4 ? 12 : 8, mass: 2, rig: new E.Humanoid(Object.assign({ speedRef: 45 }, look.h || {})) });
    if (m.type === 'spider' || m.type === 'leech' || m.type === 'hound' || m.type === 'ratknot') e.visible = false;
    e.data.mon = m; e.data.t = 0; V.mobs[m.id] = e; return e;
  };
  V.syncMobs = (snap) => {
    const F = B.F(), w = V.cur; if (!w) return;
    for (const m of F.mons) { if (!V.mobs[m.id] && m.type !== 'boltholder' && !m._gone) V.makeMob(m); }
    for (const n of F.npcs || []) { if (!V.npcs[n.id] && !n.gone) { const nd = B.NPCS[n.id]; const rig = new E.Humanoid({ size: n.id === 'durgan' ? 1.2 : 1.1, build: n.id === 'durgan' ? 'bulky' : 'heroic', hat: nd.look.hat === 'helmet' ? { style: 'helmet', color: '#8a8a98' } : undefined, hood: nd.look.hat === 'hood', hair: nd.look.hair === 'ponytail' ? 'long' : undefined, colors: { skin: nd.look.skin, hair: nd.look.hairc, cloth: nd.look.cloth, pants: '#3a3440' } }); V.npcs[n.id] = w.mob({ x: mid(n.cx), y: mid(n.cy), r: 4, half: 8, mass: 20, rig }); V.npcs[n.id].data.npc = n; } else if (V.npcs[n.id] && n.gone) { w.remove(V.npcs[n.id]); delete V.npcs[n.id]; } }
  };
  V.snapAll = () => {
    const S = B.S, F = B.F();
    for (const k in V.things.doors) { const d = V.things.doors[k], [x, y] = k.split(',').map(Number); d.open = V.doorTarget(d, k); d.t.open = d.open; }
    for (const k in V.things.secrets) { const s = V.things.secrets[k]; if (F.secrets[k]) { w_remove(s); s.sunk = 1; } }
    function w_remove(s) { if (s.box && !s.gone) { V.cur.remove(s.box); s.gone = true; } }
    V.stateFeat(0, true);
  };
  V.doorTarget = (d, k) => { const F = B.F(); if (d.kind === 'gate') return F.gates[d.gid] ? 1 : 0; const ds = F.doors[k]; return ds && ds.open ? 1 : 0; };
  V.stateFeat = (dt, snap) => {
    const F = B.F(), S = B.S;
    for (const id in V.things.feat) { const { t, ft } = V.things.feat[id], st = F.fs[ft.id || ft.at.join(',')] || {};
      t.t = (t.t || 0) + dt;
      if (ft.k === 'lever') t.on = !!st.on; else if (ft.k === 'catch') { t.done = !!st.done; t.glint = B.seeing() && !st.done; } else if (ft.k === 'alcove') t.held = (F.alcoves[ft.id] || []).map(r => r.id);
      else if (ft.k === 'candle') t.lit = !!st.lit; else if (ft.k === 'clock') { t.n = (F.fs.clock || {}).n || 0; t.whole = !!(F.fs.clock || {}).whole; } else if (ft.k === 'undergate') t.got = (F.fs.ug || {}).n || 0;
      else if (ft.k === 'greatLock') { const b = S.boss; t.done = !!(b && b.locks[ft.id]); const act = S.lockAct && S.lockAct.id === ft.id; t.rot = (t.rot || 0) + dt * (act ? 5 : 0); } else if (ft.k === 'shrine') t.used = !!st.used; }
    for (const m of V.things.misc) { if (m.k === 'plate') m.t.on = !!(F.plates[(B.def().plates[m.key] || {}).id] || {}).down; }
  };
  /* ---------- per frame ---------- */
  V.update = (dt) => {
    if (!V.cur || !B.S) return; const S = B.S, p = S.party, w = V.cur, F = B.F();
    if (V.curId !== S.floor) V.enter(S.floor);
    V.syncMobs(); V.stateFeat(dt);
    // camera
    const tw = p.tween; let x = mid(p.cx), y = mid(p.cy), yaw = YAW(p.dir), z = EYE, bobk = 0;
    if (tw) { const u = tw.dur > 0 ? clamp(tw.t / tw.dur, 0, 1) : 1, s = u * u * (3 - 2 * u); x = lerp(mid(tw.from[0]), mid(tw.to[0]), s); y = lerp(mid(tw.from[1]), mid(tw.to[1]), s); const a0 = YAW(tw.from[2]); let da = YAW(tw.to[2]) - a0; da = Math.atan2(Math.sin(da), Math.cos(da)); yaw = a0 + da * s; if (tw.kind === 'step' && B.opt.bob !== false && !V.game.reduceMotion) z += Math.sin(s * PI) * -.8; }
    const bump = Math.sin(Math.min(1, p.bump) * PI) * 4; x += Math.cos(yaw) * bump; y += Math.sin(yaw) * bump;
    if (p.fall > 0) z += 40 * p.fall * p.fall;
    if (V.pop) { /* reserved */ }
    V.hero.place(x, y, 0);
    w.camera.fixed = { x: x - Math.cos(yaw) * 4, y: y - Math.sin(yaw) * 4, z, yaw, pitch: -.04, fov: 74 };
    if (V.camOverride) V.camOverride(w);
    V.camPos = { x, y, yaw }; V.lamp.x = x; V.lamp.y = y; V.lamp.z = EYE + 4; V.lamp.on = true; V.lamp.power = 10 * (.92 + Math.sin(S.time * 7) * .04 + Math.sin(S.time * 3.1) * .03);
    // doors
    for (const k in V.things.doors) { const d = V.things.doors[k], tgt = V.doorTarget(d, k); d.open = approach(d.open, tgt, dt * (d.kind === 'gate' ? 1.1 : 2.2)); d.t.open = d.open; }
    for (const k in V.things.secrets) { const s = V.things.secrets[k]; if (F.secrets[k] && !s.gone) { s.sunk = Math.min(1, s.sunk + dt / 1.2); if (s.sunk >= 1) { w.remove(s.box); s.gone = true; } } }
    // mobs
    V.stepMobs(dt, x, y);
    V.hotspots(w);
    for (let i = V.fx.length - 1; i >= 0; i--) { V.fx[i].t += dt; if (V.fx[i].t > V.fx[i].dur) V.fx.splice(i, 1); }
    for (let i = V.swings.length - 1; i >= 0; i--) { V.swings[i].t += dt; if (V.swings[i].t > V.swings[i].dur) V.swings.splice(i, 1); }
    V.fxLight.power = 0; for (const f of V.fx) if (f.light) { V.fxLight.x = f.x; V.fxLight.y = f.y; V.fxLight.z = 18; V.fxLight.color = f.col; V.fxLight.power = 14 * (1 - f.t / f.dur); V.fxLight.on = true; }
    w.step(dt);
  };
  V.stepMobs = (dt, cx, cy) => {
    const S = B.S, F = B.F(), p = S.party, w = V.cur;
    for (const id in V.mobs) {
      const e = V.mobs[id], m = e.data.mon, t = B.MONS[m.type], look = B.monLook[m.type] || {}, sz = t.size;
      if (m.hp <= 0) { e.vx = e.vy = 0; e.anim = e.rig ? { pose: 'die' } : e.blob ? { squash: -.45, squint: true } : null; if (m.type === 'gazer') { e.fade = Math.max(0, 1 - m.dieT * 1.5); e.vz = -10; } if (m.dieT > 1.2) e.sink = (e.sink || 0) + dt * 12; if (m.dieT > 2.6) { w.remove(e); delete V.mobs[id]; m._gone = true; } continue; }
      // target position: glide from (fx,fy) to (cx,cy); slot offsets
      const u = m.mdur > 0 ? 1 - m.mt / m.mdur : 1, off = sz >= 4 ? [0, 0] : sz >= 2 ? [(m.slot & 1) ? 6 : -6, 0] : [(m.slot & 1) ? 7 : -7, (m.slot & 2) ? 7 : -7];
      const tx = lerp(mid(m.fx), mid(m.cx), u) + off[0], ty = lerp(mid(m.fy), mid(m.cy), u) + off[1];
      const dx = tx - e.x, dy = ty - e.y; if (Math.hypot(dx, dy) > 40) e.place(tx, ty, e.z); else { e.vx = clamp(dx * 10, -90, 90); e.vy = clamp(dy * 10, -90, 90); }
      e.facing = Math.atan2(cy - e.y, cx - e.x);
      if (t.fly) e.vz = (18 + Math.sin(S.time * 3 + m.cx) * 2 - e.z) * 5;
      const winding = m.state === 'wind', wu = winding ? clamp(1 - m.timer / Math.max(.05, t.wind * B.T.wind / .5), 0, 1) : 0, striking = m.strikeT > 0; if (m.strikeT > 0) m.strikeT -= dt;
      e.flash = m.hurtT > 0 ? .15 : 0;
      if (e.rig) e.anim = { attack: winding ? { spec: { a0: 1.5, a1: -1.5, z0: 14, z1: 6, reach: 8 }, phase: 'wind', u: wu } : striking ? { spec: { a0: 1.5, a1: -1.5, z0: 14, z1: 6, reach: 8 }, phase: 'active', u: 1 - m.strikeT / .25 } : null, hurt: m.hurtT > 0, expr: winding ? 'angry' : m.state === 'asleep' ? null : null, pose: m.state === 'asleep' ? 'crouch' : null };
      else if (e.blob) e.anim = { squash: winding ? -.4 * wu : striking ? .3 : (m.state === 'asleep' ? -.25 : Math.sin(S.time * 4 + m.cx) * .06), look: [Math.cos(e.facing), Math.sin(e.facing)], squint: m.state === 'asleep' };
    }
    for (const id in V.npcs) { const e = V.npcs[id], n = e.data.npc; e.facing = Math.atan2(cy - e.y, cx - e.x); e.anim = { expr: 'smile' }; }
  };
  /* ---------- hotspots (mouse) ---------- */
  V.hotspots = (w) => {
    const S = B.S, p = S.party, F = B.F(); V.hot = []; if (S.camp || S.over) return;
    const add = (wx, wy, wz, label, act) => { const sp = w.project(wx, wy, wz); if (sp) V.hot.push({ x: sp[0], y: sp[1], label, act }); };
    const [fx, fy] = B.front(), ft = B.featureAt(p.cx, p.cy, p.dir);
    if (ft && ft.k !== 'torch') { const d = p.dir; add(mid(p.cx) + B.DX[d] * 15, mid(p.cy) + B.DY[d] * 15, 22, { lever: 'Lever - click to pull', button: 'Button - click to press', catch: 'Loose stone - click', plaque: 'Inscription - click to read', alcove: 'Niche - click to take or place', candle: 'Candle - click to light', clock: 'Clock - click to wind', undergate: 'Undergate', greatLock: 'Great Lock - click to turn', shrine: 'Shrine' }[ft.k] || 'Use', 'use'); }
    const c = B.cell(fx, fy); if (c === '+' || c === 'L' || c === 'M') { const ds = F.doors[B.key(fx, fy)]; add(mid(fx), mid(fy), 22, ds.open ? 'Door - click to close' : ds.locked ? 'Locked - click to unlock' : 'Door - click to open', 'use'); }
    for (const k of [B.key(fx, fy), B.key(p.cx, p.cy)]) { const arr = F.items[k]; if (arr && arr.length) { const [x, y] = k.split(',').map(Number); add(mid(x), mid(y), 3, B.ITEMS[arr[arr.length - 1].id].n + ' - click to take', 'use'); } }
    for (const n of F.npcs || []) if (!n.gone && Math.abs(n.cx - p.cx) + Math.abs(n.cy - p.cy) <= 2) add(mid(n.cx), mid(n.cy), 24, B.NPCS[n.id].name + ' - click to talk', 'use');
    for (const m of B.targetsFront(false)) { const e = V.mobs[m.id]; if (e) add(e.x, e.y, 14, B.MONS[m.type].n, 'strike'); }
  };
  V.pickAt = (sx, sy) => { let best = null, bd = 18 * 18; for (const h of V.hot) { const d = (h.x - sx) ** 2 + (h.y - sy) ** 2; if (d < bd) { bd = d; best = h; } } return best; };
  /* ---------- events -> effects ---------- */
  V.event = (e) => {
    if (!V.cur || !B.S) return; const P = V.game.particles, S = B.S, p = S.party;
    const mpos = (x, y, z) => [mid(x), mid(y), z || 14];
    switch (e.t) {
      case 'mhit': { const [x, y, z] = mpos(e.x, e.y, 14); const en = Object.values(V.mobs).find(o => o.data.mon.id === e.id); const px = en ? en.x : x, py = en ? en.y : y; P.sparks(px, py, z, e.crit ? 14 : 7, Math.atan2(V.camPos.y - py, V.camPos.x - px)); P.text(px, py, z + 14, e.dmg + (e.crit ? '!' : ''), e.crit ? '#ffe070' : '#fff2c4'); break; }
      case 'mdie': { const en = Object.values(V.mobs).find(o => o.data.mon.id === e.id); if (en) P.dust && P.dust(en.x, en.y, 4, 8, '#8a7a6a'); break; }
      case 'windup': break;
      case 'mattack': { const en = Object.values(V.mobs).find(o => o.data.mon.id === e.id); if (en) en.data.mon.strikeT = .25; break; }
      case 'swingfx': V.swings.push({ t: 0, dur: .3, m: e.m, h: e.h, cat: e.cat, it: e.it, side: (p.formation.indexOf(e.m) & 1) ? 1 : -1 }); break;
      case 'shoot': V.swings.push({ t: 0, dur: .3, m: e.m, cat: e.kind === 'bolt' ? 'xbow' : e.kind === 'arrow' ? 'bow' : 'toss', side: (p.formation.indexOf(e.m) & 1) ? 1 : -1 }); break;
      case 'cast': V.swings.push({ t: 0, dur: .5, m: e.m, cat: 'cast', col: e.col, side: (p.formation.indexOf(e.m) & 1) ? 1 : -1 }); V.fx.push({ k: 'castGlow', t: 0, dur: .4, x: V.camPos.x + Math.cos(V.camPos.yaw) * 16, y: V.camPos.y + Math.sin(V.camPos.yaw) * 16, col: e.col, light: true }); break;
      case 'orbBlast': V.fx.push({ k: 'orb', t: 0, dur: .6, x: mid(e.x), y: mid(e.y), col: e.col, light: true }); P.fire && P.fire(mid(e.x), mid(e.y), 8, 20); break;
      case 'spellFront': { const [fx, fy] = B.front(); V.fx.push({ k: 'orb', t: 0, dur: .5, x: mid(fx), y: mid(fy), col: e.col, light: true }); break; }
      case 'lightningLine': V.fx.push({ k: 'line', t: 0, dur: .4, cells: e.cells, col: e.col, light: false }); break;
      case 'projEnd': P.sparks(mid(e.x), mid(e.y), 16, 5, null, e.col ? { color: e.col } : undefined); break;
      case 'hurt': V.game.shake(2); break;
      case 'bossChain': V.fx.push({ k: 'chain', t: 0, dur: .35, to: e.to, col: '#7af0ff', light: true, x: mid(e.to[0]), y: mid(e.to[1]) }); V.game.shake(4); V.game.flash('#aef4ff', .1, .5); break;
      case 'bossRain': for (const c of e.cells) V.fx.push({ k: 'rain', t: 0, dur: .45, x: mid(c[0]), y: mid(c[1]) }); V.game.shake(4); break;
      case 'bossSlam': V.game.shake(6); break;
      case 'bossDie': V.game.flash('#fff0c0', .4, 1); V.game.shake(8); V.fx.push({ k: 'bossDie', t: 0, dur: 2.5 }); break;
      case 'secretFound': V.game.flash('#bff8ff', .1, .4); break;
      case 'deed': V.game.flash('#ffe8a0', .2, .6); break;
      case 'levelup': break;
    }
  };
  /* ---------- 3D drawing each frame (world's onDraw) ---------- */
  V.onDraw = (w, id) => {
    if (w !== V.cur || !B.S) return; const S = B.S, F = B.F(), def = B.def(), pen = w.pen, p = S.party, L = def.look;
    pen.at().box(w.width / 2, w.depth / 2, 50, w.width, w.depth, 4, L.fog === '#06080a' ? '#1a1e1c' : '#1c1a22');
    // floor items within reach of the view
    for (const k in F.items) { const arr = F.items[k]; if (!arr.length) continue; const [x, y] = k.split(',').map(Number); if (Math.abs(x - p.cx) + Math.abs(y - p.cy) > 7) continue; if (!F.seen[y * def.w + x]) continue; const offs = [[-8, -8], [8, -8], [-8, 8], [8, 8]];
      arr.slice(-4).forEach((r, i) => { const q = pen.at(mid(x) + offs[i][0], mid(y) + offs[i][1], 0.6, 0, 1); B.drawItemModel(q, r.id, 0, 0, 1.2, 7); }); if (arr.length > 4) pen.at(mid(x), mid(y), 0).ball(0, 0, 2, 5, 5, 2.2, '#6a5a48'); }
    // projectiles
    for (const q of S.proj) { const u = clamp(q.t, 0, 1), px = lerp(mid(q.fx), mid(q.cx), u), py = lerp(mid(q.fy), mid(q.cy), u); if (q.kind === 'spark' || q.kind === 'bolt') w.glow(px, py, EYE - 6, 3, q.col || '#ffb14a', { light: true }); else pen.at(px, py, EYE - 8).tube(0, 0, 0, -Math.cos(Math.atan2(q.dy, q.dx)) * 5, -Math.sin(Math.atan2(q.dy, q.dx)) * 5, 0, .6, q.col || '#e8d8a0'); }
    for (const id in V.mobs) { const e = V.mobs[id], m = e.data.mon; if (m.hp <= 0 && m.dieT > 1.5) continue; const T = S.time, sink = m.hp <= 0 ? Math.min(3, m.dieT * 3) : 0;
      if (m.type === 'spider') { const q = pen.at(e.x, e.y, 0 - sink, e.facing); q.ball(0, 0, 5, 5, 4, 3.4, '#b8923a').ball(4.5, 0, 5.2, 3.2, 2.8, 2.6, '#a07c2a').glow(6.5, 1.2, 6.2, .5, '#ff3a3a').glow(6.5, -1.2, 6.2, .5, '#ff3a3a');
        for (let i = 0; i < 8; i++) { const side = i < 4 ? 1 : -1, k = i % 4, ph = Math.sin(T * 9 + k * 1.6 + (side > 0 ? 0 : 3.1)) * (m.hp > 0 ? 1 : 0), bx = 3 - k * 2, a0 = side * (3 + k * .4); q.tube(bx, side * 3, 5, bx + 1.5 - k * .5, side * 8, 7 + Math.max(0, ph) * 2, .5, '#8a6a20').tube(bx + 1.5 - k * .5, side * 8, 7 + Math.max(0, ph) * 2, bx + 2.5 - k, side * 10.5, 0, .45, '#6a4a14'); } }
      else if (m.type === 'hound') { const q = pen.at(e.x, e.y, 0 - sink, e.facing), run = m.hp > 0 ? Math.sin(T * 12) : 0, c = '#c8b8b0'; q.ball(0, 0, 6.5, 6.5, 2.8, 2.6, c).ball(7, 0, 8.6, 3.2, 2, 2, '#d8cac2').tube(8, 0, 8, 12.5, 0, 7.4, 1.3, '#d8cac2').tube(-6, 0, 7, -10, 0, 9 + run, .5, c);
        for (const [lx, ly, ph] of [[4, 2, 0], [4, -2, 3.1], [-4, 2, 3.1], [-4, -2, 0]]) { const sw = Math.sin(T * 12 + ph) * 2 * (m.hp > 0 ? 1 : 0); q.tube(lx, ly, 6, lx + sw, ly, 0, .6, c); } }
      else if (m.type === 'ratknot') { const q = pen.at(e.x, e.y, 0 - sink, T * .6); for (let i = 0; i < 6; i++) { const a = i * 1.047, wob = Math.sin(T * 5 + i) * .8; q.ball(Math.cos(a) * 4.5, Math.sin(a) * 4.5, 3.2 + wob, 3, 2.4, 2.4, i % 2 ? '#6a5a50' : '#7a6a5e').cone(Math.cos(a) * 6.5, Math.sin(a) * 6.5, 5, Math.cos(a) * 7.5, Math.sin(a) * 7.5, 6.8, .8, '#8a7a6a'); q.tube(Math.cos(a) * 3, Math.sin(a) * 3, 2, Math.cos(a + 2.4) * 1, Math.sin(a + 2.4) * 1, 3.5, .35, '#b08a80'); } }
      else if (m.type === 'leech') { const q = pen.at(e.x, e.y, 0 - sink, e.facing); for (let i = 0; i < 5; i++) { const r = 4 - i * .3, wob = Math.sin(T * 4 + i * 1.1) * 1.8; q.ball(-i * 4.2 + 6, wob, 2.4 + r * .5, r, r, r * .8, i % 2 ? '#b89a9a' : '#a08080'); } q.ball(7, 0, 2.6, 2.2, 2.2, 1.8, '#7a5a5a').glow(8, 1, 3.6, .4, '#fff'); } }
    // secret/illusory blocks sinking
    for (const k in (V.things ? V.things.secrets : {})) { const s = V.things.secrets[k]; if (s.kind === 'H' && s.sunk > 0 && !s.gone) { const [x, y] = k.split(',').map(Number); pen.at().box(mid(x), mid(y), 24 - s.sunk * 50, 31.5, 31.5, 48, L.color); } }
    // effects
    for (const f of V.fx) {
      const u = f.t / f.dur;
      if (f.k === 'orb') { pen.at(); w.glow(f.x, f.y, 14, 10 * (1 - u * .5), f.col, { light: false }); for (let i = 0; i < 6; i++) { const a = i * 1.05 + f.t * 6; w.glow(f.x + Math.cos(a) * 12 * u, f.y + Math.sin(a) * 12 * u, 10 + 10 * u, 3 * (1 - u), f.col); } }
      else if (f.k === 'line') { for (const c of f.cells) { const a = mid(c[0]) + (Math.sin(f.t * 60 + c[0]) * 3), b = mid(c[1]) + Math.cos(f.t * 50 + c[1]) * 3; pen.at().bar(a, b, 14 + Math.sin(c[0] * 3 + f.t * 40) * 4, mid(c[0]) + B.DX[p.dir] * 16, mid(c[1]) + B.DY[p.dir] * 16, 14 - Math.sin(f.t * 30) * 4, 1.6 * (1 - u), .8, f.col); } }
      else if (f.k === 'chain') { const b = S.boss; if (b) { const x0 = mid(b.cx), y0 = mid(b.cy); const n = 10; let px = x0, py = y0, pz = 24; for (let i = 1; i <= n; i++) { const t = i / n, nx = lerp(x0, f.x, t) + (Math.sin(i * 7 + f.t * 90) * 4), ny = lerp(y0, f.y, t) + (Math.cos(i * 5 + f.t * 80) * 4), nz = 24 + Math.sin(i * 3 + f.t * 70) * 5; pen.at().bar(px, py, pz, nx, ny, nz, 2 * (1 - u), 1, '#aef4ff'); px = nx; py = ny; pz = nz; } } }
      else if (f.k === 'rain') { const h = (1 - u) * 60; pen.at().bar(f.x, f.y, 6 + h, f.x, f.y, 0, 4, 4, '#555a68'); w.glow(f.x, f.y, 4, 5 * (1 - u), '#ffcf70'); }
    }
    // boss telegraphs and the boss itself
    if (S.boss && S.floor === 'f4') V.drawBoss(w, pen);
    // first-person hands
    if (w.overlay) V.drawHands(w);
  };
  V.drawBoss = (w, pen) => {
    const S = B.S, b = S.boss, t = S.time; if (b.dead) { return; }
    const u = b.mdur > 0 ? 1 - b.mt / b.mdur : 1, bx = lerp(mid(b.fx), mid(b.cx), u), by = lerp(mid(b.fy), mid(b.cy), u), cam = V.camPos, a = Math.atan2(cam.y - by, cam.x - bx), bz = 26 + Math.sin(t * 1.6) * 3;
    const hurt = b.hurtT > 0, wind = b.atk, gaze = wind && wind.kind === 'gaze', open = b.opened;
    const q = pen.at(bx, by, bz, a); // local: +x toward camera
    const r = 14, sx = Math.cos(a), sy = Math.sin(a);
    q.ball(0, 0, 0, r, r, r, hurt ? '#ffffff' : '#e8e0c8');
    for (let i = 0; i < 5; i++) { const aa = i * 1.25 + .3; q.bar(sx * 4 * 0 + 8, Math.cos(aa) * 9, Math.sin(aa) * 9, 12, Math.cos(aa + .5) * 10, Math.sin(aa + .5) * 10, .4, .3, '#c04a3a'); }
    const dil = wind && wind.kind === 'gaze' ? .5 : 1 + Math.sin(t * 2) * .1;
    q.ball(11, 0, 0, 3, 8, 8, open ? '#e8a030' : '#d89028'); q.ball(13, 0, 0, 1.5, 3.6 * dil, 3.6 * dil, '#0a0608');
    const blink = (Math.sin(t * .9) > .985 || (wind && wind.kind === 'gaze' && wind.t < .5)) ? 7 : 0; const lid = 7 - (gaze ? 4 : 0) + blink;
    q.ball(10, 0, 8.5 - (blink ? 4 : 0) + (gaze ? -2 : 0), 3.4, 9, 2.6, '#8a6a3a').ball(10, 0, -8.5 + (blink ? 4 : 0) + (gaze ? 2 : 0), 3.4, 9, 2.6, '#8a6a3a');
    q.halo(0, 0, 0, 22 + Math.sin(t * 3) * 1.5, [.16, .1, .02]);
    // seven bolts
    const outs = [0, 0, 0, 0, 0, 0, 0]; const n = b.turned; for (let i = 0; i < 6; i++) outs[i] = clamp(n * 2 - i, 0, 1);
    if (b.relocked) { /* one lock back: two bolts home */ outs[5] = outs[4] = Math.min(outs[4], .0) ; }
    for (let i = 0; i < 7; i++) { const aa = i * (PI * 2 / 7) + t * 0.1, rr = 16 + outs[i] * 20, r2 = rr + 20; q.bar(2, Math.cos(aa) * rr, Math.sin(aa) * rr, 2, Math.cos(aa) * r2, Math.sin(aa) * r2, 2.6, 2.6, '#6a6e7c').box(2, Math.cos(aa) * (r2 + 2), Math.sin(aa) * (r2 + 2), 4, 5, 5, '#8a8e9c'); if (!open) { const a2 = aa + (PI * 2 / 7); q.bar(3, Math.cos(aa) * (rr + 10), Math.sin(aa) * (rr + 10), 3, Math.cos(a2) * (rr + 10), Math.sin(a2) * (rr + 10), 1, 1, '#4a4e5c'); } if (open && (Math.sin(t * 8 + i * 2) > .85)) q.bar(3, Math.cos(aa) * (r2 + 2), Math.sin(aa) * (r2 + 2), 3, Math.cos(aa + .9) * (r2 + 2), Math.sin(aa + .9) * (r2 + 2), .6, .6, '#8af4ff'); }
    // telegraph visuals
    if (wind) { const k = 1 - wind.t / wind.T;
      if (wind.kind === 'chain') { const to = wind.to; pen.at().bar(mid(b.cx), mid(b.cy), 22, mid(to[0]), mid(to[1]), 14, 1.4 * k + .3, .6, '#6af0ff'); w.glow(bx, by, bz, 6 * k, '#6af0ff', { light: true }); }
      if (wind.kind === 'rain') for (const c of wind.cells) w.arc(mid(c[0]), mid(c[1]), .5, 6, 14, 0, PI * 2, '#ffb040', .6 * k + .2);
      if (wind.kind === 'gaze') w.glow(bx + sx * 14, by + sy * 14, bz, 4 * k, '#ffe090', { light: true });
      if (wind.kind === 'slam') w.arc(mid(S.party.cx), mid(S.party.cy), .5, 8, 14, 0, PI * 2, '#ff6a40', .5);
    }
  };
  V.drawHands = (w) => {
    const op = w.overlay.pen; if (!op) return; const S = B.S;
    // idle weapon hints at the sides (the two front-row mains), swings on top
    for (const sw of V.swings) {
      const u = sw.t / sw.dur, side = sw.side, e = Math.sin(u * PI), col = sw.col || '#ffffff', cat = sw.cat;
      if (cat === 'cast') { op.glow(14, side * 6, -4, 1.4 + e * 2.2, col).halo(14, side * 6, -4, 9 * e + 2, [.3, .3, .3]); op.box(10, side * 7, -8, 2, 3, 6, '#d8b890'); continue; }
      if (cat === 'bow' || cat === 'xbow') { op.box(10 + e * -3, side * 8, -5, 8, 2, 2, '#6a4a2a').box(14, side * 8, -4, 1, 10, 1, '#c8b890'); continue; }
      if (cat === 'toss') { op.ball(8 + u * 20, side * (7 - u * 7), -4 + e * 5, 1.2, 1.2, 1.2, '#d0d0d8'); continue; }
      const blunt = cat === 'blunt' || cat === 'staff', axe = cat === 'axe', thrust = cat === 'sword' && false;
      const ang = -1.1 + u * 2.2, hx = 12, hy = side * (14 - u * 20), hz = -8 + e * 6, len = cat === 'fist' ? 3 : 14, tipy = hy + side * -Math.sin(ang) * len * .4, tipz = hz + Math.cos(ang) * len * .9;
      op.box(hx - 2, hy + side * 2, hz - 4, 4, 4, 4, '#d8b890');
      if (cat === 'fist') { op.ball(hx + e * 5, hy, hz, 2.4, 2.4, 2.4, '#d8b890'); continue; }
      op.bar(hx, hy, hz, hx + 4 + e * 3, tipy, tipz, blunt ? 2.4 : 1.6, .7, blunt ? '#8a8a96' : '#e8ecf4');
      if (axe) op.box(hx + 4 + e * 3, tipy, tipz, 3, 5, 3, '#c8ccd8');
      if (u > .15 && u < .6) op.bar(hx + 4 + e * 3, tipy, tipz, hx + 4 + e * 3, hy + side * 14, hz - 6, 3, .2, '#ffffff');
    }
  };
  return V;
})();
