# Treasure of Tarmin After Dark

Open the single HTML in the parent folder in a current browser with WebGL 2 or WebGPU. All rendering dependencies, content and procedural audio code are embedded. No server or CDN is required for solo play.

The goal is to descend three floors, defeat the Horned Warden, then interact with the treasure. Keep both War and Spirit above zero. Exploration and solo combat wait for your decisions.

WASD steps and strafes; Q/E quarter-turn; F interacts or inspects; Enter/left click/R2 commits a selected combat action. Tab opens the six-slot pack, X swaps hands, M opens the explored map, T previews rest, R previews retreat, Escape pauses. A standard controller has the same actions: left stick, shoulders, Cross, R2, Triangle, Square, touchpad and Options. L captures the mouse for looking; middle-drag also looks. Settings provides rebinding, glyph selection, audio, reduced motion and interface scale. Touch uses invisible thumb regions, context prompts and the same menus.

Choose co-op to exchange WebRTC offer/answer codes between two browsers. Both codes must be exchanged completely. The reliable data connection uses no camera/microphone permissions and no signaling service. Local/direct reachability is supported; restrictive networks can require a TURN relay, which is not provided. AI Hub sessions auto-load, support a server-only authority and finish through the real Session Protocol lifecycle.

Solo saves occur at safe milestones; floor-entry retry restores viable supplies. The pause menu's expedition archive exports/imports an explicit JSON save when storage is unavailable. Developer tools are available from Pause with tuning, jumps, supplies, invulnerability, map/geometry, snapshot export, stepping, and validated map/content import/export. Network sessions expose read-only diagnostics.

Build: `npm run build` (requires installed Bun; no npm dependency install). Verify: `npm run verify` (uses installed Python Playwright and its existing browsers). Tests cover rules, full normal-rules completion, exact final HTML, input/save/audio, actual two-browser WebRTC and the pinned official Hub harness. They print failures and one total count.

Source and versions: docs/research.md. Data and designer commands: docs/content.md. Network authority and connectivity: docs/network.md. Native visuals/audio: docs/presentation.md. Canonical About/report: report.json, copied to ../exit-interview.json by the build. Actual evidence is in evidence/ and tools/network-evidence/.

To build a designer export without changing combat code: `CONTENT_FILE=path/to/export.json npm run build`. The build validates and embeds that content into the same single HTML. The default command uses the canonical authored campaign.
