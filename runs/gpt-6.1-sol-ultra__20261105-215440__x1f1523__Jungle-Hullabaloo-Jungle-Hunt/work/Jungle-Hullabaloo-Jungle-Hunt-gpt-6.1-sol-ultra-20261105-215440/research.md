# Jungle Hunt research and design

Research completed before gameplay implementation, 2026-11-05.

- Atari instruction manual, original publisher text preserved by AtariAge: https://www.atariage.com/2600/manuals_old/jungle_hunt.html . Four trials; differently timed swinging ropes/vines; automatic grabbing; river steering, limited air and surface refill; knife ineffective against open crocodile jaws; two boulder sizes with jump/run/duck timing; final timed jump rescue; score, lives, timer, harder repeat. The prompt identifies 1983, interpreted as the home-version release year rather than the 1982 arcade original.
- Original Atari manual PDF: https://atarionline.org/wp-content/uploads/2021/11/jungle-hunt-1982-atari-2600-instructions-manual.pdf . Reviewed source presentation and scoring/control descriptions.
- Arcade History release notes and screenshots: https://www.arcade-history.com/?id=1242&n=jungle-hunt&page=detail . Safari explorer with pith helmet, ropes, and musical fanfares in place of Jungle King's yell. Exact source audio recordings were not listened to; differences across 1983 ports remain unknown.
- Video Game Music Preservation Foundation: https://www.vgmpf.com/Wiki/index.php?title=Jungle_Hunt_%28A26%29 . Research reference only; incomplete recording and uncertain composer attribution are not reproduced as confirmed credits.
- AI Hub live README, session1.4.0, retrofit, bridge, round and harness: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub . Shared-world host authoritative transport; lifecycle, dedicated server, start/end boundaries, and scoring.
- Pinned installed Three.js0.180.0 sources and official animation/WebGPU docs: https://threejs.org/docs/ and https://threejs.org/manual/en/webgpurenderer.html . Verified r180 MeshToonMaterial maps to MeshToonNodeMaterial in StandardNodeLibrary.
- Installed Rapier0.19.3 type definitions/source and official guide: https://rapier.rs/docs/user_guides/javascript/rigid_bodies/ . Guide currently describes0.21; installed0.19.3 APIs were verified by executing model tests.

## Original interpretation

Jungle Hullabaloo is a side-scrolling2.5D action platformer. Explorer and companion rescue Pip, an exceptionally noisy toucan, from an abandoned clockwork trapping camp. It retains the source's four-mechanic arcade structure and brisk expedition/teatime humor, with an original cast, models, environments, music and voices. New brass-bell objectives make the final rescue interactive. Golden seed pods, shared-life cooperative play, forgiving vine transfers, native mixer animations, contextual touch controls, attract play and live tuning complete the vertical slice.

Title chosen with Python secrets.randbelow(50); all50 candidates and the actual draw are preserved in title-selection.json.
