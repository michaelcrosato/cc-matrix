# TASK.md, item by item, and the checks that show it

`node tests/run.mjs --all` reads this file: every check named below (`suite › name`, or `suite › prefix*` for every check
starting with it) must have passed in that same run, or the run fails with `FAIL requirements › ...`. Every result of the
run is in `tests/last-run.txt`, with the sha256 of the bundle and of exit-interview.json it tested. Items a script
cannot judge (does it feel like the source?) are marked *screenshots*: the `shots/` folder holds the frames looked at.

## Package and working environment
A single HTML file in the root, named as TASK.md says; dev files in the dev folder; the engine handoff as the base.
- `build › meta charset first`
- `build › engine before game`
- `build › no fetch / network URLs in the game`
- `browser › 1920x1080: plays with no errors`
- `browser › 1280x720: plays with no errors`
- `browser › 2560x1080: plays with no errors`
- `browser › 1024x768: plays with no errors`
- `e2e › e2e: the page is our game`

## Done: no TODOs, placeholders or stubbed features
- `build › no TODO / FIXME / placeholder / stub in the source`
- `ui › no errors`
- `e2e › e2e: no errors on the desktop page`
- `playthrough › ...with no errors`

## A feature-complete demo, long enough to show every mechanic (a scripted playthrough of the whole game)
- `playthrough › the whole game through its screens: title to the ending`
- `playthrough › ...the initials go on the high-score table and the game returns to the menu`
- `playthrough › expert bot clears stage*`
- `playthrough › the fair bot clears stage*`
- `playthrough › the showoff bot plays the whole ARCADE to the ending`
- `playthrough › every stage intro and outro played`
- `playthrough › the Training range completes`
- `cover › *`
- `weapons › *`
- `player › *`
- `timer › *`
- `scoring › *`
- `enemies › *`
- `threats › *`
- `projectiles › *`
- `objects › *`
- `bosses › *`
- `content › validators: every id resolves`
- `ui › all six intel bottles are placed`
- `ui › the first ARCADE start offers Training`

## The plan's set pieces (TASK.md wins where they differ; here they agree)
- `lighthouse › 2-4: the players climb the stair mid-fight`
- `lighthouse › 2-4: two deckhands on the stair above the landing`
- `lighthouse › 2-4: the players shoot upward at them (pitch over 20 degrees), in plain sight`
- `lighthouse › 2-B: the ride climbs the rest of the stair, round the tower, to the gallery`
- `lighthouse › 3-B phase 1: Scylla fights on the helipad`
- `lighthouse › 3-B phase 1: the players stand behind the roof parapet, and duck below it`
- `lighthouse › 3-B phase 2: Krake fights in the control room, among the consoles`
- `lighthouse › 3-B phase 2: the players are in the control room, ducking behind consoles`
- `lighthouse › 3-B: the FINAL SHOT comes, and lands`

## Narrative tone, characters and story
- `story › cutscene*`
- `story › stage 1 briefing`
- `story › stage 2 briefing`
- `story › stage 3 briefing`
- `story › an arcade run opens on the stage intro`

## Audio: music, sound effects and gibberish voices, all in code
- `audio › song*`
- `audio › sfx*`
- `audio › stage 1 song`
- `audio › voice syllables`
- `audio › voice headless returns a duration`
- `e2e › e2e audio: the sound engine runs (Web Audio)`
- `e2e › e2e audio: the menu theme plays, synthesized on the music bus`
- `e2e › e2e audio: a voice line sounds on the sfx bus (louder than the quiet before it)`
- `e2e › e2e audio: the voice is synthesized syllable by syllable*`
- `e2e › e2e audio: a shot is heard`
- `e2e › e2e audio: no audio files*`
- `e2e › e2e audio: no speech engine (speechSynthesis never used)`
- `e2e › e2e audio: no errors`
- `story › voice durations positive`

## Art direction and animation (the engine's style and rigs as the base)
*Screenshots* (shots/), plus the renderer and rig checks:
- `raster › *`
- `math3d › *`
- `e2e › e2e: stage *`

## Performance: as much detail, enemies, effects, lights and shadows as the scene needs
- `e2e › e2e: stage *`
- `e2e › e2e: Enter toggles the perf overlay`

## Dev mode from the pause menu: standard tools, live sliders, reset to defaults
- `dev › slider*`
- `dev › toggle*`
- `dev › reset restores every default`
- `dev › dev: *`
- `ui › dev mode opens from the pause menu item`
- `ui › the sim is frozen while dev mode is open`
- `e2e › e2e: Escape pauses`
- `e2e › e2e: the pause menu has Dev mode, reached with the arrow keys`
- `e2e › e2e: Dev mode opens from the pause menu`
- `e2e › e2e: the game is frozen while the panel is open`
- `e2e › e2e: Right moves the focused slider (a live value)`
- `e2e › e2e: RESET asks first`
- `e2e › e2e: RESET restores every default`
- `e2e › e2e: E switches tabs (VIEW)`
- `e2e › e2e: ACTIONS tab`
- `e2e › e2e: Kill all`
- `e2e › e2e: Spawn enemy (the type chosen with Right)`
- `e2e › e2e: Bot plays`
- `e2e › e2e: Escape closes the panel and the game runs`
- `e2e › e2e: the bot plays the area`

