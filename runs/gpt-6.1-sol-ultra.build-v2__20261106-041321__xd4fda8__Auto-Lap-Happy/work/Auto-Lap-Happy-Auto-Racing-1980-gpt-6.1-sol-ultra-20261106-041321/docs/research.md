# Reference research and provenance

Research performed before implementation, 2026-11-06. The game is an original interpretation; no source map or artwork is embedded in the game.

## Source
- Auto Racing, Mattel Electronics / Intellivision, 1980.
- Original instructions: https://history.blueskyrangers.com/instructions/autoracinginst.html — read source manual. Confirmed five courses in difficulty order, automatic acceleration, side-button braking, checkpoint restarts, five solo laps, pursuit to50:opponent crash2/clear lead1. Car relative ratings55/65/75/90/90, tan and blue identical. Original directional steering versus revised car-relative steering. Grass,skidding,water and scenery affect driving.
- Blue Sky Rangers history: https://history.blueskyrangers.com/mattelelectronics/games/autoracing.html — historical account and corrected steering chronology,connected region/hidden drag strip reference. The original history page and manual are archived locally in docs/manual.html and docs/history.html.
- Inspected the archival gameplay still `AutoScreen.gif` from the history page: a tiny overhead single-seat car,green landscape,wide pale-grey road,angular bends,geometric orange-roof buildings. Inspected contemporary catalogue illustration `AutoCatPic.gif`: red open-wheel racer. These reference images remain in docs only,not in the packaged game. Source-owned reference material is not relicensed.
- Found archival gameplay listings https://www.youtube.com/watch?v=CmvZWlng-no and https://www.youtube.com/watch?v=ffTKTX-9Nrk. Video playback/audio was not inspectable here. Exact source sound/music and detailed original track measurements:unknown. Manual web edition contains no map image; its text and history still informed the game. No video observation is claimed.

## Original design additions
The new five circuits and all road geometry are authored independently. A guided six-stage tour,AI drivers,personal ghosts,hold-to-recover,short preset,route passport,manual throttle,touch assist and network transport are new features. No weapons,powerups,nitro,damage upgrades or currencies.

## Dependencies inspected and pinned
- my-3D2dge full handoff0.89.1,commit8ecc2f62353761187bdfe226f327b7ea5d2eb691: https://github.com/michaelcrosato/my-3d2dge/tree/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff . Read README,complete API card,asset contract,drive module manual and KART kit. Native E.Car,Path,Game,SHAPES,materials/renderer and fixed-step system are used. MIT upstream notices preserved;vendor engine unchanged.
- AI Hub Session Protocolv1 client1.4.0,commit35a1047f2067b2af3de3943f0fe452f39105d869: https://github.com/michaelcrosato/ai-hub/tree/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub . Read README,shared-world arena lifecycle,official harness and session client. Released session.js inlined byte-for-byte except safe closing-script escaping,first script immediately after charset. No custom external transport is constructed in a Hub session.
- WebRTC primary references: https://webrtc.org/getting-started/peer-connections ; https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel ; https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icegatheringstatechange_event . Non-trickle gathered SDP invitation/reply with real data channels. Public cross-NAT/TURN connectivity:unknown.

## Licensing
Upstream engine/header notices retained in full;original game source and procedural assets:MIT. No external runtime bitmap,font,audio or CDN dependency. Vendor package includes optional asset sets but the game uses only native core shapes and original definitions. Historical page/images are research evidence only,attributed to their owners.
