PLAN.md is written in this folder (about 2,000 lines), ready for builders working without me.

**Title:** **MASH TV**. I brainstormed 50 riffs on "Smash TV" and Python's `secrets` module picked #9. Files follow `MashTV-SmashTV-<model>-<timestamp>`.

**The game:** a twin-stick arena shooter for 1–4 players, played on a fixed three-quarter "studio camera" view. It's set inside a deadly TV game show hosted by Lance Lustre. Enemies pour through four doors; players grab cash and joke prizes, then choose the next door on a studio map.
- **Mechanics:** a shared **Ratings** meter turns "be entertaining" into a mechanic: it sets a ×1–×5 cash multiplier, triggers Prime Time, and the producers send extra enemies if you stall. Players also get a slide (dodge), a screen-clearing Showstopper and a Showboat taunt that pays ratings for standing close to danger.
- **Weapons:** five weapons and add-ons, plus a shield, speed boots and extra lives.
- **Keys:** collecting Golden Keys unlocks the secret Green Room and the true ending.

**Content:** three episodes, each with six data-defined rooms and a boss: Mashy the mascot, the Wheel of Misfortune, then Lance in a mech followed by The Network itself. There are nine enemy types, two floor hazards, 18 named prizes and a full script of original all-caps host lines. A short "Lightning Round" (three rooms plus Mashy) is used for online sessions.

**Architecture:** built on the engine handoff v0.85.2 with four small, listed engine patches.
- **Modules:** the game is split into about 30 files in a fixed order.
- **Online:** AI Hub `shared-world` mode. Each player's own device simulates their contestant; the host runs everything else and sends compact snapshots within the hub's message limits.
- **Other systems:** gibberish voices synthesized in code, a 10-foot UI with PlayStation/Xbox button icons, the attract mode, dev mode with 25 live sliders, and the touch-only notice.

**Build order:** milestones M0–M10, each ending in a playable, tested build. The netcode is prototyped second (M2), before most content, because it's the riskiest part.

**Testing:** one command, `npm test`, that prints only failures and a count. It covers every system, a scripted playthrough of the whole game, a sweep that plays every room, a simulated network test, the hub's real harness in four scenarios, and browser checks with screenshots.

One thing on this machine: `/tmp` (a 9.8 GB tmpfs) was 100% full during planning. I deleted only my own partial clone there and put research files on the main disk, which I've since removed. The plan tells builders to keep their caches inside their dev folder.