The stop condition is still not met, and I have nothing new to report since my last message.

- **4-player hub case:** it fails intermittently with "no end within the grace period" (2 failures in the last 5 runs), while the machine's load average is about 27 on 32 cores. I believe it's load, but I haven't proven it. 2 players, 3 players and the 3-player host-leave case pass every time I ran them.
- **Plait:** I can't show it swinging in a browser. Plumb's body sways in the storm and the plait component exists, but the software renderer is too slow here for me to catch the plait animating.
- **Programme and The Line:** I viewed the Programme and the Line walk, but not every state of either.

On the final build, all 26 `labs/game` test files (41 tests) pass, the browser stage passes 42 of 42 checks, and `npm run check` passes. The single HTML, `exit-interview.json` and the dev folder are in `work/`.