// RESULTS, ENDINGS AND CREDITS: the battle's results (VICTORY or DEFEAT, unit rows with EXP bars filling and level-up
// gains, captures and losses, six rows a page), the endings (the scene on its stage, an epilogue card per surviving
// named knight, then the credits roll; the bad endings drain to grey and offer Retry or Title), and the credits.

const RU = G.UI, RP = E.px;
const RS = { t: 0 };
G.SCENES.results = {
  view: 'threequarter', input: G.PRESET,
  enter(d) {
    Object.assign(RS, d, { t: 0, page: 0 });
    const s = d.sim.s, ps = d.playerSide === undefined ? 0 : d.playerSide;
    RS.won = s.mode === 'shrine' ? s.over.standings[0].includes(ps) : d.res.winner === ps;
    RS.rows = d.res.units.filter(u => u.side === ps && !u.ref.startsWith('gk') && !u.ref.startsWith('secondhand')).map(u => ({ u, unit: d.sim.unit(u.id) }));
    RS.caps = d.res.captures.map(c => ({ name: d.sim.unit(c.u).name, mine: c.side === ps }));
    RS.lost = d.res.units.filter(u => u.side === ps && u.dead).map(u => d.sim.unit(u.id).name);
    G.music(RS.won ? 'victory' : null);
  },
  update(dt) {
    G.inputTick(dt); RS.t += dt;
    const inp = G.inp();
    if ((inp.pressed('confirm') || (inp.clicked && inp.clicked())) && RS.t > .6) {
      G.sfx('ui_confirm');
      if ((RS.page + 1) * 6 < RS.rows.length) { RS.page++; RS.t = .3; }
      else RS.next ? RS.next() : G.game.go('title');
    }
  },
  draw(r) {
    r.sky(RS.won ? ['#1a1430', '#3a2a50', '#7a5a40'] : ['#0a0a14', '#1a1424', '#3a2030']);
    r.overlay(g => {
      const k = RU.k(), W = r.W, H = r.H, s = RS.sim.s;
      RU.title(g, s.mode === 'shrine' ? (RS.won ? 'GLORY' : 'DEFEAT') : RS.won ? 'VICTORY' : 'DEFEAT', W / 2, 10, { scale: 3, colors: RS.won ? ['#ffffff', '#ffe080', '#c89020'] : ['#ffffff', '#ff8a7a', '#a02a2a'] });
      const cs = RS.sim.s.castle; RU.text(g, (cs ? G.get('castle', cs).name : G.get('map', s.map).name) + ' • ' + G.SEASON_NAME[s.season] + ' • bell ' + s.bell, W / 2, 40 * k, RU.COL.dim, { align: 'center' });
      const rows = RS.rows.slice(RS.page * 6, RS.page * 6 + 6), rw = Math.min(W - 20, 300 * k), rx = Math.round((W - rw) / 2);
      rows.forEach(({ u, unit }, i) => {
        const y = 54 * k + i * 22 * k, prog = Math.min(1, Math.max(0, (RS.t - .3 - i * .15) / 1.2));
        RU.box(g, rx, y, rw, 20 * k, { alpha: .88 });
        const v = new G.Vis(unit); v.update(0, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }); v.portrait(g, rx + 2, y + 2, 16 * k, { bg: '#1a1e40', frame: false, tint: u.dead ? '#808080' : undefined });
        RU.text(g, unit.name.slice(0, 13), rx + 22 * k, y + 2, u.dead ? '#8a86a0' : '#ffffff'); RU.text(g, 'Lv ' + (unit.level0 + Math.round(u.levels * prog)), rx + 22 * k, y + 11 * k, RU.COL.dim);
        const expShown = Math.round(u.expGain * prog); RU.bar(g, rx + 90 * k, y + 5 * k, 80 * k, 5 * k, ((unit.exp0 + expShown) % 100) / 100, '#ffd060'); RU.text(g, '+' + expShown + ' EXP', rx + 174 * k, y + 3, '#ffe080');
        if (u.levels && prog >= 1) RU.text(g, 'LEVEL UP! ' + Object.entries(u.gains || {}).filter(([, x]) => x > 0).slice(0, 3).map(([s2, x]) => '+' + x + ' ' + s2.toUpperCase()).join(' '), rx + 90 * k, y + 12 * k, '#7ae07a');
        if (u.dead) RU.text(g, 'LOST', rx + rw - 6, y + 6 * k, '#ff6a5a', { align: 'right' }); else if (u.wounded) RU.text(g, 'WOUNDED', rx + rw - 6, y + 6 * k, '#ffb060', { align: 'right' }); else if (u.captured) RU.text(g, 'CAPTURED', rx + rw - 6, y + 6 * k, '#ffd060', { align: 'right' });
      });
      let y = 54 * k + rows.length * 22 * k + 4;
      if (RS.caps.length) { RU.text(g, 'Captured: ' + RS.caps.map(c => c.name + (c.mine ? '' : ' (lost to them)')).join(', ').slice(0, 70), rx, y, '#ffd060'); y += 11 * k; }
      if (RS.lost.length) RU.text(g, 'Fallen for good: ' + RS.lost.join(', ').slice(0, 70), rx, y, '#ff9a8a');
    });
    RU.prompts(r, [['confirm', (RS.page + 1) * 6 < RS.rows.length ? 'Next page' : 'Continue']]);
  }
};

