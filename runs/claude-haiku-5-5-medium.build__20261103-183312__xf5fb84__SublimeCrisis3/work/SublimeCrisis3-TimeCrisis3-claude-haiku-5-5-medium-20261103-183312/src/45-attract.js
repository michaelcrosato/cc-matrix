// 45-attract.js: the Autopilot (plan 4.17), the attract mode, the demo playlist, and the arcade table helpers.
// The Autopilot produces the same commands a player does, from the sim's state. It cheats through the demo (god mode
// and infinite ammo are set on the demo's Sim), so the attract mode shows the most of the game, not the balance.

TC.Autopilot = {
  // A bot for one seat. skill: 'fair' (reacts late, aims slower) or 'showoff' (uses every weapon, quick).
  make(skill) {
    const bot = { skill, fire: false, lastShot: 0, cover: false, aim: [0, 0], wpnT: 0 };
    bot.command = (sim, i, dt) => TC.Autopilot.command(sim, i, dt, bot);
    return bot;
  },

  command(sim, i, dt, bot) {
    const p = sim.players[i];
    const cmd = {};
    if (!p || p.dead) return cmd;
    if (p.out) {
      // A bot rejoins at once.
      if (sim.phase === 'continue' || p.outT > 0) cmd.firePressed = true;
      return cmd;
    }
    const fast = bot.skill === 'showoff';
    const reactT = fast ? 0.12 : 0.3;
    // Threats on this player: the soonest impact decides cover.
    let soon = Infinity;
    for (const th of sim.threats) {
      if (th.resolved || th.target !== p.id) continue;
      soon = Math.min(soon, th.impactAt - sim.t);
    }
    const needReload = p.mag <= 0 || (p.mag < 9 && p.reloadT >= 0);
    const hideFor = soon < 0.3 || (needReload && soon > 0.3 && TC.Autopilot.noEnemyExposed(sim));
    cmd.cover = hideFor || p.c > 0.5 && soon < 0.6;
    if (cmd.cover && (p.reloadT < 0 && p.mag < 9)) cmd.reload = true;
    // Target: the nearest exposed enemy to the aim, its head first.
    const cam = sim.camFor(p);
    const aspect = 16 / 9;
    let best = null, bd = Infinity;
    for (const e of sim.enemies) {
      if (!e.alive || !e.exposed || e.role === 'civilian') continue;
      const v = TC.toView(cam, [e.x, e.y, (e.z || 0) + 24 * (e.size || 1)], aspect);
      if (!v) continue;
      const d = Math.hypot(v[0] - p.aim[0], v[1] - p.aim[1]);
      if (d < bd) { bd = d; best = { e, v }; }
    }
    // In a boss fight the weak parts (turrets, claws, lamps) come first: the core is armored until they are down.
    if (sim.boss && !sim.boss.defeated && sim.phase === 'boss') {
      const parts = sim.boss.parts.map((bp, i) => ({ bp, def: sim.boss.def.parts[i] }))
        .filter(x => !x.bp.decor && !x.bp.down && (x.bp.weak || (x.bp.core && !sim.bossArmored())));
      for (const { bp, def } of parts) {
        const bx = sim.bossPartBox(def);
        const v = TC.toView(cam, [(bx[0] + bx[3]) / 2, (bx[1] + bx[4]) / 2, (bx[2] + bx[5]) / 2], aspect);
        if (!v) continue;
        const d = Math.hypot(v[0] - p.aim[0], v[1] - p.aim[1]) - (bp.weak ? 0.2 : 0);
        if (!best || d < bd) { best = { e: null, v }; bd = d; }
      }
    }
    const tgt = best ? best.v : [0, 0];
    // Aim eases to the target (a critically damped pull), a little slower on 'fair'.
    const k = 1 - Math.exp(-dt * (fast ? 9 : 4.5));
    const aim = [p.aim[0] + (tgt[0] - p.aim[0]) * k, p.aim[1] + (tgt[1] - p.aim[1]) * k];
    cmd.aim = aim;
    // Weapons: the machine gun against a crowd, the shotgun close, the grenade launcher at shields.
    bot.wpnT -= dt;
    if (bot.wpnT <= 0 && fast) {
      bot.wpnT = 2.5;
      const crowd = sim.enemies.filter(e => e.alive && e.exposed).length >= 3;
      let want = 'handgun';
      if (crowd && p.owned.mg && p.pool.mg > 0) want = 'mg';
      else if (p.owned.gl && p.pool.gl > 0 && best && best.e && best.e.type === 'shield') want = 'gl';
      else if (p.owned.shotgun && p.pool.shotgun > 0 && best && best.e && best.v && Math.abs(best.v[0]) < 0.4) want = 'shotgun';
      const idx = TC.WEAPON_ORDER.indexOf(want) + 1;
      if (idx !== p.wpn + 1) cmd.select = idx;
    }
    // Fire when the reticle is on the target, and not in cover. Bursts, with a reaction delay.
    const onTarget = best && bd < 0.09;
    if (!cmd.cover && onTarget && p.c < 0.2) {
      if (sim.t - bot.lastShot > reactT * 0.5 || fast) {
        cmd.fire = true;
        cmd.firePressed = true;
        bot.lastShot = sim.t;
      }
    } else if (!cmd.cover && !best && p.c < 0.2) {
      cmd.fire = false;
    }
    if (p.mag <= 0 && !cmd.cover) cmd.cover = true;
    return cmd;
  },

  noEnemyExposed(sim) {
    return !sim.enemies.some(e => e.alive && e.exposed && e.role !== 'civilian');
  },
};

