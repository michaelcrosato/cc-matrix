# Raiders of the Lost Hieroglyph

An original four-chapter pulp adventure inspired by Atari's 1982 Raiders of the Lost Ark. Explore a bazaar, decode the sun map, cross Needle Mesa with your whip, then charm the vault's snakes and escape with the casket.

The deliverable is the single `.html` beside this folder. Open it directly in a WebGPU-capable browser or serve it from localhost/HTTPS. Three.js r180 and Rapier 0.19.3 load from pinned CDN URLs. Optional Google Fonts have local fallbacks. No image or audio files are required.

## Play

- Keyboard: WASD/arrows move, mouse aims, left click whips, E interacts, Space dodges, Q plays flute, Tab opens field notes, Esc pauses.
- Standard pad: left stick moves, right stick aims, Square/X whips, Cross/A dodges, Triangle/Y interacts, Circle/B plays flute, L1/LB opens notes, Options pauses. Settings switches PlayStation/Xbox glyphs.
- Touch: invisible drag stick, assisted whip/flute, context action button, second finger dodges.
- Co-op: second controller joins locally, or use Bring a partner to host/join a six-character room. AI Hub starts and ends its shared-world sessions automatically.

Pause → Developer field kit contains live balance sliders, default reset, heal/stock, invulnerability and chapter jumps. Chapter entrances save a solo checkpoint. Title inactivity starts the looping attract expedition after ten seconds; any input exits.

## Build and verify

From this folder:

```
node build.mjs
npm --silent test
```

The test command chooses its own loopback port, checks the served game identity, closes its own browsers/server, prints only failures and one final count, and writes `test-results.json`. It covers default-balance end-to-end progression, native animation/physics, menu focus, live settings, developer tools, attract timing/looping, controller, touch assistance, offline audio, file URL deployment, standalone cooperative input/interactions, and the official AI Hub harness with dedicated hosting and impaired network conditions.

`npm --silent test -- --quick` runs the targeted offline gameplay/control subset during development. All normal checks remain under the one test command. `visual-qa/` holds artwork/framing captures using Three.js's WebGL fallback because headless software WebGPU screenshots may be blank. WebGPU operation is checked directly by the normal suite.

`exit-interview.json` beside the deliverable contains the catalogue record and feedback. The same source information and feedback are embedded in About / Credits. Usage is `added on import`.

Research: [Atari's original 1982 instruction manual](https://www.atariage.com/2600/manuals_old/raiders_of_the_lost_ark.html), [AI Hub integration](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), [Three.js documentation](https://threejs.org/docs/), [Rapier documentation](https://rapier.rs/docs/user_guides/javascript/getting_started_js/). The original game's abstract overhead rooms, inventory chain, marketplace, snake-charming flute, grappling, parachute and excavation informed this original expedition. [Reverse-engineering notes](https://github.com/halkuncode/Raiders2600) also document its abstract room rendering, two-channel TIA effects, title march and snake-charmer melody; this game uses a new original score.

All character/environment meshes are modeled in code, character poses use native Three.js AnimationMixers, and music/effects/gibberish voices are synthesized with Web Audio. The title was drawn with `node:crypto.randomInt` from 50 silently brainstormed candidates; `title-selection.json` records the result.
