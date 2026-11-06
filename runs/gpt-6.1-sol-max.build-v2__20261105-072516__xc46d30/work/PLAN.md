# PLAN: an open-world first-person mercenary game in a burning country

Inspired by Far Cry 2. Original world, cast, story, art and music. You build it from this plan and your TASK.md,
without the plan's author. Paths are relative to your dev folder. "The deliverable" means the `.html` your TASK.md
names, in the folder above the dev folder (`..`); "the exit-interview file" is the JSON file your TASK.md names, beside it.

## 0. How to use this plan

- **This is the plan, not the game.** Building the game, choosing its title, making the deliverable and writing the exit-interview file are the builder's job, using §0.1, §14 and §15. Nothing here has been built except throwaway probes.
- **The design is decided.** Build it; don't reopen it. Every number is a starting value and most are dev sliders:
  tune by playtest scripts. Where you must deviate, do the simplest thing that keeps the feature, and write the call in
  `labs/game/README.md`.
- **"Verified"** means the plan's author ran it on this machine on 2026-11-04, on engine commit `e7a1243` and hub client
  1.4.0, with throwaway probes on software WebGPU. The engine's `main` moved once while this was written (`2dbd829`, a change to how building walls cut away for cameras, touching nothing here), and `new-game` pins whatever you get in `engine-lock.json`. If a verified recipe fails for you, look for what changed; don't redesign around it. What couldn't be checked here is listed in §13.
- **Your TASK.md wins** over this plan on anything it states. §15.4 maps each TASK.md requirement to the section here that states it.
- **Features beat content.** No feature on the never-cut list may be stubbed. If you run short, shrink content, never
  below the floors:

| Never cut | May shrink, never below |
|---|---|
| Gun wear, jams and clearing; wounds, syrettes and field surgery; fire with wind; fever and pills; buddies with rescue, debt and mercy; drivable vehicles with repair; map in hand; two factions' contracts and an ending; stones, locator and dealer; safehouses and saves; stealth in grass; day and night; dev mode with sliders; attract mode; hub session passing the harness; co-op on its own; touch notice; About/Credits; code-only audio with gibberish voices | Places: 7 (town + 6). Contracts: prologue + 5. Weapons: 8. Tapes: 4. Stone caches: 5. Buddies: 3. Enemy types: 4. Vehicles: pickup + boat. Songs: 3 |

## 0.1 Standing rules from the brief

These restate TASK.md so this plan stands on its own.

- **Goal.** An original game inspired by Far Cry 2: a feature-complete demo and a complete, polished vertical slice that turns the source's world, characters,
  themes and tone into mechanics, pacing and UX. It must be long enough to show **all** features and mechanics, so a player clearly understands how it plays and
  feels and what they can and cannot do (§8.4, field notes in §10.3, the coverage test in §13), with all the infrastructure for building out the rest with
  normal designer tools (§4, §6.10).
- **Title.** A playful riff on the source's name. Silently brainstorm 50 titles (don't show the list), then pick one with a real random number generator by
  running code; don't choose by taste. It goes in `title.ts`, on the title screen, in `<title>`, in the catalogue's `name`, and in the file and folder names your TASK.md's pattern asks for.
- **Research.** How much is your choice. The engine and the hub are already researched here. Report whatever you did in Source Information (§15.3).
- **Package.** Develop in separate modules in the dev folder, then bundle into one HTML file in the folder above it, named as your TASK.md says. External CDN
  dependencies are allowed, but this plan's recipe inlines everything (§15.1).
- **Tech.** my-3dge in its full workspace. The engine stays read-only; add whatever systems, art and animation the game needs on top. The rest of the stack is
  your choice; this plan needs nothing beyond what the workspace ships (TypeScript, Vite, Vitest, Playwright).
- **Art, animation, audio.** The engine's native style and animation system as the base, with new assets and animations for whatever makes it feel like the source; the engine's asset
  library is fine for generic props (§9.1, §9.2). All music, effects and voices are written in code with no audio files, voices are Animalese/Simlish-style gibberish, and music defaults to **10%** (§9.3).
- **Online and multiplayer.** Follow the [AI Hub session protocol](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) both for integration into the hub and for the game on its own (§12).
- **Working environment.** Keep every file inside your own folder, not `/tmp` or a parent folder (the deliverable and the exit-interview file are the exceptions TASK.md sets). Don't read
  files outside what you need: other agents work in the folders beside yours and share this machine's ports and processes. Prefer `file://` and the engine's headless tools. If you need a
  server (the harness does), bind 127.0.0.1 on a port the OS picks and confirm the page is your game before trusting a result. **Stop only processes you started, by PID: never `pkill`,
  `killall`, `fuser -k`, or killing whatever holds a port.** Keep one or two browsers open at once and close them. Never run `playwright install` or `playwright install-deps`. The system Python has
  Playwright and nothing else; for more, `uv run --with pillow python script.py`, adding `--with playwright==1.63.0` when the script drives a browser. "Target closed", "page crashed" or "browser
  has been closed" means memory ran out (earlyoom), not a bug in your game: run fewer browsers rather than retrying.
- **Performance.** Treat the budget as unlimited: add as much detail, enemies, effects, lights and shadows as the scene needs. FPS targets and optimization are out of scope. Counts in this plan are
  starting values for the design, not caps to protect a frame rate; raise them when a scene wants more.
- **Testing.** Headless scripts that play the game and check its state, including a scripted playthrough of the whole game, behind one command that prints only failures and a one-line count, rerun only
  after changing the code it covers. Screenshots only for what a script can't check. No subagents or workflows to debate, review, judge or audit (§13).
- **Effort.** Spend it however you see fit.
- **Done.** No TODOs, placeholders or stubbed features. The demo is complete.

## 1. The game

**Pitch.** You come up the river at the end of the dry season to serve a warrant on the Auctioneer, the arms dealer who
keeps a civil war solvent by selling to both sides. You have a fever, a rusting rifle, debts to people who may or may not
drag you out of the next fire, and a wind that is the only honest thing in the country.

**Genre:** open-world first-person shooter with systemic fire and survival pressure. **Perspective:** first person, with
an over-the-shoulder option in Settings, a chase option while driving, and short eye-level "body camera" moments (§10.2).

**Pillars**

1. **Everything wears out.** Guns, vehicles, your body, your friends. Reliability is the real economy.
2. **Fire is your best weapon and you don't control it.** Wind decides. Burn scars stay and change the map.
3. **No clean hands.** Two factions, no good side, debts kept in a ledger. The writing never winks.
4. **The body is the interface.** Map in the hands, pills from the bottle, a bullet dug out of the arm, a wrench on the
   engine, all in real time. Only the pause menu stops the world.
5. **The land is the antagonist.** Long sightlines, chest-high grass, checkpoints on every road, heat haze.

**What we take from the source, and what we make of it.** Mechanics are fair game; names, characters, places, story
beats, art and music are not.

| Source's idea | This game's version |
|---|---|
| Fire spreads with the wind | Same verb, deeper: a forecastable wind, ember spotting, fuel types, firebreaks, smoke that blinds AI, scars that strip stealth cover and regrow |
| Guns degrade and jam | Same, and condition shows on the gun in three rust tiers; enemy guns are junk; reliability upgrades at the dealer |
| Malaria and pills | Blackwater fever and quinine; attacks can show harmless mirages of people you failed |
| Buddies rescue you | A **ledger of debts**: each rescue is owed, and overdrawn buddies stop coming; mercy or a syrette when they fall |
| Map held in the hands | Paper map and tick-box locator on a diegetic CSS layer; you can walk or drive with it up |
| Diamonds | Rough stones in dead prospectors' tin boxes, found by a Geiger-style tick-box |
| Arms dealer villain with tapes | The **Auctioneer**: cassette "lots" in the patter of a sale. Every contract you do adds to his catalogue |
| Two rotten factions, ceasefire town | The Provisional Authority and the Basin Front; ceasefire in Sainte-Aurore |

**Original-work rules.** Use nothing named or written in the source: no character, faction, place or mission names, no
taxi or hotel opening, no tapes of a villain quoting philosophers, no music, logos or screens that copy it.
The title is the one riff on the source's name, as TASK.md asks; everything else stands alone. Don't call the game a
sequel. The country, its war and its factions are invented: no real conflict, ethnic group or leader is named or caricatured,
and its people are written as individuals on every side. The hired mercs come from real countries and are written as individuals too.

## 2. Setup and verified ground truth

**The title comes first,** because the dev folder and the deliverable are named after it. In the folder holding your TASK.md, write your 50 titles to `titles.txt`, one a line, without showing them, then:

```sh
node -e 'const fs=require("fs"),t=fs.readFileSync("titles.txt","utf8").split("\n").filter(Boolean);if(new Set(t).size!==50)throw new Error("need 50 different titles");const i=require("crypto").randomInt(50);fs.writeFileSync("title-pick.json",JSON.stringify({count:50,index:i,title:t[i]}));console.log(t[i])'
```

Name the dev folder from that title by the pattern in your TASK.md, make it and go in. Then, with this plan at `../PLAN.md` (change the path if yours is elsewhere):

```sh
mkdir -p out && mv ../titles.txt ../title-pick.json out/                                           # the pick's evidence, for the final check
mkdir -p .cache && git clone --depth 1 https://github.com/michaelcrosato/my-3dge .cache/engine-src   # stays: the engine's examples, to read
node .cache/engine-src/tools/game/new-game.mjs . --name <slug> && rm -rf .cache/engine-src/.git
npm ci --no-audit --no-fund                     # 6 s. Do NOT run scripts/setup.sh: it downloads Node and Chrome outside your folder
export CHROMIUM_PATH=$(ls ~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell | head -1)
node -e 'const fs=require("fs"),p=require("path"),fence=String.fromCharCode(96).repeat(3);for(const block of fs.readFileSync("../PLAN.md","utf8").split(fence)){if(!/^(js|ts)\n\/\*\* @file /.test(block))continue;const code=block.slice(block.indexOf("\n")+1),file=/@file (\S+):/.exec(code)[1];fs.mkdirSync(p.dirname(file),{recursive:true});fs.writeFileSync(file,code)}'   # writes §16's scripts
node scripts/fetch-hub.mjs && npm run format
npm test && npm run check && node x shot labs/game   # all green (verified)
```

Read `AGENTS.md` and `docs/GAME-GUIDE.md` once. **`labs/playground/` is not in a game's workspace**, but it is the best
worked example of nearly everything here (first person, guns, bodies, doors, sites, neighbours, looks, front end, attract
mode, sound): read it at `.cache/engine-src/labs/playground/` as needed. Grep `docs/API.md`; don't read it whole.

**This computer,** as checked 2026-11-04 20:05 (America/Vancouver) by `node check-environment.mjs` (your TASK.md has the current list): Worki9, 13th Gen Intel i9-13900K, 32 cores, 20 GB RAM, 8 GB swap, Ubuntu 26.04.1 LTS on WSL2 (Linux 6.18.33.1-microsoft-standard-WSL2). 850 GB free in the home folder; `/tmp` is 9.8 GB in memory (tmpfs), 8.2 GB free when checked. No display in runs (`DISPLAY` unset). Playwright 1.63.0 for Python with Chromium 153.0, Firefox 155.0 and WebKit 26.6, phone and tablet profiles built in. Tools: node 24.22.1, npm 11.19.1, python3 3.14.8, pip3 26.2.1, git 2.56.0, gh 2.46.0, curl 8.22.0, wget 1.25.0, jq 1.8.1, ffmpeg and ffprobe 9.0.2, sqlite3 3.53.4, zip 3.0, unzip 6.00, rustc and cargo 1.99.0, go 1.27.1, java 27, lighthouse 13.5.0, shot-scraper 1.12, xvfb-run, magick 7.1.2, esbuild 0.28.2, uv 0.12.23, tsc 7.0.2, wasm-bindgen 0.2.129. Rust: rustup's toolchains 1.96.0, 1.98.1 and stable, with the wasm32-unknown-unknown target on 1.98.1. Not installed: sox, bun, deno. Internet works (github.com, registry.npmjs.org). This plan needs only node, npm, git, python3 and Playwright from that list.

Verified facts that will save you hours:

- **Browser flags.** TASK.md's listed flags (`--enable-unsafe-webgpu --enable-features=Vulkan
  --use-webgpu-adapter=swiftshader`) alone **fail with this engine** ("Instance dropped in popErrorScope", never ready).
  Use `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-angle=swiftshader`. Adding
  `--use-webgpu-adapter=swiftshader` is harmless. With these the starter is `ready` in 3.6 s from `file://`.
- **WebGPU needs a secure page:** `file://` or `http://127.0.0.1`. A WebGPU canvas can come out blank in a headless screenshot, so check the game's state instead.
- **Headless shell only.** Playwright's default headless works. Full Chromium dies here with "Socket path too long"
  because run paths are long, so skip headed mode and xvfb. Never run `playwright install`; the browsers are already there.
- **`CHROMIUM_PATH`** (above) makes `node x shot`, `x film`, `x inspect` and `x replay --browser` work. Node 24.22.1 is
  fine. In Node drivers: `chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args })` from `@playwright/test`. The workspace pins 1.64.1, not the 1.63.0 the browsers were downloaded for, so always pass
  `executablePath`; then nothing downloads, and you don't need `npm install playwright@1.63.0`. The system Python's Playwright 1.63.0 also works with no path. Both verified. Leave `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE` as it is set.
- **Ports.** `python3 -m http.server 0 --bind 127.0.0.1` piped to a script never prints its port (buffered): use
  `python3 -u`, or Node's `http` on port 0. Confirm the page's marker before trusting a result. Stop only your own PID.
- **What the checks scan.** `npm run check` fails on any PNG or base64 blob under the dev folder, except in git-ignored
  places: `out/` and `.cache/` are skipped by ESLint, Prettier, the asset scan and Vitest. Screenshots and temp bundles go
  in `out/`, hub files in `.cache/hub/`, the deliverable outside the dev folder.
- **Git.** The dev folder sits inside a larger repository that isn't yours. Make no commits there; `git init` inside the
  dev folder if you want history.
- **Sim costs on this machine.** A 1536 m terrain at 4 m cells adds 0.35 ms a step. An actor costs about 0.15 ms. A prop
  with **no** body costs about nothing a step. A prop with **its own body** costs about 1.2 µs a step (3,000 trees 3.9 ms),
  so trees are `body:'none'` props plus **one** fixed body holding all their colliders (verified). A site of 40 buildings
  on that terrain starts in 1.1 s and steps 24 actors in 1.8 ms.
- **`capture()` is 35–80 MB of JSON** at this scale. Never use it for saves or network resync.

## 3. The engine: what to use and the walls

| Need | Use | Note |
|---|---|---|
| World | `defineTerrain`, `defineLevel` (format 2 storeys), `defineSite`, scene `site:`, `addSiteBodies`, `createSiteNav` | The scene must name `site:` or `terrain:`, or the ground isn't drawn |
| Player feel | `defineMovement('movement:merc', …)` from apex (§6.1), `createCharacter`, `spawnActor`, settings `movement.*` | |
| Drawing things | `defineProp` + `spawnProp`, `defineMaterial`, `defineTexture`, `defineGeometry`, `defineBody` | Props are instanced and interpolated |
| Effects | `defineEmitter`, `frame.emit(id, at, key, scale)` in `onFrame`, sim events that burst emitters, `gpu: true` emitters, flame tongues on prop parts | Budget 4,096 CPU particles; use GPU emitters for smoke and fire |
| Look | `defineLook` (`sky:'sky:daylight'`, filters), `setDaytime`, `post.combine` set live | Numbers and amounts change without a shader build |
| Guns | `defineWeapon`, the `weapons` component (`weaponsFor`), `recoilStep`, `spreadOf`, `gunshot` events | Engine draws gun, sights, kick, tracers, flashes, holes |
| People | `spawnActor({ player:false })` with `actor.intents`, `sense`/`canSee`, `takeToken`, `damage`, `reactTo`, `addRagdolls`/`handOff`, `followRoute`, `stepAside` | See `labs/playground/cast/neighbours.ts` |
| Animals, refugees | Crowd bodies (`addAgent`, `crowdBody`, rig `quadruped`) | |
| Body animation | `defineAction` + `actOn` (not in `setup`; see the spawn rule below), library clips (`node x anim find crawl`) | Credit imported clips per `data/anim/SOURCES.md` |
| Sound | `defineSfx`, `defineSong`, `createAudio` (`volume`, `music`, `intensity`, `stinger`, `play({position, bus})`, `footstep`) | `audio.context` is exposed |
| UI | `engine.ui.root` + plain HTML/CSS, `createMenu`, `createDialog`, `createBar`, `createPadCursor`, `createStore`, `createEngine({ modal, store })` | `createMenu` already does pad, keys, hover-moves-focus, click |
| Data as a tool | `defineKind`/`def` for contracts, places, squads, dealer stock (verified: a bad entry throws) | Schemas check entries; `__engine.describe('contract')` lists them for designers |
| New entries | `node x new <kind> labs/game/<dir>/<name>` | Writes module + test |