// The highlights, in the attract's order: [stage, area index] (plan 4.17, reduced to the areas in this build).
TC.HIGHLIGHTS = [[1, 0], [1, 2], [1, 3], [2, 0], [2, 3], [3, 1], [3, 3]];

TC.Attract = {
  playIndex: 0,

  // The demo Play for the highlight at index h.
  makeDemo(game, h, flyover) {
    const hl = TC.HIGHLIGHTS[h % TC.HIGHLIGHTS.length];
    const play = new TC.Play(game, {
      mode: 'attract', attract: true, flyover: !!flyover, stage: hl[0], sceneIndex: hl[1], difficulty: 'Normal', viewer: 0,
      seats: [{ bot: TC.Autopilot.make('showoff'), name: 'DEMO', color: '#e8443a', local: true }],
      cheats: { god: true, ammo: true },
    });
    play.lastVp = { 0: { i: 0, x: 0, y: 0, w: 0, h: 0 } };
    return play;
  },

  // Start the demo behind a title or menu scene.
  startDemo(game, scene) {
    scene.demoIndex = TC.Attract.playIndex;
    scene.demo = TC.Attract.makeDemo(game, scene.demoIndex, true);
  },

  // Draw the demo behind the title: the same drawing as play, full screen.
  drawDemo(game, scene, r) {
    if (!scene.demo) return;
    scene.demo.draw(r);
  },

  // The title's idle clock: any input resets it; 10 s without and it becomes the attract mode.
  updateTitle(game, scene, dt) {
    if (scene.demo) {
      scene.demo.update(dt);
      if (scene.demo.sim.over) {
        TC.Attract.playIndex = (TC.Attract.playIndex + 1) % TC.HIGHLIGHTS.length;
        scene.demo = TC.Attract.makeDemo(game, TC.Attract.playIndex, true);
      }
    }
    if (TC.Attract.activity(game)) scene.idle = 0;
    else scene.idle = (scene.idle || 0) + dt;
    if (scene.idle > 10) game.go('attract', null, { fade: 0.3 });
  },

  // Input of any kind: a press, a pointer move of 4 px or more, a stick past its dead zone.
  activity(game) {
    const I = game.input;
    if (I.anyPressed && I.anyPressed()) return true;
    const pt = I.pointer && I.pointer();
    if (pt) {
      const last = TC.Attract._pt;
      TC.Attract._pt = pt.slice();
      if (last && Math.hypot(pt[0] - last[0], pt[1] - last[1]) > 4) return true;
    }
    if (I.padMove && (Math.abs(I.padMove[0]) + Math.abs(I.padMove[1])) > 0.2) return true;
    return false;
  },

  // The attract scene: DEMO, then the high scores, and on through the playlist; any input goes back to the title.
  enter(game, scene) {
    scene.phase = 'demo'; scene.phaseT = 0; scene.t = 0;
    TC.Attract.attractDemo(game, scene);
  },
  attractDemo(game, scene) {
    scene.demo = TC.Attract.makeDemo(game, TC.Attract.playIndex);
    scene.phase = 'demo'; scene.phaseT = 0;
    TC.Attract.playIndex = (TC.Attract.playIndex + 1) % TC.HIGHLIGHTS.length;
    game.audio.music(TC.get('song', 'harbor'));
  },
  updateAttract(game, scene, dt) {
    scene.phaseT += dt;
    scene.t += dt;
    if (TC.Attract.activity(game)) {
      TC.Attract.playIndex = 0;
      game.go('title', null, { fade: 0.2 });
      return;
    }
    if (scene.phase === 'demo') {
      scene.demo.update(dt);
      if (scene.demo.sim.over || scene.phaseT > 28) {
        scene.phase = 'scores'; scene.phaseT = 0;
      }
    } else if (scene.phase === 'scores') {
      if (scene.phaseT > 6) TC.Attract.attractDemo(game, scene);
    }
  },
  drawAttract(game, scene, r) {
    if (scene.phase === 'demo' && scene.demo) scene.demo.draw(r);
    r.overlay(g => {
      if (scene.phase === 'scores') {
        g.fillStyle = '#05070fe0'; g.fillRect(0, 0, r.W, r.H);
        if (TC.arcade && TC.arcade.drawTable) TC.arcade.drawTable(r, 'arcade', 30, 'HIGH SCORES');
      }
      TC.text(g, 'DEMO PLAY', 6, 6, TC.PALETTE.gold, { scale: 1 });
      const lab = TC.labelFor({ input: game.input }, 'fire') || 'ANY KEY';
      if (Math.floor(scene.t * 2) % 2 === 0) TC.text(g, 'PRESS ' + lab + ' TO START', r.W / 2, r.H - 14, '#ffffff', { align: 'center', scale: 1 });
    });
  },
};

// The arcade: a finished run's score goes to the table if it qualifies (initials first), and then to the records.
TC.Arcade = {
  modeFor(result) {
    if (TC.current.mode === 'coop') return 'coop';
    if (TC.current.mode === 'arcade') return 'arcade';
    if (result.stage === 'range') return 'training';
    return 'stage' + result.stage;
  },
  enterOrRecords(game, result, scene) {
    const mode = TC.Arcade.modeFor(result);
    const score = result.rows.reduce((s, r) => s + r.total, 0) / Math.max(1, result.rows.length);
    const top = Math.round(score);
    if (mode !== 'training' && TC.arcade.qualifies(top, mode)) {
      scene.entering = true;
      TC.arcade.enter(top, mode, () => { scene.entering = false; game.go('records'); });
      return;
    }
    game.go('records');
  },
};
