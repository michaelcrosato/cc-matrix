/* ============================== screens ============================== */
const ABOUT_TEXT = %%ABOUT_JSON%%;
const App = { mode: 'title', idle: 0, last: 0, touchOnly: false, touchSettings: false, attract: null, titleT: 0 };
const STAGES = [
  { name: 'STAGE 1 — HALCYON SEA', cp: 0 },
  { name: 'STAGE 2 — GATE CUT CANYON', cp: 1 },
  { name: 'STAGE 3 — BASTION WALKER', cp: 2 },
  { name: 'STAGE 4 — LEVIATHAN FLEET', cp: 3 },
];
function fadeTo(fn, ms = 500) {
  const f = $('fade'); f.style.opacity = 1;
  setTimeout(() => { fn(); f.style.opacity = 0; }, ms);
}
function settingsMenu(onBack) {
  const tog = (label, key, after) => ({ label, kind: 'toggle', get: () => S[key], set: (v) => { S[key] = v; saveSettings(); if (after) after(); } });
  const sld = (label, key, min, max, step, fmt) => ({ label, kind: 'slider', min, max, step, fmt, get: () => S[key], set: (v) => { S[key] = +v.toFixed(2); saveSettings(); } });
  return {
    title: 'Settings', sub: 'Changes are saved automatically', cls: 'solid', onBack,
    body: () => '<div class="stickRow"><div class="stick"><i></i></div><div>STICK TEST: push the left stick up and right. The dot should follow it. If it moves the wrong way, turn on the matching invert option below.</div></div>',
    items: [
      tog('Invert horizontal axis (gamepad)', 'invertX'),
      tog('Invert vertical axis (gamepad)', 'invertY'),
      { label: 'Free-flight pitch', kind: 'choice', opts: ['STICK UP = CLIMB', 'STICK UP = DIVE'], get: () => S.pitchStyle, set: (v) => { S.pitchStyle = v; saveSettings(); } },
      sld('Stick deadzone', 'deadzone', 0.05, 0.4, 0.05, (v) => `${Math.round(v * 100)}%`),
      sld('Steering sensitivity', 'sens', 0.5, 1.5, 0.1, (v) => `${v.toFixed(1)}x`),
      tog('Lock-on aim assist', 'aimAssist'),
      { label: 'Difficulty', kind: 'choice', opts: DIFFS.map((d) => d.name), get: () => S.difficulty, set: (v) => { S.difficulty = v; saveSettings(); } },
      sld('Music volume', 'music', 0, 1, 0.1, (v) => `${Math.round(v * 100)}%`),
      sld('Effects volume', 'sfx', 0, 1, 0.1, (v) => `${Math.round(v * 100)}%`),
      sld('Screen shake', 'shake', 0, 1, 0.25, (v) => `${Math.round(v * 100)}%`),
      tog('Controller rumble', 'rumble'),
      tog('Bloom glow', 'bloom'),
      tog('Speed FOV effect', 'fovFx'),
      tog('Tutorial hints', 'hints'),
      { label: 'Button prompts', kind: 'choice', opts: ['AUTO', 'PLAYSTATION', 'KEYBOARD'], get: () => S.glyphs, set: (v) => { S.glyphs = v; saveSettings(); } },
      { label: 'Reset to defaults', kind: 'button', action: () => { Object.assign(S, DEFAULTS); saveSettings(); Snd.applyVolumes(); UI.refresh(); } },
      { label: 'Back', kind: 'button', action: () => UI.back() },
    ],
  };
}
function controlsMenu() {
  const rows = [
    ['Steer ship', 'LEFT STICK (or right stick / D-pad)', 'WASD or ARROW KEYS'],
    ['Fire laser (tap)', '✕ CROSS or □ SQUARE', 'SPACE, Z or J'],
    ['Charge lock-on (hold, release)', 'HOLD ✕, release to fire', 'HOLD SPACE, release'],
    ['Barrel roll / deflect shots', 'L1 (left)  ·  R1 (right)', 'Q (left)  ·  E (right)'],
    ['Nova bomb', '○ CIRCLE', 'X or K'],
    ['Boost', 'R2', 'SHIFT'],
    ['Brake', 'L2', 'C or CTRL'],
    ['U-turn (all-range mode)', '△ TRIANGLE', 'R'],
    ['Pause', 'OPTIONS', 'ESC or P'],
    ['Menu select / back', '✕ / ○ and D-pad', 'ENTER / ESC and ARROWS'],
  ];
  return {
    title: 'Controls', sub: 'Built for a PS5 controller; keyboard mirrors it', cls: 'solid', scrollBody: true,
    body: `<table><tr><td><b>ACTION</b></td><td><b>PS5 CONTROLLER</b></td><td><b>KEYBOARD</b></td></tr>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table><p>Barrel rolling reflects enemy shots back at them. Braking makes tail-gunners overshoot you. Touch screens are not supported.</p>`,
    items: [{ label: 'Back', kind: 'button', action: () => UI.back() }],
  };
}
function aboutMenu() {
  return {
    title: 'About / Credits', sub: 'Source information and feedback', cls: 'solid', scrollBody: true,
    body: () => `<pre>${ABOUT_TEXT.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`,
    items: [{ label: 'Back', kind: 'button', action: () => UI.back() }],
  };
}
function stageMenu() {
  return {
    title: 'Stage Select', sub: 'Jump to any section of the demo', cls: 'solid',
    items: [...STAGES.map((s) => ({ label: s.name, kind: 'button', action: () => UI.show(briefingMenu(s.cp), true) })), { label: 'Back', kind: 'button', action: () => UI.back() }],
  };
}
function briefingMenu(cp) {
  const txt = [
    'The Gloam Dominion is anchoring its Leviathan carrier over Halcyon Reach. As <b>Ember</b>, lead of the Lantern Wing, you will skim the sea, thread the Gate Cut Canyon, crack the Bastion Walker, then take the fight to the Leviathan in all-range combat.',
    'Fly through <b>gold rings</b> to repair, <b>blue rings</b> for nova bombs and <b>green pods</b> to upgrade your laser.',
  ];
  return {
    title: 'Mission 1 · Halcyon Reach', sub: STAGES[cp].name, cls: 'solid',
    body: () => `<p>${txt[0]}</p><p>${txt[1]}</p><h3>Quick controls</h3><p>${gl('move')} steer &nbsp; ${gl('fire')} fire (hold for lock-on) &nbsp; ${gl('roll')} barrel roll<br>${gl('bomb')} bomb &nbsp; ${gl('boost')} boost &nbsp; ${gl('brake')} brake &nbsp; ${gl('pause')} pause</p>`,
    items: [{ label: 'Launch', kind: 'button', action: () => beginGame(cp) }, { label: 'Back', kind: 'button', action: () => UI.back() }],
  };
}
function titleMenu() {
  return {
    title: 'Main Menu', sub: 'Press a button to begin', left: true, cls: 'clear',
    items: [
      { label: 'Start mission', kind: 'button', action: () => UI.show(briefingMenu(0), true) },
      { label: 'Stage select', kind: 'button', action: () => UI.show(stageMenu(), true) },
      { label: 'Controls', kind: 'button', action: () => UI.show(controlsMenu(), true) },
      { label: 'Settings', kind: 'button', action: () => UI.show(settingsMenu(), true) },
      { label: 'About / credits', kind: 'button', action: () => UI.show(aboutMenu(), true) },
    ],
  };
}
function pauseMenu() {
  return {
    title: 'Paused', sub: STAGES[Math.min(G.cp, 3)].name, cls: '', pauseBack: true, onBack: resumeGame,
    items: [
      { label: 'Resume', kind: 'button', action: resumeGame },
      { label: 'Settings', kind: 'button', action: () => UI.show(Object.assign(settingsMenu(), { onBack: () => UI.show(pauseMenu()) })) },
      { label: 'Controls', kind: 'button', action: () => UI.show(Object.assign(controlsMenu(), { onBack: () => UI.show(pauseMenu()) })) },
      { label: 'Restart from checkpoint', kind: 'button', action: () => { UI.closeAll(); fadeTo(() => startMission(G.cp)); } },
      { label: 'Quit to title', kind: 'button', action: () => { UI.closeAll(); fadeTo(enterTitle); } },
    ],
  };
}
function pauseGame() { if (G.state !== 'play') return; G.state = 'paused'; Snd.charge(false); UI.show(pauseMenu()); }
function resumeGame() { UI.closeAll(); G.state = 'play'; }
UI.showGameOver = function () {
  UI.show({
    title: 'Mission Failed', sub: 'Lantern Wing is counting on you, Ember', cls: 'solid',
    items: [
      { label: 'Retry from checkpoint', kind: 'button', action: () => { UI.closeAll(); fadeTo(() => startMission(G.cp)); } },
      { label: 'Restart mission', kind: 'button', action: () => { UI.closeAll(); fadeTo(() => startMission(0, { fresh: true })); } },
      { label: 'Quit to title', kind: 'button', action: () => { UI.closeAll(); fadeTo(enterTitle); } },
    ],
  });
};
UI.showResults = function (r) {
  const t = Math.round(r.time), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
  UI.show({
    title: 'Mission Complete', sub: 'The Leviathan fleet is broken', cls: 'solid',
    body: () => `<div style="font-size:9vh;font-weight:900;color:var(--hot);line-height:1;text-shadow:0 0 22px #f80">RANK ${r.rank}</div><table>
      <tr><td>Score</td><td>${r.score.toLocaleString('en-US')}</td></tr><tr><td>Enemies downed</td><td>${r.kills} / ${r.spawned} (${Math.round(r.killPct * 100)}%)</td></tr>
      <tr><td>Best hit chain</td><td>${r.maxHits}</td></tr><tr><td>Rings collected</td><td>${r.rings} / ${r.ringsTotal}</td></tr>
      <tr><td>Damage taken</td><td>${r.dmg}</td></tr><tr><td>Flight time</td><td>${mm}:${ss}</td></tr></table>`,
    items: [
      { label: 'Fly again', kind: 'button', action: () => { UI.closeAll(); fadeTo(() => { UI.show(Object.assign(briefingMenu(0), { onBack: () => { UI.closeAll(); fadeTo(enterTitle); } })); }); } },
      { label: 'Back to title', kind: 'button', action: () => { UI.closeAll(); fadeTo(enterTitle); } },
    ],
  });
};
function beginGame(cp) {
  UI.closeAll(); $('logo').style.display = 'none'; $('titleHint').style.display = 'none'; App.mode = 'transition';
  fadeTo(() => { App.mode = 'play'; startMission(cp, { fresh: true }); Snd.init(); });
}
function enterTitle() {
  resetEntities(); Comm.clear();
  Object.assign(G, { demo: false, cheat: false, state: 'off', mode: 'rail', railZ: -60, speed: 40, whiteout: 0, finished: false });
  Input.ai = null; App.mode = 'title'; App.idle = 0; App.titleT = 0; App.attract = null;
  HUD.show(false); World.setMode('rail'); setEnv('sea'); Music.set('title'); makeAllies();
  Object.assign(P, { dead: false, laser: 3, hp: 100, max: 100, locks: [], charging: false, rollT: 0, boosting: false, braking: false, lx: 0, ly: 0, inv: 0 });
  P.mesh.visible = true; camera.fov = 50; camera.updateProjectionMatrix();
  $('logo').style.display = 'block'; $('titleHint').style.display = 'block'; $('titleHint').textContent = 'Idle for 10 seconds to watch the attract demo';
  UI.show(titleMenu());
}
function titleScene(dt) {
  App.titleT += dt; const t = App.titleT;
  G.railZ -= 38 * dt; G.t += dt;
  if (-G.railZ > 2800) { G.railZ = -60; World.clearRail(); }
  P.lx = Math.sin(t * 0.5) * 5; P.ly = Math.sin(t * 0.7) * 2.5; P.pos.set(P.lx, P.ly, G.railZ);
  P.mesh.position.copy(P.pos); P.mesh.rotation.set(Math.sin(t * 0.7) * 0.05, 0, Math.cos(t * 0.5) * 0.35, 'YXZ');
  const fl = P.mesh.userData.flames; if (fl) fl.forEach((c) => c.scale.set(1, 1.1 + Math.random() * 0.4, 1));
  const back = V3(0, 0, 4).applyQuaternion(P.mesh.quaternion).add(P.pos); Fx.emit(back, 1, { color: 0x66ccff, speed: 3, size: 1, life: 0.3, drag: 3 });
  updateAlliesRail(dt);
  World.update(camera, G.railZ);
  const a = t * 0.22 + 0.6;
  camera.position.set(P.pos.x + Math.sin(a) * 21, P.pos.y + 4 + Math.sin(t * 0.4) * 2, P.pos.z + Math.cos(a) * 21 - 4);
  camera.up.set(0, 1, 0); camera.lookAt(P.pos); camera.translateX(-6.5);
  updateEnvFollow(camera); sun.position.copy(P.pos).addScaledVector(SUN_DIR, 220); sun.target.position.copy(P.pos); sun.target.updateMatrixWorld();
  Fx.update(dt);
}

