/* ---- DEV MODE (pause menu -> Dev Mode; never in a hub session or attract): Shell screens of at most 8 rows. Cheats,
 * mission tools, teleports, debug overlays (AI, light map, nav map, hide spots, anchors, ranges), time scale, the free
 * camera, and four pages of live balance sliders (game.settings group 'Dev') with Reset page and Reset all. L1 / R1,
 * PageUp / PageDown or the page buttons switch pages; ` toggles the AI overlay once dev mode has been opened ---- */
const Dev = { page: 0, opened: false, flags: { ai: false, light: false, nav: false, hide: false, anchors: false, ranges: false, roofs: false }, timeScale: 1, spawnI: 0, tpArmed: false, unlockAll: false };
const DEV_PAGES = ['Cheats', 'Mission', 'Teleport', 'Debug view'].concat(B.TUNE_PAGES.map(p => 'Balance: ' + p));
const onOff = v => (v ? 'On' : 'Off');
Dev.open = (page = Dev.page) => { Dev.opened = true; Dev.page = page; Dev.show(); };
Dev.show = () => {
  const M = B.M, p = Dev.page, name = DEV_PAGES[p], nav = [{ label: '◀ Prev page', fn: () => Dev.turn(-1) }, { label: 'Next page ▶', fn: () => Dev.turn(1) }];
  const tog = (label, get, set) => ({ label: label + ': ' + onOff(get()), fn: () => { set(!get()); Dev.show(); } });
  let actions = [], rows = null, text = 'Page ' + (p + 1) + ' of ' + DEV_PAGES.length + '  ·  ' + game.input.label('block') + ' / ' + game.input.label('grapple') + ' or PageUp / PageDown turn the page.';
  if (!M) { ui.show('dev', { kicker: 'Dev Mode', title: 'No mission', text: 'Dev mode works inside a mission.', actions: [['Back', () => ui.back()]] }); return; }
  const C = M.cheats;
  if (name === 'Cheats') actions = [tog('God mode', () => C.god, v => C.god = v), tog('Invisible to guards', () => C.invisible, v => C.invisible = v), tog('No-clip', () => C.noclip, v => C.noclip = v), tog('Infinite tools', () => C.infinite, v => C.infinite = v),
    tog('One-hit kills', () => C.oneHit, v => C.oneHit = v), tog('Freeze AI', () => C.freezeAI, v => C.freezeAI = v), tog('Reveal all enemies', () => C.reveal, v => C.reveal = v),
    { label: 'Heal · Give all tools · Unlock all', fn: () => { M.hero.hp = M.hero.maxHp; M.hero.bento = TOOL_ORDER.slice(0, 8).map(t => ({ tool: t, n: B.get('tool', t).stack })); Dev.unlockAll = true; const d = Save.get(); for (const t of TOOL_ORDER) if (!d.tools.includes(t)) d.tools.push(t); for (const id of STORY_ORDER) d.completed[id] = true; Save.write(); B.Hud.toast('Healed, armed, unlocked', ''); Dev.show(); } }];
  else if (name === 'Mission') actions = [
    { label: 'Complete current objective', fn: () => { const o = M.objectives.find(o => o.state === 'active' && !o.optional) || M.objectives.find(o => o.state === 'active'); if (o) { if (o.type === 'assassinate') { const a = Mission.find(M, o.target); if (a) { a.alive = false; } } else if (o.type === 'defeat') { const b = M.bosses.find(b => b.id === o.boss); if (b) { if (!b.active) Bosses.start(b, M); b.hp = 0; Bosses.defeat(b, M); if (!b.D.spar) b.alive = false; } } else if (o.type === 'rescue' && M.escort) Mission.actions(M, [['release']]); else if (o.type === 'escort' && M.escort && o.zone) { M.escort.x = cellC(o.zone[0] + 1); M.escort.y = cellC(o.zone[1] + 1); } else Mission.setObj(M, o, 'done'); } Dev.show(); } },
    { label: 'Kill all enemies · Alert all · Calm all', fn: () => Dev.show() }, { label: 'Kill all enemies', fn: () => { for (const g of M.guards) if (g.alive) { g.alive = false; g.hp = 0; } Dev.show(); } },
    { label: 'Alert all', fn: () => { for (const g of M.guards) if (g.alive && g.mind) { g.mind.level = 1.2; g.mind.last = { x: M.hero.x, y: M.hero.y, z: M.hero.z }; g.target = M.hero; } Dev.show(); } },
    { label: 'Calm all', fn: () => { for (const g of M.guards) if (g.mind) { g.mind.reset(); g.target = null; g.bellRun = null; } M.heightened = 0; Dev.show(); } },
    { label: 'Spawn guard here (' + ['ashigaru', 'samurai', 'archer', 'ninja', 'hound'][Dev.spawnI % 5] + ')', fn: () => { const ty = ['ashigaru', 'samurai', 'archer', 'ninja', 'hound'][Dev.spawnI++ % 5], h = M.hero, a = h.facing; M.guards.push(Enemies.spawn({ id: 'dev' + M.guards.length, type: ty, at: [toCell(h.x + Math.cos(a) * 40), toCell(h.y + Math.sin(a) * 40)], facing: a * 180 / Math.PI + 180, mode: 'post' }, M, M.level.faction)); Dev.show(); } },
    { label: 'Skip to boss · Win (rank) · Fail · Restart · Jump · Edit', fn: () => Dev.missionMore() }];
  else if (name === 'Teleport') {
    const tp = (x, y, z) => { const h = M.hero; Object.assign(h, { x, y, z: z !== undefined ? z : M.world.map.groundAt(x, y), vx: 0, vy: 0, vz: 0 }); h.swim = false; game.cam.snap = true; ui.hide(); game.resume(); };
    actions = [{ label: 'To the start', fn: () => { const s = M.level.hero; tp(cellC(s.at[0]), cellC(s.at[1])); } },
      { label: 'To the next objective', fn: () => { const t = Hud.target(M); if (t) tp(t.x + 20, t.y + 20); } },
      M.bosses.length && { label: 'To the boss arena', fn: () => { const b = M.bosses[0]; tp(b.x + 30, b.y, b.z); } },
      M.exit && { label: 'To the exit', fn: () => tp(M.exit.x, M.exit.y) },
      { label: 'To the cursor (then click or ' + game.input.label('confirm') + ')', fn: () => { Dev.tpArmed = true; ui.hide(); game.resume(); B.Hud.toast('Teleport armed', 'Click the ground, or press confirm at the camera’s centre.'); } }]
      .concat(M.world.zones.slice(0, 3).map(z => ({ label: 'To ' + z.name, fn: () => { let x = cellC((z.rect[0] + z.rect[2]) >> 1), y = cellC((z.rect[1] + z.rect[3]) >> 1); tp(x, y); } }))).filter(Boolean).slice(0, 8);
  } else if (name === 'Debug view') {
    const F = Dev.flags, f = k => tog({ ai: 'AI overlay', light: 'Light map', nav: 'Nav map', hide: 'Hide spots', anchors: 'Grapple anchors', ranges: 'Ranges', roofs: 'Hide hall roofs' }[k], () => F[k], v => F[k] = v);
    actions = [f('ai'), f('light'), f('nav'), f('hide'), f('anchors'), f('ranges'),
      { label: 'Time scale: ' + Dev.timeScale + '×', fn: () => { const L2 = [.25, .5, 1, 2, 4]; Dev.timeScale = L2[(L2.indexOf(Dev.timeScale) + 1) % L2.length]; game.timeScale = Dev.timeScale; Dev.show(); } },
      { label: 'Free camera: ' + onOff(!!game.cam.free) + '  ·  Frame rate: ' + onOff(!!game.settings.fps), fn: () => Dev.viewMore() }];
  } else {
    const pg = B.TUNE_PAGES[p - 4]; rows = TUNE.filter(t => t[6] === pg).map(t => t[0]);
    actions = [{ label: 'Reset page', fn: () => { for (const k of rows) game.settings.set(k, B.tuneDefault(k)); Dev.show(); } }, { label: 'Reset all to defaults', fn: () => { game.settings.reset('Dev'); Dev.show(); } }];
    text = 'Live: every change applies on the next step. ' + text;
  }
  ui.show('dev', { kicker: 'Dev Mode', title: name, text, rows: rows || undefined, actions: actions.concat(nav, [{ label: 'Back', fn: () => ui.back() }]) });
};
Dev.turn = d => { Dev.page = (Dev.page + d + DEV_PAGES.length) % DEV_PAGES.length; Au.sfx('uiMove'); Dev.show(); };
Dev.missionMore = () => {
  const M = B.M; if (!M) return;
  ui.show('devMission', { kicker: 'Dev Mode', title: 'Mission tools', actions: [
    M.bosses.length && { label: 'Skip to boss', fn: () => { const b = M.bosses[0]; if (!b.defeated) { Object.assign(M.hero, { x: b.x + 30, y: b.y, z: b.z, vx: 0, vy: 0 }); game.cam.snap = true; for (const o of M.objectives) if (!o.optional && o.type !== 'defeat' && o.type !== 'reach' && o.type !== 'escort' && o.state !== 'done') { if (o.type === 'assassinate') { const a = Mission.find(M, o.target); if (a) a.alive = false; } else if (o.type === 'rescue') Mission.actions(M, [['release']]); else if (o.type === 'stopTimer') { const ix = M.interacts.find(i => i.do && i.do.some(a => a[0] === 'stopTimer')); if (ix) Mission.doInteract(M, ix); } else Mission.setObj(M, o, 'done'); } Mission.refreshObjectives(M, true); const ob = M.objectives.find(o => o.type === 'defeat'); if (ob) ob.state = 'active'; Bosses.start(b, M); } ui.hide(); game.resume(); } },
    { label: 'Win mission (choose rank)', fn: () => ui.show('devRank', { kicker: 'Dev Mode', title: 'Win with rank', actions: B.RANKS.map(rk => ({ label: rk[1], fn: () => { M.forceRank = rk[1]; for (const o of M.objectives) if (!o.optional) o.state = 'done'; ui.hide(); game.resume(); Mission.complete(M); } })).concat([['Back', () => ui.back()]]) }) },
    { label: 'Fail mission', fn: () => { ui.hide(); game.resume(); Mission.fail(M, 'Failed from dev mode.'); } },
    { label: 'Restart mission', fn: () => { ui.hide(); game.go('mission', { M: Mission.restore(M, null) }); } },
    { label: 'Jump to mission…', fn: () => ui.show('devJump', { kicker: 'Dev Mode', title: 'Jump to mission', actions: STORY_ORDER.concat('delivery').map(id => ({ label: B.get('mission', id).title, fn: () => { ui.hide(); game.go('mission', { mission: id, char: M.char, mode: id === 'delivery' ? 'trial' : M.mode === 'workshop' ? 'missions' : M.mode, cheats: M.cheats }); } })).concat([['Back', () => ui.back()]]) }) },
    { label: 'Edit this level', fn: () => { ui.hide(); game.go('workshop', { level: deepCopy(M.level) }); } },
    { label: 'Back', fn: () => ui.back() }].filter(Boolean) });
};
Dev.viewMore = () => ui.show('devView', { kicker: 'Dev Mode', title: 'Camera and frame rate', actions: [
  { label: 'Free camera: ' + onOff(!!game.cam.free), fn: () => { game.cam.free = game.cam.free ? null : { keys: true, edge: 0, drag: true, speed: 260 }; Dev.viewMore(); } },
  { label: 'Show frame rate: ' + onOff(!!game.settings.fps), fn: () => { if (game.settings.spec('fps')) game.settings.set('fps', !game.settings.fps); Dev.viewMore(); } }, ['Back', () => ui.back()]] });
