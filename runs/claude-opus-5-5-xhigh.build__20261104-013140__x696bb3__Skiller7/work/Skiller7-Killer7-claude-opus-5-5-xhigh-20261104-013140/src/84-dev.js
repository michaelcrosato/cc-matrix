/* DEV MODE (§7.22): Pause → Dev Mode. Pages (L1/R1, Q/E): Tuning (live sliders, saved, a reset per value, per page and
 * for all), Cheats (toggles), Warp (areas and nodes, bosses, beats, items, waves, revive, freeze), Info. Hidden in AI Hub
 * sessions. And game.debug: the tests' and tools' handle on the sim. */
class DevModal extends Modal {
  constructor(o) { super(o); this.sim = o.sim; this.page = 0; this.i = 0; this.top = 0; this.confirmReset = false; this.boxes = []; this.warp = { area: null }; this.msg = ''; }
  pages() { return ['TUNING', 'CHEATS', 'WARP', 'INFO']; }
  rows() {
    const sim = this.sim, p = this.page;
    const resetAll = { label: 'RESET ALL TO DEFAULTS', act: () => { S7.tuningReset(); S7.cheatsReset(); this.msg = 'Everything is back to its default.'; } };
    if (p === 0) return [resetAll].concat(Object.keys(TUNING).map(k => ({ key: k, label: TUNING[k].label, value: () => TUNING[k].fmt(T[k]), slider: k })));
    if (p === 1) return [resetAll].concat(Object.keys(CHEATS).map(k => ({ key: k, label: CHEATS[k].label, value: () => CHEAT[k] ? 'ON' : 'OFF', act: () => { CHEAT[k] = !CHEAT[k]; S7.tuningSave(); if (k === 'allPersonas') for (const id of PERSONA_ORDER) if (CHEAT.allPersonas) sim.st.roster[id].unlocked = true; } })));
    if (p === 2) {
      if (this.warp.area) {
        const A = S7.AREAS[this.warp.area];
        return [{ label: '← AREAS', act: () => { this.warp.area = null; this.i = 0; } }].concat(Object.keys(A.nodes).map(n => ({ label: (A.nodes[n].label || n) + ' (' + n + ')', act: () => { this.close = true; sim.warp(this.warp.area, n); } })));
      }
      const out = [resetAll];
      for (const id of Object.keys(S7.AREAS)) out.push({ label: 'WARP: ' + S7.AREAS[id].title + (S7.AREAS[id].sub ? ' · ' + S7.AREAS[id].sub : '') + ' (' + id + ')', act: () => { this.warp.area = id; this.i = 0; this.top = 0; } });
      for (const b of S7.BOSS_WARPS) out.push({ label: 'BOSS: ' + b.label, act: () => { this.close = true; sim.warpBoss(b.id, b.phase); } });
      out.push({ label: 'GIVE: 3 EDELWEISS, KEY, EMBER, ALL PINS', act: () => { sim.st.items.edelweiss = 3; sim.st.items.servicekey = 1; sim.st.items.ember = 1; sim.st.pins = [1, 2, 3, 4, 5, 6, 7]; this.msg = 'Given.'; } });
      out.push({ label: '+100 RED', act: () => { sim.st.red = Math.min(999, sim.st.red + 100); } }, { label: '+20 RIME', act: () => { sim.st.rime += 20; } });
      out.push({ label: 'REVIVE ALL', act: () => { for (const id of PERSONA_ORDER) { const r = sim.st.roster[id]; r.frozen = false; r.statue = null; r.hp = S7.PERSONAS[id].hp; } this.msg = 'Everyone thawed and healed.'; } });
      out.push({ label: 'KILL ALL', act: () => { sim.killAllEnemies(); } });
      out.push({ label: 'FREEZE THE ACTIVE PERSONA', act: () => { this.close = true; if (sim.st.persona !== 'ansel') { sim.pstate().hp = 0; sim.freezePersona(); } } });
      for (const w of Object.keys(sim.areaDef.waves || {})) out.push({ label: 'WAVE: ' + w, act: () => { this.close = true; sim.st.waves[sim.st.area + ':' + w] = null; sim.startWave(w); } });
      for (const b of Object.keys(S7.BEATS).filter(b => !/^t0._results|epilogue/.test(b))) out.push({ label: 'BEAT: ' + b, act: () => { this.close = true; sim.startBeat(b); } });
      return out;
    }
    const W3 = E.World3D;
    return [
      { label: 'AREA', value: () => sim.st.area + ' · ' + (sim.W.edge || sim.W.node) + ' · s ' + Math.round(sim.W.s) },
      { label: 'SHOT', value: () => String(sim.cam.shotId) }, { label: 'MODE', value: () => sim.mode + (sim.aim.on ? ' (aim)' : '') },
      { label: 'ENEMIES', value: () => sim.enemies.filter(e => e.alive).length + ' alive, ' + sim.enemies.filter(e => e.alive && sim.isRevealed(e)).length + ' revealed' },
      { label: 'SIM HASH', value: () => sim.hash() }, { label: 'SEED', value: () => String(S7.RNG.seed) },
      { label: 'VERSION', value: () => S7.VERSION + ' · ' + S7.BUILD }, { label: 'ENGINE', value: () => 'my-3D2dge ' + E.version + ' · ' + (W3 && W3.backend || 'none') }
    ];
  }
  update(nv) {
    const rows = this.rows(), n = rows.length, I = this.sim.game.input;
    if (this.confirmReset) { if (nv.confirm) { if (this.page === 0) S7.tuningReset(); else S7.cheatsReset(); this.confirmReset = false; this.msg = 'Page reset.'; } else if (nv.back) this.confirmReset = false; return null; }
    if (nv.pageL) { this.page = (this.page + 3) % 4; this.i = 0; this.top = 0; S7.sfx('tick'); }
    if (nv.pageR) { this.page = (this.page + 1) % 4; this.i = 0; this.top = 0; S7.sfx('tick'); }
    if (nv.up) this.i = (this.i + n - 1) % n; if (nv.down) this.i = (this.i + 1) % n;
    if (nv.wheel) this.i = clamp(this.i + nv.wheel, 0, n - 1);
    this.boxes.forEach((b, k) => { if (!b) return; if (nv.moved && UI.hit(nv.ptr, b[0], b[1], b[2], b[3])) this.i = k; if (UI.hit(nv.click, b[0], b[1], b[2], b[3])) { this.i = k; if (rows[k] && rows[k].act) { rows[k].act(); S7.sfx('confirm'); } } });
    const row = rows[this.i];
    if (row && row.slider) {
      const D = TUNING[row.slider];
      if (nv.left || nv.right) { T[row.slider] = clamp(Math.round((T[row.slider] + (nv.right ? D.step : -D.step)) / D.step) * D.step, D.min, D.max); S7.tuningSave(); S7.sfx('tick'); }
      if (this.dragV !== null && this.dragV !== undefined) { T[row.slider] = clamp(Math.round(this.dragV / D.step) * D.step, D.min, D.max); S7.tuningSave(); }
      if (I.pressed('reset1')) { T[row.slider] = D.def; S7.tuningSave(); this.msg = D.label + ' reset.'; }
    }
    if (row && row.key && !row.slider && I.pressed('reset1') && CHEATS[row.key]) { CHEAT[row.key] = false; S7.tuningSave(); }
    if (I.pressed('resetPage') && this.page < 2) this.confirmReset = true;
    if (nv.confirm && row && row.act) { row.act(); S7.sfx('confirm'); }
    if (this.i < this.top) this.top = this.i; if (this.i >= this.top + 9) this.top = this.i - 8;
    if (this.close) { this.close = false; return 'close'; }
    if (nv.back && !I.pressed('reset1')) { if (this.page === 2 && this.warp.area) { this.warp.area = null; this.i = 0; return null; } S7.sfx('back'); return 'close'; }
    this.nv = nv;
    return null;
  }
  draw(g, r) {
    UI.veil(g, r, .55, '#000');
    const x = r.W * .06, w = r.W * .88, S = UI.safe(r);
    UI.panel(g, x - 4, S.y0 - 4, w + 8, S.y1 - S.y0 + 8, .9);
    let tx = x; this.pages().forEach((p, i) => { const tw = UI.width(p) + 12; UI.rect(g, tx, S.y0, tw, 13, i === this.page ? RED : '#2a2428'); UI.text(g, p, tx + 6, S.y0 + 3, '#ffffff'); tx += tw + 4; });
    UI.text(g, 'DEV MODE', x + w, S.y0 + 3, '#8affc8', { align: 'right' });
    const rows = this.rows(); this.boxes = []; this.dragV = null;
    rows.slice(this.top, this.top + 9).forEach((row, k) => {
      const i = this.top + k, y = S.y0 + 20 + k * 19, f = i === this.i;
      if (f) UI.rect(g, x, y, 4, 14, RED);
      UI.text(g, row.label, x + 8, y + 3, f ? '#ffffff' : '#c8c4cc', { scale: 1 });
      if (row.slider) { const D = TUNING[row.slider], v = S7.slider(g, f ? this.nv : null, x + w * .5, y + 2, w * .3, T[row.slider], D.min, D.max, f); if (v !== null && f) this.dragV = v; UI.text(g, D.fmt(T[row.slider]), x + w, y + 3, f ? '#ffffff' : MUTED, { align: 'right' }); if (T[row.slider] !== D.def) UI.rect(g, x + w * .5 + w * .3 * (D.def - D.min) / (D.max - D.min), y + 10, 1, 4, '#8affc8'); }
      else if (row.value) UI.text(g, row.value(), x + w, y + 3, row.value() === 'ON' ? '#8affc8' : MUTED, { align: 'right' });
      this.boxes[i] = [x, y - 2, w, 18];
    });
    if (rows.length > 9) UI.text(g, (this.top + 1) + '-' + Math.min(rows.length, this.top + 9) + ' / ' + rows.length, x + w, S.y1 - 30, MUTED, { align: 'right' });
    if (this.msg) UI.text(g, this.msg, r.W / 2, S.y1 - 30, '#ffe0a0', { align: 'center' });
    if (this.confirmReset) { UI.panel(g, r.W / 2 - 100, r.H / 2 - 20, 200, 40, 1, '#3a1018'); UI.text(g, 'RESET THIS PAGE TO DEFAULTS?', r.W / 2, r.H / 2 - 12, '#ffffff', { align: 'center' }); UI.prompt(g, [['confirm', 'YES'], ['cancel', 'NO']], r.W / 2, r.H / 2 + 4, { align: 'center' }); }
    const pad = S7.Input.family() === 'gamepad';
    UI.prompt(g, [['pageL', 'PAGE'], ['left', 'ADJUST'], ['reset1', 'RESET ONE'], ['resetPage', 'RESET PAGE'], ['cancel', 'CLOSE']], r.W / 2, S.y1 - 12, { align: 'center', labels: { pageL: pad ? 'L1 R1' : 'Q E', left: pad ? '← →' : '← →', reset1: pad ? '△' : 'Bksp', resetPage: pad ? '□' : 'Del' } });
  }
}
S7.MODALS.dev = DevModal;

