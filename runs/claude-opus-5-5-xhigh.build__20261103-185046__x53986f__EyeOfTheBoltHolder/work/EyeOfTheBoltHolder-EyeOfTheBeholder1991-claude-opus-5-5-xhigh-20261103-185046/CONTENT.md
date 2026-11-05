# Content formats (for designers)

Everything a floor is lives in `src/15-data-floors.js` as data; the game reads it, the tests lint it, the bot walks it.

## A floor

```js
B.FLOORS.f1 = {
  name, card,               // the floor's name and its one line on the floor card
  song, step, over,         // its song (B.SONGS), footstep sound family, the game-over line
  look: { ground: [base, dark, light], groundStyle: 'tiles' | 'plain' (flagstone by default), water, runes, side, color,
          fog: [color, near, far], ambient: [sky, ground, power], torch },
  map: ['#####', ...],      // one character a cell (below)
  start: [x, y, dir],       // dir 0 N, 1 E, 2 S, 3 W
  water: [[x0, y0, x1, y1]],// cells with a water channel painted on the floor
  doors: { id: [x, y, { lock: itemId, lk: 'simple' | 'warded', secret, undergate }] },
  plates: { id: [x, y, 'hold' | 'latch' | 'toggle'] }, traps: { id: [x, y] },
  pits: { id: [x, y, { trapdoor }] }, fall: { to, at: [x, y, dir] },
  tps: { id: [x, y, { to: [x, y, dir], silent, loops: [[n, textId or barkId]] }] },
  feats: [[id, kind, x, y, face, { text, holds: [itemIds], accepts, look }]],
  wires: [{ when, mode: 'hold', do: [actions], fail: [actions], once, failAfter }],
  items: [[x, y, itemId, n]], mons: [[x, y, type, n, { asleep, patrol: [[x, y]], id, sight, half, death, group, fixed }]],
  npcs: [[id, x, y, dir, { ghost, hidden }]],
  stairs: { 'x,y': { to, at } | { sealed: textId } | { finish: true } | { to, at, ladder: true } },
  safe: [[x0, y0, x1, y1]], wander: { budget, groups: [[type, n]], at: [[x, y]] },
  hints: [{ cells: [[x, y]], after: seconds, text, done: { plateDown | open | flag } }],
  waypoints: [[name, x, y, dir]], areas: { name: [x0, y0, x1, y1] }, walk: [bot steps]
};
```

**Map characters:** `#` wall, `.` floor, `@` start, `<` `>` stairs, `+` door, `=` gate, `L` `K` locked door, `M` magic
seal, `H` secret wall, `I` illusory wall, `P` plate, `T` dart trap, `O` pit, `o` trapdoor, `^` teleporter, `S` spinner,
`U` the Undergate, `*` a pit's landing, `B` the boss.

**Wall features** stand on the open cell `(x, y)` and face the wall at `face` (N, E, S, W). Kinds: `lever`, `button`,
`catch` (look `stone` or `rivet`), `alcove`, `shrine`, `gearNiche`, `clockFace`, `plaque` (text), `candle`,
`greatLock`, `raiseShrine`, `undergate`, `torch` (a brazier niche), and decor: `grate`, `pipe`, `chain`, `gearWall`,
`eyeRelief`.

## The wiring language

Triggers (`when`): `{ lever }`, `{ button }`, `{ buttons: [ids] }` (all within the Button window), `{ catch }`,
`{ plate }`, `{ plates: [ids] }` (all down), `{ alcove, item | kind }`, `{ alcovesFull: [ids] }`, `{ killed: [ids] }`,
`{ flag }`, `{ sequence: [feature ids] }` (in order; a wrong one runs `fail`), `{ levers: { id: on } }` (a combination;
a wrong set after all have moved runs `fail`), `{ enter: [x, y] }`, `{ enterArea: [x0, y0, x1, y1] }`.
`mode: 'hold'` runs `do` while the trigger holds and its inverse when it lets go.

Actions (`do`, `fail`): `['open' | 'close' | 'toggle', doorId]`, `['bridge', pitId]`, `['pitOpen', pitId]`,
`['teleporter', id, on]`, `['msg', textId]`, `['hint', textId]`, `['story', nodeId]`, `['bark', barkId]`,
`['give', itemId, [x, y] | featureId]`, `['spawn', type, [x, y], n]`, `['xp', n]`, `['flag', name, value]`,
`['quest', id, state]`, `['special', id]` (a hidden deed), `['secret', id]`, `['sfx', name]`, `['music', id]`,
`['shake', n]`, `['return']` (an alcove gives its item back), `['take']` (an alcove keeps it), `['candlesOut']`,
`['clock', id]`, `['checkpoint', id]` (the Rat Run), `['join', npc]`, `['npcGive', npc, itemId]`, `['npcLeave', npc]`.

## Text and talk (`src/14-data-text.js`)

`B.TXT` holds every string (messages, examine lines, inscriptions in capitals, notes, hints with `[act:name]` badges that
become the player's own buttons). `B.STORY` holds conversations: steps `[who, text]`, `{ choices: [[label, node]] }`,
`{ do: [actions] }`, `{ goto: node, if: 'full' | flag }`. `B.BARKS` are lines that do not stop play.

## Items, monsters, spells, classes

`src/10-data-items.js`, `11-data-monsters.js`, `12-data-spells.js`, `13-data-classes.js`: one entry each, plain data (see
each file's header). An item's `icon` names a 12 x 12 pixel template in `61-ui-kit.js`; its `model` a pen model in
`41-view-things.js`; a monster's look is in `42-view-creatures.js`.

## The bot's steps (`walk`)

`['go', x, y]`, `['use', x, y, face]`, `['take', x, y, item, face?]`, `['takeAll', area]`, `['clear', area]`,
`['put' | 'throw' | 'place', x, y, face, item]`, `['equip', item, slot]`, `['choose', i]`, `['answerAll']`, `['wait', s]`,
`['read', item]`, `['cast', spell, target]`, `['rest']`, `['restIfLow']`, `['scribeAll']`, `['fill', [features]]`,
`['insert', x, y, face, item]`, `['unlatch', x, y, face]`, and the specials `buttons`, `gauntlet`, `candles`, `veil`,
`reliquary`, `boss`.
