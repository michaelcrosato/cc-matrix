# Validation notes

Eleven tracked game issues were corrected during implementation and validation:

1. Session connect info did not contain the `active` flag used by game guards. The network adapter now supplies it explicitly.
2. Guest ticket changes needed signed selection and pulse retention through input coalescing. Both are preserved.
3. Departing chefs left stale actors and input. Roster changes now remove actors/input and rebuild physics bodies.
4. The frame loop could undo the Hub end pause, and input could unlock stopped audio. Ended Hub sessions now ignore input and remain silent/frozen.
5. Controller focus could not toggle checkboxes or change select fields. Cross activates checkboxes; left/right or Cross changes selects; focus scrolls into view.
6. Generating an invite started service and hid the connection code. Standalone room setup now remains in the visible lobby until the host starts service.
7. A guest pause was hidden by incoming snapshots while its paused flag remained set. Snapshots now preserve local pause/settings screens.
8. Disconnecting a moving pad retained its axes. Disconnection now clears movement and action flags.
9. Lobby snapshots could send an unstarted kitchen to guests. World reporting now begins with service, so both players wait for the host.
10. Scene hatch names/colors differed from tickets. Both now use SUNSET, MINT and GOLDEN with matching colors.
11. The first HUD had low contrast over tiles and a title stamp overlapping play. Added a dark header and backed meters, increased ticket text, and restricted the stamp to the title.

Items 6 and 7 blocked the intended multiplayer flow before correction. No startup or full-game failure remained after validation.

A separate test automation issue was corrected: a waiting title could enter the requested attract demo while the second peer loaded, hiding the menu before a scripted click. The test now supplies real mouse activity before selecting Co-op Kitchen. A quiet loopback server also avoids buffering request logs during large suites.

The full suite passed 116/116 checks before the final lobby-start refinement. The targeted final network run passed 14/14 checks, including that both invite participants remain in the lobby before the host starts service and that the exit interview parses correctly. Detailed current results are in the JSON reports.
