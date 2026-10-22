// In-game About, Controls and the required source/feedback record.
export const CONTROLS_HTML = `
<h2>Controller (PlayStation / Xbox layout)</h2>
<table class="keys">
<tr><td>Left stick</td><td>Fly / move. Menus: move focus</td></tr>
<tr><td>A / Cross</td><td>Fire. Hold past half a second to lock on, release to fire homing volleys</td></tr>
<tr><td>X / Square</td><td>Smart bomb (clears the screen; heavy damage to bosses)</td></tr>
<tr><td>LB / L1 · RB / R1</td><td>Barrel roll left / right. Brief invulnerability: dodges lasers</td></tr>
<tr><td>RT / R2</td><td>Boost (faster, wider view)</td></tr>
<tr><td>LT / L2</td><td>Brake</td></tr>
<tr><td>Y / Triangle</td><td>Toggle chase / close camera</td></tr>
<tr><td>Start / Options</td><td>Pause</td></tr>
<tr><td>B / Circle</td><td>Back (menus)</td></tr>
</table>
<h2>Keyboard (secondary)</h2>
<table class="keys">
<tr><td>Arrows / WASD</td><td>Fly / move. Menus: move focus</td></tr>
<tr><td>Space / Enter</td><td>Fire / confirm</td></tr>
<tr><td>B</td><td>Smart bomb</td></tr>
<tr><td>Q / E</td><td>Barrel roll left / right</td></tr>
<tr><td>Shift / C</td><td>Boost / brake</td></tr>
<tr><td>V</td><td>Camera</td></tr>
<tr><td>Esc / P</td><td>Pause · Esc or Backspace goes back in menus</td></tr>
</table>
<h2>What you can and cannot do</h2>
<p>You can fly in two dimensions inside the play area, lock on to up to six targets, barrel roll through lasers, and transform to the Landmaster for the Plains ground push. The Landmaster cannot fly or roll. Shields take damage from every hit, and a lost ship costs a spare; with no spares left the mission fails.</p>
<p>Gamepad sticks can be inverted for each axis in Options, and the deadzone is adjustable.</p>
`;

export const ABOUT_HTML = `
<h2>Starcrossed Vulpes</h2>
<p>An original spiritual successor to Starfox 64 for N64, built as a playable vertical slice. Three sectors and a boss, branching route, medals, attract mode, and a controller-first interface.</p>
<p>Credits: concept, code, art, music and sound were generated in-engine. Nothing is sampled or licensed from the original game.</p>

<h2>Source Information</h2>
<ul class="kv">
<li><b>Date:</b> 2026-10-20 14:50</li>
<li><b>Source:</b> Starfox 64 for N64</li>
<li><b>Tech:</b> three.js 0.186.1 (WebGL, shadows, UnrealBloomPass through EffectComposer); esbuild 0.28.2 bundled into one HTML file; vanilla ES modules; Web Audio API for synthesized sound and music; DOM UI</li>
<li><b>Art Direction:</b> low-poly, flat-shaded, N64-inspired. Sunset Plains, gunmetal Fortress trench, deep-space Asteroid Belt and Dreadnought; neon accents and bloom</li>
<li><b>Animation:</b> procedural. Critically damped flight and camera smoothing, instanced particle pool, shockwave and light-flash pools, timed boss sequences</li>
<li><b>Testing:</b> the prompt placed no restriction on testing</li>
<li><b>Environment:</b> Claude Code CLI (headless); Linux; browser unknown</li>
<li><b>Model:</b> Anthropic, claude-haiku-5-5, reasoning effort medium</li>
<li><b>Usage:</b> unknown</li>
</ul>

<h2>Engine Feedback</h2>
<ul>
<li><b>What did you like most about the engine?</b> three.js gives shadows, fog and bloom with little setup, and its procedural geometry makes asset-free models easy.</li>
<li><b>Did you get stuck or guess wrong?</b> Tone mapping and color-space handling for custom shaders and post passes needed care; the output pass is required once bloom is used.</li>
<li><b>What was the most important thing you had to build yourself?</b> The stage runtime: event timeline, lock-on cone and homing, medal rules, boss phases and the input layer.</li>
<li><b>What was the hardest part about using the engine?</b> Keeping the DOM HUD and three.js frame in step, such as projecting target boxes after the camera moves.</li>
<li><b>If you had to remove or overhaul one thing from the engine, what would that be?</b> Nothing core. The per-frame object churn in the sample shaders and projection helpers is the first thing I would tighten.</li>
<li><b>If you could change one thing about the engine, what would it be?</b> A built-in helper for screen-space projection that stays in sync with the camera.</li>
</ul>

<h2>Prompt Feedback</h2>
<p><i>[PROMPT]</i></p>
<ul>
<li><b>What did you like most about this prompt?</b> The 10-foot controller-first brief and the explicit "no TODOs or stubs" completion rule. Both make the finish line concrete.</li>
<li><b>What was confusing?</b> Whether the CDN rule and the single-file rule can both hold; I chose to inline everything so the file works offline.</li>
<li><b>What was the hardest thing to do?</b> Fitting a feature-complete demo (route, boss, attract, settings, medals) into one bundle without a real controller to test.</li>
<li><b>If there was one test you could have run, what would that test be?</b> A real PlayStation or Xbox pad on Chrome and Safari, checking stick inversion and lock-on feel by hand.</li>
</ul>
`;
