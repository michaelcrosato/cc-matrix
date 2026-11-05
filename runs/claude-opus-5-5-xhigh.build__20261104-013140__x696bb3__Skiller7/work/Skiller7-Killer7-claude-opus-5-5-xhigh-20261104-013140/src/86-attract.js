/* ATTRACT MODE (§7.23): ten seconds idle on the title (or its screens) and the demo plays itself: seven vignettes, each
 * opening on a caption, played by a cheating bot (god mode, endless Red, aim that snaps, warps between them). Any key,
 * click, wheel, mouse move, pad button, stick or touch goes back to the title; that input activates nothing. */
S7.VIGNETTES = [
  { caption: 'HOLD TO MOVE. STOP TO KILL.', area: '00A', node: 'r7', persona: 'ignaz', dur: 22,
    setup(sim) { for (const [x, y] of [[24.5, 16], [27, 13.5], [22, 12.5]]) sim.spawnEnemy('giggler', [x, y], { speedK: .6 }); },
    route: [{ goto: 'j1' }, { goto: 'j2' }, { goto: 'j4' }, { goto: 'j2' }, { goto: 'j3' }] },
  { caption: 'SEVEN KILLERS. ONE BODY.', area: '01A', node: 'mk', persona: 'dagny', dur: 24,
    setup(sim) { sim.startWave('market'); },
    route: [{ wait: 2.5 }, { persona: 'rurik' }, { skill: 'makeitrain', persona: 'rurik' }, { wait: 2.5 }, { persona: 'kasimir' }, { skill: 'echo', persona: 'kasimir' }, { wait: 2.5 }, { persona: 'mireille' }, { wait: 2.5 }, { persona: 'brigid' }, { wait: 2.5 }, { persona: 'ansel' }, { skill: 'flare', persona: 'ansel' }, { wait: 3 }] },
  { caption: 'SCAN. FIND THE WARM SPOT.', area: '00B', node: 'x1', persona: 'mireille', dur: 22,
    setup(sim) { sim.st.waves['00B:doors1'] = null; },
    route: [{ goto: 'j5' }, { goto: 'r306' }, { goto: 'j5' }, { goto: 'c2' }] },
  { caption: 'LAWINE!', area: '01C', node: 'jp', persona: 'dagny', dur: 22,
    setup(sim) { sim.st.flags.lawineDone = 0; sim.st.flags.lawine = 0; },
    route: [{ goto: 'f2' }, { goto: 'vb' }] },
  { caption: 'SKY CABINS.', area: '01D', node: 'gs', persona: 'brigid', dur: 22,
    setup(sim) { sim.st.flags.powerBack = 1; sim.st.gates['01D:power'] = 1; if (sim.gondola) sim.gondola.passT = 2; },
    route: [{ wait: 30 }] },
  { caption: 'EIN, ZWEI, DREI, VIER.', area: '01B', node: 'br', persona: 'kasimir', dur: 22, boss: ['band', 1],
    route: [{ boss: 'band' }] },
  { caption: 'THE POWDER KING.', area: '01F', node: 'p3', persona: 'rurik', dur: 24, boss: ['hansi', 1],
    setup(sim) { sim.attractSlalomAt = 12; },
    route: [{ boss: 'hansi' }] }
];

