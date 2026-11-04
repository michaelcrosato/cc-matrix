PLAN.md is written, starting with the title. Nothing has been built yet; this stage only plans.

**Title:** Snipeout HD (tagline *"Anti-gravity. Anti-everyone."*). I brainstormed 50 riffs on the name, none reusing "Wipeout", and Python's `secrets` picked #19. The deliverable will be `SnipeoutHD-WipeoutHD-claude-opus-5-5-max-20261103-174728.html`, with a dev folder of the same name.

**What the plan specifies:**
- **Genre and camera:** an anti-gravity combat racer with a chase camera, plus a far chase, a cockpit view, look-back, and trackside TV cameras for intros, replays, spectating and the attract mode.
- **Tech:** the handoff engine runs everything, including scenes, input, menus, settings, the synthesized audio and the pixel-art HUD. The 3D picture comes from the same repo's 3D add-on, with three.js r182 and Rapier 0.19.3 loaded from a CDN. All download URLs are pinned to the exact commits I researched, and the fetch commands were run once to confirm they work. The craft physics are custom and run without a browser, so headless tests and replays repeat exactly; the add-on's own kart physics can't handle these speeds or the tracks' tunnels, drops and overpasses.
- **Mechanics:** hover physics on banked tracks, analog airbrakes, pitch control, side-shift, barrel-roll boosts, speed pads and weapon pads, ten weapons, absorbing a weapon for shield, a pit strip, elimination and a launch boost.
- **Content:**
  - four tracks with full layouts and features;
  - six original teams with procedurally built craft, and 12 pilots;
  - four speed classes;
  - a 10-event season plus a 4-race Grand Prix, with written story beats;
  - an 11-drill tutorial;
  - six synthesized songs and gibberish-voiced announcer and dialogue.
- **Modes:** quick race, time trial with ghosts, hot lap, SNIPEOUT (combat points), OVERCLOCK (survive rising speed), replay, 2-player split screen, and AI Hub ghost races.
- **TASK.md's other requirements:** dev mode with about 35 live sliders and a reset, the 10-second attract mode, PlayStation button prompts by default with an Xbox option in Settings, and the touch-only notice. A checklist maps every requirement to where it lives and which test proves it.
- **Order:** 13 milestones, starting with a proof that the single-file 3D page loads at all. A full race with AI and weapons comes by the sixth.
- **Risks:** 13 are listed, each with how to de-risk it.
- **Testing:** one command that prints only failures and a count. It covers headless suites, a scripted playthrough of the whole game, browser checks, and the real AI Hub harness at 2 and 4 players, with network faults and the host leaving.

**Checked during planning:**
- **Track layouts:** a script confirmed lengths of 3.8–5.0 km and tightest turns of 44–56 m. The two overpasses clear by 24.5 m and 31.9 m. Every jump flies at each class's speed; the Karakum gorge needs 75 m/s.
- **Handling model:** a quick simulation caught a flaw in my first draft. Lateral grip had no cap, so airbrakes didn't matter. The model is fixed, and its feel targets are now numbers the simulation reaches.
- **Lap times:** SPARK laps should run 46–59 s and SINGULARITY 27–34 s, so a 3-lap race takes about 1.5–3 minutes.

**One thing about your machine:** `/tmp` is a shared tmpfs that sat at 97–99% full while I worked, and it briefly filled completely. The plan routes all temp files into the dev folder. My research copies and scripts are in `~/.cache/opus55-plan-x978410`.