# PLAN: an original gothic co-op action RPG, inspired by the source named in TASK.md

You are building this game from this file, alone. Read it once, start to finish, before your first command. Everything
marked **Verified** was run on this computer against engine commit `e7a1243` and session client 1.4.0 with a throwaway
prototype, so trust it over your instincts. Where a number is given without "verified", it is a starting value: tune it.
If your `engine-lock.json` names a newer engine commit, check any verified fact you lean on hard; it may have moved a little.

Paths are relative to your dev folder. TASK.md gives the names of your dev folder, your deliverable HTML and your
exit-interview file; this plan says "the dev folder", "the deliverable" and "the exit interview".

---

## 0. Ground rules

1. **Title.** Pick it the way TASK.md says, first, since your folder name needs it. It is a playful riff, so it never
   contains the source's name unchanged. It goes on the title screen, in `<title>` and on the About screen. Everything
   below is written so it fits any title; the title screen adds the subtitle *A Chronicle of the Long Vesper*.
2. **An original game, not a recreation.** Copy the genre and how it feels: its mechanics, its pacing, its operatic doom.
   Copy nothing else. World, characters, names, levels, art, UI look and music are all this plan's own.
   - Never use these or anything like them: Sanctuary, Tristram, Caldeum, Westmarch, Pandemonium, Horadrim, Nephalem, Cain,
     Leah, Adria, Tyrael, Imperius, Auriel, Azmodan, Belial, Malthael, Leoric, the Butcher, Prime Evil, Soulstone, Kanai,
     Paragon, Torment, Greater Rift. No class called Barbarian, Demon Hunter, Witch Doctor, Monk, Wizard, Crusader or
     Necromancer.
   - No twin red and blue orbs flanked by statues, no flaming-letter logo, no falling star on a cathedral, no recreated
     town or act, no quoted melody. Use no outside art, audio or text from the source, and do not go looking for any.
3. **Done means done.** No TODOs, placeholders, stubs or "coming soon". If time runs short, cut *quantity*, in this
   order, and never a system or a class: chunks per biome (not below 8), Reliquaries (not below 10), lore books (not below
   6), dialogue variety, Vigil Wardens (not below 1).
4. **Leave git alone.** The starter's AGENTS.md says "commit as you go", but your dev folder sits inside another
   repository. Don't commit, push, or `git init`.
5. **Share the machine** as TASK.md says: one or two browsers at a time, OS-picked ports on 127.0.0.1, stop only your own
   PIDs. No subagents or workflows to debate, review, judge or audit.
6. **Performance is out of scope.** Add all the detail, enemies, effects, lights and shadows the scene wants. The two
   architecture calls in §3 that look like optimisation are there because the alternative makes every test take minutes
   and breaks real-time play, not to chase a frame rate.
7. **Research:** none is needed beyond this plan. Say so in your Source Information unless you do some.

---

## 1. The game

**Genre and perspective:** an isometric hack-and-slash action RPG for 1 to 4 players, from a fixed three-quarter camera.

**Pitch.** On the ninth night of the Long Vesper, the great bell Old Sorrow rang, though it has had no clapper for three
hundred years, and the dead got up. You are one of the Unsung, mortals the High Choir above and the Undersong below both
forgot to count. The kindly Canoness of Evensong begs you to climb the Minster of Saint Oriel and silence the bell. You
fight your way up through crypt and drowned nave and you do it. Then the world goes quiet and you learn what the bell was
for: for three hundred years it had been holding the Undersong down. The Canoness has waited forty years for someone to
cut that rope. Now you go down into the Undersong, tear out the heart of the First Voice, cast a new clapper, and ring
Old Sorrow with your own hands.

**Pillars. Every decision serves one of these.**

- **Crunch.** Every hit has weight: a stop, a flinch, sparks, a number, a sound. Kills fling bodies and burst scenery.
- **The horde and the fireworks.** Packs of 6 to 20, skills that clear a screen, combos of skill forms that look different.
- **Loot that sings.** Showers of drops; a Reliquary tolls a bell and rains ash so you hear it before you see it.
- **Operatic doom with a dry sense of humour.** Villains taunt you from the walls. A narrator mourns everything. The
  half-deaf bell-tuner was right all along and will not stop saying so.
- **Friends on a couch or across the hub.** Four players, one world, no lag-hiding tricks that desync.

**The vocabulary.** Use these words everywhere: in code identifiers, UI and dialogue. They keep the game its own.

| Genre idea | This game |
| --- | --- |
| The hero's kind | **the Unsung** |
| Heaven and its servants | **the High Choir**, **the Gilded** (hollow golden statues that walk) |
| Hell and its rulers | **the Undersong**, **the Voices**, **the Hollow** (its creatures) |
| Risen dead; the cult | **the Unburied**; **the Unrung** |
| Skill variants | **Inflections** (each skill has a base form and two more) |
| Rarities | **Plain** (bone white), **Hallowed** (pale blue), **Gilded** (gold), **Reliquary** (ember crimson, ash and a bell), **Vestment** (verdigris green, sets) |
| Elite packs | **Anointed** (a pack sharing affixes), **Exalted** (a named leader with minions) |
| Timed random dungeon | **Vigil**; its tiers are **Hours** 1 to 12; its fill bar is **the Candle**; its boss the **Warden of the Hour** |
| Post-cap progress | **Devotion** |
| Difficulties | **Vespers** (normal), **Compline** (hard), **Matins** (expert), **Anguish I to III** |
| Waypoint; town portal | **Bellpost**; **the Homeward Bell** |
| Health pickup; potion | **Wafers**; **Sacramental Wine** |
| Gems; stash | **Tuning Stones**; **the Poor Box** |
| Kill-streak bonus | **Carnage** |
| Treasure runner; cursed chest | **Tithe-Imp**; **Shriving Chest** |
| Money; salvage materials | **silver**; **Iron Filings, Silver Filings, Gilt, Ember Ash** |
| Damage types | **Physical, Ember, Rime, Blight, Toll** |

**Everything a player must be able to see in this demo:** three classes; 18 skills in 54 forms; passives; 8 gear slots
with visible gear tiers; five rarities with sets and unique powers; sockets; salvage, crafting and affix rerolls; a town
with shops and a shared stash; a full story with a twist and an ending; five zones plus the town; 17 monster types; 8
elite affixes; 4 bosses with phases; events, shrines, traps, destructibles, secret walls and lore books; six difficulties;
Vigils with twelve Hours; Devotion; three save slots; couch co-op and hub co-op; settings with rebinding; a dev mode; an
attract mode; an About screen.

---

## 2. Setup on this machine (verified)

Run in the empty dev folder:

```sh
src=$(mktemp -d) && git clone --depth 1 https://github.com/michaelcrosato/my-3dge "$src" \
  && node "$src/tools/game/new-game.mjs" . --name game && rm -rf "$src"
npm ci            # 28 s. Do NOT run scripts/setup.sh: it downloads a Node and a Chrome into ~/.cache, neither needed here
npm test          # the starter's 6 tests pass on this machine's Node 24.22.1
export CHROMIUM_PATH="$HOME/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell"
node x shot labs/game   # numbers and a text thumbnail; add --png only when a script can't answer the question
```

Then read `AGENTS.md` and `docs/GAME-GUIDE.md` (once), and look things up in `docs/API.md`, `docs/ERRORS.md`, `node x
describe <kind>`, `node x help`. `labs/box/` is the engine's worked example of combat, crowds, props, looks and sound:
read `labs/box/scenes/fight*.ts`, `labs/box/cast/*.ts` and `labs/box/sounds/*`, copy the patterns, never import it.

**Traps that cost me time. Don't rediscover them.**

| Trap | Fix |
| --- | --- |
| This machine sets `TMPDIR` to a long path. Full Chrome dies with "Socket path too long"; `npx tsx` dies with `listen EINVAL`. | Point `CHROMIUM_PATH` at the **headless shell** above: `node x shot` works with no `/tmp` use. Write scripts as `.mjs` or Vitest tests. If you must use `tsx`, prefix that one command with `TMPDIR=/tmp`. |
| TASK.md's WebGPU flag `--use-webgpu-adapter=swiftshader` stalls this engine's warm-up: not ready after 120 s in the headless shell, nor after 40 s in full Chrome. | In your own Playwright scripts launch with `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-angle=swiftshader`. Ready in about 12 s from `file://`, with the default headless shell. |
| Software rendering draws about 1 or 2 frames a second here with shadows on (611 ms a frame), far fewer with several copies open. | Never wait on frames. Step with `__engine.step(n)`, read state, and call `__engine.render(n)` only when you need a picture. In browser tests add `?quality=low&gfx.warmUp=asked`: verified on a large build, `quality=low` took draw calls from 4,848 to 384 and a frame from 611 ms to 92 ms, and `asked` took startup from 28 s to 13 s. |
| `node x shot --cam cam=45,...` fails. | Give the bare value: `--cam 45,42,1.5,1,1`. |
| `python3 -m http.server 0` buffers its "port" line when piped. | `python3 -u -m http.server 0 --bind 127.0.0.1`, then read the first line. |
| `npm run check` runs Prettier and ESLint over all of `labs/game`. | No `any`. Every file opens with a `@file` comment and stays under 400 lines (hard limit 600): split content tables by class or family. Keep vendored text as `.txt` so nothing reformats it. |
| `w.add(id, …)` right after a spawn throws `SIM_NO_ENTITY`: a spawn joins the world at the step's end. | Pass everything in the spawn: `spawnActor(w, { …, components: { foe: {} } })`, `spawnProp(w, placement, { components })`. |
| `npm run dev` binds port 5173, which another agent may hold. | You rarely need it: `node x shot` and the one-file build from `file://` cover the same ground. |

---

## 3. Architecture

### 3.1 Folders

Only `labs/*/scenes/**` and `labs/*/cast/**` get the engine's determinism lint, so **all sim-side code lives under those
two folders**. Tests sit beside their modules.

