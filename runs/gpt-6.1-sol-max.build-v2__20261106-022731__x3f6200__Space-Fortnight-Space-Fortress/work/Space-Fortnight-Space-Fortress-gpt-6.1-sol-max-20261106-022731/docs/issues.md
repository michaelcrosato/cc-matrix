# Unique issue ledger

14 unique game defects found and fixed, including one critical runtime error. Duplicate failures count once. Test-tool faults and review-only corrections are excluded.

| ID | Severity | Detection | Fix / state |
|---|---|---|---|
| SF-01 | Major | First 1/2-pilot full bot trace missed anchor introduction: scout died before release. | Added an explicit charging anchor to the authored escort encounter. Verified in full 1–4-pilot simulations. |
| SF-02 | Medium | First full-play trace finished in 549 active seconds and screenshot showed long cleared pockets. | Added deliberate reinforcement groups and boss pacing; final successful runs target 10–12 active minutes. |
| SF-03 | Medium | 1920×1080 title screenshot showed native Shell flex alignment placing menu over upper-right art. | Game stylesheet now sets title flex direction explicitly; title-menu bounding-box check covers placement. |
| SF-04 | Major | Full-run checks for boost/pulse-only upgrade choices lost the base during the longer boss fight. | Reduced incidental ground-projectile chip damage; bomber impacts, lane volleys and landed divers remain consequential. All upgrade branches now win without cheats. |
| SF-05 | Minor | Swept-hit and gravity tests could not construct a telegraph-free charged anchor because kind defaults overwrote spawn options. | Anchor/relay defaults now respect explicit scenario options. Swept collision and boost escape checks pass. |
| SF-06 | Minor | Heat-overflow restoration test cooled a boundary value below 100 before resolution. | Cooling is disabled at overflow, preserving the retreat outcome. |
| SF-07 | Major | Real browser's very short right-click landed and released between fixed updates, so held-only action sampling missed pulse. | Intent adapter now combines native pressed and down for fire, boost and pulse. |
| SF-08 | Medium | Phone contact test placed a thumb in the lower letterbox and the adapter discarded it. | Invisible floating controls now accept the entire canvas; right-thumb drags supply a direction, including portrait letterbox space. |
| SF-09 | Critical | Full credits navigation raised an uncaught “Maximum call stack size exceeded” and could not return to the index. | Removed a custom Back callback that recursively called the native Back handler. Native stack navigation now owns the return; root-title cancel is also guarded. |
| SF-10 | Medium | Portrait screenshot made the canvas HUD too small to read even though the full arena fitted. | Added a portrait-only native Shell objective/score/hull HUD in the unused letterbox area and moved compact radio captions clear of it. |
| SF-11 | Medium | Boss screenshot showed the tutorial panel covering the newly docked player. | Moved desktop guidance to a compact side panel clear of the initial wing positions and shortened its display. Portrait uses separate letterbox space. |
| SF-12 | Medium | Results screenshot clipped the second navigation action at the initial scroll position. | Reduced results spacing and put both actions on one row at TV sizes, retaining controller scrolling on smaller screens. |
| SF-13 | Major | Touch attract-exit regression found a generated click could activate a newly revealed title button. | Added a short click-capture quarantine matching the existing input consumption window. Keyboard, pointer, pad and touch exits are checked. |
| SF-14 | Major | Four-pilot upgrade review/regression found the native Shell was still reading pilot 1 for every couch choice. | During each choice the Shell reads that pilot’s native input, then restores primary input. All four controllers select different upgrades in the regression; safe intermissions do not pause on their menu buttons. |

## Implementation review corrections (excluded from defect counts)

- Pointer aim follows the native aim source while movement keys are held.
- Couch joining preserves native half-keyboard maps.
- Complete reliable keyframes recover entities even when newer small updates have arrived; the latest small update is reapplied afterward.
- Boss batteries mark their actual locked impact lane before release. Compact boss clocks/health keep client shutters and weak points current.
- Per-pad meaningful activity resets after release, held meaningful input prevents idle, and menu gestures select the native prompt device.
- Entry placement checks every co-op pilot; fortress anchors remain clear of opaque armor.

## Test-tool corrections (excluded from defect counts)

- Renamed an inspection helper that shadowed Python's inspect module.
- Scoped native action selectors to distinguish the Back icon from the Back action and accounted for a title button's CSS arrow in its accessible name.
- Pad automation waits for actual native poll/release state rather than assuming a browser frame rate.
- Departing Hub iframes are detached by the official harness; checks inspect remaining frames.
- Wrapped a finish-counter installation in an explicit function so Playwright would not invoke the newly assigned callback as its return value.
- Explicit font path is used for ImageMagick filmstrip assembly.
