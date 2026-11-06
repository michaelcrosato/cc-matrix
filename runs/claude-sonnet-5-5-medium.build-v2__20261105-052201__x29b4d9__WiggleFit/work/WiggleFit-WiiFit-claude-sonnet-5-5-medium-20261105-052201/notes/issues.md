# Issues caught by tests (one line each; C = critical / game breaking)
1. balancer: disturbance scale read from the wrong object gave NaN lean for every event (node balance check) C
2. fruit hat: load from boots/pineapple tipped the sharp bot over; added Load meter and banking rule (balance run)
3. events without a balance core (springboard, raft) were skipped by the base tick, so the dive never launched (node event run) C
4. Rapier panic ("unreachable") on recovery in an event whose world had no ground (forced-fall test); fixed with a ground collider C
5. bot switched on mid-event had no bot object (flow test) C
6. morning script died because the personal-question list was never loaded (flow test) C
7. source grep: Math.random used in two files (unit greps)
8. step class: method name clashed with an array field (node event run)
9. room service: glasses spread too wide and slid off the tray; gust shaped as a half sine (balance run)
10. poses bot gain oscillated; used the loaded-gain model (balance run)
11. plates bot thrashed between bands; added hysteresis (balance run)
12. jar screen: Skip input looped forever (flow test hung the page) C
13. check-in tests ended the next test early because the play screen's done-timer was never reset (flow test) C
14. island visuals: the low side of the tilted island sat under the sea (screenshot pass); lifted the island group
15. ui: the Who's Here mats wrapped and spilled outside the safe margin; page switchers counted as a seventh choice (ui audit)
16. touch-only state was not cleared when a key was pressed during attract (ui test)
17. hub harness: a flaky "ghost: every copy sends its player" failure in the host-leaves run under heavy machine load; passed on rerun
18. tug of peace: every pull was judged before the lean had built up, so no bot could win (balance run) C
19. cairn tiers 2 and 3 were too easy for every bot; raised the sway (balance run)
20. session: ghost lanes crashed events (fruit hat hat array clash, balance-less lanes); intermittent hub 'no errors' failure traced and fixed C
