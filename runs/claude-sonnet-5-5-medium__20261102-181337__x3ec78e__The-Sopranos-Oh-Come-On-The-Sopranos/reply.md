The game is built as one 1.3 MB HTML file, `The-Sopranos-Oh-Come-On-The-Sopranos-claude-sonnet-5-5-medium-20261102-181337.html`, in this folder's root. Beside it is `exit-interview.json`, which parses and has every field filled. The dev files are in the subfolder of the same name (`src/`, `tests/`, `build.mjs`, `about.json`). Nothing was tested on a real DualSense, real iOS Safari or a human player.

The title came from a real random pick: index 49 of 50, "The Sopranos Oh, Come On".

## What it is
A beat-'em-up with sit-downs on the my-3D2dge engine. You play Vic Marinara and work through six steps:
1. **Intro:** a kitchen scene with a choice.
2. **Tuesday Collections:** a street brawl with three shopkeepers to shake down, then the boss Fat Dino.
3. **Kitchen table:** spend the cash on upgrades and save.
4. **Therapy:** a session with choices that change your stats.
5. **The Meadowlands Yard:** a rainy night brawl with a duck pond to calm down at, then the boss Johnny Salt.
6. **Ending:** a cut to black, then the credits.

Other features, all implemented:
- **Combat:**
  - Punch and kick combos, a flying kick and a grab.
  - A bat pickup.
  - Shooters that telegraph their shots.
  - A stress meter that unlocks a rage move.
  - Three difficulty levels.
- **Camera:** V or R3 cycles brawler, three-quarter, top-down and isometric views.
- **Controls:**
  - PlayStation glyphs by default, with an Xbox option in Settings.
  - Settings toggles to invert gamepad horizontal and vertical.
  - A "Controller or keyboard required" screen on touch-only devices.
  - Menus respond to mouse hover and click, and you can click shopkeepers.
- **Attract mode:** after 10 s idle on the title, a cheating bot plays every chapter and loops; any input ends it.
- **AI Hub:** ghost mode for 1–4 players, with the session protocol client pasted in unmodified.
- **Audio:** music, effects and gibberish voices are all generated in code.
- **About/Credits:** has the four required sections.

## Testing
- **System tests:** 49 checks cover input, glyphs, stick inversion, combat, stress and rage, pickups, shopkeepers, ducks, waves, bosses and views. All pass.
- **Flow tests:** 30 checks cover attract mode, the full chapter chain, shop, save/load, game over and retry, the ending and the credits. All pass.
- **AI Hub harness:** passes with 2 players, with 4 players at 150 ms latency, 50 ms jitter and 5% loss, and in the host-leave scenario.
- **Real-browser playthrough:** a bot using real key events cleared everything from the title to the credits and back to the title, with no page or game errors. It hit one rage-trigger problem along the way, fixed as described below.
- **WebKit render:** the game rendered clean at 13 viewport sizes, from iPhone SE to 21:9 ultrawide.

Testing turned up game-breaking bugs that are now fixed: chapters that couldn't advance, an attract mode that cancelled itself, and a shooter that could hide behind the wave lock and soft-lock the chapter. It also showed rage unusable when the stress bar sat at 99.x.

## Source Information
- **Date:** 2026-11-02 18:13
- **Source:** The Sopranos (1999-2007)
- **Genre and Perspective:** Beat-'em-up (brawler) with story / RPG-lite sit-downs: shops to shake down, therapy choices, a stress meter, upgrades. Side-on 2.5D brawler camera, with V / R3 switching to three-quarter, top-down and isometric.
- **Tech:** my-3D2dge v0.85.1 (canvas, HD Humanoid rigs, TileMap, Backdrop, Dialog, Menu, lighting, weather), plain JavaScript in one IIFE, AI Hub session client 1.3.0.
- **Art Direction:** Engine-native HD pixel style at 320x240 expanded to any screen: volumetric pixel characters, painted shopfronts, rim-lit fighters, a dusk street and a rainy yard at night.
- **Animation:** The engine's rig system: E.Humanoid skeletons driven by E.MOVES (jab, cross, hook, uppercut, roundhouse, haymaker, axekick), E.Attack and E.Combo timing, poses, hit-stop and particles.
- **Audio:** All code-written. Chip-synth music per scene (title, home, street, yard, boss, therapy), synthesized effects, and Animalese-style gibberish voices (a random syllable per letter, pitched per speaker).
- **Online:** AI Hub Session Protocol v1, ghost mode, 1–4 players. Each player plays their own Tuesday Collections round from the same seed and sees the others as translucent ghosts. Score goes to the hub as progress and result.
- **Testing:** The suites above, plus Playwright Chromium runs with real key events and a touch-emulated title. Not tested: a real DualSense, real iOS Safari, real humans.
- **Research:** Read the my-3D2dge handoff (API card, brawler kit) and the AI Hub protocol. The show's tone and setting come from general knowledge, with no web browsing about the show.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown.
- **Model:** Anthropic, claude-sonnet-5-5, reasoning effort medium.
- **Usage:** unknown.

