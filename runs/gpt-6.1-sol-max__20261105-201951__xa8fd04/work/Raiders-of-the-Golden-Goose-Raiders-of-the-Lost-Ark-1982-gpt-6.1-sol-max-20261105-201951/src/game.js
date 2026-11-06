let game = {
  status: "title",
  phase: "approach",
  players: [],
  localCoop: false,
  attract: false,
  elapsed: 0,
  score: 0,
  treasures: 0,
  kills: 0,
  deaths: 0,
  shots: 0,
  revives: 0,
  gateOpen: false,
  hasRelic: false,
  checkpoint: { name: "Base camp", x: 0, z: 8, phase: "approach" },
  god: false,
  noclip: false,
  balanceTime: 0,
  balanceHits: 0,
  balanceMisses: 0,
  balanceCooldown: 0,
  balanceOwner: 0,
  boulderStarted: false,
  cleanSwap: false,
  dialogue: null,
  toastTimer: 0,
  introFlags: {},
  attractIndex: 0,
  attractTimer: 0,
};
let hubInfo = null,
  hubStarted = false,
  hubEnded = false,
  hubFinished = false,
  netClock = 0,
  netSequence = 0,
  lastSnapshot = 0;
const remoteInputs = new Map(),
  netPending = { jump: false, roll: false, interact: false };
