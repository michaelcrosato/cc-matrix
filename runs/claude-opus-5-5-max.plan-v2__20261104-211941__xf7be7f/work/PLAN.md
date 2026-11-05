# PLAN: a bell-haunted co-op action RPG

You will build this game without the person who wrote this plan, so it decides as much as it can.
"The brief" below means the CEO's brief: the task file you were given.

- **Authority:** the brief first, then this plan, then the engine's docs.
- **Names here are final. Numbers here are starting values:** tune them with bots and the sliders.
- **Where the plan is silent, decide and keep going.** Don't stop to ask.
- **Paths** are relative to your dev folder (§0). `engine/` is the engine's clone inside it.
  `arpg/x` is short for `engine/crates/pav_core/src/arpg/x`. `pav` means `engine/target/debug/pav`, run from
  inside `engine/`, because it reads `./game`.
- **Keep it shippable:** from M1 on, a working single HTML file can be built at any moment.

Map: §0 what must ship · §1 the game · §2 what was checked · §3 code · §4 story · §5 play · §6 classes · §7 items
and town · §8 zones, monsters, bosses · §9 screens · §10 art and animation · §11 audio · §12 multiplayer · §13
testing · §14 build order · §15 cut list · §16 finishing and reports · §17 coverage of the brief · §18 the brief's requirements, word for word.

---

## 0. What must ship

**Source:** Diablo 3. **Goal:** an original game inspired by it, as a feature-complete demo: a complete, polished
vertical slice, long enough to show every feature and mechanic so a player clearly understands how the game plays and
feels and what they can and can't do, with all the infrastructure needed to build out the rest with normal designer
tools. **Done means no TODOs, placeholders or stubbed features.**

**Your first step: the title.** The title is yours; this plan doesn't pick it. Silently brainstorm 50 titles, each a
playful riff on the source's name, then pick one with a real random number generator: run code, for instance
`python3 -c "import secrets; print(secrets.randbelow(50) + 1)"`, and take that entry from your list. Keep the title in one
place (`engine/game/about.toml`, `title`) and read it from there on the title screen, in the page's `<title>` and on the
About screen. No world text depends on it. The title is a joke on the cover; the world has its own names (§4).

**Where things go.** The dev folder and the game's file share one name, in this form: `<Title>-<Source>-<stamp>`. `<Title>` is
the title you just picked, `<Source>` is the source, and `<stamp>` is your run's model, effort, date and time, joined by hyphens.
Your brief writes this form out with your run's own stamp in it: copy that exactly and fill in your title. This plan can't give one
literal name, because the title doesn't exist until you pick it and every builder's stamp differs.

| What | Name and place |
|---|---|
| **Dev folder**, for all your dev files | A subfolder of the root: `<Title>-<Source>-<stamp>/` |
| **The game**, one single HTML file | In the root, beside the dev folder: `<Title>-<Source>-<stamp>.html` |
| **Exit interview** | In the root, beside the HTML, under the name your brief gives it (§16) |

Develop in separate modules and bundle into the one file when you're done. Dependencies that can be downloaded need not
be inside the file, and external CDNs are allowed, but this plan inlines everything, so the page needs no network.

**Also fixed by the brief:**
- **Research:** whether and how much is your choice. §2 holds what has been done.
- **Effort:** spend it however you see fit.
- **Performance budget: unlimited.** Add as much detail, enemies, effects, lights and shadows as a scene needs. FPS targets
  and optimization are out of scope; they are handled later.
- **Engine:** build on `https://github.com/michaelcrosato/shardfall/blob/main/START_HERE.md`, making a new game on its
  engine. You may change anything in it, the engine included, and add whatever systems, art assets and animations the game
  needs. The rest of the tech stack is your choice.
- **Online:** follow `https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub`, for integration into AI Hub and for the
  game on its own (§12).

**Sharing this computer.** Other agents work in the folders beside yours and share its ports and processes.
- Read only what you need. Keep every file you make inside your own folder, not `/tmp` or a parent folder.
- Prefer `file://` and the engine's headless tools. If you need a server (the hub harness does), bind 127.0.0.1 on a port the
  OS picks (`python3 -u -m http.server 0 --bind 127.0.0.1` prints it) and confirm the page is your game before trusting a result.
- Stop only processes you started, by their PID. Never `pkill`, `killall`, `fuser -k`, or kill whatever holds a port.
- Keep one or two browsers open at once and close them when done. "Target closed", "page crashed" or "browser has been closed"
  means memory ran out (earlyoom ended the biggest browser), not a bug in your game: run fewer browsers rather than retrying.
- Runs have no display, so a headed browser needs `xvfb-run`; nothing here should need one. WebGPU works only on a secure page,
  `file://` or `http://127.0.0.1`. A WebGPU canvas can come out blank in a headless screenshot, so check the game's state first (§13).
- Don't run `playwright install` or `playwright install-deps`: the browsers are already downloaded. The system Python has
  Playwright and nothing else. For Pillow, numpy and so on: `uv run --with pillow python script.py`, adding
  `--with playwright==1.63.0` when the script drives a browser. For Node: `npm install playwright@1.63.0` in your folder.

**Stand-ins for what this computer doesn't have.** Anything that needs the real thing is checked as far as it can be here,
and is never required.

| Missing | Stand-in |
|---|---|
| A controller | Replace `navigator.getGamepads` with a stub returning a pad in the standard mapping (Playwright `add_init_script`). Checked: §2 |
| A touch device | Playwright's phone and tablet profiles, tapping with `page.touchscreen` |
| Someone to listen | Measure what the audio produces: `pav audio_capture` WAVs natively, or an OfflineAudioContext or AnalyserNode in a page |
| A second player | Two browser pages or contexts, the harness's frames, or the in-process `SimNet` (§12) |
| A real iPhone or iPad | WebKit with an iPhone profile is the closest, and it isn't iOS Safari. It is listed here with WebGL 2 only, so expect the page's "needs WebGPU" message from it. Test the touch gate in Chromium's phone profile |
| A TV | Judge the 10-foot view from screenshots at 1920×1080 |

---

## 1. The game

**Pitch.** For nine hundred years a great bell kept the dead of the vale of Aubrenne asleep. Forty
nights ago it cracked. You are one of the Unshriven: a corpse that got up because neither the Choir
above nor the Discord below would have you. Wade through the risen in crowds, drown in loot, build a
hero from six skills and the tones they are struck in, and climb the broken belfry to silence what
has been tolling all along.

**Genre:** action RPG, hack-and-slash with loot, 1–4 players co-op.
**Perspective:** a fixed high three-quarter camera in perspective (§10). The player never rotates it.

**Pillars**
1. **Every press kills something.** Instant response, crowds that burst, hit-stop, flung corpses,
   collapsing scenery.
2. **Loot is half the plot.** Showers of it, colour you can read from the sofa, and rules-bending
   relics that change how a hero plays.
3. **Six buttons, endless builds.** Six rites, three tones each, three vows. Swap freely, no respec fee.
4. **Doom with a straight face and a dry joke.** Grand narration, gloating villains, gallows humour
   in town.
5. **Sound is the world.** Bells are the setting, the telegraph, the music and the enemy.
6. **Made for a TV at ten feet.** Big type, one thing focused at a time, no data walls.

**What we take from the source, and what stands in for it.** Mechanics, structure and tone carry
over. Every name, character, level, tune and picture is ours.

| The source's signature | Our version |
|---|---|
| A cosmic war spilling onto a doomed gothic land | The Choir against the Discord, over the vale of Aubrenne |
| A hero who turns out to be more than either side | The Unshriven, refused by both |
| An omen that starts it all | A cracked bell, not a falling star |
| Doom-laden narrator, villains gloating in your head | The narrator, the Prioress in your head, a tax-collecting undead knight |
| Skills bent by a modifier | Rites and Tones |
| Life from kills, one slow potion | Blood motes and Sexton's Gin |
| Colour-coded loot rain, set items, legendary powers | Relics, Regalia, the Reliquary |
| Elite packs with stacked affixes | Accursed and Damned packs (§8) |
| Timed randomized dungeon with a progress bar | The Undertoll and its Peal |
| Post-cap endless levels | The Sexton's Tally |
| Thief monster that flees with treasure, secret joke level | The Magpie, the Bishop's Geese |
| Lore read aloud while you fight | Tomes, in gibberish voice with subtitles |

**Originality rule.** This is a new game in the genre, not a recreation. Don't use the source's
names, characters, places, story beats, level layouts, music, UI art or look, renamed or not. These
never appear in player-facing text or data: Diablo (except the Source line on the About screen and
whatever riff the title makes), Sanctuary, Tristram, Cain, Deckard, Leah, Adria, Tyrael, Imperius,
Auriel, Malthael, Belial, Azmodan, Mephisto, Baal, Andariel, Leoric, Maghda, Nephalem, Horadric,
Horadrim, Kanai, Westmarch, Caldeum, Arreat, Pandemonium, Haedrig, Shen, Myriam, Kormac, Lyndon,
Eirena, Kulle, Greater Rift, Nephalem Rift, Paragon, Torment, Treasure Goblin, Whimsyshire,
Barbarian, Demon Hunter, Witch Doctor, Wizard, Crusader, Necromancer, "stay awhile and listen",
"fresh meat". Shardfall's own content goes too: Shardfall, Emberwatch, Pavilion, Hilda, Odo, Wren,
Brannoc, Biscuit, Kestrel, Ysolde, Wanderer, Hollow King, Cinder Wyrm, Mother of Swarms, Frostbound
Colossus. A test greps for all of these, whole words and case-sensitive (§13). The About & Credits screen
is exempt where it names the source and the engine.

---

## 2. What was checked on this computer

The planner ran these on 2026-11-04 from a fresh clone. Trust them, and re-run M0's versions.

| Check | Result |
|---|---|
| `git clone --depth 1` of the engine, `cargo build --locked -p pav_tools --bin pav` | Works. 3 min 10 s clean with 6 jobs. Toolchain 1.98.1 picked up by itself |
| `engine/scripts/build-web.sh --single-file ...` | Works. About 2 min. One 11.4 MB page (wasm 28 MB, 8.4 MB gzipped). `wasm-bindgen` 0.2.129 matches the lockfile |
| `pav` headless: `capture`, `autoplay`, `see`, `look bench`, `campaign`, `play` | Work. A 960×540 capture takes 0.3–1 s on the CPU. `bench`: 500–2,000 ticks/s on busy levels. **`campaign`: 2.4 game minutes in 14 s, about 10× real time** in a dev build, so a bot needs about 9 minutes for a 90-minute chapter |
| The page from `file://` in headless Chromium, with **`--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-angle=swiftshader`** | Runs and screenshots show the game. Boots in 1.3 s. **Only 2–3 fps at any viewport, and the sim is throttled to about 5 ticks/s** |
| The same page with the flags in the brief's computer notes (`--enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader`) | **GPU device lost, blank canvas.** Use the flags above; they are also what `engine/docs/REFERENCE.md` says |
| `navigator.getGamepads` stub in the wasm build | gilrs reads it. The stick moves the hero, `buttons[9]` opens the menu, prompts switch to pad |
| The page with `session.js` pasted first in `<head>`, §12's exact metas and JS shim, in `harness.html` with real wasm copies, 150 ± 50 ms, 5% loss | **Passes:** 2, 3 and 4 players, 3 players `scenario=host-leave`, 2 players `scenario=server`, each in under 20 s. Pasted client's hash is the released 1.4.0. Anything with a deadline must live in JS, as the shim does, not in the frame loop |
| The same page on its own, Enter and Space pressed | `AIHub.active` false, `Math.random` untouched, no errors, screenshot 600 KB against a blank page's 5 KB |

Traps found while checking, each of which cost time:
- `python3 -m http.server 0 --bind 127.0.0.1` piped to a script **buffers its port line, so
  `readline()` hangs for ever**. Use `python3 -u -m http.server ...`.
- `python3 -I` hides Playwright on this machine. Run your own test scripts with plain `python3`.
- `pav repl` splits lines on spaces. For an argument with spaces send a JSON line:
  `{"tool":"look","args":{"name":"Comic noir"}}`.
- When stopping processes, match by PID you recorded. A `pgrep -f` pattern also matches your own shell.

