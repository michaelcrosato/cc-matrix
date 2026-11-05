// THE BATTLE SCENE: shows a BattleSim. The event player animates what apply() returns (walks, swings, spells,
// numbers, deaths, captures, level-ups, bells); the player's input becomes commands (choose a unit, move, then one
// action, with a forecast before every confirm); AI troops play at a readable pace. The camera eases to the cursor,
// turns in 60-degree steps and zooms. data: { spec, ctx: { kind, region, owner, title, intro, sides: ['human'|'ai'|
// 'remote'], seats, onEnd(result, sim), net, showcase, speed } }.

const BH = G.hex, BUI = G.UI, BP = E.px, FX = G.FX;
const SC = G.SCENES = G.SCENES || {};
const B = G.Battle = { sim: null };
E.VIEWS.board = new E.View('board', 'Board', 0, 50, 1.5, 1.15);
const SPEED = () => ({ Full: 1, Fast: 2, Minimal: 5 }[(G.game.settings && G.game.settings.battleAnim) || 'Full'] || 1) * G.tune.animSpeed * (B.ctx && B.ctx.speed || 1);

/* ---- the unit views ---- */
function makeViews() {
  B.views = {};
  for (const u of B.sim.units) addView(u);
}
function addView(u) {
  const [x, y] = B.field.center([u.cx, u.cy]);
  B.views[u.id] = { id: u.id, vis: new G.Vis(u), x, y, z: 0, vx: 0, vy: 0, facing: (u.facing || 0) * Math.PI / 3, act: null, hurt: 0, flash: 0, alpha: 1, dying: 0, gone: false, path: null, pathT: 0, kneel: false, summonK: u.summoned ? 0 : 1 };
}
const VW = id => B.views[id];
function hexW(c) { return B.field.center(c); }

