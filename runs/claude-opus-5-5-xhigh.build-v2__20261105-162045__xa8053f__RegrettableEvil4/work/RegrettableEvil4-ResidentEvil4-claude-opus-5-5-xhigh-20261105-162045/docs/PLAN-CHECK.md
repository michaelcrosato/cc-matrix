# PLAN.md, section by section

How each part of the plan was checked. `node tools/test.mjs` runs every suite named here; `plancheck` reads PLAN.md's own text and compares it with the code, so the two can't drift apart.

| § | What the plan asks for | Where it is | How it's checked |
| --- | --- | --- | --- |
| 1 | Pillars; original content; guardrail names absent | whole game | `plancheck` (names, source named only in About) |
| 2 | Script word for word; Tannoy lines, barks, radio hints, chapter cards; 6 Claim Notes | `src/data/dialogue.js`, `notes.js` | `plancheck` (57 script lines, 51 others), `data` (font) |
| 3 | Pad, keyboard and mouse controls; pointer lock; rumble | `src/core/intent.js`, `device.js` | `input`, `paths`, `plan` (quick turn, weapons) |
| 4.1 | Movement and camera numbers | `src/data/tuning.js`, `src/game/player.js` | `plancheck`, `systems` |
| 4.2-4.3 | Aim, laser, zones, stagger, kick, takedown, knife | `player.js`, `combat.js`, `enemy.js` | `systems`, `plan` |
| 4.4 | Weapon table, grenades, tuning, perks | `src/data/weapons.js` | `plancheck`, `case`, `plan` |
| 4.5-4.6 | The Case; items, herbs, treasure, Loot Director, Tannoy prizes | `caseModel.js`, `loot.js`, `items.js` | `case`, `plancheck`, `paths` |
| 4.7 | Mr. Fathom's shop; 6 appearances | `src/screens/shop.js` | `case`, `plancheck`, `paths` |
| 4.8 | Enemy table; crowd AI; tokens; rank (tokens, wind-up, wave interval); Harpooner glint; telegraphed arcs | `enemy.js`, `enemies/`, `director.js`, `projectiles.js` | `plancheck`, `ai`, `plan` |
| 4.9 | The Dame | `companion.js` | `plan`, `setpieces` |
| 4.10-4.13 | Context actions, QTEs, cutscenes, radio, saving, death, difficulty, Claim Form | `interact.js`, `qte.js`, `cutscene.js`, `talk.js`, `area.js`, `screens/form.js` | `plan`, `setpieces`, `plancheck`, `paths` |
| 5 | Maps, chapters, beats, set pieces; every open cell reachable with props in place | `src/data/levels/`, `src/game/setpieces/`, `launch.js` | `plancheck` (every painter command), `maps`, `levels`, `setpieces`, whole-game bot |
| 6 | The Bosun; the Bathysphere; the Mother | `src/game/bosses/` | `plan`, `setpieces`, whole-game bot |
| 7 | Night Shift; hub session; LocalSession; BroadcastChannel; WebRTC codes; protocol limits | `src/net/`, `vendor/hub/`, `screens/card.js`, `lobby.js` | `coop`, `hub` (harness, all scenarios), `party` |
| 8 | Look, moods, asset list | `src/game/world.js`, `src/models/` | `plancheck` (moods), `data`, screenshots |
| 9 | Clips, masked layers, procedural | `src/data/clips.js`, `actor.js` | `plancheck`, `data`, `plan` |
| 10 | Sounds, songs and tempos, gibberish voices, music at 10% | `src/audio/` | `plancheck`, `data`, `audio` |
| 11 | Screens, HUD, glyphs, touch-only | `src/core/ui.js`, `src/screens/`, `hud.js` | `plancheck` (words), `fit`, `input`, `touch`, `about`, screenshots |
| 12 | Dev mode: tools, teleport, spawn, 24 live sliders | `src/screens/dev.js` | `plancheck`, `dev` |
| 13 | Attract mode | `src/screens/attract.js` | `attract`, `touch` |
| 14 | Layout, single-file build, engine untouched | `tools/build.mjs` | `plancheck` (files, engine hash, hub tags), `boot`, `nowebgpu` |
| 15 | One test command; the whole game played by a bot; balance report | `tools/test.mjs`, `src/game/bot.js` | `playthrough`, `playthrough2`, `replay` |
| 17 | No stubs; about.js; exit interview; final reply | `src/data/about.js` | `plancheck`, `about`, coverage run |

