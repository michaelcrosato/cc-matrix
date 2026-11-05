// Canvas screens: Wardrobe, Wax Bench, Field Notes (map, Dossier, items), Results, Game Over, About.
const SCREENS = S7.screens = {};
const frame = (g, W, H, title, sub) => {
  UI.dim(g, W, H, .78);
  g.fillStyle = col.red; g.fillRect(0, 14, W, 1); g.fillRect(0, 31, W, 1);
  S7.E.font.title(g, title, 14, 17, { scale: 1, colors: ['#ffffff', '#d81e2a'], outline: '#000' });
  if (sub) UI.text(g, sub, W - 10 - UI.w(sub), 20, col.dim);
};

// ---------------------------------------------------------------- Wardrobe
SCREENS.Wardrobe = class {
  constructor() { this.i = Math.max(0, S7.ROSTER.indexOf(S7.st.persona)); }
  update(dt, n) {
    if (n.dx) { this.i = (this.i + n.dx + 7) % 7; S7.audio.sfx('select'); }
    if (n.clk) { for (const z of UI.zones) if (z.kind === 'wslot' && n.clk[0] >= z.r[0] && n.clk[0] < z.r[0] + z.r[2] && n.clk[1] >= z.r[1] && n.clk[1] < z.r[1] + z.r[3]) { if (this.i === z.i) n.ok = true; this.i = z.i; } }
    if (n.moved && n.ptr) for (const z of UI.zones) if (z.kind === 'wslot' && n.ptr[0] >= z.r[0] && n.ptr[0] < z.r[0] + z.r[2] && n.ptr[1] >= z.r[1] && n.ptr[1] < z.r[1] + z.r[3]) this.i = z.i;
    if (n.ok) { const id = S7.ROSTER[this.i], r = S7.st.roster[id]; if (r.unlocked && !r.frozen) { S7.sim.switchTo(id, true); UI.pop(); } else S7.audio.sfx('deny'); }
    if (n.back) UI.pop();
  }
  draw(r) {
    const W = r.W, H = r.H; UI.zones = UI.zones.filter(z => z.kind !== 'wslot');
    r.overlay(g => {
      frame(g, W, H, 'THE WARDROBE', 'SEVEN COATS, ONE BODY');
      const sw = Math.floor((W - 16) / 7);
      S7.ROSTER.forEach((id, i) => {
        const p = S7.reg.personas[id], rr = S7.st.roster[id], x = 8 + i * sw, y = 40, sel = i === this.i, cur = id === S7.st.persona;
        g.fillStyle = sel ? p.color : '#2a2236'; g.fillRect(x, y, sw - 3, 52); g.fillStyle = '#14101c'; g.fillRect(x + 1, y + 1, sw - 5, 50);
        g.globalAlpha = rr.unlocked ? 1 : .35; try { S7.pres.rigs[id].drawPortrait(g, x + (sw - 3 - 40) / 2, y + 6, 40); } catch (e) { /* busy */ } g.globalAlpha = 1;
        UI.text(g, String(i + 1), x + 3, y + 3, '#fff'); if (cur) UI.text(g, 'WORN', x + sw - 24, y + 3, col.gold); if (rr.frozen) UI.text(g, 'ICE', x + 3, y + 42, '#7ac8ff'); if (!rr.unlocked) UI.text(g, '?', x + sw / 2 - 3, y + 24, '#aaa');
        UI.zones.push({ r: [x, y, sw - 3, 52], kind: 'wslot', i });
      });
      const id = S7.ROSTER[this.i], p = S7.reg.personas[id], rr = S7.st.roster[id], w = S7.reg.weapons[p.weapon];
      UI.panel(g, 8, 100, W - 16, H - 120, { alpha: .8, accent: p.color });
      if (rr.unlocked) {
        UI.text(g, p.name.toUpperCase(), 18, 106, p.color, { scale: 1 }); UI.text(g, p.title.toUpperCase(), 18, 116, '#e8e4f0');
        let y = 130; for (const l of UI.wrap(p.blurb, W - 40, {})) { UI.text(g, l, 18, y, '#cfc8dc'); y += 9; }
        y += 4; UI.text(g, 'GUN   ' + w.name.toUpperCase() + '  DMG ' + w.dmg + ' x' + w.pellets + '  MAG ' + w.mag, 18, y, '#e8e4f0'); y += 11;
        UI.text(g, 'SKILL ' + p.skillName.toUpperCase() + '  ' + SKILLTEXT[p.skill], 18, y, col.gold); y += 11;
        UI.text(g, 'HEALTH ' + Math.round(rr.hp) + '/' + S7.sim.personaMax(id) + (rr.frozen ? '   FROZEN' : ''), 18, y, rr.frozen ? '#7ac8ff' : '#e8e4f0');
      } else { UI.text(g, 'AN EMPTY HANGER', 18, 108, col.dim); UI.text(g, 'This coat has not been found yet.', 18, 122, col.dim); }
      UI.promptRow(g, [['confirm', 'WEAR'], ['cancel', 'CLOSE']], W - 8, H - 14, 'right'); UI.text(g, '< > CHOOSE', 10, H - 12, col.dim);
    });
  }
};
const SKILLTEXT = { flare: 'a flare shows everything for 10s', tuck: 'faster on rails and snow for 8s', longlook: 'zoom the scope while aiming', rain: 'buy open ropes; scatter coins', echo: 'shatter glass, stun nearby', flash: 'stun and reveal a cone', charge: 'blast ice; set a mine' };

