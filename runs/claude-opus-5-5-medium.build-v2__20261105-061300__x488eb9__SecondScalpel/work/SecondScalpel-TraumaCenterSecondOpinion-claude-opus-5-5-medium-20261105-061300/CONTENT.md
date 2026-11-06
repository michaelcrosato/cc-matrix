# Adding content

Everything is data; the workshop is dev mode (pause, Dev Mode: Jump, Tuning) and the Skills Lab.

- **A case:** `G.defCase({...})` in `src/data/cases/`: id, number, title, doc ('vale', 'soko' or 'both'), site, seed, clock, vitals, drain, patient, complaint, opinion, story ({ before, after }), optional lightbox, and `phases`. A phase is `{ obj, bark, spawn: [{ t: 'shard', x, y, ... }], when, enter, step, leave, script: [{ t, do }], tut, tip, clockAdd }`. `when` is 'clear' (no required objects left), 'flag:name', 'done' (a script sets `S.ph.d.done`), 't:seconds' or 'never'. Add the case to `G.FLOW` in `src/data/story/flow.js` (automatic for numbered c1 to c11 style ids) and run `node tools/balance.mjs --par` to set its par.
- **An object or strain:** `G.defObject(type, { init, step, want, aim, verb, drain, grip, held, release, slash, slashable, dosed, burned, salved, linked, marked, caught, bot })` in `src/core/`, all state in the plain object, then its look in `src/art/objects.js` (`D(type, fn)` overlay, `ST(type, fn)` tissue stamp). A hidden object sets `hidden: true`; `req: false` keeps it from blocking 'clear'.
- **A site:** `G.defSite(id, (W, H, seed, opt) => field)` in `src/art/sites.js`, on the tissue painter. Add materials to `MAT_KEYS` in `src/art/tissue.js`.
- **A character:** an entry in `CAST` in `src/art/bust.js` (a bust from data), optionally a voice in `src/audio/babble.js` and a body in `src/art/rigs.js`.
- **A story node:** a template string in `src/data/story/`, one line each: `who expr: text`, `@stage id`, `@card A|B`, `@cine id`, `? choice => Quill's answer | choice => answer`.
- **Check:** `node tests/run.mjs --fast` validates every id, line length and reachable node. `node tests/run.mjs` adds the browsers and the Hub harness.
