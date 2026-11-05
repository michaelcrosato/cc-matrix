`PLAN.md` and `planner-exit-interview.json` are written in this folder, and section 16 of the plan maps every `TASK.md` requirement to where it's covered. The plan leaves the title to the builders and uses no `TASK.md` file names; paths are relative to the dev folder. I removed my scratch clones and committed nothing.

**The game in the plan:** a first-person open-world shooter on the engine's 3D add-on, built from its 2 km shooter kit.
- **Setting:** you're a contractor with a ruined lung in a burned-out republic on a drained inland sea, sent to kill the engineer who drained it.
- **Borrowed from the source:** mechanics and mood only, such as spreading fire, guns that jam, a map held in the hand, buddies who die for good and two interchangeable factions.
- **Original:** every name, character, place and story beat, and the plan lists source names to avoid. Malaria becomes a salt-dust lung disease, and the tapes become a hydrologist's depth logbooks. The story ends with a choice at a dam, where one option floods the basin.
- **Multiplayer:** "Salvage Rights", a 1–4 player round for AI Hub in which players race to bank diamonds ahead of a wildfire. Outside the hub, the same mode plays against AI rivals.

**What I ran on this computer, so builders don't have to rediscover it:**
- **Single file:** the whole stack builds into one 4.8 MB HTML file that runs from `file://`. I followed the plan's setup and build steps as written, and they work.
- **Hub trap:** the kit's normal boot takes 20.8 s with four copies in the harness and fails its 20 s `ready()` wait. The boot order in the plan passes all five harness runs: 1, 2 and 4 players, host leaving, and a host with no player.
- **Fast tests:** with the renderer off, the game boots in 0.45 s and runs about 44× real time with the same replay hash.
- **Prototypes:** fire with a scorch mask, day/night, the held map and flood water ran without errors on WebGL 2 and WebGPU. I also ran a jeep on the terrain, gamepad labels, music at 10% and the touch-only notice.

**Limits of that testing:**
- It ran on the kit plus prototypes, not on the finished game, so builders must re-run the hub check as their boot grows.
- Nothing ran on a real GPU, controller or phone; those were software rendering and stand-ins, as `TASK.md` expects.
- Numbers not marked VERIFIED, such as weapon stats, are starting points to tune with the plan's dev-mode sliders.

**Exit interview:** the main complaints are that "multiplayer… for the game on its own" is ambiguous, and that the handoff package leaves out the 3D engine a first-person game needs. I also noted that the 20 s `ready()` wait appears only in the harness source, not the protocol README.

Sources:
- [Far Cry 2 (Wikipedia)](https://en.wikipedia.org/wiki/Far_Cry_2)
- [Far Cry 2 (Giant Bomb)](https://giantbomb.com/wiki/Games/Far_Cry_2)
- [Mechanics 7: Heart of Darkness (GameDev.net)](https://gamedev.net/blogs/entry/1844402-mechanics-7-heart-of-darkness-far-cry-2)
- [Far Cry factions (Far Cry Wiki)](https://farcry.fandom.com/wiki/Far_Cry_factions)