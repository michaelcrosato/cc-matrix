**Trauma Central: Second Stitch** is finished and playable, and everything in PLAN.md that can be done on this computer is done. The final test run passed all 2,597 checks. That run included the 5 AI Hub harness scenarios and a bot playing every operation through to its results screen.

After that run I changed only the feedback text and rebuilt. I then re-ran the content checks on that final build and confirmed the deliverable boots from `file://` with no errors.

It covers:
- 10 story operations and 11 story scenes
- Consult co-op, on one TV or through AI Hub
- attract mode and Dev Mode

**What still needs a person or real hardware:**
- **No person has played it.** Balance comes from bot runs at skill 0, 0.4, 0.7 and 1.0, which meet the plan's targets. Real difficulty and the plan's 80-minute length are unmeasured, and bosses may be harder for people than for the bot.
- **Stand-ins only:** the controller was a stub, phones were browser profiles, and sound was checked by level meters. I also only saw it at 3–6 fps on software rendering, so feel at 60 fps is untested.

**Differences from the plan:**
- I left out the `RenderView` monitor and `Mirror`, the first items on the plan's cut list.
- Tears are plain sim data rather than `BulletPool`, so the rewind can restore them.
- I corrected the plan's hand pose, which had the instrument and forearm on opposite sides.

Nothing is committed to git. I removed `node_modules`, so run `npm install playwright@1.63.0` in the dev folder before re-running browser tests.

## Source Information
- **Date:** 2026-11-05 08:20:30
- **Source:** Trauma Center: Second Opinion
- **Plan:** PLAN.md
- **Genre and Perspective:** Surgical action with visual-novel medical drama. First-person surgeon's-eye fixed close-up on a 3D operating field; talking-head close-ups and 3/4 room shots in story scenes.
- **Tech:** Pixel Engine 0.46.0 (riftlight engine kit, WebGPU, three.js r186 and Rapier inside it); plain JavaScript modules bundled with esbuild into one HTML file; AI Hub session client 1.4.0; tests in Node and Playwright 1.63.0.
- **Art Direction:** The engine's native low-poly 3D rendered as pixel art, outlines on tools and creatures, none on tissue; a hand-built tissue canvas per arena; new models for instruments, hands, strains, busts, figures and sets; Kenney furniture recoloured for generic props.
- **Animation:** The engine's system: `HERO_CLIPS` on custom rigs through `compileClips` and a three.js mixer for figures, plus `SpringChain`, `Squash`, `LegStepper` and `twoBoneIK` for strains; pivot-based bust faces with emotion poses and mouths on syllables; procedural tool motion.
- **Audio:** All in code: original chiptune songs as engine `Song` data with a bar-line music director, `SoundDef` sound effects, and Animalese-style gibberish voices from formant-synthesised syllables. Music is 10% by default.
- **Online:** AI Hub Session Protocol v1 in shared-world mode, 1 to 4 seats, host-authoritative with snapshots; couch co-op on one TV with no network outside a session.
- **Testing:** Headless tools allowed: one command (`node tests/run.mjs`) printing failures and a count; Node sim tests, a scripted whole-game bot playthrough, content lint, Playwright browser tests from `file://`, the hub harness, a balance report, and screenshots only for what scripts can't judge. No subagents or workflows used to review.
- **Research:** This plan's planner read the source's Wikipedia page, the hub's protocol and the engine kit, and ran engine spikes. During the build I read the kit's GUIDE, ASSETS, parts of API and CHANGELOG, and the hub README and harness.
- **Environment:** Claude Code CLI (headless); Linux
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** added on import

## Testing Feedback
- **How many issues did testing catch?** About 30:
  - Sim and bot runs found 6, such as Op 4 fragments that never surfaced and shared bot memory breaking determinism.
  - Browser tests found 2: a model palette crash at boot and menu presses lost at low frame rates.
  - Content lint found 1.
  - Screenshots found about 21, such as a mirrored hand pose, unreadable banners and caps hidden by hair.
- **How many would be considered critical / game breaking?** Two: Op 4 could not be finished because hidden fragments never surfaced, and the title screen crashed at boot on a bad palette re-bind.
- **Most helpful test:** The whole-game bot runs, with every op at several skills on several seeds. They found the stuck stages and made balance measurable. No human has played it, so human difficulty is unmeasured.
- **Least helpful test:** A first Web Audio check that only proved my own test oscillator worked. I replaced it with an analyser on the real output during a voice line.

## Engine Feedback
- **Liked most:** The HUD plus looks: a real pixel picture for almost no code, crisp text at every resolution. The `Song` and `SoundDef` data formats made all-code audio pleasant.
- **Stuck or guessed wrong?** Yes. `buildModel` throws when a build re-binds a palette slot the model lacks, which I learned on the title screen. Polling `isDown` lost short key presses at low frame rates, so menus read `wasPressed` too. `HERO_CLIPS` on a custom rig worked first time.
- **Most important thing built myself:** The tissue canvas: a per-arena painted base plus a per-frame repaint from sim state on a displaced plane. It is the look of the game and the engine has nothing like it.
- **Hardest part:** Reading each pad separately with analog triggers: the engine merges pads and has no triggers, so I polled every pad myself and stopped them pressing keys. Software WebGPU at 3 to 6 fps also made browser tests slow to trust.
- **Changed in the engine:** none
- **One thing to change:** A first-party way to read each pad separately with analog triggers, because a controller-first game needs it and everyone otherwise writes it themselves.

## Prompt Feedback
- **Liked most:** The plan was specific where it mattered and marked what it had verified, so I could trust numbers like the camera, the look and the build recipe instead of rediscovering them.
- **Confusing:** The plan's verified hand pose had the instrument and the forearm on opposite sides, which took a screenshot to catch. I also had to guess whether GameTitle in the file name means the subtitle too; I included it.
- **Hardest thing:** Keeping the bosses honest for the bot, the rewind and the network at once, because every strain has to be plain data with many jobs. Judging feel without playing it at real speed was the other.
- **Would change:** State a target play length per op measured against a person, not a bot, since a bot can't say how long a person will take. My first-run time is untested against the plan's 80 minutes.

## Files are in `work/`
- `TraumaCentralSecondStitch-TraumaCenterSecondOpinion-claude-opus-5-5-xhigh-20261105-082030.html`: the game; open this one
- `exit-interview.json`
- `TraumaCentralSecondStitch-TraumaCenterSecondOpinion-claude-opus-5-5-xhigh-20261105-082030/`: dev files; `docs/AUTHORING.md` explains how to add content
- `PROGRESS.md`