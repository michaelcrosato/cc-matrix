I built **Moby-Dusk**, a whaling action-adventure based on *Moby-Dick*. It is a single file, `Moby-Dusk-Moby-Dick-claude-opus-5-5-medium-20261101-1409.html` (1.44 MB), in this folder; my dev files are in the subfolder of the same name. Testing: the AI Hub harness passes every check (20 of 20) at 1 and 2 players; the gamepad and touch-only checks pass; the attract mode played its whole loop with no errors. A scan of the code found no TODOs, placeholders or stubs.

All testing was headless on a software renderer, which runs the game about five times slower than real time. Nobody has played it on a real GPU or with a real controller yet. Two walk-throughs drove the game partly by script rather than by playing:
- **Story:** I checked the chapters one by one. Dialogs were closed by the test, the ship was moved between places, and the White Whale's harpoon hits and his exhaustion were triggered directly.
- **Endings:** both ending choices appeared on the third day. The test picked "Cut the line" and the Starbuck ending's screen came up. Nothing checked the ending pages, the summary, the credits roll, the Ahab ending or saving and loading.

**What's in it**
- **Story chapters:**
  - Nantucket's wharf on foot: Queequeg, Father Mapple, Peleg and Bildad, Elijah.
  - Ahab's quarter-deck speech.
  - The first hunt.
  - Four meetings with other ships, each with choices that change Ahab's obsession, crew morale and rumours of the White Whale.
  - A typhoon with St. Elmo's fire.
  - Three days chasing Moby Dick.
- **Two endings:** "Strike with Ahab" (the book's ending) or "Cut the line with Starbuck". The second is only offered if the crew didn't follow Ahab too far.
- **Sailing:** steering, wind angle and sail settings, a masthead lookout that spots whales far off, a chart, and a dusk-to-night clock.
- **The hunt:** row, with a timed "pull together" boost. Hold to aim the harpoon, release to throw. Pay the line out or haul it in while the whale tows you. Lance the tired whale on a timing ring. Each whale species behaves differently: diving, leaping, tail slaps and charges, all signalled before they hit.
- **Other features:**
  - A whale journal, a ship's log and a crew page.
  - Three save slots plus an autosave.
  - Main view is the angled three-quarter view; you can switch to top-down, isometric or a low side view at any time.
  - Code-written music and sound, and Animalese-style babble for every speaker.
- **Attract mode:** after 10 seconds idle on the title, a cheating bot plays a hunt, a ship meeting, the typhoon and Moby Dick. Any input returns to the title.
- **Controls:** built for a PS5 controller, with keyboard and mouse mapped to the same actions. Settings include invert stick X and Y, difficulty, harpoon aim assist, hints and text speed.
- **Touch-only devices:** a card says "Controller or keyboard required" and offers a Settings button.
- **Multiplayer:** in AI Hub sessions it runs the "Open Sea Hunt": 4 minutes, most barrels of oil wins, side by side. On one machine, a second player can join a hunt and take the harpoon and line.

## Source Information
- **Date:** 2026-11-01 14:09
- **Source:** *Moby-Dick; or, The Whale* by Herman Melville (1851); title "Moby-Dusk" picked at random (cryptographic RNG) from 50 brainstormed names
- **Genre and Perspective:** nautical action-adventure (sailing, whaling hunts, branching story); main camera three-quarter (pitch 55), switchable to top-down, isometric and a low side angle
- **Tech:** my-3D2dge v0.85.1, full engine (repo commit 4512c51); plain JavaScript, no other libraries; AI Hub session client aihub-session 1.3.0 (ai-hub 0681daf2)
- **Art Direction:** the engine's own style: code-drawn pixel art at 320×240 expanded to fill the screen, the engine's character rigs, tile-map islands, canvas lighting. Ships, boats and whales are shaded solids drawn through the engine's views.
- **Animation:** the engine's procedural rigs (poses, throw and thrust moves, rowing) plus code-driven whale movement (swimming, diving, leaping, rolling fin-out) and tweens
- **Audio:** 10 songs written as notes in code, sound effects defined in code, Animalese voices for every speaker
- **Online:** AI Hub Session Protocol v1, side-by-side mode (progress, result, stats, awards); 2 players on one machine; no other network
- **Testing:** headless Chromium (Playwright for Python) on SwiftShader at 960×540; screenshots, scripted story walk-throughs, an attract-mode run, gamepad and touch emulation, the AI Hub harness
- **Research:** none beyond the engine's and the hub's own documents; the book from memory (public domain)
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** unknown (no estimate available inside the session)

## Testing Feedback
- **Issues caught:** 19.
- **Critical / game-breaking:** 3.
  - The hub check failed because progress was only sent when the oil count changed.
  - Building the 2048×2048 sea floor in one go froze the page for seconds; it now builds in pieces as the camera reaches them.
  - The hunt camera lagged so far behind that the boat and whale went off screen.
- **Most helpful test:** the attract-mode run. One bot played the whole loop and found more than any single check.
- **Least helpful test:** waiting a fixed number of seconds. Only waiting for conditions, or stepping the game by hand, gave honest results at that speed.

## Engine Feedback
- **Liked most:** the built-in features. Pause menu, settings, rebinding, save slots, boot screen, full screen and controller labels came free. Its world-to-screen projection let ships and whales turn correctly in every view.
- **Stuck or guessed wrong:**
  - Draw-order bias is in world units; I had to read the source to learn that.
  - A 128×128 map builds its whole floor at once unless `chunks: true` is set.
  - The floor tag `water` adds a sparkle that looks like noise on open sea.
  - The pixel font has no PlayStation symbols, even though the engine's input labels return them, so they show as "?". I drew the button icons myself.
- **Most important thing I built myself:** a renderer for large shaded solids (face culling, banded shading, an underwater tint) for the ships, boats and whales. The engine has no vehicle or large-creature body.
- **Hardest part:** large non-human objects in every view, and keeping a 5×7 pixel font readable from across a room.
- **Would remove or overhaul:** the split between the agent edition and the full engine in the docs.
- **Would change:** add glyphs for the controller symbols the engine returns, and an official shaded-solid primitive for ships, vehicles and big creatures.

## Prompt Feedback
- **Liked most:** free choice of book and genre, with clear hard requirements (attract mode, controller first, the hub, the info in three places).
- **Confusing:** "Pick a famous book" stands in for SOURCE everywhere, so the file names and Source line had to be inferred. "Follow the hub … as well as for the game on its own" could mean local multiplayer or the hub only; I did both.
- **Hardest:** a complete slice of a novel, with a branching story, a sailing model, a hunt and a boss fight, in one pass and readable on a TV.
- **One more test I'd run:** a real DualSense on a real TV, played start to finish by someone who has never read the book.

Source Information, Engine Feedback and Prompt Feedback are also in the in-game About & Credits screen and in the HTML comment at the top of the file.