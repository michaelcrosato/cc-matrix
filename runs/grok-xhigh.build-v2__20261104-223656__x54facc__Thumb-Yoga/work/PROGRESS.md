# Thumb Yoga

The on-screen title is Thumb Yoga. It was picked from the 50 names in `titles.json` in the dev folder. The RNG bytes were `b0306a24`, the uint32 was 2955962916, and the index was 16. The title has no characters a folder name cannot hold, so nothing was sanitized. The dev folder and the HTML share that basename with the source token left as `Wii Fit`.

The fetched session client still banners 1.4.0. Its SHA-256 is `6ab6be43898e2db069bc21a94757d77d9c3f2a0cb76f01186490d3bd88d8717a`. The plan pinned `529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a`. The fetched bytes won, and those exact bytes are pasted into the HTML.

Cuts, in the plan's order: Great Tilt's counterweights, expert variants and outfits, Hoop Patrol, Reps Hall, Island Jog's race (the walk stays), Cliff Plunge, and Step Class. Group Class's middle class is Heron only. The group score is the 0–1000 mean of the three classes, so a rank still fits. The plan also described a sum to 3000. The island terrain is a 60 by 60 grid with cell size 4, which is 240 m, so SwiftShader can boot it.

Testing caught six issues before hand-in. Four were critical: the score bands, the island boot, the ghost seat, and event imports one folder too high. The other two were a NaN prop yaw and lines that ran past two sentences. The four bot bands on ten seeds were the most helpful test. A headless screenshot was the least helpful, because the canvas can be blank while the sim is fine. A four-player session sends its lean from the hub clock. The fourth copy can still be compiling when the round opens, so the first score does not wait for a drawn frame.

The shipped golden is `labs/game/replays/still.replay.json`: 60 steps of `game:bench`, seed 1, platform `linux-x64`. A node test captures, perturbs, restores, and checks the golden hashes. The engine files were not changed.