**What this means for testing:** the browser is too slow to play in. Play and balance headless with
`pav` and `cargo test`, where it is faster than real time. Use the browser only to prove screens
appear, input routes and the hub protocol holds (§13).

---

## 3. Foundation: the code

### The decision: fork Shardfall's game module, in place
`engine/docs/MAKE_A_GAME.md` says to start from the starter game and skip Shardfall's code. That is right for
other genres. **For this game, don't.** This game is an action RPG, and `engine/crates/pav_core/src/arpg/`
already has what the starter would make you rewrite: actors, stats, damage, ailments, skills as data,
items, affixes, powers, a monster generator, boss phases, level generation, level mechanics, a town,
saving, a capable bot, a game UI, loot beams, telegraphs, floaters and about 25 agent tools. The
guide's "Limits today" (text-only HUD, closed sound list, no per-game camera) are things `arpg/`
already got past.

So you edit `arpg/`, `engine/game/`, `pav_ui`, `engine/crates/pav_view/src/arpg.rs` and `pav_app` directly. The brief lets
you change anything. **It must still be a new game:** a player who knows Shardfall must not recognise
a name, monster, level, screen or line. Keep systems, replace all content, and replace the UI layer.
Keep the module name `arpg`; internal identifiers don't matter, player-facing text does.

Still follow the guide's "Rules that keep it working" and AGENTS.md's "Key rules": same inputs and
seed give the same game, all state lives in `SimState`, `pav_core` has no window, GPU or audio code,
no threads, blocking calls or files on wasm.

`engine/docs/COOP_PLAN.md` is marked "on hold": that is about the maintainers' larger design. §12 here is a
smaller design over the hub, and you do build it. Read that document's §3 table when you reach M2: it
lists every place that assumes one hero (its line numbers are old, so grep).

**Later chapters must be possible by data:** zones, quests, dialogue, monsters, loot, music and attract all live
in `engine/game/*.toml`, checked by `pav` tools. That is the infrastructure for the rest of the game that the brief asks for.

### Setup (M0)
```sh
git clone --depth 1 https://github.com/michaelcrosato/shardfall.git engine
cd engine
git rev-parse HEAD                                    # goes on the About screen
CARGO_BUILD_JOBS=6 cargo build --locked -p pav_tools --bin pav
./target/debug/pav play scene=starter bot=true seeds=3
CARGO_BUILD_JOBS=8 scripts/build-web.sh --single-file --scene town --title "Probe" --out ../probe.html
```
Fetch `README.md`, `session.js`, `harness.html`, `bridge.js`, `round.js` from
`https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/` into `tools/hub/`, and read the
`README.md` once (you need all of it). Keep everything inside the dev folder; §0's rules on sharing this
machine apply throughout.

Layout (run the commands above from the dev folder):
```
<Title>-<Source>-<stamp>.html   the game, in the root, built last (§16)
<Title>-<Source>-<stamp>/       your dev folder: every path in this plan starts here
  engine/                       the engine and the game: you change it freely
  tools/check.sh                the one test command (§13), with Python helpers beside it
  tools/hub/                    the hub's session client and harness
  shots/                        captures for what a script can't judge
```

**Read:** `engine/START_HERE.md`, `engine/docs/MAKE_A_GAME.md`, the "Key rules" in `engine/AGENTS.md`, `engine/docs/GAME.md`, `engine/docs/REFERENCE.md`
"Tools" (search it), `engine/rooms/_template.toml` (search it). **Skip:** `engine/docs/HISTORY.md` (300 KB),
`engine/docs/ASSET_SYSTEM_PLAN.md`, `engine/docs/AGENT_ASSET_STORE.md`, `engine/pavilion-lite/`, `engine/anim/cmu/`. Don't read
`arpg/world.rs` or `app.rs` whole; grep them.

**Rhythm:** a Rust change rebuilds `pav` in about 2 minutes, so batch edits. Balance and content live
in `engine/game/*.toml`: `game_reload` re-reads them with no rebuild. Use `pav repl` for sessions. Adding a
dependency means one `cargo build` without `--locked`, because `engine/scripts/build-web.sh` uses `--locked`.

**Old tests:** Shardfall's suites in `engine/crates/pav_core/tests/` (`arpg`, `loot`, `skills`, `monsters`, `levels`, `town`,
`feel`, `heroes`) and `engine/crates/pav_tools/tests/game_ui.rs` name its content. They are your regression net through M2.
Rewrite or delete each as its content goes. You don't need to run the engine's other suites.

### Code map: what happens to each part
| Part | Do |
|---|---|
| `engine/crates/pav_core/src/arpg/mod.rs` (`Game`), `cmd.rs` (`GameCmd`, `Place`) | Keep. Refactor one hero into `HeroSlot`s (M2). New `Place`s: Title, Town, Zone floors via `Level(n)`, Undertoll. Every menu action stays a `GameCmd` |
| `arpg/stats.rs`, `combat.rs`, `items.rs`, `loot.rs`, `powers.rs` | Keep, extend (§7) |
| `arpg/skills.rs` | Keep. `Tweak`s become Tones. Add `summon` and `trap` behaviours |
| `arpg/genome.rs`, `brain.rs`, `boss.rs` | Keep. Designed families and bosses first (§8); the genome feeds the Undertoll |
| `arpg/levelgen.rs`, `world.rs`, `world/dress.rs`, `mechanics.rs` | Keep. Add an open-air grammar; re-theme mechanics (§8) |
| `arpg/scene.rs` (`build_town`), `hall.rs` | Rebuild Vespergate. `hall.rs` becomes the class-select stage |
| `arpg/tree.rs`, `engine/crates/pav_ui/src/arpg_tree.rs`, `engine/game/tree.toml` | **Remove.** Vows and the Tally replace the tree |
| `arpg/bot.rs` | Keep and teach everything: quests, classes, ropes. It drives tests and attract |
| New: `arpg/quest.rs`, `arpg/dialogue.rs`, `arpg/net.rs`, `arpg/attract.rs`, `arpg/follower.rs` | §4, §9, §12 |
| `engine/game/*.toml` | Replace all content. New files: `quests`, `dialogue`, `lore`, `gems`, `regalia`, `vows`, `attract`, `about`, `sfx`, `voices`, `music` |
| `engine/crates/pav_ui/` | Keep `headless.rs` and the `Device` idea. Replace `arpg_ui.rs`, `arpg_items.rs` with the screens of §9. **Remove `touch.rs` controls** |
| `engine/crates/pav_app/src/ui.rs`, `input.rs`, `uiinput.rs`, `app.rs` | Replace the tech-demo pause menu and stick cursor. Fixed system keys (F1–F12, hold Backspace rewind) work **only with Dev Mode on** and never in a session |
| `engine/crates/pav_view/src/arpg.rs`, `looks.toml` | Keep, extend: new effects, the game's look (§10) |
| `engine/crates/pav_audio/src/lib.rs` | Extend: data-driven sounds, music bus, voices (§11) |
| `engine/web/index.html`, `engine/scripts/pack_single_html.py` | Paste the session client, add metas and shim (§12); drop the phone-only code and hint |

More engine traps:
- **Game data may name only assets every build carries:** `BUILTIN/`, `LIB/core/`,
  `LIB/kaykit_adventurers/`. `LIB/quaternius_medieval_village/*` and `LIB/kenney_mini_dungeon/*` are
  on disk only and **would fail in the browser**. To use one, add its pack to the list in
  `engine/crates/pav_core/build.rs` and to `SHIPPED` in `engine/crates/pav_core/src/props/store.rs` together.
- New props: `asset_edit` makes them, `asset_edit action=publish ... ` puts them in `LIB/core` (token
  caps apply; `engine/docs/ASSET_STUDIO.md`), and a rebuild embeds them. Clips: any `.json` directly in
  `engine/anim/` is embedded.
- `engine/scripts/pack_single_html.py` **refuses wasm-bindgen snippets**, so no `inline_js`. Call page functions with
  `#[wasm_bindgen(js_namespace = ...)]`. Glue can't contain `<script`, `</script` or `<!--`.
- `build-web.sh --out` is relative to where you ran it from.
- **Check the browser's own keys:** Alt, Tab, Space, arrows and any F-key you use must not reach the browser, and
  right-click (Rite 2) must not open a context menu. Test them with Playwright; add `preventDefault` in the page if needed.
- **Change the `localStorage` key prefix** in `engine/crates/pav_app/src/save.rs` and `settings.rs` to one unique to
  this game. On the hub's site all games share an origin, so Shardfall's keys would collide.
- Replace user-facing engine strings: "Shardfall crashed" in `boot.rs`, room and scene lists, control cards.
- Don't spend time shrinking the page or optimizing: that is out of scope (§0).

---

## 4. World and story

**Setting.** The vale of Aubrenne, a rainy, tired gothic country of parish churches and low hills.
Above it sits **the Choir**, a host of faceless, perfect beings of light and song, who are cruel in the
way ledgers are cruel. Below it writhes **the Discord**, the host that wants everything loud and
nothing kept. Their war was fought to a truce nine centuries ago and sealed under a bell.

**Old Compline** is that bell. Every dusk it tolled, and the dead stayed down. Forty nights ago it
cracked. Now the dusk toll comes out wrong, and what is buried climbs up.

**The Unshriven** are those who died in the bell's first silence and were refused by both sides. Death
won't keep you, which is why you respawn and why you are stronger than you should be.

**The truth (revealed in Q9).** The toll never laid the dead to rest. It herded them. Under the bell
lies **the Bellwether**, once the Choir's shepherd of souls, which for nine hundred years has been
gathering its flock down through the ground. The Tacet cracked the bell on purpose, to stop the
herding, and in doing so let the shepherd wake.

### Cast
| Who | Role | Voice and manner |
|---|---|---|
| **The Narrator** | Title crawl, chapter beats | Slow, deep, sure of the worst |
| **Sexton Mabry Thole** | Old gravedigger, quest-giver, keeps your Tally and the difficulty roll | Gruff, tender about corpses, knows everything because he buried it. Digs one grave throughout the game: deeper at every visit. It is his own |
| **Sister Aveline Pell** | One-armed bell-ringer, runs Tuning and the Reliquary | Young, furious, exact |
| **Hob Cullender** | Bell-founder turned smith, deaf from the bells | SHOUTS EVERYTHING |
| **Madam Ottoline Quire** | Chandler and jeweller | Dry, gossiping, expensive |
| **Goody Farthing** | Sells sealed boxes (gamble) | Cheerfully sinister |
| **Lisbet Marl** | Poacher, follower | Curt, unimpressed, good shot |
| **Brother Anselm** | Drunk healer, follower | Merry, ashamed, sings badly |
| **Ser Gaudry Vane, the Tithe Knight** | Boss 1 | Undead tax collector. Pompous, punctilious |
| **Prioress Amarante** | Boss 2, leader of the Tacet, speaks in your head | Tongueless, patient, nearly right |
| **The Bellwether** | Final boss | Speaks in tolls; subtitles in capitals |
| **The Tacet** | The cult | Cut out their tongues and wear iron mouth-bars. Never make a sound; their silence is the threat |

**Your coffin** is the stash: Mabry had it brought to town. "It's yours. You've used it."

