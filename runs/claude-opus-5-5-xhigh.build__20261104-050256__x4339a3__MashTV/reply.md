MASH TV is complete. This turn I re-read TASK.md line by line against the running game and found one requirement without a real-browser test: playing on a controller.

I added a walkthrough in Chromium with a fake PlayStation controller, which Chromium reads as a real pad. It covers:
- navigating the menus;
- moving with the left stick and aiming and firing with the right;
- pausing and resuming with Options;
- PlayStation button symbols, and the Xbox setting;
- on-screen prompts switching between controller buttons and keys, depending on what was used last;
- the demo mode starting after 10 s idle, and leaving it.

It found no game bugs. Its three early failures were mistakes in the test itself. The full suite now passes: 25 suites, 523 checks, 0 failed. I rebuilt the game file and `exit-interview.json`, and checked that it parses with every field filled.

Still not done, because a headless session can't do them:
- **Balance:** no human has played it.
- **Audio:** measured but never listened to.

Those are the next steps on your side. Every key balance number is a live slider in dev mode. TASK.md forbids handing a review to a subagent, so I can't get an independent check either. If you're satisfied, `/goal clear` releases the stop hook.

## Source Information
- **Date:** 2026-11-04 05:02:56
- **Source:** Smash TV (Williams Electronics arcade game, 1990)
- **Plan:** PLAN.md
- **Genre and Perspective:**
  - **Genre:** twin-stick arena shooter (arcade), 1–4 player co-op, with a choice of route between rooms.
  - **Perspective:** one fixed arena per room from a high three-quarter studio camera; a straight-down overhead camera is a Settings option.
- **Tech:**
  - my-3D2dge handoff v0.85.2 (commit 4390a98, full edition with the arcade module) with 4 small engine patches;
  - AI Hub client aihub-session 1.4.0;
  - plain JavaScript bundled into one HTML file by a Node 24.22.1 script;
  - Playwright 1.63.0 (Chromium) and Node `vm` for tests.
- **Art Direction:**
  - The engine's native PS1-era look (320×240 expanded, HD Humanoid rigs, textured TileMap floors and walls, canvas lighting).
  - Dressed as a retro-future TV studio: neon, chrome, marquee bulbs, sponsor logos, confetti, spotlights, a jumbotron.
  - All art drawn in code, plus a few CC0 Kenney and KayKit props.
- **Animation:**
  - The engine's procedural Humanoid and Blob rigs.
  - New motion: the land mime's trapped-in-a-box hands, dive-roll slides, cable drops, boss parts and patterns, the Wheel's eased spin, tweened cards and TV-static wipes.
- **Audio:**
  - All synthesized in code: 8 original songs, 12 stings and about 70 sound effects.
  - Animalese-style gibberish voices (formant synthesis) for the host, co-host, announcer, bosses and contestants, plus a synthesized studio crowd.
  - Measured in Chromium: songs audible, peaks under 0.3. Not judged by ear.
- **Online:** AI Hub Session Protocol v1, shared-world, 1–4 players (the Lightning Round). Local co-op for 1–4 on one screen.
- **Testing:** One command (`npm test`) runs 25 suites (523 checks) and prints only failures and a one-line count:
  - headless suites driving the engine's fixed-step `game.advance`: every room swept by bots, all 3 bosses, a full scripted playthrough plus a game-over run without cheats, UI, dev mode, attract, touch, and a determinism proof;
  - a balance suite (a human-like bot must clear each Episode 1 room in 45–90 s with at most 2 deaths, and beat Mashy) and a TASK.md feature check;
  - a 3-copy network test on a fake hub with latency and packet loss;
  - a real-input walkthrough (keys, clicks, taps) and a fake-controller walkthrough in Chromium;
  - Playwright checks at 1280×720 and 1920×1080, and an audio measurement;
  - the AI Hub harness, run 4 times.

  Screenshots were reviewed only for what scripts can't judge.
- **Research:** Read the engine's API card, the relevant AI_GUIDE sections, the asset card and the engine source, plus the AI Hub protocol, client, harness and round.js. Smash TV from general knowledge only; every name, line, level and tune is original.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:**
  - Cost and total tokens: unknown (no counter is visible inside the session).
  - Estimate: about 160K output tokens of code and text (about 555 KB of source, tests and tools), not counting reasoning or input.
  - Session time: about 2 h 30 min (05:03 to about 07:35 MST).

