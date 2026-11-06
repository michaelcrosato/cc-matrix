import { Graphics, C } from "./graphics.js";
import { AudioEngine } from "./audio.js";
import { Game, DEFAULTS } from "./game.js";
import { Input } from "./input.js";
import { UI } from "./ui.js";
const $ = (id) => document.getElementById(id);
const OPTIONS = {
  music: 0.1,
  sfx: 0.7,
  glyphs: "ps",
  shake: true,
  aimAssist: true,
  difficulty: "arcade",
};
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
const saved = read("caboodle-options", {});
const app = {
  screen: "boot",
  settings: { ...OPTIONS, ...saved },
  best: Number(read("caboodle-best", 0)) || 0,
  backTo: "title",
  lastFrame: 0,
  accumulator: 0,
  hubStarted: false,
  hubEnded: false,
  reported: false,
};
app.settings.music = Math.min(1, Math.max(0, Number(app.settings.music) || 0));
app.settings.sfx = Math.min(1, Math.max(0, Number(app.settings.sfx) || 0));
window.__caboodle = app;
app.audio = new AudioEngine(app.settings);
app.gfx = new Graphics($("game"));
app.game = new Game(app.gfx, app.audio, app.settings);
app.saveSettings = () => {
  try {
    localStorage.setItem("caboodle-options", JSON.stringify(app.settings));
  } catch {}
};
app.setScreen = (s) => {
  app.screen = s;
  app.input.mouse.down = false;
  app.input.keys.clear();
  app.input.touch.clear();
  app.input.pulses = {};
  app.ui.show(s);
};
app.start = (kind = "solo") => {
  if (AIHub.active) return;
  app.reported = false;
  app.game.god = false;
  app.game.auto = false;
  app.game.start({ coop: kind === "coop", training: kind === "training", seed: 1982 });
  app.audio.apply();
  app.audio.unlock();
  app.accumulator = 0;
  app.setScreen("play");
};
app.hangar = () => {
  app.game.running = false;
  app.game.demo = false;
  app.gfx.clear();
  app.input.lastActivity = performance.now();
  app.setScreen("title");
  $("title-best").textContent = "PERSONAL BEST · " + app.best.toString().padStart(6, "0");
};
app.exitAttract = () => {
  app.hangar();
  app.audio.update(false);
};
app.action = (action, value) => {
  if (app.hubEnded) return;
  const g = app.game,
    s = app.screen;
  if (
    AIHub.active &&
    [
      "solo",
      "startCoop",
      "training",
      "retry",
      "title",
      "dev",
      "nextSector",
      "spawnBoss",
      "clearSector",
      "refill",
      "god",
      "auto",
    ].includes(action)
  )
    return;
  if (action === "solo") app.start();
  else if (action === "coop") {
    app.backTo = "title";
    app.setScreen("coop");
  } else if (action === "startCoop") app.start("coop");
  else if (action === "training") app.start("training");
  else if (action === "pause" && s === "play") app.setScreen("pause");
  else if (action === "resume" && g.running) app.setScreen("play");
  else if (action === "options" || action === "credits" || action === "school") {
    app.backTo = s === "pause" ? "pause" : "title";
    app.setScreen(action);
  } else if (action === "dev") {
    app.backTo = "pause";
    app.setScreen("dev");
  } else if (action === "back") {
    if (s === "play") app.setScreen("pause");
    else if (s === "pause") app.setScreen("play");
    else if (["options", "school", "credits", "dev", "coop"].includes(s)) app.setScreen(app.backTo);
    else if (s === "result" && !AIHub.active) app.hangar();
    app.audio.play("back");
  } else if (action === "title") app.hangar();
  else if (action === "retry") app.start(g.coop ? "coop" : g.training ? "training" : "solo");
  else if (action === "glyphs") {
    app.settings.glyphs = app.settings.glyphs === "ps" ? "xbox" : "ps";
    app.ui.buildSettings();
    app.saveSettings();
  } else if (action === "shake") {
    app.settings.shake = !app.settings.shake;
    app.ui.buildSettings();
    app.saveSettings();
  } else if (action === "assist") {
    app.settings.aimAssist = !app.settings.aimAssist;
    app.ui.buildSettings();
    app.saveSettings();
  } else if (action === "difficulty") {
    const d = ["rookie", "arcade", "veteran"];
    app.settings.difficulty = d[(d.indexOf(app.settings.difficulty) + 1) % 3];
    app.ui.buildSettings();
    app.saveSettings();
  } else if (action === "resetSettings") {
    Object.assign(app.settings, OPTIONS);
    app.saveSettings();
    app.audio.apply();
    app.ui.buildSettings();
  } else if (action === "fullscreen") {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else
      document.documentElement
        .requestFullscreen?.()
        .catch(() => app.ui.toast("FULLSCREEN IS UNAVAILABLE HERE"));
  } else if (action === "god") {
    g.god = !g.god;
    app.ui.buildDev();
  } else if (action === "auto") {
    g.auto = !g.auto;
    app.ui.buildDev();
  } else if (action === "refill") {
    for (const p of g.players) {
      p.hp = 100;
      p.rockets = 5;
      p.flares = 3;
      p.invuln = 2;
      p.boost = 1;
      p.mesh.visible = true;
    }
    for (const t of g.trucks) if (!t.removed) t.hp = 100;
    g.reserves = 3;
    app.ui.toast("CREW & CONVOY REPLENISHED");
  } else if (action === "nextSector") {
    for (const e of g.enemies) g.remove(e);
    g.enemies = [];
    g.training = false;
    g.beginSector((g.sector + 1) % 3);
    app.ui.toast("SECTOR " + (g.sector + 1) + " READY");
  } else if (action === "spawnBoss") {
    if (!g.boss || g.boss.removed) g.spawnEnemy("boss", g.players[0].x + 25, 20);
    app.ui.toast("DUSTMAKER INBOUND");
  } else if (action === "clearSector") {
    for (const e of [...g.enemies]) g.damage(e, 999);
    g.enemies = [];
    g.spawnLeft = 0;
    app.ui.toast("CURRENT SKY CLEARED");
  } else if (action === "resetDev") {
    Object.assign(g.config, DEFAULTS);
    app.ui.buildDev();
    app.ui.toast("BALANCE DEFAULTS RESTORED");
  } else if (action === "resetTools") {
    g.god = false;
    g.auto = false;
    app.ui.buildDev();
    app.ui.toast("TEST TOOLS RESET");
  } else if (action === "touchRocket") app.input.pulses.rocket = true;
};
app.input = new Input(app);
app.ui = new UI(app);
app.game.onEvent = (e) => {
  if (e.type === "finish") {
    if (AIHub.active) {
      reportHub();
      app.setScreen("ended");
      $("ended-score").textContent = app.game.score.toLocaleString("en-US");
    } else {
      if (!app.game.training && app.game.score > app.best) {
        app.best = app.game.score;
        try {
          localStorage.setItem("caboodle-best", String(app.best));
        } catch {}
      }
      app.setScreen("result");
    }
  }
};
function reportHub() {
  if (!AIHub.active || app.reported || app.hubEnded) return;
  app.reported = true;
  const g = app.game;
  AIHub.result({
    score: g.score,
    stats: {
      "Raiders down": g.kills,
      "Crew rescued": g.rescued,
      "Trucks saved": g.trucks.filter((t) => t.hp > 0).length,
    },
    awards:
      g.rescued > 2
        ? [{ title: "A helping rotor", detail: "Rescued " + g.rescued + " stranded crew." }]
        : [],
  });
}
const hubPromise = AIHub.connect({ mode: "ghost", seats: [1, 4] });
AIHub.on("start", () => {
  app.hubStarted = true;
});
AIHub.on("message", (data, from) => {
  if (
    !app.hubEnded &&
    data?.kind === "ghost" &&
    app.game.running &&
    typeof data.sector === "number"
  ) {
    const p = app.hubInfo?.players.find((p) => p.id === from);
    if (p) app.game.ghost(from, data, p.color);
  }
});
AIHub.on("leave", ({ id }) => {
  const g = app.game.ghosts.get(id);
  if (g) {
    app.gfx.actors.remove(g);
    app.game.ghosts.delete(id);
  }
});
AIHub.on("time-up", () => {
  reportHub();
  app.game.running = false;
  app.setScreen("ended");
  $("ended-score").textContent = app.game.score.toLocaleString("en-US");
});
AIHub.on("end", () => {
  app.hubEnded = true;
  app.game.running = false;
  app.audio.silence();
  app.setScreen("ended");
  $("ended-score").textContent = app.game.score.toLocaleString("en-US");
});
let lastNet = 0,
  lastProgress = 0;
