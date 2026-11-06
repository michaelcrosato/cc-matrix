# Issues testing caught

13 game-breaking defects. Each one stopped a path the suite has to finish. The fixes are in the shipped game.

1. A mouse click counted as a controller, so the touch gate closed and the title's first item opened the menu instead of Settings.
2. Attract left the player in the truck, in god mode, with the map up. The next mission inherited that and could not walk.
3. A truck that already existed stayed at the attract spawn, so the clinic enter failed.
4. Returning to the title left the solo session attached, so attract never started.
5. Mission setup left earlier soldiers alive. One of them killed the player during the train hold.
6. Cash Run did not revive a dead player, so friendly fire never left the gun.
7. The title still ran soldier damage. Mercs from a finished round opened the death screen and froze the clock, so attract could not start.
8. The flare's click dismissed the ending card on the same frame.
9. The last burn sat on ground that cannot burn, so the ending mission could not finish. Completion now accepts fresh flame inside the radius.
10. The payroll case was hidden on the convoy, so the shots that stopped the truck destroyed the case too.
11. A random jam cleared the scripted jam count, so the scripted jam never arrived.
12. A same-computer session started after boot never opened its network timer, so the join never saw the host.
13. The link finish message was dropped because the session marked itself ended before the send.
