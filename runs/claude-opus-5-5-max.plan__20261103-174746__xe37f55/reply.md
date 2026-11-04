I've written PLAN.md (about 1,500 lines) in this folder. It covers every part of TASK.md and is detailed enough for a developer to build the whole demo from TASK.md and PLAN.md alone.

**Title:** **Operation Wolfpack**. I brainstormed 50 riffs and drew #33 with Python's `secrets`. The pun runs through the game: the original's lone commando becomes a squad of up to four players, fighting General Kragg's "Hyena Legion."

**What the plan specifies:**
- **Genre and view:** a first-person light-gun rail shooter. The camera scrolls sideways through depth like the original, plus a forward river run and a finale looking back off a plane's ramp.
- **Rendering:** the engine's Mode 7 perspective view, with pixel-art characters drawn at their distance, at a fixed 480×270 resolution. The engine's 3D build isn't in the handoff package, so this is how depth is done.
- **Core rules, with numbers:** full-auto SMG with limited magazines and reloads, grenades, a damage meter and enemy quotas. Enemy shots are telegraphed by a closing ring, and grenades, knives and rockets can be shot out of the air. Civilians and hostages cost you if hit; supplies come from crates and animals that drop items and flee rather than die.
- **Content:** six operations that follow the original's arc, each with a beat-by-beat spawn table and a boss. There are 9 enemy types, 8 vehicles, 11 pickups, the interrogation scene and five endings that depend on how many hostages you save. All the story text is written in the original's terse arcade style.
- **Everything else TASK.md asks for:**
  - Controller-first 10-foot UI with PlayStation glyphs by default and an Xbox option.
  - All music, sound and gibberish voices made in code.
  - Dev mode from the pause menu with 23 live sliders and a reset to defaults.
  - Attract mode after 10 seconds, played by an AI that cheats.
  - The touch-only screen and the About/Credits screen.
  - Local co-op for 1–4 players, and AI Hub online co-op for 1–4 in its shared-world mode, with the message formats spelled out.
- **Architecture:** about 40 source files split into a deterministic game simulation, presentation, networking and UI, plus four small engine changes, each with its reason.
- **Build order:** ten milestones. The first is a spike that checks the riskiest parts before any content: Mode 7 drawing, aim hit detection and the single-file bundle. Operation 1 gets finished completely before the other five.
- **Risks:** twelve, each with how to reduce it.
- **Testing:** one command that prints only failures and a count. It includes a scripted playthrough of the whole game and the real AI Hub test harness in five setups.

The machine's `/tmp` was completely full when I started, so I used a folder under `~/.cache` for research and have since deleted it. The plan tells the builders to keep temporary files inside their own folder. I didn't touch anything else in `/tmp`, but you may want to clear it before other runs.

Sources for the facts about Operation Wolf:
- [Operation Wolf, Wikipedia](https://en.wikipedia.org/wiki/Operation_Wolf)
- [Operation Wolf, arcade-history.com](https://www.arcade-history.com/game/1887/)