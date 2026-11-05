# Sublime Crisis 3: working notes

Source: Time Crisis 3 (Namco/Nextech). Original game: an on-rails first-person light-gun shooter with a cover
pedal, four weapons and a "crisis flash" telegraph. Title: Sublime Crisis 3 (RNG draw 12 of 50).

## Layout

- `engine/my-3d2dge.js`  handoff v0.85.2 engine (patched; see `engine/PATCHES.md`)
- `hub/session.js`        AI Hub client 1.4.0, unmodified
- `src/*.js`              the game as ordered fragments in one IIFE (concatenated by `tools/build.mjs`)
- `tests/run.mjs`         THE test command (prints failures and one count line)
- `tools/build.mjs`       bundles the single HTML into the work folder root and writes exit-interview.json
- `index.html`            dev page (engine + src loaded one by one)

## Architecture (as built)

- `Sim` (src/60-sim.js) holds all game state and steps it deterministically from per-player commands
  (`aim`, `fire`, `cover`, `reload`, `weapon`). Presentation only reads it. No Math.random in the sim.
- Rendering: `Rail3D` (src/04-rail3d.js), a software z-buffer triangle rasterizer drawn into a low-res buffer,
  with banded light and fog. Enemies are engine `E.Humanoid` rigs drawn as billboards with `rig.draw`.
- Dynamic boss parts are boxes transformed per frame.
- Multiplayer: host runs the Sim; clients send `in`/`sh` messages and render `s`/`ev` snapshots (protocol in
  lib/hub/README.md, shared-world mode).

## Decisions and cuts (see final report for the full list)

- Title chosen by RNG: "Sublime Crisis 3" (draw 12 of 50 from a list kept outside the deliverable).
- Stage and scene structure as in the plan, reduced: 3 stages of 3 areas plus a boss each; a training range.
- Carriers (moving boat/tram rides) are cut: scenes are static on the rail.

## Progress log (keep current)

- DONE (sim, headless): src/00-core, 01-math, 02-weapons, 03-enemies, 04-sim, 05-sim-enemies, 06-sim-boss,
  07-world, 10-stages (3 stages + range). Smoke-tested: area progression, waves, threats, lives.
- DONE (presentation, unverified in browser): 21-raster, 22-art, 23-fx, 30-audio, 40-input, 41-play, 42-hud.
- TODO: 31-story (cues, intros, E.Dialog), 43-screens (title, menus, select, briefing, results, records, about,
  howto, touch-only notice, initials via E.Arcade), 44-dev (dev panel), 45-attract (Autopilot + playlist),
  46-hub (AI Hub shared-world host/replica), 50-main (E.Game, scenes, settings, boot), tools/about-data.json,
  src/html-head.html (done), tests (sim, input, build, playthrough), index.html dev page.
- Engine patches: 1 (glyphs) applied. Pending: 2 (wheel codes), 3 (audio buses) only if needed.
