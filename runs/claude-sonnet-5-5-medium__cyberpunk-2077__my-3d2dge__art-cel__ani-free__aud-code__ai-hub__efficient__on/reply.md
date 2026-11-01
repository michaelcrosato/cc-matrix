Both of the stop hook's gaps are now covered, apart from usage, which I still report as unknown.

- **2-player hub run:** the AI Hub harness now passes at 2 players, in addition to the earlier 1-player pass. I fixed my test runner and gave the 2-player run a longer wait.
- **Touch-only mode:** on an emulated touch device the game shows "Controller or keyboard required". Tapping the Settings button opens the settings menu.
- **Axis inversion:** with the stick pushed to (1, −0.5), "Invert horizontal axes" flips the first value, "Invert vertical axes" flips the second, and both together flip both. Turning them off restores the original values.
- **Usage:** no cost or token estimate is available inside this session, so I'm leaving it as "unknown". The prompt only asks for it when an estimate exists.
- **Real DualSense:** I still haven't tested with one in a real browser on a real GPU.

The final file is `Cybershrunk2077-cyberpunk2077-claude-sonnet-5-5-medium-20261031-2047.html` in the work folder root. The Source Information, Testing Feedback, Engine Feedback and Prompt Feedback sections in my previous reply still stand. The only change is that the 2-player harness limitation noted there is now resolved.