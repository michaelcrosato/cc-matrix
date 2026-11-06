# Jam Cry progress

Original first-person contract shooter on the shardfall engine. The playable page is `Jam Cry-Far Cry 2-grok-4.7-xhigh-20261105-013503.html` in this folder. The dev folder of the same name holds the engine, the hub client, and `tests/run.sh`.

- Title chosen from 50 riffs plus a real RNG. Notes are in the dev folder `notes/title.md`. Feedback notes are in `notes/feedback.md`.
- The `merc` scene is a headless country sim. While a contract is playing, the rendered eye follows the body and the stance, and the rifle, rag, map, GPS, and glass are props in that view. Look, hits, jams, fever, wind-driven fire, vehicles, companions, the contract list, and three endings are covered by `cargo test -p pav_core --test merc` (19 tests). The seeded bot walks, shoots, and drives. It boards the technical with the use key, lights the tank farm with a shot, and takes the companion's offer on the ground. The union of those runs sets every coverage flag. The ledger is the burn, read, or chair choice. Dev teleport, spawn, world, and noclip change the world.
- Menus are a 10-foot shell on the page. Music and voices are synthesized. The hub depot round uses the unmodified session client as the first script.
- `tests/run.sh all` runs the sim, audio, browser, and hub checks and prints one failure count. The finished run printed `PASS 48 FAIL 0`.

## Deviations

- Fire advances from the downwind tips and the calm extremes, not a full neighbor flood.
- The country is a local height field seen from the player eye, not a streamed terrain mesh. Menus keep the dressed overlook.
- The 10-foot menus are the page shell, not an egui panel.