```
labs/game/
  index.html            shell: hub metas, #view canvas, #ui root. No session client here (see §13)
  main.ts               boot order (§3.8)
  README.md             what the game is, the calls you made, and the designer guide (§3.11)
  scenes/               SIM-SIDE
    world.ts            defineScene('game:world'), setup, step
    settings.ts         balance settings (§3.10), game.seat, game.seats, game.world
    seats.ts            seat commands, hero input, the player flag (§3.6)
    worldgen/           pure generator, zone table, chunk text per biome, hand-made maps
    zones.ts            streaming, transitions, Bellposts
    combat/             damage pipeline, statuses, ground effects, projectiles, Carnage
    skills/             the runner, resources, cooldowns
    ai/                 brains, packs, tokens, elites, bosses
    loot/               rolls, affixes, rarity, economy, inventory rules
    quests/             the quest graph, triggers, dialogue ids
    vigil.ts  difficulty.ts  shrines.ts  events.ts  traps.ts  save.ts  commands.ts  dev.ts
  cast/                 SIM-SIDE data tables: heroes/, monsters/, bosses/, items/, props/, moves/, telegraphs/
  art/                  PAGE: materials, textures, bodies, emitters, skies, looks, geometry
  cameras/              PAGE: the couch camera mode
  sound/                PAGE: sfx, songs, voices, mix rules, event-to-sound map
  ui/                   PAGE: focus, prompts, HUD, every screen, attract, dev mode, touch notice
  net/                  PAGE: hub connection, lockstep driver, couch pads
  bot/                  a pure brain, used by the tests and by attract mode
  tools/                build-one-file.mjs, verify.mjs, browser tests
  vendor/aihub-session.txt   the session client, byte for byte
```

**Which side defines what (verified):** `defineScene, defineGlyph, defineProp, defineSettings, defineComponent, defineMove,
defineAction, defineTelegraph, defineDevAction` work sim-side. `defineBody, defineMaterial, defineTexture, defineSky,
defineLook, defineEmitter, defineSfx, defineSong, defineActionMap, defineLevel, createEngine` are page-side only; the sim
names their entries by id string (`spawnActor(w, { body: 'body:penitentT2' })`).

### 3.2 One scene, one level, generated from the seed

The engine can't switch scenes in a running page. A reload would drop fullscreen and audio, and in a hub session it is
forbidden. So **the whole game is one scene, `game:world`, and one level holding every zone** side by side.

- `scenes/worldgen/` exports a pure `makeWorld(seed, shape)` returning `{ text, zones, placements }`. It uses integer maths
  and its own PRNG (mulberry32) only, because the page calls it outside the sim's math swap and the sim calls it inside.
  `shape` is the setting `game.world`: `story` builds every zone; `round` builds only a hub session's small first room and
  its one Vigil plot.
- The page calls `makeWorld(seed, shape)` **before** `createEngine`, and registers `defineLevel('level:world', { text, file:
  'world', recipes })`. The scene's `setup` calls `makeWorld(w.seed, shape)`, then `compileLevel` and `addLevelBodies`.
- The seed comes from the hub, else `?seed=`, else a fresh number at each page load: new dungeons every session, while
  heroes, quests and gear live in the save. Make `freshSeed()` return 1 when `navigator.webdriver` is true, so `node x shot`
  and your browser tests repeat exactly. `inspector.seed(n)` restarts the run **with the same `n` only**; a different
  seed would mismatch the level already drawn.
- Verified on a 300 × 300 level: `compileLevel` 70 to 150 ms, `NavGrid` 300 ms, a flow field 0.5 ms, an A* path 0.6 ms.

### 3.3 Floors from the level; walls and everything else as instanced props

**Verified, and the most important number in this plan.** The same 300 × 300 world took **113 s to start** with walls as
level glyphs (each wall run is its own mesh: 1,767 objects, 45,552 draw calls in the warm-up) and **12 to 15 s** with
walls as props (one instanced batch per part: about 100 objects). Build it the second way.

- Level glyphs: one **floor glyph per floor look** (`mesh: '<recipe>'`, recipe `{ shape: 'surface', materials: [...],
  castShadow: false, receiveShadow: true }`), each one welded mesh and one draw call. One **undrawn solid glyph** for walls
  and rock: `{ top: 3, solid: true, collider: 'box', nav: { walkable: false }, full: true }` and no `mesh`.
- Walls: a body-less prop per wall tile, spawned from the level's tiles with `spawnProp`. No physics body: the undrawn
  glyph is the collider.
- **The static cut.** The camera stands south-east and never turns. A wall tile with floor to its north or west would hide
  that floor, so it spawns as a **low** variant (0.45 m); every other wall is tall (3 m). This replaces the engine's
  cutaway, which only serves level meshes.
- **Hide the stage's ground.** The stage draws a `material:stone` plane under the level, which shows through anywhere with
  no floor. Spawn one body-less `prop:voidSlab` at y −0.012: a box 900 × 0.004 × 900 in a near-black material with `shadow:
  false`. (A black floor glyph on the rock tiles also works but costs about 400 objects.)
- Keep a 20-tile rock margin round the world, so no view reaches the slab's edge.

### 3.4 Zone streaming, the green room, and looks

- **Streaming.** Spawn a zone's wall and scenery props when the first hero enters it; despawn them when none is left in
  it. Its packs, chests and destructibles keep their state in a zone record. This keeps entities to 2,000 or 3,000. A
  loading fade hides the burst.
- **The green room.** A new body-and-build pair first drawn mid-play triggers a warm-up: verified, swapping one hero's
  `puppet.body` to an unseen pair took `warmUps` from 2 to 6. So `setup` spawns one idle actor of every body in a walled-off
  corner, before the first warm-up, and despawns them after play starts. Assert `__engine.stats().pipelinesAfterWarmUp ===
  0`, with `warmUps` stable, in the browser test.
- **Scale check, verified:** 120 extra props of 3 parts each and 20 extra custom bodies took startup from 12 s to 28 s in
  software rendering, with `pipelines` only 75 to 82 and `pipelinesAfterWarmUp` 0, so define as many props as you like.
  Set `shadow: false` on small parts: each casting part is one draw per shadow-map face, the reason that build drew 4,848
  draw calls a frame against 384 with shadows off.
- **A look per zone.** Each zone has its own `look:` and sun-less `sky:`. Verified: switching `post.look` between looks
  whose skies have no sun builds nothing (`warmUps` and `pipelines` unchanged). Switch at zone entry behind the fade. Never
  use a sky with a sun; that changes the shader key.

### 3.5 Characters

- **Heroes and most monsters are actors** with their own `defineBody`: `spawnActor(w, { at, character, player: false, anim:
  { build, weapon }, body: 'body:x', components: {...} })`. Verified: custom bodies work, and swapping `puppet.body` at run
  time works, so visible gear is real. Give each hero class three armour tiers and each weapon type a tier: `body:penitentT1`
  to `T3`, swapped from what is equipped.
- **Cost, verified in Node under load:** 50 chasing actors 10 ms a step, 100 actors 16 ms, 200 actors 34 ms. The sim must
  keep real time or lockstep and play both suffer, so the design number is **at most 60 awake actors**, a slider in dev mode.
  Packs wake at 16 m and sleep or despawn when no hero is within 40 m for 10 s.
- **Crowd rigs (`addAgent`, `crowdBody`) are much cheaper, but their looks are fixed:** a humanoid is always the neutral
  shirt-and-trousers body in some build, a blob is pink (with horns, ears or wings), a floater is a wisp, a quadruped is a
  brown dog. Use them for exactly what suits those looks: Evensong's townsfolk (humanoid), Gristlings (blob), Thuribles and
  Cinder Wisps (floater), Grave Hounds (quadruped). Swarms of these may run to hundreds.
- **Bosses and non-humanoids** are an actor plus rigid parts: body-less props whose `sceneProp.x/y/z/q` a system writes each
  step. Verified: a system-moved body-less prop draws correctly and needs no extra work. Use this for coffin lids, boss
  wings and arms, orbiting candles and chains, and for anything `PathChain` or `SwayChain` drives.
- **Speed.** Give every `createCharacter` a high top speed (12 m/s) and scale the `move` vector to the speed you want, so
  buffs and slows never mutate the character.
- **Lights.** Only **prop lights** reach the light pool; a light on an emitter did not, in my test. The hero's lantern is a
  body-less prop with no parts and a `light` (verified: `{ tag: 'lantern', color: '#ffc080', intensity: 26, distance: 14,
  decay: 1, flicker: true }`, spawned with `{ on: true }`), which a `rules` system keeps at the hero. It makes a warm pool with
  real moving shadows, and it is most of what makes this picture look good. Keep the light about 0.8 m off the hero, since
  straight overhead the hero's own shadow makes a black disc at their feet. Torches and sconces are props too, and the pool picks the
  nearest.
- **Projectiles.** Engine bolts (`PROJECTILE_FIELDS`) are always orange. Use them for Ember. For other elements, use your own
  component with a tinted glowing body-less prop and a `frame.emit` trail, stepping them with the same swept tests.

### 3.6 Seats and hero input

A **seat** is a player slot, 0 to 3. Every hero has a `hero` component with its `seat`. Each step, a system in the `intents`
phase builds one **command** per seat: `{ m: [x, z], a: [x, y, z], b: [...held], p: [...pressed], t: targetEntityId }`.

```ts
// scenes/seats.ts, sim-side. Verified: camera follows, hashes match across copies.
function seatCommand(w, seat, intents) {
  const net = intents['game:seats'];                       // lockstep: every seat's stamped command
  if (net) return net[seat] ?? {};
  if (seat === w.settings.get('game.seat'))                // solo or couch player 1: the page's devices
    return { m: intents.move, a: intents.aim, b: intents.b, p: intents.p, t: intents['game:target'] };
  return intents['game:pads']?.[seat] ?? {};               // couch players 2 to 4
}
// In the intents phase, for every hero, on every copy:
e.actor.player = false;                 // so the actors system reads actor.intents, the same on all copies
e.actor.intents = { move: pathOrStick(e, cmd), b: dodge(cmd) };
// In the rules phase, after the actors moved:
e.actor.player = e.hero.seat === w.settings.get('game.seat');   // so the view's camera follows this copy's own hero
```

Because of that flip, the sim never reads `player` while it decides anything, and a copy's `game.seat` can't change play.
The engine's `addMelee`, `addWeapons` and `addInteraction` only serve `player` actors: don't use them on heroes. Write
hero attacks and use on `Attack`, `Combo`, `coneHits`, `damage` and `reactTo`, as `labs/box/scenes/fight-hero.ts` does.

`engine.hash()` covers that flag, so it differs between copies by design. Compare copies with your own `gameHash(world)`:
FNV over quantised positions, hit points, RNG draws and entity count, computed in the page from `frame.world`.

### 3.7 Commands from menus

