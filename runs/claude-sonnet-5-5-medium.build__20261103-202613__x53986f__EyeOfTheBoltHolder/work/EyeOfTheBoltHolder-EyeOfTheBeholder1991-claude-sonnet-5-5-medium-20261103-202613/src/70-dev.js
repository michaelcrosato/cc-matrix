/* DEV MODE: from the pause menu. Live tuning sliders with reset, cheats, warp, party, spawn, debug. Persists in 'boltholder.dev'. */
B.dev = { show: { cell: false, ai: false, events: false }, sound: { i: 0 }, ghosts: false, fakeGhosts: [] };
B.devSave = () => { try { localStorage.setItem('boltholder.dev', JSON.stringify({ T: B.T, C: B.CHEATS })); } catch (e) { } };
B.devLoad = () => { try { const o = JSON.parse(localStorage.getItem('boltholder.dev') || 'null'); if (o) { for (const k in o.T || {}) if (k in B.T && k !== 'menus') B.T[k] = o.T[k]; for (const k in o.C || {}) if (k in B.CHEATS) B.CHEATS[k] = !!o.C[k]; } } catch (e) { } };
B.devReset = () => { for (const k in B.TD) if (k !== 'menus') B.T[k] = B.TD[k]; B.devSave(); };
(() => {
  const TABS = ['Tuning', 'Cheats', 'Warp', 'Party', 'Spawn', 'Debug'], P = () => UI.PAL;
  const ST = { floorI: 0, npc: 0, item: 0, mon: 0, grp: 1, cat: 0 };
  const monIds = Object.keys(B.MONS).filter(k => k !== 'boltholder'), itemIds = Object.keys(B.ITEMS).filter(k => k !== 'fist'), npcIds = ['tamsin', 'durgan', 'veil'];
  const spawnFront = () => { const S = B.S, p = S.party; let [fx, fy] = B.front(); let n = 0; const F = B.F(); for (let d = 1; d <= 4 && n < ST.grp; d++) { const x = p.cx + B.DX[p.dir] * d, y = p.cy + B.DY[p.dir] * d; if (!B.walkable(x, y) || B.cell(x, y) === 'O') break; const t = B.MONS[monIds[ST.mon]]; while (n < ST.grp && B.unitsAt(x, y) + t.size <= 4) { const m = B.makeMon(monIds[ST.mon], x, y, 'hunt', { aware: true }); m.slot = B.freeSlot(x, y, m); F.mons.push(m); n++; } } B.log('Spawned ' + n + ' ' + B.MONS[monIds[ST.mon]].n + '.'); };
  const rows = (tab) => {
    const S = B.S, p = S.party, R = [];
    if (tab === 'Tuning') { R.push({ label: 'Reset to defaults', kind: 'action', run: () => B.devReset() }); let last = ''; for (const t of B.TUNE) { if (t[0] !== last) { R.push({ head: t[0] }); last = t[0]; } R.push({ label: t[2], kind: 'slider', key: t[1], min: t[4], max: t[5], step: t[6], def: t[3] }); } }
    else if (tab === 'Cheats') for (const k in B.CHEATS) R.push({ label: B.cheatNames[k], kind: 'toggle', key: k });
    else if (tab === 'Warp') { const fl = [...B.ORDER, 'rr']; const f = fl[ST.floorI]; R.push({ label: 'Floor: ' + B.FLOORS[f].name, kind: 'select', sel: d => { ST.floorI = (ST.floorI + d + fl.length) % fl.length; } }); for (const k in B.FLOORS[f].waypoints) R.push({ label: k, kind: 'action', run: () => { const w = B.FLOORS[f].waypoints[k]; if (f === 'rr' && !S.race) { } B.warp(f, w[0], w[1], w[2]); B.log('Warped to ' + k + '.'); UI.close(); } }); R.push({ label: 'Next floor', kind: 'action', run: () => { const i = B.ORDER.indexOf(S.floor); const t = B.ORDER[Math.min(3, i + 1)]; const w = B.FLOORS[t].start; B.warp(t, w[0], w[1], w[2]); UI.close(); } }); R.push({ label: 'Boss', kind: 'action', run: () => { B.warp('f4', 6, 8, 0); UI.close(); } }); R.push({ label: 'Ending', kind: 'action', run: () => { UI.close(); S.ended = true; B.ev('ending', {}); } }); }
    else if (tab === 'Party') {
      R.push({ label: 'Heal all', kind: 'action', run: () => { for (const m of p.members) if (m.state !== 'dead') { m.state = 'ok'; m.hp = m.max; m.status = {}; } } }); R.push({ label: 'Revive all', kind: 'action', run: () => { for (const m of p.members) if (m.state === 'dead') B.raise(m, 'a dev'); } });
      R.push({ label: '+1 level for everyone', kind: 'action', run: () => { for (const m of p.members) if (m.lvl < 8) B.levelUp(m); } }); R.push({ label: 'Max food', kind: 'action', run: () => { for (const m of p.members) m.food = 100; } });
      R.push({ label: 'Give item: ' + B.ITEMS[itemIds[ST.item]].n, kind: 'select', sel: d => { ST.item = (ST.item + d + itemIds.length) % itemIds.length; }, run: () => { B.give(itemIds[ST.item]); B.log('Given: ' + B.ITEMS[itemIds[ST.item]].n); } });
      R.push({ label: 'Learn every spell', kind: 'action', run: () => { for (const m of p.members) if (m.cls === 'mage') { m.book = Object.keys(B.SPELLS).filter(k => B.SPELLS[k].cls === 'mage'); B.autoPrep(m); } } }); R.push({ label: 'Fill every slot', kind: 'action', run: () => { for (const m of p.members) if (B.casterType(m.cls)) B.autoPrep(m); } });
      R.push({ label: 'Add NPC: ' + B.NPCS[npcIds[ST.npc]].name, kind: 'select', sel: d => { ST.npc = (ST.npc + d + 3) % 3; }, run: () => { S.flags['joined_' + npcIds[ST.npc]] = false; B.npcJoin(npcIds[ST.npc]); } });
      R.push({ label: 'Reset to the premade party', kind: 'action', run: () => { const mem = B.premade(); const keep = { floor: S.floor, cx: p.cx, cy: p.cy, dir: p.dir }; B.S = S; const ms = B.PREMADE.map(x => B.makeMember(x)); B.S = S; p.members = ms; p.formation = [0, 1, 2, 3]; p.selected = 0; } });
    }
    else if (tab === 'Spawn') { R.push({ label: 'Monster: ' + B.MONS[monIds[ST.mon]].n, kind: 'select', sel: d => { ST.mon = (ST.mon + d + monIds.length) % monIds.length; } }); R.push({ label: 'Group size: ' + ST.grp, kind: 'select', sel: d => { ST.grp = B.clamp(ST.grp + d, 1, 4); } }); R.push({ label: 'Spawn in front', kind: 'action', run: spawnFront }); R.push({ label: 'Kill all on this floor', kind: 'action', run: () => { for (const m of B.F().mons) if (m.hp > 0) B.killMon(m); } }); R.push({ label: 'Clear wanderers', kind: 'action', run: () => { for (const m of B.F().mons) if (m.wander && m.hp > 0) { m.hp = 0; m.dieT = 9; m._gone = true; } } }); }
    else if (tab === 'Debug') {
      R.push({ label: 'Overlay: cell and facing', kind: 'toggle2', get: () => B.dev.show.cell, set: v => B.dev.show.cell = v }); R.push({ label: 'Overlay: monster AI states', kind: 'toggle2', get: () => B.dev.show.ai, set: v => B.dev.show.ai = v }); R.push({ label: 'Overlay: last 20 events', kind: 'toggle2', get: () => B.dev.show.events, set: v => B.dev.show.events = v });
      R.push({ label: 'Auto-play (the walkthrough bot, with cheats)', kind: 'action', run: () => { UI.close(); B.Bot.start({ cheats: true }); } }); R.push({ label: 'Auto-play (no cheats)', kind: 'action', run: () => { UI.close(); B.Bot.start({ cheats: false }); } });
      R.push({ label: 'Start the attract mode now', kind: 'action', run: () => { UI.close(); UI.game.go('attract'); } }); R.push({ label: 'Play the intro', kind: 'action', run: () => { UI.close(); UI.cutscene(B.INTRO); } }); R.push({ label: 'Play the ending', kind: 'action', run: () => { UI.close(); UI.cutscene(B.ENDING); } });
      const snd = [...Object.keys(B.SFX).map(k => ['sfx', k]), ...Object.keys(B.SONGS).map(k => ['song', k]), ...Object.keys(B.VOICES).map(k => ['voice', k])]; const cs = snd[B.dev.sound.i % snd.length];
      R.push({ label: 'Sound test: ' + cs[0] + ' ' + cs[1], kind: 'select', sel: d => { B.dev.sound.i = (B.dev.sound.i + d + snd.length) % snd.length; }, run: () => { if (cs[0] === 'sfx') UI.game.audio.sfx(cs[1]); else if (cs[0] === 'song') { B.Music.cur = null; B.Music.play(cs[1]); } else { const pr = B.VOICES[cs[1]], evs = B.babble.plan('Good evening. The locks are listening.', pr); evs.forEach(ev => setTimeout(() => B.babble.play(ev, pr), ev.t * 1000)); } } });
      R.push({ label: 'Fake hub ghosts', kind: 'toggle2', get: () => B.dev.ghosts, set: v => { B.dev.ghosts = v; } });
    }
    return R;
  };
  UI.screens.dev = {
    pause: false,
    enter() { this.tab = 0; this.i = 1; this.scroll = 0; this.F = new UI.Focus(); B.devSave(); },
    exit() { B.devSave(); },
    update(dt) {
      const inp = UI.game.input, r = UI.game.r; const R = this.R = rows(TABS[this.tab]); const sel = R.map((x, i) => i).filter(i => !R[i].head);
      if (!sel.includes(this.i)) this.i = sel[0];
      if (inp.pressed('tabL')) { this.tab = (this.tab + 5) % 6; this.i = 0; UI.sfx('ui_tab'); } if (inp.pressed('tabR')) { this.tab = (this.tab + 1) % 6; this.i = 0; UI.sfx('ui_tab'); }
      if (inp.repeat('down', .3, .08)) this.i = sel[Math.min(sel.length - 1, sel.indexOf(this.i) + 1)]; if (inp.repeat('up', .3, .08)) this.i = sel[Math.max(0, sel.indexOf(this.i) - 1)];
      const row = R[this.i]; const hold = (inp.down('left') || inp.down('right')) ? (this.hold = (this.hold || 0) + dt) : (this.hold = 0); const mult = hold > 1.2 ? 5 : hold > .6 ? 2 : 1;
      const dir = inp.repeat('left', .3, .06) ? -1 : inp.repeat('right', .3, .06) ? 1 : 0;
      const ck = inp.clicked(); const rowY = i => 36 + (i - this.scroll) * 11; if (ck) { const bw = (r.W - 20) / 6; if (ck[1] < 28) { const t = Math.floor((ck[0] - 10) / bw); if (t >= 0 && t < 6) { this.tab = t; this.i = 0; } } else { const k = Math.floor((ck[1] - 36) / 11) + this.scroll; if (R[k] && !R[k].head) { this.i = k; const rr = R[k]; if (rr.kind === 'slider') { const x0 = r.W - 130, w = 100; if (ck[0] >= x0) { const f = B.clamp((ck[0] - x0) / w, 0, 1); let v = rr.min + f * (rr.max - rr.min); v = Math.round(v / rr.step) * rr.step; B.T[rr.key] = +v.toFixed(3); B.devSave(); } } else this.activate(rr); } } }
      if (dir && row) { if (row.kind === 'slider') { const v = B.T[row.key] + dir * row.step * mult; B.T[row.key] = +B.clamp(v, row.min, row.max).toFixed(3); B.devSave(); } else if (row.sel) row.sel(dir); else if (row.kind === 'toggle' || row.kind === 'toggle2') this.activate(row); }
      if (inp.pressed('confirm') && row) { inp.consume('confirm'); this.activate(row); }
      if (inp.pressed('altB') && row && row.kind === 'slider') { B.T[row.key] = row.def; B.devSave(); }
      if (inp.pressed('alt') && TABS[this.tab] === 'Tuning') B.devReset();
      if (inp.pressed('cancel')) { inp.consume('cancel'); UI.close(); }
      this.scroll = B.clamp(this.i - 8, 0, Math.max(0, R.length - 14));
    },
    activate(r) { if (r.kind === 'toggle') { B.CHEATS[r.key] = !B.CHEATS[r.key]; B.devSave(); } else if (r.kind === 'toggle2') r.set(!r.get()); else if (r.run) r.run(); else if (r.sel) r.sel(1); UI.sfx('ui_ok'); },
    draw(g, r) {
      const P2 = P(); UI.veil(g, r, .55); UI.panel(g, 4, 4, r.W - 8, r.H - 8); const bw = (r.W - 20) / 6;
      TABS.forEach((t, i) => { UI.text(g, t, 10 + i * bw + bw / 2, 9, i === this.tab ? P2.focus : P2.dim, { align: 'center' }); if (i === this.tab) { g.fillStyle = P2.focus; g.fillRect(12 + i * bw, 19, bw - 4, 1); } });
      UI.text(g, 'DEV MODE - changes apply live and are remembered', r.W / 2, 24, '#ff9a7a', { align: 'center', font: 'tiny' });
      const R = this.R || []; for (let k = this.scroll; k < Math.min(R.length, this.scroll + 14); k++) { const x = R[k], y = 36 + (k - this.scroll) * 11, sel = k === this.i;
        if (x.head) { UI.text(g, x.head.toUpperCase(), 12, y + 1, '#8ab0ff', { font: 'tiny' }); continue; } if (sel) { g.fillStyle = 'rgba(255,211,106,.14)'; g.fillRect(10, y - 1, r.W - 20, 11); }
        UI.text(g, x.label, 14, y, sel ? P2.focus : P2.text);
        if (x.kind === 'slider') { const v = B.T[x.key], x0 = r.W - 130, w = 100; g.fillStyle = '#2a2418'; g.fillRect(x0, y + 2, w, 5); g.fillStyle = v === x.def ? '#8a7a4a' : '#ffd36a'; g.fillRect(x0, y + 2, Math.round(w * (v - x.min) / (x.max - x.min)), 5); UI.text(g, String(+v.toFixed(2)), r.W - 24, y, v === x.def ? P2.dim : P2.focus, { align: 'right' }); }
        else if (x.kind === 'toggle') UI.text(g, B.CHEATS[x.key] ? 'ON' : 'off', r.W - 24, y, B.CHEATS[x.key] ? P2.good : P2.dim, { align: 'right' }); else if (x.kind === 'toggle2') UI.text(g, x.get() ? 'ON' : 'off', r.W - 24, y, x.get() ? P2.good : P2.dim, { align: 'right' }); else if (x.sel) UI.text(g, '←  →', r.W - 24, y, P2.dim, { align: 'right' }); }
      UI.prompts(g, [['tabL', 'Tab'], ['confirm', 'Toggle / run'], ['altB', 'Reset row'], ['alt', 'Reset page'], ['cancel', 'Back']], r.W / 2, r.H - 15, { center: true });
    }
  };
  /** the debug overlays drawn on the HUD */
  UI.devOverlay = (g, r) => {
    const S = B.S, p = S.party; if (!B.dev.show.cell && !B.dev.show.ai && !B.dev.show.events) return;
    if (B.dev.show.cell) UI.text(g, S.floor + ' (' + p.cx + ',' + p.cy + ') ' + B.DIRS[p.dir] + '  t=' + S.time.toFixed(1) + '  hash ' + B.hash(S).slice(0, 6), 6, 14, '#ff9a7a', { font: 'tiny' });
    if (B.dev.show.ai) for (const m of B.F().mons) if (m.hp > 0) { const e = B.View.mobs && B.View.mobs[m.id]; if (!e) continue; const sp = B.View.cur.project(e.x, e.y, 24); if (sp) UI.text(g, m.type + ' ' + m.state + ' ' + m.timer.toFixed(1) + ' hp' + m.hp, sp[0], sp[1], '#ff9a7a', { align: 'center', font: 'tiny' }); }
    if (B.dev.show.events) (B.dev.last || []).slice(-12).forEach((e, i) => UI.text(g, e, 6, 24 + i * 6, '#9ad0ff', { font: 'tiny' }));
  };
  const oh = UI.onEvent; UI.onEvent = (e) => { oh(e); if (B.dev.show.events && e.t !== 'step' && e.t !== 'log') { (B.dev.last = B.dev.last || []).push(e.t + (e.dmg ? ' ' + e.dmg : '')); if (B.dev.last.length > 20) B.dev.last.shift(); } };
  B.devLoad();
})();
