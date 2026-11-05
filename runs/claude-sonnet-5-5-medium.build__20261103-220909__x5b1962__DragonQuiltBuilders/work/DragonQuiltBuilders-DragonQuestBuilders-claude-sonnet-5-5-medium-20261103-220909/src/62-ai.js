// Autopilot (shared by attract mode and the headless playthrough) and the attract-mode director.
(() => {
const { E, T } = DQ;
const cellC = c => c * T + 8;

const empty = () => ({ mx: 0, my: 0, sprint: false, jump: false, swingPressed: false, swingHeld: false, placePressed: false, interactPressed: false, cancel: false, aim: null });
DQ.Autopilot = class {
  constructor() { this.path = null; this.pi = 1; this.pt = 0; this.swingT = 0; this.stuck = 0; this.last = null; }
  // walk toward world point; returns true on arrival
  walkTo(x, y, within = 10, out) {
    const S = DQ.S, h = S.hero, w = S.world, d = Math.hypot(x - h.x, y - h.y);
    if (d <= within) return true;
    let tx = x, ty = y;
    if (!w.map.los(h.x, h.y, x, y)) {
      this.pt -= 1 / 60;
      if (!this.path || this.pt <= 0) { this.pt = 1; const g = w.nearestWalkable(Math.floor(x / T), Math.floor(y / T), 4) || [Math.floor(x / T), Math.floor(y / T)]; this.path = w.path(Math.floor(h.x / T), Math.floor(h.y / T), g[0], g[1], { cap: 6000 }); this.pi = 1; }
      if (this.path && this.path.length > 1) { this.pi = Math.min(this.pi, this.path.length - 1); let wp = this.path[this.pi]; if (Math.hypot(cellC(wp[0]) - h.x, cellC(wp[1]) - h.y) < 6 && this.pi < this.path.length - 1) { this.pi++; wp = this.path[this.pi]; } tx = cellC(wp[0]); ty = cellC(wp[1]); }
    }
    const dd = Math.hypot(tx - h.x, ty - h.y) || 1; out.mx = (tx - h.x) / dd; out.my = (ty - h.y) / dd;
    // stuck → hop
    if (this.last && Math.hypot(h.x - this.last[0], h.y - this.last[1]) < .3) { this.stuck++; if (this.stuck > 40) { out.jump = true; this.path = null; this.stuck = 0; } } else this.stuck = 0; this.last = [h.x, h.y];
    return false;
  }
  face(x, y, out) { const h = DQ.S.hero; out.aim = Math.atan2(y - h.y, x - h.x); }
  swing(dt, out, rate = .5) { this.swingT -= dt; if (this.swingT <= 0) { this.swingT = rate; out.swingPressed = true; } }
  nearest(list, f) { const h = DQ.S.hero; let b = null, bd = 1e9; for (const e of list) { if (f && !f(e)) continue; const d = Math.hypot((e.x > 99 && e.type ? cellC(e.x) : e.x) - h.x, (e.type ? cellC(e.y) : e.y) - h.y); if (d < bd) { bd = d; b = e; } } return b; }
};

// ---------- place a house (live, block by block) ----------
DQ.houseCells = function (x0, y0) {   // 5x5 outline, interior 3x3, door on the south side middle
  const cells = []; for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) { const edge = x === 0 || y === 0 || x === 4 || y === 4; if (edge && !(x === 2 && y === 4)) cells.push([x0 + x, y0 + y]); }
  return cells;
};

// ---------- attract director ----------
DQ.Attract = {
  on: false, vi: 0, t: 0, bot: null, task: null, steps: [],
  start() {
    this.on = true; DQ.attractOn = true; this.vi = -1; this.t = 0; this.bot = new DQ.Autopilot();
    DQ.startSession('story', { name: 'Demo' }); DQ.god = true; DQ.devBeat('siege'); const S = DQ.S;
    S.flags.firstNight = 1; DQ.inv.add('door', 4, true); DQ.inv.add('torch', 6, true); DQ.inv.add('bed', 2, true); DQ.inv.add('plank', 40, true); DQ.inv.add('cobble', 40, true);
    S.hotbar = ['plank', 'cobble', 'door', 'torch', 'bed', 'ballista', 'berry', 'crumpet']; S.sel = 0; DQ.inv.add('crumpet', 4, true);
    this.next();
  },
  stop() { this.on = false; DQ.attractOn = false; DQ.god = false; DQ.forceTarget = null; if (DQ.talk) { DQ.talk.close(); DQ.talk.auto = 0; } DQ.ui.closeAll(); },
  goto(x, y) { const h = DQ.S.hero; h.x = cellC(x); h.y = cellC(y); h.z = 0; h.vx = h.vy = 0; DQ.snapCam(); },
  next() {
    const S = DQ.S, h = S.hero; this.vi = (this.vi + 1) % 5; this.t = 0; this.step = 0; this.bot.path = null; DQ.forceTarget = null;
    for (const m of S.monsters) m.remove = true; S.monsters = S.monsters.filter(m => false); S.boss = null; S.shots = []; S.siege = { phase: 'none', wave: 0, t: 0, left: 0, tries: 0 }; DQ.talk.close(); DQ.talk.auto = 0; DQ.ui.closeAll();
    h.hp = h.maxHp; h.belly = 100; S.cut = null; DQ.camOverride = null;
    const lab = ['Gather what you need', 'Build a room, get Cheer', 'Talk to your residents', 'Fight the Lintlings', 'Defeat Sir Buttonsworth'][this.vi]; DQ.toast(lab, '#ffe9a0'); this.label = lab;
    if (this.vi === 0) { S.clock.hour = 9; this.goto(17, 57); }
    if (this.vi === 1) { S.clock.hour = 12; this.goto(44, 53); this.cells = DQ.houseCells(44, 49); this.ci = 0; S.hotbar[0] = 'plank'; S.sel = 0; for (const [x, y] of this.cells.concat([[46, 53]])) { S.world.pop(x, y, { silent: true }); S.world.pop(x, y, { silent: true }); } }
    if (this.vi === 2) { S.clock.hour = 16.5; const r = S.residents[0]; if (r) { this.goto(Math.floor(r.x / T) - 2, Math.floor(r.y / T)); } }
    if (this.vi === 3) { S.clock.hour = 18.6; this.goto(55, 40); DQ.inv.add('bodkin', 1, true); DQ.inv.equipBest(); for (let i = 0; i < 4; i++) DQ.spawnMonster(i % 2 ? 'pinhog' : 'lintling', cellC(58 + i), cellC(36 + (i % 2) * 3)); }
    if (this.vi === 4) { S.clock.hour = 11; DQ.inv.add('ripper', 1, true); DQ.inv.equipBest(); this.goto(36, 17); this.bossT = 0; DQ.startCutscene('buttons'); }
  },
  update(dt) {
    const S = DQ.S, h = S.hero, bot = this.bot, out = empty(); this.t += dt; S.popups = S.popups.filter(p => p.kind === 'room'); h.hp = Math.max(h.hp, h.maxHp * .5); h.belly = 100;
    const v = this.vi;
    if (S.cut && v === 4) { if (DQ.talk.open) DQ.talk.auto = 1.2; DQ.playUpdate(dt, { attract: true, intent: out }); return; }
    if (v === 0) {
      const o = bot.nearest(S.world.list, e => ['tree', 'cottonbush', 'tuft', 'berrybush'].includes(e.type));
      if (o) { const x = cellC(o.x), y = cellC(o.y); if (bot.walkTo(x, y, 18, out)) { bot.face(x, y, out); h.facing = out.aim; bot.swing(dt, out, .45); } }
      const pick = S.drops.find(d => Math.hypot(d.x - h.x, d.y - h.y) < 60); if (pick && (!o || Math.hypot(cellC(o.x) - h.x, cellC(o.y) - h.y) > 30)) bot.walkTo(pick.x, pick.y, 3, out);
      if (this.t > 12) this.next();
    } else if (v === 1) {
      // build the house: stand at its centre, place wall blocks (2 high), then a door, a torch and a bed
      const cx = cellC(46), cy = cellC(51); if (!this.built) { if (!bot.walkTo(cx, cy, 8, out)) { } }
      this.pt = (this.pt || 0) - dt;
      if (Math.hypot(cx - h.x, cy - h.y) < 14 && this.pt <= 0) {
        this.pt = .1; const list = this.cells; const total = list.length * 2;
        if (this.ci < total) { const [x, y] = list[this.ci % list.length]; DQ.forceTarget = { cx: x, cy: y }; h.facing = Math.atan2(cellC(y) - h.y, cellC(x) - h.x); S.sel = 0; if (S.world.height(x, y) < 1 + Math.floor(this.ci / list.length)) DQ.placeAction(); this.ci++; }
        else if (this.ci === total) { DQ.forceTarget = { cx: 46, cy: 53 }; S.sel = S.hotbar.indexOf('door'); DQ.placeAction(); this.ci++; }
        else if (this.ci === total + 1) { DQ.forceTarget = { cx: 45, cy: 50 }; S.sel = S.hotbar.indexOf('torch'); DQ.placeAction(); this.ci++; }
        else if (this.ci === total + 2) { DQ.forceTarget = { cx: 47, cy: 50 }; S.sel = S.hotbar.indexOf('bed'); DQ.placeAction(); this.ci++; DQ.dirtyRooms(); }
        else DQ.forceTarget = null;
      }
      if (this.t > 22) this.next();
    } else if (v === 2) {
      const r = S.residents[Math.min(S.residents.length - 1, Math.floor(this.t / 6) % Math.max(1, S.residents.length))];
      if (r) { const near = bot.walkTo(r.x, r.y, 20, out); if (near && !DQ.talk.open && this.t % 6 > .6 && this.t % 6 < 1.2 && !this.said) { this.said = true; DQ.talkTo(r); DQ.talk.auto = 1.6; } if (this.t % 6 < .5) this.said = false; }
      if (this.t > 14) { this.next(); }
    } else if (v === 3) {
      const m = bot.nearest(S.monsters, e => e.hp > 0);
      if (m) { if (bot.walkTo(m.x, m.y, 16, out)) { bot.face(m.x, m.y, out); bot.swing(dt, out, .38); } } else if (this.t > 5) this.next();
      if (this.t > 16) this.next();
    } else if (v === 4) {
      const m = S.boss; this.bossT += dt;
      if (m && m.hp > 0) { if (bot.walkTo(m.x, m.y, 18, out)) { bot.face(m.x, m.y, out); bot.swing(dt, out, .38); } if (m.state === 'attack' && m.atkName === 'slam') out.jump = true; if (m.hp < m.maxHp * .6) m.hp = Math.max(m.hp, m.maxHp * .6 - 1); }
      if (this.bossT > 22 || (!m || m.hp <= 0)) this.next();
    }
    DQ.playUpdate(dt, { attract: true, intent: out });
  }
};
})();