const EMPTY_INPUT = {
  mx: 0,
  mz: 0,
  ax: 0,
  az: 0,
  whip: false,
  shoot: false,
  jump: false,
  roll: false,
  interact: false,
  sprint: false,
};
const objectiveData = {
  approach: [
    "01",
    "Find the temple beyond the river.",
    "Use the bronze whip anchor to cross the broken bridge.",
    "I",
    "THE SUNKEN APPROACH",
  ],
  puzzle: [
    "02",
    "Wake the three sun lenses.",
    "Follow the beam: I → II → III → the bronze receiver.",
    "II",
    "BORROWED SUNLIGHT",
  ],
  vault: [
    "03",
    "Recover the Golden Goose.",
    "Outwit Captain Brass, then make the switch at the altar.",
    "III",
    "A VERY BAD TRADE",
  ],
  balance: [
    "03",
    "Make a careful exchange.",
    "Three presses in the gold band. A steady hand buys you time.",
    "III",
    "A VERY BAD TRADE",
  ],
  escape: [
    "04",
    "Get the goose to the river launch.",
    "Take the eastern door. Sprint, jump the broken floor, keep moving.",
    "IV",
    "GRAVITY HAS OPINIONS",
  ],
  complete: [
    "05",
    "A respectable day’s archaeology.",
    "One goose. Several complaints. Absolutely no receipt.",
    "V",
    "THE GETAWAY",
  ],
};
function createPlayer(id, name, colorIndex = 0) {
  const actor = makeExplorer(colorIndex);
  actorsRoot.add(actor.root);
  const body = physics.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation((id % 2 ? 1 : -1) * 0.7, 0.88, 8 + Math.floor(id / 2) * 1.2)
      .lockRotations()
      .setLinearDamping(7)
      .setCcdEnabled(true),
  );
  const collider = physics.createCollider(
    RAPIER.ColliderDesc.capsule(0.46, 0.32).setMass(1).setFriction(0),
    body,
  );
  const shadow = mesh(
    geo.cylinder,
    new THREE.MeshBasicMaterial({ color: 0x122b29, transparent: true, opacity: 0.3 }),
    actorsRoot,
    0,
    0.025,
    0,
    0.5,
    0.018,
    0.4,
  );
  const carried = makeGoose(actor.rig, 0.29);
  carried.position.set(-0.42, 0.78, 0.22);
  carried.visible = false;
  const rope = lineBetween(new THREE.Vector3(), new THREE.Vector3(), 0xdbc28c);
  rope.visible = false;
  effectRoot.add(rope);
  const whip = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(Array.from({ length: 19 }, () => new THREE.Vector3())),
    new THREE.LineBasicMaterial({ color: 0xe2ba72 }),
  );
  whip.visible = false;
  effectRoot.add(whip);
  const marker = new THREE.Group();
  marker.position.y = 0.04;
  actor.root.add(marker);
  const ring = mesh(
    geo.torus,
    new THREE.MeshBasicMaterial({
      color: [0xf6bf59, 0x7bd1c5, 0xe9966e, 0xb7ce8a][colorIndex % 4],
      transparent: true,
      opacity: 0.75,
    }),
    marker,
    0,
    0,
    0,
    0.53,
    0.53,
    0.53,
  );
  ring.rotation.x = Math.PI / 2;
  return {
    id,
    name,
    active: true,
    actor,
    body,
    collider,
    shadow,
    carried,
    rope,
    whip,
    marker,
    x: 0,
    y: 0.88,
    z: 8,
    angle: 0,
    hp: 6,
    maxHp: 6,
    ammo: 6,
    maxAmmo: 12,
    invuln: 0,
    whipCooldown: 0,
    shootCooldown: 0,
    jumpCooldown: 0,
    rollCooldown: 0,
    rollTime: 0,
    action: "",
    actionTime: 0,
    move: 0,
    down: false,
    grapple: null,
    grounded: true,
    lastSafe: { x: 0, z: 8 },
    netTarget: null,
    input: { ...EMPTY_INPUT },
    reviveTime: 0,
  };
}
function removePlayers() {
  for (const p of game.players) {
    actorsRoot.remove(p.actor.root, p.shadow);
    effectRoot.remove(p.rope, p.whip);
    physics.removeRigidBody(p.body);
  }
  game.players = [];
}
function configurePlayers(count = 1) {
  removePlayers();
  if (AIHub.active && hubInfo) {
    for (const info of hubInfo.players) game.players.push(createPlayer(info.id, info.name, info.id));
    playerId = hubInfo.server ? null : hubInfo.me;
  } else {
    for (let i = 0; i < count; i++)
      game.players.push(createPlayer(i, ["MARA QUINN", "JULES FINCH", "KIT MERCER", "ROBIN VALE"][i], i));
    playerId = 0;
  }
}
function joinLocalPlayer() {
  if (AIHub.active || !game.localCoop || game.players.length >= 4) return;
  const id = game.players.length,
    p = createPlayer(id, ["MARA QUINN", "JULES FINCH", "KIT MERCER", "ROBIN VALE"][id], id),
    leader = game.players[0];
  game.players.push(p);
  warpPlayer(p, leader.x + 1, leader.z + 1);
  toast(p.name + " joined the expedition.");
  refreshPrompts();
}
function getLocalPlayer() {
  return (
    game.players.find((p) => p.id === playerId) ||
    game.players.find((p) => p.active && !p.down) ||
    game.players[0]
  );
}
function warpPlayer(p, x, z, y = 0.88) {
  for (const name of ["down", "roll", "jump", "grapple", "whip", "shoot"]) p.actor.clips[name].stop();
  p.actor.rig.rotation.set(0, 0, 0);
  p.actor.rig.position.set(0, 0, 0);
  p.move = 0;
  p.rollTime = 0;
  p.action = "";
  p.actionTime = 0;
  p.assistLeap = 0;
  p.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  p.body.setEnabled(true);
  p.collider.setEnabled(true);
  p.body.setGravityScale(game.noclip ? 0 : 1, true);
  p.body.setTranslation({ x, y, z }, true);
  p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  p.x = x;
  p.y = y;
  p.z = z;
  p.grapple = null;
  p.lastSafe = { x, z };
  p.actor.root.position.set(x, y - 0.8, z);
  p.shadow.position.set(x, 0.025, z);
}
function setActorAction(p, name, time) {
  p.action = name;
  p.actionTime = time;
}
function resetWorldState() {
  clearEffects();
  game.elapsed = 0;
  game.score = 0;
  game.treasures = 0;
  game.kills = 0;
  game.deaths = 0;
  game.shots = 0;
  game.revives = 0;
  game.gateOpen = false;
  game.hasRelic = false;
  game.boulderStarted = false;
  game.cleanSwap = false;
  game.phase = "approach";
  game.checkpoint = { name: "Base camp", x: 0, z: 8, phase: "approach" };
  game.introFlags = {};
  game.balanceHits = 0;
  game.balanceMisses = 0;
  game.dialogue = null;
  game.god = false;
  game.noclip = false;
  for (const m of worldObjects.mirrors) m.rotation = [0, 2, 1][m.id];
  updateMirrors(true);
  const d = worldObjects.door;
  d.action.stop();
  d.mixer.setTime(0);
  d.mesh.position.y = 0;
  d.collider.setEnabled(true);
  worldObjects.sideDoor.mesh.position.y = 0;
  worldObjects.sideDoor.collider.setEnabled(true);
  worldObjects.goose.visible = true;
  const b = worldObjects.boulder;
  b.active = false;
  b.mesh.visible = false;
  b.collider.setEnabled(false);
  b.z = -84;
  b.body.setNextKinematicTranslation({ x: 21, y: 2.6, z: b.z });
  for (const e of worldObjects.enemies) {
    e.hp = e.maxHp;
    e.dead = false;
    e.actor.root.visible = true;
    e.actor.root.rotation.set(0, 0, 0);
    e.body.setEnabled(true);
    e.collider.setEnabled(true);
    e.body.setTranslation({ x: e.spawn.x, y: e.height, z: e.spawn.z }, true);
    e.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    e.x = e.spawn.x;
    e.z = e.spawn.z;
    e.stun = 0;
    e.cooldown = 1 + e.id * 0.2;
    e.telegraph = 0;
    e.hpRoot.visible = false;
  }
  for (const p of worldObjects.pickups) {
    p.taken = false;
    p.mesh.visible = true;
  }
  for (const trap of worldObjects.traps) {
    trap.clock = trap.id * 0.73;
    trap.active = false;
    trap.fired = false;
  }
  for (const r of worldObjects.rubble) {
    r.body.setTranslation({ x: r.mesh.position.x, y: 0.55, z: r.mesh.position.z }, true);
    r.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }
}
function startGame(coop = false, restore = false) {
  if (AIHub.active && !hubStarted) return;
  const count = AIHub.active
    ? hubInfo.players.length
    : coop
      ? Math.max(2, Math.min(4, controls.pads.length))
      : 1;
  resetWorldState();
  configurePlayers(count);
  game.localCoop = coop;
  game.attract = false;
  game.status = "playing";
  hubFinished = false;
  document.body.setAttribute("data-playing", "");
  closeMenu();
  $("hud").hidden = false;
  controls.clear();
  audio.resume();
  if (restore) loadCheckpoint();
  else {
    for (const p of game.players) warpPlayer(p, (p.id % 2 ? 1 : -1) * 0.7, 8 + Math.floor(p.id / 2));
    say("MARA", "The map says “certain doom.” Finally, clear directions.");
    toast("FIELD EXPEDITION 01 · THE GOLDEN GOOSE", 4.5);
  }
  cameraTarget.set(getLocalPlayer()?.x || 0, 0, (getLocalPlayer()?.z || 8) - 3);
  refreshPrompts();
}
function setCheckpoint(name, x, z, phase = game.phase) {
  if (game.checkpoint.name === name) return;
  game.checkpoint = { name, x, z, phase };
  for (const p of game.players) if (!p.down) p.hp = Math.min(p.maxHp, p.hp + 1);
  saveCheckpoint();
  toast("CHECKPOINT · " + name + " · one heart restored");
  audio.effect("pickup");
}
function saveCheckpoint() {
  if (AIHub.active || game.attract) return;
  const save = {
    version: 1,
    checkpoint: game.checkpoint,
    phase: game.phase,
    mirrors: worldObjects.mirrors.map((m) => m.rotation),
    gateOpen: game.gateOpen,
    hasRelic: game.hasRelic,
    cleanSwap: game.cleanSwap,
    treasures: game.treasures,
    score: game.score,
    elapsed: game.elapsed,
    kills: game.kills,
    pickups: worldObjects.pickups.filter((p) => p.taken).map((p) => p.id),
    dead: worldObjects.enemies.filter((e) => e.dead).map((e) => e.id),
  };
  safeStore.set("checkpoint", JSON.stringify(save));
}
function loadCheckpoint() {
  let saved;
  try {
    saved = JSON.parse(safeStore.get("checkpoint") || "null");
  } catch {}
  if (!saved || saved.version !== 1) return false;
  game.checkpoint = saved.checkpoint;
  game.phase = saved.phase === "balance" ? "vault" : saved.phase;
  game.gateOpen = saved.gateOpen;
  game.hasRelic = saved.hasRelic;
  game.cleanSwap = saved.cleanSwap;
  game.treasures = saved.treasures;
  game.score = saved.score;
  game.elapsed = saved.elapsed;
  game.kills = saved.kills;
  worldObjects.mirrors.forEach((m, i) => (m.rotation = saved.mirrors[i]));
  updateMirrors(true);
  if (game.gateOpen) openVault(true);
  for (const e of worldObjects.enemies)
    if (saved.dead.includes(e.id)) {
      e.hp = 0;
      e.dead = true;
      e.body.setEnabled(false);
      e.actor.root.visible = false;
    }
  for (const p of worldObjects.pickups)
    if (saved.pickups.includes(p.id)) {
      p.taken = true;
      p.mesh.visible = false;
    }
  if (game.hasRelic) {
    worldObjects.goose.visible = false;
    worldObjects.sideDoor.mesh.position.y = 5;
    worldObjects.sideDoor.collider.setEnabled(false);
    worldObjects.boulder.z = -86;
    worldObjects.boulder.active = true;
    worldObjects.boulder.mesh.visible = true;
    worldObjects.boulder.collider.setEnabled(true);
  }
  for (const p of game.players)
    warpPlayer(p, saved.checkpoint.x + (p.id % 2) * 1.2, saved.checkpoint.z + Math.floor(p.id / 2));
  toast("Continuing from " + saved.checkpoint.name);
  return true;
}
function retryCheckpoint() {
  if (AIHub.active) return;
  game.status = "playing";
  game.phase = game.checkpoint.phase;
  game.deaths++;
  for (const p of game.players) {
    p.hp = p.maxHp;
    p.down = false;
    p.ammo = Math.max(6, p.ammo);
    p.invuln = 3;
    p.action = "";
    p.actor.rig.rotation.set(0, 0, 0);
    p.actor.rig.position.set(0, 0, 0);
    warpPlayer(p, game.checkpoint.x + (p.id % 2) * 1.2, game.checkpoint.z + Math.floor(p.id / 2));
  }
  if (game.phase === "escape") {
    game.boulderStarted = false;
    worldObjects.boulder.z = -86;
    worldObjects.boulder.active = true;
    worldObjects.boulder.collider.setEnabled(true);
  }
  clearEffects();
  closeMenu();
  say("JULES", "Good news: your hat survived.");
  audio.resume();
}
function say(speaker, text, time = 4.7) {
  game.dialogue = { speaker, text, time };
  audio.voice(text, speaker === "BRASS");
}
function toast(text, time = 3) {
  $("toast").textContent = text;
  $("toast").classList.add("visible");
  game.toastTimer = time;
}
function openVault(instant = false) {
  game.gateOpen = true;
  worldObjects.door.collider.setEnabled(false);
  if (instant) worldObjects.door.mesh.position.y = 5.5;
  else {
    const action = worldObjects.door.action;
    action.reset().setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    audio.effect("gate");
    burst(0, 2, -57, 0xe9be78, 25, 6);
    say("MARA", "Civilisation. It’s mostly moving heavy doors.");
    shakeTime = 0.8;
  }
  if (game.phase !== "escape" && game.phase !== "complete") game.phase = "vault";
}
function contextFor(p) {
  if (!p || p.down || (game.status !== "playing" && !game.attract)) return null;
  if (game.phase === "balance") return { type: "balance", text: "Steady the sand", x: p.x, z: p.z };
  for (const other of game.players)
    if (other.active && other.down && dist(p, other) < 2.4)
      return { type: "revive", id: other.id, text: "Help " + other.name + " up", x: other.x, z: other.z };
  if (Math.abs(p.x) < 4.5 && ((p.z < -11 && p.z > -17.4) || (p.z < -23.5 && p.z > -29.5)))
    return { type: "grapple", text: "Whip across the river", x: 0, z: -20.5 };
  for (const m of worldObjects.mirrors)
    if (dist(p, m) < 2.9)
      return {
        type: "mirror",
        id: m.id,
        text:
          "Turn lens " + ["I", "II", "III"][m.id] + " · " + ["north", "east", "south", "west"][m.rotation],
        x: m.x,
        z: m.z,
      };
  if (!game.hasRelic && dist(p, { x: 0, z: -77 }) < 3.3)
    return {
      type: "goose",
      text: worldObjects.enemies.find((e) => e.kind === "boss").dead
        ? "Swap sand for the goose"
        : "The goose can wait. Brass can’t.",
      x: 0,
      z: -77,
    };
  return null;
}
function interact(p) {
  if (!p || p.down) return;
  const c = contextFor(p);
  if (!c) return;
  switch (c.type) {
    case "balance":
      balancePress(p);
      break;
    case "grapple":
      if (!p.grapple) {
        const dest = p.z > -20 ? -26 : -14.6;
        p.grapple = {
          time: 0,
          duration: 1.15,
          start: { x: p.x, z: p.z, y: p.y },
          end: { x: 0, z: dest, y: 0.88 },
        };
        p.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
        p.collider.setEnabled(false);
        p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        setActorAction(p, "grapple", 1.15);
        audio.effect("grapple");
        game.introFlags.grapple = true;
      }
      break;
    case "mirror": {
      const m = worldObjects.mirrors[c.id];
      m.rotation = (m.rotation + 1) % 4;
      updateMirrors();
      audio.effect("lens");
      burst(m.x, 2, m.z, 0xffd77f, 9, 2);
      if (worldObjects.mirrors.every((m) => m.rotation === m.correct) && !game.gateOpen) {
        game.score += 600;
        openVault();
        setCheckpoint("The open vault", 0, -60, "vault");
      }
      break;
    }
    case "goose":
      if (!worldObjects.enemies.find((e) => e.kind === "boss").dead) {
        say("BRASS", "Step away from the bird, Quinn. I have a very expensive buyer.");
        break;
      }
      game.phase = "balance";
      game.balanceTime = 0;
      game.balanceHits = 0;
      game.balanceMisses = 0;
      game.balanceCooldown = 0;
      game.balanceOwner = p.id;
      say("MARA", "Same weight. Different resale value.");
      for (const pp of game.players) pp.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      break;
    case "revive": {
      const other = game.players.find((pp) => pp.id === c.id);
      other.down = false;
      other.hp = 3;
      other.invuln = 3;
      other.actor.rig.rotation.set(0, 0, 0);
      other.actor.rig.position.set(0, 0, 0);
      other.action = "";
      warpPlayer(other, other.x, other.z);
      game.revives++;
      game.score += 100;
      audio.effect("pickup");
      toast(other.name + " is back on their feet.");
      break;
    }
  }
}
function balanceNeedle() {
  return (Math.sin(game.balanceTime * 3.4) + 1) / 2;
}
function balancePress(p, sample = null) {
  if (p.id !== game.balanceOwner || game.balanceCooldown > 0) return;
  game.balanceCooldown = 0.38;
  const needle =
    AIHub.active && p.id !== playerId && Number.isFinite(sample) ? clamp(sample, 0, 1) : balanceNeedle();
  const good = Math.abs(needle - 0.5) < 0.105;
  if (good) {
    game.balanceHits++;
    game.balanceTime += 0.38;
    audio.effect("lens");
    if (game.balanceHits >= 3) takeRelic(true);
  } else {
    game.balanceMisses++;
    audio.effect("rumble");
    shakeTime = 0.35;
    if (game.balanceMisses >= 2) takeRelic(false);
    else toast("Easy. That stonework is judging you.", 1.8);
  }
}
function takeRelic(clean) {
  game.phase = "escape";
  game.hasRelic = true;
  game.cleanSwap = clean;
  game.score += clean ? 1200 : 700;
  worldObjects.goose.visible = false;
  worldObjects.sideDoor.collider.setEnabled(false);
  worldObjects.sideDoor.mesh.position.y = 5;
  const b = worldObjects.boulder;
  b.active = true;
  b.mesh.visible = true;
  b.collider.setEnabled(true);
  b.z = clean ? -92 : -84;
  game.boulderStarted = false;
  setCheckpoint("The river escape", 21, -74, "escape");
  say(
    "JULES",
    clean
      ? "Flawless. Except for the enormous rolling part."
      : "You have the bird. The building has objections.",
    5,
  );
  audio.effect("rumble");
  shakeTime = 1.4;
  burst(0, 3, -77, 0xf2c66f, 40, 7);
}
function aimDirection(p, input) {
  let dx = input.ax || 0,
    dz = input.az || 0;
  const l = Math.hypot(dx, dz);
  if (l > 0.25) return { x: dx / l, z: dz / l };
  return { x: -Math.sin(p.angle), z: -Math.cos(p.angle) };
}
function doWhip(p, input) {
  if (p.whipCooldown > 0 || p.rollTime > 0 || p.grapple) return;
  p.whipCooldown = 0.48;
  setActorAction(p, "whip", 0.43);
  audio.effect("whip");
  const a = aimDirection(p, input);
  for (const e of worldObjects.enemies) {
    if (e.dead) continue;
    const d = dist(p, e);
    if (d > tuning.whipReach) continue;
    const dot = ((e.x - p.x) * a.x + (e.z - p.z) * a.z) / Math.max(0.1, d);
    if (dot > -0.18 || input.touch || (!input.mouseAim && Math.hypot(input.ax, input.az) < 0.3))
      hitEnemy(e, 2, p);
  }
  for (const r of worldObjects.rubble)
    if (dist(p, r.mesh.position) < tuning.whipReach)
      r.body.applyImpulse({ x: a.x * 6, y: 3, z: a.z * 6 }, true);
}
function doShoot(p, input) {
  if (p.shootCooldown > 0 || p.rollTime > 0 || p.grapple) return;
  p.shootCooldown = 0.35;
  if (p.ammo <= 0) {
    audio.effect("empty");
    return;
  }
  p.ammo--;
  game.shots++;
  setActorAction(p, "shoot", 0.25);
  p.actor.gun.visible = true;
  audio.effect("shot");
  let aim = aimDirection(p, input);
  let target = null,
    best = 99;
  for (const e of worldObjects.enemies) {
    if (e.dead) continue;
    const d = dist(p, e);
    const dot = ((e.x - p.x) * aim.x + (e.z - p.z) * aim.z) / Math.max(0.1, d);
    if (
      d < 17 &&
      (dot > 0.82 ||
        input.touch ||
        (settings.assist && !input.mouseAim && Math.hypot(input.ax, input.az) < 0.3)) &&
      d < best
    ) {
      target = e;
      best = d;
    }
  }
  if (target) {
    const d = dist(p, target);
    aim = { x: (target.x - p.x) / d, z: (target.z - p.z) / d };
    p.angle = Math.atan2(-aim.x, -aim.z);
  }
  const origin = { x: p.x + aim.x * 0.55, y: p.y + 0.35, z: p.z + aim.z * 0.55 };
  const ray = new RAPIER.Ray(origin, { x: aim.x, y: 0, z: aim.z });
  const hit = physics.castRay(
    ray,
    19,
    true,
    undefined,
    undefined,
    p.collider,
    undefined,
    (c) => !game.players.some((pp) => pp.collider.handle === c.handle),
  );
  let end = { x: origin.x + aim.x * 19, y: origin.y, z: origin.z + aim.z * 19 };
  if (hit) {
    end = { x: origin.x + aim.x * hit.timeOfImpact, y: origin.y, z: origin.z + aim.z * hit.timeOfImpact };
    const e = worldObjects.enemies.find((e) => !e.dead && e.collider.handle === hit.collider.handle);
    if (e) hitEnemy(e, 1, p);
    else burst(end.x, end.y, end.z, 0xf1cf87, 6, 3);
  }
  const tracer = lineBetween(
    new THREE.Vector3(origin.x, origin.y, origin.z),
    new THREE.Vector3(end.x, end.y, end.z),
    0xffe8a4,
  );
  effectRoot.add(tracer);
  worldObjects.particles.push({ mesh: tracer, v: new THREE.Vector3(), life: 0.075, max: 0.075, line: true });
  burst(origin.x, origin.y, origin.z, 0xffcd69, 4, 2);
}
function hitEnemy(e, damage, source) {
  if (e.dead) return;
  e.hp = Math.max(0, e.hp - damage);
  e.stun = e.kind === "boss" ? 0.2 : 0.65;
  e.hpRoot.visible = true;
  e.bar.scale.x = e.hp / e.maxHp;
  burst(e.x, 0.8, e.z, 0xeec78a, 9, 4);
  audio.effect("hit");
  if (e.hp <= 0) {
    e.dead = true;
    e.body.setEnabled(false);
    game.kills++;
    game.score += e.kind === "boss" ? 1000 : e.kind === "snake" ? 100 : 200;
    e.actor.root.rotation.z = Math.PI / 2;
    e.hpRoot.visible = false;
    if (e.kind === "boss") {
      say("BRASS", "Fine. Keep your ridiculous poultry.");
      toast("CAPTAIN BRASS · OUT OF BUSINESS", 3);
      for (const p of game.players)
        if (!p.down) {
          p.ammo = Math.min(p.maxAmmo, p.ammo + 4);
          p.hp = Math.min(p.maxHp, p.hp + 1);
        }
    }
  } else {
    const d = Math.max(0.1, dist(e, source));
    e.body.applyImpulse({ x: ((e.x - source.x) / d) * 5, y: 1, z: ((e.z - source.z) / d) * 5 }, true);
  }
}
function damagePlayer(p, amount, kind = "hit") {
  if (!p || p.down || p.invuln > 0 || game.god || game.attract || game.noclip) return;
  p.hp = Math.max(0, p.hp - amount * tuning.damageScale);
  p.invuln = 1.15;
  shakeTime = 0.25;
  audio.effect(kind);
  burst(p.x, 0.8, p.z, 0xec9d66, 8, 3);
  if (p.id === playerId) $("hitflash").style.opacity = ".8";
  if (p.hp <= 0) {
    p.down = true;
    p.body.setEnabled(false);
    setActorAction(p, "down", 0.7);
    if (game.players.every((pp) => !pp.active || pp.down)) {
      game.status = "failed";
      audio.effect("fail");
      if (AIHub.active) finishHub(false);
      else if (!game.attract) openMenu("failure");
    } else {
      toast(p.name + " needs a hand. Get close and interact.");
      say("JULES", "On your feet. The ruins are not getting any younger.");
    }
  }
}
function playerStep(p, input, dt) {
  if (!p.active || p.down) return;
  p.input = input;
  for (const key of ["invuln", "whipCooldown", "shootCooldown", "jumpCooldown", "rollCooldown", "actionTime"])
    p[key] = Math.max(0, p[key] - dt);
  if (p.actionTime <= 0) p.action = "";
  if (p.grapple) {
    const g = p.grapple;
    g.time += dt;
    const t = clamp(g.time / g.duration, 0, 1);
    p.body.setNextKinematicTranslation({
      x: lerp(g.start.x, g.end.x, t),
      y: lerp(g.start.y, g.end.y, t) + Math.sin(t * Math.PI) * 4.4,
      z: lerp(g.start.z, g.end.z, t),
    });
    if (t >= 1) {
      p.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      p.collider.setEnabled(true);
      p.body.setTranslation(g.end, true);
      p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      p.grapple = null;
      p.lastSafe = { x: g.end.x, z: g.end.z };
      p.invuln = 0.3;
      if (g.end.z < -20 && game.phase === "approach") {
        game.phase = "puzzle";
        setCheckpoint("The sun gallery", 0, -27, "puzzle");
        say("JULES", "Three lenses. One door. Try not to invent a fourth problem.");
      }
    }
    return;
  }
  if (game.phase === "balance") {
    p.body.setLinvel({ x: 0, y: p.body.linvel().y, z: 0 }, true);
    if (input.interact) balancePress(p, input.balanceSample);
    return;
  }
  const pos = p.body.translation(),
    vel = p.body.linvel();
  p.x = pos.x;
  p.y = pos.y;
  p.z = pos.z;
  const ray = new RAPIER.Ray({ x: p.x, y: p.y, z: p.z }, { x: 0, y: -1, z: 0 });
  const hit = physics.castRay(ray, 1.05, true, undefined, undefined, p.collider, p.body);
  p.grounded = !!hit && hit.timeOfImpact < 0.86 && vel.y < 1;
  if (p.grounded && p.y < 1.4 && Math.abs(p.x) < 29) p.lastSafe = { x: p.x, z: p.z };
  let mx = input.mx || 0,
    mz = input.mz || 0;
  const len = Math.hypot(mx, mz);
  if (len > 1) {
    mx /= len;
    mz /= len;
  }
  let speed = tuning.moveSpeed * (input.sprint ? 1.38 : 1);
  if (input.touch && game.phase === "escape") speed *= 1.1;
  if (game.localCoop && game.players.length > 1 && !game.noclip) {
    const lead = game.players.find((pp) => pp.active && !pp.down && pp !== p);
    if (lead && dist(p, lead) > 17) {
      const dx = lead.x - p.x,
        dz = lead.z - p.z,
        d = Math.hypot(dx, dz);
      mx = lerp(mx, dx / d, 0.7);
      mz = lerp(mz, dz / d, 0.7);
    }
  }
  let jump = input.jump;
  if (input.touch && p.grounded && p.jumpCooldown <= 0) {
    const ahead = { x: p.x + mx * 2.2, z: p.z + mz * 2.2 };
    const gap = p.x > 16 && p.z > -50.8 && p.z < -49.05 && mz > 0.12;
    if (gap) {
      p.assistLeap = (2 * tuning.jumpPower) / 22 + 0.08;
      p.assistDirection = { x: clamp((21 - p.x) * 0.25, -0.3, 0.3), z: 1 };
    }
    if (
      gap ||
      worldObjects.traps.some(
        (t) => t.active && Math.abs(t.z - ahead.z) < 1.8 && (t.zone === "escape") === p.x > 15,
      )
    )
      jump = true;
  }
  if (input.touch && p.assistLeap > 0) {
    p.assistLeap -= dt;
    mx = p.assistDirection.x;
    mz = p.assistDirection.z;
    speed = Math.max(speed, 9.5);
  }
  if (input.roll && p.rollCooldown <= 0 && p.grounded) {
    p.rollTime = 0.38;
    p.rollCooldown = 0.85;
    p.invuln = 0.44;
    p.rollDir = len > 0.1 ? { x: mx, z: mz } : aimDirection(p, input);
    setActorAction(p, "roll", 0.5);
    audio.effect("roll");
  }
  let vy = vel.y;
  if (jump && p.grounded && p.jumpCooldown <= 0 && p.rollTime <= 0) {
    vy = tuning.jumpPower;
    p.jumpCooldown = 0.48;
    p.grounded = false;
    setActorAction(p, "jump", 0.7);
    audio.effect("jump");
  }
  if (p.rollTime > 0) {
    p.rollTime -= dt;
    mx = p.rollDir.x;
    mz = p.rollDir.z;
    speed *= 1.75;
  }
  p.move = Math.hypot(mx, mz) * speed;
  const aimLen = Math.hypot(input.ax || 0, input.az || 0);
  if (aimLen > 0.3 && (input.mouseAim || input.shoot || (aimLen > 0.45 && controls.lastDevice === "pad")))
    p.angle = Math.atan2(-input.ax, -input.az);
  else if (Math.abs(mx) + Math.abs(mz) > 0.1) p.angle = Math.atan2(-mx, -mz);
  if (game.noclip) {
    p.collider.setEnabled(false);
    p.body.setGravityScale(0, true);
    p.body.setLinvel({ x: mx * speed, y: clamp(0.9 - p.y, -5, 5) * 5, z: mz * speed }, true);
  } else {
    p.body.setLinvel({ x: mx * speed, y: vy, z: mz * speed }, true);
  }
  if (input.interact) interact(p);
  if (input.whip || (input.touch && worldObjects.enemies.some((e) => !e.dead && dist(p, e) < 2.8)))
    doWhip(p, input);
  if (input.shoot) doShoot(p, input);
  if (p.y < -7) {
    const where =
      p.x > 15 ? { x: 21, z: p.z < -47 ? -51 : -43 } : p.z > -21 ? { x: 0, z: -14.5 } : { x: 0, z: -26 };
    warpPlayer(p, where.x, where.z);
    damagePlayer(p, 1);
    toast("A narrow escape. One heart for the river.");
    if (game.phase === "escape") worldObjects.boulder.z = Math.min(worldObjects.boulder.z, where.z - 18);
  }
  if (game.gateOpen && p.z < -61 && game.phase === "vault" && !game.introFlags.vault) {
    game.introFlags.vault = true;
    setCheckpoint("The goose chamber", 0, -61, "vault");
    say("BRASS", "Quinn. I expected someone with a bigger expedition.");
  }
  if (game.phase === "escape" && p.x > 16 && p.z > -74) game.boulderStarted = true;
  if (game.phase === "escape" && p.x > 16 && p.x < 27 && p.z > 19) winGame();
}
function enemyStep(e, dt) {
  if (e.dead) return;
  const pos = e.body.translation();
  e.x = pos.x;
  e.z = pos.z;
  e.y = pos.y - e.height;
  e.stun = Math.max(0, e.stun - dt);
  e.cooldown -= dt;
  e.telegraph = Math.max(0, e.telegraph - dt);
  const candidates = game.players.filter(
    (p) =>
      p.active &&
      !p.down &&
      Math.abs(p.z - e.z) < 18 &&
      p.x < 13 &&
      (e.spawn.z < -58 === p.z < -57 || game.gateOpen),
  );
  let target = null,
    d = Infinity;
  for (const p of candidates) {
    const v = dist(e, p);
    if (v < d) {
      d = v;
      target = p;
    }
  }
  if (!target || e.stun > 0 || game.phase === "balance") {
    const v = e.body.linvel();
    e.body.setLinvel({ x: v.x * 0.75, y: v.y, z: v.z * 0.75 }, true);
    return;
  }
  const dx = (target.x - e.x) / d,
    dz = (target.z - e.z) / d;
  e.angle = Math.atan2(-dx, -dz);
  let speed = e.kind === "snake" ? 2.65 : e.kind === "boss" ? 2 : 1.6;
  speed *= tuning.enemyAggression;
  const desired = e.kind === "snake" ? 1 : e.kind === "boss" ? 5 : 6;
  const movement = d > desired ? speed : d < desired - 2 && e.kind !== "snake" ? -speed * 0.45 : 0;
  const vel = e.body.linvel();
  const region = e.spawn.z > -17 ? [-16, 13] : e.spawn.z > -58 ? [-55.7, -25] : [-81, -59.5];
  const nextZ = e.z + dz * movement * dt;
  e.body.setLinvel(
    { x: dx * movement, y: vel.y, z: nextZ < region[0] || nextZ > region[1] ? 0 : dz * movement },
    true,
  );
  e.move = Math.abs(movement);
  if (e.kind === "snake") {
    if (d < 1.05 && e.cooldown <= 0) {
      damagePlayer(target, 1);
      e.cooldown = 1.35 / tuning.enemyAggression;
      e.stun = 0.15;
    }
  } else if (e.cooldown <= 0.65 && e.cooldown > 0) {
    e.telegraph = e.cooldown;
    e.hpRoot.visible = true;
  } else if (e.cooldown <= 0 && d < 14) {
    e.cooldown = (e.kind === "boss" ? 2.4 : 2.1) / tuning.enemyAggression;
    e.telegraph = 0;
    e.fireTime = 0.2;
    const angles = e.kind === "boss" ? [-0.12, 0, 0.12] : [0];
    for (const angle of angles) {
      const c = Math.cos(angle),
        s = Math.sin(angle);
      spawnProjectile(
        e.x + dx * 0.7,
        e.height + 0.22,
        e.z + dz * 0.7,
        (dx * c - dz * s) * 12,
        (dz * c + dx * s) * 12,
        "enemy",
        1,
      );
    }
    audio.effect("shot");
  }
}
function spawnProjectile(x, y, z, vx, vz, kind, damage = 1) {
  const obj = mesh(
    geo.sphere,
    new THREE.MeshBasicMaterial({ color: kind === "dart" ? 0xc9e0b2 : 0xffad52 }),
    effectRoot,
    x,
    y,
    z,
    0.09,
    0.09,
    0.25,
  );
  obj.rotation.y = Math.atan2(vx, vz);
  worldObjects.projectiles.push({ x, y, z, vx, vz, kind, damage, life: 2.7, mesh: obj });
}
function trapStep(t, dt) {
  t.clock += dt * tuning.trapTempo;
  const phase = t.clock % 3.7;
  t.active = phase > 2.65 && phase < 3.15;
  const warning = phase > 1.65 && phase < 2.65;
  t.warning.material.opacity = warning ? 0.12 + Math.sin(phase * 23) * 0.15 : t.active ? 0.34 : 0;
  if (t.kind === "spike") {
    for (const obj of t.mesh.children) if (obj.geometry === geo.cone) obj.position.y = t.active ? 0.35 : -0.4;
    if (t.active)
      for (const p of game.players) {
        if (p.down || p.grapple) continue;
        const inZone = t.zone === "main" ? Math.abs(p.x) < 8.7 : p.x > 16 && p.x < 26;
        if (inZone && Math.abs(p.z - t.z) < 1 && p.y < 1.55) damagePlayer(p, 1);
      }
  } else {
    if (t.active && !t.fired) {
      t.fired = true;
      const cx = t.zone === "main" ? 0 : 21,
        w = t.zone === "main" ? 17 : 8;
      for (const side of [-1, 1])
        for (const offset of [-0.55, 0.45])
          spawnProjectile(cx + side * (w / 2), 1.05, t.z + offset, -side * 15, 0, "dart");
      if (game.players.some((p) => Math.abs(p.z - t.z) < 15)) audio.effect("dart");
    }
    if (!t.active) t.fired = false;
  }
}
function projectileStep(dt) {
  const kept = [];
  for (const b of worldObjects.projectiles) {
    b.life -= dt;
    const prev = { x: b.x, z: b.z };
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    b.mesh.position.set(b.x, b.y, b.z);
    let hit = false;
    if (b.kind === "enemy") {
      const length = Math.hypot(b.vx, b.vz) * dt,
        ray = new RAPIER.Ray(
          { x: prev.x, y: b.y, z: prev.z },
          { x: b.vx / Math.hypot(b.vx, b.vz), y: 0, z: b.vz / Math.hypot(b.vx, b.vz) },
        );
      hit = !!physics.castRay(ray, length, true, undefined, undefined, undefined, undefined, (c) =>
        c.parent()?.isFixed(),
      );
    }
    for (const p of game.players) {
      if (hit) break;
      if (!p.active || p.down || p.grapple) continue;
      const dx = b.x - prev.x,
        dz = b.z - prev.z,
        l = dx * dx + dz * dz,
        t = l ? clamp(((p.x - prev.x) * dx + (p.z - prev.z) * dz) / l, 0, 1) : 0;
      const d = Math.hypot(prev.x + dx * t - p.x, prev.z + dz * t - p.z);
      if (d < 0.42 && b.y > p.y - 0.7 && b.y < p.y + 0.75) {
        damagePlayer(p, b.damage);
        hit = true;
        break;
      }
    }
    if (b.life <= 0 || hit || Math.abs(b.x) > 29) {
      effectRoot.remove(b.mesh);
      b.mesh.material.dispose();
    } else kept.push(b);
  }
  worldObjects.projectiles = kept;
}
function pickupStep() {
  for (const item of worldObjects.pickups) {
    if (item.taken) continue;
    const p = game.players.find((p) => p.active && !p.down && dist(p, item) < 1.15 && p.y < 1.8);
    if (!p) continue;
    if ((item.kind === "health" && p.hp >= p.maxHp) || (item.kind === "ammo" && p.ammo >= p.maxAmmo))
      continue;
    item.taken = true;
    item.mesh.visible = false;
    if (item.kind === "health") {
      p.hp = Math.min(p.maxHp, p.hp + 2);
      toast("FIELD MEDICINE · +2 hearts");
    }
    if (item.kind === "ammo") {
      p.ammo = Math.min(p.maxAmmo, p.ammo + 6);
      toast("SIX GOOD ARGUMENTS · +6 rounds");
    }
    if (item.kind === "treasure") {
      game.treasures++;
      game.score += 500;
      toast("CURIO RECOVERED · " + game.treasures + " / 3 · +500");
      if (game.treasures === 1) say("MARA", "Small enough for a pocket. Important enough for a museum.");
    }
    audio.effect("pickup");
    burst(item.x, 0.6, item.z, item.kind === "treasure" ? 0xf4c65e : 0xc8e5b4, 14, 3);
  }
}
function boulderStep(dt) {
  const b = worldObjects.boulder;
  if (!b.active) return;
  if (game.boulderStarted) {
    b.z += tuning.boulderSpeed * dt;
    if (game.attract) {
      const p = game.players[0];
      if (p.x > 15) b.z = Math.min(b.z, p.z - 9);
    }
    b.body.setNextKinematicTranslation({ x: 21, y: 2.65, z: b.z });
    b.mesh.rotation.x += (dt * tuning.boulderSpeed) / 2.6;
    for (const p of game.players)
      if (p.active && !p.down && p.x > 16 && Math.abs(p.z - b.z) < 3.2 && p.y < 3) {
        damagePlayer(p, 2);
        p.body.applyImpulse({ x: (p.x - 21) * 2, y: 5, z: 10 }, true);
      }
    if (
      Math.floor(game.elapsed * 2) !== Math.floor((game.elapsed - dt) * 2) &&
      game.players.some((p) => p.x > 14 && Math.abs(p.z - b.z) < 18)
    ) {
      audio.effect("rumble");
      shakeTime = Math.max(shakeTime, 0.13);
    }
  }
  b.mesh.position.set(21, 2.65, b.z);
}
function winGame() {
  if (game.status === "won" || game.status === "ended") return;
  if (game.status !== "playing" && !game.attract) return;
  game.status = "won";
  game.phase = "complete";
  game.score += Math.max(0, Math.floor(1800 - game.elapsed * 2));
  audio.effect("win");
  say("MARA", "One priceless goose. Zero structural engineers. A successful expedition.");
  if (game.attract) {
    game.attractTimer = 0;
    return;
  }
  if (AIHub.active) {
    finishHub(true);
    return;
  }
  safeStore.remove("checkpoint");
  openMenu("victory");
}
function fixedStep(dt = 1 / 60, inputs = null) {
  if (hubEnded || (game.status !== "playing" && !game.attract)) return;
  if (AIHub.active && !hubInfo?.isHost) return;
  game.elapsed += dt;
  game.balanceCooldown = Math.max(0, game.balanceCooldown - dt);
  if (game.phase === "balance") {
    game.balanceTime += dt;
    if (game.balanceTime > 19) takeRelic(false);
  }
  const ai = game.attract ? attractInput(dt) : null;
  for (let i = 0; i < game.players.length; i++) {
    const p = game.players[i];
    let input =
      inputs?.[p.id] ||
      (game.attract
        ? ai
        : AIHub.active
          ? p.id === playerId
            ? ui.screen
              ? EMPTY_INPUT
              : controls.frame(0)
            : remoteInput(p.id)
          : controls.frame(i));
    playerStep(p, input || EMPTY_INPUT, dt);
  }
  for (const e of worldObjects.enemies) enemyStep(e, dt);
  for (const t of worldObjects.traps) trapStep(t, dt);
  boulderStep(dt);
  physics.timestep = dt;
  physics.step();
  for (const p of game.players) {
    if (p.down || !p.active) continue;
    const pos = p.body.translation();
    p.x = pos.x;
    p.y = pos.y;
    p.z = pos.z;
  }
  pickupStep();
  projectileStep(dt);
  if (game.attract && game.status === "won") {
    game.attractTimer += dt;
    if (game.attractTimer > 5) beginAttract();
  }
  if (game.phase === "approach" && !game.introFlags.traps && game.players.some((p) => p.z < -1)) {
    game.introFlags.traps = true;
    say("MARA", "Orange tiles mean trouble. Jump the darts. Roll through the gunfire.");
  }
  if (game.phase === "puzzle" && !game.introFlags.lenses && game.players.some((p) => p.z < -31)) {
    game.introFlags.lenses = true;
    say(
      "JULES",
      "The first lens faces the second. The second faces the third. Even the sun needs directions.",
    );
  }
}
function remoteInput(id) {
  const entry = remoteInputs.get(id);
  if (!entry || performance.now() - entry.time > 750) return EMPTY_INPUT;
  const val = { ...entry.input };
  entry.input.jump = false;
  entry.input.roll = false;
  entry.input.interact = false;
  return val;
}
const attractRoute = [
  { x: 0, z: -13.8, action: "grapple" },
  { x: -6, z: -33.7, action: "lens", id: 0 },
  { x: 0, z: -33 },
  { x: 6, z: -33.7, action: "lens", id: 1 },
  { x: 3, z: -40 },
  { x: 6, z: -46.7, action: "lens", id: 2 },
  { x: 0, z: -51 },
  { x: 0, z: -62 },
  { x: 0, z: -65, action: "boss" },
  { x: 0, z: -74.7, action: "goose" },
  { x: 21, z: -74 },
  { x: 21, z: -50.7 },
  { x: 21, z: 20 },
];
function beginAttract() {
  if (AIHub.active) return;
  startGame(false, false);
  game.attract = true;
  game.god = true;
  game.attractIndex = 0;
  game.attractTimer = 0;
  game.status = "playing";
  game.players[0].ammo = 12;
  game.introFlags = {};
  $("attract-banner").hidden = false;
  $("controls").hidden = true;
  $("pause-button").hidden = true;
  controls.lastInput = performance.now();
  closeMenu();
}
function exitAttract() {
  game.attract = false;
  game.god = false;
  $("attract-banner").hidden = true;
  $("pause-button").hidden = false;
  $("controls").hidden = false;
  showTitle();
}
function attractInput(dt) {
  const p = game.players[0];
  if (!p) return EMPTY_INPUT;
  game.attractTimer += dt;
  p.hp = p.maxHp;
  p.ammo = 12;
  if (game.attractTimer > 100) {
    beginAttract();
    return EMPTY_INPUT;
  }
  const out = { ...EMPTY_INPUT, sprint: true };
  if (game.status === "won") return out;
  if (p.grapple) return out;
  if (game.phase === "balance") {
    out.interact = Math.abs(balanceNeedle() - 0.5) < 0.065 && game.balanceCooldown <= 0;
    return out;
  }
  const wp = attractRoute[game.attractIndex] || attractRoute.at(-1),
    dx = wp.x - p.x,
    dz = wp.z - p.z,
    d = Math.hypot(dx, dz);
  if (d > 0.65) {
    out.mx = dx / d;
    out.mz = dz / d;
  } else {
    let done = true;
    if (wp.action === "grapple") {
      out.interact = true;
    } else if (wp.action === "lens") {
      const m = worldObjects.mirrors[wp.id];
      if (m.rotation !== m.correct) {
        out.interact = true;
        done = false;
      }
    } else if (wp.action === "boss") {
      done = worldObjects.enemies.find((e) => e.kind === "boss").dead;
    } else if (wp.action === "goose") {
      if (!game.hasRelic) {
        out.interact = true;
        done = game.phase === "balance";
      }
    }
    if (done) game.attractIndex = Math.min(attractRoute.length - 1, game.attractIndex + 1);
  }
  let target = null,
    best = 30;
  for (const e of worldObjects.enemies)
    if (!e.dead) {
      const d = dist(p, e);
      if (d < best) {
        best = d;
        target = e;
      }
    }
  if (target && best < 13) {
    out.ax = (target.x - p.x) / best;
    out.az = (target.z - p.z) / best;
    out.whip = best < tuning.whipReach;
    out.shoot = best > 2 && best < 13;
  }
  if (p.x > 16 && p.z > -50.7 && p.z < -48.8 && p.grounded) out.jump = true;
  if (
    worldObjects.traps.some(
      (t) => t.active && Math.abs(t.z - p.z) < 2.5 && (t.zone === "escape") === p.x > 15,
    )
  )
    out.jump = p.grounded;
  return out;
}
function updateVisuals(dt) {
  if (hubInfo?.server) return;
  ambientTime += dt;
  renderTime += dt;
  for (const p of game.players) {
    p.actor.root.visible = p.active;
    if (!p.active) continue;
    if (p.netTarget) {
      const t = 1 - Math.exp(-dt * 16);
      p.x = lerp(p.x, p.netTarget.x, t);
      p.y = lerp(p.y, p.netTarget.y, t);
      p.z = lerp(p.z, p.netTarget.z, t);
      p.angle = p.netTarget.angle;
    }
    p.actor.root.position.set(p.x, p.y - 0.8, p.z);
    p.actor.root.rotation.y = p.angle;
    p.actor.animate(p.action, p.move || 0, dt);
    p.carried.visible = game.hasRelic && p.id === (game.balanceOwner ?? game.players[0].id);
    p.shadow.visible = !p.down;
    p.shadow.position.set(p.x, 0.026, p.z);
    const s = clamp(1 - (p.y - 0.88) * 0.08, 0.4, 1);
    p.shadow.scale.set(s, s, s);
    p.actor.root.traverse((o) => {
      if (o.isMesh && o.material !== inkMat)
        o.visible = p.invuln <= 0 || Math.floor(ambientTime * 14) % 2 === 0 || game.attract;
    });
    p.carried.visible = game.hasRelic && p.id === game.balanceOwner;
    p.actor.gun.visible = p.action === "shoot";
    p.marker.visible = !p.down;
    p.rope.visible = !!p.grapple;
    if (p.grapple) {
      p.rope.geometry.setFromPoints([new THREE.Vector3(0, 6.5, -20.5), new THREE.Vector3(p.x, p.y + 1, p.z)]);
      p.rope.geometry.computeBoundingSphere();
    }
    p.whip.visible = p.action === "whip";
    if (p.whip.visible) {
      const progress = 1 - p.actionTime / 0.43,
        points = [];
      const baseAngle = p.angle + Math.sin(progress * Math.PI) * 1.7 - 1.1;
      for (let i = 0; i < 19; i++) {
        const t = i / 18,
          a = baseAngle + t * 1.3 * (1 - progress);
        points.push(
          new THREE.Vector3(
            p.x - Math.sin(a) * t * tuning.whipReach,
            p.y + 0.5 + Math.sin(t * Math.PI) * 0.35,
            p.z - Math.cos(a) * t * tuning.whipReach,
          ),
        );
      }
      p.whip.geometry.setFromPoints(points);
      p.whip.geometry.computeBoundingSphere();
    }
  }
  for (const e of worldObjects.enemies) {
    e.actor.root.position.set(e.x, e.y || 0, e.z);
    e.actor.root.rotation.y = e.angle + (e.kind === "snake" ? Math.PI : 0);
    if (!e.dead) e.actor.animate(e.fireTime > 0 ? "shoot" : "", e.move || 0, dt);
    e.fireTime = Math.max(0, (e.fireTime || 0) - dt);
    e.bar.scale.x = e.hp / e.maxHp;
    e.hpRoot.visible = !e.dead && (e.hp < e.maxHp || e.telegraph > 0);
    e.hpRoot.scale.setScalar(e.telegraph > 0 ? 1 + Math.sin(ambientTime * 18) * 0.12 : 1);
  }
  for (const m of worldObjects.mirrors) {
    const target = (-m.rotation * Math.PI) / 2;
    let d = target - m.rotor.rotation.y;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    m.rotor.rotation.y += d * Math.min(1, dt * 10);
  }
  worldObjects.door.mixer.update(dt);
  for (const f of worldObjects.flames) {
    f.scale.y = 0.9 + Math.sin(ambientTime * 13 + f.position.z) * 0.15;
    f.rotation.y = ambientTime * 2;
  }
  for (const item of worldObjects.pickups)
    if (!item.taken) {
      item.mesh.position.y = 0.55 + Math.sin(ambientTime * 2 + item.id) * 0.1;
      if (item.kind === "treasure") item.mesh.rotation.y += dt * 0.6;
    }
  for (const r of worldObjects.rubble) {
    const p = r.body.translation(),
      q = r.body.rotation();
    r.mesh.position.set(p.x, p.y, p.z);
    r.mesh.quaternion.set(q.x, q.y, q.z, q.w);
  }
  const kept = [];
  for (const p of worldObjects.particles) {
    p.life -= dt;
    if (!p.line) {
      p.v.y -= dt * 6;
      p.mesh.position.addScaledVector(p.v, dt);
      p.mesh.scale.multiplyScalar(Math.max(0.01, 1 - dt * 1.2));
    }
    if (p.life <= 0) {
      effectRoot.remove(p.mesh);
      if (p.line) {
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      }
    } else kept.push(p);
  }
  worldObjects.particles = kept;
  const local = getLocalPlayer();
  let desired = new THREE.Vector3(local?.x || 0, 0, (local?.z || 8) - 3);
  if (game.status === "title") {
    desired.set(3, 0, -46);
    cameraTarget.lerp(desired, Math.min(1, dt * 2));
    cameraPosition.set(cameraTarget.x + 15 + Math.sin(ambientTime * 0.1) * 1.6, 25, cameraTarget.z + 25);
  } else {
    if (game.localCoop && !AIHub.active) {
      const alive = game.players.filter((p) => p.active && !p.down);
      if (alive.length > 1) {
        desired.x = alive.reduce((s, p) => s + p.x, 0) / alive.length;
        desired.z = alive.reduce((s, p) => s + p.z, 0) / alive.length - 3;
      }
    }
    cameraTarget.lerp(desired, Math.min(1, dt * (game.attract ? 3 : 5)));
    cameraPosition.set(cameraTarget.x, 24, cameraTarget.z + 22);
  }
  shakeTime = Math.max(0, shakeTime - dt);
  if (shakeTime > 0) {
    const s = shakeTime * settings.shake * 0.18;
    cameraPosition.x += Math.sin(ambientTime * 71) * s;
    cameraPosition.y += Math.cos(ambientTime * 83) * s;
  }
  camera.position.copy(cameraPosition);
  camera.lookAt(cameraTarget.x, 0.3, cameraTarget.z);
  shadowLight.position.set(cameraTarget.x - 18, 30, cameraTarget.z + 10);
  shadowLight.target.position.copy(cameraTarget);
  shadowLight.target.updateMatrixWorld();
  const opacity = parseFloat($("hitflash").style.opacity) || 0;
  if (opacity > 0) $("hitflash").style.opacity = Math.max(0, opacity - dt * 2);
  if (game.toastTimer > 0) {
    game.toastTimer -= dt;
    if (game.toastTimer <= 0) $("toast").classList.remove("visible");
  }
  if (game.dialogue) {
    game.dialogue.time -= dt;
    if (game.dialogue.time <= 0) game.dialogue = null;
  }
}
function snapshot() {
  return {
    title: TITLE,
    status: game.status,
    phase: game.phase,
    attract: game.attract,
    elapsed: game.elapsed,
    score: game.score,
    treasures: game.treasures,
    kills: game.kills,
    gateOpen: game.gateOpen,
    hasRelic: game.hasRelic,
    cleanSwap: game.cleanSwap,
    balanceHits: game.balanceHits,
    balanceMisses: game.balanceMisses,
    balanceNeedle: balanceNeedle(),
    checkpoint: { ...game.checkpoint },
    screen: ui.screen,
    input: controls.lastDevice,
    renderer: renderer ? (renderer.backend?.isWebGPUBackend ? "WebGPU" : "WebGL2") : "headless server",
    physics: "Rapier 0.19.3",
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      z: p.z,
      hp: p.hp,
      ammo: p.ammo,
      down: p.down,
      grounded: p.grounded,
      action: p.action,
      grapple: !!p.grapple,
    })),
    enemies: worldObjects.enemies.map((e) => ({
      id: e.id,
      kind: e.kind,
      x: e.x,
      z: e.z,
      hp: e.hp,
      dead: e.dead,
    })),
    mirrors: worldObjects.mirrors.map((m) => ({
      rotation: m.rotation,
      correct: m.correct,
      powered: m.powered,
    })),
    boulder: { active: worldObjects.boulder.active, z: worldObjects.boulder.z, started: game.boulderStarted },
    audio: {
      ...audio.played,
      level: audio.level,
      musicVolume: settings.music,
      state: audio.ctx?.state || "locked",
      contextTime: audio.ctx?.currentTime || 0,
      nextNote: audio.nextNote,
      muted: audio.muted,
      masterGain: audio.master?.gain.value,
      musicGain: audio.music?.gain.value,
    },
    hub: {
      active: AIHub.active,
      isHost: hubInfo?.isHost,
      server: hubInfo?.server,
      started: hubStarted,
      ended: hubEnded,
    },
    tuning: { ...tuning },
    god: game.god,
    noclip: game.noclip,
  };
}
function makeNetSnapshot() {
  return {
    t: "w",
    seq: ++netSequence,
    status: game.status,
    phase: game.phase,
    time: game.elapsed,
    score: game.score,
    treasures: game.treasures,
    kills: game.kills,
    gate: game.gateOpen,
    relic: game.hasRelic,
    owner: game.balanceOwner,
    clean: game.cleanSwap,
    balance: [game.balanceTime, game.balanceHits, game.balanceMisses],
    ps: game.players
      .filter((p) => p.active)
      .map((p) => [p.id, p.x, p.y, p.z, p.angle, p.hp, p.ammo, p.down, p.action, p.actionTime, p.move]),
    es: worldObjects.enemies.map((e) => [e.x, e.y, e.z, e.angle, e.hp, e.stun, e.telegraph, e.fireTime || 0]),
    ms: worldObjects.mirrors.map((m) => m.rotation),
    loot: worldObjects.pickups.filter((p) => p.taken).map((p) => p.id),
    ball: [worldObjects.boulder.active, worldObjects.boulder.z, game.boulderStarted],
    bolts: worldObjects.projectiles.slice(0, 24).map((b) => [b.x, b.y, b.z, b.vx, b.vz, b.kind]),
    dialog: game.dialogue,
  };
}
function applyNetSnapshot(s) {
  if (s.seq <= lastSnapshot) return;
  lastSnapshot = s.seq;
  if (s.gate && !game.gateOpen) openVault(true);
  game.status = s.status;
  game.phase = s.phase;
  game.elapsed = s.time;
  game.score = s.score;
  game.treasures = s.treasures;
  game.kills = s.kills;
  game.gateOpen = s.gate;
  game.hasRelic = s.relic;
  game.balanceOwner = s.owner;
  game.cleanSwap = s.clean;
  [game.balanceTime, game.balanceHits, game.balanceMisses] = s.balance;
  worldObjects.goose.visible = !s.relic;
  if (s.relic) {
    worldObjects.sideDoor.collider.setEnabled(false);
    worldObjects.sideDoor.mesh.position.y = 5;
  }
  for (const row of s.ps) {
    const p = game.players.find((p) => p.id === row[0]);
    if (!p) continue;
    p.active = true;
    p.netTarget = { x: row[1], y: row[2], z: row[3], angle: row[4] };
    p.hp = row[5];
    p.ammo = row[6];
    p.down = row[7];
    const old = p.action;
    p.action = row[8];
    p.actionTime = row[9];
    p.move = row[10];
    if (old !== p.action && p.action === "whip") audio.effect("whip");
    if (old !== p.action && p.action === "shoot") audio.effect("shot");
  }
  s.es.forEach((r, i) => {
    const e = worldObjects.enemies[i];
    [e.x, e.y, e.z, e.angle, e.hp, e.stun, e.telegraph, e.fireTime] = r;
    e.dead = e.hp <= 0;
    e.actor.root.rotation.z = e.dead ? Math.PI / 2 : 0;
  });
  let changed = false;
  s.ms.forEach((rot, i) => {
    if (worldObjects.mirrors[i].rotation !== rot) {
      worldObjects.mirrors[i].rotation = rot;
      changed = true;
    }
  });
  if (changed) updateMirrors();
  for (const item of worldObjects.pickups) {
    item.taken = s.loot.includes(item.id);
    item.mesh.visible = !item.taken;
  }
  const b = worldObjects.boulder;
  [b.active, b.z, game.boulderStarted] = s.ball;
  b.mesh.visible = b.active;
  b.mesh.position.set(21, 2.65, b.z);
  if (s.dialog?.text !== game.dialogue?.text && s.dialog)
    audio.voice(s.dialog.text, s.dialog.speaker === "BRASS");
  game.dialogue = s.dialog ? { ...s.dialog } : null;
  for (const b of worldObjects.projectiles) effectRoot.remove(b.mesh);
  worldObjects.projectiles = [];
  for (const row of s.bolts) spawnProjectile(row[0], row[1], row[2], row[3], row[4], row[5]);
}
function finishHub(won) {
  if (!AIHub.active || !hubInfo?.isHost || hubFinished || hubEnded) return;
  hubFinished = true;
  const ids = game.players.filter((p) => p.active).map((p) => p.id),
    scores = {},
    stats = {};
  for (const id of ids) {
    scores[id] = game.score;
    stats[id] = {
      Curios: game.treasures + "/3",
      "Rivals defeated": game.kills,
      "Clean exchange": game.cleanSwap ? "Yes" : "No",
      "Team revives": game.revives,
    };
  }
  AIHub.finish({ standings: [ids], scores, won, stats });
}
async function initNetwork(connection) {
  hubInfo = await connection;
  if (!hubInfo) return false;
  configurePlayers();
  game.status = "hub-wait";
  ui.screen = null;
  $("menu").hidden = true;
  $("hud").hidden = false;
  $("hub-banner").hidden = false;
  $("hub-banner").textContent = "The expedition is assembling…";
  AIHub.on("start", () => {
    if (hubEnded) return;
    hubStarted = true;
    startGame(false, false);
    $("hub-banner").hidden = false;
    // Establish the initial world and each seat's neutral input before lossy motion updates.
    if (hubInfo.isHost) AIHub.send(makeNetSnapshot(), { reliable: true });
    else if (!hubInfo.server)
      AIHub.send(
        { t: "i", seq: ++netSequence, input: { ...EMPTY_INPUT } },
        { to: hubInfo.host, reliable: true },
      );
  });
  AIHub.on("message", (data, from) => {
    if (hubEnded || !data || typeof data !== "object") return;
    if (hubInfo.isHost && data.t === "i" && game.players.some((p) => p.id === from && p.active)) {
      const source = data.input || {},
        input = { ...EMPTY_INPUT };
      for (const key of ["mx", "mz", "ax", "az"])
        input[key] = Number.isFinite(source[key]) ? clamp(source[key], -1, 1) : 0;
      for (const key of ["jump", "roll", "interact", "shoot", "whip", "sprint", "mouseAim", "touch"])
        input[key] = source[key] === true;
      input.balanceSample = Number.isFinite(source.balanceSample) ? clamp(source.balanceSample, 0, 1) : null;
      const old = remoteInputs.get(from);
      for (const key of ["jump", "roll", "interact"]) input[key] = input[key] || !!old?.input[key];
      remoteInputs.set(from, { input, time: performance.now() });
    } else if (!hubInfo.isHost && from === hubInfo.host && data.t === "w") applyNetSnapshot(data);
  });
  AIHub.on("leave", ({ id }) => {
    const p = game.players.find((p) => p.id === id);
    if (p) {
      p.active = false;
      p.actor.root.visible = false;
      p.shadow.visible = false;
      p.body.setEnabled(false);
    }
    remoteInputs.delete(id);
  });
  AIHub.on("time-up", () => finishHub(game.status === "won"));
  AIHub.on("end", () => {
    hubEnded = true;
    game.status = "ended";
    audio.stop();
    controls.clear();
    $("hub-banner").hidden = false;
    $("hub-banner").textContent = "Expedition complete. Waiting for the next adventure.";
    if (ui.screen) closeMenu();
  });
  AIHub.ready();
  return true;
}
function networkTick(dt) {
  if (!AIHub.active || !hubInfo || hubEnded || !hubStarted || AIHub.time() < 0) return;
  netClock += dt;
  if (!hubInfo.isHost && !hubInfo.server) {
    const input = ui.screen ? EMPTY_INPUT : controls.frame(0);
    for (const k of ["jump", "roll", "interact"]) netPending[k] = netPending[k] || input[k];
    if (input.interact) netPending.balanceSample = balanceNeedle();
    if (netClock >= 0.11) {
      AIHub.send(
        { t: "i", seq: ++netSequence, input: { ...input, ...netPending } },
        { to: hubInfo.host, reliable: false },
      );
      for (const k of ["jump", "roll", "interact"]) netPending[k] = false;
      netPending.balanceSample = null;
      netClock = 0;
    }
  } else if (hubInfo.isHost && netClock >= 0.11) {
    AIHub.send(makeNetSnapshot(), { reliable: false });
    netClock = 0;
  }
}
