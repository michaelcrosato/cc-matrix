# Decisions the plan left open
- Camera: the game drives `HudFrame.camera` every tick instead of engine cues (one mechanism for chase cams, captures and blends).
- UI: the sim writes a list of drawn items in 1920x1080 space (`ui_model.rs`), so tests read every screen as data.
- Breath, Squats: the plan's score formulas as written, with the ring or band term counted only while breathing or squatting, because otherwise idle play earns a star against the plan's own rule.
- Tray Trek: the pier rolls the tray (a known sway to counter), since jolts alone let idle play keep most glasses.
- Back skips any dialogue, which is how the intro is skippable.
- Tray walk: the plan's Balance_Walk plus upper-body CarryTray is baked into one clip, FIT/CarryTray (gen_clips.py), since the engine has one clip slot.
- Morning Lap: played on the island's ring path; the pacer is the hub's own Bounce, returned home after.
- Hub Medley legs have a 3 s countdown once the hub's clock starts, with no card.
