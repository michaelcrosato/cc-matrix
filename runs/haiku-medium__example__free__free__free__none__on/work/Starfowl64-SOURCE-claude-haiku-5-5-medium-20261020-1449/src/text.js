// Static copy for the Controls and About/Credits screens. The same Source Information, Engine Feedback
// and Prompt Feedback text also appears in the HTML comment at the top of the bundled file.

export const CONTROLS_HTML = `
<div class="controls">
  <div class="row"><span>Fly</span><span>Left stick / WASD / Arrows</span></div>
  <div class="row"><span>Laser</span><span>Cross / J / Space (hold)</span></div>
  <div class="row"><span>Lock-on</span><span>Hold Circle / H / Ctrl, release to fire missiles</span></div>
  <div class="row"><span>Boost</span><span>R2 / I / Q (hold)</span></div>
  <div class="row"><span>Brake</span><span>L2 / O / F (hold)</span></div>
  <div class="row"><span>Barrel roll</span><span>L1 or R1 / L / E (tap)</span></div>
  <div class="row"><span>U-turn</span><span>Triangle / U / C (tap)</span></div>
  <div class="row"><span>Smart bomb</span><span>Square / K / Shift (tap)</span></div>
  <div class="row"><span>Pause</span><span>Options / P / Esc</span></div>
</div>
<p>Barrel roll deflects enemy shots while it is active. Missiles only fire when you release lock-on.</p>`;

export const ABOUT_HTML = `
<h2>Starfowl 64</h2>
<p>A spiritual successor to Starfox 64. All characters, ships and stages here are original.</p>

<h2>Credits</h2>
<p>Design, code, audio and art: Claude (claude-haiku-5-5), built with Claude Code.</p>
<p>Renderer: Three.js 0.160.0 (MIT), loaded from jsdelivr.</p>
<p>Audio: procedurally synthesised with the Web Audio API. No sound files are shipped.</p>

<h2>Source Information</h2>
<p>- Date: 2026-10-20 14:49</p>
<p>- Source: Starfox 64 for N64</p>
<p>- Tech: vanilla ES modules, Three.js 0.160.0 (CDN), Web Audio API, Canvas 2D HUD, Gamepad API</p>
<p>- Art Direction: flat-shaded low-poly ships and terrain with modern lighting, shadows and additive particles</p>
<p>- Animation: per-frame procedural transforms (banking, barrel roll, U-turn orbit), pooled particle system, scripted stage timelines</p>
<p>- Testing: none performed. The prompt said to write no tests and do no tests; testing is done separately.</p>
<p>- Environment: Claude Code CLI (headless); Linux; browser unknown</p>
<p>- Model: Anthropic, claude-haiku-5-5, reasoning effort medium</p>
<p>- Usage: unknown</p>

<h2>Engine Feedback</h2>
<p>- What did you like most about the engine? Three.js gives shadows, fog and additive points with very little setup.</p>
<p>- Did you get stuck or guess wrong? Three.js was loaded from a CDN, so the version and the import map had to be right before anything else worked.</p>
<p>- What was the most important thing you had to build yourself? The stage timeline, the U-turn facing logic and the lock-on system.</p>
<p>- What was the hardest part about using the engine? Keeping world-space scrolling consistent when the ship flies backwards after a U-turn.</p>
<p>- If you had to remove or overhaul one thing from the engine, what would that be? Nothing core. The library has no built-in input layer, so that code is hand-rolled.</p>
<p>- If you could change one thing about the engine, what would it be? A built-in gamepad helper with axis-inversion and deadzone settings.</p>

<h2>Prompt Feedback</h2>
<p>- What did you like most about this prompt? The 10-foot controller-first rules and the explicit list of reference demos gave a clear bar.</p>
<p>- What was confusing? The directory rules and the filename template had several fill-in fields that had to be worked out first.</p>
<p>- What was the hardest thing to do? Fitting a full on-rails shooter with branching routes, a boss and attract mode into one file without any testing.</p>
<p>- If there was one test you could have run, what would that test be? A controller-only playthrough on a PS5 pad in Chromium, to confirm the axis inversion toggles fix the reported problem.</p>
`;
