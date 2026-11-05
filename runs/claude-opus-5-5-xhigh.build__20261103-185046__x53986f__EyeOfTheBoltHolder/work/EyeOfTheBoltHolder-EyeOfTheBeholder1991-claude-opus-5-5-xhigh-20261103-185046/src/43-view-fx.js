/* =====================================================================================
 * 43-view-fx: events become effects (sparks, damage numbers, lightning, bursts, falling bolts), the first-person hands
 * swinging each member's weapon on its side of the view, and the mouse's hotspots in the world
 * ===================================================================================== */
const MOVE_OF = { latchkin: 'thrust', snick: 'overhead', skeleton: 'overhead', sentinel: 'twohand', seer: 'cast', warden: 'thrust', golem: 'haymaker' };
const KIND_COLOR = { fire: '#ffb04a', cold: '#9ae8ff', shock: '#8af4ff', arc: '#d8c8ff', holy: '#fff6d8', phys: '#fff2c4' };
Object.assign(View3D, {
  event(e) {
    const Wv = this.cur; if (!Wv) return;
    const P = game.particles, fl = S.floors[this.f];
    const monPos = uid => { const a = Wv.mobs.get(uid); if (a) return [a.x, a.y, a.z]; const s = this.pen && this.pen.get(uid); if (s) return [s.x, s.y, 0]; const m = fl.mons.find(q => q.uid === uid); return m ? [mid(m.cx), mid(m.cy), 0] : null; };
    switch (e.t) {
      case 'monHurt': { const p = monPos(e.uid); if (!p) break; const h = (B.MON((fl.mons.find(m => m.uid === e.uid) || {}).type || 'rat').size === 'L' ? 30 : 16); P.sparks(p[0], p[1], p[2] + h, e.crit ? 14 : 7, Math.atan2(mid(S.party.cy) - p[1], mid(S.party.cx) - p[0]), { color: KIND_COLOR[e.kind] || '#fff2c4' }); P.text(p[0], p[1], p[2] + h + 10, String(e.n), e.crit ? '#ffd36a' : KIND_COLOR[e.kind] || '#fff2c4', { scale: e.crit ? 2 : 1, bounce: true }); if (e.crit) game.freeze(.05); break; }
      case 'monDie': { const T = B.MON(e.type), p = [mid(e.x), mid(e.y)]; if (T.construct) P.bits(p[0], p[1], 14, 12, ['#b8923a', '#7a5a20', '#c8c8d0']); else if (T.undead) P.bits(p[0], p[1], 14, 10, ['#d8cfb4', '#a89a80']); else P.smoke(p[0], p[1], 8, 6, { color: '#3a3040' }); break; }
      case 'wind': { const a = Wv.mobs.get(e.uid), mv = MOVE_OF[e.type]; if (a && mv && a.rig) { const T = B.MON(e.type); a.data.v.atk = new E.Attack(mv, { wind: B.T.windup * (T.heavy ? 1.6 : 1), active: .12, recover: .35 }); a.data.v.atk.start(); } break; }
      case 'strike': { const a = Wv.mobs.get(e.uid); if (a) a.data.v.strike = .35; const s = this.pen && this.pen.get(e.uid); if (s) s.strike = 1; break; }
      case 'hurt': if (e.n > 0) { this.shakeT = Math.min(1, this.shakeT + .3); game.shake(e.n > 6 ? 3 : 1.5); } break;
      case 'swing': this.swings.push({ m: e.m, fam: e.fam, t: 0, dur: e.fam === 'cast' ? .5 : .3, color: e.color, side: B.placeOf(e.m) % 2 ? 1 : -1 }); break;
      case 'lightning': { const pts = [[mid(e.from[0]), mid(e.from[1])], ...e.cells.map(([x, y]) => [mid(x), mid(y)])]; this.fx.push({ k: 'bolt', pts, t: 0, dur: .35, color: '#8af4ff', x: pts[1] ? pts[1][0] : 0, y: pts[1] ? pts[1][1] : 0, light: '#8af4ff', power: 40, z: 22 }); game.flash('#bff4ff', .08, .35); break; }
      case 'burst': { const x = mid(e.x), y = mid(e.y); P.explosion(x, y, 14, 1.2, { shake: 3, freeze: false }); this.fx.push({ k: 'glow', x, y, z: 16, t: 0, dur: .6, r: 12, color: '#ff9a3a', light: '#ff8a2a', power: 50, reach: 200 }); break; }
      case 'frost': { const x = mid(e.x), y = mid(e.y); P.ring(x, y, 2, 16, '#9ae8ff', .5); P.glints(x, y, 14, 14, '#d8f8ff'); this.fx.push({ k: 'glow', x, y, z: 14, t: 0, dur: .5, r: 8, color: '#9ae8ff', light: '#8ad8ff', power: 25 }); break; }
      case 'sparkHit': P.glints(mid(e.x), mid(e.y), 16, 6, '#d8c8ff'); break;
      case 'flare': this.fx.push({ k: 'glow', x: mid(e.x), y: mid(e.y), z: 18, t: 0, dur: .7, r: 14, color: '#ffffff', light: '#fff6d8', power: 40 }); break;
      case 'button': { const t = Wv.feats[e.id]; if (t) t.press = 1; break; }
      case 'illusion': game.flash('#c8d8ff', .15, .4); break;
      case 'land': case 'trapdoor': game.shake(4); break;
      case 'teleport': if (!e.silent) { game.flash('#c8f0ff', .2, .6); } break;
      case 'bossBolt': { const [bx, by] = this.bossPos(), pts = [[bx, by], ...e.cells.map(([x, y]) => [mid(x), mid(y)])]; this.fx.push({ k: 'bolt', pts, t: 0, dur: .4, color: '#7af0ff', z: 26, x: pts[1] ? pts[1][0] : bx, y: pts[1] ? pts[1][1] : by, light: '#8af4ff', power: 60, reach: 260 }); game.flash('#bff4ff', .1, .5); game.shake(3); break; }
      case 'bossRain': for (const [x, y] of e.cells) this.fx.push({ k: 'rain', x: mid(x), y: mid(y), t: 0, dur: .45 }); game.shake(4); break;
      case 'bossSlam': game.shake(5); break;
      case 'bossHurt': { const [x, y] = this.bossPos(); P.sparks(x, y, 30, 6, null, { color: '#ffd8a0' }); P.text(x, y, 52, String(e.n), e.crit ? '#ffd36a' : '#fff2c4', { bounce: true }); break; }
      case 'bossDrink': { const [x, y] = this.bossPos(); P.glints(x, y, 30, 12, '#8af4ff'); break; }
      case 'bossDie': case 'eyeCrack': game.flash('#fff6d8', .4, .9); game.shake(6); break;
      case 'lockDone': { const ft = Wv.X.feats[e.id]; if (ft) { const [x, y] = featPos(ft); P.sparks(x, y, 24, 12, null, { color: '#8ae0ff' }); } game.shake(3); break; }
      case 'ugBolt': game.shake(2); break;
      case 'unlatch': this.fx.push({ k: 'key', x: mid(e.x), y: mid(e.y), t: 0, dur: 1, light: '#ffe8a0', power: 18 }); break;
      case 'appear': P.glints(mid(e.x), mid(e.y), 6, 6, '#fff6c8'); break;
      case 'zap': { const s = this.pen && this.pen.get(e.uid); if (s) this.fx.push({ k: 'beam', from: [s.x, s.y, 20], t: 0, dur: .25, color: '#bff4ff' }); break; }
      case 'boltHit': game.shake(2); game.flash('#7ae0ff', .08, .3); break;
      case 'spin': if (!game.reduceMotion) this.shakeT = .2; break;
      case 'raise': case 'levelUp': break;
      case 'secretOpen': break;
    }
  },
  /** each step: effects age */
  tickFx(dt) {
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt; if (f.t >= f.dur) this.fx.splice(i, 1); }
    for (let i = this.swings.length - 1; i >= 0; i--) { const s = this.swings[i]; s.t += dt; if (s.t >= s.dur) this.swings.splice(i, 1); }
    this.shakeT = Math.max(0, this.shakeT - dt * 2);
  },
  drawFx(w, pen) {
    for (const f of this.fx) {
      const k = f.t / f.dur;
      if (f.k === 'bolt') {
        const z = f.z || 22; let prev = null;
        pen.at();
        for (let i = 0; i < f.pts.length; i++) {
          const [x, y] = f.pts[i], j = i ? (E.hash2(i * 7 + Math.floor(this.t * 30), 3) - .5) * 10 : 0, pt = [x + j, y - j, z + (E.hash2(i, Math.floor(this.t * 30)) - .5) * 8];
          if (prev) { pen.bar(prev[0], prev[1], prev[2], pt[0], pt[1], pt[2], 1.4 * (1 - k * .5), .6, f.color).bar(prev[0], prev[1], prev[2], pt[0], pt[1], pt[2], .5, .3, '#ffffff'); }
          prev = pt;
        }
      } else if (f.k === 'glow') w.glow(f.x, f.y, f.z, f.r * (1 - k * .6), f.color, { core: '#ffffff' });
      else if (f.k === 'rain') { pen.at(f.x, f.y, 0); for (let i = 0; i < 5; i++) { const ox = Math.cos(i * 1.3) * 8, oy = Math.sin(i * 1.3) * 8, zz = Math.max(0, 50 - k * 90 - i * 4); pen.box(ox, oy, zz + 6, 2, 2, 12, '#6a6e7a').box(ox, oy, zz + 12.5, 4, 4, 1.4, '#8a8e9a'); } }
      else if (f.k === 'key') { pen.at(f.x, f.y, 26, this.t * 3); pen.ball(0, 0, 0, 2.6, .8, 2.6, '#ffe8a0').tube(0, 0, -1.5, 0, 0, -9, .7, '#ffe8a0').glow(0, 0, 0, 2 * (1 - k), '#fff6d8'); }
      else if (f.k === 'beam') { const cam = this.cur.world.camera.fixed; pen.at().bar(f.from[0], f.from[1], f.from[2], cam.x, cam.y, EYE - 6, 1 * (1 - k), .4, f.color); }
    }
  },
  /** the hands: each swing drawn on its member's side of the view (overlay pen: x ahead, y right, z up) */
  drawHands(w) {
    const ov = w.overlay; if (!ov) return; const p = ov.pen;
    for (const s of this.swings) {
      const m = S.party.members[s.m]; if (!m) continue;
      const u = clamp(s.t / s.dur, 0, 1), e = u < .3 ? u / .3 * .2 : .2 + E.ease.outCubic((u - .3) / .7) * .8, sd = s.side, it = m.slots[m.fx.actH || 'main'], d = it ? IT(it.id) : null;
      const skin = (m.look.colors && m.look.colors.skin) || '#d8a888', sleeve = (m.look.colors && m.look.colors.cloth) || '#5a4a3a';
      p.at();
      if (s.fam === 'cast') { const c = s.color || '#ffd36a', hx = 16 + e * 4, hy = sd * 5, hz = -7 + e * 3; p.tube(6, sd * 10, -14, hx, hy, hz, 1.6, sleeve).ball(hx, hy, hz, 1.8, 1.8, 1.8, skin).glow(hx + 1.5, hy, hz + 1, 2.4 * (1 - u * .4), c); continue; }
      if (s.fam === 'xbow' || s.fam === 'bow' || s.fam === 'sling') { const kick = u < .2 ? u / .2 : 1 - (u - .2) / .8, rise = Math.min(1, u * 5); const hx = 14 - kick * 3, hy = sd * 5, hz = -12 + rise * 6; p.tube(5, sd * 10, -16, hx - 3, hy, hz - 1, 1.6, sleeve); if (s.fam === 'xbow') p.box(hx, hy, hz, 10, 2, 2, '#6a4a2a').tube(hx + 4, hy - 5, hz + .5, hx + 4, hy + 5, hz + .5, .6, '#5a5a62'); else if (s.fam === 'bow') p.tube(hx + 3, hy, hz - 7, hx + 3, hy, hz + 7, .6, '#a07a48'); else p.ball(hx, hy, hz, 1.5, 1.5, 1.5, '#8a6a4a'); continue; }
      if (s.fam === 'spear') { const th = Math.sin(u * PI); const hx = 10 + th * 12, hy = sd * 4, hz = -8; p.tube(4, sd * 9, -15, hx - 4, hy, hz - 1, 1.6, sleeve).tube(hx - 10, hy, hz, hx + 10, hy * .6, hz + 1, .5, '#7a5a32').cone(hx + 10, hy * .6, hz + 1, hx + 14, hy * .5, hz + 1.4, 1.2, d ? d.color : '#b8bcc8'); continue; }
      if (s.fam === 'throw') { const hx = 8 + e * 10, hy = sd * (8 - e * 4), hz = -2 - e * 6; p.tube(4, sd * 10, -14, hx, hy, hz, 1.6, sleeve).ball(hx, hy, hz, 1.6, 1.6, 1.6, skin); continue; }
      if (s.fam === 'fist') { const hx = 9 + Math.sin(u * PI) * 9, hy = sd * 5, hz = -8; p.tube(3, sd * 10, -15, hx, hy, hz, 1.7, sleeve).ball(hx, hy, hz, 2, 2, 2, skin); continue; }
      // a blade, an axe or a club: from high on its side across and down
      const a = lerp(-1.25, 1.1, e), hx = 12 + Math.sin(u * PI) * 3, hy = sd * (8 - e * 10), hz = -2 - e * 9;
      const len = d && d.long ? 15 : d && d.model === 'blade' && /agger/.test(it.id) ? 7 : 11, dir = [Math.cos(a) * .35, -sd * Math.sin(a) * .7, Math.cos(a) * .9];
      const tip = [hx + 6 + dir[0] * len, hy + dir[1] * len, hz + dir[2] * len];
      p.tube(3, sd * 11, -15, hx, hy, hz, 1.7, sleeve).ball(hx, hy, hz, 1.7, 1.7, 1.7, skin);
      const col = d ? d.color : '#c8ccd8';
      if (s.fam === 'blunt') { p.tube(hx, hy, hz, tip[0], tip[1], tip[2], .7, '#6a4a2a').ball(tip[0], tip[1], tip[2], 2.6, 2.6, 2.6, col); }
      else if (s.fam === 'axe') { p.tube(hx, hy, hz, tip[0], tip[1], tip[2], .7, '#6a4a2a').box(tip[0], tip[1], tip[2], 2, 4.4, 3.6, col); }
      else p.bar(hx, hy, hz, tip[0], tip[1], tip[2], 1.4, .4, col).bar(hx - .5, hy, hz - .2, hx + .5, hy + (sd * 1.8), hz + .2, 3, .8, '#8a6a3a');
      if (u > .25 && u < .8) p.bar(hx, hy, hz, tip[0], tip[1] + sd * 4, tip[2] + 4, 3, .1, '#fff6e0');
    }
  },
  /** what the mouse can point at ahead: the front wall's feature, a door, items ahead and here, a monster, an NPC */
  hotspots(r) {
    const Wv = this.cur, w = Wv.world, P = S.party, fl = S.floors[this.f], hot = this.hot; hot.length = 0;
    if (P.tw || S.transit || S.talk || S.moment) return;
    const [fx, fy] = B.front(), add = (x, y, z, rad, label, cmd, kind) => { const s = w.project(x, y, z); if (s) hot.push({ x: s[0], y: s[1], r: rad, label, cmd, kind }); };
    const ft = B.featAt(P.cx, P.cy, P.dir);
    if (ft && THING_OF[ft.kind]) { const [x, y] = featPos(ft), z = { greatLock: 24, clockFace: 26, plaque: 24, candle: 22, lever: 22, button: 20, catch: 16, gearNiche: 26 }[ft.kind] || 16; add(x - DX[P.dir] * 2, y - DY[P.dir] * 2, z, ft.kind === 'greatLock' ? 30 : 18, B.FEAT_LABEL[ft.kind] || 'Use', { c: 'use' }, 'feat'); }
    const d = B.doorAt(fx, fy);
    if (d && !['illusion', 'secret'].includes(d.kind) && fl.doors[d.id].open < .85) add(mid(fx), mid(fy), 22, 34, d.kind === 'gate' ? 'Gate' : d.kind === 'seal' ? 'Magic seal' : d.kind === 'undergate' ? 'The Undergate' : fl.doors[d.id].locked ? 'Locked door - click to unlock' : 'Door - click to open', { c: 'use' }, 'door');
    else if (d && d.kind === 'door' && fl.doors[d.id].open >= .85) add(mid(fx) - DX[P.dir] * 14, mid(fy) - DY[P.dir] * 14, 30, 16, 'Door - click to close', { c: 'use' }, 'door');
    const ms = B.monsAt(fx, fy); if (ms.length) add(mid(fx), mid(fy), 16, 30, B.MON(ms[0].type).name + ' - right click: Party Strike', { c: 'strike' }, 'mon');
    if (this.f === 'f4' && S.boss && S.boss.alive && S.boss.cx === fx && S.boss.cy === fy) add(mid(fx), mid(fy), 28, 40, 'The Bolt-Holder', { c: 'strike' }, 'mon');
    const its = (x, y) => (fl.items[key(x, y)] || []).forEach((it, i) => { const q = i % 4, ox = q % 2 ? 7 : -7, oy = q > 1 ? 7 : -7; add(mid(x) + ox, mid(y) + oy, 1, 7, B.itemName(it) + ' - click to take', { c: 'pick', x, y, i }, 'item'); });
    if (B.openFree(fx, fy)) its(fx, fy);
    its(P.cx, P.cy);
    for (const [id, n] of Object.entries(fl.npcs)) if (n.state === 'here' && n.x === fx && n.y === fy) add(mid(fx), mid(fy), 22, 20, ((B.NPCS[id] || {}).full || (B.PEOPLE[id] || {}).name), { c: 'examine' }, 'npc');
  },
  pick(sx, sy) { let best = null, bd = 1e9; for (const h of this.hot) { const dd = Math.hypot(h.x - sx, h.y - sy); if (dd <= h.r && dd < bd) { bd = dd; best = h; } } return best; }
});
B.FEAT_LABEL = { lever: 'Lever - click to pull', button: 'Button - click to press', catch: 'Something odd - click to press', alcove: 'Niche - click to take or place', shrine: 'The Rat Shrine - click to place', gearNiche: 'Gear socket - click to place a gear',
  clockFace: 'The Great Clock', plaque: 'Inscription - click to read', candle: 'Candle - click to light', greatLock: 'Great Lock - click to turn', raiseShrine: 'Shrine of the Threshold - click to pray' };
if (W3) Object.assign(W3.THINGS, VIEW_THINGS);

/* =====================================================================================
 * 44-view-null: the NullView, the same interface for Node and tests (no 3D engine)
 * ===================================================================================== */
const NullView = { worlds: {}, cur: null, f: null, hot: [], fx: [], swings: [], ghosts: new Map(), build() {}, enter(f) { this.f = f; }, step() {}, draw() {}, event() {}, tickFx() {}, pick() { return null; }, setGhost(id, g) { this.ghosts.set(id, g); }, removeGhost(id) { this.ghosts.delete(id); }, get world() { return null; } };
B.NullView = NullView;
