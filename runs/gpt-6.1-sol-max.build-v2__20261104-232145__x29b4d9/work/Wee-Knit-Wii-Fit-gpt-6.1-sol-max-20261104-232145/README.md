# Wee Knit

Open the HTML in the parent folder directly. Everything is embedded; it works offline. A controller or keyboard is required. Touch devices show Settings and an automatic demonstration.

A five-day wooden-toy retreat with fourteen activities, daily Check-Ins, imaginary Wobble Ages, a physical marble jar, unlockable hats, a walking island, an ending and continuing Maintenance days. Every class shares a Rapier balance core. Falls become floor exercises.

- Controller: left stick leans or walks; L2/R2 are feet; Cross hops/banks or confirms; Square flails; R1 breathes; Triangle opens today's plan; Options pauses. The right stick orbits on the island.
- Keyboard: WASD/arrows move the asking ring, which stays where you leave it; C recentres. Q/E are feet, Space hops/banks, F flails, Shift breathes, Enter confirms, T opens the plan, Esc pauses. Walking uses direct keys.
- Mouse: pointer position leans; left/right buttons are feet; both hop/bank; middle flails. On the island, click a landmark to walk there; right drag orbits and the wheel zooms.

Programme progress never requires a medal. Going to bed ends the day. Free Play offers unlocked classes and medal-based difficulty tiers. Group Class supports four local seats and three-class playlists. AI Hub sessions use the released 1.4.0 client and a synchronized three-class ghost round.

Pause → Dev Mode offers event/day/step jumps, live tuning, resets, forced falls/props/gusts, time scale, single steps, a bot, stats/input, physics lines, a free camera, rewards, palettes and JSON tuning export. Settings include sound, PlayStation/Xbox glyphs, auto-breathing, rhythm offset, ink and difficulty.

## Development

`npm install` installs the pinned dependencies. `npm run build` emits `game.html` here and the named deliverable in the parent folder, embedding the parent `exit-interview.json` into About/Credits. Data for events, days, charts, poses, dialogue, names, unlocks and live tuning lives in `src/data/`.

`node tools/test.mjs full` runs the whole-programme playthrough, every event/tier, balance simulations, inputs, offline audio, save/UI checks, WebGPU/WebKit, the viewport matrix, art snapshots and the real AI Hub harness. It prints failures and one result count. Specific groups can be selected. Browsers run serially; the hub server binds an OS-selected loopback port and closes itself.

`?test=1&render=0&manual=1` exposes deterministic test hooks without a renderer. Without these parameters the game runs normally. Test artifacts and the issue log are in `notes/`; inspected art and viewport captures are in `shots/`.

Third-party notices are embedded in the single HTML: Three.js (MIT), Rapier (Apache-2.0), Fredoka (SIL OFL). Models, text, music, effects and gibberish voices are generated in code. No images or audio recordings are downloaded.
