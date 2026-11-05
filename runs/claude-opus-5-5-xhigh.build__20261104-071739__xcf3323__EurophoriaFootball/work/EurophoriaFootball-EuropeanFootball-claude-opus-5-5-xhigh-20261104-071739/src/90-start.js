/* START: game.debug (the tests' and tools' handle), EF.test hooks, the deep links, the content check, game.start. */
game.debug = {
  snapshot() {
    const c = EF.cur, m = c && c.m, sc = game.sceneName;
    const o = { scene: sc, part: EF.link.part, errors: game.errors.length, ui: EF.UI ? { screen: EF.UI.top && EF.UI.top() ? EF.UI.top().id : null, focus: EF.UI.focusId ? EF.UI.focusId() : null } : null,
      attract: EF.Attract ? { active: sc === 'attract', segment: EF.Attract.segment, idle: +(EF.Attract.idle || 0).toFixed(2) } : null, dev: EF.Dev ? { open: EF.Dev.isOpen, changed: EF.tuneChanged() } : null,
      hub: { active: EF.inSession, role: EF.Hub ? EF.Hub.role : null, sent: EF.Hub ? EF.Hub.sent : 0, received: EF.Hub ? EF.Hub.received : 0 }, touchOnly: EF.touchOnly(), cup: EF.Save ? EF.Save.cupState() : null };
    if (m) Object.assign(o, { mode: m.mode, half: m.half, clock: +m.clock.toFixed(2), minute: Math.floor(m.minute), stoppage: m.stoppage, score: m.score.slice(), ball: [Math.round(m.ball.x), Math.round(m.ball.y), Math.round(m.ball.z)], owner: m.owner ? m.owner.data.name : null,
      humans: m.humans.map(h => ({ p: h.n, id: h.fb ? h.fb.id : null, name: h.fb ? h.fb.data.name : null, x: h.fb ? Math.round(h.fb.body.x) : 0, y: h.fb ? Math.round(h.fb.body.y) : 0, state: h.fb ? h.fb.state : null })),
      euphoria: m.euphoria.map(Math.round), europhoria: m.europhoria ? { side: m.europhoria.side, t: +m.europhoria.t.toFixed(2) } : null, cards: m.stats.cards.slice(), sentOff: m.players.filter(f => f.sentOff).length,
      setpiece: m.setpiece ? m.setpiece.kind : null, shootout: m.shootout ? { score: m.shootout.score.slice(), kicks: m.shootout.kicks.map(k => k.length), winner: m.shootout.winner } : null, stadium: m.stadium.id, weather: m.weather ? m.weather.kind : null, replay: !!(c.replay && c.replay.playing), seed: m.seed });
    return o;
  },
  teleport(x, y, z = 0) { const c = EF.cur; if (!c) return; const h = c.m.humans[0]; const f = h && h.fb; if (!f) return; f.body.x = x; f.body.y = y; f.body.z = z; f.body.vx = f.body.vy = 0; }
};
/* ---- test hooks (section 11.2) ---- */
EF.test = {
  startMatch(o = {}) {
    const opts = Object.assign({ home: 'kipperton', away: 'hoofington', stadium: 'smokehouse', kind: 'kickabout', seed: 1, halfLength: 60, noReplay: true }, o);
    if (!opts.humans) opts.humans = o.humans === null ? [] : [{ input: game.input, side: 0 }];
    game.go('match', { opts, onEnd: o.onEnd || (r => { EF.test.lastResult = r; }) }, { fade: 0 }); game.advance(1 / 120);
    return EF.cur && EF.cur.m;
  },
  m() { return EF.cur && EF.cur.m; },
  giveBall(side, idx, x, y) { const m = this.m(); if (!m) return; const f = m.side[side][idx]; if (x !== undefined) { f.body.x = x; f.body.y = y; } m.setpiece = null; m.setMode('play'); for (const q of m.players) { q.order = null; q.frozen = false; } m.setOwner(f, 'test'); m.ball.held = false; const h = m.humans.find(q => q.side === side); if (h && f.role !== 'GK') m.giveTo(h, f); return f; },
  place(id, x, y) { const m = this.m(); const f = m.players[id]; f.body.x = x; f.body.y = y; f.body.vx = f.body.vy = 0; },
  setEuphoria(side, v) { const m = this.m(); m.euphoria[side] = v; },
  cheat(name, on = true) { const m = this.m(); if (m) m.cheats[name] = on; },
  simUntil(pred, max = 30) { for (let t = 0; t < max; t += 1 / 120) { game.advance(1 / 120); if (pred(this.m())) return true; } return false; }
};
/* ---- the content check (section 4.6): every reference resolves, every text draws ---- */
EF.validate = () => {
  const out = [], need = (kind, id, where) => { if (id && !EF.get(kind, id)) out.push(where + ': no ' + kind + ' "' + id + '"'); };
  const drawable = /^[\x20-\x7EÉÈÁÓÜÖÄÑÇéèáóüöäñç♥★←→↑↓•×♪▸©]*$/;
  const text = (s, where) => { if (typeof s === 'string' && !drawable.test(s.replace(/\{\$\w+\}/g, ''))) out.push(where + ': undrawable character in "' + s.slice(0, 40) + '"'); };
  for (const t of EF.all('team')) {
    need('stadium', t.stadium, 'team ' + t.id); need('formation', t.formation, 'team ' + t.id); need('tactic', t.tactic, 'team ' + t.id); need('chant', t.chant, 'team ' + t.id); need('celebration', t.celebration, 'team ' + t.id);
    if (t.players.length !== 5) out.push('team ' + t.id + ': ' + t.players.length + ' players'); if (t.players.filter(p => p.captain).length !== 1) out.push('team ' + t.id + ': captains'); if (t.players.filter(p => p.pos === 'GK').length !== 1) out.push('team ' + t.id + ': keepers');
    for (const p of t.players) { text(p.name, 'player ' + p.id); if (p.captain) need('super', p.super, 'player ' + p.id); if (p.celebration) need('celebration', p.celebration, 'player ' + p.id); }
    text(t.name, 'team ' + t.id);
  }
  for (const s of EF.all('stadium')) { for (const e of s.events || []) need('event', e, 'stadium ' + s.id); need('referee', s.referee, 'stadium ' + s.id); for (const b of s.boards || []) text(b, 'stadium ' + s.id); }
  for (const l of EF.all('lines')) for (const e of l.entries) { text(e.text, 'lines ' + l.id); if (e.reply) text(e.reply.text, 'lines ' + l.id); if (!EF.CAST[e.who]) out.push('lines ' + l.id + ': no speaker ' + e.who); }
  for (const b of EF.all('beat')) for (const st of b.steps || []) { if (st.team) need('team', st.team, 'beat ' + b.id); if (st.photo) { need('team', st.photo.team, 'beat ' + b.id); } for (const k of ['headline', 'sub', 'body']) text(st[k], 'beat ' + b.id); for (const ln of st.lines || []) text(ln[1], 'beat ' + b.id); }
  for (const s of EF.all('sticker')) text(s.name, 'sticker ' + s.id);
  return out;
};
/* every scene shows the dev drawer (menus wait while it is open) and the toasts */
for (const id of Object.keys(EF.scenes)) {
  const S = EF.scenes[id], u = S.update, d = S.draw;
  S.update = function (dt) { if (EF.Dev) EF.Dev.update(dt); if (EF.Dev && EF.Dev.isOpen && id !== 'match' && id !== 'attract') return; return u.call(this, dt); };
  S.draw = function (r) { d.call(this, r); if (EF.Dev) EF.Dev.draw(r); };
}
/* ---- boot and start ---- */
EF.boot = () => {
  game.input.touchEnabled = false;   // no touch controls (section 2.5)
  EF.Anim.load();
  const bad = EF.validate(); if (bad.length) game.fail('content', new Error(bad.slice(0, 6).join('; ')));
};
(() => {
  const L = EF.link, scenes = EF.scenes;
  let scene = 'title', data;
  if (EF.inSession) scene = scenes.hubwait ? 'hubwait' : 'title';
  else if (L.scene && EF.deepLink) { const r = EF.deepLink(L); if (r) { scene = r[0]; data = r[1]; } }
  else if (L.scene === 'match') scene = 'match';
  if (!scenes[scene]) scene = scenes.title ? 'title' : 'match';
  game.start({ scenes, scene, data, boot: { title: 'EUROPHORIA FOOTBALL', version: EF.version, steps: [['Mowing the stripes', () => EF.boot()], ['Warming up the crowd', () => { if (EF.Save) EF.Save.load(); }], ['Polishing the cup', () => { if (EF.Dev && L.dev && !EF.inSession) game.after(.2, () => EF.Dev.open()); }]], messages: ['Smoking the kippers', 'Inflating the beach ball', 'Parking the bus', 'Chalking the lines', 'Bribing nobody'] } });
})();
