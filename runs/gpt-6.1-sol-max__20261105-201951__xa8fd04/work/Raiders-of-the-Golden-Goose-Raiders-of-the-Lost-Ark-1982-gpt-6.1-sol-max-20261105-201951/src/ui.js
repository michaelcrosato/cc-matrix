const ui = { screen: null, from: "title", focus: 0, aboutTab: 0, lastHud: 0 };
const esc = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const button = (text, action, extra = "", primary = false) =>
  `<button class="menu-btn ${primary ? "primary" : ""}" data-focus data-action="${action}" aria-label="${esc(
    text
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )}" ${extra}>${text}</button>`;
const backButton = () => button("← Back", "back", 'class="menu-btn back"');
const titleMark = '<span class="eyebrow">QUINN & COMPANY · FIELD EXPEDITION 01</span>';
function menuItems() {
  return Array.from($("menu").querySelectorAll("[data-focus]")).filter(
    (e) => e.offsetParent !== null && !e.disabled,
  );
}
function setMenuFocus(index, scroll = false) {
  const items = menuItems();
  if (!items.length) return;
  ui.focus = (index + items.length) % items.length;
  for (const [i, item] of items.entries()) {
    item.classList.toggle("focused", i === ui.focus);
    item.closest(".setting")?.classList.toggle("focused", i === ui.focus);
  }
  const el = items[ui.focus];
  if (scroll) el.scrollIntoView({ block: "nearest", behavior: "instant" });
}
function menuNavigate(dir) {
  setMenuFocus(ui.focus + dir, true);
  audio.effect("ui");
}
function menuAdjust(dir) {
  const item = menuItems()[ui.focus];
  if (!item) return;
  if (item.tagName === "INPUT") {
    const step = Number(item.step) || 1;
    item.value = clamp(Number(item.value) + dir * step, Number(item.min), Number(item.max));
    item.dispatchEvent(new Event("input", { bubbles: true }));
    audio.effect("ui");
  } else if (item.tagName === "SELECT") {
    item.selectedIndex = (item.selectedIndex + dir + item.options.length) % item.options.length;
    item.dispatchEvent(new Event("change", { bubbles: true }));
    audio.effect("ui");
  }
}
function menuActivate() {
  if (performance.now() < controls.suppressUntil) return;
  const item = menuItems()[ui.focus];
  if (item?.tagName === "BUTTON") item.click();
}
function menuBack() {
  if (ui.screen === "title") return;
  if (ui.screen === "pause") {
    closeMenu();
    return;
  }
  if (ui.screen === "failure" || ui.screen === "victory") {
    showTitle();
    return;
  }
  openMenu(ui.from === "title" ? "title" : "pause");
}
function menuKey(key) {
  if (key === "arrowup" || key === "w") menuNavigate(-1);
  else if (key === "arrowdown" || key === "s" || key === "tab") menuNavigate(1);
  else if (key === "arrowleft" || key === "a") menuAdjust(-1);
  else if (key === "arrowright" || key === "d") menuAdjust(1);
  else if (key === "enter" || key === "space") menuActivate();
  else if (key === "escape" || key === "backspace") menuBack();
}
function closeMenu() {
  ui.screen = null;
  $("menu").hidden = true;
  controls?.clear();
  $("hud").hidden = game.status === "title";
  $("pause-button").hidden = game.attract;
  refreshPrompts();
}
function togglePause() {
  if (!worldReady || game.status === "title" || game.status === "hub-wait" || game.status === "ended") return;
  if (game.attract) {
    exitAttract();
    return;
  }
  if (ui.screen) closeMenu();
  else openMenu("pause");
}
function showTitle() {
  if (AIHub.active) return;
  document.body.removeAttribute("data-playing");
  game.status = "title";
  game.attract = false;
  game.god = false;
  game.noclip = false;
  game.dialogue = null;
  $("attract-banner").hidden = true;
  $("hud").hidden = true;
  audio.resume();
  if (game.players[0]) warpPlayer(game.players[0], 1, -43);
  controls.lastInput = performance.now();
  openMenu("title");
}
function openMenu(screen, from = null) {
  if (AIHub.active && screen === "title") return;
  ui.screen = screen;
  if (from) ui.from = from;
  ui.focus = 0;
  $("menu").hidden = false;
  controls?.clear();
  renderMenu();
  setMenuFocus(0);
  refreshPrompts();
}
function range(label, key, min, max, step, value, scope = "tuning", format = "") {
  return `<div class="setting"><label for="range-${key}">${label}<output id="out-${key}">${format || Number(value).toFixed(step < 1 ? 2 : 0)}</output></label><input data-focus id="range-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-scope="${scope}" data-key="${key}" aria-label="${label}"></div>`;
}
function renderMenu() {
  let html = "";
  if (ui.screen === "title") {
    const saved = !!safeStore.get("checkpoint");
    html = `<div class="title-menu"><div class="series"><i></i>${titleMark}</div><h1>Raiders of the<span class="gold">Golden Goose</span></h1><p class="tagline">Fortune favours the slightly reckless.</p><div class="menu-actions">${saved ? button("Continue expedition", "continue", "", true) : ""}${button(saved ? "A new solo expedition" : "Begin expedition", "solo", "", !saved)}${button("Bring a partner <small>2–4 explorers · couch co-op</small>", "coop")}${button("The field guide", "help")}${button("Settings", "settings")}${button("About & credits", "about")}</div></div><div class="edition-stamp"><b>AN ORIGINAL PULP ADVENTURE</b>One goose. One bad idea.<br>A rather large rolling stone.</div><div class="menu-footer"><span>${glyph("confirm")} SELECT &nbsp; · &nbsp; ↑ ↓ / LEFT STICK TO BROWSE</span><span>SOLO OR CO-OP &nbsp; / &nbsp; VOL. 01 &nbsp; / &nbsp; 1936</span></div>`;
  } else if (ui.screen === "pause") {
    html = `<section class="sheet pause-sheet"><div class="eyebrow">A MOMENT BETWEEN DISASTERS</div><h2>Catch your breath.</h2><p class="subtitle">${AIHub.active ? "The shared expedition keeps moving while this menu is open." : esc(game.checkpoint.name) + " · progress saved at checkpoints"}</p><div class="menu-actions">${button("Back to the adventure", "resume", "", true)}${button("Field journal & map", "journal")}${button("Settings", "settings")}${!AIHub.active ? button("Developer toolkit", "dev") : ""}${button("About & credits", "about")}${!AIHub.active ? button("Return to title", "title") : ""}</div></section>`;
  } else if (ui.screen === "settings") {
    html = `<section class="sheet"><div class="panel-head"><div><div class="eyebrow">MAKE YOURSELF AT HOME</div><h2>Settings</h2></div>${button("← Back", "back")}</div><div class="settings-grid">${range("Master volume", "master", 0, 1, 0.05, settings.master, "settings", Math.round(settings.master * 100) + "%")}${range("Music · default 10%", "music", 0, 1, 0.05, settings.music, "settings", Math.round(settings.music * 100) + "%")}${range("Effects & gibberish", "sfx", 0, 1, 0.05, settings.sfx, "settings", Math.round(settings.sfx * 100) + "%")}${range("Camera distance", "zoom", 0.8, 1.3, 0.05, settings.zoom, "settings")}${range("Screen shake", "shake", 0, 1, 0.05, settings.shake, "settings")}<div class="setting"><label for="glyph-choice">Controller prompts</label><select id="glyph-choice" data-focus data-key="glyphs"><option ${settings.glyphs === "PlayStation" ? "selected" : ""}>PlayStation</option><option ${settings.glyphs === "Xbox" ? "selected" : ""}>Xbox</option></select></div></div><div class="toolrow">${button("Aim assistance: " + (settings.assist ? "ON" : "OFF"), "assist")}${button("Reset settings", "reset-settings")}${button("Fullscreen", "fullscreen")}</div><p class="hint-line">Music starts at 10%. Touch play adds automatic close-range whips, gap jumps and escape sprinting.<br>Use left/right on a focused slider. Your preferences are saved on this device.</p></section>`;
  } else if (ui.screen === "dev") {
    html = `<section class="sheet wide"><div class="panel-head"><div><div class="eyebrow">QUINN & CO. · TECHNICAL DEPARTMENT</div><h2>Developer toolkit</h2></div>${button("← Back", "back")}</div><p class="subtitle">Changes take effect immediately. Close the menu to test. Checkpoints retain the current expedition.</p><div class="settings-grid">${range("Movement speed", "moveSpeed", 3, 11, 0.1, tuning.moveSpeed)}${range("Jump power", "jumpPower", 4, 12, 0.25, tuning.jumpPower)}${range("Whip reach", "whipReach", 1.5, 7, 0.1, tuning.whipReach)}${range("Enemy aggression", "enemyAggression", 0.2, 2, 0.1, tuning.enemyAggression)}${range("Trap tempo", "trapTempo", 0.3, 2, 0.1, tuning.trapTempo)}${range("Boulder speed", "boulderSpeed", 3, 12, 0.2, tuning.boulderSpeed)}${range("Damage multiplier", "damageScale", 0.25, 2, 0.25, tuning.damageScale)}</div><div class="toolrow">${button("Invulnerable: " + (game.god ? "ON" : "OFF"), "god")}${button("No clip: " + (game.noclip ? "ON" : "OFF"), "noclip")}${button("Heal & refill", "supply")}${button("Reset defaults", "reset-dev")}</div><div class="eyebrow" style="margin-top:1rem">SCENE TOOLS</div><div class="toolrow">${button("Base camp", "warp-camp")}${button("Sun gallery", "warp-puzzle")}${button("Goose chamber", "warp-vault")}${button("Boulder escape", "warp-escape")}${button("Solve the lenses", "solve")}</div><p class="hint-line">Simulation: fixed 60 Hz · Physics: Rapier 0.19.3 · Renderer: ${snapshot().renderer}<br>Coordinates: ${game.players.map((p) => esc(p.name) + " " + p.x.toFixed(1) + ", " + p.z.toFixed(1)).join(" · ")}</p></section>`;
  } else if (ui.screen === "help") {
    html = `<section class="sheet wide"><div class="panel-head"><div><div class="eyebrow">READ BEFORE DISTURBING THE ANCIENT DEAD</div><h2>The field guide</h2></div>${button("← Back", "back")}</div><div class="help-grid"><div class="help-card"><h3>01 · Boots & a good whip</h3><p>Move with the left stick or WASD. ${glyph("jump")} jumps; ${glyph("roll")} rolls through danger; hold ${glyph("sprint")} to sprint. Near the river’s bronze ring, ${glyph("interact")} swings you across.</p></div><div class="help-card"><h3>02 · Professional disagreements</h3><p>${glyph("whip")} cracks the whip and stuns nearby rivals. Aim with the right stick or mouse, then ${glyph("shoot")} fires the pistol. Shots are limited; the whip never runs dry. Jump darts and watch the orange trap warning.</p></div><div class="help-card"><h3>03 · Borrowed sunlight</h3><p>${glyph("interact")} turns a sun lens a quarter turn. Route the sun from I to II, II to III, then III west toward the bronze receiver. The glowing beam shows your work. The journal keeps the clue.</p></div><div class="help-card"><h3>04 · A bird in the hand</h3><p>Beat Captain Brass and exchange sand for the goose. Three presses inside the gold band earn a head start. Take the eastern door, sprint south, jump the broken floor, and reach the river launch.</p></div></div><p class="hint-line">Couch co-op: player one uses WASD + mouse or pad 1. Player two uses arrows, Enter to jump, Right Shift to roll, / to whip, . to shoot, ' to interact, 0 to sprint, or pad 2. Extra connected pads can join with ${glyph("jump")}. Get close and interact to revive a fallen partner.<br>Touch: drag anywhere on the left to move. Tap or drag on the right to fight and aim. Grappling, lenses, revives and the idol use the contextual button. Jumps and close combat receive assistance.</p></section>`;
  } else if (ui.screen === "journal") {
    const obj = objectiveData[game.phase] || objectiveData.approach;
    html = `<section class="sheet wide"><div class="panel-head"><div><div class="eyebrow">MARA QUINN · PERSONAL FIELD NOTES</div><h2>A map. A plan. Several flaws.</h2></div>${button("← Back", "back")}</div><svg class="journal-map" viewBox="0 0 260 390" aria-label="Route map"><path d="M45 345V240M45 210V145H150V75H75V35H210V345" fill="none" stroke="#e7c17b" stroke-width="22" opacity=".6"/><path d="M8 225h180" stroke="#76ada4" stroke-width="19"/><path d="M195 220h30" stroke="#13282a" stroke-width="14"/><g fill="#f8dd9e" font-family="Georgia" font-size="14"><text x="8" y="378">BASE CAMP</text><text x="60" y="230">RIVER · WHIP</text><text x="55" y="150">I</text><text x="154" y="150">II</text><text x="154" y="80">III</text><text x="5" y="35">GOOSE</text><text x="175" y="380">LAUNCH</text><text transform="translate(245 150) rotate(90)">ESCAPE · SOUTH</text></g><path d="M220 295l-10 20-10-20" fill="none" stroke="#f8dd9e" stroke-width="3"/></svg><div class="journal-copy"><p><b>THE CURRENT JOB</b><br>${esc(obj[1])}<br>${esc(obj[2])}</p><hr><p><b>THE LENS INSCRIPTION</b><br>“First, seek your neighbour.<br>Second, seek the northern eye.<br>Third, return the light to the west.”</p><p class="hint-line">Lens I east → Lens II north → Lens III west.<br>A correct lens can remain dark until the previous one feeds it.</p><hr><p><b>WHAT FITS IN OUR POCKETS</b><br>${game.treasures} / 3 curios · ${game.kills} rivals stopped<br>${game.hasRelic ? "One Golden Goose. Suspiciously heavy." : "One bag of sand. Optimistically measured."}</p><p class="hint-line">Checkpoint: ${esc(game.checkpoint.name)}<br>“If anyone asks, we were very careful.”</p></div></section>`;
  } else if (ui.screen === "about") {
    const tabs = ["Source information", "Testing feedback", "Engine feedback", "Prompt feedback"];
    const questions = [
      [],
      ["Issues caught", "Critical / game-breaking issues", "Most helpful test", "Least helpful test"],
      [
        "What worked best",
        "Where I got stuck or guessed wrong",
        "Most important custom system",
        "Hardest engine task",
        "Engine changes",
        "One desired engine change",
      ],
      ["What worked best", "What was confusing", "Hardest requirement", "One suggested prompt change"],
    ];
    let content = "";
    if (ui.aboutTab === 0) {
      content =
        `<div class="credit-row"><b>RAIDERS OF THE GOLDEN GOOSE</b>An original game by OpenAI Codex for Michael Crosato. Original procedural characters, geometry, animation and sound. Inspired by the supplied source; no original film/game assets or recordings are used.</div>` +
        Object.entries(REPORT.sourceInformation)
          .map(
            ([k, v]) => `<div class="credit-row"><b>${esc(k.replace(/([A-Z])/g, " $1"))}</b>${esc(v)}</div>`,
          )
          .join("") +
        '<div class="credit-row"><b>Libraries & acknowledgements</b>Three.js · MIT · Rapier / Dimforge · Apache-2.0 · AI Hub session client by Michael Crosato. Title chosen with node:crypto.randomInt from 50 original candidates.</div>';
    } else {
      const values = [null, REPORT.testingFeedback, REPORT.engineFeedback, REPORT.promptFeedback][
        ui.aboutTab
      ];
      content = values
        .map((v, i) => `<div class="credit-row"><b>${questions[ui.aboutTab][i]}</b>${esc(v)}</div>`)
        .join("");
    }
    html = `<section class="sheet wide"><div class="panel-head"><div><div class="eyebrow">THE EXPEDITION’S PAPER TRAIL</div><h2>About & credits</h2></div>${button("← Back", "back")}</div><div class="tabs">${tabs.map((t, i) => button(t, "about-tab-" + i, 'aria-pressed="' + (i === ui.aboutTab) + '" ' + (i === ui.aboutTab ? 'data-active="true"' : ""))).join("")}</div><div class="credits-scroll" tabindex="0">${content}</div><p class="hint-line">Scroll with the mouse wheel, touch, or the right stick. Usage: ${esc(REPORT.sourceInformation.usage)}.</p></section>`;
  } else if (ui.screen === "failure") {
    html = `<section class="sheet pause-sheet"><div class="eyebrow">A TEMPORARY SETBACK</div><h2>Another fine mess.</h2><p class="subtitle">The goose is still out there. So is your hat.<br>Continue from ${esc(game.checkpoint.name)} with full health.</p><div class="menu-actions">${button("Try that again", "retry", "", true)}${button("Developer toolkit", "dev")}${button("Return to title", "title")}</div></section>`;
  } else if (ui.screen === "victory") {
    const seconds = Math.floor(game.elapsed),
      time = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
    html = `<section class="sheet"><div class="eyebrow">QUINN & COMPANY · EXPEDITION SUCCESSFUL</div><h2>The goose is loose.</h2><p class="subtitle">One priceless bird. A rather large repair bill.<br>“Put it under expenses. What could they possibly object to?”</p><div class="stats"><div class="stat"><strong>${game.score.toLocaleString()}</strong><span>Expedition score</span></div><div class="stat"><strong>${time}</strong><span>Time in the field</span></div><div class="stat"><strong>${game.treasures}/3</strong><span>Curios recovered</span></div></div><p class="hint-line">${game.cleanSwap ? "A perfect exchange. Three steady hands." : "An imperfect exchange. A perfectly good escape."}<br>${game.kills} rivals stopped · ${game.revives} partners revived · ${game.deaths} checkpoint retries</p><div class="menu-actions">${button("Another questionable expedition", "again", "", true)}${button("About & credits", "about")}${button("Return to title", "title")}</div></section>`;
  }
  $("menu").innerHTML = html;
  $("menu")
    .querySelectorAll("[data-action]")
    .forEach((el) =>
      el.addEventListener("click", () => {
        if (performance.now() < controls.suppressUntil) return;
        audio.unlock();
        audio.effect("ui");
        menuAction(el.dataset.action);
      }),
    );
  $("menu")
    .querySelectorAll("[data-focus]")
    .forEach((el) => {
      el.addEventListener("pointerenter", () => setMenuFocus(menuItems().indexOf(el)));
      el.addEventListener("focus", () => setMenuFocus(menuItems().indexOf(el)));
    });
  $("menu")
    .querySelectorAll("input[type=range]")
    .forEach((el) =>
      el.addEventListener("input", () => {
        const obj = el.dataset.scope === "settings" ? settings : tuning;
        obj[el.dataset.key] = Number(el.value);
        $("out-" + el.dataset.key).textContent =
          el.dataset.scope === "settings" && ["master", "music", "sfx"].includes(el.dataset.key)
            ? Math.round(el.value * 100) + "%"
            : Number(el.value).toFixed(Number(el.step) < 1 ? 2 : 0);
        if (el.dataset.scope === "settings") {
          safeStore.set("settings", JSON.stringify(settings));
          resize();
          audio.updateSettings();
        }
      }),
    );
  $("glyph-choice")?.addEventListener("change", (e) => {
    settings.glyphs = e.target.value;
    safeStore.set("settings", JSON.stringify(settings));
    refreshPrompts();
  });
  $("menu")
    .querySelectorAll("[data-active=true]")
    .forEach((el) => el.classList.add("active"));
  setMenuFocus(ui.focus);
}
function menuAction(action) {
  if (action.startsWith("about-tab-")) {
    ui.aboutTab = Number(action.at(-1));
    const index = ui.focus;
    renderMenu();
    setMenuFocus(index);
    return;
  }
  if (action === "back") {
    menuBack();
    return;
  }
  if (action === "solo") {
    startGame(false);
    return;
  }
  if (action === "coop") {
    startGame(true);
    return;
  }
  if (action === "continue") {
    startGame(false, true);
    return;
  }
  if (action === "resume") {
    closeMenu();
    return;
  }
  if (action === "title") {
    showTitle();
    return;
  }
  if (action === "retry") {
    retryCheckpoint();
    return;
  }
  if (action === "again") {
    startGame(game.localCoop);
    return;
  }
  if (["settings", "about", "help", "dev", "journal"].includes(action)) {
    openMenu(action, ui.screen === "title" ? "title" : "pause");
    return;
  }
  if (action === "assist") {
    settings.assist = !settings.assist;
    safeStore.set("settings", JSON.stringify(settings));
    renderMenu();
    return;
  }
  if (action === "reset-settings") {
    Object.assign(settings, {
      master: 0.7,
      music: 0.1,
      sfx: 0.8,
      glyphs: "PlayStation",
      zoom: 1,
      shake: 0.65,
      assist: true,
    });
    safeStore.set("settings", JSON.stringify(settings));
    audio.updateSettings();
    resize();
    renderMenu();
    return;
  }
  if (action === "fullscreen") {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else
      document.documentElement
        .requestFullscreen?.()
        .catch(() => toast("Fullscreen is unavailable in this browser."));
    return;
  }
  devAction(action);
}
function devAction(action) {
  if (AIHub.active) return;
  if (action === "god") {
    game.god = !game.god;
    renderMenu();
    return;
  }
  if (action === "noclip") {
    game.noclip = !game.noclip;
    for (const p of game.players) {
      p.collider.setEnabled(!game.noclip);
      p.body.setGravityScale(game.noclip ? 0 : 1, true);
    }
    renderMenu();
    return;
  }
  if (action === "supply") {
    for (const p of game.players) {
      p.hp = p.maxHp;
      p.ammo = p.maxAmmo;
      p.down = false;
      p.action = "";
      p.actionTime = 0;
      p.actor.clips.down.stop();
      p.actor.clips.roll.stop();
      p.actor.rig.rotation.set(0, 0, 0);
      p.actor.rig.position.set(0, 0, 0);
      p.body.setEnabled(true);
    }
    toast("Everyone patched up. Every chamber full.");
    return;
  }
  if (action === "reset-dev") {
    Object.assign(tuning, DEFAULT_TUNING);
    game.god = false;
    game.noclip = false;
    for (const p of game.players) {
      p.collider.setEnabled(true);
      p.body.setGravityScale(1, true);
    }
    renderMenu();
    return;
  }
  if (action === "solve") {
    worldObjects.mirrors.forEach((m) => (m.rotation = m.correct));
    updateMirrors();
    openVault();
    closeMenu();
    return;
  }
  if (action.startsWith("warp-")) {
    const dest = action.slice(5);
    game.status = "playing";
    if (dest === "vault") {
      openVault(true);
      game.phase = "vault";
    }
    if (dest === "puzzle") game.phase = "puzzle";
    if (dest === "camp") game.phase = "approach";
    if (dest === "escape") {
      openVault(true);
      const boss = worldObjects.enemies.find((e) => e.kind === "boss");
      if (!boss.dead) hitEnemy(boss, boss.hp, game.players[0]);
      takeRelic(false);
    }
    const positions = { camp: [0, 8], puzzle: [0, -28], vault: [0, -61], escape: [21, -74] };
    const [x, z] = positions[dest];
    for (const p of game.players) {
      p.hp = p.maxHp;
      p.ammo = p.maxAmmo;
      p.down = false;
      warpPlayer(p, x + (p.id % 2), z + Math.floor(p.id / 2));
    }
    closeMenu();
    return;
  }
}
function refreshPrompts() {
  if (!controls) return;
  if ($("controls"))
    $("controls").innerHTML =
      game.phase === "escape"
        ? `<span>${glyph("sprint")} Sprint</span><span>${glyph("jump")} Jump the gaps</span><span>${glyph("roll")} Roll</span><span>${glyph("pause")} Pause</span>`
        : `<span>${glyph("whip")} Whip</span><span>${glyph("shoot")} Shoot</span><span>${glyph("jump")} Jump</span><span>${glyph("roll")} Roll</span><span>${glyph("pause")} Pause</span>`;
  if ($("balance-key")) $("balance-key").innerHTML = glyph("interact");
  document.querySelectorAll("[data-glyph]").forEach((el) => {
    el.outerHTML = glyph(el.dataset.glyph);
  });
}
function setText(id, text) {
  if ($(id).textContent !== text) $(id).textContent = text;
}
function renderHUD(dt) {
  if ($("hud").hidden) return;
  if (ui.lastPhase !== game.phase) {
    ui.lastPhase = game.phase;
    refreshPrompts();
  }
  ui.lastHud += dt;
  const p = getLocalPlayer(),
    obj = objectiveData[game.phase] || objectiveData.approach;
  if (ui.lastHud > 0.08) {
    ui.lastHud = 0;
    const vitalHTML = game.players
      .filter((p) => p.active)
      .map(
        (p) =>
          `<div class="vital" style="border-color:${["#f6bf59", "#7bd1c5", "#e9966e", "#b7ce8a"][p.id % 4]}"><div class="name">${esc(p.name)}${p.id === playerId ? " · YOU" : ""}</div><div class="hearts ${p.down ? "down" : ""}">${p.down ? "NEEDS A HAND" : "♥".repeat(Math.ceil(p.hp)) + '<span style="opacity:.22">' + "♥".repeat(Math.max(0, p.maxHp - Math.ceil(p.hp))) + "</span>"}</div><div class="ammo">${p.ammo} / ${p.maxAmmo} ROUNDS ${p.rollCooldown > 0 ? "· ROLL RECOVERING" : ""}</div></div>`,
      )
      .join("");
    if ($("vitals").innerHTML !== vitalHTML) $("vitals").innerHTML = vitalHTML;
    setText("objective-num", obj[0]);
    setText("objective-text", obj[1]);
    setText(
      "objective-detail",
      game.phase === "puzzle"
        ? worldObjects.mirrors.filter((m) => m.rotation === m.correct).length +
            " / 3 lenses aligned. " +
            obj[2]
        : obj[2],
    );
    setText("chapter-num", "CHAPTER " + obj[3]);
    setText("chapter-name", obj[4]);
    const context = contextFor(p);
    $("context").hidden = !context || !!ui.screen || game.attract;
    if (context) {
      const value = glyph("interact") + " " + esc(context.text);
      if ($("context-button").innerHTML !== value) $("context-button").innerHTML = value;
    }
    drawMap(p);
  }
  const d = game.dialogue;
  $("dialogue").hidden = !d || (game.attract && game.status === "won");
  if (d) {
    setText("speaker", d.speaker);
    setText("speech", d.text);
  }
  $("balance").hidden = game.phase !== "balance" || !!ui.screen;
  $("balance-needle").style.left = balanceNeedle() * 100 + "%";
  setText("balance-marks", "● ".repeat(game.balanceHits) + "○ ".repeat(3 - game.balanceHits));
  $("escape-meter").hidden = game.phase !== "escape";
  if (game.phase === "escape" && p) {
    const gap = p.z - worldObjects.boulder.z;
    setText(
      "escape-distance",
      game.boulderStarted
        ? Math.max(0, Math.floor(gap)) + " m ahead of the problem"
        : "THE EASTERN DOOR IS OPEN",
    );
    $("escape-meter").querySelector("i").style.width = clamp(gap / 30, 0, 1) * 100 + "%";
  }
  $("attract-banner").hidden = !game.attract;
  if (AIHub.active && hubStarted && !hubEnded) {
    const t = AIHub.time();
    $("hub-banner").hidden = t >= 0;
    if (t < 0) setText("hub-banner", "Expedition begins in " + Math.ceil(-t / 1000) + "…");
  }
}
function drawMap(p) {
  if (!p || controls.lastDevice === "touch") return;
  const c = $("map").getContext("2d"),
    w = 180,
    s = 2.45;
  c.clearRect(0, 0, w, w);
  c.save();
  c.beginPath();
  c.arc(90, 90, 86, 0, TAU);
  c.clip();
  c.translate(90 - p.x * s, 98 - p.z * s);
  c.fillStyle = "#b4b38966";
  c.fillRect(-10 * s, -84 * s, 20 * s, 101 * s);
  c.clearRect(-11 * s, -24 * s, 22 * s, 7 * s);
  c.fillRect(16 * s, -80 * s, 10 * s, 104 * s);
  c.fillRect(10 * s, -80 * s, 7 * s, 10 * s);
  c.clearRect(16 * s, -49 * s, 10 * s, 4 * s);
  c.fillStyle = "#66a59c";
  c.fillRect(-12 * s, -23.5 * s, 24 * s, 5.8 * s);
  c.strokeStyle = "#e5c080";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-3 * s, -57.5 * s);
  c.lineTo(3 * s, -57.5 * s);
  if (!game.gateOpen) c.stroke();
  for (const m of worldObjects.mirrors) {
    c.fillStyle = m.rotation === m.correct ? "#ffe09a" : "#9ad0bf";
    c.beginPath();
    c.arc(m.x * s, m.z * s, 3, 0, TAU);
    c.fill();
  }
  for (const e of worldObjects.enemies)
    if (!e.dead) {
      c.fillStyle = "#e88765";
      c.beginPath();
      c.arc(e.x * s, e.z * s, 2.6, 0, TAU);
      c.fill();
    }
  for (const player of game.players)
    if (player.active) {
      c.fillStyle = player.id === playerId ? "#ffe2a5" : "#8ed5c4";
      c.beginPath();
      c.arc(player.x * s, player.z * s, 4.5, 0, TAU);
      c.fill();
    }
  if (worldObjects.boulder.active) {
    c.strokeStyle = "#f09e6b";
    c.beginPath();
    c.arc(21 * s, worldObjects.boulder.z * s, 7, 0, TAU);
    c.stroke();
  }
  c.restore();
  const goal =
    game.phase === "escape"
      ? { x: 21, z: 22 }
      : game.phase === "approach"
        ? { x: 0, z: -17 }
        : game.phase === "puzzle"
          ? { x: 0, z: -44 }
          : { x: 0, z: -77 };
  const dx = (goal.x - p.x) * s,
    dz = (goal.z - p.z) * s,
    l = Math.hypot(dx, dz),
    scale = Math.min(1, 69 / Math.max(1, l));
  c.fillStyle = "#ffd57c";
  c.font = "18px Georgia";
  c.textAlign = "center";
  c.fillText("✦", 90 + dx * scale, 104 + dz * scale);
  c.strokeStyle = "#bba97888";
  c.lineWidth = 1;
  c.beginPath();
  c.arc(90, 90, 85, 0, TAU);
  c.stroke();
}