Menus change the sim only through `applyCommand(w, seat, cmd)` in `scenes/commands.ts`: equip, buy, salvage, set skill form,
choose passive, begin game with save data, travel, use Bellpost. All game state stays in components as plain data.

- **Solo and couch:** `engine.inspector.actions.run('cmd', { seat, cmd })`, a scene dev action (`defineScene(id, { actions:
  { cmd(w, args) { … } } })`). It works while paused and is recorded. It captures the world first, which is fine for a menu press and wrong for per-frame use.
- **Lockstep:** the command goes into the seat's stamped stream (§12.3) and runs at its tick on every copy.

While `modal()` holds the page, the engine's intents are empty, virtual axes included, which is why menus don't use them.

### 3.8 Boot order and drivers

```ts
// main.ts. Verified order.
const params = new URLSearchParams(location.search);
for (const key of [...params.keys()]) if (key.startsWith('aihub')) params.delete(key);
const hub = window.AIHub;                     // exists only in the built file; undefined under `npm run dev`
const info = hub?.active ? await hub.connect({ mode: 'shared-world', seats: [1, 4], card: true }) : null;
const seed = info ? info.seed >>> 0 : Number(params.get('seed') ?? freshSeed());
params.set('seed', String(seed));
// set game.seat, game.seats, cam=45,42,1.5,1,1 and post.look on params; defineLevel from makeWorld(seed)
const startEngine = async () => {
  engine = await createEngine({ canvas, scenes: ['game:world'], search: `?${params}`, actionMap: 'actionMap:game',
                                store, modal, onFrame });
  if (info) engine.inspector.pause();         // from here the lockstep driver alone steps the sim
};
if (!info) await startEngine();
else {                                        // a session: card, ready and traffic first, the engine after
  params.set('gfx.warmUp', 'asked');          // and game.world=round: only the round's plot, not the story map
  showCard(info); hub.ready(); sendHello(); startLockstep(info);
  if (info.server) engine = headlessEngine(await createHeadless({ scene: 'game:world', seed, settings })); // no GPU at all
  else setTimeout(() => {
    if (finished) return;
    if (navigator.locks) navigator.locks.request('warm-up', () => (finished ? undefined : startEngine()));
    else startEngine();
  }, 2000);
}
```

**This order in a session is the most fragile thing in the game, so don't simplify it.** The harness loads up to 4 copies on
one main thread, needs `ready` from all within 20 s, gives its default round about 6 s of play, and voids the round if the
host's `finish` is 5 s late. The hub runs this same test before it will deal the game. Each line below answers a failure I saw
on a build with many props and bodies:

| Failure | Cause | Fix (verified) |
| --- | --- | --- |
| Traffic check failed, copies exchanged nothing | The driver waited for the engine | Driver starts at once and runs with no engine; a hello goes out right after `ready`; a copy still warming keeps its stamped log and catches up by stepping |
| A copy missed `ready` at 4 players | Another copy's warm-up starved its startup | `ready` first; warm up 2 s later |
| Round void at 4 players, `finish` late | Four warm-ups at once blocked the thread | `navigator.locks` serialises warm-ups across same-origin copies. On a real device a copy is alone, so the lock is granted at once. Longest stall fell to about 3.6 s |
| Server scenario void or late | The server copy warmed up a renderer it doesn't need | `AIHub.server` runs `createHeadless`, with no GPU |
| Slow startup burst | The whole story map built in each copy | A session builds only the round's plot (`game.world=round`) and uses `gfx.warmUp=asked` |

`time-up` and `finish` must work with no engine at all. Keep a veil over the page from `start` until the first frame. On a real
device the warm-up runs during the card, so the world should be ready by the countdown, but no real GPU was here to measure that.

**The solo and couch driver** is the engine's normal frame loop, with interpolation, hit-stop and time scale. Extra pads and the
hovered target reach the sim through `input.virtual.axis('game:pads', ...)` and `axis('game:target', id)`. **The lockstep driver**
is §12.3.

### 3.9 Save, title and restart

- The title screen is HTML over the live world. At boot, the local hero stands in the **Chapel of Ease**, the class-select stage.
- **Play** sends a `begin` command with the save's plain data, or the chosen class for a new game; the sim applies it and
  moves the hero to the start. **Quit to Title** saves and calls `inspector.seed(seed)`. Attract mode uses the same restart
  to exit.
- Saves go through `createStore({ prefix, version, migrate })`: three slots plus the shared Poor Box. The sim emits a
  `game:save` event at Bellposts, zone changes, quest steps and on quit; its payload holds the save; the page writes it.
- A session's client gives the game an empty storage, so sessions need no special save code.

### 3.10 Balance settings

`defineSettings` with `when: 'now'`, read at each use: `game.bal.heroDamage, heroLife, monsterLife, monsterDamage, moveSpeed,
attackSpeed, cooldown, resourceGen, packDensity, eliteChance, dropRate, rarityBoost, silver, xp, hitStop, knockback,
awakeCap`, all multipliers defaulting to 1 except `awakeCap` (60). Dev mode shows these as live sliders with a reset. In a
session they stay at defaults.

### 3.11 Built for designers

The rest of the game must be buildable later with ordinary designer tools, so content is data, never code:

- Monsters, skills, skill forms, items, affixes, zones, quests, dialogue and chunks are table rows and text.
- A new chunk is a text map. A new zone is a row. A new monster is a row plus a body. A new skill form is a row. A quest
  is a list of steps with triggers.
- The runner, brains and generator read tables and never compare ids against code paths ("ask the entry, never the id").
- `labs/game/README.md` has a short **designer guide**: how to add each of those, with one worked example each, and the
  dev-mode tools that test it. `node x gallery body|prop|emitter|look` already shows entries as contact sheets.

---

## 4. Systems

### 4.1 Hero numbers

| Stat | Rule |
| --- | --- |
| Attributes | **Might** (Penitent), **Finesse** (Sexton), **Lore** (Cantor), **Vigor** (all). Main stat 10 + 3 per level; Vigor 9 + 2 per level; the other two 8 + 1 per level |
| Life | 40 + 4 × level + 6 × Vigor |
| Hit | `roll(weaponMin, weaponMax) × skill% × (1 + main/100) × (1 + sum of bonuses) × crit`. Crit: base 5% chance, +50% damage |
| Taking a hit | `× (1 − A/(A + 50m)) × (1 − R/(R + 5m))`, A armour, R the resist for that element, m monster level |
| Move | 5.4 m/s base. **Dodge:** 4.5 m dash in 0.25 s with invulnerability, 2 charges, 4 s recharge |
| Wine | heals 60% over 1 s, 30 s cooldown. **Wafers** drop from kills (15% chance), heal 15% and heal everyone within 6 m |
| Level | Cap 30. `xpToNext(L) = round(24 × L^1.9)`. A kill gives `4 + 2m` XP. Level-up heals fully, with a gold shaft of light and a bell |
| Devotion | After 30, every 20,000 XP gives a point: Zeal (+2 main), Flesh (+2 Vigor), Haste (+0.3% move, to 15%), Fortune (+0.5% find) |
| Carnage | 6 or more kills within 1.5 s pays XP bonus `10% × kills`, with a big banner and a sound |

### 4.2 Monster numbers

- Level `m` comes from the zone. `HP = base × 1.16^(m−1) × difficulty × (1 + 0.75 × (players − 1))`. `Damage = base × 1.12^(m−1) × difficulty`.
- Weapon damage at item level `i` averages `3.4 × 1.155^(i−1)`. Armour per piece `3 + 2.2i`. Affixes scale with `i`.
- **Difficulty (HP, damage, silver and XP, find):** Vespers 1, 1, 1, 1. Compline 1.6, 1.3, 1.25, 1.1. Matins 2.6, 1.7, 1.6, 1.25.
  Anguish I 4.5, 2.2, 2.1, 1.5. Anguish II 8, 2.9, 2.8, 1.8. Anguish III 14, 3.8, 3.6, 2.2. Anguish unlocks after the story.
- **Targets the balance test checks:** on-level gear at Vespers kills fodder in 1 to 3 primary hits, an Anointed pack in 12 to
  25 s, a boss in 90 to 150 s; fodder takes 15 or more hits to kill a hero, a boss's big hit takes 15 to 35% of life; a
  zone takes 8 to 12 minutes; the story ends near level 16 to 18.

### 4.3 The combat pipeline (sim-side)

One path for all damage: **skill or attack releases a shape, shape finds targets, `applyHit` rolls and mitigates, then
`damage()` from the engine, statuses, `reactTo`, events.** Shapes: `arc, line, ring, cone, ground (delayed, with a telegraph),
projectile, chain, self`. Every enemy attack has a telegraph (`defineTelegraph`) unless it is a fodder bite. Statuses: burn,
blight, chill, freeze, stun, root, slow, fear, vulnerable, shield, each with a duration in whole steps.

**Feel, on every hit.** Event `hit` with `position`, `size` and `element` for emitter and sound; damage number (white, gold
crit, element tint); flinch through `reactTo`; a small knockback; `requestHitStop` of 40 to 90 ms on big hits in solo and
couch; trail ribbon on sweeps; screen shake scaled by hit size. In lockstep there is no hit-stop: shake and flash only, since
stopping time would stall every copy.

**Kills.** Up to 6 simultaneous `handOff` ragdolls with a launch along the blow; other deaths play `deathBlown`,
`deathCrush`, `deathSpin` and so on from `data/anim/actions`. Corpses fade after 6 to 10 s. Crowd rigs use `killAgent`.

### 4.4 Skills

A single runner reads a table row: `{ id, slot, resource cost or gain, cooldown steps, wind-up and recovery (scaled by attack
speed), move or action or clip to play, releases: [shape, percent, element, status, emitter, sfx], form overrides }`. Six
slots, all class skills: **Primary, Secondary, Skill 1 to 4**. Unlocks by level: 1, 2, 4, 6, 9, 12. Inflections unlock at
level 8 and level 14. Passive slots at 10 and 20. The player sets a skill's form and passives on the Skills screen, any
time out of combat. Hub rounds start at level 12 with everything unlocked.

### 4.5 Monster AI

A `brain` per row: `rush, ring, kite, charge, caster, ambush, guard, flee`. Flow fields to each hero (`grid.flowField(goal, {
reach: 40 })`), `approachRing` for spacing, `takeToken` to cap melee attackers on a hero at 4 to 6, `canSee` and `sense` for
waking. Target the nearest hero, weighted by recent damage.

