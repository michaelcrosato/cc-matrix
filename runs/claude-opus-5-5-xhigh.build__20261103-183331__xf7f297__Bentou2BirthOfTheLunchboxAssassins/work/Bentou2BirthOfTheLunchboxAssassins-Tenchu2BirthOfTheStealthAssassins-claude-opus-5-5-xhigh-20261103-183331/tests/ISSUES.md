# Issues found by testing (the tally behind the Testing Feedback)

Each was found, fixed, and then covered by a check. 18 by scripted tests, 10 by screenshot review: 28 in all. The 4 marked
**critical** broke a mission or hid a fight.

## Found by scripted tests (18)

| # | Issue | Found by | Fix |
|---|---|---|---|
| 1 | A shared menu helper was used before its file defined it (load order) | the first headless run | moved to the earlier file |
| 2 | A held interaction was cancelled on the step it began | playthrough (Kiri Lake) | the autopilot's interact beat; holds keep going |
| 3 | The autopilot blocked through every enemy wind-up and never struck | playthrough (the spar) | a fight plan per enemy move |
| 4 | Fight beats were cut short by the generic 8 s beat timeout | boss measurements | the timeout follows the beat's own length |
| 5 | Boss fights ended in 4-6 s | boss measurements | boss armour: strikes deal 45% (ripostes, fire, plunges full) |
| 6 | **Critical:** guards attacked Tobei in his cage; the bell could fail Kiri Lake | playthrough (Kiri Lake) | a caged prisoner is nobody's target |
| 7 | **Critical:** the water-gate lever press was taken by Tobei's wait / follow toggle | playthrough (Kiri Lake) | interactions in reach come first |
| 8 | The bot stuck swimming beside Hotaru's pier (no strikes in water) | playthrough (Kiri Lake) | climb out of the water first |
| 9 | The poisoned sake was just out of reach in the route | playthrough (Kokaku) | the route's spot |
| 10 | Shadows too bright: a crouched hero in the dark was slowly noticed | perception suite | darker shadow default, a visibility floor |
| 11 | The look-up limit measured from the feet, not the chest | perception suite | measured from the chest |
| 12 | **Critical:** a sleeping guard's own snore woke him (Sleep Dango, the Trial's Big Daikon) | ai suite | a noise never wakes its own source |
| 13 | The tool cooldown carried over into the next mission | tools suite | reset when a mission starts |
| 14 | Smoke did not blind the guards inside it | tools suite | blinded, coughing, the hero lost |
| 15 | The Undertow range was shorter than a swimmer can reach | attract suite | 24 |
| 16 | Freeze AI let guards drift | dev suite | speed zeroed |
| 17 | Three attract vignettes needed beat timeouts | attract suite | their beats retuned |
| 27 | The Button symbols option (Xbox) was on the Controls screen only; TASK.md asks for it on Settings | browser/screens (tapping it on a phone's Settings) | the row on Settings too (engine patch 2) |

## Found by screenshot review (10)

| # | Issue | Fix |
|---|---|---|
| 18 | Story rooms were painted over the cast | the room drawn as a background |
| 19 | The results paper hid the bowing hero | the paper drawn as a background |
| 20 | **Critical:** roof caps drew over people standing on a roof (Kurogane's fight on the keep top was hidden) | an occupied roof shows only its eave ring |
| 21 | Shell panels were clipped at 1080p | the panel's height no longer divided by the zoom |
| 22 | Missing pixel-font glyphs (· ° — … ’) printed as ? | added to the font (patch 1) |
| 23 | The title menu covered the two heroes | menu on the left, heroes on the right |
| 24 | Character select: Sojiro off the ridge, the panel over Kaede | both rebuilt |
| 25 | The hub card's player names overlapped | listed one a line |
| 26 | The engine's corner buttons covered the hub card's logo | no corner in a session (the hub has its own) |
| 28 | The About pages scrolled past their end: holding down (or the wheel) scrolled every line away, leaving an empty page (seen in the About screenshots, taken at the end of the scroll) | the scroll stops at the last line; browser/screens checks every page's end and the wheel |
