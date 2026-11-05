# Eye of the Bolt-Holder (dev folder)

A real-time, first-person party dungeon crawler inspired by Eye of the Beholder (1991), built on my-3D2dge v0.85.2 (the
2D engine and its 3D engine over three.js r182 and Rapier 0.19.3), shipped as one HTML file in the folder above.

## Build, test, play

```sh
npm install                     # Playwright 1.63.0 (the browser tests and the AI Hub harness)
node tools/build.mjs            # writes ../EyeOfTheBoltHolder-...-20261103-185046.html and ../exit-interview.json
node tests/run.mjs              # every suite; prints only failures and one line
node tests/run.mjs --fast       # without the browser suites
node tests/run.mjs ui hub       # some suites
node tests/shoot.mjs [names]    # screenshots for review into shots/ (not a test)
node tools/evidence.mjs         # after `node tests/run.mjs --verbose > tests/out/verbose.log`: TASK-EVIDENCE.md, each TASK.md line and the checks that prove it
```

Open the root HTML from disk in a browser (three.js and Rapier load from jsDelivr). Deep links for testing:
`#play` (a new game at once), `#warp/f2/10/2/1` (a floor and cell), `#race` (the Rat Run), `#attract`.

## Layout

- `src/` the game, concatenated in file order into one IIFE: `00-16` data, `20-31` the sim (pure, deterministic, no
  page, sound or 3D), `40-44` the presenter (3D) and the Node stand-in, `50` audio, `60-68` input and UI, `70-73` Dev
  Mode, attract, the bot and the AI Hub, `80` the cutscenes and stages, `90` the game and its scenes.
- `engine/` the two engines, patched (`PATCHES.md`). `hub/` the AI Hub client and harness, unmodified.
- `tests/` the runner, its suites, the Node loader, the browser helpers. `CONTENT.md` the data formats, `TASK-COVERAGE.md` each TASK.md requirement and its proof, `TESTING-ISSUES.md` what testing caught, `TASK-EVIDENCE.md` the passing checks for each TASK.md line.

## Controls

Pad (PlayStation layout): left stick step and strafe, d-pad step and turn, right stick flick turns, ✕ use (hold: put the
Hand down), ○ throw, □ Party Strike, L1 R1 choose a member, R2 L2 that member's hands, △ Party, L3 Camp, R3 Examine,
Create Map, Options pause. Keyboard: W S step, A D strafe, Q E turn (arrows step and turn), F use, H put down, G throw,
Space strike, Tab next member, 1-6 a member's main hand (Shift: off hand), I party, C camp, X examine, M map, J journal,
Esc pause. Mouse: click things in the view, click hand slots to use them, right click to strike, drag items in the Party
screen.
