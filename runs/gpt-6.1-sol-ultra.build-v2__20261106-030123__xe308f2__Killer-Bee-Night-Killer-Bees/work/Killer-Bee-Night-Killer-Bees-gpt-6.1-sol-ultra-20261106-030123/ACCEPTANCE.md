# Final acceptance ledger

Final build passed **338/338** checks with `npm test`. `evidence/test-results.json` is the aggregate report; `evidence/issues.json` records the eight executed-check/visual issues and separates other review improvements.

| Requirement | Implementation | Proof |
| --- | --- | --- |
| One random choice from fifty playful titles; exact TASK names | `selection.json`, `tools/build.mjs` | Package checks; root HTML and development export identical |
| Required engine foundation and native style | Full pristine engine; `src/render.js`, `src/main.js`, `src/audio.js` | Native E.Game, overhead renderer, custom E.Blob rigs, native Menu/Shell, input, settings, sequencer/buses; native headless campaign |
| Source research and honest uncertainty | `research.md` | Manual and two creator interviews read; recordings unviewed and unheard |
| Twelve bees, Roam/Focus, sustained sting/recovery | `src/sim.js`, native rigs | Simulation invariants and actual complete campaign; input/browser tests |
| Individual losses, grace, scouts/guards/hunters | `src/sim.js`, effects/audio | Cadence/maturation checks, normal campaigns, inspected visuals |
| One horizontal ray, legitimate recharge, contributor ownership | `src/sim.js` | Eligibility, simultaneous events, nonstacking and score deduplication checks |
| Persistent visible husks and safe topology | `src/sim.js`, circle rendering | Whole-campaign samples: zero solid overlaps or disappearing husks; content validators |
| Six encounters, three gardens, concluding gardener | `content/stages.js`, Bellkeeper rig | Solo and co-op ordinary-command completion; boss core and push events exercised |
| Ending, replay, checkpoints, clean/assisted scores | `src/main.js`, simulation | Win/fail/retry tests, browser menu checks, separate persistent keys |
| Couch co-op | Native player inputs with explicit half keys | Two-pad and two-keyboard checks, held-ray regression, overlap safety |
| Actual standalone direct peer | `src/net.js`, focused code exchange modal | Two real browser contexts; steering, Focus, ray, snapshots, final ACK, malformed codes, retry, disconnect, title cleanup |
| Hub shared world and no-seat dedicated server | Pristine SDK, `src/net.js`, dedicated stepper | Official real harness, ready/start clock, server/leave/time-up/end, once-only tied results |
| Network budgets, loss recovery, final state | Compact independent snapshots, validation/counters, ACK fallback | 150 ms ± 50 ms / 5% loss; traffic/size checks; reliable worst-content snapshot; both players won with same earned score |
| Controller-first screens, rebinding and glyphs | Native Menu/Shell/settings, modal focus adapter | 157 browser checks across Chromium/WebKit/Firefox; controller stubs, storage and settings |
| Touch and fixed arena fitting | Invisible native stick, independent Focus zone/ray button, explicit native zoom fit | Multi-pointer move/Focus/ray/cancellation; all four arena corners visible in five aspect ratios |
| Ten-second isolated attract and all-input exit | Separate real simulation, ordinary-command bot, staged demos | Threshold, feature coverage, keyboard/mouse/pad/touch exit, storage/run isolation |
| Useful developer tools and resettable live tuning | Native rows/sliders; seed, stage, state and collision tools | Browser slider/reset, exact step, export and stage checks; Hub modification restricted |
| Code-only music, effects and gibberish | `src/audio.js`, native buses | Offline Chromium/WebKit output finite, nonzero, decaying; default music 0.1; muted/headless checks |
| Comfort and composition | Custom restrained ray effects, motion reduction, native comfort settings | Native/real browser drawing without errors, inspected title/co-op/finale/phone/credits screenshots |
| Single playable HTML, no missing assets, notices | `tools/build.mjs` | Direct file launch in three engines; same bytes served in harness; SDK byte identity, script parsing and MIT notice checks |
| Interview, credits and catalogue consistent | Root `exit-interview.json`, `src/credits.js` | Exact schema and feedback lengths validated; all in-game source/feedback fields match |

Physical controllers, real iOS and TV hardware, subjective listening and arbitrary internet/NAT connectivity remain unverified. Stand-ins and objective checks were used as prescribed. No subjective listening or performance measurement is claimed.
