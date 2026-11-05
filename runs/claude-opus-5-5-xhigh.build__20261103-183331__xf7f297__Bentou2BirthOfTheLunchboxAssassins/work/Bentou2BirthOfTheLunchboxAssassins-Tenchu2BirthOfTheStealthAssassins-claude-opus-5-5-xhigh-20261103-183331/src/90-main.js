/* ---- MAIN: the About / Credits text, the scenes, the boot, deep links (#m1, #trial, #workshop, #attract, #about,
 * #bento, #results), game.debug (the tests' and the checker's handle) and the start: the hub's card in a session, the
 * title otherwise ---- */
const ABOUT = {
  about: ['Bentou 2: Birth of the Lunchbox Assassins is an original isometric ninja stealth-action game, a playful riff on Tenchu 2: Birth of the Stealth Assassins (Acquire / Activision, PlayStation, 2000). It is not affiliated with them; no names, characters, levels, music or art are taken from it.',
    'The Sengoku era. In the shadow of Kokaku Castle, the Jubako-ya sells two-tier lunchboxes to the lord\'s household. One tier for the rice, one for the blade. Play Sojiro or Kaede through the night they become Lunchbox Assassins.',
    '# How to play', 'Stay in the shadows and out of sight cones; crouch in grass and bamboo; watch the Ki Gauge. Come up behind a guard and strike for a Silent Cut. The grappling hook is the only way onto the roofs. Pack your bento with tools before each mission.',
    '# Modes', 'Story (the Trial and three missions, each with a boss). Missions (replay any you have reached, as either apprentice). Shadow Trial (one night delivery against your own best ghost; the same round is the AI Hub\'s multiplayer). Workshop (the Mission Editor). Dev Mode is in the pause menu.'],
  source: ['# Date', '2026-11-03 18:33:31', '# Source', 'Tenchu 2: Birth of the Stealth Assassins (Acquire / Activision, PlayStation, 2000)', '# Plan', 'PLAN.md',
    '# Genre and perspective', 'Third-person ninja stealth-action with melee combat and boss duels; isometric third person, rotatable in 45-degree steps and zoomable (engine iso view; three-quarter as a Settings option)',
    '# Tech', 'my-3D2dge v0.85.2 (handoff package, patched: 9 changes listed in the credits), AI Hub Session Protocol v1 client 1.4.0 (unmodified), vanilla JavaScript in one HTML file; Node 24 and Playwright 1.63 (Chromium) for the tests',
    '# Art direction', 'The engine\'s native PS1-era pixel art (320 x 240 expanded), HD Humanoid rigs dressed for the period, canvas lighting (WebGPU lighting where available), procedural Japanese props, materials, roof caps and wall painters',
    '# Animation', 'The engine\'s procedural rigs, E.MOVES and E.ACTIONS, with new paired choreographies (ten Silent Cuts, the grapple, the drag) and joint post-processing poses (the ninja run, the wall hug, eating, sleeping, swimming, the bow)',
    '# Audio', 'Music on the engine\'s step sequencer in Japanese scales (Hirajoshi, In) with koto, shamisen, shakuhachi, fue, drone and taiko voices and layered mission songs; synthesized sound effects; Animalese-style gibberish voices from a WebAudio formant synth',
    '# Online', 'AI Hub Session Protocol v1, ghost mode, 1-4 players (Night Delivery); the Shadow Trial races your own best ghost on its own',
    '# Testing', 'One command (node tests/run.mjs: failures only and a one-line count, 384 checks): 23 suites in fresh node:vm pages driven by game.advance and game.debug, among them a TASK.md suite with one check a requirement, the stealth model measured in a real level, a scripted playthrough of the whole story, three attract loops and a mock hub; Playwright checks of the single file from file:// through real keys, mouse and a fake DualSense (the About pages and the phone\'s notice and Settings read off the real canvas and page, the audio sources and every request counted); the real AI Hub harness (2 players; 4 with latency 150, jitter 50, loss 5; the host leaving); node tools/audit.mjs maps each TASK.md item to the checks that show it; node tools/evidence.mjs plays every mission on the shipped file\'s own scripts and prints what the game reports; the engine\'s own checker (handoff/tools/check.mjs) on every mission: no errors, no look notes; screenshots only for the look',
    '# Research', 'The planner\'s research (the Wikipedia article on Tenchu 2; the engine\'s handoff docs; the AI Hub README and harness) plus the engine and hub docs read for this build; no web search during the build',
    '# Environment', 'Claude Code CLI (headless); Linux; browser unknown', '# Model', 'Anthropic, claude-opus-5-5, reasoning effort xhigh', '# Usage', 'API cost and tokens: unknown (not visible to the agent). Session time: about 3 hours 30 minutes (18:33 to about 22:05).'],
  testing: [
    '# How many issues did testing catch?', '28. The scripted tests caught 18 (in the game, the autopilot, the level data and one in the engine\'s Settings screen) and screenshot reviews caught 10 visual and layout issues. Each is listed in tests/ISSUES.md with how it was found and fixed.',
    '# How many would be considered critical issues / game breaking?', '4: guards attacking Tobei while he was still caged (the alarm bell could fail Kiri Lake), the water-gate lever taken by Tobei\'s wait / follow toggle (it blocked the escort), sleeping guards woken by their own snores (it broke the Sleep Dango and a Trial step), and the roof caps drawing over people standing on a roof (Kurogane\'s fight on the keep top was hidden).',
    '# What was the most helpful test you ran?', 'The scripted playthrough of the whole story (autopilot routes through all four missions, the ending, the credits, Kaede\'s run and the Night Delivery). Of the 78 failure lines the test command printed this session, it printed 37, more than four times any other suite, and it found 6 of the 28 issues (#2, #3 and #6 to #9 in tests/ISSUES.md), both Tobei bugs among them.',
    '# What was the least helpful test you ran?', 'The determinism test (one check: the same inputs, played twice, give the same game): it never failed in any of the 60 and more test runs of the session, so it caught nothing.'],
  engine: [
    '# What did you like most about the engine?', 'One height rule shared by collision, sight, reach and navigation: a TileMap with heights, E.Mover\'s parkour, E.sees, E.Suspicion and FlowField gave a working stealth sandbox almost at once, and exact fixed-step headless play (game.advance) made scripted playthroughs and a mock hub easy.',
    '# Did you get stuck or guess wrong?', 'Yes, a few times: a queue item lifted by a footprint sorts over actors standing on that block; r.overlay draws over everything, so a painted room has to go straight to r.ctx; E.Suspicion never decays while the target is seen, so a faint exposure still builds up; the Humanoid\'s blink draws Math.random in update (it matters on the hub\'s card); CSS zoom does not scale percentage heights; a custom input map has to list the menu actions itself.',
    '# What was the most important thing you had to build yourself?', 'The stealth layer: a baked light map and exposure (light x cover x motion x crouch), Shadow Sight and the Ki Gauge, a guard brain with bait, bodies, bells and reinforcements; and the mission runtime (objectives, triggers, checkpoints) that the campaign, the Workshop and the hub round share.',
    '# What was the hardest part about using the engine?', 'Depth-sorting big drawn roofs (kawara caps, hall roofs) against the actors in a height map of one column per cell, and making the HTML menus and the canvas HUD read at 10 feet.',
    '# What did you change in the engine, and why?', 'Nine small patches, marked BENTOU PATCH in the engine and listed on the Credits page: font glyphs; PlayStation symbols by default with an Xbox option; Humanoid masks, hats, spear, bow, club, an offhand blade and a sashimono; settings rows on custom Shell screens and a Dev group kept off the player\'s Settings; hover moves the focus; the 10-foot UI scale; music pluck, attack and release envelopes; a voice bus; the hub\'s Create + Options guard.',
    '# If you could change one thing about the engine, what would it be?', 'A first-class roof or canopy primitive (or a queue option) that sorts per cell, so actors standing on a block draw over its cap. Big drawn overhangs are the main gap for towns and castles.'],
  prompt: [
    '# What did you like most about this prompt?', 'Concrete deliverables with an exact done condition, a deep plan to follow, the one-command test rule (failures only), and a real hub harness to check against.',
    '# What was confusing?', 'The plan\'s file names carried another run\'s model and timestamp, and a short GameTitle (Bentou2) beside TASK.md\'s own [GameTitle-SOURCE] rule; the title rule (brainstorm 50 and draw with an RNG) next to a plan that had already drawn the title; and how to report usage when the agent cannot see its own token counts.',
    '# What was the hardest thing to do?', 'The scope: four missions with bosses, a mission editor, hub multiplayer, attract mode and dev tools in one pass, judging the look only from headless screenshots.',
    '# What would you change in this prompt?', 'Add a ranked must-have list (what to cut first if time runs short), give the plan this run\'s names, and say how to report usage when it is not visible.']
};
const PATCHES = ['1. PlayStation face symbols in the 5x7 pixel font', '2. Button symbols: PlayStation by default, Xbox as the option, on Settings', '3. Humanoid gear: cloth and oni masks, jingasa and kabuto hats, spear, bow and club, an offhand blade, a sashimono',
  '4. Shell: settings rows on custom screens; the Dev group kept off the player\'s Settings', '5. Shell: hovering a button moves the focus', '6. Shell: the 10-foot scale (--ui by window height and Interface size)',
  '7. Music: pluck, attack and release envelopes per track', '8. Audio: a voice bus with its own volume (Voices)', '9. The hub owns Create + Options: Options is ignored while Create is held in a session'];
