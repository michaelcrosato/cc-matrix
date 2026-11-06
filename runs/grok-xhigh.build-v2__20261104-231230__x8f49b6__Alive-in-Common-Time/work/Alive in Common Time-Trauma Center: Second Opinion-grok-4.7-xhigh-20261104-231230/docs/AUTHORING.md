# Authoring

Operations, strains, scenes, and tuning are data plus one small piece of behavior. The sim reads them. The view and the shell do not need a new screen for each addition.

Run `node tests/run-all.mjs sim` after a data change. It plays the shipped sim. A new operation is not done until that bot finishes it inside the same rules as the others.

## Add an operation

1. Add `src/data/ops/<id>.js` that default-exports one object.
2. Import it in `src/data/ops/index.js`. Story operations go in `OPS`, in play order. A free-play or versus operation that is not in the story goes only in `ALL_OPS`.
3. Give it a patient, a timer, a bpm, a music id, a `teaches` list, one or more sites, and phases.
4. Point `scene.before` and `scene.after` at scene ids. Use `consult: true` when the chart should offer Careful and Aggressive.
5. Set `parScore` from a Normal resident bot run with `physics: false` and seed 1. Do not change a locked par unless that bot's score actually moved.

```js
export default {
  id: 'night-shift',
  title: 'Night Shift',
  doctor: 'ren',
  scene: { before: 'S17', after: 'S18' },
  patient: { name: 'Ada Quill', age: 40, job: 'Ferry pilot', note: 'Keeps time with the engine.', followUp: 'Home on Thursday.' },
  timer: 180,
  bpm: 84,
  parScore: 1,
  music: 'or-tense',
  teaches: ['gel'],
  sites: [{ id: 'arm', organ: 'forearm' }],
  phases: [/* see below */],
};
```

`doctor` is `ren`, `ines`, or `both`. `noTimer`, `noFail`, and `noRank` mark an operation that cannot be lost and is not graded.

A phase needs an id, an `objective` string, the `tools` the wheel may use, a `spawn` list, and `done`. `say` lines are optional. Completion keys the sim already understands include `cleared`, `vitalsAbove`, `allClampsOff`, `strainDead`, and `arrestsSurvived`.

```js
{
  id: 'clean',
  objective: 'Disinfect the wound',
  tools: ['gel'],
  spawn: [{ kind: 'gelZone', site: 'arm', rect: [-0.4, -0.2, 0.8, 0.4], parTime: 14 }],
  done: { cleared: ['gelZone'] },
  say: [{ at: 0, who: 'bea', mood: 'stern', text: 'Gel first.' }],
}
```

Every touchable `at: [x, y]` must sit inside the drape ellipse `(x / 1.4)² + (y / 0.85)² ≤ 1`. The tray and the IV are fixed in `src/sim/field.js`. They are not spawn points.

`skipTo(phaseId)` jumps to a phase. The dev menu's operation entries call the same loader.

## Add a strain

1. Spawn it from a phase: `{ kind: 'tremolo', strain: 'tremolo', site: 'arm', at: [0.1, 0.2], hp: 40 }`.
2. Handle that `kind` in `src/sim/strains.js`, inside `stepStrains`. Read `sim.tuning` for hit points, speed, and damage. Do not call `Math.random`.
3. If the player must meet it in the story, add the kind to some operation's `teaches` list. The union of `teaches` has to cover every strain.
4. Give it a mesh in the view if the snapshot already carries the kind and the field still has no body for it. The sim does not import the renderer.

Kinds the step function already branches on: `adagio`, `hole`, `nest`, `note`, `spore`, `scratch`, `tremolo`, `legato`, `crescendo`, `fermata`, `coda`, `bleeder`, `pool`. A new kind falls through until you add the branch.

## Add a story scene

Scenes live in `src/data/story/scenes.js` as `SCENES`. A scene has an id, a chapter, a `where`, a `set`, a `music` id, and `lines`. Each line is `{ who, mood, text }` and may set `shout: true`. One shout per scene.

`who` must be a speaker in `src/data/cast.js`. Wire the scene with `scene.before` or `scene.after` on an operation. `S0` plays only at the start of a new game.

Keep the whole script between 250 and 350 lines. Bea does not say "good" except in `S16`. Barks in `src/data/barks.js` follow the same rule. Do not put the game's title string in a line.

The shell skips a scene on Tab and advances a line on confirm. `openScene(id, onDone)` is the call.

## Add a tuning value

1. Add the key to `TUNING_DEFAULTS` and `TUNING_RANGES` in `src/config/tuning.js`.
2. Put the key on a `TUNING_PAGES` group so the dev menu grows a slider.
3. Read `sim.tuning.<key>` from the sim, the bot, or the shell on the live object. A key that never appears under `src/` fails the suite.
4. Sliders write that same object. `resetTuning` copies the defaults back onto it, so holders of the reference see the reset. Do not replace the object.

Ranges are `[min, max]`. The dev menu derives the step from the span.

Difficulty multipliers live in `DIFFICULTY` in the same file: `drains`, `timers`, `tol`, `miss`, and `hp`. Intern is what the menu calls Easy. The 45 to 75 percent clear check uses `sim.time / op.timer`, the data timer, not the scaled one.
