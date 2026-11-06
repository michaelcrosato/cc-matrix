# Source and contracts

Inspected 2026-11-06. Source: **Bomb Squad (1982, Intellivision)**.

- [Original instruction manual](https://history.blueskyrangers.com/instructions/bombsquad.html): timed circuit repair reveals lit or dark cells in one to three code digits; cut both terminals, lift, place jumper/replacement, solder both; consistent shape/color replacement rule; Frank instructs and Boris taunts; skills change hazards; deliberate second confirmation for guessing. The single-player source supports risky guessing after two repaired circuits.
- [Creator-maintained history](https://history.blueskyrangers.com/mattelelectronics/games/bombsquad.html): credits, Intellivoice use, working titles and source-era bugs, including interrupted urgent speech. Credits list Gene Smth (page spelling; commonly Smith), Shatao Lin, Kai Tran, Russ Lieblich, Phil Proctor and Peter Bergman.
- [Original circuit screenshot](https://history.blueskyrangers.com/mattelelectronics/games/images/bombsquad/BombSquadScreen.gif): downloaded and visually inspected; green field, cyan traces, colorful distinct parts, tray and prominent timer. Reference retained in evidence; no original imagery is shipped in the game.

Unknown: a distinct original music score is unconfirmed. Do not infer one from sound credits. The source has no documented cooperative campaign.

Original additions: Brasswater, Nell, Vex, the municipal crew, three-case campaign, 4×5 glyph data, evidence packs, cooperative claims and voting, persistent fires, recoverable wrong parts, original synthesized music and gibberish voices, native artwork, authoring tools.

## Technical foundation

- Full my-3D2dge **0.89.1**, upstream `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Current main equals the plan's inspected revision. Read README → API card → pointclick/adventure kits → relevant index → ASSETS; adapted the pointclick kit's scene/shell structure. Full native renderer, shapes, materials, Humanoid, tweens, particles, procedural synth, settings, Arcade idle watcher and fixed-step headless facilities.
- Hub protocol **1**, official client **1.4.0**, upstream `35a1047f2067b2af3de3943f0fe452f39105d869`. Current main equals the plan reference. Official client is unmodified and first script after charset. Read protocol, client, harness, bridge and round lifecycle.
- [PeerJS official getting started](https://peerjs.com/docs/#start) and pinned **1.5.5** client: secure cloud signaling + WebRTC data; host is authoritative. Cloud connectivity may require TURN on restrictive networks. No TURN credentials are invented.

Engine change: E.Shell.show now retains the focused widget when the same screen refreshes. See docs/engine-changes.md and its focused patch. Original assets and mechanics use documented registries and native APIs.

## State contract

Semantic commands contain action ID, case ID, board ID, expected board revision and operation; actor identity comes from the transport. Only authority advances repair truth and time. Focus/camera are local. Clues are immutable. Snapshots exclude the secret code and unrevealed rewards. Reliable board chunks stay below Hub's 16 KB packet limit, coalesced at 8 packets/second plus discrete acknowledgments. Solo pause freezes; online local menus keep simulation running from elapsed monotonic authority time. Outcomes resolve once.