### 4.6 Elites

**Anointed:** 4 or 5 of a type, blue-tinted names, 1 affix, ×3 HP. **Exalted:** 1 leader (×5 HP, gold name, 2 or 3 affixes,
generated name) with 3 to 6 minions. Name parts: first {Bishop, Sister, Deacon, Beadle, Verger, Abbess, Canon}, second {of
Cinders, the Unwashed, of the Ninth Pew, Who Wept, of Small Mercies, the Tithe-Taker, of the Long Hush}.

| Affix | What it does |
| --- | --- |
| **Cinderwake** | leaves burning trails that hurt for 4 s |
| **Tolling** | every 6 s, a bell appears over a hero and rings: an expanding ring you must cross or dodge |
| **Shackled** | throws chains that root for 1.5 s |
| **Warded** | a small bell orbits it; it is invulnerable for 5 s out of every 12 until the bell is struck |
| **Wailing** | a cone scream that causes fear for 1.5 s, telegraphed |
| **Hollowstep** | blinks to the farthest hero, leaving a damaging echo |
| **Rimebound** | seeds slow-moving frost orbs that freeze on contact |
| **Thorned** | 20% of melee damage comes back, with visible spikes |

### 4.7 Loot

- **On death:** fodder 9% item, 14% silver. Anointed 2 to 4 items, Exalted 3 to 6 including a guaranteed Gilded, bosses 6 to 10
  with a guaranteed Reliquary on first kill. Item level = monster level, at most hero level + 3.
- **Rarity:** Plain 55%, Hallowed 33%, Gilded 11%, Reliquary 0.8% (guaranteed by 400 kills since the last), Vestment 0.2%.
  80% of drops favour the finder's main stat.
- **Rolls are per seat** in co-op, from a stream named per seat, so each player has their own drops: a seat-coloured ring on the
  drop, and only the owner can take it. Silver is shared and auto-picked within 3 m; Wafers are shared.
- **Showers.** Items burst outward in arcs from a kill; labels on the floor appear on landing. Reliquaries add a pillar of falling
  ash, a low bell and a brief pause in the music.

### 4.8 Items

Slots: **Weapon, Off-hand, Helm, Chest, Gloves, Boots, Ring, Amulet.** Weapons: flail, great-flail (Penitent); crossbow,
grave-spade off-hand (Sexton); stave, hymnal off-hand (Cantor). Affix counts: Plain 0 or 1, Hallowed 2, Gilded 4, Reliquary 4 plus a
power, Vestment 3 plus set bonuses. Sockets: 0 to 2 on Weapon, Chest, Helm.

**Affixes (24):** +main, +Vigor, +armour, +life, +life on hit, +life per second, +crit chance, +crit damage, +attack speed, +move speed,
+cooldown reduction, +resource gain, +area damage, +elite damage, +damage to each element (4), +resist each element (4),
+silver find, +item find.

**Tuning Stones (socket):** Ember (+damage), Rime (+crit), Toll (+area), Blight (+life on hit), Iron (+armour). Five tiers; three
of a tier combine to one of the next at the Bellfounder.

**Reliquaries (15). Each has a power that changes a skill, and one dry flavour line.** Write the other ten in the same voice.

| Name | Class | Power | Flavour |
| --- | --- | --- | --- |
| The Knuckle of Saint Oriel | Penitent | Penance Wheel draws silver and Wafers to you | "There are eleven of these in circulation. Saint Oriel had the usual number of hands." |
| Ansgar's Patience | Penitent | At full Fervor, every Flail Swing tolls | "He waited thirty years to use it. You have been waiting about a minute." |
| Tobias's Second Opinion | Sexton | Bolts split on the first kill | "He was right about that too. Nobody asked." |
| The Last Good Candle | any | Wine also heals allies within 8 m | "Don't let it go out. Nobody knows where the next one is coming from." |
| A Hymnal, Water-Damaged | Cantor | Cadence never decays below 1 | "Most of the words are gone. The tune has got worse without them." |

**Vestments (3 sets, 4 pieces, bonuses at 2 and 4):** *The Hair Shirt of Brother Coll* (Penitent), *The Sexton's Good Coat*
(Sexton), *The Choir Robes of the Drowned* (Cantor). The 4-piece bonus changes how the class plays, not only its numbers.

### 4.9 Town services

**Smith** (Hob): sells, buys, salvages to materials, crafts by recipe. **Bellfounder** (Dame Agnes): sockets, unsockets, combines
stones. **Chandler** (Pim): sells Wine and Homeward Bells, rerolls one affix for silver and Ember Ash. **Poor Box:** a stash shared
by all three save slots. **Candle Rack:** opens Vigils. **Lectern:** changes difficulty, at any Bellpost too.

### 4.10 Vigils

Unlock after Prior Ansgar. Pick an Hour at the Candle Rack; a door opens into a generated plot mixing the biomes, with new
packs and a random look. Kills burn the Candle (fodder 1, Anointed 8, Exalted 20, out of a target that gives about 3 minutes); at
the end the **Warden of the Hour** comes (three forms sharing mechanics from the bosses), then a loot burst and a way home. Each
Hour: HP ×1.22, damage ×1.12, drops up. Local records: best Hour and time by class. Hours 7 to 12 unlock after the ending.

### 4.11 World furniture

- **Shrines (four, 90 s):** Haste, Wrath, Fortune, Warding. **Shriving Chest:** opening it locks a circle: 60 s of waves, then a rich
  reward. **Tithe-Imp:** a hunched thing with a collection box that flees, drops silver when hit, and escapes through a door after 12 s
  unless killed; it screams in gibberish.
- **Destructibles** in every zone: crates, pews, urns, coffins, candelabra, barrels that explode in Ember, using `addBreakables`,
  `breakProp`, `spawnProp` with `knock`, and the `splinters` and `destroyed` emitters. **Secret walls** that break into side rooms.
- **Traps:** swinging censers, wall spikes, floor vents, all telegraphed; they hurt monsters too.
- **Lore books (12):** the Chronicler reads them aloud in gibberish with subtitles, while you keep playing.
- **Death:** solo and couch respawn at the last Bellpost after 4 s, for 10% of silver. Co-op: a downed hero can be revived by holding
  Interact for 3 s; if all are down, everyone respawns. No durability.

---

## 5. Classes

The values are starting points. Each form changes what the skill does and how it looks, not only its numbers.

### The Penitent: melee, Might, resource **Fervor**

A knight of a dead order who wears their sins in iron and swings a chained bell-flail. Fervor (0 to 100) comes from landing
blows and from being hit, and decays out of combat. Hooded red robes, iron cuffs, a mantle; build heroic to bulky.

| Skill | Base | Inflection A | Inflection B |
| --- | --- | --- | --- |
| **Flail Swing** (Primary), +8 Fervor | 135% in a 130° arc, 3.2 m, three-hit combo, third knocks back | *Scourging Chain:* a 5 m line that drags | *Tolling Blow:* the third hit rings a Toll shockwave |
| **Penance Wheel** (Secondary), 25 | spin 3 s, 110% per 0.5 s, move at 70% | *Iron Cyclone:* pulls foes in | *Burning Penance:* leaves an Ember trail |
| **Sanctified Leap**, 25, 8 s | leap to 12 m, 220% landing, knock-up | *Crater:* a burning pit | *Twin Fall:* a second leap within 3 s |
| **Mea Culpa**, 20 s | +30% armour, +20% Fervor gain, 8 s | *Hair Shirt:* 40% melee reflect | *Contrition:* heal 25% over the duration |
| **Chain of Custody**, 15, 6 s | hook one foe, 120%, stun 1.5 s | *Dragnet:* a cone of up to 6 | *Interrogation:* the hooked take +25% for 5 s |
| **Last Rites**, 60, 40 s | 5 s avatar: bigger, every hit rings, no crowd control | *Martyr's Pyre:* an Ember ring | *Absolution:* heal 40% at the end |

Passives (pick 2 of 4): *Iron Faith* (+armour), *Scar Tissue* (regen when low), *Flagellant's Reward* (+crit per 20 Fervor), *Undying Vow*
(cheat death, once per 120 s).

### The Sexton: ranged and summons, Finesse, resource **Tithe**

They rang the hours and dug the graves. They know where everyone ends up. Crossbow and grave-spade. Tithe (0 to 100) regenerates at 3
per second and jumps on kills nearby. Long dark coat, wide hat, lantern; build adult.

| Skill | Base | Inflection A | Inflection B |
| --- | --- | --- | --- |
| **Bolt** (Primary), +6 | 125% crossbow shot | *Splinter Bolt:* bursts into 3 shards | *Hallowed Iron:* pierces, Toll |
| **Grave Spade** (Secondary), 15 | 170% close-range knock-away arc | *Open Grave:* a pit swallows fodder under 15% | *Spade's Edge:* bleed and heavier knockback |
| **Pallbearers**, 12 s | 2 skeleton Bearers with a coffin; they fight till killed | *Funeral Procession:* 4 weaker | *Heavy Casket:* 1 big taunting coffin |
| **Bell-Trap**, 20, max 3 | thrown; rings when crossed: stun and 260% Toll | *Wake-Bell:* also taunts | *Passing Bell:* corpses nearby explode |
| **Will-o'-Wick**, 30, 14 s | a lantern turret, 8 s | *Marsh Light:* slows | *Funeral Pyre:* Ember |
| **The Long Bury**, 70, 40 s | after 1 s, dead hands erupt within 9 m: root 3 s, 500% over time | *Mass Grave:* kills under 20% | *Exhumation:* kills rise as brief allies |

Passives: *Steady Hand* (+crit at range), *Undertaker's Cut* (+silver and Tithe on kill), *Lych Gate* (Dodge leaves a decoy), *Carrion
Comfort* (corpses near you heal).

### The Cantor: caster, Lore, resource **Breath**, mechanic **Cadence**

They sing the old hymns backward and the walls listen. Stave and hymnal. Breath (0 to 100) refills fast. **Cadence:** casting a skill
different from the last within 2 s adds a stack, up to 3: +8% damage each, shown as notes orbiting them. Pale surplice, tall collar;
build adult with a `staff` hold and `cast` pose.

