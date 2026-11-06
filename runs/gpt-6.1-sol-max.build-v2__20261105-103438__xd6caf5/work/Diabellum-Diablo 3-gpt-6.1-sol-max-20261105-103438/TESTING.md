# Verification

The complete command `node tools/test.mjs` finished with:

`3097 checks: 3097 passed, 0 failed.`

After the final input polish, `node tools/test.mjs browser` passed all 45 focused browser checks, including the new assertion that a keyboard skill retains the mouse aim point. Final visual captures also check compact mouse labels, co-op loot ownership/resource bars, and skill cost/cooldown text. Packaging was rebuilt after adding the engine's MIT notice. The game itself does not make external requests when opened from `file://`.

## Coverage

- Data: four heroes, 32 skills with three Tones each, 24 Relics, 12 elite affixes, registry references, font/originality checks, walkable exits and objectives, and all twelve lore pages placed in the world.
- Simulation: every skill/Tone, monster, affix and boss pattern; damage, resources, cooldowns, evades, death/revival, crafting, salvage, buying/selling, re-dipping, sockets, extraction, XP, save migration and deterministic replay. Headless rendering covers every monster and boss phase. Added regressions cover attack cadence, held primary/secondary input, socket bonuses, room persistence, monotonic saved IDs and couch character persistence.
- Campaign: all four heroes complete the entire quest path, reach the ending and clear a Vigil. God mode, higher damage and instant cooldowns accelerate this state/progression test. UI scripting also walks through New Hero, Muster, all prologue and ending panels, the epilogue and entry into the Vigil.
- Browser: the bundled file in Chromium, Firefox and WebKit; actual keyboard/mouse actions, two emulated standard gamepads, shared couch combat, independent revival, live prompts and Xbox glyphs, pause-to-Dev Mode, live sliders and resets, touch notice/Settings, the complete looping attract director and save isolation.
- Audio: OfflineAudioContext renders all seven instruments/voice types; non-silence, distinct speaker pitches, default music volume and attenuation of high frequencies by the Hush.
- Hub: all four required harness configurations pass: two players; four with 150 ms latency, 50 ms jitter and 5% loss; host departure under those conditions; and a server copy with no local player. An additional two-copy real-minute run verifies remote skills, shared kills, personal Relic auto-equipping, summoned allies, foe/position synchronization and a clean time-up result.

## Visual checks

The matrix covers 14 phone, foldable, tablet, desktop and ultrawide shapes. It waits for the boot overlay to close before taking screenshots. Every profile reports no horizontal/vertical overflow and no JavaScript errors. WebKit phone profiles are the automated stand-in for iOS Safari.

`check-output/viewports/index.html` is the matrix. `check-output/scenes/` has all zones, every campaign boss phase, menus, mouse HUD and couch loot. `check-output/filmstrips/` has seven-frame wind-up/strike/recovery captures for each hero's primary attack. Native TV menu scale was checked at 1920x1080. Screenshots were inspected directly.

No physical controller, touch device, real iPhone/iPad, TV or human listening session was available. Controller input and touch use emulation; audio uses generated waveform checks. No frame-rate or optimization target was imposed.

## Ten tracked defects found and fixed

1. The town exit initially occupied a building tile.
2. The input hook was initially given the wrong callback signature.
3. Ranged bots stopped outside interaction distance.
4. With instant cooldowns, the Ringer continually recast his active buff.
5. With instant cooldowns, the Cantor continually blinked instead of attacking.
6. A summoned archer's projectile lacked the owning hero as its damage source.
7. Menu shortcuts could be lost during hit-stop.
8. Crafting could overfill a full bag.
9. A portal glow used the wrong renderer signature and interrupted drawing.
10. Furniture penny generation briefly referenced the wrong source variable.

Four could block gameplay: the exit, hook signature, archer source and portal draw call. Every tracked defect has been corrected. Additional checks protect co-op revival, menu-release input, quest travel, saved character/item identity and socket/affix behavior.
