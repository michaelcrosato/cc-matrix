// The Launch: on rails, 80-100 s. The island is coming down. The Dame drives; Max stands on the stern deck
// with free aim. Then dawn, the ending, a final Claim Form, and the on-hold jingle over black.
import { buildModel, PALETTE, THREE } from '../../../pixel-engine.js';
import { S } from '../dialogue.js';
import { MapInfo } from '../../game/mapPaint.js';
import { MODELS } from '../../models/index.js';
import { app } from '../../core/app.js';
import { SONGS } from '../../audio/songs.js';
import { setupLaunch, stepLaunch } from '../../game/launch.js';

const M = new MapInfo('deck');
const X = (c) => M.x(c); const Z = (r) => M.z(r);

const launchCut = (area) => [
  { cam: [[8, 4, 18], [0, 1.4, 5], 44], to: [[6, 3.6, 13], [0, 1.2, 4]] },
  { say: ['dame', 'Get in. I am driving. You are the one who shoots at things.'], hold: 0.8 },
  { say: ['max', 'Do you have a licence?'] },
  { say: ['dame', 'I have a shipping line.'], hold: 0.8 },
  { cue: () => { area.ctx.audio.play('stonecrash'); area.ctx.engine.shake.add(0.8); } },
  { cam: [[0, 3, 12], [0, 6, 60], 42] },
  { wait: 1.2 },
];

const endingCut = (area) => {
  const { ctx } = area;
  const P = area.player;
  const dame = area.dameAtWheel;
  const limpet = buildModel('limpet', { catalog: MODELS }).object;
  limpet.scale.setScalar(1.4);
  limpet.position.set(2.12, -0.45, 2);
  limpet.rotation.z = -1.5; // its back to the hull, looking out
  area.endLimpet = limpet;
  ctx.scene.add(limpet);
  return [
    { cue: () => { P.teleport(X(4.5) + 0.3, 0, Z(10), Math.PI); dame.root.position.set(X(4.5) - 0.9, 0, Z(9)); dame.root.rotation.y = 0; dame.play('DameScold'); ctx.engine.setSunDirection([-0.8, 0.35, -0.5]); } },
    { cam: [[5, 2.2, Z(15)], [0, 1.2, Z(9)], 40], to: [[3.8, 1.9, Z(14)], [0, 1.2, Z(9)]] },
    { wait: 0.6 },
    { say: S.ending[0] },
    { cam: [[X(4.5) + 1.6, 1.4, Z(9)], [X(4.5) + 0.3, 1.3, Z(10)], 32] },
    { say: S.ending[1] },
    { cam: [[X(4.5) + 0.6, 1.2, Z(8.3)], [X(4.5) - 0.9, 1.0, Z(9)], 28] },
    { say: S.ending[2], hold: 1.3 },
    { cue: () => ctx.audio.play('telegraph') },
    { cam: [[4, 3, Z(16)], [0, 1.2, Z(7)], 38] },
    { say: S.ending[3], hold: 0.9 },
    { say: S.ending[4] },
    { say: S.ending[5], hold: 1.2 },
    { cue: () => {
      app.mix.play(SONGS.onhold, 'onhold', 0.3);
      // Low sun along the waterline, just enough to see what's riding home with you.
      ctx.lights.request({ position: [3.8, 0.6, 2.8], color: PALETTE.sand, intensity: 6, radius: 6, priority: 5 });
    } },
    { cam: [[6.6, 0.7, 4.2], [2.3, -0.4, 2], 22], to: [[5.4, 0.45, 3.6], [2.3, -0.38, 2]] },
    { wait: 1 },
    { cue: () => { ctx.tweens.to(limpet.rotation, { y: 0.8 }, { duration: 1.6 }); ctx.tweens.to(limpet.scale, { y: 1.9 }, { duration: 1.8, ease: 'outSine' }); ctx.audio.play('limpetSkitter'); } },
    { wait: 2.8 },
  ];
};

export const launch = {
  id: 'launch',
  title: 'THE LAUNCH',
  chapter: 3,
  map: 'deck',
  mood: 'storm',
  music: 'boss',
  startYaw: 0,
  water: false,
  noFathom: true,
  noDame: true,
  ambience: [['seaLoop', 0.7]],
  theme: { floors: { '=': 'wet-planks' } },
  build: {},
  setup: setupLaunch,
  fixed: stepLaunch,
  entries: {
    ending: {
      mood: 'dawn', music: 'dawn', yaw: 180,
      beats: [{ id: 'ending', steps: [
        { run: (a) => { a.setObjective(''); a.rolling = false; a.world.setMood('dawn'); a.world.addDawnSky(); a.ctx.scene.background = new THREE.Color(PALETTE.sky); a.hideHudAll = true; } },
        { cut: 'ending' },
        { run: (a) => { a.hideHud = true; a.finishChapter(null, null, { title: 'FINAL CLAIM FORM', final: true, toCredits: true }); } },
      ] }],
    },
  },
  cuts: { launch: launchCut, ending: endingCut },
  botReflex(bot, it, dt) {
    const a = bot.area;
    const P = a.player;
    if (!a.rolling) return false;
    if (P.mag <= 0 && P.reloadT <= 0 && P.store.case.count(P.weapon.ammo) > 0) { it.reload = true; return true; }
    if (P.mag <= 0 && P.reloadT <= 0 && bot.switchWeapon(it, P)) return true;
    if (P.hp < P.maxHp * 0.45 && bot.hasHerb(P)) it.heal = true;
    if (a.interact.current?.prio === 0) { it.action = true; return true; }
    // Mines first, then boats, then limpets.
    const mine = a.mines.filter((m) => m.alive && m.pos.z < 8 && m.pos.z > -40).sort((p, q) => q.pos.z - p.pos.z)[0];
    const boat = a.boatsL.find((b) => !b.e.dead && b.e.z < 28);
    const lim = a.enemies.find((e) => !e.dead && e.d.crawler);
    if (P.reloadT > 0 || P.mag <= 0) return true;
    it.aim = true;
    if (lim && Math.hypot(lim.x - P.x, lim.z - P.z) < 3) bot.aimAt(it, lim, 'torso', dt);
    else if (mine) bot.aimAtPoint(it, mine.pos, dt);
    else if (boat) bot.aimAt(it, boat.e, 'torso', dt);
    else { it.setYaw = a.cam.yaw; return true; }
    if (bot.onTarget(P, 0.08) && P.fireT <= 0) { it.fire = true; it.firePressed = true; }
    return true;
  },
  beats: [
    { id: 'launchRun', steps: [
      { run: (a) => { a.player.teleport(X(4.5), 0, Z(12), Math.PI); a.cam.yaw = Math.PI; } },
      { cut: 'launch' },
      { run: (a) => {
        a.rolling = true;
        a.setObjective('SHOOT THE MINES. SHOOT THE BOATS. KICK THE LIMPETS');
        a.showHint('FREE AIM. THE INSURED IS DRIVING', 'aim', 6);
        a.radioCall([['pym', 'THE ISLAND IS NOW A TOTAL LOSS. WE ARE DELIGHTED FOR YOU.']], false);
      } },
      { until: (a) => a.run.flag('launchDone') },
    ] },
  ],
};
