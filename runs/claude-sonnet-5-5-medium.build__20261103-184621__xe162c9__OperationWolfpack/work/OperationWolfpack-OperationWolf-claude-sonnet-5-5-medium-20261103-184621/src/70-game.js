// The game: E.Game, settings, input to crosshairs, scenes (title, attract, briefing, play, tally, cutscene, ending, credits, about), rendering and event handling.
(() => {
const E = My3D2dge, WP = globalThis.WP, px = E.px, A = WP.Art, Au = WP.Audio, { clamp, lerp } = WP;
const W = WP.W, H = WP.H;
const INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Mouse0', 'Space', 'KeyJ', 'Pad7'], grenade: ['Mouse2', 'KeyG', 'KeyK', 'Pad6', 'Pad5'], reload: ['KeyR', 'KeyL', 'Mouse1', 'Pad2'], snap: ['KeyQ', 'Pad4'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
const HUBBED = typeof AIHub !== 'undefined' && AIHub.active;
const game = new E.Game({
  canvas: 'screen', res: [W, H], id: 'operation-wolfpack', input: INPUT,
  menu: {
    items: [['Dev mode', () => { WP.dev.open = true; game.resume(); }]],
    quit: 'title', fullscreen: 'button',
    controls: { fire: 'Fire', grenade: 'Grenade', reload: 'Reload', snap: 'Snap to threat', up: 'Aim up', down: 'Aim down', left: 'Aim left', right: 'Aim right', start: false, confirm: false, cancel: false, pause: false },
    settings: [
      { key: 'difficulty', label: 'Difficulty', options: [['RECRUIT', 'Recruit'], ['VETERAN', 'Veteran'], ['ARCADE', 'Arcade']], value: 'VETERAN', help: 'Arcade: harder hits, no emergency ammo drops' },
      { key: 'autoReload', label: 'Auto reload', value: true, apply: (g, v) => { WP.opts.autoReload = v; }, help: 'Reload by itself when the magazine runs dry' },
      { key: 'aimAssist', label: 'Aim assist (pad)', value: true, help: 'The crosshair slows near targets on a controller' },
      { key: 'hints', label: 'On-screen hints', value: true },
      { key: 'symbols', label: 'Button symbols', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox A B X Y']], value: 'playstation', apply: (g, v) => { g.input.glyphs = v; } }
    ]
  }
});
Au.init(game);
if (typeof document !== 'undefined') game.allowJoin({ max: HUBBED ? 1 : 4, keys: false, onJoin: (inp, n) => G.joined(n - 1) });

// ---------------------------------------------------------------------------------------------- shared state
const G = WP.G = {
  op: 0, carry: null, nSeats: 1, sim: null, world: null, role: 'solo', localSeats: [0], aim: [], fx: new A.FX(), rigs: new Map(), radio: null, radioQ: [], card: null, cardT: 0,
  attract: false, attIdx: 0, hurtFx: [0, 0, 0, 0], continues: 0, runScore: 0, banner: null, tally: null, saved: 0, shake: 0, stageR: {}, idle: 0, lastPt: [0, 0], lastMouseT: -1, hintT: 0, seed: 1, t: 0, showHit: false, rootTitle: null
};
for (let i = 0; i < 4; i++) G.aim.push({ x: 240 + (i - 1.5) * 40, y: 120, dev: 'pad' });
G.joined = n => { if (G.sim && G.sim.players[n] && !G.sim.players[n].active && G.role !== 'client') { const p = G.sim.newPlayer(n, true); Object.assign(G.sim.players[n], p); G.sim.ev({ k: 'join', pid: n }); } G.nSeats = Math.max(G.nSeats, n + 1); if (!G.localSeats.includes(n)) G.localSeats.push(n); };
const L = a => game.input.label(a);
const cab = new E.Arcade(game, { id: 'operation-wolfpack', lives: 1, hud: false });
G.cab = cab;
const settingsDiff = () => game.settings.difficulty || 'VETERAN';

// ---------------------------------------------------------------------------------------------- per-stage renderers
const unwrap = v => { v = ((v % 8192) + 8192) % 8192; return v > 4096 ? v - 8192 : v; };
function stageR(i) {
  if (G.stageR[i]) return G.stageR[i];
  const st = WP.STAGES[i], spec = JSON.parse(JSON.stringify(st.sky));
  for (const l of spec.layers) if (l.kind !== 'clouds') l.fill = false;
  const bg = new E.Backdrop(spec), painter = WP.FLOORS[st.floor];
  const m7 = new E.Mode7({ floor: (x, y) => painter(unwrap(x), unwrap(y)), size: [8192, 8192], wrap: true, sky: bg, fog: st.fog, far: 2100 });
  return G.stageR[i] = { m7, bg };
}

// ---------------------------------------------------------------------------------------------- rigs (cosmetic, posed in update)
const cosmetic = { den: null };
function updateRigs(dt, world) {
  const seen = G.rigSeen || (G.rigSeen = new Set()); seen.clear();
  for (const e of world.ents) {
    const ty = e.ty; const isK = e.boss && e.boss.name === 'GENERAL KRAGG';
    if (!ty.rig && !isK) continue;
    seen.add(e.id);
    let rig = G.rigs.get(e.id); if (!rig) { rig = A.makeRig(isK ? 'kragg' : ty.rig, e.seed); G.rigs.set(e.id, rig); }
    const vx = clamp((e.x - (rig._x ?? e.x)) / dt, -70, 70); rig._x = e.x;
    const aiming = e.st === 'aim' || e.st === 'burst' || e.st === 'up';
    const dying = e.st === 'dying';
    const z = (ty.beh === 'popup' ? e.z - (1 - e.up) * ty.h : e.z) + (isK ? 30 * e.boss.sc : 0);
    rig.update(dt, { x: e.x, y: e.y, z, vx, vy: 0, facing: aiming || Math.abs(vx) < 6 ? Math.PI / 2 : (vx > 0 ? 0 : Math.PI), point: aiming && !!(ty.atk === 'shot' || ty.atk === 'burst' || isK), pose: dying ? 'die' : (e.st === 'stun' ? 'kneel' : undefined),
      expr: aiming || e.st === 'throw' ? 'angry' : ty.kind === 'host' || ty.kind === 'civ' ? 'wince' : undefined, run: ty.kind === 'host' ? 1 : undefined, hurt: e.flash > 0 });
  }
  if (G.rigs.size > seen.size + 12) for (const id of G.rigs.keys()) if (!seen.has(id)) G.rigs.delete(id);
}

// ---------------------------------------------------------------------------------------------- input -> crosshairs
const held = (inp, c) => inp.held && inp.held.has && inp.held.has(c);
function readSeat(i, dt, world) {
  const prim = i === 0 || G.role !== 'solo', inp = G.role !== 'solo' ? game.input : (game.players[i] || (i === 0 ? game.input : null)); if (!inp) return null;
  const a = G.aim[i];
  if (prim) {
    const pt = inp.pointer();
    if (pt && inp.mouse && inp.mouse.t !== G.lastMouseT) { G.lastMouseT = inp.mouse.t; a.x = pt[0]; a.y = pt[1]; a.dev = 'mouse'; }
  }
  const m = inp.padMove || [0, 0], ra = inp.padAim;
  let mx = m[0], my = m[1];
  if (ra) { mx += ra[0] * .5; my += ra[1] * .5; }
  let kx = 0, ky = 0;
  if (prim) { kx = (held(inp, 'KeyD') || held(inp, 'ArrowRight') ? 1 : 0) - (held(inp, 'KeyA') || held(inp, 'ArrowLeft') ? 1 : 0); ky = (held(inp, 'KeyS') || held(inp, 'ArrowDown') ? 1 : 0) - (held(inp, 'KeyW') || held(inp, 'ArrowUp') ? 1 : 0); }
  const dx = mx + kx * .8 + ((held(inp, 'Pad15') ? 1 : 0) - (held(inp, 'Pad14') ? 1 : 0)) * .5, dy = my + ky * .8 + ((held(inp, 'Pad13') ? 1 : 0) - (held(inp, 'Pad12') ? 1 : 0)) * .5;
  if (dx || dy) {
    let sp = 300 * WP.T.aimSpeed;
    if (!kx && !ky && game.settings.aimAssist !== false && world && WP.T.assist > 0) { const near = nearTarget(world, a.x, a.y); if (near < 20) sp *= 1 - .6 * WP.T.assist * (1 - near / 20); }
    a.x = clamp(a.x + dx * sp * dt, 0, W - 1); a.y = clamp(a.y + dy * sp * dt, 0, H - 1); if (!(prim && inp.lastDevice === 'mouse')) a.dev = 'pad';
  }
  return { x: a.x, y: a.y, fire: inp.down('fire'), grenade: inp.pressed('grenade'), reload: inp.pressed('reload'), snap: inp.pressed('snap') };
}
G.readSeat = readSeat;
function nearTarget(world, x, y) {
  let best = 99;
  for (const e of world.ents) { const k = e.ty.kind; if (e.dead || e.st === 'dying' || !(k === 'inf' || k === 'veh' || k === 'air' || k === 'boss')) continue; const c = world.center(e); if (!c) continue; const d = Math.hypot(c.x - x, c.y - y); if (d < best) best = d; }
  return best;
}

// ---------------------------------------------------------------------------------------------- the run
G.newRun = (nSeats, op = 0) => {
  G.op = op; G.carry = null; G.nSeats = nSeats; G.continues = 0; G.runScore = 0; G.saved = 0; G.runStats = { kills: 0, shots: 0, hits: 0, civ: 0 };
  G.localSeats = []; for (let i = 0; i < nSeats; i++) G.localSeats.push(i);
};
G.startOp = (op, o = {}) => {
  G.op = op; const st = WP.STAGES[op];
  const sim = new WP.Sim({ op, players: G.nSeats, difficulty: settingsDiff(), seed: (G.seed++ * 7919) + op * 31, carry: G.carry, invincible: !!o.invincible, infAmmo: !!o.infAmmo, cheats: G.cheats });
  if (o.d) sim.jump(o.d);
  if (o.boss) sim.skipToBoss();
  G.sim = sim; G.world = sim; G.fx.clear(); G.rigs.clear(); G.radio = null; G.radioQ.length = 0; G.card = null; G.t = 0; G.hintT = 0;
  for (const p of sim.players) { const a = G.aim[p.pid]; p.x = a.x; p.y = a.y; }
  return sim;
};
const hintLines = () => {
  if (game.settings.hints === false) return null;
  const I = game.input;
  return [L('fire') + '  FIRE', L('grenade') + '  GRENADE', L('reload') + '  RELOAD', L('snap') + '  SNAP TO THREAT'];
};

// ---------------------------------------------------------------------------------------------- events -> sound, fx, rumble, radio
const SEATRUM = i => (G.role !== 'solo' ? game.input : (game.players[i] || (i === 0 ? game.input : null)));
function handleEvents(world, dt) {
  const fx = G.fx, local = G.localSeats;
  for (const ev of world.events) {
    switch (ev.k) {
      case 'shot': {
        if (ev.pid === (G.role === 'client' ? WP.Net.me() : ev.pid) || true) { if (!G.lastSmg || game.real - G.lastSmg > .04) { Au.play(ev.pid % 2 ? 'smg2' : 'smg', { vol: .8 }); G.lastSmg = game.real; } }
        const gx = G.gunX(ev.pid), p = world.players[ev.pid]; fx.tracer(gx, H - 4, ev.x, ev.y, '#ffe9a0');
        if (!ev.hit || ev.hit === 'cover') fx.mark(ev.x, ev.y, 'miss');
        if (local.includes(ev.pid)) { const r = SEATRUM(ev.pid); if (r && r.rumble) r.rumble(.1, .03); }
        break; }
      case 'hit': { fx.mark(ev.x ?? 0, ev.y ?? 0, ev.weak ? 'weak' : ev.head ? 'head' : 'hit'); Au.play(ev.weak ? 'hitW' : ev.head ? 'hitH' : 'hit', { vol: .8 }); if (ev.x != null) fx.dust(0, 0, 0, 0); break; }
      case 'spark': fx.mark(ev.x, ev.y, 'miss'); Au.play('hit', { vol: .5, pitch: .6 }); break;
      case 'kill': { Au.play(ev.t === 'jeep' || ev.t === 'boss' ? 'boomS' : 'kill', { vol: .8 }); if (ev.head) Au.play('hitH'); if (ev.t === 'rifleman' || ev.t === 'popper' || ev.t === 'knifer' || ev.t === 'grenadier' || ev.t === 'heavy' || ev.t === 'sniper') Au.play('scream', { vol: .5, pitch: .8 + Math.random() * .5 }); fx.dust(ev.x, ev.y, 0, 4); break; }
      case 'score': { if (ev.x != null) { const pr = world.proj(ev.x, ev.y, ev.z); if (pr) fx.text(pr[0], pr[1] - 6, '+' + ev.pts, WP.SEAT[ev.pid], ev.pts >= 500); } break; }
      case 'explode': { fx.explode(ev.x, ev.y, ev.z, ev.size); Au.play(ev.size >= 30 ? 'boomXL' : ev.size >= 20 ? 'boom' : 'boomS'); G.shake = Math.max(G.shake, ev.size >= 20 ? 6 : 2); game.shake && game.shake(ev.size >= 20 ? 4 : 1.5); if (ev.size >= 20) for (const i of local) { const r = SEATRUM(i); r && r.rumble && r.rumble(.45, .2); } break; }
      case 'impact': { fx.explode(ev.x, ev.y, ev.z, ev.big ? 12 : 5); Au.play(ev.big ? 'boomS' : 'hit'); break; }
      case 'hurt': { G.hurtFx[ev.pid] = .45; Au.play('hurt', { vol: local.includes(ev.pid) ? 1 : .4 }); if (local.includes(ev.pid)) { game.shake && game.shake(3); const r = SEATRUM(ev.pid); r && r.rumble && r.rumble(.8, .25); } break; }
      case 'down': Au.play('down'); G.hurtFx[ev.pid] = 1.2; break;
      case 'civ': Au.play('civ'); G.fx.text(W / 2, H / 2 + 20, ev.host ? 'HOSTAGE HIT' : 'CIVILIAN HIT', '#ff6a40', true); G.hurtFx[ev.pid] = .3; break;
      case 'hostdead': Au.play('civ'); G.fx.text(W / 2, H / 2 + 20, 'HOSTAGE LOST', '#ff6a40', true); break;
      case 'saved': Au.play('saved'); G.fx.text(W / 2, H / 2 + 20, 'HOSTAGE SAFE', '#4ad060', true); break;
      case 'pickup': { Au.play(ev.kind === 'med' ? 'med' : ev.kind === 'fury' ? 'fury' : 'pickup'); const pr = world.proj(ev.x, ev.y, 10); if (pr) fx.text(pr[0], pr[1] - 10, { mag: 'MAG', gren: 'GRENADES', med: 'REPAIRED', fury: 'FURY!', medal: 'MEDAL' }[ev.kind] || '', '#ffd24a'); break; }
      case 'tnt': game.flash('#ffffff', .3, .9); Au.play('tnt'); G.shake = 10; game.shake && game.shake(8); fx.text(W / 2, H / 2, 'DYNAMITE!', '#ff5040', true); break;
      case 'tele': break;
      case 'efire': { Au.play(ev.atk === 'burst' ? 'efire' : ev.atk === 'knife' ? 'knife' : ev.atk === 'missile' ? 'missile' : ev.atk === 'shell' ? 'boomS' : ev.atk === 'grenade' ? 'throw' : 'efire', { vol: .6 }); if (ev.atk === 'shot' || ev.atk === 'burst') { const pr = world.proj(ev.x, ev.y, ev.z); if (pr) fx.p.push({ k: 'flash', x: ev.x, y: ev.y, z: ev.z, vx: 0, vy: 0, vz: 0, life: .08, max: .08, r: 2.5 }); } break; }
      case 'throw': break;
      case 'miss': { Au.play('hit', { vol: .25, pitch: .5 }); break; }
      case 'reload': Au.play('reload'); break;
      case 'reloaded': Au.play('reloaded'); break;
      case 'dry': Au.play('dry'); break;
      case 'gthrow': Au.play('gthrow'); { const r = SEATRUM(ev.pid); local.includes(ev.pid) && r && r.rumble && r.rumble(.45, .2); } break;
      case 'snap': Au.play('snap'); break;
      case 'animal': Au.play(Math.random() < .5 ? 'goat' : 'hen'); break;
      case 'card': G.card = ev.text; G.cardT = 2.6; Au.play('card'); break;
      case 'radio': G.queueRadio(ev.key); break;
      case 'boss': G.card = ev.name; G.cardT = 2.6; Au.play('phase'); Au.music('boss'); break;
      case 'phase': Au.play('phase'); game.flash('#ff4040', .15, .4); break;
      case 'stagger': Au.play('stagger'); G.fx.text(W / 2, 90, 'STAGGERED! DOUBLE DAMAGE', '#ffd24a', true); break;
      case 'clear': Au.play('howl'); Au.music('victory'); break;
      case 'fail': Au.play('down'); Au.music('gameover'); break;
      case 'join': G.fx.text(W / 2, H / 2, 'P' + (ev.pid + 1) + ' JOINED', WP.SEAT[ev.pid], true); Au.play('confirm'); break;
    }
  }
  world.events = [];
}
G.gunX = pid => 240 + (pid - 1.5) * 120;
G.queueRadio = key => { const r = WP.TEXT.radio[key]; if (!r) return; if (G.radio && G.radio.key === key) return; G.radioQ.push({ key, who: r[0], text: r[1] }); if (G.radioQ.length > 3) G.radioQ.shift(); };
function stepRadio(dt) {
  let r = G.radio;
  if (!r) { if (G.radioQ.length) r = G.radio = Object.assign({ n: 0, t: 0, hold: 0 }, G.radioQ.shift()); else return; }
  r.t += dt;
  const want = Math.min(r.text.length, Math.floor(r.t * 36));
  while (r.n < want) { Au.voice(r.who, r.text[r.n]); r.n++; }
  if (r.n >= r.text.length) { r.hold += dt; if (r.hold > 2.6) G.radio = null; }
}

// ---------------------------------------------------------------------------------------------- drawing the world
const gatherEnts = (m7, world, t) => {
  for (const e of world.ents) {
    const ty = e.ty, k = ty.kind;
    if (k === 'pickup') { m7.add(e.x, e.y, e.z, (g, sx, sy, kk) => A.pickupIcon(g, Math.round(sx), Math.round(sy), Math.max(5, Math.round(kk * 5)), e.pkind, t + e.seed * 6)); continue; }
    if (k === 'proj') { m7.add(e.x, e.y, e.z, (g, sx, sy, kk) => A.pj(g, kk, sx, sy, e)); continue; }
    const rig = G.rigs.get(e.id);
    // a soft shadow on the ground
    if (k !== 'air' && e.st !== 'dying' || k === 'air') m7.add(e.x, e.y + .2, 0, (g, sx, sy, kk) => { const w = Math.max(3, ty.w * kk * (k === 'air' ? .5 : .55)); px.blend(g, k === 'air' ? .18 : .3, 'normal', () => px.ell(g, Math.round(sx), Math.round(sy), Math.round(w), Math.max(1, Math.round(w * .22)), '#000000')); });
    if (rig && (ty.rig || e.boss)) {
      if (e.boss) m7.add(e.x, e.y, e.z, (g, sx, sy, kk) => A.bosses.kragg(g, kk * e.boss.sc, sx, sy, e));
      const z = (ty.beh === 'popup' ? e.z - (1 - e.up) * ty.h : e.z) + (e.boss ? 30 * e.boss.sc : 0);
      if (ty.beh === 'popup' && e.up <= 0) continue;
      m7.rig(rig, e.x, e.y + (e.boss ? .1 : 0), z);
      if (e.flash > 0) m7.add(e.x, e.y + .05, z, (g, sx, sy, kk) => px.blend(g, .5, 'add', () => px.rect(g, Math.round(sx - ty.w * kk / 2), Math.round(sy - ty.h * kk), Math.round(ty.w * kk), Math.round(ty.h * kk), '#ffffff')));
      continue;
    }
    const draw0 = e.boss ? A.bosses[world.st.boss] : A.shapes[ty.shape];
    if (!draw0) continue;
    const bsc = e.boss ? e.boss.sc : 1, draw = (g, kk, sx, sy, ee) => draw0(g, kk * bsc, sx, sy, ee);
    m7.add(e.x, e.y, e.z, (g, sx, sy, kk) => {
      if (e.st === 'dying' && k !== 'boss') { px.blend(g, clamp(1 - e.stT * 2, .1, 1), 'normal', () => draw(g, kk, sx, sy, e)); return; }
      draw(g, kk, sx, sy, e);
      if (e.flash > 0) px.blend(g, .5, 'add', () => px.rect(g, Math.round(sx - ty.w * kk / 2), Math.round(sy - ty.h * kk), Math.round(ty.w * kk), Math.round(ty.h * kk), '#ffffff'));
      if (e.ty.kind === 'prop' && e.t !== 'mast' && e.hp < e.hpMax) px.blend(g, .3, 'normal', () => px.rect(g, Math.round(sx - ty.w * kk / 2), Math.round(sy - ty.h * kk), Math.round(ty.w * kk), Math.round(ty.h * kk * .3), '#000'));
    });
  }
};
function gatherScenery(m7, world) {
  const st = world.st, items = st.getScenery(), cam = world.cam;
  for (const it of items) {
    let x, y;
    if (st.travel === 'x') { x = it.a; y = st.y0 - Math.abs(it.b); if (x < cam.x - 150 || x > cam.x + 1500) continue; }
    else { x = it.b; y = st.y0 - it.a; if (y > cam.y - 10 || y < cam.y - 1500) continue; }
    const dz = cam.y - y; if (dz < 14 || dz > 1700) continue; if (Math.abs(x - cam.x) > dz * 1.3 + 60) continue;
    const fn = A.scenery[it.k]; if (!fn) continue;
    m7.add(x, y, 0, (g, sx, sy, kk) => fn(g, kk, sx, sy, it.s));
  }
}
function drawWorld(r, world, t, o = {}) {
  const sr = stageR(world.opIx), m7 = sr.m7;
  Object.assign(m7.cam, world.cam);
  gatherScenery(m7, world); gatherEnts(m7, world, t); G.fx.gather(m7);
  m7.draw(r, m7.cam);
  r.overlay(g => drawOverlay(g, world, t, o));
}
function drawOverlay(g, world, t, o) {
  // telegraph rings
  for (const e of world.ents) {
    if (e.dead || !(e.aimTot > 0) || e.st === 'dying') continue;
    const c = world.center(e); if (!c) continue;
    const big = e.boss ? 1 : 0, r0 = clamp(Math.max(e.ty.w * c.k * .7, 12), 12, e.boss ? 46 : 30);
    A.telegraph(g, Math.round(c.x), Math.round(c.y), r0, clamp(e.aim / e.aimTot, 0, 1), e.tgt ? e.tgt.col || '#fff' : '#fff', big);
  }
  G.fx.drawScreen(g);
  if (G.showHit) for (const e of world.ents) { const hs = world.hitShape(e); if (hs) px.rect(g, Math.round(hs.x - hs.hw), Math.round(hs.y - hs.hh), Math.round(hs.hw * 2), 1, '#00ff00'), px.rect(g, Math.round(hs.x - hs.hw), Math.round(hs.y + hs.hh), Math.round(hs.hw * 2), 1, '#00ff00'); }
  // guns and crosshairs
  for (const p of world.players) {
    if (!p.active) continue;
    const col = WP.SEAT[p.pid];
    if (!p.down) { if (!o.noGun) A.gun(g, p, p.x, p.y, world.t, col, G.gunX(p.pid)); A.crosshair(g, p, col, t, G.localSeats.includes(p.pid)); if (world.players.filter(q => q.active).length > 1) E.font.text(g, 'P' + (p.pid + 1), Math.round(p.x) + 11, Math.round(p.y) - 14, col, { outline: '#000', font: 'tiny' }); }
  }
  // damage vignette
  for (const i of G.localSeats) { const h = G.hurtFx[i]; if (h > 0) { const a = Math.min(.6, h); px.blend(g, a, 'normal', () => { px.rect(g, 0, 0, W, 8, '#d02020'); px.rect(g, 0, H - 8, W, 8, '#d02020'); px.rect(g, 0, 0, 8, H, '#d02020'); px.rect(g, W - 8, 0, 8, H, '#d02020'); }); } }
  A.hud(g, null, { sim: world, t, label: L, hint: o.hint === false ? null : hintLines() });
  // radio
  const rd = G.radio;
  if (rd) {
    const w = 226, x = 6, y = 28;
    const lines = E.font.wrap(rd.text, w - 42), h = Math.max(34, 16 + lines.length * 9);
    E.ui.box(g, x, y, w, h, { bg: ['#101828e8', '#101828e8'], border: '#6a8aa8', gradient: false });
    px.rect(g, x + 3, y + 3, 28, 28, '#0a1018');
    if (!cosmetic.den) cosmetic.den = A.makeRig('den');
    try { cosmetic.den.drawPortrait(g, x + 3, y + 3, 28); } catch (e) { /* portrait unavailable */ }
    E.font.text(g, rd.who + ' (RADIO)', x + 36, y + 4, '#7ab8e8', { font: 'tiny' });
    E.font.text(g, rd.text.slice(0, rd.n), x + 36, y + 13, '#ffffff', { wrap: w - 42, outline: false });
  }
  // cards
  if (G.card && G.cardT > 0) { const a = Math.min(1, G.cardT * 2, (2.6 - G.cardT) * 4 + .2); px.blend(g, .55 * a, 'normal', () => px.rect(g, 0, 98, W, 40, '#000000')); E.font.title(g, G.card, W / 2, 106, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030'] }); }
  if (world.phase === 'clear') E.font.title(g, 'OPERATION CLEAR', W / 2, 100, { scale: 3, align: 'center', colors: ['#fff6c0', '#ffb030'] });
  if (world.phase === 'fail') E.font.title(g, 'ALL DOWN', W / 2, 100, { scale: 3, align: 'center', colors: ['#ffb0a0', '#e03030'] });
  if (o.demo) { if (Math.floor(t * 2) % 2 === 0) E.font.title(g, 'DEMO', W / 2, 60, { scale: 2, align: 'center', colors: ['#ffffff', '#a0c0ff'] }); E.font.text(g, 'PRESS ANY BUTTON', W / 2, 82, '#ffffff', { align: 'center', outline: '#000' }); }
  if (WP.dev.open) WP.dev.draw(g, world);
  else if (WP.dev.cheatsOn()) E.font.text(g, 'DEV', W - 6, 14, '#ff80ff', { align: 'right', outline: '#000', font: 'tiny' });
}
// ---------------------------------------------------------------------------------------------- the play scene
function playUpdate(dt, attract) {
  const sim = G.sim; if (!sim) return;
  G.t += dt;
  G.fx.update(dt);
  for (let i = 0; i < 4; i++) if (G.hurtFx[i] > 0) G.hurtFx[i] -= dt;
  if (G.cardT > 0) G.cardT -= dt;
  if (typeof document !== 'undefined') { const cv = document.getElementById('screen'); if (cv) cv.style.cursor = (WP.dev.open || G.attract) ? '' : 'none'; }
  if (WP.dev.open) { WP.dev.update(dt, sim); updateRigs(dt, sim); return; }
  stepRadio(dt);
  if (G.role === 'client') { WP.Net.clientUpdate(dt, sim); handleEvents(sim, dt); updateRigs(dt, sim); return; }
  const frames = [];
  if (attract) frames[0] = G.bot.frame(sim, dt);
  else if (G.autopilot) frames[0] = G.autopilot.frame(sim, dt);
  else for (const i of G.localSeats) { if (G.role === 'host' && i !== WP.Net.me()) continue; const f = readSeat(i, dt, sim); if (f) frames[i] = f; }
  if (G.role === 'host') WP.Net.hostFrames(frames);
  if (WP.dev.frozen) { for (const p of sim.players) if (frames[p.pid]) { p.x = frames[p.pid].x; p.y = frames[p.pid].y; } }
  else sim.step(dt * (WP.dev.slow || 1), frames);
  if (G.role === 'host') WP.Net.hostUpdate(dt, sim);
  handleEvents(sim, dt);
  updateRigs(dt, sim);
  // music follows the operation
  if (!attract && sim.phase === 'rail' && Au.cur !== WP.STAGES[sim.opIx].music && Au.cur !== 'boss') Au.music(WP.STAGES[sim.opIx].music);
  if (sim.phase === 'clear' && sim.endT > 3.2 && !G.leaving) { G.leaving = true; G.finishOp(); }
  if (sim.phase === 'fail' && sim.endT > 2.8 && !G.leaving) { G.leaving = true; G.failOp(); }
}
G.finishOp = () => {
  const sim = G.sim;
  if (G.attract) { G.nextAttract(); return; }
  if (G.role !== 'solo') { WP.Net.finish(sim); return; }
  const st = sim.stats, tally = { op: sim.opIx, kills: st.kills, acc: sim.players.reduce((a, p) => a + p.shots, 0) ? Math.round(100 * sim.players.reduce((a, p) => a + p.hits, 0) / Math.max(1, sim.players.reduce((a, p) => a + p.shots, 0))) : 0, heads: sim.players.reduce((a, p) => a + p.heads, 0), civ: st.civHits + st.hostHits, saved: sim.host.saved, lost: sim.host.lost, bonus: 0, seats: [] };
  const bonus = 1000 * (sim.opIx + 1) + Math.round(tally.acc * 20);
  for (const p of sim.players) if (p.active) { const dmgBonus = Math.round((100 - p.dmg) * 10); p.score += bonus + dmgBonus; tally.seats.push({ pid: p.pid, score: p.score, bonus: bonus + dmgBonus }); }
  tally.bonus = bonus; G.tally = tally; G.carry = sim.carry(); if (sim.opIx === 3) G.saved = sim.host.saved;
  game.go('tally');
};
G.failOp = () => { if (G.attract) { G.nextAttract(); return; } if (G.role !== 'solo') { WP.Net.finish(G.sim); return; } game.go('continue'); };
const playScene = {
  pausable: !HUBBED,
  enter(data) {
    G.leaving = false; WP.dev.refreshCheats();
    if (typeof document !== 'undefined') { const c = document.getElementById('screen'); if (c) c.style.cursor = 'none'; }
    const sim = G.sim; if (sim && sim.phase === 'rail') { Au.cur = null; Au.music(WP.STAGES[sim.opIx].music); }
  },
  exit() { if (typeof document !== 'undefined') { const c = document.getElementById('screen'); if (c) c.style.cursor = ''; } },
  update(dt) { playUpdate(dt, false); },
  draw(r) { if (G.world) drawWorld(r, G.world, G.t); }
};

// ---------------------------------------------------------------------------------------------- title and the other canvas screens
const titleSeats = () => { const n = Math.max(1, (game.players || [game.input]).length); return n; };
const menus = {};
function backdropScene(r, t, op = 0) {
  const sr = stageR(op), m7 = sr.m7, st = WP.STAGES[op];
  const cam = { x: 200 + t * 14, y: 0, h: st.cam.h, angle: -Math.PI / 2, pitch: st.cam.pitch, fov: 60 };
  Object.assign(m7.cam, cam);
  const fake = { st, cam };
  gatherScenery(m7, fake);
  for (let i = 0; i < 4; i++) { const rig = G.titleRigs[i]; m7.rig(rig, cam.x + (i - 1.5) * 26, -92 + (i % 2) * 8, 0); }
  m7.draw(r, m7.cam);
}
const fitTitle = (g, t) => {
  E.font.title(g, 'OPERATION', W / 2, 26, { scale: 3, align: 'center', colors: ['#fff6c0', '#ffa030'], outline: '#201008', depth: 3, depthColor: '#6a2a10' });
  E.font.title(g, 'WOLFPACK', W / 2, 54, { scale: 5, align: 'center', colors: ['#ffffff', '#ff8a30'], outline: '#201008', depth: 4, depthColor: '#6a2a10' });
  E.font.text(g, WP.TEXT.tagline, W / 2, 96, '#ffe6c0', { align: 'center', outline: '#000' });
};
const touchOnly = () => typeof window !== 'undefined' && typeof matchMedia === 'function' && matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches ;
const anyActivity = () => {
  const I = game.input; let moved = false;
  if (I.mouse && I.mouse.t !== G.idleMouse) { moved = G.idleMouse !== undefined; G.idleMouse = I.mouse.t; }
  const pm = I.padMove || [0, 0];
  return moved || I.anyPressed() || Math.hypot(pm[0], pm[1]) > .3 || (game.players || []).some(p => p.anyPressed && p.anyPressed());
};
const titleScene = {
  enter() {
    WP.dev.open = false; G.idle = 0; G.t = 0; Au.cur = null; Au.music('title'); G.attract = false; G.sim = null; G.world = null; G.leaving = false; G.cheats = G.cheats || {};
    if (!G.titleRigs) G.titleRigs = [0, 1, 2, 3].map(i => { const rg = A.makeRig('grunt', .1 + i * .2); rg.update(.01, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2, point: false }); return rg; });
    const touch = touchOnly();
    const items = touch ? [{ label: 'SETTINGS' }, { label: 'ABOUT' }] : ['START OPERATION', 'HOW TO PLAY', 'HIGH SCORES', 'SETTINGS', 'CONTROLS', 'ABOUT'];
    if (G.rootTitle) { for (const k of ['sessionLeft']) { } }
    menus.title = new E.Menu(game, items, {
      x: 'center', y: 118, box: true, onPick: (i, it) => {
        const l = typeof it === 'string' ? it : it.label;
        if (l === 'START OPERATION') { G.newRun(titleSeats()); game.go('briefing'); }
        else if (l === 'HOW TO PLAY') game.go('help'); else if (l === 'HIGH SCORES') game.go('scores');
        else if (l === 'SETTINGS') game.menu('settings'); else if (l === 'CONTROLS') game.menu('controls'); else if (l === 'ABOUT') game.go('about');
      }
    });
    if (typeof document !== 'undefined') { const c = document.getElementById('screen'); if (c) c.style.cursor = ''; }
  },
  update(dt) {
    G.t += dt; menus.title.update();
    if (anyActivity()) G.idle = 0; else G.idle += dt;
    if (G.idle >= 10) { G.attIdx = 0; game.go('attract'); }
  },
  draw(r) {
    backdropScene(r, G.t);
    r.overlay(g => {
      px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, W, 110, '#000000'));
      fitTitle(g, G.t);
      const n = titleSeats();
      if (touchOnly()) { E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', W / 2, 108, '#ffd24a', { align: 'center', outline: '#000' }); }
      else {
        for (let i = 0; i < 4; i++) { const on = i < n; px.rect(g, 168 + i * 38, 218, 32, 12, on ? WP.SEAT[i] : '#20202a'); E.font.text(g, on ? 'P' + (i + 1) : '--', 184 + i * 38, 220, on ? '#000' : '#6a6a7a', { align: 'center', font: 'tiny' }); }
        E.font.text(g, (HUBBED ? 'ONLINE SESSION' : L('start') + ' ON ANOTHER CONTROLLER TO JOIN') + '   1 TO 4 PLAYERS', W / 2, 234, '#c8c8d8', { align: 'center', outline: '#000', font: 'tiny' });
      }
      E.font.text(g, E.versionLabel ? E.versionLabel() : '', 4, H - 8, '#6a6a7a', { font: 'tiny' });
    });
    menus.title.draw(r);
  }
};

// briefing: typed lines, then on to the operation card
const briefingScene = {
  enter() { G.t = 0; G.bn = 0; Au.cur = null; Au.music('title'); },
  update(dt) {
    G.t += dt; const full = WP.TEXT.briefing.join('\n'), want = Math.min(full.length, Math.floor(G.t * 30));
    while (G.bn < want) { Au.voice('DEN', full[G.bn]); G.bn++; }
    const I = game.input;
    if (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked())) { if (G.bn < full.length) { G.t = 999; } else { game.go('opcard'); } }
    if (G.bn >= full.length && G.t > full.length / 30 + 6) game.go('opcard');
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#0a0e18');
      for (let y = 0; y < H; y += 3) px.rect(g, 0, y, W, 1, '#101828');
      E.font.title(g, 'BRIEFING', W / 2, 26, { scale: 3, align: 'center', colors: ['#fff6c0', '#ffa030'] });
      if (!cosmetic.den) cosmetic.den = A.makeRig('den');
      E.ui.box(g, 40, 70, 78, 78, { bg: ['#0a1018', '#0a1018'], border: '#6a8aa8', gradient: false });
      try { cosmetic.den.drawPortrait(g, 44, 74, 70); } catch (e) { }
      E.font.text(g, 'DEN', 79, 152, '#7ab8e8', { align: 'center', outline: '#000' });
      const full = WP.TEXT.briefing.join('\n').slice(0, G.bn);
      E.font.text(g, full, 134, 76, '#e8f0ff', { wrap: 310, outline: '#000' });
      E.font.text(g, L('confirm') + ' CONTINUE', W - 10, H - 14, '#a8b0c0', { align: 'right', outline: '#000' });
    });
  }
};
const opcardScene = {
  enter() { G.t = 0; G.leaving = false; if (G.op === 0) G.nOp = 'start'; },
  update(dt) { G.t += dt; if (G.t > 2.6 || (G.t > .8 && (game.input.pressed('confirm') || game.input.pressed('start')))) { G.startOp(G.op); game.go('play'); } },
  draw(r) {
    const st = WP.STAGES[G.op], tx = WP.TEXT.ops[G.op];
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#05060a');
      // route map: four nodes
      for (let i = 0; i < 4; i++) { const x = 60 + i * 120, y = 60 + (i % 2 ? 14 : -4); if (i < 3) px.line(g, x, y, 60 + (i + 1) * 120, 60 + ((i + 1) % 2 ? 14 : -4), '#3a4a5a', 2); }
      for (let i = 0; i < 4; i++) { const x = 60 + i * 120, y = 60 + (i % 2 ? 14 : -4), done = i < G.op, cur = i === G.op; px.disc(g, x, y, cur ? 11 : 8, cur ? '#ffd24a' : done ? '#4ad060' : '#4a5a6a'); E.font.text(g, String(i + 1), x, y - 3, '#000', { align: 'center' }); E.font.text(g, WP.TEXT.ops[i].name, x, y + 16, cur ? '#ffd24a' : '#8a98a8', { align: 'center', font: 'tiny' }); }
      const a = clamp(G.t * 2, 0, 1);
      E.font.title(g, 'OPERATION ' + (G.op + 1), W / 2, 124, { scale: 2, align: 'center', colors: ['#c8d8ff', '#6a8ad8'] });
      E.font.title(g, tx.name, W / 2, 146, { scale: 4, align: 'center', colors: ['#fff6c0', '#ffa030'], depth: 3, depthColor: '#6a2a10' });
      E.font.text(g, tx.card, W / 2, 190, '#ffffff', { align: 'center', outline: '#000' });
      E.font.text(g, 'GOAL: FILL THE COUNTERS, REACH THE END, BEAT THE BOSS', W / 2, 206, '#a8b0c0', { align: 'center', font: 'tiny' });
      px.blend(g, 1 - a, 'normal', () => px.rect(g, 0, 0, W, H, '#000'));
    });
  }
};

