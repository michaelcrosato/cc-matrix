# Issues testing caught (23)

| # | Caught by | Issue | Fix | Critical |
|---|---|---|---|---|
| 1 | lint | Floor 1 decor grate `d1` faced open floor at (3,7) S | moved to (3,8) S | |
| 2 | lint | Floor 3 eye relief `e3` faced open floor at (15,3) W | moved to (15,2) W | |
| 3 | playthrough | The bot's `place` step never finished at the riddle alcove (the alcove hands the key back) | the step ends once used | |
| 4 | playthrough over 20 seeds | The party wiped at the Bolt-Holder in 8 of 20 seeds | Cage Slam 2d8 -> 2d6, phase intervals 3.0 / 2.5 s; the bot rotates a fallen front row, wards it and drinks earlier; now all 20 seeds win | yes |
| 5 | playthrough | The boss step hit the bot's 90 s step timeout | boss step allowed 420 s | |
| 6 | camp suite | With Level up "On rest", a waiting level was lost when a rest ended early (everyone full) | any finished rest applies it | |
| 7 | browser suite | A key tapped and released within one frame did not step or turn the party | Controls read pressed as well as held | yes |
| 8 | browser suite | Keys bound to no action did not end the attract mode or reset the idle timer | any keydown counts as input | |
| 9 | screenshot run | Entering play with null scene data crashed (`d.newGame` of null) | `d = d || {}` | yes |
| 10 | screenshot run | The Rat Run's clock and monsters ran during the 3-2-1 countdown | the world waits until GO | |
| 11 | screenshots | Characters the pixel font lacks ("…", "·", "—") drew as "?" | replaced with ones it has | |
| 12 | screenshots | The log covered the FRONT / MID / BACK row labels | the log moved up | |
| 13 | screenshots | Parchment (map, journal, reader) came out dark through the gradient box | a flat parchment painter | |
| 14 | screenshots | Context prompts were drawn under the dialogue's prompts; the Party screen's name line overlapped its slots | prompts hidden during talk; name moved to the stats panel | |
| 15 | screenshots | The title's camera sat inside the party; the ending's square was framed too close | party and cameras moved | |
| 16 | screenshots | The Eye's light blinded the view up close; the cutscene skip label sat under the corner buttons | light dimmed; label moved left | |
| 17 | AI Hub harness | Enter (Ready) pressed while the 3D still loaded was lost, so the card never answered | a keydown listener answers Ready from the first moment | yes |
| 18 | AI Hub harness | WebGPU errors in the harness's frames under SwiftShader | the harness loads the game with `?backend=webgl` (a test-environment limit) | |
| 19 | engine checker | "world.light(): every light made with the world is in use" | floors made with 11 light slots | |
| 20 | task suite (TASK.md, read line by line) | A key pressed in the attract mode's first 0.3 s was ignored (a guard against pointer jitter) | the guard covers only pointer movement; any key, button or tap exits from the first frame | |
| 21 | art suite (pen bodies drawn into a recorder) | The leech, the rat knot and the gazer looked the same walking as standing, the rat knot and the gazer the same striking, and the spider stood dead still when idle | the leech's wriggle grows as it crawls, the rat knot hops as it rolls and lunges to bite, the gazer leans into its flight with its tendrils streaming and recoils from its own ray, the spider's abdomen breathes and its fangs twitch | |
| 22 | art suite (item looks compared) | The Scroll of Raising and the Scroll of Find Seams looked exactly alike (same model, colour and icon) | Raising is a deeper gold | |
| 23 | art suite (every THING drawn), then a lint for empty function bodies | An empty `ceilingHole` drawing used by nothing; the lint then found empty `update`/`draw` on the start scene (a router that goes straight on), an empty `open` on the Dev screen and an empty `if` branch in play | removed (the engine's scene and screen methods are optional); the branch written plainly. The lint allows only the NullView, the do-nothing view for headless runs | |
