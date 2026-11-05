// Dev mode: reached from the pause menu. Cheats, warps, spawns and live sliders for every balance variable, with reset to defaults.
S7.dev = { overlays: { rails: false, stats: false }, speed: 1 };
S7.screens.Dev = class {
  constructor() { this.tab = 0; this.tabs = ['TOOLS', 'WARP', 'SPAWN', 'TUNING']; this.build(); }
  build() {
    const st = S7.st, sim = S7.sim;
    const toggle = (label, get, set) => ({ label, value: () => get() ? 'ON' : 'OFF', onPick: () => set(!get()), onLeft: () => set(false), onRight: () => set(true) });
    const tools = [
      toggle('GOD MODE', () => st.cheats.god, v => st.cheats.god = v), toggle('INFINITE RED', () => st.cheats.infRed, v => st.cheats.infRed = v),
      toggle('INFINITE AMMO', () => st.cheats.infAmmo, v => st.cheats.infAmmo = v), toggle('FAST RAILS', () => st.cheats.fast, v => st.cheats.fast = v),
      toggle('SHOW RAILS', () => S7.dev.overlays.rails, v => S7.dev.overlays.rails = v), toggle('SHOW STATS', () => S7.dev.overlays.stats, v => S7.dev.overlays.stats = v),
      { label: 'REVEAL ALL WHITEOUTS', onPick: () => { for (const e of st.enemies) e.visible = 30; sim.toast('ALL REVEALED'); } },
      { label: 'THAW ALL WHITEOUTS', onPick: () => { for (const e of st.enemies.slice()) if (!e.dead) sim.killEnemy(e, true); } },
      { label: 'HEAL AND REFILL EVERYONE', onPick: () => { for (const id of S7.ROSTER) { const r = st.roster[id]; r.frozen = false; r.hp = sim.personaMax(id); r.ammo = S7.reg.weapons[S7.reg.personas[id].weapon].mag; } sim.toast('EVERYONE IS WARM'); } },
      { label: 'FREEZE THIS COAT', onPick: () => { UI.stack.length = 0; sim.hurtHero(9999, 'dev'); } },
      { label: 'THAW FROZEN COATS (SWEEP)', onPick: () => { sim.reviveFrozen(); } },
      { label: '+50 RED', onPick: () => { st.red = Math.min(sim.redMax(), st.red + 50); } }, { label: '+5 RIME', onPick: () => { st.rime += 5; } },
      { label: 'UNLOCK ALL COATS', onPick: () => { for (const id of S7.ROSTER) st.roster[id].unlocked = true; } },
      { label: 'GIVE ALL KEY ITEMS AND PINS', onPick: () => { for (const k in S7.reg.items) st.items[k] = 1; st.pins = S7.PINS.map(p => p[0]); for (const d of S7.DOSSIER) if (!st.dossier.includes(d[0])) st.dossier.push(d[0]); } },
      { label: 'OPEN EVERY GATE HERE', onPick: () => { const A = S7.graph().A; for (const g in (A.gates || {})) sim.openGate(g, 'dev'); } },
      { label: 'SKIP CUTSCENE / DIALOG', onPick: () => { if (st.beat) { st.beat.i = st.beat.steps.length; st.talk = null; st.mode = 'rail'; st.beat = null; st.cut = null; st.card = null; } } },
      { label: 'SAVE QUICKLY (AUTOSAVE)', onPick: () => { S7.game.saves.autosave(); sim.toast('AUTOSAVED'); } },
      { label: 'RESET ALL SLIDERS', onPick: () => { S7.resetTune(); sim.toast('SLIDERS RESET'); } }
    ];
    const warp = [];
    for (const id of S7.AREA_ORDER) { const A = S7.reg.areas[id]; warp.push({ label: A.title + ': ' + A.sub, onPick: () => { UI.stack.length = 0; if (st.echo) st.echo = null; S7.sim.loadArea(id, id === 'room7' ? 'c' : Object.keys(A.nodes && typeof A.nodes !== 'function' ? A.nodes : S7.graph().nodes)[0]); S7.pres.load(id); sim.toast('WARPED TO ' + A.title); } }); }
    warp.push({ label: 'WARP TO THE NEXT NODE', onPick: () => { const G = S7.graph(), ids = Object.keys(G.nodes), i = (ids.indexOf(st.node) + 1) % ids.length; const n = G.nodes[ids[i]]; sim.loadArea(st.area, n.id); } });
    const spawn = Object.keys(S7.reg.enemies).map(k => ({ label: 'SPAWN ' + S7.reg.enemies[k].name.toUpperCase(), onPick: () => { const a = st.mode === 'aim' ? st.aim.yaw : st.face; sim.spawnEnemy(k, st.x + Math.cos(a) * 9, st.y + Math.sin(a) * 9); } }));
    spawn.push({ label: 'START BOSS HERE', onPick: () => { const b = S7.graph().A.boss; if (b) { st.bosses[b] = false; sim.startBoss(b); } else sim.toast('NO BOSS IN THIS AREA'); } });
    spawn.push({ label: 'START ECHO RUN', onPick: () => { UI.stack.length = 0; S7.startEchoRun(); } });
    spawn.push({ label: 'PLAY A BEAT: TARGET 00 BOSS', onPick: () => { UI.stack.length = 0; sim.playBeat('t00_boss'); } });
    const tune = [{ label: 'RESET ALL TO DEFAULTS', onPick: () => S7.resetTune() }];
    let lastGroup = ''; for (const k in S7.TUNING) { const t = S7.TUNING[k]; tune.push({ label: t.label.toUpperCase(), slider: true, min: t.min, max: t.max, get: () => t.v, set: v => S7.setTune(k, Math.round(v / t.step) * t.step), value: null, onLeft: () => S7.setTune(k, +(t.v - t.step).toFixed(3)), onRight: () => S7.setTune(k, +(t.v + t.step).toFixed(3)), onPick: () => { t.v = t.def; }, extra: () => t.v.toFixed(2) }); }
    this.lists = [tools, warp, spawn, tune].map((items, i) => new UI.FocusList(items, { x: 8, y: 52, w: 300, rowH: 12, rows: 11 }));
  }
  update(dt, n) {
    if (n.tabL) { this.tab = (this.tab + 3) % 4; S7.audio.sfx('select'); } if (n.tabR) { this.tab = (this.tab + 1) % 4; S7.audio.sfx('select'); }
    const l = this.lists[this.tab]; l.o.w = S7.game.W - 16; if (this.tab !== 3 || !n.dx) { const nn = this.tab === 3 ? Object.assign({}, n, { dx: 0 }) : n; l.update(nn); }
    if (this.tab === 3 && n.dx) { const c = l.items[l.i]; if (c && (n.dx < 0 ? c.onLeft : c.onRight)) (n.dx < 0 ? c.onLeft : c.onRight)(); }
    if (S7.game.input.down('right') && this.tab === 3) { const c = l.items[l.i]; if (c && c.onRight && S7.game.input.repeat('right', .25, .04)) c.onRight(); }
    if (S7.game.input.down('left') && this.tab === 3) { const c = l.items[l.i]; if (c && c.onLeft && S7.game.input.repeat('left', .25, .04)) c.onLeft(); }
    if (n.back) UI.pop();
  }
  draw(r) {
    const W = r.W, H = r.H; const l = this.lists[this.tab]; l.o.w = W - 16;
    r.overlay(g => {
      frame(g, W, H, 'DEV MODE', 'NOT FOR GUESTS');
      this.tabs.forEach((t, i) => { const x = 8 + i * 58; g.fillStyle = i === this.tab ? col.red : '#2a2236'; g.fillRect(x, 36, 55, 11); UI.text(g, t, x + 27 - UI.w(t) / 2, 38, '#fff'); });
      l.draw(g);
      if (this.tab === 3) { const t = Object.values(S7.TUNING); l.items.forEach((c, k) => { if (!c.extra) return; const rr = l.rect(k); if (k < l.scroll || k >= l.scroll + 11) return; UI.text(g, c.extra(), rr[0] + rr[2] - 112 - UI.w(c.extra()), rr[1] + 3, '#fff'); }); }
      UI.promptRow(g, [['scan', 'PREV TAB'], ['ring', 'NEXT TAB'], ['confirm', 'DO'], ['cancel', 'CLOSE']], W - 8, H - 14, 'right');
    });
  }
};
// overlays drawn in the world while dev mode asks for them
S7.dev.draw = function (r) {
  if (!S7.dev.overlays.rails && !S7.dev.overlays.stats) return;
  const G = S7.graph(), pres = S7.pres, st = S7.st;
  r.overlay(g => {
    if (S7.dev.overlays.rails && pres.world) for (const id of G.eorder) { const e = G.edges[id]; g.strokeStyle = e.gate ? '#ffb030' : '#40ff90'; g.lineWidth = 1; g.beginPath(); let first = true; for (let i = 0; i < e.pts.length; i += Math.max(1, Math.floor(e.pts.length / 24))) { const p = e.pts[i], q = S7.ui.proj(p.x, p.y, p.z + .1); if (!q) { first = true; continue; } first ? g.moveTo(q[0], q[1]) : g.lineTo(q[0], q[1]); first = false; } g.stroke(); }
    if (S7.dev.overlays.stats) { const lines = ['AREA ' + st.area + '  MODE ' + st.mode, 'EDGE ' + st.edge + '  S ' + st.s.toFixed(1) + '  SPD ' + st.speed.toFixed(1), 'ENEMIES ' + st.enemies.filter(e => !e.dead).length + '  PROJ ' + st.projectiles.length, 'TIME ' + st.time.toFixed(1)]; lines.forEach((l, i) => UI.text(g, l, 6, 40 + i * 9, '#0f0')); }
  });
};
