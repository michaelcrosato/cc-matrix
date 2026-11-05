// S7.start: make the game, boot the 3D side, wire the sim to the scenes, the pause menu and saves, and the debug handle.
S7.start = async function (opts) {
  const E = S7.E, W3 = opts.World3D;
  const cfg = {
    canvas: 'screen', res: 'ps1', expand: true, bg: null, input: S7.INPUT, id: 'skiller7',
    menu: {
      controls: S7.CONTROLS, quit: 'title',
      settings: [...W3.SETTINGS.map(s => s.key === 'filter3d' ? Object.assign({}, s, { value: 'cel' }) : s),
        { key: 'difficulty', label: 'Difficulty', group: 'Game', value: 'Normal', options: ['Easy', 'Normal', 'Hard'], help: 'Easy: weaker blasts. Hard: sturdier Whiteouts and harder blasts.' },
        { key: 'aimAssist', label: 'Mouse aim without capture', group: 'Game', value: true, help: 'If the mouse is not captured, the pointer near the screen edge turns the view.' }],
      items: [['FIELD NOTES', () => { S7.game.resume(); if (['rail', 'junction'].includes(S7.st.mode)) UI.push(new S7.screens.Notes(0)); }], ['DEV MODE', () => { S7.game.resume(); UI.push(new S7.screens.Dev()); }], ['ABOUT', () => { S7.game.resume(); UI.push(new S7.screens.About(false)); }]],
      saves: {
        version: 1,
        write: () => ({ data: S7.sim.serialize(), place: S7.graph().A.title + ' / ' + S7.graph().A.sub, level: S7.st.pins.length + ' pins' }),
        read: save => { S7.newState({ difficulty: save.data.difficulty }); S7.sim.deserialize(save.data); S7.st.fadeIn = .6; UI.stack.length = 0; S7.game.go('play'); }
      }
    }
  };
  const game = S7.game = new E.Game(cfg);
  UI.game = game; S7.bindScenes(game);
  game.saves.canSave = false;
  S7.audio.defineAll(game.audio); S7.audio.wire();
  S7.newState({ difficulty: 'normal' });
  const hubInfo = await S7.hub.init();
  const steps = [['The 3D engine', () => S7.pres.boot(W3, game)]];
  if (hubInfo) steps.push(['The Black Run', () => { S7.sim.startEcho({ ghost: null, countdown: 3 }); S7.pres.load('01C'); }], ['Ready', () => { try { window.AIHub.ready(); } catch (e) { /* no hub */ } }]);
  else steps.push(['Room 7', () => { S7.sim.loadArea('room7', 'c'); S7.pres.load('room7'); }]);
  const boot = { title: 'SKILLER7', steps };
  S7.debugHandle(game);
  game.start({ scenes: { title: SC_title(), attract: S7.scenes.attract, play: Object.assign({}, S7.scenes.play, { update(dt) { game.saves.canSave = S7.st.area === 'room7' && S7.st.mode !== 'transition'; S7.scenes.play.update(dt); } }) }, scene: hubInfo ? 'play' : 'title', boot });
  S7.started = true;
};
function SC_title() { return S7.scenes.title; }

// ---- the handle for tests and tools
S7.debugHandle = function (game) {
  const st = S7.st, sim = S7.sim;
  game.debug = {
    snapshot: () => ({ scene: game.sceneName, mode: st.mode, area: st.area, node: st.node, edge: st.edge, s: +st.s.toFixed(2), dir: st.dir, speed: +st.speed.toFixed(2), persona: st.persona, hp: Math.round(st.roster[st.persona].hp), red: Math.round(st.red), rime: st.rime,
      items: Object.keys(st.items), pins: st.pins.length, flags: Object.assign({}, st.flags), objective: st.objective, enemies: { alive: st.enemies.filter(e => !e.dead).length, revealed: st.enemies.filter(e => !e.dead && e.visible > 0).length }, boss: st.boss ? { id: st.boss.id, phase: st.boss.phase, hp: Math.round(st.boss.hp), state: st.boss.state } : null, bosses: Object.assign({}, st.bosses), aim: { yaw: +st.aim.yaw.toFixed(2), pitch: +st.aim.pitch.toFixed(2) }, time: +st.time.toFixed(2), modal: S7.ui.stack.length, echo: st.echo ? { t: +st.echo.t.toFixed(1), hits: st.echo.hits, finished: st.echo.finished } : null }),
    teleport: (area, node) => { sim.loadArea(area, node); if (S7.pres.ready && game.sceneName === 'play') S7.pres.load(area); },
    setPersona: id => { st.roster[id].unlocked = true; st.persona = id; },
    give: (item, n = 1) => { st.items[item] = (st.items[item] || 0) + n; }, addRed: n => { st.red += n; }, addRime: n => { st.rime += n; },
    tune: (k, v) => S7.setTune(k, v), cheat: (name, on = true) => { st.cheats[name] = on; },
    killAll: () => { for (const e of st.enemies.slice()) if (!e.dead) sim.killEnemy(e, true); }, revealAll: () => { for (const e of st.enemies) e.visible = 60; },
    freeze: id => { st.persona = id || st.persona; sim.freezePersona(); }, wave: id => sim.startWave(id), beat: id => sim.playBeat(id), boss: id => { st.bosses[id] = false; sim.startBoss(id); },
    skipCutscene: () => { if (st.beat) { st.beat.i = st.beat.steps.length; st.beat = null; st.talk = null; st.cut = null; st.card = null; st.mode = 'rail'; } },
    hash: () => { let h = 0x811c9dc5; const s = JSON.stringify([st.area, st.edge, +st.s.toFixed(3), st.persona, st.red, st.rime, Object.keys(st.flags), st.enemies.map(e => [e.id, +e.x.toFixed(2), +e.y.toFixed(2), +e.hp.toFixed(2)]), st.boss && st.boss.hp, st.roster]); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); },
    intent: opts => S7.sim.update(1 / 60, Object.assign(S7.noIntent(), opts)),
    bot: { setup: i => S7.bot.setup(i), step: dt => { const I = S7.bot.intents(dt); sim.update(dt, I); return S7.bot.step(dt); } }
  };
  game.stateHash = () => game.debug.hash();
};