S7.addModeScenes = (scenes, game, sim, pres, hud, audio, voice) => {
  let A = null;
  const startVignette = (i) => {
    const V0 = S7.VIGNETTES[i];
    sim.titleBackdrop(); sim.o.noClock = true; sim.titleMode = false; sim.hideHero = false; sim.camOverride = null;
    sim.o.attract = true;
    sim.st.target = 1;
    for (const id of PERSONA_ORDER) sim.st.roster[id].unlocked = true;
    sim.st.persona = V0.persona; sim.st.red = 999; sim.st.items.ember = 1; sim.st.flags.churchBell = 1; sim.st.flags.firstClear = 1;
    sim.st.flags['trig:00A:first'] = 1; sim.st.flags['trig:00A:walktip'] = 1;
    if (V0.boss) sim.warpBoss(V0.boss[0], V0.boss[1]); else sim.warp(V0.area, V0.node);
    sim.st.persona = V0.persona; sim.switching = null;
    if (V0.setup) V0.setup(sim);
    S7.bot.run(V0.route, { honest: false });
    A.vi = i; A.t = 0; A.caption = 2.2; A.seen[i] = 1; if (i === 0) A.loops++;
  };
  scenes.attract = {
    input: S7.INPUT, touch: [],
    enter() {
      A = S7.attractInfo = { vi: 0, t: 0, caption: 0, card: 0, armed: .4, seen: {}, loops: 0 };
      S7.attractExit = false;
      S7.onAnyInput = () => { if (A && A.armed <= 0) S7.attractExit = true; };
      game.input.consumeAll();
      CHEAT._attractSaved = Object.assign({}, CHEAT);
      startVignette(0);
      audio && audio.music('title');
    },
    exit() { S7.bot.stop(); sim.o.attract = false; S7.onAnyInput = null; for (const k in CHEATS) CHEAT[k] = !!(CHEAT._attractSaved && CHEAT._attractSaved[k]); S7.pointerLock(false); },
    update(dt) {
      A.armed -= dt; A.t += dt;
      const I0 = game.input, pm = I0.padMove || [0, 0], pa = I0.padAim;
      if (A.armed <= 0 && (I0.anyPressed() || Math.hypot(pm[0], pm[1]) > .3 || (pa && Math.hypot(pa[0], pa[1]) > .3) || S7.attractExit)) { game.input.consumeAll(); game.input.clear && game.input.clear(); S7.Input.reset(); game.go('title', {}); S7.bus.emit('flurry', {}); return; }
      if (A.card > 0) { A.card -= dt; if (A.card <= 0) startVignette(0); return; }
      if (sim.cutscene) sim.skipCutscene();
      if (sim.talk) while (sim.talk) sim.nextLine();
      if (sim.card) sim.card = null;
      if (sim.uiRequest) sim.uiRequest = null;
      if (sim.resultsReady !== null && sim.resultsReady !== undefined) sim.resultsReady = null;
      if (sim.mode === 'gameover') sim.mode = 'rail';
      // the summit's vignette skis the slalom after the snowman
      if (sim.attractSlalomAt && A.t > sim.attractSlalomAt && sim.boss && sim.boss.id === 'hansi' && sim.boss.phase === 1) { sim.attractSlalomAt = 0; BOSS.hansi.toSlalom(sim, sim.boss); S7.bot.run([{ boss: 'hansi' }], { honest: false }); }
      const I = S7.bot.intents(sim);
      sim.update(dt, I);
      pres.step(dt); audio && audio.update(dt);
      if (voice) voice.talkTick(sim.talk);
      const V0 = S7.VIGNETTES[A.vi];
      if (A.caption > 0) A.caption -= dt;
      if (A.t > V0.dur || S7.bot.done) { if (A.vi + 1 < S7.VIGNETTES.length) startVignette(A.vi + 1); else { A.card = 3; } }
    },
    draw(r) {
      if (A.card > 0) { r.overlay(g => { UI.rect(g, 0, 0, r.W, r.H, '#000'); UI.title(g, 'SKILLER', r.W / 2 - 14, r.H * .32, 5); E.font.title(g, '7', r.W / 2 + E.font.width('SKILLER', { scale: 5 }) / 2 - 6, r.H * .32, { scale: 5, colors: ['#ff5060', '#d81e2a', '#a01018'], outline: INK, depth: 2 }); UI.text(g, 'SEVEN KILLERS, ONE MOUNTAIN', r.W / 2, r.H * .32 + 54, RED, { align: 'center' }); attractBar(g, r); }); return; }
      pres.draw(r); hud.draw(r);
      r.overlay(g => {
        const S = UI.safe(r);
        UI.text(g, 'SKILLER7', S.x0, S.y0 + 46, '#ffffff', { scale: 2 });
        UI.text(g, 'DEMO', S.x1, S.y0 + 46, RED, { scale: 2, align: 'right' });
        if (A.caption > 0) { const a = Math.min(1, A.caption / .4); g.save(); g.globalAlpha = a; UI.panel(g, 0, r.H * .4 - 6, r.W, 40, .7, '#000'); UI.title(g, S7.VIGNETTES[A.vi].caption, r.W / 2, r.H * .4, 2); g.restore(); }
        attractBar(g, r);
      });
    }
  };
  const attractBar = (g, r) => {
    const pad = S7.Input.family() === 'gamepad', S = UI.safe(r);
    UI.text(g, pad ? 'PRESS ANY BUTTON' : S7.touchOnly() ? 'TAP TO RETURN' : 'PRESS ANY KEY', r.W / 2, S.y1 - 10, '#ffffff', { align: 'center', scale: 2 });
  };
  S7.addEchoRun(scenes, game, sim, pres, hud, audio, voice);
};
