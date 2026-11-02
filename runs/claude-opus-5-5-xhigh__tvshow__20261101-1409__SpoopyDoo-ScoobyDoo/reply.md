*Spoopy-Doo! The Phantom of Fogmoor Manor* is finished and saved as one file: `SpoopyDoo-ScoobyDoo-claude-opus-5-5-xhigh-20261101-1409.html` (1.5 MB) in the work folder. Dev files, tests and the build script are in the `SpoopyDoo-ScoobyDoo-…-1409/` subfolder.

It's an original Scooby-Doo-style mystery with its own characters: Waffles, a cowardly Great Dane, and three friends. Each one has an ability: Waffles sniffs out hidden clues, Rusty puts on disguises, Dot has a flashlight, and Brock forces doors and builds traps. You play one episode the way the show runs:
- The van arrives, the gang meets three suspects, and the Phantom appears.
- You split up and find 5 clues behind a secret bookcase, a jammed door and a hallway of doors, while hiding from or outrunning the Phantom.
- You keep Waffles' courage up with snacks, build a net trap under the chandelier, lure the Phantom into it, accuse a suspect, and pull off a mask with another mask underneath.

It also has:
- a title screen with a demo that plays itself after 10 seconds idle
- intro, game over, retry from checkpoint, and a results screen with a rank
- a case file, How to Play, and paged About/Credits screens
- controller-first menus, plus Settings toggles to invert the stick left/right and up/down
- a "Controller or keyboard required" message on touch-only devices
- AI Hub co-op for 1–4 players, and local drop-in co-op with a second controller

**Testing:**
- A headless playthrough of the whole episode passes all 36 checks.
- The AI Hub harness passes all 5 runs I tried: 2 players, 3 and 4 players on a lossy network, the host leaving, and a host with no player.
- An emulated PS5 controller got from the title through play and the menus.

**Not verified:** a real PS5 controller, the AI Hub repo's own `hub-check.mjs` script, and what the music and gibberish voices actually sound like (all tests were silent).

## Source Information
- **Date:** 2026-11-01 14:09
- **Source:** *Scooby-Doo, Where Are You!* (Hanna-Barbera, 1969). This is an original spiritual successor with its own cast and mystery.
- **Genre and Perspective:** a third-person stealth and mystery adventure. The main camera is three-quarter (Zelda-style). The view button (R3 or V) switches to isometric, top-down and brawler views, and the camera can turn and zoom.
- **Tech:** the my-3D2dge v0.85.1 handoff engine (`my-3d2dge.js`), inlined in the file. The AI Hub client `session.js` 1.3.0 is pasted in unmodified. Furniture and graveyard pieces come from free CC0 Kenney and KayKit sets, cut down with the engine's asset tool. No other libraries and nothing loaded from the network.
- **Art Direction:** the engine's own pixel-art style: dressed human characters, furniture and walls drawn by code, room lighting, rain and particles. I added book-spine, wallpaper, door and portrait wall patterns, plus the van, a grandfather clock and a fog machine.
- **Animation:** the engine's procedural character rigs. Waffles uses a four-legged rig I built the same way (the engine only has two-legged characters and blobs).
- **Audio:** music written in code: the theme, a sneaking tune, a pop chase song with gibberish lyrics on screen, a trap march, the reveal and the game-over tune. Sound effects are a mix of the engine's built-in sounds and new ones (creaks, slams, organ, wails, sniffs, chomps). All voices are gibberish, with a different sound for each character, an echoing Phantom and a laugh track.
- **Online:** AI Hub co-op, 1–4 players. The host (or a host with no player of its own) runs the Phantom, the clues, the trap and the score; each player moves their own gang member. Results include rankings, stats and awards. Outside the hub, a second controller can drop in for local co-op.
- **Testing:** the 36-check headless playthrough, browser screenshots of every room and screen, the 5 AI Hub harness runs, the emulated controller run, and an emulated phone.
- **Research:** none on the web. I read the engine's docs and the AI Hub protocol from local copies of their repositories.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** cost and tokens unknown. Session time about 0 h 52 min (14:09 to 15:01).

## Testing Feedback
- **Issues caught:** 16.
- **Critical / game-breaking:** 2.
  - A closet door took priority over the tape clue inside it, so the mystery couldn't be finished.
  - The "RUN!" line at the start of each chase froze the whole game until dismissed.
- **Most helpful test:** the headless full-episode playthrough. It found both critical bugs in seconds.
- **Least helpful test:** repeating the AI Hub harness across network scenarios. It passed every time and told me nothing new after the first run.

## Engine Feedback
- **Liked most:** real heights under switchable classic camera views, procedural characters with live portraits, and the menus, settings, rebinding and HUD that come built in. Most of the work was content, not plumbing.
- **Stuck or guessed wrong:**
  - The engine lowers every wall that has a room behind it, which hid all my doors and the bookcase. I replaced that rule with one based on where the player is.
  - My "invert vertical" setting silently clashed with the engine's own setting of the same name.
  - The engine's menu pauses the game even in scenes marked not pausable. That breaks the hub rule that a shared world must never pause, so I opened the settings screen directly and added a backup clock.
  - I had to guess that AI movement commands are ground directions, not screen directions.
- **Most important thing I built:** the four-legged dog rig. Second was the layer that runs the same mystery solo, as the demo, as a hub host and as a hub client.
- **Hardest part:** keeping a shared world running under menus that pause. Also, a dialog box takes one speaker at a time, so conversations needed their own queue.
- **Would overhaul:** the wall-lowering rule. By default it should only lower walls between the camera and the player.
- **Would change:** add animal rigs (dogs, horses) next to the human and blob rigs, and a menu mode that never pauses for networked games.

## Prompt Feedback
- **Liked most:** freedom to choose the show and genre, combined with requirements you can actually test: the 10-second attract mode, the 10-foot controller UI, the invert toggles, touch-only behavior and a single-file deliverable.
- **Confusing:**
  - The placeholder "pick a famous tv show" is left inside sentences.
  - The tech-stack link is the 2D handoff package, whose README says the real 3D engine isn't included.
  - "Online" and "Multiplayer" both point at the hub.
  - It's unclear what usage numbers an agent can actually know.
- **Hardest:** fitting a whole episode into one coherent system that also runs as a networked co-op round that never pauses.
- **One test I'd add:** the AI Hub repo's `hub-check.mjs` with its emulated PS5 controller, then a human playtest of the full episode on a TV with a real controller.

The same Source, Testing, Engine and Prompt sections are in the HTML comment at the top of the file and on the in-game About & Credits screen.