| Skill | Base | Inflection A | Inflection B |
| --- | --- | --- | --- |
| **Psalm Bolt** (Primary), free | 115% slow-homing Toll bolt | *Antiphon:* returns like a boomerang | *Descant:* splits into 3 at range |
| **Choir of Embers** (Secondary), 20 | ground strike, 240% Ember after 0.4 s | *Incense Cloud:* a burning pool, 4 s | *Falling Coals:* three small strikes |
| **Hush**, 25, 9 s | Rime nova, 8 m, 140%, freeze 1.5 s | *Great Silence:* silences casters | *Shatter Note:* frozen kills explode |
| **Step Between Notes**, 10, 6 s | blink 10 m | *Grace Note:* +crit for 3 s | *Echo:* leaves an exploding double |
| **Organ Pipes**, 35, 16 s | 3 pipes blast a sonic line every 1.5 s, 8 s | *Bombard Stop:* fewer, bigger | *Vox Humana:* also heal allies |
| **Requiem**, 80, 45 s | channel 4 s: expanding rings to 14 m, 300% each | *Dies Irae:* Ember falls from the sky | *Lacrimosa:* each ring heals the group 8% |

Passives: *Perfect Pitch* (+crit), *Deep Breath* (+regen), *Resonance* (+10% area), *Chorister's Vow* (a shield when low).

**Seats and classes in hub rounds:** seat 0 Penitent, 1 Sexton, 2 Cantor, 3 Penitent by default; a player can swap at the class altars in
the round's first room.

---

## 6. Monsters and bosses

`Body` means your own `defineBody` on an actor, with `cast/moves/` strikes. `base` is HP and damage at level 1.

| Family and zone | Monster | Rig | Base | Behaviour |
| --- | --- | --- | --- | --- |
| **Unburied** (Road, Undercroft) | Shambler | body, thin build | 14, 6 | `rush`, slow, short bite |
| | Bonepicker | body, thin | 8, 5 | fast, leaps from 6 m |
| | Pallbearer | body, bulky, coffin-lid prop | 45, 14 | `guard`: blocks from the front until flanked or staggered; lid slam |
| | Mourner | body, veiled | 16, 9 | `kite`: telegraphed wail cone |
| | Grave Hound | crowd quadruped | 7, 4 | packs of 8 to 14, rush |
| **Unrung** (Undercroft) | Flagellant | body | 22, 9 | speeds up as it is hurt |
| | Knell Acolyte | body, robed | 18, 11 | `caster`: bell-ring telegraph at your feet, 1.2 s |
| | Censer-Bearer | body, swinging censer prop | 30, 7 | walks leaving Blight pools |
| | Gristling | crowd blob, horns | 5, 3 | pours from sarcophagi; bursts in acid |
| **Gilded** (Nave) | Gilded Warden | body, bulky, gold | 60, 16 | `ambush` as a statue; heavy sweep; no knockback |
| | Choir Lance | body, gold, on a plinth | 26, 18 | telegraphed line beam |
| | Thurible | crowd floater | 10, 5 | orbits and spits sparks |
| **Hollow** (Undersong) | Hollow Fiend | body, horned | 20, 12 | quick `rush` with a lunge |
| | Wax Thrall | body, melting | 34, 11 | melts on death and re-forms in 6 s unless its pool is hit |
| | Organ Golem | body, huge, pipes as props | 90, 20 | `volley` ring of sonic shots |
| | Cinder Wisp | crowd floater | 8, 6 | swarm, burns on contact |
| **Anywhere** | Tithe-Imp | body, small | 40, 0 | `flee` (§4.11) |

**Bosses. Each has a name banner, a boss bar, taunts in gibberish with subtitles, phases, a closed arena and its own music layer.**

- **Old Gallows-Tom** (Road, level 5). A tall hanged man still wearing the noose. Noose lash pulls you in; he kicks up a ring of crows;
  below half he drags his gibbet round the arena on a chain.
- **Prior Ansgar the Unrung** (Undercroft, level 10). Three phases. *1:* censer sweeps and Knell rings. *2:* he strikes a hanging bell;
  concentric rings you must cross through the gaps, and sarcophagi open. *3:* he tears off his robes, faster, chain lash, arena shrinks.
- **Advocate Serein of the Gilded** (Nave, level 14). A towering gold statue (build size 2.4). Sweeping beams from a raised hand; summons
  Wardens; a phase reflecting all damage from the front, so you run behind; finally a slam that floods the floor except for islands.
- **Mother Murmur, the First Voice** (Undersong, level 18). A vast veiled figure, actor plus wings of wax and a ring of candle props. *1:*
  rotating whisper cones, candles to dodge. *2:* wax floods the arena, safe islands shift, Hollow pour in. *3:* the veil falls and the
  heart shows. Small hanging bells in the arena: strike one and it rings, stunning her and opening the heart for 6 s. This teaches the
  ending: **the sound of a bell is what hurts them.**
- **The Warden of the Hour** (Vigils): three forms (Sallow, Gilt, Waxen) built from the moves above.

---

## 7. World and zones

`scenes/worldgen` builds zones from **hand-written chunks** on a coarse grid. A chunk is a text map (24 × 24 tiles, or multiples) with
door slots on its edges and markers for packs, elites, shrines, chests, events, scenery and lights. The stitcher makes a main path from
start to boss door by a seeded walk, adds side rooms, picks chunks whose door masks fit (rotating or mirroring when allowed), and writes
the level text. **The test asserts connectivity on 50 seeds.** Corridors are at least 4 tiles wide; rooms 12 to 24.

| Zone | Size | Biome and look | Level | Monsters | Notes |
| --- | --- | --- | --- | --- | --- |
| **Chapel of Ease** | 28 × 20 | candle-lit stone | n/a | none | class select stage |
| **Evensong** | 72 × 60, hand-made | dusk, lanterns, crooked timber | n/a | none till Q9 | hub; later a burning variant |
| **The Penitents' Way** | 150 × 64 | ash fields, gibbets, burnt farms, grey-orange | 1 to 5 | Unburied, Hounds | outdoor; 8 chunks at least |
| **The Undercroft of Saint Oriel** | 96 × 96 + arena 40 × 40 | candle-dark crypt, blue-grey | 5 to 10 | Unburied, Unrung | levers, sarcophagi |
| **The Drowned Nave** | 110 × 90 + arena 40 × 40 | flooded cathedral, coloured glass light | 10 to 14 | Gilded, some Unrung | sluices, statues |
| **The Belfry** | 36 × 36, hand-made | open sky at last, grey dusk | 14 | set pieces | twice in the story |
| **The Undersong** | 140 × 110 + arena 56 × 56 | inverted organ-pipe cathedral, wax and ember, red-black | 14 to 18 | Hollow | hell, but a *musical* one |
| **Vigil plots** ×6 | 72 × 72 each | mix | hero level | all | generated |

Place them in one grid, about 400 × 320 tiles, with the 20-tile margin. Evensong has the Bellpost, Infirmary (Ilsabet), Smithy, Foundry,
Chandlery, Poor Box, Candle Rack, Lectern, the north gate, and townsfolk on `followRoute` who kneel, flee and cower when it burns.

---

## 8. Story and writing

### 8.1 Style

Write like a doom-laden chronicle read aloud at a funeral by someone with a bad sense of timing. Short declaratives. Big statements of
loss, then one dry line. Villains are operatic and speak to you personally, from the walls, mid-fight. Comic relief is allowed to be right.
Item text is a joke or a grief, never a tooltip. No modern slang, no winking at the genre, no source references.

Every spoken line is **Animalese/Simlish gibberish with subtitles** (§10). Hold subtitles for reading at 10 feet, at least 36 px at 1080p.

### 8.2 People

