# Integration decisions and issue ledger

## Architecture

One pure serializable 120 Hz world drives solo, attract, Hub authority and standalone room authority. DOM, native renderer and audio consume events. World snapshots quantize actor state and send complete reliable revisions at 10 Hz; guest actions are short unreliable Hub messages at 12 Hz. Stable sender-to-seat association precedes validated action frames. Gameplay RNG and native cosmetic RNG are separate. No global timescale is used for the time brake.

The FORMATION kit supplied the mechanical starting point: Catmull arrivals, surviving moving formations, limited shots and prediction-based demonstration aiming. The custom simulation replaces the sample's alternating turns and viewport-dependent geometry. Canonical bounds remain 640 × 360 in every browser and shape.

## Focused engine changes

Only `vendor/engine/my-3d2dge.js` is shipped. The agent and module editions are absent from the artifact.

1. `Settings` supports `persist:false`: ignore inherited raw values and exclude these keys from saved settings. Developer tuning is session-only but uses native validated sliders and group reset.
2. `Settings` specs support `hidden:true` in the ordinary Settings list. Explicit native custom-screen rows still display them. This keeps developer mutations out of regular/hosted preference screens while preserving native Dev Mode controls.
3. `Screen.resize` permits a fractional fit below 1 and a largest fit on high-density screens. This prevents cropping on narrow low-density displays and avoids an unnecessarily tiny arena on phones, while preserving canonical bounds.
4. Native slider formatting respects an explicit unit before choosing a percentage format, so rearm times read as seconds and time factors read as multipliers.

Hub session.js remains byte-for-byte upstream.

## Distinct game defects found by verification

| ID | Discovery | Severity | Fix |
| --- | --- | --- | --- |
| 1 | TV title screenshot and action bounds | Usability | Reduced title typography and panel spacing, intentionally scrollable shell panel; every title action fits 1080p. |
| 2 | Browser mouse/native-input test | Input | The first pointer move had no prior anchor and could not acquire targeting. First deliberate observed movement now acquires it; keyboard/stick clears the target, later jitter stays ignored. |
| 3 | Phone contact sheet and narrow-screen geometry check | Game breaking on narrow low-DPR screens | Native scale clamped to at least 1, cropping a small viewport; high-DPR phones also underfilled. Fractional fitting now keeps the entire common-plane arena visible. |
| 4 | Terminal audio lifecycle review and bus checks | Audio / session lifecycle | A later gesture could resume a suspended audio context after end. Terminal master mute persists; input is ignored after termination and a new standalone run deliberately restores the saved preference. |
| 5 | Guest input cadence review and real room brake check | Multiplayer input | A brake edge could fall between 12 Hz sends. Inputs are now collected every fixed step, with the accumulated edge sent at packet cadence. |
| 6 | Developer slider review and units assertions | Usability | Native formatting showed short times as percentages. Explicit units now take precedence. |
| 7 | Six-character picker focus review and controller navigation assertion | Controller usability | Redrawing a changed character moved focus to the first column. The selected column is now retained after click or left/right changes. |
| 8 | Credits/Help content bounds and controller navigation | Controller information access | Long static pages opened scrolled to bottom; the native Help entry could be empty. Information is paginated with compact native navigation; the complete custom flight school is the pause/title entry. |
| 9 | Hosted/local settings review | Multiplayer usability | Local assistance switches were visible during authoritative network play despite not changing the shared rules. Session UI now hides those switches and exposes applicable local presentation settings. |

| 10 | Final score-isolation browser probe and inherited-flags regression | Critical score integrity | Retry compared numeric tuning but not inherited invulnerability, AI, overlays or simulation speed. New solo runs now inspect every effective developer modifier; resetting restores standard eligibility. |

Test-fixture corrections (not counted as game defects): synthetic enemy omitted required route data; a test assumed a floating point timer crosses exactly 2.0000 seconds; native shell has both Back navigation and Back action so test selectors must specify one. Failed dependent tests are not separate defects. Additional fixture corrections: harness `play` is milliseconds, CSS-transformed `innerText` differs from underlying headings, and real CDP touch pointers are required for pointer capture. These are not counted as game defects.