### Chapter One: The Silence (about 90 minutes first time)
| # | Quest | Where | Beats |
|---|---|---|---|
| Q1 | **Get Up** | Potter's Field | Crawl: the Narrator over the night churchyard. You claw out of a grave (press to rise, `MESH2MOTION/Zombie_Rise`). Mabry greets you. Learn move, attack, rite, motes, breakable graves |
| Q2 | **Hold the Gate** | Potter's Field → Vespergate | Reach the lych-gate. **Set piece:** hold the gate for 90 s beside the town's last watchmen, kegs and all |
| Q3 | **Last Rites** | Vespergate | Meet Hob, Ottoline, your coffin, the Lychstone. Mabry wants the Parish Roll from St. Orrin's |
| Q4 | **Arrears** | The Lych Road, then Undercroft 1–3 | First elites, first gargoyle ambush, first relic (guaranteed from Gaudry). Kill **Ser Gaudry**, take the Roll |
| Q5 | **Names That Don't Match** | Town → Sallow Fens | Mabry reads the Roll: hundreds of graves were empty long before the crack. The Tacet's camps are in the Fens |
| Q6 | **The Hush** | Sallow Fens 1–2 | Rescue Lisbet (first follower). Break three Tacet rites: each is an event where effigies ward the enemy. The Prioress first speaks in your head |
| Q7 | **The Drowned Chapel** (optional) | Fens side dungeon | Darkness, wells to light, Tome, sure relic |
| Q8 | **Founder's Debt** | Bellfoundry 1–2 | Hob wants his molds back; Aveline wants a new clapper cast. Kill **Prioress Amarante** |
| Q9 | **What the Bell Was Saying** | Cutscene, then town | Beaten, she shows you the truth; the Bellwether hauls her down. In town Mabry admits he too is Unshriven, the first, two hundred years digging. "Who did you think buries the gravediggers?" |
| Q10 | **The Great Belfry** | Belfry 1–3, Bell Pit | Climb in wind and lightning, Aveline at your side. Kill **the Bellwether**. The bell falls |
| End | **Compline** | Cutscene | The dead truly lie down. Mabry climbs into the grave he has been digging, and sleeps. Then the sky opens: the Choir's heralds, come to collect. Credits. The Undertoll unlocks |

**Side events** (random placement, each with a one-line hook and a reward):
- *The Hanged Men:* three corpses drop from a gibbet and fight.
- *The Widow's Dowry:* a cursed reliquary calls waves, then pays.
- *The Weeping Saint:* break five urns round a statue for a long buff.
- *Lost Choirboy:* escort him to the Lychstone. He sings, badly, and draws attacks.
- *Magpie!:* see §8.
- *A Tithe of Geese:* opens the secret level. Find four hand-bells, one per zone, and ring them at
  Vespergate's broken pump.

**Tomes** (8, found in the world, read aloud while you keep playing, subtitled, stopped from the Journal): The
Sexton's Ledger I–IV, Hymnal of the Tacet, Confession of Ser Gaudry, Founder's Notes, A Letter Never Sent.

### Writing style
Grand and doom-laden when the world speaks, dry and human when people do. Short sentences. Villains
enjoy themselves. Nobody explains a joke. Every line is shown as a subtitle and spoken in gibberish
(§11). Write all of it yourself in this voice, and write plenty: barks for every NPC, 4–6 per villain
per phase, a line for every shop action. These set the tone:

- **Narrator:** "For nine hundred years, when dusk fell on the vale of Aubrenne, the great bell Old
  Compline spoke, and the dead lay still. Forty nights ago it cracked. Now it speaks only to them."
- **Mabry, first line:** "Easy. Easy. You're the fourth this week, and the first to look sorry about
  it. Mind the headstone. I carved that one."
- **Mabry, on your death:** "Back of the queue, friend."
- **Hob:** "WHAT'S THAT? A SWORD? SPEAK UP, IT'S ALL BELLS IN HERE."
- **Ottoline:** "Candles are for the living, dear. Gems are for the dead. I'm told you're undecided."
- **Aveline:** "I have one arm and the only ear left in this vale that can hear a bell lie."
- **Goody Farthing:** "Never ask what's in the box. Ask what's in you, that you want it so badly."
- **Gaudry:** "Nine hundred years of tithes, and not one soul in arrears. Until you." / "Your account,
  Unshriven, is overdrawn." / dying: "Mark it... paid."
- **Prioress, in your head:** "Little corpse. Do you hear how quiet it is between the tolls? That is
  the only honest thing left in this world." / "We cut out our tongues so we would never sing for it.
  What have you given?"
- **Bellwether:** "COME IN FROM THE COLD." / "EVERY FLOCK COMES HOME." / "I HAVE COUNTED YOU. YOU ARE
  ONE SHORT."
- **Choir herald, last line of the chapter:** "We have come for what was entrusted. You will kneel, or
  you will be catalogued."

**How it's delivered:** quest log (`engine/game/quests.toml`, steps: `reach`, `kill`, `talk`, `use`, `clear`,
`hold`, `collect`), conversations (`engine/game/dialogue.toml`, one speaker at a time with a topic list),
villain lines as a portrait slide-in at the side while you keep fighting, and four in-engine cutscenes
(letterbox, scripted camera and puppets, skippable with a held button): Rising, Gaudry's entrance,
Prioress's truth, Compline.

---

## 5. Play

### Controls
| Action | DualSense (Xbox glyphs in brackets) | Keyboard and mouse |
|---|---|---|
| Move | Left stick | Hold left mouse on the ground (walks there by pathfinding), or WASD |
| Aim | Auto-target; right stick overrides while held | Mouse |
| Rite 1 (builder) | Cross (A) | Left mouse on an enemy (walks into reach, repeats while held); Shift + left mouse attacks in place |
| Rite 2 | Square (X) | Right mouse |
| Rite 3 · 4 | Triangle (Y) · Circle (B) | 1 · 2 |
| Rite 5 · 6 | R1 (RB) · R2 (RT) | 3 · 4 |
| Dodge roll | L1 (LB) | Space |
| Sexton's Gin | L2 (LT) | Q |
| Talk, use, pick up | Cross when a prompt shows and no enemy is within 3 m | E, or left mouse on the thing |
| Ring hand-bell (way home) | D-pad down, hold 1 s | T |
| Hero screen | D-pad up | I or C (Gear), K (Rites), J (Journal) |
| Map | D-pad left | M or Tab |
| Item labels | D-pad right toggles | Hold Alt |
| Pause | Options (Menu) | Esc |

**In menus, on every device:** D-pad or left stick moves focus, Cross/A/Enter confirms, Circle/B/Esc
backs out, Square/Triangle or X/Y (R, F on keys) do what the prompts say, L1/R1 or Q/E change tabs,
the right stick scrolls. The mouse hovers to move focus and clicks to confirm; arrow keys work too.

Standard mapping notes: Options is `buttons[9]`, Create/View is `buttons[8]`, which this game leaves
unused. Don't use the touchpad button: not every pad has one. Gilrs names: L1 is `LeftTrigger`, L2 is
`LeftTrigger2`. In a session, ignore Options while Create is held: that chord belongs to the hub.

**Pad targeting:** attacks snap to the best enemy in a 60° cone around the stick or facing, within reach
plus 1.5 m; `engine/crates/pav_ui/src/touch.rs`'s `pick_target` has the logic to salvage before you remove that file.
Ground-target rites land on that target, or 8 m ahead. **Click-to-move** goes in the sim (a new
`InputFrame` field) with `NavGrid`, so it replays and works for guests.

**Hover and focus in the world:** the thing under the cursor, or the pad's current target, gets an
outline, and its nameplate shows top centre.

### Rules and feel
- **Life:** hero life; no regen by default. **Blood motes** drop from 30% of kills (elites always) and
  heal 15% within a 2 m pickup. **Sexton's Gin:** 60% life, 30 s cooldown, unlimited. Its label says
  "tastes of grave".
- **Dodge:** keep `DODGE_SPEED`, `DODGE_TIME`; i-frames throughout; 2 charges, 3.5 s each.
- **Hits:** keep `arpg`'s hit-stop (30–70 ms by weight), shake, flash, knockback, gibs. Deaths fling
  bodies. Big kills get slow-motion for one beat. All scaled by sliders.
- **Harvest:** kills within 4 s chain: 6 = "Small Harvest", 15 = "Good Harvest", 30 = "Bumper Harvest",
  with an XP bonus (`streak` exists). Kills by falling scenery: "Act of God", bonus XP.
- **Breakables everywhere:** urns, coffins, pews, kegs that blow, chandeliers and statues that drop on
  what stands under them. Use `destruct.rs`, the keg code and physics props. Each floor needs at least
  one thing that kills a pack if the player notices it.
- **Death:** desaturate, Mabry's line, respawn at the floor's start or the last Lychstone after 3 s.
  No penalty on Mercy and Penance; from Dread up, 10% gold. In co-op, hold the interact prompt 2 s over
  a fallen ally to revive; otherwise they respawn after 8 s.
- **Levels:** cap 20, reached about the final boss on Penance. Then **the Sexton's Tally**: every level's
  worth of XP earns a point, spent across all heroes on Might (damage), Mercy (life), Haste (speed) or
  Greed (gold and find). Four rows, no tree.
- **Difficulty** (`Sexton's roll`, in town or at New Hero):

| Tier | Monster life and damage | XP, gold | Relic chance |
|---|---|---|---|
| Mercy | ×0.6 | +0% | ×1 |
| Penance (default) | ×1 | +0% | ×1 |
| Dread | ×1.7 | +25% | ×1.5 |
| Anathema | ×2.8 | +60% | ×2 |
| Perdition | ×4.5 | +110% | ×3 |
| Oblivion | ×7 | +200% | ×5 |

- **Feats:** 12 small achievements (first relic, a Bumper Harvest, Gaudry on Dread, the Magpie caught...), a toast
  each, listed in the Journal.
- **Co-op scaling:** n heroes in the world: monster life ×(1 + 0.75(n−1)), damage ×(1 + 0.25(n−1)).
- **Saving:** autosave on travel, level-up, quest step and quit; `localStorage`, versioned. A bad save
  starts fresh and never crashes. A roster of heroes, each with their own gold and gear; the coffin and
  the Tally are shared.

### Endgame: the Undertoll
From the Lychstone after the chapter ends (and from Dev Mode). Choose a Depth (1 to your best + 3); it
sets monster level and difficulty. A shuffled run of 3–5 generated floors mixing every theme, mechanic
and family (the existing endless generator). A **10-minute** bar. Kills fill **the Peal** by monster
weight. At 100% **the Warden** appears (a generated boss: `gen:<seed>`, with phases). Kill it before time
for a relic shower and a higher best; late still pays, less. Best Depth per hero is shown on the Lychstone.

---

## 6. Classes

Four heroes, all bipeds, each with a look, a resource, 8 rites and 6 vows. Each skill "base" below is a
key in the engine's `engine/game/skills.toml`: copy it, rename it, retune it. Keep `behavior`, change the
rest. Tones are `Tweak`s, the engine's 13 fields: damage, count, radius, cooldown, cost, pierce, chain,
ailment, duration, speed, range, knockback, element. Each tone below reads as tweak values; all numbers
mean the bonus (`cooldown 35` = 35% shorter). Rites unlock at the level shown. A rite's first tone unlocks
with it, its second 3 levels later and its third 6 levels later (never past L20). Swapping is free once
you've been out of combat for 3 s.

Six bar slots. Resource rules go in one place: `max`, `regen`, `on_hit`, `on_hurt`, `on_corpse`,
`decay`, in `engine/game/heroes.toml`, mapped on to the engine's `mana` (rename it per class in all text).

### The Penitent: melee, heavy
A hooded giant in sackcloth and wrapped chains, swinging an iron censer on a flail.
**Contrition** (max 100): +6 per Scourge hit, +1 per 2% life lost, −4/s after 5 s out of combat.
Spending heals 0.2% life per point. *Pain is prayer.* Hood helmet; new prop `censer_flail` on a `mace`.

| Rite | L | Base | Cost, cooldown | Tones |
|---|---|---|---|---|
| Scourge | 1 | `slash` (3-swing combo) | builds | Barbed: ailment 30 · Thurible: element fire, damage 10 · Long Chain: range 40 |
| Sweep of Ash | 1 | `cleave` | 20 | Ember Wake: element fire, radius 25 · Heavy Hand: damage 40 · Second Blow: count 1 |
| Penitent's Leap | 2 | `leap_slam` | CD 8 | Crater: radius 35 · Quick Knees: cooldown 35 · Thunderclap: element lightning, damage 20 |
| Iron Litany | 4 | `whirlwind` | 9/s | Bleeding Hymn: ailment 40 · Swift Rosary: speed 30 · Burning Censer: element fire, damage 15 |
| Hair Shirt | 6 | `war_cry`: 6 s, 30% less damage taken, Contrition gain ×1.5 | CD 15 | Shared Burden: radius 100 · Long Fast: duration 60 · Bitter Cup: cooldown 30 |
| Grave Furrow | 9 | `earthsplitter` | 30, CD 5 | Long Furrow: count 3 · Wide Furrow: radius 30 · Sundered Saints: element fire, damage 25 |
| Drag to Confession | 12 | `blade_dash`: dashes through, drags and stuns 1 s | CD 6 | Long Reach: range 40 · Quick Confession: cooldown 35 · Breaking Wheel: knockback 3, damage 30 |
| Martyr's Toll | 15 | `frost_nova`, physical: huge, costs 15% life | CD 18 | Wide Toll: radius 40 · Red Toll: element fire, damage 30 · Quiet Toll: cooldown 35 |