/* ---- the event player ---- */
function queue(evs) { for (const e of evs) B.q.push(e); }
function playNext(dt) {
  if (B.wait > 0) { B.wait -= dt * SPEED() * (B.fast ? 4 : 1); return true; }
  if (B.fx.busy) return true;
  if (!B.q.length) return false;
  const e = B.q.shift();
  const d = playEvent(e) || 0;
  B.wait = d;
  return true;
}
function unitPos(id) { const v = VW(id); return v ? [v.x, v.y, v.z] : [0, 0, 0]; }
function lookAt(id) { const v = VW(id); if (v) B.focusGoal = [v.x, v.y]; }
function playEvent(e) {
  const sim = B.sim, s = sim.s, fxl = B.fx;
  switch (e.e) {
    case 'deploy': return 0;
    case 'bell': {
      B.banner = { text: 'BELL ' + e.n + ' / ' + s.bells, sub: G.SEASON_NAME[e.season || s.season] + (s.wheel ? ': the Wheel turns' : ''), t: 0, color: '#ffe080' };
      G.sfx('bell_toll', { pitch: 1 + (e.n - 1) * .03 });
      if (e.n >= Math.max(2, s.bells - 3) && s.mode === 'siege') G.layer('tension', 1);
      B.field.rebuild(); setWeather();
      return .9;
    }
    case 'season': B.field.rebuild(); setWeather(); B.banner = { text: G.SEASON_NAME[e.s].toUpperCase(), sub: G.TIDE_LINE[e.s], t: 0, color: G.elemColor(e.s) }; G.sfx('tide'); return .6;
    case 'turn': {
      for (const id of Object.keys(B.delegated)) if (B.delegated[id] === 'turn') delete B.delegated[id];
      const tr = sim.troop(e.troop), k = sim.unit(tr.knight); lookAt(k.id);
      B.turnBanner = { troop: tr.id, t: 0 }; B.cursor = [k.cx, k.cy]; B.sel = null; B.mode = 'idle';
      return .45;
    }
    case 'move': {
      const v = VW(e.u); if (!v) return 0;
      v.path = e.path.map(hexW); v.pathT = 0; lookAt(e.u);
      return Math.max(.15, (e.path.length - 1) * .16);
    }
    case 'undo': { const v = VW(e.u); if (v) { const [x, y] = hexW(e.to); v.x = x; v.y = y; v.path = null; } return 0; }
    case 'act': {
      const v = VW(e.u), u = sim.unit(e.u); if (!v) return 0;
      const sk = e.a === 'attack' ? null : e.a.startsWith('item:') ? null : G.get('skill', e.a);
      const move = animFor(u, v, e, sk);
      v.act = { move, k: 0, dur: .7 }; v.actElem = e.elem;
      const tgt = hexW(e.at); if (!(e.at[0] === u.cx && e.at[1] === u.cy)) v.facing = Math.atan2(tgt[1] - v.y, tgt[0] - v.x);
      B.focusGoal = [(v.x + tgt[0]) / 2, (v.y + tgt[1]) / 2];
      if (e.kind === 'spell' || (sk && sk.kind === 'spell')) { G.sfx('cast_charge'); castCircle(v, e.elem); }
      else if (u.kind === 'monster') G.sfx(G.CREATURE[G.get('monster', u.sp).voice] || 'growl');
      else G.sfx(u.basic && u.basic.ranged && e.a === 'attack' ? 'bow_twang' : 'slash_whoosh');
      B.actName = { text: e.name, t: 0, u: e.u };
      // the strike: projectiles and bursts at the swing's peak
      const mouth = v.vis.muzzle(), from = [v.x + mouth[0], v.y + mouth[1], v.z + mouth[2]];
      B.pending = { e, v, from, tgt, sk };
      return .32;
    }
    case 'hit': case 'miss': case 'heal': case 'status': case 'buff': case 'cleanse': case 'mp': case 'siphon': case 'push': case 'wake':
      strike(); return showResult(e);
    case 'dot': { const v = VW(e.t); if (v) { v.hurt = .3; v.flash = .2; G.game.particles.text(v.x, v.y, v.vis.headZ(), '-' + e.dmg, e.why === 'poison' ? '#9ae06a' : '#ff9a40', { bounce: true }); G.sfx(e.why === 'poison' ? 'poison' : 'burn'); } return .35; }
    case 'asleep': { const v = VW(e.t); if (v) G.game.particles.text(v.x, v.y, v.vis.headZ(), 'Zzz', '#c8b0ff'); return .25; }
    case 'stopped': { const v = VW(e.t); if (v) { G.game.particles.text(v.x, v.y, v.vis.headZ(), 'STOPPED', '#c8c8d0'); FX.clockFaceAt(v); G.sfx('stop'); } return .35; }
    case 'ko': {
      strike();
      const v = VW(e.t); if (!v) return 0;
      if (e.knight) { v.kneel = true; v.dying = .01; G.sfx('ko_knight'); G.game.shake(3); B.banner = { text: (sim.unit(e.t).name || '').toUpperCase() + ' FALLS', sub: '', t: 0, color: '#ff8a7a' }; }
      else { v.dying = .01; G.sfx('ko_monster'); G.game.particles.bits(v.x, v.y, 10, 14, G.ELC[sim.unit(e.t).elem] || G.ELC.none); }
      return .5;
    }
    case 'rebirth': { const v = VW(e.t); if (v) { v.dying = 0; G.FX.burst(fxl, [v.x, v.y, 0], 'summer', 20, true); G.game.particles.text(v.x, v.y, v.vis.headZ(), 'REBIRTH', '#ffd040'); } return .6; }
    case 'capture': { const v = VW(e.t), c = VW(e.by); if (v && c) { G.FX.chain(fxl, [c.x, c.y, 0], [v.x, v.y, 0]); v.captured = .01; G.sfx('capture'); G.sting('capture'); G.game.particles.text(v.x, v.y, v.vis.headZ(), 'CAPTURED', '#ffd060'); } return .7; }
    case 'retreat': case 'retreatcall': { if (e.e === 'retreatcall') { const v = VW(e.u); if (v) G.game.particles.text(v.x, v.y, v.vis.headZ(), 'RETREAT', '#e8e4ff'); return .3; } const v = VW(e.t); if (v) v.leaving = .01; return .12; }
    case 'troopgone': return .2;
    case 'rout': B.banner = { text: (s.sides[e.side].name || '').toUpperCase() + ' ROUTED', sub: 'Their ruler has left the field', t: 0, color: '#ff8a7a' }; return 1;
    case 'level': { const v = VW(e.t); if (v) { G.FX.levelUp(fxl, [v.x, v.y, v.z], e.gains); G.sting('levelup'); G.game.particles.text(v.x, v.y, v.vis.headZ() + 6, 'LEVEL ' + e.level, '#ffe040', { scale: 1 }); } return .6; }
    case 'burnhex': B.field.rebuild(); G.sfx('burn'); return .1;
    case 'ash': B.field.rebuild(); return 0;
    case 'misfire': { const v = VW(e.u); if (v) G.game.particles.text(v.x, v.y, v.vis.headZ(), 'MISFIRE!', '#a8e0ff'); return .4; }
    case 'untimed': { const v = VW(e.t); if (v) { G.game.flash('#fff8d0', .25, .5); G.game.particles.text(v.x, v.y, v.vis.headZ() + 6, 'TIMELESS BROKEN', '#fff8d0'); } return .6; }
    case 'hand': { B.handFlash = { line: e.line, t: 0 }; G.sfx('stop'); return .6; }
    case 'dial': { B.field.rebuild(); if (e.lit) { G.sfx('dial'); const [x, y] = hexW(e.c); G.FX.burst(fxl, [x, y, 0], 'none', 16); } return .5; }
    case 'wheel': { G.game.flash('#fff8d0', .5, .8); G.sfx('wheel'); B.banner = { text: 'THE WHEEL TURNS!', sub: 'Timeless is broken. The Gray Knight\'s guard falls.', t: 0, color: '#fff0a0' }; G.music('boss'); return 1.6; }
    case 'summon': { const u = sim.unit(e.t); addView(u); const v = VW(e.t); v.summonK = 0; G.FX.summon(fxl, [v.x, v.y], 'hour', 1); G.sfx('summon_rise'); B.banner = { text: 'SECOND HANDS', sub: 'The Gray Knight calls his servants', t: 0, color: '#d8c070' }; return .8; }
    case 'glory': { const k = s.troops.find(t => t.side === e.side); if (k) { const v = VW(k.knight); if (v) G.game.particles.text(v.x, v.y, v.vis.headZ() + 8, '+' + Math.round(e.pts) + ' GLORY', '#ffd36a'); } return 0; }
    case 'sideout': B.banner = { text: (s.sides[e.side].name || '').toUpperCase() + ' IS OUT', sub: '', t: 0, color: '#ff8a7a' }; return .8;
    case 'guard': { const v = VW(e.u); if (v) { G.FX.buff(fxl, [v.x, v.y, v.z], 'warded'); G.sfx('buff'); } return .2; }
    case 'wait': case 'turnend': case 'skip': case 'fxend': case 'bellend': return 0;
    case 'over': B.overShown = 0; return .1;
    case 'illegal': return 0;
  }
  return 0;
}
/** the move a unit plays for an action (each class line its own) */
function animFor(u, v, e, sk) {
  const ms = v.vis.moves || G.MOVESET.warrior;
  if (v.vis.kind !== 'humanoid') return (sk && sk.anim) || (u.basic && u.basic.anim) || 'bite';
  if (e.a === 'attack') return u.ref === 'graynight' ? ['plunge', 'twohand', 'spin'][B.sim.s.bell % 3] : ms.basic;
  if (e.a.startsWith('item:')) return 'cast';
  if (sk.kind === 'spell') return 'cast';
  if (sk.anim && (E.MOVES[sk.anim] || ['cast', 'cheer', 'block', 'wave', 'hips'].includes(sk.anim))) return sk.anim;
  return ms.special || 'slash';
}
function castCircle(v, elem) { const col = (G.ELC[elem] || G.ELC.none)[0]; B.fx.add({ dur: .5, draw(r, k) { r.decal(g => { const pts = r.groundPts(v.x, v.y, 10 + k * 4, 20, 0); for (let i = 0; i < pts.length; i += 1) { const p = pts[i], q = pts[(i + 1) % pts.length]; BP.line(g, p[0], p[1], q[0], q[1], col, 1); } }, { emissive: 1 }); } }); }
/** the strike lands: spawn the action's visual once */
function strike() {
  const p = B.pending; if (!p) return; B.pending = null;
  const { e, v, from, tgt, sk } = p, fxl = B.fx, elem = e.elem && e.elem !== 'none' ? e.elem : 'none', kind = e.fx;
  const to = [tgt[0], tgt[1], 10];
  if (kind === 'arrow' || kind === 'pierce' || kind === 'volley') { G.FX.projectile(fxl, from, to, 'arrow', elem, .3); G.game.after(.28 / SPEED(), () => G.sfx('arrow_hit')); }
  else if (kind === 'bolt' || kind === 'hex' || kind === 'drain') { G.FX.projectile(fxl, from, to, 'bolt', elem, .28); G.game.after(.26 / SPEED(), () => { G.FX.burst(fxl, to, elem, 12); G.spellSfx(elem); }); }
  else if (kind === 'storm' || kind === 'tempest' || kind === 'holy' || kind === 'volley') { G.spellSfx(elem); for (const c of (e.area || [e.at])) { const w = hexW(c); G.FX.burst(fxl, [w[0], w[1], 0], elem, 12, kind === 'tempest'); } if (kind === 'tempest' && elem === 'summer') G.game.flash('#fff0c0', .15, .4); if (kind === 'tempest' && elem === 'winter') G.game.weather = { kind: 'snow', amount: .9, wind: .6 }; }
  else if (kind === 'breath' || kind === 'water' || kind === 'fire') { G.FX.breath(fxl, from, (e.area || [e.at]).map(c => hexW(c)), kind === 'water' ? 'spring' : elem); G.spellSfx(elem); }
  else if (kind === 'heal') { for (const c of (e.area || [e.at])) { const w = hexW(c); G.FX.heal(fxl, [w[0], w[1], 0]); } G.sfx('heal'); }
  else if (kind === 'buff' || kind === 'roar') { G.sfx(kind === 'roar' ? 'roar_small' : 'buff'); }
  else if (kind === 'ice') { G.FX.projectile(fxl, from, to, 'ice', 'winter', .3); G.game.after(.28 / SPEED(), () => G.FX.burst(fxl, to, 'winter', 14)); }
  else if (kind === 'quake') { G.game.shake(4); for (const c of (e.area || [])) { const w = hexW(c); G.game.particles.dust(w[0], w[1], 0, 5); } }
  else if (kind === 'vine' || kind === 'wind') G.FX.burst(fxl, to, elem === 'none' ? 'spring' : elem, 10);
  else if (kind === 'hourslash') { G.FX.burst(fxl, to, 'hour', 16); }
}
FX.clockFaceAt = v => B.fx.add({ dur: .6, draw(r, k) { G.FX.clockFace(r, v.x, v.y, 12, k * 8, 1 - k); } });
function showResult(e) {
  const sim = B.sim, P = G.game.particles, v = VW(e.t || e.u);
  switch (e.e) {
    case 'hit': {
      if (!v) return 0;
      v.hurt = .35; v.flash = .18;
      const head = v.vis.headZ();
      if (e.thorns) { P.text(v.x, v.y, head, '-' + e.dmg, '#c8ffa0', { bounce: true }); return .2; }
      G.game.hitFx(v.x, v.y, head * .6, { power: e.crit ? 1.6 : .8, damage: e.dmg, sound: e.crit ? 'crit' : 'sword_clang', textZ: head, rumble: true });
      if (e.crit) P.text(v.x, v.y, head + 10, 'CRIT!', '#ffe040', { scale: 1 });
      if (e.elem === 'strong') P.text(v.x, v.y, head + 16, '↑ STRONG', '#ff9a40'); else if (e.elem === 'weak') P.text(v.x, v.y, head + 16, '↓ WEAK', '#8ab0ff');
      return .32;
    }
    case 'miss': if (v) { P.text(v.x, v.y, v.vis.headZ(), 'MISS', '#a8a8b8'); G.sfx('miss'); v.dodge = .3; } return .3;
    case 'heal': if (v && e.amt > 0) { P.text(v.x, v.y, v.vis.headZ(), '+' + e.amt, '#7ae07a', { bounce: true }); if (e.why) G.sfx('heal'); } return e.why ? .2 : .25;
    case 'status': if (v) { if (e.ok) { P.text(v.x, v.y, v.vis.headZ() + 4, G.get('effect', e.s).name.toUpperCase(), G.get('effect', e.s).color); G.sfx(['poison', 'burn', 'chill', 'sleep', 'stop'].includes(e.s) ? e.s : 'debuff'); if (e.s === 'stop') FX.clockFaceAt(v); } else P.text(v.x, v.y, v.vis.headZ() + 4, 'RESIST', '#c8c8d0'); } return .3;
    case 'buff': if (v) { for (const b of e.fx.split(',')) G.FX.buff(B.fx, [v.x, v.y, v.z], b); G.sfx('buff'); } return .25;
    case 'cleanse': if (v) { G.FX.heal(B.fx, [v.x, v.y, v.z]); P.text(v.x, v.y, v.vis.headZ(), 'CLEANSED', '#c8ffc8'); } return .25;
    case 'mp': if (v) P.text(v.x, v.y, v.vis.headZ(), '+' + e.amt + ' MP', '#8ac8ff'); return .2;
    case 'siphon': if (v) P.text(v.x, v.y, v.vis.headZ(), '-' + e.amt + ' MP', '#8ac8ff'); return .25;
    case 'push': { const pv = VW(e.t); if (pv) { pv.path = [hexW(e.from), hexW(e.to)]; pv.pathT = 0; } return .2; }
    case 'wake': if (v) P.text(v.x, v.y, v.vis.headZ() + 4, 'AWAKE', '#ffffff'); return .1;
  }
  return 0;
}