/* ============================== attract mode ============================== */
const ATTRACT = [{ cp: 0, dur: 36 }, { cp: 1, dur: 30 }, { cp: 2, dur: 40 }, { cp: 3, dur: 44 }];
function startAttract(seg = 0) {
  UI.closeAll(); $('logo').style.display = 'none'; $('titleHint').style.display = 'none';
  App.mode = 'attract'; App.attract = { seg, t: 0, switching: false };
  G.demoEnded = false; startMission(ATTRACT[seg].cp, { demo: true });
  G.state = 'play'; Input.activity = false;
}
function endAttract() { Input.ai = null; G.demo = false; G.cheat = false; fadeTo(enterTitle, 300); App.mode = 'transition'; }
function updateAttract(dt) {
  const A = App.attract;
  if (Input.activity || Input.anyPressed) { endAttract(); return; }
  updateGame(dt); A.t += dt;
  if (!A.switching && (A.t > ATTRACT[A.seg].dur || G.demoEnded)) {
    A.switching = true; $('fade').style.opacity = 1;
    setTimeout(() => { if (App.mode !== 'attract') return; const next = (A.seg + 1) % ATTRACT.length; startAttract(next); $('fade').style.opacity = 0; }, 600);
  }
}

/* ============================== main loop ============================== */
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, ((now - App.last) / 1000) || 0.016); App.last = now;
  Input.update(dt);
  bloom.enabled = S.bloom;
  const blocked = App.touchOnly && !Input.hasKey && !Input.hasPad && !App.touchSettings;
  $('touch').style.display = blocked ? 'flex' : 'none';
  if (!blocked) {
    if (App.mode === 'title') {
      titleScene(dt); UI.update(dt);
      if (Input.activity || Input.anyPressed || Input.nav.up || Input.nav.down) App.idle = 0; else App.idle += dt;
      if (App.idle >= 10) startAttract(0);
    } else if (App.mode === 'attract') updateAttract(dt);
    else if (App.mode === 'play') {
      if (UI.isOpen()) UI.update(dt);
      else if (G.state === 'play' && Input.p.pause) pauseGame();
      if (G.state === 'play' || G.state === 'ended') updateGame(dt);
    }
  } else if (App.mode === 'title') titleScene(dt);
  if (Input.activity) Input.activity = false;
  composer.render();
}
document.addEventListener('visibilitychange', () => { if (document.hidden && App.mode === 'play' && G.state === 'play' && !UI.isOpen()) pauseGame(); });

function boot() {
  Input.init(); HUD.init(); UI.init();
  P.mesh = Mdl.hero(); scene.add(P.mesh); addShadow(P.mesh);
  App.touchOnly = !window.matchMedia('(any-pointer: fine)').matches && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
  $('touchSettings').addEventListener('click', () => {
    App.touchSettings = true; $('touch').style.display = 'none';
    UI.show(settingsMenu(() => { App.touchSettings = false; UI.show(titleMenu()); }));
  });
  World.init(); enterTitle();
  const first = () => { Snd.init(); window.removeEventListener('pointerdown', first); };
  window.addEventListener('pointerdown', first);
  requestAnimationFrame((t) => { App.last = t; frame(t); });
}
boot();
