# Pressure Buns: source research

Researched on 2026-11-05 before implementation. This is an original adaptation of **Pressure Cooker**, Activision, Atari 2600, 1983, designed by Garry Kitchen.

## Rules and pacing

Primary source: [Activision's original manual, preserved by AtariAge](https://www.atariage.com/manual_html_page.php?SoftwareLabelID=375).

The player moves Short-Order Sam around an automated burger kitchen. Patties and lower buns travel along a conveyor. A dispenser launches tomato, onion, lettuce and cheese out of order. The player catches useful toppings and touches a moving burger to place each one. Holding the action button rejects unwanted ingredients. Correct toppings make the dispenser provide a top bun. Completed burgers go to a separate wrapping room and must enter the chute matching their order color. Up to three orders are displayed at once. Duplicates, missed ingredients, incorrect chutes and burgers falling from the belt reduce performance; zero performance ends the game. Higher selectable variations shorten order time. The manual describes continuous or between-wave music and alternating two-player modes. There are no combat enemies described: the belt, ingredient traffic and mistakes create the opposition. Its writing is cheerful, brisk, food-themed instruction.

Secondary confirmation: [AtariProtos overview and screenshots](https://www.atariprotos.com/2600/software/pressurecooker/pressurecooker.htm) describes early one-topping orders developing into orders with as many as four toppings. The source uses repeating waves and increasing workload rather than geographic levels or bosses.

## Visual references

Viewed these actual screenshots; reference copies are in `research/` only and are not shipped as game art:

- [Assembly room](https://www.atariprotos.com/2600/software/pressurecooker/pressurecooker_3.png): purple-blue kitchen, gray vertical belt at left, ingredient dispenser at right, tiny white chef hat and yellow-green trousers, large score/performance numerals, ingredient checklist at bottom.
- [Completed burger carried by chef](https://www.atariprotos.com/2600/software/pressurecooker/pressurecooker_4.png): the same simple full-room fixed view, with a conspicuously oversized stack.
- [Wrapping room](https://www.atariprotos.com/2600/software/pressurecooker/pressurecooker_5.png): three separated dark chute openings with colored directional markers.

Adaptation decisions: retain immediate silhouettes, airborne food, a clearly separate conveyor and color-coded wrapping positions, while using an original warm cel-shaded diner, thick ink outlines, readable food geometry and a fixed elevated orthographic camera. No source artwork is reused in the game.

## Sound

Primary creator account: [Garry Kitchen, “How I Fixed Atari's Awful Music”](https://garrykitchen.medium.com/how-i-fixed-ataris-awful-music-2d21abd7930d), 2020-11-09. Kitchen discusses the Atari TIA's restricted musical notes; the indexed passage describes wanting a catchy jingle to support conveyor-belt frenzy. The visible article is paywalled after its introduction. Exact source melody, note sequence and complete effect inventory: **unknown**. The original manual directly confirms that players can select continuous music or music between waves.

Adaptation decision: compose an original code-generated upbeat diner jingle with bass, melody, percussion, short food/action effects, and synthesized gibberish chef voices. No source melody or recorded audio is copied. Default music volume is 10%.

## AI Hub integration research

Implementation follows [AI Hub Session Protocol v1, client 1.4.0](https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md), retrieved using `gh api`. `hub-session.js` is the unmodified upstream client and must appear as the first script immediately after the head's charset declaration. `bridge.js`, `round.js` and `harness.html` are unmodified upstream test tools.

The game declares `shared-world`: host owns simulation, guests send only their inputs, host distributes snapshots. It calls `connect` and `ready` without a key press, bypasses its standalone title in a session, starts on the hub clock, reports team results through `finish`, and stops input, messaging and audio on `end`. Dedicated server hosting has no local player. Sessions use the hub's transport only: standalone PeerJS and BroadcastChannel paths never start while `AIHub.active` is true. No chat, custom names or emotes are provided.

The client permits 20 outgoing messages per second and JSON payloads up to 16 KB; this game budgets 10Hz host snapshots and 10Hz guest input. Its normal standalone co-op is one or two players. Local same-origin pages use BroadcastChannel; Internet room codes use PeerJS 1.5.5 and its public signaling service. Internet signaling/NAT success on arbitrary networks is **unknown**.

## Harness timing and testing plan

The unmodified harness allows 11 seconds for every copy to say hello, then 20 seconds for key-free readiness. It releases the card, waits up to 15 seconds for start, and uses a three-second shared countdown. Normal play automation lasts approximately six seconds, with synthetic movement inputs. It checks traffic both ways, calls time-up and allows five seconds plus two seconds for a valid team result. A dedicated-server scenario adds a playerless host. A host-leave scenario expects a voided round. Completion is `window.__hubCheck.done`, success is `window.__hubCheck.pass`; the body sets `data-complete=true`.

Serve the workspace at `127.0.0.1` on an OS-selected port because the harness must fetch the game's metadata and reach its frames on the same origin. Test ordinary two-player co-op, delayed/lossy traffic, host leaving, and a dedicated server. The README's four-player stress example exceeds this game's declared two-player standalone roster; test only declared player counts unless the roster is expanded. Standalone `file://` loading is tested separately. One browser process is enough for all checks and is closed afterward.
