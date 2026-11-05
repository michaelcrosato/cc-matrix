// The start: game.debug (the tests' and tools' handle), deep links, the boot steps, and game.start with the scenes.
(() => {
const B = BB, E = B.E, game = B.game;
game.debug = {
  snapshot() {
    const play = B.play, site = play && play.site && (game.sceneName === 'hunt' || game.sceneName === 'hub') ? play.site : null, hd = B.huntDebug ? B.huntDebug() : {};
    return {
      scene: game.sceneName, seg: hd.seg, segId: hd.segId, queue: hd.q, mode: hd.run ? hd.run.mode : null, hunt: hd.run ? hd.run.hunts[hd.run.hi] : null, hi: hd.run ? hd.run.hi : 0,
      site: site ? site.id : null, siteTime: site ? +site.t.toFixed(2) : 0, ended: site ? site.ended : null, endReason: site ? site.endReason : null,
      attract: !!B.attract, devOpen: B.devOpen, paused: game.paused, timeScale: game.timeScale, trophyCam: hd.trophyCam, initials: hd.initials, touchOnly: B.touchOnly,
      players: play ? play.players.map(p => ({ n: p.n, name: p.name, device: p.device, score: p.site.score, hunt: p.huntScore, total: p.total, rounds: p.rounds, chambered: p.chambered, benched: p.benched, scoped: p.scoped, breath: +p.breath.toFixed(2), calls: p.calls, ret: p.ret.map(Math.round), ghost: p.ghost, bot: !!p.bot })) : [],
      actors: site ? site.herd.list.map(a => ({ id: a.id, cat: a.cat, kind: a.kind, state: a.state, legal: !!a.legal, x: +a.x.toFixed(1), y: +a.y.toFixed(1), hp: a.hp, dead: a.dead, gone: a.gone, hidden: !!a.hidden, bagger: a.bagger, trophy: a.trophy || null })) : [],
      bucksLeft: site ? site.S.bucksLeft : 0, cam: site ? { yaw: +site.lens.yaw.toFixed(3), pitch: site.lens.pitch, fov: site.lens.fov } : null,
      hub: B.hubDebug ? B.hubDebug() : null, records: { trophies: B.records.trophies, best: B.records.best, range: B.records.range, campaign: B.records.campaign },
      errors: game.errors.length
    };
  },
  aimAt(p = 0, actorId, zone = 'heart') { const play = B.play, a = play.site.herd.list.find(x => x.id === actorId); if (!a) return false; const pt = B.aimPointOf(a, zone), P = play.site.lens.project(pt[0], pt[1], pt[2]); if (!P) return false; const pl = play.players[p]; pl.ret = [P[0], P[1]]; pl.breathHeld = true; return true; },
  fire(p = 0) { const pl = B.play.players[p]; if (!pl.chambered) return null; pl.chambered = false; pl.rounds--; pl.lastShot = B.play.t; return B.play.fire(pl, pl.ret[0], pl.ret[1]); },
  pump(p = 0) { const pl = B.play.players[p]; pl.rack = 0; pl.reload = 0; pl.chambered = true; if (pl.rounds <= 0) pl.rounds = pl.tube; },
  scope(p = 0, on = true) { const pl = B.play.players[p]; pl.scoped = on; pl.scopeK = on ? 1 : 0; },
  call(p = 0) { return B.play.onCall(B.play.players[p]); },
  goto(huntId, segment) { B.jump(huntId, segment); },
  spawn(kind, o = {}) { const S = B.play.site.S; return kind === 'critter' ? S.pattern('critter', Object.assign({ kind: 'rabbit', path: [[0, 20], [30, 20]] }, o)) : S.pattern('cross', Object.assign({ kind, path: [[-10, 30], [0, 30], [40, 32]], gait: 'walk' }, o)); },
  skip() { B.skipSegment(); }, bagAll() { B.bagAll(); },
  bot(on = true, o = {}) { const p = B.play.players[0]; p.bot = on ? new B.Bot(p, o) : null; },
  seed(n) { B.reseed(n); }, tuning(k, v) { B.setTuning(k, v); }
};
game.stateHash = () => { const s = B.play && B.play.site; if (!s) return '0'; return B.hashStr(JSON.stringify([s.herd.list.map(a => [Math.round(a.x * 100), Math.round(a.y * 100), a.state, a.hp]), B.play.players.map(p => [p.site.score, p.rounds])])).toString(16); };

// deep links: #title #menu #hunt/hollow/1 #trophy/muskeg #bonus/crow #range #lodge #about #attract #party/2 #animallab #soundlab #dev
const link = () => {
  const h = (typeof location !== 'undefined' && location.hash || '').replace('#', '').split('/');
  const k = h[0];
  if (!k) return null;
  const P = n => new B.Player(n, n === 0 ? game.input : null, { name: n ? 'CPU' + n : 'YOU' });
  if (k === 'hunt') { const hunt = h[1] || 'hollow', i = Math.max(0, (+h[2] || 1) - 1); return ['hunt', { run: B.newRun({ mode: 'single', hunts: [hunt], players: [P(0)] }), segment: { kind: 'site', id: B.get('hunt', hunt).sites[i] } }]; }
  if (k === 'trophy') { const hunt = h[1] || 'hollow'; return ['hunt', { run: B.newRun({ mode: 'single', hunts: [hunt], players: [P(0)] }), segment: { kind: 'site', id: B.get('trophy', B.get('hunt', hunt).trophy).site } }]; }
  if (k === 'bonus') { const b = B.get('bonus', h[1] || 'crow'); return ['hunt', { run: B.newRun({ mode: 'bonus', bonus: b.id, hunts: [b.hunt], players: [P(0)] }) }]; }
  if (k === 'range') return ['hunt', { run: B.newRun({ mode: 'range', hunts: ['range'], players: [P(0)] }) }];
  if (k === 'party') { const n = B.clamp(+h[1] || 2, 2, 4), ps = [P(0)]; for (let i = 1; i < n; i++) { const p = P(i); p.bot = new B.Bot(p, { skill: 'average' }); ps.push(p); } return ['hunt', { run: B.newRun({ mode: 'party', hunts: ['hollow'], players: ps }) }]; }
  if (k === 'attract') return ['attract-start', null];
  if (k === 'dev') return ['hunt-dev', { run: B.newRun({ mode: 'single', hunts: ['hollow'], players: [P(0)] }), segment: { kind: 'site', id: 'hollow-1' } }];
  if (['title', 'menu', 'lodge', 'about', 'animallab', 'soundlab'].includes(k)) return [k, null];
  return null;
};
B.deepLink = link;

const scenes = { title: B.titleScene, menu: B.menuScene, hunt: B.huntScene, lodge: B.lodgeScene, about: B.aboutScene, attract: B.attractScene, animallab: B.animalLabScene, soundlab: B.soundLabScene, hub: B.hubScene };
const L = link();
let first = B.HUB ? 'hub' : 'title', data = null;
if (L && !B.HUB) {
  if (L[0] === 'attract-start') { first = 'title'; B.pendingAttract = true; }
  else if (L[0] === 'hunt-dev') { first = 'hunt'; data = L[1]; B.pendingDev = true; }
  else { first = L[0]; data = L[1]; }
}
const boot = { title: B.TITLE.toUpperCase(), steps: [['Raising Hollow Creek', () => { B.loadWorld('hollow'); }], ['Calling the lodge regulars', () => { B.backdropVista(0); }]] };
game.start({ scenes, scene: first, data, boot });
})();
