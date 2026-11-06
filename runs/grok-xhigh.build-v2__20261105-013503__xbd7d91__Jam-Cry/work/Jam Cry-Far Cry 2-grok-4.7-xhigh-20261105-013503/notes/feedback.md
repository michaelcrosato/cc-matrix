# Jam Cry feedback notes

These are the answers copied into About and exit-interview.json. Counts come from the scratch logs: 14 compile errors, then 12 failing test runs after it compiled. Six of those stopped a contract route.

## Testing Feedback

Testing caught 26 issues. The first build reported 14 compile errors. After it compiled, the shipped tests failed 12 more times: a missing trait import, fever not latching, an attract step the clock clamps, fire crossing the road, a vehicle stage off by one, blackout health regenerating, an ignite on a cell already alight, soldiers leaving the flame, rain on the river, a gun that broke before it jammed, a long rest that skipped the post, and the last contract flag.

6 of those were game-breaking. The ignite step stalled, the panic step stalled, rain could not light a river cell, one seed broke the gun before the jam, the long rest never remanned the post, and the ending skipped the last contract flag.

The most helpful test was bot_plays_all_three_endings. It named the route, the seed, the stuck goal, the position, and the missing flags.

The least helpful test was the first attract check, which stepped a full second while the world clock clamps a tick to half a second, so it measured the clamp. A passing audio filter that never enters the contract was the other weak check. After the green run, 0 failures remained.

## Engine Feedback

The headless sim, the Game trait, the seeded rng, and the single-file packer were the parts that earned their keep.

The rig had no first-person camera. Hook games still drew the pavilion HUD. The wrong WebGPU flag leaves a blank canvas. Fire will not light a cell that is already burning. The world clock clamps a tick. A rest flag stuck. An ending marked finished before the last flag.

The contract sim had to be built here: weapons, fire, fever, the shell, and the page.

The hardest part was a first-person view and a two-kilometre country inside a small room, and a bot that trips every coverage flag.

InputFrame gained look, axes, and act, plus the buttons from reload through confirm. CameraRig gained a first-person pose. The pavilion HUD is skipped for this scene, so the page can own the menus.

One change worth having: a first-person camera and a game-owned UI that does not assume the pavilion.

## Prompt Feedback

The checks name the behaviour, the seeds, and the file the proof goes in.

The country lives in a simulation inside a room scene, and the WebGPU flag that actually paints is easy to miss.

The hardest task was one seeded bot reaching three endings and every coverage flag, then a page that still paints a frame.

Name the WebGPU flags beside the screenshot check, and say the visual room is only a window onto the country.
