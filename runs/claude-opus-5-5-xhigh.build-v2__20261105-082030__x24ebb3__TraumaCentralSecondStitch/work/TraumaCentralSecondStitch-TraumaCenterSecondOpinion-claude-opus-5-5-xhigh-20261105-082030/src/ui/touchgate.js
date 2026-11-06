// Touch-only devices: no touch controls. An overlay with the exact text, the engine's settings button,
// the attract reel running behind. A key or a pad drops the gate and the game plays normally.
export function showTouchGate(App) {
  const el = document.createElement('div');
  el.id = 'touch-gate';
  el.textContent = 'Controller or keyboard required';
  el.style.cssText = 'position:fixed;left:0;right:0;bottom:12%;text-align:center;color:#f4f4f4;background:rgba(13,11,20,.86);font:bold 18px monospace;padding:14px 10px;z-index:50;pointer-events:none';
  document.body.appendChild(el);
  const drop = async () => {
    if (!App.touchOnly) return;
    App.touchOnly = false;
    el.remove();
    (await import('../stages/attract.js')).stopAttract();
    const { toTitle } = await import('../stages/flow.js');
    toTitle('title');
  };
  window.addEventListener('keydown', drop, { once: true });
  window.addEventListener('gamepadconnected', drop, { once: true });
  const poll = setInterval(() => {
    if (!App.touchOnly) { clearInterval(poll); return; }
    if (Array.from(navigator.getGamepads?.() ?? []).some(Boolean)) { clearInterval(poll); drop(); }
  }, 500);
}
