# Testing record

Eleven issue categories were found and fixed through automated execution, visual checks and source review:

1. Unsafe replacement-string expansion in single-file packaging: changed to replacement callbacks. This prevented the initial packaged build from booting; one critical issue.
2. Brief keyboard, mouse, touch and transmitted shoot taps could fall between sampled frames/packets: latched until simulation/transport consumption.
3. Hub lifecycle controls allowed a return to title after end: guarded all menu/input paths, ignored Create+Options, stopped/suspended audio on end.
4. A departing player always enabled team-one AI: now the actual departed seat is used, including dedicated-server seat zero.
5. Guest-to-authority continuation left Rapier bodies stale: synchronized physics positions and velocity with snapshots.
6. A disconnected guest retained team-one HUD state offline: reset team and server flags on leave.
7. Online pause menu navigation could move the skater: neutralized local gameplay input while menus are open.
8. Low-height touch layout clipped title controls and body touch-action prevented menu scrolling: compact landscape title and appropriate canvas/menu gesture policies.
9. A menu cursor position could unintentionally become the first shot's aim: clear mouse aim at gameplay transitions and only activate over the rink.
10. Omitted aim components in direct shoot API calls produced NaN: default both components to zero.

11. The away-team shot guide mirrored its vertical angle and used the wrong local input for guests: one shared 32-angle direction function now drives both previews and actual shots.

The first broad browser run also had two timing-sensitive test assertions under concurrent software rendering. They were changed to wait on simulated game state rather than a fixed wall duration; these were not counted as product defects.

Final one-command suite: `npm test`, 49 checks across 19 Rapier/gameplay tests, 12 assembled-browser tests, 9 transport tests and 9 actual-game network tests. Test scripts print failures and a final count; the aggregate runner suppresses routine library/browser output.

Official Hub scenarios cover ordinary two-player, 150 ms latency/50 ms jitter/5% packet loss, host departure and a dedicated server. Post-end input guards and symmetric loose-puck disconnect recovery are checked. WebGPU backend status, moving game state and absence of page errors are verified; composition is visually inspected in WebGL 2 because this environment can return blank headless WebGPU captures.

Audio is rendered offline and checked for finite, nonzero, unclipped samples at 10% default music volume. Subjective sound quality, physical controller feel, physical mobile/iOS compatibility and external internet NAT success are unknown.