## Testing Feedback
- **How many issues did testing catch?** About 14.
  - Seven were visual: cutscene actors drawn behind their backdrop, a dialogue box over the actors' feet, the title menu covering the cast, HUD text outside its panel, shop signs under awnings, the touch banner overflowing, and the kitchen header overlapping.
  - Seven were logic or flow: stuck chapter-advance and exit locks, the attract bot cancelling itself, double envelope payouts, crates blocking the shopkeepers, shooters hiding behind the screen lock, Escape both backing out of the shop and pausing, and rage unreachable at 99.x stress.
- **How many were critical / game breaking?** Three.
  1. The chapter-advance and demo-exit guards were cleared by the scene change and stayed locked, so no chapter could end.
  2. The attract bot's own confirm taps counted as player input and ended the demo after a few seconds.
  3. A shooter could retreat behind the wave lock where the hero couldn't reach it, soft-locking the chapter.
  
  The double payout was serious but not game breaking.
- **Most helpful test:** The real-browser playthrough bot. It used real key events, printed a state readout every ten seconds and took screenshots at milestones. It found the soft-lock, the shop pause bug, the double payouts and the blocked shopkeepers. The headless suites couldn't see these because they skip drawing and real key timing.
- **Least helpful test:** The AI Hub harness runs. They passed on the first real attempt (after a port clash on my side) and showed nothing new, though they were necessary. The static syntax check of the bundle was a close second.

## Engine Feedback
- **What did you like most?** The HD Humanoid rigs with E.MOVES, E.Attack and E.Combo, so a punch string, roundhouse or haymaker looks right with almost no animation work. The readable kits, the deterministic fixed-step clock (`game.advance` made headless tests easy), and the free pause menu, settings, rebinding and save slots came close behind.
- **Did you get stuck or guess wrong?** Yes, several times.
  - In the side view a larger y draws nearer, so a backdrop queued at +y covered the actors.
  - Dialog calls `onDone` after `onChoice`, so starting another `say()` inside `onChoice` fires the new dialog's `onDone` at once.
  - `game.go()` silently clears `game.after` timers, which left my guard flags stuck.
  - Escape is bound to both cancel and pause, so backing out of a menu also paused.
  - The brawler kit's facades are painted for one view only.
- **Most important thing you had to build yourself?** Nearly everything above the rigs:
  - the foe AI with wave locks
  - the stress and rage system
  - bosses with a second phase
  - the shop, save and chapter flow
  - painted shopfront facades that work in every view
  - the attract bot
  - the AI Hub ghost sync
  - Animalese voices, by turning `Dialog.voice` into a getter
  - the stick-inversion fix, by wrapping `navigator.getGamepads`
- **Hardest part?** Making a brawler that works in all four camera views. The kit is single-view, and its facades, bounds and lane logic assume that. Also learning undocumented behaviours (draw depth sorting, callback order, timer clearing) by trial.
- **Remove or overhaul one thing?** Dialog's single shared `onDone` slot. A callback that can be replaced from inside a callback caused the double payout and the skipped story beats. Per-line callbacks or a promise-style `say()` would remove the trap.
- **Change one thing?** A first-class AI input source, so a scene can be driven by a bot through the same input pipeline without the bot's presses counting as the player's. Every attract mode rebuilds the same workaround.

## Prompt Feedback
- **What did you like most?** The shape of the brief: a clear deliverable and "done" list, the 10-foot controller-first stance with the axis-inversion twist, the attract mode and AI Hub requirements, and the exit-interview JSON that feeds tools. Freedom over genre, research and story left room for a point of view.
- **What was confusing?**
  - The title step: the random pick can land on a name that barely riffs on the source.
  - "This folder's root" versus the subfolder for the html.
  - "Testing: testing parameters allowed" reads like a blank to fill.
  - "As well as for the game on its own" for multiplayer is ambiguous (local co-op, or just that the game still runs outside the hub).
  - Usage numbers aren't available inside a session.
- **Hardest thing to do?** Breadth. One vertical slice has to carry a genre game, a story in a TV drama's voice, three input families, settings, an attract mode, code-written music and voices, a hub protocol and thorough tests. There was no human, real pad or real iOS to check feel against. Making a brawler read as a TV drama about a boss in therapy was the creative crux.
- **One test you could have run?** A human playing the finished slice with a real DualSense on a TV at 10 feet for 15 minutes, recording what they didn't understand. Every other check I ran was an automated stand-in for exactly that.