/* ---- warps (dev mode, tests) ---- */
Object.assign(Sim.prototype, {
  warp(area, node, noEnter) {
    this.resetTransient();
    const A = S7.AREAS[area]; if (A && A.target !== undefined && A.target > this.st.target) { this.st.target = A.target; for (const id of PERSONA_ORDER) this.st.roster[id].unlocked = true; }
    this.enterArea(area, node, { noSave: true, noEnter: !!noEnter });
    this.entryNode = node;
  },
  warpBoss(id, phase) { const b = S7.BOSSES[id]; this.warp(b.area, b.node, true); this.resetTransient(); this.startBoss(id, phase || 1); },
  /** a stable hash of the sim's state: walker, roster, enemies, economy, flags, rng positions */
  hash() {
    const st = this.st; if (!st) return '0';
    const L = [st.area, this.W.edge || this.W.node, this.W.s, this.W.v, this.W.dir, st.persona, st.red, st.rime, this.mode, this.aim.yaw, this.aim.pitch];
    for (const id of PERSONA_ORDER) L.push(st.roster[id].hp, st.roster[id].frozen);
    for (const e of this.enemies) L.push(e.type, e.x, e.y, e.hp, e.alive);
    for (const k of Object.keys(st.flags).sort()) L.push(k, st.flags[k]);
    const R = S7.RNG.state(); for (const k of Object.keys(R).sort()) L.push(k, R[k]);
    return S7.hashOf(L);
  }
});

