# Game plan: a gothic action RPG for the TV, inspired by Diablo 3

**Genre:** co-op action RPG (hack-and-slash loot game). **Camera:** fixed 3/4 isometric, orthographic.
**Players:** 1 to 4, on one screen or in AI Hub sessions. **Engine:** the Pixel Engine kit (0.46.0 when this was written).

---

## 0. How to use this plan

- TASK.md is the CEO's brief and wins over this plan. This plan decides everything TASK.md leaves open, so you can build without asking.
- Read in this order: this plan, then the kit's `GUIDE.md` and `ASSETS.md` whole, then the hub's `README.md` whole. Search `API.md` and `LIBRARY.md`; don't read them whole.
- **Build order is in section 15.** Follow it. The deliverable HTML must build and run from the first milestone on, and every milestone leaves the game playable.
- Lines marked **(verified)** were run on this computer against engine 0.46.0 in a throwaway build. Trust them. If your kit is newer, read its `CHANGELOG.md` first.
- Numbers are starting values. Anything about balance lives in one table (`src/data/tuning.js`) and shows up as a dev-mode slider.
- No more source research is needed. Section 1 says what to take from the source.
- All paths are relative to your dev folder. Your TASK.md gives the names and places of the dev folder, the deliverable and the exit interview file.
- **Other agents share this computer.** TASK.md's "This computer" notes apply as written, with one correction (section 2, item 5). Stay out of the folders beside yours. Keep every file inside your own folder, not `/tmp`, which is shared. Don't run `playwright install` or `playwright install-deps`; the browsers are already downloaded. Keep one or two browsers open at most. Prefer `file://` and the engine's headless tools. If you need a server (the hub harness does), bind `127.0.0.1` on a port the OS picks and confirm the page is your game before trusting a result. Stop only processes you started, by their PID: never `pkill`, `killall`, `fuser -k`, or kill whatever holds a port.
- **No stubs.** If you run out of budget, cut whole features in the order given in section 15, never halfway. A feature that isn't there is fine; a menu item that does nothing is not.

### What you hand back

1. **One HTML file,** named by the pattern in your TASK.md and placed where it says, at the root above the dev folder. It holds the whole game: the engine, your code and the hub client, inlined. TASK.md allows CDN dependencies, but this game needs none.
2. **The exit interview file** beside that HTML, in the exact shape in section 17.
3. **Your final chat reply,** carrying Source Information, Testing Feedback, Engine Feedback and Prompt Feedback. The same four appear on the in-game About/Credits screen (section 13).

**The bar:** a feature-complete demo, treated as a complete, polished vertical slice, long enough to show every feature and mechanic so a player understands how the game plays and feels and what they can and can't do. It carries all the infrastructure the rest of the game would need. No TODOs, placeholders or stubbed features.

### The title

**Pick it first:** the names of your dev folder and your HTML include it. As TASK.md says: a playful riff on the source's name; silently brainstorm 50 titles, then pick one with a real random number generator by running code. Make it a pun that reads as its own name, not the source's name with a letter changed. It lives in one constant, `TITLE` in `src/data/meta.js`, and appears only in the game's frame: title screen, attract overlay, session card, About, the no-WebGPU page, `<title>`, the engine's game `name` and the save key. Story text never mentions it, so the world below works with any title.

---

## 1. The game

### Pitch

Forty days ago the great bell that kept the dead asleep cracked. It still tolls every dusk, but now it says *get up*, and everything buried does. You got up too, except that you kept your wits. Pick a trade (swing a holy bell on a chain, hurl lanterns, or bury your problems with a shovel), smash hordes that burst apart, chase loot that rings like church bells, and climb the broken tower to silence the walled-up saint who has been screaming at you the whole way. Alone, on a couch, or online.

### Pillars (when in doubt, these decide)

1. **Every button press breaks something.** Hits have weight: flash, shake, knockback, ragdolls, shattered props. Hordes are the point.
2. **Loot you can hear.** Rarity is a colour, a beam and a sound. Legendary drops ring a bell. Good items change how skills work, not only the numbers.
3. **Builds are play styles.** Six slots, eight skills per class, three variations of each. Swapping is free and instant, so experimenting costs nothing.
4. **Gothic melodrama with a straight face and a black joke.** Villains proclaim. Townsfolk shrug. Nobody winks at the camera.
5. **A TV game.** Big, readable, one screen at a time, playable from a sofa with a pad. Mouse and keyboard feel native on the same screens.
6. **One more run.** After the story, a repeatable run mode with a meter, a boss and rising difficulty.

### What we take from the source, and what we make ours

TASK.md asks you to capture what makes the source distinctive, its world, characters, themes and tone, and turn it into mechanics, pacing and UX. So the first rows are the feel of the thing, made ours.

| What the source does well | Our version |
|---|---|
| A gothic land where hell climbs up through its graveyards, and a doomed town holding out | **Vespermoor** and **Tollhaven** |
| A hero who is more than mortal | **The Late**: dead, up again, and still themselves |
| A grim old keeper of lore who reads you the history | **Crier Maudlin**, a severed head who never stopped working |
| Themes of apocalypse, failing faith and old sins coming due | A cracked holy bell, a wronged saint, a bishop in debt |
| Hordes that explode, physical destruction | Ragdolls, shatter props, a kill-streak bonus called **Requiem** |
| Classes with their own resource | **Bellwarden** (Clangor), **Lamplighter** (Wick), **Sexton** (Tithe) |
| Skills with swappable modifiers | 8 skills per class, each with 3 **Tones** |
| Passive choices | 4 **Vows** per class, pick 2 |
| Life pickups that drop in combat | **Tallow**: wax drops that re-melt your life candle |
| Beams and sounds for great loot | Coloured beams, and a bell strike for every legendary |
| Elites with random powers | Elite packs with **Afflictions** |
| The loot creature you chase | **The Collection Plate**: a living offering dish on little legs, spilling coins as it runs |
| Risky chests | **Unquiet Coffins**: open one, survive 45 seconds, get paid |
| Temporary shrines | **Votive Shrines** |
| Repeatable random dungeon with a meter and a boss | **Knell Runs**; the timed version is the **Grand Knell** |
| Endless levelling | **Devotion** |
| Difficulty ladder | **Pilgrim, Zealot, Martyr, Penance I to V** |
| Crafting artisans | **Dame Brasse** the bellfounder, **Mother Ogive** at the Reliquary |
| Extracting item powers | The **Reliquary** holds three extracted powers |
| Waypoints, town portal | **Lychgates**, the **Passing Bell** |
| An AI companion | **Sister Pyx** |
| Couch and online co-op | Couch co-op on its own, shared-world sessions in AI Hub |
| Scheming lords of the pit who taunt you while you play | **The Bursar** and **Malison**, in subtitled gibberish |

### Stay original

This is a new game in the same genre, with its own world, cast, art, music and levels. TASK.md says so and it's a hard rule.

- Never use the source's names or look: Sanctuary, Tristram, Caldeum, Westmarch, Horadrim, Nephalem, Cain, Leah, Adria, Tyrael, Imperius, Malthael, Azmodan, Belial, Kanai, Paragon, Torment, its class names and resource names, its famous lines, its melodies, or a HUD built around two orbs. No fallen star, no amnesiac angel.
- The source is credited by name only on the About screen and in the exit interview.
- `tools/test.mjs` greps `src/` for these names as whole words (section 16).

---

## 2. Facts verified on this computer

These save you hours. All were run in a real build here.

**Bundling**
1. **(verified)** One HTML file boots on `file://` with WebGPU. Bundle with `esbuild game.js --bundle --format=esm --target=es2022 --charset=utf8 --legal-comments=none`, put the result in one inline `<script type="module">`. The engine has no `import.meta` and needs no fetch, so its built-in models and Rapier's wasm work from the file. The result is about 5.3 MB plus your code, with nothing external. Don't minify your own code: the agent that imports the game adds its usage figures to the About screen later, so keep strings findable.
2. Escape `</script` as `<\/script` in the bundle. If you insert with `String.replace`, use a function replacer, or `$&` in the code corrupts the file.
3. **(verified)** Page order that the hub accepts: `<meta charset>`, then `session.js` byte for byte as the first script, then the `hub:*` metas, then `<title>`. Body: `<div id="app"></div>` and the module script.
4. **(verified)** If you ever need a pack, set `window.__PIXEL_ASSETS__['packs/x.json'] = 'data:application/json;base64,...'` in a classic script before the module, then `loadPack('packs/x.json')` works on `file://`. The built-in library is enough for this game, so prefer not to.

**Browsers in tests**
5. **(verified) Use the kit's flags:** `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-angle=swiftshader --use-webgpu-adapter=swiftshader` (the list in `check.mjs`). The shorter list in the "This computer" notes lost the GPU device within seconds on this engine (`A valid external Instance reference no longer exists`). That error is the flags, not your game.
6. **(verified)** Software rendering is slow: about 20 fps for a small scene at 1280×720, 3 to 8 fps at 1080p with 40 rigged monsters. So tests advance time with `engine.step(n)` (120 frames took 6 ms in a small scene) and read pixels with `await engine.renderer.capture()` (about 180 ms). Never wait in real time when you can step.
7. **(verified)** `Engine.headless` works in Node with `buildModel`, `compileClips`, mixers, HUD calls and audio counts. `hud.width` is 480 and `hud.canvas` is null there. `node check.mjs --headless game.js --keys KeyD*30` plays and replays to the same fingerprint. Replays still match with ragdolls and flying chunks in play. Every module must guard `window`, `document` and `navigator` with `typeof`.

**The hub**
8. **(verified)** A full engine in the harness's iframes passes: 2 players; 4 players with `latency=150&jitter=50&loss=5`; the same with `scenario=host-leave`; 2 players with `scenario=server`; and a game-owned card. Copies were ready in 2 to 6.5 seconds.
9. **(verified)** For `AIHub.server` (a copy with no player) use `Engine.headless(game, {})` inside the iframe and drive it with a timer: ready in 0.6 s, no GPU, harness passes. Step by elapsed time, not a fixed count.
10. **(verified)** On the game's own card, answer Enter from a plain `window` `keydown` listener, not `wasPressed`. The harness allows 3 seconds and software-rendered frames are slow.
11. The hub's clocks (from `round.js`): hard limit is `hub:session-minutes` × 1.5, at most 15 minutes; 5 s grace after `time-up`; 3 s countdown; 20 s load grace; 20 s hidden-host limit.

**Characters and animation**
12. **(verified)** You can build any humanoid as a `ModelDef` of nested pivots named after `HERO_RIG`'s joints, and `compileClips(HERO_CLIPS, HERO_RIG, build.object)` animates it with all 78 hero clips, including `Slash1`, `Slash2`, `Slash3`, `Slam`, `LeapSlam`, `Spin`, `Cast`, `CastBig`, `CastWeapon`, `CastBigWeapon`, `BowDraw`, `BowRelease`, `Roll`, `Charge`, `Shout`, `HitReact`, `Death`, `Triumph`. `new Ragdoll(physics, root, HERO_RAGDOLL)` works on the same body. Template in section 8.
13. **(verified)** All 15 joints must exist or `compileClips` throws `rig joint "ForearmR" not found`. An empty pivot is fine, which keeps cheap monsters cheap (14 meshes against 21).
14. **(verified)** Compile clips once per body type (63 ms for 78 clips) and share them: `new THREE.AnimationMixer(instance).clipAction(clip)` moves a second instance. `buildModel` is cheap and shares geometry.
15. **(verified)** Custom clips: `{ name, frames, fast, keys: [[frame, { ArmR: [x, y, z], Pelvis: { p: [x, y, z] } }, 'outCubic'], ...] }` and `gaitClip(HERO_RIG, {...})` compile with `validateClip` clean.
16. **(verified)** `analyzeClip` throws on merged pivot bodies because its sole meshes are gone. Run it on the engine's own hero inside `Engine.headless`: `const hero = await ctx.loadModel(HERO_MODEL)`, same rig, same results. It finds real problems such as `planted foot slides 0.80 m/s`; tune `speed` and `stance` until it's clean.
17. **(verified)** To attack while running, filter a compiled clip to upper-body tracks: `new THREE.AnimationClip(name, clip.duration, clip.tracks.filter(t => UPPER.has(t.name.split('.')[0])))` and play it over `Run`. Track names look like `Torso.quaternion`. It ran without error; check how it looks.

**Pause, input, camera, HUD**
18. **(verified) Pause with `engine.timeScale = 0`.** `update` keeps running with `dt` 0, `fixedUpdate` stops, `wasPressed` still works, so menus work. `engine.paused = true` stops `update` too: never use it for menus. Menu animation counts rendered frames, since `dt` is 0.
19. `hitstop` and `timeScale` stall the whole simulation. Never use them on a session host. Use them solo and on the couch only.
20. **(verified)** Use `aspect: 'fill'`. The default letterboxes (at 1280×720 you get 960×540 in the middle). With `fill` the art size changes with the window: 427×240 at 720p, 480×270 at 1080p and 4K, 512×288 at 1440p, about 136×276 on a portrait phone. Lay out from `hud.width` and `hud.height`, never from 480×270.
21. **(verified)** The `iso` camera with yaw 45 looks toward −X −Z: screen right is (+0.71, 0, −0.71), screen up is (−0.71, 0, −0.71). So a wall on a room's −X or −Z side shows its face to the camera, and a wall on the +X or +Z side blocks the view.
22. **(verified)** `camera: { preset: 'iso', viewHeight: 11.5, pitch: 42, yaw: 45 }` looks right at 1080p: a hero about 25 art pixels tall, with 40 monsters on screen and still readable. A `viewHeight` of 13 still reads, which gives the room to zoom out for co-op.
23. **(verified)** The rig zooms on the wheel after `update` runs. Read `ctx.input.wheel` yourself, then set `ctx.input.wheel = 0` to stop it. `setZoom` clamps to `minZoom` and `maxZoom`.
24. **(verified)** `hud.text` uppercases for you and draws `?` for any character it lacks. It has digits, A to Z, straight and curly quotes, the backtick and `. , : ; - + = / ( ) [ ] { } % _ ! ? < > # * @ ° · & | ~ ^ $`. No em dash, no ×, no arrows. Text is 6 art pixels per character (minus one) and 7 tall. `hudSprite` icons are about 12×12. A test lints all strings against this set.
25. **(verified)** The engine's `Input` merges every pad into one, which can't do couch co-op. Set `ctx.input.gamepadButtons = {}` and read `navigator.getGamepads()` yourself, per pad (guard with `typeof`). A stub via `addInitScript` reaches both. The kit's pad mapping is for the platformer and would press Space, KeyJ and so on.
26. Mouse buttons are keys (`MouseLeft`, `MouseRight`), and the canvas already blocks the context menu. The HUD canvas has `pointer-events: none`, so the pointer reaches the game through it.

