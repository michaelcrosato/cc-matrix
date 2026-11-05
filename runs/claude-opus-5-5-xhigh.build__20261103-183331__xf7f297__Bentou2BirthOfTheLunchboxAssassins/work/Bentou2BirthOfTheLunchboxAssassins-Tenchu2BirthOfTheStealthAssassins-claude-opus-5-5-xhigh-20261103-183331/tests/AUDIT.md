```
TASK.md audit: the full run of 2026-11-04T04:48:29.015Z, 384/384 checks passed

PASS L1: "SOURCE: Tenchu 2: Birth of the Stealth Assassins"
   pass  task > Package: the name is TASK.md's [GameTitle-SOURCE-claude-opus-5-5-xhigh-20261103-183331]: GameTitle the title on the title screen, SOURCE TASK.md's first line, written whole  (SOURCE is read from this line)
   pass  about > it answers every Source Information field  (the source is named in Source Information)
PASS L3: "Genre: Pick the game genre"
   pass  stealth > standing in a guard's lantern light 50 px ahead: alerted within 3 s  (in a real level: light gets you caught)
   pass  stealth > crouched in its shadow 80-120 px ahead: never suspicious in 5 s  (shadow hides you)
   pass  stealth > creeping 30 px behind it: no step noise, it stays calm  (creeping is silent)
   pass  stealth > running 30 px behind it: its steps are heard  (running is heard)
   pass  stealth > the floor sets a running step's reach: tatami < paving or earth < gravel  (the floor matters)
   pass  stealth > an alerted samurai rings the alarm bell within 14 s  (the alarm)
   pass  perception > a lit hero 60 ahead is caught within 2 s  (stealth: light gets you seen)
   pass  perception > crouched in shadow at 100 stays calm  (stealth: shadow hides you)
   pass  perception > running at 50 is heard  (stealth: noise carries)
   pass  silentcut > sojiro: the choreography ends, the guard falls  (stealth: an unseen kill from behind)
   pass  alarm > an alert samurai runs for the bell  (stealth: being seen escalates)
   pass  combat > a parry inside the window staggers  (action: swordplay with timing)
   pass  bosses > kurogane: every move fires and works  (action: boss duels)
PASS L5: "Perspective: Pick the camera perspective"
   pass  task > Perspective: isometric (iso view), the camera turns 45 degrees a press each way  (the iso view)
   pass  task > Perspective: camRight turns +45, camLeft back and on to -45  (turned by the player in 45-degree steps)
PASS L7: "pick one with a real random number generator"
   pass  task > Game Title: the plan drew it with a real RNG from 50 (secrets.randbelow) and it is the title shown  (drawn by secrets.randbelow(50), the title shown)
   pass  browser/screens > About page 1 (About): shown, and every line of it drawn on the canvas  (the title and its riff on the source, on screen)
PASS L11: "provide a single html file [GameTitle-SOURCE-claude-opus-5-5-xhigh-20261103-183331.html]"
   pass  task > Package: the single file is in the root under that name, and no other game file beside it  (the file, in the root, under the TASK.md name)
   pass  browser/play > the single file: the page loads nothing but itself  (it needs no other file)
   pass  browser/bundle > a mission plays from the single file  (it plays from file://)
PASS L13: "Build on https://github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff"
   pass  task > Tech stack: built on the my-3D2dge handoff engine (v0.85.2), changes marked  (the handoff engine, its 9 changes marked)
   pass  boot > the title after boot  (the game runs on it)
PASS L15: "Make new art assets for whatever makes the game feel like the source"
   pass  browser/play > art: the game's own Japanese props are drawn in the mission (at least 6 kinds)  (its own props drawn in a mission)
   pass  browser/enginecheck > the engine's checker on training: no errors  (the engine author's tool)
   pass  browser/enginecheck > the engine's checker on m1: no errors  (the engine author's tool)
   pass  browser/enginecheck > the engine's checker on m2: no errors  (the engine author's tool)
   pass  browser/enginecheck > the engine's checker on m3: no errors  (the engine author's tool)
   pass  browser/enginecheck > the engine's checker on training: no look notes against its PS1-era bar (148 colours, 93% filled)  (its look bar: colours, flat area, contrast)
   pass  browser/enginecheck > the engine's checker on m1: no look notes against its PS1-era bar (96 colours, 88% filled)  (its look bar: colours, flat area, contrast)
   pass  browser/enginecheck > the engine's checker on m2: no look notes against its PS1-era bar (71 colours, 88% filled)  (its look bar: colours, flat area, contrast)
   pass  browser/enginecheck > the engine's checker on m3: no look notes against its PS1-era bar (126 colours, 91% filled)  (its look bar: colours, flat area, contrast)
   pass  task > Art: new art assets (Japanese props, materials, wall painters, icons, kanji)  (registered with the engine)
   seen  screenshot shots/market.png
   seen  screenshot shots/keep.png
   seen  screenshot shots/hall.png
PASS L17: "Make new animations for whatever makes the game feel like the source"
   pass  silentcut > sojiro: the cut starts its choreography  (a paired takedown starts)
   pass  silentcut > kaede: the choreography ends, the guard falls  (and plays to its end)
   pass  silentcut > undertow (kaede) runs to the end  (every kind, both characters)
   pass  grapple > a tap pulls the hero onto the roof  (the grappling hook)
   pass  story > prologue: granny taps  (cutscene poses)
   pass  story > m3_fail: takanori toasts  (cutscene poses)
   seen  screenshot shots/cut.png
   seen  screenshot shots/boss.png
PASS L19: "All music, sound effects and voices are written in code, with no audio files. Voices are Animalese/Simlish-style gibberish."
   pass  browser/play > voice: a spoken line is synthesized blips, at least one oscillator a syllable  (voices: gibberish blips, one or more a syllable)
   pass  browser/play > music: the step sequencer runs the score (the boss song, 140 bpm: about 28 steps in 3 s) and its notes are oscillators  (music: sequenced in code)
   pass  browser/play > audio: nothing decoded, no media element, no speech synthesis, no fetch  (no audio file anywhere)
   pass  task > Audio: no audio or image files; music, sound effects and voices are code  (none in the source either)
PASS L21: "Online: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub"
   pass  browser/hub > the hub harness passes: players=2&auto=1  (the real harness, 2 players)
   pass  browser/hub > the hub harness passes: players=4&latency=150&jitter=50&loss=5&auto=1  (4 players on a bad network)
   pass  browser/hub > the hub harness passes: players=2&scenario=host-leave&auto=1  (the host leaving)
   pass  task > Multiplayer: the AI Hub tags, the session client first in <head>  (the client and tags as the hub asks)
PASS L24: "Create a subfolder called [GameTitle-SOURCE-claude-opus-5-5-xhigh-20261103-183331]"
   pass  task > Working environment: the dev subfolder has the same name (this suite runs from it)  (the dev folder, same name)
   pass  browser/hub > the served page is this game  (a 127.0.0.1 server on an OS port, the page confirmed as ours)
PASS L28: "including a scripted playthrough of the whole game"
   pass  playthrough > every story mission is completed in the save  (all four story missions won by script)
   pass  playthrough > the ending leads to the credits  (to the end)
   pass  playthrough > Rice and Ash as Kaede is won  (the second character)
   pass  playthrough > the Night Delivery is won  (the hub round)
   pass  playthrough > the trial shows its board  (the Shadow Trial)
PASS L38: "Create a feature-complete demo."
   pass  playthrough > training: the mission is won  (training)
   pass  playthrough > m1: the mission is won  (Hakuro Temple)
   pass  playthrough > m2: the mission is won  (Kiri Lake)
   pass  playthrough > m3: the mission is won  (Kokaku)
   pass  bosses > ittetsu: the bot wins within 90 s  (boss 1)
   pass  bosses > gonroku: the bot wins within 90 s  (boss 2)
   pass  bosses > hotaru: the bot wins within 90 s  (boss 3)
   pass  bosses > kurogane: the bot wins within 90 s  (boss 4)
   pass  tools > Smoke Bomb: the guard inside is blinded and loses the hero  (tools work)
   pass  move > the hug slides along the wall, and peeks at its end  (wall hugging)
   pass  ki > Ki Focus senses further  (the Ki sense)
   pass  mission > the moon timer fails the mission  (failure states)
   pass  mission > the save round trip  (saves)
PASS L38: "all the infrastructure, systems, and polish needed so the remainder of the game could later be built out with normal designer tools"
   pass  workshop > the editor builds a level  (a level editor)
   pass  workshop > a full level validates  (validation)
   pass  workshop > an unreachable target is caught  (catches broken levels)
   pass  workshop > export and import round trip  (levels as data)
   pass  workshop > a test play is won  (test play)
PASS L40: "Include a dev mode, reachable from the pause menu"
   pass  browser/play > Escape pauses: the pause menu  (the pause menu)
   pass  browser/play > the pause menu's Dev Mode opens the dev screens  (Dev Mode from it, clicked)
   pass  dev > god mode  (standard tools)
   pass  dev > no-clip walks through walls
   pass  dev > freeze AI
   pass  dev > every dev page opens  (every page)
   seen  screenshot shots/pause.png
PASS L40: "expose the most important gameplay variables as live sliders, with a reset to defaults"
   pass  browser/play > a slider moved with the keys changes the game live (Run speed)  (a slider, moved by keys, live)
   pass  dev > the hero runs faster at once  (the game changes at once)
   pass  browser/play > Reset page restores the default  (reset, clicked)
   pass  dev > Reset all restores every slider  (reset all)
   pass  task > Dev mode: the important gameplay variables are live sliders, with reset to defaults  (30+ sliders)
   seen  screenshot shots/dev-balance.png
PASS L42: "After 10 seconds without input on the title/menu screen, start a looping AI-played demo"
   pass  boot > no attract before 10 s  (not before 10 s)
   pass  boot > attract after 10 s idle  (at 10 s)
   pass  browser/bundle > attract mode after 10 s without input  (in the browser too)
   pass  attract > attract runs three loops  (it loops)
   pass  attract > every vignette was visited each loop  (it shows the demo)
   pass  task > Attract mode: the autopilot plays with cheats (god mode)  (the AI cheats)
PASS L42: "any input exits it"
   pass  boot > a press returns to the title  (a press)
   pass  browser/bundle > a mouse move returns to the title  (a mouse move)
   pass  task > Attract mode: any input exits it  (confirm)
PASS L44: "for multiplayer integration into ai-hub as well as for the game on its own"
   pass  hub > a ghost appears where the other player is  (in the hub: the others as ghosts)
   pass  hub > time-up: the result at once  (results to the hub)
   pass  playthrough > the trial shows its board  (on its own: the Shadow Trial)
   pass  task > Multiplayer: the game on its own (the Shadow Trial with your best ghost)  (against your own ghost)
PASS L46: "Use a writing style similar to the source"
   pass  story > scene prologue runs to its end when skipped  (the story scenes play)
   pass  story > lines of their own for Sojiro and Kaede  (two voices)
   pass  story > every bark category has lines  (guards talk)
   pass  task > Narrative tone: a story in the source's register (crawl, briefings, cutscenes, barks)  (how much of it)
   seen  screenshot shots/prologue.png
PASS L49: "Design the game around a PS5 DualSense (or any pad the browser reports in its standard mapping)"
   pass  browser/play > pad: cross opens the title menu  (cross)
   pass  browser/play > pad: d-pad down moves the menu cursor  (the d-pad)
   pass  browser/play > pad: cross picks the entry (Missions opens character select)  (picks)
   pass  browser/play > pad: circle goes back to the title  (circle backs out)
   pass  browser/bundle > a controller press switches the prompts to its symbols  (a DualSense, standard mapping)
PASS L49: "The keyboard uses the keys PC players expect for the genre"
   pass  input > the keys move the hero  (WASD moves)
   pass  input > keys: Space  (Space jumps)
   pass  task > UI: the keys PC players expect for the genre  (Shift, C, F, Esc)
PASS L49: "The mouse aims, looks, and clicks menu items and things in the world (hover moves the focus)"
   pass  browser/play > mouse: hovering Workshop moves the focus to it  (hover moves the focus)
   pass  browser/play > mouse: a click on About opens it  (clicks menu items)
   pass  browser/play > mouse: hovering a menu button focuses it  (on the HTML screens too)
   pass  browser/play > mouse: a click in the world strikes  (clicks in the world)
   pass  grapple > the mouse picks the anchor under it  (aims)
PASS L49: "On-screen prompts follow the input used last"
   pass  browser/bundle > a controller press switches the prompts to its symbols  (to the pad)
   pass  browser/bundle > a key press switches them back to keys  (back to keys)
   pass  input > a mouse prompt: the mouse button  (mouse buttons)
PASS L49: "with a Settings option to show Xbox glyphs, A B X Y, instead"
   pass  input > the pad shows PlayStation symbols by default  (PlayStation by default)
   pass  browser/screens > a tap on SETTINGS opens Settings, with Button symbols on it set to PlayStation  (the option is on Settings)
   pass  browser/screens > a tap on it switches to Xbox: the setting, and the controller prompts become A B X Y  (and switches to A B X Y)
   seen  screenshot shots/touch-settings.png
PASS L51: "Do not use overly dense, web-style data screens."
   pass  browser/play > a Balance page: live sliders (at most 8)  (dev pages hold at most 8 rows)
   pass  task > UI: no dense web-style data screens (at most 8 rows a dev page; one decision a screen)  (every dev page)
   seen  screenshot shots/pause.png
   seen  screenshot shots/dev-balance.png
   seen  screenshot shots/about-2.png
PASS L53: "Touch-only devices: no touch controls; show "Controller or keyboard required" and the settings button. Let the attract mode run."
   pass  browser/screens > the phone draws "Controller or keyboard required" and a SETTINGS button  (the notice and the button, drawn)
   pass  browser/screens > the phone shows no touch controls (no PRESS START, no menu)  (no touch controls)
   pass  browser/screens > a tap on SETTINGS opens Settings, with Button symbols on it set to PlayStation  (the button works)
   pass  browser/bundle > attract still runs on a touch-only device  (attract runs)
   seen  screenshot shots/touch.png
PASS L56: "No TODOs, placeholders, or stubbed features. The demo is complete."
   pass  task > Done: no TODO, FIXME, placeholder or stub in the game's source  (none in the source)
   pass  playthrough > every story mission is completed in the save  (the whole demo plays through)
PASS L59: "Put Source Information, Testing Feedback, Engine Feedback and Prompt Feedback in your chat reply and an in-game About/Credits screen"
   pass  browser/screens > Enter on About opens the About / Credits screen  (reached from the title menu)
   pass  browser/screens > About page 2 (Source Information): shown, and every line of it drawn on the canvas  (Source Information)
   pass  browser/screens > About page 3 (Testing Feedback): shown, and every line of it drawn on the canvas  (Testing Feedback)
   pass  browser/screens > About page 4 (Engine Feedback): shown, and every line of it drawn on the canvas  (Engine Feedback)
   pass  browser/screens > About page 5 (Prompt Feedback): shown, and every line of it drawn on the canvas  (Prompt Feedback)
   pass  browser/screens > About page 3 (Testing Feedback): scrolled to its end, its last line still shows  (readable to its end)
   pass  browser/screens > About page 3: the mouse wheel far past the end leaves its last lines on screen  (by real input too)
   pass  about > the feedback pages answer 4, 6 and 4 questions  (every question answered)
   seen  screenshot shots/about-3.png
   seen  screenshot shots/about-3-end.png
PASS L75: "save these answers as exit-interview.json in this folder's root"
   pass  about > exit-interview.json parses  (parses)
   pass  about > it answers every Source Information field  (every field)
   pass  about > its feedback matches the pages  (the same answers as the screen)
   pass  about > its AI Hub entry is complete  (the AI Hub entry)
   pass  task > Exit interview: in the root, in TASK.md's shape  (TASK.md's shape)

30/30 TASK.md items shown
```
