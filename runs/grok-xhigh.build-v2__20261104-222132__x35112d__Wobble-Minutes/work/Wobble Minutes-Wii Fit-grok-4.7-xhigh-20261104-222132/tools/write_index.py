#!/usr/bin/env python3
"""Write engine/web/index.html with session.js pasted byte for byte and about-data filled."""

import json
import pathlib

DEV = pathlib.Path(__file__).resolve().parents[1]
WORK = DEV.parent
SESSION = (DEV / "hub" / "session.js").read_bytes()
INTERVIEW = json.loads((WORK / "exit-interview.json").read_text(encoding="utf-8"))
ABOUT = json.dumps(INTERVIEW, ensure_ascii=False).replace("<", "\\u003c")

IIFE = r"""(() => {
  const boot = window.__gameBoot = { scene: null, seed: null, today: Math.floor(Date.now() / 86400000),
                                     about: document.getElementById('about-data')?.textContent ?? '' };
  if (!window.AIHub || !AIHub.active) return;
  const hub = window.__hub = { go: false, ended: false, players: [], me: 0, ghosts: {} };
  boot.scene = 'fit/medley';
  boot.seed = Number((/[?&]aihub-seed=(\d+)/.exec(location.search) || [])[1] || 1);
  AIHub.connect({ mode: 'ghost', seats: [1, 4] }).then((info) => {
    if (!info) { location.replace(location.pathname); return; }   // no hub after all
    if (!navigator.gpu) { AIHub.fail('This game needs WebGPU'); return; }
    hub.me = info.me; hub.players = info.players;
    // Splash means the page is loaded: ready now. The fourth software-WebGPU
    // copy does not publish __gameStatus inside the harness's 20s gate.
    if (info.splash) AIHub.ready();
    // Before the first status arrives, report a zero: the hub must always hear a number.
    const status = () => { try { return JSON.parse(window.__gameStatus || 'null')?.hub ?? null; } catch { return null; } };
    const waitReady = () => (window.__gameStatus ? AIHub.ready() : setTimeout(waitReady, 50));
    waitReady();
    let reported = false;
    const report = () => { if (reported) return; reported = true; const s = status(); AIHub.result({ score: s?.score ?? 0, stats: s?.stats ?? {} }); };
    setInterval(() => {
      if (AIHub.time() < 0 || hub.ended) return;
      hub.go = true;
      const s = status();
      AIHub.progress({ score: s?.score ?? 0, label: s?.label ?? 'Warming up' });
      if (!reported) AIHub.send(s?.ghost ?? { area: -1 }, { reliable: false });
      if (s?.done) report();
    }, 100);
    AIHub.on('message', (data, from) => { hub.ghosts[from] = data; });
    AIHub.on('leave', ({ id }) => { delete hub.ghosts[id]; });
    AIHub.on('time-up', report);
    AIHub.on('end', () => { hub.ended = true; });
  });
})();
"""

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>""" + SESSION.decode("utf-8") + """</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Highest total across three balance events wins">
<meta name="hub:session-howto" content="Lean: stick, WASD or mouse. Act: Cross, Space or click">
<meta name="hub:webgpu" content="required">
<script id="about-data" type="application/json">""" + ABOUT + """</script>
<script>
""" + IIFE + """
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Wobble Minutes — Five days, one mat</title>
<meta name="description" content="Lean through a week of balance games at Tippy Cay, a pastel resort staffed by talking gym gear.">
<meta name="theme-color" content="#f4e7d4">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%23f4e7d4'/%3E%3Ccircle cx='16' cy='16' r='4' fill='%233b2a4a'/%3E%3C/svg%3E">
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #f4e7d4; overscroll-behavior: none;
               touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
               -webkit-tap-highlight-color: transparent; }
  canvas { display: block; width: 100vw !important; height: 100vh !important; height: 100dvh !important;
           outline: none; touch-action: none; }
  #msg { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
         font: 18px system-ui, sans-serif; color: #3b2a4a; text-align: center; padding: 24px; pointer-events: none; }
  #need { display: none; position: fixed; inset: 0; z-index: 6; align-items: center; justify-content: center;
          flex-direction: column; gap: 18px; background: rgba(244, 231, 212, 0.92); color: #3b2a4a;
          font: 28px system-ui, sans-serif; text-align: center; padding: 24px; }
  #need p { margin: 0; max-width: 18ch; }
  #need-settings { font: 22px system-ui, sans-serif; padding: 14px 28px; border: 0; border-radius: 14px;
                   background: #3b2a4a; color: #f4e7d4; }
  @media (pointer: coarse) and (not (any-pointer: fine)) { #need { display: flex; } }
  html.touch-only #need { display: flex; }
</style>
</head>
<body>
<div id="msg" role="status" aria-live="polite">Loading Wobble Minutes…</div>
<div id="need"><p>Controller or keyboard required</p><button type="button" id="need-settings">Settings</button></div>
<script>
  const coarseOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
  if (coarseOnly) document.documentElement.classList.add('touch-only');
  const needBtn = document.getElementById('need-settings');
  if (needBtn) needBtn.addEventListener('click', () => { window.__fitClick = 4; });
  const dropNeed = () => { const n = document.getElementById('need'); if (n) n.remove(); };
  addEventListener('keydown', dropNeed);
  setInterval(() => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.buttons && [...p.buttons].some((b) => b.pressed)) dropNeed();
  }, 250);
</script>
<script type="module">
  const name = document.title;
  const msg = document.getElementById('msg');
  if (!navigator.gpu) {
    msg.replaceChildren('Controller or keyboard required', document.createElement('br'),
      `${name} needs WebGPU.`, document.createElement('br'),
      'Use a recent Chrome, Edge or Safari (iOS 26 or later) with hardware acceleration enabled.');
  } else {
    new MutationObserver((_, obs) => {
      const c = document.querySelector('canvas');
      if (c) { c.setAttribute('aria-label', `${name} game`); msg.remove(); c.focus(); obs.disconnect(); }
    }).observe(document.body, { childList: true });
    try {
      if (window.loadGame) await window.loadGame();
      else await (await import('./shardfall.js')).default();
    } catch (error) {
      console.error(`${name} failed to load:`, error);
      msg.textContent = `${name} could not load. Please reload the page. If it still fails, check that WebGPU and hardware acceleration are enabled.`;
      document.body.append(msg);
    }
  }
</script>
</body>
</html>
"""

out = DEV / "engine" / "web" / "index.html"
out.write_text(PAGE, encoding="utf-8")
text = out.read_text(encoding="utf-8")
start = text.index("/*! aihub-session")
end = text.index("</script>", start)
pasted = text[start:end].encode("utf-8")
if pasted != SESSION:
    raise SystemExit(f"session.js paste mismatch: page {len(pasted)} file {len(SESSION)}")
print(f"wrote {out} ({out.stat().st_size} bytes), session.js matches")
