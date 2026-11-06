# Mechanic and stage coverage

| Mechanic | Playable location | Verification |
|---|---|---|
| Twelve moving foods / acceleration / interception | All six, remix, custom | Legal-intent solo/co-op campaigns; movement and food invariants |
| Follower, interceptor, keeper and power chain | All six | Predator state/chain boundary checks; normal campaigns |
| Explicit paired tunnels | Stages 2, 3, 5, 6 | Seam motion/encounters; graph paths; normal input trace |
| Single opening / quarter-turn pen / safe occupancy | Stages 3–6; optional custom | All-state graph validation; occupied-gate deferral and shortcut measurement |
| Invisible walls, collision echo, reveal chirp | Stages 4 and 6; remix/custom options | Cooldown/reveal checks; targeted visual inspection |
| Seed reproducibility / fallback | Stage 5, Remix | Bounded seed sample, equality and connectedness checks |
| Five lives, respawn, clear restore, last-bite grace | Every run | Swept contact and lifecycle boundary checks |
| Six-stage finale and retry | Campaign | Whole-campaign legal intents, browser results/retry |
| Shared simultaneous play | Couch duo and AI Hub | Two-seat legal trace; official harness including dedicated host; real-state packet repair |
| Workshop edit/save/load/code/play/return | Maze workshop | Roundtrip and invalid-code rejection checks |
| Attract, live dev sliders, all settings/credits | Title at ten seconds; Pause | Browser input/device, idle isolation, tuning/reset checks |
| Procedural score / SFX / gibberish | All gameplay | Web Audio/offline signal tests; defaults/mute/end checks |
