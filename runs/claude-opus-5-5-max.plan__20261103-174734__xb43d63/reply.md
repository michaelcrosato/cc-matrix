I've written `PLAN.md` (about 1,900 lines) in the work folder. No game code yet, as STAGE.md asked.

**Title:** **"Bentou 2: Birth of the Lunchbox Assassins"**. I wrote 50 riffs on the source's name into a script and drew one with Python's `secrets.randbelow` (it picked #27). The plan builds the world on it: a feudal ninja clan hidden in a bento shop whose boxes "have two tiers. So does the shop." The original characters, missions and script keep Tenchu's earnest, terse tone, with deadpan bento jokes.

**Genre and view:** isometric ninja stealth-action on the my-3D2dge handoff engine, in its pixel-art style. The camera turns in 45° steps and zooms. The engine can't do Tenchu's behind-the-back camera, so "Shadow Sight" stands in: enemies the ninja can't see are hidden unless the Ki gauge senses them.

**What carries over from Tenchu 2:**
- A Ki gauge: a 0–99 number for the nearest enemy, colored by how alert it is.
- Stealth kills ("Silent Cuts") from five directions, with an original 静斬 splash.
- Rooftops reachable only by grappling hook.
- Detection by light, shadow and noise; alarm bells that bring reinforcements.
- Swimming and diving, dragging bodies, and an escort mission.
- An 8-compartment bento holding 10 tools, including a poison rice ball.
- Ranks named after bento grades that unlock tools.
- A mission editor (the "Workshop"), after Tenchu 2's Mission Editor.

**Content:** a training mission and three story missions, each with a boss; two playable ninja; a full script and guard chatter.

**Everything else TASK.md asks for:**
- Dev mode from the pause menu: cheats, debug views, teleports, and 32 live balance sliders with resets.
- An attract mode of 7 autopilot demo clips.
- AI Hub "ghost" multiplayer for 1–4 players, with its own ready card, plus a standalone version where you race your own best run.
- A controller-first TV interface, PlayStation symbols by default with an Xbox option, and a touch-only notice.
- Gibberish voices and layered Japanese-scale music, all synthesized in code.
- About/Credits and exit-interview steps.

**Architecture:** about 35 source modules bundled into one HTML file. Content is data, systems talk through events, and the player, the autopilot and the tests drive the hero through one shared interface. The plan lists 9 small engine patches; for example, the pixel font has no ✕ ○ □ △, so PlayStation prompts need new glyphs.

**Build order:** milestones M0–M10, riskiest mechanics first. The biggest risks are:
- **Building shapes:** the engine can't put a room under a roof, so roofs are flat and walkable, and buildings you can enter get drawn-on roofs that fade when you go inside.
- **Fairness:** an isometric camera shows more than the ninja could see.
- **Hub compliance:** the real Hub harness runs early, at M4, not just at the end.

**Testing:** one command, `node tests/run.mjs`, prints only failures and a one-line count. It covers about 22 suites, including a scripted playthrough of the whole game, a mock Hub, the real Hub harness in Playwright, a determinism check and a bundle check. Screenshots are reserved for what scripts can't judge.

For research I read the engine's docs and its stealth kit, the AI Hub protocol, client and harness, and Wikipedia on Tenchu 2. The scratch copies are deleted.