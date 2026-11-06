# Wobble Minutes

Five days at Tippy Cay. One verb: lean. The stay, the menus and every event live in the sim (`engine/crates/pav_core/src/games/fit/`). The window only draws that state and sends input back.

Run the tests from this folder:

```sh
tests/run.sh core
```

Pack the single page (writes the HTML into the work folder):

```sh
tools/build.sh
```

## Add an event

1. Add a variant to `EventId` in `events.rs`, plus its key, title and blurb. `ALL` is the list the schedule, the lint and direct scene `fit/event/<key>` use.
2. Put its duration and the one number you tune in `rules.toml`. Reset copies that file.
3. Teach `Activity` to play it in `events.rs`, including the bot's lean. Stars are 400 / 650 / 850, except the plank, which uses its time gates.
4. Add a card line in `script.toml`. Mention it on the day that opens it, in the day table in `mod.rs`.
5. `tests/run.sh core` plays it with the bot on five seeds and with idle input.

## Add a set

The island is one room, `hub.toml`, placed by `build()`. A new mat is another cluster of props in that file (or a second room whose origin sits 200 m away, the way `RoomDef` placement already works). Give the zone a water colour if it is a pool. Do not put the set in `engine/rooms/`: that folder feeds the pavilion demo. `pav capture scene=fit` shows the result.

## Add a song

Beds live in the mixer in `pav_audio`: a root frequency and a tempo per song id. `FitGame::desired_song` picks the id (0 is silence, used by the attract and before the first real input). Default music gain is 0.10. Add the bed, map the flow or the event to the new id, and keep the audio test green: every bed is non-silent, and 0.10 is a tenth of full scale.
