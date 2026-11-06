# Research and provenance

Inspected 2026-11-06. Source: **Advanced Dungeons & Dragons: Treasure of Tarmin (1983)**.

- [Scanned Mattel manual](https://mocagh.org/intvaction/addtot-manual.pdf): downloaded and extracted all 17 pages to manual-text.txt; read controls, opening equipment, dual score channels, pack/hand layout, rest, doors/ladders/gates, weapons, armor/rings, books, monsters, and actual treasure-claim ending. Visually inspected the two-page screen/control spread (PDF page3); maps and original geometric first-person drawing appear in it. The scan is research material, not a shipped game asset.
- [Official manual transcript](https://history.blueskyrangers.com/instructions/addtarmininst.html): cross-check of controls, six pack positions, clicks for counting supplies, one-way traversal, War/Spiritual distinctions, enemy classes and objective. Original short instruction style informed terse new prose. This game uses original authored maps, names, balance and cooperative rules rather than claiming numerical fidelity.
- [Publisher history](https://history.blueskyrangers.com/mattelelectronics/games/addtarmin.html): confirms Mattel cartridge5300, release1983, APh production, programmerTomLoughry and original package illustratorJerrolRichardson.
- [Actual gameplay recording](https://www.youtube.com/watch?v=ZqhCM5Ntllo): retrieved 00:40–01:20 with yt-dlp, inspected decoded stills at00:43,00:58,01:12. Observed flat rectilinear first-person corridor framing, colored rooms, distinct silhouette in front, separate held-object icons and dual numbers. This was a 40-second excerpt, not a claim to reviewing the entire 32-minute recording. Exact original timbres and music remain **unknown**; no human listening was available. The manual documents counting clicks and suction/other magical traversal sounds. All shipped music, effects and gibberish are original synthesized code.

## Shipped foundation

| Component | Pin | Source / license |
| --- | --- | --- |
| my-3D2dge handoff / World3D | v0.89.1;8ecc2f62353761187bdfe226f327b7ea5d2eb691 | [engine repository](https://github.com/michaelcrosato/my-3d2dge/tree/8ecc2f62353761187bdfe226f327b7ea5d2eb691),MIT |
| three.js |0.182.0|[three.js](https://github.com/mrdoob/three.js/tree/r182),MIT|
| Rapier SIMD compat |0.19.3|[Dimforge](https://github.com/dimforge/rapier.js),Apache-2.0; embedded WASM|
| AIHub Session Protocol |v1,client1.4.0;35a1047f2067b2af3de3943f0fe452f39105d869|[Hub contracts](https://github.com/michaelcrosato/ai-hub/tree/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub); session.js copied unmodified|

Read pinned handoff README/API/ASSETS, World3D header/lifecycle/implementation, crawler shell, native rigs/moves/overlay and native E.Shell/settings/rebinding contracts. Read Hub README/session/bridge/round/arena/harness. Grid cell32,eye25,axes x-east/y-south/z-up,16units/metre, interpolated navigation follow the crawler foundation. Rendering and native animation are actual engine calls; deterministic game rules own collisions, damage and turns. Native core/add-on files are unmodified; game extensions register shapes, things, rig poses and instruments.

The title was selected with Python secrets.choice from exactly50 original riffs. Selected title: **Advanced Dungeons and Danger**. No runtime external art, fonts, models, audio, CDN modules, JSON or WASM files are needed; all dependencies are embedded in the delivered HTML. Research files and developer source are not runtime dependencies.