## Where the plan leaves room, and what I chose

The plan opens: "where it is specific, follow it; where it is silent, use your judgment and keep the tone." These are judgment calls, listed so they can be overruled.

- **"Some but not plenty" (§15)** has no numbers. Measured as: at least 12 rounds left, fewer than were fired that chapter; earned at least the first gun's 900, less than that chapter's shop asks. `BalanceBook` in `tests/helpers.mjs`, enforced by `playthrough` and `playthrough2`.
- **The bot's seeds (§15)** aren't specified. The plan describes one run; the test command runs four (7, 23, 19, 3).
- **Help after deaths** is not in the plan, beyond rank. Continue adds a little with each retry of the same checkpoint: cover of 80%, then 100%; from the second retry a parcel of rounds and a samphire. Any gun left empty with nothing to pick up brings 18 rounds of .38 after 8 s, so a fight can't wait for ever. Nothing changes after a number of deaths in a chapter.
- **Damage on Standard (§4, §12).** The DAMAGE TAKEN slider ships at its plain 1. Trimming it didn't help once the bugs were fixed: on 240 seeds, 1 had 2 go over the limit, 0.9 had 3, 0.85 had 3.
- **Hits and Max (§4.8, plan silent).** A second of grace after a hit (`MOVE.hitGrace`), so two fast enemies can't chain her down; a hit staggers her but doesn't cancel a reload, so a 2.4 s pump against a flail can finish.
- **Rounds on the floor (§4.6).** The Loot Director's low line counts ammo lying nearby at three quarters of its value, so what hasn't been picked up yet doesn't bring more. Quay's placed .38 boxes hold 4 rounds.
- **Net-Wife beside you (§4.8).** The table gives her 0 damage and a thrown net. Close up she doesn't swing at you or hold an attack token; she circles and throws.
- **Bodies (§4.8).** The plan gives enemies kinematic capsules. The engine's CharacterController can't move at all once one touches it, so its query ignores them. `Player.blockByBodies` takes off the part of a move that goes into a body, and `Enemy.moveDir` does the same the other way: solid to walk into, free to walk away from.
- **`combat` song (§10)** is "layered in when alerted", but the engine plays one song at a time and §10 describes fading between them, so it fades in over 0.5 s.
- **How balance ended.** The owner ended the build and took the plan's death limit and these balance rules out of the requirements: balance is for human players to judge with the dev sliders. Numbers from the last full measure are in `../PROGRESS.md`.
- **Where the plan's map or props needed help.** The West Gate's exit is the gate's own cells, not the floor in front of it. A body-only wall round every map, because the causeway's floor reaches the edge of its grid; the Road's wagon stands across the east gap of the barricade, and a Brine Barrel moved a cell from where it pinched against the other cart; and pushing without moving, off the walking grid, puts Max on the nearest open cell.
- **The Bathysphere when he sags (§6)** turns to face Max, because the locks are on his front and he may have stopped facing a wall.
- **The Mother (§6).** Her own checkpoint once the hatch is off, because the plan says to save before bosses and she's a second one; and 48 rounds in the hatch's locker, enough to finish her with the pistol, because the plan wants running dry to be "hard, not impossible".
- **Dawn's fog (§8)** is "a first guess, so check it". Checked by eye, and thinned (top 0.5, amount 0.25).
- **Final boss and escort extras:** the Dame in a barrel, at most 5 awake, locker supplies, one jet hit per blast, stomp cooldown, limpet cap.
- **Added checkpoints:** Siege start, after the crypt, across the bridge. **Added marker:** the Cannery's corridor telegraph, which the plan's beat calls for and its map omits.

## What can't be checked on this computer

Nobody has played it. A bot says what kills a bot. The real pad, phone, TV and second player are simulated, as TASK.md provides.
