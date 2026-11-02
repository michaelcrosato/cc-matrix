**Seinbound** is built: a comedic JRPG about nothing, inspired by Seinfeld. It's one 1.63 MB HTML file at `work/Seinbound-Seinfeld-claude-opus-5-5-xhigh-20261101-1409.html`, and it runs over http and from `file://`. The dev sources, build script and test tools are in the `Seinbound-Seinfeld-claude-opus-5-5-xhigh-20261101-1409/` subfolder.

**Testing status.** A headless bot plays the whole episode (all four plots, three bosses, the ritual, the set, the finale, credits, a save and a load) with no errors. The AI Hub harness passes at 1, 2, 3 and 4 players with 150 ms latency, 50 ms jitter and 5% loss, with the host leaving, and with a server host. The deliverable file itself also passes the harness at 2 players, at 4 players on the bad network, and with a server host. A simulated DualSense, the two invert toggles, attract mode and touch-only detection all pass. Nothing was tried on a real controller, a TV or a real multi-device session.

**The game.** In Episode 1, "The Rain Check", you walk one city block with four original characters and can switch the leader at any time:
- **Leo Observes:** small annoyances become bits for his stand-up set.
- **Howie Fibs:** each lie goes into a ledger, and his boss cross-examines him on it later.
- **Roz Shoves:** people and objects out of the way.
- **Dunk Bursts:** through doors and crowds.

Four petty plots meet at a 9 PM stand-up show:
- **Arguments:** turn-based fights with timing presses, a laugh-track meter and visible enemies who come at you.
- **The soup ritual:** a reaction minigame at the Broth Baron's counter.
- **The set:** pick bits from your notebook and hit the beat on each punchline. Bits about the day's plots land hardest, and the people in them react in the finale.
- **Party Mode:** 1–4 players on one machine with computer rivals, or online through AI Hub (`versus`).
- **Also in:** attract mode after 10 seconds idle, saves, and the four camera views. The default is overhead; the "Sitcom Cam" is the studio-audience angle.

**Things to know:**
- **Button prompts:** the engine's pixel font has no ✕ ○ □ △, but its button labels return those characters, so every DualSense prompt showed "?". I add the shapes to the font when the game loads, without editing the engine.
- **Party Mode under the menu:** opening the pause menu stops scene updates. In an online session the shared world runs on its own timer so the host never stalls.
- **Invert toggles:** they sit in Settings under the game's own section, below the standard Display, Sound and Comfort settings, not at the top.

## Source Information
- Date: 2026-11-01 14:09
- Seinfeld (TV Show)
- Genre and Perspective: comedic JRPG / social adventure. The main camera is three-quarter overhead; you can switch to Sitcom Cam (2.5D studio-audience angle), Isometric or Top-down. Arguments and the stand-up set are shown in Sitcom Cam.
- Tech:
  - my-3D2dge v0.85.1, full engine, including its Story module.
  - The engine's free CC0 furniture shapes (Kenney Furniture, KayKit Furniture Bits, KayKit Restaurant Bits), plus 16 shapes I wrote.
  - AI Hub Session Protocol v1, client 1.3.0, pasted unmodified.
  - No other libraries.
- Art Direction: the engine's own style. Pixel-art characters drawn from 3D skeletons, objects defined as data, brick building fronts, canvas lighting and rain at 320×240, stretched to fill any screen.
- Animation: the engine's own system. Procedural character poses and moves, plus its tweens, scripted sequences and particles.
- Audio:
  - 11 code-written songs, led by a slap-bass funk theme.
  - Engine sound effects plus custom ones (rimshot, slap-bass scene stings).
  - A synthesized laugh track, applause and crowd ooh/boo.
  - Animalese/Simlish-style gibberish voices per character.
- Online: AI Hub `versus` with 1–4 seats. The host runs the shared world; each player sends their own position about 12 times a second. Claims, shoves and pickups are sent reliably. A server host is supported. Passers-by and traffic come from the shared seed and clock.
- Testing: headless only. Node (the engine's fixed-step simulation), Chromium through Playwright 1.63 with software rendering, a simulated DualSense, an emulated touch phone, and the AI Hub harness run locally.
- Research: none on the show; all characters, lines and jokes are original. I read the engine's handoff docs and the AI Hub README.
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-opus-5-5, reasoning effort xhigh
- Usage: cost unknown; tokens unknown; session time about 1 hour (14:09 to 15:06).

## Testing Feedback
- **Issues caught:** 15 in the game, not counting problems in my own test tools.
- **Critical / game-breaking:** 3.
  - You couldn't talk to anyone behind a counter, so two plots couldn't be finished.
  - The notebook threw an error every time it opened.
  - Every DualSense prompt showed "?".
- **Most helpful test:** the headless episode bot. It plays the full episode in seconds and found the counter bug.
- **Least helpful test:** the per-scene headless smoke test. Drawing is skipped in Node, so it passed while every layout problem was still there.

## Engine Feedback
- **What I liked most:** characters and objects defined as data that draw correctly in every camera view. Pause, settings, rebinding and saves come built in. The deterministic headless mode made a full-episode bot possible.
- **Stuck or guessed wrong:**
  - The font is missing the PlayStation button glyphs its own labels return.
  - An object's front faces south, so my cars first pointed the wrong way.
  - Dialogue lines can't be functions, so I wrapped that step to pick random lines.
  - The ground-ring helper draws immediately instead of being queued, so it has to go inside the floor-marking call.
  - Making a piece of furniture solid doesn't draw it.
- **Most important thing I built myself:** the argument system: turn order, telegraphed enemy moves, zinger and brace timing, the laugh-track meter, and Varnum's lie-ledger cross-examination.
- **Hardest part:** keeping an online shared world running under a pause menu that stops scene updates. Also composing readable scenes in the 2.5D view, where depth squeezes rows together.
- **Remove or overhaul:** the pause menu's hold on scene updates. Scenes should be able to opt to keep running.
- **Change one thing:** let games add font glyphs, and ship every glyph the engine's own controller labels use.

## Prompt Feedback
- **What I liked most:** concrete, checkable requirements, such as attract mode after 10 seconds, the invert toggles and the touch-only screen, plus a multiplayer protocol that comes with its own test harness.
- **What was confusing:**
  - "Use one of the game's native perspectives" when the source is a TV show.
  - The filename's SOURCE contains spaces and parentheses ("Seinfeld (TV Show)"); I used "Seinfeld".
  - The "Done when" line names three feedback sections, but the task also asks for Testing Feedback.
  - "Multiplayer … for the game on its own" could mean local play or separate netcode; I did both local play and the hub.
- **Hardest thing:** turning a show about nothing into mechanics that feel like it, with a 10-foot interface on a 320×240 pixel engine.
- **The one test I'd want:** a real DualSense on a living-room TV, then a real four-device AI Hub session over the internet.