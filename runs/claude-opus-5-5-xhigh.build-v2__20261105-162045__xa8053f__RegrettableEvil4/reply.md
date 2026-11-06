# Regrettable Evil 4: final file handed in

The final file is `01ba494c49f75ad659e49a7a`, built from the current source. I ran `node tools/test.mjs` once on it: **2711 passed, 0 failed**. No test failed, so no check had to change.

## What changed since `3b61c36c`

**Kept:**
- **West Gate:** only the gate itself now ends chapter 1. Before, walking past it along the wall ended the chapter, skipping the shop. This was a real bug and has a test.
- **Bot:** it now mixes herbs and runs straight out of the anchor's landing ring instead of doubling back into it.

**Undone or dropped:**
- **First-Aid Tin:** the extra Tin on repeat tries at a checkpoint is gone, since it was only there to lower deaths.
- **DAMAGE TAKEN:** back at 1.
- **Abandoned experiments:** the 0.8 damage trial, the halved aim wobble and the West Gate pickup guard are all out of the code. The stopped 0.8 run isn't used anywhere.

The checks for the death limit and my balance rules are still in the test command, where they run on four seeds and passed.

## Numbers already in hand

None of these come from this exact file, and I ran no more seed batches. Both runs were at damage 1.0.

| Measure | 400 seeds on `3b61c36c` (no Tin, before the bot and gate changes) | 400 seeds on later code (with the Tin, since removed) |
| --- | --- | --- |
| Reached the credits | 400 | 400 |
| Longest stand-still | 45 s | 45 s |
| Left the map | never | never |
| Deaths in a run | 0 to 6, median 1 | 0 to 6, median 2 |
| Within 3 deaths a chapter | 396 | 394 |
| Over the limit | 4 seeds (three at 4, one at 5) | 6 seeds (all at 4) |
| Chapter ends meeting my balance rules | 1199 of 1200 | 1200 of 1200 |

On the final file itself, the bot has only played the four seeds in the test command.

## Not done on this file

- **Screens:** I didn't capture them again; they were last viewed on `3b61c36c`. Since then only About's text, the bot, the gate's exit and the Tin changed.
- **Hub and coverage:** I didn't repeat the 5 hub runs or the coverage run. The test command ran the hub once, and it passed.
- **Human play:** no human has played the game, so balance is yours to judge with the dev sliders.
- **Stand-ins:** the pad, phone and second players are simulated, as TASK.md provides.

## Source Information
- **Date:** 2026-11-05 16:20:45
- **Source:** Resident Evil 4
- **Plan:** PLAN.md
- **Genre:** Third-person action-horror shooter with crowd control, resource management and an escort
- **Perspective:** Over-the-shoulder third person with a laser sight; letterboxed cinematic cutscenes and QTEs; one on-rails shooting finale
- **Tech:** Pixel Engine 0.46.0 (riftlight kit: three.js r186 WebGPU, Rapier), JavaScript modules bundled by esbuild 0.28.2 into one HTML file
- **Art Direction:** The engine's native pixel pipeline at 480x270 with the 16-colour palette and toon materials, a soft vignette, puppets on the hero rig, new models for characters, props and weapons, library models for generic props
- **Animation:** The engine's clip system (compileClips, gaitClip, ClipDef data) on one AnimationMixer per character, masked upper and lower layers, new authored clips, SpringChain tails, Squash, ragdolls
- **Audio:** All code: about 100 synthesised SoundDef effects, 10 original Song compositions on the engine sequencer, Animalese-style gibberish voices per speaker. Music at 10% by default
- **Online:** AI Hub Session Protocol v1 shared-world co-op (Night Shift, 1-4 players); on its own: BroadcastChannel parties on one computer and WebRTC invite codes between two
- **Testing:** Headless Node suites, scripted whole-game playthroughs by a bot on several seeds, V8 coverage across Node and the browser, browser tests with Playwright (gamepad stub, phone profile, audio levels, hub harness), screenshots for moods and layouts. No subagents to review
- **Research:** The plan, the kit docs and the hub README; no other research
- **Environment:** Claude Code CLI (headless); Linux
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** added on import

