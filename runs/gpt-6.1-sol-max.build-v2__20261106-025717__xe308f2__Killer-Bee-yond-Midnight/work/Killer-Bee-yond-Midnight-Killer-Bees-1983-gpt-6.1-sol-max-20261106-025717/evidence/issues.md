# Verified issue ledger

Count distinct underlying defects, not repeated assertions or devices. Test-fixture corrections are separate.

1. Normal-action pilot could stand still near an obstacle when its world centroid and navigation cell disagreed about clearance. Corrected route anchoring and deterministic recovery. Noncritical; no simulation teleport/win bypass added.
2. Browser Play created a world but did not leave title: upstream `boot:false` left `_booting` true. Patched its early-return path. Critical / game breaking before fix.
3. Same-tick co-op kills were order-dependent because the first shell displaced contributors before another contact was sampled. Batch all stings before sorted deaths/refills/shells. Noncritical.
4. Orientation changes while a scene was paused could leave the previous camera fit until play resumed. Refit through native Screen resize listeners, including public camera position. Noncritical.
5. Direct-peer final-result acknowledgement could be followed by an old snapshot and a disconnection screen. Terminal delivery now marks the guest finished, stops its transport and retains the final world. Noncritical.

6. A lost peer connection cleared transport but left the run update trying to use it behind the reconnect menu. Gate the stopped round until a new connection or title transition. Noncritical.

Engineering review also corrected clean/assisted save routing on retry, an extra local ray-counter read and cloned-content topology validation before final testing. These are not included as separately test-caught defects.

Test correction: Web Audio gain values use floating-point precision. Bus checks use a small numeric tolerance, not exact decimal equality. This was a test assertion issue, not a synthesis defect.
