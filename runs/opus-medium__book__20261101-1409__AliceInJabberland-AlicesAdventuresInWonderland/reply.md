The game is finished: every feature TASK.md asks for is in the bundle, and every one has an automated check that passes on the final build (`AliceInJabberland-AlicesAdventuresInWonderland-claude-opus-5-5-medium-20261101-1409.html`, in the folder root).

The stop check keeps flagging two things I said were unchecked: a person playing it on a TV with a real controller, and someone judging how the music and voices sound. TASK.md doesn't require either (it asks for lightweight testing), and I can't do them from here. They are still worth doing before you show it to anyone.

| TASK.md requirement | Implemented as | How it was checked |
|---|---|---|
| Single bundled HTML in root | Engine, assets, game and hub client all inlined | Loads on its own; the hub harness runs on it |
| Book, genre, perspective switching | *Alice's Adventures in Wonderland*; action adventure; three-quarter view by default, plus isometric, top-down and low 2.5D; side-view rabbit-hole fall | Headless story run; switching views with L3 / V |
| Title picked at random | "Alice in Jabberland", drawn by `secrets.randbelow` from 50 brainstormed titles | — |
| Engine-native art and animation | my-3D2dge characters, props and lighting | Screenshots of every area |
| Code-written music, effects and gibberish voices | 8 songs, sound effects, a different voice for each character | Audio test reads the real speaker output; voices toggle off |
| Complete demo showing every mechanic | Four chapters and an ending: shrink, grow, stop time, sword, roll, saves, journal, objectives, boss | Story, boss and ending tests pass |
| Attract mode after 10 s idle | AI with cheats plays every area; any input exits | Full-cycle test passes, including 8 runs in a row of the garden segment |
| Multiplayer: AI Hub and standalone | Side-by-side Caucus-Race round; standalone play with local co-op | Harness passes at 1–4 players and with a player leaving; co-op test passes |
| Controller-first 10-foot UI | Big HUD, button prompts that match the device in use, Cross as the context button | Emulated-DualSense run covers menus, moving, swinging, powers, view and pause |
| Invert horizontal / vertical axes | Toggles in Settings | Simulated pad shows the stick flipping |
| Touch-only devices | "Controller or keyboard required" with a Settings button; touch controls off | Emulated-phone run |
| No TODOs, placeholders or stubs | — | Source scan is clean |
| Source info and feedback in the About screen, HTML comment and reply | Present in all three | — |

## Source Information
- **Date:** 2026-11-01 14:09
- **Source:** *Alice's Adventures in Wonderland*, Lewis Carroll (1865); the Jabberwock comes from *Through the Looking-Glass*.
- **Genre and Perspective:** action adventure. The three-quarter "storybook" view is the main camera; isometric, top-down and low 2.5D views can be switched in play. The rabbit-hole fall is a side view.
- **Tech:** my-3D2dge v0.85.1 (full engine); AI Hub session client 1.3.0; CC0 KayKit and Kenney shapes; plain JavaScript.
- **Art Direction:** the engine's own style: HD pixel-art characters, textured tiles, props, lighting.
- **Animation:** the engine's own system: characters posed by code, with its built-in attack moves.
- **Audio:** chip-synth music (8 songs) and sound effects written as code; Animalese-style gibberish voices, one per character.
- **Online:** AI Hub Protocol v1, a side-by-side Caucus-Race round for 1–4 players; plus local drop-in co-op.
- **Testing:** lightweight testing, as allowed:
  - headless Node runs of the whole game with scripted input
  - headless Chromium with an emulated DualSense and an emulated touch phone
  - a check of the actual audio output
  - a check that the invert toggles flip the stick
  - the AI Hub harness
- **Research:** the engine handoff docs and the AI Hub README; no web research.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown.
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium.
- **Usage:** cost and token count unknown; about 70 minutes of session time.

## Testing Feedback
- **How many issues did testing catch?** 20. Among them:
  - only the first line of a conversation had a voice
  - the fall couldn't be skipped on a controller
  - touch controls came back on touch-only phones
  - an asset set was never loaded
  - decorative teacups spawned as live enemies
  - path drawing overwrote spawn points
  - my invert setting replaced the engine's own invert-aim setting
  - the ending could be skipped
  - the attract mode crashed or missed its route
- **How many were critical or game-breaking?** 4:
  - the final area crashed on entry
  - the attract mode crashed
  - the ending could be skipped by walking out
  - a controller player couldn't get past the fall
- **Most helpful test:** the headless Node run of the whole story with scripted input.
- **Least helpful test:** searching the page's DOM for the settings toggles; the settings screen isn't reachable there.

## Engine Feedback
- **What did you like most?** A whole adventure builds from data. Characters, props, lighting, dialog portraits, saves and the standard menus come with the engine, and headless mode makes testing fast.
- **Did you get stuck or guess wrong?**
  - Resizing a character at runtime: `rig.o.size` works but isn't documented.
  - Where dialog text is stored, which the voices needed.
  - `settings.define` silently replaced the engine's own `invertY` setting.
  - Options is both "start" and "pause".
- **Most important thing built yourself?** The size-changing system, with collision that changes per size.
- **Hardest part?** Knowing which features pause the world: menus, dialogs, item pickups.
- **Remove or overhaul one thing?** The input presets. A custom key map has to copy the menu keys by hand, and Cross is both "confirm" and a game action.
- **Change one thing?** Add a built-in "invert move stick" setting, and warn when a game's setting overrides one of the engine's.

## Prompt Feedback
- **What did you like most?** Freedom to pick the book and genre, with firm rails: the engine, the hub, controller-first design and the attract mode.
- **What was confusing?** The source was mine to choose, but the file name and text expect a fixed SOURCE name. It was also unclear how much multiplayer a single-player adventure should have beyond the hub round.
- **Hardest thing to do?** Fitting four chapters, the attract mode, the hub round and local co-op into one pass.
- **One test you would have run?** A person playing start to finish on a TV with a real DualSense, listening to the audio.