## Testing Feedback
- **How many issues did testing catch?** About 120 real defects, by my own count from my notes rather than a tracker. Most came from scripts playing the game; about 15 came from looking at screenshots, including several the scripts had passed, such as Max slowly tipping over while holding aim; about 65 came at the end, from reading the plan against the code, from a coverage run that listed every function no test had reached, and from playing the whole game on hundreds of seeds and reading the runs that went wrong. Many of those last ones were faults in the bot rather than the game.
- **How many were critical or game breaking?** About 23. The worst: touching any enemy froze Max completely, so she could not even walk away. It sat in the game until the very end, because the deaths it caused looked like plain difficulty. Also the final boss running at twice her written pace, because she was stepped twice a frame; a cannery door that soft-locked after a checkpoint, checkpoints that leaked later progress, a nave checkpoint that made the flood unbeatable, Esc and Tab opening and closing a screen in one frame, a crypt hiding place that could never be left, a boss hatch that waited for ever once every gun was empty, a boss that could sag facing a wall with its hatch locks out of reach, a Net-Wife whose harmless hits cancelled every reload, a yard gate left open and a causeway with no edge, so Max could walk out of the map, a shut gate that ended chapter 1 for anyone who walked up to it, and the same gate, once open, ending it for anyone who walked past along the wall, a dodge roll that could carry Max through a rack into a walled-off pen, a gap between two props that held her fast, dying after the crypt replaying the whole crypt, three crashes (attract mode, enemies aiming at the Dame, an enemy in mid-swing as Max reached a dry room), and on a phone held upright a cut-off required message and no way back out of Settings.
- **Most helpful test?** The whole-game bot playthrough: Standard difficulty, no cheats, from the first quay to the credits. It prints ammo, money and deaths per area, and reading single runs that went wrong is what found the soft-locks and the boss bugs. Last full measure, on 400 seeds with damage at its plain 1.0, on code that still had one extra help item since removed: every seed reached the credits, the longest stand-still was 45 s against the plan limit of 60, with 0 to 6 deaths, usually 2; 394 stayed inside the plan limit of 3 deaths a chapter and 6 reached 4; all 1200 chapter ends met my own balance rules. The final file itself has only been played by the bot on the four seeds in the test command. The owner ended the build and took the death limit and the balance rules out of the requirements: balance is for human players to judge with the dev sliders. No human has played the game.
- **Least helpful test?** As a target, the count of seeds over the death limit. Reading the runs behind it found real bugs, but once those ran out the count moved between 2 and 6 of 400 by chance, and I spent hours chasing it. Of the checks that ran every time, the one for a browser without WebGPU: it passed the first time and never failed again.

## Engine Feedback
- **What did you like most about the engine?** The same game runs headless in Node, deterministically, with no browser, and models and clips are plain data. That made a whole-game bot test cheap: about a minute of real time.
- **Did you get stuck or guess wrong?** Yes, several times. renderSheet expects hero mesh names, so it failed on my puppets. Ragdoll bodies block the character controller until they are tagged and disabled. loadGame does not finish in manual mode in a page, so tests leave manual mode for transitions. I changed a flag on glowMaterial before reading that it is shared per colour. And the render camera is ctx.camera.camera, not engine.camera. The costly one: CharacterController stops moving altogether, in every direction, once a kinematic body touches it, and takes no filter, so every enemy that touched Max glued her to the spot. I found it very late and wrapped its query to ignore them. A headless run also only repeats at the same step size: stepping 6 frames at a time and 30 at a time played different games on one seed, and I did not find out why.
- **Most important thing you built yourself?** The Area layer on top of the engine: text maps into levels, a beat language with checkpoint resume, and crowd AI on one Intent layer that humans, the bot and network players all fill. Everything else stands on it.
- **Hardest part about using the engine?** There is no over-the-shoulder rig and no masked upper and lower body animation, and this genre lives on both, so I replaced the rig step and built the channels myself. NavGrid also holds one flow target at a time, so anything chasing a different target has to recompute it.
- **What did you change in the engine, and why?** none
- **One thing you would change about the engine?** Built-in masked animation layers, with a shoulder camera as a stock rig beside the existing ones. And a filter option on CharacterController, or a note in the docs on what a touching kinematic body does to it.

## Prompt Feedback
- **What did you like most about this prompt?** The plan was specific and had a voice: a whole world, a script, real numbers and a tone to hit. And the section on this computer said exactly what to use in place of a pad, a phone and a second player.
- **What was confusing?** TASK.md still asks me to pick the genre and perspective, while PLAN.md had already decided them. I followed the plan. The plan also sets a limit of 3 deaths a chapter for a bot, which measures the bot as much as the game, and it does not say whether that means one run or every run. The completion check read it as every run, which no finite test can show, and I kept tuning against it when I should have said so sooner. The owner settled it by ending the build.
- **Hardest thing to do?** Balance without a human. Every system worked long before the game was fair, and a bot only tells you what kills a bot. I can show the game can be finished. I can not say how it feels to play. The other hard thing was knowing when to stop: the same measure that found the worst bugs went on asking for more after they were gone.
- **What would you change in this prompt?** Name what to cut first if a run gets long, give balance targets for a kind of player, not only for a script, and say when a balance number is something to report and when it is a condition for being done.

## Files

About and `exit-interview.json` are built from the same source, and `PROGRESS.md` has a section on how the build ended. Temp files are removed, none of my processes are running, and nothing is committed.

Everything is in `work/`:
- `RegrettableEvil4-ResidentEvil4-claude-opus-5-5-xhigh-20261105-162045.html`: the game, a single file
- `RegrettableEvil4-ResidentEvil4-claude-opus-5-5-xhigh-20261105-162045/`: the dev folder
- `exit-interview.json`
- `PROGRESS.md`