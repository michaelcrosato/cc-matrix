# Cricket Kerfuffle: design notes (how to add content)

Everything is data keyed by id; systems look things up and never need editing for new content.

- **A team**: add an entry to `TEAMS` in `src/10-data.js` (code, kit colours, a name pool, 3-5 stars with `bat pow tech
  fld ctc`, `bowl: { del: [3 delivery ids], skill }`, `sp` batting special, `bsp` bowling special, `voice`, `look` rig
  options). `squad()` fills it to eleven from the pool. Add its portrait voice to `VOICES` if it speaks in the story.
- **A ground**: add a `GROUNDS` entry (boundary `rx ry`, pitch factors, outfield decay, palette, sky, `targets` with
  position, radius, bonus and commentary line, a `chaos` pool), then its buildings in `groundRecipe()` and its props in
  `groundProps()` (`src/30-art.js`). The panorama (`panoramaFor`) paints itself from the palette and `surround`.
- **A delivery**: add to `DELIVERIES` (family, km/h range, swing, seam, turn, bounce, length band). Give it to a bowler's
  `bowl.del`. The CPU aims inside its swing and turn by itself.
- **A shot**: add a row to `SHOTS` (button, lengths, sector, animation family, `at` contact time, launch, speed, zone).
  The resolver picks it; the animation family's keyframes live in `BAT_KEYS` (`src/31-cast.js`).
- **A special**: add to `SPECIALS`, then its effect in `_release` (bowling) or `_contact` (batting) in `src/22-play.js`.
- **A chaos event**: add to `CHAOS` and to a ground's pool; give it a start in `triggerChaos`, any per-step behaviour in
  `chaosStep`/`chaosBall`, and an end in `endChaos` (`src/25-chaos.js`).
- **A story chapter**: add to `CHAPTERS` (`src/11-data-story.js`): opponent, ground, overs, an optional `scenario`
  (start in the second innings), `pre`/`mid`/`win` lines as `[speaker, text]` (`'*'` is a caption), and three goals as
  `[label, match => bool]`. Add a pin to `MAP_PINS`.
- **A commentary line**: add `[speaker, text]` to a pool in `LINES`; templates `{batter} {bowler} {team} {ground} ...`.
- **A lesson**: add to `LESSONS` (`src/51-match-scene.js`): the role, a goal count, the bus events to listen to and a
  check, two lines of Mrs Crumb's instructions.
- **An attract segment**: add to `SEGMENTS` (`src/52-attract.js`): ground, teams, a chaos event, and balls as forced
  outcomes (`six four one dot edge bowled caught lbw runout stumped`, plus `target`, `th`, `special`, `bat`).
- **Tuning**: every live variable is in `TUNE_DEFS` (`src/00-core.js`) and shows as a dev-mode slider at once.

Build: `node tools/build.mjs`. Test: `node test/run.mjs [suite ...]`. Balance report: `node test/balance.mjs`.
