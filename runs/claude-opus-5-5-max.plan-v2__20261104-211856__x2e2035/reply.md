`PLAN.md` and `planner-exit-interview.json` are written. The plan's last section maps every item in `TASK.md` to the section that covers it. As `STAGE.md` asked, it leaves the game's title and `TASK.md`'s file names to each builder.

**The game:** a third-person sports mini-game anthology on Tippy Cay, a wellness resort staffed by talking gym equipment.
- **Core mechanic:** every event runs on one analog "lean" dot, the plan's answer to the balance board a DualSense doesn't have.
- **Structure:** five days, each with a morning check that gives you a Balance Age (never weight or BMI), and 11 events across four pavilions. It ends in a finale whose last test is doing nothing for 30 seconds.
- **Original cast:** a talking wobble cushion, a faceless wooden mannequin and a kettlebell coach, among others. The plan also lists what must not be copied from the source.
- **Multiplayer:** AI Hub ghost sessions, plus pass-the-pad play and "Yesterday You" ghosts when the game runs on its own.

**Tested on this computer, using throwaway builds of the engine rather than the game:**
- **Hub:** the plan's exact hub script passed the harness at 2, 3 and 4 players on a lossy network, and when the host left. The page also ran clean outside a session.
- **Browser link:** the controller stub, sound measurement, Rust-to-JavaScript link and switching between sets all work.
- **Art:** the pastel look, hand-keyed yoga poses, hand-written props and rounded fonts with painted PlayStation glyphs all rendered well.
- **Traps that would have cost builders time:**
  - The browser only reaches real-time speed at 320x180, so browser tests must run at that size.
  - `http.server` hangs a script reading its port through a pipe unless run with `-u`.
  - A font set up too late stops the browser build's frame loop with nothing on screen to say so.

**Not tested:**
- **Fun:** no event exists yet, so whether they're enjoyable is unproven. Only the balance dot's starting numbers were checked, by simulation.
- **Engine changes:** the other changes the plan lists, like the figure's tilt and the chase camera's yaw, come from reading the code and haven't been run.

If a builder runs short of time, the plan gives a cut order (Tray Trek, Floatie Spin, Plank Standoff), because I don't know which models or how much time builders will have. I raised that and the unclear "on its own" multiplayer wording in the exit interview.

I deleted my 2.6 GB research folder and committed nothing.

Sources: [Wii Fit on Wikipedia](https://en.wikipedia.org/wiki/Wii_Fit)