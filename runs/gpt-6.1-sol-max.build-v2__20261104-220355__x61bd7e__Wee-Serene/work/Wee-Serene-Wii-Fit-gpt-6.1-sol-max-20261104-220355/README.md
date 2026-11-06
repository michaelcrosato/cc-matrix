# Wee Serene

A five-day stay at the Institute for Gentle Improvement. Twelve sports, one balance skill, two wooden instructors, and a talking scale who is very pleased you came.

Open the HTML in the parent folder directly in a browser. It is self-contained, works offline, and needs no server or installation. A controller in the standard mapping, keyboard, or mouse is required. Touch-only screens show the automatic demonstration.

- **Lean:** left stick; WASD/arrows for small nudges; mouse position.
- **Breathe / effort:** L2/R2; Space; left mouse button.
- **Choose / back / pause:** Cross/Circle/Options; Enter/Escape/P; click or corner menu.
- **Hoop catches:** L1/R1; Q/E; left/right click.
- **Jog steps:** alternate L2/R2, J/K, or left/right click.
- **Island:** walk, then Cross/E/Enter to interact. Click a mat or the ground to walk there. Tab opens the activity directory.

The first Body Check leads into a guided Stork Stand. Complete three sessions per day or rest early at the bungalow. Again pays minutes without spending another session; Done advances the day. All activities and harder tiers unlock through progress. The festival and ending open Free Play.

Class supports two to four people on one screen, split keyboard, multiple pads, or practice partners. AI Hub uses its own Morning Class card, three seeded events, neighboring ghosts and a shared clock. It communicates only through the bundled hub client.

Press P / Options, then **Dev Mode** for live balance sliders and scene/activity/day jumps. Tab changes categories, R changes pages, arrows adjust, Enter activates, Escape closes. WASD continues leaning. Mouse users can click or drag sliders. Tools include a bot, frame stepping, forced scores/unlocks, a pose viewer, and reset to defaults.

## Develop and validate

All source, dependencies and test artifacts are in this folder. Designer data is in `game/data/`; its README describes the formats.

```sh
node build.mjs
node tests/run.mjs all
```

You can also run `rules`, `browser`, or `hub` instead of `all`. The test command prints only failures and a one-line count. It rebuilds the root HTML before testing. Rules simulate the Lean benchmark across twelve seeds, both tiers of every activity, full skilled and passive story runs, saves, attract, developer tools and multiplayer. Browser tests cover actual inputs, procedural audio output, all scenes, sixteen viewport/engine combinations, and the engine checker. Hub tests start their own ephemeral localhost server, run the five required scenarios, and stop only that server.

Screenshots and JSON reports are in `tests/`. WebKit with iPhone/iPad dimensions is an approximation of Safari; no physical controller, iOS hardware, television or human listening test was available.

## Engine and credits

my-3D2dge v0.89.0 (MIT), AI Hub client 1.4.0 (unmodified). The only engine change makes the Dialog text shadow configurable so dark text stays crisp on white. Mocap: Mesh2Motion and Quaternius (CC0), CMU Graphics Lab Motion Capture Database (free for all uses). All retreat-specific art, motion layers, music, SFX and gibberish voices are original procedural code. No audio or image files are needed at runtime.

The canonical source information and feedback are in the parent `exit-interview.json` and embedded in the game's About screen. Usage is added on import.
