/* ---- DEV MODE (plan §14): reached from the pause menu's Dev Mode item (and #dev). The dev panel docks on the right third
 * while the human players' slots are driven by CPU brains, so the match keeps flowing. Tabs: TUNING (every slider with
 * its default and a help line; reset, save as my defaults, copy as JSON), CHEATS, MATCH, SCENES, DEBUG, TIME, CAMERA. ---- */
const DEV_TABS = ['TUNING', 'CHEATS', 'MATCH', 'SCENES', 'DEBUG', 'TIME', 'CAMERA'];
S.dev = { open: false, tab: 0, row: 0, page: 0, json: '' };
const devRows = () => {
  const tab = DEV_TABS[S.dev.tab];
  if (tab === 'TUNING') return Object.entries(TUNING).map(([k, t]) => ({ kind: 'slider', key: k, label: t.label, group: t.group }));
  if (tab === 'CHEATS') return [
    { kind: 'toggle', key: 'infTurbo', label: 'INFINITE TURBO (EVERYONE)' }, { kind: 'toggle', key: 'alwaysNova', label: 'ALWAYS SUPERNOVA (HOME)' },
    { kind: 'toggle', key: 'cpuPassive', label: 'CPU PASSIVE' }, { kind: 'toggle', key: 'shotsIn', label: 'SHOTS ALWAYS IN' }, { kind: 'toggle', key: 'shotsOut', label: 'SHOTS ALWAYS OUT' },
    { kind: 'toggle', key: 'unblockable', label: 'UNBLOCKABLE DUNKS' }, { kind: 'toggle', key: 'oneShove', label: 'ONE-SHOVE KNOCKDOWNS' }, { kind: 'toggle', key: 'bigHeads', label: 'BIG HEADS' },
    { kind: 'toggle', key: 'powerEvery5', label: 'POWER-UPS EVERY 5 S' }, { kind: 'toggle', key: 'noTwists', label: 'TWISTS OFF' }, { kind: 'toggle', key: 'freezeClock', label: 'FREEZE GAME CLOCK' },
    { kind: 'toggle', key: 'freezeShot', label: 'FREEZE SHOT CLOCK' }, { kind: 'action', key: 'unlockAll', label: 'UNLOCK EVERYTHING' }, { kind: 'action', key: 'resetSave', label: 'RESET SAVE DATA (ASKS)' }];
  if (tab === 'MATCH') return [
    { kind: 'action', key: 'homePlus', label: 'HOME SCORE +2' }, { kind: 'action', key: 'awayPlus', label: 'AWAY SCORE +2' }, { kind: 'action', key: 'quarterNext', label: 'END THE QUARTER' },
    { kind: 'action', key: 'clockTo', label: 'CLOCK TO 10 S' }, { kind: 'action', key: 'shotClockReset', label: 'SHOT CLOCK TO 20' }, { kind: 'action', key: 'giveBall', label: 'GIVE THE BALL TO P1' },
    { kind: 'action', key: 'endGame', label: 'END THE GAME' }, { kind: 'action', key: 'novaP1', label: 'SUPERNOVA FOR P1' }, { kind: 'action', key: 'shatterNext', label: 'SHATTER THE NEXT DUNK' },
    { kind: 'action', key: 'pu_rocket', label: 'SPAWN ROCKET KICKS' }, { kind: 'action', key: 'pu_glue', label: 'SPAWN GLUE GLOVES' }, { kind: 'action', key: 'pu_laser', label: 'SPAWN LASER SIGHT' },
    { kind: 'action', key: 'pu_moon', label: 'SPAWN MOON SHOES' }, { kind: 'action', key: 'pu_bomb', label: 'SPAWN BLAM BOMB' }, { kind: 'action', key: 'pu_gold', label: 'SPAWN GOLD BALL' },
    { kind: 'action', key: 'jackpot', label: 'PLACE THE JACKPOT SPOT' }, { kind: 'action', key: 'tw_gust', label: 'TWIST: GUST' }, { kind: 'action', key: 'tw_slick', label: 'TWIST: OIL SLICKS' },
    { kind: 'action', key: 'tw_eruption', label: 'TWIST: ERUPTION' }, { kind: 'action', key: 'tw_vent', label: 'TWIST: VENT PUFF' }, { kind: 'action', key: 'tw_overclock', label: 'TWIST: OVERCLOCK' }, { kind: 'action', key: 'tw_reboot', label: 'TWIST: REBOOT' }];
  if (tab === 'SCENES') return [
    ...all('court').map(c => ({ kind: 'action', key: 'court:' + c.id, label: 'COURT: ' + c.name })),
    { kind: 'action', key: 'scene:tour', label: 'TOUR MAP' }, { kind: 'action', key: 'scene:results', label: 'RESULTS' }, { kind: 'action', key: 'scene:credits', label: 'CREDITS' },
    { kind: 'action', key: 'scene:attract', label: 'ATTRACT MODE' }, { kind: 'action', key: 'scene:camp', label: 'BLAM CAMP' }, { kind: 'action', key: 'scene:about', label: 'ABOUT' }, { kind: 'action', key: 'scene:hall', label: 'HALL OF BLAM' }];
  if (tab === 'DEBUG') return [
    { kind: 'toggle', key: 'hitboxes', label: 'HITBOXES' }, { kind: 'toggle', key: 'intents', label: 'AI INTENTS' }, { kind: 'toggle', key: 'shotChance', label: 'SHOT CHANCE AT RELEASE' },
    { kind: 'toggle', key: 'events', label: 'EVENT LOG' }, { kind: 'toggle', key: 'state', label: 'STATE SNAPSHOT' }];
  if (tab === 'TIME') return [
    { kind: 'action', key: 'speed:0.1', label: 'SPEED 0.1' }, { kind: 'action', key: 'speed:0.25', label: 'SPEED 0.25' }, { kind: 'action', key: 'speed:0.5', label: 'SPEED 0.5' },
    { kind: 'action', key: 'speed:1', label: 'SPEED 1' }, { kind: 'action', key: 'speed:2', label: 'SPEED 2' }, { kind: 'toggle', key: 'freeze', label: 'FREEZE' }, { kind: 'action', key: 'step', label: 'STEP ONE FRAME' }, { kind: 'toggle', key: 'slowDunks', label: 'SLOW MOTION ON DUNKS' }];
  return [
    { kind: 'action', key: 'cam:broadcast', label: 'CAMERA: BROADCAST' }, { kind: 'action', key: 'cam:high', label: 'CAMERA: HIGH' }, { kind: 'action', key: 'cam:free', label: 'FREE CAMERA' }, { kind: 'action', key: 'cam:reset', label: 'RESET CAMERA' }];
};
const devSet = (key, dir) => { const t = TUNING[key]; if (!t) return; setTune(key, t.v + dir * t.step); };
/** every row's action (cheats, match, scenes, time, camera): the dev panel's buttons */
const devAct = key => {
  const m = S.match, c = S.cheats;
  if (key.startsWith('court:')) { S.setup = S.setup || {}; S.setup.court = key.slice(6); return game.go('court', { court: key.slice(6), humans: [{ slot: 0, input: game.input }] }, { fade: .2 }); }
  if (key.startsWith('scene:')) return game.go(key.slice(6), null, { fade: .2 });
  if (key.startsWith('speed:')) { game.timeScale = +key.slice(6); return; }
  if (key.startsWith('cam:')) { const v = key.slice(4); if (v === 'high') game.setView('threequarter'); else if (v === 'broadcast') game.setView(BROADCAST); else if (v === 'reset') game.resetCamera(); return; }
  if (key.startsWith('pu_')) return spawnPowerupNamed({ rocket: 'rocket', glue: 'glue', laser: 'laser', moon: 'moon', bomb: 'bomb', gold: 'gold' }[key.slice(3)]);
  if (key.startsWith('tw_')) return forceTwist({ gust: 'wind', slick: 'slick', eruption: 'eruption' }[key.slice(3)] || key.slice(3));
  switch (key) {
    case 'homePlus': if (m) m.score[0] += 2; return; case 'awayPlus': if (m) m.score[1] += 2; return;
    case 'quarterNext': if (m) { m.clock = 0; m.shotsInFlight = 0; } return;
    case 'clockTo': if (m) m.clock = 10; return; case 'shotClockReset': if (m) m.shotClock = tune('shotClock'); return;
    case 'giveBall': { const p = S.players[0]; if (p) takeBall(p, 'catch'); return; }
    case 'endGame': if (m) endGame(m.score[0] >= m.score[1] ? HOME : AWAY); return;
    case 'novaP1': { const p = S.players[0]; if (p) igniteNova(p); return; }
    case 'shatterNext': S.shatterNext = true; return;
    case 'jackpot': S.twist.jackpot = { x: CENTRE().x + 60, y: CENTRE().y, t: 0 }; return;
    case 'tw_reboot': S.twist.reboot = 1; return;
    case 'unlockAll': S.progress.unlocked = { bots: true, allstars: true, bigHeads: true }; S.progress.hall = S.progress.hall || []; saveProgress(); return;
    case 'resetSave': if (S.devResetAsked) { S.progress = PROGRESS_DEFAULT(); saveProgress(); S.devResetAsked = false; } else S.devResetAsked = true; return;
    case 'step': if (game.paused || game.timeScale === 0) game.advance(1 / 120); return;
  }
};
const devToggle = key => { S.devFlags = S.devFlags || {}; S.devFlags[key] = !S.devFlags[key]; if (S.cheats) S.cheats[key] = S.devFlags[key]; if (key === 'freeze') game.timeScale = S.devFlags.freeze ? 0 : 1; return S.devFlags[key]; };
/** the dev panel's controller: while it has the focus the human players are CPU brains (the match keeps going) */
const devOpen = () => { S.dev.open = true; S.dev.row = 0; S.dev.tab = 0; S.devSwap = S.players.filter(p => p.human).map(p => { const id = p.slot; p.human = false; p.brain = p.brain || newBrain(p, 0); return id; }); };
const devClose = () => { S.dev.open = false; for (const slot of S.devSwap || []) { const p = S.players[slot]; if (p) { p.human = true; p.brain = null; } } S.devSwap = []; saveTuning(); };
/** the dev panel's frame: navigation (tabs with L1/R1 or Q/E, rows with arrows and the wheel), a slider's change, the buttons */
const devStep = dt => {
  const d = S.dev; if (!d.open) return;
  if (game.input.pressed('cancel') || game.input.pressed('pause')) { devClose(); return; }
  if (game.input.pressed('start')) { devClose(); return; }
  const rows = devRows(); d.row = clamp(d.row, 0, rows.length - 1);
  if (game.input.pressed('down')) d.row = (d.row + 1) % rows.length;
  if (game.input.pressed('up')) d.row = (d.row + rows.length - 1) % rows.length;
  if (game.input.pressed('right') || game.input.pressed('left')) {
    const dir = game.input.pressed('right') ? 1 : -1, r0 = rows[d.row];
    if (r0.kind === 'slider') devSet(r0.key, dir);
  }
  if (game.input.pressed('confirm')) { const r0 = rows[d.row]; if (r0.kind === 'toggle') devToggle(r0.key); else if (r0.kind === 'action') devAct(r0.key); }
  if (game.input.pressed('pause') === false && game.input.pressed('start') === false) { /* (nothing) */ }
  if (game.input.pressed('shoulderRight') || game.input.pressed('taunt')) { d.tab = (d.tab + 1) % DEV_TABS.length; d.row = 0; }
};
/** the panel's drawing: the tab strip, the rows (sliders with value, default and help), the dot for a changed value */
const devDraw = (r) => {
  if (!S.dev.open) return;
  const d = S.dev, rows = devRows(), x = r.W * .66, w = r.W * .33;
  r.overlay(g => {
    panel(g, x, 0, w, r.H, { border: C.accent, alpha: .95 });
    E.font.text(g, 'DEV MODE', x + 10, 8, C.gold, { scale: 2, outline: false, shadow: '#000' });
    DEV_TABS.forEach((t, i) => E.font.text(g, t, x + 10 + i * (w / DEV_TABS.length) * 0.9, 34, i === d.tab ? C.ink : C.muted, { scale: 1, outline: false, font: 'tiny' }));
    const first = Math.max(0, d.row - 6), shown = rows.slice(first, first + 14);
    shown.forEach((row, i) => {
      const y = 56 + i * 24, focus = first + i === d.row;
      if (focus) E.ui.box(g, x + 4, y - 4, w - 8, 20, { bg: ['#4a1040', '#2a0a2a'], gradient: false, alpha: .9 });
      const label = row.label || row.key;
      E.font.text(g, label.length > 26 ? label.slice(0, 26) : label, x + 10, y, focus ? C.ink : '#d8cfee', { scale: 1, outline: false, shadow: '#000' });
      if (row.kind === 'slider') { const t = TUNING[row.key]; E.font.text(g, t.v.toFixed(2).replace(/\.?0+$/, '') + (t.v !== t.def ? ' •' : ''), x + w - 12, y, t.v !== t.def ? C.gold : C.muted, { align: 'right', scale: 1, outline: false }); }
      if (row.kind === 'toggle') E.font.text(g, S.devFlags && S.devFlags[row.key] ? 'ON' : 'OFF', x + w - 12, y, C.cyan, { align: 'right', scale: 1, outline: false });
    });
    const focus = rows[d.row];
    if (focus && focus.kind === 'slider') E.font.text(g, TUNING[focus.key].help + ' · default ' + TUNING[focus.key].def, x + 10, r.H - 60, C.cyan, { scale: 1, outline: false, shadow: '#000', wrap: w - 20 });
    E.font.text(g, 'RESET ALL: CONFIRM ON ROW · ◄ ► CHANGE · ESC CLOSE', x + 10, r.H - 30, C.muted, { scale: 1, outline: false });
  });
};
/** the pause items for a match: How to Play, Restart (matches), Dev Mode (not in a hub session) */
const pauseItems = () => {
  const inMatch = game.sceneName === 'court';
  const items = [['How to Play', () => game.go('howto', { from: 'pause' }, { fade: .2 })]];
  if (inMatch) items.push(['Restart Game', () => game.go('court', { court: S.court, humans: [{ slot: 0, input: game.input }], qLen: S.match ? S.match.qLen : 120 }, { fade: .2 })]);
  if (inMatch && !HUB) items.push(['Dev Mode', () => { game.resume(); devOpen(); }]);
  return items;
};
/** the dev panel's reset: every tuning value back to its default; the save as my defaults; the copy as JSON */
const devResetAll = () => { resetTuning(); saveTuning(); };
