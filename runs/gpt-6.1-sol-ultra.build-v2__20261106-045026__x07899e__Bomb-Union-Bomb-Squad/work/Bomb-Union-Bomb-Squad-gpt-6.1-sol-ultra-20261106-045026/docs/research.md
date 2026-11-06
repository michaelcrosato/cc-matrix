# Research ledger

Game: Bomb Union. Source inspected 2026-11-06.

## Verified primary-source facts
- [Original manual](https://history.blueskyrangers.com/instructions/bombsquad.html): timed circuit work reveals a hidden one-to-three-digit code. Two cuts, removal, replacement/jumper, and two solder joints form the repair sequence. Each board uses a fixed shape or color replacement rule. Wrong work and fires have recovery windows. Frank instructs; Boris taunts. Evidence includes unlit cells; early submission is deliberate and consequential.
- [Creator-maintained history](https://history.blueskyrangers.com/mattelelectronics/games/bombsquad.html): Intellivision/Intellivoice release, named designers and voice performers. Documents voice-priority and finished-component animation defects; this game keeps urgent instructions above taunts and settled parts stable.
- [Original screenshot](https://history.blueskyrangers.com/mattelelectronics/games/images/bombsquad/BombSquadScreen.gif): inspected downloaded image; green PCB, cyan traces, bright component silhouettes and conspicuous timer.

## Unknowns
An original music score is unconfirmed. Original voice hardware and physical controller/touch/TV playback are not available here. Universal cross-network WebRTC reachability is unknown.

## Original additions
Bomb Union, municipal crew, partner Pip, saboteur Professor Quibble, all dialogue and case landmarks, authored campaign, evidence packs, recovery implementation, cooperative dispatch, procedural score/gibberish voices, native component/tool designs and editor are original.

## Technical sources / actual revisions
- Full my-3D2dge handoff v0.89.1, git 8ecc2f62353761187bdfe226f327b7ea5d2eb691 (current main when fetched; matches PLAN reference). Read README, API, relevant API index, assets card, pointclick and adventure kits; adapt their native Game/Shell scene structure for fixed interaction.
- AI Hub protocol 1 / session client 1.4.0, git 35a1047f2067b2af3de3943f0fe452f39105d869 (matches PLAN reference); official README/client/harness vendored byte-for-byte.
- PeerJS 1.5.5 official guide/FAQ/release and vendored distribution; used only in standalone online flow.

Engine changes are tracked separately in engine-changes.md. The engine and PeerJS carry MIT licenses, retained under vendor and in the final HTML. The Hub client is included unmodified as its official integration protocol prescribes; a separate Hub license is unknown.
