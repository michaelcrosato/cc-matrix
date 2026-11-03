I've finished **Mad Men Out**, an original spiritual successor to Mad Men, built on the my-3D2dge engine. The title was picked at random from 50 riffs I brainstormed. All tests pass on the final build:

- **Headless suite:** 94 of 94 checks, including a full three-day playthrough.
- **Browsers:** the scripted run passes in Chromium, Firefox and WebKit.
- **AI Hub harness:** passes in all three scenarios (2 players; 4 players with latency and packet loss; the host leaving).

**Deliverables** (in the run's `work/` folder):
- `MadMenOut-MadMen-claude-opus-5-5-medium-20261102-181325.html`: the whole game in one file. The engine, the AI Hub client and the game are all inlined, so nothing is downloaded.
- `exit-interview.json`: every field filled in; it parses as JSON.
- `MadMenOut-MadMen-claude-opus-5-5-medium-20261102-181325/`: the dev files: `src/` modules, `build.mjs`, `test/test.mjs` (headless), `test/browser.py` (browser) and `hubtest/`.

**What's in it**
- **Campaign:** three days at the fictional agency Bellweather & Crane in 1962. You walk the office floor, talk to staff, look at things and overhear gossip to collect insight cards. Each card sells one of five angles: desire, status, nostalgia, safety or freedom. Client intel reveals what the client really wants.
- **The clock and your nerve:** conversations cost time before the pitch. Phone calls and visitors arrive at set hours. Drinks restore composure but add haze; coffee and naps clear it.
- **The pitch:** you choose up to three cards at your typewriter. In the meeting you read the client's tell, time each slide on a meter, pivot out of one that backfires, and land a four-beat closing speech on the beat. On day 2 the client changes what he wants halfway through; on day 3 a father and son want different things.
- **Story and endings:** a secret past identity subplot, a blackmail choice, evening scenes, and three endings.
- **Other modes:** a solo Pitch Gauntlet, a local 2-player Pitch-Off (Jack against Ruth), and an AI Hub parallel round for 1–4 players.
- **Attract mode:** after 10 seconds idle on the title, a cheating autopilot plays a day; any input exits.
- **Controls:** controller-first with PlayStation symbols by default and an Xbox option. Settings add invert-horizontal and invert-vertical for the stick and d-pad. Keyboard uses WASD/E/Tab; the mouse hovers to focus and clicks to walk or pick. On touch-only devices the title shows "Controller or keyboard required" and a Settings button; the attract mode still runs.
- **Camera views:** the office can switch between three-quarter, isometric and top-down.

Two things you'd otherwise trip over:
- **Button symbols:** the engine's pixel font had no ✕ ○ □ △, so every controller prompt showed "?". I added those symbols to the font from the game code at startup; the engine file itself is unchanged.
- **Click-to-walk:** the engine's pathfinding doesn't know about furniture. A clicked walk slides along whatever blocks it and gives up after 3 seconds if it's still stuck.

## Source Information
- **Date:** 2026-11-02 18:13
- **Source:** Mad Men (2007-2015), the AMC drama created by Matthew Weiner
- **Genre and Perspective:** a story-driven adventure with a pitching minigame and some time and composure management. Three-quarter top-down view in the office (switchable to isometric or top-down); side view for the title and the evenings.
- **Tech:** my-3D2dge v0.85.1 (full edition, one file, no dependencies), plain JavaScript, Canvas 2D and Web Audio through the engine, AI Hub session client 1.3.0. Tests used Node 24 and Playwright 1.63 (Python).
- **Art Direction:** the engine's own style: code-drawn pixel art at 320x240, stretched to fill the screen. Its HD character models are dressed in 1962 suits and dresses, the mid-century furniture is written as shape data, and scenes use canvas lighting.
- **Animation:** the engine's procedural character animation (walking, poses, expressions), live dialog portraits with moving mouths, and scene transitions.
- **Audio:** cool-jazz music written in code (lounge, pitch, evening, win, lose), chip sound effects (typewriter, ice, telephone, applause), and Simlish-style gibberish voices, one per speaker.
- **Online:** AI Hub Session Protocol v1 in parallel mode for 1–4 players (same seeded deal for everyone, progress, result, time-up and end handling), plus local 2-player Pitch-Off. No other network use.
- **Testing:**
  - The headless Node suite (94 checks, every mode, a mock hub, the gamepad axis fix).
  - Playwright runs in Chromium, Firefox and WebKit, plus a run with a mocked DualSense.
  - The AI Hub harness, with 2 and 4 players, added latency and packet loss, and the host leaving.
  - The viewport matrix at 24 phone, tablet and desktop sizes.
- **Research:** none beyond the engine and AI Hub docs; the source comes from general knowledge.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** unknown

## Testing Feedback
- **How many issues did testing catch?** 13:
  - unknown material patterns
  - the brainstorm screen getting its layout only while drawing, so its input did nothing in headless runs
  - the attract-mode autopilot getting stuck on furniture
  - a window hotspot overlapping the typewriter
  - missing PlayStation symbols in the font
  - a missing middle-dot character
  - text overflowing the cards
  - suits drawn as white shirts
  - the pitch camera hiding the clients
  - no AI Hub progress reports during play
  - garbled icons in the small font
  - the wrong hint on touch-only screens
  - the logo crowding the corner button on portrait phones
- **How many were critical?** 3: the missing PlayStation symbols (every controller prompt was unreadable), the missing hub progress reports (the harness failed, and the hub runs the same check before letting a game into sessions), and the pitch camera hiding the client you're pitching to.
- **Most helpful test:** the headless three-day playthrough; the AI Hub harness was a close second.
- **Least helpful test:** the viewport matrix on the title screen. All 24 sizes came back clean, though its phone shots did show the logo issue.

## Engine Feedback
- **What did you like most?** The standard features that come free: pause menu, settings, rebinding, button-symbol families, saves, dialog with live portraits and lighting. Its exact fixed-step clock also makes a whole game testable headless in Node.
- **Did you get stuck or guess wrong?** Yes, on a few things:
  - Some material pattern names don't exist (leather, velvet, leaves, marble).
  - The "coat" outfit colours the torso with the shirt colour.
  - The font lacks the symbols that the engine's own `input.label()` returns.
  - Which way props face in the side view took trial and error.
- **Most important thing built myself:** the pitch system: cards with angles, client wants that change mid-pitch, the timing meter, pivots and the beat-timed close. Also the per-speaker gibberish voices, the office day's clock and events, and the gamepad axis fix.
- **Hardest part:** finding the right details in a very large API. Examples: what `mouseGround` returns, or that pathfinding ignores furniture.
- **Remove or overhaul:** the material shorthand's silent fallback; a misspelled pattern only warns once in the console.
- **Change one thing:** ship PlayStation and Xbox symbols in the pixel fonts, add a public way to define new glyphs, and make pathfinding avoid placed furniture.

## Prompt Feedback
- **What did you like most?** It defines "done" concretely: attract-mode timing, controller-first UI, the inversion settings, touch-only behaviour, hub integration and the feedback loop.
- **What was confusing?** The deliverable file-name pattern when the title and source contain spaces and a year. Also whether "multiplayer for the game on its own" meant local multiplayer too; I did both.
- **Hardest thing to do:** turning a slow, talky drama into a game loop with real decisions.
- **One test I wish I could have run:** a real DualSense on a TV at ten feet, with a person playing all three days, to judge readability, pacing and whether the pitch meter feels fair.