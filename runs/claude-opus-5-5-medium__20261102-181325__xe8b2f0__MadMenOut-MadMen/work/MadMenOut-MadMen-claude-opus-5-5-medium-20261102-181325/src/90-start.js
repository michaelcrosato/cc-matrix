/* MAD MEN OUT — the start: the scenes, the attract mode's wrapper (any real input ends it), the AI Hub's stop, the
 * debug handle for tests and tools, and the boot. */
const SCENES = { title: titleScene, office: officeScene, brainstorm: brainstormScene, pitch: pitchScene, vignette: vignetteScene, credits: creditsScene,
  about: aboutScene, gaEnd: gaEndScene, vsJoin: vsJoinScene, hubWait: hubWaitScene };
for (const name in SCENES) {
  const sc = SCENES[name], up = sc.update, dr = sc.draw;
  sc.update = function (dt) {
    if (HUB && hubState.ended) return;   // after the hub's end: no input, no sound, nothing sent
    if (HUB && hubState.started && !hubState.reported) {   // the standing, about once a second: billings so far
      hubState.progT = (hubState.progT || 0) - dt;
      if (hubState.progT <= 0) { hubState.progT = 1; HUB.progress({ score: GA.total[0], label: money(GA.total[0]) + ' - account ' + Math.min(3, GA.i + 1) + '/3' }); }
    }
    if (AT.on) { demoTick(dt); if (!AT.on) return; }
    return up.call(this, dt);
  };
  sc.draw = function (r) {
    dr.call(this, r);
    if (AT.on) r.overlay(g => { const on = Math.floor(game.real * 1.5) % 2 === 0; panel(g, r.W / 2 - 90, r.H - 40, 180, 16, { alpha: .85 }); txt(g, on ? 'DEMO  ·  PRESS ANY BUTTON' : 'MAD MEN OUT', r.W / 2, r.H - 35, COL.gold, { align: 'center' }); });
  };
}
game.debug = {
  snapshot: () => ({ scene: game.sceneName, day: S.day, clock: clockStr(S.minute), minute: S.minute, pitchAt: S.pitchAt, composure: S.composure, haze: S.haze,
    insights: S.insights.slice(), intel: S.intel.slice(), deck: S.deck.slice(), billings: S.billings, won: S.won.slice(), flags: Object.keys(S.flags).filter(k => S.flags[k]),
    talking: talk.open, dialogName: talk.name, hero: OF.hero ? [Math.round(OF.hero.x), Math.round(OF.hero.y)] : null, room: OF.room, prompt: OF.prompt && OF.prompt.label,
    pitch: { phase: PT.phase, interest: PT.interest, shown: PT.shown, left: PT.left.slice(), verdict: PT.verdict }, attract: AT.on, idle: Math.round(TI.idle * 10) / 10,
    view: game.view && game.view.id, gauntlet: { mode: GA.mode, i: GA.i, total: GA.total.slice(), done: GA.done }, hub: { ...hubState, info: !!hubState.info }, errors: game.errors.length }),
  teleport(x, y) { if (OF.hero) Object.assign(OF.hero, { x, y, vx: 0, vy: 0 }); },
  near(id) { const n = OF.npcs.find(n => n.id === id) || OF.spots.find(s => s.id === id); if (!n) return false; const a = Math.atan2(OF.hero.y - n.y, OF.hero.x - n.x) || 0;
    let best = null; for (let k = 0; k < 16; k++) { const t = a + k * Math.PI / 8, x = n.x + Math.cos(t) * 16, y = n.y + Math.sin(t) * 16; if (OF.map.walkable(Math.floor(x / T), Math.floor(y / T))) { best = [x, y, t]; break; } }
    if (!best) best = [n.x, n.y + 16, Math.PI / 2];
    this.teleport(best[0], best[1]); OF.hero.facing = best[2] + Math.PI; return true; },
  wake() { DEV.real = 1; },
  S, OF, PT, BR, GA, AT, VG, talk, DAYS, CLIENTS, CARDS
};
game.start({ scenes: SCENES, scene: HUB ? 'hubWait' : 'title',
  boot: { title: 'MAD MEN OUT', version: '1.0', steps: [['Building the eleventh floor', () => buildOffice()], ['Hiring the staff', () => Object.keys(CAST).forEach(rigOf)]],
    messages: ['Pouring the rye', 'Sharpening the pencils', 'Hiding the past', 'Polishing the pitch'] } });
if (HUB) hubBoot();
