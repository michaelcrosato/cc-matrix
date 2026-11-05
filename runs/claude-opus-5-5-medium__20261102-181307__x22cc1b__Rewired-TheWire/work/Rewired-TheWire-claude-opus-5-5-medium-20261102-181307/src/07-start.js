// ============================================================================================================
// REWIRED • 07 start: the scenes, the boot, the test handle.
// ============================================================================================================
street.pausable = !IN_HUB;
if (IN_HUB) { office.pausable = false; wire.pausable = false; stash.pausable = false; }

// the chase demo drives its detective with the chase bot
const _streetSetup = streetSetup;
streetSetup = function (mode, data) { _streetSetup(mode, data); if (mode === 'chasedemo') { ST.demo = true; ST.bot = chaseBot; } };

// in a hub round, nobody moves before the hub's clock reaches zero
const _streetUpdate = street.update;
street.update = function (dt) {
  if (IN_HUB && ST.mode === 'shift' && !(HUB.time() >= 0)) { const p = P1(); game.focus(p.mover.x, p.mover.y, 14); for (const q of ST.players) q.rig.update(dt, q.mover.rigState({})); return; }
  if (HB.ended) return;
  _streetUpdate.call(this, dt);
};
const _drawStreetHud = drawStreetHud;
drawStreetHud = function (r) {
  _drawStreetHud(r);
  if (IN_HUB && ST.mode === 'shift') {
    const t = HUB.time();
    if (!(t >= 0)) r.overlay(g => { const s = isFinite(t) ? String(Math.ceil(-t / 1000)) : 'GET READY'; E.font.title(g, s, r.W / 2, r.H / 2 - 30, { scale: 4, align: 'center', colors: ['#ffffff', '#d8b860'] }); E.font.text(g, 'Photograph every hand-to-hand. Don\'t get burned.', r.W / 2, r.H / 2 + 12, '#e8e4dc', { align: 'center', shadow: '#000', outline: false }); });
  }
};

const SCENES = { title, card, street, office, wire, stash, results, gameover, montage, about, hubwait };
// deep links for testing: #street/corner, #wire, #office, #stash, #ending, #shift, #demo, #about
function deepLink() {
  if (!HAS_DOM || !location.hash) return null;
  const h = location.hash.slice(1).split('/');
  const map = { corner: ['street', { mode: 'corner' }, 1], reup: ['street', { mode: 'reup' }, 4], coldopen: ['street', { mode: 'coldopen' }, 0], shift: ['street', { mode: 'shift', seconds: 180 }, 0],
    office: ['office', {}, 2], wire: ['wire', {}, 3], stash: ['stash', {}, 4], ending: ['office', { mode: 'ending' }, 5], about: ['about', {}, 0], demo: ['street', { mode: 'demo', demo: true }, 0], chase: ['street', { mode: 'chasedemo', demo: true }, 0], montage: ['montage', {}, 5] };
  const k = h[0] === 'street' ? h[1] : h[0];
  const d = map[k]; if (!d) return null;
  const st = h[0] === 'street' ? h[2] : h[1]; if (st) d[1].stage = +st;
  return d;
}

game.debug = {
  snapshot: () => ({ scene: game.sceneName, mode: ST.mode, stage: ST.stage, chapter: CASE.chapter, evidence: CASE.evidence.slice(), intel: CASE.intel.slice(), heat: CASE.heat, violations: CASE.violations, pc: CASE.pc,
    player: ST.players[0] ? [Math.round(ST.players[0].mover.x), Math.round(ST.players[0].mover.y)] : null, sale: ST.sale ? ST.sale.phase : null, score: ST.score, wire: WR.state, board: BOARD.open, demo: DEMO.on, talk: talk.open,
    sus: ST.npcs.kevo ? Math.round(Math.max(ST.npcs.kevo.sus, ST.npcs.dre.sus) * 100) / 100 : 0, touchOnly: DEV.touchOnly }),
  teleport(x, y) { const p = ST.players[0]; if (p) { p.mover.x = x; p.mover.y = y; p.mover.vx = p.mover.vy = 0; } },
  ST, CASE: () => CASE, setCase: c => { CASE = c; }, fresh: () => { CASE = freshCase(); }, WR, BOARD, OF, SH, DEMO, TI, STREET, EVIDENCE, CALLS, seedCaseFor, startChapter, talk, chaseBot, P1, takePhoto, inFrame, hubResult, HB, INV, DEV
};

const dl = deepLink();
if (dl) { CASE = freshCase(); seedCaseFor(Math.max(1, dl[2])); if (dl[2] === 0) CASE.chapter = 0; }
game.start({ scenes: SCENES, scene: IN_HUB ? 'hubwait' : dl ? dl[0] : 'title', data: dl ? dl[1] : undefined,
  boot: { title: TITLE, steps: [['Wiring the block', () => { STREET.map.find && STREET.map.cell(0, 0); }], ['Pulling the tapes', () => { hubSetup(); }]] } });
if (dl && game.sceneName !== dl[0]) game.go(dl[0], dl[1], { fade: 0 });