// stage tally between operations
const tallyScene = {
  enter() { G.t = 0; Au.music('victory'); },
  update(dt) { G.t += dt; if (G.t > 1.2 && (game.input.pressed('confirm') || game.input.pressed('start') || (game.input.clicked && game.input.clicked()))) G.afterTally(); },
  draw(r) {
    const t = G.tally; if (!t) return;
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#080c14');
      E.font.title(g, 'OPERATION ' + (t.op + 1) + ' CLEAR', W / 2, 20, { scale: 3, align: 'center', colors: ['#fff6c0', '#ffa030'] });
      E.font.text(g, WP.TEXT.ops[t.op].name, W / 2, 50, '#a8b0c0', { align: 'center' });
      const rows = [['KILLS', t.kills], ['ACCURACY', t.acc + '%'], ['HEADSHOTS', t.heads], ['INNOCENTS HIT', t.civ], ['CLEAR BONUS', t.bonus]];
      if (t.op === 3) rows.push(['HOSTAGES HOME', t.saved + ' OF 5']);
      rows.forEach((rw, i) => { const a = clamp((G.t - i * .25) * 3, 0, 1); if (a <= 0) return; E.font.text(g, rw[0], 130, 76 + i * 16, '#c8d0e0', { outline: '#000' }); E.font.text(g, String(rw[1]), 350, 76 + i * 16, rw[0] === 'INNOCENTS HIT' && rw[1] > 0 ? '#ff6a40' : '#ffffff', { align: 'right', outline: '#000' }); });
      t.seats.forEach((s, i) => { E.font.text(g, 'P' + (s.pid + 1) + ' SCORE', 130, 190 + i * 12, WP.SEAT[s.pid], { outline: '#000' }); E.font.text(g, String(s.score), 350, 190 + i * 12, WP.SEAT[s.pid], { align: 'right', outline: '#000' }); });
      if (G.t > 1.2 && Math.floor(G.t * 2) % 2 === 0) E.font.text(g, L('confirm') + ' CONTINUE', W / 2, H - 16, '#ffffff', { align: 'center', outline: '#000' });
    });
  }
};
G.afterTally = () => {
  const op = G.tally.op;
  if (op === 1) { game.go('cutscene'); return; }
  if (op >= 3) { game.go('ending'); return; }
  G.op = op + 1; game.go('opcard');
};

