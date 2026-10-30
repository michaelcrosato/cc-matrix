**Hubcap Hootenanny** is built: a Destruction Derby 2 spiritual successor, bundled as one HTML file. It loads three.js and Rapier from the jsDelivr CDN, so it needs internet and WebGPU.

I tested it headlessly with software WebGPU: boot, title menus, attract rollover, a full Bowl, a race, a fake DualSense, and the AI Hub harness. The AI Hub harness reports conformance PASS at 1 and 2 players. I have not seen it on a real GPU or heard the audio, and the 3D view was only checked through a few render-target screenshots.

**What's in it**
- **Modes:** Wrecking Bowl and Wreckin' Race.
- **Venues:** four of them: Rust Bowl, Crossfire Crater, Figure-Eight Fandango and Dirt Oval Doom.
- **Career:** four divisions with standings, promotion and cash.
- **Garage:** three cars, paints and upgrades.
- **Damage:** four damage zones, mesh dents, detachable parts, a wreck explosion, combo scoring, and pickups.
- **Attract mode:** starts after 10 s idle on any menu and loops through bowls and races. Any input exits it.
- **Controls and UI:** controller-first menus with keyboard and mouse mapped onto the same model. Settings has horizontal and vertical invert toggles plus a live stick check. Touch-only devices get "Controller or keyboard required" and a Settings button.
- **Hub:** in an AI Hub session it skips the title, runs a seeded bowl, reports progress and a result, and handles `end`.

The bundled file is `HubcapHootenanny-DestructionDerby2-claude-sonnet-5-5-medium-20261029-0800.html` in this folder's root. Dev files and tests are in the subfolder of the same name.

## Source Information
- Date: 2026-10-29 08:00
- Source game: Destruction Derby 2
- Tech: Three.js r180 (`three/webgpu` + TSL, WebGPU only, no fallback), Rapier 3D 0.19.3 (`rapier3d-compat`, raycast vehicle controller), Gamepad API, Web Audio, AI Hub session client 1.3.0, plain ES modules.
- Art Direction: cel-shaded, with a 4-step toon ramp, ink outlines, flat palettes and canvas-painted textures.
- Animation: procedural. Raycast suspension, wheel spin and steer, runtime mesh dents, hinged hood, detaching parts, particles and camera springs.
- Audio: all code-written. Synthesised engine, crash, skid and pickup effects; step-sequenced music (menu, bowl, race, results); Animalese-style gibberish voices for the announcer and drivers, with subtitles.
- Online: AI Hub session protocol v1 (lib/hub), side-by-side `parallel` mode. No other network features.
- Testing: lightweight headless Chromium (Playwright, SwiftShader WebGPU) smoke tests plus the AI Hub harness.
- Environment: Claude Code CLI (headless); Linux; browser unknown.
- Model: Anthropic, claude-sonnet-5-5, reasoning effort medium.
- Usage: unknown. Token and cost counters are not exposed to me; wall-clock session time was about 1 hour 10 minutes.

## Testing Feedback
- **Issues caught:** about 9. They included a menu helper that lost `this`, a circular `userData` that crashed part cloning, and a HUD update on a disposed match.
- **Critical / game-breaking:** 4. Boot crash on the title, crash when a part detached, crash on attract rollover, and a results screen that ignored input.
- **Most helpful test:** the headless harness stepping the sim at 1/60 through attract mode, a full Bowl to results, a race, a fake pad, and the hub harness.
- **Least helpful test:** DOM screenshots, since the WebGPU canvas comes out blank.

## Engine Feedback
- **Liked most:** three.js r180 WebGPU with TSL made the cel look cheap. Rapier's raycast vehicle controller gave suspension, steering and grip with little code.
- **Stuck / guessed wrong:**
  - `currentVehicleSpeed` had an unreliable sign, so I used velocity dot forward instead.
  - Vehicle forward is +Z and positive steering turns left.
  - `Object3D.clone()` crashes on circular `userData`.
- **Most important thing built by hand:** the damage model. Zones from velocity deltas, dents with matching outline normals, detachable parts, wrecks and scoring.
- **Hardest part:** checking visuals headlessly, since WebGPU screenshots are blank, and tuning vehicle grip blind.
- **Overhaul one thing:** the vehicle controller should expose reliable impact events so damage needs no velocity-delta heuristics.
- **Change one thing:** a built-in outline/cel post-process node, so deforming meshes don't need hull normals rebuilt.

## Prompt Feedback
- **Liked most:** the clear done-condition, the 10-foot controller-first rules, the axis-invert setting and the attract-mode requirement.
- **Confusing:** the file-name pattern versus a title containing spaces; "single html file" versus "dependencies may be left out"; and whether standalone play needed its own multiplayer. I chose hub side-by-side only.
- **Hardest thing:** delivering a feature-complete slice (career, garage, two modes, four venues, AI, audio, hub) while testing "lightly".
- **One test I'd add:** a scripted controller-only playthrough from title to results with a screenshot of every screen, on a real GPU.