const About = {};
About.text = ABOUT;
About.pages = () => [['About', ABOUT.about], ['Source Information', ABOUT.source], ['Testing Feedback', ABOUT.testing], ['Engine Feedback', ABOUT.engine], ['Prompt Feedback', ABOUT.prompt],
  ['Credits', ['Built by Claude (Anthropic, claude-opus-5-5) from PLAN.md.', 'Engine: my-3D2dge v0.85.2 (michaelcrosato/my-3d2dge), with these patches:'].concat(PATCHES, ['AI Hub Session Protocol v1, client 1.4.0 (michaelcrosato/ai-hub), unmodified.', 'All art, music, sound and voices are generated in code. No image or audio files.', 'An original game inspired by Tenchu 2: Birth of the Stealth Assassins; not affiliated.'])]];
About.creditLines = () => ['# BENTOU 2', 'Birth of the Lunchbox Assassins', '', '# Story, design, code, art, music', 'Claude (Anthropic, claude-opus-5-5)', 'from PLAN.md', '', '# Engine', 'my-3D2dge v0.85.2', 'by michaelcrosato', '', '# Multiplayer', 'AI Hub Session Protocol v1',
  '', '# Cast', 'Sojiro  ·  Kaede', 'Granny Oshima', 'Lord Mibu Takanori', 'Chamberlain Kurogane Dosetsu', 'Magistrate Kanemori', 'Gonroku the Iron Ox', 'Hotaru of the Red Lantern', 'Tobei the courier', 'Brother Ittetsu', 'Ume, Kiku, Masa', 'and Big Daikon',
  '', '# Inspired by', 'Tenchu 2: Birth of the Stealth Assassins', '(Acquire / Activision, 2000)', 'Not affiliated', '', '', 'Seen by none.', 'Fed by all.', '', ''];
