# Issues found during development verification

1. **Blocking:** literal dollar sequences in the bundled libraries were interpreted
   by String.replace while embedding JavaScript into HTML. Replacement callbacks
   preserve the bundle exactly; the release now passes an extracted-script syntax check.
2. **Blocking for Hub sessions:** synchronous first-frame shader work delayed other
   copies' automatic ready messages and initial traffic. Native asynchronous pipeline
   preparation and independent network updates resolve the four-player scenarios.
3. Quick travel inherited the escalator exit cooldown, preventing immediate use of a
   lift or nearby escalator. Teleport now clears that cooldown.
4. Foreground title characters started below the road surface. Their stage is now
   above the road and the full running silhouettes are visible.
5. Two small title buttons had duplicate class attributes. The shared button helper
   now builds one class attribute and applies the small style.
6. Initial graphics work could consume the title's idle period. The ten-second
   attract clock now starts after the first displayed title frame.
7. A Hub time-up could report empty loot and arrest statistics. The network layer
   now retains the latest authoritative snapshot for its final team report.

Separate test corrections: lift tests wait for doors to finish opening; keyboard
tests observe the actual buffered jump rather than a frame-local key edge; browser
context shutdown messages explicitly reporting a destroyed device are recorded as
expected teardown, while unexpected GPU errors still fail the suite.

The first forced WebRTC test timed out; the targeted data-channel retry passed.
The original timeout's cause is unknown. Internet guests now choose a fresh client
ID locally, avoiding an unnecessary signalling-service ID request.