function frame(now) {
  const dt = Math.min(0.08, app.lastFrame ? (now - app.lastFrame) / 1000 : 1 / 60);
  app.lastFrame = now;
  const inputs = app.input.poll(app.game, dt);
  if (app.screen === "title" && now - app.input.lastActivity >= 10000) {
    app.game.start({ demo: true });
    app.setScreen("attract");
  }
  if (
    AIHub.active &&
    app.hubStarted &&
    !app.hubEnded &&
    AIHub.time() >= 0 &&
    app.screen === "hubwait"
  )
    app.setScreen("play");
  const canStep =
    app.game.running &&
    (app.screen === "play" ||
      app.screen === "attract" ||
      (AIHub.active && app.hubStarted && AIHub.time() >= 0 && !app.hubEnded));
  if (canStep) {
    app.accumulator += dt;
    let steps = 0;
    while (app.accumulator >= 1 / 60 && steps < 6) {
      const controls =
        app.game.demo || app.game.auto
          ? app.game.players.map((p) => app.game.ai(p))
          : app.screen === "play"
            ? inputs
            : [];
      app.game.step(1 / 60, controls);
      app.accumulator -= 1 / 60;
      steps++;
    }
    if (steps > 0) app.input.pulses = {};
  } else app.accumulator = 0;
  if (AIHub.active && app.hubStarted && !app.hubEnded && AIHub.time() >= 0) {
    if (now - lastNet > 100) {
      lastNet = now;
      const p = app.game.players[0];
      if (p)
        AIHub.send(
          {
            kind: "ghost",
            x: +p.x.toFixed(2),
            y: +p.y.toFixed(2),
            face: p.face,
            sector: app.game.sector,
          },
          { reliable: false },
        );
    }
    if (now - lastProgress > 1000 && !app.reported) {
      lastProgress = now;
      AIHub.progress({
        score: app.game.score,
        label: "Sector " + (app.game.sector + 1) + " · " + app.game.kills + " down",
      });
    }
  }
  for (const ghost of app.game.ghosts.values())
    if (app.game.time - ghost.userData.last > 2) ghost.visible = false;
  const p = app.game.players[0];
  app.gfx.cursor.visible = app.screen === "play" && app.input.last !== "touch" && !!p && p.hp > 0;
  if (app.gfx.cursor.visible) {
    const v =
      app.input.mouse.active && app.input.last === "keyboard"
        ? app.gfx.toWorld(app.input.mouse.x, app.input.mouse.y)
        : { x: p.x + Math.cos(p.angle) * 11, y: p.y + Math.sin(p.angle) * 11 };
    app.gfx.cursor.position.set(v.x, v.y, 3);
  }
  const stick = $("touch-stick"),
    touch = [...app.input.touch.values()].find((t) => t.side === "left");
  stick.hidden = !touch || app.screen !== "play";
  if (touch) {
    stick.style.left = touch.sx - 55 + "px";
    stick.style.top = touch.sy - 55 + "px";
    stick.firstElementChild.style.transform = `translate(${Math.max(-40, Math.min(40, touch.x - touch.sx))}px,${Math.max(-40, Math.min(40, touch.y - touch.sy))}px)`;
  }
  app.audio.update(canStep && !app.hubEnded, p?.vx || 0, !!app.game.boss && !app.game.boss.removed);
  app.gfx.render(dt, app.game, app.screen, now / 1000, app.settings);
  app.ui.update(now);
  requestAnimationFrame(frame);
}
async function boot() {
  try {
    $("boot-message").textContent = "RAISING THE DESERT / CHECKING THE BIRD…";
    await Promise.all([app.gfx.init(), app.game.init()]);
    $("boot-message").textContent = "CLEARING THE PATROL FREQUENCY…";
    const info = await hubPromise;
    app.hubInfo = info;
    $("boot").hidden = true;
    if (info && AIHub.active) {
      app.game.start({ seed: info.seed });
      app.setScreen("hubwait");
      AIHub.ready();
    } else app.hangar();
    app.ready = true;
    requestAnimationFrame(frame);
    window.addEventListener("resize", () => {
      app.gfx.resize();
      app.ui.resizeRadar();
    });
    // The test surface is read-only except explicit developer operations already exposed in the pause menu.
    window.__caboodleTest = {
      snapshot: () => ({
        screen: app.screen,
        backend: app.gfx.backend,
        physics: app.game.physicsVersion,
        input: app.input.last,
        pads: app.input.padCount,
        settings: { ...app.settings },
        ...app.game.snapshot(),
      }),
      advance: (seconds, autopilot = true) => {
        const n = Math.ceil(seconds * 60),
          muted = app.audio.muted;
        app.audio.muted = true;
        for (let i = 0; i < n && app.game.running; i++)
          app.game.step(1 / 60, autopilot ? app.game.players.map((p) => app.game.ai(p)) : []);
        app.audio.muted = muted;
        return app.game.snapshot();
      },
      audio: () => ({
        level: app.audio.level(),
        events: app.audio.events,
        musicNotes: app.audio.musicNotes,
        musicGain: app.audio.music?.gain.value,
        state: app.audio.ctx?.state || "uninitialized",
      }),
      events: () => [...app.game.events],
    };
  } catch (error) {
    console.error(error);
    $("boot").hidden = true;
    $("error").hidden = false;
    $("error-text").textContent =
      "This flight needs a browser with WebGPU or WebGL 2 and WebAssembly. " +
      String(error.message || error);
    if (AIHub.active) AIHub.fail(String(error.message || error));
  }
}
boot();