// the interrogation between the river and the village
const cutsceneScene = {
  enter() { G.t = 0; G.ci = 0; G.cn = 0; Au.cur = null; Au.music('op4'); if (!G.prisoner) G.prisoner = A.makeRig('civ', .9); if (!G.wolfRig) G.wolfRig = A.makeRig('grunt', .3); },
  update(dt) {
    G.t += dt; const lines = WP.TEXT.interrogation, cur = lines[G.ci];
    if (!cur) { G.op = 2; game.go('opcard'); return; }
    const want = Math.min(cur[1].length, Math.floor(G.t * 34));
    while (G.cn < want) { Au.voice(cur[0], cur[1][G.cn]); G.cn++; }
    if (game.input.pressed('confirm') || game.input.pressed('start') || (game.input.clicked && game.input.clicked())) { if (G.cn < cur[1].length) G.t = 999; else { G.ci++; G.cn = 0; G.t = 0; } }
    else if (G.cn >= cur[1].length && G.t > cur[1].length / 34 + 3.5) { G.ci++; G.cn = 0; G.t = 0; }
  },
  draw(r) {
    const cur = WP.TEXT.interrogation[G.ci] || WP.TEXT.interrogation[0];
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#10121a'); for (let i = 0; i < 6; i++) px.rect(g, 0, 20 + i * 40, W, 1, '#1a1e2a');
      px.rect(g, 0, 190, W, 80, '#0a0c12');
      E.font.title(g, 'INTERROGATION', W / 2, 14, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffa030'] });
      try { G.prisoner.drawPortrait(g, 60, 50, 110); G.wolfRig.drawPortrait(g, 310, 50, 110, { turn: -.3 }); } catch (e) { }
      E.font.text(g, 'PRISONER', 115, 164, cur[0] === 'PRISONER' ? '#ffd24a' : '#6a6a7a', { align: 'center' });
      E.font.text(g, 'WOLF', 365, 164, cur[0] === 'WOLF' ? '#ffd24a' : '#6a6a7a', { align: 'center' });
      E.ui.box(g, 30, 190, 420, 56, { bg: ['#0a1018', '#0a1018'], border: '#6a8aa8', gradient: false });
      E.font.text(g, cur[0], 40, 196, '#7ab8e8', { outline: '#000' });
      E.font.text(g, cur[1].slice(0, G.cn), 40, 210, '#ffffff', { wrap: 400, outline: false });
      E.font.text(g, L('confirm') + ' NEXT', W - 10, H - 12, '#a8b0c0', { align: 'right', outline: '#000' });
    });
  }
};

