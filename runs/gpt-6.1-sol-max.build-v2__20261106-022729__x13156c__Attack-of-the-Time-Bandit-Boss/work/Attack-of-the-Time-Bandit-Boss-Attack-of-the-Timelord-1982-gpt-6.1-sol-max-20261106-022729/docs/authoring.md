# Author a wave

Edit `src/content/campaign.js`, then `npm run build`. Run `npm test` from this development folder. A wave is data; renderer and simulation need no new branches.

```js
{
  name: 'Compound chaos', ships: 26, hp: 3,
  routes: [1, 0, 2], speed: 38, interval: 1.14,
  mix: ['mine', 'dart', 'hunter', 'dart', 'roller', 'mine'],
  cue: 'MAKE A GAP. THEN TAKE THE SHOT.',
  line: 'You are a very expensive rounding error.',
  color: '#ac99ff', hints: [[12, 'Intercept before you commit.']]
}
```

`ships` is the authored membership, `hp` hull integrity, `routes` indexes into the common-plane Catmull paths, `speed` the cruising formation phase speed, `interval` seconds between attack cues multiplied by live attack-interval tuning. `mix` cycles actual weapon families, `cue` the first three-second playfield instruction, `line` a subtitled syllable-voice trigger and `hints` time/text pairs. Shared defaults supply first attack at 4.8 s, arrival spacing 0.18 s, groups of eight and warning tuning. Fleet kills decide completion, rather than a filler timer. Extend validation's eight-wave expectation if building a different campaign length.

The four weapons use separate behaviors in the simulation: limited-rate seekers, falling darts, warned committed predictive diamonds and finite bounded ground crosses. Rollers reserve a refuge, never overlap another roller, and suppress other scheduled attacks aimed into that refuge. Add a weapon family by supplying simulation behavior, eligibility/scoring/charge, warning art and audio, plus focused state tests.

Finale phases are in `BOSS_PHASES`: HP, open/closed durations, interval, weapon mix, accent and line. Weak-point schedules use hostile time, so warning and vulnerability slow together during a brake. Players, shots, recovery intervals and the authoritative clock use normal time.

Pause → Dev Mode exposes jumps to all waves and boss phases, restart, invulnerability, hitboxes, trajectories, AI, a one-tick step while paused, simulation speed, refill, individual weapon spawns and ten native live tuning sliders. Opening it marks the run before any record can be saved. Reset uses native setting groups; inherited nonbaseline tuning marks every new run as modified.

`node tools/test.mjs` is the one quiet entry point. Optional `state`, `browser` or `network` arguments narrow a rerun to changed coverage. Tests use canonical actions, and the full-campaign success test never sets victory or skips a phase.
