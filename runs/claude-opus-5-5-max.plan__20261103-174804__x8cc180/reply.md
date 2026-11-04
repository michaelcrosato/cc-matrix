I've written `PLAN.md` (about 1,000 lines) for **Gauntletdown**. I brainstormed 50 riffs on "Gauntlet" and picked index 30 with Python's `secrets.randbelow`. The name works three ways: a challenge thrown down, a dungeon that only goes down, and a "let-down" for anyone who skips dinner.

**The game.** A co-op dungeon crawler for 1–4 players, seen from the engine's three-quarter overhead view (top-down and isometric are options in Settings). The heroes are original:
- **Heroes:** a Berserker with an axe, a Shieldmaiden with a shield, a Ranger with a bow and a Hexer with a staff.
- **Core loop:** health drains every second and food restores it. Generators breed monsters, which shrink a rank each time they're wounded. Keys open whole runs of doors, and a magic flask hits everything on screen.
- **Gauntlet's quirks kept:** you can shoot the food by mistake, and a reaper only magic can kill. Taking too long opens the doors and then turns every wall into stairs.
- **Narrator:** "The Gaunt" calls out in the arcade announcer's style with original lines, spoken as deep gibberish under big captions.

**What the plan covers:**
- **Architecture:** a module map for one bundled file, and one simulation that local players, network messages and a bot all drive the same way. That makes attract mode, the tests and the netcode one code path.
- **Engine changes:** eight small, tested ones. Examples: monsters pathing to the nearest of several heroes, new weapons (axe, bow, shield, scythe), bouncing shots, PlayStation button prompts by default, and bigger menu text for TVs.
- **Systems:** each with numbers, including the controls for DualSense, Xbox and keyboard/mouse, the HUD, menus, dev mode with live sliders, the 10-second attract mode, and the touch-only notice.
- **Online:** AI Hub shared-world sessions, with the message formats and rate and size budgets set out.
- **Content:** the story beats, 7 monsters plus a three-phase boss, King Famish, every item, 9 floors, 2 treasure rooms, and all narrator lines. Floor 1 is a complete map; I ran a script on it to confirm the stairs can be reached with the floor's own key. The other floors have detailed briefs for the builder to author.
- **Build order:** milestones M0–M12, with online play built second, on floor 1, because it's the riskiest part. There's a fallback to the hub's simpler "ghost" mode if it can't pass the hub's test harness, and a short list of extras that can be dropped whole.
- **Risks:** each one has a mitigation.
- **Testing:** one command that prints only failures and a count. It covers floor validation, per-system checks, a scripted bot playthrough of the whole game, network tests with simulated lag and loss, the hub's own four harness runs, and browser checks.
- **Exit interview:** a prefilled `exit-interview.json`.

**Things to know:**
- **Multiplayer reading:** I read "for the game on its own" as solo and couch co-op outside the hub, since the hub's rules forbid any other networking. The plan says so up front.
- **Hub harness keys:** its letter keys arrive in a form the engine ignores, so only its arrow keys and Enter register in the game. That's still enough to pass its checks; the plan notes this so builders aren't surprised.
- **Machine note:** `/tmp` here was 99% full while I worked. The plan tells builders to point Chromium's temp folder into the dev folder.

I removed my temporary research clones; the run folder now holds only `PLAN.md` alongside the given files.