**Audio**
27. **(verified)** Engine defaults are master 0.8, sfx 1, music 0.6, saved under `pixel-engine:audio`, a key shared by every engine game on the same origin. So on first run (your own flag in storage) call `audio.setVolume('music', 0.1)`. `audio.resetVolumes()`, which the engine's settings panel calls, puts it back to 0.6, so wrap that method on the instance to re-apply 0.1. That doesn't touch `pixel-engine.js`.

**Touch and look**
28. **(verified)** Detect touch-only with `!matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0` (true on Chromium's Pixel 7 profile, false on desktop). `touch: false` removes the joystick. The ⚙ button stays visible. WebKit here has no WebGPU, so test touch in Chromium.
29. **(verified) The mood:** `engine.sun.color.setHex(PALETTE.sky); engine.sun.intensity = 0.55; engine.ambient.color.setHex(PALETTE.navy); engine.ambient.intensity = 0.9; scene.background = new Color(PALETTE.ink);` plus library torches and a warm light following the hero gives a rich dark dungeon. A tall thin `glowMaterial` box plus a coloured point light on the floor makes a superb loot beam.
30. **(verified)** Floor textures at full white are too loud against monsters. `toonMaterial(PALETTE.mist, { map })` pushes them back and monsters read much better; `flagstones` tinted that way looked best, and `ashlar` is busy, so keep it for walls. Bright red `Decals` at 1 to 2 m look cartoonish; `plum` at 0.4 to 0.9 m sits right.

**Randomness**
31. **(verified) `Rng.fork` depends on the parent's current state,** whatever the docs' comment suggests: once the parent has drawn a number, the same `fork('zone:1')` gives different numbers. So keep one root `new Rng(seed)` per world that only forks and never draws. Forks from that root are stable, whatever their children draw. Every session client relies on this to build the same map.

**Also run under `Engine.headless` and working (verified):** `Breakables` (`add`, then `break`); `Timeline` (cues, `line()`, `bars()`, `skip()`); `NavGrid` (`flowTo`, `flowDirection`, `path`, `lineOfSight`, `setOpen`); `LegStepper` with `twoBoneIK`; `SpringChain`; `Squash`; `Decals`; `Trail`; `Precipitation`; `WaterSurface`; `groundFog`; `{ dissolve: true }` clones; `glowMaterial` swaps; `mergeStaticMeshes` with a tinted `textureMap`; `disposeObject` on a zone root; `camera.rayAt` onto the ground; `lights.request` with `lifetime` and `priority`; `screen.cover`, `reveal`, `shockwave` and `flash`; `input.send` reaching `input.commands`; `audio.loop` with `spatialize`; the bell as sine `layers` (peak 0.84 from `renderSound`); `parseSong` on the Clemency motif. These ran without error; how they look is yours to check.

**This engine start worked (verified):**

```js
const engine = await Engine.start(game, withUrlOptions({
  container: document.getElementById('app'),
  camera: { preset: 'iso', viewHeight: 11.5, pitch: 42, yaw: 45, minZoom: 0.6, maxZoom: 1.4 },
  aspect: 'fill', quality: 'high', touch: false,
}));
```

Add `settings: { button: touchOnly ? 'top-right' : false }` to that **(verified: `false` removes the button)**. Your own Settings screen replaces the ⚙ everywhere except touch-only devices, where TASK.md asks for it.

---

## 3. World, story and tone

### The world

**Vespermoor** is a drowned moorland kingdom under one enormous tower, the **Belfry of Saint Malison**. In it hangs the Great Bell, **Old Clemency**. For a thousand years it tolled at dusk, and the toll told everything below: *stay down*. Forty days ago it cracked. It still tolls. It now says something else.

- **The Risen:** the mindless dead, up and about.
- **The Unrung:** demons from Below, things no bell was ever rung for. They hate sound, and they've come up through the graves the dead left open.
- **The Late (formally the Tollborn):** you. You died during the cracked toll, or just after, and got up with your mind intact. Townsfolk find this awkward. They call you *the Late* and ask you to wipe your feet. Death doesn't stick to you, which is why you respawn.
- **Tollhaven:** the last parish with its lamps lit.

**The truth:** Saint Malison, revered as the foundress who "gave herself to the bell", was walled up alive in the tower's foundation by the first bishops, singing. She has heard that bell every dusk for a thousand years. Bishop Ambrose, drowning in debts to a demon called the Bursar, cracked it for her. She wants one thing: to ring the Last Toll, **Eventide**, and wake everything ever buried. The only thing she still fears is the sound of Old Clemency rung true.

### Cast

| Who | Role | Voice and manner |
|---|---|---|
| **Crier Maudlin** | Quest giver, reads lore aloud. A severed head in a lantern on a post. Lost the body, kept the job. | High, reedy, unstoppable |
| **Dame Brasse** | Bellfounder: salvage, craft, reforge. Melts church bells into swords. Half deaf. | LOUD. Everything shouted |
| **Mother Ogive** | Keeper of the Reliquary: extract powers, sockets. Blind; knows relics by taste. | Soft, delighted, unsettling |
| **Pennywhistle** | Merchant in a plague-doctor beak. | Cheerful, nasal, modest markups considering the apocalypse |
| **Sister Pyx** | Companion. Armoured nun with a crossbow. | Deadpan |
| **Bishop Ambrose Thrice-Buried** | Kindly, pale, keeps a spade in the coffin. The traitor. | Warm, then not |
| **The Bursar** | Mid-game boss. A bloated demon accountant in a stolen cope. | Booming, delighted by interest |
| **Malison, the Unrung Saint** | Final boss. Huge entombed saint wrapped in bell ropes. | Vast, layered, furious |
| **The Narrator** | Opening and ending. | Deep and slow |

### Tone

Three registers, and write everything in one of them:

1. **High gothic proclamation:** narration, lore books, Malison. Long vowels, doom, an ominous last line.
2. **Gallows humour:** townsfolk, item flavour, death messages. Dry, never modern. No slang, no winks.
3. **Boss taunts:** direct address, mid-fight, short.

Subtitles fit two rows of about 60 characters, which every line below does. Lore books get a paged screen instead. Punctuation stays inside the HUD font (section 2, item 24). Use these as written and write the rest to match.

**Narrator:** "For a thousand years Old Clemency tolled at dusk, and the dead of Vespermoor stayed down." / "Forty days ago the Great Bell cracked. It still tolls. It now says something else." / "You were buried on the thirty-ninth day. It did not take."

**Crier Maudlin:** "Hear ye, hear ye! The dead are up, the roads are closed, and the fish is off. Also you. You are dead. Welcome back." / "I lost the body at harvest and kept the job. No one told me to stop." / "The parish asks that you wipe your feet. You have been in the ground."

**Dame Brasse:** "WHAT? SPEAK UP! I MELT BELLS FOR A LIVING!" / "THAT SWORD WAS A CHURCH BELL ON TUESDAY. HIT SOMETHING WITH IT AND IT STILL SAYS AMEN."

**Mother Ogive:** "Bring me the holy bones, child. I will know them by the taste." / "A saint's knuckle. Very old. A little salty. She died angry."

**Pennywhistle:** "Everything is half price, dear friend. The other half is your soul, but we can discuss terms." / "No refunds. No returns. No survivors, so far."

**Sister Pyx:** "I have killed four hundred things today and confessed to none of them." / "Bless you. Duck." / "You smell like a grave. It is an improvement on the last one."

**Bishop Ambrose:** "They have buried me three times, my child. One learns to keep a spade in the coffin."

**The Bursar:** "YOUR SOUL IS OVERDUE!" / "INTEREST COMPOUNDS, LITTLE CORPSE!" / "I HAVE YOU DOWN FOR ONE DEATH. I SEE IT WAS NOT COLLECTED." / "FORECLOSURE!"

**Malison:** "A THOUSAND YEARS I HAVE BEEN YOUR FOUNDATION STONE. NOW I SHALL BE YOUR CEILING." / "THEY WALLED ME UP SINGING. DO YOU KNOW WHAT I LEARNED IN THE DARK? EVERY VERSE." / "RUN, LITTLE RINGER. THE HOUR IS UNRUNG, AND IT IS YOURS." / "LISTEN. THAT IS EVERY GRAVE YOU EVER WALKED ON, OPENING." / (on a hero's death) "DOWN YOU GO. GIVE MY REGARDS TO THE WORMS."

**Lore book:** "THE THIRD NIGHT. THE GRAVES IN THE NEW YARD ARE EMPTY. THE GRAVES IN THE OLD YARD ARE EMPTY. I HAVE BEGUN DIGGING ONE FOR MYSELF, FOR THE COMPANY."

**System lines:** Death: "YOU HAVE DIED. AGAIN. IT IS BECOMING A HABIT." Level up: "YOU FEEL MORE ALIVE. THIS IS NOT MEDICALLY POSSIBLE." Streak: "37 KILL REQUIEM".

**Item flavour:** "She rang it only once. It was enough." / "The best one is still in him." / "Smells of smoke and regret."

### The story, in five quests

| # | Quest | Where | What happens | Unlocks |
|---|---|---|---|---|
| 1 | **Wipe Your Feet** | St. Clement's Yard | Your coffin bursts. Tutorial fights. The Crier's voice carries over the wall. Reach Tollhaven. | Town, Pennywhistle, potion |
| 2 | **The Weeping Causeway** | The Causeway | Find Dame Brasse in a gibbet camp. Defend the wagon of bells on the way back. Sister Pyx joins. | Bellfounder, Lychgates, Pyx |
| 3 | **Saint Gloam's Bones** | Ossuary, 3 floors | Mother Ogive needs three relic bones. Under the third floor is the Counting House and **the Bursar**, who has a ledger with the Bishop's name in it. | Reliquary, sockets, first legendary guaranteed |
| 4 | **The Cinder Cloister** | Burning abbey | Rescue the last novices. Malison's voice taunts you openly now. Confront **Bishop Ambrose**, who is buried and bursts out three times. The Crier reads the truth about the saint. | Passing the Belfry gate |
| 5 | **Ring It or Die Trying** | The Cracked Belfry | Climb the tower. Fight **Malison** beneath the bell. Ring Old Clemency by hand. | Ending, credits, Penance, Knell Runs |

**Ending:** the bell rings true, Malison comes apart, dawn hits the moor. Over the credits, far below, a much deeper bell answers. It's the hook for the rest of the game.

**Side content:** the **Drowned Pantry** (optional small cellar off the Causeway, mini-boss the **Cellarer**, a "return the overdue book" joke quest for the Crier); 12 lore books (read aloud, kept in the Codex); **Writs** (section 7).

### The first five minutes

| Time | Beat |
|---|---|
| 0:00 | Title, New Hero, pick a class |
| 0:10 | Narrator over black, a cracked bell toll; 20 seconds, skippable |
| 0:30 | Night, rain, graveyard. A coffin bursts; hero plays `GetUp`. Prompt: move |
| 0:40 | Three Peatwalkers. Prompt: attack. They burst. Urns and a barrel shatter, gold rains |
| 1:30 | Tallow drops, the candle re-melts. A short-beam blue weapon drops. Toast: "UPGRADE: [glyph] EQUIP" |
| 2:30 | Level 2, second skill unlocked, prompt to assign |
| 3:00 | First telegraph: a red ring grows. Prompt: dodge |
| 4:00 | An Unquiet Coffin at the gate. 45 seconds of chaos, a chest of gold, level 3 |
| 5:00 | Tollhaven. "Hear ye, hear ye!" |

Pacing target: about 60 minutes to the credits for a first player. Tutorial 5, town 3, Causeway 12, Ossuary 15, town 2, Cloister 12, Belfry 8 with Malison, ending 2. A Knell Run takes 6 to 8 minutes.

**New Hero** offers two starts: **The Beginning**, or **The Last Bell**: a level 30 hero with every skill and Tone unlocked, three legendaries, two pieces of its class set, materials and gems, 5 Devotion points to spend and a Grand Key, with the town open and Knell Runs available. Devotion needs level 30 and the story ends near level 20, so this start is what lets anyone see the whole endgame at once.

### Where the player meets each feature

TASK.md wants every feature shown, so none of them is left to luck. The playthrough tests in section 16 assert every row.

| Feature | First met |
|---|---|
| Move, attack, dodge, potion, Tallow, gold, smashing props, telegraphs | St. Clement's Yard (tutorial) |
| Item drops, rarity beams, one-button equip | Yard: the first upgrade is scripted |
| Votive Shrine, Unquiet Coffin | Yard: both scripted |
| Skill slots, Tones | Level 2 and level 3, with prompts |
| Vows | Level 5 (first) and level 15 (second) |
| Pennywhistle, Collection Box, Crier, Codex, How to Play, difficulty change | Tollhaven, after quest 1 |
| Dame Brasse (salvage, craft, reforge), Lychgates, Passing Bell, Sister Pyx, Writs | Quest 2 |
| Champion pack, the Collection Plate, an escort event, the side dungeon | Causeway: the first Plate and first pack are scripted |
| Rare pack, traps and levers, gems and sockets, Mother Ogive (extract, Reliquary), first boss, first legendary | Ossuary |
| The Unrung (demons), a defence event, second boss | Cloister |
| Set items, final boss, ending | Belfry |
| Penance tiers, Knell Runs | After the credits, or at once with The Last Bell |
| Grand Knell, Devotion, set bonus | The Last Bell at once, or by playing on |
| Couch co-op | Any time: a toast appears when a second pad is seen, and Party is in the pause menu |
| AI Hub round | When the hub launches the game |

---

## 4. Combat

### Rules

- **Simulation:** 60 Hz in `fixedUpdate`, on a flat world (y = 0). Hero speed 5 to 5.6 m/s, radius 0.4 m. Bodies push softly; a hero stuck for 0.3 s passes through small monsters.
- **Cast states:** wind-up, hit frame, recovery. Attack speed scales wind-up and recovery. Move input cancels the second half of recovery; dodge cancels anything. Hold a button to repeat.
- **Moving while casting:** the Lamplighter's Spark Bolt and Sexton's Bone Toss play upper-body clips over `Run` (section 2, item 17). Everything else roots the hero for its wind-up.
- **Dodge:** a 0.35 s `Roll`, 4.5 m, invulnerable throughout, 3 s cooldown (slider).
- **Potion:** infinite, heals 60%, 30 s cooldown.
- **Tallow:** kills drop it at 8% (elites always). Walking over it heals 20%.
- **Gold** flies to you inside the pick-up radius (3 m). **Items** are picked up by walking over them (inventory has 40 slots; when full, they stay on the ground with a message).
- **Telegraphs:** any attack worth more than 25% of a same-level hero's life shows a growing red ground ring or line for at least 0.6 s, with a warning sound. Dodging through it always works.
- **Requiem:** kills within 1 second of each other chain. At 10+ a banner shows the count and pays bonus XP (count × 2% of the kill XP total).
- **Death:** the candle goes out. Solo: 0.8 s of slow motion. Options: rise here (5 s wait, plus 5 s for each recent death, up to 30), last Lychgate, or town. No penalty beyond the walk. In co-op an ally revives you by holding interact for 2 s.

### Feel recipe (apply to every hit)

Use all of these and tune with the "feel" slider.

- Target flashes: swap `mesh.material` to a shared `glowMaterial(PALETTE.white)` for 2 frames. Don't clone materials per monster.
- Knockback slide; `ctx.particles.burst` tinted by element; a pitched-up hit sound; a damage number that pops and drifts. Crits use scale 2 and `sand`.
- Big hits: `engine.shake.add(0.1 to 0.5)`, `engine.screen.shockwave(at, { radius })` on novas, `hitstop(0.04 to 0.08)` when solo or on the couch only.
- **Kills:** humanoids go into `Ragdoll` with velocity away from the hit, scaled by overkill. Keep up to 16 live ragdolls; older ones freeze and dissolve (`dissolve: true` on a per-body clone at death only). Others squash, burst and dissolve. `Decals`: small `plum` splats and `scorch`.
- **Props:** urns, barrels, crates, coffins, tombstones have HP. On break, hide the library model and do `breaks.break(breaks.add({ at, size, color, cuts }), hitAt, speed)` so chunks fly. They drop gold 40% and Tallow 5%.
- **Elements:** Sound (`sand`, `white`, expanding rings), Flame (`orange`, `red`, `sand`, a warm point light), Grave (`lime`, `plum`, smoke, a green point light). Lights use `lifetime` and priority 3; heroes 4, loot 2, torches 1.

### Targeting

- **Pad:** skills target softly. The best monster inside a 120° cone of facing and the skill's range gets a reticle ring. Right stick overrides aim and moves the ground reticle for ground-target skills. Melee gets a 0.6 m lunge assist.
- **Mouse:** hero faces the pointer. Left click on a monster walks into range and attacks; on an NPC or object, walks and uses it; on the ground, moves (hold to keep steering). Shift-click attacks in place. `camera.rayAt` gives the ground point (solve for y = 0); pick monsters by screen distance to their chest (14 art pixels), items by their label rectangle.
- **Keyboard:** WASD or arrows also move.

### Classes

Everyone has 6 slots. Slots open at levels 1, 1, 3, 6, 9, 12. Any skill can go in any slot. Swap freely out of combat (no cost, 1 s lockout on the changed slot). Each skill has an unlock level; its three Tones unlock at +2, +6 and +11 levels after it (capped at 30). The first Vow opens at level 5, the second at level 15.

Percentages are of weapon damage. "Generator" means it gives resource and costs nothing. Clips are engine clips unless marked *(new)*.

#### The Bellwarden: melee bruiser

A guardian of the bell-ringers' order who swings a consecrated hand-bell the size of an anvil on a chain. High life, armour +30%, speed 5.0.

**Clangor** (0 to 100) builds on hits and drains after 4 s out of combat.
**Resonance:** every hit adds a stack to the monster (max 5, 6 s). *Toll* skills consume stacks for +25% damage each. Show stacks as small rings on the monster.

| Skill (level) | Cost / cooldown | Clip | Effect | Tones |
|---|---|---|---|---|
| **Clout** (1) | Generator +10 | `Slash1`, `Slash2`, `Slash3` chain | 150%, 120° arc, 2.8 m | *Ringing:* chains 60% to 2 more. *Heavy:* slower, 230%, stun 0.4 s. *Pious:* heal 2% per target |
| **Chain Reap** (2) | Generator +6 per target | `Spin` once | 110% circle, 4 m | *Drag:* pulls 1.5 m. *Long Chain:* 5.5 m. *Rust:* bleed 40%/s for 3 s |
| **Great Toll** (4) | 30 Clangor, Toll | `BellOverhead` *(new)* | 300% ring, 6 m, knockback 3 m | *Twin Peal:* second ring after 0.5 s at 70%. *Cracked:* leaves shock patches 4 s. *Deaf:* 200%, stun 1 s |
| **Reverberate** (6) | 20 Clangor, Toll | `Shout` | 260% wave, cone, 9 m, passes through | *Echo:* bounces off walls once. *Narrow:* 60% narrower, 420%. *Hymn:* +3 Clangor per target |
| **Bellfall** (9) | 10 s | `LeapSlam` | Leap up to 12 m; 400%, 2 m, a bell falls with you | *Iron Bell:* leaves a taunting bell 5 s, 100%/s. *Swift:* 6 s, 250%. *Comet:* burning trail |
| **Clapper Charge** (12) | 8 s | `Charge` | Dash 10 m, 200%, shoves aside | *Battering:* stun at end. *Relentless:* kills refund 50% cooldown. *Wake:* sound trail 80%/s |
| **Hallowed Ground** (16) | 20 s | `CastBigWeapon` | 8 s ring, 7 m: allies take 30% less, heal 3%/s | *Vigil:* immune to stuns. *Ire:* +25% damage. *Procession:* follows you |
| **Last Peal** (20) | 45 s | `Spin` loop | 8 s spin: 180% per 0.25 s, 4.5 m, 20% slower, unstoppable | *Cyclone:* pulls. *Thunder:* ends with 800%. *Eternal:* kills add 0.3 s |

**Vows (pick 2):** *Iron* (+20% armour). *Clamour* (+20 Clangor, no drain for 8 s). *Contrition* (+15% damage under half life). *Silence* (kills give +15% speed for 3 s).

#### The Lamplighter: ranged kiter

Last of the guild that keeps night at bay. Long coat, wide hat, a lamp pole on the back. Medium life, speed 5.6.

**Wick** (0 to 100) regenerates 14/s.
**Kindle:** Flame hits Burn (30%/s for 4 s). Burning enemies take +15% from your skills.

| Skill (level) | Cost / cooldown | Clip | Effect | Tones |
|---|---|---|---|---|
| **Spark Bolt** (1) | Generator +4 | `CastWeapon` upper | 120% fast bolt, 18 m, Burns | *Split:* pierce 1, forks on kill. *Swift:* 1.4× speed, 90%. *Star:* arcs to 2 more |
| **Flare** (2) | 20 Wick | `Cast` | 220% cone, 8 m, monsters miss for 1.5 s | *Phosphor:* 50% wider. *Magnesium:* 340%, no blind. *Signal:* marks, allies +20% for 5 s |
| **Lantern Hurl** (4) | 30 Wick | `LanternLob` *(new)* | Lob up to 14 m: 240% in 3 m, burning pool 4 s at 60%/s | *Cluster:* 3 small. *Oil:* 8 s pool. *Blue Flame:* 40% slow |
| **Lamp Post** (6) | 12 s, max 3 | `Dig` *(new)* | Plants a lamp 15 s, fires 70% bolts twice a second | *Arc Lamp:* beams between lamps. *Bright:* heals allies in 4 m. *Bomb:* explodes 500% at the end |
| **Dusk Step** (9) | 6 s | `Roll` | Blink 8 m, ember decoy 2 s | *Double:* 2 charges. *Scorch:* 180% blast at origin. *Veil:* 2 s unseen, next hit +100% |
| **Snuff** (12) | 40 Wick | `CastBig` | All Burn within 14 m pays out at once: remaining burn × 3 | *Smother:* stun 1 s. *Relight:* re-Burns after 2 s. *Harvest:* +8 Wick per target |
| **Beacon** (16) | 25 s | `CastBigWeapon` | 10 s pillar, 7 m: allies +20% damage, +50% Wick regen; enemies inside burn 40%/s | *Walking:* follows you. *Warding:* stops projectiles. *Pyre:* ends with 600% blast |
| **Long Night's End** (20) | 50 s | `CastBig`, `Triumph` | 7 s: 3 comets a second, 220% in 2.5 m | *Meteor:* one comet, 1800%. *Drizzle:* 5 a second, weaker. *Dawn:* party heals 5%/s |

**Vows:** *Long Wick* (+20 Wick). *Bright Eyes* (+10% crit against burning). *Keeper of Lamps* (+1 Lamp Post). *Last Light* (survive a fatal hit, once per 90 s).

#### The Sexton: summoner and curse

Tends the graves and rings the passing bell. Stovepipe hat, black frock, spade. Raises what they bury, at union rates. Medium-high life, speed 5.2.

**Tithe** (0 to 100) comes from generators and +3 for each nearby death.
**Graveyard Shift:** corpses remain as Graves for 12 s, and some skills consume them.

| Skill (level) | Cost / cooldown | Clip | Effect | Tones |
|---|---|---|---|---|
| **Shovel Swat** (1) | Generator +8 | `ShovelSwat` *(new)* | 140%, arc, 2.6 m | *Spade Edge:* stun 0.3 s. *Flat Side:* slower, 180%, knockback. *Long Handle:* 3.6 m |
| **Bone Toss** (2) | Generator +5 | `Cast` upper | 110% lob, 14 m, 1.2 m burst | *Ribcage:* 3 shards. *Marrow:* poison 3 s. *Skull:* homing |
| **Raise Pallbearers** (4) | 30 Tithe, 3 s | `RaiseHands` *(new)* | Up to 4 skeleton minions, 60% each, until killed | *Coffin Crew:* 2 big ones that slam. *Quick Step:* faster. *Volatile:* explode on death |
| **Exhume** (6) | 20 Tithe | `CastBig` | Explodes up to 5 Graves within 12 m: 300% each, 3 m | *Chain:* blasts make Graves burst. *Feast:* heal 2% each. *Rise:* each leaves a 6 s skeleton |
| **Coffin Drop** (9) | 9 s | `CastWeapon` | Coffin crashes at target: 380%, 3 m, stun 1 s, stays 4 s as an obstacle | *Family Plot:* 3 coffins. *Occupied:* releases a skeleton. *Lead-Lined:* 700%, 16 s |
| **Last Rites** (12) | 30 Tithe | `Cast` | 8 s curse, 6 m: enemies take +25%; deaths inside give +6 Tithe | *Slow March:* 30% slow. *Wasting:* 60%/s. *Following:* follows the target |
| **Gravewalk** (16) | 7 s | `Roll` *(new sink)* | Sink and rise 9 m away: 150% burst, invulnerable 0.4 s | *Deep:* 2 charges. *Hands:* root 1.5 s at exit. *Whole Family:* minions come along |
| **Danse Macabre** (20) | 60 s | `Triumph` | 10 s: minions +50%, every Grave within 14 m rises, up to 12 extra skeletons | *Tarantella:* +speed. *Finale:* all explode at the end. *Encore:* 40 s, lasts 6 s |

**Vows:** *Union Rates* (+1 minion). *Plot Holder* (Graves last 20 s, +10% Grave damage). *Perpetual Care* (minions heal you 1% per hit). *Mourner's Due* (+2 Tithe per death).

### Effect ops

Skills are data, not code. `src/sim/effects.js` implements these ops and nothing else; skills and Tones only compose them:

`arc, circle, cone, ring, projectile, lob, chain, dash, leap, blink, zone, obstacle, summon, turret, buff, debuff, pull, knock, stun, apply_status, consume_status, consume_graves, comet_rain, delay, repeat, spawn_decoy`

```js
great_toll: { name: 'Great Toll', cost: 30, tags: ['toll', 'sound'], clip: 'BellOverhead', wind: 0.22, rec: 0.3,
  fx: [{ op: 'ring', radius: 6, dmg: 3.0, element: 'sound', knock: 3, consume: 'resonance', vfx: 'ring_bronze', sfx: 'bell_big', shake: 0.4 }],
  tones: { twin_peal: { name: 'Twin Peal', add: [{ op: 'delay', t: 0.5, then: { op: 'ring', radius: 6, dmg: 2.1 } }] } } }
```

---

## 5. Loot and progression

### Formulas

```text
hit         = weaponDps × skill% × (1 + Power/100) × element bonus × (crit? 1.5 + critDmg) × tuning.playerDamage
reduction   = armour / (armour + 50 × monsterLevel)
monster HP  = 20 × 1.15^(L-1) × type × (1 + 0.6 × (players-1)) × difficulty × tuning.monsterHp
monster hit = 6 × 1.12^(L-1) × type × difficulty × tuning.monsterDamage
hero life   = 40 + 10 × level + 8 × Vitality
weaponDps   = 8 × 1.13^itemLevel × rarity × random(0.9, 1.1)
xpToNext(L) = round(60 × L^1.75 + 40)
monster XP  = (6 + 3 × L) × type
```

Starting stats: Power 10, Vitality 10, plus 3 Power and 2 Vitality per level. Level cap 30, then Devotion. Monster level is the highest party level, floored by zone: Causeway 1, Ossuary 6, Cloister 11, Belfry 15. Numbers over 9,999 print as `12.4K`.

Target: level 18 to 22 at the credits. A trash monster dies in 1 to 2 hits at matching gear on Pilgrim.

### Difficulty

| Tier | Monster HP | Monster damage | XP, gold | Legendary chance | Available |
|---|---|---|---|---|---|
| Pilgrim | ×1 | ×1 | ×1 | ×1 | Start |
| Zealot | ×1.6 | ×1.3 | ×1.25 | ×1.2 | Start |
| Martyr | ×2.6 | ×1.7 | ×1.6 | ×1.5 | Start |
| Penance I | ×4.2 | ×2.2 | ×2 | ×2 | After the credits |
| Penance II | ×6.8 | ×2.9 | ×2.6 | ×2.6 | |
| Penance III | ×11 | ×3.8 | ×3.4 | ×3.4 | |
| Penance IV | ×18 | ×5 | ×4.5 | ×4.5 | |
| Penance V | ×29 | ×6.5 | ×6 | ×6 | |

Change tier in town (Knell Font) or from hero select.

### Items

**Slots (10):** Head, Shoulders, Chest, Hands, Legs, Feet, Amulet, Ring, Main hand, Off hand.

**Main hands:** Bellwarden: hand-bell (`mace`), war-bell (`warhammer`), chain flail (`flail`). Lamplighter: lamp staff (`staff`), hand crossbow (`crossbow`), torch wand (`wand`). Sexton: spade (`shovel`), `scythe`, grave sceptre (`sceptre`). **Off hands:** `kite-shield`, `round-shield`, lantern, censer. Weapons you hold are visible on the hero, and helm and shoulder tiers change the silhouette (section 8).

| Rarity | Colour | Affixes | Multiplier | On the ground |
|---|---|---|---|---|
| Common | `white` | 0 | ×1 | Nothing |
| Blessed | `sky` | 1 to 2 | ×1.15 | Short beam (1.2 m) |
| Reliquary | `sand` | 3 to 4 | ×1.3 | Short beam, small light |
| Legendary | `orange` | 4 + a power | ×1.5 | 5 m beam, bell strike, floor light |
| Set | `lime` | 3 + set bonus | ×1.5 | 5 m beam, bell strike, floor light |

**Affixes:** Power, Vitality, Armour %, Crit chance, Crit damage, Attack speed, Cooldown reduction, Cost reduction, Life per hit, Life regen, Move speed (feet only), Area damage, Sound %, Flame %, Grave %, Max resource, Gold find, Magic find, Pick-up radius, Thorns, Socket.

**Names** come from tables, playfully: "Mournful Cudgel of the Second Burial", "Soot-Blessed Hood". Loot is personal: each player sees only their own drops and gold.

**Drop chances** per kill: trash 12% any item; champion and rare packs always 1 to 3, with at least one Blessed. Legendary base 0.25% per trash, 6% per elite. Guaranteed legendary on first kill of the Bursar; a legendary plus a set piece on first kill of Malison. Target: 3 to 6 legendaries per campaign on Pilgrim.

### Legendary powers

| Item | Slot | Power |
|---|---|---|
| The Widow's Clapper | Main | Great Toll rings twice more at half strength |
| Anvil of Second Thoughts | Off | Clapper Charge drags enemies with you |
| The Deaf Verger's Cowl | Head | Immune to stuns; Resonance stacks to 8 |
| Hymnal Greaves | Legs | Chain Reap fires a homing note at each enemy hit |
| The Last Wick | Main | Spark Bolt splits into 3 when Wick is over 70 |
| Lantern of the Patient Moth | Off | Lantern Hurl pools drag enemies in |
| Snuffer's Mitts | Hands | Snuff refunds half its cost per 10 targets and resets Dusk Step |
| Cinderwalk Boots | Feet | Dusk Step leaves a burning line |
| Bishop's Second-Best Crook | Main | Pallbearers carry coffins and slam |
| Ledger of Unpaid Graves | Off | Exhume has no Grave limit, +1 Tithe per Grave |
| Spade of the First Digger | Hands | Every 5th Shovel Swat digs a Grave |
| Family Plot Deed | Chest | Coffin Drop drops 3 extra around the target |
| Plate-Lining | Amulet | Gold pickups heal 1%, and +1% damage per pickup up to 30% for 5 s |
| Ring of the Thrice-Buried | Ring | Survive a fatal hit at 30% life, once per 90 s |
| Malison's Knuckle | Ring | +25% against elites; hits on elites chain to their minions |
| Choirmaster's Baton | Off | Every 6th skill is free and deals +100% |
| Mourning Band | Ring | +5% damage per live minion or dead ally, up to 30% |
| Clemency's Shard | Amulet | Every 12 s a note rings around you: 300% in 6 m |

Implement powers as small hook objects (`onCast`, `onHit`, `onKill`, `onPickup`, `modifySkill`). Each must visibly change play.

### Sets (Head, Chest, Hands, Feet)

- **Vestments of the Ringing Order (Bellwarden).** 2: Resonance stacks to 10. 4: Toll skills +300%, and each Toll takes 2 s off Bellfall.
- **Regalia of the Last Lamplighter (Lamplighter).** 2: Burn +30%. 4: Lamp Posts fire your Spark Bolt Tone at +400%.
- **Weeds of the Perpetual Mourner (Sexton).** 2: +2 Pallbearers. 4: Exhume +400%, and each Exhume heals minions.

### Town services

- **Pennywhistle:** buy (6 rotating items), sell, and Mystery Caskets (spend Bell Shards, pick a slot, get a random item). Price target: a Reliquary item costs about 2 minutes of the gold you earn at its level.
- **Dame Brasse:** *Salvage* items into Scrap (Common, Blessed), Dust (Reliquary), Bell Shards (Legendary, Set). *Craft:* pick slot and rarity, pay materials. *Reforge:* reroll one affix of an item, chosen by the player.
- **Mother Ogive:** *Extract* a legendary power (destroys the item). *The Reliquary* holds three extracted powers (one weapon, one armour, one jewellery), usable as if worn. *Socket* gems. *Merge* three gems into the next tier.
- **Gems (3 kinds, 3 tiers):** Ember Tear (weapon: damage %; armour: Power), Grave Salt (weapon: crit damage; armour: Vitality), Choir Amber (weapon: attack speed; armour: pick-up radius and gold).
- **The Collection Box:** a stash shared by all heroes, 3 tabs of 30.

### Devotion

After level 30, XP fills Devotion levels, shared across heroes, each costing `15000 + 1500 × n` XP. Each gives 1 point in one of four tracks: Core (Power, Vitality, Speed, Max resource), Offence (Attack speed, Crit, Crit damage, Cooldown), Defence (Life %, Armour, Regen, Reduction), Utility (Area, Cost, Life per hit, Gold). Shown as four big bars, not a table.

---

## 6. Monsters and bosses

All bodies are authored models (section 8). Elite colouring and affix glows are data.

| Monster | Zones | HP× | Hit× | m/s | Behaviour | Body |
|---|---|---|---|---|---|---|
| **Peatwalker** | Causeway, Ossuary | 1.0 | 1.0 | 1.4 | Crowds; slow swing; bursts into mud | Humanoid, `Shamble` |
| **Gibbet Drop** | Causeway | 0.7 | 0.9 | 3.4 | Falls from gibbets, lunges | Humanoid |
| **Rattlebones** | Ossuary, Belfry | 0.8 | 1.0 | 3.2 | Fast sword; flies apart | Humanoid, empty pivots |
| **Choir Skull** | Ossuary | 0.5 | 1.1 | 2.4 | Floats 9 to 12 m away, slow "sour note" shots | Single mesh, hovers |
| **Pallid Bearer** | Ossuary, Cloister | 4.0 | 1.8 | 1.6 | Coffin slam (0.8 s telegraph), 2 Rattlebones on death | Big humanoid (scale 1.5) |
| **Tomb Crawler** | Ossuary | 0.4 | 0.6 | 5.0 | Swarms from breakable Nests | `LegStepper`, 6 legs |
| **Bloat Deacon** | Causeway, Ossuary | 2.0 | 2.5 (burst only) | 2.0 | Swells 1 s, bursts in 4 m, leaves a poison pool | `Squash` blob |
| **Cinderling** | Cloister, Belfry | 0.4 | 0.7 | 4.6 | Leaps in packs, fire patch on death | Small humanoid (scale 0.6) |
| **Tithe Collector** | Cloister | 1.6 | 1.2 | 2.8 | Hook pulls you from 10 m; steals gold, returned when killed | Humanoid + ledger |
| **Penitent** | Cloister, Belfry | 1.2 | 1.4 | 3.0 | Blinks in, 3-hit combo, blinks when struck | Humanoid, robed |
| **Clapperjaw** | Cloister, Belfry | 5.0 | 2.0 | 2.4 | Roar 0.9 s, charges 10 m at 7 m/s, stuns itself on walls | Big quadruped, `LegStepper` |
| **Ash Gargoyle** | Cloister, Belfry | 1.4 | 1.2 | 5.0 | Statue until close, then swoops in passes | Winged, low hover |
| **Shade Acolyte** | Cloister | 1.0 | 0.8 | 2.6 | Raises corpses every 5 s, keeps away; kill first | Humanoid |
| **The Collection Plate** | Anywhere, rare | 6.0 | 0 | 7.0 | Flees, spills gold, escapes after 12 s; jackpot if killed | Bowl on `LegStepper` |
| **Crawler Nest, Unrung Font** | Ossuary, Cloister | 8.0 | 0 | 0 | Static spawners, destructible | Prop |

### Elites

**Champion** packs (3 or 4, `sky` names, same Afflictions) and **Rare** packs (one `sand`-named leader with minions). Afflictions per elite: Pilgrim 1, Zealot 2, Martyr and above 3 or 4. Elites have ×4 HP, ×1.5 damage, ×8 XP. All effects are telegraphed and dodgeable.

| Affliction | Effect |
|---|---|
| **Tolling** | Expanding shock rings from the pack, every 5 s |
| **Smouldering** | Burning trail; explodes on death after 1 s |
| **Shackled** | Chains root you for 1.5 s (telegraphed line) |
| **Entombing** | Raises walls of bone around you for 3 s |
| **Vigil Lamps** | Slow rotating beams around the pack |
| **Penitent Haste** | 40% faster, charges |
| **Undying** | Rises once at half life |
| **Plagued** | Poison pools under you |

### Bosses

Every boss has a top-of-screen bar with phase ticks, a name, taunts with voice, an arena and an entrance. The target fight lengths below are at matching gear on Pilgrim.

**The Bursar** (Ossuary, about 2 minutes). Slow, huge, ledger and abacus.
- *Audit:* marks a 5 m circle on each player, 2 s later the ledger slams.
- *Collections:* a sweep steals 10% of your gold as coins scattered on the floor. Picking them up heals you.
- *Adjustment:* summons Rattlebones "clerks".
- *Foreclosure* (under 30%): walls of coffins close in, shrinking the room until he dies. Melee is safest, ranged gets squeezed.

**Bishop Ambrose Thrice-Buried** (Cloister, about 1 minute). Three short rounds. Each time he "dies", a coffin slams down, he's buried, and he bursts out elsewhere stronger: round 1 chains and censer, round 2 adds Penitents, round 3 a fire ring. "ONE LEARNS TO KEEP A SPADE IN THE COFFIN."

**Malison, the Unrung Saint** (Belfry top, 3 to 4 minutes). About 6 m tall, floating, wrapped in ropes, with Old Clemency hanging over a round arena.
- *Phase 1, Foundation:* rope lashes along telegraphed lines; expanding sound rings with a gap you must roll through; adds.
- *Phase 2, The Cracked Hour (60%):* floor sections crumble into pits (cells close with a telegraph). Every 15 s the bell tolls: stand behind a pillar or take huge damage (`nav.lineOfSight` from the bell's position). Pillars break after two tolls.
- *Phase 3, Eventide (25%):* the arena goes dark except the lights around heroes. She chases, slowly, and her touch is terrible. Three bell ropes hang at the rim. Interact with one (hold 2 s, she staggers each time): the bell rings true, she takes 12% and the screen shakes. Three rings end the fight, then the ending plays.

**Knell Wardens** (Knell Runs, 90 s): *the Hollow Sexton* (Bellwarden-sized, raises graves), *the Grand Chorister* (Choir Skull swarm and rings), *Clapperjaw Prime* (charges and walls). Each is 2 phases and reuses existing bodies with new colours and scale.

---

## 7. Places and modes

### Levels are data

The world is a flat grid with 1 m cells. `src/sim/zonegen.js` stitches ASCII room templates into a map from a seed, and the same code runs on every client:

```text
###############      # wall       . floor      ~ water or pit (blocked, no wall)
#......L......#      D door socket   S trash spawn   E elite spawn
#..B.......B..#      C chest   B breakable   T trap   L light   A shrine
D......S......D      X entrance or exit   N named prop (from the template's list)
#...#.....#...#
#...#..E..#...#
#......C......#
#..T.......B..#
#######D#######
```

Generation: start at the entrance, attach templates at door sockets until the room count is met, end with the exit or boss room, seal unused sockets. Every biome has at least 8 templates plus its boss room. A test checks that `nav.path(entrance, exit)` exists for 200 seeds per zone.

Density: each `S` marker spawns a pack of 4 to 9 and a room has 2 to 4 markers, so 20 to 40 monsters a room. Each `E` marker has a 1 in 3 chance of an elite pack. All of it scales with the density and elite sliders.

### Building a zone (view side)

- **Walls:** merged boxes, not thin wall models. **A wall cell whose floor neighbour lies on its +X or +Z side is a back wall: 3 m tall. A wall on the +X or +Z edge of a room (floor neighbour on its −X or −Z side) is a front wall: a 0.6 m stub.** This is section 2 item 21, and it's what stops walls hiding the player. Tops are dark `ink` caps. Skip cells with no floor neighbour.
- **Dress the back walls** (`wall-torch`, `banner`, `wall-chains`, `column`) and floors (`bones`, `rubble`, `skull-pile`, `cobweb`). Tall props go near back walls; only low ones near front walls. Any tall prop that can come between camera and hero uses a per-prop `dissolve` material and fades when a hero is behind it.
- **Textures:** `toonMaterial(PALETTE.mist, { map: textureMap(id) })`, scale UVs to 8 texels a metre, never the map. Merge with `mergeStaticMeshes`.
- **Physics (cosmetic only):** one big floor box and merged wall boxes so ragdolls and chunks land and stop. Gameplay collision never uses Rapier.
- **Fog:** `groundFog` per biome.

### Zones

| Zone | Layout | Look | Monsters | Features |
|---|---|---|---|---|
| **St. Clement's Yard** | 3 authored rooms | Night, rain, `mud`, `tombstone`, `dead-tree` | Peatwalker | Tutorial, first Unquiet Coffin |
| **Tollhaven** | Authored, about 60×60 m, safe | Dusk, `cobbles`, `market-stall`, `well`, `lamp-post`, `fountain`, `statue` | None | All services, Knell Font, Writ board, Lychgate |
| **The Weeping Causeway** | Long outdoor corridor, about 200×60 m, branching | Rain (`Precipitation`), `WaterSurface` in blocked cells, `mud`, `swamp`, `willow`, `dead-tree`, `reeds`, gibbets, broken `cart` | Peatwalker, Gibbet Drop, Bloat Deacon | Wagon escort event, first Champion pack, Drowned Pantry entrance, 2 Lychgates |
| **Ossuary of Saint Gloam** | 3 floors, 8 to 12 rooms each | Floors `flagstones`, walls `ashlar`, `sarcophagus`, `coffin`, `cage`, `candles`, `altar`, `pit-grate`, `spikes`, `portcullis`, `lever` | Peatwalker, Rattlebones, Choir Skull, Pallid Bearer, Tomb Crawler, Bloat Deacon | Lever doors, floor traps, Nests, the Bursar's Counting House (coin piles, ledgers) |
| **The Cinder Cloister** | 12 rooms, part open sky | Floors `slate-tiles`, `cinders`, `lava-crust`, `ruined-wall`, `column`, `flame`, `brazier`, ember particles, falling beams | Cinderling, Tithe Collector, Penitent, Clapperjaw, Ash Gargoyle, Shade Acolyte | Defend the novices (timed event), Unrung Fonts, Ambrose in the chapter house |
| **The Cracked Belfry** | 3 short floors plus the arena | `basalt`, `rune-floor`, `rift-energy` void beyond pits, wind, the great bell | Rattlebones, Cinderling, Penitent, Clapperjaw, Gargoyle | Malison |
| **The Drowned Pantry** | 1 small floor (optional) | `shallow-water`, `barrel`, `keg`, `crate-stack` | Peatwalker, Bloat Deacon | The Cellarer mini-boss, overdue book |

### World systems

- **Lychgates:** roofed graveyard gates, one per floor or stretch, first touch unlocks. Travel from the Map screen when standing at one or in town.
- **Passing Bell:** hold to channel 1.5 s (a hit interrupts): a portal to town and back. Not in Knell Runs or sessions.
- **Votive Shrines:** rack of candles, at least one per zone. One use, 30 s buff: *Ardour* (+50% damage), *Haste* (+30% speed), *Ward* (shield 30% life), *Plenty* (+100% gold).
- **Unquiet Coffin:** interact, then waves for 45 s from the ground; survive for a chest.
- **The Collection Plate:** the first is scripted on the Causeway. After that, 1 chance in 8 per zone load, 1 in 3 in Knell Runs.
- **Writs:** the Crier's board offers 3 random jobs on existing maps (kill this boss, clear this area, open this coffin). Finish all 3 for a cache. Uses the quest system with no new content.
- **Sister Pyx:** joins after quest 2 when playing solo; leaves when a second seat joins. She's a bot hero with 3 fixed skills, scales with your level, gets downed and revives after 20 s, and has 40 banter lines triggered by events.
- **Codex:** lore books, bestiary (unlocks on first kill), and **How to Play** in six big pages (Moving and fighting, Skills and Tones, Loot, Town, Knell Runs, Co-op), so a player understands what they can and can't do.

### Knell Runs

Entered from the **Knell Font** in town, on any difficulty.

- **The map:** 2 floors, 12 to 18 rooms each, mixing all biomes' templates. 1 or 2 modifiers: *Crowded* (+40% density), *Swift* (+20% speed), *Haunted* (extra elites), *Golden* (+100% gold), *Dark* (only hero lights), *Volatile* (monsters explode on death).
- **The Knell meter** is a big bell-shaped gauge at top centre. Kills fill it: trash 1, big 3, champion 8, rare 12, with a total of about 450 scaled by party size.
- **At 100%:** "THE KNELL TOLLS": a flash, every monster flees or dies, and a Warden crashes down beside you with an arena ring of bone.
- **Rewards:** guaranteed legendary, Bell Shards, bonus XP, and a 1 in 4 chance of a Grand Key.

**The Grand Knell:** spend a Grand Key. Pick a tier N (monster HP ×1.17^N, damage ×1.08^N). A 10-minute timer; beat it for better loot and Devotion XP. The results screen shows time, tier and your bests per class, saved locally.

### The session round (AI Hub)

A session is one 8-minute Knell Run for the seated players. Full details in section 12.

---

## 8. Art direction

**Base:** the engine's native look (`LOOK_PRESETS.none`: 3D low-poly toon rendered as pixel art, Sweetie 16 palette), with a soft vignette (`scene: [{ id: 'vignette', params: { intensity: 0.3 } }]`). Raise the vignette at low life. Everything is palette colours on `toonMaterial`, chunky shapes (0.12 m or more for anything that carries the silhouette), rules from `ASSETS.md` section 4. Tag every actor with `setLookLayer(root, 'actors')`. **Everything casts and receives shadows:** set `castShadow` and `receiveShadow` on meshes (traverse built models to be sure), and give actors a `ContactShadow` too.

**Style target:** dark gothic dioramas lit by fire. Deep `ink`, `night`, `navy`, `plum` environments; warm pools of light; saturated accents on anything that matters. The player should always find the hero, the danger and the loot within a second.

**Biome palettes:** Yard and Causeway: `night`, `slate`, `teal`, cold `sky` sun. Town: `plum`, `sand`, warm lamps. Ossuary: `night`, `mist` bone, green and candle lights. Cloister: `ink`, `red`, `orange`, firelight everywhere. Belfry: `navy`, `cyan` crackle, `white` lightning, `rift-energy` beyond the edges.

### The body template (verified)

```js
const j = (name, at, kids = []) => ({ group: kids, name, pivot: true, at });
// Positions are HERO_RIG's rest layout: keep the pivots, change the shapes between them.
const humanoid = ({ hips, chest, head, upperArm, foreArm, handR = [], handL = [], thigh, shin, foot }) => [
  j('Pelvis', [0, 0.62, 0], [...hips,
    j('Torso', [0, 0.05, 0], [...chest,
      j('Head', [0, 0.5, 0], head),
      j('ArmR', [-0.27, 0.42, 0], [...upperArm, j('ForearmR', [0, -0.25, 0], [...foreArm, j('HandR', [0, -0.16, 0], handR)])]),
      j('ArmL', [0.27, 0.42, 0], [...upperArm, j('ForearmL', [0, -0.25, 0], [...foreArm, j('HandL', [0, -0.16, 0], handL)])]),
    ]),
    j('LegR', [-0.14, 0, 0], [...thigh, j('ShinR', [0, -0.3, 0], [...shin, j('FootR', [0, -0.22, 0], foot)])]),
    j('LegL', [0.14, 0, 0], [...thigh, j('ShinL', [0, -0.3, 0], [...shin, j('FootL', [0, -0.22, 0], foot)])]),
  ]),
];
```

Shapes hang below their pivot (`{ box: [0.13, 0.25, 0.13], at: [0, -0.125, 0], c: 'robe' }`). Pass `[]` for any piece a body doesn't need. A weapon inside `HandR` uses `{ use: 'mace', at: [0, -0.35, 0.1], rot: [90, 0, 0] }`, or at runtime `root.getObjectByName('HandR').add(buildModel(id).object)`. Recolour with `buildModel(id, { palette: { robe: 'navy' }, catalog })`. Keep cheap monsters to about 4 palette slots, since each makes meshes per pivot.

### Asset list

Put each in a `src/view/models/*.js` module of plain exports with no engine start, and check with `node check.mjs --sheets src/view/models/x.js`.

- **Heroes (3 bodies, each with 3 armour tiers by level and rarity):**
  - **Bellwarden:** square shoulders, cowl, bronze trim (`plum`, `orange`), a huge bell on a chain as the weapon, with a `SpringChain` swinging at runtime.
  - **Lamplighter:** wide-brim hat, long coat (`navy`, `sand`), lamp pole on the back with a `glow` lantern and its own point light.
  - **Sexton:** stovepipe hat, black frock, grey face (`ink`, `lime` accent), spade.
  - Helm and shoulder sub-models attach to joints and change with worn gear. A seat-coloured ground ring appears in co-op.
- **NPCs (6):** the Crier's lantern on a post; Dame Brasse (wide, apron, hammer); Mother Ogive (veil); Pennywhistle (beak mask, big pack); Sister Pyx (plate, wimple, crossbow); Bishop Ambrose (mitre, pale).
- **Monsters:** table in section 6. Each has a palette variant for elites and glowing eyes (`glow: true`).
- **Bosses:** the Bursar (scale 2.5 humanoid, huge belly, ledger, abacus); the Bishop; Malison (6 m, non-humanoid: torso, head, four huge rope-wrapped arms as `tube` parts driven by `SpringChain` and `twoBoneIK`, stone cracks with `glow`); Old Clemency (`lathe`, 5 m, cracked, tolls with a swing). **(verified)** The forms that pass `checkModel` are `{ lathe: [[radius, height], ...], at, c }` and `{ tube: [[x, y, z], ...], r, at, c }`.
- **Props the library lacks:** gibbet, lychgate, Knell Font, votive rack, offering dish, ledger, abacus, bell rope, hand-bell, lantern, censer, shovel-as-weapon, pallbearer coffin.
- **Library:** use it freely for generic props (`LIBRARY.md`: `dungeon`, `architecture`, `containers`, `lighting`, `dressing`, `props`, `town`, `weapons`).
- **HUD icons:** library ones (`whirlwind-icon`, `leap-icon`, `fireball-icon`, `summon-icon`, `curse-icon`, `aura-icon`, `trap-icon`, `totem-icon`, `shield-bubble-icon`, `dash-icon`, `arrow-volley-icon`, `potion-red`, `skull`, `gold-icon`, `lock`, `check`, `plus`, `minus`, `quest-marker`) plus your own 12×12 sets: one per skill where the library has nothing, one per item slot recoloured by rarity, 3 gems, and all button glyphs (section 10).
- **Effects:** register particle presets per element (`ember`, `shock`, `grave_smoke`, `coin_spray`, `bone_chips`, `wax`, `peat`). Expanding rings are flat meshes tweened in scale with `glowMaterial`. `Trail` on weapon swings and projectiles.
- **Loot beams:** as in section 2 item 29. Items lie on the floor with a small label, always visible for Reliquary and up, on Alt or R3 for the rest.

---

## 9. Animation

**Base:** the engine's clip system. Use `HERO_CLIPS` on every humanoid. Hero and NPC locomotion is `Idle`, `Walk`, `Run` driven by speed with `AnimationMixer` crossfades. Set `action.timeScale` from attack speed.

**New clips, as `ClipDef`s in `src/view/clips.js`:** `BellOverhead`, `ChainSweep`, `LanternLob`, `ShovelSwat`, `Dig`, `RaiseHands`, `SinkGround`, `Drink`, `Revive`, `TalkGesture`, `Interact`, `Shamble` (with `gaitClip`), `Lurch`, `Lunge`, `CoffinSlam`, `Swell`, `RopeLash`.

**Monster motion:** humanoid clips with per-type speed; `LegStepper` with `twoBoneIK` for Crawlers, Clapperjaw and the Plate; `Squash` on the Deacon and on landings; hovering is a sine on y plus `SpringChain` for anything that trails (ropes, chains, tails).

**Bosses:** clips for the Bursar and Bishop (they're humanoid); Malison is procedural (arms from `SpringChain` plus scripted strike targets).

**Checks:** `validateClip` on every clip in tests; `analyzeClip` on `Shamble` and any new gait (section 2 item 16).

---

## 10. UI and input

### The rules

- All UI is drawn with `ctx.hud`, in art pixels, the same screens for pad and mouse. DOM is used only for the engine's ⚙ and the fatal no-WebGPU message. **No dense screens:** one job per screen, big icons, short lists, a maximum of 6 lines on an item card.
- Body text is scale 1 (7 art pixels, about 28 px at 1080p), headings scale 2. Nothing smaller exists. Keep important things inside a safe zone 12 art pixels from each edge.
- **Layout comes from `hud.width` and `hud.height`** (section 2 item 20). Test at 427×240, 480×270 and 512×288.
- **`src/ui/ui.js`** is a small immediate-mode layer: each widget registers an id and rectangle per frame. Direction input moves focus to the nearest rectangle that way. **Mouse hover moves focus when the pointer moved**; click activates. Pointer to art pixels: `((x + 1) / 2 × width, (1 − y) / 2 × height)`. Clicks come from `input.buttonEvents`. Each frame it also records `ui.drawnText` and `ui.focus` so tests can read the screen.
- Pause and full-screen menus use `engine.timeScale = 0` solo and on the couch. In a session nothing pauses: menus sit over the running world and the hero stands still.
- Call `ctx.input.clearQueued()` when a menu closes so presses don't leak into the game.
- Your own Settings screen covers what the engine's panel does (through `engine.settings.set`) plus the game's options, so it all works on a pad. The ⚙ shows only on touch-only devices.

### Controls

| Action | Pad (standard mapping) | Keyboard and mouse |
|---|---|---|
| Move | Left stick | WASD or arrows, or left click on ground |
| Aim | Right stick (soft lock otherwise) | Pointer |
| Skill 1 | Cross (0) | Left click on a monster, or Shift-click |
| Skill 2 | Square (2) | Right click |
| Skills 3, 4 | Triangle (3), Circle (1) | 1, 2 |
| Skills 5, 6 | R1 (5), R2 (7) | 3, 4 |
| Dodge | L2 (6) | Space |
| Potion | L1 (4) | Q |
| Interact | Cross tap when a target is within 2.2 m and no hostile within 4 m; hold Cross 0.4 s always | E, or click the thing |
| Hero screen | Create (8), on release | I or C (gear), K (skills), L (quests) |
| Pause | Options (9); ignore it while Create is held, since that chord belongs to the hub | Esc |
| Map | D-pad up | M or Tab |
| Passing Bell | Hold d-pad down | Hold T |
| Equip newest upgrade | D-pad left | F |
| Cycle interact target | D-pad right | Mouse does this |
| Show all item labels | R3 (11) | Alt |
| Zoom (Settings range) | Not on a button | Wheel |

**Menus:** left stick or d-pad moves; Cross confirms; Circle backs out; Square and Triangle are contextual; L1 and R1 switch tabs; Options closes. Keyboard: arrows or WASD; Enter or Space confirms; Esc backs out; X and V are contextual; Q and E switch tabs. Mouse: hover, click, right click for the contextual action, wheel scrolls. Add `Tab`, `F` keys and `Alt` to `ctx.input.preventKeys`.

### Prompts follow the last input

`src/ui/glyphs.js`: `lastDevice` flips to `pad` on any pad button or stick past the deadzone, and to `kbm` on any key, click or pointer move over 2 px. `prompt(action)` draws the right sprite everywhere: action bar, toasts, interact prompts, menu footers, tutorial.

- **PlayStation (default):** 11×11 sprites: Cross `sky`, Circle `red`, Square `plum`, Triangle `lime`, L1, R1, L2, R2, Options, Create, d-pad directions, sticks.
- **Xbox (Settings option):** A `lime`, B `red`, X `sky`, Y `sand`, LB, RB, LT, RT, Menu, View.
- **Keyboard and mouse:** keycaps drawn from a rectangle plus letter; left and right mouse sprites.
- Hide the system cursor while the pad is in use. With the mouse, use a pixel gauntlet as a CSS `cursor` from a generated data URL.

### HUD

```text
LV 12 NAME  ======XP======          ZONE TOAST or BOSS BAR              +--minimap--+
GOLD 1,204                          QUEST or KNELL METER                |  72 x 54  |
                                                                        +-----------+
                                                                         QUEST LINE
                                 (the world)
                                                                          STREAK 37
 ||                                                                               _
 || candle                                                                       (_) vessel
 ||          [potion][dodge] [X][SQ][TRI][O][R1][R2]
```

- **Life is a candle, not an orb.** A tall candle bottom left, 16×70 art pixels, that melts down; the flame gutters and the vignette rises at low life. Draw it each frame with `hud.rect` and `hud.sprite`, with the number on it.
- **Resource is a class vessel** bottom right: a bronze bell filling (Clangor), a lantern's glass (Wick), a jar of coins (Tithe).
- **Action bar:** 26×26 slots, icon, cooldown as a falling shutter plus seconds, the current button glyph on each, red flash when you can't pay.
- **World labels** (projected with the camera): damage numbers, monster name and bar on hover or soft lock, elite names with Afflictions, item labels, NPC names, interact prompts.
- **Toasts:** level up, new upgrade with the equip prompt, quest updates, legendary name in `orange` (scale 2), Requiem.
- **Subtitles:** bottom centre, speaker name in their colour, babble voice playing.
- **Couch co-op:** per-seat corner panels in seat colours: mini candle, vessel and 6 icons at 12 px. No centre bar.

### Screens

Each is one job, reachable by pad alone and mouse alone.

1. **Title.** Slow pan of the Belfry against a stormy sky, embers, big title, "PRESS ANY BUTTON". Idle 10 s: attract.
2. **Main menu.** Continue, New Hero, Knell Runs (locked until the credits or The Last Bell), Settings, About. Idle 10 s: attract.
3. **Hero select and New Hero.** Three heroes on plinths in the world, camera zoomed in. Selected one plays `Triumph`. Name, one-line fantasy, resource, three signature skills. Names come from a list (shuffle button, no text entry). Then difficulty and start point. Up to 3 hero slots, deletion with a hold to confirm.
4. **Hero screen,** tabs on L1 and R1:
   - **Gear:** paperdoll slots left, 8×5 inventory right (24 px cells), item card below: name in rarity colour, two big numbers (DAMAGE +12%, TOUGHNESS -3%), up to 4 affix lines, flavour. Square salvages or drops, Triangle compares.
   - **Skills:** six slots across the top, the class's 8 skills as big cards, then its 3 Tones. One step at a time. Then the two Vows.
   - **Stats:** three huge numbers (Damage, Toughness, Recovery), and a short list you can page.
   - **Devotion:** four big bars.
   - **Codex:** lore, bestiary, How to Play.
5. **Vendor and service screens:** Pennywhistle (buy, sell, casket); Dame Brasse (salvage, craft, reforge); Mother Ogive (extract, reliquary, socket, merge); Collection Box. Same card-and-grid layout as Gear.
6. **Map.** Full-screen explored cells, markers, Lychgate list to travel.
7. **Dialogue.** Camera zooms on the speaker (`setZoom`, pan the camera target), letterbox bars, subtitle panel, up to 3 choices. Any button advances, hold skips.
8. **Cutscenes.** `Timeline` for cues, `line()` and `bars()`; the camera stays `iso` and only pans and zooms. Two minimum: the opening and the ending, plus boss entrances. Hold to skip.
9. **Pause.** Resume, Hero, Map, Party (join and leave seats), How to Play, Settings, **Dev Mode**, About, Save and Quit. In a session: Resume, Settings, How to Play only.
10. **Settings.** Volumes (Master, Music, Sound, Voices), Glyphs (PlayStation or Xbox), Screen shake, Damage numbers, Zoom, Look (native plus a few presets), Pixel size, Quality, Fullscreen (catch the promise: browsers may refuse it, and an unhandled rejection fails the hub check), Reset to defaults (music back to 10%).
11. **Knell setup and results.** Tier, modifiers shown as big cards; results as a few big numbers.
12. **Death overlay.** The system line and the three options.
13. **About and Credits.** Section 13.
14. **Touch-only.** Section 13.
15. **Session card.** Section 12.

### Tutorial

Contextual prompts only, in the current glyphs, each gone once done: move, attack, dodge, drink, assign a skill, equip an upgrade, talk, use a Lychgate.

---

## 11. Audio

Everything is synthesised in code: no audio files. Sounds are `SoundDef` data in `src/data/sfx.js`, music is `Song` data in `src/data/songs.js`.

**Music is at 10% by default** (section 2 item 27), and a test asserts it.

**A pad may not unlock sound.** The engine unlocks audio on key, pointer and touch events, not on pad buttons. On the first pad press call `ctx.audio.unlock()`. If `audio.unlocked` stays false, show a small "PRESS A KEY OR CLICK FOR SOUND" on the title. There's no real pad here to prove what a browser does, so handle both.

### Music

The sequencer is chiptune by design. Lean into it: square-wave organ, triangle bass, noise for wind and drums, slow arpeggios. Write your own melodies from this motif, and quote nothing from the source.

**The Clemency motif (D minor):** `D4 A4 F4 E4 | D4 C4 D4 A3`. Every piece states or bends it. Malison's version is the same notes, one semitone off, because the bell is cracked.

| Piece | Where | BPM | Character |
|---|---|---|---|
| Vespers | Title, attract | 60 | Solo bell, then organ. Motif plain |
| Last Lamps | Tollhaven | 72 | Arpeggio like a lute, warm, sad |
| Weeping Road | Yard, Causeway | 66 | Sparse low pulses, wind noise |
| Under Gloam | Ossuary | 58 | Long notes, distant high bell, no drums |
| Cinders | Cloister | 96 | Tense ostinato, low drums |
| The Ledger | The Bursar | 126 | Mock-pompous march |
| The Climb | Belfry floors | 104 | Rising, relentless |
| Eventide | Malison | 138 | Driving, cracked motif, organ stabs; drums cut out in phase 3 |
| The Knell | Knell Runs | 118 | Driving loop with a meter-rising layer |
| Clemency | Ending | 66 | Motif resolved to major at last |

Each song has at least 3 patterns (8 or 16 bars), so it doesn't wear out at low volume. Fade or swap music on zone and boss changes with `playMusic`.

### Sound effects

At least 60 sounds, each with 2+ pitch variants through `pitch` at play time. `layers` make them weighty.

- **The bell** is the game's signature: `layers` of sine partials at 0.5, 1, 1.2, 1.5, 2, 2.67 and 3 times the base frequency, with long decays and slight detune. It marks legendary drops (bright), Great Toll (huge), the Knell meter and Old Clemency (enormous, and a cracked version with a beating partial).
- **Combat:** swings per weapon, hits per material (flesh, bone, stone, wood), crit layer, shatter, chunk patter, gold spray, Tallow plop, potion, dodge, level up, footsteps per floor.
- **Monsters:** wake, attack, hurt and death per type; telegraph warnings; boss stingers.
- **UI:** move, confirm, back, error, tab, equip, salvage.
- **Ambience:** `audio.loop` voices for rain, fire and wind, with `spatialize` and `muffle`.

### Voices: Animalese gibberish

No real speech. `src/audio/voice.js` turns each subtitle into babble:

- A **syllable bank** of about 20 short `SoundDef`s per register (consonant noise layer plus two vowel-formant sines with a pitch glide): low, mid, high, demon.
- Each letter or pair maps to a syllable by hash, so the same line always sounds the same. Punctuation makes pauses; `!` lifts pitch, `?` rises at the end.
- **Per speaker:** register, base pitch, rate, variance. The Crier is high and fast. Dame Brasse is low, loud and clipped. Ogive is soft and slow. The Bursar is low, with `crush`. **Malison is demon register, doubled an octave down, with an echo layer.**
- Play through `ctx.audio.play(def, { pitch, volume, pan })`, scaling by your Voices setting (the engine has only master, sfx and music channels). Heroes get short grunts and class barks ("not enough Clangor").

---

## 12. Multiplayer

### The couch (the game on its own)

Opened directly, with no hub, the game is a complete solo game with **drop-in couch co-op for up to 4 on one screen**. That's what "the game on its own" means here: the TV comes with one screen and up to four pads, and needs no server.

- **Seats:** the keyboard and mouse or the first pad to press is seat 1. In play, any unassigned pad pressing Options, or Party in the pause menu, joins: pick a class, get a guest hero at the party's level, saved per class so it keeps its loot. Holding Options on a pad in the Party menu leaves. When a second pad is seen, a toast says how to join.
- **Input:** `src/input/pads.js` polls each pad (section 2 item 25) and forwards state through `ctx.input.send` so engine replays stay valid.
- **One camera:** target the centre of the seats, and zoom out as far as `setZoom(0.62)` to fit them all. A hero off screen for 2 s teleports to seat 1.
- **Menus:** any seat can open its Hero screen; the world pauses, the panel is framed in that seat's colour, and only that seat controls it.
- **Loot** is per seat, with item labels coloured by owner.

### Hub sessions

The hub loads the game with `AIHub.active` true. Follow its `README.md` exactly. Mode: **`shared-world`**.

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="8">
<meta name="hub:session-goal" content="Fill the Knell, then slay its Warden together">
<meta name="hub:session-howto" content="Move: stick or WASD. Attack: Cross or click. Skills: face buttons or 1-4.">
<meta name="hub:webgpu" content="required">
```

**Flow:** at load, `if (AIHub.active)` go straight to the session flow: no title, menus, attract or saves. `const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true })`. If it returns `null`, run the normal game. Build the round from `info.seed` (the same map on every copy), start the engine (`Engine.headless` if `info.server`), then `AIHub.ready()` with no key press. If the engine can't start, `AIHub.fail(message)`.

**The card (game-owned):** three heroes in a torchlit room, plus the title, the players in their colours with ready marks, how to win, this player's controls in the current glyphs, seconds left from the `card` event. Enter, Cross or a click on Ready calls `AIHub.answer('ready')`; Triangle, M or a click calls `AIHub.answer('more')`. No choices, no menus. `AIHub.rng('card')` for anything random.

**The round:**
- A special Knell Run, one floor of 18 rooms, sized so it takes 5 to 6 minutes to fill the meter and 90 seconds for the Warden. HP scales with players.
- Heroes start at level 12, the first level with 6 slots and 6 skills, with all slots filled from a class preset and a plain gear set. Class comes from seat (seat 0 Bellwarden, 1 Lamplighter, 2 Sexton, 3 Bellwarden). In the first room, standing on another class's font for 2 s swaps your class until play has run for 30 s.
- Level-ups pop a small "pick 1 of 3" (a Tone, a Vow or a stat), on d-pad left, up or right, Z, X or C, or a click; it auto-picks after 10 s.
- Loot works as normal, with one-button equip. The Hero screen opens over the running world.
- Death: rise after 8 s, or an ally revives you.
- Play begins at `AIHub.time() >= 0`; show the countdown. Before that the sim doesn't step.

**The end:** Warden dead: host calls `AIHub.finish({ standings, scores, won: true, stats, awards })`. On `time-up`: host calls it at once with `won: false`. `standings` lists every remaining player, best first, ties grouped, sorted by `score = damage/100 + 50×revives + 20×eliteKills − 30×deaths`. Awards: Bell-Ringer (damage), Undertaker (kills), Good Samaritan (revives), Collector (gold), Regular Customer (deaths). On `end`, for any reason: stop input, sim, sending, music and loops.

**Other rules:** on `leave`, fade that hero out and carry on. Network only through `AIHub`. No chat, emotes or custom names. No `alert`, `confirm`, `prompt`, new tabs or navigation. No Quit. Names are drawn on the HUD canvas, never as HTML. `Create + Options` belongs to the hub.

### Netcode

**The host's sim is the only truth.** Clients generate the same map from the seed, run the same view code against a mirror of the world, and send only intent.

| Message | Direction | Reliable | Rate | Contents |
|---|---|---|---|---|
| `i` | client to host | no | 10 Hz, always, even idle | Move, aim, held buttons, seq |
| `c` | client to host | yes | On change | Presses and commands: cast, dodge, interact, equip, salvage. Queue and retry if `send` returns false |
| `s` | host to all | no | 10 Hz | Flat integer arrays: heroes `[id,x,z,facing,anim,hp,res,flags]`, monsters `[id,x,z,facing,hp]`. Positions × 10 |
| `e` | host to all | yes | 5 Hz batches | Events: spawn, hit, death, cast, drop, status, banner, subtitle, meter |

**Budgets, from the protocol:** at most 20 messages a second per copy; 16 KB per message; unreliable over about 1,200 bytes is lost whole if any packet is. So keep `s` under 1,100 bytes of JSON: the 24 monsters nearest any hero every time, plus a rotating slice of the rest within 40 m. Cap `e` at 12 KB and carry the rest to the next batch.

**Clients:** interpolate others 120 ms behind. Predict the local hero with the same movement code and the same grid; correct smoothly past 1 m of error. Play cast clips at once; numbers and deaths come from the host. Effects, ragdolls and chunks are local, from events.

**Server copies** (`AIHub.server`): run sim and net only; skip the view. `AIHub.me` isn't in the players; no local seat.

**Hitstop and slow motion:** never on the host. Clients may do purely visual freezes (pausing a mixer for 3 frames).

---

## 13. Attract, dev mode, About, touch

### Attract mode

After **10 seconds with no input on the title or main menu**, start a looping AI-played tour. **Any input** (key, click, pointer move over 2 px, pad button or stick past deadzone) exits straight back to where it was. It never touches saves.

Its only job is to show as much of the demo as possible. It runs a real world with real bots using `src/sim/bot.js`, cheating freely (invulnerable, level 25, full bars, good gear, no cooldown limits, reduced monster HP). A scripted tour of stops, about 2 minutes, joined with `engine.screen.cover('iris')` and `reveal`:

1. Tollhaven, slow pan past each NPC, with a subtitle line.
2. Causeway: a Bellwarden in a horde, in the rain, a legendary beam drops.
3. Ossuary: a Sexton with Pallbearers against an elite pack, then the Bursar.
4. Cloister: a Lamplighter with Beacon and comets.
5. A Knell Run with all three bots in a party, meter filling, couch HUD showing.
6. Malison, phase 2, then phase 3 with the bell ringing.
7. Back to the title card, loop.

Show a "DEMO" tag and "PRESS ANY BUTTON", with the title on each transition. Music plays if audio is unlocked. On a touch-only device it runs too.

### Dev mode

**Pause menu → Dev Mode.** Not in sessions. Pad-navigable like everything else. All changes are live.

**Tools:**
- *Cheats:* god mode, one-hit kills, no cooldowns, infinite resource, no collision, invisible to monsters.
- *Give:* level up, level to 30, gold, materials, any item by slot and rarity, any legendary, any set, all gems.
- *Spawn:* any monster, any elite with chosen Afflictions, any boss, Collection Plate, Unquiet Coffin, kill all.
- *Travel:* any zone and floor, any quest step, boss arena, start or fill the Knell.
- *World:* time scale, difficulty, reroll map seed, reveal map, next boss phase.
- *Party:* add or remove bot seats, bot plays this hero, play the attract tour.
- *Overlays:* nav grid, hit circles, AI state, spawn markers, flow field, FPS and `engine.state()`.

**Live sliders** (from `src/data/tuning.js`; each with its default shown and a **Reset to defaults** button):

Monster HP, Monster damage, Monster density, Elite frequency, Player damage, Player life, Player speed, Cooldown scale, Resource regen, XP rate, Gold rate, Legendary chance, Dodge cooldown, Tallow chance, Potion cooldown, Pick-up radius, Hit feel (flash, shake, stop), Camera view height.

Sim code reads these through `world.tuning`, never as copied constants.

### About and Credits

Reachable from the main menu and pause. Pages on L1 and R1, text wrapped to the screen, paged with stick or wheel. TASK.md marks this as critical, and these are its contents:

1. **Source Information,** one labelled line each, in this order: Date, Source, Plan, Genre and Perspective, Tech, Art Direction, Animation, Audio, Online, Testing, Research, Environment, Model, Usage. Section 17 says what to write for each. Write `unknown` for anything you can't confirm. Usage reads exactly `added on import`, as a plain string in the bundle, because the agent that imports the game replaces it with the real cost, tokens and time. Don't estimate them.
2. **Testing Feedback:** each of the 4 questions in section 17 with your answer.
3. **Engine Feedback:** each of the 6 questions with your answer.
4. **Prompt Feedback:** each of the 4 questions with your answer.
5. **Credits:** the game, then the kit's `CREDITS.md` (the kit asks you to ship it), embedded at build time and paged.

**One source of truth:** write the exit interview file once. `tools/build.mjs` reads it and generates `src/data/about.generated.js`, so the file and the screen can't disagree, and your chat reply copies the same text. A test asserts every label and answer reaches the screen (section 16). Because the real answers exist only at the end, rebuild after writing them.

### Touch-only devices

Detect as in section 2 item 28. Show the attract mode with "CONTROLLER OR KEYBOARD REQUIRED" wrapped to `hud.width` (a portrait phone fits about 22 characters a line) and the engine's ⚙. No on-screen controls. A tap only returns to the message; idle restarts the tour. If a pad connects or a key is pressed, play normally.

### No WebGPU

Catch the `Engine.start` rejection. Show a static DOM page with the title and "This game needs WebGPU: a recent Chrome or Edge, Safari 26, or Firefox on Windows". In a session, call `AIHub.fail`.

---

## 14. Architecture

### Tech stack

The Pixel Engine kit from the URL in your TASK.md (three.js and Rapier are inside it), plain JavaScript modules, esbuild to bundle, Web Audio through the engine, the AI Hub session client.

- **Never edit `pixel-engine.js`.** Keep it as it ships. Every system, model and animation goes on top of it. A test compares its hash to the download.
- Never load a second three.js or Rapier (`GUIDE.md`, rule 1).
- The hub's files are at `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/`: `README.md`, `session.js`, `harness.html`, `bridge.js`, `round.js`.

### Folder layout

```text
pixel-engine.js, check.mjs, GUIDE.md, API.md, ASSETS.md, LIBRARY.md, CREDITS.md   the kit, unedited
session.js              the hub client, byte for byte
game.js                 entry: exports createGame(opts); starts the engine only when document exists
index.html              dev page
src/data/               meta tuning classes skills vows items affixes legendaries sets gems monsters
                        elites bosses zones rooms/* quests dialog lore songs sfx voices strings
src/sim/                world hero cast effects monsters elites bosses loot stats quests zonegen
                        knell round bot events intents serialize
src/view/               scene zonebuild actors models/* clips vfx lootview labels camera cutscene
src/ui/                 ui glyphs hud menus/* dialog devmode
src/input/              router pads kbm
src/net/                transport host client codec hubflow card
src/audio/              music sfx voice
src/save/               save
src/modes/              shell (title, menu, attract state machine), play
tools/                  build.mjs test.mjs shots.mjs report.mjs hub/(harness.html bridge.js round.js)
tests/                  sim/* headless/* browser/*
docs/DESIGNERS.md       how to add a monster, skill, item, room, zone, quest, song
```

**The day-to-day loop:** `node tools/build.mjs` (esbuild takes a second), then run the bundle over `file://`. ES modules can't load from `file://`, so `index.html` needs a server; `node check.mjs` brings its own on `127.0.0.1`, port 0. Install everything inside the dev folder.

### The split that everything depends on

- **`src/sim` is plain JavaScript:** no THREE, no DOM, no `ctx`, no `Math.random`, no `performance.now`. It takes the engine's `Rng` and `NavGrid` only (both pure). `stepWorld(world, intentsBySeat)` at 60 Hz. It can run alone in Node, headless, on a client's mirror API, and with bots.
- **One world, many seats from day one.** Solo is a party of one. There's no special case to retrofit for co-op.
- **Input becomes intent.** `Intent = { moveX, moveZ, aimX, aimZ, held, pressed }` from the keyboard and mouse, a pad, the network or a bot. The sim can't tell which.
- **The sim emits events, the view consumes them.** `world.events.push({ t: 'hit', id, amt, crit, x, z })`. The view turns events into effects. The host forwards the same events to clients. Effects never affect the sim.
- **The view reads a world interface:** heroes, monsters, drops, zones. On a host it's the sim, on a client a mirror. The view code is the same.
- **One `Game` object for the whole session.** Zones are swapped inside it by disposing a `zoneRoot` group (`disposeObject`), releasing lights and clearing particles, so engine recordings and fingerprints cover a full playthrough. Don't use `loadGame`.

### Game hooks

- `fixedUpdate`: gather intents, `stepWorld`, unless paused or waiting.
- `update`: consume events, pose actors, draw UI, set zoom, poll pads and `input.send` their state.
- `fingerprint`: a hash of sim state. `status`: zone, level, party, kills. `ready`: `window.__GAME__ = this`, guarded.
- `dt` can reach 0.1 s on slow machines; the sim only sees fixed steps.

### Pathing and AI

- `NavGrid` from the zone grid (1 m cells). One `NavGrid` instance per seat for `flowTo`, since each holds one flow field. Monsters read the field of their nearest hero, plus separation from a spatial hash with 1.5 m cells. Click-to-move uses `nav.path`.
- Monsters are per-archetype state machines (idle, aggro, approach, telegraph, strike, recover, flee), with data for numbers. `BehaviorTree` is available but not needed. Packs stay dormant until a hero is within 30 m. Aggro at 12 m with `lineOfSight`.

### Randomness and saves

- All sim randomness comes from forks of one root that never draws (section 2, item 31): `root.fork('zone:' + id)`, `root.fork('loot')`. Sessions seed the root from `info.seed`. A new game seed is chosen in the UI and passed through `ctx.input.send` so it replays.
- **Saves:** `localStorage` under a key built from `TITLE`, in `try/catch`, versioned JSON. Heroes (3 slots, each with gear, inventory, skills, quests, zone seed), guest heroes, stash, Devotion, unlocks, bests, settings. Autosave on zone change, quest step, vendor close, and every 60 s. Sessions never save. Saved game data reaches the sim through `ctx.input.send`.

### Performance

TASK.md makes the budget unlimited, and FPS targets and optimisation are out of scope, so don't optimise: `quality: 'high'` (16 lights and the largest shadow map), as much detail and as many monsters, effects, lights and shadows as a scene wants, 150+ monsters on screen at peak. The only rule is sharing things that are free to share: `compileClips` per body type, `buildModel` for geometry, `glowMaterial` for flashes.

### Designer tools

So the rest of the game can be built later: all content is plain tables in `src/data`, rooms are ASCII, models are `ModelDef`s (`node check.mjs --sheets`), songs are text patterns. Dev mode tests any of it at once. `docs/DESIGNERS.md` is a page of recipes.

---

## 15. Build order

Finish each milestone before the next. The deliverable builds and runs after each one. Run the tier of tests that covers what you changed.

| # | Milestone | Done when |
|---|---|---|
| **M0** | **Setup.** Title picked, dev folder made. Kit unpacked, `session.js` and hub files fetched, `npm i -D playwright@1.63.0` in the dev folder, `tools/build.mjs`, `tools/test.mjs`, an empty game. Start `tests/ISSUES.md` (section 17) | The HTML boots on `file://` in Playwright with the right flags; `node check.mjs --headless game.js` passes |
| **M1** | **One good room.** Sim, intents, one Bellwarden with Clout and Great Toll, Peatwalkers, keyboard and mouse and pad, candle, action bar, numbers, ragdolls, shattering props, gold, Tallow | It's fun to hit things for a minute. A sim test kills 20 monsters with a bot. Replay matches |
| **M2** | **Zone pipeline.** ASCII rooms, generator, wall rule, textures, lights, Ossuary floor, `NavGrid` chase, telegraphs, dodge | Path test passes for 200 seeds. A 1080p shot reads |
| **M3** | **All three classes.** Effect ops, all 8 skills per class, Tones, Vows, resources, unlocks, Skills screen. Loopback net test (host and mirror in Node) | Bot uses every skill and Tone without error. Mirror test passes |
| **M4** | **Loot.** Items, affixes, rarities, beams, Gear screen, compare, equip, visible weapons and helms, legendaries, sets, Pennywhistle, Brasse, Ogive, gems, stash, save and load | Bot finds and equips upgrades. Save round-trips. Menu flow test by pad and by mouse |
| **M5** | **The campaign.** All zones, quests, dialogue, voices, town, Lychgates, Passing Bell, Requiem, shrines, coffins, Plate, elites, bosses, cutscenes, full music and SFX | Whole-game playthrough passes for all three classes |
| **M6** | **Multiplayer.** Couch seats and camera, Pyx. Hub flow, netcode, own card, the round | Harness passes in all 5 variants. A game test sees P2's hero move in P1's world. Pad stubs drive 4 seats |
| **M7** | **Endgame.** Knell Runs, Grand Knell, Penance, Devotion, Writs, The Last Bell start | Bot clears a Knell Run on each class |
| **M8** | **The shell.** Title, menu, hero select, settings, attract, dev mode, Codex, How to Play, About, touch-only, no-WebGPU | All shell tests pass. Every screen shot looks right at three sizes |
| **M9** | **Finish.** Balance with `tools/report.mjs` and sliders, a look at every shot, more lines, more juice, exit interview, a final build that carries its answers | Definition of done |

**Do M6 after M5 but keep the seams from M1:** the mirror test in M3 proves the split early.

### If you must cut

Whole features only, in this order, and remove every trace: Writs → Drowned Pantry → Gems → Devotion → Vows → Grand Knell → Sister Pyx → Reliquary extraction → Lore books (keep How to Play) → the round's level-up picks → the third class's last 2 skills.

**Never cut:** three classes, Tones, loot rarities with beams, legendaries, town services, five quests, three bosses, Knell Runs, couch co-op, hub sessions, pad-first UI, glyph switching, attract, dev mode with sliders, About, voices, music at 10%, the playthrough test.

---

## 16. Testing

`node tools/test.mjs` runs everything and prints **only failures and one count line**. `--sim`, `--headless`, `--browser`, `--hub` run one tier; rerun only the tier that covers what you changed. Use at most two browsers at once, sequentially. Serve from `127.0.0.1` on port 0 inside the test process, confirm the page's title is yours, and stop only what you started. "Target closed" or "browser has been closed" means memory ran out: run fewer at once. Don't use subagents or workflows to review or judge.

### Tier 1: sim (Node, no engine loop, seconds)

- `stepWorld` is deterministic: same seed and intents, same hash, for 5 minutes of play.
- Damage, armour, XP curve, item generation stay inside ranges; items always valid. Each effect op works. Each legendary's hook fires. Each Affliction behaves.
- Zones: `nav.path(entrance, exit)` for 200 seeds per zone. The same seed builds an identical map no matter what other streams have drawn (section 2, item 31).
- **Net:** host plus mirrors over a simulated lossy transport (150 ms, 50 ms jitter, 5% loss) in Node: mirrors converge, commands arrive, budgets respected (message rate under 20 a second, `s` under 1,100 bytes, `e` under 12 KB).
- **Lint:** every string in `src/data` fits the HUD font; line lengths fit; no `Math.random` or `performance.now` in `src/sim`; no `TODO`, `FIXME`, `XXX`, `placeholder`, `stub` or `coming soon` anywhere in `src`; none of the banned names from section 1; every `use`, texture, clip, sound and song referenced by data exists; `validateClip` clean on every clip; `renderSound` non-silent and peak ≤ 1 for every sound; `parseSong` on every song.
- `checkModel` has zero problems on every model.
- `pixel-engine.js` and `session.js` are byte-identical to what you downloaded (keep their hashes in `tools/`).

### Tier 2: the game in `Engine.headless` (Node, a minute or two)

- `node check.mjs --headless game.js --keys ...` with keys that really play. Replay matches.
- **Whole-game playthrough, once per class, default tuning, Pilgrim:** the bot (`tests/headless/playthrough.mjs`) starts at the title, makes a hero through the real menus by keys, plays to the credits by intents and commands. Asserts: every zone visited; every quest done; all three bosses killed; every skill slot used; a legendary equipped; item salvaged, crafted, reforged, sold, bought, stashed, extracted, socketed; every Lychgate touched; a shrine and a coffin used; ending played; Knell Runs unlocked; then one full Knell Run. Every row of the feature table in section 3 that the campaign can reach must have happened. Fail on any softlock (no progress for 3 sim minutes).
- **The Last Bell, once per class:** start it through the menus, spend Devotion, change tier, complete a Grand Knell, see a set bonus apply. This covers the table's remaining rows.
- **Balance report:** `tools/report.mjs` prints minutes per zone, deaths, level at each zone, boss durations, drops by rarity. Assert: campaign under 75 sim minutes; level 16 to 24 at the credits; the Bursar 60 to 180 s; Malison 120 to 300 s; 2+ legendaries.
- **Screens:** every menu opens, navigates, closes, by keyboard codes. `ui.drawnText` has what it should. Dev mode: every tool and slider has an effect, and Reset restores.
- **Attract:** idle 600 frames on the title: attract starts. Idle on the main menu: same. Any key exits. It loops twice with no errors, covering each stop. Saves untouched.
- **About:** every Source Information label and every feedback question and answer appears in `ui.drawnText` across the pages, and Usage reads `added on import`.
- **Exit interview, once written:** parses as JSON; has exactly the keys in section 17; 4, 6 and 4 feedback answers; `aiHub.name` equals `TITLE`; 3 to 6 lowercase tags; no empty values, except that `series` may be empty.
- **Audio:** `audio.volume.music === 0.1` on first run, and after Reset. Every zone starts its song. Speaking a line increases counts and its syllables are the same each time.

### Tier 3: browser (real WebGPU on SwiftShader)

Use the flags in section 2 item 5. Open the bundle over `file://`, use `engine.step` and `capture`, and don't wait in real time.

- **Boot:** no page, console, game or GPU errors. Picture isn't blank (`capture`). The bundle is one file: `session.js` byte-identical and first; metas present.
- **Pad only** (stubbed `navigator.getGamepads` in standard mapping via `addInitScript`): press through title, hero select, play, skills, Hero screen, pause, dev mode, settings, quit. PlayStation glyphs shown (`ui` reports the glyph set). Xbox option switches them. A key press switches prompts to keycaps; a pad press switches back.
- **Mouse and keyboard only:** hover moves focus (`page.mouse.move` over a menu item, `ui.focus` changes); click activates; click-to-move moves; click on a monster attacks; every key in section 10 works.
- **Couch:** 4 stub pads join, each moves its own hero, camera holds them.
- **Touch:** Chromium with a phone profile (Pixel 7) and a tablet profile, tapping with `page.touchscreen`: message present and wrapped, ⚙ present, `engine.touch` null, attract running. A tap doesn't start a game. WebKit here has no WebGPU, so it can only confirm the no-WebGPU page.
- **Sound, by what Web Audio produces:** the engine doesn't expose its output node, so wrap `AudioNode.prototype.connect` in `addInitScript` to also feed anything connected to the destination into an `AnalyserNode`. After a key press unlocks audio: music alone gives a non-zero level; a sound effect raises it well above that; a spoken line produces sound; `end` in a session brings it to silence.
- **Layout:** `ui.drawnText` rectangles stay inside the screen at 1280×720, 1920×1080, 2560×1440, with no overlaps on each screen.
- **Screenshots** for your own eyes (`tools/shots.mjs`, at 1920×1080): title, attract, combat with 40+ monsters, each zone, each class casting, Gear, Skills, each vendor, Map, dialogue, each boss, Knell meter, couch HUD, dev mode, About, touch. Use screenshots only for what a script can't check: look at each one at least once before finishing.

### Tier 4: hub

Copy `harness.html`, `bridge.js` and `round.js` beside a copy of the deliverable and serve them on `127.0.0.1` port 0. Open and wait for `document.body.dataset.complete === 'true'`, then require `window.__hubCheck.pass`:

1. `?game=GAME&players=2&auto=1`
2. `?game=GAME&players=4&latency=150&jitter=50&loss=5&auto=1`
3. The same with `&scenario=host-leave`
4. `?game=GAME&players=2&scenario=server&auto=1`
5. `?game=GAME&players=1&auto=1`

Then a **game-level** check: two frames, drive P2 by synthetic keys inside its frame, and read `frame.contentWindow.__GAME__` to see P2's hero move in P1's world and P1's in P2's. Then outside a session: the page opened on its own still plays normally.

---

## 17. Coverage and definition of done

### TASK.md to this plan

In TASK.md's order. The last column says how each one gets proved.

| TASK.md asks for | Plan section | How it's checked |
|---|---|---|
| Source: an original game inspired by Diablo 3 | 1, 3 | Banned-name lint (16) |
| Genre and perspective: pick what fits best | Top of plan, 2 (item 22), 4 | Screenshots (16) |
| Title: a riff, 50 ideas, a real random pick | 0 | M0; `aiHub.name` test (16) |
| Research: builder's choice | 0, 17 | Reported in Source Information |
| Package: a single HTML file, named as TASK.md says | 0, 2 (items 1 to 4), 14 | Boot test (16, tier 3) |
| Tech stack: the kit, engine as shipped, systems on top | 14, 2 | Hash test (16, tier 1) |
| Art direction: native style, new assets, library for generic props | 8 | `checkModel`, screenshots |
| Animation: native system, new animations | 9 | `validateClip`, `analyzeClip` |
| Audio: all in code, gibberish voices, music at 10% by default | 11, 2 (item 27) | Audio tests (16, tiers 1 to 3) |
| Online and Multiplayer: the hub, and the game on its own | 12 | Hub tier, couch test, solo check (16) |
| Working environment: dev folder, modules, bundle, `file://`, server and process rules | 0, 14, 16 | Test runner serves on port 0, checks the page's title |
| Performance: unlimited budget, no optimisation | 14 | Nothing to test, by design |
| Testing: headless, whole-game playthrough, one command, failures and a count, no review agents | 16 | The command itself |
| Effort: builder's choice | 15 orders it | Not applicable |
| This computer: tools, browsers, memory, sharing | 0, 2 (item 5), 16 | Followed as written, with one correction |
| Stand-ins: pad, touch, listener, second player, iPhone, TV | 16 (tiers 3 and 4) | Those tests |
| Feature-complete demo, all features shown, polished vertical slice | 0, 3 (feature table), 4 to 7 | Playthrough tests assert every row |
| Infrastructure for designer tools | 14 | `docs/DESIGNERS.md`; content is data |
| Dev mode from the pause menu: tools, live sliders, reset | 13, 10 | Screens test (16, tier 2) |
| Attract mode: 10 s idle on title or menu, loops, any input exits, may cheat | 13 | Attract test (16, tier 2) |
| Narrative tone like the source's | 3 | Sample lines; font lint |
| 10-foot, controller-first on a DualSense or standard pad | 10 | Pad-only test (16, tier 3) |
| Native keyboard and mouse; genre's keys; mouse aims and clicks; hover moves focus | 4, 10 | Mouse-and-keyboard test (16, tier 3) |
| Prompts follow the last input; PlayStation glyphs, Xbox option, keys and mouse | 10 | Pad-only test (16, tier 3) |
| No dense, web-style screens | 10 | Layout test, screenshots |
| Touch-only: no touch controls, the message, the settings button, attract runs | 13, 2 (item 28) | Touch test (16, tier 3) |
| Done: no TODOs, placeholders or stubs | 0, 15, 16 | Lint (16, tier 1) |
| Source Information, in chat and on About/Credits | 0, 13, 17 | About test (16, tier 2) |
| Testing, Engine and Prompt Feedback, in chat and on About/Credits | 0, 13, 17 | About test (16, tier 2) |
| Exit interview: exact shape, every value filled, parses | 17 | Shape test (16, tier 2) |

### The exit interview and the feedback

TASK.md asks for this in three places: your final chat reply, the About/Credits screen, and a JSON file beside the game's HTML. Your TASK.md gives the file's name. If its shape ever differs from this one, TASK.md wins.

One JSON object, in exactly this shape, every value filled in. Tools read it (the game's run record and the AI Hub catalogue), so write plain text, write `unknown` for anything you can't confirm, and check that it parses. This block is copied word for word from TASK.md; the strings in it say what goes in each value:

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

**`sourceInformation`** (and the same lines on About). Check each against what you actually built:

| Field | Write |
|---|---|
| `date` | The date and time your TASK.md gives |
| `source` | `Diablo 3` |
| `plan` | The file name of this plan as you received it |
| `genre` | Co-op action RPG (hack-and-slash) |
| `perspective` | Fixed 3/4 isometric, orthographic |
| `tech` | Pixel Engine and its version (with three.js and Rapier inside), JavaScript modules bundled with esbuild, WebGPU, Web Audio, the AI Hub session client and its version |
| `artDirection` | The engine's native pixel-art toon style and palette, with new models for heroes, NPCs, monsters, bosses and key props; the library for generic props |
| `animation` | The engine's clip system on its hero rig, new clips, and procedural legs, springs and squash |
| `audio` | All in code: chiptune songs, synthesised effects, Animalese-style babble for voices, music at 10% by default |
| `online` | AI Hub Session Protocol v1, shared-world, up to 4; couch co-op on its own |
| `testing` | What TASK.md allowed: headless scripts that play the game and check its state, a scripted whole-game playthrough, one command, screenshots only for what a script can't check, no subagents or workflows to review |
| `research` | What you really did. This plan counts; otherwise `none` |
| `environment`, `model` | The values your TASK.md states |
| `usage` | `added on import` (the run's real cost, tokens and time are added for you; never estimate them) |

**Answer each of these, in this order.** They're word for word from TASK.md.

**Testing Feedback**

- How many issues did testing catch?
- How many would be considered critical issues / game breaking?
- What was the most helpful test you ran?
- What was the least helpful test you ran?

**Engine Feedback**

- What did you like most about the engine?
- Did you get stuck or guess wrong?
- What was the most important thing you had to build yourself?
- What was the hardest part about using the engine?
- What did you change in the engine, and why? (none if nothing)
- If you could change one thing about the engine, what would it be?

**Prompt Feedback**

- What did you like most about this prompt?
- What was confusing?
- What was the hardest thing to do?
- What would you change in this prompt?

**Keep the numbers honest.** From M0 on, add one line to `tests/ISSUES.md` for each issue a test catches, marked critical or not, and note anything the engine made you stuck on. At the end the counts are real and you aren't working from memory.

**`aiHub`:** the catalogue's model, effort, CLI, date and usage come from the run's record, so they aren't asked for. Suggested values:

- name: your title, exactly as on the title screen
- tagline: `The bell is cracked. The dead are up. So are you.`
- description: `A gothic hack-and-slash for 1 to 4 players: smash hordes as a Bellwarden, Lamplighter or Sexton, hunt loot that rings like church bells, and silence a furious walled-up saint.`
- type: `Game`; genre: `RPG`; source: `Diablo 3`; series: `Diablo`; players: `1–4`
- controls: `Stick or WASD or click to move · Cross or click to attack · face buttons, R1, R2 or right click, 1-4 for skills · L2 or Space to dodge`
- tags: `3d`, `co-op`, `pixel art`, `fantasy`, `boss fights`, `top-down`

### Done means

- [ ] Every "never cut" item in section 15 is in and works. Nothing visible does nothing.
- [ ] `node tools/test.mjs` reports zero failures, including the playthrough for all three classes and all hub variants.
- [ ] You looked at every screenshot. The scene reads, HUD is legible, nothing is black or clipped.
- [ ] The deliverable HTML is where TASK.md says, one file, and runs on `file://` and from a server.
- [ ] The exit interview file is beside the HTML, in the shape above, every value filled in, and parses.
- [ ] About shows Source Information, Testing Feedback, Engine Feedback and Prompt Feedback with real answers, built from that file.
- [ ] Your final chat reply carries the same Source Information, Testing Feedback, Engine Feedback and Prompt Feedback.
- [ ] Every process you started is stopped, and every file you made is inside your folder.