// ---------------------------------------------------------------- Wax Bench
SCREENS.Bench = class {
  constructor() {
    this.list = new UI.FocusList(S7.UPGRADES.map(u => ({ label: () => u.name.toUpperCase(), value: () => { const c = S7.sim.upgradeCost(u.id); return 'LV ' + (S7.st.upg[u.id] || 0) + '/' + u.max + (c === null ? '' : '  ' + c + ' RIME'); },
      onPick: () => { const r = S7.sim.buyUpgrade(u.id); if (r === 'poor') { S7.audio.sfx('deny'); this.msg = 'NOT ENOUGH RIME'; } else if (r === 'max') { S7.audio.sfx('deny'); this.msg = 'ALREADY WAXED TO THE MAX'; } else { this.msg = u.name.toUpperCase() + ' WAXED!'; } } })), { x: 12, y: 44, w: 0, rowH: 14 });
    this.msg = '';
  }
  update(dt, n) { this.list.o.w = S7.game.W - 24; this.list.update(n); if (n.back) UI.pop(); }
  draw(r) {
    const W = r.W, H = r.H; this.list.o.w = W - 24;
    r.overlay(g => {
      frame(g, W, H, 'THE WAX BENCH', 'RIME ' + S7.st.rime);
      this.list.draw(g);
      const u = S7.UPGRADES[this.list.i]; UI.panel(g, 8, 44 + 7 * 14 + 6, W - 16, 40, { alpha: .7, accent: col.gold });
      UI.text(g, u.text, 16, 44 + 7 * 14 + 12, '#e8e4f0'); if (this.msg) UI.text(g, this.msg, 16, 44 + 7 * 14 + 26, col.gold);
      UI.promptRow(g, [['confirm', 'WAX'], ['cancel', 'CLOSE']], W - 8, H - 14, 'right');
    });
  }
};

