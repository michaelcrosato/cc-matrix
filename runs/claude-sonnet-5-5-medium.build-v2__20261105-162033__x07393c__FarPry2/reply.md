The remaining gaps from the last hook are closed, and `node tests/run.mjs --all` ends with 1182 passed, 0 failed. That total covers the static, systems, playthrough, replay, browser, hub and link suites.

- **Flatcar gun:** M8's ride now uses the mounted gun, with heat and overheat. A playthrough check confirms it fires from the moving flatcar.
- **Link:** the test now also runs two real browser windows on `file://`. They find each other, and the guest starts the round from the host's Start.
- **Screens checked by eye:** I looked at the dialogue, surgery, held-map and ending screens, plus the title, play HUD, night fire, Tibor's rack and dev sliders.
- **Bot playthroughs:** both endings still pass, with M4, M5 and M8 now in the story chain.

Looking at the screens found four bugs, now fixed:
1. **People were invisible in the real browser.** My own animation clips produced NaN rotations, so every NPC, soldier and buddy collapsed out of sight. The Node tests could not see this; the Tibor dialogue screenshot did.
2. **People faced away from where they looked.** The model faces +Z and the game's yaw faces -Z, so they all needed a half turn.
3. **The held map was upside down.** North was at the bottom and its margin (clock, wind, Harrow's notes) was off screen. I flipped it and raised it, and the map-hands now sit at the bottom edges.
4. **Tibor stood inside his shack.** The dialogue camera looked at a wall, so I moved him to the doorway.

I did not re-look at the surgery screen after the animation fix. Its finger-snap scene still borrows the syrette model as the hand, which is crude.

I also added all four fixes to `tests/ISSUES.md`.

The game is `FarPry2-FarCry2-claude-sonnet-5-5-medium-20261105-162033.html` in the work folder, with `exit-interview.json` beside it. The Source Information and the Testing, Engine and Prompt Feedback in my earlier replies still stand.