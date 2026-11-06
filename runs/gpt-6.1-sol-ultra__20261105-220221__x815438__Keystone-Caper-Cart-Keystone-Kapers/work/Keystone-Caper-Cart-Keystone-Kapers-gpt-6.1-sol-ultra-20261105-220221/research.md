# Research and design basis

Read before implementation on 2026-11-05:

- Original Activision Keystone Kapers instruction manual (1983), including the designer's strategy notes: https://www.atariage.com/2600/manuals_old/keystone_kapers.html and scanned https://atarionline.org/wp-content/uploads/2021/11/keystone-kapers-1983-activision-atari-2600-instructions-game-manual.pdf
- Original 1983 Activision advertisement: https://www.worldradiohistory.com/Archive-All-Music/Billboard/80s/1983/BB-1983-04-23.pdf
- Atari source imagery and sound descriptions: https://www.atarimania.com/games/atari-400-800-xl-xe-games-keystone-kapers-2777
- Source release/sound comparison: https://www.mobygames.com/game/9475/keystone-kapers/
- Official engine documentation: https://threejs.org/manual/pages/webgpurenderer and https://rapier.rs/docs/user_guides/javascript/rigid_bodies/
- Official AI Hub protocol and unmodified client: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub

The original is a timed cops-and-crook department-store pursuit. Its distinctive decisions are whether to follow the one-way escalators or intercept using the cycling lift, with a security overview to track both characters. Shopping carts and cathedral radios demand jumps; high beach balls and toy biplanes reward ducking. Moneybags and suitcases add score. Later chases speed up and add hazard waves. Its look is spare, colorful side-on floors, miniature policemen and a striped crook, with exaggerated run/jump/duck poses. Source sound descriptions distinguish the sparse Atari 2600 effects from the later Atari computer version's ragtime-like accompaniment; exact original synthesis parameters are unknown.

This game uses original characters Officer Pip and Sid Slip, three authored escalating cases, a fully visible 3D cutaway and an Art Deco ink palette. The finale starts the crook two floors ahead to make lift strategy matter. Original ragtime and synthesized effects/gibberish are newly composed in code. No source graphics or audio are copied.

The title was selected with Python `secrets.randbelow(50)` after generating 50 candidates. `selection.json` records the selected title and index.