### The Carillon: ranged caster
Slim and robed; three small bells orbit them; carries a bell-staff. **Resonance** (max 100): regen 12/s.
**Changes:** casting a different rite from the last adds a stack (max 5, +8% damage each, 4 s); repeating
one clears them. Pips on the gauge. New props `bell_staff`, `hand_bell`. Clips as Shardfall's caster
(`heroes.toml`, the Ysolde kit).

| Rite | L | Base | Cost, cooldown | Tones |
|---|---|---|---|---|
| Clear Note | 1 | `fireball`, physical | free | Sharp Note: pierce 2 · Twin Note: count 1 · Burning Note: element fire |
| Toll | 1 | `frost_nova`, physical | 25, CD 4 | Wide Peal: radius 35 · Hoar Peal: element cold, ailment 40 · Quick Peal: cooldown 35 |
| Carol of Sparks | 2 | `chain_lightning` | 18 | Long Carol: chain 2 · Bright Carol: damage 30 · Ember Carol: element fire |
| Step Between | 4 | `blink` | CD 6 | Far Step: range 40 · Quick Step: cooldown 35 · Thunder Step: damage 40 |
| Winter Hymn | 6 | `blizzard` | 30, CD 6 | Long Winter: duration 50 · Wide Winter: radius 30 · Killing Frost: damage 30, ailment 30 |
| The Great Knell | 9 | `meteor`: a spectral bell falls | 45, CD 6 | Triple Knell: count 2 · Wide Knell: radius 35 · Storm Knell: element lightning, damage 20 |
| Bronze Shards | 12 | `ice_shards`, physical | 22 | Full Fan: count 3 · Piercing: pierce 2 · Ember Shards: element fire, ailment 30 |
| Sympathetic Ring | 15 | `war_cry`: 8 s, +30% cast speed, regen ×2 | CD 20 | Long Ring: duration 50 · Shared Ring: radius 100 · Quick Ring: cooldown 30 |

### The Plaguewright: ranged trapper
Beak mask, long coat, wide hat, crossbow. **Bile** (max 100): +10 per Tainted Bolt hit, +3/s. New props
`beak_mask` (helmet shape), `crossbow` (held by its grip socket on a `wand`-kind weapon), `pitch_flask`.

| Rite | L | Base | Cost, cooldown | Tones |
|---|---|---|---|---|
| Tainted Bolt | 1 | `fireball`, physical, anim `throw` | builds | Foul: element poison, ailment 40 · Piercing: pierce 2 · Split: count 2 |
| Flask of Pitch | 1 | `meteor`: delay 0.5, small | 25, CD 1 | Wide Splash: radius 40 · Burning Pitch: element fire, ailment 30 · Thrown Twice: count 1 |
| Bone Snare | 2 | **new `trap`**: arms on the ground, snaps when a foe is near; 3 armed at most | 20, CD 4 | Three at Once: count 2 · Wide Jaws: radius 40 · Venom Jaws: element poison, ailment 40 |
| Smoke Step | 4 | `blink` | CD 7 | Far: range 40 · Quick: cooldown 35 · Choking Cloud: element poison, ailment 40 |
| Miasma | 6 | `blizzard`, element poison | 30, CD 6 | Lingering: duration 50 · Creeping: radius 30 · Thick: damage 30 |
| Rain of Rot | 9 | `toxic_rain` | 35, CD 5 | Downpour: count 4 · Spreading: radius 30 · Burning Rain: element fire |
| Leech Swarm | 12 | `chain_lightning`, element poison | 22 | Long Swarm: chain 3 · Gorged: damage 30 · Hungry: ailment 40 |
| Quarantine | 15 | `war_cry`: 8 s, +25% speed, +20% crit, no ailments | CD 20 | Long: duration 50 · Shared: radius 100 · Quick: cooldown 30 |

### The Gravewarden: summoner
Broad, gravedigger's hat, swings a spade (`LIB/core/hafted_tool` with `head=shovel`, already in the store). **Dirge**
(max 100): +8 per corpse falling within 12 m, +5 per Spade hit, +2/s in combat.
Allied actors are the one big new system here; followers share it (`Team::Hero`, `Actor.master`, brain
targets monsters). Thralls: skeleton look, follow, attack, die in 3–4 hits, respawn by casting.

| Rite | L | Base | Cost, cooldown | Tones |
|---|---|---|---|---|
| Spade | 1 | `slash`, 2-swing | builds | Keen Edge: damage 20 · Long Handle: range 30 · Frost-Turned: element cold, ailment 30 |
| Raise Thrall | 1 | **new `summon`**: up to 3 | 30, CD 1.5 | Bigger Flock: count 2 · Burning Dead: element fire · Hard Bones: damage 40 |
| Corpse Burst | 2 | `frost_nova` at the nearest corpse in 12 m, uses `power_corpse` | 20, CD 1 | Wide: radius 35 · Cold Bodies: element cold, ailment 30 · Two at Once: count 1 |
| Fresh Earth | 4 | `blizzard`, physical: slows 50% | 20, CD 8 | Deep: duration 50 · Wide: radius 30 · Grasping: damage 30 |
| Bone Furrow | 6 | `earthsplitter` | 30, CD 5 | Long: count 3 · Wide: radius 30 · Rotten: element poison, ailment 40 |
| Go to Ground | 9 | `blink`: sinks, 0.6 s untouchable, erupts | CD 8 | Far: range 40 · Quick: cooldown 35 · Erupting: damage 40 |
| Funeral Cry | 12 | `war_cry`: self and thralls +30% attack speed | CD 15 | Long: duration 50 · Wide: radius 60 · Quick: cooldown 30 |
| Mass Grave | 15 | `meteor`, huge; what it kills rises as a thrall for 12 s | 50, CD 20 | Wide: radius 40 · Deep: duration 60 · Quick: cooldown 30 |

### Vows (3 slots, opening at L5, L10, L15; each is a stat block or an engine power)
| Class | Vows |
|---|---|
| Penitent | Unmoved (`stand_firm`) · Mortification (rites also cost 2% life, +25% damage) · Red Fervour (`frenzy`) · Last Rites (`execute`) · The Second Stroke (`echo_strike`) · Iron Skin (+30% armour) |
| Carillon | Sympathetic Strings (`storm_call`) · Hum of Winter (`frost_crits`) · Quick Rounds (`quickening`) · Warding Note (`mana_shield`) · Three Small Bells (`orbit_blades`, drawn as bells) · Wide Voice (+20% area) |
| Plaguewright | Hot Pitch (`fire_trail`) · Light Feet (`dodge_reset`) · Bursting Bodies (`corpse_burst`) · Aura of Rot (`ignite_aura`, poison) · Long Shot (+25% range, +5% crit) · Steady Hands (+15% attack speed) |
| Gravewarden | Bursting Bodies (`corpse_burst`) · Grave Air (`ignite_aura`, cold) · Long Shift (+1 thrall) · Warding Dirge (`mana_shield`) · Tithe of Bone (`quickening`) · Heavy Spade (+30% melee damage) |

---

## 7. Items and town