/* ---- weather, light, music ---- */
function setWeather() {
  const s = B.sim.s, rm = G.game.settings && G.game.settings.reduceMotion;
  const w = s.season === 'spring' ? { kind: 'rain', amount: .35 * (rm ? .5 : 1), wind: .15 } : G.weatherFor(s.season, rm);
  G.game.weather = B.noWeather ? null : w;
  G.game.lights.enabled = true; G.game.lights.ambient = G.ambientFor(s.season, B.region);
}

/* ---- the scene ---- */
SC.battle = {
  pausable: true, view: 'board', views: ['board', 'iso'], input: G.PRESET, camera: { zoom: [.7, 2], start: 1 },
  enter(data) {
    const d = data || G.devBattleSpec('river_ford', 'spring');
    B.ctx = Object.assign({ kind: 'skirmish', sides: d.spec.sides.map(sd => sd.human ? 'human' : 'ai') }, d.ctx || {});
    B.sim = d.sim || G.BattleSim.create(d.spec);
    if (d.fx) for (const [ref, fx] of Object.entries(d.fx)) { const u = B.sim.units.find(x => x.ref === ref); if (u) Object.assign(u.fx, fx); }
    B.region = B.ctx.region || 'neutral';
    B.field = new G.Field(B.sim, { region: B.region, owner: B.ctx.owner });
    B.fx = new G.FXList(); B.q = []; B.wait = 0; B.pending = null; B.mode = 'idle'; B.sel = null; B.menu = null; B.sub = null;
    B.cursor = null; B.focus = null; B.focusGoal = null; B.banner = null; B.turnBanner = null; B.danger = false; B.overShown = null; B.aiTimer = 0; B.fast = false; B.auto = {};
    B.t = 0; B.delegated = {}; B.ended = false; B.tips = {}; B.hover = null; B.lastCursor = null; B.noWeather = false;
    makeViews();
    const k0 = B.sim.units.find(u => u.kind === 'knight'); if (k0) { const [x, y] = hexW([k0.cx, k0.cy]); B.focus = [x, y]; B.focusGoal = [x, y]; B.cursor = [k0.cx, k0.cy]; }
    G.game.cam.bounds = v => B.field.bounds(v);
    G.game.setView(G.game.settings && G.game.settings.battleView === 'Isometric' ? 'iso' : 'board');
    setWeather();
    const mus = B.ctx.music || (B.sim.s.mode === 'sanctum' ? 'boss' : B.region === 'hour' ? 'hourless' : B.ctx.playerSide === 1 ? 'battle_defend' : 'battle_attack');
    G.music(mus, { restart: true });
    queue(B.sim.startEvents || []);
    // the opening lines (rivals, oaths) before the first bell
    if (B.ctx.intro && B.ctx.intro.length) G.Talk.run(B.ctx.intro);
    if (B.ctx.kind === 'tutorial') BUI.tip('t1', 'Choose a unit', 'Your troop acts this bell. Move the cursor to one of your units and press ' + G.labelOf('confirm') + '.');
  },
  exit() { G.game.weather = null; G.layer('tension', 0, .1); },
  back() { return goBack(); },
  update(dt) {
    G.inputTick(dt); B.t += dt; BUI.tickToasts(dt);
    if (G.Talk.update(dt)) return;
    if (BUI.modalUpdate()) return;
    updateViews(dt); B.fx.update(dt);
    if (B.banner) { B.banner.t += dt; if (B.banner.t > 1.6) B.banner = null; }
    if (B.turnBanner) { B.turnBanner.t += dt; if (B.turnBanner.t > 1.2) B.turnBanner = null; }
    if (B.actName) { B.actName.t += dt; if (B.actName.t > 1.2) B.actName = null; }
    if (B.handFlash) { B.handFlash.t += dt; if (B.handFlash.t > .8) B.handFlash = null; }
    B.fast = G.inp().down('confirm') && activeController() !== 'human';
    camera(dt);
    if (B.ctx.kind === 'attract') { if (G.Attract.watch()) return; attractTick(dt); }
    if (B.ctx.net && G.hub.waiting()) return;
    if (B.ctx.net) B.ctx.net.tick(dt);
    if (playNext(dt)) return;
    if (B.pending) strike();
    const s = B.sim.s;
    if (s.over) { return endBattle(dt); }
    const ctl = activeController();
    if (ctl === 'human') humanUpdate(dt);
    else if (ctl === 'ai') aiUpdate(dt);
    if (ctl !== 'human') commonKeys();
  },
  draw(r) { drawBattle(r); }
};
/** who controls the active troop: 'human', 'ai' or 'remote' */
function activeController() {
  const tr = B.sim.activeTroop(); if (!tr) return 'none';
  if (B.delegated.all || B.delegated[tr.id] || tr.auto) return 'ai';
  return B.ctx.sides[tr.side] || 'ai';
}
/** the input of the seat that commands the active troop */
function seatInput() {
  const tr = B.sim.activeTroop(); const seat = tr && B.ctx.seats ? B.ctx.seats[tr.side] : null;
  G.In.seatInput = seat !== null && seat !== undefined && G.game.players && G.game.players[seat] && G.game.players.length > 1 ? G.game.players[seat] : null;
}
/** apply a command from the local player (on a hub client it goes to the host) */
function command(cmd) {
  if (B.ctx.net && !B.ctx.net.isHost) { B.ctx.net.send(cmd); return []; }
  const ev = B.sim.apply(cmd);
  if (ev.length && ev[0].e === 'illegal') { G.sfx('ui_error'); BUI.toast(ev[0].why, BUI.COL.bad); return ev; }
  if (B.ctx.net) B.ctx.net.applied(cmd, ev);
  queue(ev); return ev;
}
G.Battle.apply = cmd => { const ev = B.sim.apply(cmd); queue(ev); return ev; };
G.Battle.queue = queue;

