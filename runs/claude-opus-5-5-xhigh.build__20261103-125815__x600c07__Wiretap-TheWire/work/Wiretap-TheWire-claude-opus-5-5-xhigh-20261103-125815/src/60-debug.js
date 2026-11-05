/* 60-debug: the data check (the "designer tools" safety net: every cross-reference resolved at boot), deep links,
   game.debug for tests and tools, and the ?dev=1 overlay (F9). */
function validateData() {
  const P = [];
  for (const b of BEAT_LIST) {
    if (typeof b.next === 'string' && !BEATS[b.next]) P.push('beat ' + b.id + ': next ' + b.next + ' missing');
    if (b.kind === 'field' && !get('missions', b.ref)) P.push('beat ' + b.id + ': mission ' + b.ref + ' missing');
    if (b.kind === 'annex') { if (!ANNEX_STORY[b.story]) P.push('beat ' + b.id + ': story ' + b.story + ' missing'); for (const t of b.tasks) { if (!ANNEX_SPOTS[t.at]) P.push('beat ' + b.id + ': station ' + t.at); if (t.run && !ANNEX_RUN[t.run]) P.push('beat ' + b.id + ': task ' + t.run + ' missing'); } }
    if (b.kind === 'car' && !CAR_TOPICS[b.topics]) P.push('beat ' + b.id + ': topics ' + b.topics);
    if (b.kind === 'stage' && !ROOMS[b.room]) P.push('beat ' + b.id + ': room ' + b.room);
  }
  for (const c of all('calls')) { for (const [who] of c.lines || []) if (!VOICES[who] && !/^(man|woman|kid|unknown|cab|girl|arnetta|mayfield|pauline|drunk|teen|ex)/.test(who)) P.push('call ' + c.id + ': voice ' + who); if (c.keys) for (const k of c.keys) if (!c.lines[k]) P.push('call ' + c.id + ': key line ' + k); }
  for (const m of all('missions')) for (const id of m.cast || []) if (!PEOPLE[id]) P.push('mission ' + m.id + ': person ' + id);
  for (const p of SIDEWALK_POIS) { const c = World.map.toCell(p[0], p[1]); if (!World.map.walkable(c[0], c[1])) P.push('poi ' + c); }
  for (const k in CORNER.stash) { const s = CORNER.stash[k], c = World.map.toCell(s.x, s.y); if (!World.map.walkable(c[0], c[1])) P.push('stash ' + k + ' not walkable'); }
  return P;
}
/** #title #attract #about #<beat id> (e.g. #e3.wire1) #versus.bots #versus.local */
function deepLink(link) {
  if (!link || link === 'title') return { scene: 'title' };
  if (link === 'attract') return { scene: 'title', after: () => Attract.start() };
  if (link === 'about') return { scene: 'title', after: () => game.after(.5, () => About.open()) };
  if (link === 'versus.bots') return { scene: 'title', after: () => { UI.closeAll(); Versus.startLocal({ humans: 1, bots: true, minutes: 3 }); } };
  if (link === 'versus.local') return { scene: 'title', after: () => { UI.closeAll(); game.go('versusSetup'); } };
  if (link === 'montage') return { scene: 'title', after: () => { UI.closeAll(); STATE = EP_PRESETS[5](); F().path = 'A'; F().i5 = 'weight'; game.go('montage', {}); } };
  if (BEATS[link]) return { scene: 'title', after: () => { UI.closeAll(); const ep = BEATS[link].ep; STATE = EP_PRESETS[ep](); STATE.unlocked = ep; Director.go(link, { noSave: true }); } };
  return { scene: 'title' };
}
function installDebug() {
  game.debug = {
    snapshot() {
      const M = Mission.M, sc = game.sceneName;
      return { scene: sc, ep: STATE.ep, beat: STATE.beat, meters: Object.assign({}, STATE.meters), flags: Object.assign({}, STATE.flags), facts: STATE.facts.length, evidence: STATE.evidence.length,
        player: M && sc === 'field' ? [Math.round(M.P.x), Math.round(M.P.y)] : null, objective: M && sc === 'field' ? (M.obj.find(o => !o.ok) || {}).text : null,
        ui: UI.top() ? UI.top().id : null, attract: Globals.attract, versus: typeof Versus !== 'undefined' && Versus.sim ? Versus.snapshot() : null, errors: game.errors.length };
    },
    jump(id) { UI.closeAll(); if (BEATS[id]) { STATE = EP_PRESETS[BEATS[id].ep](); Director.go(id, { noSave: true }); } },
    autoResolve(on) { Globals.auto = !!on; },
    teleport(x, y) { const M = Mission.M; if (M) M.P.place(x, y); },
    state: () => STATE
  };
  if (!HEADLESS && /[?&]dev=1/.test(location.search)) game.debugOverlay = true;
  if (!HEADLESS) addEventListener('keydown', e => { if (e.code === 'F9') game.debugOverlay = !game.debugOverlay; });
}
function debugDraw(r, M) {
  r.overlay(g => {
    const ptr = game.input.pointer(), gp = game.mouseGround && game.mouseGround();
    const lines = ['DEV  ' + STATE.beat + '  ' + clockStr(M.clock), 'P ' + Math.round(M.P.x / T * 10) / 10 + ',' + Math.round(M.P.y / T * 10) / 10 + '  heat ' + Perception.heat(M.P).toFixed(2)];
    if (gp) { const c = World.map.toCell(gp[0], gp[1]); lines.push('cell ' + c[0] + ',' + c[1] + ' ' + (World.map.floorAt(gp[0], gp[1]) || 'wall')); }
    if (M.sim) lines.push('vials ' + M.sim.vials + ' sold ' + M.sim.L.sold + ' $' + M.sim.L.taken + (M.sim.open ? ' OPEN' : ' SHUT') + (M.sim.ledgerOK() ? '' : ' LEDGER!'));
    lines.forEach((l, i) => E.font.text(g, l, 6, 40 + i * 9, '#8fe388', { shadow: '#000', outline: false }));
    for (const o of M.observers) { const m = o.minds[M.P.id]; if (!m) continue; const [sx, sy] = r.w(o.x, o.y, o.z + 56); E.font.text(g, m.level.toFixed(2) + ' ' + (o.crewId || o.id), Math.round(sx), Math.round(sy), '#8fe388', { align: 'center', font: 'tiny', outline: false }); }
  });
}