**The Chronicler** (narrator, deep and slow). **Canoness Ilsabet Crane** (warm alto; runs the Infirmary; has kept the town's lamps for forty
years; is Mother Murmur). **Tobias Wren** (half-deaf bell-tuner; shouts in capitals; scratchy tenor). **Hob Ironmonger** (smith, gravel).
**Dame Agnes Sallow** (bellfounder, dry). **Pim** (chandler's child, quick and high). Heroes never say much: 6 to 8 barks each, for low life,
no resource, cooldown, level up, Reliquary found.

### 8.3 Quests

| # | Quest | Beat |
| --- | --- | --- |
| Q1 | The Ninth Night | Wake in Evensong. Speak to Ilsabet. Tobias shouts that the bell is wrong. |
| Q2 | The Penitents' Way | North along the road to the Hanging Field Bellpost. First Anointed pack. |
| Q3 | Gallows-Tom | Kill him. The Minster doors open. |
| Q4 | Down Among the Prayers | Undercroft: find 3 Knell-Stones (lever rooms) to open the Ossuary Choir. |
| Q5 | The Unrung | Kill Prior Ansgar. He says too much, too late. **Vigils unlock.** |
| Q6 | The Drowned Nave | Turn 2 sluice wheels to drain the way to the stairs, among waking statues. |
| Q7 | The Gilt Advocate | Kill Serein, who wants the same silence you do. That should worry you. |
| Q8 | Still the Bell | Belfry. Hold Interact for 3 s to cut the rope. All music dies. Silence. Then her voice. |
| Q9 | The Lamps Go Out | Evensong burns. Defend the town square through 3 waves. Tobias explains at volume. |
| Q10 | Under the Song | Down through the Infirmary cellar into the Undersong. Recover 3 Stolen Notes. |
| Q11 | The First Voice | Kill Mother Murmur. Take the heart. |
| Q12 | Ring It | Hob casts the clapper. Belfry, last stand: monsters climb the tower. Ring the bell three times by holding the rope for 2 s. Each toll is a screen-clearing shockwave, in gold slow motion. Ending, then credits. Anguish and Hours 7 to 12 unlock. |

### 8.4 Lines to use exactly

These set the voice. Write the rest to match.

> **Chronicler, opening:** "On the ninth night of the Long Vesper, Old Sorrow rang." / "It had no clapper. It had not had a clapper in three hundred years." / "Every soul in Evensong heard it anyway. By morning, so had the dead."

> **Ilsabet, first meeting:** "You came up the Penitents' Way on your own two feet. In this weather that makes you a saint or a fool, and we have buried all our saints." / "That bell must be stilled, Unsung. Climb to the belfry of Saint Oriel and cut it down. I will keep the lamps lit for you. It is all I have ever done."

> **Tobias:** "WHAT? No. It's flat. FLAT! A bell tolling for the dead tolls down. This one tolls UP. Nobody ever listens to me. I barely listen to me." / "Did I ever tell you about the founding of Saint Oriel? Of course I did. I tell everyone. They run."

> **Hob:** "Bring me iron. Bring me anything. I made a sword out of a church gate yesterday. The gate objected."

> **Dame Agnes:** "Every stone has a note. Yours is ugly. We can fix that."

> **Pim:** "Candles are six silver. Hope is extra."

> **Prior Ansgar, on arrival:** "Who climbs down into my choir? Another bright little candle. Come. I collect them." **Mid-fight:** "Do you hear it, Unsung? That is the sound of everyone you have ever failed." **Dying:** "You fool. You child. We were not ringing it to wake them. We were ringing it... to keep them... down..."

> **Serein:** "Mortal noise. All of it. The High Choir has heard enough." / "Silence is the last mercy, and I am merciful."

> **Q8, rope cut. Chronicler:** "And for the first time in three hundred years, the world was quiet." **Ilsabet's voice, from everywhere:** "Thank you, child. Forty years I have kept those lamps. Do you know how heavy a lamp becomes?" / "I was the First Voice before your saints had tongues. Sing with me."

> **Q9. Tobias:** "IT WAS HOLDING THEM DOWN! THREE HUNDRED YEARS! I SAID IT WAS FLAT!" **Hob:** "You said it was flat. You did not say the world would end." **Tobias:** "IT'S THE SAME THING!"

> **Mother Murmur:** "Hush now. Hush. Everyone you lost is singing down here. They ask about you." / "You cannot kill a Voice. You can only... interrupt." / "Louder, then." **Dying:** "Who will keep... the lamps..."

> **Ending. Chronicler:** "They cast the new clapper from the heart of the First Voice, and the Unsung rang Old Sorrow with their own hands." / "It was not a beautiful sound." / "It was enough." **After the credits:** "Far below, something answered."

---

## 9. Art direction and animation

### 9.1 Look: the engine's native style, lit like a funeral

**The base is the engine's native picture:** chunky pixels (at most 330 lines, nearest-neighbour upscaled; verified 480 × 270 at 1080p),
low-poly parts on rigid-skinned skeletons, procedural textures. This also keeps the game visually its own. Keep `gfx.resolution` on `auto`
in every look, and offer Pixel, Balanced and Full in Settings.

**Camera:** the custom view `cam=45,42,1.5,1,1`, orthographic. Verified: at 42° the floor reads far better than the `iso` preset's 30°.
The camera stands south-east, looking north-west. Zoom steps 1.25, 1.5, 2 from the wheel and R3. A hero stands about 30 chunky pixels tall.

**Starting recipe (verified to read well):**

```ts
defineSky('sky:crypt', { description: '…', background: '#06050b', pointLights: 1.6,
  ambient: { sky: '#7a74a0', ground: '#3a3440', intensity: 9 },
  fog: { color: '#06050b', start: 14, end: 60, amount: 1, floor: 0, ceiling: 1.2, height: 0.3 } });
defineLook('look:crypt', { description: '…', sky: 'sky:crypt', filters: {
  bloom: { scope: 'all', strength: 0.55, threshold: 0.8 }, vignette: { scope: 'all', strength: 0.45 },
  outline: { scope: 'characters+objects', width: 1, darken: 0.6 } } });
```

**Rules I learned from the renders:**

- **Floors must be the brightest large surface** in a room (material colour around `#8a8798` with a texture map). Wall tops near black,
  wall faces mid-dark. Otherwise the picture inverts and heroes vanish.
- Near-black outside the walls makes rooms feel like islands of light. Keep it. The hero's lantern (§3.5) does the rest.
- Colour per zone comes from sky ambient and `grade`: ash grey-orange, crypt blue-grey, nave cold with warm stained-glass pools, Undersong
  red-black with wax yellow. Add `ao` and `air` halos as far as they look good: the budget is unlimited.
- Heroes need one saturated colour each (Penitent red, Sexton bone and lantern gold, Cantor white and sky blue), so they read in a horde.
- Check by `node x shot --png` only when the metrics (`LOOK_DARK`, `LOOK_FLAT`, `LOOK_LOW_CONTRAST`, ID-pass shares) can't answer the question.

### 9.2 New art to make

Use the engine's library (`prop:crate, barrel, brazier, chest, pillar, sconce, lantern, banner, table, bench, statue`) for generic props. Make
everything that makes the world yours, as `defineGeometry`, `defineProp`, `defineTexture`, `defineMaterial`:

- **Wall kits per biome:** tall and low, plain, buttress, arched, windowed (coloured glass light in the Nave), hung with banners or chains, sconce.
- **Floors per biome:** 2 or 3 floor glyphs each (stone, cracked, wax or ash or water patches), to break up the surface.
- **Signature pieces:** Old Sorrow (a huge bell, built from stacked `frustum`s and `ring`s, in the Belfry and on the title screen), small hanging bells,
  gibbets, coffins, sarcophagi, pews, organ pipes, candle racks, wax pools, Bellposts (a post with a handbell), wheel sluices, altars.
- **Bodies:** 3 hero classes × 3 tiers; 13 monster bodies; 4 boss bodies and 3 Warden forms; 5 NPCs on foot. Use the grammar's `cape`, `cone`, `blade`, `hair`, `ball`. A cowled hero
  and a horned fiend each took about 15 lines and read clearly at 30 pixels.
- **Loot:** a small pickup prop per slot, glowing by rarity; the Reliquary's ash pillar.
- **Effects:** an emitter set per element (Ember, Rime, Blight, Toll, Physical) for hit, trail, explode and pool, plus level-up, Carnage, shrine and bell-toll
  rings. Emitter `ring` makes shockwaves; `telegraph` makes warnings.

### 9.3 Animation

Base: the engine's animator, `Attack`, `Combo`, `defineMove`, `defineAction`, the reaction system, ragdolls, secondary chains, and the clip library (1,218
clips; `node x anim find sword`, `… cast`, `… death`). If you import clips, ship only what you use: `node x anim cut` makes a smaller set, because the full set
is 8.8 MB of text in the deliverable.

Make new ones for what gives the game its feel:

- **Moves (at least 10):** three-hit flail combo, flail spin, leap slam, spade swing, crossbow fire, cast and channel, bell strike, lid slam, noose lash, statue sweep.
- **Actions:** leap with root motion, avatar transformation, hero ringing the bell (rope pull), kneeling at a Bellpost, boss phase changes.
- **Monster gaits:** shamble with a limp (`stance` plus a thin build), scuttle, gliding Mourner, statue waking. Heavy secondary on capes, chains and censers.

Check with the tools: `animCheck`, `node x qa anim`, `node x sheet`.

---

## 10. Audio

**All sound is code, with no audio files.** `defineSfx` and `defineSong` through `createAudio`, plus Web Audio for anything they can't do.

- **Set `audio.volume('music', 0.1)` at start: music defaults to 10%**, and the Settings slider shows 10%. Master to 1, effects and voices near 0.8.
- **The bell is the game's voice.** Write a good FM bell in `sfx` (`fm` voice, long release, inharmonic partials through layered voices), and use it for: Reliquary drop, level up,
  Bellposts, boss arrival, the toll shockwave, Carnage. Old Sorrow's toll is the same bell pitched low and detuned, audibly *wrong* before Q12 and audibly *right* in the ending.
- **Songs (at least 8, your own tunes):** title, Evensong, Way, Undercroft, Nave, Undersong, boss, ending, each in the tracker format with `intensity` layers: calm is pads, organ and a slow
  bell; fighting adds pounding drums and a low choir pad. `audio.intensity` follows combat. In Q8, cut all music on the rope cut, and hold the silence for the Chronicler's line.
- **Effects:** per element and weapon hit sets (with `variants` and `vary`), footsteps per surface, breakables, pickups by rarity (a chime rising with rarity), UI cues, per-boss stingers. Rooms set
  reverb (`audio.room`); crypt and nave ring, the road is dry.
- **Voices: Animalese/Simlish gibberish.** Each speaker gets a syllable bank of `defineSfx` entries: a pitched `saw` through two `bandpass` filters (two voices at the vowel's formants, `vib` for
  age), a short noise onset for consonants. Five vowels × four onsets. A line maps its letters to syllables by a hash, so the same word always sounds alike; punctuation shapes the pitch contour; it plays
  at the subtitle's typing speed. Pitch, formant shift, rate and filter define the speaker: the Chronicler slow and low, Tobias cracked and loud, Mother Murmur two voices an octave apart. Boss taunts and
  hero barks use the same system.
- **The first sound:** the engine's audio only starts at a key, click or touch; a pad press doesn't count. Have the title screen say "Press any button". If the last device is a pad and `audio.state` is
  not `running`, show a small corner note: "Sound starts at your first key press or click."
- **`node x audio sfx:<id>`** renders a sound in Node as numbers; `node x qa audio` checks them. In a session, on `end`: stop music and mute.

---

## 11. UI and UX: 10-foot, controller first

All UI is your own HTML/CSS in `#ui`, on top of `engine.ui`, themed like iron and vellum, never a web page. Mark everything with `data-ui` and `data-id` so tests read the DOM. Scale by `min(vw/1920, vh/1080)`; keep
a 5% safe area; body text at least 28 px at 1080p. **No dense data screens:** few big things, one focused thing explained at a time.

### 11.1 Controls

Define `actionMap:game` (`aimWith: 'pointer'`, no pointer lock). Keyboard and mouse must feel native, not like a controller stand-in.

| Action | DualSense (standard mapping) | Keyboard and mouse |
| --- | --- | --- |
| Move | Left stick | Hold or click LMB on the floor (paths round walls), or WASD or arrows |
| Aim | Right stick (else auto-target by facing) | Pointer |
| Primary / interact when prompted | Cross `PadSouth` | LMB on a foe, or on a thing; E interacts |
| Secondary | Square `PadWest` | RMB |
| Skills 1, 2, 3, 4 | Triangle `PadNorth`, Circle `PadEast`, R1 `PadRightShoulder`, R2 `PadRightTrigger` | 1, 2, 3, 4 |
| Wine; Dodge | L1 `PadLeftShoulder`; L2 `PadLeftTrigger` | Q; Space |
| Stand still | n/a (aim with the right stick) | Shift |
| Map; Journal; Skills; Homeward Bell | D-pad Up; Left; Right; Down (hold) | M or Tab; J; K; T |
| Inventory | Create `PadSelect` | I or C |
| Show item labels; Zoom | L3; R3 | Alt; wheel |
| Pause | Options `PadStart` | Esc |
| Menus | Stick or D-pad, Cross accept, Circle back, L1 and R1 change tab, Square and Triangle as prompted | Arrows, Enter, Esc, hover and click |