## Testing Feedback
1. **How many issues did testing catch?** About 28 real issues: 20 from the scripted suites and 8 from screenshots. Examples:
   - a bare `yield` in my coroutine runner waited two steps, so bosses and the survive-room clock ran at half speed;
   - the Prize Recap never left after Episode 2;
   - remote players' guns fired only once;
   - the demo mode stuck on its first reel;
   - Mashy could become unkillable;
   - two rooms never dropped their Golden Key;
   - pickups drew at 60% size;
   - the camera drifted under overlays.

   The balance suite then showed rooms clearing too fast and two fights too hard, and I retuned them. The real-key walkthrough found that dev mode ignored the keyboard, and that Esc on How to play left it stuck under the pause menu. The controller walkthrough found nothing. Mistakes in the tests themselves aren't counted.
2. **How many were critical / game breaking?** 4:
   - the Prize Recap hang;
   - Mashy becoming unkillable;
   - remote players doing no damage online;
   - the demo mode stuck on its first reel.
3. **Most helpful test:** The scripted playthrough: it found the recap hang and the missing keys in one run. Next was the network test, which found the dead remote guns before the real harness ran. For balance, the human-like bot was a repeatable stand-in for a player.
4. **Least helpful test:** A filmstrip of the land mimes, whose frames were too small to judge. Also the engine checker's views this game doesn't use. The lesson: headless taps aren't real key presses, so the real-input walkthroughs now run with the rest.

## Engine Feedback
1. **Liked most:** Exact, deterministic headless play. With fixed steps, scripted taps and a debug handle, one command plays the whole game, three networked copies and every scene in minutes. Also free pause, settings and rebinding screens, and Humanoid rigs with portraits.
2. **Stuck or guessed wrong:** Yes:
   - sprites scale by camera zoom alone, so they drew tiny at the zoom that fits the arena;
   - switching input presets drops a tap made on that step;
   - a mouse move doesn't update the last device used;
   - the hit-effect helper always freezes the game briefly, which an online host must avoid;
   - the Controls-screen labels are only set when there's a page (DOM);
   - resuming from a pause-menu button leaves the pause screen open, holding input back.
3. **Most important thing I built myself:** The online netcode: an authoritative host, 15 snapshots a second, client prediction, smoothing between snapshots, claims and hurt reports, standings, and the session card. Then the game-show layer: ratings, crowd reactions, the host-line queue and the gibberish voices.
4. **Hardest part:** Keeping engine-drawn and hand-drawn sizes consistent across zoom levels. Also making input presets and the pause menu agree: arrows aim in play but move the focus in menus.
5. **What I changed in the engine:** 4 patches, listed in `engine/PATCHES.md`:
   - expose the engine's hook lists, so presets switch at the right moment in each frame;
   - default the button symbols to PlayStation with an Xbox option, applied to every player;
   - let the arcade module take initials from a given player, and let any player continue;
   - expose the audio effects bus, so the voices obey volume and mute.
6. **One thing I'd change:** One "pixels per world unit" scale shared by sprites and custom painters, so everything stays in proportion at any zoom.

## Prompt Feedback
1. **Liked most:** It defines a whole product: a 10-foot controller-first UI, demo mode, dev mode, local and online multiplayer, one file, an exit interview. With the detailed plan, there was almost nothing to guess about what "done" means.
2. **Confusing:**
   - TASK.md says to pick the title with a random number generator, while the plan says the title is already fixed. I followed the plan.
   - "Usage" asks for numbers an agent can't see.
   - "Balance is key" has no target a script can check.
3. **Hardest thing:** The scope (18 rooms, 3 multi-phase bosses, every screen and cutscene) on top of online netcode that had to survive lag, packet loss, the host leaving, and a server copy. Balancing without a human playtester was the hardest judgement call.
4. **What I'd change:**
   - give a measurable balance target, such as expected clear times;
   - say how to estimate Usage, or drop it;
   - reconcile the title step when a plan already fixes the title.