**Five walls. Plan around them; don't fight them.**

1. **No access to the three.js scene.** Game code may import only `engine/index.ts` and `engine/sim-api.ts` (lint). Everything
   in the world is a prop, terrain, site, body, emitter, sky or look; everything else is the HTML overlay. For arbitrary
   meshes (grass, road ribbons, canopies), `defineGeometry` can return raw buffers by borrowing classes off a kit shape
   (verified, with a 36-blade grass tuft):

   ```ts
   const g = boxGeometry({ width: 1, height: 1, depth: 1 });
   const Attr = g.getAttribute('position').constructor as new (a: Float32Array, n: number) => never;
   g.setAttribute('position', new Attr(new Float32Array(pos), 3)); // also 'normal' and 'uv'
   g.setIndex(indices); g.clearGroups(); return g; // set `budget` to its vertex count
   ```
   Give blades real normals (up-ish, both faces lit) and `side:'double'` in the material, or half of them draw black.
2. **`addWeapons`, `addMelee` and `addInteraction` only serve `actor.player === true`**, reading the step's one set of
   intents. They can't drive NPCs or other seats, and calling them breaks lockstep. **Don't call them.** Write `arms` (§6.2)
   and `use` (§6.12) systems that keep writing the same `weapons` component and emit `gunshot` with the same payload
   (`{ id, weapon, from, to, normal, body, target, hit }`), and set `motion.holstered` and `animator.weapon` as
   `engine/sim/weapons.ts` does. Then the engine draws guns, sights and tracers for players and NPCs alike. Read that file
   and copy its timing logic. `useDoor`, `strikeDoor`, `damage`, `entityOfBody`, `strikeEntity` are callable directly.
3. **First-person arms are a closed rig.** Games can't pose them, and reloads aren't animated at all. **What works (verified): a
   flipbook.** Swap `weapons.slots[slot]` through weapon ids whose props hold the same gun tilted and lowered (`rotation` and `position` on the parts, the magazine
   left out where it should be out). The first-person gun follows frame by frame and no pipeline is built, so reloads and jam clearing get real motion in the hands.
   Setting `weapons.slot = -1` with `animator.weapon = 'none'` is a real holster: gun gone, raised fists; it's no reload. Kick comes from `shots`; big moments use the body
   camera (§10.2). Full-body actions always show in shoulder view and to other players.
4. **Terrain paint is slope and height only.** Roads are draped ribbon props. Burn scars are props. Biomes are scatter.
5. **A running page can't switch scenes.** One scene, `game:world`, with a setting `game.mode`
   (`title | story | attract | contract`); change it with `__engine.set`, then restart with `inspector.seed(n)`.

More verified traps:

- Texture generators write `texel.color` in **sRGB bytes 0–255**, not 0–1 (0–1 draws black).
- **An entity spawned in a step joins the world at that step's end.** `w.add`, `w.get` and `actOn` fail on it until then, so give components at spawn: `w.spawn({ … })`,
  `spawnProp(w, placement, { components: { … } })`. An animated actor can take `actOn` from the next step on.
- Dev actions are plain functions: `defineScene(id, { actions: { ignite: (w, args) => … } })`, run with `__engine.actions.run('ignite', args)`.
- **Pre-warm while the loading screen is up.** The first holster and draw cycles built 32 pipelines and the first flame prop 2 more, stalling frames (one black frame on software WebGPU). After that,
  holsters, flames, weapon-id swaps and fever filters built nothing. So in the scene's first moments, under the loading screen, cycle a holster twice and spawn one of each runtime prop out of sight.

## 4. Architecture

```
labs/game/
  index.html  main.ts          page entry: reads mode, starts engine, wires everything (keep small)
  title.ts                     the game's title, one constant
  scenes/                      SIM-SIDE: imports only engine/sim-api.ts (lint enforces scenes/** and cast/**)
    world.ts                   defineScene('game:world'), setup order, modes
    settings.ts                every tunable in one table: path, default, min, max, label, group
    map.ts roads.ts scatter.ts terrain + site + places, road polylines, deterministic scatter
    seats.ts arms.ts use.ts health.ts fever.ts fire.ts wind.ts vehicles.ts buddies.ts economy.ts story.ts save.ts digest.ts
    ai/ perception.ts squads.ts soldier.ts driver.ts wildlife.ts
    contracts/ *.ts            contracts as data; the engine that runs them
    text/ *.ts                 every line of dialogue, briefing and tape, as data
  cast/                        SIM-SIDE: spawn player, soldiers, buddies, civilians, animals; actions
  props/ weapons/              SIM-SIDE defineProp, defineWeapon (sim-api exports them)
  art/                         PAGE: textures, materials, geometry, bodies, emitters, looks, cameras
  sounds/                      PAGE: sfx, songs, voice synth, event-to-sound map
  ui/                          PAGE: hud, prompts, glyphs, title, pause, settings, map, ledger, dialogue, shop, dev, about, card, touch
  net/                         PAGE: net.ts (interface), hub.ts, tabs.ts, rtc.ts, lockstep.ts, wire.ts
  bot.ts attract.ts            bot intents shared by tests and attract mode
  replays/                     one short golden replay
tests/game/                    browser and harness drivers (.mjs), verify.mjs
scripts/                       bundle.mjs, fetch-hub.mjs
```

Rules from the engine that apply everywhere: sim code uses no clock, `Math.random`, DOM or storage; time in whole steps;
randomness from `w.rng('name')`; state in components; `Math.pow`, not `**`; every file opens with an `@file` comment, warns
past 400 lines and fails past 600. Presentation reads the sim and never writes it.

**Seats: one path for every player from day one.** Every human-controlled actor has a `seat` component. The first system
in phase `intents` (`game.seats`) builds `seat.wants = { move, look, aim, b, p }` for each seat: for the actor with
`actor.player === true` from the step's intents, for the others from the step's custom key `'game:seats'[n]`, which it
also copies to `actor.intents`. It computes `p` itself as the edges of `b` against last step, plus any `p` given. **All
game systems read `seat.wants`, never the raw intents.** NPCs have no seat. In solo play there is one seat. Sim settings
that fork behaviour by `actor.player` (`input.sprint`, `input.crouch`) stay at defaults in co-op.

**Saves are game data, not captures.** `save.ts` writes plain JSON (seat position, inventory, condition, stones, flags,
buddies, hour, wind, burn map as run-length text, cleared places) to `createStore` at sleep and at contract steps. Load
restarts the scene and applies it through the dev action `load`. A session gets the hub's empty storage and saves nothing.

**Data-driven so designers can extend it:** places, squads, contracts, dealer stock and weapons are registry kinds or
tables with schemas; all text is data; levels are text maps; props, materials and sounds are data entries; dev mode tunes and jumps to anything. Adding a contract or a checkpoint takes no new code, and a test proves it (§13).

## 5. The world

**Map.** A 1536 × 1536 m site, 4 m cells (`size:[1536,1536], cell:4`; `size` is metres), x east, z south. A ring of hills
70–120 m high (`hills` round the edge, plus a sim rule that turns back anything within 40 m of the edge) keeps you in;
the terrain simply ends there, and a vehicle will fall off it (verified), so the rule must hold. Rolling ground: `height:14,
scale:180, octaves:5, ridges:0.3`. Materials: ground `material:savanna` (straw over red earth), steep `material:laterite`,
high `material:ironstone` from 45 m up. Every place sits on `flats`.

**The river** crosses west to east near z≈900 as a chain of negative `hills` (70 m apart, radius 85, as a start), drawn as one flat water prop at `waterY` with `texture:water`. Set `waterY` about
1.1 m above the channel floor: read the floor with `terrainHeight`, so nobody needs to swim. No swimming: you wade at half speed. Vehicles stall past 0.8 m, except
fords. North of it is dry savanna; south is greener riverine woodland that burns slower (fuel table, §6.5).

**Places** (coordinates are the centre; adjust to fit the terrain, keep the relations):

| Place | At (x, z) | What it's for |
|---|---|---|
| **Sainte-Aurore**, ceasefire town | 760, 790 | Weapons forced holstered. Hotel Splendide (bar, Yaw), Customs House (Authority), Cinema Rex (Front), jetty. 12 buildings, townsfolk on routes |
| **Km-40 checkpoint** | 620, 520 | First firefight. Boom gate, sandbags, watchtower, radio hut |
| **Bridge Post checkpoint** | 1010, 790 | East road; a technical parks here |
| **Ford Post checkpoint** | 560, 985 | South crossing |
| **Pump Station** | 1010, 360 | Pipeline, fuel tanks, explosive set piece; co-op's arena |
| **Salt Works** | 1240, 260 | White pans (no fuel: a natural firebreak), conveyors, wide-open fight; buddy rescue |
| **Mine No. 6** | 300, 300 | Red pit in iron hills, rail cars, aerial ropeway (`addZipline`); the finale |
| **Belvédère Estate** | 1130, 1180 | Tobacco barns, drying racks, the big burn |
| **Mission Sainte-Claire** | 330, 1120 | Clinic, refugees on routes, Sister Perpetua, pills |
| **Airstrip** | 1200, 620 | Ferreira's container (dealer), hangar safehouse, wrecked plane |
| **Broken rail bridge** | 880, 905 | Landmark and ambush spot |
| **Safehouses** | Water Tower 470, 650; Ferry Shed 640, 1040; Hangar 1240, 640 | Clear the guards to claim each |
| **Barge wreck** | 300, 900 | Prologue start |

**Roads** are polylines in `roads.ts` joining all of the above (one main east–west road through town, north road to Km-40
then Mine, east road to Bridge Post and Airstrip, south road over the ford to Mission and Estate). The same data draws the
draped ribbon props, gives footstep surface and fire-free cells, and steers AI drivers. A pipeline and a power line on
poles run across the savanna as long-distance landmarks.

**Scatter** is deterministic (`scatterTerrain` with `salt`, or your own by road and place distance):

- About 1,200 trees: 3 flat-topped thorn trees, a fat bottle tree, thorn bushes. `body:'none'` plus one fixed body of
  capsule colliders.
- Grass as **patches**: a prop per 16 m square of fuel, 200–400 raw-geometry blades, knee to chest high, about 6,000 patches.
  Removing one is how grass burns. A setting `game.detail` (0.1–1) thins scatter for tests and software adapters (read
  `__engine.info().adapter.fallback`); default 1. TASK.md puts FPS out of scope, so don't hold back on real GPUs.
- Rocks, termite mounds, wrecks, oil drums, burned-out cars, game trails.

**Day and night.** `setDaytime(w, { hour, rate })` on `sky:daylight`: a day lasts `game.day.minutes` (24). Start at 17:00.
Sleeping skips to dawn, noon or dusk. Lamps with `lightsAtDusk`. AI sight is ×0.6 at night. A rain front arrives about once a
day for 90 s (GPU rain emitter, wet fuel: no spread) and is forecast by thunder and darkening.

## 6. Core systems (all sim-side unless noted)

### 6.1 Player

`movement:merc`: start from `movement:apex` (`node x describe movement`) and make it heavier: run 4.2, sprint 6.4,
crouch 2.0, jump 1.0 m, mantle on, wall-climb and superglide off, shorter slide, `holstered` ×1.05. Fall damage from landing
speed. In tall grass: −10% speed and a rustle sound.

### 6.2 Guns (`arms.ts`)

A system for every actor with `weapons`: draw, sights, fire, reload, recoil, per `engine/sim/weapons.ts`, driven by
`seat.wants` for players and AI wants for NPCs. Shots leave the eye (1.52 m standing, 0.81 m crouched). Extra state in a component `gunState`, per slot: `condition` 0–1, `jammed`.
Three `defineWeapon` ids per gun (`-new`, `-worn`, `-rusted`, same stats, different prop tint); swap the slot's id at
condition 0.66 and 0.33, so the gun's look shows its state.

- **Wear:** each shot `condition -= game.wear.perShot (0.0012) × weapon.wear`, ×2 near fire. A new OR-7 stays jam-free for about 240 shots.
- **Jam:** per shot, `p = 0.25 × game.wear.jamK (1) × max(0, 0.65 − condition)² × weapon.jamRate`: about 0.6% at condition 0.5, 2.6% at 0.33,
  6% at 0.15, before `jamRate`. Jam: dry click, gun won't fire, prompt shows. Clearing: **hold** reload 0.9 s (with a 1-in-3 chance of needing it twice); the gun dips and racks, with a `jam` sound.
- **Break:** below 0.08, each shot has a 2% chance the gun comes apart: it drops, you take 8 damage.
- **Sources:** dealer guns start at 1.0; enemy guns drop at 0.15–0.5; an armoury crate reissues an owned gun at 1.0.
- **Reload and clear in the hands:** the flipbook of wall 3, 3–4 poses a gun, stepped by `arms` over the reload's time, with its sounds. Generate the ids with a helper (`gunVariants(gun)`: rust
  tiers × poses) rather than writing them out.
- **Slots:** Sidearm, Primary, Special, plus machete (always), syrettes and throwables. Ammo per class, modest.
- **Melee:** machete drawn as a `weapon` with `prop`; a chop is a fan of rays (`fanHits`), one hit, big damage, kick plus a
  camera roll.
- **Hits:** raycast; head (hit y above eye level −0.1) ×2.5, limbs ×0.7. NPC guns use the same system with a wider cone
  (`game.ai.accuracy`).
- **Fire guns:** flare pistol (ballistic flare; ignites the cell it lands in), molotov (thrown arc, ignites a 3-cell blob),
  sprayer (crop-sprayer flamethrower: short cone, ignites along it, ammo is fuel). Rocket launcher and frag use
  projectiles with blast `overlap`, `knock`, falloff damage and ignition.

### 6.3 Health (`health.ts`)

100 HP in 5 segments. Regen 6 HP/s to the top of the current segment after 4 s out of damage. Syrette (L1 / H, 0.9 s, the
`action:syrette`): to full; carry 3, max 5 (upgrades 7). **Critical** at ≤ 20 HP: the syrette press becomes **field surgery**
(2.6 s, interruptible, heals to 60 HP, uses no syrette): one of three body-camera actions in random order: dig the bullet out of the
forearm, set a dislocated finger, cauterize with a lighter (§10.2). Screen edge pulses and heartbeat on critical. Damage
direction arcs on the HUD.

**Down at 0 HP.** Story: if a buddy can come (alive, debt < 3, not on a contract elsewhere) you go down (low camera, drained
colour, your sidearm still fires, 25 s); the buddy runs in from cover 40 m off, fights, then `action:rescue` pair (drag and
syrette). You wake at 40 HP, debt +1, and a line from the buddy ("That is two you owe me. I write them down."). Otherwise
black, a note ("Reserve not met."), reload from last save. Co-op: teammates revive (hold use 3 s); bleed-out 40 s.

### 6.4 Fever (`fever.ts`)