function aiUpdate(dt) {
  B.aiTimer -= dt * SPEED() * (B.fast ? 4 : 1);
  if (B.aiTimer > 0) return;
  if (B.ctx.net && !B.ctx.net.isHost) return;
  const tr = B.sim.activeTroop(), lv = B.sim.s.sides[tr.side].ai || 'normal';
  const c = G.BattleAI.next(B.sim, { level: lv, showcase: B.ctx.showcase }); if (!c) return;
  const ev = B.sim.apply(c); if (ev[0] && ev[0].e === 'illegal') queue(B.sim.apply({ t: 'end' })); else { queue(ev); if (B.ctx.net) B.ctx.net.applied(c, ev); }
  B.aiTimer = c.t === 'move' ? .05 : .25;
}

/* ---- the player's turn ---- */
function myUnits() { const tr = B.sim.activeTroop(); return tr ? tr.units.map(id => B.sim.unit(id)).filter(u => B.sim.onField(u) && !u.done) : []; }
function commonKeys() {
  if (G.pressed('danger')) { B.danger = !B.danger; G.sfx('ui_move'); }
  if (G.pressed('turnR') || G.pressed('turnL')) turnCam(G.pressed('turnL') ? -60 : 60);
  if (G.pressed('view')) { G.game.setView(G.game.view.id === 'iso' ? 'board' : 'iso'); }
  const z = G.inp().pressed('zoomIn') ? 1.15 : G.inp().pressed('zoomOut') ? 1 / 1.15 : 1; if (z !== 1 && G.game.zoomBy) G.game.zoomBy(z);
}
function turnCam(deg) { G.game.rotateView(deg); G.sfx('ui_move'); }
function cursorStep() {
  const inp = G.inp(), view = G.game.view;
  let moved = false;
  for (const [a, mx, my] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) {
    if (!G.repeat(a)) continue;
    const m = inp.move(), dx = Math.abs(m[0]) > .3 ? Math.sign(m[0]) : mx, dy = Math.abs(m[1]) > .3 ? Math.sign(m[1]) : my;
    const n = BH.screenStep(B.cursor, dx || mx, dy || my, view);
    if (n && B.field.inside(n)) { B.cursor = n; moved = true; }
    break;
  }
  // the mouse: the hex under the pointer
  const p = inp.pointer ? inp.pointer() : null;
  if (p && inp.lastDevice === 'mouse' && (!B.lastPtr || p[0] !== B.lastPtr[0] || p[1] !== B.lastPtr[1])) {
    const gp = G.game.mouseGround(); if (gp) { const c = B.field.cellAt(gp[0], gp[1]); if (B.field.inside(c) && !BH.eq(c, B.cursor)) { B.cursor = c; moved = true; } }
  }
  B.lastPtr = p ? p.slice() : null;
  if (moved) { G.sfx('ui_move'); const [x, y] = hexW(B.cursor); B.focusGoal = [x, y]; }
  return moved;
}
function clickedHex() { const c = G.inp().clicked && G.inp().clicked(); if (!c) return null; const gp = G.game.mouseGround(); if (!gp) return null; const h = B.field.cellAt(gp[0], gp[1]); return B.field.inside(h) ? h : null; }
function humanUpdate(dt) {
  seatInput();
  B.timeLeft = G.LocalMP.tick(dt, B);
  const sim = B.sim, inp = G.inp();
  commonKeys();
  if (B.mode === 'idle') { B.mode = 'select'; const u = myUnits()[0]; if (u) B.cursor = [u.cx, u.cy]; }
  // hold □ (Space) to end the troop's turn; a tap opens the commands
  if (B.mode === 'select' || B.mode === 'move') {
    if (G.holdDone('command')) { askEndTurn(); return; }
    if (G.tapped('command') && !B.menu) { openCommands(); return; }
    if (G.pressed('next') || G.pressed('prev')) { const us = myUnits(); if (us.length) { const i = us.findIndex(u => B.sel === u.id), n = us[(i + (G.pressed('prev') ? us.length - 1 : 1) + us.length) % us.length]; select(n.id); } return; }
  }
  if (B.menu) return menuUpdate();
  switch (B.mode) {
    case 'select': {
      cursorStep();
      if (inp.pressed('info')) { const o = sim.at(B.cursor); if (o) B.infoUnit = o.id; }
      if (inp.pressed('confirm')) {
        const o = sim.at(B.cursor), tr = sim.activeTroop();
        if (o && o.troop === tr.id && !o.done) { select(o.id); G.sfx('ui_confirm'); }
        else if (o) { B.infoUnit = o.id; }
        else G.sfx('ui_error');
      }
      if (inp.pressed('cancel')) { if (B.infoUnit) B.infoUnit = null; else G.game.pause(); }
      break;
    }
    case 'move': {
      cursorStep();
      const u = sim.unit(B.sel), reach = B.reach || {};
      if (inp.pressed('confirm')) {
        const k = BH.key(B.cursor);
        if (BH.eq(B.cursor, [u.cx, u.cy])) { openMenu(); G.sfx('ui_confirm'); }
        else if (reach[k]) { command({ t: 'move', u: u.id, to: B.cursor }); G.sfx('ui_confirm'); B.afterMove = true; B.mode = 'moving'; }
        else { const o = sim.at(B.cursor); if (o && o.troop === u.troop && !o.done) select(o.id); else G.sfx('ui_error'); }
      }
      if (inp.pressed('cancel')) { B.mode = 'select'; B.sel = null; G.sfx('ui_cancel'); }
      if (inp.pressed('info')) { const o = sim.at(B.cursor); if (o) B.infoUnit = o.id; }
      break;
    }
    case 'moving': if (!B.q.length && B.wait <= 0) openMenu(); break;
    case 'target': {
      cursorStep();
      const u = sim.unit(B.sel), valid = B.targets || [];
      if (inp.pressed('confirm')) {
        if (valid.some(h => BH.eq(h, B.cursor))) { const a = B.action; B.mode = 'idle'; B.targets = null; command({ t: 'act', u: u.id, a, at: B.cursor }); B.sel = null; G.sfx('ui_confirm'); tutorialAfterAct(a); }
        else G.sfx('ui_error');
      }
      if (inp.pressed('cancel')) { B.mode = 'menu'; openMenu(); G.sfx('ui_cancel'); }
      break;
    }
  }
}
function select(id) {
  const u = B.sim.unit(id); B.sel = id; B.cursor = [u.cx, u.cy]; B.infoUnit = null;
  if (u.moved || u.acted) { openMenu(); return; }
  B.reach = B.sim.reach(u); B.mode = 'move';
  if (B.ctx.kind === 'tutorial') BUI.tip('t2', 'Move', 'The blue hexes show how far it can walk. Pick one, or press ' + G.labelOf('confirm') + ' on the unit itself to act without moving.');
}
/** the command list for the selected unit */
function openMenu() {
  const sim = B.sim, u = sim.unit(B.sel); if (!u) { B.mode = 'select'; return; }
  B.mode = 'menu';
  const acts = sim.actions(u), rows = [];
  if (!u.moved && !u.acted) rows.push({ label: 'Move', act: () => { B.menu = null; select(u.id); } });
  const atk = acts.find(a => a.a === 'attack');
  rows.push({ label: 'Attack', right: u.basic.name, disabled: atk.ok ? false : atk.why, act: () => startTarget('attack') });
  const sp = acts.filter(a => a.a !== 'attack' && !a.a.startsWith('item:') && a.sk.kind === 'special'), sl = acts.filter(a => a.sk.kind === 'spell'), it = acts.filter(a => a.a.startsWith('item:'));
  if (sp.length) rows.push({ label: 'Special ▸', disabled: sp.some(a => a.ok) ? false : sp[0].why, act: () => openSub('Special', sp) });
  if (sl.length) rows.push({ label: 'Spell ▸', disabled: sl.some(a => a.ok) ? false : (u.moved ? 'Spells need planted feet' : sl[0].why), act: () => openSub('Spell', sl) });
  if (u.kind === 'knight') rows.push({ label: 'Item ▸', disabled: it.some(a => a.ok) ? false : it.length ? it[0].why : 'No items', act: () => openSub('Item', it) });
  rows.push({ label: 'Guard', right: 'DEF +30%', act: () => { B.menu = null; command({ t: 'guard', u: u.id }); B.sel = null; B.mode = 'idle'; } });
  rows.push({ label: 'Wait', act: () => { B.menu = null; command({ t: 'wait', u: u.id }); B.sel = null; B.mode = 'idle'; } });
  if (u.kind === 'knight' && sim.s.mode !== 'shrine') rows.push({ label: 'Retreat', color: '#ff9a8a', act: () => { BUI.confirm(u.ruler ? 'A ruler who retreats loses the battle. Retreat?' : 'Retreat ' + u.name + "'s troop from the field?", () => { B.menu = null; command({ t: 'retreat', u: u.id }); B.mode = 'idle'; B.sel = null; }); } });
  B.menu = { title: u.name, list: new BUI.List(), rows };
  if (B.ctx.kind === 'tutorial' && u.skills.some(s => G.get('skill', s).kind === 'spell')) BUI.tip('t5', 'Planted feet', 'Spells can only be cast before moving. Specials marked mobile work after a move.');
}
function openSub(title, acts) {
  const u = B.sim.unit(B.sel);
  B.menu = { title, list: new BUI.List(), rows: acts.map(a => ({ label: a.sk.name + (a.count ? ' x' + a.count : ''), right: a.sk.mp ? a.sk.mp + ' MP' : '', disabled: a.ok ? false : a.why, desc: a.sk.desc, act: () => startTarget(a.a) })), parent: true };
}
function startTarget(a) {
  const u = B.sim.unit(B.sel); B.action = a; B.menu = null;
  B.targets = B.sim.targets(u, a);
  if (!B.targets.length) { G.sfx('ui_error'); openMenu(); return; }
  B.mode = 'target';
  // the nearest target first
  const best = B.targets.slice().sort((x, y) => BH.dist(x, [u.cx, u.cy]) - BH.dist(y, [u.cx, u.cy]))[0];
  B.cursor = best.slice();
  if (B.ctx.kind === 'tutorial') BUI.tip('t3', 'The forecast', 'Before you confirm, the forecast shows the hit chance, the damage, and STRONG (↑) or WEAK (↓) for the elements.');
}
function menuUpdate() {
  const m = B.menu, k = BUI.k();
  const res = m.list.update(m.rows);
  if (res === 'pick') { const row = m.list.sel; if (row && !row.disabled) { G.sfx('ui_confirm'); row.act(); } }
  else if (res === 'back') {
    G.sfx('ui_cancel');
    if (m.cmds) { B.menu = null; return; }
    if (m.parent) { openMenu(); return; }
    const u = B.sim.unit(B.sel); B.menu = null;
    if (u && u.moved && !u.acted) { command({ t: 'undo', u: u.id }); select(u.id); }
    else { B.mode = 'select'; B.sel = null; }
  }
}
function openCommands() {
  const tr = B.sim.activeTroop(), rows = [
    { label: 'End troop turn', act: () => { B.menu = null; askEndTurn(); } },
    { label: 'Delegate troop', right: 'AI plays it', act: () => { B.menu = null; B.delegated[tr.id] = true; BUI.toast('This troop is delegated for the battle'); } },
    { label: (B.danger ? 'Hide' : 'Show') + ' danger', act: () => { B.danger = !B.danger; B.menu = null; } }];
  if (B.ctx.kind !== 'hub' && B.ctx.kind !== 'tutorial') rows.push({ label: 'Delegate battle', right: 'to the end', act: () => { B.menu = null; BUI.confirm('Let your captains fight the rest of this battle?', () => { B.delegated.all = true; }, { def: 'yes' }); } });
  B.menu = { title: 'Commands', list: new BUI.List(), rows, cmds: true };
}
function askEndTurn() {
  const go = () => { B.menu = null; B.sel = null; B.mode = 'idle'; command({ t: 'end' }); };
  if (G.game.settings && G.game.settings.confirmEnd === 'Off' || !myUnits().length) go(); else BUI.confirm('End this troop\'s turn? The rest will wait.', go, { def: 'yes' });
}
function goBack() { if (B.menu) { B.menu = null; return true; } if (B.mode === 'target') { openMenu(); return true; } if (B.mode === 'move') { B.mode = 'select'; return true; } return false; }
function tutorialAfterAct(a) {
  if (B.ctx.kind !== 'tutorial') return;
  BUI.tip('t4', 'Ward', 'Each knight has a Ward ring. A monster outside its own knight\'s Ward is weaker and easier to capture.');
  if (B.sim.s.bell >= 2) BUI.tip('t6', 'The Season Tide', 'Units of the battle\'s season deal more damage: see the badge at the top left.');
}

