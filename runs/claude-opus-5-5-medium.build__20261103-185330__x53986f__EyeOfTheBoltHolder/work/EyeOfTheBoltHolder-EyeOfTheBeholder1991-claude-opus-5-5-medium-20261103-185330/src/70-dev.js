/* DEV MODE (from the pause menu; hidden in hub sessions): live tuning sliders with a reset, cheats, warps to named
 * waypoints, party tools, spawning, debug overlays, the walkthrough bot, the attract mode, cutscenes, a sound test and
 * fake hub ghosts. Changes apply at once and persist in storage 'boltholder.dev'. */
B.DevMode = {
  flags: { cell: false, ai: false, wires: false, simTime: false, events: false }, tabs: ['Tuning: Combat', 'Tuning: Monsters', 'Tuning: Exploration', 'Tuning: Survival', 'Cheats', 'Warp', 'Party', 'Spawn', 'Debug'],
  warpFloor: 'f1', spawnType: 'rat', spawnN: 1, giveCat: 0, sound: 0, lastEvents: [], simMs: 0,
  load() { const d = B.store.get('boltholder.dev', null); if (!d) return; if (d.T) for (const k of Object.keys(B.TDEF)) if (typeof d.T[k] === 'number') B.T[k] = clamp(d.T[k], ...B.TUNE.find(x => x[0] === k).slice(3, 5)); if (d.C) Object.assign(B.CHEATS, d.C); if (d.F) Object.assign(this.flags, d.F); },
  save() { if (B.S && B.S.mode === 'attract') return; B.store.set('boltholder.dev', { T: B.T, C: B.CHEATS, F: this.flags }); },
  resetAll() { B.resetTune(); this.save(); },
  rows(tab) {
    const T = this.tabs[tab];
    if (T.startsWith('Tuning')) { const page = T.split(': ')[1]; return [{ kind: 'act', label: 'Reset to defaults', run: () => { for (const t of B.TUNE.filter(x => x[2] === page)) B.T[t[0]] = t[6]; } }].concat(B.TUNE.filter(t => t[2] === page).map(t => ({ kind: 'slider', key: t[0], label: t[1], min: t[3], max: t[4], step: t[5], def: t[6] }))); }
    if (T === 'Cheats') return [['god', 'God mode'], ['infiniteSpells', 'Infinite spells'], ['noCooldowns', 'No cooldowns'], ['noHunger', 'No hunger'], ['oneHit', 'One-hit kills'], ['noclip', 'Noclip'], ['reveal', 'Reveal map'], ['secrets', 'Show secrets'], ['freeze', 'Freeze monsters']].map(([k, l]) => ({ kind: 'toggle', get: () => B.CHEATS[k], set: v => { B.CHEATS[k] = v; }, label: l })).concat([{ kind: 'act', label: 'Give all keys and wards', run: () => { for (const id of ['ironKey', 'drainwardensKey', 'gearKey', 'boneKey', 'copperWard', 'brassWard', 'ironWard']) B.giveParty(B.item(id)); B.msg('Every key and ward is yours.'); } }]);
    if (T === 'Warp') { const F = B.FLOORS[this.warpFloor]; return [{ kind: 'pick', label: 'Floor', get: () => B.FLOORS[this.warpFloor].name, step: d => { const o = ['f1', 'f2', 'f3', 'f4', 'race']; this.warpFloor = o[(o.indexOf(this.warpFloor) + d + o.length) % o.length]; } }].concat((F.waypoints || []).map(([n, x, y, d]) => ({ kind: 'act', label: n, run: () => B.devWarp(this.warpFloor, x, y, d) })), [
      { kind: 'act', label: 'Next floor', run: () => { const o = B.FLOOR_ORDER, i = o.indexOf(B.S.floor); if (i >= 0 && i < 3) { const st = B.FLOORS[o[i + 1]].start; B.devWarp(o[i + 1], st[0], st[1], st[2]); } } },
      { kind: 'act', label: 'Boss', run: () => { B.devWarp('f4', 6, 5, 0); const FS = B.S.floors.f4; FS.doors.G10.want = FS.doors.G10.open = 1; for (const m of FS.mons) if (m.type === 'golem') m.hp = 0; } },
      { kind: 'act', label: 'Ending', run: () => { B.Play.closeScreen(); B.game.go('cutscene', { which: 'ending' }); } }]); }
    if (T === 'Party') {
      const cats = [['Weapons', 'weapon'], ['Missiles', 'missile'], ['Armour', 'body'], ['Potions', 'potion'], ['Scrolls', 'scroll'], ['Keys', 'key'], ['Food', 'food']];
      return [
        { kind: 'act', label: 'Heal all', run: () => { for (const m of B.S.party.members) if (m.state !== 'dead') { m.state = 'ok'; m.hp = m.max; m.status = {}; } } },
        { kind: 'act', label: 'Revive all', run: () => { for (const m of B.S.party.members) { m.state = 'ok'; m.hp = m.max; m.status = {}; } B.S.over = false; } },
        { kind: 'act', label: '+1 level for everyone', run: () => { for (const m of B.S.party.members) if (m.lvl < 8) { m.xp = Math.max(m.xp, B.XP_LEVELS[m.lvl]); B.levelUp(m); } } },
        { kind: 'act', label: 'Max food', run: () => { for (const m of B.S.party.members) m.food = 100; } },
        { kind: 'pick', label: 'Give item', get: () => cats[this.giveCat][0], step: d => { this.giveCat = (this.giveCat + d + cats.length) % cats.length; }, run: () => { for (const it of Object.values(B.ITEMS).filter(i => i.kind === cats[this.giveCat][1]).slice(0, 6)) B.giveParty(B.item(it.id, it.stack ? 20 : 1)); B.msg('Items given.'); } },
        { kind: 'act', label: 'Learn every spell', run: () => { for (const m of B.S.party.members) if (m.cls === 'M') m.book = Object.keys(B.SPELLS).filter(s => B.SPELLS[s].arcane); } },
        { kind: 'act', label: 'Fill every slot', run: () => { for (const m of B.S.party.members) { const known = B.knownSpells(m); for (let l = 1; l <= 3; l++) { const ks = known.filter(s => B.SPELLS[s].lvl === l); let k = 0; while (ks.length && m.mem.filter(e => B.SPELLS[e.s].lvl === l).length < B.slotCount(m, l)) B.memAdd(m, ks[k++ % ks.length], true); } for (const e of m.mem) e.ready = true; } } },
        { kind: 'act', label: 'Add Tamsin', run: () => B.joinNpc('tamsin') }, { kind: 'act', label: 'Add Durgan', run: () => B.joinNpc('durgan') }, { kind: 'act', label: 'Add Veil', run: () => B.joinNpc('veil') },
        { kind: 'act', label: 'Reset to the premade party', run: () => { B.S.party.members = B.PREMADE.map((t, i) => B.makeMember(t, i)); B.S.party.formation = [0, 1, 2, 3]; B.S.party.selected = 0; } }];
    }
    if (T === 'Spawn') { const types = Object.keys(B.MONSTERS).filter(t => t !== 'boltholder'); return [
      { kind: 'pick', label: 'Monster', get: () => B.MONSTERS[this.spawnType].name, step: d => { this.spawnType = types[(types.indexOf(this.spawnType) + d + types.length) % types.length]; } },
      { kind: 'pick', label: 'Group size', get: () => String(this.spawnN), step: d => { this.spawnN = clamp(this.spawnN + d, 1, 4); } },
      { kind: 'act', label: 'Spawn in front', run: () => { const [fx, fy] = B.front(); for (let i = 0; i < this.spawnN; i++) { const m = B.spawnMon(B.S.floor, this.spawnType, fx, fy, {}); if (m) { m.aware = true; m.state = 'hunt'; } } } },
      { kind: 'act', label: 'Kill all on this floor', run: () => { for (const m of B.FS().mons.slice()) if (m.hp > 0 && m.type !== 'boltholder') B.killMon(m); } },
      { kind: 'act', label: 'Clear wanderers', run: () => { B.FS().wanderers = 0; } }]; }
    if (T === 'Debug') return [
      { kind: 'toggle', label: 'Cell and facing', get: () => this.flags.cell, set: v => { this.flags.cell = v; } }, { kind: 'toggle', label: 'Monster AI states', get: () => this.flags.ai, set: v => { this.flags.ai = v; } },
      { kind: 'toggle', label: 'Wiring on the map', get: () => this.flags.wires, set: v => { this.flags.wires = v; } }, { kind: 'toggle', label: 'Sim time per step', get: () => this.flags.simTime, set: v => { this.flags.simTime = v; } },
      { kind: 'toggle', label: 'The last 20 events', get: () => this.flags.events, set: v => { this.flags.events = v; } },
      { kind: 'act', label: 'Auto-play to floor end', run: () => { B.Play.closeScreen(); B.Bot.start({ floorOnly: true }); } },
      { kind: 'act', label: 'Auto-play with cheats', run: () => { B.Play.closeScreen(); B.CHEATS.god = true; B.Bot.start({ floorOnly: true }); } },
      { kind: 'act', label: 'Start the attract mode now', run: () => { B.Play.closeScreen(); B.game.go('attract', { from: 'dev' }); } },
      { kind: 'act', label: 'Play the intro', run: () => { B.Play.closeScreen(); B.game.go('cutscene', { which: 'intro', then: { resume: true } }); } },
      { kind: 'act', label: 'Play the ending', run: () => { B.Play.closeScreen(); B.game.go('cutscene', { which: 'ending' }); } },
      { kind: 'pick', label: 'Sound test', get: () => this.soundList()[this.sound][0], step: d => { const n = this.soundList().length; this.sound = (this.sound + d + n) % n; }, run: () => this.soundList()[this.sound][1]() },
      { kind: 'toggle', label: 'Fake hub ghosts', get: () => !!B.Ghosts.fake, set: v => { B.Ghosts.fake = v; } }];
    return [];
  },
  soundList() {
    const G = B.game, out = [];
    for (const k of Object.keys(B.SFX)) out.push(['sfx ' + k, () => G.audio.sfx(k)]);
    for (const k of Object.keys(B.SONGS)) out.push(['song ' + k, () => { B.Music.cur = null; B.Music.play(k); }]);
    for (const k of Object.keys(B.STINGS)) out.push(['sting ' + k, () => B.Music.sting(k)]);
    for (const k of Object.keys(B.VOICES)) out.push(['voice ' + k, () => { const plan = B.babble.plan('Every lock is a promise, and I keep them all.', B.VOICES[k]); plan.forEach(ev => setTimeout(() => B.babble.syl(G, ev, B.VOICES[k]), ev.t * 1000)); }]);
    return out;
  },
  overlay(g, r, G) {
    const S = B.S; if (!S) return; let y = 30;
    if (this.flags.cell) { B.text(g, S.floor + ' (' + S.party.cx + ',' + S.party.cy + ') ' + WAYS[S.party.dir] + '  t ' + S.time.toFixed(1) + '  hash ' + B.hash(), 4, y, '#8af0ff', { font: 'tiny' }); y += 8; }
    if (this.flags.simTime) { B.text(g, 'sim ' + this.simMs.toFixed(2) + ' ms/step', 4, y, '#8af0ff', { font: 'tiny' }); y += 8; }
    if (this.flags.events) for (const e of this.lastEvents.slice(-20)) { B.text(g, e, 4, y, '#c8c0a0', { font: 'tiny' }); y += 7; }
    if (this.flags.ai && B.view && B.view.world) for (const m of B.FS().mons) { if (m.hp <= 0) continue; const v = B.view.mons.get(m.uid); if (!v) continue; const p = B.view.world.project(v.x, v.y, (v.z || 0) + 34); if (p) B.text(g, m.type + ' ' + m.state + (m.aware ? '!' : '') + (m.wind > 0 ? ' W' + m.wind.toFixed(1) : '') + ' ' + m.hp + 'hp', p[0], p[1], '#ffb0a0', { align: 'center', font: 'tiny' }); }
  }
};
B.devWarp = (fid, x, y, d) => {
  const S = B.S; if (!S.floors[fid]) { B.initFloor(fid); B.buildRuntime(); }
  B.Play.closeScreen(); B.changeFloor(fid, [x, y, d], 'warp'); S.floors[fid].visited = 1; B.Play.consume(B.drain()); B.Play.card = null;
};
B.SCREENS.dev = {
  layout(W, H, s) {
    const ws = []; s.tab = s.tab || 0;
    const rows = B.DevMode.rows(s.tab); s.rows = rows;
    const top = 40, rh = 14, per = Math.floor((H - top - 34) / rh); s.per = per;
    const fi = Math.max(0, rows.findIndex((_, i) => 'r' + i === s.focus)); s.off = clamp(s.off || 0, Math.max(0, fi - per + 1), fi);
    rows.slice(s.off, s.off + per).forEach((row, k) => ws.push({ id: 'r' + (k + s.off), i: k + s.off, row, x: 16, y: top + k * rh, w: W - 32, h: rh - 2 }));
    return ws;
  },
  draw(g, r, game, ws, s) {
    const W = r.W, H = r.H, t = B.UI.t; scrPanel(g, W, H, 'DEV MODE', s);
    B.text(g, '← ' + B.DevMode.tabs[s.tab] + ' →', W / 2, 24, B.COL.focus, { align: 'center' });
    for (const w of ws) {
      const row = w.row, on = w.id === s.focus;
      B.text(g, row.label, w.x + 4, w.y + 3, on ? B.COL.focus : B.COL.text);
      if (row.kind === 'slider') { const v = B.T[row.key], bx = w.x + w.w - 150; E.ui.bar(g, bx, w.y + 4, 100, 4, (v - row.min) / (row.max - row.min), v === row.def ? '#8a7a5a' : '#ffd36a'); B.text(g, (Math.round(v * 100) / 100).toString(), bx + 106, w.y + 3, B.COL.text); }
      if (row.kind === 'toggle') B.text(g, row.get() ? 'ON' : 'off', w.x + w.w - 30, w.y + 3, row.get() ? B.COL.good : B.COL.dim);
      if (row.kind === 'pick') B.text(g, '← ' + row.get() + ' →', w.x + w.w - 10, w.y + 3, '#8ab8ff', { align: 'right' });
      if (on) B.focusFrame(g, w.x, w.y, w.w, w.h, t);
    }
    B.prompts(g, game, [['confirm', 'Run'], ['left', 'Change'], ['alt', 'Reset row'], ['alt2', 'Reset page'], ['tabR', 'Tab'], ['cancel', 'Back']], W - 12, H - 20, 'right');
  },
  edge(s, d) {
    const w = s.rows && s.rows[+String(s.focus).slice(1)]; if (!w) return;
    if (d === 1 || d === 3) {
      const dir = d === 1 ? 1 : -1;
      if (w.kind === 'slider') { const held = B.game.input.down('left') || B.game.input.down('right'); s.hold = held ? (s.hold || 0) + 1 : 0; const mult = s.hold > 6 ? 5 : 1; B.T[w.key] = clamp(Math.round((B.T[w.key] + dir * w.step * mult) / w.step) * w.step, w.min, w.max); B.DevMode.save(); }
      if (w.kind === 'pick') w.step(dir);
    }
  },
  act(res, s, game) {
    if (res.act === 'back') return B.Play.closeScreen();
    if (res.act === 'tabR' || res.act === 'tabL') { s.tab = (s.tab + (res.act === 'tabR' ? 1 : B.DevMode.tabs.length - 1)) % B.DevMode.tabs.length; s.focus = null; s.off = 0; game.audio.sfx('uiTab'); return; }
    const w = res.w; if (!w) return; const row = w.row;
    if (res.act === 'alt' && row.kind === 'slider') { B.T[row.key] = row.def; B.DevMode.save(); return; }
    if (res.act === 'alt2') { for (const rr of s.rows) if (rr.kind === 'slider') B.T[rr.key] = rr.def; B.DevMode.save(); return; }
    if (res.act !== 'ok') return;
    if (row.kind === 'toggle') { row.set(!row.get()); B.DevMode.save(); return; }
    if (row.kind === 'slider') { const p = game.input.pointer(); if (p && B.device(game) === 'mouse') { const bx = w.x + w.w - 150; if (p[0] >= bx && p[0] <= bx + 100) { B.T[row.key] = clamp(Math.round((row.min + (p[0] - bx) / 100 * (row.max - row.min)) / row.step) * row.step, row.min, row.max); B.DevMode.save(); } } return; }
    if (row.run) { row.run(); game.audio.sfx('uiConfirm'); B.Play.consume(B.drain()); B.DevMode.save(); }
  }
};
