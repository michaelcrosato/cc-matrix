// ===== 13_main.js — boot sequence and main loop =====
function showError(title, msg) {
  document.getElementById('loading').style.display = 'none';
  const e = document.getElementById('error'); e.style.display = 'flex';
  e.innerHTML = `<h1>${title}</h1><div>${msg}</div><div style="opacity:.7;font-size:.8em">Sparfox 64 renders exclusively with WebGPU (no WebGL fallback). Try a current Chrome, Edge, or Safari 26+ with hardware acceleration enabled.</div>`;
}
function progress(f, txt) { document.getElementById('loadbar').style.width = Math.round(f * 100) + '%'; if (txt) document.getElementById('loadtxt').textContent = txt; }
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));

async function boot() {
  applySettings();
  try { progress(0.05, 'Starting WebGPU…'); await Gfx.init(); }
  catch (err) { showError('WebGPU required', String(err && err.message || err)); return; }
  try {
    progress(0.1, 'Loading Rapier physics…'); await Physics.init();
    Input.init(); FX.init(); Projectiles.init(); HUD.init(); Comms.init(); UI.init();
    await nextFrame();
    World.build((f, t) => progress(0.1 + f * 0.8, t));
    Player.init(); Wingmen.init(); Carrier.build(); Boss.build();
    progress(0.9, 'Compiling cel shaders…'); await nextFrame();
    Game.toTitle(true);
    Gfx.camera.position.set(0, 40, 40); Gfx.camera.lookAt(0, 30, -100);
    try { await Gfx.renderer.compileAsync(Gfx.scene, Gfx.camera); } catch (e) { /* compile happens lazily on first render instead */ }
  } catch (err) { console.error(err); showError('Failed to start', String(err && err.stack || err)); return; }
  progress(1, 'Ready');
  document.getElementById('loading').style.display = 'none';
  document.getElementById('touchSettings').addEventListener('click', () => {
    Game.gateSuppressed = true; Game.updateTouchGate();
    const def = Screens.settings(); def.onBack = () => { Game.gateSuppressed = false; Game.toTitle(true); };
    UI.open(def, true);
  });
  let last = performance.now() / 1000;
  Gfx.renderer.setAnimationLoop(nowMs => {
    const now = nowMs / 1000, dt = clamp(now - last, 0, 0.05); last = now;
    Input.update(dt, now);
    UI.update(dt);
    Game.frame(dt);
    HUD.update(dt); HUD.draw();
    Gfx.render();
  });
}
boot();
