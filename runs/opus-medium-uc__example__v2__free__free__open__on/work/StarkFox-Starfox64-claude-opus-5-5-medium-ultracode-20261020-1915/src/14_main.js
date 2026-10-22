// ===== 14_main.js — boot, platform checks, main loop =====
const Clock = { last: performance.now(), delta() { const n = performance.now(); const d = (n - this.last) / 1000; this.last = n; return d; } };

function isTouchOnly() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const fine = matchMedia('(any-pointer: fine)').matches;
  return (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) && coarse && !fine;
}

function fatal(title, msg) {
  $('#loading').classList.remove('show');
  const e = $('#fatal');
  e.innerHTML = `<div class="logo big">${LOGO_HTML}</div><h2>${title}</h2><p>${msg}</p>`;
  e.classList.add('show');
}

// Touch-only gate: shown before anything else; the game keeps booting behind it.
const TouchGate = {
  active: false, fatal: null,
  open() {
    this.active = true;
    UI.closeAll(); UI.open('touch');
    const leave = () => this.leave();
    Bus.on('padchange', (on) => on && leave());
    window.addEventListener('keydown', leave, { once: true });
  },
  leave() {
    if (!this.active) return;
    this.active = false;
    UI.closeAll();
    if (this.fatal) { fatal(...this.fatal); return; }
    if (G.state === 'title') UI.open('press');
  },
};

async function boot() {
  UI.init();
  UI.applySettings();
  const touchOnly = isTouchOnly() && !Input.st.padConnected;
  let menuLoop = 0;
  if (touchOnly) {
    TouchGate.open();
    // lightweight loop so the touch screen's Settings work before the renderer exists
    const loop = () => { const dt = clamp(Clock.delta(), 0, 0.05); Input.poll(dt); UI.update(dt); menuLoop = requestAnimationFrame(loop); };
    menuLoop = requestAnimationFrame(loop);
  }
  const fail = (title, msg) => { if (TouchGate.active) TouchGate.fatal = [title, msg]; else fatal(title, msg); };
  // WebGPU is required — no WebGL fallback by design.
  if (!navigator.gpu) { fail('WebGPU is required', 'This browser does not expose WebGPU. Use a current Chrome, Edge, Safari 26+ or Firefox with WebGPU enabled, on a device with a supported GPU.'); return; }
  let adapter = null;
  try { adapter = await navigator.gpu.requestAdapter(); } catch (e) { adapter = null; }
  if (!adapter) { fail('No WebGPU adapter', 'WebGPU is present but no compatible GPU adapter was found. Check that hardware acceleration is enabled.'); return; }
  if (!TouchGate.active) $('#loading').classList.add('show');
  try {
    await Phys.init();
    await initRenderer($('#gl'));
  } catch (e) {
    console.error(e);
    fail('Could not start the renderer', String(e && e.message ? e.message : e));
    return;
  }
  FX.init();
  const unlock = () => AudioSys.init();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  Game.sessionStart = performance.now();

  await Title.enter();
  if (TouchGate.active) { UI.closeAll(); UI.open('touch'); }
  cancelAnimationFrame(menuLoop);
  R.renderer.setAnimationLoop(frame);
}

let frameErrors = 0;
const DEV = { on: false, fps: 0, acc: 0, n: 0 };
window.addEventListener('keydown', (e) => { if (e.code === 'F3') { DEV.on = !DEV.on; $('#dev').classList.toggle('show', DEV.on); e.preventDefault(); } });
function tick(dt) {
  G.frame = (G.frame || 0) + 1;
  try {
    Input.poll(dt);
    if (Input.st.anyActivity) AudioSys.init();
    // any input leaves attract mode
    if (G.attract && (Input.st.anyActivity || Input.st.mouseActivity) && G.state === 'play') { Attract.stop(); }
    UI.update(dt);
    if (G.state === 'title') Title.update(dt);
    else if (G.state === 'play') { Game.update(dt); FX.update(dt); if (G.state === 'play' || G.state === 'paused') Game.cameraUpdate(dt); Attract.update(dt); }
    else if (G.state === 'results' || G.state === 'gameover') { FX.update(dt); Phys.step(dt); }
    if (G.state === 'paused' && UI.top() && UI.top().id === 'pause' && Input.pressed('pause') && !Input.pressed('back') && G.frame > (UI.pauseFrame || 0)) UI.pause(false);
    World.update(dt);
  } catch (e) {
    if (frameErrors++ < 5) { console.error(e); (window.__SFerr ||= []).push(String((e && e.stack) || e).slice(0, 800)); }
  }
}
function frame() {
  const raw = Clock.delta();
  const dt = clamp(raw, 0, 1 / 20);
  tick(dt);
  R.post.render();
  if (DEV.on) {
    DEV.acc += raw; DEV.n++;
    if (DEV.acc > 0.5) { DEV.fps = DEV.n / DEV.acc; DEV.acc = 0; DEV.n = 0; }
    const seg = G.mode === 'rails' && Rail.chain.length ? Rail.seg : null;
    $('#dev').textContent = `FPS ${DEV.fps.toFixed(0)} | ${G.state}${G.attract ? ' (attract)' : ''} | ${G.stageId || '-'} ${G.mode}` +
      (seg ? ` | seg ${seg.id} ${(Rail.s - seg.s0).toFixed(0)}/${seg.length.toFixed(0)}` : Game.phase ? ` | phase ${Game.phase.def.id} ${Game.phase.t.toFixed(0)}s` : '') +
      ` | ents ${G.ents.length} shots ${G.shots.length} debris ${Phys.debris.length} | draws ${R.renderer.info.render.calls}`;
  }
}
/** Headless test helper: advance the simulation without rendering. */
function sim(seconds, dt = 1 / 30) {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) tick(dt);
  return { state: G.state, stage: G.stageId, s: Rail.s, seg: G.mode === 'rails' && Rail.chain.length ? Rail.seg.id : null, ents: G.ents.length, hits: G.hits, shield: G.player && G.player.shield, alive: G.player && G.player.alive, lives: G.lives, boss: G.boss ? G.boss.hpFrac() : null, phase: Game.phase && Game.phase.def.id, route: G.routeTaken.join('>') };
}

// debug/test handle (used by automated tests and the F3 overlay)
window.__SF = { G, Game, Rail, UI, Attract, Settings, Phys, R, STAGES, Input, sim, tick };
boot();