/** game.debug: the handle tests, tools/check.mjs and tools/replay.mjs read (§5.7) */
S7.debugHandle = (game, sim) => ({
  snapshot() {
    const st = sim.st || {};
    return {
      scene: S7.sceneName(game), mode: sim.mode, area: st.area, node: sim.W && sim.W.node, edge: sim.W && sim.W.edge, s: sim.W && Math.round(sim.W.s), dir: sim.W && sim.W.dir, speed: sim.W && Math.round(sim.W.v),
      persona: st.persona, hp: st.roster ? Math.ceil(st.roster[st.persona].hp) : 0, red: Math.floor(st.red || 0), rime: st.rime, items: st.items, pins: st.pins, flags: st.flags, target: st.target,
      objective: st.roster ? S7.objective(sim) : '', enemies: { alive: sim.enemies.filter(e => e.alive).length, revealed: sim.enemies.filter(e => e.alive && sim.isRevealed(e)).length },
      boss: sim.boss ? { id: sim.boss.id, phase: sim.boss.phase, hp: Math.round(sim.boss.hp || 0) } : null, aim: { on: sim.aim.on, yaw: sim.aim.yaw, pitch: sim.aim.pitch },
      talk: sim.talk ? sim.talk.id || 'lines' : null, card: sim.card ? sim.card.title : null, cutscene: !!sim.cutscene, modal: S7.ui.kind, results: st.results, time: Math.round((st.playtime || 0) * 10) / 10, hash: sim.hash(), shot: sim.cam.shotId
    };
  },
  teleport(area, node) { sim.warp(area, node); if (S7.sceneName(game) !== 'play') game.go('play', {}); },
  setPersona(id) { sim.trySwitch(id, true); sim.switching = null; },
  give(item, n = 1) { sim.giveItem(item, n); }, addRed(n) { sim.st.red = Math.min(999, sim.st.red + n); }, addRime(n) { sim.st.rime += n; },
  tune(k, v) { T[k] = v; }, cheat(k, on) { CHEAT[k] = on; },
  killAll() { sim.killAllEnemies(); }, revealAll() { for (const e of sim.enemies) e.reveal = 30; }, freeze(id) { if (id) sim.trySwitch(id, true); sim.switching = null; sim.pstate().hp = 0; sim.freezePersona(); },
  wave(id) { sim.startWave(id); }, beat(id) { sim.startBeat(id); }, boss(id, phase) { sim.warpBoss(id, phase); if (S7.sceneName(game) !== 'play') game.go('play', {}); }, skipCutscene() { sim.skipCutscene(); }, hash() { return sim.hash(); },
  newGame(d = 'piste') { S7.newGame(d); }, sim, S7,
  get bot() { return S7.bot; }
});
S7.sceneName = game => { const s = game.scene; if (!s || !S7.scenes) return null; for (const k in S7.scenes) if (S7.scenes[k] === s) return k; return null; };