/* ---- the attract reel's battle: it ends after 45 s; scripted inserts show a Tide, a level-up and a promotion ---- */
function attractTick(dt) {
  B.attractT = (B.attractT || 0) + dt;
  const t = B.attractT, sim = B.sim;
  if (t > 1 && !B.ins1) { B.ins1 = true; if (sim.s.mode === 'sanctum') { queue(sim.apply({ t: 'dials' })); } B.banner = { text: (B.ctx.caption || 'THE SEASONAL TIDE'), sub: G.TIDE_LINE[sim.s.season], t: 0, color: G.elemColor(sim.s.season) }; }
  if (t > 16 && !B.ins2) { B.ins2 = true; const u = sim.field().filter(x => x.kind === 'monster')[0]; if (u) { const ev = []; sim._levelUp(u, ev); queue(ev); } }
  if (t > 26 && !B.ins3) { B.ins3 = true; const u = sim.field().filter(x => x.kind === 'monster')[1] || sim.field()[0]; const v = u && VW(u.id); if (v) { G.FX.promote(B.fx, [v.x, v.y, 0], u.elem); G.sting('promote'); B.banner = { text: 'PROMOTION', sub: 'Monsters change form as they grow', t: 0, color: '#ffe080' }; } }
  if (t > 34 && !B.ins4) { B.ins4 = true; B.banner = { text: 'CAPTURE', sub: 'Rout a knight and take its monsters', t: 0, color: '#ffd060' }; }
  if (t > 45 && !B.ended) { B.ended = true; B.ctx.onEnd && B.ctx.onEnd(); }
}

/* ---- views follow the sim ---- */
function updateViews(dt) {
  const sim = B.sim, sp = SPEED() * (B.fast ? 4 : 1);
  for (const id in B.views) {
    const v = B.views[id], u = sim.unit(id); if (!u) continue;
    let vx = 0, vy = 0;
    if (v.path) {
      v.pathT += dt * sp / .16; const n = v.path.length - 1, i = Math.min(n - 1, Math.floor(v.pathT)), k = Math.min(1, v.pathT - i);
      if (n < 1 || v.pathT >= n) { const e = v.path[v.path.length - 1]; v.x = e[0]; v.y = e[1]; v.path = null; }
      else { const a = v.path[i], b = v.path[i + 1], nx = a[0] + (b[0] - a[0]) * k, ny = a[1] + (b[1] - a[1]) * k; vx = (nx - v.x) / Math.max(dt, 1e-4); vy = (ny - v.y) / Math.max(dt, 1e-4); v.x = nx; v.y = ny; v.facing = Math.atan2(b[1] - a[1], b[0] - a[0]); if (Math.random() < .08) G.sfx('step_soft'); }
    } else if (!v.dying && !v.captured && !v.leaving) { const [x, y] = hexW([u.cx, u.cy]); v.x += (x - v.x) * Math.min(1, dt * 12); v.y += (y - v.y) * Math.min(1, dt * 12); }
    if (v.act) { v.act.k += dt * sp / v.act.dur; if (v.act.k >= .35 && B.pending && B.pending.v === v) strike(); if (v.act.k >= 1) v.act = null; }
    v.hurt = Math.max(0, v.hurt - dt * 2); v.flash = Math.max(0, v.flash - dt); v.dodge = Math.max(0, (v.dodge || 0) - dt);
    if (v.dying) { v.dying += dt * sp; if (u.kind === 'knight') v.alpha = Math.max(0, 1 - Math.max(0, v.dying - .8) * 1.5); else v.alpha = Math.max(0, 1 - Math.max(0, v.dying - .5) * 2); if (v.alpha <= 0) v.gone = true; }
    if (v.captured) { v.captured += dt * sp; v.alpha = Math.max(0, 1 - v.captured * 1.2); if (v.alpha <= 0) v.gone = true; }
    if (v.leaving) { v.leaving += dt * sp; v.alpha = Math.max(0, 1 - v.leaving * 1.4); vx = Math.cos(v.facing) * -20; if (v.alpha <= 0) v.gone = true; }
    if (v.summonK < 1) v.summonK = Math.min(1, v.summonK + dt * 1.2);
    v.vx = vx; v.vy = vy;
    v.vis.update(dt, { x: v.x, y: v.y, z: 0, vx, vy, facing: v.facing, act: v.act, hurt: v.hurt, sleep: !!u.fx.sleep && !v.dying, dead: !!v.dying && u.kind === 'monster', guard: !!u.fx.guarded && !v.act, kneel: v.kneel || (u.kind === 'knight' && !u.alive) });
  }
}
function camera(dt) {
  if (!B.focusGoal) return;
  if (!B.focus) B.focus = B.focusGoal.slice();
  const k = Math.min(1, dt / .15);
  B.focus[0] += (B.focusGoal[0] - B.focus[0]) * k; B.focus[1] += (B.focusGoal[1] - B.focus[1]) * k;
  G.game.focus(B.focus[0], B.focus[1], 12);
}

