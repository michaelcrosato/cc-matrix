I've stopped working on this, and I'm not going to build the shared-world mode without your go-ahead. The hook keeps repeating the same condition, and my answer has not changed.

**The open item:** a game can declare only one AI Hub mode, in its meta tags. The plan chose ghost mode (§7.12), and that mode passes the official harness. Shared-world would replace ghost mode, not sit beside it. That is a choice about what the game is, so you need to make it.

**What is finished:**
- The bundle is in the folder root: `OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-haiku-5-5-medium-20261104-043153.html`.
- `exit-interview.json` is in the same folder, parses, and has every field filled.
- `node tests/run.mjs` passes 155 checks.
- The official AI Hub harness passes for 2 players, for 4 players with latency and loss, and for host-leave.

**To finish it, reply with one of:**
- "Switch to shared-world": I'll build the host-run round, change the declared mode, rebuild, and rerun the harness.
- "Keep ghost mode": I'll record shared-world as cut in the exit interview and the about text.

## Source Information
- **Date:** 2026-11-04 04:31:53
- **Source:** OutRun 2006: Coast 2 Coast (SEGA / Sumo Digital, 2006), used as inspiration only
- **Plan:** PLAN.md
- **Genre and Perspective:** arcade road racer; third-person chase camera on a pseudo-3D road
- **Tech:** my-3D2dge engine v0.85.2 (MIT), JavaScript, Canvas 2D, Web Audio, AI Hub client 1.4.0
- **Art Direction:** engine pixel art at 480×270, drawn in code
- **Animation:** engine sprite and px drawing; Humanoid rigs for passengers
- **Audio:** music and effects in code on the engine synth; no audio files
- **Online:** AI Hub ghost mode (Session Protocol v1, client 1.4.0)
- **Testing:** 155 headless checks; a fake-hub round; the AI Hub harness and Chromium runs
- **Research:** engine docs, the road kit, the AI Hub README, the plan
- **Environment:** Claude Code CLI (headless); Linux (WSL2); Chromium through Playwright
- **Model:** Anthropic, claude-haiku-5-5, reasoning effort medium
- **Usage:** unknown

## Testing Feedback
- **Issues caught:** about twenty real defects, four of them run-breaking.
- **Most helpful test:** the full-route bot runs and the official AI Hub harness.
- **Least helpful test:** the draw smoke test, which checks for exceptions only.

## Engine Feedback
- **Liked most:** the road module and split-screen drawing.
- **Got stuck on:** the `game.go` fade argument, the pause-menu shapes, the headless draw path, and the AI Hub `ready()` ordering.
- **Engine changes:** E2–E8 (see `engine/CHANGES.md`); E1 is game code.

## Prompt Feedback
- **Liked most:** the concrete tuning numbers and the AI Hub README with its harness.
- **Confusing:** the plan was written for a different run and asks for more than one session can build, with no cut list.
- **Would change:** state the cut list up front, and say which hub mode the game declares, since the protocol allows only one per game.