Scripted first attack in the prologue. Then every `game.fever.intervalMin` (11) ± 3 minutes. Warning, 20 s: heartbeat, slight
vignette. Attack: `look:fever` amount rises (colour bleed, lens wobble, chroma, darkened edges), aim sway grows, move speed
×0.7. Take a pill (D-pad left / P, 1.2 s) to end it. With no pill: at 60 s you collapse, as for Down. Strong attacks (past 30 s) spawn
1–3 **mirages**: silent grey figures of dead buddies or soldiers you killed, standing in the grass, flagged so AI ignores them,
gone when shot at or within 8 m. Pills start at 4, max 8, come only from the Mission's contracts and crates. A `Fever
intensity` accessibility setting scales the screen effects, not the rules.

### 6.5 Fire and wind (`fire.ts`, `wind.ts`): the star

**Grid.** 8 m cells, 192 × 192. Per cell: fuel type, state (0 none, 1 unburnt, 2 burning, 3 burnt), timer, and regrow timer.
Fuel comes from scatter, places and roads at setup. Keep arrays in one component; iterate burning cells in index order; draw
only from `w.rng('fire')`. Update every 15 steps (4 Hz).

| Fuel | Spread chance per tick (base) | Burns (s) | Notes |
|---|---|---|---|
| Dry grass (north) | 0.016 | 8 | Removes grass patches, leaves scorch props |
| Green grass (south) | 0.008 | 8 | Often dies out by itself in light wind |
| Brush | 0.012 | 14 | |
| Tree | 0.005 | 40 | Becomes a charred tree prop. Throws embers |
| Building, barn, racks | 0.008 | 60 | Roof and walls swap to charred props |
| Road, salt, water, bare earth | 0 | – | Firebreak |

**Spread.** For each of 8 neighbours with unburnt fuel: `p = base × game.fire.spread × (1 + game.fire.windBias × (wind/5) ×
cos(angle to wind))`, floored at `0.15 × base`, × 0.7 on diagonals, × 1.4 uphill, × 0 in rain. Front speed is very sensitive to
`base`, because each cell has several burning neighbours: 0.10 gave 19 m/s when this rule was simulated outside the engine, and 0.016 gave the
figures below. **Embers:** a burning tree in wind ≥ 8 m/s has a 1% per tick chance to ignite a cell 2–5 cells downwind, which jumps roads.
**Targets (a test), simulated on dry grass in 30 s:** 5 m/s wind: 90–140 m downwind (3.8 m/s), ≤ 25 m upwind, about 60 m each flank. No wind: about
60 m all round. 10 m/s wind: about 150 m. So it outruns a crouch (2.0 m/s) and never a sprint (6.4 m/s). **Verified in the engine** as one component of plain number arrays with grass patches burning
into scorch props: over 6 seeds, 109 m downwind, 17 m upwind and 56 m each flank in 30 s, at 3.2 ms a step with 6,459 props in the world and a 27 ms hash.

**Effects.** Actors within 4 m of a burning cell take `game.fire.damage` (14 HP/s) and may catch: burning NPCs panic, run,
and die (ragdoll with fire emitter); burning players have a fast drain until they leave fuel. Oil drums, tanks and ammo crates have heat:
drums explode, crates cook off in random pops. Vehicles take damage, and a fuel tank explodes. Burning and fresh-burnt cells count as
smoke: AI sight rays crossing 2 or more smoke cells fail. Animals flee downwind-perpendicular. Burnt grass offers no concealment. After
`game.fire.regrow` (18) game-minutes scars regrow as green stubble with half fuel.

**Drawing (page).** A burning cell spawns `prop:flame-patch` (parts with `flame.tongues` **and a `tint`** such as `#ff7a2a`, or they draw white; an orange light spot on a few) and
removes it when done (verified, with no pipeline built after the first); the 32 nearest clusters run smoke and ember emitters with `frame.emit`, picking the variant for the
wind's compass direction (emitter `velocity` is fixed data, so define 8 directions; verified with `gpu:true` smoke through `frame.emit`); ash falls near big fires. Scars are small dark
`prop:scorch` patches tilted to the terrain normal. Fire crackle is positional. Light spots follow the engine's fixed
light pool.

**Wind.** A `wind` component: direction, speed (base `game.wind.speed` 5 m/s, gusts ±2). Every `game.wind.shiftMinutes` (4)
it swings ±30–110° over 20 s, chosen in advance. **Forecast:** 30 s before a shift, a HUD ribbon flutters and dust devils appear
on the new heading; flags at places and dust always show the current wind. The ribbon is shown while a fire weapon is out
or while the map is up.

### 6.6 Stealth and AI (`ai/`)

- **Activation.** Squads within 350 m have actors; the rest are data. Cap about 60 live NPCs.
- **Perception.** `sense` per NPC every 6 steps, staggered by id. Sight `game.ai.sight` (70 m) in a 120° cone, ×0.35 when
  you're crouched in unburnt tall grass, ×0.8 standing in it, ×0.6 at night, then a `clearSight` ray and the smoke test. Noise radii: sprint 18,
  walk 8, crouch 3, gunshot 120, suppressed 25, vehicle 60, explosion 250. A detection meter (0–1) rises by proximity at
  `1/game.ai.reaction`; HUD shows a subtle arc toward a watcher only above 0.5.
- **States.** Patrol → Suspicious (walks to the noise, barks) → Combat → Search → back. Plus Panic (fire) and Wounded.
- **Combat.** Squad blackboard shares your last known position. `game.ai.attackers` tokens (4) cap shooters at once. Roles: Assault
  flanks through `approachRing` and `createSiteNav().direction`; Suppressor holds cover and fires bursts; Officer calls and
  tosses frags. Cover from a per-place list of points. They keep their guns' wear rules, and a jammed NPC swears and clears it (a real
  window for you).
- **Wounded.** Below 25% HP, 30% fall and crawl (library clip `mesh2motion/Crawl`) calling out; a squadmate may drag them
  (`action:drag` pair). Finish them or leave them; they bleed out.
- **Checkpoints.** Guards shoot on sight **unless** your gun is holstered and your standing with that faction ≥ +1: then they
  shout, you get 6 s to pass at walking speed, and drawing a gun breaks it. Cleared posts repopulate after
  `game.ai.respawnHours` (6) game hours when you're over 300 m away. Claimed safehouses don't.
- **Patrols.** Technicals drive roads; on alert they chase and their gunner fires; passengers dismount when stopped.
- **Types:** Rifleman, Officer, Sniper (towers), Gunner (technical), Rocketeer, Flamer (Front only). Outfits by faction.
- **Wildlife and people.** Herds of 8–12 gazelles (`quadruped` crowd rig, custom body) graze and bolt from shots and fire.
  Vultures circle old fights if you have time. Townsfolk and refugees on `followRoute`.

### 6.7 Vehicles (`vehicles.ts`). Verified recipe

A **dynamic body in group `flyer`** (`flyer` touches only world and other flyers, so seated capsules don't fight it, while shots
still hit it): box 1.8 × 1.0 × 3.9 m, density 220 (mass ≈ 1,544 kg), `linearDamping:0.02, angularDamping:0.6, canSleep:false`. System in
phase `ai`. For each of 4 wheel points (±0.85, −0.2, ±1.35): cast a ray down the car's up axis, `maxDistance` 0.75, groups
`world, prop`, excluding itself. If hit, with compression `c = 1 − dist/0.75`:

- suspension `F = max(0, 42000 × c × 0.75 − 5200 × (point velocity · up))`;
- lateral grip `−side × (1400/4) × 2.2 / 0.35`, with `side` = point velocity · wheel right; drive `throttle × 7800 / 4`; both clamped to
  ±`F × 1.1`; on the front wheels, right and forward are turned by `steer × 0.5` rad;
- `physics.applyImpulse(body, (up×F + right×lat + fwd×drive) × dt, point)`.

Verified: tops out near 25–30 m/s, crosses rolling terrain stably at 0.32 ms a step, and replays to an identical hash. Tune the feel
by sliders (`game.car.*`).

- **Seating:** in phase `rules` each step, `placeActor(w, driver, seatPoint)` with the seat's feet about 0.3 m below the
  chassis centre (verified: the driver follows the car over 40 s). It throws `SIM_BAD_ARGUMENT` under a low level roof: catch
  it and eject the driver.
- **People on foot vs cars:** a `flyer` chassis doesn't block actors, so an unoccupied car also holds a **blocker**, a kinematic body in group `crowd` moved to the chassis each step (verified: it stops a
  walker dead, and it doesn't touch the chassis). Remove it while anyone is seated. Map shots on it to the vehicle. Hit people by `overlap` ahead of the bumper: damage by speed, then `handOff` to ragdoll.
- **Drawing:** chassis prop with `body:'none'`, writing its `sceneProp` `x, y, z, q` each step from the body. The view reads those
  fields and interpolates them, body or no body. Four wheel props and a steering-wheel prop are written the same way (spin,
  steer, suspension).
- **Driver view:** custom `cam3=driver` (`defineCamera`; §10.2), body drawn sitting (`action:drive`, hands on the wheel, `until:'next'`).
  `cameraInput` gives look; a view button toggles chase.
- **Damage:** HP 300. Under 40%: engine smoke, power ×0.6. Under 15%: flames, then explode after 10 s. **Repair:** stop, stand at
  the bonnet, hold use 3 s (`action:repair`, wrench sounds) back to 60%; a repair kit restores 100%.
- **Types:** open jeep; pickup technical with rear mounted MG (seat; `look` drives the mount, overheats, never jams); cargo truck
  (convoys, AI only); patrol boat with a bow MG.
- **Boat (verified: floats level, 16 m/s, beaches on a bank without blowing up):** a `flyer` body, box 1.7 × 0.7 × 5 m, density 150, `linearDamping:0.05, angularDamping:1.2`. At 4 float points (±0.7, −0.3, ±2),
  with `depth = waterY − point.y` above 0: upward `lift = max(0, 14000 × min(depth, 0.6) − 2400 × point vy)`. While any point is wet: `throttle × 5200` N forward and `−rudder × min(1, |speed|/4) × 1500` N sideways, both at the
  stern (0, −0.3, −2.2); drag at the centre of `−speed × |speed| × 14 − speed × 40` forward and `−side × 900` sideways.
- **Other rides:** Mine ropeway with `addZipline`. Rides live in the movement model, so they work for any seat whose wants hold
  `interact`; keep usables away from cable ends so one press means one thing. Ladders likewise.

### 6.8 Buddies and the ledger (`buddies.ts`)

The three mercs you didn't pick (§8.3) live at places, each `defineBody` unique. **Debt** per buddy, an integer from −3 to +3 in a
Ledger screen ("You owe Ilse 2."). Rescue: +1 owed. Helping them or finishing their alternate plan: −1. At +3 they stop coming ("You're
overdrawn."). **Alternate plans:** before a contract, visit a buddy for a better way to do it: extra objectives and pay, and they join
you (NPC with `seat`-free AI). **When a buddy falls** (scripted once in Contract 5, and possibly anywhere they fight): they lie down
calling you, with 60 s. Choose: syrette (hold use; costs one; saves them, debt −1), or **mercy** (the prompt appears with a sidearm out;
one shot; the cast comment forever), or leave them. Death is permanent and saved, and changes later lines and the ending's
last word.

### 6.9 Economy (`economy.ts`)

**Rough stones.** Contract pay 15–30. **Tin boxes** (8; 5–10 stones each) hidden in wrecks and mounds; the tick-box (D-pad down / B) clicks
faster inside 120 m and its lamp holds under 15 m; a mirrored lamp pulses on the map layer. **Ferreira's catalogue**, one item on screen at a time:
guns (unlocked at armoury crates), Reliability I/II (wear ×0.7/×0.5), syrette capacity, repair kit, camouflage smock (concealment +20%).
Prices 5–40. **Armoury crates** at safehouses reissue what you own, at full condition. Faction **standing**, one integer per side, changes
contract wording, checkpoint behaviour (§6.6) and dealer rumours.

### 6.10 Story engine (`contracts/`)

`def('contract', id, spec)` with a schema. Steps are data; hooks are rare. Sim holds `story` flags and the active step; page shows goal text.

```ts
def('contract', 'contract:receipts', {
  giver: 'cassius', faction: 'front', pay: 15, standing: { front: 1, authority: -1 },
  brief: 'text:receipts-brief',
  steps: [
    { id: 'go', goal: 'Reach the Km-40 post', at: 'km40', radius: 40 },
    { id: 'take', goal: 'Take the ledger from the radio hut', use: 'ledger-km40' },
    { id: 'back', goal: 'Bring it to Brother Cassius', talk: 'cassius' },
  ],
  alts: [{ buddy: 'yaw', pitch: 'text:receipts-alt', adds: [{ id: 'radio', goal: 'Burn the radio hut', burn: 'km40-hut' }], pay: 8, debt: -1 }],
});
```

Step kinds: `at`, `use`, `talk`, `kill`, `burn`, `carry`, `survive`, `escort`, `choice`. Lines run by event (`w.emit('say', { who, text })`), and
choices return through a custom intent (`'game:pick'`), so replays and co-op hold them.

### 6.11 Other world rules

Ceasefire: inside Sainte-Aurore's radius guns are forced holstered and nobody shoots first. Falling back from the map edge: §5.
Save points: sleeping, and each contract step. Water: §5.

### 6.12 Use (`use.ts`)

One system for every seat, replacing `addInteraction`. Each step (rate-limited per seat) find the nearest usable: a table of entries
(door, usable prop, dropped gun, vehicle seat, bed, crate, person, tape, tin box, phone) within 2 m of the eye and within 60° of the look,
preferring what the eye ray hits. Write it to `seat.target` with a prompt verb, which the page shows only for its own seat. A press acts through
the entry's data: doors with `useDoor`, a seat by entering the vehicle, a person by starting dialogue. **Carrying** (Contract 2's crates, charges): lift holsters your
gun and caps speed at walk; use again drops it; it can ride in a pickup's bed. **Picking up a gun** swaps it with the slot's, condition and all.

## 7. Weapons

Invented models, all drawn as low-poly props from boxes and frustums, each with new, worn and rusted tints. Values are starting points.

| Gun | Slot | Class | Dmg | Rate | Mag | Wear | Jam | Notes |
|---|---|---|---|---|---|---|---|---|
| Mle. 50 pistol | Side | Semi | 18 | 5 | 8 | 1 | 1 | Starter |
| Veteran .38 | Side | Revolver | 34 | 2 | 6 | 0.5 | 0 | Slow, never jams |
| Coach gun | Side | Sawn-off | 12×8 | 2 | 2 | 1 | 0.5 | Two shells |
| Flare pistol | Side | Fire | 5 | 1 | 1 | 0.5 | 0 | Ignites where it lands |
| OR-7 rifle | Prim | Auto | 16 | 10 | 30 | 1.2 | 1.5 | Everywhere; enemy junk |
| FR-2 bullpup | Prim | Auto | 18 | 12 | 25 | 0.6 | 0.5 | Dealer |
| Pump 12 | Prim | Shotgun | 10×8 | 1.2 | 6 | 0.8 | 0.7 | |
| Hunter .308 | Prim | Bolt | 90 | 0.8 | 5 | 0.6 | 0.5 | Scope |
| Whisper SMG | Prim | Suppressed | 12 | 13 | 30 | 1 | 1 | Noise radius 25 |
| "Mother" belt gun | Spec | LMG | 20 | 11 | 100 | 1.5 | 1.5 | Move slower |
| Sprayer | Spec | Flame | 6/tick | – | Fuel | 1 | 0.5 | Crop sprayer on your back |
| "Postman" launcher | Spec | Rocket | 150 | 0.4 | 1 | 0.5 | 0.2 | Ignites |
| Molotov, frag | Throw | | | | 4 each | | | R1 / G |
| Machete | Melee | | 60 | 1.4 | | | | Always carried |

## 8. Story, cast, writing

**Voice.** A writing style similar to the source's, in entirely original words. Dry, weary, literate; menace delivered politely; gallows humour with no jokes for the audience. People speak in complete
sentences, and nobody explains the theme. Never quippy, never heroic. All speech is gibberish audio (§9.3) with subtitles, so the words on
screen do all the work. Keep lines short for 10-foot reading: 1–2 lines, 90 characters a line at most.

### 8.1 The Auctioneer's tapes (cassettes at places; 6)

Sale patter, every one a "lot". Write in this register:

> "Lot fourteen. One rifle, Ostrava pattern, sold to the Front on Tuesday and to the Authority on Thursday. Same rifle. It has killed for
> both and complained to neither. I find that restful. Do I hear an objection? No. There never is."

> "Lot twenty-two. One bridge, unfinished. The contractor was paid twice and shot once. Reserve not met."

### 8.2 People

- **Commissioner Adèle Naré**, Provisional Authority, Customs House. Precise, polite, always eating. "You will hear that we are
  monsters. It is true, but we keep records."
- **Brother Cassius Oyelu**, Basin Front, Cinema Rex. Lay preacher; contracts as sermons. "The Lord sends rain on the just and the unjust. I
  send you, because you are cheaper."
- **Sister Perpetua**, Mission Sainte-Claire. "Take the bitter ones with water. If there is no water, take them anyway. God is not fussy and
  neither is the fever."
- **Madame Ferreira**, Ferreira & Daughter, General Merchants: a container at the airstrip. "Everything I sell works. For a while. That is also
  true of you."
- **Monsieur Lazare**, clerk at the Hotel Splendide. He hands you the warrant's paperwork, and he's the Auctioneer's old colleague.
- **The Auctioneer.** Heard everywhere, seen once: an old clerk in a rail car.

### 8.3 The mercs (pick one at New Game; the others become buddies)

| Merc | Who | Buddy gift | Sample line |
|---|---|---|---|
| **Ilse Brandt** | Ex-army field medic from Bremen; keeps accounts | Rescues faster | "That is two you owe me. I write them down." |
| **Tomás Arriaga** | Colombian demolitions; sings; likes fire too much | Explosive alternate plans | "The wind is a good employee. It never asks for a raise." |
| **Yaw Mensah** | Ghanaian ex-peacekeeper; the last decent man, and he resents it | Talks patrols down, holds posts | "I came here to keep the peace. Somebody should tell it." |
| **Mirela Dragan** | Romanian ex-Legion marksman; few words | Overwatch from high ground | "Stay down." / "Still alive. Disappointing for somebody." |

