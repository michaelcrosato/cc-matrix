# Verification issue ledger

This counts unique defects found after the first integrated implementation by automated tests, visual inspection, or code review. Repeated failures and corrected test assumptions do not add issues. The simulation and reviewer ledgers provide additional detail.

| ID | Severity | Detection | Defect and fix |
| --- | --- | --- | --- |
| S01 | Critical | Simulation boundary regression | Wave success preceded simultaneous failure; deferred progression until after combat and failure resolution. |
| S02 | Moderate | Simulation dev jump | Old spawn index skipped the destination encounter; reset scheduler on act jump. |
| S03 | Moderate | Snapshot continuation test | Live balance omitted from recovery; serialize and restore balance. |
| S04 | Moderate | Full normal bot campaign | Fast scout kills hid every gravity anchor; added a guaranteed authored introduction. |
| N01 | Moderate | Network review / edge test | Short pulse/boost presses fell between send ticks; latch edges until transmitted and execute each sequence once. |
| N02 | Moderate | Network upgrade test | Neutral overlay input discarded refit choices; preserve allowed choices while neutralizing flight controls. |
| V01 | Critical | Desktop screenshot | Canvas defaulted to 300x150; explicitly size its CSS viewport. |
| V02 | Moderate | Title screenshot | Title/menu/footer overflowed the TV layout; corrected typography and panel width. |
| V03 | Moderate | Dev screenshot | Viewport units inside scaled Shell made modals overflow; constrain modal to the shell's actual available height. |
| V04 | Moderate | Title/modal screenshot | Flight HUD and floating actions leaked under menus; synchronously hide them while any Shell screen is present. |
| V05 | Minor | TV screenshot | Pilot badge text was too small; increase compact labels without obscuring the flight plane. |
| V06 | Minor | Four-seat art review | Hull palette disagreed with seat HUD; align seat palettes and retain visible numbers/markings. |
| V07 | Moderate | Renderer/simulation comparison | Some decorative telegraph clocks preceded the actual attack incorrectly; align acquisition, gravity, lane and boss windows. |
| I01 | Critical | Low-DPI phone framing | Native scale floor cropped the logical arena; add a scoped fractional-fit adapter with matching coordinate offsets. |
| I02 | Moderate | Dev screenshot / controller focus | Native first-action focus scrolled past live sliders; focus the first dev control and reset scroll. |
| I03 | Minor | Dev slider inspection | Seconds below one displayed as percentages; retain explicit engineering units for balance rows. |
| I04 | Moderate | Normal-run browser regression | Resetting the god toggle invoked a cheat on every fresh run, blocking best scores and clearing spawn protection; suppress dev callbacks during reset. |
| I05 | Moderate | Settings review | Redefining standard settings discarded glyph options and apply handlers; merge the native spec before overrides. |
| I06 | Moderate | Input review | Movement assistance had no behavioral effect; make neutral thrust counter drift when enabled. |
| I07 | Moderate | Controller review | Pad activity never unlocked the custom audio adapter; attempt unlock on meaningful pad activity under browser activation rules. |
| I08 | Moderate | Native-back join test | Join hooks survived Circle/back and attract entry; close hooks on all exits and restore the title roster. |
| I09 | Moderate | Fresh-run dev review | Persisted sliders disagreed with new-world defaults; reset all balance controls together with the fresh simulation. |
| I10 | Moderate | Post-end gesture regression | Floating controls and first gestures could revive sound after Hub end; hide controls and ignore activity/audio unlock after end. |
| I11 | Moderate | Hub budget review | World used its default deadline instead of the actual round limit; pass limitMs into the authoritative run. |
| I12 | Moderate | Second-pad refit test | Only the first pad could operate later couch seats' refits; allow each seat to navigate/confirm its own page. |
| I13 | Moderate | Dev boundary regression | Invulnerability toggled off implicitly at retreat; retain the serialized cheat flag until explicitly disabled. |
| I14 | Minor | Stick-threshold review | Slight right-stick motion beyond the radial deadzone cancelled attract; apply the same meaningful magnitude threshold to both sticks. |
| I15 | Moderate | Authority-clock regression | An accumulated update could advance beyond session time after crossing countdown; bound each authoritative step to synchronized Hub time. |
| I17 | Moderate | Neutral ground-boost regression | An upward-facing stationary carriage spent charge without moving sideways; give neutral ground boost a legal horizontal fallback. |
| I16 | Moderate | Replication acceptance review | Local replicas waited for network motion before responding; add bounded visual movement prediction with sequence acknowledgment and authoritative correction. |

Critical means the defect could prevent normal presentation/play or violate the single win/loss result. There are **30 unique issues, 3 critical**. Final verification status is recorded in verification.json.
