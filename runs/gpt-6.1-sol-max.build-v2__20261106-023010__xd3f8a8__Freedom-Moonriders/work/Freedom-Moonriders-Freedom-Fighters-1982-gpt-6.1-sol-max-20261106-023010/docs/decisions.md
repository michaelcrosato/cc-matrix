# Simulation contracts

- Fixed 1/120 second updates through E.Game. The side-on art uses the overhead x/y plane, z=0; HUD and cursor use the same projection.
- Valid rescue contact resolves before projectiles and hostile contacts. Rescued crystals leave collision participation immediately. Stable slot IDs award at most once, even if a presentation event repeats.
- Hull depletion takes precedence over carrier-core death on the same tick. Extraction victory is terminal and ignores subsequent presentation effects.
- A burst commits its normalized vector at windup, sweeps contacts and gives no immunity. Held triggers do not rearm; release is required. Neutral direction falls back to the last aim.
- Sector transitions clear all local entities, bullets, pending warp, chain, temporary statuses and local timers; preserve score, rescue/loss ledgers, elapsed operation time and rank penalties. Sector entry restores three hull and 100 energy.
- Retry reconstructs the authored sector from the checkpoint seed and score/ledger baseline. Each replacement lost rescue slot creates a normal-value reachable captive, with one explicit rank penalty per replacement deployment. Credited slots cannot award again. There are finitely many scoring slots.
- A debug edit permanently marks that run as modified. Debug and attract runs cannot overwrite checkpoints or records. Attract is a separate Simulation.
- Hub authority owns all rules; inputs are normalized and identities come from authenticated message senders. Remote overlays block only local commands. No host migration.
- A layer/organ owner awards at most eight mine points, keeping indefinite mine farming below a rescue's base value. The mine-credit ledger is checkpointed along with the score baseline.
- The official Hub harness emits Chromium's unrelated `Unrecognized feature: 'pointer-lock'.` iframe-policy warning. Tests preserve the original harness and record this exact known browser warning; game, engine and protocol warnings still fail relevant checks.
- Score raises enemy pressure gradually, up to 30%, by shortening existing attack/deployment cycles and modestly increasing hostile projectile speed. Authored sector escalation and Evasion waves remain the principal pacing structure.
- Native Shell navigation is adapted to the player who opened the local console. Keyboard activity can reclaim UI focus. This changes input ownership, not menu hierarchy or mission authority.
- A newly formed couch pair starts in canonical seat order after a disconnect. Handing a previously solo pad to the navigator clears the primary's obsolete device claim. A genuine pilot handoff carries the surviving pad's button latches to require fresh presses for held abilities.
- Carrier rescue count and release trajectory endpoints are mission data. The director reads the same quota for release count and core opening; the shipped quota remains three.
- Unsecured crystals become recorded misses when their sector or successful extraction closes. Evasion rescue opportunities are optional, so no replacement is promised for a missed challenge signal.
- Sector energy resets preserve the hyperspace release latch. A changed drive owner releases before another commit. Hub local overlays clear only local device commands; they never cancel a teammate's authoritative windup or reset shared drive latches.
