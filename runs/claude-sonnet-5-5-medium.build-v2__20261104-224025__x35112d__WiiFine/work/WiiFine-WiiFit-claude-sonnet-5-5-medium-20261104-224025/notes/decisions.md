Title: Wii Fine (picked by secrets.choice from 50 brainstormed titles)
- Sets are hand-composed from engine primitives in `[[object]]` entries (rounded boxes, cylinders, spheres, capsules) written by tools/gen_sets.py, rather than one JSON prop per item: the sets stay readable and hot-reload from disk. New prop JSON can still be dropped into engine/assets/props/lib/core/.
- Arrow keys walk/lean and move menus; Q/E are the steps (the plan's "Q or Left" would make Left both a lean and a step in Floatie Spin and Morning Lap).
- Step Party's lead-in is four beats (2.5 s) so the chart lines up with the song's beat grid; chart notes are stored in beats.
- Real days: the page passes `today` (days since 1970); the sim never reads the clock.
- The Long Stillness reads any button press (or any key through InputFrame.any) as forfeiting the Inner Peace bonus.
- Hub ghosts are drawn by the app (not the sim), so the sim stays deterministic; Yesterday You and Play Together ghosts are NPC figures driven by the sim.