/* ---- the end ---- */
function endBattle(dt) {
  if (B.ended) return;
  B.overShown = (B.overShown || 0) + dt;
  const s = B.sim.s, w = s.over.winner;
  if (!B.endSting) {
    B.endSting = true; const ps = B.ctx.playerSide;
    const won = ps === undefined ? true : (s.mode === 'shrine' ? s.over.standings[0].includes(ps) : w === ps);
    G.sting(won ? 'victory' : 'defeat'); G.layer('tension', 0);
    B.banner = { text: s.mode === 'shrine' ? (s.sides[w].name || '').toUpperCase() + ' WINS' : ps === undefined ? (s.sides[w].name || '').toUpperCase() + ' WINS' : won ? 'VICTORY' : 'DEFEAT', sub: reasonText(s.over.reason), t: -1.5, color: won ? '#ffe080' : '#ff8a7a' };
    for (const id in B.views) { const u = B.sim.unit(id); if (u && u.side === w && B.sim.onField(u) && B.views[id].vis.kind === 'humanoid') B.views[id].act = { move: 'cheer', k: 0, dur: 99 }; }
  }
  if (B.overShown > 2.2 && !G.Talk.open) {
    B.ended = true;
    const res = B.sim.result();
    if (B.ctx.onEnd) B.ctx.onEnd(res, B.sim); else G.game.go('title');
  }
}
function reasonText(r) { return { rout: 'Every knight has left the field', keep: 'A knight holds the Keep at the last bell', bells: 'The twelfth bell rings: the Keep holds', graynight: 'The Gray Knight has fallen', thirteenth: 'The thirteenth bell tolls', dev: 'Dev mode', last: 'The last banner standing', retreat: 'They withdrew' }[r] || ''; }

