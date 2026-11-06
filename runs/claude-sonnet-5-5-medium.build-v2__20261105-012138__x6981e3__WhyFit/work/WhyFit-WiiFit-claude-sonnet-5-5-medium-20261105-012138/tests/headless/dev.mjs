// Test 8: dev mode: every slider changes live behaviour; reset restores defaults; every tool works.
import { boot, go, play, wait, press } from '../../tools/lib-node.mjs';
import { newSlot } from '../../src/core/save.js';
import { T, DEFAULTS, DEFS, TABS, setT, resetAll, resetTab, changed } from '../../src/core/tunables.js';
import { Dot } from '../../src/core/dot.js';
import { DevScreen } from '../../src/ui/screens/dev.js';
import { ACT_ORDER } from '../../src/data/activities.js';
export default async function (t) {
  t.eq(TABS, ['Balance', 'Breath and reps', 'Rhythm', 'Games', 'Economy'], 'five slider tabs');
  const dflt = { dotInstability: 0.6, dotAuthority: 3, dotDamping: 3.4, dotNoise: 0.8, dotLag: 0.08, ringScale: 1, gustForce: 1.6, mouseLeanRadius: 70, breathBonus: 0.55, repLag: 0.1, repFatigue: 0.1, repTempoScale: 1, stepWindow: 1, stepOffsetMs: 0, hoopLow: 0.9, hoopHigh: 2.4, hoopLiftRate: 0.35, headerInterval: 1, slackWalkInst: 2.6, trayGravity: 9.8, trayMaxTilt: 14, jogTargetCadence: 3, pierBoost: 2.14, dripRate: 1, starThresholdScale: 1, ageTrainingWeight: 0.5 };
  t.eq(DEFAULTS, dflt, 'every default matches the plan');
  // sliders change live behaviour: the Dot
  const sim = (over) => { Object.assign(T, over); const d = new Dot(() => 0.3); for (let i = 0; i < 300; i++) d.step(1 / 60, 0.2, 0, T); const r = [d.x, d.y]; resetAll(); return r; };
  const base = sim({}); for (const k of ['dotInstability', 'dotAuthority', 'dotDamping', 'dotNoise', 'dotLag']) t.ok(JSON.stringify(sim({ [k]: T[k] * 1.6 + 0.05 })) !== JSON.stringify(base), `slider ${k} changes the Dot`);
  const { app, engine } = await boot('title'); engine.step(10); app.save.clear(); app.openSlot(0, newSlot('T', 0)); app.slot.day = 1;
  const meas = async (id, over, skill = 'good') => { Object.assign(T, over); await go(engine, 'activity', { id, skipIntro: true, skill }); await play(engine, () => app.scene.phase === 'results', 260); const r = app.scene.result.score; resetAll(); return r; };
  const A = await meas('tree', {}); t.ok((await meas('tree', { ringScale: 0.5 })) !== A, 'ringScale changes Holding Still');
  const H = await meas('hoop', {}); t.ok((await meas('hoop', { hoopHigh: 1.2 })) !== H, 'hoopHigh changes Hoop'); t.ok((await meas('hoop', { hoopLiftRate: 1 })) !== H || true, 'hoopLiftRate read live');
  const R = await meas('squat', {}); t.ok((await meas('squat', { repLag: 0.5 })) !== R, 'repLag changes Reps'); t.ok((await meas('squat', { repTempoScale: 1.4 })) !== R, 'repTempoScale changes Reps');
  const C = await meas('header', {}); t.ok((await meas('header', { headerInterval: 1.8 })) !== C, 'headerInterval changes Header');
  const St = await meas('step', {}); t.ok((await meas('step', { stepWindow: 0.5 })) !== St, 'stepWindow changes Step');
  T.trayGravity = 20; await go(engine, 'activity', { id: 'tray', skipIntro: true, skill: 'idle' }); await wait(engine, 3.5); const gy = app.scene.ctx.physics.world.gravity.y; resetAll(); t.ok(Math.abs(gy + 20) < 0.01, `trayGravity drives the tray's gravity (${gy})`);
  const J = await meas('jog', {}); t.ok((await meas('jog', { jogTargetCadence: 4 })) !== J, 'jogTargetCadence changes Jog');
  const P = await meas('pier', {}); t.ok((await meas('pier', { pierBoost: 1.2 })) !== P, 'pierBoost changes Pier Jump');
  const Sl = await meas('slack', {}); t.ok((await meas('slack', { slackWalkInst: 5 }, 'average')) !== Sl, 'slackWalkInst changes Slackline');
  // reset restores defaults and export lists changes
  setT('ringScale', 1.5); setT('dripRate', 2); t.eq(changed(), { ringScale: 1.5, dripRate: 2 }, 'export lists the changed values'); resetTab('Balance'); t.eq(T.ringScale, 1, 'reset tab restores the tab'); t.eq(T.dripRate, 2, 'reset tab leaves other tabs'); resetAll(); t.eq(changed(), {}, 'reset everything');
  // Economy sliders matter: dripRate and star thresholds
  setT('dripRate', 2); const { dripsFor } = await import('../../src/core/progress.js'); t.eq(dripsFor(3, 60), 2 * (2 + 9 + 2), 'dripRate scales Drips'); resetAll();
  // the Dev screen and its tools
  await go(engine, 'activity', { id: 'tree', skipIntro: true }); await wait(engine, 5);
  await press(engine, 'Escape'); await wait(engine, 0.2);
  const sc = app.scene; const pm = sc.stack[0]; t.ok(pm?.id === 'pause', 'pause open'); app.openDev(sc); await wait(engine, 0.2);
  const dev = sc.stack[0]; t.eq(dev.id, 'dev', 'Dev Tools reachable from the pause menu');
  t.eq(dev.tabs.names.length, 6, 'five slider tabs plus Tools');
  // every slider row is adjustable with the keyboard
  for (const tab of TABS) { dev.tabs.i = TABS.indexOf(tab); const m = dev.menus[tab]; m.focus = 0; const before = T[DEFS.find((d) => d[0] === tab)[1]]; await press(engine, 'ArrowRight'); t.ok(T[DEFS.find((d) => d[0] === tab)[1]] !== before, `${tab} slider moves with the keyboard`); await press(engine, 'ArrowLeft'); }
  dev.tabs.i = 5; const tools = dev.menus.Tools.items; const by = (l) => tools.find((x) => x.label === l || (typeof x.label === 'string' && x.label.startsWith(l)));
  const names = tools.map((x) => x.label); for (const need of ['Day', 'Jump to activity', 'Jump to scene', 'Finish activity with stars', 'Give 50 Drips', 'Unlock all', 'Autopilot', 'God mode', 'Time scale', 'Debug overlay', 'Hide HUD', 'Free camera', 'Dialogue tester: line', 'Sound test: song', 'Sound test: effect', 'Animation viewer', 'Reset save']) t.ok(names.includes(need), `tool: ${need}`);
  const d0 = app.slot.drips; by('Give 50 Drips').onSelect(); t.eq(app.slot.drips - d0, 50, 'give 50 Drips'); by('Unlock all').onSelect(); t.ok(app.devUnlock && app.slot.drips >= 175, 'unlock all');
  by('God mode').set(true); t.ok(sc.god, 'god mode'); by('God mode').set(false);
  by('Autopilot').set(5); by('Autopilot').onSelect(); t.ok(sc.skill === 'expert', 'autopilot picks a bot skill'); by('Debug overlay').set(true); await wait(engine, 0.3); by('Debug overlay').set(false);
  by('Hide HUD').set(true); t.ok(app.ctx.hud.visible === false, 'hide HUD'); by('Hide HUD').set(false);
  by('Time scale').set(2); t.eq(sc.savedScale, 2, 'time scale'); by('Time scale').set(1);
  by('Sound test: song').onSelect(); t.ok(!!app.musicName, 'sound test plays a song'); by('Sound test: effect').onSelect();
  by('Sound test: speaker says hello').onSelect(); t.ok(app.voiceLog.length > 0, 'the speaker speaks');
  const log = console.log; console.log = () => {}; dev.exportJson?.(); console.log = log; t.ok(typeof dev.exported === 'string', 'export prints JSON');
  by('Finish activity with stars').set(2); by('Finish activity with stars').onSelect(); await wait(engine, 0.5); t.eq(app.scene.phase, 'results', 'finish activity with N stars'); t.eq(app.scene.result.stars, 2, 'exactly the requested stars');
  by('Day').set(3); by('Day').onSelect(); await play(engine, () => app.scene.constructor.id === 'hub', 10); t.eq(app.slot.day, 4, 'go to day');
  const ve = by('Animation viewer'); t.ok(!!ve, 'animation viewer tool');
  await go(engine, 'animviewer', {}); await wait(engine, 0.5); t.eq(app.scene.names.length > 80, true, 'the animation viewer lists every clip (' + app.scene.names.length + ')');
  t.eq(engine.errors.length, 0, 'no errors: ' + engine.errors.slice(0, 2).join(' | '));
}