The pick screen shows four big portraits (rendered bodies, one at a time), never a stat sheet.

### 8.4 Contracts (about 45–60 minutes; each 3–9 minutes)

| # | Contract | Giver | What happens | Teaches |
|---|---|---|---|---|
| P | **Lot Zero** | – | Night on a barge among crates with the Auctioneer's mark. The Front lights the reeds. It burns. Wade ashore with a rusted revolver that jams. Crouch through grass past a patrol, heal, fever hits, you collapse. Your first buddy buys you from a patrol: first debt. Wake at the Mission. Sister Perpetua gives pills; Lazare's warrant names the Auctioneer | Move, grass, jam, syrette, fever, rescue, debt |
| 1 | **Receipts** | Cassius | Steal a ledger from Km-40. Yaw's alternate: also burn the radio hut | Vehicle, map, firefight, checkpoints, standing, dealer visit |
| 2 | **Bitter** | Perpetua | An aid truck's quinine is in a burning field; bring 3 crates before the wind turns | Fire hazard, wind, pills |
| 3 | **The Reserve** | Naré | Destroy the Front's fuel at Pump Station with a flare from upwind. Tomás's alternate: bring the engineer out alive first | Fire as a weapon, forecast, stealth, alternate plans |
| 4 | **Slash and Burn** | Cassius | Burn Belvédère's barns, whose crop pays the Authority. The wind shifts mid-mission toward you. Technicals arrive. Escape by patrol boat | Big burn, mounted guns, boat |
| 5 | **Second Invoice** | A buddy | A buddy's call from Salt Works. Fight in the open white pans, no fuel to help you. They're down at the end: syrette, mercy or leave | Mercy, permadeath, ledger, overdraw |
| 6 | **Lot One** | Lazare | The sale at Mine No. 6: both factions come to bid. Cross the fight, ride the ropeway, reach the rail car. The final tape: the last lot is you. Choose: **Serve the warrant** (shoot him; the bidding reopens Tuesday), **Buy him out** (60 stones; he flies, you get his fever cure and his ledger), or **Burn the catalogue** (light the stock with the wind toward you; the buddy who owes you most decides whether you get out) | Everything |

**Pacing.** Quiet and violence alternate: a tense drive or stalk of 1–3 minutes, then a fight of about 1 minute that ends in a fire, a jam or a rescue, then a breath at a safehouse, in town or on the river. Music follows by intensity and drops to wind and insects between fights. Each new mechanic arrives in a low-stakes moment before a contract leans on it, in the order of the Teaches column. Attacks of fever and wind shifts are what break up routine, so a safe road never stays safe.

After an ending: credits, then the world stays open for free roam from the title's Continue. Side content: 8 tin boxes, 6 tapes, 3 safehouses, 3 checkpoints,
1 convoy to ambush on the east road, 1 assassination by field telephone (a pole phone call: kill the courier on the south road; pays stones).

## 9. Look, animation, sound

### 9.1 Art direction: the engine's native low-poly style, sun-bleached

**Base style:** the engine's lit materials on simple shapes (clean look), no pixel or cel filters. **Palette:** straw `#B4985A`, red earth
`#80543A`, laterite `#9A4E2E`, bleached sky haze `#D8C9A8`, thorn green `#7F8A3E`, rust `#8C4A22`, char `#1F1A18`, flame `#F08A24`,
salt `#E8E2D0`. Authority khaki with red armband and a black bar stencil; Front mismatched with blue scarves and a white triangle stencil.

- **`look:dry-season`:** `sky:'sky:daylight'`, `grade` (temperature +0.18, saturation 0.9, contrast 1.08), `split` warm/teal, `vignette` 0.25,
  `air` (haze 0.35, height 8, shafts 0.6), light `grain`. A filter stays off until it has a `scope`, so give each `scope:'all'`. Verified:
  `sky:daylight` + `grade` over the savanna texture and thorn trees already reads as hot savanna.
- **`look:fever`:** laid over with `post.combine`: `chroma`, `lens`, `watercolor` bleed, heavy vignette, amount driven live.
- **Body camera and critical:** colour drain with `selective` or `grade`.
- **Materials and textures** (generators with `tileNoise`, `cellHash`): savanna, laterite, ironstone, salt crust, road gravel, mud plaster, corrugated tin
  (with rust streaks), sacking, painted stencil walls, tobacco leaf, canvas, gun metal, worn wood.
- **Props to make:** trees and grass (§5), charred variants, scorch, flame patch, termite mound, boulders; mud-brick huts, tin roofs, concrete bunker, watchtower,
  sandbags, tyre barricade, boom gate, oil drums, fuel tanks, propane, ammo and armoury crates, shipping container, water tower, power poles, pipeline, pump
  house, conveyors, salt mounds, drying barns and racks, rail cars, ropeway, jetty, barge, plane wreck, car wrecks, faction flags, posters; vehicles (§6.7); all guns (§7);
  syrette, pill bottle, tick-box, map, cassette player, tin box, field telephone. Engine props are fine for generic chairs, tables, lamps.
- **Buildings** as `defineLevel` format 2 storeys on the site, tile 0.5, 2–3 interiors worth entering per place, doors with `addLevelDoors` driven by your `use` system, breakable
  windows.
- **Bodies** (`defineBody`, read `.cache/engine-src/labs/playground/bodies/`): four mercs, two faction soldier bodies with seeded slot variation, officers, townsfolk, Sister, Naré, Cassius,
  Ferreira, Lazare, the Auctioneer, gazelle. Co-op armbands in the hub's seat colours.

### 9.2 Animation: the engine's system plus new work

Author with `defineAction` (`node x new action`), checked by `actionCheck`. Effector targets are `[forward, right, up]` metres from the shoulder centre; set them low and about 0.45 m forward
for body-camera moments.

- **Player:** `syrette`, `pill`, `surgery-dig`, `surgery-finger`, `surgery-burn`, `jam-clear`, `reload-rifle`, `reload-pistol` (for shoulder view and others to see), `repair`,
  `drive`, `gunner`, `map-hold`, `use-low`, `throw`, `machete-chop`.
- **People:** `rescue` + `rescued` pair, `drag` + `dragged` pair, `mercy-plea`, `wave-through`, `officer-point`, `panic-burn`, `smoke-idle`, `sit-talk`, `pray`, `eat`, `jam-swear`.
- **Library clips:** crawl (`mesh2motion/Crawl`), others by `node x anim find`. Import only the sets used, as `?raw`, to keep the file small.
- **Procedural:** wheels, steering, suspension, mounted gun, flags turning to the wind, ragdolls on death, conveyor, gazelle gait, rocking boat.

### 9.3 Audio: code only, no audio files

- **Music at 10% by default:** right after `createAudio()`, `audio.volume('music', 0.1)`. The engine's default is 0.5, so this is required and tested. Verified: it holds from before the first gesture (`locked`) through `running`, and the mixer reports 0.1. Stored volume wins after the player changes it.
- **Songs (`defineSong`, original, 3–5):** sparse desert-blues over plucked pentatonic arpeggios and hand drums: Title, Roam (low and tense, intensity layers), Combat
  (`audio.intensity` by alert state), Fever (detuned, slow), Ending. Nothing that echoes the source's score.
- **SFX (`defineSfx`):** each gun class with distance tail (`sound` on the weapon), dry click, jam rack, reload parts, machete, grenade, rocket, flare, fire crackle in three sizes, flare-up whoosh,
  barrel explosion, cook-off pops, engines by rpm (pitch on a loop), gears, skid, wrench, car door, boat, footsteps by surface (`SURFACE_STEPS`, add grass rustle), wind by speed, insects day
  and night, thunder, rain, tick-box click, tape hiss and clunk, syrette, pill rattle, surgery wince, heartbeat, UI cues.
- **Voices (`sounds/voice.ts`):** Animalese/Simlish-style gibberish. Turn each line's text into syllables by hashing its words; play them in sequence on the `ui` bus with per-character `pitch` while the subtitle
  types out; NPC barks use positional syllable bursts. Never real words. A syllable per vowel (verified: renders 0.1 s at a peak near 0.2, unclipped): `defineSfx('sfx:voice-a', { voices: [{ wave:'saw', freq:170, to:150, dur:0.1, vol:0.5,
  attack:0.008, filter:{ type:'bandpass', freq:F1, q:5 } }, { wave:'saw', freq:170, to:150, dur:0.1, vol:0.35, attack:0.008, filter:{ type:'bandpass', freq:F2, q:7 } }, { wave:'noise', dur:0.015, vol:0.05, filter:{ type:'bandpass', freq:2600, q:2 } }], variants:3, vary:0.05 })`, with (F1, F2) a 730, 1090; e 530, 1840; i 300, 2200; o 570, 840; u 320, 800.
- **Mix:** `room` reverb for interiors, `duck` during dialogue, `update(pose, queries)` each frame for 3D and occlusion. Settings sliders: Master, Music, Effects, Voices, Ambience.

### 9.4 Polish: what "complete and polished" means here

Do this pass before calling anything done: hit confirmation by sound and a small marker; muzzle light and flash, shell casings, dust puffs by surface; camera shake scaled by distance, with its setting; ragdolls on every death; tyre dust, suspension travel and engine note by speed; screen transitions eased, never popped; a loading screen with a line of field advice; subtitles timed to their voices; pause fading the world without stopping its sound abruptly; no stand-in boxes, no default engine colours or body on anything that matters, and no silent action anywhere.

## 10. UI and UX: 10-foot, controller first

Design for a PS5 DualSense, or any pad the browser reports in its standard mapping, played on a TV at 10 feet. Keyboard and mouse get the same game on the same screens, and must feel native rather than like stand-ins for controller buttons: mouse look is direct under pointer lock with no stick imitation or acceleration, number keys and the wheel pick weapons outright, menus and the map follow the pointer, and keys are the ones PC players expect.

### 10.1 Controls

Every device gets the same game on the same screens; no desktop layout. Own action maps (`defineActionMap`, `look:true, aimWith:'centre', lock:true` for first person; a second for vehicles). Bindings rebindable with `input.listen`.

| Action | DualSense | Keyboard and mouse |
|---|---|---|
| Move / Look | L stick / R stick | WASD / mouse |
| Fire / Aim | R2 / L2 | LMB / RMB |
| Jump, mantle | Cross | Space |
| Crouch | Circle | C (never Ctrl: Ctrl+W closes the tab) |
| Sprint | L3 | Left Shift |
| Use (tap), Reload and clear jam (hold) | Square, `Hold:PadWest` | E, R |
| Next weapon / holster (hold) | Triangle | 1 2 3, wheel / X |
| Melee | R3 | V |
| Throw | R1 | G |
| Syrette (surgery when critical) | L1 | H |
| Map / Tick-box / Pills / Fire-gun quick-draw | D-pad up, down, left, right | M / B / P / F |
| Ledger | Create | L |
| Camera view toggle | Hold Create | T |
| Pause | Options | Esc |
| Drive: throttle, brake, steer, handbrake, exit, seat | R2, L2, L stick, Cross, Square, Triangle | W, S, A D, Space, E, Q |

In a hub session the game ignores Options while Create is held. Verified with a stubbed DualSense: a tap on Square fires only `interact` and a hold only `reload`, and Create likewise splits `ledger` and `view`, with prompts reading `Square` and `Hold Square`.

**Mouse is native:** pointer lock in play; in menus hover moves focus and click picks (`createMenu`; custom panels too, `createPadCursor` for pad). **Things in the world:** under lock, the crosshair is the
pointer: looking at something usable highlights it with a world-anchored label, and with no weapon out a left click uses it, as well as E.

**Pad aim assist.** A shooter on a TV needs it. Pad only, on by default, a Settings toggle and a dev slider: while the stick is moving, turn slower near an enemy's chest and pull gently toward it, and snap about 2° when the sights come up. It's camera input, never sim: `cameraInput: () => ({ look: [right, up] })` adds to the stick's turn (verified: the two combine), and the aim that results goes out as the wire's look, so co-op stays in step.

**Prompts follow the last input.** `ui/glyphs.ts`: inline SVG for PlayStation shapes (✕ ○ □ △ L1 R1 L2 R2 L3 R3 Options Create, D-pad) and Xbox (A B X Y LB RB LT RT LS RS Menu View). Pick by `input.lastDevice`: `gamepad` → PlayStation
glyphs for any pad, or Xbox if Settings says so; keyboard → key caps and mouse icons with the actual binding (`input.bindingsFor`, `codeLabel`, `readKeyboardLayout`). Don't use `input.prompt` for pads: it names buttons by the pad's brand (verified: `A` on a pad reporting as Xbox, `Cross` on a DualSense), while the brief wants PlayStation glyphs by default on any pad. Every prompt element carries `data-glyph` for tests, and they swap at once when the device changes. Verified: with a
stubbed DualSense, `input.lastDevice` turns `gamepad`, `input.held`/`strength` work, and `input.prompt('jump')` is `Cross`.

### 10.2 First person without a closed door

The default camera is `cam3=first`. For **body moments** (surgery, syrette on critical, repair, rescue from the ground) blend (`__engine.camera.set(code, { blend: true })`) to custom `cam3=body` (`defineCamera`, `followCamera`, `makePose`):
at the eye about 0.1 m forward, pitch about −50°, body drawn whole because only `first` hides it. **Verified:** this shows the player's own sleeves, hands and gun in frame during a `defineAction`; framing needs tuning (holster the gun, arms farther out). The head's back faces don't block
it. `cam3=driver` is the same idea with a level pitch at the driver's eye. The world keeps running throughout.

With the gun holstered, the `first` rig shows raised fists. In the ceasefire town, use a level `cam3=walk` of the same kind (eye height 1.52 m, 0.16 m forward, pitch 0), which keeps the hands out of frame. Verified: it turns with the stick (yaw −= `input.look[0]` + `input.turn[0]` × 2.5 × dt, pitch likewise), and the action map's `look` follows it, so moving forward goes where it faces.

### 10.3 Screens and HUD

**10-foot rules:** type scales with `vh`; body text ≥ 3.2vh (34 px at 1080p), headings 6vh, subtitles 3.4vh on a dark band; 5% safe margins; one decision a screen; at most 7 visible list items; no dense, web-style data screens and no tables of data: the dealer and ledger show one thing large, stepped with
left/right. System font stacks only (stencil-ish headings via `Impact, "Arial Narrow"`, typed notes via `"Courier New"`); no font files. Visual language: field notebook, stencil, carbon-copy paper, rust.

**Teaching what you can and can't do.** Each mechanic gets a one-time contextual hint when first met, and a short line on the Ledger's **Field notes** page from then on, limits included: guns can't be repaired, only replaced; pills can't be bought; nobody swims; there's no fast travel; a claimed safehouse stays yours and a checkpoint doesn't.

**HUD (first person):** five syrette-shaped health segments, ammo and gun condition as a small rust bar, syrette and pill counts only when they change or are low; centre dot crosshair (none down the sights); goal line for 5 s when it changes; wind ribbon as per §6.5; damage arcs; prompts near centre-bottom. No
minimap, ever.

**Map in hand (`ui/map.ts`), the world doesn't pause.** A paper map on a CSS 3D layer (`perspective`, `rotateX`, slides up with an arm-raise ease, sways with the camera's turn), SVG hands gripping its edges in the merc's skin tone. Contour lines baked once to a canvas from `terrain.heights`; places as ink labels once discovered; roads, river; burn scars as hatch from fire state; an arrow for you; goal marker;
wind arrow. R stick or pointer moves a pencil cursor, Cross or click drops a waypoint (a world-anchored marker). You walk at half speed with it up, and you can drive with it up (it sits low and to the right). The tick-box shows beside it as a small device with lamp and needle.

**Screens:** Title (Continue, New Game, Co-op, Settings, Controls, About); merc pick; Pause (Resume, Map, Ledger, Settings, Controls, Dev Mode, About, Quit to title); Settings; Controls with rebinding (a picture of the pad and a short list); Dialogue (subtitle band with portrait name; choices as a short `createMenu`); Sleep (dawn, noon, dusk); Dealer; Ledger (a page each: debts,
factions, tapes, stones, field notes); Co-op lobby; Game over; Ending; Credits.

**Settings:** Master, Music (10%), Effects, Voices, Ambience; Glyphs (PlayStation / Xbox); Camera (first / shoulder); FOV (`cam.fov`); mouse and stick sensitivity and invert (`input.*`); pad aim assist; Crouch hold/toggle; Fever intensity; Screen shake; Subtitle size; Quality (`quality`); Fullscreen (`requestFullscreen`). Keep with `createStore`.

