/* ---- BATTLE VIEW: draws a BattleSim and plays its events (the EventPlayer): walks, swings, spells, numbers, falls,
 * captures, level-ups, bells. Used by the battle scene, the attract reel and the hub. Presentation never writes the sim ---- */
G.scenes = G.scenes || {};
const MOVE_OF = { warrior: 'slash', ranger: 'throw', mage: 'overhead', cleric: 'rising', beast: 'backslash' };
const ELEM_FX = {
  spring: (P, x, y, z) => { P.bits(x, y, z + 10, 14, ['#6ac04a', '#f4b8d0', '#a8e070', '#ffe060']); P.glints(x, y, z + 14, 8, '#ffe8a0'); },
  summer: (P, x, y, z) => { P.fire(x, y, z + 4, 10, { size: 1 }); P.explosion(x, y, z + 6, .6, { shake: 0, freeze: false, debris: false }); },
  autumn: (P, x, y, z) => { P.bits(x, y, z + 14, 16, ['#d86a20', '#c84a1a', '#8a5a2a', '#e0a030']); P.smoke(x, y, z + 8, 3, { color: '#c89a60' }); },
  winter: (P, x, y, z) => { P.bits(x, y, z + 12, 14, ['#ffffff', '#c8f0ff', '#80d0ff']); P.ring(x, y, 3, 16, '#a8f0ff', .4, z + 2); P.glints(x, y, z + 14, 8, '#ffffff'); },
  hour: (P, x, y, z) => { P.ring(x, y, 4, 18, '#d8c070', .5, z + 2); P.bits(x, y, z + 12, 10, ['#d8c070', '#8a8a92', '#f0e8d8']); },
  none: (P, x, y, z) => { P.glints(x, y, z + 14, 16, '#fff8d0'); P.ring(x, y, 4, 20, '#fff0b0', .5, z + 2); }
};
class BattleView {
  constructor(sim, o = {}) {
    this.sim = sim; this.o = o; const S = sim.state;
    this.field = new G.HexField(sim, { region: S.spec.region || (S.spec.castle ? G.get('castle', S.spec.castle).region : (o.region || 'spring')) });
    this.u = S.units.map(u => this.makeUnit(u));
    this.q = []; this.cur = null; this.wait = 0; this.texts = []; this.banner = null; this.proj = []; this.chains = []; this.speed = 1; this.hand = null; this.flashT = 0;
    const mid = G.hexWorld([Math.floor(S.w / 2), Math.floor(S.h / 2)]); this.look = [mid[0], mid[1]]; this.lookT = this.look.slice();
  }
  makeUnit(u) { const v = G.art.visual(u.kind === 'knight' ? { kind: 'knight', id: G.has('knight', u.ref) ? u.ref : 'sergeant', cls: u.cls } : { kind: 'monster', sp: u.sp, tier: u.tier }); const [x, y] = G.hexWorld([u.cx, u.cy]); return { id: u.id, vis: v, x, y, z: 0, f: u.facing || 0, path: null, gone: u.out ? 1 : 0, alpha: u.out ? 0 : 1, hurt: 0, chain: null }; }
  ensureUnits() { const S = this.sim.state; while (this.u.length < S.units.length) this.u.push(this.makeUnit(S.units[this.u.length])); }
  get busy() { return !!this.cur || this.q.length > 0 || this.u.some(p => p.path); }
  play(evs) { for (const e of evs) this.q.push(e); }
  animMul() { const s = G.settings && G.settings.battleAnim; return (s === 'Fast' ? 2 : s === 'Minimal' ? 4 : 1) * G.tune.animSpeed * this.speed; }
  focusOn(x, y) { this.lookT = [x, y]; }
  update(dt) {
    this.ensureUnits(); const S = this.sim.state, k = this.animMul(), D = dt * k;
    this.field.refresh();
    for (const p of this.u) {
      const su = S.units[p.id];
      if (p.path) { p.st += D / .13; while (p.path && p.st >= 1) { p.st -= 1; p.seg++; if (p.seg >= p.path.length - 1) { const [x, y] = G.hexWorld(p.path[p.path.length - 1]); p.x = x; p.y = y; p.path = null; } }
        if (p.path) { const a = G.hexWorld(p.path[p.seg]), b = G.hexWorld(p.path[p.seg + 1]); p.x = lerp(a[0], b[0], p.st); p.y = lerp(a[1], b[1], p.st); p.f = Math.atan2(b[1] - a[1], b[0] - a[0]); p.vx = (b[0] - a[0]) / .13 * k; p.vy = (b[1] - a[1]) / .13 * k; } }
      if (!p.path) { p.vx = 0; p.vy = 0; if (!p.gone && !p.leaving) { const [x, y] = G.hexWorld([su.cx, su.cy]); p.x = x; p.y = y; } if (su.facing !== undefined && !p.turnHold) p.f = E.approachAng ? E.approachAng(p.f, su.facing, dt * 8) : su.facing; }
      if (p.leaving) { p.x += Math.cos(p.leaving) * 40 * D; p.y += Math.sin(p.leaving) * 40 * D; p.alpha = Math.max(0, p.alpha - D * .8); p.vx = Math.cos(p.leaving) * 40; p.vy = Math.sin(p.leaving) * 40; }
      if (p.fading) p.alpha = Math.max(0, p.alpha - D * 1.2);
      p.hurt = Math.max(0, p.hurt - dt);
      p.vis.update(D, { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.f, sleep: !!su.eff.sleep && !su.out, pose: su.out === 'down' && !p.leaving ? 'kneel' : null });
    }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.t += dt; if (t.t > t.life) this.texts.splice(i, 1); }
    for (let i = this.proj.length - 1; i >= 0; i--) { const p = this.proj[i]; p.t += D / p.dur; if (p.t >= 1) this.proj.splice(i, 1); }
    for (let i = this.chains.length - 1; i >= 0; i--) { const c = this.chains[i]; c.t += dt; if (c.t > 1.2) this.chains.splice(i, 1); }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    // the event queue
    if (this.wait > 0) { this.wait -= D; }
    else if (!this.u.some(p => p.path)) { this.cur = null; if (this.q.length) this.playOne(this.q.shift()); }
    // camera
    this.look[0] = lerp(this.look[0], this.lookT[0], Math.min(1, dt * 7)); this.look[1] = lerp(this.look[1], this.lookT[1], Math.min(1, dt * 7));
  }
  pos(id) { const p = this.u[id]; return [p.x, p.y, p.z]; }
  say(id, s, c = '#ffffff', o = {}) { const [x, y] = this.pos(id); this.texts.push({ x, y, z: (this.u[id].vis.height || 24) + 8 + (o.dz || 0), s, c, t: 0, life: o.life || 1, scale: o.scale || 1 }); }
  playOne(e) {
    const S = this.sim.state, P = G.game.particles, u = e.u !== undefined ? S.units[e.u] : null, pv = e.u !== undefined ? this.u[e.u] : null; this.cur = e;
    const W = s => { this.wait = s; };
    switch (e.type) {
      case 'bell': this.banner = { s: 'BELL ' + e.bell + ' / ' + S.bells, t: 0, life: 1.1, c: '#ffe070' }; G.sfx('bell_toll', { pitch: 1 + (e.bell - 1) * .03 }); W(.5);
        if (S.spec.mode !== 'shrine' && e.bell >= S.bells - 3 && this.o.onTension) this.o.onTension(); break;
      case 'season': this.banner = { s: G.SEASON_NAME[e.season].toUpperCase() + ' TIDE', t: 0, life: 1.2, c: G.SEASON_COLOR[e.season] }; G.sfx('tide'); W(.4); break;
      case 'troop': { const tr = S.troops[e.troop], k = S.units[tr.knight]; this.focusOn(...this.pos(k.id)); this.activeTroop = e.troop; W(.15); break; }
      case 'move': { if (!pv) break; const path = e.path; if (e.undo || path.length < 2) { const [x, y] = G.hexWorld(path[path.length - 1]); pv.x = x; pv.y = y; break; } pv.path = path; pv.seg = 0; pv.st = 0; this.focusOn(...G.hexWorld(path[path.length - 1])); G.sfx('ui_move', { vol: .3 }); break; }
      case 'act': {
        const sk = e.skill ? G.get('skill', e.skill) : null, cls = u.kind === 'knight' ? G.get('class', u.cls) : null, [tx, ty] = G.hexWorld(e.target);
        if (!G.hex.same(e.target, [u.cx, u.cy])) pv.f = Math.atan2(ty - pv.y, tx - pv.x);
        const magic = sk && (sk.kind === 'spell' || sk.magic || sk.heal || sk.healPct || (sk.buff && !sk.p));
        const mv = sk && sk.anim ? sk.anim : u.kind === 'knight' ? (cls.basic.anim || MOVE_OF[cls.line] || 'slash') : (u.basic.range[1] > 1 ? 'throw' : 'bite');
        if (pv.vis.mode === 'beast') pv.vis.act(magic ? 'cast' : 'attack', { move: ['bite', 'claw', 'gore', 'breath', 'tailsweep', 'roar', 'pounce', 'dive', 'coil', 'stomp'].includes(mv) ? mv : sk && /breath/.test(e.skill) ? 'breath' : 'bite', dur: .7 });
        else pv.vis.act(magic ? 'cast' : 'attack', { move: ['slash', 'backslash', 'overhead', 'rising', 'thrust', 'spin', 'plunge', 'twohand', 'throw', 'bash', 'claw', 'cast'].includes(mv) ? mv : 'slash', dur: .6 });
        if (sk) { this.texts.push({ x: pv.x, y: pv.y, z: (pv.vis.height || 24) + 18, s: sk.name, c: '#ffe8a0', t: 0, life: 1.1, scale: 1 }); }
        if (magic) { G.sfx('cast_charge'); G.game.particles.ring(pv.x, pv.y, 2, 14, G.SEASON_COLOR[e.elem] || '#ffffff', .5, 1); }
        else G.sfx(u.basic.bow || (sk && sk.bow) ? 'bow_twang' : 'slash_whoosh');
        if ((u.basic.bow && !sk) || (sk && sk.bow) || (sk && sk.anim === 'throw')) this.proj.push({ a: [pv.x, pv.y, 18], b: [tx, ty, 12], t: 0, dur: .35, kind: 'arrow' });
        else if (sk && (sk.kind === 'spell' || sk.magic) && sk.p) this.proj.push({ a: [pv.x, pv.y, 20], b: [tx, ty, 10], t: 0, dur: .3, kind: 'orb', c: G.SEASON_COLOR[e.elem] || '#fff' });
        if (sk && (sk.area === 'cone2' || sk.area === 'cone3' || sk.area === 'line3' || sk.area === 'line4')) for (const c of e.cells) { const [x, y] = G.hexWorld(c); (ELEM_FX[e.elem] || ELEM_FX.none)(P, x, y, 0); }
        this.hl = { cells: e.cells, t: 0 };
        this.focusOn((pv.x + tx) / 2, (pv.y + ty) / 2);
        if (G.settings && G.settings.battleCam === 'Dynamic' && magic && sk && sk.p && G.game.zoom < 1.6) this.zoomKick = .5;
        W(magic ? .55 : .35); break;
      }
      case 'hit': {
        const [x, y] = this.pos(e.u); pv.hurt = .3; pv.vis.act('hurt');
        if (e.dmg > 0 || !e.why) G.game.hitFx(x, y, 14, { damage: e.dmg, power: e.crit ? 1.5 : 1, sound: e.crit ? 'crit' : (e.why ? false : 'hit'), textColor: e.why ? (e.color || '#ffb070') : e.crit ? '#ffe040' : '#ffffff' });
        if (e.crit) this.say(e.u, 'CRIT!', '#ffe040', { dz: 10 });
        if (e.strong) this.say(e.u, '↑ STRONG', '#ff8a5a', { dz: 18, life: .8 }); if (e.weak) this.say(e.u, '↓ WEAK', '#8ab0ff', { dz: 18, life: .8 });
        if (e.why && e.why !== 'fire') this.say(e.u, e.why.toUpperCase(), e.color || '#ffb070', { dz: 16, life: .8 });
        if (this.hl) { const src = e.src !== null ? S.units[e.src] : null; if (src) { const el = (this.cur && this.cur.elem) || src.elem; if (!['spring', 'summer', 'autumn', 'winter', 'hour'].includes(el)) G.game.particles.sparks(x, y, 14, 6); else (ELEM_FX[el] || ELEM_FX.none)(P, x, y, 0); } }
        W(.18); break;
      }
      case 'miss': this.say(e.u, 'MISS', '#a8a8b8'); G.sfx('miss'); W(.15); break;
      case 'heal': if (e.amount > 0) { this.say(e.u, '+' + e.amount, '#8affa0'); const [x, y] = this.pos(e.u); P.glints(x, y, 16, 10, '#8affc0'); P.ring(x, y, 3, 12, '#8affc0', .4, 1); G.sfx('heal'); } W(.15); break;
      case 'mp': this.say(e.u, (e.amount > 0 ? '+' : '') + e.amount + ' MP', '#8ab0ff'); W(.12); break;
      case 'status': this.say(e.u, G.get('effect', e.eff).name.toUpperCase(), G.get('effect', e.eff).color, { dz: 6 }); G.sfx(['poison', 'burn', 'chill', 'sleep', 'stop'].includes(e.eff) ? e.eff : 'debuff'); W(.2); break;
      case 'buff': this.say(e.u, G.get('effect', e.eff).name, G.get('effect', e.eff).color, { dz: 6 }); G.sfx('buff'); W(.12); break;
      case 'resist': this.say(e.u, 'RESIST', '#c8c8d8', { dz: 6, life: .7 }); W(.1); break;
      case 'fade': W(0); break;
      case 'skip': this.say(e.u, e.why === 'sleep' ? 'Zzz' : 'STOPPED', '#c0a0ff'); W(.25); break;
      case 'ko': { pv.vis.act('die', { dur: .9 }); pv.fading = true; const [x, y] = this.pos(e.u); P.bits(x, y, 12, 14, [G.SEASON_COLOR[u.elem] || '#fff', '#ffffff']); G.sfx('ko_monster'); W(.5); break; }
      case 'knightDown': pv.vis.act('kneel', { dur: .6 }); this.say(e.u, u.name + ' FALLS', '#ff8a8a', { scale: 1, life: 1.6 }); G.sfx('ko_knight'); this.banner = { s: u.name.toUpperCase() + ' FALLS', t: 0, life: 1.3, c: '#ff8a7a' }; game.after(.9 / this.animMul(), () => { pv.leaving = pv.f + Math.PI; }); W(.9); break;
      case 'retreat': case 'retreatCmd': if (e.type === 'retreatCmd') { this.say(e.u, 'RETREAT', '#ffd080'); W(.3); break; } pv.leaving = this.sim.faceEnemy(u) + Math.PI; W(.12); break;
      case 'capture': { const by = this.u[e.by]; this.chains.push({ a: by, b: pv, t: 0 }); this.say(e.u, 'CAPTURED', '#ffe070'); G.sfx('capture'); G.sting('capture'); game.after(.8 / this.animMul(), () => { pv.fading = true; }); W(.8); break; }
      case 'levelup': { const [x, y] = this.pos(e.u); this.say(e.u, 'LEVEL ' + e.lvl + '!', '#ffe070', { dz: 14, life: 1.5, scale: 1 }); const g = e.gains, parts = ['atk', 'def', 'int'].filter(s => g[s] > 0).map(s => '+' + g[s] + ' ' + s.toUpperCase()); if (parts.length) this.say(e.u, parts.join(' '), '#fff0b0', { dz: 2, life: 1.5 }); P.glints(x, y, 20, 16, '#ffe070'); P.ring(x, y, 2, 14, '#ffe070', .6, 1); G.sting('levelup'); W(.5); break; }
      case 'terrain': W(0); break;
      case 'hand': this.hand = { line: e.line, t: 0 }; G.sfx('stop'); W(.4); break;
      case 'dial': G.sfx(e.lit ? 'heal' : 'debuff'); this.banner = { s: e.lit ? 'A SEASON DIAL LIGHTS' : 'A DIAL GOES DARK', t: 0, life: 1, c: e.lit ? '#ffe070' : '#a0a0b0' }; W(.35); break;
      case 'wheel': this.banner = { s: 'THE WHEEL TURNS!', t: 0, life: 2, c: '#fff0a0' }; G.game.flash('#fff8e0', .25, .6); G.sting('promote'); W(1); break;
      case 'timelessBreak': this.banner = { s: 'TIMELESS IS BROKEN', t: 0, life: 1.4, c: '#fff0a0' }; W(.6); break;
      case 'summon': { const [x, y] = this.pos(e.u); P.ring(x, y, 2, 20, '#d8c070', .6, 1); G.sfx('summon_rise'); this.banner = { s: 'SECOND HANDS ANSWER', t: 0, life: 1.3, c: '#d8c070' }; W(.6); break; }
      case 'rebirth': { const [x, y] = this.pos(e.u); P.fire(x, y, 4, 16, { size: 1.2 }); this.say(e.u, 'REBIRTH', '#ffa040'); W(.5); break; }
      case 'misfire': this.say(e.u, 'MISFIRE!', '#a8e0ff'); W(.4); break;
      case 'glory': if (e.amount >= 10) this.texts.push({ x: this.look[0], y: this.look[1], z: 50, s: '+' + e.amount + ' GLORY', c: G.SEAT_COLORS[e.side] || '#ffe070', t: 0, life: 1, scale: 1 }); W(0); break;
      case 'item': this.say(e.u, G.get('item', e.item).name, '#c8ffc8'); W(.3); break;
      case 'wait': W(.05); break;
      case 'endTroop': W(.1); break;
      case 'over': W(.3); break;
      default: W(0);
    }
  }
  // draw the field, decals, units and floating texts; deco: { reach, targets, area, cursor, wards, danger, path }
  draw(r, deco = {}) {
    const S = this.sim.state, P = G.PAL[S.season] || G.PAL.spring, hour = G.get('map', S.spec.map).hour;
    r.sky(hour ? G.PAL.hour.sky : P.sky);
    const L = G.game.lights; L.enabled = true; L.ambient = hour ? .5 : P.ambient;
    this.field.map.drawFloor(r);
    const poly = (c, col, a, inset = 1) => r.decal(g => { const pts = G.hex.corners(c, G.T, inset).map(([x, y]) => r.w(x + G.OFF, y + G.OFF, 0)); px.blend(g, a, 'normal', () => px.poly(g, pts, col)); });
    const outline = (c, col, inset = 1, wdt = 1) => r.decal(g => { const pts = G.hex.corners(c, G.T, inset).map(([x, y]) => r.w(x + G.OFF, y + G.OFF, 0)); for (let i = 0; i < 6; i++) px.line(g, pts[i][0], pts[i][1], pts[(i + 1) % 6][0], pts[(i + 1) % 6][1], col, wdt); });
    if (deco.danger) for (const c of deco.danger) poly(c, '#ff2030', .22);
    if (deco.reach) for (const c of deco.reach) poly(c, '#3a9aff', .42);
    if (deco.targets) for (const c of deco.targets) poly(c, '#ff3a4a', .38);
    if (deco.area) for (const c of deco.area) poly(c, '#ffd040', .55);
    if (deco.path) for (let i = 1; i < deco.path.length; i++) { const a = G.hexWorld(deco.path[i - 1]), b = G.hexWorld(deco.path[i]); r.decal(g => { const p = r.w(a[0], a[1], 0), q = r.w(b[0], b[1], 0); px.line(g, p[0], p[1], q[0], q[1], '#ffffff', 2); }); }
    if (this.hl) { this.hl.t += 1 / 60; if (this.hl.t < .6) for (const c of this.hl.cells) poly(c, '#ffe0a0', .35 * (1 - this.hl.t / .6)); else this.hl = null; }
    // ward rings: each knight's Ward, the active troop's filled
    for (const k of S.units) if (k.kind === 'knight' && !k.out && (deco.wards || (this.activeTroop === k.troop && deco.activeWard !== false))) {
      const col = S.spec.mode === 'shrine' ? G.SEAT_COLORS[k.side] : k.side === 0 ? '#5ab0ff' : '#ff6a5a';
      if (this.activeTroop === k.troop) r.decal(g => { const [x, y] = G.hexWorld([k.cx, k.cy]), n = 40, pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push(r.w(x + Math.cos(a) * (k.ward + .5) * G.T, y + Math.sin(a) * (k.ward + .5) * G.T * .95, 0)); } for (let i = 0; i < n; i += 2) px.line(g, pts[i][0], pts[i][1], pts[(i + 1) % n][0], pts[(i + 1) % n][1], col, 1); });
    }
    if (this.hand) { this.hand.t += 1 / 60; if (this.hand.t < 1.2) for (const c of this.hand.line) poly(c, '#d8c070', .5 * (1 - this.hand.t / 1.2)); }
    if (S.spec.mode === 'sanctum' && !S.wheelTurned) { const d = (S.bell + 1) % 6, line = []; let p = S.keeps[0]; for (let i = 0; i < 12; i++) { p = G.hex.neighbor(p, d); if (!this.sim.inside(p) || this.sim.code(p) === '#') break; line.push(p); } for (const c of line) poly(c, '#d8c070', .14 + Math.sin(G.game.real * 4) * .05); }
    if (G.dev.showCoords) r.overlay(g => { for (let i = 0; i < S.cells.length; i++) { const c = [i % S.w, Math.floor(i / S.w)], [x, y] = G.hexWorld(c), [sx, sy] = r.w(x, y, 0); E.font.text(g, c[0] + ',' + c[1], Math.round(sx), Math.round(sy) - 2, '#ffffff', { align: 'center', font: 'tiny', outline: '#000' }); } });
    if (deco.cursor) { const k = .5 + .5 * Math.sin(G.game.real * 7); outline(deco.cursor, k > .5 ? '#ffffff' : '#ffe070', 1, 2); }
    if (deco.others) for (const [c, col] of deco.others) outline(c, col, 2, 1);
    this.field.drawProps(r);
    // units
    for (const p of this.u) {
      const su = S.units[p.id]; if (p.alpha <= 0.01) continue;
      r.shadow(p.x, p.y, su.size === 'L' ? 9 : su.size === 'S' ? 4 : 6, .4 * p.alpha);
      r.actor(p.x, p.y, p.z, (g, ox, oy) => p.vis.draw(g, ox, oy, r.view), { alpha: p.alpha, flash: p.hurt > .15 ? '#ffffff' : null, xray: !su.out, pick: su });
    }
    // projectiles
    for (const pr of this.proj) {
      const k = pr.t, z = lerp(pr.a[2], pr.b[2], k) + Math.sin(k * Math.PI) * (pr.kind === 'arrow' ? 16 : 6), x = lerp(pr.a[0], pr.b[0], k), y = lerp(pr.a[1], pr.b[1], k);
      if (pr.kind === 'arrow') { const dx = pr.b[0] - pr.a[0], dy = pr.b[1] - pr.a[1]; r.actor(x, y, z, (g, ox, oy) => { const [p2, q2] = r.view.p(dx, dy, 0), l = Math.hypot(p2, q2) || 1; px.line(g, ox - p2 / l * 4, oy - q2 / l * 4, ox + p2 / l * 3, oy + q2 / l * 3, '#e8dcc0'); px.dot(g, ox + p2 / l * 3, oy + q2 / l * 3, '#ffffff'); }); }
      else r.queue(x, y, z, g => { const [sx, sy] = r.w(x, y, z); px.disc(g, sx, sy, 3, pr.c); px.disc(g, sx, sy, 1.5, '#ffffff'); }, { emissive: true });
    }
    for (const c of this.chains) { const a = c.a, b = c.b; r.queue((a.x + b.x) / 2, (a.y + b.y) / 2, 10, g => { const p = r.w(a.x, a.y, 14), q = r.w(b.x, b.y, 10), n = 10; for (let i = 0; i < n; i++) { const t = i / n; if ((i + Math.floor(c.t * 20)) % 2) px.disc(g, lerp(p[0], q[0], t), lerp(p[1], q[1], t), 1.5, '#ffe8a0'); } }, { emissive: true }); }
    // pennants, HP bars and status icons
    r.overlay(g => {
      for (const p of this.u) {
        const su = S.units[p.id]; if (su.out || p.alpha < .5) continue;
        const [sx, sy] = r.w(p.x, p.y, (p.vis.height || 24) + 6);
        if (su.kind === 'knight') { const realm = S.sides[su.side].realm; G.art.banner(g, realm, Math.round(sx) + 3, Math.round(sy) - 16, .8, S.spec.mode === 'shrine' ? G.SEAT_COLORS[su.side] : null); }
        else { px.rect(g, Math.round(sx) - 1, Math.round(sy) - 3, 3, 3, '#140c14'); px.dot(g, Math.round(sx), Math.round(sy) - 2, S.spec.mode === 'shrine' ? G.SEAT_COLORS[su.side] : su.side === 0 ? '#5ab0ff' : '#ff6a5a'); }
        const show = su.hp < su.mhp || (deco.cursor && G.hex.same(deco.cursor, [su.cx, su.cy])) || this.activeTroop === su.troop;
        if (show) { const w = 12, x = Math.round(sx) - 6, y = Math.round(sy) + 1; px.rect(g, x - 1, y - 1, w + 2, 4, '#140c14'); px.rect(g, x, y, Math.max(1, Math.round(w * su.hp / su.mhp)), 2, su.hp > su.mhp * .3 ? (su.side === 0 ? '#5ad86a' : '#ff8a4a') : '#ff3a3a'); }
        let ix = Math.round(sx) - 8; for (const ef of Object.keys(su.eff).slice(0, 3)) { G.art.effectIcon(g, ef, ix, Math.round(sy) - 8); ix += 8; }
      }
      for (const t of this.texts) { const [sx, sy] = r.w(t.x, t.y, t.z + t.t * 14); E.font.text(g, t.s, Math.round(sx), Math.round(sy), t.c, { align: 'center', outline: '#140c14', scale: t.scale }); }
      if (this.banner) { const b = this.banner, a = b.t < .15 ? b.t / .15 : b.t > b.life - .25 ? Math.max(0, (b.life - b.t) / .25) : 1; px.blend(g, a * .7, 'normal', () => px.rect(g, 0, r.H / 2 - 30, r.W, 22, '#0a0816')); if (a > .3) E.font.title(g, b.s, r.W / 2, r.H / 2 - 27, { align: 'center', scale: 2, colors: ['#ffffff', b.c, E.mix(b.c, '#000000', .4)] }); }
    });
  }
  // the hex under a screen point (mouse), or null
  hexAt(sx, sy) { const p = G.game.mouseGround && G.game.mouseGround(); if (!p) return null; const c = G.worldHex(p[0], p[1]); return this.sim.inside(c) ? c : null; }
  // the neighbour whose on-screen direction is nearest the input's
  step(c, mx, my) {
    const v = G.game.view, d = v.screenDirToGround(mx, my), from = G.hexWorld(c); let best = null, bd = -2;
    G.hex.neighbors(c).forEach((n, i) => { if (!this.sim.inside(n)) return; const to = G.hexWorld(n), dx = to[0] - from[0], dy = to[1] - from[1], l = Math.hypot(dx, dy), dot = (dx * d[0] + dy * d[1]) / l + i * 1e-4; if (dot > bd) { bd = dot; best = n; } });
    return bd > .3 ? best : c;
  }
}
G.BattleView = BattleView;