// ---------------------------------------------------------------- Field notes: map, Dossier, items
SCREENS.Notes = class {
  constructor(tab) { this.tab = tab || 0; this.sel = 0; this.tabs = ['MAP', 'DOSSIER', 'ITEMS']; }
  update(dt, n) {
    if (n.tabL) { this.tab = (this.tab + 2) % 3; this.sel = 0; S7.audio.sfx('select'); } if (n.tabR) { this.tab = (this.tab + 1) % 3; this.sel = 0; S7.audio.sfx('select'); }
    if (n.dy && this.tab === 1) { const len = S7.st.dossier.filter(d => d !== 'd_seen').length; if (len) this.sel = (this.sel + n.dy + len) % len; }
    if (n.dx) { this.tab = (this.tab + n.dx + 3) % 3; this.sel = 0; S7.audio.sfx('select'); }
    if (n.clk) { UI.zones.filter(z => z.kind === 'ntab').forEach(z => { if (n.clk[0] >= z.r[0] && n.clk[0] < z.r[0] + z.r[2] && n.clk[1] >= z.r[1] && n.clk[1] < z.r[1] + z.r[3]) { this.tab = z.i; this.sel = 0; } }); }
    if (n.back || S7.game.input.pressed('map')) UI.pop();
  }
  draw(r) {
    const W = r.W, H = r.H, st = S7.st; UI.zones = UI.zones.filter(z => z.kind !== 'ntab');
    r.overlay(g => {
      frame(g, W, H, 'FIELD NOTES', S7.graph().A.title + ' / ' + S7.graph().A.sub);
      this.tabs.forEach((t, i) => { const x = 10 + i * 64; g.fillStyle = i === this.tab ? col.red : '#2a2236'; g.fillRect(x, 36, 60, 11); UI.text(g, t, x + 30 - UI.w(t) / 2, 38, '#fff'); UI.zones.push({ r: [x, 36, 60, 11], kind: 'ntab', i }); });
      const top = 52;
      if (this.tab === 0) this.drawMap(g, W, H, top);
      else if (this.tab === 1) {
        const ids = st.dossier.filter(d => d !== 'd_seen'), ent = S7.DOSSIER.filter(d => ids.includes(d[0]));
        if (!ent.length) UI.text(g, 'NOTHING YET. THE MOUNTAIN IS TIGHT-LIPPED.', 14, top + 8, col.dim);
        ent.forEach((d, i) => { const y = top + i * 11; if (y > H - 80) return; if (i === this.sel) { g.fillStyle = col.red; g.fillRect(8, y, 112, 10); } UI.text(g, d[1], 12, y + 1, i === this.sel ? '#fff' : '#cfc8dc'); });
        const d = ent[Math.min(this.sel, ent.length - 1)]; if (d) { UI.panel(g, 126, top, W - 134, H - top - 24, { alpha: .8 }); UI.text(g, d[1], 134, top + 6, col.gold); let y = top + 20; for (const l of UI.wrap(d[2], W - 150, {})) { UI.text(g, l, 134, y, '#e8e4f0'); y += 9; } }
      } else {
        UI.text(g, 'KEY ITEMS', 14, top, col.gold); let y = top + 12; const keys = Object.keys(st.items).filter(k => st.items[k]);
        if (!keys.length) { UI.text(g, 'none', 14, y, col.dim); y += 10; } for (const k of keys) { const it = S7.reg.items[k]; UI.text(g, it.name.toUpperCase(), 14, y, '#fff'); UI.text(g, it.text, 14, y + 9, '#a49cb8'); y += 22; }
        UI.text(g, 'LIFT PINS  ' + st.pins.length + '/7', W / 2 + 6, top, col.gold); y = top + 12;
        S7.PINS.forEach(p => { const has = st.pins.includes(p[0]); UI.text(g, has ? p[1].toUpperCase() : '? ? ?', W / 2 + 6, y, has ? '#fff' : '#5a546a'); if (has) UI.text(g, p[2].replace('Lift Pin: ', ''), W / 2 + 6, y + 9, '#8e86a4'); y += has ? 22 : 12; });
        UI.text(g, 'RED ' + Math.round(st.red) + '/' + S7.sim.redMax() + '   RIME ' + st.rime, 14, H - 36, '#ff6a6a');
      }
      UI.promptRow(g, [['scan', 'PREV TAB'], ['ring', 'NEXT TAB'], ['cancel', 'CLOSE']], W - 8, H - 14, 'right');
    });
  }
  drawMap(g, W, H, top) {
    const G = S7.graph(), st = S7.st, A = G.A; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const id in G.nodes) { const n = G.nodes[id]; x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
    const bw = W - 150, bh = H - top - 26, k = Math.min(bw / Math.max(8, x1 - x0), bh / Math.max(8, y1 - y0)), ox = 10 + (bw - (x1 - x0) * k) / 2, oy = top + (bh - (y1 - y0) * k) / 2;
    const P = (x, y) => [ox + (x - x0) * k, oy + (y - y0) * k];
    UI.panel(g, 6, top - 2, bw + 8, bh + 4, { alpha: .6 });
    for (const id of G.eorder) { const e = G.edges[id]; g.strokeStyle = e.gate && !S7.sim.gateOpen(e.gate) ? '#a07020' : '#8a84a0'; g.lineWidth = 1; g.beginPath(); e.pts.forEach((p, i) => { const q = P(p.x, p.y); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.stroke(); }
    for (const id in G.nodes) { const n = G.nodes[id], q = P(n.x, n.y); g.fillStyle = n.kind === 'exit' ? col.gold : n.edges.length >= 3 ? '#fff' : '#a49cb8'; g.fillRect(q[0] - 2, q[1] - 2, 4, 4); }
    for (const sp of A.spots) if (sp.kind !== 'pickup') { const s3 = S7.sim.spotPos(sp), q = P(s3.x, s3.y); g.fillStyle = '#6ae0a8'; g.fillRect(q[0] - 1, q[1] - 5, 3, 3); }
    const h = P(st.x, st.y); g.fillStyle = col.red; g.beginPath(); g.arc(h[0], h[1], 3.5, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.stroke();
    for (const e of st.enemies) if (!e.dead && e.visible > 0) { const q = P(e.x, e.y); g.fillStyle = '#ff9a3a'; g.fillRect(q[0] - 1, q[1] - 1, 3, 3); }
    UI.text(g, 'OBJECTIVE', bw + 20, top, col.gold); let y = top + 11; for (const l of UI.wrap(st.objective || 'Survive.', 120, {})) { UI.text(g, l, bw + 20, y, '#e8e4f0'); y += 9; }
    y += 6; UI.text(g, 'KEY', bw + 20, y, col.gold); y += 11; UI.text(g, 'RED DOT  YOU', bw + 20, y, col.red); UI.text(g, 'GOLD  EXIT', bw + 20, y + 9, col.gold); UI.text(g, 'GREEN  PEOPLE', bw + 20, y + 18, '#6ae0a8'); UI.text(g, 'BROWN  LOCKED', bw + 20, y + 27, '#a07020');
  }
};

// ---------------------------------------------------------------- Results
SCREENS.Results = class {
  constructor(res) { this.res = res; this.t = 0; }
  update(dt, n) { this.t += dt; if ((n.ok || n.back || n.clk) && this.t > .8) { UI.pop(); } }
  draw(r) {
    const W = r.W, H = r.H, s = this.res.stats; r.overlay(g => {
      frame(g, W, H, 'TARGET ' + this.res.target + ' CLEARED', 'THE DEPARTMENT IS PLEASED');
      const rows = [['WHITEOUTS THAWED', s.kills], ['WARM SPOT HITS', s.crits], ['DAMAGE TAKEN', s.damage], ['TIME', S7.fmtTime(s.time)], ['ACCURACY', s.acc + '%'], ['LIFT PINS', s.pins + '/7']];
      rows.forEach((q, i) => { const y = 50 + i * 14; if (this.t > .15 * i) { UI.text(g, q[0], 30, y, '#cfc8dc'); const v = String(q[1]); UI.text(g, v, W / 2 + 20 - UI.w(v) + 30, y, '#fff'); } });
      if (this.t > 1) { S7.E.font.title(g, this.res.rank, W / 2 + 70, 56, { scale: 5, colors: ['#ffffff', '#d81e2a'], outline: '#000' }); UI.text(g, 'RANK', W / 2 + 74, 46, col.gold); }
      if (this.t > .8) UI.promptRow(g, [['confirm', 'CONTINUE']], W - 8, H - 14, 'right');
    });
  }
};

// ---------------------------------------------------------------- Game over
SCREENS.GameOver = class {
  constructor() {
    this.list = new UI.FocusList([
      { label: 'CONTINUE (THE SWEEP ARRIVES)', onPick: () => { S7.sim.continueAfterOver(); } },
      { label: 'QUIT TO TITLE', onPick: () => { S7.quitToTitle(); } }], { x: 40, y: 90, w: 240, rowH: 14 }); this.t = 0;
  }
  update(dt, n) { this.t += dt; if (this.t > .6) this.list.update(n); }
  draw(r) {
    const W = r.W, H = r.H; this.list.o.x = W / 2 - 110; this.list.o.w = 220; this.list.o.y = H / 2 + 6;
    r.overlay(g => { UI.dim(g, W, H, .85); S7.E.font.title(g, 'NO ONE LEFT TO WEAR YOU', W / 2, H / 2 - 36, { scale: 2, align: 'center', colors: ['#ffffff', '#7ac8ff'], outline: '#000' }); UI.text(g, 'All seven coats are frozen. The Sweep is coming. He is not in a hurry.', W / 2, H / 2 - 12, '#cfc8dc', { align: 'center' }); if (this.t > .6) this.list.draw(g); });
  }
};
S7.sim.continueAfterOver = function () {
  const st = S7.st; st.over = false; st.mode = 'rail';
  for (const id of S7.ROSTER) { const r = st.roster[id]; r.frozen = false; r.hp = Math.round(S7.sim.personaMax(id) * .5); r.ammo = S7.reg.weapons[S7.reg.personas[id].weapon].mag; }
  st.red = Math.round(st.red * .5); S7.bus.emit('rescue', { n: 7 });
  const a = st.area, n = S7.graph().A.nodes; const keep = { enemies: [] };
  S7.sim.loadArea(a, st.node && S7.graph().nodes[st.node] ? st.node : Object.keys(S7.graph().nodes)[0]); st.fadeIn = .6;
  if (S7.graph().A.boss && st.boss === null && !st.bosses[S7.graph().A.boss]) S7.sim.startBoss(S7.graph().A.boss);
  UI.pop(); S7.sim.toast('THE SWEEP CHIPPED YOU ALL FREE. IT COST HALF YOUR RED.');
};

// ---------------------------------------------------------------- About / Credits
SCREENS.About = class {
  constructor(credits) { this.y = 0; this.credits = !!credits; this.t = 0; }
  update(dt, n) {
    this.t += dt; const I = S7.game.input; const sp = (I.down('down') ? 70 : I.down('up') ? -70 : 0); this.y = Math.max(0, this.y + (sp || (this.credits ? 16 : 0)) * dt);
    if (n.back || (n.ok && !this.credits) || (n.ok && this.t > 3)) { UI.pop(); if (this.credits) S7.quitToTitle(); }
  }
  draw(r) {
    const W = r.W, H = r.H; r.overlay(g => {
      frame(g, W, H, this.credits ? 'THE END' : 'ABOUT SKILLER7', 'v' + S7.VERSION);
      g.save(); g.beginPath(); g.rect(0, 34, W, H - 50); g.clip();
      let y = 40 - this.y; for (const ln of S7.ABOUT) {
        if (ln[0] === '#') { y += 4; UI.text(g, ln.slice(1), 14, y, col.gold); y += 11; }
        else { for (const l of UI.wrap(ln, W - 28, {})) { UI.text(g, l, 14, y, '#e0dcec'); y += 9; } y += 1; }
      }
      this.max = y + this.y; g.restore();
      if (this.y > this.max - H) this.y = Math.max(0, this.max - H);
      UI.promptRow(g, [['cancel', 'BACK']], W - 8, H - 12, 'right'); UI.text(g, 'UP / DOWN SCROLLS', 10, H - 12, col.dim);
    });
  }
};

// ---------------------------------------------------------------- Echo Run results
SCREENS.EchoResult = class {
  constructor(res, best) { this.res = res; this.best = best; this.t = 0; this.list = new UI.FocusList([{ label: 'RACE AGAIN', onPick: () => { UI.pop(); S7.startEchoRun(); } }, { label: 'BACK TO THE TITLE', onPick: () => { UI.pop(); S7.quitToTitle(); } }], { x: 0, y: 0, w: 200, rowH: 14 }); }
  update(dt, n) { this.t += dt; if (this.t > .7) this.list.update(n); }
  draw(r) {
    const W = r.W, H = r.H, e = this.res; this.list.o.x = W / 2 - 100; this.list.o.y = H - 56;
    r.overlay(g => {
      frame(g, W, H, 'ECHO RUN', 'THE BLACK RUN, AGAINST YOUR ECHO');
      const rows = [['RAW TIME', S7.fmtTime(e.raw)], ['TARGETS THAWED', e.hits + '/' + e.total], ['TIME CUT', '-' + e.cut + ' S'], ['FINAL TIME', S7.fmtTime(e.time)], ['BEST', this.best ? S7.fmtTime(this.best) : 'none yet']];
      rows.forEach((q, i) => { const y = 46 + i * 14; UI.text(g, q[0], W / 2 - 100, y, i === 3 ? col.gold : '#cfc8dc'); UI.text(g, q[1], W / 2 + 100 - UI.w(q[1]), y, i === 3 ? col.gold : '#fff'); });
      if (this.best && e.time <= this.best + .001) UI.text(g, 'NEW BEST: YOUR ECHO RUNS THIS LINE NEXT TIME', W / 2, 120, '#6ae0a8', { align: 'center' });
      if (this.t > .7) this.list.draw(g);
    });
  }
};
S7.bus.on('echo', d => {
  if (d.kind !== 'finish' || S7.attract) return;
  if (S7.hub.active) { S7.sim.toast('RESULT SENT TO THE HUB'); return; }
  const old = S7.hub.loadEcho(); UI.push(new S7.screens.EchoResult(d.result, old ? old.time : null));
});
