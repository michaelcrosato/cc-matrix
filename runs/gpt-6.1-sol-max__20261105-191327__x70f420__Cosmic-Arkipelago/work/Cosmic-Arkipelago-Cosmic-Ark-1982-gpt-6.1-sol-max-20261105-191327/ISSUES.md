# Verification and review log

Implementation defects found and corrected during testing and accompanying review:

1. **Planetary lasers did not hit the shuttle.** Rapier’s default active collision types exclude fixed/kinematic sensor pairs. Enabled the required collision types and verified a telegraphed beam causes damage and recall. Critical to the rescue challenge.
2. **Same-browser rooms missed their welcome packet.** BroadcastChannel sent the welcome in a payload while the receiver expected a control envelope. Corrected the handshake and added a relay-disabled two-page check. Critical to that fallback.
3. **A stale remote pause could freeze a later solo expedition.** Clear remote pause and remote controls when returning to title or launching again. Critical to that transition.
4. **Meteor event data could overwrite the event name.** Separated meteorType from the event’s type and assigned monotonic event IDs.
5. **Remote input used the local simulation’s phase.** Guest input now follows the replicated phase, including assisted beam and touch aiming.
6. **Remote audiovisual cues were absent.** Replicate ordered event IDs alongside authoritative snapshots and play each cue once.
7. **Touch boost also activated the shield pulse.** The contextual action now selects one ability for the current phase.
8. **Attract mode could replace a player’s storm tuning.** Preserve and restore live tuning across the looping demonstration.
9. **A Sunheart collision counted as defeating it.** Impacts now damage the Ark and return the surviving boss with its remaining health.
10. **Guest menu navigation could still steer the shared ship.** Send neutral controls while the guest is in a menu.

11. **Guest endings showed a pause notice instead of results.** Guests now receive the expedition statistics and transition into the captain’s next run.

Test-only corrections: cooldown and fuel assertions now allow normal frame advancement, touch beam setup uses an eligible flight altitude, and the attract checkpoint follows the shortened demo storm. These were assertion/setup issues, not game defects.
