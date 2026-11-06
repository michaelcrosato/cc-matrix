# Combat (1977): research and adaptation

Sources consulted on 2026-11-05:

- [Atari's official Combat page and rules](https://atari.com/pages/combat).
- [Original Atari Combat instruction booklet, scanned](https://www.ataricompendium.com/archives/manuals/vcs/combat.pdf). Pages 2–6 were rendered locally to inspect controls, diagrams and arena appearance. This is the original game, not Combat Two.
- [Combat program disassembly](https://www.atariage.com/2600/archives/combat_asm/index.html), an original-program artifact with later explanatory comments. It is not an official newly published Atari source release.
- [AI Hub Session Protocol v1](https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md).

## Source findings

Combat is a two-player vehicle shooter with 27 variations. Tanks and jets use top views; biplanes use a side view. Each match lasts 2 minutes, 16 seconds. One hit earns one point. Arenas include open fields, easy and complex mazes, and clouds.

Straight missiles keep their heading. Guided missiles steer after firing. Machine guns produce rapid straight shots. Tank-Pong missiles bounce from walls and barriers. Its billiard-only variants require at least one bounce before a scoring hit; your own missile never scores against you.

Invisible tanks briefly reveal when firing, being hit, or bumping a barrier. Aircraft may use formation variants; clouds conceal aircraft without blocking hits.

The booklet's arena diagrams use bright lime or orange fields, chunky gold barriers, contrasting red and blue vehicles, and large scores at the top. Its tone is brisk, instructional and playfully competitive.

The program artifact contains distinct motor and explosion sound routines. Motor pitch depends on vehicle and speed. The rebound tone rises across successive bounces. Exact perceived original waveform/timbre: unknown; no listening hardware is available.

## Original adaptation recommendations

Com-Ricochet should emphasize readable toy vehicles and skillful trajectories. Treat this as a vehicle arena shooter, with one fixed orthographic camera tilted slightly toward the field. That preserves the immediate relationship between tank, target and barrier while giving the cel-shaded models visible depth.

The five-round circuit should make one new decision clear each time:

1. Straight shots: aim ahead of a moving rival; navigate simple cover.
2. Bank shots: a rebound arms the shot, with an obvious trail/color or pulse change.
3. Guided shots: hold a clearly named control to steer a live shell. Aim preview should show its current direction, not falsely promise homing behavior.
4. Invisible tanks: firing or touching cover trades concealment for a useful action. Keep the player's own faint silhouette readable.
5. Jets: continuous motion changes timing; wrap edges with clear edge markers. Clouds may conceal, but should not look like solid obstacles.

New music, boost abilities, solo AI and campaign structure are adaptations rather than claimed original features. Give them concise arcade-style language. Avoid inventing enemy factions or a serious war narrative absent from the source.

## UX recommendations

Keep the score, remaining time, and current rule visible at a distance. Each round gets a single sentence about its unique scoring rule. Menus should use large focusable choices with mouse-hover focus. Keyboard and gamepad labels should update with the last input. A controller prompt should distinguish R2 fire, a second action if needed, and Options pause.

Touch assistance should be explicit in the controls screen: invisible left stick drives, right half aims/fires, and assisted targeting helps while touching. Pause remains a visible button. Multi-touch must not cancel the left stick when a right-side finger lifts.

The pause-menu developer panel should expose speed, projectile speed, enemy aggression, fire cooldown, round time, and invulnerability, with reset. Quick tools should restart a round, skip a round, and end a match. Keep those tools out of hub-session rule ownership.

## Verification recommendations

- Run a whole circuit through each transition to results, with scores and round identities checked.
- Check a direct billiard hit does not score, then an otherwise equivalent bounced hit does.
- Check guided input changes a projectile heading after launch.
- Check invisibility reveals for all three triggers and conceals again after its timer.
- Check tanks cannot cross solid walls and fast shells do not tunnel through them.
- Check jets wrap and that camera clipping does not hide them near the border.
- Simulate a standard-mapping pad, including held buttons and disconnect/reconnect. Test menu focus and last-input prompts.
- Test simultaneous touch contacts in a phone profile.
- Measure generated Web Audio signal and confirm music defaults to 0.10.
- Run AI Hub automatic harness for 2 players, 4 players with loss/jitter, host leave, and no-local-player server host.
- For standalone direct multiplayer, drive both copies and verify input affects only its assigned seat, snapshots converge, and disconnection is visible.
- Confirm attract mode begins after 10 idle seconds and any input returns to title without leaking gameplay actions.