B.About = About; B.ABOUT = ABOUT;

/* ---- the scenes ---- */
const SCENES = Object.assign({ mission: B.missionScene, story: B.storyScene, attract: B.attractScene, workshop: B.workshopScene }, B.menuScenes, B.storyScenes, B.hubScenes);
/* ---- game.debug: what tests and tools read and do ---- */
const snapHero = h => h && { x: +h.x.toFixed(1), y: +h.y.toFixed(1), z: +h.z.toFixed(1), hp: +h.hp.toFixed(1), state: h.action ? h.action.name : h.dead ? 'dead' : h.swim ? (h.dive ? 'dive' : 'swim') : h.hug ? 'hug' : h.drag ? 'drag' : h.crouch ? 'crouch' : 'stand',
  crouch: !!h.crouch, swim: !!h.swim, dive: !!h.dive, breath: +h.breath.toFixed(2), stamina: Math.round(h.stamina || 0), tool: Hero.slot(h) && Hero.slot(h).tool, stacks: h.bento.map(c => c ? c.tool + ':' + c.n : null), char: h.char, onGround: h.onGround };
game.debug = {
  snapshot() {
    const M = B.M, s = { scene: game.sceneName, paused: game.paused, mode: M && M.mode, mission: M && M.missionId, t: M ? +M.t.toFixed(2) : 0 };
    if (M && game.scene && game.scene.isMission) Object.assign(s, { hero: snapHero(M.hero), guards: M.guards.map(g => ({ id: g.id, type: g.type, x: Math.round(g.x), y: Math.round(g.y), z: Math.round(g.z), state: g.asleep || g.status.sleep > 0 ? 'sleep' : g.status.eat > 0 ? 'eat' : g.mind ? g.mind.state : 'calm', level: g.mind ? +g.mind.level.toFixed(2) : 0, alive: g.alive, vis: g.vis })),
      ki: Perception.ki, light: +Perception.lightNow.toFixed(2), exposure: +(Perception.exp || 0).toFixed(2), detections: M.stats.detections, silentCuts: M.stats.silentCuts, kills: M.stats.kills, civiliansHarmed: M.stats.civiliansHarmed,
      objectives: Object.fromEntries(M.objectives.map(o => [o.id, o.state])), score: M.ended && M.result === 'win' ? Score.story(M, (B.get('mission', M.missionId) || {}).par || 600).total : null,
      boss: M.bosses[0] ? { id: M.bosses[0].id, hp: Math.round(M.bosses[0].hp), phase: M.bosses[0].phase, active: M.bosses[0].active, defeated: M.bosses[0].defeated } : null, escort: M.escort ? { hp: Math.round(M.escort.hp), caged: M.escort.caged, follow: M.escort.follow, wait: M.escort.wait } : null,
      timer: M.timer ? Math.round(M.timer.t) : null, flags: Object.assign({}, M.flags), heightened: M.heightened, alarm: M.alarm.rung, ended: M.ended, result: M.result, failed: M.failed, over: !!M.overMenu });
    if (game.sceneName === 'attract') s.attract = { vignette: Attract.v && Attract.v.id, beat: Autopilot.i, loops: Attract.loops };
    if (Hub.phase !== 'off') s.hub = { phase: Hub.phase, resulted: Hub.resulted, ghosts: Object.keys(Hub.ghosts).length };
    if (game.sceneName === 'workshop' && Ed.L) s.editor = { name: Ed.L.name, size: Ed.L.size, cursor: [Ed.cx, Ed.cy], cat: ED_CATS[Ed.cat].id, guards: Ed.L.guards.length, problems: Ed.problems.length };
    return s;
  },
  teleport(x, y, z, f) { const h = B.M && B.M.hero; if (!h) return; Object.assign(h, { x, y, z: z === undefined ? B.M.world.map.groundAt(x, y) : z, vx: 0, vy: 0, vz: 0, onGround: true, action: null }); if (f !== undefined) h.facing = f; h.swim = false; h.dive = false; h.hug = null; game.cam.snap = true; },
  cell(cx, cy) { const M = B.M; return M ? { ch: M.world.rows[cy][cx], h: M.world.map.height(cx, cy), light: M.world.lightAt(cellC(cx), cellC(cy)) } : null; },
  load(id, o = {}) { game.go('mission', Object.assign({ mission: id, mode: o.mode || 'story', char: o.character || o.char || 'sojiro', loadout: o.loadout, cheats: o.cheats }, o.M ? { M: o.M } : {}), { fade: 0 }); },
  go(scene, data) { game.go(scene, data, { fade: 0 }); },
  tune(k, v) { return game.settings.set(k, v); }, resetTune() { game.settings.reset('Dev'); },
  cheat(name, on = true) { if (B.M) B.M.cheats[name] = on; }, give(tool, n = 1) { return B.M ? Hero.give(B.M.hero, tool, n) : 0; },
  kill(id) { const a = B.M && Mission.find(B.M, id); if (a) { a.alive = false; a.hp = 0; } }, alert(id) { const M = B.M; if (!M) return; for (const g of M.guards) if ((id === 'all' || g.id === id) && g.mind) { g.mind.level = 1.2; g.mind.last = { x: M.hero.x, y: M.hero.y, z: M.hero.z }; g.target = M.hero; } },
  calm() { if (B.M) for (const g of B.M.guards) if (g.mind) { g.mind.reset(); g.target = null; } }, complete(id) { const M = B.M, o = M && M.objectives.find(o => o.id === id); if (o) Mission.setObj(M, o, 'done'); },
  win(rank = 'Grand Kaiseki') { const M = B.M; if (!M) return; M.forceRank = rank; for (const o of M.objectives) if (!o.optional) o.state = 'done'; Mission.complete(M); }, fail(why) { if (B.M) Mission.fail(B.M, why || 'Failed.'); },
  autopilot(beats, name) { if (!B.M) return; B.M.autopilot = true; Autopilot.load(beats, name); },
  hash() { const M = B.M; if (!M) return 0; const s = JSON.stringify([M.hero.x, M.hero.y, M.hero.z, M.hero.hp, M.guards.map(g => [Math.round(g.x * 10), Math.round(g.y * 10), g.alive, g.mind && g.mind.state]), M.stats]); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
};
game.stateHash = () => { const M = B.M; return M && M.hero ? [Math.round(M.hero.x), Math.round(M.hero.y), Math.round(M.hero.hp)] : [game.sceneName]; };
B.Hub = Hub;
/* ---- the boot: real work behind the boot screen (every level checked once, the cast dressed), then the start ---- */
const BOOT_STEPS = [
  ['Steaming the rice', () => { for (const id of ['training', 'm1', 'm2', 'm3', 'delivery']) { const L = B.get('level', id); if (!L || L.rows.length !== L.size[1] || L.rows.some(r => r.length !== L.size[0])) throw new Error('level ' + id + ' rows do not match its size'); } }],
  ['Lacquering the boxes', () => { titleRig('sojiro'); titleRig('kaede'); }],
  ['Sharpening the knives', () => { for (const k of ['sojiro', 'kaede', 'granny', 'takanori']) Cutscene.rig(k, 'sojiro'); }]
];
const firstScene = () => {
  if (HUBACTIVE) return 'hubCard';
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1);
  return { attract: 'attract', workshop: 'workshop', about: 'about', title: 'title' }[h] || 'title';
};
game.start({ scenes: SCENES, scene: firstScene(), boot: { title: 'BENTOU 2', version: B.version, steps: BOOT_STEPS, messages: ['Folding the boxes', 'Counting the bells', 'Oiling the hinges', 'Feeding the hound'] } });
const deepLink = () => {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1); if (!h || HUBACTIVE) return;
  const [a, b] = h.split('/');
  if (B.get('mission', a)) game.go('mission', { mission: a, mode: a === 'delivery' ? 'trial' : 'story', char: b === 'kaede' ? 'kaede' : 'sojiro' }, { fade: 0 });
  else if (a === 'trial') game.go('mission', { mission: 'delivery', mode: 'trial', char: 'sojiro' }, { fade: 0 });
  else if (a === 'bento') Flow.bento(b || 'm1', 'sojiro', 'missions');
  else if (a === 'story') Cutscene.play(b || 'prologue', 'sojiro', () => game.go('title'));
  else if (a === 'chars') game.go('charSelect', { then: 'story' }, { fade: 0 });
  else if (a === 'missions') game.go('missions', { char: 'sojiro' }, { fade: 0 });
};
Promise.resolve(game.booted).then(() => { if (HUBACTIVE) Hub.boot(); else deepLink(); });
if (typeof window !== 'undefined') window.__BENTOU = B;
