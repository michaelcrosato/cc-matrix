/* THUGBY TURBO — dev mode: live balance sliders, cheats, event forcing, debug overlays. Reached from the pause menu. */
const DEV = { open: false, tab: 0, i: 0, scroll: 0, msg: '', msgT: 0 };
TT.DEV = DEV;
const meOf = () => { const s = S.seats.find(x => x.kind !== 'cpu' && !x.auto) || S.seats[0]; return s && S.players[s.pid] ? S.players[s.pid] : S.players[4]; };
const FORCE = {
  'GIVE ME THE BALL': () => { const p = meOf(); if (S.phase === 'play' && p) giveBall(p); },
  'TRY LINE RUN-IN': () => { const p = meOf(); if (S.phase === 'play' && p) { place(p, atkX(p.team) - S.dir[p.team] * 120, p.y); giveBall(p); } },
  'SCORE A TRY (ME)': () => { const p = meOf(); if (S.phase === 'play' && p) { place(p, atkX(p.team) + S.dir[p.team] * 10, p.y); giveBall(p); scoreTry(p, 'dev'); } },
  'FILL HYPE (BOTH)': () => { S.hype[0] = S.hype[1] = 100; },
  'ON FIRE (ME)': () => { const p = meOf(); if (p) { p.onFire = 90; bus.emit('onFire', { id: p.id }); } },
  'SPAWN MEAT PIE': () => spawnPU('pie'), 'SPAWN IRON SHOULDERS': () => spawnPU('iron'), 'SPAWN MEGA BOOT': () => spawnPU('boot'), 'SPAWN GREASE JERSEY': () => spawnPU('grease'), 'SPAWN AIR HORN': () => spawnPU('horn'),
  'REF DOWN': () => refDown(), 'YELLOW CARD (OPPONENT)': () => { const p = S.players.find(q => q.team === 1 - meOf().team && alive(q) && q.role === 6); if (p && S.phase === 'play') cardPlayer(p, 'yellow'); },
  'SCRUM (MY FEED)': () => { if (S.phase === 'play') startScrum(meOf().team, S.ball.x, S.ball.y); }, 'LINEOUT (MY THROW)': () => { if (S.phase === 'play') startLineout(meOf().team, S.ball.x, S.ball.y); },
  'PENALTY (MY KICK)': () => { if (S.phase === 'play') startPenalty(meOf().team, S.ball.x, S.ball.y, false); }, 'CONVERSION': () => { if (S.phase === 'play') startConversion(meOf().team, meOf(), S.ball.y, 'conv'); },
  'TRIGGER HAZARD': () => { S.strikeT = 0; S.jetT = 0; S.chickT = 0; S.windT = 0; }, 'CHICKEN NOW': () => { S.chickT = 0; if (S.venue.hazard !== 'wind') S.chicken = { x: S.ball.x, y: G.Y0 - 30, dir: 1, t: 0, vx: 0 }; },
  'HOOTER NOW': () => { S.clock = TUNE.v.halfLength; }, 'END HALF / MATCH': () => { S.hooter = true; S.clock = TUNE.v.halfLength; if (S.phase === 'play') startScrum(0, S.ball.x, S.ball.y); }, 'REPLAY LAST 3S': () => { S.replayReq = 'dev'; },
  'ADD 5 POINTS (HOME)': () => { S.score[0] += 5; }, 'ADD 5 POINTS (AWAY)': () => { S.score[1] += 5; }, 'RESTART KICK-OFF': () => { doKickoff(0); }
};
function spawnPU(k) { const b = S.ball, p = meOf(); S.powerups.push({ kind: k, x: p.x + 30, y: p.y, z: 2, tx: p.x + 30, ty: p.y, sx: p.x + 30, sy: p.y, t: 9, T: 1, life: 15, landed: true }); }
const TOGGLES = [['INFINITE TURBO', 'infTurbo'], ['UNSTOPPABLE CARRIER', 'unstoppable'], ['ALL HITS MONSTER', 'monster'], ['NO FOULS CALLED', 'noFouls'], ['CPU STANDS STILL', 'aiOff'], ['SHOW PLAYER IDS', 'showIds']];
function devRows() {
  if (DEV.tab === 0) { const rows = [{ t: 'RESET ALL TO DEFAULTS', fn: () => { TUNE.reset(); } }]; let g = ''; for (const d of TUNE.defs) { if (d.group !== g) { g = d.group; rows.push({ h: g }); } rows.push({ d }); } return rows; }
  if (DEV.tab === 1) return TOGGLES.map(([l, k]) => ({ t: l, tog: k })).concat([{ t: 'GAME SPEED 0.5x', fn: () => TUNE.set('gameSpeed', .5) }, { t: 'GAME SPEED 1x', fn: () => TUNE.set('gameSpeed', 1) }]);
  if (DEV.tab === 2) return Object.keys(FORCE).map(k => ({ t: k, fn: FORCE[k] }));
  return [{ t: 'PHASE: ' + S.phase + ' ' + (S.sub || ''), info: 1 }, { t: 'SCORE ' + S.score.join('-') + '  HYPE ' + S.hype.map(Math.round).join('/'), info: 1 }, { t: 'BALL ' + S.ball.st + ' (' + Math.round(S.ball.x) + ',' + Math.round(S.ball.y) + ',' + Math.round(S.ball.z) + ')', info: 1 }, { t: 'EVENTS ' + Object.keys(S.counts).length + ' TYPES, ' + (S.counts.watchdog | 0) + ' WATCHDOG', info: 1 }, { t: 'LAST: ' + S.events.slice(-3).map(e => e.n).join(', '), info: 1 }, { t: 'SEED ' + S.cfg.seed, info: 1 }];
}
function devUpdate(inp) {
  const rows = devRows(); const n = rows.length; if (DEV.tab === 0) { /* skip headers */ }
  if (inp.pressed('l1')) { DEV.tab = (DEV.tab + 3) % 4; DEV.i = 0; } if (inp.pressed('r1')) { DEV.tab = (DEV.tab + 1) % 4; DEV.i = 0; }
  const step = d => { let k = DEV.i; do { k = (k + d + n) % n; } while (rows[k].h); DEV.i = k; };
  if (rows[DEV.i] && rows[DEV.i].h) step(1);
  if (inp.repeat('down', .35, .08)) step(1); if (inp.repeat('up', .35, .08)) step(-1);
  const r = rows[DEV.i]; if (!r) return; const fast = inp.down('turbo') ? 5 : 1;
  if (r.d) { const dir = (inp.repeat('right', .3, .06) ? 1 : 0) - (inp.repeat('left', .3, .06) ? 1 : 0); if (dir) TUNE.set(r.d.key, TUNE.base[r.d.key] + dir * r.d.step * fast); if (inp.pressed('sq') || inp.pressed('cancel') && false) TUNE.reset(r.d.key); }
  if (inp.pressed('confirm') || inp.pressed('x')) { if (r.fn) { r.fn(); DEV.msg = r.t; DEV.msgT = 1.5; } else if (r.tog) { S.dev[r.tog] = !S.dev[r.tog]; } }
  if (inp.pressed('ci') || inp.pressed('cancel')) DEV.open = false;
}
function devDraw(g, W, H, inp) {
  const x0 = W - 190, w = 184; E.ui.box(g, x0, 4, w, H - 8, { alpha: .93, border: '#ff9030' });
  E.font.text(g, 'DEV MODE', x0 + 6, 8, '#ff9030', { shadow: '#000', outline: false }); ['TUNE', 'CHEAT', 'EVENT', 'DEBUG'].forEach((t, i) => E.font.text(g, t, x0 + 6 + i * 44, 20, i === DEV.tab ? '#ffe070' : '#7078a0', { font: 'tiny' }));
  const rows = devRows(), vis = 15; DEV.scroll = clamp(DEV.i - 7, 0, Math.max(0, rows.length - vis));
  rows.slice(DEV.scroll, DEV.scroll + vis).forEach((r, k) => { const i = DEV.scroll + k, y = 32 + k * 12, sel = i === DEV.i;
    if (r.h) { E.font.text(g, '-- ' + r.h.toUpperCase() + ' --', x0 + 6, y, '#80c8ff', { font: 'tiny' }); return; }
    if (sel) px.rect(g, x0 + 2, y - 1, w - 4, 11, '#3a4a8a');
    if (r.d) { const v = TUNE.base[r.d.key], k2 = (v - r.d.min) / (r.d.max - r.d.min); E.font.text(g, r.d.label, x0 + 6, y, sel ? '#fff' : '#c0c8e8', { font: 'tiny' }); px.rect(g, x0 + 100, y + 2, 44, 4, '#202030'); px.rect(g, x0 + 100, y + 2, Math.round(44 * k2), 4, v === r.d.value ? '#80c8ff' : '#ffb040'); E.font.text(g, (Math.round(v * 100) / 100) + r.d.unit, x0 + w - 6, y, '#ffe070', { font: 'tiny', align: 'right' }); }
    else if (r.tog) { E.font.text(g, r.t, x0 + 6, y, sel ? '#fff' : '#c0c8e8', { font: 'tiny' }); E.font.text(g, S.dev[r.tog] ? 'ON' : 'OFF', x0 + w - 6, y, S.dev[r.tog] ? '#80ff80' : '#ff8080', { font: 'tiny', align: 'right' }); }
    else E.font.text(g, r.t, x0 + 6, y, sel ? '#fff' : r.info ? '#a0e0a0' : '#c0c8e8', { font: 'tiny' }); });
  if (DEV.msgT > 0) { DEV.msgT -= 1 / 60; E.font.text(g, DEV.msg, x0 + 6, H - 24, '#80ff80', { font: 'tiny' }); }
  prompt(g, '{l1}{r1} TAB  {sq} RESET ROW  {ci} CLOSE', x0 + 4, H - 14, inp, { font: 'tiny' });
}
