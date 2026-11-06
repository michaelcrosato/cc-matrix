# Research inspected

Research date: 2026-11-06. No gameplay video was watched. All identity-bearing game assets and dialogue are original code.

## Source

- [North American instruction manual](https://odyssey2.info/library/manuals/us_timelord/Attack%20of%20the%20Timelord%20(USA).pdf), 12-page PDF, inspected through web extraction. Horizontal time machine, unlimited laser supply, fleet-clear advancement, cumulative four-weapon introductions, 256 advertised levels, single-hit restart, optional Voice taunts, six-letter high-score name. Scoring: missile 2, antimatter mine 4, ship 5, Annihilator 8, Time Killer 16.
- [William Cassidy review](https://odyssey2.info/reviews/attack-of-the-timelord-6), inspected as text. Serpentine fleets, rotating multicolor rift, one fast player shot, white arrows, seeking red spheres, green X weapons that land and roll, unshootable grounded weapons, predictive diamonds and synthesized menace.
- [Gameplay still](https://odyssey2.info/i/screens/time-scr.gif), downloaded and visually inspected. Sparse black arena, blue saucers, magenta/gold score frame, green ground cannon and distinct bright weapons. Saved here as `source-screen.gif` for research only, not bundled.
- [Box illustration](https://odyssey2.info/i/boxes/us_attack-of-the-timelord-f.webp), downloaded and visually inspected. Winding blue saucers around a hostile wireframe face, opposing bright weapon geometry and deep cosmic ground. Saved as `source-box.webp`, not bundled.

Unknown: original precise steering equations, exact timings, continuous musical score, subjective original sound heard firsthand. Review descriptions are secondary observations, not measured original behavior.

## Adaptation decisions

Three integrity pips, recovery after fleet clears, eight authored waves, the three-phase mask confrontation, time brake, simultaneous co-op, assists and original filtered syllable voice are new. This is based on the Odyssey² source, with no Doctor Who content. Native pixel shapes and palettes evoke its visual relationships without copying the original assets or dialogue.

## Engine and protocol

- my-3D2dge handoff v0.89.1, verified GitHub tree at commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Read README and API card; searched API index; read asset card and FORMATION slice of `kits/arcade.js`. Adapted path-based arrivals, limited shots and predictive demo aiming; removed the unrelated cabinet launcher. Used full dependency-free engine, not the separate agent or module editions.
- AI Hub protocol v1 / client 1.4.0, GitHub main resolved to `35a1047f2067b2af3de3943f0fe452f39105d869`. Read README, session.js, arena example and harness. Vendored session client unchanged; harness bridge/round support uses this revision too.
- [PeerJS getting started](https://peerjs.com/client/getting-started), [PeerServer Cloud](https://peerjs.com/server/cloud), [FAQ](https://peerjs.com/client/faq), inspected through web. Client version queried from npm: 1.5.5, pinned and bundled from unpkg. Default public PeerServer signaling, with browser data links and accurate timeout/error routes. FAQ documents symmetric-NAT limits and TURN requirements. No universal reachability claim.

## Dependency licenses

Engine: MIT (included upstream LICENSE and source header). PeerJS: MIT (included vendor license). AI Hub: no root LICENSE found at the inspected revision, so repository license is **unknown**; required unmodified session client is credited.
