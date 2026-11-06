# Research and pinned inputs

Inspected 2026-11-06. Source: Buzz Bombers (Intellivision, 1983).

- https://history.blueskyrangers.com/instructions/buzzbombers.html — cartridge manual. Verified horizontal/upward controls, 56 pulses, three cans, tier routes, workers reacting to combs, pale fast bees ignoring comb routes, red combs, harvesting, bird irritation, hive bonuses, side/central flowers and safe relocation. This game's encounter counts, timings, call and co-op are original design choices.
- https://history.blueskyrangers.com/mattelelectronics/games/buzzbombers.html — developer-alumni history. Credits Mike Breen, Monique Lujan-Bekerink, Peggi Decarli and Bill Goodrich; notes Flight of the Bumblebee and the erroneous two-player packaging. We compose original code music, and add simultaneous co-op.
- https://history.blueskyrangers.com/mattelelectronics/games/images/buzzbombers/BuzzBomberScreen.gif — saved and visually inspected: clear pale can, amber bees, teal bird and encroaching lower flowers against a dark field. Reference only; no screenshot art is used in the game.

Engine: my-3D2dge 0.89.1, revision 8ecc2f62353761187bdfe226f327b7ea5d2eb691. Read README, API card, asset guide, relevant index entries, FORMATION arcade slice, headless test and relevant Shell/Input/Settings implementation. Vendored full native Canvas engine, MIT license. No duplicate arcade module or external runtime dependencies.

Hub: protocol 1, session client 1.4.0, revision 35a1047f2067b2af3de3943f0fe452f39105d869. Read README, pristine session client, shared-world arena example and official fixtures. Repository has no root LICENSE at that revision (404); preserved original file notices and recorded provenance in vendor/hub/NOTICE.md. The released client is included byte for byte before all other scripts.

Title: 50 riffs brainstormed privately; Node crypto.randomInt selected number 25: Buzz Comb Party. No other developers' directories were inspected.

Unconfirmed: original fixed level count, exact bee populations, trap timing and original projectile cap. They are not claimed as historical facts. Live production Hub, physical controllers and actual iOS hardware are not available here.