### 10.4 Touch-only devices

If `matchMedia('(hover: none) and (pointer: coarse)')` and no pad or key has been seen: no touch controls (`?touch=off` in `search`, no `touchLayout`; verified on Playwright's Pixel 7 profile, where the query is true, WebGPU runs, and a tap wakes no touch UI). Show a full-screen message exactly **"Controller or keyboard required"** and a **Settings** button over the attract mode, which keeps running. A pad press or key press dismisses it for good.

**Build the notice in plain HTML before `createEngine` starts,** so it never depends on the renderer. Verified both ways: on Chromium's Pixel 7 profile it sits on top of a running engine, and on WebKit's iPhone profile, which has no WebGPU here, it still shows. There the attract mode can't draw and the engine's own error text shows through, so make the notice's background opaque when `navigator.gpu` is missing.

If WebGPU is missing on any other device, show a plain message naming a browser that has it; the engine has no WebGL fallback, and the sim still runs.

## 11. Title, attract mode, dev mode, About

### 11.1 Title

`game.mode=title`: slow camera over the savanna at dusk with a fire line on the horizon (`cam3=rail`, or `cam3=fixed,x,y,z,yaw,pitch` in metres and degrees; keep it above the ground, since below it the picture draws white), title lettering in CSS, Title song. Restarting by mode is verified: `__engine.set('game.mode', 'b')`, `__engine.seed(n)`, and the scene comes up with the setting kept. The view lights and shadows round the player actor, so park it near the camera's target, out of frame. Starting play sets the mode and calls `inspector.seed(n)`.

### 11.2 Attract mode

After **10 s without input** on the title or any menu off the title (keys, mouse move or click, pad buttons or sticks past deadzone all reset the timer), switch to `game.mode=attract` and restart. A page-side director (`attract.ts`) plays a loop of vignettes by placing the bot with dev actions and feeding `inspector.step(1, botIntents)` on a paused clock, with cheats on (`game.god`, infinite ammo; teleporting
and scripted fires are fine). Its only job is to show as much of the demo as possible; it plays no part in balance. It's an AI-played demo in arcade and kiosk style, and it may cheat freely: infinite health, ammo and abilities, no clip. Each vignette runs 15–25 s with a banner: title + "Press any button":

1. Chase camera: a technical tearing down the road at dusk. 2. First person: firefight at Km-40. 3. Flare into grass; wind carries it; soldiers panic. 4. A jam at the worst moment, cleared. 5. Fever attack with mirages, pill. 6. Down, buddy rescue, ledger line. 7. Map in hand and tick-box, finding a tin box. 8. Boat with mounted gun past the burning estate. 9. Dealer and tape caption, then loop.

Camera and look change per vignette (`__engine.camera.set`). **The bot steers the first-person camera through `createEngine({ cameraInput: () => botView ? { view: [yaw, pitch] } : undefined })`** (verified, on a paused clock; cast it, since `view` isn't in the `CameraInput` type). `look` intents alone turn the actor but not that camera. **Any input exits at once** to the title (restart). It runs on touch-only devices too, and off-line: nothing is fetched. Never start it when automation should test the title unless asked: a setting `game.attract=auto|off|on` for tests.

### 11.3 Dev mode: Pause → Dev Mode (not in hub sessions)

Pad and mouse friendly, big rows, one category at a time:

- **Balance:** live sliders on `scenes/settings.ts`, each with its value and a per-row and global **Reset to defaults**: wear per shot, jam multiplier, player damage, enemy damage, enemy accuracy, reaction, sight, hearing, attackers, respawn hours; fire spread, wind bias, burn time, fire damage, regrow; wind speed, shift interval; fever interval, severity; HP, regen, syrette heal; car engine, grip, spring, damper; prices, stone payouts; day length; `movement.*`. Settings use `when:'now'` and systems read them at each use. `__engine.set` applies a value; reset writes each default from the table back the same way.
- **Cheats:** god, infinite ammo, no wear/jam, no fever, invisible to AI, noclip, one-shot kills.
- **Teleport:** every place, the crosshair point, a chosen map point.
- **Spawn:** any gun with chosen condition, vehicle, squad, buddy, tin box.
- **World:** hour, time scale (`time.scale`), wind dial, rain, ignite at crosshair, burn all, regrow all, fever now.
- **Story:** jump to any contract or step, set flags, debts, standing, give stones.
- **Debug overlays:** fire grid, AI state labels (`engine.ui.label`), detection meters, nav paths; `__engine.stats()` numbers; digest; quick save/load.

Sliders survive across resume, not across New Game unless "Keep" is on.

### 11.4 About/Credits

Reachable from title and pause; pad and mouse scrollable pages. Pages: Source Information (all fields in TASK.md), Testing Feedback, Engine Feedback, Prompt Feedback, Credits (engine, three.js, Rapier, @stdlib, motion clips per `data/anim/SOURCES.md`, source note: "inspired by Far Cry 2, not affiliated"). **One source of truth:** `scripts/bundle.mjs` reads the exit-interview file and injects it as data, so the screen and the file can't differ. Usage reads literally "added on import".

## 12. Multiplayer

**Decision: `shared-world`, host-sequenced deterministic lockstep.** The engine's one superpower is bit-exact determinism, so instead of replicating fire cells, ragdolls and NPCs, every copy runs the same scene from the same seed, and the host sequences everyone's input. No per-entity networking code.

**Verified end to end:** a probe with this recipe, the tags below and the game's own card passes the real harness in all four of its configurations (§13). In the browser, copies computed identical digests at the same step despite 150 ms latency, jitter and 5% loss, and the `server` copy ran `createHeadless` with no WebGPU. In Node, 2 and 4 seats plus a server copy, each with its own `game.me`, kept identical digests over 3,600 steps with moving seats, an NPC, a jeep and a spreading fire.

### 12.1 The mode: **Contract Run** (`game.mode=contract`)

1–4 mercs, about 5 minutes, in the Pump Station region: reach the depot, burn it (flare, sprayer or charges at 3 points, all driven by wind), survive the counter-attack, get out by the river boat or pickups. Revive teammates (hold use 3 s; bleed-out 40 s). Friendly fire and friendly fire-fire are on. All down, or time up without getting out: team loses. `AIHub.finish({ standings, scores, won, stats, awards })`: score = objective 500 + kills 50 + rescues 150 + extracted 200 − downs 100 − teammates burned 200; awards like "Best employee of the wind". The hub deals by these tags:

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Burn the depot, then get out alive together">
<meta name="hub:session-howto" content="Stick or WASD moves, R2 or click fires, Square or E uses">
<meta name="hub:session-minutes" content="6">
<meta name="hub:webgpu" content="required">
```

Solo in-hub (1 seat) still works. Names and colours come from `info.players`; set names with `textContent`, armbands by seat colour. No chat, emotes or custom names, no `alert`, no new tabs, no menus before the round, and pause opens only Settings without stopping the sim. Quit does nothing.

### 12.2 The session flow (order matters)

1. `session.js` is the first script after `<meta charset>`, unmodified (bundler does this).
2. In `main.ts`, first thing: `if (AIHub.active) info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true })`. `null` means play on as standalone.
3. Start: `createEngine` with `search: ?seed=${info.seed}&game.mode=contract&game.seats=${n}&game.me=${info.me}&cam3=first&gfx.warmUp=asked`. **`gfx.warmUp=asked` is required:** with the default `all`, four copies sharing one main thread blocked past the deadlines. On a software adapter also lower `game.detail` (one fixed value across copies; pass through the host if adapters differ, or simply use a fixed contract-mode density).
4. **Call `AIHub.ready()` as soon as the sim exists, not when the first frame draws.** Poll `typeof window.__engine?.step === 'function'` every 20 ms (reached in about 1 s); then `__engine.pause()`, start the pump, `ready()`. The harness allows all copies 20 s, and rendering took 5–25 s on software WebGPU with 4 frames; the view catches up by itself.
5. **The pump:** a 16 ms `setInterval` alone passes the harness (verified); once frames flow, step from `onFrame` for smooth motion, and keep the timer for when frames stop. All copies run on the paused clock through `inspector.step`. **While paused, the camera still turns with mouse and stick** (verified: look is view state), so aim feels immediate on every copy.
6. `AIHub.server`: no engine. `await createHeadless({ scene, seed, settings: { 'game.seats': n, 'game.me': -1, 'game.mode': 'contract' } })`, pump on the timer, call `finish`. If `navigator.gpu` is missing on a playing copy: `AIHub.fail('WebGPU is required')`.
7. `time-up` → host `finish` at once from its handler. `end` → stop input, stop sound (`audio.mute(true)`), stop stepping, send nothing. Host leaving voids the round by protocol; do nothing special.

### 12.3 The lockstep core (`net/lockstep.ts`)

```ts
const TURN = 4;                         // steps a turn: 15 messages a second, under the hub's 20
// Local wire, rebuilt each frame in onFrame from engine.input (held/strength), frame.camera (yaw, pitch) and an aim ray:
//   { m:[x,z], l:[yaw,pitch], a:[x,y,z], b:[...buttons pressed or held since last sent] }   rounded to 3 decimals
// client, every 66 ms:  net.send({ k:'i', w: wire }, { to: host, reliable: true })
// host, every 66 ms, ONE message however many turns are due (a burst per turn breaks the rate limit; verified):
//   const due = Math.floor(net.time() / (1000 / 60));
//   const n = Math.min(Math.floor((due - sent) / TURN), 30); if (n > 0) {
//     latest[me] = wire; const f = { k:'f', s: sent, n, i: { ...latest }, x: seatEvents };
//     net.send(f, { reliable: true }); queue.push(f); sent += TURN * n; }
// every copy: for each frame in order, for each of TURN*n steps, when due:
//   engine.step(1, { ...toIntents(f.i[me]), 'game:seats': othersAsIntents(f.i, me), ...(first ? { 'game:events': f.x } : {}) });
// Playout: run max(1, dt*60) steps a frame while frames wait, up to 12 when far behind, so motion is smooth at 60 Hz.
```

**Rules that keep copies identical:**

- **Everything the sim sees comes through the host's frames.** A `leave` event, a pick in a dialogue, a revive: all are host-sequenced (`x`, `game:events`, or the wire). Never feed a local `leave` straight to the sim: copies hear it at different times.
- `game.me` differs per copy, so `actor.player` differs, so **`engine.hash()` differs across copies by design**. Compare `digest.ts` (seats, NPCs, vehicles' positions and HP, fire state counts, as a string) instead. Clients send `{ k:'d', s, h }` every 2 s; the host logs mismatches and shows a small "out of sync" note; tests fail on it. No resync: `capture()` is far too big, and determinism holds by construction.
- Keep sim settings identical across copies (from the host via URL), dev mode off, and sanitize wire data (finite numbers, known buttons) before it reaches intents: `normalizeIntents` throws on junk.
- A tap shorter than a turn must survive: OR presses into `b` until the wire is sent.

### 12.4 The game on its own

Outside the hub, Title → Co-op runs the same Contract Run with no server, through the same `Net` interface (`send`, `on('message')`, `time`, `players`, `isHost`):

- **`net/tabs.ts`: "Same computer":** `BroadcastChannel`; host lists itself, others join; a second tab, window or screen. Verified from `file://` between two pages.
- **`net/rtc.ts`: "Invite code":** one `RTCPeerConnection` and ordered data channel per guest (star on the host), non-trickle ICE, `iceServers:[{urls:'stun:stun.l.google.com:19302'}]`, base64 of the description as a copy-and-paste code with a Copy button and a Paste field: host's code to guest, guest's reply to host. Verified from `file://` in two separate browser contexts with no STUN: connects in 0.3 s with 650-byte descriptions.

Use the hub's seat colours and a local 3 s countdown. Rule: none of this runs while `AIHub.active` (network only through the hub).

### 12.5 Own card

Because the game has its own world, use `card: true`: HTML/CSS card over the loading scene showing the game's name, players in colours with ready ticks, how to win, this player's controls, time left from the `card` event. Enter, Cross (button 0) or a click: `AIHub.answer('ready')`. Triangle (button 3), a named key or a click: `AIHub.answer('more')`. Read the pad with `navigator.getGamepads()` here, since the engine may still be warming up. No menus; nothing changes the round. Play begins at `AIHub.time() >= 0`, after `start`. The harness tests this by dispatching an Enter `keydown` in the frame, so listen on `window` (verified: its card check passes in all four configurations). Remove the card on `start`.

## 13. Testing

**One command:** `node tests/game/verify.mjs [sim|page|hub|final]`, printed in §16 (add `"verify"` to `package.json`). It prints only failures and a final one-line count (`verify: 212 passed, 0 failed`). The `hub` and `final` tiers are printed in §16 too. You write `tests/game/page.mjs`, which prints `FAIL <what>` lines and ends with `COUNT <passed> <failed>`. Rerun a tier only after changing what it covers.

**Test contract with the page:** `window.__game = { title, audio, screen(), open(name) }`, and each screen's root carries `data-screen="<name>"` (`title`, `pause`, `settings`, `dev`, `about`, `map`, `ledger`…). About keeps all its pages' text in that root, showing one at a time. Screenshots only for what a script can't judge; save them in `out/`. Keep one or two browsers open at a time. Don't use subagents or workflows to debate, review, judge or audit.

| Tier | What it proves |
|---|---|
| **sim** (Vitest, Node; seconds to minutes) | Starter's four kinds kept: golden replay (1), capture/restore, bot, rules. Wear lowers condition and swaps tier ids; jam rate at given conditions over many shots; clearing works. HP, regen, syrette, surgery, down, rescue, debt, overdraw. Fever timeline, pills, collapse. **Fire front metric** (§6.5), firebreaks hold, embers jump, rain stops it, regrowth. Wind shifts on schedule with forecast. Stealth: same patrol detects standing in the open and misses crouched in grass; burned grass exposes. AI squad clears cover and flanks; jam window. Checkpoint repopulation; holstered pass with standing. Vehicle: drives a route, stays on terrain, repairs, explodes; `placeActor` seat; run-over. Economy purchases, caches, armoury. Save → reload → same state fields. Contract engine: every contract and alt completes by script. **Designer path:** a test defines a new contract, checkpoint and dealer item purely as data, with no new code, and plays them. **Lockstep digest:** 1, 2, 4 headless copies with different `game.me` fed the same frames keep equal digests over 3,600 steps with a fight, a fire and a car in them. |
| **Whole-game playthrough** (sim) | `bot.ts` completes prologue through every ending on seeds 1–3 with `game.god`, through intents only, using teleport-free travel for contract 1 and dev travel after. One honest run: bot clears Km-40 without god on at least 7 of 10 seeds, as a balance alarm. **Feature coverage:** the main path must fire each of these at least once, proving the demo is long enough to show everything: jam, clear, gun break, syrette, surgery, down, rescue, mercy prompt, buddy death, fever warning, attack, pill, mirage, ignite, wind shift, ember jump, scorch, regrowth, drive, repair, vehicle explosion, boat, mounted gun, ropeway, stealth pass, holstered pass, purchase, reliability upgrade, armoury reissue, tin box, tape, sleep, save and load, standing change, alternate plan, every ending. |
| **page** (Playwright on the deliverable over `file://`) | Boots `ready` with no errors. Title → attract at 10 s; any key, mouse or pad input exits it (virtual clock not needed; use `game.attract` and a short setting for the wait, and one real 10 s test). Keyboard-only and pad-only (stubbed `navigator.getGamepads`) routes from title to first control. Prompts swap device on input; Xbox option; `data-glyph` values. Music bus reads 0.1 at first run; volume persists. `renderSong`, `renderSfx` and an `OfflineAudioContext` run of a voice line produce non-silent, unclipped audio (`node x qa audio`). Pause and Dev Mode: a slider changes behaviour, reset restores. Map opens without pausing the tick count. Mouse hover moves menu focus. About matches the exit-interview file. Phone profile shows the exact touch message, Settings button, no touch controls, attract running; WebKit's iPhone profile shows the message and Settings. Aim assist acts only with a pad. Everything that draws is Chromium only, since WebKit and Firefox have no WebGPU here; say so. |
| **hub** | Fetch `harness.html`, `bridge.js`, `round.js` to `.cache/hub/`; copy the deliverable beside them; serve on an OS-picked 127.0.0.1 port; confirm the page marker. All must give `window.__hubCheck.pass === true` (`document.body.dataset.complete === 'true'` when finished): `players=2`; `players=4&latency=150&jitter=50&loss=5`; the same with `scenario=host-leave`; `players=2&scenario=server`; all with `&auto=1`. Launch args include the WebGPU flags of §2. Then standalone: same deliverable alone, solo; two pages over tabs link; two contexts over invite codes, digests equal. |
| **final** | The acceptance check of §15.5, on what TASK.md says must exist. |
| **look** (rare) | `node x shot` numbers and `node x gallery prop` for art; 1920×1080 screenshots of each UI screen for the 10-foot judgement. A WebGPU canvas can come out blank in a headless screenshot; check state instead when it does. |

