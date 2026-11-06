# Issues found during testing and integration review

Game/integration issues, grouped by root cause:

1. Duck stance canceled during landing proximity.
2. Dedicated host mixed input sequence counters from different seats (critical).
3. Standalone replay retained the network finished flag.
4. Hub end did not fully mute audio / reject menu input.
5. Guest case report stayed open when host continued (critical).
6. Network sanitization dropped the downward lift modifier.
7. New shifts retained attract/prior-shift statistics.
8. Controller Circle failed to resume the pause screen.
9. Remote action state mutation caused held repeats and could discard pulses before a physics step.
10. Rapid D-pad taps were suppressed by the repeat timer.
11. Brief keyboard/touch actions could fall between render frames.
12. Departed partner bodies stayed active; mutable player order could remap the surviving seat. Departure notifications were also incomplete for WebRTC closure.
13. Joining could retain the guest's attract flag and swallow the first input.
14. Retried BroadcastChannel joins could restart the host repeatedly.

15. Touch assist released duck before the complete plane wing passed.
16. Input mode failed to restore keyboard/controller controls after touch, and programmatic controller menu clicks forced keyboard prompts.
17. Local HUD/context/portrait camera selection assumed the host was player0 instead of using the authenticated local seat.

18. A hidden dedicated server rendered the full scene while clients were joining, starving startup on the software GPU; server copies now simulate without drawing (critical startup failure).

Separate verification issues: invalid CDP multitouch cleanup, a whitespace-sensitive glyph assertion, an initial-title assertion that ignored the live attract timeout, and the headless Chromium driver configuration. Two additional launch flags fixed native WebGPU even for a one-cube reproduction. No engine/library source was modified.

Controller/touch credits scrolling was also improved during final UI review.
