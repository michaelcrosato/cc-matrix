# Source research

Consulted during this build on 2026-11-06. The game is an original adaptation of **Pick Axe Pete! (1982)** for the Odyssey².

| Primary source | Confirmed facts |
| --- | --- |
| [US manual transcription](https://odyssey2.info/library/manuals/us_pickaxepete/pick-axe-pete.txt), saved as `source-manual.txt` | Three rock-emitting doors; temporary ladders and floor gaps; breakable picks; jumping and ducking; collision-produced tools; fleeting keys; keyless-door jams; pressure rises with gold and eases after a doorway. Relative awards are evade 1, strike 3, pick 5, key 10, door 20. Original multiplayer uses successive turns. |
| [Videogaming Illustrated, October 1982, pp. 27–28](https://www.ataricompendium.com/archives/magazines/vg_ill/videogaming_ill_oct82.pdf#page=1) | Boulders roll and bounce; collision resources favor lower picks and upper keys; ladders retract; mines use seven shafts. Direct URL initially returned 404 through the browser fetch; the indexed PDF subsequently opened and its review text was inspected. |
| [Archived mine screenshot](https://www.odyssey2.info/i/screens/pick-scr.gif), saved as `source-mine.gif` | Inspected locally: black field, red horizontal ledges with gaps, white ladder, contrasting cyan/white/magenta doors, blue rocks and a gold miner with pink pick. |
| [Engine handoff/API card](https://github.com/michaelcrosato/my-3d2dge/tree/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff) | Native code-drawn pixel art, posed 3D humanoids, fixed-tick Platformer/PlatformMap systems, side-view x/z gameplay plane. Vendored documentation is the implementation reference. |
| [AI Hub Session Protocol v1](https://raw.githubusercontent.com/michaelcrosato/ai-hub/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md) | Host-authoritative shared world, zero-based player IDs, hidden nonplayer authority, readiness/countdown/results lifecycle, at most 20 outgoing game messages/s and 16 KB/message. |

## Adaptations and unknowns

Deliberate high/low ricochets, successful-contact tool wear, three health marks, shared-world co-op and rescue, seeded supply guarantees, checkpoint retries and a three-wave extraction are new design choices. New score and voice synthesis do not claim historical accuracy. The source game's exact sound synthesis, music and voice are **unknown** from the inspected material. No original audio is copied.

The dark whole-room composition, opposing resource chases, boulder pressure and doorway relief informed the new mine. Timber, work lights, mineral seams, original miner rigs and animated machinery expand that visual vocabulary using the supplied engine's native procedural style.