## Attract mode: after 10 s without input on the title or menu, an AI-played demo that cheats; any input exits
- `attract › 10 s idle on the title -> attract`
- `attract › the demo cheats: god and infinite ammo`
- `attract › the bot plays the demo`
- `attract › the playlist moves on`
- `attract › any input -> title`
- `attract › 10 s idle on the menu -> attract`
- `attract › the watchdog moves a stuck demo on`
- `e2e › e2e: 10 s idle on the title starts the attract mode`
- `e2e › e2e: the attract demo plays itself (a bot shooting, cheating)`
- `e2e › e2e: the demo is drawn`
- `e2e › e2e: any key leaves the attract mode for the title`

## Multiplayer: AI Hub (lib/hub) integration, and the game on its own
- `build › session client is the first script, unmodified`
- `build › hub tags`
- `build › goal <= 60 chars`
- `build › howto <= 80 chars`
- `net › 2p*`
- `net › 4p*`
- `net › a player leaving: their agent is gone everywhere`
- `net › the host leaving: the round ends void on the replicas`
- `hub › the served page is our game`
- `hub › hub harness*`
- `coop › *`
- `determinism › same seed and commands, same hash (two contexts)`

## 10-foot, controller-first UI; keyboard and mouse native; prompts follow the device
- `input › PlayStation glyphs by default: fire R2`
- `input › cover L2`
- `input › Xbox glyphs from Settings: RT`
- `input › keyboard: cover is Space`
- `input › mouse: cover is Right click`
- `input › mouse: next weapon is the wheel`
- `input › prompts follow the device: pad`
- `input › prompts follow the device: keyboard and mouse`
- `input › pointer -> aim is exact`
- `input › aim assist friction near a target`
- `input › the wheel is bindable: Wheel down moves from next weapon to reload`
- `determinism › no hardcoded key names in prompts`
- `browser › a mouse click fires`
- `e2e › e2e: keyboard prompts after a key`
- `e2e › e2e: hovering ABOUT moves the menu focus to it`
- `e2e › e2e: clicking ABOUT opens the About screen`
- `e2e › e2e: the pad d-pad moves the menu (to RECORDS)`
- `e2e › e2e: prompts follow the pad`
- `e2e › e2e: Cross picks RECORDS`
- `e2e › e2e: PlayStation glyphs by default (back is Circle)`
- `e2e › e2e: the Xbox option shows A B X Y (back is B)`
- `e2e › e2e: a key press switches the prompts back to keys`
- `e2e › e2e: Circle goes back to the menu`
- `e2e › e2e: STAGE SELECT focused`
- `e2e › e2e: Escape skips the briefing into play`

## Touch-only devices: no touch controls, "Controller or keyboard required", the settings button, the attract mode runs
- `ui › touch-only devices are told a controller or keyboard is required`
- `e2e › e2e touch: detected as touch-only`
- `e2e › e2e touch: the settings button opens Settings`
- `e2e › e2e touch: a tap on Close shuts it`
- `e2e › e2e touch: the attract mode still runs`
- `e2e › e2e touch: the demo plays under the notice`
- `e2e › e2e touch: no errors`

## The About / Credits screen holds Source Information and the three feedback sections
- `ui › about`
- `ui › Source Information complete`
- `ui › About has a SOURCE INFORMATION page`
- `ui › About has a TESTING FEEDBACK page`
- `ui › About has a ENGINE FEEDBACK page`
- `ui › About has a PROMPT FEEDBACK page`
- `ui › About at *`
- `e2e › e2e: Right pages through all *`
- `e2e › e2e: Left from the first page goes to the last`
- `e2e › e2e pad: d-pad up from ARCADE wraps to ABOUT`
- `e2e › e2e pad: Cross opens About`
- `e2e › e2e pad: R1 pages through all *`
- `e2e › e2e pad: L1 from the first page goes to the last`
- `e2e › e2e pad: the About prompts are PlayStation glyphs`
- `e2e › e2e pad: Circle leaves About for the menu`
- `e2e › e2e: the About pages at this window size hold every exit-interview answer`
- `e2e › e2e: the pages include Source Information and the three feedback sections`

## exit-interview.json: in the root, parses, exactly the shape TASK.md gives, every value filled, the same as the About screen
- `build › exit interview: every source field`
- `build › exit interview: feedback counts`
- `build › exit interview: aiHub`
- `browser › the bundle's own exit interview is exit-interview.json, field for field`
- `e2e › e2e: the About pages at this window size hold every exit-interview answer`

## Tests behind one command that prints only failures and a one-line count
This file is checked by that command; `tests/last-run.txt` is what it ran.
- `build › *`