Rebinding: keys and pad through `input.bindingsFor`, `rebind` and `listen`, kept in the store. **Couch and hub note:** ignore Options while Create is held (the hub's combination).

**Pointer in the world.** Each frame the page casts `screenRay` from the mouse (`input.mouse.pointer()`) against the capsules of nearby units and items, nearest the camera first, and the hit becomes the focus: nameplate, chevron and
HP bar. The focused id goes to the sim as `game:target`. **Pad targeting:** a soft lock chooses by distance and angle from facing; the chevron shows it, and melee lunges up to 2 m to it.

**Device tracking.** Track the last real device yourself from `keydown`, `pointermove`, `pointerdown` and pad polls. Don't read `input.lastDevice` alone: it reports `virtual` after your own `virtual.axis` calls.

### 11.2 Prompts

Every prompt is a `<kbd data-action="primary">` that follows the last device. **Pad:** drawn glyphs, PlayStation by default (✕ ○ □ △ L1 R1 L2 R2, in their colours), Xbox (A B X Y LB RB LT RT) by a Settings option.
**Keyboard and mouse:** a keycap from the current binding, or a mouse icon. Test: press a key, then a stubbed pad button, then flip the setting, and read the DOM after each.

### 11.3 HUD

Original layout, bottom centre: a **bell of red wine** at left for life and a **censer** at right in the class colour for its resource, with the six skill tiles between, each showing its prompt and cooldown sweep, and the Wine beside. XP as a thin
gold thread beneath. Top: boss bar with name and phase pips; focus plate for elites with affix names. Top right: minimap (2D canvas of explored tiles) and current objective in one line. Damage numbers (`engine.ui.damage`, restyled). Carnage banner.
Couch and hub: a small plate per other player, in their seat colour, with name, life and class icon; names as text only.

### 11.4 Screens

Each is modal and focus-driven, with the pointer moving focus and clicks selecting. D-pad and stick move focus along a simple grid (write `ui/focus.ts`; `createPadCursor` is a fallback).

- **Title:** title, subtitle, Old Sorrow tolling behind it. Continue, New Game, Settings, Controls, About. Idle → attract.
- **Class select:** the three classes standing in the Chapel, camera pulled in, one big description at a time, difficulty choice, slot choice.
- **Inventory:** paper doll with 8 big slots, a backpack of 20 big tiles per tab. Focus shows one card: name in rarity colour, one line of big ▲▼ change against what is equipped, up to 4 affix lines, flavour. Prompts for equip, sell, salvage.
- **Skills:** six tiles; focusing one shows its three forms as three big cards, each saying in one line what that form does. Passive slots.
- **Map and travel:** full-screen explored map, Bellposts as a list.
- **Journal:** quests, lore books (replay aloud), stats.
- **Shops:** Smith, Bellfounder, Chandler, Poor Box, Candle Rack: two panes at most.
- **Pause:** Resume, Settings, Controls, **Dev Mode**, Quit to Title. Solo pauses the sim (a Setting can turn this off). Couch pauses. In a hub session, it pauses nothing and offers Settings and Controls only.
- **Controls:** one big diagram for the device in use, with the rebinding screen one press away.
- **Settings:** volumes (Master, Music 10%, Effects, Voices, UI), Controller prompts (PlayStation or Xbox), rebinding, camera distance, picture (Pixel, Balanced, Full), screen shake, damage numbers, subtitle size, fullscreen, pause on menus, reset all.
- **About and Credits:** every Source Information field, Testing Feedback, Engine Feedback and Prompt Feedback as TASK.md lists them, with Usage reading "added on import". Scrolls with stick or wheel. Fill it at the end from the same data as the exit interview.
- **Dialogue:** a large subtitle band with the speaker's name; never blocks play except story beats; skippable.

### 11.5 Dev mode

From the pause menu, never in a session. Two tabs.

- **Tools:** god mode, one-hit kills, free skills and no cooldowns, freeze AI (`freeze`), level set, add silver and materials, spawn any item by rarity, spawn any monster, elite with chosen affixes, or boss at the cursor, travel to any zone or Bellpost
  (`travel`), set a quest step, unlock everything, reveal map, time scale, show colliders and target shapes as telegraphs, live counters (`__engine.stats()`, awake actors, entities, step ms), and a bug-report line that copies seed and tick.
- **Balance:** every `game.bal.*` as a live slider with its value, each with a reset, and **Reset All**. Sliders work on the running game.

### 11.6 Attract mode

After **10 s with no input on the title or any menu screen**, start the bot on the live world, HUD visible, a pulsing banner saying to press any button. **Any input** (key, pointer move or press, wheel, pad button or stick, touch) exits to the title by `inspector.seed(seed)`. Saves are off.

It cheats freely: god mode, dev travel, forced drops. Loop, about 3 minutes, with a caption naming each feature as it appears: Evensong and the shops → Penitent on the Way → Sexton in the Undercroft with a Shriving Chest → an Exalted fight → a Reliquary shower → a Skills screen flip → Cantor in the Nave → a boss phase → a Vigil's Candle burning out → the Bell.

The bot is a pure function from world to intents (`bot/brain.ts`), which tests call directly with `engine.step(1, intents)` and attract feeds through `input.virtual`.

### 11.7 Touch-only devices

If the device is touch-only and no pad is connected: **no touch controls** (set the engine's `touch` setting to `off`), show **"Controller or keyboard required"** and a Settings button that works by touch. Attract mode still runs, and a tap on the screen returns to that notice. A pad connecting at any time unlocks the normal title. Without WebGPU, show a plain notice saying the game needs a browser with WebGPU, not an engine error.

---

## 12. Multiplayer

### 12.1 On its own

The full game works with no hub: `AIHub.active` is false, the session client does nothing, and storage is normal. **Couch co-op:** up to 4 local players. Press Options on an unused pad to drop in; choose a class in an overlay (modal, world paused); hold Options and Circle to leave.

- Guests are temporary heroes at player 1's level with plain level-appropriate gear, kept for the page's life. Only player 1's save persists. A menu belongs to the seat that opened it, tinted in its colour.
- **Pads.** The engine merges pads into one, and an unused active pad gets taken over by another. So wrap `navigator.getGamepads` early: the engine sees only player 1's pad, and `net/pads.ts` reads the real list and builds `game:pads` commands for the others.
- **Camera.** Solo and hub copies use the verified view of §9.1. When a second local player joins, switch with `__engine.camera.set(code, { blend: true })` to a `cam3=vesper` camera mode (`node x new camera labs/game/cameras/vesper`): orthographic with the same angles, framing the midpoint of the seats and zooming out to fit. A leash stops heroes from leaving the frame.

### 12.2 In the hub

Read the protocol once: <https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md>. It is short and it is the contract; this section is how this game meets it.

Head metas, with the client injected at build time (§13):

```html
<meta name="hub:session" content="1" />
<meta name="hub:session-players" content="1-4" />
<meta name="hub:session-mode" content="shared-world" />
<meta name="hub:session-minutes" content="8" />
<meta name="hub:session-goal" content="Clear the Vigil together, then slay its Warden" />
<meta name="hub:session-howto" content="Stick/WASD move, Cross/click attack, face buttons/R1/R2/1-4 skills" />
<meta name="hub:webgpu" content="required" />
```

**A round is one Vigil of the Hour matched to player count**, in a world of just that plot and a small first room (`game.world=round`, §3.2), starting at level 12 with all skills, starter Gilded gear, and class altars in the first room. Target: the Warden arrives by minute 5 or 6. No title, menus, saves, attract or dev mode. **The game's own card** (`card: true`, verified): a pure HTML card over a dark bell, with the title, each player in their seat colour with ready marks, the goal, the controls for this device, and the countdown from `card` events. Enter or Cross answers `ready`; Triangle or a named key answers `more`. Its own `keydown` and pad polling, since the engine may still be warming up.

- **Win:** the Warden dies; host calls `AIHub.finish({ standings, scores, won: true, stats, awards })`. `standings` lists every player still in the round, by score (kills, damage, revives); `AIHub.players` has them.
- **`time-up`:** host calls `finish` at once with `won: false`, whatever state the engine is in, even still warming up.
- **`end`:** stop input and sound, send nothing. **`leave`:** only the host acts on it: it stamps the seat's departure, and the hero falls on every copy at that tick.
- **Rules:** names as text only, seat colours from the protocol, no chat, pings or emotes, no `alert`, `confirm`, `prompt`, `window.open`, no navigation or reload, no WebSocket or `fetch` to anything. A copy with `AIHub.server` true has no hero (`game.seat` −1), no local input and runs the world all the same.

### 12.3 Host-stamped lockstep

**The sim is deterministic, so copies send inputs, not world state. Verified with the harness on its bad network (150 ms latency, 50 ms jitter, 5% loss): two copies matched at every hash checkpoint across 3,022 ticks, and 1, 2, 3 and 4 players, host-leave and server scenarios all passed `__hubCheck` with the boot order of §3.8 and the game's own card.**

This is the protocol's shared world: the host's copy decides everything, the others send what their player does and show the world the host's stamped log produces. All effects, ragdolls and sounds work on every copy with no extra code, and there is no snapshot, interpolation or mirror mode to write.

```ts
// net/lockstep.ts. Runs from setInterval(drive, 33) always, and from onFrame when frames come.
// Software rendering starves requestAnimationFrame, and a hidden tab stops it: a frame-only driver froze a client at tick 0.
function drive() {
  const now = AIHub.time();
  if (!Number.isFinite(now) || now < 0 || finished) return;
  const live = engine?.ready;                                     // false while warming up: keep the log, step later
  if (AIHub.isHost) {
    const target = Math.floor(now * 60 / 1000);
    stampLocalInputIfChanged();                                   // { t: tick, s: seat, c: command }, into pending and outbox
    if (live) stepTo(target);
    if (now - lastSend >= 66) { lastSend = now; AIHub.send({ t: 'b', to: tick, e: outbox.splice(0), h: maybeHash() }); }
  } else {
    sendLocalInputIfChanged();                                    // to the host, at most every 50 ms; a heartbeat every 250 ms
    if (live) stepTo(stampedTo);
  }
}
function stepTo(limit) {
  let budget = 120;
  while (tick < limit && budget-- > 0) {
    while (pending.length && pending[0].t <= tick) applyEntry(pending.shift());
    engine.inspector.step(1, { 'game:seats': seatsNow });          // clock paused: engine.inspector.pause() once ready
    clearPresses(seatsNow);                                        // a press lasts one tick
    tick++;
    if (tick % 120 === 0 && frameWorld) hashes[tick] = gameHash(frameWorld);
  }
}
// On the host, a 'c' message is stamped with t = tick and goes to pending and outbox. A 'b' message: pending.push(...e); stampedTo = to.
```

- **Budget:** 20 messages a second a copy, 40 in a burst, 16 KB each. The host sends 15 batches a second, reliable, in order. Commands are small: send held state only when it changes.
- **Local feel.** A client's input returns after a round trip. On press, immediately show a click marker, skill tile flash and a UI sound; no prediction in the sim. Clients can't run ahead of the host, so a client waiting for the host's first batch keeps its veil up.
- **Menus and cheats:** the command stream (§3.7). Dev mode is off.
- **Desync check:** the host includes `gameHash` every 2 s; a client that disagrees records it in `window.__net.desyncs`, and tests assert zero. In production, it keeps playing; the host's result stands.
- **Clock:** `inspector.pause()` once `createEngine` resolves: the engine's loop still samples input and draws, and the driver alone steps. Read input in `onFrame` (`input.strength`, `held`, `pressed`), once a frame, and accumulate. Aim from `screenRay` and `onFloor` on `frame.camera`.
- **Hidden tabs:** the timer keeps stepping (throttled, catching up in chunks). A host hidden for over 20 s voids the round; that is the hub's rule.

---

## 13. Packaging

The engine's one-file recipe aimed at your page. **Verified: 4 to 12 s, 6.7 MB, opens from `file://`.** Output goes to the deliverable beside the dev folder.

```js
/** @file The one-file build: node labs/game/tools/build-one-file.mjs <path to the deliverable>. */
import { build } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve('.');
const result = await build({ root, configFile: false, logLevel: 'warn', base: './',
  resolve: { alias: [{ find: /^three$/, replacement: 'three/webgpu' }] },
  build: { write: false, modulePreload: false, cssCodeSplit: false, assetsInlineLimit: () => true, chunkSizeWarningLimit: Infinity,
    rollupOptions: { input: { game: join(root, 'labs/game/index.html') }, output: { inlineDynamicImports: true } } } });
const files = {}; let html;
for (const item of (Array.isArray(result) ? result : [result]).flatMap((o) => o.output)) {
  const text = item.type === 'chunk' ? item.code : typeof item.source === 'string' ? item.source : new TextDecoder().decode(item.source);
  if (item.fileName.endsWith('.html')) html = text; else files[item.fileName] = text;
}
const find = (ref) => files[Object.keys(files).find((f) => ref.endsWith('/' + f) || ref === f || ref === './' + f)];
const LOADED = /<script type="module" crossorigin src="([^"]+)"><\/script>|<link rel="stylesheet" crossorigin href="([^"]+)">/g;
let out = html.replace(LOADED, (_t, script, style) => {
  if (style) return `<style>${find(style)}</style>`;
  const code = find(script).replaceAll('</script', '<\\/script');
  if (code.includes('<!--')) throw new Error('inline script holds <!--: write it apart in the source');
  return `<script type="module">${code}</script>`;
});
const client = readFileSync('labs/game/vendor/aihub-session.txt', 'utf8');          // session.js, unmodified
out = out.replace('<meta charset="utf-8" />', () => `<meta charset="utf-8" />\n<script>\n${client}\n</script>`);
writeFileSync(process.argv[2], out);
```

Get the client once: `curl -fsSL https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/session.js -o labs/game/vendor/aihub-session.txt`. Assert in the test: first `<script>` follows the charset; the client's banner is intact; no `src` or `href` outside data URLs. Also add `hub:source` and `hub:type` metas.

---

## 14. Testing

**`npm run verify` (add the script to the game's `package.json`; it runs `labs/game/tools/verify.mjs`) runs everything and prints only failures and one line of counts.** Its parts: `npm run verify -- sim`, `net`, `full`, `browser`, `hub`. Rerun only the part covering what you changed.

| Part | What it proves | Rough time |
| --- | --- | --- |
| `sim` | `npm run check`, then Vitest: replay goldens, capture and restore, formulas, every skill form hits or does what its row says, every monster spawns, attacks and dies, every affix, every boss phase changes, Reliquary powers fire, loot distribution over 100,000 rolls, 50 seeds of generator connectivity, quest graph reachable, save round trip, balance targets of §4.2 by a fast bot | 2 min |
| `net` | Four `createHeadless` copies running the lockstep driver over a fake hub, with random latency and a leave: `gameHash` equal at every checkpoint. The strongest net test, and cheap. Write the driver with its transport and stepper passed in, so the same code runs here. Software-rendered browsers can't get 3 or 4 copies warmed up in time here (a 3-player run left one copy at tick 0 with nothing to compare), so this one does that job | 1 min |
| `full` | **The scripted playthrough:** the bot plays the whole story for each class on 1 seed, Q1 to Q12 through the credits, plus one Vigil, in Node, with `game.bal` speeding it and dev travel between objectives; asserts each quest flag, boss death, level, gear, no softlock | 5 to 10 min |
| `browser` | The deliverable from `file://`, Playwright with the flags of §2 and `?quality=low&gfx.warmUp=asked`: boots, title, class select, play by keyboard and mouse, then by a stubbed pad; prompts follow device; Xbox setting; each screen opens and has content; dev sliders change a value and reset restores it; attract starts at 10 s and exits on input; phone profile shows the notice and its Settings; `pipelinesAfterWarmUp` 0; music bus at 0.1; `OfflineAudioContext` renders of a song and a voice line are non-silent; About has every field | 5 min |
| `hub` | Download `harness.html`, `bridge.js` and `round.js` from `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/` into `out/hub/` and copy the deliverable there as `game.html`; `python3 -u -m http.server 0 --bind 127.0.0.1` there; open `harness.html?game=game.html&<scenario>&auto=1`; confirm the frame's page is your game; wait for `document.body.dataset.complete`; assert `window.__hubCheck.pass` for: `players=1`; `players=2`, `3` and `4`, each with `&latency=150&jitter=50&loss=5`; `players=4&latency=150&jitter=50&loss=5&scenario=host-leave`; `players=2&scenario=server`. These are the hub's own test. Add `&play=60000` to a 2-player run and compare `__net.hashes` between frames. Then open the game alone | 3 min |

**Stand-ins for what this machine lacks:** stub `navigator.getGamepads` with Playwright's `add_init_script` for a pad and for several; Playwright device profiles and `page.touchscreen` for touch; Web Audio renders for sound; two frames of the harness for a second player; 1920 × 1080 screenshots for the 10-foot view. Say in your feedback that real pads, a TV and ears weren't available.

Use `node x replay labs/game/replays --browser sim` to hold Node and Chromium to the same hashes, and re-record only when play changes on purpose (`--update`), at milestones rather than every edit. `--bisect` when a hash moves by surprise. Screenshots only for what a script can't check: art, framing, layout.

---

## 15. Order of work

Keep the game playing at each step, and `npm run verify -- sim` green.

1. **Skeleton (prove every risky path first).** Workspace, title choice, one-file build, the starter's scene, bot and tests replaced by your own (keep the kinds of test it shows: golden replay, capture and restore, the bot wins on several seeds), `makeWorld` with one biome, walls as props, the crypt look, hero on seats, solo driver, lockstep driver, the hub card. Pass every `hub` scenario and open from `file://` **before writing gameplay**: these are the paths that are hardest to retrofit.
2. **Combat core.** Penitent, Shambler, Bonepicker, damage pipeline, hit feel, deaths, dodge, Wine, Wafers. Play it until the swing feels good, with sliders.
3. **All classes.** Every skill and form, resources, passives, Skills screen.
4. **Monsters.** All rows, elites, affixes, tokens, packs, zone streaming, destructibles, traps.
5. **Items.** Drops, rarity, affixes, Inventory, shops, Poor Box, sockets, Reliquaries, Vestments, visible gear.
6. **The story.** All zones and chunks, Evensong, quests, dialogue, voices, bosses, ending, music, credits. Scripted playthrough green.
7. **Long game.** Difficulties, Vigils, Devotion, three save slots.
8. **Together.** Full hub round, couch co-op, per-seat loot, revives. Node lockstep test green for the full game.
9. **Front end.** Settings, rebinding, prompts, Dev Mode, attract, touch notice, About.
10. **Polish.** Art pass per zone, sound pass, balance pass with the bot and sliders, full `npm run verify`.
11. **Finish.** Deliverable built; `ENGINE-FEEDBACK.md` honest; `labs/game/README.md` with the designer guide; About screen filled; the chat reply and exit interview as TASK.md asks (the Plan field is this file's name; in the catalogue fields: type Game, genre RPG, players 1–4, tags such as 3d, co-op, fantasy, boss fights). Remove test leftovers and stop your processes.

---

## 16. Where TASK.md's asks are answered

| TASK.md asks for | Here |
| --- | --- |
| Original game, source's themes and tone, not a recreation | §0, §1, §8 |
| Genre and perspective | §1, §9.1 |
| Title by a real random pick | §0 |
| Research choice | §0 |
| One HTML file, CDN optional | §13 |
| The engine's full workspace, read-only | §2, §3 |
| Art: native style, new assets, library for generic props | §9.1, §9.2 |
| Animation: native system, new animations | §9.3 |
| Audio in code, gibberish voices, music at 10% | §10 |
| Online and multiplayer: hub, and the game on its own | §12 |
| Dev folder, shared machine rules, ports and processes | §0, §2, §14 |
| Performance unlimited | §0, §3 |
| Headless tests, whole-game playthrough, one quiet command, no review subagents | §14, §0 |
| Feature-complete vertical slice, infrastructure for the rest | §1, §3.11, §15 |
| Dev mode, live sliders, reset | §3.10, §11.5 |
| Attract mode at 10 s | §11.6 |
| Controller-first 10-foot UI; native keyboard and mouse; hover focus; prompts; Xbox option; no dense screens | §11 |
| Touch-only notice, Settings button, attract runs | §11.7 |
| Narrative in the source's style | §8 |
| No TODOs or stubs | §0 |
| Source Information, Testing, Engine and Prompt Feedback in chat and on About; exit interview | §11.4, §15 |