// ending, credits, initials
const rankOf = (score, n) => { const s = score / n; return s > 60000 ? 'S' : s > 40000 ? 'A' : s > 26000 ? 'B' : s > 14000 ? 'C' : 'D'; };
const endingScene = {
  enter() { G.t = 0; Au.cur = null; Au.music('victory'); Au.play('howl'); G.total = G.carry ? G.carry.reduce((a, c) => a + (c.active ? c.score : 0), 0) : 0; G.endIx = clamp(G.saved, 0, 5); },
  update(dt) { G.t += dt; if (G.t > 1.5 && (game.input.pressed('confirm') || game.input.pressed('start') || (game.input.clicked && game.input.clicked()))) game.go('credits'); },
  draw(r) {
    const e = WP.TEXT.endings[G.endIx];
    backdropScene(r, G.t * 2, 0);
    r.overlay(g => {
      px.blend(g, .65, 'normal', () => px.rect(g, 0, 0, W, H, '#000'));
      E.font.title(g, e[0], W / 2, 40, { scale: 3, align: 'center', colors: ['#fff6c0', '#ffa030'], depth: 3, depthColor: '#6a2a10' });
      E.font.text(g, e[1], W / 2, 86, '#ffffff', { align: 'center', wrap: 380, outline: '#000' });
      for (let i = 0; i < 5; i++) { const x = 160 + i * 40; px.disc(g, x, 130, 11, i < G.saved ? '#4ad060' : '#2a3038'); px.rect(g, x - 1, 124, 2, 12, i < G.saved ? '#fff' : '#4a5058'); px.rect(g, x - 6, 129, 12, 2, i < G.saved ? '#fff' : '#4a5058'); }
      E.font.text(g, 'HOSTAGES HOME', W / 2, 150, '#c8d0e0', { align: 'center', outline: '#000' });
      E.font.text(g, 'FINAL SCORE ' + G.total + '   RANK', W / 2 - 14, 176, '#ffffff', { align: 'center', outline: '#000' });
      E.font.title(g, rankOf(G.total, Math.max(1, G.nSeats)), W / 2 + 96, 168, { scale: 3, colors: ['#ffffff', '#ff8a30'] });
      if (G.t > 1.5 && Math.floor(G.t * 2) % 2 === 0) E.font.text(g, L('confirm') + ' CONTINUE', W / 2, H - 16, '#ffffff', { align: 'center', outline: '#000' });
    });
  }
};
const creditsScene = {
  enter() { G.t = 0; },
  update(dt) { G.t += dt; if ((G.t > 1 && (game.input.pressed('confirm') || game.input.pressed('start'))) || G.t > 22) G.toInitials(); },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#05060c');
      const lines = ['OPERATION WOLFPACK', '', 'INSPIRED BY OPERATION WOLF (TAITO, 1987)', '', 'THE WOLFPACK', 'RED  BLUE  GREEN  GOLD', '', 'GENERAL HUGO KRAGG', 'AND THE HYENA LEGION', '', 'MADE ON MY-3D2DGE ' + (E.version || ''), 'ALL SOUND AND VOICES SYNTHESIZED IN CODE', '', 'THANK YOU FOR PLAYING'];
      const y0 = H - G.t * 14; lines.forEach((l, i) => E.font.text(g, l, W / 2, y0 + i * 14, i === 0 ? '#ffd24a' : '#e8e8f0', { align: 'center', outline: '#000' }));
    });
  }
};
G.toInitials = () => { G.leaving = false; const score = G.total || 0; if (cab.qualifies(score, 'wolfpack')) { game.go('initials'); } else game.go('scores', { fromRun: true }); };
const initialsScene = {
  enter() { G.t = 0; cab.enter(G.total || 0, 'wolfpack', () => { game.go('scores', { fromRun: true }); }); },
  update(dt) { cab.update(dt); },
  draw(r) { r.overlay(g => { px.rect(g, 0, 0, W, H, '#05060c'); E.font.title(g, 'NEW HIGH SCORE', W / 2, 24, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffa030'] }); }); cab.draw(r); }
};
const scoresScene = {
  enter(d) { G.t = 0; G.fromRun = d && d.fromRun; Au.music('title'); },
  update(dt) { G.t += dt; if ((G.t > .6 && (game.input.pressed('confirm') || game.input.pressed('cancel') || game.input.pressed('start'))) || (G.fromRun && G.t > 12)) game.go('title'); },
  draw(r) { r.overlay(g => px.rect(g, 0, 0, W, H, '#05060c')); cab.drawTable(r, 'wolfpack', 18, 'HIGH SCORES'); r.overlay(g => E.font.text(g, L('confirm') + ' BACK', W / 2, H - 14, '#a8b0c0', { align: 'center', outline: '#000' })); }
};
// game over / continue
const continueScene = {
  enter() { G.t = 0; G.cont = 10; Au.music('gameover'); },
  update(dt) {
    G.t += dt; G.cont -= dt; const I = game.input;
    if (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked())) { G.continues++; if (G.carry) for (const c of G.carry) { c.dmg = 0; c.down = false; c.score = Math.round(c.score * .5); c.spares = Math.max(c.spares, 3); c.grenades = Math.max(c.grenades, 2); c.mag = 30; } G.carry = G.carry || null; game.go('opcard'); }
    else if (G.cont <= 0 || I.pressed('cancel')) { G.total = G.sim ? G.sim.players.reduce((a, p) => a + (p.active ? p.score : 0), 0) : 0; G.toInitials(); }
  },
  draw(r) {
    if (G.world) drawWorld(r, G.world, G.t, { noGun: true, hint: false });
    r.overlay(g => { px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#000')); E.font.title(g, 'MISSION FAILED', W / 2, 70, { scale: 3, align: 'center', colors: ['#ffb0a0', '#e03030'] }); E.font.title(g, 'CONTINUE? ' + Math.max(0, Math.ceil(G.cont)), W / 2, 120, { scale: 3, align: 'center', colors: ['#ffffff', '#c8d0e0'] }); E.font.text(g, L('confirm') + ' CONTINUE (HALF SCORE)   ' + L('cancel') + ' GIVE UP', W / 2, 170, '#c8d0e0', { align: 'center', outline: '#000' }); });
  }
};

// how to play
const helpScene = {
  enter() { G.t = 0; },
  update(dt) { G.t += dt; if (game.input.pressed('confirm') || game.input.pressed('cancel') || game.input.pressed('start')) game.go('title'); },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#0a0e18'); E.font.title(g, 'HOW TO PLAY', W / 2, 10, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffa030'] });
      let y = 40; for (const [h, t] of WP.TEXT.help) { E.font.text(g, h, 16, y, '#ffd24a', { outline: '#000' }); E.font.text(g, t, 110, y, '#e8f0ff', { wrap: 360, outline: false }); y += E.font.wrap(t, 360).length * 10 + 8; }
      const ln = [L('fire') + ' FIRE', L('grenade') + ' GRENADE', L('reload') + ' RELOAD', L('snap') + ' SNAP TO THREAT', L('pause') + ' PAUSE'];
      E.font.text(g, ln.join('    '), W / 2, H - 28, '#7ab8e8', { align: 'center', outline: '#000' }); E.font.text(g, L('confirm') + ' BACK', W / 2, H - 14, '#a8b0c0', { align: 'center', outline: '#000' });
    });
  }
};

// about / credits screen: the Source Information block of TASK.md and the feedback sections
const aboutScene = {
  enter() { G.t = 0; G.scroll = 0; },
  update(dt) {
    G.t += dt; const I = game.input;
    const m = I.padMove || [0, 0]; G.scroll += ((I.down('down') ? 1 : 0) - (I.down('up') ? 1 : 0) + m[1]) * 90 * dt;
    const ra = I.padAim; if (ra) G.scroll += ra[1] * 140 * dt;
    G.scroll = clamp(G.scroll, 0, Math.max(0, WP.ABOUT_H - (H - 40)));
    if (I.pressed('cancel') || I.pressed('start') || (I.pressed('confirm') && G.t > .5)) game.go('title');
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#0a0e18');
      let y = 26 - G.scroll; const lines = WP.ABOUT_LINES();
      for (const [kind, text] of lines) {
        if (kind === 'h') { y += 4; if (y > 8 && y < H) E.font.text(g, text, 14, y, '#ffd24a', { outline: '#000' }); y += 12; }
        else { const wr = E.font.wrap(text, W - 28); for (const w of wr) { if (y > 8 && y < H - 4) E.font.text(g, w, 14, y, '#e0e8f4', { outline: false }); y += 9; } y += 2; }
      }
      WP.ABOUT_H = y + G.scroll + 20;
      px.rect(g, 0, 0, W, 22, '#0a0e18'); E.font.title(g, 'ABOUT  CREDITS', W / 2, 5, { scale: 1, align: 'center', colors: ['#fff6c0', '#ffa030'] });
      px.rect(g, 0, H - 14, W, 14, '#0a0e18'); E.font.text(g, 'UP DOWN SCROLL   ' + L('cancel') + ' BACK', W / 2, H - 11, '#a8b0c0', { align: 'center', font: 'tiny' });
    });
  }
};

