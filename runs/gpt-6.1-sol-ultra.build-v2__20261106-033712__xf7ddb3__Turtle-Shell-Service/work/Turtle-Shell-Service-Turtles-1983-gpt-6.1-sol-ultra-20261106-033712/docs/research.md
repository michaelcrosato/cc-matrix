# Research and interpretation

Primary reference is the 1983 US Odyssey² hotel-rescue release. The year alone does not uniquely identify a port; this interpretation follows PLAN.md. Its arcade ancestor is Konami's 1981 Turtles. This game is original work, not Teenage Mutant Ninja Turtles.

Inspected before implementation:

- [US manual](https://odyssey2.info/library/manuals/us_turtles/Turtles%20%28USA%29.pdf): text and actual rendered pictures on pages 5 and 7 (local research captures). A hatchling rides visibly on the adult, a house appears at the edge, question-mark rooms contain babies or beetles, and a central X replenishes bug bombs. Only one bomb is active. Blue/yellow/red progression communicates increasingly capable pursuit; stun returns beetles to blue. The manual's lives wording conflicts; our rules specify three team lives, with the third hit ending the run.
- [US release entry](https://odyssey2.info/db/game/turtles-47): documented gameplay screenshots downloaded and visually inspected (turt-scr.gif and turt-scr2.gif). Bright green overhead maze, sparse one-cell corridors, cyan punctuation, color-coded simple enemies, distant white home, fixed whole-floor view and bottom score strip. Screenshots show two distinct layouts. We retain the relationships, not copied layouts or sprites. Entry documents hotel intermissions, attract mode, and Voice-module music.
- [Historical review](https://odyssey2.info/reviews/turtles-117): secondary description of four layouts and upward floor progression, and staccato vocal music. Counts are historical context rather than our content quota.

Mechanics: discovery, one passenger, automatic delivery, maturing pursuit, scarce defensive traps and resupply. Levels: connected maze routes and ascent through a hotel. Enemies: wander, straight-corridor sight, around-corner tracking. Visual language: readable punctuation, contrasting safe edge destination, whole maze visible. Sound: manual/entry establish The Voice accessory music; review describes vocal/scat texture. No recording was watched or heard. The new music, gibberish voices, animation, floor designs and miniature hotel art are authored in code. Human listening quality is unknown.

Engine pinned: my-3D2dge v0.89.1, commit 8ecc2f62353761187bdfe226f327b7ea5d2eb691. Hub pinned: client 1.4.0 / Session Protocol 1, commit 35a1047f2067b2af3de3943f0fe452f39105d869. Both matched planning inspection.
