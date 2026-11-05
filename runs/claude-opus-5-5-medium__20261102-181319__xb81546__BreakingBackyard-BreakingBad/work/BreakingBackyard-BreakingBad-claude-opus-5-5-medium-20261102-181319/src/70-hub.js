/* ---------------- AI Hub sessions (protocol v1, ghost mode): THE COOK-OFF ----------------
   Every player runs their own copy of the same town, seeded alike: cook in the RV, sell to the buyers on the corners,
   dodge the DEA. The most cash when the clock runs out wins. The other players show as ghosts in their seat colours. */
const HUB_ROUND_MS = 4 * 60 * 1000;
const hubState = { info: null, started: false, ended: false, resulted: false, sendT: 0, progT: 0, players: [] };
function hubResult() {
  if (!HUB || hubState.resulted) return;
  hubState.resulted = true;
  HUB.result({ score: Math.round(S.earned), stats: { 'Cash': fmt$(S.earned), 'Deals': S.deals, 'Cooks': S.cooks, 'Best batch': S.best ? S.best.toFixed(1) + '%' : '-' },
    awards: S.best >= 96 ? [{ title: 'Pure Artist', detail: 'A batch of ' + S.best.toFixed(1) + '%' }] : [] });
  log('hub-result', S.earned);
}
function hubConnect() {
  return HUB.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
    if (!info) return null;
    hubState.info = info; hubState.players = info.players || [];
    rnd = HUB.rng('deal');
    HUB.on('start', () => { hubState.started = true; });
    HUB.on('message', (data, from) => {
      if (!W || !data || data.t !== 'g') return;
      let gh = W.ghosts.get(from);
      if (!gh) { const p = hubState.players.find(q => q.id === from) || { name: 'P' + (from + 1), color: '#ffffff' }; gh = { rig: RIGS.hollis(true), name: String(p.name || '').slice(0, 16), color: p.color || '#ffffff', x: data.x, y: data.y, f: 0, area: data.area, px: data.x, py: data.y }; W.ghosts.set(from, gh); }
      gh.tx = data.x; gh.ty = data.y; gh.f = data.f; gh.area = data.area; gh.cash = data.c;
    });
    HUB.on('leave', ({ id }) => { if (W) W.ghosts.delete(id); });
    HUB.on('time-up', () => { hubResult(); });
    HUB.on('end', () => { hubState.ended = true; music(null); try { A.mute && A.mute(true); } catch (e) { /* no sound */ } I.clear(); });
    return info;
  });
}
scenes.hubwait = {
  enter() { this.t = 0; },
  update(dt) { this.t += dt; },
  draw(r) { r.sky(['#1a1030', '#6a2a3a']); r.text('CONNECTING TO THE HUB...', r.W / 2, r.H / 2, '#ffffff', { align: 'center' }); }
};
scenes.hubround = {
  view: 'threequarter', touch: [], pausable: false,
  enter() {
    S = Object.assign(NEW_STATE(), { ep: 2, step: 0, clock: 18.5, flasks: { fulm: 0, smoke: 2 }, flags: { smoke: true }, sel: 'smoke' });
    enterLevel('hub', {});
    W.hero.x = SPOT.rv.x + 20; W.hero.y = SPOT.rv.y + 10;
    for (let i = 0; i < 3; i++) spawnBuyer();
    W.onDeal = () => { HUB.progress({ score: Math.round(S.earned), label: fmt$(S.earned) }); };
    W.onCook = () => { HUB.progress({ score: Math.round(S.earned), label: fmt$(S.earned) + ' • cooked ' + S.cooks }); };
    music('town');
    HUB.ready();
    log('hub-ready', hubState.info && hubState.info.me);
  },
  exit() { exitLevel(); },
  update(dt) {
    if (hubState.ended) return;
    const t = HUB.time();
    for (const gh of W.ghosts.values()) { if (gh.tx !== undefined) { gh.x = lerp(gh.x, gh.tx, Math.min(1, dt * 10)); gh.y = lerp(gh.y, gh.ty, Math.min(1, dt * 10)); } gh.rig.update(dt, { x: gh.x, y: gh.y, z: 0, vx: (gh.tx - gh.x) * 10 || 0, vy: (gh.ty - gh.y) * 10 || 0, facing: gh.f || 0 }); }
    if (!(t >= 0)) { stopHeroes(dt); return; }      // the countdown: nobody moves
    const limit = (hubState.info && hubState.info.limitMs) ? Math.min(HUB_ROUND_MS, hubState.info.limitMs) : HUB_ROUND_MS;
    if (t >= limit) { hubResult(); stopHeroes(dt); return; }
    if (hubState.resulted) { stopHeroes(dt); return; }
    // the DEA patrol the hub's town too
    playUpdate(dt);
    syncHubAgents(); for (const a of W.agents) agentUpdate(a, dt);
    hubState.sendT -= dt; hubState.progT -= dt;
    if (hubState.sendT <= 0) { hubState.sendT = .1; HUB.send({ t: 'g', area: 'hub', x: Math.round(W.hero.x), y: Math.round(W.hero.y), f: Math.round(W.hero.facing * 100) / 100, c: Math.round(S.earned) }, { reliable: false }); }
    if (hubState.progT <= 0) { hubState.progT = 1; HUB.progress({ score: Math.round(S.earned), label: fmt$(S.earned) }); }
  },
  draw(r) {
    playDraw(r);
    const t = HUB.time(), limit = (hubState.info && hubState.info.limitMs) ? Math.min(HUB_ROUND_MS, hubState.info.limitMs) : HUB_ROUND_MS;
    r.overlay(g => {
      const left = t >= 0 ? Math.max(0, limit - t) : limit, s = Math.ceil(left / 1000);
      E.ui.box(g, r.W / 2 - 70, 6, 140, 26, { bg: ['#2a1e14', '#120a06'], border: '#c8a060', alpha: .85 });
      E.font.text(g, 'THE COOK-OFF  ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'), r.W / 2, 10, '#ffd36a', { align: 'center' });
      E.font.text(g, 'Cash earned ' + fmt$(S.earned), r.W / 2, 20, '#9ae07a', { align: 'center' });
      if (!(t >= 0)) E.font.title(g, t === -Infinity ? 'GET READY' : String(Math.ceil(-t / 1000)), r.W / 2, r.H * .4, { scale: 4, align: 'center', colors: ['#ffffff', '#ffd36a', '#c8782a'], outline: '#000' });
      if (hubState.resulted) E.font.title(g, 'TIME', r.W / 2, r.H * .4, { scale: 4, align: 'center', colors: ['#ffffff', '#ffd36a', '#c8782a'], outline: '#000' });
      E.font.text(g, 'Cook at the RV, sell to buyers, avoid the DEA', r.W / 2, r.H - 10, '#e8d8b8', { align: 'center', font: 'tiny' });
    });
  }
};
function syncHubAgents() { if (W.agents.length < 3) makeAgent(W.agents.length, W.agents.length * 180, W.agents.length); }