**Slots:** weapon, off-hand, helm, body, gloves, boots, belt, amulet, ring ×2 (`EquipSlot` as is). Keep
bases and affixes as a system; rename all of it to fit (rusted, parish, reliquary, saint's...). Worn gear
shows on the puppet, as now.

**Rarity ladder:** Plain (bone white), Hallowed (cold blue), Storied (gold), **Relic** (ember orange, tall
beam, a chime in the toll motif), **Regalia** (verdigris green). Shape as well as colour: Storied and up
get a mark on the name so colour alone never carries it. Gold and motes pick up by walking near. Items
are personal in co-op. **Item level follows the zone.** Elites drop more; bosses shower.

**Relics:** 16, each an engine power with a lore line in voice. Each a legend of the vale. Keep the
power and numbers from `engine/game/uniques.toml`, change the rest.

| Relic | Slot | Power |
|---|---|---|
| The Undertaker's Mercy | gloves | `corpse_burst` |
| Winter Psalter | off-hand | `frost_crits` |
| Tithe of Red Coin | ring | `blood_magic` |
| Last Rites of Saint Orrin | weapon | `execute` |
| Cinder-Soled Pilgrim's Boots | boots | `fire_trail` |
| Three Small Mercies | amulet | `orbit_blades` (bells) |
| The Second Stroke | weapon | `echo_strike` |
| Gravedigger's Knee | belt | `dodge_reset` |
| Ringer's Rope of the Tempest | belt | `storm_call` |
| Bell-Bronze Buckler | off-hand | `block_nova` |
| Smouldering Mitre | helm | `ignite_aura` |
| Penitent's Anchor | boots | `stand_firm` |
| The Falling Saint | weapon | `meteor_slam` |
| Wolfsbane Cup | ring | `frenzy` |
| Voice of the Cloister | body | `mana_shield` |
| Hourglass of the Sexton | amulet | `quickening` |

**Regalia:** one 4-piece set per class (a new `set` key on items; the `Sheet` counts pieces). 2 pieces: a
stat. 4 pieces: a build-changer.
- *Hair and Iron* (Penitent): Scourge's third swing casts a free Grave Furrow.
- *The Ringing Chamber* (Carillon): at 5 Changes, the next rite casts twice.
- *The Doctor's Rounds* (Plaguewright): poisoned enemies burst on death and spread it.
- *The Last Shift* (Gravewarden): thralls explode on death and rise again free.

**Gems:** Bloodstone (damage or life), Seaglass (resource or armour), Jet (crit or resist), Verdigris
(gold and find); tiers Chipped, Cut, Flawless; three combine into one. Weapons and bodies roll 0–2 sockets.

**Materials:** Scrap (Plain, Hallowed), Relic Dust (Storied), Saint's Ash (Relic, Regalia).

**Vespergate services.** One verb set per person, on one big screen each (§9).
| Who | Verbs |
|---|---|
| Hob Cullender, founder | Buy, Sell, Salvage, Reforge (materials and gold make a Storied item for a slot) |
| Madam Ottoline Quire | Socket, Set gem, Pull gem, Combine |
| Sister Aveline Pell | Tune (reroll one affix), **the Reliquary** (destroy a Relic to keep its power; three slots, Weapon, Armour, Jewel, hold one stored power each; costs Saint's Ash) |
| Goody Farthing | Sealed boxes by slot: Hallowed 60%, Storied 22%, Relic 3% |
| Sexton Mabry | Quests, Tally, Difficulty, Tomes read back |
| Your coffin | Stash, shared by all heroes: 40 items, by slot |
| Lychstone | Waypoints, Undertoll |
| Lisbet, Anselm (once met) | Hire one follower, solo only. Each has one weapon, one trinket and two rites they choose; barks in the field |

---

## 8. Zones, monsters, bosses

Each floor is a `[[level]]` row in `engine/game/levels.toml`, extended with `zone` and `floor`, painted by
`engine/game/themes.toml`. `Place::Level(n)` indexes the table; past its end comes the Undertoll generator.
Two new grammars beside "rooms and corridors": **open** (wide irregular clearings 30–45 m joined by
8–10 m paths; walls are hedgerow, cliff, dead trees) and **designed** (ASCII room file). Generated floors
are new each visit, as now.

| Zone | Floors, grammar | Theme, light | Mechanics (engine name → ours) | Monsters | Set piece |
|---|---|---|---|---|---|
| **Potter's Field** | 1, designed | Moonlit grey-green, fog, gravestones | Breakable graves, kegs | Shambler, Grave Hound | Rising; holding the lych-gate |
| **Vespergate** (town) | designed | Warm lamps under cold sky; Old Compline huge on the hill behind | — | — | Mabry's grave deepens each visit; townsfolk thin out as the chapter goes |
| **The Lych Road** | 2, open | Dusk blue, ember lanterns | `shrines` → Wayside Shrines; `cursed_vaults` → Cursed Reliquaries; carts to topple | Shambler, Bone Thrall, Grave Hound, Tithe-Taker | The Hanged Men |
| **Undercroft of St. Orrin** | 3, rooms | Bone and candle gold | `crumbling_halls`; `gauntlet` → Iron Maidens (spikes on a beat); `powder_keg` → Blight Kegs | Bone Thrall, Bone Archer, Tithe-Taker, Gargoyle | Gaudry in the Tithe Barn |
| **The Sallow Fens** | 2, open | Sickly green, rain, fireflies | `totems` → Tacet Effigies; bog (slows) | Bog Wight, Carrion Moth, Hush Sister, Tithe-Taker | Three rites; Lisbet |
| **The Drowned Chapel** (optional) | 1, rooms | Black water | `lightless_deep`: wells to light | Bog Wight, Hush Sister | Tome, sure relic |
| **The Bellfoundry** | 2, rooms | Black iron, molten orange | `molten_floor`, kegs, `gauntlet` as drop-forges | Slag Golem, Bell-Beetle, Hush Sister | Prioress in the Mold Pit |
| **The Great Belfry** | 3, designed short arenas | Bronze, storm, lightning | `windways`, `crumbling_halls` | Gargoyle, Choir Shard, Slag Golem | The climb |
| **The Bell Pit** | 1, designed | Black pit, the bell above | Ropes | The Bellwether | Finale |
| **The Bishop's Geese** (secret) | 1, open | Absurdly sunny meadow | — | Geese in tiny mitres, with narration straight-faced | Geese |

Remove `frozen_lake`, `time_rift`, `rift_gates` unless you want them for the Undertoll. Dress floors from
`engine/game/props.toml` with the gothic kit (§10). **Density:** 60–120 monsters a floor, packs of 6–18, big
fights 30–40 on screen.

### Monsters (`engine/game/monsters.toml`; bipeds use the engine's clips)
| Family | Body, archetype | Skills | Look and behaviour |
|---|---|---|---|
| Shambler | biped, melee | `claw` | Grey, shrouded. `QUATERNIUS/Zombie_*`. Slow, many |
| Bone Thrall | biped, melee | `smash` | Thin limbs, pale, rusted blade; bursts into bones |
| Bone Archer | biped, ranged | `spit`, as a bolt | Keeps its distance |
| Grave Hound | quadruped, charger | `bite`, `gore` | Lopes in packs |
| Carrion Moth | blob with `wings`, swarm | `bite` | Small, erratic, dozens |
| Tithe-Taker | biped, caster | bolts, summons Shamblers | Hood, iron mouth-bar. Silent |
| Hush Sister | biped, stalker | `blade_dash`, teleport | Blinks behind you; a small version of the Prioress's Hush on hit |
| Bog Wight | biped, tank | `stomp` | Bloated; poison cloud on death |
| Gargoyle | biped with `wings`, charger | `leap_slam` | **A statue until you are near.** Stone skin |
| Bell-Beetle | beetle, bomber | blast | A small bell on its back rings faster as it nears you |
| Slag Golem | biped, tank | `smash`, burning ground | Glows through its cracks |
| Choir Shard | blob, floating, caster | beam, nova | A faceless gold head and halo |
| **The Magpie** | small biped, flees | none | In a dead man's coat with a stuffed sack and a stolen altar bell. Appears at random, flees, drops coins as you hit it; dives down a bolt-hole after 20 s; killed: a loot shower and a jingle |
| Goose | blob or lizard | `bite` | Mitre. Honk |

**Elites.** *Accursed* packs: 3–5 blue, one shared affix. *Damned*: gold, named by the generator
("Gorrel the Unrepentant"), 2–4 affixes, with minions. Rename `engine/game/monster_affixes.toml`: **Molten**
(burning trail, burst on death), **Hoarfrost** (`frost_touched`), **Sparking** (`storm_touched`), **Pestilent**
(`venomous`), **Slipping** (`teleporting`), **Tithe-Lord** (`warlord`), **Broody** (`brood`), **Wrathful**
(`enraging`), **Warded** (`arcane_shield`), **Leeching** (`vampiric`). Add two signature ones: **Tolling** (rings
expand from it every 5 s) and **Jailer** (roots you for 1.5 s, with a telegraph). Affix names show under the
target's bar.

### Bosses (`engine/game/bosses.toml`; phase scripts exist)
Each has a designed arena, an entrance (the engine's boss entrance beat), ground telegraphs for every big hit,
a line per phase, a guaranteed relic the first time, and a shower of loot.

**Ser Gaudry Vane, the Tithe Knight.** Biped, scale 2.2, greatsword and a great ledger on a chain.
- 100%: sweeps. **Assessment:** rings mark where you stand; they erupt 1.2 s later.
- 70%: **Collection:** four Bone Thralls climb out of the walls. "The tithe is due!"
- 40%: **Arrears:** charges three times along telegraphed lanes.
- 15%: **Foreclosure:** enrages.

**Prioress Amarante.** Slim caster, scale 1.3, teleports between four platforms in the Mold Pit.
- **The Hush:** a slow ring spreads; caught in it, you can use only Rite 1 for 2 s. Roll through it.
- 66%: Hush Sisters. Molten bronze rises in quadrants, with warning.
- 33%: she stops mid-fight and speaks. Then all at once. Below 5% the cutscene takes over.

**The Bellwether.** Scale 4.5. Biped, `wings`, a shepherd's crook, and **a bronze bell for a head** (a prop
drawn at the head anchor with `emit_asset`; tiny `head_radius`). Bell Pit: a 30 m round arena with four
ropes at its rim and the cracked Old Compline hanging above. Aveline is at the ropes.
- **Toll:** every 12 s, after a three-count of rising bell strokes, a ring of force expands from the boss:
  the screen-distortion ring is the picture, the bell is the warning. Roll through it, or stand by a
  Still Stone. **The audio is the telegraph; the visual must work alone too.**
- **Ropes:** a rope lights every 20 s. Hold interact 1 s beside it: Old Compline rings, the boss is stunned
  5 s and takes 50% more damage. Bots must use them. Works solo; great with four.
- 100–66%: crook sweeps, the Flock spawns at the rim.
- 66–33%: hovers; beams turn like a wheel; floor tiles crumble.
- 33–0%: the bell-head cracks; tolls come faster. The Prioress's voice helps one last time: "Now, little
  corpse. It is listening to itself." At 0: slow-motion, the great bell falls, the Compline cutscene.

---

## 9. Screens

### Rules for every screen (10-foot, controller-first)
- Design for a DualSense, or any pad the browser reports in the standard mapping, on a TV at 10 feet. Keyboard and mouse get **the
  same game on the same screens, not a separate desktop layout**, but they must feel native, not like stand-ins for pad buttons (§5).
- At 1920×1080: safe margin 96 px sides and 54 px top and bottom. Body text at least 28 px, no text under
  24 px, headings 40+, menu items 72 px tall at 36 px, at most 7 items in a column. Scale by screen
  height, with a UI scale setting (100, 125, 150%).
- **One thing focused at a time**, always clearly lit. A card shows the focused thing's detail. No
  hover-only information, no tiny icon grids, no tables of stats, no scroll bars except for long text.
- Build a shared **focus layer** in `pav_ui`: screens declare focusable items with ids and rects; the layer
  turns D-pad, stick, arrows, Enter, Esc, mouse hover and click into the same actions by geometry. Hover
  moves focus. Click confirms. Everything is reachable by pad **and** by mouse. Draw with `egui::Area` and
  the painter, not desktop `Window`s. Remove the stick-driven cursor.
- **Prompts follow the last input used:** PlayStation shapes for pad (Cross, Circle, Square, Triangle, L1,
  R1, L2, R2, D-pad, Options), or Xbox A B X Y and LB RB LT RT Menu if chosen in Settings; keycaps and
  mouse-button icons for keyboard and mouse. Draw glyphs as vectors in one `Prompt` widget. Hide the
  pointer when the pad was used last.
- Every screen says at the bottom what its buttons do, right-aligned, with glyphs.
- Fonts: fonts are allowed. Fetch a heading face and a body face with open licences (Cinzel and Alegreya
  suit), `include_bytes!` them, and credit them. If the fetch fails, use egui's.
- Frames, bars and icons are code-drawn in bell-bronze and bone; rite icons are vector marks.

### Flow
**Title** → press any button → **Main menu** → New Hero or Continue → play. 10 s idle on Title, Main menu
or class select starts attract.

- **Title:** a 3D night churchyard, the cracked bell against the sky, falling ash. The title, big. "Press
  any button" (or "Press any key" on keyboard). Music starts on first input: browsers keep sound off until
  then. Try `resume()` on pad presses too; if the context stays suspended after a pad press, show a quiet
  line "Press a key or click to wake the bells".
- **Touch-only device** (`(any-pointer: fine)` false, no pad seen, no key pressed): **no touch controls.**
  The Title shows "Controller or keyboard required" and one big Settings button that a tap opens. Attract
  still runs after 10 s, and a tap leaves it. Taps reach the focus layer as clicks, so Settings work by tap. A pad
  connecting or a key press restores the normal Title.
- **Main menu:** Continue (hero, class, level, current quest) · New Hero · Co-op on This Screen · Settings ·
  About & Credits.
- **Class select:** four pedestals in a crypt, each hero performing a showreel (`hall.rs`). Left and right
  move. Card: name, one line of fantasy, resource, three rites. Then name (typed if on keyboard; on pad a
  list of period names, Square rerolls). Then difficulty (one line each). Then Q1.
- **HUD:**
  - Bottom left: life gauge, a bronze bell-shaped gauge filling with red. Bottom right: resource gauge, in
    the class's colour. These are ours, not the source's orbs.
  - Bottom centre: six 96 px rite slots, each tagged with its button glyph, cooldown as a sweep; Gin and
    dodge charges beside them; XP bar under.
  - Top centre: target nameplate and bar, affixes under it. Boss bar wider, with its title.
  - Top right: small map, one line of objective under it.
  - Toasts: loot worth seeing, Harvests, quest steps; big centre banner on entering a zone.
  - World: damage numbers (setting), small bars on damaged elites only, ground telegraphs, seat-coloured
    ring and name for co-op heroes.
  - Co-op: small plates at left for other heroes.
- **Hero screen** (L1/R1 tabs; the world keeps running in a session, pauses otherwise):
  - **Gear:** the hero in the middle, ten slots ringed round them; focus moves round the ring. Three big
    numbers at top: **Damage, Toughness, Recovery**. Focused slot: a large item card (name, rarity, up to 6
    lines). Confirm opens a strip of what you carry for that slot, five cards at a time; each card shows ▲▼
    on the three big numbers against what's worn. Confirm equips, Square salvages, Triangle marks as junk.
    "Details" is a second page, not a denser first page.
  - **Rites:** six slots laid out like the pad's buttons. Confirm a slot: pick a rite from a list; then one
    of its three tones, one card each. Vows on a second row.
  - **Journal:** current objective big; story so far; Tomes, one page each.
  - **Map:** the floor drawn large. On a Lychstone: travel list.
- **Service screens** (§7): a full screen with the person's portrait, their verbs as tabs, big cards. Never a
  grid. Portraits are code-drawn 2-tone vector silhouettes with a moving mouth, as for villain slide-ins.
- **Pause:** Resume · Hero · Settings · Controls · Dev Mode · About & Credits · Save & Quit. In a session:
  Settings and Controls only, and it never pauses.
- **Settings:** Audio: **Music 10% by default**, Effects 80%, Voices 80%. Controls: Controller glyphs
  (PlayStation or Xbox), Rumble (`vibrationActuator` on big hits), Aim assist (pad targeting on or off). Display: UI scale, Camera (Near, Middle, Far), Damage numbers,
  Screen shake, Full screen, Graphics quality. Subtitles size.
- **Controls:** the table of §5 for the device in use.
- **About & Credits:** paged, large type: the Source Information, Testing Feedback, Engine Feedback and
  Prompt Feedback of §16, all from `engine/game/about.toml`, then credits: engine, clip and prop libraries
  with their licences (`engine/assets/props/CREDITS.md`, each `engine/anim/*.json`'s `credit`, `engine/store/licences.tsv`),
  fonts. Usage says "added on import".

### Attract mode (`engine/game/attract.toml`, `arpg/attract.rs`)
A throwaway `Game` with saving off, the bot at the wheel, cheats on (no damage, no cost, no cooldowns,
teleports). Wall-clock 10 s idle (not ticks: the sim crawls in software rendering) on the Title, Main menu or
class select starts it; **any** key, click, real mouse move, pad button, stick past 0.4 or tap goes back to
the Title. A list of vignettes with an engine screen transition between them, looping for ever, with a
"Demo" tag, a caption and "Press any button":
1. Potter's Field: a hero claws out of the grave. Vespergate: Mabry talks in gibberish, Hob shouts, the coffin opens.
2. Penitent on the Lych Road: crowd, kegs, chandelier, Harvest banner, loot shower.
3. Carillon in the Undercroft against a Damned pack: Changes, the Great Knell, a relic beam; the Gear screen as the bot equips it.
4. Plaguewright in the Fens: snares, the Magpie chase, its shower.
5. Gravewarden in the Foundry: thralls, Mass Grave, molten floor.
6. Four bots in the Undertoll: co-op plates, the Peal filling, the Warden.
7. The Great Belfry, then the Bellwether: wind, the toll ring, a rope, the bell.

Its job is to show as much of the game as it can. It never touches saves.

### Dev Mode (pause menu, not in a session)
Tabs, all by pad and mouse.
- **Balance:** live sliders with a value readout and **Reset to defaults**, all as `impl Tunable` under
  `balance.*`, extending `arpg::Difficulty`, so they're also in `pav params`:
  player damage, player life, enemy life, enemy damage, enemy speed, pack density, elite rate, XP, gold, drop
  rate, relic rate, mote chance, Gin cooldown, resource gain, cooldown scale, hit-stop, shake, co-op life per
  player, co-op damage per player.
- **Cheats:** God, one-hit kills, no cost, no cooldowns, no-clip, reveal map, freeze AI, time scale
  (0.25–4×), kill all.
- **Hero:** set level, add XP, add 100k gold, full materials, grant every rite and tone.
- **Spawn:** family, rarity, affix, count; any boss; the Magpie.
- **Items:** any relic, any regalia set, an item by slot and rarity.
- **Go:** any zone and floor, any Undertoll Depth, town, any quest step, the ending, the credits.
- **Show:** frame and tick stats, nav grid overlay, hit circles, aggro lines, entity list; play any music state or
  voice line; engine tuning panel and its system keys.

---

## 10. Art and animation

**Base: the engine's native look**, procedural primitives and materials lit by real lights with shadows, plus
its own filters. Add one look, `[[look]] name = "Compline"`, in `engine/crates/pav_view/src/looks.toml`, applied from
`place_look`. The planner compared the engine's 21 looks on a crypt floor: **ink outlines over the native
materials read far best** at distance ("Cartoon" tile 8), and full paint filters smear the architecture. So:
`view.outlines` on at about 2 px with a heavy `outline_darken`, `cel_bands` 3–4, `view.saturation` about 0.8,
`filter.contrast` about 1.1, `filter.vignette` modest, per-zone `haze` and `halos`, like an inked woodcut with
candlelight in it. Compare with `look bench`.

**Camera:** tilt 56°, distance 20, fov 38 (Shardfall's are 62, 18, 40). Camera setting: Near 17, Middle 20, Far 24.
`view.cutaway.*` on, so walls never hide a hero. Judge at 1920×1080: a hero should stand about 7% of screen height.
Boss and cutscene moments may move it: add a `GameFrame` camera override with smooth blends.

**Light is the art direction:** dark world, pools of warm candle and cold moon, with every magic effect a real
light. Colour by zone (§8). Monster elements and telegraphs stay readable through grade and vignette.

**New props (format-2, primitives; publish to `LIB/core`):** headstones (3 variants), mausoleum, iron fence,
lych-gate, gibbet, gallows, tomb slab, sarcophagus, coffin (open, closed), pew, lectern, censer stand, pointed arch,
lancet window (glowing), rose window, flying buttress, weeping saint statue, gargoyle perch, chandelier (breakable),
small bell, **great cracked bell** (6 m), bell frame, dead trees (2), reeds, bog lantern, crucible, mold, drop-forge,
gear wheel, scaffold, rope with handle, Still Stone, wayside shrine, broken pump; weapons and gear `censer_flail`,
`bell_staff`, `hand_bell`, `crossbow`, `pitch_flask`, `beak_mask`, `wide_hat`, `gravedigger_hat`, `mouth_bar`. Each
gets a look at the game camera (`asset_preview views=true elevation=game`). Generic props may come from the library
(`assets shelf=prop`, `assets find=`): barrels, crates, candles, chains, cages, anvils, rubble.

**Effects** (view code + particles + lights): bell rings (`distortion` plus an expanding mesh), toll shockwaves, ember
wake, ash fall, chain arcs, poison clouds, thrall rises (dirt burst), relic beams, level-up ring of bells, soul wisps
off corpses, ember and rain ambience per zone.

**Animation: the engine's own system.** Procedural biped, moves in `engine/anim/moves.toml`, clips from `engine/anim/*.json` on
`idle_clip`, `walk_clip`, `run_clip`, `death_clip`, `attack_clips`, `attack_moves`, `dodge_clip` in looks. Check with
`animsheet` and `filmstrip`. New work:
- **Moves:** flail swings on long arcs (with verlet chain following the censer), crossbow aim and shot, flask throw, spade
  chops and dig, bell-staff strike, hand-bell ring.
- **Clips to find or author** with `assets find= kind=clip` and `anim_edit`: rising from a grave (`MESH2MOTION/Zombie_Rise`),
  gravedigging loop for Mabry, Hob hammering, Aveline pulling a rope one-armed, Tacet kneeling, the Prioress' levitating idle, the
  Bellwether's slow walk and crook sweep, goose waddle. Each hero's level-up and triumph gesture.
- **Monster gaits** per family from the clip tables, so nothing shares a walk with its neighbour.

---

## 11. Audio

**All sound is written in code, with no audio files.** Extend `engine/crates/pav_audio`. Three buses over the `Mixer`:
Music (**default 0.10**), Effects (0.80), Voices (0.80), persisted in settings. In a session, the `end` message stops all
sound.

**Bell synthesis** is the game's signature. One function: additive inharmonic partials at ratios about 0.5, 1, 1.19,
1.5, 2, 2.5, 2.67, 3, 4, each with its own decay, plus a noise strike. Add a detuned beat for the cracked Old Compline.
Used in music, tolls, UI and loot.

**Music** (a small sequencer, data in `engine/game/music.toml`, generated at runtime, crossfading at bar lines). Original
throughout: write your own motif on a three-note cell of D, A, B♭, and don't imitate the source's themes. No solo guitar in
town.
| State | When | Sound |
|---|---|---|
| Title | Title, attract | Slow toll motif, deep drone, far-off wordless choir of formant voices |
| Dread | Exploring | Drone, sparse bell strokes, chant fragments; D Phrygian, about 60 BPM |
| Battle | Enemies near (intensity from count within 12 m) | Adds low drums (sine thump + noise), saw ostinato; layers in and out, not a hard switch |
| Town | Vespergate | Hurdy-gurdy drone (saw + LP) and handbells; tired, kind |
| Boss | Gaudry, Prioress | Battle plus a theme per boss: a pompous march, a silence-heavy one with rests |
| Bellwether | Finale | The tolling tritone, full choir; ducks for each toll |
| Ending | Compline | The title motif resolved to major, once |

**Effects** (make `sounds_for` data-driven: a `SimEvent::Sfx { id, pos }` and patches in `engine/game/sfx.toml`): about 60, each
with pitch variation: hits by element and weapon, crits, flail whoosh and chain rattle, crossbow, bell cast, spade, thrall rise,
footsteps by surface, breaking wood, stone and pot, keg blast, body falls, gore, gold, mote, Gin (a gulp and a cough), loot by rarity
(Relic's chime is unmistakable), level up, shrine, portal, hand-bell, UI move, confirm, back, quest, boss entrance, and monster calls per
family: moaning, chitter, honk. The Tacet make no sound at all.

**Voices: Animalese-style gibberish** (`engine/game/voices.toml`), played as a line's subtitle appears. Each letter of the line maps to a
short syllable: a formant pair per vowel, a noise tick per consonant; the same word always sounds the same. Add a formant
filter to `Patch`. Per speaker: base pitch, rate, formant shift, breath, growl. `?` rises, `!` is louder, capitals (Hob, the Bellwether) are
loud and slow. The Prioress: a whisper, unvoiced noise only. The Bellwether: pitched bell partials as syllables. Monster
barks use the same engine.

Check it headless: `pav audio_capture` writes a `.wav` (§13).

---

## 12. Multiplayer

### Modes
| Where | Mode | How |
|---|---|---|
| **In an AI Hub session** | `shared-world`, 1–4 seats, 8 minutes | The round below, online through the hub |
| **On its own** | Solo, plus **Co-op on This Screen**, up to 4 pads and/or keyboard on one TV | Same multi-hero sim, no network. "Online" is the hub's job: its lobby, invite and network are what the protocol gives you, and outside a session the game opens no sockets |

Read `tools/hub/README.md` (the protocol) whole before M7. It wins over this section.

### The page
`engine/web/index.html`, in order: `<meta charset>`, then **`tools/hub/session.js` pasted unmodified as the first script**, exactly one
copy (`engine/scripts/pack_single_html.py` reads it from disk and inlines it; the hub checks its SHA-256), then:
```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="8">
<meta name="hub:session-goal" content="Fill the Peal, slay the Warden, top the Glory count">
<meta name="hub:session-howto" content="Move: stick/WASD · Rites: face buttons, or mouse + 1-4 · Dodge: L1/Space">
<meta name="hub:webgpu" content="required">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
```
`hub:players` counts players on one screen: make it `1` if Co-op on This Screen is cut. Keep `<title>` as "Title — tagline", a real `description`, `theme-color`, and a `data:` SVG bell icon: the hub's catalogue reads them.

Then a **JS shim, in `<head>`, before the game loads.** This pattern passed the harness with real wasm copies. Protocol timing lives here, because a
frame may take over a second under software rendering:
```js
const hub = (window.__hub = { inbox: [], standings: null, scores: null, info: null, waiting: AIHub.active });
if (AIHub.active) AIHub.connect({ mode: 'shared-world', seats: [1, 4] }).then((info) => {
  hub.waiting = false;
  if (!info) return;                     // no hub after all: play on as usual
  hub.info = info;
  if (!navigator.gpu) return AIHub.fail('This game needs WebGPU.');
  for (const e of ['start', 'leave', 'end']) AIHub.on(e, (d) => hub.inbox.push({ k: e, d }));
  AIHub.on('start', () => setInterval(() => AIHub.send({ t: 'hb' }, { reliable: false }), 1000)); // a crawling copy still talks
  AIHub.on('message', (d, from) => hub.inbox.push({ k: 'm', d, from }));
  AIHub.on('time-up', () => {            // answer now, not at the next frame
    if (info.isHost) AIHub.finish({ standings: hub.standings ?? [AIHub.players.map((p) => p.id)], scores: hub.scores ?? {} });
    hub.inbox.push({ k: 'time-up' });
  });
});
```
Rust (`pav_app`, a new `hub.rs`, wasm only): at boot, holds on a plain "Connecting" while `__hub.waiting` is true (the hub answers within 10 s; `info` stays null if there is none, and
the game then starts normally). Then it reads `__hub.info`, drains `inbox` each frame, calls `AIHub.send`, `AIHub.ready` (once the world is
built, with no key press), `AIHub.finish`, `AIHub.fail`, and writes `__hub.standings` and `scores` every second. Use `js_namespace` extern functions,
**no `inline_js`.** `AIHub.time()` is the shared clock; input is locked while it's below 0, with a large 3-2-1 over the world. **`ready()` has a deadline:** the harness allows 20 s from load, a real hub 45 s. Build the first floor quickly and keep trying until it has been sent; don't wait for the first drawn frame.

**Session rules:** straight into the round, no title, attract or menus; no Dev Mode, no save prompts; pause never pauses; no Quit; no dialogs; no text entry;
names and colours only from the hub (`#e8443a`, `#3b82f6`, `#22c55e`, `#f5b700` by seat); no chat, emotes or pings. Use the hub's own card through the metas: it
works as it is, and a custom card is optional polish (§15). On `end`: no input, no sends, no sound.

### The round: the Vigil
A shortened Undertoll run, the same for every copy from `info.seed`: three floors, each with a Peal and a Warden; the third Warden's death wins. Seats get heroes: 0 Penitent,
1 Carillon, 2 Plaguewright, 3 Gravewarden (cycle if you shipped fewer). All level 12, with a fixed session kit from data and a sensible bar. Loot, levels and motes during
the round work as usual; personal loot; a one-button "Equip" prompt on anything better. No town.

**Glory:** kills ×1, elites ×25, Wardens ×100, revives ×50, deaths ×−25. On win or `time-up` the host calls `finish({ standings, scores, won, stats, awards })`: standings by
Glory, `won` true if the last Warden fell; stats: Kills, Deaths, Revives (6 names max, 16 chars); awards such as "Most Harvests" (3 max). A leaver is removed and monsters rescale.
Host leaving voids the round: the hub tells every copy; show "The host has gone" and stop. **`AIHub.server` true:** the host copy has no hero, camera, input or drawing, and still runs
the world and calls `finish`.

### Netcode: thin guests that own their feet
Host authority, with each player owning their own position. It follows the protocol's "Shared world" section (each copy sends what its own player does; the host runs the rest), is far smaller than `engine/docs/COOP_PLAN.md`, and fits the hub's limits.

- **Same level everywhere:** every copy builds floors from the same seed with the same build. Host sends a hash of the floor at each floor start; mismatch on a guest calls `AIHub.fail`. A test
  guards this.
- **Host:** runs one full `Game` with one `HeroSlot` per player: all AI, monster movement, all damage, loot, quests, Peal. Remote heroes are placed where they say they are; their rites
  run from their cast messages. Slots use their own `Hero` sheet.
- **Guest:** runs its own `Sim` with `Game` in **mirror mode**: no AI, no damage, no rewards. Its own hero moves locally with no delay and collides locally. Pressing a rite plays its
  animation, effects and sound at once (`fire_cast` with a `cosmetic` flag) and tells the host. Monsters and other heroes are remote-driven puppets: a target position fed from the stream with
  velocity set, so the procedural walk animates (`engine/docs/COOP_PLAN.md` C0's `Character.remote`). Hits, deaths, floaters and loot come as events. The guest's menu actions are `GameCmd`s
  sent to the host, which sends back that hero's state.
- **Interpolation:** mirrors render 200 ms behind `AIHub.time()`, extrapolate up to 150 ms, then hold; corrections blend over 100 ms.
- **Multi-hero rules** (`engine/docs/COOP_PLAN.md` §3 lists the places): monsters target the nearest living hero, sticky; a flow field per targeted hero; aggro, crumbling floors and mechanics check
  any hero. **Hit-stop can't slow a shared world:** in a session `time_scale` stays 1 and only the local hero and what it struck hold their pose. No pause, speed or rewind.

**Messages (JSON, short keys, integers in decimetres):**
| Key | Direction | Rate, delivery | Holds |
|---|---|---|---|
| `w` | host → all | 10/s, `reliable: false`, **≤ 1,100 characters** | Clock; every hero `[seat,x,z,yaw,hp%,res%,flags,act]`; up to about 40 actors `[id,x,z,yaw,hp%,flags]`, those nearest any hero first, round-robin past the cap |
| `e` | host → all | ≤ 5/s, reliable, ≤ 14 KB | Batched: spawn (id, family or genome seed, level, rarity, affixes, pos), die (id, killer, impulse), cast (id, rite, aim), hits (merged), floaters, loot (owner, item, pos), picks, breaks, Peal, quest, banners, boss lines, hero sheets on change |
| `f` | host → all | reliable, on floor start | Floor index, seed, hash |
| `me` | guest → host | 10/s, `reliable: false` | Clock, x, z, yaw, velocity, flags (rolling, channelling) |
| `c` `i` `g` | guest → host | reliable, on use | Cast (slot, aim), interact (id), `GameCmd` |

**Own a Rust `SendBudget`: never more than 18 messages a second per copy, never a message over 16 KB.** The client drops anything past its limit and logs `[AIHub]`, and hub-check fails on any such
warning. Oversized batches split; unreliable messages above about 1,200 bytes are lost whole on one lost packet, which is why `w` is capped.

**Put all of this logic in `arpg/net.rs`, pure:** a per-tick `NetInbox` and `NetOutbox`, no IO, so tests run 2–4 full `Sim`s in one process with a `SimNet` of seeded latency, jitter and loss (§13), far
faster than real time. `engine/crates/pav_app/src/hub.rs` only carries bytes. Add one `coop` tool to `pav`: `coop players=4 latency=150 jitter=50 loss=0.05 bots=true seconds=120`.

### Co-op on This Screen
The same `HeroSlot`s with `NetRole::Solo`. Main menu screen: each pad presses Cross to take a seat and a hero from the roster (one per seat), or a new one at the party's level. One camera on the
centroid, pulling out up to 30%; a hero over 20 m away is pulled in. Plates at left. A full-screen menu belongs to the pad that opened it, and the world pauses for it. Keyboard and mouse can hold one seat.

---

## 13. Testing

**One command: `tools/check.sh [core|playthrough|net|ui|audio|web|hub|all]`.** It prints only failures and a single line of counts. Rerun only the group covering what you changed. Screenshots only for what a script can't
judge. Test as much as you like with headless tools, but don't use subagents or workflows to debate, review, judge or audit.

| Group | How | What it proves |
|---|---|---|
| `core` | `cargo test -p pav_core --test <your suites>`, and `pav` tools | Every class's resource rule; every tone changes its rite; vows; relics, regalia, gems, salvage, Reliquary; every elite affix fires; every boss phase (the test sets the boss's life); toll hits unless rolling; ropes stun; each quest step; Tally; difficulty table; saves round-trip; a bad save doesn't crash; a replay reproduces its hash. **Banned-word grep** over `engine/game/`, UI text and the page |
| `playthrough` (its own group: slow) | A bot-driven **whole-game run per class, 2 seeds**, with a new `pav` tool: `pav playthrough class=... seed=...`: rises, walks the quests, buys and equips, beats all three bosses, reaches credits, then clears an Undertoll Depth. Reports minutes, deaths, level per zone. Fails if it stalls | The game can be finished. About 10× real time, so about 9 minutes a run in a dev build: build `pav` with `--release`, run classes as separate processes, and rerun only after world, quest or balance changes. Also your balance tool, with `campaign`, `loot_roll`, `autoplay` |
| `net` | `cargo test --test coop` over `SimNet`, 150 ± 50 ms, 5% loss | 2, 3, 4 bots finish a Vigil. Own hero never waits. Mirror error median ≤ 0.3 m, p99 ≤ 1 m. Budget never above 18/s or 16 KB. Leave, host leave. Floor hash equal across copies. Standings valid |
| `ui` | `pav ui` extended: `press=down|confirm|back`, reports screen, focus and items | From each screen, every item is reachable by pad path and can be hovered and clicked. Prompts change for pad (PlayStation), pad (Xbox) and keys. Text ≥ 24 px at 1080p. Touch gate shows. Attract timer logic with a test clock |
| `audio` | `pav audio_capture` and a small WAV reader; settings defaults | Music default is exactly 0.10; each music state, effect and speaker is non-silent; speakers differ in spectrum; the page contains no `<audio>` or audio file |
| `web` (slow) | One Playwright script, one browser, plain `python3`, flags from §2, `file://`. Add `window.__game.state()` returning JSON (screen, focus, device, attract, music volume, role) | Boots with no console errors. Title shows. 10 s idle starts attract; a key leaves it. Pad stub (`navigator.getGamepads`, `add_init_script`) walks Menu → Settings → Xbox glyphs. Phone profile with `page.touchscreen`: gate, Settings tap, attract. Never waits on gameplay: the sim crawls here |
| `hub` (slow) | Copy the page and `tools/hub/*` to one folder, serve with `python3 -u -m http.server 0 --bind 127.0.0.1`, confirm the page is your game, open `harness.html?game=<page>&latency=150&jitter=50&loss=5&auto=1&play=8000` plus each of `players=2`, `3`, `4`, `players=3&scenario=host-leave`, `players=2&scenario=server`; read `window.__hubCheck` once `body[data-complete]` is true | All pass. No `[AIHub]` console warnings, no page errors. One pristine client (SHA-256 of 1.4.0, banner to last line, starts `529eac78`; if upstream moved on, use its current release). Then **on its own**: page opens, Enter and Space pressed, `AIHub.active` false, `Math.random` untouched, a screenshot well above a blank page's size |

If `harness.html` fetches a page with spaces or odd characters in its name, serve a copy with a plain name. Harness frames share one main thread, so keep JS light. Keep one or two browsers at a time and stop only what you
started, by PID. `hub-check.mjs` in the hub repo needs the whole repo: use your own small driver as above.

**Look at these yourself at 1920×1080, once per milestone:** a `see` capture of each zone, each boss, each screen with `ui ... image=true`.

**Sound in a browser:** the wasm build opens a real `AudioContext`; `web` only asserts that it exists and resumes. Judge content from `audio_capture`.

---

## 14. Build order

Do these in order; each ends with its checks passing and a page you could ship. Earlier milestones touch what later ones build on, which is why many-heroes comes so early.

| # | Build | Done when |
|---|---|---|
| **M0** | §0's title step. §3 setup, in the dev folder §0 names. `tools/check.sh` skeleton. Reproduce §2 | `pav` runs, a page boots in your Playwright, harness files in place |
| **M1** | Page assembly with client, metas, shim. Screen state machine: Title, Main menu, Settings, About. Focus layer, `Prompt` glyphs, device tracking, settings persistence, touch gate. Pavilion and tech-demo UI gone; system keys gated. `window.__game.state()`. `localStorage` prefix | `ui` and `web` pass for those screens; harness passes with Shardfall's old content standing in |
| **M2** | `HeroSlot` refactor: several heroes in one `Game`, each with its own input, sheet and rewards. Monsters target any hero. Bot per slot. Scaling | Four bots clear a floor natively. Solo plays as before |
| **M3** | Combat and classes: controls of §5 (click-to-move, pad targeting), resource rules, Rites, Tones, Vows, `summon`, `trap`, allied AI, motes, Gin, dodge, Harvest, new looks and weapons. Remove the tree. HUD. Rites screen, Gear screen | Bot per class clears a test floor. Each class looks and plays apart in a `filmstrip` |
| **M4** | World: Compline look, camera, gothic kit, themes, open grammar, zones, monsters, elites, three bosses, Vespergate, quests, dialogue (subtitles alone until M6 adds voices), cutscenes, Tomes, events, Journal, Map | **Playthrough runs to the credits** for one class |
| **M5** | Loot and town: rarity ladder and beams, relics, regalia, gems, materials, all service screens, coffin, Reliquary, Sexton's roll, Tally, followers, Undertoll, the Magpie | `core` passes. Playthrough per class |
| **M6** | Audio: buses, bell synth, music states, data-driven effects, voices on every line | `audio` passes. Listened to by numbers, not ear: levels sane against each other |
| **M7** | Multiplayer: `arpg/net.rs`, mirror mode, `SimNet`, `coop` tool, the Vigil, `hub.rs`, server role, Co-op on This Screen | `net` and `hub` pass |
| **M8** | Attract mode, Dev Mode, class select stage, Secret level, Feats if kept | `web` and `ui` pass |
| **M9** | Polish: effects, lights, breakables on every floor, barks, balance by bot on all tiers, 1080p look pass of every zone and screen, write-through of every player-facing line | `all` passes. Play time and deaths in range |
| **M10** | §16 | Done |

**Balance targets:** first clear on Penance about 90 minutes of game time; bot deaths: under 3 a zone and under 8 per boss for each class; level 20 near the final boss; first relic by the first boss; a relic or regalia piece about every 15 minutes after that.

---

## 15. Cut list

The brief allows no TODOs, placeholders or stubbed features. If you must cut, **cut a whole feature from this list, top first, and remove every trace of it from menus and text.** Never leave a dead button. Record the cut in your exit interview.

1. Custom hub card (never required).
2. Rumble (via `vibrationActuator`, if tried at all).
3. Feats (12 small achievements with toasts).
4. The Bishop's Geese and the hand-bell hunt.
5. Followers (keep allied AI for thralls).
6. The Drowned Chapel.
7. Regalia sets beyond the class you have most tested. Then all of them.
8. Gravewarden, the fourth class. Then Plaguewright. Never below two classes.
9. Co-op on This Screen (the game on its own is then solo; say so plainly in your Prompt Feedback).

Never cut: Title, attract, Dev Mode with sliders, Settings with glyph choice and music at 10%, touch gate, About & Credits, the full chapter with its three bosses, Relics, the Undertoll, `shared-world` in the hub, the voices, the tests.

If shared-world networking truly fails after real effort, the last-ditch fallback is `ghost` mode (each copy runs its own Vigil and shows the others' heroes), with the metas and result calls changed, and the reason written in your exit interview. Try hard not to need it.

---

## 16. Finishing and reports

1. Build the game to its place in the root (§0). From the dev folder:
   `engine/scripts/build-web.sh --single-file --scene <title scene> --title "<Title> — <tagline>" --description "..." --theme-color "#14110f" --out ../<Title>-<Source>-<stamp>.html`.
2. `tools/check.sh all`. Open the shipped file, not a dev copy.
3. **Write the reports below in all three places, which the brief marks as critical:** the in-game About/Credits screen
   (fill in `engine/game/about.toml`, rebuild, confirm the screen shows them), your final chat reply, and the exit interview
   file. Write "unknown" for anything you can't confirm.
4. **Clean up:** delete `engine/target`, `engine/out`, `engine/.git`, any `node_modules` and stray probe pages. They are large or
   would confuse the record. Keep the source, `tools/` and a few useful `shots/`. Stop any process you started.

### Source Information
| Field | Write |
|---|---|
| Date | Your run's date and time, as `YYYY-MM-DD HH:MM:SS`, from your brief |
| Source | The work it's based on: Diablo 3 |
| Plan | The file name of the plan you were given: `PLAN.md` |
| Genre and Perspective | Genre and camera perspective used |
| Tech | Stack, libraries and engines, with versions if applicable; the engine commit from M0 |
| Art Direction | Style used |
| Animation | System used |
| Audio | Music, sound effects and voice used |
| Online | Network features used, or none |
| Testing | Testing parameters allowed |
| Research | Research done, or none |
| Environment | `Claude Code CLI (headless); Linux`, unless your brief says otherwise |
| Model | `Anthropic, <model id>, reasoning effort <level>`, with your run's values from your brief |
| Usage | Exactly "added on import". You can't see your own cost, so don't estimate it: the runner records the real cost, tokens and time, and the agent that imports the game into AI Hub puts them on the About/Credits screen |

### Feedback questions (answer each, in order)
- **Testing Feedback:** How many issues did testing catch? How many would be considered critical issues / game breaking?
  What was the most helpful test you ran? What was the least helpful test you ran?
- **Engine Feedback:** What did you like most about the engine? Did you get stuck or guess wrong? What was the most important
  thing you had to build yourself? What was the hardest part about using the engine? What did you change in the engine, and why?
  (none if nothing) If you could change one thing about the engine, what would it be?
- **Prompt Feedback:** What did you like most about this prompt? What was confusing? What was the hardest thing to do? What would
  you change in this prompt?

### Exit interview file
Before you finish, save it in the root, beside the game's HTML. One JSON object in exactly this shape, every value filled in
("unknown" for anything you can't confirm). Tools read it (the game's run record and the AI Hub catalogue), so write plain text and
check that the file parses as JSON. If your brief's shape differs from this, the brief wins.
```json
{
  "sourceInformation": {"date": "", "source": "", "plan": "", "genre": "", "perspective": "", "tech": "", "artDirection": "",
    "animation": "", "audio": "", "online": "", "testing": "", "research": "", "environment": "", "model": "", "usage": "added on import"},
  "testingFeedback": ["your answer to each Testing Feedback question, in order"],
  "engineFeedback": ["your answer to each Engine Feedback question, in order"],
  "promptFeedback": ["your answer to each Prompt Feedback question, in order"],
  "aiHub": {
    "name": "the game's title, as on its title screen",
    "tagline": "a few words to go under the title",
    "description": "one or two sentences for the catalogue",
    "type": "Game",
    "genre": "RPG",
    "source": "Diablo 3",
    "series": "Diablo",
    "players": "1–4",
    "controls": "the controls, in one line",
    "tags": ["3 to 6 lowercase tags, such as 3d, co-op, fantasy, boss fights, top-down"]
  }
}
```
The values shown for `type`, `genre`, `source`, `series` and `players` are this game's. The catalogue's model, effort, CLI, date and usage
come from the run's record afterwards, so they aren't asked here.

---

## 17. Coverage of the brief

Every request below is also in the brief's own words in §18.

| The brief asks | Where |
|---|---|
| Source, goal, complete vertical slice, every mechanic shown | §0, §1, §4–§8 |
| Genre and camera perspective that best fit | §1, §10 |
| Title: playful riff, 50 silent ideas, real RNG; builder's own | §0, M0 |
| Research: your choice | §0, §2 |
| Package: one HTML named by the brief; deps may be external | §0, §3, §16 |
| Tech: build on the engine's START_HERE, new game, change anything | §0, §3 |
| Art direction on the engine's native style, new assets, library for generic props | §10 |
| Animation on the native system, new animations | §10 |
| Audio in code, no audio files, gibberish voices, music 10% by default | §9 Settings, §11, §13 |
| Online via the hub library | §0, §12 |
| Dev subfolder named by the brief, modules bundled at the end, CDNs allowed | §0, §3, §16 |
| Don't read others' folders; shared ports and processes; `file://` first; server on 127.0.0.1 with an OS port; stop only your PIDs | §0, §13 |
| Performance unlimited; FPS and optimization out of scope | §0 |
| Testing: headless scripts, scripted whole game, one command printing failures and a one-line count, rerun only what changed, few screenshots, no review subagents | §13 |
| Effort: your call | §0 |
| This computer: browsers and tools, stand-ins for pad, touch, sound, second player, iPhone, TV; sharing rules | §0, §2, §13 |
| Capture the source's distinctive world, characters, themes, tone in mechanics, pacing and UX | §1, §4–§8 |
| Infrastructure for later build-out with normal designer tools | §3 |
| Dev mode from the pause menu, standard tools, live sliders, reset to defaults | §9 |
| Attract at 10 s on title and menu, looping, any input exits, may cheat | §9 |
| Multiplayer in the hub and on its own | §12 |
| Narrative tone like the source's | §4 |
| 10-foot, controller-first; standard-mapping pads; native keys and mouse; hover moves focus; prompts by last device; PlayStation glyphs with an Xbox option; no dense screens | §5, §9 |
| Touch-only: no touch controls, "Controller or keyboard required", settings button, attract runs | §9 |
| No TODOs, placeholders or stubs | §0, §15 |
| Source Information and all feedback in chat and on the About/Credits screen; "unknown" rule; Usage line | §9, §16 |
| Exit interview file: place, exact shape, parses as JSON | §0, §16 |

---

## 18. The brief's requirements, word for word

So this plan stands alone, here is what the brief asks, copied exactly, with its run-specific name written in §0's form. Left out: the
computer's inventory of versions, which isn't a request (its rules are in §0); and the Source Information, feedback questions and exit
interview, which are in §16. Your own brief wins wherever it differs.

### Source: Diablo 3

Genre: Pick the game genre(s) that best fit the source and would make the best game.

Perspective: Pick the camera perspective(s) that best fit the genre and source and would make the best game.

Game Title: A playful riff on SOURCE's name. Silently brainstorm 50 titles, then pick one with a real random number generator (e.g., run code).

Research: Whether and how much to research is your choice.

Package: For ease of deployment and sharing provide a single html file `<Title>-<Source>-<stamp>`.html. Dependencies that can be downloaded do not have to be included in the html file if that is easier.

Tech Stack: Build on https://github.com/michaelcrosato/shardfall/blob/main/START_HERE.md, making a new game on its engine. You may change anything in it, the engine included, and add whatever systems, art assets and animations the game needs. The rest of the tech stack is your choice.

Art Direction: Use the engine’s native style as the base. Make new art assets for whatever makes the game feel like the source; the engine’s asset library is fine for generic props.

Animation: Use the engine’s native animation system as the base. Make new animations for whatever makes the game feel like the source.

Audio: All music, sound effects and voices are written in code, with no audio files. Voices are Animalese/Simlish-style gibberish. Music is to be set to 10% volume by default.

Online: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub

Working Environment and deliverable:
Create a subfolder called `<Title>-<Source>-<stamp>` to keep all your dev files in. You can develop separate modules, then bundle into a single file `<Title>-<Source>-<stamp>`.html in root when you’re done. You may use external CDN dependencies. Do not read files outside what you need: other agents work in the folders beside this one. They share this machine’s ports and processes too. Prefer file:// and the engine’s headless tools. If you need a server (the AI Hub harness does), bind 127.0.0.1 on a port the OS picks (`python3 -m http.server 0 --bind 127.0.0.1` prints it) and confirm the page is your game before trusting a result. Stop only processes you started, by their PID: never pkill, killall, fuser -k, or kill whatever holds a port.

Performance: Treat the performance budget as unlimited. Add as much detail, enemies, effects, lights, and shadows as the scene needs. Out of scope (handled later): FPS targets, optimization.

Testing: Test as much as you like with headless tools: scripts that play the game and check its state, including a scripted playthrough of the whole game. Keep them behind one command that prints only failures and a one-line count, and rerun it only after changing the code it covers. Use screenshots only for what a script can’t check. Don’t use subagents or workflows to debate, review, judge or audit.

Effort: Spend effort however you see fit.

### Goal

Build an original game inspired by the source.

Scope

Create a feature-complete demo. Capture what makes the source distinctive (its world, characters, themes and tone) and turn it into the mechanics, pacing and UX of a great game. The demo must be long enough to show ALL features and gameplay mechanics so a player can clearly understand how the game plays and feels, and what they can and cannot do. Treat the demo as a complete, polished vertical slice. It should contain all the infrastructure, systems, and polish needed so the remainder of the game could later be built out with normal designer tools.

Include a dev mode, reachable from the pause menu, with the standard tools for testing the game quickly. Balance is key, so expose the most important gameplay variables as live sliders, with a reset to defaults.

Attract Mode: After 10 seconds without input on the title/menu screen, start a looping AI-played demo or scripted replay (arcade/kiosk style); any input exits it. The AI (or replay) can be simple and may cheat freely (infinite health, ammo, abilities, no clip, etc). Its only job is to show as much of the demo as possible, the attract mode is not meant to balance the game.

Multiplayer: Follow https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub for multiplayer integration into ai-hub as well as for the game on its own.

Narrative tone: Use a writing style similar to the source’s.

### UI & UX: 10-Foot Controller-First Philosophy
Design the game around a PS5 DualSense (or any pad the browser reports in its standard mapping) played on a TV at 10 feet. With keyboard and mouse it's the same game on the same screens, not a separate desktop layout, but they should feel native, not like stand-ins for controller buttons. The keyboard uses the keys PC players expect for the genre. The mouse aims, looks, and clicks menu items and things in the world (hover moves the focus) wherever the genre uses it. On-screen prompts follow the input used last: PlayStation glyphs for the controller (with a Settings option to show Xbox glyphs, A B X Y, instead), keys and mouse buttons for keyboard and mouse.

Do not use overly dense, web-style data screens.

Touch-only devices: no touch controls; show "Controller or keyboard required" and the settings button. Let the attract mode run.

### Done
No TODOs, placeholders, or stubbed features. The demo is complete.

### Reports

CRITICAL: Put Source Information, Testing Feedback, Engine Feedback and Prompt Feedback in your chat reply and an in-game About/Credits screen. Write "unknown" for anything you can't confirm.
