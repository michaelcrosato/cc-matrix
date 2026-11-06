PIT & AWAY: LOST CAVERNS
A little further down.

RELEASE
The named HTML file beside exit-interview.json is the complete shareable game.
Open it directly in a current browser. Internet access is needed for the pinned
Three.js r180 and Rapier 0.19.3 CDN libraries. WebGPU is preferred; Three.js's
WebGL2 backend supplies compatibility where WebGPU is unavailable.

PLAY
Stick or WASD/arrows: move; up/down also climb ladders and swim.
Cross / A / Space: jump. Hold for a longer jump; press again to release a balloon.
Triangle / Y / M: expedition map. Options / Escape: pause.
A mouse clicks menus and can jump by clicking the scenery.
Touch: drag on the left to move, climb or swim; tap the right action to jump,
surface or release a balloon. Touch enables automatic ledge jumping.
Controller glyphs can be changed between PlayStation and Xbox in Settings.

Find Mina in the Echo Galleries, Marmalade beyond the Flooded Archive, and the
Sunstone in the upper vault. Jump the broken ledges; follow the ladders down;
swim past eels; catch the balloon at the bottom and steer up to the vault.
All five animal hazards can be avoided. There is no combat, oxygen timer or
limited life count. Hazards return you to camp and deduct points; collected
items stay collected. Gold is optional. Bring all three objectives to the exit.

After ten idle seconds on the title, an autonomous cinematic replay demonstrates
the entire route. Any input returns to the title. It loops and cannot win or die.

DEVELOPER KIT
Pause -> Developer kit. Live sliders control running, jump strength, gravity,
swimming, balloon lift, wildlife speed and the checkpoint penalty. It also offers
invulnerability, free flight, collider visualization, camp warps, restart and a
full balance reset. About & credits contains source and all exit-interview data.

CO-OP
AI Hub: embeds the unmodified session client1.4.0 and follows protocolv1 in
shared-world mode,1-2 players, team score, synchronized starts and time-up/end.
The host simulates each explorer with an independent Rapier character controller.
A playerless host supports both remote seats without a hidden server avatar.

Standalone: Play Together -> Host/Join in this browser connects two tabs on the
same origin through BroadcastChannel. Host may begin before the companion joins.
For two devices, choose Connect another device, Create invitation, then exchange
the invitation/reply text. The host accepts the reply. WebRTC transports the game
state directly; STUN discovers addresses. A relay server is not supplied, so some
restrictive network/NAT combinations cannot establish a direct connection.
Returning to the title leaves the standalone connection.

DEVELOPMENT
npm install
npm run build
npm test --silent

The test command starts its own127.0.0.1 server on an OS-assigned port, verifies
that the page is this game, and shuts down its own server/browser. It prints only
failures and one aggregate check count. Python Playwright1.63 uses the preinstalled
pipx interpreter configured in package.json. No browser download is performed.
Final validation:122/122 checks passed.
Tests include the full scripted route (invulnerable for route coverage), separate
real hazard/checkpoint tests, keyboard, a standard-mapped virtual controller,
Chromium touch events, live tools, the attract loop, actual two-page co-op and
WebRTC, offline audio rendering, and the unmodified official Hub harness under
latency/jitter/packet loss, host departure and playerless hosting.
Visual captures use the compatibility backend because headless WebGPU screenshots
can be blank. Default-backend tests verify that WebGPU is actually active.

No physical controller, real phone/tablet or human listening session was available.
Cross-device Internet/NAT behavior on hardware is unknown. Full exit-interview
answers, source references and metadata are in the root JSON and in-game credits.

SOURCE RESEARCH
https://atariage.com/manual_html_page.php?SoftwareLabelID=359
https://atariage.com/screenshot_page.php?SoftwareLabelID=359
https://atarionline.org/atari-2600/pitfall-ii-lost-caverns
https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub
https://rapier.rs/docs/user_guides/javascript/character_controller/
