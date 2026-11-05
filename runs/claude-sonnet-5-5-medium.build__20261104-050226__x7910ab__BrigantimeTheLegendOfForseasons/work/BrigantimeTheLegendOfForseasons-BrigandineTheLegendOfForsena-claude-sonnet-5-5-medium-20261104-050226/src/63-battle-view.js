/* ---- BattleView: shows a BattleSim (the sim is the truth), plays its events, and takes the player's commands. ---- */
const ELNAMES = ['Spring', 'Summer', 'Autumn', 'Winter', 'Hour'];
G.BattleView = class {
  constructor(spec, o = {}) {
    this.spec = spec; this.o = o; this.S = B.create(spec); this.vis = new Map(); this.q = []; this.cur = null; this.t = 0; this.mode = 'free'; this.cursor = [0, 0]; this.cfx = 0;
    this.reach = null; this.sel = null; this.menu = null; this.sub = null; this.targets = []; this.tIdx = 0; this.over = false; this.overT = 0; this.banner = null; this.shake = 0;
    this.steep = false; this.timer = 0; this.floaters = []; this.info = false; this.confirmEnd = null; this.skillMode = null; this.itemMode = null; this.stepLog = [];
    for (const u of this.S.units) this.initVis(u);
    const hs = this.S.sides[0].human ? 0 : this.S.sides[1].human ? 1 : 0; const first = this.S.units.find(u => u.side === hs && u.lead); if (first) { this.cursor = [first.c, first.r]; this.fx = G.hex.px(first.c, first.r, 1)[0]; }
    this.queueEvents([{ k: 'phase', side: 0, bell: 1 }]);
    this.dialsStart = B.dialCount(this.S);
  }
  initVis(u) {
    const p = G.hexCenter(u.c, u.r);
    this.vis.set(u.uid, { x: p[0], y: p[1], hp: u.hp, mp: u.mp, alpha: 1, flash: 0, lunge: 0, walk: 0, dir: u.side === 1 ? -1 : 1, pose: null, atk: new E.Attack('slash'), seed: u.uid * 1.7, t: 0, fx: {} });
  }
  isHuman(side) { if (this.o.net) return side === this.o.net.mySide; return !!this.S.sides[side].human && !this.o.auto; }
  isRemote(side) { return !!this.o.net && side !== this.o.net.mySide; }
  queueEvents(ev) { for (const e of ev) this.q.push(e); }
  busy() { return !!this.cur || this.q.length > 0; }
  submit(cmd) { const n = this.o.net; if (!n) return this.apply(cmd); if (n.isHost) { const ok = this.apply(cmd); if (ok) n.send({ c: cmd }); return ok; } n.send({ c: cmd }, true); return true; }
  apply(cmd) { const ev = B.apply(this.S, cmd); if (!ev) return false; this.queueEvents(ev); return true; }
  uPos(u) { return G.hexCenter(u.c, u.r); }
  float(x, y, text, col) { this.floaters.push({ x, y, text, col, t: 0 }); }
  /* ---- event playback ---- */
  startEvent(e) {
    const S = this.S, V = u => this.vis.get(u);
    this.cur = { e, t: 0, dur: .15 };
    switch (e.k) {
      case 'move': { const v = V(e.u), u = S.units[e.u]; this.cur.dur = Math.max(.15, (e.path.length - 1) * .13); this.cur.path = e.path.map(p => G.hexCenter(p[0], p[1])); v.walk = 1; G.sfx('move'); break; }
      case 'hit': {
        const a = S.units[e.a], d = S.units[e.d], va = V(e.a), vd = V(e.d); this.cur.dur = e.skill ? .38 : (e.akind === 'melee' ? .6 : .75); this.cur.did = false;
        if (!e.skill) { va.dir = d.c * 100 + d.r > 0 && this.uPos(d)[0] < this.uPos(a)[0] ? -1 : 1; }
        if (e.akind === 'melee' && !e.skill) { va.atk = new E.Attack(a.kind === 'knight' ? 'slash' : 'claw'); va.atk.start(); G.sfx('slash'); }
        else if (!e.skill) { const p0 = this.uPos(a), p1 = this.uPos(d); G.fxAdd(p0[0], p0[1] - 8, 'bolt', e.akind === 'magic' ? G.SEASON_COL[a.el] : '#fff0c0', .38, { tx: p1[0], ty: p1[1] - 8 }); G.sfx(e.akind === 'magic' ? 'magic' : 'arrow'); if (a.kind === 'knight') { va.atk = new E.Attack('throw'); va.atk.start(); } }
        break;
      }
      case 'cast': { const a = S.units[e.a], va = V(e.a), p = G.hexCenter(e.hex[0], e.hex[1]); va.pose = 'cast'; this.cur.dur = .55; G.sfx(G.get('skill', e.skill).kind === 'heal' ? 'heal' : 'magic'); G.fxAdd(p[0], p[1] - 4, G.get('skill', e.skill).kind === 'heal' ? 'rise' : 'ring', G.SEASON_COL[e.el] || '#fff', .6, { r: 26 }); G.fxAdd(p[0], p[1] - 4, 'burst', G.SEASON_COL[e.el] || '#fff', .6, { r: 22 }); this.float(this.uPos(a)[0], this.uPos(a)[1] - 28, G.get('skill', e.skill).name, '#ffe8a0'); break; }
      case 'down': { this.cur.dur = .6; G.sfx('down'); const v = V(e.u), p = this.uPos(S.units[e.u]); G.fxAdd(p[0], p[1] - 8, 'burst', '#fff', .5); break; }
      case 'flee': { this.cur.dur = .25; break; }
      case 'heal': { const p = this.uPos(S.units[e.u]); this.cur.dur = .45; this.float(p[0], p[1] - 22, '+' + e.amt, '#80f090'); G.fxAdd(p[0], p[1] - 4, 'rise', '#80f090', .6); V(e.u).hp = S.units[e.u].hp; G.sfx('heal'); break; }
      case 'mana': { const p = this.uPos(S.units[e.u]); this.cur.dur = .35; this.float(p[0], p[1] - 22, '+' + e.amt + ' MP', '#80c0ff'); V(e.u).mp = S.units[e.u].mp; break; }
      case 'fx': { const p = this.uPos(S.units[e.u]); this.cur.dur = .15; this.float(p[0], p[1] - 24, G.EFFECTS[e.fx].name, G.EFFECTS[e.fx].col); G.fxAdd(p[0], p[1] - 6, 'ring', G.EFFECTS[e.fx].col, .5, { r: 14 }); break; }
      case 'fire': { const p = this.uPos(S.units[e.u]); this.cur.dur = .4; this.float(p[0], p[1] - 22, '-' + e.dmg, '#ff9040'); V(e.u).hp = Math.max(0, S.units[e.u].hp); V(e.u).flash = .3; break; }
      case 'bind': { const a = S.units[e.a], d = S.units[e.d], p = this.uPos(d); this.cur.dur = .9; V(e.a).pose = 'cast'; G.sfx('bind'); G.fxAdd(p[0], p[1] - 6, 'ring', '#ffe8a0', .8, { r: 22 }); this.float(p[0], p[1] - 26, e.ok ? 'BOUND!' : 'Broke free', e.ok ? '#ffe070' : '#c0c0d0'); break; }
      case 'captured': { this.cur.dur = .3; const v = V(e.u); G.sfx('fanfare', { vol: .5 }); break; }
      case 'item': { this.cur.dur = .15; break; }
      case 'retreat': { this.cur.dur = .5; V(e.u).alpha = .3; break; }
      case 'break': { this.cur.dur = .4; this.banner = { text: 'A troop breaks!', col: '#ff9a6a', t: 0, dur: 1 }; break; }
      case 'wait': this.cur.dur = .03; break;
      case 'phase': {
        this.cur.dur = this.o.quick ? .3 : 1.0; const side = S.sides[e.side]; const mine = this.isHuman(e.side);
        this.banner = { text: 'Bell ' + e.bell + ': ' + (mine ? 'your phase' : (this.o.auto ? side.name : 'foe\'s phase')), col: G.REALMS[side.realm] ? G.REALMS[side.realm].col : '#fff', t: 0, dur: this.cur.dur };
        if (this.hot()) { this.cur.dur = 999; this.cur.hold = true; this.banner = { text: 'Player ' + (e.side + 1) + ': ' + (side.name || '').replace('The ', ''), col: G.REALMS[side.realm].col, t: 0, dur: 999, hold: true }; }
        if (e.side === 0) G.sfx('bell', { vol: .6 }); this.mode = this.isHuman(S.phase) ? 'free' : 'ai'; this.reach = null; this.sel = null; this.menu = null; break;
      }
      case 'bell': this.cur.dur = .05; break;
      case 'over': { this.cur.dur = .8; this.over = true; this.banner = { text: S.nsides > 2 ? (S.sides[S.winner].name || 'A side') + ' wins' : S.winner === 0 ? 'Attackers prevail' : 'Defenders hold', col: '#ffe8a0', t: 0, dur: 2 }; break; }
      default: this.cur.dur = .05;
    }
  }
  hot() { return !this.o.net && this.S.nsides === 2 && this.S.sides[0].human && this.S.sides[1].human && !this.o.auto; }
  tickEvent(dt) {
    const c = this.cur, e = c.e, S = this.S; c.t += dt; if (c.hold && c.t > .4 && (G.game.input.pressed('confirm') || UI.click)) { c.dur = c.t; G.sfx('select'); } const u01 = Math.min(1, c.t / c.dur), V = x => this.vis.get(x);
    switch (e.k) {
      case 'move': {
        const v = V(e.u), P = c.path, seg = (P.length - 1) * u01, i = Math.min(P.length - 2, Math.floor(seg)), f = seg - i;
        if (P.length > 1) { v.x = P[i][0] + (P[i + 1][0] - P[i][0]) * f; v.y = P[i][1] + (P[i + 1][1] - P[i][1]) * f; const dx = P[i + 1][0] - P[i][0]; if (Math.abs(dx) > 1) v.dir = dx > 0 ? 1 : -1; }
        break;
      }
      case 'hit': {
        const a = S.units[e.a], d = S.units[e.d], va = V(e.a), vd = V(e.d); const hitT = e.skill ? .12 : (e.akind === 'melee' ? .3 : .42);
        if (!c.did && c.t >= hitT) {
          c.did = true; const p = this.uPos(d);
          if (e.miss) { this.float(p[0], p[1] - 22, 'MISS', '#c0c0d0'); G.sfx('miss'); }
          else { vd.hp = Math.max(0, vd.hp - e.dmg); vd.flash = .22; vd.lunge = -.3; this.float(p[0], p[1] - 24, '-' + e.dmg, '#fff'); G.fxAdd(p[0], p[1] - 8, 'burst', G.SEASON_COL[a.el] || '#fff', .35, { r: 10 }); G.sfx('hit', { vol: .8 }); this.shake = Math.min(3, .6 + e.dmg / 14); try { G.game.input.rumble(.35, .1); } catch (er) { } }
        }
        if (!e.skill && e.akind === 'melee') { va.lunge = Math.sin(Math.min(1, c.t / .3) * Math.PI) * .9; }
        break;
      }
      case 'down': { const v = V(e.u); v.alpha = 1 - u01; v.hp = 0; break; }
      case 'flee': { const v = V(e.u); v.alpha = 1 - u01; break; }
      case 'retreat': break;
    }
    if (c.t >= c.dur) { this.endEvent(); }
  }
  endEvent() {
    const c = this.cur, e = c.e, V = x => this.vis.get(x), S = this.S;
    switch (e.k) {
      case 'move': { const v = V(e.u), u = S.units[e.u], p = G.hexCenter(u.c, u.r); v.x = p[0]; v.y = p[1]; v.walk = 0; break; }
      case 'cast': V(e.a).pose = null; V(e.a).mp = S.units[e.a].mp; break;
      case 'bind': V(e.a).pose = null; if (e.ok) { const t = S.units[e.d]; const v = V(e.d); v.alpha = 1; v.hp = t.hp; } break;
      case 'over': break;
    }
    if (e.k === 'hit') { const v = V(e.a); v.lunge = 0; }
    this.cur = null;
  }
  /* ---- per-frame update ---- */
  update(dt) {
    this.t += dt; G.fxUpdate(dt);
    for (const f of this.floaters) f.t += dt; this.floaters = this.floaters.filter(f => f.t < 1.1);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    this.shake = Math.max(0, this.shake - dt * 8);
    for (const [uid, v] of this.vis) {
      v.t += dt; v.flash = Math.max(0, v.flash - dt); v.atk.update(dt);
      const u = this.S.units[uid]; if (u.kind === 'knight') { const rig = this.rigOf(u); rig.update(dt, { x: v.x, y: 0, z: 0, vx: v.walk * v.dir * 60, vy: 0, facing: v.dir > 0 ? 0 : Math.PI, attack: v.atk.state, pose: v.pose || undefined, expr: v.flash > 0 ? 'wince' : undefined }); }
      if (u.alive && !u.gone && !(this.cur && this.cur.e.k === 'move' && this.cur.e.u === uid) && !this.busy()) { const p = G.hexCenter(u.c, u.r); v.x += (p[0] - v.x) * .5; v.y += (p[1] - v.y) * .5; v.hp = u.hp; v.mp = u.mp; }
    }
    if (this.cur) { this.tickEvent(dt); return; }
    if (this.q.length) { this.startEvent(this.q.shift()); return; }
    if (this.over || this.S.over) { this.overT += dt; if (this.overT > (this.o.overDelay || 1.2) && !this.finished) { this.finished = true; if (this.o.onOver) this.o.onOver(this.S); } return; }
    // who acts?
    const side = this.S.phase;
    if (this.isRemote(side)) { this.mode = 'ai'; return; }
    if (!this.isHuman(side)) {
      this.timer -= dt; if (this.timer > 0) return; this.timer = this.o.quick ? .02 : .18; this.mode = 'ai';
      const cmd = BA.step(this.S); if (!cmd) { this.S.over = true; return; }
      if (!this.apply(cmd)) this.apply({ t: 'endphase' });
      return;
    }
    if (this.mode === 'ai') this.mode = 'free';
    if (!this.o.noInput) this.humanUpdate(dt);
  }
  rigOf(u) {
    const size = Math.round(G.board.s * .047 * 100) / 100;
    return G.rigFor('b:' + u.id + ':' + size + ':' + u.side, () => new E.Humanoid(G.knightLook(u.id.slice(2), u.line, u.tier, u.realm, size)));
  }
  /* ---- the human's controls ---- */
  moveCursor(dx, dy) {
    const S = this.S, [c, r] = this.cursor; let best = null, bd = 1e9;
    const cand = G.hex.nb(c, r).filter(p => p[0] >= 0 && p[1] >= 0 && p[0] < S.cols && p[1] < S.rows);
    for (const p of cand) {
      const px_ = G.hex.px(p[0], p[1], 1); const ddx = px_[0] - this.fx, ddy = px_[1] - G.hex.px(c, r, 1)[1];
      if (dx && Math.sign(ddx) !== dx && Math.abs(ddy) > .1) continue; if (dy && Math.sign(ddy) !== dy) continue; if (dx && Math.abs(ddy) > .1) continue;
      const d = dx ? Math.abs(ddx) : Math.abs(ddx); if (d < bd) { bd = d; best = p; }
    }
    if (best) { this.cursor = best; if (dx) this.fx = G.hex.px(best[0], best[1], 1)[0]; G.sfx('cursor'); }
  }
  cursorUnit() { return B.at(this.S, this.cursor[0], this.cursor[1]); }
  ownReady() { return B.live(this.S, this.S.phase).filter(u => !u.done); }
  humanUpdate(dt) {
    const I = G.game.input, S = this.S, nav = UI.nav();
    // the hex under the mouse
    if (UI.mouse && UI.ptr && UI.moved) { const h = G.pickHex(S, UI.ptr[0], UI.ptr[1]); if (h && (h[0] !== this.cursor[0] || h[1] !== this.cursor[1])) { this.cursor = h; this.fx = G.hex.px(h[0], h[1], 1)[0]; } }
    const click = UI.click ? G.pickHex(S, UI.click[0], UI.click[1]) : null;
    if (this.confirmEnd) { const r = this.confirmEnd.update(); if (r && r.pick === 0) { this.confirmEnd = null; this.endPhase(); } else if (r && (r.pick === 1 || r.cancel)) this.confirmEnd = null; return; }
    if (this.info) { if (I.pressed('info') || I.pressed('cancel') || UI.click) this.info = false; return; }
    if (I.pressed('view')) { this.steep = !this.steep; G.sfx('cursor'); }
    switch (this.mode) {
      case 'free': {
        if (!(UI.mouse && !nav.x && !nav.y)) { if (nav.x) this.moveCursor(nav.x, 0); if (nav.y) this.moveCursor(0, nav.y); }
        const cu = this.cursorUnit();
        if (I.pressed('prev') || I.pressed('next')) { const list = this.ownReady(); if (list.length) { const i = list.findIndex(u => cu === u); const n = list[(i + (I.pressed('next') ? 1 : -1) + list.length * 2) % list.length]; this.cursor = [n.c, n.r]; this.fx = G.hex.px(n.c, n.r, 1)[0]; G.sfx('cursor'); } }
        if (I.pressed('info') && cu) { this.info = true; G.sfx('select'); }
        if (I.pressed('alt')) { this.confirmEnd = new UI.List([{ label: 'End the phase' }, { label: 'Keep fighting' }], { rows: 2 }); G.sfx('select'); return; }
        if (I.pressed('confirm') || click) {
          if (click) this.cursor = click; const u = this.cursorUnit();
          if (u && B.canAct(S, u)) this.selectUnit(u); else if (u) { this.info = true; } else G.sfx('error');
        }
        break;
      }
      case 'move': {
        if (!(UI.mouse && !nav.x && !nav.y)) { if (nav.x) this.moveCursor(nav.x, 0); if (nav.y) this.moveCursor(0, nav.y); }
        if (I.pressed('cancel') || (UI.click && !click)) { this.mode = 'free'; this.reach = null; this.sel = null; G.sfx('back'); break; }
        if (I.pressed('confirm') || click) {
          if (click) this.cursor = click; const u = this.sel, k = this.cursor[0] + ',' + this.cursor[1];
          if (this.cursor[0] === u.c && this.cursor[1] === u.r) { this.openMenu(); break; }
          if (this.reach && this.reach.has(k)) { this.submit({ t: 'move', u: u.uid, to: this.cursor.slice() }); this.reach = null; this.afterMove = true; this.mode = 'menu-wait'; } else G.sfx('error');
        }
        break;
      }
      case 'menu-wait': if (!this.busy()) this.openMenu(); break;
      case 'menu': {
        const r = this.menu.update(); if (!r) break;
        if (r.cancel) { if (!this.sel.moved) { this.mode = 'move'; this.reach = B.reach(S, this.sel); this.menu = null; } else G.sfx('error'); break; }
        if (r.pick != null) this.menuPick(this.menu.items[r.pick]);
        break;
      }
      case 'sub': {
        const r = this.sub.update(); if (!r) break;
        if (r.cancel) { this.mode = 'menu'; this.sub = null; break; }
        if (r.pick != null) { const it = this.sub.items[r.pick]; this.beginTarget(it.kind, it.id); }
        break;
      }
      case 'target': {
        const t = this.targets; if (!t.length) { this.mode = 'menu'; break; }
        if (nav.x || nav.y) { this.tIdx = (this.tIdx + (nav.x + nav.y > 0 ? 1 : -1) + t.length) % t.length; G.sfx('cursor'); }
        if (UI.mouse && UI.moved) { const h = G.pickHex(S, UI.ptr[0], UI.ptr[1]); if (h) { const i = t.findIndex(x => x.hex[0] === h[0] && x.hex[1] === h[1]); if (i >= 0) this.tIdx = i; } }
        this.cursor = t[this.tIdx].hex.slice();
        if (I.pressed('cancel')) { this.mode = this.skillMode || this.itemMode ? 'sub' : 'menu'; if (this.mode === 'sub' && !this.sub) this.mode = 'menu'; this.targets = []; G.sfx('back'); break; }
        if (I.pressed('confirm') || (click && t.some(x => x.hex[0] === click[0] && x.hex[1] === click[1]))) {
          if (click) { const i = t.findIndex(x => x.hex[0] === click[0] && x.hex[1] === click[1]); if (i >= 0) this.tIdx = i; }
          const tg = t[this.tIdx]; const cmd = Object.assign({ u: this.sel.uid }, tg.cmd); this.apply(cmd); this.finishUnit();
        }
        break;
      }
    }
  }
  selectUnit(u) { this.sel = u; this.reach = B.reach(this.S, u); this.mode = 'move'; G.sfx('select'); this.afterMove = false; }
  finishUnit() { this.mode = this.isHuman(this.S.phase) ? 'free' : 'ai'; this.reach = null; this.sel = null; this.menu = null; this.sub = null; this.targets = []; this.skillMode = null; this.itemMode = null; }
  openMenu() {
    const S = this.S, u = this.sel, items = [];
    const atk = B.targetsFrom(S, u, [u.c, u.r]);
    items.push({ label: 'Attack', id: 'attack', disabled: !atk.length || u.acted, tag: atk.length ? '' : 'no foe' });
    if (u.kind === 'knight') {
      const sk = u.skills.map(s => G.get('skill', s)); items.push({ label: 'Skill', id: 'skill', disabled: u.acted || !sk.some(s => u.mp >= s.mp && (!u.moved || s.mobile)), tag: u.moved ? 'planted feet' : u.mp + ' MP' });
      items.push({ label: 'Bind', id: 'bind', disabled: u.acted || !B.live(S).some(t => t.side !== u.side && t.kind === 'mon' && G.hex.dist([u.c, u.r], [t.c, t.r]) <= 2 && B.captureChance(S, u, t) > 0), tag: 'weakened foes' });
      items.push({ label: 'Item', id: 'item', disabled: u.acted || !S.sides[u.side].items.length, tag: S.sides[u.side].items.length + '' });
    }
    items.push({ label: 'Wait', id: 'wait' });
    if (u.kind === 'knight' && !u.ruler) items.push({ label: 'Retreat', id: 'retreat', col: '#e09090' });
    this.menu = new UI.List(items, { rows: items.length }); this.mode = 'menu'; G.sfx('select');
  }
  menuPick(it) {
    const S = this.S, u = this.sel;
    switch (it.id) {
      case 'wait': this.submit({ t: 'wait', u: u.uid }); this.finishUnit(); break;
      case 'retreat': this.submit({ t: 'retreat', u: u.uid }); this.finishUnit(); break;
      case 'attack': this.beginTarget('attack'); break;
      case 'bind': this.beginTarget('bind'); break;
      case 'skill': { this.skillMode = true; this.sub = new UI.List(u.skills.map(s => { const sk = G.get('skill', s); return { label: sk.name, id: s, kind: 'skill', tag: sk.mp + ' MP', disabled: u.mp < sk.mp || (u.moved && !sk.mobile) }; }), { rows: 4 }); this.mode = 'sub'; break; }
      case 'item': { this.itemMode = true; const pool = [...new Set(S.sides[u.side].items.filter(i => G.get('item', i).heal || G.get('item', i).mp))]; this.sub = new UI.List(pool.map(i => ({ label: G.get('item', i).name, id: i, kind: 'item', tag: S.sides[u.side].items.filter(x => x === i).length + 'x' })), { rows: 4 }); if (!pool.length) { this.sub = null; this.itemMode = null; G.sfx('error'); } else this.mode = 'sub'; break; }
    }
  }
  beginTarget(kind, id) {
    const S = this.S, u = this.sel, t = [];
    if (kind === 'attack') for (const f of B.targetsFrom(S, u, [u.c, u.r])) t.push({ hex: [f.c, f.r], unit: f, cmd: { t: 'attack', target: f.uid }, fc: B.forecast(S, u, f, null) });
    else if (kind === 'bind') for (const f of B.live(S)) { if (f.side !== u.side && f.kind === 'mon' && G.hex.dist([u.c, u.r], [f.c, f.r]) <= 2 && B.captureChance(S, u, f) > 0) t.push({ hex: [f.c, f.r], unit: f, cmd: { t: 'bind', target: f.uid }, p: B.captureChance(S, u, f) }); }
    else if (kind === 'skill') {
      const sk = G.get('skill', id), foes = B.live(S).filter(x => x.side !== u.side), alls = B.live(S, u.side);
      const inR = (x) => { const d = G.hex.dist([u.c, u.r], [x.c, x.r]); return d >= sk.range[0] && d <= sk.range[1]; };
      if (sk.target === 'self' || sk.target === 'troop' || sk.target === 'monsters') t.push({ hex: [u.c, u.r], unit: u, cmd: { t: 'skill', skill: id, hex: [u.c, u.r] }, sk });
      else if (sk.target === 'hex') for (const f of foes) { if (inR(f)) t.push({ hex: [f.c, f.r], unit: f, cmd: { t: 'skill', skill: id, hex: [f.c, f.r] }, sk }); }
      else if (sk.target === 'foe') for (const f of foes) { if (inR(f)) t.push({ hex: [f.c, f.r], unit: f, cmd: { t: 'skill', skill: id, target: f.uid }, sk }); }
      else if (sk.target === 'ally') for (const f of alls) { if (inR(f) && f.hp < f.maxhp) t.push({ hex: [f.c, f.r], unit: f, cmd: { t: 'skill', skill: id, target: f.uid }, sk }); }
    } else if (kind === 'item') for (const f of B.live(S, u.side)) if (G.hex.dist([u.c, u.r], [f.c, f.r]) <= 1 && (G.get('item', id).mp ? f.kind === 'knight' && f.mp < f.maxmp : f.hp < f.maxhp)) t.push({ hex: [f.c, f.r], unit: f, cmd: { t: 'item', item: id, target: f.uid } });
    if (!t.length) { G.sfx('error'); UI.toast('Nothing to target.'); return; }
    this.targets = t; this.tIdx = 0; this.mode = 'target'; this.tKind = kind; G.sfx('select');
  }
  endPhase() { this.submit({ t: 'endphase' }); this.mode = 'ai'; this.sel = null; this.reach = null; }
  /* ---- drawing ---- */
  layout(W, H) { G.boardLayout(this.S, W, H, 17, 60, this.steep); }
  draw(g, r, W, H) {
    const S = this.S, t = this.t, season = S.season; this.layout(W, H);
    const P = G.SEASON_PAL[season];
    // backdrop: sky, far hills, ground
    const sky = P.sky; for (let i = 0; i < 6; i++) px.rect(g, 0, Math.round(i * H / 6), W, Math.ceil(H / 6) + 1, G.lerpCol(sky[0], sky[1], i / 5));
    const gc = G.tone(P.plain[0]).deep; px.rect(g, 0, 40, W, H, G.lerpCol(P.plain[0], '#101020', .55));
    for (let i = 0; i < 8; i++) px.ell(g, i * W / 7, 46, 60, 18 + (i % 3) * 6, G.lerpCol(P.forest, '#101020', .35 + (i % 2) * .15));
    px.rect(g, 0, 56, W, H, G.lerpCol(P.plain[1], '#101020', .5));
    const sh = this.shake ? (Math.random() - .5) * this.shake * 2 : 0;
    if (sh) g.save(), g.translate(Math.round(sh), Math.round(-sh * .5));
    // highlights
    const hi = new Map(); const mark = (c, r, col, a) => hi.set(c + ',' + r, { col, a });
    if (this.reach) for (const v of this.reach.values()) mark(v.c, v.r, '#5aa0ff', .35);
    if (this.reach && this.sel) { const u = this.sel; for (const v of this.reach.values()) for (const f of B.targetsFrom(S, u, [v.c, v.r])) { if (!hi.has(f.c + ',' + f.r)) mark(f.c, f.r, '#ff5a5a', .28); } }
    if (this.mode === 'target') for (const x of this.targets) mark(x.hex[0], x.hex[1], this.tKind === 'bind' ? '#ffd860' : (x.sk && x.sk.kind === 'heal') || this.tKind === 'item' ? '#60ff90' : '#ff5a5a', .5);
    if (this.mode === 'free' || this.mode === 'move') { /* cursor unit's threat */ const cu = this.cursorUnit(); if (cu && this.mode === 'free' && !cu.done) { const rc = B.reach(S, cu); for (const v of rc.values()) if (!hi.has(v.c + ',' + v.r)) mark(v.c, v.r, cu.side === S.phase ? '#5aa0ff' : '#ff9a5a', .18); } }
    for (let rr = 0; rr < S.rows; rr++) for (let c = 0; c < S.cols; c++) G.drawTile(g, S.tiles[rr][c], season, c, rr, t, hi.get(c + ',' + rr));
    // cursor
    if (!this.o.noInput || this.o.cursor) {
      const [cx, cy] = G.hexCenter(this.cursor[0], this.cursor[1]), pulse = 1 + Math.sin(t * 8) * .06, pts = G.hex.corners(cx, cy, (G.board.s - .5) * pulse, G.board.sq);
      for (let i = 0; i < 6; i++) px.line(g, pts[i][0], pts[i][1], pts[(i + 1) % 6][0], pts[(i + 1) % 6][1], '#fff0a0', 1);
    }
    if (this.sel) { const [cx, cy] = G.hexCenter(this.sel.c, this.sel.r), pts = G.hex.corners(cx, cy, G.board.s - 1, G.board.sq); for (let i = 0; i < 6; i++) px.line(g, pts[i][0], pts[i][1], pts[(i + 1) % 6][0], pts[(i + 1) % 6][1], '#ffffff', 1); }
    // units, back to front
    const order = S.units.filter(u => { const v = this.vis.get(u.uid); return v && (u.alive && !u.gone || v.alpha > .02); }).sort((a, b) => this.vis.get(a.uid).y - this.vis.get(b.uid).y);
    const k = G.board.s / 12;
    for (const u of order) this.drawUnit(g, r, u, k);
    G.fxDraw(g);
    for (const f of this.floaters) { const u = f.t / 1.1; G.T(g, f.text, f.x - G.TW(f.text) / 2, f.y - u * 12, f.col, { shadow: '#000' }); }
    if (sh) g.restore();
    this.drawHud(g, W, H);
  }
  drawUnit(g, r, u, k) {
    const v = this.vis.get(u.uid), x = Math.round(v.x), y = Math.round(v.y + 2), side = u.side, realm = G.REALMS[this.S.sides[side].realm] || G.REALMS[5];
    const ready = this.S.phase === side && !u.done && !this.S.over;
    // base ring in the realm colour
    px.ell(g, x, y, 8 * k, 3.4 * k, '#00000066'); px.ell(g, x, y, 7 * k, 2.8 * k, ready && Math.floor(this.t * 3) % 2 ? G.lerpCol(realm.col, '#ffffff', .4) : realm.dark);
    px.ell(g, x, y, 6 * k, 2.2 * k, realm.col);
    const al = v.alpha;
    if (u.kind === 'knight') {
      const rig = this.rigOf(u);
      r.__ov = true;
      if (al < 1) { g.save(); g.globalAlpha = Math.max(0, al); }
      rig.draw(g, x, y - 1 + (v.lunge ? 0 : 0), G.game.view);
      if (al < 1) g.restore();
      if (u.lead) { px.rect(g, x - 2, y - Math.round(25 * k) - 1, 5, 3, '#e8c860'); px.rect(g, x - 1, y - Math.round(25 * k) - 3, 1, 2, '#e8c860'); px.rect(g, x + 1, y - Math.round(25 * k) - 3, 1, 2, '#e8c860'); }
    } else {
      const sp = G.get('monster', u.species);
      G.drawMon(g, sp, u.form, x, y - (sp.fly ? 0 : 0), { t: v.t, dir: v.dir, flash: v.flash > 0, walk: v.walk, lunge: v.lunge, seed: v.seed, alpha: al, scale: k * .7 });
    }
    // hp bar and status
    if (al > .3) {
      const bw = 14, by = y - Math.round((u.kind === 'knight' ? 23 : 16) * k) - 4; G.bar(g, x - bw / 2, by, bw, 3, v.hp / u.maxhp, v.hp / u.maxhp > .5 ? '#60e070' : v.hp / u.maxhp > .25 ? '#f0c840' : '#f05040');
      let ix = x - 8; for (const f in u.fx) { px.rect(g, ix, by - 4, 3, 3, G.EFFECTS[f].col); ix += 4; }
      if (u.fx.root) G.T(g, '#', x - 2, y - 14, '#60c060');
    }
  }
  drawHud(g, W, H) {
    const S = this.S, t = this.t;
    // top bar
    px.rect(g, 0, 0, W, 16, '#0a0614cc'); px.rect(g, 0, 16, W, 1, '#c8a86055');
    // the bell clock
    const cx = 12, cy = 8; px.disc(g, cx, cy, 6, '#c8a860'); px.disc(g, cx, cy, 5, '#1e1630'); const frac = (S.bell - 1 + (S.phase ? .5 : 0)) / S.bells; const a = frac * Math.PI * 2 - Math.PI / 2;
    px.line(g, cx, cy, cx + Math.cos(a) * 4, cy + Math.sin(a) * 4, '#fff0a0', 1); px.dot(g, cx, cy, '#fff');
    G.T(g, 'Bell ' + Math.min(S.bell, S.bells) + '/' + S.bells, 22, 4, '#ffe8a0');
    const phaseSide = S.sides[S.phase], pc = (G.REALMS[phaseSide.realm] || {}).col || '#fff';
    const rn = (phaseSide.name || '').replace('The ', ''); const pt = (this.hot() ? 'Player ' + (S.phase + 1) + ': ' : phaseSide.human && !this.o.auto ? 'Your phase: ' : this.o.auto ? '' : 'Foe: ') + rn;
    G.T(g, pt, 92, 4, pc);
    const rtxt = S.sides.map((_, i) => B.live(S, i).length).join(' v ');
    G.T(g, G.SEASONS[S.season], W - 8 - G.CORNER - G.TW(G.SEASONS[S.season]), 4, G.SEASON_COL[S.season]); G.T(g, rtxt, W - 20 - G.CORNER - G.TW(G.SEASONS[S.season]) - G.TW(rtxt), 4, '#d8d0f0');
    // dials hint
    if (S.map === 'sanctum') { const held = B.dialsHeld(S), n = this.dialsStart; G.T(g, 'Dials ' + held + '/' + n, W - 8 - G.TW('Dials 0/4'), 19, '#ffd870'); }
    // tutorial / mode hint
    const hint = this.hint(); if (hint) { const w = Math.min(W - 20, G.TW(hint) + 12); G.box(g, Math.round((W - w) / 2), 19, w, 12, { alpha: .85 }); G.T(g, hint, (W - G.TW(hint)) / 2, 22, '#ffe8a0'); }
    // bottom: cursor unit panel
    const cu = this.mode === 'target' && this.targets.length ? this.targets[this.tIdx].unit : (this.sel && this.mode !== 'free' ? this.sel : this.cursorUnit());
    const py = H - 15 - 44; px.rect(g, 0, py, W, 44, '#0a0614dd'); px.rect(g, 0, py, W, 1, '#c8a86066');
    if (cu) this.drawUnitPanel(g, 6, py + 3, cu, W); else { const tt = G.TERRAIN[B.tile(S, this.cursor[0], this.cursor[1])] || {}; G.T(g, tt.name || '', 8, py + 5, '#d8d0f0'); G.T(g, 'Defence ' + Math.round((tt.def || 0) * 100) + '%', 8, py + 16, '#a8a0c8'); }
    this.drawTide(g, W, py);
    if (this.mode === 'target' && this.targets[this.tIdx]) this.drawForecast(g, W, py);
    // menus
    if (this.mode === 'menu' && this.menu) { const [cx2, cy2] = G.hexCenter(this.sel.c, this.sel.r), mw = 74, mh = this.menu.items.length * 12 + 6; let mx = cx2 + 16, my = G.clamp(cy2 - mh / 2, 20, py - mh - 2); if (mx + mw > W - 4) mx = cx2 - mw - 16; G.box(g, mx, my, mw, mh, { alpha: .95 }); this.menu.draw(g, mx + 3, my + 3, mw - 6); }
    if (this.mode === 'sub' && this.sub) { const mw = 120, mh = this.sub.items.length * 12 + 6; const mx = 90, my = G.clamp(py - mh - 4, 20, 200); G.box(g, mx, my, mw, mh, { alpha: .95 }); this.sub.draw(g, mx + 3, my + 3, mw - 6); const it = this.sub.cur(); if (it && it.kind === 'skill') { const sk = G.get('skill', it.id); G.box(g, mx + mw + 4, my, 120, 34, { alpha: .95 }); UI.text(g, sk.text, mx + mw + 8, my + 4, 112, '#d8d0f0', 9); } }
    if (this.confirmEnd) { const mw = 90, mh = 38, mx = (W - mw) / 2, my = (H - mh) / 2 - 20; G.box(g, mx, my, mw, mh); G.T(g, 'End your phase?', mx + 8, my + 4, '#ffe8a0'); this.confirmEnd.draw(g, mx + 4, my + 15, mw - 8); }
    if (this.info) this.drawInfo(g, W, H, this.cursorUnit());
    // banner
    if (this.banner && this.banner.hold) { px.polyDither(g, [[0, 0], [W, 0], [W, H], [0, H]], '#000000', .92); G.T(g, 'Pass the controller. ' + G.game.input.label('confirm') + ' to begin your phase', W / 2 - G.TW('Pass the controller. ' + G.game.input.label('confirm') + ' to begin your phase') / 2, H / 2 + 6, '#d8d0f0'); }
    if (this.banner) { const b = this.banner, u = b.hold ? .5 : b.t / b.dur, a = b.hold ? 1 : Math.min(1, Math.min(u * 6, (1 - u) * 6)); const bw = G.TW(b.text, { scale: 2 }) + 40, by = Math.round(H / 2 - 40); px.polyDither(g, [[0, by], [W, by], [W, by + 26], [0, by + 26]], '#000000', .65 * a); E.font.text(g, b.text, Math.round(W / 2 - G.TW(b.text, { scale: 2 }) / 2 + (1 - a) * 30), by + 6, b.col, { scale: 2, shadow: '#000', outline: false }); }
  }
  hint() {
    if (this.o.tutorial) {
      const m = this.mode;
      if (this.over) return null;
      if (m === 'free') return 'Select one of your glowing units (' + G.game.input.label('confirm') + '). End the phase with ' + G.game.input.label('alt') + '.';
      if (m === 'move') return 'Blue hexes are where it can walk. Red ones are what it could strike.';
      if (m === 'menu') return 'Attack, Skill (needs planted feet), Bind weakened foes, or Wait.';
      if (m === 'target') return 'Pick a target. Check the forecast below.';
      return null;
    }
    if (this.mode === 'move' && this.sel) return 'Choose where to stand';
    if (this.mode === 'target') return ({ attack: 'Choose a target', bind: 'Bind: choose a weakened monster', skill: 'Choose a target for the skill', item: 'Choose who to help' })[this.tKind];
    return null;
  }
  drawUnitPanel(g, x, y, u, W) {
    const realm = G.REALMS[this.S.sides[u.side].realm] || G.REALMS[5], el = u.el;
    px.rect(g, x, y, 22, 22, '#1a1230'); px.rect(g, x, y, 22, 1, realm.col);
    if (u.kind === 'knight') { const rig = G.rigFor('pt:' + u.id, () => new E.Humanoid(G.knightLook(u.id.slice(2), u.line, u.tier, u.realm, 1.3))); rig.drawPortrait(g, x + 1, y + 1, 20, { zoom: 2.6, turn: .3, bg: '#1a1230' }); }
    else G.drawMon(g, G.get('monster', u.species), u.form, x + 11, y + 21, { t: this.t, scale: .8, dir: 1 });
    G.T(g, u.name + (u.lead ? ' ★' : ''), x + 26, y + 1, '#fff8d8'); G.T(g, (u.kind === 'knight' ? G.className({ id: u.id.slice(2), tier: u.tier, line: u.line }) : ELNAMES[el] + ' ' + (u.size === 'S' ? 'small' : u.size === 'L' ? 'large' : 'medium')) + '  Lv ' + u.lvl, x + 26, y + 11, G.SEASON_COL[el]);
    G.T(g, 'HP', x, y + 25, '#a8a0c8'); G.bar(g, x + 12, y + 26, 54, 5, u.hp / u.maxhp, '#60e070'); G.T(g, u.hp + '/' + u.maxhp, x + 70, y + 25, '#d8d0f0');
    if (u.maxmp) { G.T(g, 'MP', x + 112, y + 25, '#a8a0c8'); G.bar(g, x + 126, y + 26, 34, 5, u.mp / u.maxmp, '#60a0f0'); }
    const sx = x + 168, row = [['ATK', u.atk], ['DEF', u.def], ['INT', u.int], ['MOV', u.mov]];
    row.forEach((r_, i) => { G.T(g, r_[0], sx + (i % 2) * 40, y + 1 + Math.floor(i / 2) * 10, '#a8a0c8'); G.T(g, String(r_[1]), sx + 22 + (i % 2) * 40, y + 1 + Math.floor(i / 2) * 10, '#fff8d8'); });
    let fx = ''; for (const f in u.fx) fx += G.EFFECTS[f].name + ' '; if (fx) G.T(g, fx, x + 26, y + 33, '#ffd870');
    if (u.kind === 'mon' && !B.ward(this.S, u)) G.T(g, 'Outside the Ward', x + 90, y + 33, '#f0a060');
  }
  drawTide(g, W, py) {
    const S = this.S, x = W - 108, y = py + 3; G.T(g, G.SEASONS[S.season] + ' Tide', x, y, G.SEASON_COL[S.season]);
    const tx = ['Blossoms flood the lowland.', 'Forests burn. Wildfire bites.', 'The gale dulls arrows and wings.', 'Water freezes. Others move slower.'][S.season];
    UI.text(g, tx, x, y + 10, 104, '#a8a0c8', 9);
    const tt = G.TERRAIN[B.tile(S, this.cursor[0], this.cursor[1])] || {}; G.T(g, tt.name + (tt.def ? ' +' + Math.round(tt.def * 100) + '%' : ''), x, y + 31, '#d8d0f0');
  }
  drawForecast(g, W, py) {
    const S = this.S, tg = this.targets[this.tIdx], u = this.sel; let txt = '';
    if (this.tKind === 'attack') { const f = tg.fc; txt = `${f.lo}-${f.hi} damage, ${Math.round(f.hit * 100)}% to hit` + (f.kill ? ', defeats it' : ''); }
    else if (this.tKind === 'bind') txt = 'Bind chance ' + Math.round(tg.p * 100) + '%';
    else if (tg.sk) { if (tg.sk.kind === 'aoe') { const f = B.forecast(S, u, tg.unit, tg.sk.id); txt = '~' + f.dmg + ' damage to each in the burst'; } else txt = tg.sk.text; }
    if (!txt) return; const w = G.TW(txt) + 12; G.box(g, Math.round((W - w) / 2), py - 16, w, 13, { alpha: .95 }); G.T(g, txt, (W - w) / 2 + 6, py - 13, '#ffe8a0');
  }
  drawInfo(g, W, H, u) {
    if (!u) return; const w = 200, h = 130, x = (W - w) / 2, y = 22; G.box(g, x, y, w, h);
    G.T(g, u.name, x + 8, y + 6, '#ffe8a0', { scale: 1 }); G.T(g, (u.kind === 'knight' ? G.className({ id: u.id.slice(2), tier: u.tier, line: u.line }) : (G.get('monster', u.species).kind)) + ' - Lv ' + u.lvl + ' - ' + ELNAMES[u.el], x + 8, y + 16, G.SEASON_COL[u.el]);
    const rows = [['Hit points', u.hp + ' / ' + u.maxhp], ['Attack', u.atk], ['Defence', u.def], ['Intellect', u.int], ['Move', u.mov + (u.fly ? ' (flies)' : '')], ['Range', u.range[0] + '-' + u.range[1]], ['Size', u.size], ['Bond cost', u.kind === 'mon' ? G.get('monster', u.species).bond : '-']];
    rows.forEach((r_, i) => { G.T(g, r_[0], x + 10 + (i % 2) * 94, y + 30 + Math.floor(i / 2) * 11, '#a8a0c8'); G.T(g, String(r_[1]), x + 62 + (i % 2) * 94 - 0, y + 30 + Math.floor(i / 2) * 11, '#fff8d8'); });
    const opp = u.el < 4 ? ELNAMES[G.opposite(u.el)] : null; G.T(g, opp ? 'Hit hard by ' + opp + ' - resists ' + ELNAMES[u.el] : 'Outside the seasons', x + 10, y + 76, '#d8d0f0');
    if (u.skills.length) UI.text(g, 'Skills: ' + u.skills.map(s => G.get('skill', s).name).join(', '), x + 10, y + 86, w - 20, '#ffd870', 9); else if (u.kind === 'mon') G.T(g, 'Trait: ' + G.TRAIT_TEXT[G.get('monster', u.species).passive], x + 10, y + 88, '#ffd870');
    G.T(g, 'Terrain: ' + (G.TERRAIN[B.tile(this.S, u.c, u.r)] || {}).name, x + 10, y + 100, '#d8d0f0'); G.T(g, G.game.input.label('info') + ' to close', x + 10, y + 114, '#a8a0c8');
  }
  prompts() {
    switch (this.mode) {
      case 'free': return [['confirm', 'Select'], ['info', 'Details'], ['prev', 'Prev unit'], ['next', 'Next'], ['alt', 'End phase'], ['view', 'Tilt']];
      case 'move': return [['confirm', 'Move here'], ['cancel', 'Back']];
      case 'menu': case 'sub': return [['confirm', 'Choose'], ['cancel', 'Back']];
      case 'target': return [['confirm', 'Confirm'], ['dpad', 'Next target'], ['cancel', 'Back']];
      default: return [];
    }
  }
};
