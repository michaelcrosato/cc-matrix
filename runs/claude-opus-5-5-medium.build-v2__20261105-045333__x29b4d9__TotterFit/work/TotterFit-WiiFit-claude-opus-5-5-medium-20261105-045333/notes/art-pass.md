# Final art pass, by eye, at 1920x1080 on real WebGPU (PLAN.md section 17)
Reviewed: title, main menu, island (early and Day 5), jar, arrival, all 13 events and the finale mid-play, Check-In, Group Class with four dolls, Results, Age Reveal, question, plan, Journal, Pause, Dev Mode, About.
Looked for lost legibility at 10 feet, sunk characters, messy ink.
Found and fixed: speech box over Results (issue 30); lower menus showing through upper ones; Step Class lights washing out Coach Bolster; Tippy Raft and Springboard cameras too far; Journal heading low contrast.
Earlier passes fixed: island under the sea, hub camera in the trees, white marbles, unreadable plate gauges, plank pose end-on, finale camera and doubled lighthouse, session card (issues 10-15, 27).
Then fixed: the backdrop island read like a ship, so it has a rocky base; About pages use larger type and split long answers across more pages.

# Bots against the plan's figures
The plan's model is wish = goal + gain x (goal - dot) + noise x sin(...), and it does not state the frequency in sin(...). The bots run close to the edge of stability, so scores swing with it. Poses T1 without breath, average/clumsy: 1.13 rad/s gives 97/85, 1.8 gives 96/77, 2.2 gives 86/20, 2.7 gives 70/74. No value reproduces all the plan's figures. Kept 1.8/2.0, the closest stable fit. Section 17's stated thresholds are what the balance test enforces.

# About at the final pagination
All 13 pages reviewed by eye at 1920x1080: nothing clipped, each page readable. Fixed a stray colon after questions.

# Numbers against the plan, on the final build
Restored the plan's value: Tug over-lean .72 (a retune to .88 had been hiding a bot bug).
Changed after measuring, as the plan says to: Plate Spinners bands at 65% width (share T1 100/93/80, plan 100/89/82; T2 98/88/75, plan 89/86/74; T3 86/80/68, plan 79/76/66). Poses gains a slow lean only while breathing in sync, so parked play stays below Exemplary.
Tug at .72: T1 at .9 everyone wins in 23-32 s (plan 25-48). T2 and T3 at .85 everyone wins with almost no falls (plan: T3 sharp only). Full stick falls about 9-16 times a class on T2 and 6-9 on T3 (plan 3-4 and 6-7), so greed costs more than the plan measured. T3 at .95 falls too (plan: mostly wins).

# Why the plan's Tug table can't be fully reached under its own rules
Measured mean lean share at each stick (Tier 3): .85 gives .69-.73, .95 gives .76-.79, full stick gives .78-.80. The torque limit saturates, so .95 and full stick are almost the same lean, and no threshold can make one safe and the other fall. Kept the plan's .72, which makes .85 safe and anything above it risky.
