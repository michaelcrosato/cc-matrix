# Verification record

The release test command is `node verify.mjs` (or `npm test --silent`). It prints failures and one total. The final suite contains 17 campaign checks and 88 browser/harness checks. Additional module development checks covered the synthesizer and network adapter before integration.

Functional issues caught and fixed during verification and lifecycle review:

1. Incorrect Rapier rigid-body descriptor method prevented campaign initialization. Critical.
2. Reset did not free the previous Rapier EventQueue.
3. The cel gradient used an unsupported RGB WebGPU texture format. Converted to RGBA. Critical.
4. Controller chart navigation could not reach the hyperspace confirmation. Cross/A now confirms the selected sector. Critical for controller play.
5. Reverse controller menu navigation used the wrong direction.
6. Initial manual focus could land below the visible fold.
7. Delayed modal focus overwrote the selected chart cell's focus.
8. Mouse position retained from menus caused unintended steering on return to flight.
9. Direct input could change campaign state during the Hub's pre-launch countdown.
10. Clearing an enemy sector could revive a lost starbase. Loss is now permanent and the chart reflects it.
11. Back/Escape/Circle from credits after a Hub debrief did not restore the debrief.
12. Strafing or losing the docked base could leave docking latched. Docking now holds the ship and releases when the base is lost.
13. Repeated docking could farm service points. Each base grants its service bonus once per patrol; repeat repairs still work.

Two additional readability improvements strengthened the navigation panel's contrast over bright planets and increased instrument text. Mouse capture also handles rejection and Escape release explicitly.

The full campaign script steers and fires real lasers and torpedoes through all four hostile sectors. Its invulnerability prevents a test run from ending early; enemies, movement, collisions, targeting, hyperspace and victory remain the real campaign systems. Other tests cover failure, permanent station loss, docking and balance controls.

Official AI Hub harness configurations: two players; four players with 150 ms latency, 50 ms jitter and 5% loss; the same adverse network with the host leaving. Ghost mode continues after host departure, reports progress and results, and stops input/audio/network on end.

On this workstation native WebGPU needs an explicit ANGLE backend flag. Native WebGPU state tests verify rendering calls and flight/input/audio; compatibility rendering checks multi-view networking, touch and file launch. Visual screenshots verified scene composition through WebGL because native headless WebGPU captures omitted the canvas. No physical controller, mobile hardware, TV or human listening was available.
