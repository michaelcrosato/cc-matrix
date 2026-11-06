# Content guide

Build with `node tools/build.mjs`; test with `node tools/test.mjs`. The build reads `build-config.json`, joins `00-core.js`, the sorted `src/data/*.js`, then the other numbered runtime modules into one IIFE. It writes the development page, root HTML and exit interview. The root HTML runs offline.

## Registries

`def(kind, id, spec)` registers heroes, skills, monsters, affixes, bosses, zones, Relics and sets. Add content in `src/data/`. Simulation never reads visual rigs. Each world owns its heroes, enemies, allies, corpses, loot, hazards and effects. Separate seeded streams drive geometry, AI, dressing and loot.

Skills combine shared verbs: cone, wave, bolt, chain, nova, area, lob, bell, leap, charge, blink, buff, guard, summon, corpse, heal and beam. The `skill()` helper takes the hero, ID, name, verb, weapon-damage multiplier, range, radius, cost, cooldown, native animation and three Tones. Tone modifiers include damage, range, radius, cost and cooldown multipliers; element, stun, slow, burn, pull, pool, triple, chain, pierce, leech and Ringing. Add the ID to its hero's list. Tests cast every skill and Tone.

```js
skill('cantor','quietAsh','Quiet Ash','wave',2.1,130,20,20,3,'cast',[
  ['Wide','A wider verse.',{radiusMul:1.5}],
  ['Cold','The ash chills.',{element:'frost',slow:1}],
  ['Cinder','The ash remembers fire.',{element:'fire',burn:1}]
]);
```

A monster supplies its body, AI kind, movement, health/damage multipliers, wind-up, reach, move and death material. Native Humanoid/Blob and custom crawler, serpent, hound and moth bodies are available. Add elite patterns in `applyAffix()`. Boss data lists health thresholds and pattern IDs; `bossPattern()` is the shared library. `dealDamage()` is the only damage pipeline. Shared hazards and effect verbs carry network events, so content needs no separate per-skill networking.

## World and progression

A zone chooses a theme, dimensions, layout, enemy pool/count, kill requirement and interactive objects. ASCII legend: `#` stone, `H` houses, `.` floor, `~` blocked void. Add a hand-authored layout in `makeRows()`, or use its seeded hall/island/yard generators. Preserve a walkable route between the spawn, objectives and exit. Themes control ground, walls, ambient light, weather and score. Props are seeded data; native objects use `E.SHAPES`. Bells, the gate, headstone, pew and foundry wheel in `50-art.js` are original worked examples.

`CAMPAIGN` orders the quest path. Each step names a zone, title, objective, line and optional speaker. `objectiveReady()` enforces requirements. New objects need an interaction in `interactNearest()` and drawing in `drawObject()`. Existing chapels, sluices, caravan, grave row, cursed chest, sermon and side crypt demonstrate events and rewards. `ATTRACT` orders the throwaway demo vignettes. The same bot drives it, followers and the campaign test.

Items have eight possible slots, rarity, affixes and optional gem, Relic or set ID. A Relic declares a power and flavor; implement its modifier in `tunedSkill()`, the damage pipeline or its shared event. Town services call the same inventory operations as tests. Saves are version 2; `serializeWorld()` omits renderer/pathfinding state and `migrateSave()` upgrades older data.

## Presentation and tools

Use ASCII and supported engine glyphs; keep most spoken lines under 90 characters. Add barks, lore, epitaphs and taunts to their arrays. `say()` uses native Dialog portraits and deterministic gibberish profiles. `SCORES` holds original interval sequences; instruments, reverb, voices and effects are synthesized in `55-audio.js`.

All balance controls are in `TUNING`. Dev Mode offers cheats, spawns, travel, sliders, resets, clipboard export and overlays. Gallery cycles skills/Tones, monsters/affixes and boss phases. Deep links include `#zone/acre`, `#boss/regent/1`, `#vigil/3`, `#gallery/skill/knell/2`, `#gallery/boss/angelus/2`, `#attract`, `#about`; `?seed=1441` fixes the campaign seed. Tests inspect `window.__diabellum` and `game.debug.snapshot()`.

Keep `data/04-about.js` accurate: it generates both About/Credits and the exit interview.