/* ---- drawing ---- */
function drawBattle(r) {
  const sim = B.sim, s = sim.s, t = B.t, field = B.field, L = G.game.lights;
  field.draw(r, t);
  // decals: ward rings, ranges, path, area, danger, the hour hand, cursor
  const tr = sim.activeTroop();
  for (const k of sim.field().filter(u => u.kind === 'knight')) {
    const cells = BH.within([k.cx, k.cy], k.ward, s.w, s.h), col = s.sides[k.side].color;
    if (tr && k.troop === tr.id) field.fill(r, cells, col, .12);
    field.border(r, cells, col, 1, true);
  }
  if (B.danger) { const tr2 = sim.activeTroop(); if (tr2) { const th = G.BattleAI.threats(sim, tr2.side), cells = new Set(); for (const x of th) for (const c of x.cells) cells.add(c); field.fill(r, [...cells].map(k => [k % 1000, Math.floor(k / 1000)]), '#ff3a4a', .22); } }
  if (s.mode === 'sanctum' && !s.handStopped && s.keep) G.FX.handLine(r, field, BH.line(s.keep, s.hand, 8, s.w, s.h), B.handFlash ? .7 : .25);
  if (B.mode === 'move' && B.reach) {
    field.fill(r, Object.values(B.reach).map(x => x.c), '#3a9aff', .45);
    const p = B.reach[BH.key(B.cursor)]; if (p) field.path(r, p.path, t);
    const u = sim.unit(B.sel); if (u) { const atk = new Set(); for (const k of Object.values(B.reach)) for (const h of BH.within(k.c, u.basic.range[1], s.w, s.h)) { const o = sim.at(h); if (o && sim.foes(o, u)) atk.add(h[0] + ',' + h[1]); } field.fill(r, [...atk].map(k => k.split(',').map(Number)), '#ff3a4a', .35); }
  }
  if (B.mode === 'target' && B.targets) {
    field.fill(r, B.targets, '#ff3a4a', .4);
    if (B.targets.some(h => BH.eq(h, B.cursor))) field.fill(r, sim.area(sim.unit(B.sel), B.action, B.cursor), '#ffd040', .6);
  }
  if (B.cursor && (activeController() === 'human' || B.ctx.kind === 'hub')) field.cursor(r, B.cursor, t);
  if (B.ctx.net && B.ctx.net.cursors) for (const [seat, c] of Object.entries(B.ctx.net.cursors)) field.cursor(r, c, t, G.SEAT_COLORS[seat]);
  // units
  for (const id in B.views) {
    const v = B.views[id], u = sim.unit(id); if (!u || v.gone) continue;
    if (!sim.onField(u) && !v.dying && !v.captured && !v.leaving) continue;
    const isActive = tr && u.troop === tr.id, xray = isActive || u.kind === 'knight';
    const sc = v.summonK < 1 ? v.summonK : 1;
    r.shadow(v.x, v.y, (v.vis.size === 'L' ? 12 : v.vis.size === 'S' ? 5 : 7) * sc, .45);
    r.actor(v.x, v.y, 0, (g, ox, oy) => { if (sc < 1) { g.save(); g.translate(ox, oy); g.scale(sc, sc); g.translate(-ox, -oy); } v.vis.draw(g, ox, oy, r.view); if (sc < 1) g.restore(); }, { flash: v.flash > 0 ? '#ffffff' : false, flashMix: .7, alpha: v.alpha * (u.fx.stop ? .85 : 1), xray, pick: id });
    // statuses as tints
    if (u.fx.chill || u.fx.stop || u.fx.burn || u.fx.poison) { const col = u.fx.stop ? '#a8a8b8' : u.fx.chill ? '#8ad8ff' : u.fx.burn ? '#ff7a2a' : '#7ad04a'; r.queue(v.x, v.y, 1, g => { const q = r.w(v.x, v.y, 2); BP.blend(g, .3, 'normal', () => BP.ell(g, q[0], q[1] - 6, 7, 9, col)); }, { bias: 2 }); }
    if (u.fx.burn && Math.random() < .1) G.game.particles.fire(v.x, v.y, 6, 1, { size: .5 });
    if (u.fx.poison && Math.random() < .06) G.game.particles.glints(v.x, v.y, 10, 1, '#7ad04a');
    if (u.elem === 'hour' && u.kind === 'monster' || u.boss) L.add(v.x, v.y, 14, 34, .5, { color: u.boss ? '#e8e8f0' : '#d8c070' });
  }
  B.fx.draw(r);
  hud(r);
}
/** the pennant, HP bar and status icons over a unit (overlay) */
function overUnit(g, r, v, u, showBar) {
  const sd = B.sim.s.sides[u.side], q = r.w(v.x, v.y, v.vis.headZ() + 4), x = Math.round(q[0]), y = Math.round(q[1]);
  if (v.alpha < .3) return;
  if (u.kind === 'knight') {
    const realm = G.has('realm', sd.realm) ? G.get('realm', sd.realm) : null, col = sd.color, trim = realm ? realm.trim : '#ffffff';
    BP.rect(g, x, y - 13, 1, 13, '#3a2a1a');
    const shape = realm ? realm.banner : 'square', pts = shape === 'triangle' ? [[x + 1, y - 13], [x + 11, y - 9], [x + 1, y - 5]] : shape === 'swallowtail' ? [[x + 1, y - 13], [x + 11, y - 13], [x + 8, y - 9], [x + 11, y - 5], [x + 1, y - 5]] : shape === 'pointed' ? [[x + 1, y - 13], [x + 10, y - 13], [x + 12, y - 9], [x + 10, y - 5], [x + 1, y - 5]] : [[x + 1, y - 13], [x + 11, y - 13], [x + 11, y - 5], [x + 1, y - 5]];
    BP.poly(g, pts, col); BP.sprite(g, G.sigil(realm ? realm.sigil : 'axes', trim), x + 3, y - 12);
    if (B.ctx.names && B.ctx.names[u.side]) BUI.text(g, B.ctx.names[u.side], x + 14, y - 13, col, { scale: 1 });
  } else BP.rect(g, x - 2, y - 4, 5, 3, sd.color);
  if (showBar) { BUI.bar(g, x - 6, y + 1, 12, 3, u.hp / u.mhp, u.hp / u.mhp > .5 ? '#5ad86a' : u.hp / u.mhp > .25 ? '#ffd040' : '#ff5a4a'); }
  let ix = x - 9; for (const f of Object.keys(u.fx).filter(k => G.get('effect', k).kind !== 'hidden').slice(0, 3)) { BP.sprite(g, G.fxIcon(f), ix, y - 20); ix += 6; }
}
function unitCard(g, x, y, w, u, title) {
  const k = BUI.k(), h = 50 * k, v = VW(u.id), sd = B.sim.s.sides[u.side];
  BUI.box(g, x, y, w, h, { alpha: .9 });
  if (v) v.vis.portrait(g, x + 4, y + 4, 26 * k, { bg: '#1a1e40' });
  const tx = x + 32 * k;
  BUI.text(g, u.name, tx, y + 4, sd.color);
  BUI.text(g, 'Lv ' + u.level, x + w - 4, y + 4, BUI.COL.dim, { align: 'right' });
  BP.sprite(g, G.elemIcon(u.elem), tx, y + 14 * k); BUI.text(g, u.size + (u.flier ? ' fly' : ''), tx + 10, y + 13 * k, BUI.COL.dim);
  BUI.bar(g, tx, y + 24 * k, w - 40 * k - 30, 5 * k, u.hp / u.mhp, '#5ad86a'); BUI.text(g, u.hp + '/' + u.mhp, x + w - 4, y + 22 * k, BUI.COL.text, { align: 'right' });
  BUI.bar(g, tx, y + 32 * k, w - 40 * k - 30, 4 * k, u.mp / Math.max(1, u.mmp), '#5a9aff'); BUI.text(g, u.mp + ' MP', x + w - 4, y + 30 * k, BUI.COL.dim, { align: 'right' });
  let ix = tx; for (const f of Object.keys(u.fx).filter(f => G.get('effect', f).kind !== 'hidden')) { BP.sprite(g, G.fxIcon(f), ix, y + 41 * k); ix += 7; }
  const tide = G.tideOut(u.elem, B.sim.s.season, B.sim.s.longWinter); if (tide > 1.001) BUI.text(g, '↑ Tide', x + w - 4, y + 40 * k, '#ffd060', { align: 'right' }); else if (tide < .999) BUI.text(g, '↓ Tide', x + w - 4, y + 40 * k, '#8ab0ff', { align: 'right' });
  if (u.kind === 'monster') { const kn = B.sim.knightOf(u); if (kn && B.sim.onField(kn) && BH.dist([u.cx, u.cy], [kn.cx, kn.cy]) > kn.ward) BUI.text(g, 'Outside Ward', tx + 30, y + 13 * k, '#ff9a8a'); }
}
function hud(r) {
  const sim = B.sim, s = sim.s, t = B.t, tr = sim.activeTroop();
  r.overlay(g => {
    const k = BUI.k(), W = r.W, H = r.H;
    // over the units
    for (const id in B.views) { const v = B.views[id], u = sim.unit(id); if (!u || v.gone || !sim.onField(u) && !v.dying) continue; overUnit(g, r, v, u, (B.cursor && u.cx === B.cursor[0] && u.cy === B.cursor[1]) || (tr && u.troop === tr.id) || u.hp < u.mhp); }
    if (B.cursor && activeController() === 'human') { const o = sim.at(B.cursor); if (o) { const v = VW(o.id); if (v) { const q = r.w(v.x, v.y, v.vis.headZ() + 22 + Math.sin(t * 6) * 2); BP.poly(g, [[q[0] - 4, q[1] - 4], [q[0] + 4, q[1] - 4], [q[0], q[1] + 1]], '#ffe070'); } } }
    // top left: the bell clock and the season badge
    BUI.box(g, 6, 6, 118 * k, 30 * k, { alpha: .88 });
    G.FX.bellClock(g, 6 + 13 * k, 6 + 15 * k, 10 * k, s.bell, s.bells, t);
    BUI.text(g, 'BELL ' + s.bell + '/' + s.bells, 6 + 28 * k, 9, '#ffffff');
    BP.sprite(g, G.elemIcon(s.season), 6 + 28 * k, 9 + 10 * k); BUI.text(g, G.SEASON_NAME[s.season].toUpperCase() + (s.longWinter ? ' (LONG)' : '') + ' TIDE', 6 + 38 * k, 9 + 10 * k, G.elemColor(s.season));
    if (s.mode === 'shrine') BUI.text(g, 'GLORY ' + s.sides.map(sd => Math.floor(s.glory[sd.i])).join(' / '), 6 + 28 * k, 9 + 19 * k, '#ffd36a');
    else if (s.mode === 'sanctum') BUI.text(g, 'DIALS ' + s.dials.filter(d => d.lit).length + '/4' + (s.wheelTurned ? ' TURNED' : ''), 6 + 28 * k, 9 + 19 * k, '#ffd36a');
    else if (s.keep) BUI.text(g, 'KEEP: ' + (sim.at(s.keep) ? s.sides[sim.at(s.keep).side].name : 'empty'), 6 + 28 * k, 9 + 19 * k, '#d8d0e8');
    // top centre: this bell's troop order
    const order = s.order.filter(id => !s.troops[id].gone), bw = 38 * k, ox = Math.round(W / 2 - order.length * (bw + 2) / 2);
    order.forEach((id, i) => {
      const trp = s.troops[id], kn = sim.unit(trp.knight), sd = s.sides[trp.side], x = ox + i * (bw + 2), on = tr && tr.id === id, done = s.order.indexOf(id) < s.oi;
      BP.rect(g, x, 6, bw, 12 * k, on ? sd.color : done ? '#2a2a3a' : E.tones(sd.color).sh);
      if (on) { BP.rect(g, x, 6 + 12 * k, bw, 1, '#ffffff'); }
      BUI.text(g, (kn.name || '').slice(0, 6), x + bw / 2, 8, on ? '#ffffff' : '#c8c8d8', { align: 'center' });
    });
    // the active and the hovered unit
    const sel = B.sel ? sim.unit(B.sel) : B.cursor && sim.at(B.cursor) && tr && sim.at(B.cursor).troop === tr.id ? sim.at(B.cursor) : null;
    const cw = 150 * k;
    if (sel) unitCard(g, 6, H - 50 * k - 22 * k, cw, sel);
    const hov = B.infoUnit ? sim.unit(B.infoUnit) : B.cursor ? sim.at(B.cursor) : null;
    if (hov && hov !== sel) unitCard(g, W - cw - 6, H - 50 * k - 22 * k, cw, hov);
    // forecast
    if (B.mode === 'target' && B.targets && B.targets.some(h => BH.eq(h, B.cursor))) {
      const fc = sim.forecast(B.sel, B.action, B.cursor).slice(0, 3), fw = 220 * k, fh = fc.length * 10 * k + 8, fx = Math.round(W / 2 - fw / 2), fy = H - 50 * k - 22 * k - fh - 4;
      if (fc.length) BUI.box(g, fx, fy, fw, fh, { alpha: .92 });
      fc.forEach((f, i) => {
        const y = fy + 4 + i * 10 * k; let x = fx + 4;
        BUI.text(g, (f.name || '').toUpperCase().slice(0, 12), x, y, sim.foes(sim.unit(B.sel), sim.unit(f.id)) ? '#ffb0a0' : '#b0ffb0'); x += 62 * k;
        if (f.dmg[1] > 0) { BUI.text(g, 'HIT ' + f.hit + '%', x, y, '#ffffff'); x += 36 * k; BUI.text(g, f.dmg[0] + '-' + f.dmg[1], x, y, '#ffe080'); x += 30 * k; }
        if (f.heal) { BUI.text(g, '+' + f.heal + ' HP', x, y, '#7ae07a'); x += 36 * k; }
        if (f.elem === 'strong') { BUI.text(g, '↑ STRONG', x, y, '#ff9a40'); x += 40 * k; } else if (f.elem === 'weak') { BUI.text(g, '↓ WEAK', x, y, '#8ab0ff'); x += 34 * k; }
        if (f.crit) { BUI.text(g, 'CRIT ' + Math.round(f.crit) + '%', x, y, '#ffd040'); x += 36 * k; }
        if (f.status) { BUI.text(g, G.get('effect', f.status[0]).name + ' ' + f.status[1] + '%', x, y, '#c8b0ff'); x += 40 * k; }
        if (f.ko > 50) BUI.text(g, 'KO', x, y, '#ff5a4a');
      });
    }
    // the command list
    if (B.menu) {
      const m = B.menu, mw = 130 * k, rows = m.rows, mx = W - mw - 8, my = 44;
      m.list.layout(rows, mx + 4, my + 14 * k, mw - 8);
      BUI.box(g, mx, my, mw, m.list.h + 18 * k, { alpha: .94 });
      BUI.text(g, m.title, mx + 6, my + 4, BUI.COL.gold);
      m.list.draw(g, t);
      const sel2 = m.list.sel; if (sel2 && (sel2.desc || sel2.disabled)) { const tx = sel2.disabled || sel2.desc; BUI.box(g, mx - 8, my + m.list.h + 22 * k, mw + 8, 12 * k, { alpha: .9 }); BUI.text(g, tx.slice(0, 32), mx - 4, my + m.list.h + 24 * k, sel2.disabled ? '#ff9a8a' : BUI.COL.dim); }
    }
    // banners
    if (B.banner && B.banner.t >= 0) { const b = B.banner, a = Math.min(1, b.t * 4, (1.6 - b.t) * 4); if (a > .2) { const by = Math.round(H * .3); BP.rect(g, 0, by - 4, W, 30 * k, '#0a0814'); BP.rect(g, 0, by - 4, W, 1, b.color); BP.rect(g, 0, by + 26 * k - 4, W, 1, b.color); BUI.title(g, b.text, W / 2, by, { scale: 2, colors: ['#ffffff', b.color, E.tones(b.color).sh] }); if (b.sub) BUI.text(g, b.sub, W / 2, by + 16 * k, '#e8e4f0', { align: 'center' }); } }
    if (B.turnBanner && !B.banner) { const trp = s.troops[B.turnBanner.troop]; if (trp) { const kn = sim.unit(trp.knight), sd = s.sides[trp.side], tx = (kn.name || '').toUpperCase() + "'S TROOP"; BUI.box(g, W / 2 - 70 * k, 24 * k, 140 * k, 14 * k, { bg: [sd.color, E.tones(sd.color).sh], alpha: .92 }); BUI.text(g, tx, W / 2, 24 * k + 3, '#ffffff', { align: 'center' }); } }
    if (B.actName) { const v = VW(B.actName.u); if (v && B.actName.t < 1) { const q = r.w(v.x, v.y, v.vis.headZ() + 26); const w2 = BUI.width(B.actName.text) + 8; BP.rect(g, q[0] - w2 / 2, q[1] - 2, w2, 10 * k + 2, '#0a0814'); BUI.text(g, B.actName.text, q[0], q[1], '#ffffff', { align: 'center' }); } }
    // the hub's countdown, the hot-seat timer, AUTO
    if (B.ctx.net && G.hub.waiting()) { const H = window.AIHub, left = H && isFinite(H.time()) ? Math.ceil(-H.time() / 1000) : null; BP.rect(g, 0, H ? r.H / 2 - 30 : 0, W, 60, '#0a0814'); BUI.title(g, left ? String(left) : 'GET READY', W / 2, r.H / 2 - 20, { scale: 4 }); }
    if (B.timeLeft !== null && B.timeLeft !== undefined) BUI.text(g, Math.ceil(B.timeLeft) + 's', W / 2, 22 * k, B.timeLeft < 5 ? '#ff6a5a' : '#ffffff', { align: 'center' });
    if (B.ctx.kind === 'hub' && G.hub.deadline !== null && G.hub.deadline !== undefined && window.AIHub && window.AIHub.time() >= 0) { const left = Math.max(0, Math.ceil((G.hub.deadline - window.AIHub.time()) / 1000)); BUI.text(g, left + 's', W / 2, 22 * k, left < 5 ? '#ff6a5a' : '#ffffff', { align: 'center' }); }
    if (tr && (B.delegated[tr.id] || B.delegated.all) && B.ctx.kind !== 'attract') BUI.text(g, 'AUTO', W / 2, 32 * k, '#ffd060', { align: 'center' });
    if (B.ctx.kind === 'attract') { if (Math.sin(B.t * 4) > 0) BUI.text(g, 'PRESS ANY BUTTON', W / 2, H - 14, '#ffffff', { align: 'center' }); E.font.title(g, 'BRIGANTIME', W - 8, 8, { scale: 1, colors: ['#fff6c8', '#ffd36a', '#c87a2a'], outline: '#1a0c10', align: 'right' }); }
    // the hold-to-end ring
    const hf = G.holdFrac('command'); if (hf > .05 && activeController() === 'human') { BUI.box(g, W / 2 - 50, H - 46 * k, 100, 12, { alpha: .9 }); BUI.bar(g, W / 2 - 46, H - 44 * k, 92, 6, hf, '#ff8ad8'); }
  });
  // the prompt bar
  const ctl = activeController();
  if (ctl === 'human' && !G.Talk.open) {
    const p = B.menu ? [['up', 'Choose'], ['confirm', 'Select'], ['cancel', 'Back']] : B.mode === 'target' ? [['move', 'Aim'], ['confirm', 'Confirm'], ['cancel', 'Back'], ['info', 'Info']] : B.mode === 'move' ? [['move', 'Cursor'], ['confirm', 'Move here'], ['cancel', 'Back'], ['command', 'Commands']] : [['move', 'Cursor'], ['confirm', 'Select'], ['info', 'Info'], ['command', 'Commands / Hold: End'], ['next', 'Unit']];
    BUI.prompts(r, p);
  } else if (ctl === 'ai' && !s.over && B.ctx.kind !== 'attract') BUI.prompts(r, [['confirm', 'Hold: Fast'], ['danger', 'Danger'], ['turnR', 'Turn']]);
  if (G.Dev) G.Dev.battleOverlay(r);
  BUI.modalDraw(r, t); BUI.tipDraw(r, 1 / 60); BUI.drawToasts(r);
  G.Talk.draw(r);
}
G.labelOf = a => { const d = G.device(); if (d === 'gamepad') { const s = G.glyphStyle(); return s === 'xbox' ? { confirm: 'A', cancel: 'B', command: 'X', info: 'Y' }[a] || a : { confirm: 'Cross', cancel: 'Circle', command: 'Square', info: 'Triangle' }[a] || a; } const l = G.keyLabel(a, d); return d === 'mouse' && l.mouse ? { L: 'left click', R: 'right click', M: 'middle click' }[l.mouse] : (l.key || a); };
