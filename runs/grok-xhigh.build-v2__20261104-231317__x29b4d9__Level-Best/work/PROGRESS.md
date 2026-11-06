# Progress

## Title

Brainstormed 50 riffs on the source name, then `crypto.randomInt(0, 50)` returned **2**: **Level Best**.

The list, in order: Wobble Fit, Weeble Wellness, Level Best, The Daily Wobble, Fit-ish, Nearly Upright, Crooked Class, Lean Into It, Posture Party, Hold Still Darling, Island of Lean, Wobble Club, Straighten Up, The Leaning Hour, Class of Lean, Fit Enough, The Soft Landing, Keep It Wobbly, Level-ish, Weebly Fit, Fit Wit, The Morning Lean, Bubble and Beam, Knee News, The Alignment, Wobble Workshop, Almost Level, Tippy Wellness, Balance Resort, The Unsteady, Peg Doll Hour, Wooden Wellness, The Crooked Hour, Slightly Fit, Wobba Club, Fit for a Wobble, The Steady-ish, Wobbleton, Lean Mean Retreat, Toybox Tilt, Marble and Mat, Spirit Level, The Jar of Tries, Dawn on the Deck, Trudys Tilt, One Rock Resort, The Peg Doll Plan, Floor Exercise, Best of Wobble, Knee Deep.

The title on the title screen is Level Best. The retreat in the fiction keeps the plan's name, Level Best Retreat. Dev folder and HTML use `Level Best-Wii Fit-grok-4.7-xhigh-20261104-231317`.

## Now

The game is built. The work-folder root holds the single HTML file, this note, and exit-interview.json. The dev folder holds the modules and the test command.

`node tools/test.mjs full` printed `104 passed, 0 failed`. Two file:// launches drew the WebGPU title and left it on Enter. The hub harness passed for 1 player, 2 players, 4 players with latency, jitter and loss, and a host leaving. Outside a session, Enter and Space leave a drawn frame.

Issues found while building are in `notes/issues.md`. Twenty-four in all, fifteen of them critical. The About screen and exit-interview.json use that count.