/** page turns and the backquote, also while paused (the Shell's step runs every step) */
Dev.poll = () => {
  if (!ui.screen || !/^dev/.test(ui.screen)) return;
  const I = game.input;
  if (ui.screen === 'dev' && (I.pressed('block') && I.held.has('Pad4') || I.pressed('grapple') && I.held.has('Pad5'))) Dev.turn(I.held.has('Pad4') ? -1 : 1);
};
if (hasDOM) addEventListener('keydown', e => {
  if (ui.screen === 'dev' && (e.code === 'PageUp' || e.code === 'PageDown')) { e.preventDefault(); Dev.turn(e.code === 'PageUp' ? -1 : 1); }
  if (e.code === 'Backquote' && Dev.opened && !e.repeat) Dev.flags.ai = !Dev.flags.ai;
});
const shellStep = ui._step && ui._step.bind(ui); if (shellStep) ui._step = (...a) => { const r = shellStep(...a); try { Dev.poll(); } catch (e) { /* no menu */ } return r; };
/** each step of play: the armed teleport */
Dev.step = (dt, M, it) => {
  if (!Dev.tpArmed) return;
  const I = game.input, cl = I.clicked();
  let at = null; if (cl && M.world.map.pick) { const p = M.world.map.pick(cl[0], cl[1]); if (p) at = { x: p.x !== undefined ? p.x : cellC(p.cx), y: p.y !== undefined ? p.y : cellC(p.cy), z: p.z }; }
  if (!at && I.pressed('confirm')) at = { x: game.cam.tx, y: game.cam.ty };
  if (at) { Dev.tpArmed = false; Object.assign(M.hero, { x: at.x, y: at.y, z: at.z !== undefined ? at.z : M.world.map.groundAt(at.x, at.y), vx: 0, vy: 0, vz: 0 }); game.cam.snap = true; }
};
/** the debug overlays, drawn in the world */
Dev.drawWorld = (r, M) => {
  const F = Dev.flags, W = M.world;
  if (F.light || F.nav || F.hide) r.decal(g => {
    const fx = game.cam.tx || 0, fy = game.cam.ty || 0, R = 220;
    for (let y = Math.max(0, Math.floor((fy - R) / 8)); y < Math.min(W.h * 2, (fy + R) / 8); y++) for (let x = Math.max(0, Math.floor((fx - R) / 8)); x < Math.min(W.w * 2, (fx + R) / 8); x++) {
      const wx = x * 8 + 4, wy = y * 8 + 4, z = W.map.heightAt(wx, wy); if (z > 1e8) continue;
      if (F.light) { const L = W.light[y * W.w * 2 + x], c = L > .6 ? '#ffe060' : L > .35 ? '#e87a2a' : L > .22 ? '#6a3a8a' : '#1a1a4a', p = r.w(wx, wy, z); if ((x + y) % 2 === 0) px.rect(g, p[0], p[1], 2, 2, c); }
      if (F.nav && !W.nav.walkable(x >> 1, y >> 1) && (x + y) % 2 === 0) { const p = r.w(wx, wy, z); px.rect(g, p[0], p[1], 2, 1, '#ff3a3a'); }
      if (F.hide && W.isHide(wx, wy, 0) && (x + y) % 2 === 1) { const p = r.w(wx, wy, 0); px.rect(g, p[0], p[1], 2, 1, '#5ad05a'); }
    }
  });
  if (F.anchors) for (const a of Grapple.anchors(M.hero, M)) r.queue(a.x, a.y, a.z, g => { const p = r.w(a.x, a.y, a.z), q = r.w(a.land.x, a.land.y, a.land.z); px.line(g, p[0], p[1], q[0], q[1], '#e8b04a'); px.disc(g, p[0], p[1], 2, a.tree ? '#5ad05a' : '#ffe08a'); }, { emissive: true });
  if (F.ranges) { const h = M.hero; r.decal(g => r.groundRing(h.x, h.y, T('killRange'), '#ff4a3a', .8, h.z)); r.decal(g => r.groundRing(h.x, h.y, T('baitRange'), '#e8b04a', .5, h.z)); r.decal(g => r.groundArc(h.x, h.y, 4, 22, h.facing - Math.PI / 3, h.facing + Math.PI / 3, '#8fe3ff', .35, h.z, g)); r.decal(g => r.groundRing(h.x, h.y, T('kiRange'), '#5ad8c8', .3, h.z)); }
  if (F.ai) {
    for (const g of M.guards) {
      if (!g.alive || !g.mind) continue;
      r.sightCone(g, { map: W.map, range: T('sightRange') * g.sightMul, fov: T('sightFov') * g.fovMul, color: Perception.COLOR[g.mind.state], alpha: .2 });
      if (g.route) r.queue(g.x, g.y, g.z, gg => { for (let i = 0; i < g.route.length; i++) { const a = g.route[i], b = g.route[(i + 1) % g.route.length], p = r.w(a.x, a.y, a.z || 0), q = r.w(b.x, b.y, b.z || 0); px.line(gg, p[0], p[1], q[0], q[1], '#5a8aff'); } }, { bias: 5 });
      if (g.mind.last) r.queue(g.mind.last.x, g.mind.last.y, g.mind.last.z || 0, gg => { const p = r.w(g.mind.last.x, g.mind.last.y, g.mind.last.z || 0); px.line(gg, p[0] - 3, p[1] - 3, p[0] + 3, p[1] + 3, '#ff4a3a'); px.line(gg, p[0] + 3, p[1] - 3, p[0] - 3, p[1] + 3, '#ff4a3a'); }, { emissive: true });
      r.textAt(g.x, g.y, g.z + 56, g.id + ' ' + (g.asleep ? 'sleep' : g.status.eat > 0 ? 'eat' : g.bellRun ? 'bell' : g.mind.state) + ' ' + g.mind.level.toFixed(2), '#f4ead5');
    }
    for (const n of M.noises) r.decal(g => r.groundRing(n.x, n.y, n.loud * (1 - n.t / .8 * .3), '#ffffff', n.t, n.z));
  }
};
B.Dev = Dev;