**Stand-ins for what this computer lacks** (never required for real): no controller, so replace `navigator.getGamepads` with a stub returning a standard-mapping pad via `add_init_script`/`addInitScript`; no touch device, so use Playwright's phone and tablet profiles and tap with `page.touchscreen`; nobody to listen, so check sound by what Web Audio produces, through an `OfflineAudioContext` or `AnalyserNode` levels; no second player, so play multiplayer with two pages or contexts; no real iPhone or iPad, so use WebKit with an iPhone profile, the closest there is, though it isn't iOS Safari and has no WebGPU here; no TV, so judge the 10-foot view from screenshots at 1920×1080.

**Not checkable here; say so in your feedback:** real GPUs, real pads, speakers, cross-machine determinism, iOS.

## 14. Build order

Build a walking skeleton first, then keep the deliverable working at every step. Run `npm run check` and the relevant `verify` tier before moving on.

| # | Do | Done when |
|---|---|---|
| 0 | §2: pick the title, set up, write out §16's scripts. Put the title in `labs/game/title.ts` (`export const TITLE = '…';`) and `<title>`. Make `import './net/stub';` the first import in `main.ts`. Run `node scripts/bundle.mjs` | `node tests/game/verify.mjs hub` is green with the starter and the stub (verified) |
| 1 | Site, terrain, river, roads, scatter, looks, day cycle; `movement:merc`; `seats.ts`; action maps; first person; HUD shell | Walk the map in first person; prompts follow device |
| 2 | `arms.ts`, wear and jam, `health.ts`, one gun, Rifleman, perception, Km-40. **Now `lockstep.ts` + digest test + `net/hub.ts`**, so co-op stays honest from here | Bot clears Km-40; digests equal; harness passes with guns |
| 3 | Fire, wind, flare, grass burning, scars, panic | Fire metric test; looks like fire in a shot |
| 4 | Vehicles, driver AI, patrols, repair, boat, mounted guns | Bot drives a route; vehicle tests |
| 5 | Fever, buddies, ledger, stones, tick-box, dealer, safehouses, saves, rest of the guns and enemy types | Tier tests green |
| 6 | Contract engine, all story content, dialogue, voices, tapes, map in hand, endings | Playthrough bot finishes the game |
| 7 | Contract Run, own card, tabs and invite links | Full hub tier green |
| 8 | Title, pause, settings, controls, dev mode, attract, touch notice, About | Page tier green |
| 9 | Art, animation, audio and the polish list (§9.4) across everything; balance by sliders and bot | No placeholder boxes or stand-ins anywhere; a search for TODO, FIXME, placeholder finds nothing |
| 10 | Finish: §15 | All below |

## 15. Finish line

### 15.1 Packaging

`node scripts/fetch-hub.mjs` once, then `node scripts/bundle.mjs`, both printed in §16. The dev folder and the deliverable share their name, so the bundler writes `../<dev folder's name>.html`. It inlines everything, so nothing depends on a CDN: about 6.7 MB for the starter, and it loads from `file://`. It puts the hub client first in the head, byte for byte, and injects the exit-interview file as `window.__about`, read by About. Run it again after writing that file. The protocol's full text arrives as `.cache/hub/README.md`; read it once.

### 15.2 Your own feedback

Keep `ENGINE-FEEDBACK.md` current as AGENTS.md asks. Starting points, if they bite you too: arms rig closed to games; weapons, melee and use only for the `player` actor; no scene access for game meshes (raw geometry through `.constructor` is a hack); TASK.md's browser flags vs the engine's; `capture` size; `setup.sh` downloads outside the folder; one scene per page. Don't patch the engine (it stays read-only); `npm run check` proves it. Keep `labs/game/README.md` true: what the game is, how it plays, the calls you made.

### 15.3 Exit interview

**Critical, from the brief:** put Source Information, Testing Feedback, Engine Feedback and Prompt Feedback in your final chat reply **and** on the About/Credits screen, writing "unknown" for anything you can't confirm. Say plainly what you did not verify.

| Source Information | What to write |
|---|---|
| Date | The date and time your TASK.md gives |
| Source | Far Cry 2 |
| Plan | The file name of the plan you were given: `PLAN.md` |
| Genre and Perspective | Open-world first-person shooter with systemic fire and survival pressure; first person, with shoulder and chase options and body-camera moments |
| Tech | my-3dge at the commit `engine-lock.json` names; TypeScript; three.js r182 on WebGPU; Rapier 0.21; HTML/CSS UI; Vite, Vitest, Playwright; what else you add, with versions |
| Art Direction | The engine's native low-poly style, sun-bleached, with new procedural art (§9.1) |
| Animation | The engine's animation system (procedural humanoid, actions, library clips) with new actions and flipbook guns |
| Audio | All in code: tracker songs and synthesized effects through the engine's audio; Animalese-style gibberish voices; music at 10% by default |
| Online | AI Hub Session Protocol v1 (the client version you bundled), shared-world host-sequenced lockstep; on its own, a same-computer tab link and WebRTC invite codes |
| Testing | The testing parameters allowed: from your TASK.md, as you used them |
| Research | Engine and hub source reading and this plan's verified probes, plus whatever you did, or none |
| Environment, Model | Exactly as your TASK.md gives them |
| Usage | Write "added on import". You can't see your own cost, so don't estimate it: the runner records it, and the import puts it on the About screen |

**The exit-interview file,** in exactly this shape, every value filled in as plain text ("unknown" for anything you can't confirm), checked with `JSON.parse`. Tools read it. Rebuild afterwards so About shows it.

```json
{
  "sourceInformation": {"date": "", "source": "", "plan": "", "genre": "", "perspective": "", "tech": "", "artDirection": "", "animation": "", "audio": "", "online": "", "testing": "", "research": "", "environment": "", "model": "", "usage": "added on import"},
  "testingFeedback": ["your answer to each Testing Feedback question, in order"],
  "engineFeedback": ["your answer to each Engine Feedback question, in order"],
  "promptFeedback": ["your answer to each Prompt Feedback question, in order"],
  "aiHub": {
    "name": "the game's title, as on its title screen",
    "tagline": "a few words to go under the title",
    "description": "one or two sentences for the catalogue",
    "type": "Game, Tech demo or Tool",
    "genre": "one of Action, Adventure, Fighting, Flight, Horror, Kids & Learning, Life Sim, Platformer, Puzzle, Racing, RPG, Shooter, Simulation, Sports, Stealth, Strategy",
    "source": "the work it's based on, e.g. Moby-Dick",
    "series": "its franchise, e.g. Star Fox, or empty",
    "players": "how many can play: 1, 1–2 or 1–4",
    "controls": "the controls, in one line",
    "tags": ["3 to 6 lowercase tags, e.g. 2d, 3d, arcade, story, co-op, versus, first-person, third-person, top-down, side-scrolling, pixel art, low-poly, retro, sci-fi, fantasy, comedy, vehicles, boss fights, exploration"]
  }
}
```

For this game: type `Game`, genre `Shooter`, source `Far Cry 2`, series `Far Cry`, players `1–4`, tags from `3d, first-person, co-op, vehicles, exploration, low-poly`. The catalogue's model, effort, CLI, date and usage come from the run's record, so they aren't asked here.

- **Testing Feedback:** How many issues did testing catch? How many would be considered critical issues / game breaking? What was the most helpful test you ran? What was the least helpful test you ran?
- **Engine Feedback:** What did you like most about the engine? Did you get stuck or guess wrong? What was the most important thing you had to build yourself? What was the hardest part about using the engine? What did you change in the engine, and why? (none if nothing) If you could change one thing about the engine, what would it be?
- **Prompt Feedback:** What did you like most about this prompt? What was confusing? What was the hardest thing to do? What would you change in this prompt?

### 15.4 Coverage: TASK.md → this plan → proof

Each requirement, where this plan states it, and what proves it was met once built. "Judged" marks what no script can decide: the builder looks at it and says so in the feedback.

| TASK.md item | Stated in | Proved by |
|---|---|---|
| Source: Far Cry 2; an original game inspired by it | §0.1, §1 | `final`: source fields; judged: original-work rules |
| Genre, perspective | §1 | Judged; the exit-interview file names them |
| Title: riff, 50 brainstormed silently, real RNG | §0.1, §2 | `final`: the pick's file holds 50 and the title |
| Research: your choice, reported | §0.1, §15.3 | `final`: research field filled |
| Single HTML in root, named by the pattern; dev files in a subfolder; CDN allowed | §0.1, §15.1 | `final`: names, nothing loaded from outside |
| Full workspace; engine read-only; rest of stack free | §0.1, §2, §3 | `final`: engine as shipped (`node x engine`); `npm run check` |
| Art direction | §0.1, §9.1 | `look`: `node x shot`, gallery; judged |
| Animation | §0.1, §9.2, §3 wall 3, §10.2 | `sim`: `actionCheck` on each action; `look`; judged |
| Audio: code only, gibberish voices, music 10% | §0.1, §9.3 | `final`: no audio files, music at 10%; `page`: songs, effects and a voice line non-silent, unclipped |
| Online and multiplayer: hub and on its own | §0.1, §12 | `hub`: harness in 4 configurations, tab link, invite codes; `sim`: lockstep digests |
| Shared machine: files, reads, ports, PIDs, browsers, Python, memory | §0.1, §2 | `hub.mjs` serves in-process on an OS-picked 127.0.0.1 port; the rest is discipline |
| Performance unlimited, FPS and optimization out of scope | §0.1 | Nothing to prove |
| Testing: headless, one command, failures and count, playthrough, screenshots rarely, no debate agents | §0.1, §13 | `verify.mjs`'s output; `sim`: playthrough |
| Stand-ins: pad, touch, audio, second player, iPhone, 1080p | §13 | `page`, `hub`, `look` |
| Feature-complete demo; long enough to show all features; what you can and can't do; pacing | §0.1, §8.4, §10.3 | `sim`: feature coverage, playthrough; judged: pacing |
| Complete, polished vertical slice | §0.1, §9.4, §14 step 9 | `look`; judged against §9.4's list |
| Infrastructure for later content with normal tools | §4, §6.10 | `sim`: designer path |
| Dev mode from pause, standard tools, live sliders, reset | §11.3 | `page`: slider changes behaviour, reset restores |
| Attract mode at 10 s, looping, cheats, any input exits | §11.2 | `page`: starts at 10 s, loops, each input kind exits |
| World, characters, themes, narrative tone | §1, §5, §8 | Judged, against §8's register |
| 10-foot, DualSense or any standard-mapping pad; native keyboard and mouse on the same screens; hover focus, world clicks; prompts by last input; PlayStation glyphs with Xbox option; no dense screens | §10 | `page`: pad-only and keyboard-only routes, glyph swap, Xbox option, hover focus, type sizes; `look`: 1920×1080 |
| Touch-only: message, settings button, attract runs | §10.4 | `final`: message and button; `page`: no touch controls, attract runs, WebKit iPhone |
| No TODOs, placeholders or stubs | §0, §0.1, §14 step 9 | `final`: scan of `labs/game`; `sim`: feature coverage |
| Source Information, in chat and About; every field | §11.4, §15.3 | `final`: About shows every value; the chat reply is on you |
| Exit-interview file: shape, every field, catalogue values | §15.3 | `final`: checked against the shape in TASK.md itself |
| Testing, Engine and Prompt Feedback questions | §15.3 | `final`: one answer a question, counted from TASK.md, and all shown in About |

### 15.5 Acceptance

Before you finish: write the exit-interview file, run `node scripts/bundle.mjs` again, then `node tests/game/verify.mjs` with every tier green. `tests/game/final.mjs` reads TASK.md itself for the name pattern, the exit-interview file's name and shape, the feedback questions, source, date, environment and model, so it holds for your TASK.md, not just this plan's. In the plan's own trial it passed on a complete mock and failed each fault put in on purpose. It can't judge the "judged" rows above, so do those by eye and report them honestly.

## 16. Scripts, verified as printed

These were extracted from this file and run unchanged in a mock builder folder on 2026-11-04. Step 0 of §14 pulls them out for you. Run `npm run format` once afterwards, since `npm run check` applies Prettier to them.

```js
/** @file scripts/fetch-hub.mjs: downloads the hub's client, harness and protocol into .cache/hub/, where lint and format can't touch them. */
import { mkdirSync, writeFileSync } from 'node:fs';

const base = 'https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/';
mkdirSync('.cache/hub', { recursive: true });
for (const name of ['session.js', 'harness.html', 'bridge.js', 'round.js', 'README.md']) {
  const reply = await fetch(base + name);
  if (!reply.ok) throw new Error(`${name}: ${reply.status}`);
  writeFileSync(`.cache/hub/${name}`, Buffer.from(await reply.arrayBuffer()));
}
```

```js
/** @file scripts/bundle.mjs: builds the deliverable, one self-contained page named after the dev folder, in the folder above it, with the hub client first in its head. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { build } from 'vite';

const root = process.cwd();
const HUB_METAS = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Burn the depot, then get out alive together">
<meta name="hub:session-howto" content="Stick or WASD moves, R2 or click fires, Square or E uses">
<meta name="hub:session-minutes" content="6">
<meta name="hub:webgpu" content="required">`;
const result = await build({
  root,
  configFile: false,
  logLevel: 'warn',
  base: './',
  resolve: { alias: [{ find: /^three$/, replacement: 'three/webgpu' }] },
  build: {
    write: false,
    modulePreload: false,
    cssCodeSplit: false,
    assetsInlineLimit: () => true,
    chunkSizeWarningLimit: Infinity,
    rollupOptions: { input: { game: join(root, 'labs/game/index.html') }, output: { inlineDynamicImports: true } },
  },
});
const files = {};
let html;
for (const item of [result].flat().flatMap((output) => output.output)) {
  const text = item.type === 'chunk' ? item.code : typeof item.source === 'string' ? item.source : new TextDecoder().decode(item.source);
  if (item.fileName.endsWith('.html')) html = text;
  else files[item.fileName] = text;
}
const find = (ref) => files[Object.keys(files).find((file) => ref.endsWith(`/${file}`) || ref === file || ref === `./${file}`)];
html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>|<link rel="stylesheet" crossorigin href="([^"]+)">/g, (_tag, script, style) => {
  if (style) return `<style>${find(style)}</style>`;
  const code = find(script).replaceAll('</script', '<\\/script');
  if (code.includes('<!--')) throw new Error('a script holds <!--: split it in the source');
  return `<script type="module">${code}</script>`;
});
const session = readFileSync('.cache/hub/session.js', 'utf8'); // unmodified: the hub replaces an unmodified copy with each new version
const exitFile = `../${/save these answers as (\S+\.json)/.exec(readFileSync('../TASK.md', 'utf8'))[1]}`; // About's one source of truth
const about = existsSync(exitFile) ? readFileSync(exitFile, 'utf8') : 'null';
const parts = [`<meta charset="utf-8" />`, `<script>${session}</script>`, HUB_METAS, `<script>window.__about = ${JSON.stringify(JSON.parse(about)).replaceAll('</script', '<\\/script')};</script>`];
html = html.replace('<meta charset="utf-8" />', () => parts.join('\n'));
writeFileSync(`../${basename(root)}.html`, html);
```

```js
/** @file tests/game/verify.mjs: the one command, node tests/game/verify.mjs [sim|page|hub|final], which prints only failures and a one-line count. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

const asked = process.argv[2];
let [passed, failed] = [0, 0];
const say = (line) => {
  failed += 1;
  console.log(line);
};
const tier = (file) => {
  if (!existsSync(file)) return say(`FAIL ${file} is missing`);
  const run = spawnSync('node', [file], { encoding: 'utf8', maxBuffer: 1e8 });
  const lines = `${run.stdout}${run.stderr}`.split('\n').filter((line) => line.startsWith('FAIL') || line.startsWith('COUNT'));
  for (const line of lines) {
    if (line.startsWith('FAIL')) console.log(line);
    else [passed, failed] = [passed + Number(line.split(' ')[1]), failed + Number(line.split(' ')[2])];
  }
  if (!lines.some((line) => line.startsWith('COUNT'))) say(`FAIL ${file} ended early: ${`${run.stdout}${run.stderr}`.slice(-400)}`);
};
const tiers = {
  sim() {
    mkdirSync('out/test', { recursive: true });
    spawnSync('npx', ['vitest', 'run', '--reporter=json', '--outputFile=out/test/verify.json'], { encoding: 'utf8', maxBuffer: 1e8 });
    for (const file of JSON.parse(readFileSync('out/test/verify.json', 'utf8')).testResults) {
      if (!file.assertionResults.length && file.status === 'failed') say(`FAIL ${file.name}: ${String(file.message).split('\n')[0]}`);
      for (const test of file.assertionResults) {
        if (test.status === 'passed') passed += 1;
        else if (test.status === 'failed') say(`FAIL ${test.fullName}: ${String(test.failureMessages?.[0]).split('\n')[0]}`);
      }
    }
  },
  page: () => tier('tests/game/page.mjs'),
  hub: () => tier('tests/game/hub.mjs'),
  final: () => tier('tests/game/final.mjs'),
};
for (const [name, run] of Object.entries(tiers)) if (!asked || asked === name) run();
console.log(`verify: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
```

```js
/** @file tests/game/hub.mjs: plays the hub's harness over the deliverable in the four configurations the hub's own test uses, on a port the OS picks. */
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { basename, extname, join } from 'node:path';
import { chromium } from '@playwright/test';