/* ---- endings ---- */
const EN = {};
/** play a campaign's ending: its scene, then epilogue cards (good), or the grey card (bad) */
G.goEnding = sim => {
  const res = sim.s.result, id = res.ending, ev = G.has('event', id) ? G.get('event', id) : null, realm = res.realm || sim.s.humans[0];
  if (!ev) { G.game.go('ending', { sim, bad: res.kind !== 'win' }); return; }
  G.game.go('event', { id, realm: res.kind === 'win' ? res.realm : sim.s.humans[0], sim, onDone: () => G.game.go('ending', { sim, bad: !!ev.bad, title: ev.title }) });
};
G.SCENES.ending = {
  view: 'threequarter', input: G.PRESET,
  enter(d) {
    Object.assign(EN, d, { t: 0, i: 0, st: { f: 0 } });
    const sim = d.sim, realm = sim.s.result && sim.s.result.realm || sim.s.humans[0];
    EN.cards = [];
    if (!d.bad) {
      const ctx = sim.ctx(realm);
      for (const [id, txt] of Object.entries(G.EPILOGUES)) { const k = sim.s.knights[id]; if (!k || k.free || k.realm !== realm) continue; EN.cards.push({ id, text: typeof txt === 'function' ? txt(Object.assign({ flags: sim.s.flags }, ctx)) : txt }); }
      if (!sim.s.knights.lunete || sim.s.knights.lunete.realm !== realm) EN.cards.push({ id: G.RULER[realm], text: G.EPILOGUE_NO_LUNETE[realm] });
      G.music('ending', { restart: true });
    } else { G.music(null); G.sting('defeat'); }
  },
  update(dt) {
    G.inputTick(dt); EN.t += dt; const inp = G.inp();
    if (EN.bad) {
      const res = RU.nav(EN.st, EN.items || RU.synth(2, 2));
      if (res === 'pick' && EN.t > 1.5) { if (EN.st.f === 0 && G.game.saves && G.game.saves.latest && G.game.saves.latest()) { G.loadLatest(); } else G.game.go('title'); }
      return;
    }
    if ((inp.pressed('confirm') || (inp.clicked && inp.clicked())) && EN.t > .5) { EN.i++; EN.t = 0; G.sfx('ui_move'); if (EN.i >= EN.cards.length) G.game.go('credits', { realm: EN.sim.s.result && EN.sim.s.result.realm }); }
    if (G.holdDone('confirm', 1)) G.game.go('credits', {});
  },
  draw(r) {
    const k = RU.k();
    if (EN.bad) {
      r.sky(['#101014', '#1a1a20', '#2a2a30']);
      r.overlay(g => {
        const a = Math.min(1, EN.t / 2);
        RU.title(g, EN.title || 'THE LEGEND ENDS', r.W / 2, r.H / 2 - 30 * k, { scale: 2, colors: ['#e0e0e0', '#a0a0a8', '#606068'] });
        RU.text(g, 'The Wheel has stopped.', r.W / 2, r.H / 2 - 4 * k, '#8a8a92', { align: 'center' });
        const can = G.game.saves && G.game.saves.latest && G.game.saves.latest();
        const opts = ['Retry', 'Title']; EN.items = opts.map((o, i) => ({ x: r.W / 2 - 64 + i * 68, y: r.H / 2 + 20 * k, w: 60, h: 14 * k, disabled: i === 0 && !can ? 'No save to retry from' : false }));
        if (a >= 1) opts.forEach((o, i) => { const it = EN.items[i]; RP.rect(g, it.x, it.y, it.w, it.h, i === EN.st.f ? '#3a3a46' : '#1a1a20'); RU.text(g, o, it.x + it.w / 2, it.y + 3, it.disabled ? '#5a5a62' : i === EN.st.f ? '#ffffff' : '#a0a0a8', { align: 'center' }); if (i === EN.st.f) RU.focusFrame(g, it.x, it.y, it.w, it.h, EN.t); });
      });
      RU.prompts(r, [['left', 'Choose'], ['confirm', 'Select']]);
      return;
    }
    r.sky(['#2a2050', '#7a5a90', '#f0c890']);
    r.overlay(g => {
      const c = EN.cards[EN.i]; if (!c) return;
      const w = Math.min(r.W - 30, 280 * k), h = 70 * k, x = Math.round((r.W - w) / 2), y = Math.round(r.H / 2 - h / 2);
      RU.box(g, x, y, w, h, { alpha: .95 });
      G.knightVis(c.id).portrait(g, x + 6, y + 6, 46 * k, { bg: '#2a2050' });
      E.font.wrap(c.text, w - 64 * k, { scale: k }).forEach((l, i) => RU.text(g, l, x + 58 * k, y + 8 + i * 10 * k, '#ffffff'));
      RU.text(g, (EN.i + 1) + '/' + EN.cards.length, x + w - 6, y + h - 12 * k, RU.COL.dim, { align: 'right' });
      RU.title(g, 'EPILOGUE', r.W / 2, 10, { scale: 2 });
    });
    RU.prompts(r, [['confirm', 'Next'], ['confirm', 'Hold: Credits']]);
  }
};

