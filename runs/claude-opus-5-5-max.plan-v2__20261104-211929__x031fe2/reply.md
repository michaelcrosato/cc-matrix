`PLAN.md` is written and covers everything `TASK.md` asks for; section 27 ends with a table mapping each brief item to the section that covers it. `planner-exit-interview.json` is saved with all four questions answered, and it parses as valid JSON. Nothing is committed.

**The game:** an original first-person open-world shooter set in an invented country, the Sorrel. You come to kill the Surveyor, the man who sells maps to both armies.
- **Mechanics:** it keeps the source's spirit with jamming guns, spreading wind-driven grass fire, a recurring fever, a map held in your hands, and hired buddies who can rescue you or die.
- **Twist:** the Surveyor paid for your contract himself, and the fires you were hired to set form a firebreak that lets refugees escape.
- **Multiplayer:** a 6-minute shared-world round through AI Hub, also playable without the hub against AI mercs or between two windows on one computer.

**Left out, as `STAGE.md` asked:** the title and `TASK.md`'s file and folder names. All paths are relative to the dev folder.

**What I ran on this machine (engine 0.46.0), so builders aren't guessing:**
- **Packaging:** one HTML file holding the game and engine starts from `file://`.
- **AI Hub:** the real harness passes all four scenarios the hub uses on a stand-in round with the engine and a full-size world, including the game showing its own card in the two-player and server runs. It doesn't play a real round yet, so the plan has builders keep these passing from day one.
- **First-person traps the engine guide doesn't cover, each with a fix:**
  - the view distance stops at 160 m;
  - E and Q turn the camera;
  - pointer lock is reset every frame;
  - the default gamepad mapping presses keyboard keys.
- **Tuning from tests:** vehicle settings, the fire-spread constant (my first guess was about four times too high) and a soldier model that passes the engine's checks.

**Not run, and marked in the plan:** two pointer-lock behaviours, and a real mouse click on a menu item, which the plan tells builders to test early. Two other things were only partly tested: repainting burn scars after the first frame, for which the plan gives a fallback, and the phone profile, where I only ran the touch-detection check. The game itself isn't built, so its balance numbers beyond those above are my estimates, and builders can adjust them with the dev-mode sliders.

**Scope:** the plan is long (about 17,000 words) and ambitious. For weaker builders, section 26 gives a cut order so they can drop whole features rather than leave stubs. The exit interview suggests stating the builder's budget in future prompts so plans can be scoped to it.

I deleted my scratch folder, and none of my test processes are still running. The folder now holds just the two original files plus these two:
- `PLAN.md`
- `planner-exit-interview.json`