const RUNS = ['players=2', 'players=4&latency=150&jitter=50&loss=5', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave', 'players=2&scenario=server'];
const ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
copyFileSync(`../${basename(process.cwd())}.html`, '.cache/hub/game.html');
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer((request, response) => {
  const file = join('.cache/hub', new URL(request.url, 'http://x').pathname);
  if (!existsSync(file)) return response.writeHead(404).end();
  response.writeHead(200, { 'content-type': types[extname(file)] ?? 'text/plain' }).end(readFileSync(file));
});
await new Promise((listening) => server.listen(0, '127.0.0.1', listening));
const origin = `http://127.0.0.1:${server.address().port}`;
let [passed, failed] = [0, 0];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ARGS });
const mine = await (await fetch(`${origin}/game.html`)).text();
if (!mine.includes('name="hub:session"')) throw new Error('the page served is not this game');
for (const run of RUNS) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(`${origin}/harness.html?game=game.html&${run}&auto=1`);
  await page.waitForFunction(() => document.body.dataset.complete === 'true', undefined, { timeout: 170000 }).catch(() => {});
  const report = await page.evaluate(() => window.__hubCheck ?? { checks: [] });
  for (const check of report.checks) {
    if (check.pass) passed += 1;
    else {
      failed += 1;
      console.log(`FAIL ${run}: ${check.name}: ${String(check.detail).slice(0, 200)}`);
    }
  }
  if (!report.pass && !report.checks.some((check) => !check.pass)) {
    failed += 1;
    console.log(`FAIL ${run}: the harness never finished`);
  }
  await page.close();
}
await browser.close();
server.close();
console.log(`COUNT ${passed} ${failed}`);
```

```js
/** @file tests/game/final.mjs: the acceptance check, reading TASK.md itself: names, title pick, one file, hub client and tags, the exit-interview file, no stubs, engine untouched, and in a browser: boots, music at 10%, touch notice, About. */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { chromium, devices } from '@playwright/test';

let [passed, failed] = [0, 0];
const check = (name, ok, why = '') => {
  if (ok) passed += 1;
  else {
    failed += 1;
    console.log(`FAIL ${name}${why ? `: ${String(why).slice(0, 200)}` : ''}`);
  }
};
const alnum = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
const task = readFileSync('../TASK.md', 'utf8');
const line = (label) => new RegExp(`^- ${label}: (.*)$`, 'm').exec(task)?.[1].trim();
const questions = (head) => (new RegExp(`^${head}\\n\\n((?:- .*\\n?)+)`, 'm').exec(task)?.[1] ?? '').trim().split('\n').length;
const name = basename(process.cwd());
const deliverable = `../${name}.html`;
const html = existsSync(deliverable) ? readFileSync(deliverable, 'utf8') : '';
const title = /TITLE = '([^']+)'/.exec(existsSync('labs/game/title.ts') ? readFileSync('labs/game/title.ts', 'utf8') : '')?.[1] ?? '';
const source = /^SOURCE: (.*)$/m.exec(task)[1].trim();

// Names and the title.
check('title constant in labs/game/title.ts', title !== '');
check('deliverable beside the dev folder', html !== '', deliverable);
check('names follow the pattern in TASK.md', alnum(name) === alnum(`${title}${source}${/\[GameTitle-SOURCE-([^\]]+)\]\.html/.exec(task)[1]}`), name);
const pick = existsSync('out/title-pick.json') ? JSON.parse(readFileSync('out/title-pick.json', 'utf8')) : {};
check('title picked by a real RNG from 50', pick.count === 50 && pick.title === title, JSON.stringify(pick));
check('title in the page', (/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '').includes(title));

