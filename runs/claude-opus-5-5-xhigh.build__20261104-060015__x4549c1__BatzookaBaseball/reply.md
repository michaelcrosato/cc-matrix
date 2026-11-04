I've built **Batzooka Baseball**, an over-the-top arcade baseball game, as a single file: `BatzookaBaseball-Baseball-claude-opus-5-5-xhigh-20261104-060015.html` (1.7 MB). It opens from `file://` with no network. `exit-interview.json` sits beside it and parses with every field filled. The full test run passed 160 of 160 checks: 129 headless, 26 in a browser, and 5 in the AI Hub harness. The final build differs from that run only in About-screen text; I re-ran the headless and hub checks on it (134 of 134 pass) but not the browser checks.

**What's in it.** You pitch and bat from behind the catcher (a Mode 7 view) and field and run from a broadcast camera over the park; home runs get a slow-motion chase camera, and big plays get replays.
- **Pitching:** five pitches each, including six signature and six team super pitches, with aim, a release ring and in-flight steering.
- **Batting:** a sweet-spot reticle with contact, power and bunt swings. The Batzooka is a rocket bat the crowd's roar charges.
- **The rest of the ballgame:** CPU fielders and runners with forces, tag-ups, double plays and steals; the Rhubarb, a bench-clearing brawl mini-game; six parks, each with a hazard.
- **Modes:** a story Tour (five road games and a robot boss, with upgrades and saves), Exhibition for 1–4 players on one machine, a home-run Derby with a leaderboard, and eight Spring Training lessons.
- **Required extras:**
  - **Attract mode:** after 10 seconds idle, a demo reel played by the real game; any input returns to the title.
  - **Dev mode:** from the pause menu, with every balance value as a live slider, reset to defaults, situations, cheats and warps.
  - **Prompts:** PlayStation symbols by default (Xbox option in Settings), keys and mouse buttons on keyboard and mouse.
  - **Touch-only devices:** a "Controller or keyboard required" card with a Settings button.
  - **Online:** an AI Hub Derby round for 1–4 players.

**Where I departed from the plan:**
- File and folder names follow TASK.md. The plan used another run's id.
- No motion-capture clips. Every animation is built on the engine's own rig system, which the plan allowed as a fallback.
- The broadcast camera zooms in four fixed steps rather than smoothly. The engine re-renders the ground at every new zoom level, which stalled smooth zooming.
- In the behind-the-plate view, the catcher is drawn smaller and lower than true perspective so the strike zone stays clear.

**Balance:** with the CPU playing itself over 9 innings, a team scores about 4–5 runs a game, with an average around .26 and 4–7% home runs per plate appearance. Those are all inside the plan's targets.

## Source Information
- **Date:** 2026-11-04 06:00:15
- **Source:** Baseball (the sport), in the over-the-top arcade style.
- **Plan:** PLAN.md
- **Genre and Perspective:** Arcade sports (baseball), with a slapstick brawler mini-game (the Rhubarb) and a story Tour with light upgrades. The cameras are:
  - Plate Cam: Mode 7 from behind the catcher, for every pitch and swing.
  - Broadcast Cam: a three-quarter ground view of the park, for fielding and running.
  - Moonshot Cam: a Mode 7 chase of home runs.
  - Replay Cam: the isometric view at half speed.
- **Tech:** my-3D2dge v0.85.2 handoff engine (the full engine; its Mode 7 and arcade modules), with small changes: a bat weapon, mitts, four hats, extra font glyphs, and PlayStation symbols as the default. Plain JavaScript, no libraries, bundled into one HTML file by a Node build script. AI Hub Session client 1.4.0. Tests use Node 24 and Playwright 1.63.0 with Chromium.
- **Art Direction:** The engine's native look: HD Humanoid rigs drawn as pixel art at res ps1 with expand, textured TileMap ballparks with baked mowing patterns, lit night games and particles. 40 new shape assets (bases, foul poles, light towers, scoreboards, the silo, a lighthouse, lava vents, habitats, tombstones, drones, the MEGA-TRON) plus code-drawn sprites.
- **Animation:** The engine's procedural rig system. New attack specs and poses for the contact and power swings, bunt, windup and pitch, throws, tags, dives, slides, wall climbs, umpire calls, celebrations and Rhubarb combos, plus a two-handed bat grip by IK. No motion-capture clips.
- **Audio:** All in code with the engine's chip synth: 20 original songs and stings (ballpark organ, surf rock, synthwave), about 60 sound effects, and Animalese-style babble voices for 15 characters. No audio files.
- **Online:** AI Hub Session Protocol v1, ghost mode, 1–4 players. An online Derby round on a shared pitch sequence, with ghost batters and home-run comets. Client 1.4.0 pasted unmodified.
- **Testing:** Allowed: headless tools and scripts that play the game and read its state (game.advance, game.debug), a scripted playthrough, screenshots only for the look, and no subagents or workflows to review. Used: one command (`node tests/run.mjs`) with about 160 checks:
  - headless suites and seeded CPU-vs-CPU balance sims;
  - the whole-game playthrough;
  - browser checks: the engine's check tool, drawn games in every park, and the attract reel;
  - the AI Hub harness.
