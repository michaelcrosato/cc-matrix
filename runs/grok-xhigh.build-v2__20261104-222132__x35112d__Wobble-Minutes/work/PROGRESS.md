# Wobble Minutes

Title drawn as index 34, Wobble Minutes. Engine commit 49ef2ba.

- Sim tests: fit 19 passed, 0 failed, twice (the two runs after View and Save). Audio 3 passed. UI 7 passed. The pointer-drag test on the shardfall binary passed.
- The eight gaps from the rejected build are fixed on the real path: live sliders (pad nudge and a held pointer drag), Dev Mode jump, cheats, time scale and tuning, a free-play schedule that pages every event, island mats, Big Stand silence with the fake skip and the final age cut, the eyes-closed tone, name and outfit pages, beach props, and hand-keyed poses. Wardrobe, calendar, and the View and Save tabs are in.
- Packed HTML is in the work root. The page pastes AI Hub session.js 1.4.0, the ghost tags, and the About block.
- Browser: 6 passed, 0 failed, on that page. Title and Pose Parade captures show the menu, the beach props, and a figure in a raised-arm pose with the balance puck.
- Hub: 6 passed, 0 failed (session.js byte-match, 2 players, 3 and 4 with latency, jitter and loss, host-leave, solo). On a splash round the page calls `AIHub.ready()` when connect resolves, because the fourth software-WebGPU copy was missing the 20s gate.
- `engine/target` is deleted. Source, the dev tree, and the packed page stay.