// attract mode: a looping AI-played demo and the score table; any input exits
const ATTRACT = [{ op: 0, d: 220, sec: 26 }, { op: 0, boss: true, sec: 22 }, { table: true, sec: 6 }, { op: 1, d: 60, sec: 24 }, { op: 2, d: 360, sec: 24 }, { op: 3, d: 200, sec: 26 }, { op: 3, boss: true, sec: 20 }];
G.nextAttract = () => { G.attIdx = (G.attIdx + 1) % ATTRACT.length; game.go('attract'); };
const attractScene = {
  enter() {
    WP.dev.open = false; G.attract = true; G.leaving = false; G.t = 0; G.idleMouse = game.input.mouse ? game.input.mouse.t : undefined; G.armT = 0;
    const seg = ATTRACT[G.attIdx % ATTRACT.length]; G.seg = seg; G.segT = 0;
    if (seg.table) { G.sim = null; return; }
    G.nSeats = 1; G.carry = null; G.bot = new WP.Bot(0, {});
    const sim = G.startOp(seg.op, { invincible: true, infAmmo: true, d: seg.d, boss: seg.boss });
    G.localSeats = [0]; Au.cur = null; Au.music(seg.boss ? 'boss' : WP.STAGES[seg.op].music);
  },
  exit() { G.attract = false; },
  update(dt) {
    G.t += dt; G.segT += dt; G.armT += dt;
    if (G.armT > .6 && anyActivity()) { G.attract = false; G.sim = null; G.world = null; game.go('title'); return; }
    if (G.seg.table) { if (G.segT > G.seg.sec) G.nextAttract(); return; }
    playUpdate(dt, true);
    if (G.segT > G.seg.sec && !G.leaving) { G.leaving = true; G.nextAttract(); }
  },
  draw(r) {
    if (G.seg.table) { r.overlay(g => px.rect(g, 0, 0, W, H, '#05060c')); cab.drawTable(r, 'wolfpack', 40, 'HIGH SCORES'); r.overlay(g => { if (Math.floor(G.t * 2) % 2 === 0) E.font.text(g, 'PRESS ANY BUTTON', W / 2, H - 20, '#ffffff', { align: 'center', outline: '#000' }); }); return; }
    if (G.world) drawWorld(r, G.world, G.t, { demo: true, hint: false });
  }
};

// ---------------------------------------------------------------------------------------------- start
WP.Net = WP.Net || null;
const scenes = { title: titleScene, briefing: briefingScene, opcard: opcardScene, play: playScene, tally: tallyScene, cutscene: cutsceneScene, ending: endingScene, credits: creditsScene, initials: initialsScene, scores: scoresScene, continue: continueScene, help: helpScene, about: aboutScene, attract: attractScene };
WP.scenes = scenes; WP.game = game;
game.debug = WP.makeDebug ? WP.makeDebug(game, G) : {};
const boot = { title: 'OPERATION WOLFPACK', steps: [['Loading the pack', () => { for (let i = 0; i < WP.STAGES.length; i++) stageR(i); }], ['Tuning the radio', () => { cosmetic.den = A.makeRig('den'); }]] };
const startScene = () => { if (HUBBED && WP.Net) return 'hubcard'; return 'title'; };
if (WP.Net && WP.Net.scenes) Object.assign(scenes, WP.Net.scenes(G, game, drawWorld, handleEvents));
WP.startGame = () => game.start({ scenes, scene: startScene(), boot });
if (!globalThis.WP_NO_AUTOSTART) WP.startGame();
})();