// One file, with the hub's client and tags.
const outside = html.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>|<style>[\s\S]*?<\/style>/g, ''); // inline code only: a script loaded from elsewhere stays to be counted
const refs = [...outside.matchAll(/\b(?:src|href)="([^"]*)"/g)].map((match) => match[1]).filter((ref) => !ref.startsWith('data:'));
check('one file: nothing loaded from outside', refs.length === 0, refs.join(' '));
const client = existsSync('.cache/hub/session.js') ? readFileSync('.cache/hub/session.js', 'utf8') : '?';
check('hub client first in the head, byte for byte', html.includes(`<meta charset="utf-8" />\n<script>${client}</script>`));
for (const [meta, value] of Object.entries({ session: '1', 'session-players': '1-4', 'session-mode': 'shared-world', webgpu: 'required' })) check(`tag hub:${meta}`, html.includes(`<meta name="hub:${meta}" content="${value}">`));
for (const meta of ['session-goal', 'session-howto', 'session-minutes']) check(`tag hub:${meta}`, new RegExp(`<meta name="hub:${meta}" content="[^"]+">`).test(html));
check('no audio files', !/data:audio|\.(mp3|ogg|wav|m4a|flac)["'`]/i.test(html));

// The exit-interview file, against the shape and the questions in TASK.md.
const exitFile = `../${/save these answers as (\S+\.json)/.exec(task)[1]}`;
let exit = {};
try {
  exit = JSON.parse(readFileSync(exitFile, 'utf8'));
  check('exit-interview file parses', true);
} catch (error) {
  check('exit-interview file parses', false, error.message);
}
const shape = JSON.parse(/^\{\n[\s\S]*?\n\}$/m.exec(task)[0]);
const kind = (value) => (Array.isArray(value) ? 'array' : typeof value);
const walk = (want, got, path) => {
  for (const key of new Set([...Object.keys(want), ...Object.keys(got ?? {})])) {
    const at = `${path}.${key}`;
    check(`exit-interview shape: ${at}`, key in want && kind(want[key]) === kind(got?.[key]));
    if (kind(want[key]) === 'object') walk(want[key], got?.[key], at);
    else if (key !== 'series') check(`exit-interview value: ${at}`, (got?.[key] ?? '').length > 0);
  }
};
walk(shape, exit, 'file');
const info = exit.sourceInformation ?? {};
const hub = exit.aiHub ?? {};
check('usage is "added on import"', info.usage === 'added on import', info.usage);
check('date, environment and model as in TASK.md', info.date === line('Date') && info.environment === line('Environment') && info.model === line('Model'));
check('source as in TASK.md', info.source === source && hub.source === source);
check('plan names a file', /\.md$/.test(info.plan ?? ''), info.plan);
for (const [key, head] of [['testingFeedback', 'Testing Feedback'], ['engineFeedback', 'Engine Feedback'], ['promptFeedback', 'Prompt Feedback']]) check(`${head}: one answer a question`, exit[key]?.length === questions(head), `${exit[key]?.length} of ${questions(head)}`);
check('catalogue name is the title', hub.name === title, hub.name);
check('catalogue type', ['Game', 'Tech demo', 'Tool'].includes(hub.type), hub.type);
check('catalogue genre', /one of (.*)/.exec(shape.aiHub.genre)[1].split(', ').includes(hub.genre), hub.genre);
check('catalogue players', ['1', '1–2', '1–4'].includes(hub.players), hub.players);
check('catalogue tags', hub.tags?.length >= 3 && hub.tags?.length <= 6 && hub.tags.every((tag) => tag === tag.toLowerCase()), hub.tags);
check('About data is the exit-interview file', html.includes(`window.__about = ${JSON.stringify(exit).replaceAll('</script', '<\\/script')};`));

// No stubs; the engine as shipped.
const scan = (dir) => readdirSync(dir).flatMap((entry) => {
  const path = join(dir, entry);
  return statSync(path).isDirectory() ? scan(path) : [path];
});
const stubs = scan('labs/game').filter((path) => !path.endsWith('.test.ts') && !path.includes('replays') && /\b(TODO|FIXME|XXX|placeholder|stubbed)\b/i.test(readFileSync(path, 'utf8')));
check('no TODOs, placeholders or stubs in labs/game', stubs.length === 0, stubs.join(' '));
check('engine as shipped', spawnSync('node', ['x', 'engine'], { encoding: 'utf8' }).status === 0);

// In a browser: from file://, on a first run.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader'] });
const url = `file://${resolve(deliverable)}`;
if (html) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(url);
  await page.waitForFunction(() => window.__engine?.ready === true, undefined, { timeout: 120000 }).catch(() => {});
  check('boots from file://', await page.evaluate(() => window.__engine?.ready === true));
  const engineErrors = await page.evaluate(() => window.__engine?.errors?.length ?? 1);
  check('no errors at start', errors.length === 0 && engineErrors === 0, errors[0]);
  check('music at 10% on a first run', await page.evaluate(() => window.__game?.audio?.volume('music') === 0.1));
  await page.evaluate(() => window.__game?.open('about'));
  const shown = await page.evaluate(() => document.querySelector('[data-screen="about"]')?.textContent ?? '');
  for (const [key, value] of Object.entries(info)) check(`About shows ${key}`, shown.includes(value));
  for (const key of ['testingFeedback', 'engineFeedback', 'promptFeedback']) for (const answer of exit[key] ?? []) check(`About shows ${key}`, shown.includes(answer));
  await page.close();
  const phone = await browser.newContext({ ...devices['Pixel 7'] });
  const touch = await phone.newPage();
  await touch.goto(url);
  await touch.waitForFunction(() => document.body.textContent.includes('Controller or keyboard required'), undefined, { timeout: 60000 }).catch(() => {});
  const notice = await touch.evaluate(() => ({ text: document.body.textContent.includes('Controller or keyboard required'), settings: [...document.querySelectorAll('button')].some((button) => button.textContent.includes('Settings')) }));
  check('touch notice', notice.text);
  check('touch Settings button', notice.settings);
  await phone.close();
}
await browser.close();
console.log(`COUNT ${passed} ${failed}`);
```

```ts
/** @file labs/game/net/stub.ts: step 0's session stub, enough of the protocol for the harness to pass while the starter runs; lockstep.ts replaces it at step 2. */
interface Hub {
  active: boolean;
  isHost: boolean;
  connect(options: object): Promise<{ players: { id: number }[] } | null>;
  ready(): void;
  send(data: object, options: object): boolean;
  on(event: string, handler: () => void): void;
  finish(outcome: object): void;
}
const hub = (window as unknown as { AIHub?: Hub }).AIHub;
const info = hub?.active ? await hub.connect({ mode: 'shared-world', seats: [1, 4] }) : null;
if (hub && info) {
  hub.ready();
  const beat = setInterval(() => hub.send({ k: 'beat' }, { reliable: false }), 200);
  hub.on('time-up', () => {
    if (hub.isHost) hub.finish({ standings: [info.players.map((player) => player.id)], won: true });
  });
  hub.on('end', () => clearInterval(beat));
}
export {};
```

## Appendix A: TASK.md, sentence by sentence

For whoever wants to check this plan against the brief without taking anyone's word for it; builders can skip it. Every sentence of TASK.md is listed by its line number, beside the words in this plan that answer it and where they are. A script built this table from the two files and refused any sentence left unassigned and any wording not found in the plan; which words answer which sentence was the plan author's call, so read them against each other. Long sentences are cut with an ellipsis, and names each builder's TASK.md sets for itself are left out. Only headings and JSON punctuation (19 lines) have no row.

| Line | TASK.md | This plan |
|---|---|---|
| 1 | SOURCE: Far Cry 2 | top (line 3): Inspired by Far Cry 2. |
| 3 | Genre: Pick the game genre(s) that best fit the source and would make the best game. | §1 (line 60): Genre: open-world first-person shooter with systemic fire and survival pressure. |
| 5 | Perspective: Pick the camera perspective(s) that best fit the genre and source and would make… | §1 (line 60): Perspective: first person, with an over-the-shoulder option in Settings |
| 7 | Game Title: A playful riff on SOURCE's name. | §0.1 (line 31): A playful riff on the source's name. |
| 7 | Silently brainstorm 50 titles, then pick one with a real random number generator (e.g., run c… | §0.1 (line 31): Silently brainstorm 50 titles (don't show the list), then pick one with a real random number … |
| 9 | Research: Whether and how much to research is your choice. | §0.1 (line 33): Research. How much is your choice. |
| 11 | Package: For ease of deployment and sharing provide a single html file [the name your TASK.md… | §0.1 (line 34): bundle into one HTML file in the folder above it, named as your TASK.md says. |
| 11 | Dependencies that can be downloaded do not have to be included in the html file if that is ea… | §0.1 (line 34): External CDN dependencies are allowed, but this plan's recipe inlines everything |
| 13 | Tech Stack: Build on https://github.com/michaelcrosato/my-3dge#make-a-game-with-my-3dge, in t… | §0.1 (line 36): my-3dge in its full workspace. |
| 13 | The engine stays read-only, as the AGENTS.md it gives your game says: add whatever systems, a… | §0.1 (line 36): The engine stays read-only; add whatever systems, art and animation the game needs on top. |
| 13 | The rest of the tech stack is your choice. | §0.1 (line 36): The rest of the stack is your choice |
| 15 | Art Direction: Use the engine's native style as the base. | §0.1 (line 38): The engine's native style and animation system as the base |
| 15 | Make new art assets for whatever makes the game feel like the source; the engine's asset libr… | §9.1 (line 585): Props to make: |
| 17 | Animation: Use the engine's native animation system as the base. | §9.2 (line 594): Animation: the engine's system plus new work |
| 17 | Make new animations for whatever makes the game feel like the source. | §9.2 (line 596): Author with defineAction |
| 19 | Audio: All music, sound effects and voices are written in code, with no audio files. | §0.1 (line 39): All music, effects and voices are written in code with no audio files |
| 19 | Voices are Animalese/Simlish-style gibberish. | §0.1 (line 39): voices are Animalese/Simlish-style gibberish |
| 19 | Music is to be set to 10% volume by default. | §9.3 (line 607): Music at 10% by default: right after createAudio(), audio.volume('music', 0.1). |
| 21 | Online: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub | §0.1 (line 40): Follow the [AI Hub session protocol] |
| 24 | Create a subfolder called [the name your TASK.md gives] to keep all your dev files in. | §2 (line 100): Name the dev folder from that title by the pattern in your TASK.md |
| 24 | You can develop separate modules, then bundle into a single file [the name your TASK.md gives… | §0.1 (line 34): Develop in separate modules in the dev folder, then bundle into one HTML file |
| 24 | You may use external CDN dependencies. | §0.1 (line 34): External CDN dependencies are allowed |
| 24 | Do not read files outside what you need: other agents work in the folders beside this one. | §0.1 (line 41): Don't read files outside what you need |
| 24 | They share this machine's ports and processes too. | §0.1 (line 42): share this machine's ports and processes |
| 24 | Prefer file:// and the engine's headless tools. | §0.1 (line 42): Prefer file:// and the engine's headless tools. |
| 24 | If you need a server (the AI Hub harness does), bind 127.0.0.1 on a port the OS picks (python… | §0.1 (line 43): bind 127.0.0.1 on a port the OS picks and confirm the page is your game before trusting a res… |
| 24 | Stop only processes you started, by their PID: never pkill, killall, fuser -k, or kill whatev… | §0.1 (line 43): Stop only processes you started, by PID: never pkill, killall, fuser -k, or killing whatever … |
| 26 | Performance: Treat the performance budget as unlimited. | §0.1 (line 47): Treat the budget as unlimited |
| 26 | Add as much detail, enemies, effects, lights, and shadows as the scene needs. | §0.1 (line 47): add as much detail, enemies, effects, lights and shadows as the scene needs. |
| 26 | Out of scope (handled later): FPS targets, optimization. | §0.1 (line 47): FPS targets and optimization are out of scope. |
| 28 | Testing: Test as much as you like with headless tools: scripts that play the game and check i… | §0.1 (line 49): Headless scripts that play the game and check its state, including a scripted playthrough of … |
| 28 | Keep them behind one command that prints only failures and a one-line count, and rerun it onl… | §0.1 (line 49): behind one command that prints only failures and a one-line count, rerun only after changing … |
| 28 | Use screenshots only for what a script can't check. | §0.1 (line 50): Screenshots only for what a script can't check. |
| 28 | Don't use subagents or workflows to debate, review, judge or audit. | §0.1 (line 50): No subagents or workflows to debate, review, judge or audit |
| 30 | Effort: Spend effort however you see fit. | §0.1 (line 51): Effort. Spend it however you see fit. |
| 33 | Checked 2026-11-04 20:05 (America/Vancouver) by node check-environment.mjs. | §2 (line 117): as checked 2026-11-04 20:05 (America/Vancouver) by node check-environment.mjs |
| 35 | - Computer: Worki9: 13th Gen Intel(R) Core(TM) i9-13900K, 32 cores, 20 GB RAM, 8 GB swap. | §2 (line 117): Worki9, 13th Gen Intel i9-13900K, 32 cores, 20 GB RAM, 8 GB swap |
| 35 | Ubuntu 26.04.1 LTS on WSL2 (Linux 6.18.33.1-microsoft-standard-WSL2). | §2 (line 117): Ubuntu 26.04.1 LTS on WSL2 (Linux 6.18.33.1-microsoft-standard-WSL2). |
| 36 | - Space: 850 GB free in the home folder. /tmp: 9.8 GB, in memory (tmpfs), 8.2 GB free when ch… | §2 (line 117): 850 GB free in the home folder; /tmp is 9.8 GB in memory (tmpfs), 8.2 GB free when checked. |
| 37 | - Display: none for runs (they run with DISPLAY unset), so a headed browser needs xvfb-run. | §2 (line 117): No display in runs (DISPLAY unset). / §2 (line 127): so skip headed mode and xvfb. |
| 38 | - Browsers: Playwright 1.63.0 for Python (from playwright.sync_api import sync_playwright), w… | §2 (line 123): Use --enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-angle=swif… |
| 38 | Phone and tablet device profiles are built in. | §2 (line 117): phone and tablet profiles built in. |
| 39 | WebGPU only works on a secure page: file:// or http://127.0.0.1. | §2 (line 125): WebGPU needs a secure page: file:// or http://127.0.0.1. |
| 39 | A WebGPU canvas can come out blank in a headless screenshot, so check the game's state instead. | §2 (line 125): A WebGPU canvas can come out blank in a headless screenshot, so check the game's state instead. |
| 40 | For Node, npm install playwright@1.63.0 in your folder uses the browsers already downloaded; … | §2 (line 130): you don't need npm install playwright@1.63.0. |
| 41 | Playwright runs here with PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 (already set for … | §2 (line 130): Leave PLAYWRIGHT_HOST_PLATFORM_OVERRIDE as it is set. |
| 42 | - Tools: node 24.22.1, npm 11.19.1, python3 3.14.8, pip3 26.2.1, git 2.56.0, gh 2.46.0, curl … | §2 (line 117): Tools: node 24.22.1, npm 11.19.1 |
| 43 | - Rust: rustup's toolchains 1.96.0, 1.98.1, stable; the wasm32-unknown-unknown target on 1.98.1. | §2 (line 117): Rust: rustup's toolchains 1.96.0, 1.98.1 and stable |
| 44 | - Not installed: sox, bun, deno. | §2 (line 117): Not installed: sox, bun, deno. |
| 45 | - Network: internet works (github.com, registry.npmjs.org). | §2 (line 117): Internet works (github.com, registry.npmjs.org). |
| 46 | - Memory: earlyoom is on: when memory runs out it ends the biggest browser, so "Target closed… | §0.1 (line 46): means memory ran out (earlyoom), not a bug in your game |
| 46 | Run fewer browsers at once rather than retrying. | §0.1 (line 46): run fewer browsers rather than retrying. |
| 50 | No script can check these, so they're written by hand. | §13 (line 810): Stand-ins for what this computer lacks (never required for real) |
| 50 | Test with the stand-ins; anything that needs the real thing is checked as far as it can be he… | §13 (line 810): Stand-ins for what this computer lacks (never required for real) |
| 52 | - No physical controller. | §13 (line 810): no controller, so replace navigator.getGamepads |
| 52 | Emulate one: replace navigator.getGamepads with a stub that returns a pad in the standard map… | §13 (line 810): replace navigator.getGamepads with a stub returning a standard-mapping pad via add_init_scrip… |
| 53 | - No touch device. | §13 (line 810): no touch device, so use Playwright's phone and tablet profiles |
| 53 | Use Playwright's phone and tablet profiles, which have touch, and tap with page.touchscreen. | §13 (line 810): use Playwright's phone and tablet profiles and tap with page.touchscreen |
| 54 | - Nobody to listen. | §13 (line 810): nobody to listen, so check sound by what Web Audio produces |
| 54 | Check sound by what Web Audio produces: render it with an OfflineAudioContext, or read levels… | §13 (line 810): through an OfflineAudioContext or AnalyserNode levels |
| 55 | - No second player. | §13 (line 810): no second player, so play multiplayer with two pages or contexts |
| 55 | Play multiplayer with two browser pages (or contexts) on this computer. | §13 (line 810): play multiplayer with two pages or contexts |
| 56 | - No real iPhone or iPad. | §13 (line 810): no real iPhone or iPad, so use WebKit with an iPhone profile |
| 56 | WebKit with an iPhone profile is the closest; it isn't iOS Safari. | §13 (line 810): the closest there is, though it isn't iOS Safari |
| 57 | - No TV. | §13 (line 810): no TV, so judge the 10-foot view from screenshots at 1920×1080 |
| 57 | Judge the 10-foot view from screenshots at 1920×1080. | §13 (line 810): judge the 10-foot view from screenshots at 1920×1080 |
| 61 | - Other agents run here at the same time. | §0.1 (line 42): other agents work in the folders beside yours |
| 61 | Keep one or two browsers open at once, and close them when you're done. | §0.1 (line 44): Keep one or two browsers open at once and close them. |
| 62 | - Keep every file you make inside your own folder, not /tmp or a parent folder: /tmp is shared. | §0.1 (line 41): Keep every file inside your own folder, not /tmp or a parent folder |
| 63 | - The browsers are already downloaded: don't run playwright install or playwright install-deps. | §0.1 (line 44): Never run playwright install or playwright install-deps. |
| 64 | - The system Python has Playwright and nothing else. | §0.1 (line 44): The system Python has Playwright and nothing else |
| 64 | For one (Pillow, numpy …), use uv: uv run --with pillow python script.py, adding --with playw… | §0.1 (line 45): uv run --with pillow python script.py, adding --with playwright==1.63.0 when the script drive… |
| 68 | Build an original game inspired by the source. | §0.1 (line 27): An original game inspired by Far Cry 2 |
| 72 | Create a feature-complete demo. | §0.1 (line 27): a feature-complete demo and a complete, polished vertical slice |
| 72 | Capture what makes the source distinctive (its world, characters, themes and tone) and turn i… | §0.1 (line 27): turns the source's world, characters, themes and tone into mechanics, pacing and UX. |
| 72 | The demo must be long enough to show ALL features and gameplay mechanics so a player can clea… | §0.1 (line 28): It must be long enough to show all features and mechanics, so a player clearly understands ho… |
| 72 | Treat the demo as a complete, polished vertical slice. | §9.4 (line 618): Polish: what "complete and polished" means here |
| 72 | It should contain all the infrastructure, systems, and polish needed so the remainder of the … | §4 (line 242): Adding a contract or a checkpoint takes no new code, and a test proves it |
| 74 | Include a dev mode, reachable from the pause menu, with the standard tools for testing the ga… | §11.3 (line 708): Dev mode: Pause → Dev Mode |
| 74 | Balance is key, so expose the most important gameplay variables as live sliders, with a reset… | §11.3 (line 712): Balance: live sliders on scenes/settings.ts, each with its value and a per-row and global Res… |
| 76 | Attract Mode: After 10 seconds without input on the title/menu screen, start a looping AI-pla… | §11.2 (line 701): After 10 s without input on the title or any menu off the title / §11.2 (line 706): Any input exits at once to the title |
| 76 | The AI (or replay) can be simple and may cheat freely (infinite health, ammo, abilities, no c… | §11.2 (line 702): it may cheat freely: infinite health, ammo and abilities, no clip. |
| 76 | Its only job is to show as much of the demo as possible, the attract mode is not meant to bal… | §11.2 (line 702): Its only job is to show as much of the demo as possible; it plays no part in balance. |
| 78 | Multiplayer: Follow https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub for multiplaye… | §12 (line 728): Decision: shared-world, host-sequenced deterministic lockstep. / §12.4 (line 784): Outside the hub, Title → Co-op runs the same Contract Run with no server |
| 80 | Narrative tone: Use a writing style similar to the source's. | §8 (line 516): A writing style similar to the source's, in entirely original words. |
| 83 | Design the game around a PS5 DualSense (or any pad the browser reports in its standard mappin… | §10 (line 624): Design for a PS5 DualSense, or any pad the browser reports in its standard mapping, played on… |
| 83 | With keyboard and mouse it's the same game on the same screens, not a separate desktop layout… | §10 (line 624): Keyboard and mouse get the same game on the same screens, and must feel native rather than li… |
| 83 | The keyboard uses the keys PC players expect for the genre. | §10 (line 624): keys are the ones PC players expect |
| 83 | The mouse aims, looks, and clicks menu items and things in the world (hover moves the focus) … | §10.1 (line 650): in menus hover moves focus and click picks / §10.1 (line 651): with no weapon out a left click uses it |
| 83 | On-screen prompts follow the input used last: PlayStation glyphs for the controller (with a S… | §10.1 (line 655): PlayStation glyphs for any pad, or Xbox if Settings says so; keyboard → key caps and mouse ic… |
| 85 | Do not use overly dense, web-style data screens. | §10.3 (line 669): no dense, web-style data screens and no tables of data |
| 87 | Touch-only devices: no touch controls; show "Controller or keyboard required" and the setting… | §10.4 (line 687): no touch controls / §10.4 (line 687): Show a full-screen message exactly "Controller or keyboard required" and a Settings button |
| 87 | Let the attract mode run. | §10.4 (line 687): over the attract mode, which keeps running |
| 90 | No TODOs, placeholders, or stubbed features. | §0.1 (line 52): No TODOs, placeholders or stubbed features. |
| 90 | The demo is complete. | §0.1 (line 52): The demo is complete. |
| 93 | Write "unknown" for anything you can't confirm. | §15.3 (line 844): writing "unknown" for anything you can't confirm |
| 94 | - Date: as your TASK.md gives it | §15.3 (line 848): \| Date \| The date and time your TASK.md gives \| |
| 95 | - Source: the work it's based on | §15.3 (line 849): \| Source \| Far Cry 2 \| |
| 96 | - Plan: the file name of the plan you were given to build from, or none | §15.3 (line 850): \| Plan \| The file name of the plan you were given: PLAN.md \| |
| 97 | - Genre and Perspective: genre and camera perspective used | §15.3 (line 851): \| Genre and Perspective \| |
| 98 | - Tech: stack, libraries/engines, with versions if applicable | §15.3 (line 852): \| Tech \| my-3dge at the commit engine-lock.json names |
| 99 | - Art Direction: style used | §15.3 (line 853): \| Art Direction \| The engine's native low-poly style |
| 100 | - Animation: system used | §15.3 (line 854): \| Animation \| The engine's animation system |
| 101 | - Audio: music, sound effects and voice used | §15.3 (line 855): \| Audio \| All in code |
| 102 | - Online: network features used, or none | §15.3 (line 856): \| Online \| AI Hub Session Protocol v1 |
| 103 | - Testing: testing parameters allowed | §15.3 (line 857): \| Testing \| The testing parameters allowed |
| 104 | - Research: research done, or none | §15.3 (line 858): \| Research \| Engine and hub source reading |
| 105 | - Environment: as your TASK.md gives it | §15.3 (line 859): \| Environment, Model \| Exactly as your TASK.md gives them \| |
| 106 | - Model: as your TASK.md gives it | §15.3 (line 859): \| Environment, Model \| Exactly as your TASK.md gives them \| |
| 107 | - Usage: write "added on import". | §15.3 (line 860): \| Usage \| Write "added on import". |
| 107 | You can't see your own cost, so don't estimate it: the runner records the real cost, tokens a… | §15.3 (line 860): You can't see your own cost, so don't estimate it |
| 109 | Exit interview: before you finish, also save these answers as the exit-interview file in this… | §15.3 (line 862): The exit-interview file, in exactly this shape |
| 109 | Tools read it (the game's run record and the AI Hub catalogue), so write plain text, and chec… | §15.3 (line 862): Tools read it. |
| 111 | "sourceInformation": {"date": "", "source": "", "plan": "", "genre": "", "perspective": "", "… | §15.3 (line 866): "sourceInformation": {"date": "", "source": "", "plan": "", "genre": "", "perspective": "", "… |
| 115 | "aiHub": { | §15.3 (line 870): "aiHub": { |
| 116 | "name": "the game's title, as on its title screen", | §15.3 (line 871): "name": "the game's title, as on its title screen", |
| 117 | "tagline": "a few words to go under the title", | §15.3 (line 872): "tagline": "a few words to go under the title", |
| 118 | "description": "one or two sentences for the catalogue", | §15.3 (line 873): "description": "one or two sentences for the catalogue", |
| 119 | "type": "Game, Tech demo or Tool", | §15.3 (line 874): "type": "Game, Tech demo or Tool", |
| 120 | "genre": "one of Action, Adventure, Fighting, Flight, Horror, Kids & Learning, Life Sim, Plat… | §15.3 (line 875): "genre": "one of Action, Adventure, Fighting, Flight, Horror, Kids & Learning, Life Sim, Plat… |
| 121 | "source": "the work it's based on, e.g. Moby-Dick", | §15.3 (line 876): "source": "the work it's based on, e.g. Moby-Dick", |
| 122 | "series": "its franchise, e.g. Star Fox, or empty", | §15.3 (line 877): "series": "its franchise, e.g. Star Fox, or empty", |
| 123 | "players": "how many can play: 1, 1–2 or 1–4", | §15.3 (line 878): "players": "how many can play: 1, 1–2 or 1–4", |
| 124 | "controls": "the controls, in one line", | §15.3 (line 879): "controls": "the controls, in one line", |
| 125 | "tags": ["3 to 6 lowercase tags, e.g. 2d, 3d, arcade, story, co-op, versus, first-person, thi… | §15.3 (line 880): "tags": ["3 to 6 lowercase tags, e.g. 2d, 3d, arcade, story, co-op, versus, first-person, thi… |
| 128 | The catalogue's model, effort, CLI, date and usage come from the run's record after you finis… | §15.3 (line 885): The catalogue's model, effort, CLI, date and usage come from the run's record |
| 132 | - How many issues did testing catch? | §15.3 (line 887): How many issues did testing catch? |
| 133 | - How many would be considered critical issues / game breaking? | §15.3 (line 887): How many would be considered critical issues / game breaking? |
| 134 | - What was the most helpful test you ran? | §15.3 (line 887): What was the most helpful test you ran? |
| 135 | - What was the least helpful test you ran? | §15.3 (line 887): What was the least helpful test you ran? |
| 139 | - What did you like most about the engine? | §15.3 (line 888): What did you like most about the engine? |
| 140 | - Did you get stuck or guess wrong? | §15.3 (line 888): Did you get stuck or guess wrong? |
| 141 | - What was the most important thing you had to build yourself? | §15.3 (line 888): What was the most important thing you had to build yourself? |
| 142 | - What was the hardest part about using the engine? | §15.3 (line 888): What was the hardest part about using the engine? |
| 143 | - What did you change in the engine, and why? | §15.3 (line 888): What did you change in the engine, and why? |
| 143 | (none if nothing) | §15.3 (line 888): What did you change in the engine, and why? (none if nothing) |
| 144 | - If you could change one thing about the engine, what would it be? | §15.3 (line 888): If you could change one thing about the engine, what would it be? |
| 148 | - What did you like most about this prompt? | §15.3 (line 889): What did you like most about this prompt? |
| 149 | - What was confusing? | §15.3 (line 889): What was confusing? |
| 150 | - What was the hardest thing to do? | §15.3 (line 889): What was the hardest thing to do? |
| 151 | - What would you change in this prompt? | §15.3 (line 889): What would you change in this prompt? |
