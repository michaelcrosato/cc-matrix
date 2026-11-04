I've written `PLAN.md` in this folder (about 2,100 lines). Nothing was built, as the stage asks.

**Title.** I brainstormed 50 riffs on the source's name and Python's `secrets` module picked **Eye of the Bolt-Holder**. File names use `EyeOfTheBoltHolder-EyeOfTheBeholder1991-…`.

**The game.** It's a real-time, first-person, grid-based party dungeon crawler. The setting is original: Hasp, the City of a Thousand Locks, is being locked in from below by the Bolt-Holder, a floating amber Eye held in a cage of seven iron bolts. A party of four, joined later by up to two of three recruitable NPCs, goes down four floors:
- **The Drains**
- **The Tumbler Halls**, the ruins of a dead locksmiths' guild
- **The Gloam Deeps**, home of an eye-cult, with one moral choice
- **The Eye's Vault**, where the boss is beaten by turning three Great Locks to open its cage

A short **Rat Run** floor serves as the AI Hub ghost race for 1 to 4 players, and as a solo time trial against your own best-run ghost.

**What the plan covers:**
- **Architecture.** The handoff's 2D engine plus the same repository's 3D engine and its crawler kit, which the engine's own docs recommend for Eye of the Beholder-style games. The game rules run separately from the 3D view, so the whole game can be tested in Node.
- **Systems.** Every mechanic is specified with numbers: per-hand cooldown combat in three rows, memorized spells (9 arcane, 9 prayers), camp, food, the held item you throw or place, and the full puzzle set (plates, levers, keys, secret and illusory walls, teleporters, spinners, pits).
- **Controls and screens.** A controller-first TV layout with PlayStation or Xbox glyphs, native keyboard and mouse, and a "controller or keyboard required" screen on touch-only devices.
- **Testing aids.** Dev Mode has 22 live sliders and a reset. The attract mode plays nine demo scenes after 10 s idle.
- **Content.** Exact maps, monsters, items, spells, scripts and voice profiles for every floor.
- **Delivery.** A build order in eight milestones (M0–M7), a risk table, one test command with a full scripted playthrough, and templates for the About screen and `exit-interview.json`.

**Checked before writing:**
- **The core technical bet works.** The engine's crawler kit ran from `file://` with three.js and Rapier loaded from a CDN (byte-identical to the engine's own copies), in headless Chromium. It booted with no errors, gave the same result twice and its bot beat the dungeon.
- **Every map holds up.** A script made 157 checks: each target is reachable with only the doors opened so far, every gated area stays sealed until it should open, and both outcomes of the moral choice work. It caught a real leak in my floor 2 draft (the treasure vault touched the first room), which I fixed.
- **The AI Hub timings are tight for a 3D page.** Its test allows about 11 s to connect and 20 s more to be ready. The plan has the game connect from a tiny script in `<head>` before the 3D libraries finish downloading.

`/tmp` on this machine is full, so the plan tells builders to keep their clones inside their own folder. I deleted my own research copies (about 5.5 GB) when I finished.

Sources for the facts about the original game:
- [Giant Bomb](https://giantbomb.com/wiki/Games/Eye_of_the_Beholder)
- [MobyGames](https://www.mobygames.com/game/835/)
- [oldgames.sk](https://www.oldgames.sk/en/game/eye-of-the-beholder)