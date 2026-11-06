let lastFrame = 0,
  accumulator = 0,
  frameCount = 0,
  runtimeError = null,
  drawReady = false,
  warming = false;
async function boot() {
  const connection = AIHub.connect({ mode: "shared-world", seats: [1, 4] });
  try {
    $("loadtext").textContent = "Waking the sun lenses. Negotiating with gravity.";
    hubInfo = await connection;
    await initEngine();
    createWorld();
    controls = new Controls();
    configurePlayers(1);
    game.status = "title";
    updateVisuals(1 / 60);
    if (!AIHub.active) {
      await renderer.compileAsync(scene, camera);
      await renderer.renderAsync(scene, camera);
      drawReady = true;
    }
    $("loading").hidden = true;
    if (!(await initNetwork(connection))) showTitle();
    if (hubInfo?.server) $("hud").hidden = true;
    if (testMode) {
      window.__GG = {
        snapshot,
        netInputs: () =>
          Object.fromEntries(
            [...remoteInputs].map(([id, v]) => [id, { ...v.input, age: performance.now() - v.time }]),
          ),
        offlineAudio: () => audio.renderCheck(),
        input: (slot = 0) => controls.frame(slot),
        start: (coop = false) => startGame(coop),
        advance(frames, inputs = {}) {
          for (let i = 0; i < frames; i++) fixedStep(1 / 60, inputs);
          updateVisuals(1 / 60);
          renderHUD(1);
          return snapshot();
        },
        warp(id, x, z) {
          const p = game.players.find((p) => p.id === id);
          if (p) warpPlayer(p, x, z);
          return snapshot();
        },
        interact(id = 0) {
          interact(game.players.find((p) => p.id === id));
          return snapshot();
        },
        damage(id = 0, n = 1) {
          damagePlayer(
            game.players.find((p) => p.id === id),
            n,
          );
          return snapshot();
        },
        dev: devAction,
        openMenu,
        closeMenu,
        save: saveCheckpoint,
        restore: () => startGame(false, true),
        idle() {
          controls.lastInput = performance.now() - 11000;
        },
        balancePress: () => balancePress(getLocalPlayer()),
        unlockAudio: () => audio.unlock(),
        audioTick: (phase = "escape") => audio.tick(phase, 1),
        settings,
        exitAttract,
        render: async () => {
          updateVisuals(1 / 60);
          renderHUD(1);
          if (renderer) await renderer.renderAsync(scene, camera);
          return snapshot();
        },
        get frameCount() {
          return frameCount;
        },
      };
    }
    window.__gameReady = true;
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  } catch (error) {
    runtimeError = String(error?.stack || error);
    window.__gameError = runtimeError;
    console.error(error);
    $("loading").hidden = false;
    $("loadtext").textContent =
      "The expedition could not start: " +
      (error.message || error) +
      ". Reload in a current WebGPU or WebGL2 browser. CDN access is needed for the two pinned libraries.";
    if (AIHub.active) AIHub.fail("Unable to initialise graphics or physics: " + (error.message || error));
  }
}
function frame(now) {
  try {
    const dt = Math.min(0.1, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    frameCount++;
    if (!hubInfo?.server) controls.poll(dt);
    const titleMenu = game.status === "title" && ["title", "settings", "about", "help"].includes(ui.screen);
    if (!AIHub.active && titleMenu && now - controls.lastInput >= 10000) beginAttract();
    networkTick(dt);
    const running =
      (game.status === "playing" || game.attract) &&
      (!ui.screen || AIHub.active) &&
      (!AIHub.active || (hubStarted && AIHub.time() >= 0)) &&
      !hubEnded;
    if (running && !testMode) {
      accumulator += dt;
      let steps = 0;
      while (accumulator >= 1 / 60 && steps < 6) {
        fixedStep(1 / 60);
        controls.consume();
        accumulator -= 1 / 60;
        steps++;
      }
    } else {
      accumulator = 0;
      if ((AIHub.active && !hubInfo?.isHost) || ui.screen) controls.consume();
    }
    if (AIHub.active && !hubInfo?.isHost && !hubEnded) {
      for (const t of worldObjects.traps) {
        const phase = (game.elapsed + t.id * 0.73) % 3.7;
        t.warning.material.opacity = phase > 1.65 && phase < 3.15 ? 0.25 : 0;
      }
      for (const b of worldObjects.projectiles) {
        b.x += b.vx * dt;
        b.z += b.vz * dt;
        b.mesh.position.set(b.x, b.y, b.z);
      }
    }
    updateVisuals(dt);
    renderHUD(dt);
    if (!hubEnded) audio.tick(game.phase, dt);
    if (AIHub.active && hubStarted && renderer && !warming && !drawReady) {
      warming = true;
      renderer
        .compileAsync(scene, camera)
        .then(() => {
          drawReady = true;
        })
        .catch((error) => {
          window.__gameError = String(error);
          AIHub.fail("Graphics warm-up failed: " + error.message);
        });
    }
    if (drawReady && renderer) renderer.render(scene, camera);
    requestAnimationFrame(frame);
  } catch (error) {
    runtimeError = String(error?.stack || error);
    window.__gameError = runtimeError;
    console.error(error);
    if (AIHub.active && !hubEnded) AIHub.fail("Simulation failed: " + error.message);
    $("loading").hidden = false;
    $("loadtext").textContent =
      "The expedition stopped: " + error.message + ". Reload to resume your checkpoint.";
  }
}
addEventListener("visibilitychange", () => {
  if (document.hidden && !AIHub.active && game.status === "playing" && !game.attract && !ui.screen)
    openMenu("pause");
});
boot();
