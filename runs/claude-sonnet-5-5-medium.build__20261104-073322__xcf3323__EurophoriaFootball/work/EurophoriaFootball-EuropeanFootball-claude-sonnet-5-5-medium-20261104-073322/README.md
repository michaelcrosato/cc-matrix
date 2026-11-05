# Europhoria Football (dev folder)

- `node tools/build.mjs` builds `build/game.js`, `build/index.html` (dev page) and the single-file deliverable one folder up.
- `node tools/test.mjs [filter]` is the one test command: it prints only failures and one count line (headless sim, scenes, hub mock, whole-cup playthrough).
- `node tools/hubcheck.mjs [players] [&query]` runs the AI Hub harness (it serves on 127.0.0.1 on an OS-picked port and stops its own server by PID).
- `node tools/shot.mjs "build/index.html#match/corner" out.png wait:2000` takes a screenshot; deep links: `#title #attract #setup #album #about #ending #cup/r1..r5 #match #match/<stadium|corner|freekick|penalty|shootout|super> #training/<drill>`; queries `?seed=N ?touchonly=1 ?dev=1`.
- `engine/CHANGES-ENGINE.md` lists the two changes made to the engine.
