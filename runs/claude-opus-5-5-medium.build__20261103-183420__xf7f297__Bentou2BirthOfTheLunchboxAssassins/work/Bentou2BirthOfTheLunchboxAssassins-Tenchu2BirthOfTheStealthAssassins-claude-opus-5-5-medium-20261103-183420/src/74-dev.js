/* 74-dev: Dev Mode, from the pause menu (never in hub sessions or attract mode). Pages of at most 8 rows: cheats,
 * mission tools, teleports, debug views, and the balance sliders bound live to the 'Dev' settings, with resets. Page
 * keys: PageUp / PageDown, L1 / R1, or the buttons at the bottom of each page. */
const DEV_PAGES = ['Cheats', 'Mission', 'Teleport', 'Debug view', ...B.TUNE_PAGES.map(p => 'Balance: ' + p)];
const SPAWN_TYPES = ['ashigaru', 'samurai', 'archer', 'ninja', 'hound'];
B.Dev = {
  page: 0, spawnI: 0, scales: [.25, .5, 1, 2, 4], scaleI: 2,
  open(M, page) {
    if (!M || B.HUB || M.mode === 'attract' || M.mode === 'hub') return;
    M.dev = M.dev || { ai: false, light: false, nav: false, hide: false, anchors: false, ranges: false }; B.devOpened = true;
    if (page !== undefined) this.page = (page + DEV_PAGES.length) % DEV_PAGES.length;
    const G = B.game, onoff = v => v ? 'On' : 'Off', C = M.cheats, D = M.dev, again = () => this.open(M);
    const tog = (label, obj, k, after) => [label + ': ' + onoff(obj[k]), () => { obj[k] = !obj[k]; if (after) after(obj[k]); again(); }];
    const name = DEV_PAGES[this.page]; let actions = [], rows = null, text = '';
    if (name === 'Cheats') actions = [tog('God mode', C, 'god'), tog('Invisible to guards', C, 'invisible'), tog('No-clip (jump / crouch fly)', C, 'noclip'), tog('Infinite tools', C, 'infTools'), tog('One-hit kills', C, 'oneHit'), tog('Freeze AI', C, 'freeze'), tog('Reveal all enemies', C, 'reveal'),
      ['Heal', () => { M.hero.hp = M.hero.hpMax; again(); }],
      ['Give all tools', () => { const pack = ['riceball', 'poison', 'dango', 'shuriken', 'smoke', 'firecracker', 'firepot', 'cloak']; pack.forEach((t, i) => { M.bento.slots[i] = { tool: t, n: get('tool', t).stack }; }); M.toast('Dev', 'Every tool packed'); again(); }],
      ['Unlock everything', () => { const S = B.save.data || (B.save.data = B.freshSave()); S.tools = B.TOOL_ORDER.slice(); for (const id of B.STORY_ORDER) S.completed[id] = true; B.autosave(); M.toast('Dev', 'Every tool and mission unlocked'); again(); }]];
    else if (name === 'Mission') actions = [
      ['Complete current objective', () => { const ob = M.objectives.find(o => o.state === 'active' && !o.optional && (!o.after || o.after.every(x => M.objDone(x)))); if (ob) { if (ob.type === 'defeat') { const b = M.bosses.find(q => q.bossId === ob.boss); if (b) { if (!b.active) M.startBoss(b.bossId); b.takeHit(null, 9999, { pierce: true }); b.alive = false; } } else if (ob.type === 'assassinate') { const g = M.guards.find(q => q.id === ob.target); if (g && g.alive) { g.alive = false; M.kill(g, 'dev'); } } else if (ob.type === 'escort' && M.escort) { M.escort.freed = true; M.escort.x = M.hero.x = M.exit.x; M.escort.y = M.hero.y = M.exit.y; } else M.completeObj(ob); } again(); }],
      ['Kill all enemies', () => { for (const g of M.guards) if (g.alive && !g.civilian) { g.alive = false; g.dieT = 9; M.kill(g, 'dev'); } again(); }],
      ['Alert all / Calm all', () => { const any = M.guards.some(g => g.alive && g.mind.state === 'alert'); for (const g of M.guards) if (g.alive && !g.civilian) { if (any) { g.mind.reset(); g.bellRun = null; } else { g.mind.level = 1.2; g.mind.last = { x: M.hero.x, y: M.hero.y, z: M.hero.z }; } } again(); }],
      ['Spawn guard here: ' + SPAWN_TYPES[this.spawnI], () => { const h = M.hero, g = new Guard({ id: 'dev' + Math.floor(rand() * 1e6), type: SPAWN_TYPES[this.spawnI], at: [h.x / CELL + Math.cos(h.facing) * 2 - .5, h.y / CELL + Math.sin(h.facing) * 2 - .5], z: h.z, facing: (h.facing * 180 / Math.PI) + 180 }, M); M.guards.push(g); this.spawnI = (this.spawnI + 1) % SPAWN_TYPES.length; again(); }],
      ['Skip to boss', () => { const b = M.bosses[0]; if (b) { M.hero.x = b.x - 30; M.hero.y = b.y; M.hero.z = b.z; for (const ob of M.objectives) if (ob.state !== 'done' && ob.type !== 'defeat' && ob.type !== 'reach' && ob.type !== 'escort' && !ob.optional) M.completeObj(ob); M.startBoss(b.bossId); } B.ui.hide(); }],
      ['Win mission (choose rank)', () => B.ui.show('devRank', { title: 'Win with which rank?', actions: B.RANKS.map(rk => [rk[0], () => { M.forceRank = rk[0]; B.ui.hide(); M.complete(); }]).concat([['Back', () => B.ui.back()]]) })],
      ['Fail mission', () => { B.ui.hide(); M.fail('Failed from Dev Mode.'); }], ['Restart mission', () => { B.ui.hide(); G.go('mission', M.scene.d); }],
      ['Jump to mission...', () => B.ui.show('devJump', { title: 'Jump to mission', actions: B.STORY_ORDER.concat(['delivery']).map(id => [get('mission', id).title, () => { B.ui.hide(); G.go('mission', { missionId: id, levelId: get('mission', id).level, mode: id === 'delivery' ? 'trial' : 'missions', character: M.charId === 'trial' ? 'sojiro' : M.charId }); }]).concat([['Back', () => B.ui.back()]]) })],
      ['Edit this level (Workshop)', () => { B.ui.hide(); G.go('workshop', { spec: JSON.parse(JSON.stringify(M.level)) }); }]];
    else if (name === 'Teleport') {
      const tp = (x, y, z) => { const h = M.hero; Object.assign(h, { x, y, z: z === undefined ? M.world.map.groundAt(x, y, 4, 400) || 0 : z, vx: 0, vy: 0, vz: 0, action: null }); G.cam.snap = true; B.ui.hide(); };
      const hs = M.level.hero.at, tgt = B.objectiveTarget(M); actions = [['To the start', () => tp(cc(hs[0]), cc(hs[1]), M.level.hero.z || 0)], tgt && ['To the next objective', () => tp(tgt.x + 12, tgt.y + 12)], M.bosses[0] && ['To the boss arena', () => tp(M.bosses[0].x - 30, M.bosses[0].y, M.bosses[0].z)], M.exit && ['To the exit', () => tp(M.exit.x, M.exit.y)],
        ...M.world.zones.slice(0, 4).map(z => ['To ' + z.name, () => tp(cc((z.rect[0] + z.rect[2]) / 2), cc((z.rect[1] + z.rect[3]) / 2))]), ['To the cursor (then click or press ' + B.label('jump', 'gamepad') + ')', () => { M.dev.tpCursor = true; B.ui.hide(); M.toast('Teleport', 'Click the ground, or press jump on a pad to land at the camera\'s centre'); }]].filter(Boolean).slice(0, 8);
    }
    else if (name === 'Debug view') actions = [tog('AI overlay (or ` key)', D, 'ai'), tog('Light map', D, 'light'), tog('Nav map', D, 'nav'), tog('Hide spots', D, 'hide'), tog('Grapple anchors', D, 'anchors'), tog('Ranges', D, 'ranges'),
      ['Time scale: ' + this.scales[this.scaleI] + 'x', () => { this.scaleI = (this.scaleI + 1) % this.scales.length; M.devScale = this.scales[this.scaleI]; again(); }],
      ['Show frame rate: ' + onoff(G.settings.showFps), () => { G.settings.set('showFps', !G.settings.showFps); again(); }],
      ['Free camera: ' + onoff(D.free), () => { D.free = !D.free; G.cam.free = D.free ? { speed: 300, keys: true } : null; again(); }]];
    else {
      const pg = name.slice(9); rows = B.TUNE.filter(t => t[0] === pg).map(t => t[1]); text = 'Changes apply at once. Defaults in brackets on reset.';
      actions = [['Reset this page', () => { for (const k of rows) G.settings.set(k, B.TUNE_DEF[k]); again(); }], ['Reset all to defaults', () => { G.settings.reset('Dev'); again(); }]];
    }
    actions.push(['◀ Prev page', () => this.open(M, this.page - 1)], ['Next page ▶', () => this.open(M, this.page + 1)], ['Close Dev Mode', () => B.ui.back()]);
    B.ui.show('dev', { kicker: 'Dev Mode  ' + (this.page + 1) + ' / ' + DEV_PAGES.length, title: name, text, rows, actions });
    this.poll(M);
  },
  /* L1 / R1 and PageUp / PageDown switch pages while the screen is open */
  poll(M) {
    if (HEADLESS || this._polling) return; this._polling = true; let last = {};
    const step = () => {
      if (B.ui.screen !== 'dev') { this._polling = false; return; }
      const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
      for (const p of pads) for (const [b, d] of [[4, -1], [5, 1]]) { const on = p.buttons[b] && p.buttons[b].pressed; if (on && !last[b]) this.open(M, this.page + d); last[b] = on; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
};
if (!HEADLESS) addEventListener('keydown', e => {
  if (B.ui.screen === 'dev' && (e.code === 'PageUp' || e.code === 'PageDown')) { e.preventDefault(); B.Dev.open(B.mission, B.Dev.page + (e.code === 'PageUp' ? -1 : 1)); }
  if (e.code === 'Backquote' && B.devOpened && B.mission && B.mission.dev) B.mission.dev.ai = !B.mission.dev.ai;
});
B.devUpdate = (M, dt) => {
  const G = B.game; if (M.devScale && !M.slowmoT) G.timeScale = M.devScale;
  if (M.dev.tpCursor) {
    const c = G.input.clicked(); let to = null;
    if (c) { const p = M.world.map.pick(c[0], c[1]); if (p) to = { x: p.x, y: p.y, z: p.z }; }
    else if (G.input.lastDevice === 'gamepad' && G.input.pressed('jump')) to = { x: G.cam.x !== undefined ? M.hero.x + M.lean.x : M.hero.x, y: M.hero.y + M.lean.y, z: null };
    if (to) { const h = M.hero; Object.assign(h, { x: to.x, y: to.y, z: to.z === null ? M.world.map.groundAt(to.x, to.y, 4, 400) || 0 : to.z, vx: 0, vy: 0, vz: 0 }); M.dev.tpCursor = false; G.cam.snap = true; }
  }
};
B.devDraw = (r, M) => {
  const D = M.dev, W = M.world, h = M.hero;
  if (D.light) r.decal(g => { for (let gy = 0; gy < W.lmH; gy += 1) for (let gx = 0; gx < W.lmW; gx += 1) { const v = W.lm[gy * W.lmW + gx]; if ((gx + gy) % 2) continue; const q = r.w(gx * 8 + 4, gy * 8 + 4, 0); if (q[0] < 0 || q[1] < 0 || q[0] > r.W || q[1] > r.H) continue; px.dot(g, q[0], q[1], v > .7 ? '#ffe080' : v > .45 ? '#e08030' : v > .3 ? '#a03020' : '#301040'); } });
  if (D.nav || D.hide) r.decal(g => { for (let cy = 0; cy < W.h; cy++) for (let cx = 0; cx < W.w; cx++) { const blocked = !W.nav.walkable(cx, cy), hide = W.isHide(cc(cx), cc(cy)); if (!(D.nav && blocked) && !(D.hide && hide)) continue; const q = r.w(cc(cx), cc(cy), W.map.height(cx, cy)); if (q[0] < -8 || q[1] < -8 || q[0] > r.W + 8 || q[1] > r.H + 8) continue; px.rect(g, q[0] - 1, q[1] - 1, 3, 3, D.nav && blocked ? '#ff3a3a' : '#5aff7a'); } });
  if (D.anchors) for (const a of W.anchorsNear(h, 220, 200)) r.queue(a.x, a.y, a.z, g => { const q = r.w(a.x, a.y, a.z); px.rect(g, q[0] - 1, q[1] - 1, 3, 3, '#5ad8ff'); }, { emissive: true });
  if (D.ranges) r.decal(() => { r.groundRing(h.x, h.y, B.T('killRange'), '#ff3a3a', .5, h.z); r.groundArc(h.x, h.y, 22, h.facing, Math.PI / 3, '#5aa0ff', .3, h.z); r.groundRing(h.x, h.y, B.T('baitRange'), '#e8b04a', .3, h.z); });
  if (D.ai) {
    for (const g of M.guards) if (g.alive) { if (g.route.length) r.decal(gg => { for (let i = 0; i < g.route.length; i++) { const a = g.route[i], b = g.route[(i + 1) % g.route.length], p = r.w(a.x, a.y, 0), q = r.w(b.x, b.y, 0); px.line(gg, p[0], p[1], q[0], q[1], '#5a8aff'); } }); if (g.mind.last) r.decal(() => r.groundRing(g.mind.last.x, g.mind.last.y, 5, '#ff9a40', .6)); }
    for (const n of M.noises) r.decal(() => r.groundRing(n.x, n.y, n.loud * Math.min(1, n.t * 3), '#f4ead5', .35 * (1 - n.t / .8), n.z));
  }
};
