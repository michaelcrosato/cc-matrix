# Content formats

**Floors** (`src/11-data-floors.js`): `B.buildFloor({ w, h, rooms: [[x0,y0,x1,y1]...], set: { 'x,y': ch } ... })`. Cells: `#` wall, `.` floor, `+` door, `=` gate (named in `gates`), `L` locked door (`locks`), `M` magic seal, `H` secret wall, `I` illusory wall, `P` plate (`plates`), `T` dart trap, `O` pit (`pits`), `^` teleporter (`tele`), `S` spinner, `<` `>` stairs (`stairs`).
**Wall features** are `{ at: [x, y, 'N'|'E'|'S'|'W'], k, id }` addressed by the open cell you stand in and the way you face: `lever`, `button`, `catch`, `alcove` (`holds`, `accepts`), `plaque` (`text` = id in `B.NOTES`), `candle`, `clock`, `undergate`, `greatLock`, `shrine`, `torch`.
**Wires**: `{ when: 'lever:id:on' | 'plate:id:down' | 'catch:id' | 'alcove:id:in' | 'clock:whole' | 'seq:name:ok' | 'ug:open' | 'enter:x,y', do: [['gate', id, 'open'], ['secret', 'x,y'], ['special', 'd1'], ['msg', text], ['tele', id, 'off'], ['hurt', n], ['reset', seq]] }`.
**Items / monsters / spells / classes**: `src/10-data-rules.js`. **Text**: `src/12-data-text.js`. **Tuning**: `B.TUNE` in `src/00-core.js` (the Dev Mode sliders). `node tests/lint.mjs` checks every map and id.