/* ---- the credits roll ---- */
const CR2 = {};
G.SCENES.credits = {
  view: 'threequarter', input: G.PRESET,
  enter() { CR2.t = 0; G.music('ending'); CR2.lines = G.creditLines(); },
  update(dt) { G.inputTick(dt); CR2.t += dt * (G.inp().down('confirm') ? 4 : 1); if (G.inp().pressed('cancel') || CR2.t > CR2.lines.length * 1.1 + 8) G.game.go('title'); },
  draw(r) {
    r.sky(['#0a0814', '#1a1430', '#2a2050']);
    r.overlay(g => {
      const k = RU.k(), y0 = r.H - CR2.t * 22 * k;
      RU.title(g, 'BRIGANTIME', r.W / 2, y0 - 40 * k, { scale: 3 });
      CR2.lines.forEach((l, i) => { const y = y0 + i * 14 * k; if (y < -10 || y > r.H) return; RU.text(g, l.text, r.W / 2, y, l.head ? RU.COL.gold : '#e8e4f0', { align: 'center' }); });
    });
    RU.prompts(r, [['confirm', 'Hold: Faster'], ['cancel', 'Title']]);
  }
};
G.creditLines = () => {
  const A = G.ABOUT, out = [{ text: 'THE LEGEND OF FORSEASONS' }, { text: '' }];
  for (const [h, lines] of A.credits) { out.push({ text: h, head: true }); for (const l of lines) out.push({ text: l }); out.push({ text: '' }); }
  out.push({ text: 'Thank you for playing.', head: true });
  return out;
};
