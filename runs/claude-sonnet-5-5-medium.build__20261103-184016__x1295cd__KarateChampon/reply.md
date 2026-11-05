The game is complete, and I have nothing further to build or fix. The hook keeps asking for a human playthrough. I can't do that, and I won't claim it.

- **Deliverables:** the single `.html` and `exit-interview.json` are in the task folder root. The JSON parses, and every field is filled except `series`, which the task allows to be empty.
- **Last full test run:** 792 checks passed, 0 failed. The no-TODO scan found 0 hits. The real AI Hub harness passed all four runs.
- **Review done:** all 8 stages in the 2.5D view, and filmstrips for all 21 techniques. I also viewed the three bonus stages, the pause menu and the dev panel.
- **Not done:** a human playthrough, and a frame-by-frame review of every animation.

## Source Information
- **Date:** 2026-11-03 18:40:16
- **Source:** Karate Champ (1984 arcade, Data East; known in Japan as Karate Do)
- **Plan:** PLAN.md (written by claude-opus-5-5 at max effort)
- **Genre and Perspective:** 1-on-1 tournament karate fighting (point sparring) with arcade bonus stages and a mimic-the-master drill; 2D side view on a single-screen arena with a locked camera that follows the fighters, plus an optional Tatami 2.5D pitched view
- **Tech:** my-3D2dge v0.85.2 handoff engine, modified (PlayStation glyph default, live pause for sessions); AI Hub session client 1.4.0, unmodified; Web Audio; plain JavaScript; tests on Node 24 with Playwright 1.63.0
- **Art Direction:** the engine's native HD humanoid rigs drawn as PS1-era pixel art at 320x240, expanded to any screen; white gi against red gi on eight painted Japanese stages, with code-drawn props, lanterns, crowds and a bull
- **Animation:** the engine's procedural Humanoid rig driven by karate move specs built on E.MOVES, with spins, somersaults and rolls, referee signals and flags, and a hand-posed bull
- **Audio:** music, effects and voices all written in code: chip songs in Japanese pentatonic scales, noise and sine effects, and a gibberish voice synth for the referee, fighters and kiai
- **Online:** AI Hub session protocol v1, shared-world Kachinuki for 2–4 players with the game's own card; plus local versus for 2 players and local Kachinuki for 3–4
- **Testing:** headless `game.advance` suites behind one command, a scripted full playthrough, an in-process fake hub, Playwright page checks, a real-browser keyboard run, filmstrip and screenshot review, and the real AI Hub harness (4 runs)
- **Research:** the plan's research on Karate Champ (Wikipedia, TASVideos, Shacknews, arcade-history); none beyond that in the build
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-sonnet-5-5, reasoning effort medium
- **Usage:** unknown

## Testing Feedback
- **How many issues did testing catch?** About 17 real issues. The main ones:
  - game time stayed in slow motion after a full point;
  - cutscenes after the first never ended, because scene objects kept a "finished" flag;
  - a scene's `exit()` clashed with the engine's hook and threw the player into the dojo menu;
  - the round clock reset after every exchange;
  - the lesson II reverse punch drill could not be done;
  - CONTINUE replayed the same seeded match forever;
  - a tuning override also weakened the autopilot;
  - single lunge or jump-kick techniques dominated the AI;
  - a long score popup ran off the edge of the screen (found by a screenshot);
  - plus smaller initialization-order and input bugs.
- **How many were critical or game breaking?** Five: the stuck time scale, the cutscene finished flag (a soft lock in the story), the `exit()` hook clash, the unreachable reverse punch drill, and the endless same-seed CONTINUE retry.
- **Most helpful test?** The scripted full playthrough of all 19 nodes, driven by real menu inputs, the autopilot and dev toggles. It found most of the soft locks above and doubled as the continue, game-over, initials and unlock check. The real AI Hub harness came close behind, because it proved the protocol end to end.
- **Least helpful test?** The matrix and technique-table checks: they read the same data the game uses, so they mostly confirmed the data against itself. Screenshots were also slow for what they showed, apart from the first look at each screen.

## Engine Feedback
- **What did you like most about the engine?** The rig. A fully dressed, shaded, animated fighter from one constructor call, `E.MOVES` for credible kicks and punches, `flip` for somersaults, and portraits for free. Fixed-step update plus `game.advance` made every test deterministic. The pitched `brawler` view also worked on my hand-painted stages with no extra code.
- **Did you get stuck or guess wrong?** Yes:
  - I treated a scene's `exit()` as my own helper, but it is the engine's leave hook.
  - `Object.assign` on a scene runs its getters, which silently broke three of my scenes.
  - `game.go()` takes effect on the next step, and through a fade.
  - Timers die with a scene change and leave `game.timeScale` altered.
  - `input.pointer()` moves only from DOM events (`feed()` does not touch `mouse.t`).
- **Most important thing you built yourself?** The whole fighting rule set: the referee's phase machine, half and full points, counters, aiuchi, clock and hantei. Also the twin-stick reader, the CPU with reaction delay and personalities, three bonus games, the Technique Lab, the voice synth, glyph icons, 10-foot menus and the attract director.
- **Hardest part about using the engine?** Knowing what to avoid. `E.Fighter` and `E.Match` assume life bars, `game.freeze` stalls `update` (which would stall networking), and the 5x7 font has no ✕ ○ □ △. Balancing the AI by hand was also hard.
- **What did you change in the engine, and why?** Two small edits, listed in `engine/CHANGES.md`. Button symbols now default to PlayStation, because the task asks for it. `game.live` keeps the scene update running under the pause menu, so a shared-world host never stalls its network traffic.
- **If you could change one thing?** Let `game.go` take effect at once in headless runs, and make scenes instances instead of shared singletons so leftover state can't leak into the next visit.

## Prompt Feedback
- **What did you like most about this prompt?** The plan was a complete, ordered build document: exact technique tables, scoring formulas, phase timings, message formats and a traceability table. With the numbers decided, the combat code was straightforward. The hub protocol section meant the harness passed on the first run.
- **What was confusing?** Small disagreements between the plan and TASK.md: the plan's file names carry the planner's model and time, and it asks for engine edits (EC1, EC7) that turned out unnecessary. The plan's scale is also larger than one medium-effort pass, so every item needed a decision on how much to cut.
- **What was the hardest thing to do?** Making the CPU and balance work. The plan's targets (level curve, win rates, every technique landing, none over 35%) conflict with a roster where one lunge or jump kick scores a full point from long range, so both the data and the AI needed tuning passes.
- **What would you change in this prompt?** Say which parts of a long plan are mandatory and which are stretch. Say that the plan's tables may be tuned for balance when a test says so. Give a size budget for the final file.