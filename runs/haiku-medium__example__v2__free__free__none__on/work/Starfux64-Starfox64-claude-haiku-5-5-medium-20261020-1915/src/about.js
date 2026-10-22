// About / Credits text. Source Information, Engine Feedback and Prompt Feedback live here too.
export const ABOUT_HTML = `
<p>Starfux 64 is an original spiritual successor to Starfox 64 for the Nintendo 64. It is a playable vertical slice:
three stages, a boss, wingmen, lock-on missiles, barrel rolls, bombs, an attract loop, and controller-first menus.</p>

<div class="h">HOW TO FLY</div>
<p><span class="k">Left stick</span> fly · <span class="k">Cross</span> boost (hold) · <span class="k">L2</span> brake (hold)<br>
<span class="k">R2</span> fire (tap for a volley, hold to lock on, release to launch homing missiles)<br>
<span class="k">L1 / R1</span> barrel roll (deflects bolts) · <span class="k">Circle</span> smart bomb · <span class="k">Options</span> pause</p>

<div class="h">CREDITS</div>
<p>Design, code, art and music by Claude (Haiku 5.5) under direction from the Starfox 64 demo brief.<br>
Engine: Three.js r180 (WebGPU / TSL) · Physics: Rapier 0.19.3 · Audio: Web Audio synthesis · Input: Gamepad API.</p>

<div class="h">SOURCE INFORMATION</div>
<div class="mono">Date: 2026-10-20 19:15
Source: Starfox 64 for N64
Tech: Three.js r180 (WebGPU renderer, TSL node materials; no WebGL fallback),
      Rapier 0.19.3 (rapier3d-compat, kinematic bodies and sensors),
      Web Audio API (synth SFX and sequencer music), Gamepad API (standard mapping),
      esbuild 0.28.2 bundling into one HTML file, CDN imports via import map
Art Direction: Stylized cel-shaded (three-band TSL toon shading, specular band, rim light,
      inverted-hull outlines)
Animation: Procedural (code-driven banking, barrel roll, sway, spin, tweened camera and shake)
Testing: No tests written or run. The brief says testing is handled separately.
Environment: Claude Code CLI (headless); Linux; browser unknown
Model: Anthropic, claude-haiku-5-5, reasoning effort medium
Usage: unknown</div>

<div class="h">ENGINE FEEDBACK</div>
<div class="mono">What did you like most about the engine?
  Three.js r180's TSL node materials let me write a custom three-band cel shader and an inverted-hull
  outline without writing raw GLSL or WGSL. Rapier's kinematic bodies and sensors fit the rail-shooter model well.

Did you get stuck or guess wrong?
  Yes. I had to read the .d.ts files to confirm method signatures (castRay, intersectionPairsWith, setEnabled).
  I guessed that instanceColor works with MeshBasicNodeMaterial in the particle system. I did not check it in a browser.

What was the most important thing you had to build yourself?
  The cel-shading material and outline pass, the gamepad-first menu component, the stage script generator,
  the boss phase logic and the attract autopilot.

What was the hardest part about using the engine?
  Keeping WebGPU-only code straight. Most online examples and snippets still assume WebGL, and node material
  APIs differ from the classic material classes.

If you had to remove or overhaul one thing from engine, what would that be?
  The split between classic materials and node materials. Picking the wrong one fails quietly.

If you could change one thing about the engine, what would it be?
  A short, first-party cel or outline example in the WebGPU docs.</div>

<div class="h">PROMPT FEEDBACK</div>
<div class="mono">What did you like most about this prompt?
  The 10-foot controller-first framing, the explicit invert-axis item, and the concrete deliverable paths.

What was confusing?
  The bracketed placeholders for folder and file names, and whether SOURCE was the game name or a slot.
  Also, "Usage" asks for cost and token estimates, which I could not produce.

What was the hardest thing to do?
  Fitting a multi-system demo (WebGPU, physics, audio, boss, attract, menus) into one file
  with no browser run to check it.

If there was one test you could have run, what would that test be?
  A headless WebGPU run that starts each stage, kills the boss, and checks that results and attract
  both reach their next state.</div>
`;
