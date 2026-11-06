# Issues testing caught (one line each; CRITICAL = game breaking)
1. CRITICAL: engine loaded as CommonJS in Node (package.json lacked "type":"module"), so no test could start.
2. CRITICAL: headless default camera is not 'first': yaw was NaN and the player could not move until boot() passed the first-person preset.
3. CRITICAL (hub): all four hub scenarios failed "game traffic flows both ways" until the me/s message loop existed.
4. CRITICAL: soldiers, buddies and round players kept a stale copy of the controller's feet position, so every AI stood still and measured distances from its spawn point (found by the Cash Run bots not walking).
5. CRITICAL: removing a CharacterController's body from Rapier panics the next physics step ("unreachable"); bodies are now disabled instead.
6. CRITICAL (boot): MapSystem read g.story before FlowSystem created it; story state now lives on the game from construction.
7. CRITICAL (M0): the map could not be raised during the train scene because movement gates blocked it, so M0 never finished.
8. CRITICAL (hub): two senders ran at once (old netloop and the round), going over 20 messages a second and sending malformed snapshots ("d3.p is not iterable"); the netloop was removed.
9. CRITICAL (hub): client-side soldier puppets were ticked as real soldiers and threw "Cannot read properties of undefined (reading 'tick')".
10. Fever never cleared once noFever was set by a mission script (a tablet in M1 left the fever active forever).
11. Fire spread: a base probability of 0.1 per tick ran away at 16 m/s; calibrated to 0.016 per tick (head 3.9 m/s at 5 m/s wind, plan 3.9).
12. Static suite: Math.random in soldier.js (replaced with a fixed vector).
13. stone-wall takes a length of 0.5 to 6 m; Fort Clement's walls are now runs of 6 m pieces.
14. Test setup: free-play started inside Mile Forty's no-fire zone, so guns would not fire; spawn moved.
15. Test infrastructure: round timers kept Node alive after tests (timers are now unref'd); the hub suite hung loading the title page in a browser (title is now read from the served HTML).
16. CRITICAL: every person was invisible in the real browser: our own clips produced NaN rotations for unkeyed leg joints (and zero position tracks collapsed the rig). Node tests could not see it; a screenshot of the Tibor dialogue did. Own clips now keep only finite rotation tracks.
17. People faced away from where they looked (model faces +Z, the game's yaw faces -Z); fixed with a half turn.
18. The held map was drawn upside down (north at the bottom) and its margin was off screen; rows are now flipped and the map is raised.
19. Tibor stood inside his shack, so the dialogue camera looked at a wall; moved to the doorway.
