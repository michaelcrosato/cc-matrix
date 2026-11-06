# Add an encounter with data

SF.ENCOUNTERS contains ordinary records with act (0–2), name, goal, duration in seconds, and groups of [time,enemy,count,edge]. Edge is top/left/right. Each enemy type has centralized hull/radius/score metadata. Authored scheduling supplies deterministic positions and safe entry telegraphs, then expires late enemies and bounds completion. Act wave counts and the dev preview derive from data.

For example, append this record before creating a run:

```js
SF.ENCOUNTERS.push({
  act: 0,
  name: 'RECOVERY POCKET',
  goal: 'Clear the interceptor lane.',
  duration: 20,
  groups: [[1, 'hunter', 2, 'left'], [10, 'scout', 1, 'top']]
});
```

It appears as a fourth perimeter encounter in the dev preview and must finish before retreat. Collision, renderer and networking need no change. SF.validate() checks act, timing, definitions, count and entry edge. The simulation suite adds a short temporary encounter, plays its scheduler/combat path, verifies the retreat and removes the data afterward.