- **Research:** Read the engine handoff (README, API card, index lookups, asset card, and the Mode 7, arcade and Humanoid source) and the AI Hub protocol README and harness. No web research beyond those.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** Session time about 2 hours (06:00 to about 08:00). API cost and token counts unknown.

## Testing Feedback
1. **How many issues did testing catch?** About 30 during the build. The headless sims, scenario tests, playthrough, browser checks and screenshots each found some.
2. **How many would be considered critical / game breaking?** 9:
   - CPU batters were swinging with the human's reticle, so the CPU had no offense.
   - A SUDDEN BOOM tie looped forever.
   - A strikeout before any play crashed the game.
   - Throws sailed past their receiver, leaving plays stuck.
   - Two of my engine patches broke the engine's parsing or control flow.
   - A syntax error in the Derby.
   - A name clash crashed the title screen.
   - A scene read the renderer during its update.
3. **What was the most helpful test you ran?** The seeded CPU-vs-CPU nine-inning sims with an event tally (runs, AVG, K%, HR%, errors, timeouts). They found the reticle bug, the stuck plays and the missing doubles, and steered every balance change.
4. **What was the least helpful test you ran?** The check tool cycling the engine's stock views (iso, top-down, side). This game uses its own Broadcast and Mode 7 cameras, so those frames say little about it.

## Engine Feedback
1. **What did you like most about the engine?** Exact fixed steps that run headless. A whole nine-inning game simulates in Node in about a second with the same code that draws in the browser, and Mode 7 gave the Plate Cam almost for free.
2. **Did you get stuck or guess wrong?** Yes:
   - A TileMap floor re-bakes at every new zoom, so smooth zooming stalled until zoom went to four steps.
   - Mode 7 draws no TileMap walls, so the fence and stands needed hand-built billboards.
   - `E.store` doesn't persist in Node.
   - `pressed()` is only true inside a step.
3. **What was the most important thing you had to build yourself?** The baseball simulation:
   - the parametric pitch flight;
   - the timing-and-aim contact model;
   - batted-ball physics with the fence, poles and fair or foul;
   - fielders and runners with forces, tags, tag-ups, cutoffs and the third-out rule.
4. **What was the hardest part about using the engine?** Keeping one look across two cameras. The Mode 7 Plate Cam and the TileMap Broadcast Cam each needed their own build of the same fence, stands, crowd and props.
5. **What did you change in the engine, and why?** A bat weapon, fielders' and catchers' mitts, four hats (batting helmet, catcher's mask, space visor, top hat), the ✕ ○ □ △ symbols and a few marks in the font, and PlayStation as the default button symbols with an Xbox option. All are needed for baseball and the controller-first prompts. They are listed in `ENGINE-CHANGES.md`.
6. **If you could change one thing, what would it be?** Cache the baked floor independently of zoom, and let Mode 7 draw a TileMap's walls, so one level serves both cameras.

## Prompt Feedback
1. **What did you like most about this prompt?** A complete, decided plan beside a short contract. The plan settled every design question, and TASK.md said exactly what done means.
2. **What was confusing?** PLAN.md names its files and folder with another run's id (max-20261103-174819). TASK.md's names win, but every path in the plan had to be translated. Usage asks for cost and token counts the session can't see.
3. **What was the hardest thing to do?** Breadth at quality. A full baseball simulation balanced by sims, plus a Tour, eight lessons, a Derby, the attract reel, dev mode, four local players and the AI Hub round, all in one build.
4. **What would you change in this prompt?** Resolve the plan's names to this run before handing it over. Let the plan rank its features, so a build can go deep on the core first and add the rest in order.

Everything is in `BatzookaBaseball-Baseball-claude-opus-5-5-xhigh-20261104-060015/`:
- `src/` is the game code; `node tools/build.mjs` rebuilds the HTML file.
- `node tests/run.mjs --all` runs every test.
- `NOTES.md` covers decisions and balance, and `ENGINE-CHANGES.md` lists every engine change.