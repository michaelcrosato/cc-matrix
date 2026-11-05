/* =====================================================================================
 * 70-dev: Dev Mode (the pause menu; never in a hub session). Tabs (L1 R1) of rows: the tuning as live sliders (left and
 * right change them, held to speed up; □ resets a row, △ the page; "Reset to defaults" at the top), cheats, warps, party
 * tools, spawning and debug overlays. Its changes apply at once and persist (storage: boltholder.dev).
 * ===================================================================================== */
const DEV_KEY = 'boltholder.dev';
const Dev = {
  tab: 0, row: 0, warpF: 0, spawnT: 0, spawnN: 1, giveCat: 0, giveI: 0, npcI: 0, sfxI: 0, songI: 0, voiceI: 0, autoCheat: false, held: 0, scroll: 0,
  overlays: { cell: false, ai: false, wires: false, simMs: false, events: false },
  load() { try { const d = JSON.parse(localStorage.getItem(DEV_KEY) || 'null'); if (!d) return; for (const [k, v] of Object.entries(d.T || {})) if (B.T[k] !== undefined) B.T[k] = v; Object.assign(B.CHEATS, d.C || {}); Object.assign(this.overlays, d.O || {}); } catch (e) { /* a bad entry: the defaults */ } },
  save() { if (B.Attract && B.Attract.on) return; try { localStorage.setItem(DEV_KEY, JSON.stringify({ T: B.T, C: B.CHEATS, O: this.overlays })); } catch (e) { /* storage blocked */ } },
  tabs: ['Tuning: Combat', 'Tuning: Monsters', 'Tuning: Exploration', 'Tuning: Survival', 'Cheats', 'Warp', 'Party', 'Spawn', 'Debug'],
  rows() {
    const t = this.tabs[this.tab], out = [];
    if (t.startsWith('Tuning')) {
      const grp = t.split(': ')[1];
      out.push({ label: 'Reset to defaults', act: () => { B.tuneDefaults(); this.save(); UI.toast = { text: 'Every number is back to its default.', t: 0 }; } });
      for (const [tab, k, label, d, mn, mx, stp] of B.TUNE) if (tab === grp) out.push({ label, slider: { k, mn, mx, stp, d } });
    } else if (t === 'Cheats') {
      const C = [['god', 'God mode'], ['infiniteSpells', 'Infinite spells'], ['noCooldowns', 'No cooldowns'], ['noHunger', 'No hunger'], ['oneHit', 'One-hit kills'], ['noclip', 'Noclip'], ['reveal', 'Reveal map'], ['secrets', 'Show secrets'], ['freeze', 'Freeze monsters']];
      for (const [k, l] of C) out.push({ label: l, toggle: () => B.CHEATS[k], act: () => { B.CHEATS[k] = !B.CHEATS[k]; this.save(); } });
      out.push({ label: 'Give all keys and wards', act: () => { for (const id of ['ironKey', 'drainwardensKey', 'gearKey', 'boneKey', 'bentKey', 'copperWard', 'brassWard', 'ironWard', 'tumblerGear', 'tumblerGear', 'tumblerGear', 'tumblerGear', 'lockpicks', 'wandUnlatching']) B.stow(B.mkItem(id)); UI.toast = { text: 'Keys and wards in the packs.', t: 0 }; } });
    } else if (t === 'Warp') {
      const fs = B.FLOOR_ORDER.concat(['race']), f = fs[this.warpF % fs.length];
      out.push({ label: 'Floor: ' + B.FLOORS[f].name, pick: d => { this.warpF = (this.warpF + d + fs.length) % fs.length; } });
      for (const [n, x, y, dir] of B.FLOORS[f].waypoints) out.push({ label: n, act: () => { if (f === 'race') { UI.closeAll(); B.startRace({ solo: true }); return; } this.warp(f, x, y, dir); } });
      out.push({ label: 'Next floor', act: () => { const i = B.FLOOR_ORDER.indexOf(S.floor); const nf = B.FLOOR_ORDER[Math.min(3, i + 1)]; const s = B.FLOORS[nf].start; this.warp(nf, s[0], s[1], s[2]); } });
      out.push({ label: 'Boss', act: () => { const fl = S.floors.f4 || B.initFloor('f4'); for (const m of fl.mons) if (m.type === 'golem') { m.hp = 0; m.dead = 5; } fl.doors.G10.want = 1; fl.doors.G10.open = 1; this.warp('f4', 6, 6, 0); } });
      out.push({ label: 'Ending', act: () => { S.won = true; UI.closeAll(); } });
    } else if (t === 'Party') {
      const P = S.party;
      out.push({ label: 'Heal all', act: () => { for (const m of P.members) if (m.state !== 'dead') { m.state = 'ok'; m.hp = m.max; m.status = {}; } } });
      out.push({ label: 'Revive all', act: () => { for (const m of P.members) { m.state = 'ok'; m.hp = m.max; m.status = {}; } } });
      out.push({ label: '+1 level for everyone', act: () => { for (const m of P.members) if (m.lvl < 8) B.levelTo(m, m.lvl + 1); } });
      out.push({ label: 'Max food', act: () => { for (const m of P.members) m.food = 100; } });
      const cats = [['Weapons', ['weapon', 'missile']], ['Armour', ['armor', 'shield', 'head', 'neck', 'arms', 'ring', 'feet']], ['Potions & food', ['potion', 'food']], ['Scrolls & wands', ['scroll', 'wand']], ['Keys & quest', ['key', 'ward', 'gear', 'tool', 'note']], ['Ammo & junk', ['ammo', 'junk', 'coin']]];
      const cat = cats[this.giveCat % cats.length], ids = Object.keys(B.ITEMS).filter(id => cat[1].includes(IT(id).kind)), id = ids[this.giveI % ids.length];
      out.push({ label: 'Category: ' + cat[0], pick: d => { this.giveCat = (this.giveCat + d + cats.length) % cats.length; this.giveI = 0; } });
      out.push({ label: 'Give: ' + IT(id).name, pick: d => { this.giveI = (this.giveI + d + ids.length) % ids.length; }, act: () => { const it = B.mkItem(id, IT(id).stack ? 20 : 1); if (!B.stow(it)) B.addItem(FL(), P.cx, P.cy, it); UI.toast = { text: IT(id).name + ' given.', t: 0 }; } });
      out.push({ label: 'Learn every spell', act: () => { for (const m of P.members) if (m.cls === 'M') m.book = B.ARCANE.slice(); } });
      out.push({ label: 'Fill every slot', act: () => { for (const m of P.members) { B.fillPrep(m); for (let L = 1; L <= 3; L++) m.spent[L] = m.mem[L].map(() => false); } } });
      const npcs = ['tamsin', 'durgan', 'veil'], n = npcs[this.npcI % 3];
      out.push({ label: 'Add NPC: ' + B.NPCS[n].full, pick: d => { this.npcI = (this.npcI + d + 3) % 3; }, act: () => { if (!P.members.some(m => m.npc === n)) B.joinNpc(n); } });
      out.push({ label: 'Reset to the premade party', act: () => { P.members = B.PREMADE.map(d => B.mkMember(B.clone(d))); P.form = [0, 1, 2, 3, -1, -1]; P.sel = 0; UI.rigs.clear(); } });
    } else if (t === 'Spawn') {
      const types = Object.keys(B.MONSTERS).filter(k => k !== 'boltholder'), ty = types[this.spawnT % types.length];
      out.push({ label: 'Monster: ' + B.MON(ty).name, pick: d => { this.spawnT = (this.spawnT + d + types.length) % types.length; } });
      out.push({ label: 'Group size: ' + this.spawnN, pick: d => { this.spawnN = clamp(this.spawnN + d, 1, 4); } });
      out.push({ label: 'Spawn in front', act: () => { const [fx, fy] = B.front(); if (!B.partyCan(fx, fy)) { UI.toast = { text: 'There is no room ahead.', t: 0 }; return; } for (let k = 0; k < this.spawnN; k++) { const m = B.spawnMon(FL(), ty, fx, fy, {}); m.aware = true; m.st = 'hunt'; m.re = 1.5; } UI.closeAll(); } });
      out.push({ label: 'Kill all on this floor', act: () => { for (const m of FL().mons) if (m.hp > 0) B.killMon(m); } });
      out.push({ label: 'Clear wanderers', act: () => { FL().wander = 0; UI.toast = { text: 'No more wanderers on this floor.', t: 0 }; } });
    } else if (t === 'Debug') {
      for (const [k, l] of [['cell', 'Overlay: cell and facing'], ['ai', 'Overlay: monster minds and timers'], ['wires', 'Overlay: wiring on the map'], ['simMs', 'Overlay: sim time per step'], ['events', 'Overlay: the last 20 events']]) out.push({ label: l, toggle: () => this.overlays[k], act: () => { this.overlays[k] = !this.overlays[k]; if (k === 'wires') B.CHEATS.reveal = this.overlays[k] || B.CHEATS.reveal; this.save(); } });
      out.push({ label: 'Auto-play with cheats: ' + (this.autoCheat ? 'on' : 'off'), act: () => { this.autoCheat = !this.autoCheat; } });
      out.push({ label: 'Auto-play to the floor\'s end', act: () => { B.autoPlay = B.Bot.make(B.FLOORS[S.floor].walk || [], {}); B.autoPlay.cheat = this.autoCheat; if (this.autoCheat) Object.assign(B.CHEATS, { god: true, infiniteSpells: true }); UI.closeAll(); UI.toast = { text: 'Auto-play: any key to stop.', t: 0 }; } });
      out.push({ label: 'Start the attract mode now', act: () => { UI.closeAll(); B.Attract.from = 'play'; game.go('attract'); } });
      out.push({ label: 'Play the intro', act: () => { UI.closeAll(); game.go('cutscene', { id: 'intro', then: 'play' }); } });
      out.push({ label: 'Play the ending', act: () => { UI.closeAll(); game.go('cutscene', { id: 'ending', then: 'play' }); } });
      const sfx = Object.keys(game.audio.presets).filter(k => /^[a-z]/.test(k)).sort(), songs = Object.keys(B.SONGS), voices = Object.keys(B.VOICE_PROFILES);
      out.push({ label: 'Sound: ' + sfx[this.sfxI % sfx.length], pick: d => { this.sfxI = (this.sfxI + d + sfx.length) % sfx.length; }, act: () => game.audio.sfx(sfx[this.sfxI % sfx.length]) });
      out.push({ label: 'Song: ' + songs[this.songI % songs.length], pick: d => { this.songI = (this.songI + d + songs.length) % songs.length; }, act: () => { Sound.song = null; Sound.music(songs[this.songI % songs.length]); } });
      out.push({ label: 'Voice: ' + voices[this.voiceI % voices.length], pick: d => { this.voiceI = (this.voiceI + d + voices.length) % voices.length; }, act: () => Voices.say(voices[this.voiceI % voices.length], 'The locks of Hasp are turning. Will you open them?') });
      out.push({ label: 'Fake hub ghosts', toggle: () => !!B.fakeGhosts, act: () => { B.fakeGhosts = !B.fakeGhosts; if (!B.fakeGhosts) { B.view.removeGhost('fake1'); B.view.removeGhost('fake2'); } } });
    }
    return out;
  },
  warp(f, x, y, dir) { UI.closeAll(); S.talk = null; S.transit = null; if (S.floor !== f || !S.floors[f]) B.goFloor(f, [x, y, dir]); else { const P = S.party; P.cx = x; P.cy = y; P.dir = dir; P.at = [x, y]; P.tw = null; B._fovKey = null; B.look(); } B.view.enter(S.floor); Sound.floorSong(); },
  layout(W, H) {
    const rows = this.rows(), out = [], x = 16, y0 = 40, rh = 13, vis = Math.floor((H - 74) / rh);
    if (this.row < this.scroll) this.scroll = this.row; if (this.row >= this.scroll + vis) this.scroll = this.row - vis + 1;
    rows.slice(this.scroll, this.scroll + vis).forEach((r, i) => out.push(Object.assign({ id: 'd' + (i + this.scroll), x, y: y0 + i * rh, w: W - 32, h: rh - 1, idx: i + this.scroll }, r)));
    return out;
  },
  update(dt) {
    const I = game.input, rows = this.rows();
    if (I.pressed('cancel')) { UI.close(); return; }
    if (I.pressed('mL')) { this.tab = (this.tab + this.tabs.length - 1) % this.tabs.length; this.row = 0; this.scroll = 0; Sound.sfx('uiTab'); }
    if (I.pressed('mR')) { this.tab = (this.tab + 1) % this.tabs.length; this.row = 0; this.scroll = 0; Sound.sfx('uiTab'); }
    if (I.repeat('up', .3, .07)) { this.row = (this.row + rows.length - 1) % rows.length; Sound.sfx('uiMove'); }
    if (I.repeat('down', .3, .07)) { this.row = (this.row + 1) % rows.length; Sound.sfx('uiMove'); }
    const r = rows[this.row]; if (!r) return;
    const lr = I.down('left') ? -1 : I.down('right') ? 1 : 0;
    if (lr) { this.held += dt; } else this.held = 0;
    const tick = lr && (I.pressed('left') || I.pressed('right') || (this.held > .35 && Math.floor(this.held * 20) !== Math.floor((this.held - dt) * 20)));
    if (tick) { if (r.slider) { const s = r.slider, n = this.held > 1.2 ? 5 : 1; B.T[s.k] = clamp(Math.round((B.T[s.k] + lr * s.stp * n) / s.stp) * s.stp, s.mn, s.mx); this.save(); } else if (r.pick) { r.pick(lr); Sound.sfx('uiMove'); } }
    if (I.pressed('confirm') && r.act) { r.act(); Sound.sfx('uiConfirm'); }
    if (I.pressed('mAlt') && r.slider) { B.T[r.slider.k] = r.slider.d; this.save(); }
    if (I.pressed('mTri')) { for (const q of rows) if (q.slider) B.T[q.slider.k] = q.slider.d; this.save(); UI.toast = { text: 'This page is back to its defaults.', t: 0 }; }
    // the mouse: hover picks a row, a click acts, a drag moves a slider
    const pt = I.pointer && I.pointer(), list = this.layout(UI.W, UI.H);
    if (pt && I.lastDevice === 'mouse') { const w = list.find(q => pt[0] >= q.x && pt[0] < q.x + q.w && pt[1] >= q.y && pt[1] < q.y + q.h); if (w) { this.row = w.idx; if (I.held.has('Mouse0') && w.slider) { const sx = w.x + w.w - 130, k = clamp((pt[0] - sx) / 110, 0, 1), s = w.slider; B.T[s.k] = clamp(Math.round((s.mn + k * (s.mx - s.mn)) / s.stp) * s.stp, s.mn, s.mx); this.save(); } } }
    const ck = I.clicked(); if (ck) { const w = list.find(q => ck[0] >= q.x && ck[0] < q.x + q.w && ck[1] >= q.y && ck[1] < q.y + q.h); if (w && !w.slider) { if (w.pick && ck[0] > w.x + w.w - 40) w.pick(1); else if (w.act) w.act(); } }
    const z = I.zoom && I.zoom(); if (z && z !== 1) this.row = clamp(this.row + (z < 1 ? 1 : -1), 0, rows.length - 1);
  },
  draw(g, r) {
    const W = r.W, H = r.H;
    g.save(); g.globalAlpha = .82; px.rect(g, 0, 0, W, H, '#05040a'); g.restore();
    E.font.title(g, 'DEV MODE', W / 2, 4, { scale: 1, align: 'center', colors: ['#e8fcff', '#8af4ff', '#2aa0e0'] });
    const t = this.tabs[this.tab]; TXT(g, t, W / 2 - TW(t) / 2, 22, COL.focus); if (devOf() !== 'mouse') { glyph(g, 'mL', W / 2 - TW(t) / 2 - 16, 20); glyph(g, 'mR', W / 2 + TW(t) / 2 + 4, 20); }
    TXT(g, (this.tab + 1) + '/' + this.tabs.length, W - 30, 22, COL.dim);
    panel(g, 8, 34, W - 16, H - 60);
    for (const w of this.layout(W, H)) {
      const f = w.idx === this.row; if (f) px.rect(g, w.x - 2, w.y - 1, w.w + 4, w.h + 1, '#3a2e18');
      TXT(g, w.label, w.x + 2, w.y + 2, f ? COL.focus : COL.text);
      if (w.slider) { const s = w.slider, v = B.T[s.k], sx = w.x + w.w - 130, k = (v - s.mn) / (s.mx - s.mn); px.rect(g, sx, w.y + 5, 110, 2, '#5a4a30'); px.rect(g, sx + Math.round(k * 110) - 2, w.y + 2, 4, 8, f ? COL.focus : '#c8a050'); const vt = (Math.round(v * 100) / 100).toString(); TXT(g, vt, w.x + w.w - TW(vt) - 2, w.y + 2, v !== s.d ? '#8ae0ff' : COL.dim); }
      if (w.toggle) { const on = w.toggle(); TXT(g, on ? 'ON' : 'off', w.x + w.w - 22, w.y + 2, on ? COL.good : COL.dim); }
      if (w.pick) TXT(g, '◂ ▸'.replace('◂', '<').replace('▸', '>'), w.x + w.w - 28, w.y + 2, COL.dim);
    }
    prompts(g, [['confirm', 'Run'], ['lr', 'Change'], ['mAlt', 'Reset row'], ['mTri', 'Reset page'], ['cancel', 'Back']], W - 10, H - 20, { align: 'right' });
  },
  /** the debug overlays over the play view */
  drawOverlays(g, r) {
    const O = this.overlays, P = S.party; let y = 44;
    if (O.cell) { TXT(g, S.floor + ' ' + P.cx + ',' + P.cy + ' ' + FACE[P.dir] + '  t ' + S.time.toFixed(1), 6, y, '#8af4ff'); y += 10; }
    if (O.simMs) { TXT(g, 'sim ' + (B.simMs || 0).toFixed(2) + ' ms  draw ' + ((game.stats && game.stats.renderMs) || 0).toFixed(1) + ' ms', 6, y, '#8af4ff'); y += 10; }
    if (O.ai && B.view.world) for (const m of FL().mons) { if (m.hp <= 0) continue; const s = B.view.world.project(mid(m.cx), mid(m.cy), 34); if (!s) continue; const t = m.type + ' ' + m.st + (m.aware ? ' !' : '') + ' w' + m.wind.toFixed(1) + ' a' + Math.max(0, m.atkT).toFixed(1) + ' ' + m.hp + 'hp'; TXT(g, t, s[0] - TW(t, { font: 'tiny' }) / 2, s[1], '#ffb08a', { font: 'tiny' }); }
    if (O.events) { (B.lastEvents || []).slice(-20).forEach((e, i) => TXT(g, e, r.W - 120, 44 + i * 7, '#c8c8ff', { font: 'tiny' })); }
  }
};
B.Dev = Dev;
SCREENS.dev = { update(dt) { Dev.update(dt); }, draw(g, r) { Dev.draw(g, r); } };
