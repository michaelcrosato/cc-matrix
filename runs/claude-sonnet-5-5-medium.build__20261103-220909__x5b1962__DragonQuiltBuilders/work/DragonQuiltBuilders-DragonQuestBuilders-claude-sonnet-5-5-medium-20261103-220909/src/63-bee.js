// Quilting Bee: a 3-minute defend-the-banner round (solo from the title, or an AI Hub "ghost" round with up to 4 builders),
// plus the AI Hub session glue.
(() => {
const { E, T } = DQ;
const cellC = c => c * T + 8;
const LIMIT = 180;

DQ.Bee = {
  setup(o) {
    const S = DQ.S, w = S.world;
    S.bee = { t: 0, limit: LIMIT, score: 0, kills: 0, wave: 0, state: 'play', reported: false, placed0: 0 };
    S.town.planted = true; S.town.x = 18; S.town.y = 18; S.town.level = 1; S.town.bannerHp = 200; S.town.cheer = 0;
    w.addObj('banner', 18, 18, { silent: true }); S.bannerRise = 1;
    for (const [k, n] of Object.entries({ plank: 24, cobble: 24, felt: 12, woolblock: 4, door: 2, torch: 4, trap: 3, ballista: 1, crumpet: 3 })) DQ.inv.add(k, n, true);
    S.hotbar = ['cobble', 'plank', 'door', 'torch', 'trap', 'ballista', 'crumpet', null]; S.sel = 0; S.clock.hour = 14; S.regionNow = 'glen';
    DQ.inv.add('club', 1, true); DQ.inv.equipBest(); DQ.syncWeaponLook();
    S.flags.spinStitch = true;
    DQ.Bee.lastSend = 0;
  },
  waves: [[18, ['lintling', 'lintling', 'lintling', 'lintling']], [48, ['pinhog', 'pinhog', 'lintling', 'lintling', 'mothlet']], [84, ['knight', 'pinhog', 'pinhog', 'lintling', 'mothlet', 'mothlet']], [118, ['knight', 'knight', 'pinhog', 'pinhog', 'lintling', 'lintling']], [150, ['brute', 'knight', 'knight', 'pinhog', 'mothlet', 'mothlet']]],
  update(dt) {
    const S = DQ.S, b = S.bee; if (!b || b.state !== 'play') return;
    const hub = DQ.hubSession && window.AIHub; if (hub && AIHub.time() < 0) return;     // the hub's countdown
    b.t += dt;
    while (b.wave < this.waves.length && b.t >= this.waves[b.wave][0]) {
      const ids = this.waves[b.wave][1]; b.wave++; DQ.toast('Wave ' + b.wave + '! Defend the Banner!', '#ff9a8a'); DQ.audio.sfx('horn', { vol: .5 });
      ids.forEach((id, i) => { const side = (i + b.wave) % 4, t = 3 + (i * 7 % 28); const x = side === 0 ? 2 : side === 1 ? 33 : t, y = side === 2 ? 2 : side === 3 ? 33 : t; const q = S.world.nearestWalkable(x, y, 4) || [x, y]; DQ.spawnMonster(id, cellC(q[0]), cellC(q[1]), { siege: true }); });
    }
    S.siege.phase = b.wave ? 'bee' : 'none';
    if (S.town.bannerHp <= 0) return this.finish('fell');
    if (b.t >= b.limit) return this.finish('time');
    if (hub && (b.t % .12) < dt) { const h = S.hero; AIHub.send({ x: Math.round(h.x), y: Math.round(h.y), f: +h.facing.toFixed(2), hp: Math.ceil(h.hp), a: h.combo.busy ? 1 : 0 }, { reliable: false }); AIHub.progress({ score: this.score(), label: this.score() + ' pts' }); }
  },
  score() { const S = DQ.S, b = S.bee; return b.kills * 10 + Math.max(0, Math.round(S.town.bannerHp / 4)) + Math.min(60, S.stats.placed) + (S.stats.broken ? 5 : 0); },
  finish(why) {
    const S = DQ.S, b = S.bee; if (b.state !== 'play') return; b.state = 'done'; b.why = why; const sc = this.score(); b.final = sc;
    if (why === 'time') sc >= 0 && (b.bonus = 50);
    const total = sc + (why === 'time' ? 50 : 0); b.final = total;
    DQ.audio.sfx(why === 'time' ? 'fanfare' : 'die'); DQ.toast(why === 'time' ? 'The Bee is over! The Banner stands!' : 'The Banner has fallen!', '#ffd36a');
    for (const m of S.monsters) m.remove = true;
    if (DQ.hubSession && window.AIHub && !b.reported) { b.reported = true; try { AIHub.result({ score: total, stats: { Monsters: b.kills, 'Blocks placed': S.stats.placed, 'Banner HP': Math.max(0, Math.round(S.town.bannerHp)) }, awards: [{ title: why === 'time' ? 'Banner Holder' : 'Frayed Edges', detail: why === 'time' ? 'The Banner stood to the end.' : 'The Banner fell.' }] }); } catch (e) { DQ.err('hub result', e); } }
    else if (!DQ.hubSession) DQ.ui.open('results', { bee: true });
  }
};
ev_on();
function ev_on() { DQ.events.on('monsterKilled', () => { const S = DQ.S; if (S && S.bee) S.bee.kills++; }); }

// ---------- AI Hub glue ----------
DQ.Net = {
  info: null, ghosts: {}, connected: false,
  init(game) {
    const hub = window.AIHub; if (!hub) return false; DQ.hubSession = !!hub.active;
    if (!hub.active) return false;
    hub.on('message', (data, from) => { if (data && typeof data.x === 'number') { const g = this.ghosts[from] || (this.ghosts[from] = { x: data.x, y: data.y, tx: data.x, ty: data.y, f: 0, t: 0 }); g.tx = data.x; g.ty = data.y; g.f = data.f || 0; g.hp = data.hp; g.a = data.a; g.t = 0; } });
    hub.on('leave', ({ id }) => { delete this.ghosts[id]; });
    hub.on('time-up', () => { if (DQ.S && DQ.S.bee) DQ.Bee.finish('time'); });
    hub.on('end', () => { DQ.ended = true; try { game.audio.mute(); } catch (e) { } });
    return true;
  },
  join(game) {
    const hub = window.AIHub; return hub.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
      if (!info) { DQ.hubSession = false; return null; }
      this.info = info; this.connected = true; DQ.reseed(info.seed || DQ.SEED); return info;
    });
  },
  update(dt) { for (const k of Object.keys(this.ghosts)) { const g = this.ghosts[k]; g.t += dt; g.x += (g.tx - g.x) * Math.min(1, dt * 12); g.y += (g.ty - g.y) * Math.min(1, dt * 12); } },
  draw(r) {
    if (!this.info) return; const t = DQ.S.time;
    for (const k of Object.keys(this.ghosts)) {
      const g = this.ghosts[k], p = this.info.players.find(q => String(q.id) === k); if (!p || g.t > 5) continue;
      if (!g.rig) g.rig = new E.Humanoid({ size: 1.05, build: 'chibi', hair: 'short', outfit: 'tunic', weapon: 'sword', colors: { cloth: p.color || '#fff', hair: '#442', pants: '#334' } });
      g.rig.update(1 / 60, { x: g.x, y: g.y, z: 0, vx: (g.tx - g.x) * 4, vy: (g.ty - g.y) * 4, facing: g.f });
      r.shadow(g.x, g.y, 6, .3);
      r.actor(g.x, g.y, 0, (gg, ox, oy) => g.rig.draw(gg, ox, oy, r.view), { xray: { color: p.color, actors: false }, alpha: .85 });
      r.queue(g.x, g.y, 40, gg => { const q = r.w(g.x, g.y, 40); E.font.text(gg, String(p.name).slice(0, 12), q[0], q[1], p.color || '#fff', { align: 'center', shadow: '#000', outline: false }); }, {});
    }
  }
};
})();
