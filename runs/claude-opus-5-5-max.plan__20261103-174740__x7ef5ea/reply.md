I've written `PLAN.md` in this folder (about 1,670 lines). No code was built, as STAGE.md asked. While I was writing, something else reformatted the file: it split long sentences and turned inline lists into bullets. The meaning stayed the same, so I kept that version and edited on top of it.

**Title:** **Dragon Quilt Builders**. I wrote 50 riffs on the name and picked index 42 with Python's `secrets` (OS entropy). The pick sets the whole theme: a world made of patchwork quilt pieces, unravelled by the dragon Frayvern, who swallowed everyone's "Knack" for making things.

**Genre and view:** a block-building action RPG in a rotatable isometric 2.5D view, built on the engine's pixel art and character rigs. I read the engine's source before choosing this. Its map type can't do blocks stacked over open space (roofs, bridges, tunnels), so the plan specifies a custom voxel world that fits the engine's existing hooks. Body physics only calls two map methods, and the renderer's depth sort can be adjusted per map, so it slots in without engine surgery.

**What's in the plan:**
- **Source features, all original names:** breaking and placing blocks, ideas for new recipes that pop up when you pick up materials ("Notions"), crafting stations, and room recognition (walls at least 2 high, a door and a light). Also a town banner whose level rises with "Cheer", blueprints that residents help build, a hunger meter, day and night, a siege, and a boss you can only stun with ballistas you built.
- **Content:** 6 regions with coordinates, about 25 block types, every item and recipe, 20 placeable objects, 8 room types and 5 town levels. Plus 5 residents with voices and sample lines, 6 monsters, a mini-boss and a final boss, and 17 quests written step by step.
- **Required modes:**
  - Dev mode from the pause menu with 22 live sliders and a reset to defaults.
  - Attract mode: 9 AI-played scenes that start after 10 s idle; any input exits.
  - A notice for touch-only devices.
  - A co-op AI Hub round for 1–4 players, with message formats and limits, server mode, and a solo version for playing outside the hub.
- **Controls:** controller first. PlayStation glyphs by default with an Xbox option, mouse targeting of blocks, and prompts that follow whichever input was used last.
- **Audio:** written entirely in code, including a recurring theme melody and a gibberish voice synth for dialogue.
- **Build order:** milestones MS0–MS12 with acceptance criteria. The voxel engine is first because it is the riskiest part, and the plan gives fallbacks if its depth sorting misbehaves.
- **Testing:** one command that prints only failures and a count. It runs about 25 headless suites, including a scripted playthrough of the whole chapter and a multiplayer test with simulated network loss. Browser checks run the AI Hub harness in all 4 of its scenarios, plus screenshots.

The plan also covers the About screen and `exit-interview.json`. The Source Information and feedback sections that TASK.md wants in the chat reply belong to the build stage, so they aren't here.