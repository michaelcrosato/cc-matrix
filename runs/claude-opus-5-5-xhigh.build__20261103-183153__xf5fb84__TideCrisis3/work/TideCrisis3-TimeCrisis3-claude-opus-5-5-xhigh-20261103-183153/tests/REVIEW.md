# A reviewer's pass over TASK.md, feature by feature, on the final bundle

The automated side is `tests/REQUIREMENTS.md` (155 named checks, all passed in the run recorded in `tests/last-run.txt`:
bundle sha256 `f071b3ba2b79454f`, exit-interview.json `c1b6f0019585d207`, 793 passed, 0 failed). This file is the
judged side: I drove that same bundle in headless Chromium, captured the frames below into `shots/`, looked at each one
(contact sheets `shots/final_review_1.png`, `_2.png`, `_3.png`, `shots/final_about_a.png`, `_b.png`) and wrote down
what I saw. The review found two real problems, fixed before the final build (ISSUES.md 67 and 68).

| TASK.md item | Frames | What I saw | Verdict |
|---|---|---|---|
| Title, a riff on the source | review_01_title | TIDE CRISIS 3 logo over the pier flyover, "A CREST OPERATION", version line | meets it |
| Genre, perspective, the source's feel | review_06 to review_13, review_area_* | first-person rail views behind cover, red crisis rings on shots that will hit, TIME plate, lives, weapon box, bosses with bars (Stingray, Hammerhead, Seawolf, Scylla), civilians who shout | meets it |
| Every area plays and reads | review_area_1-2, 1-4, 2-1, 2-2, 2-4, 3-1, 3-4, review_06 to 13, funi_1, lift_1 | each area's enemies are visible from the cover; the funicular and the lift used to fill a third of the view with their own glass and roof (fixed: 67, 68) | meets it after the fix |
| The plan's set pieces | lh frames from the climb run, review_13, kb_krake, kb_final | the outside spiral stair with the deckhands above, the gallery fight, Scylla on the helipad behind the parapet, Krake among the consoles, the FINAL SHOT ring on the lever | meets it |
| Art direction: the engine's style as the base | all frames | the engine's banded light, dithering and textures in perspective, its rigs as the characters, new models (boats, lighthouse, crab walker, tidal barrier) | meets it |
| Narrative tone | review_05_briefing, review_07, 08, 10, 12, 14 | briefing with Director Hale and the map; radio barks ("Minigun! Get down!", "Coolant tanks: stay clear"); boss taunts | meets it |
| Menus, 10-foot, not dense | review_02_menu, 03_offer, 04_difficulty, 16_results, 17_initials, 19_howto | large items, one description line, the results tally and rank, arcade initials; no dense web screens | meets it |
| Prompts follow the device; PS glyphs, Xbox in Settings | e2e_pad_playstation, e2e_pad_xbox, e2e_keys_records, review_22, review_23 | L1 / R1 / ○ on the pad, LB / RB / B with Xbox, Q / E / Esc on keys; Settings → Controls → Button symbols switches PlayStation to Xbox through the UI | meets it |
| Mouse native (aim, hover, click) | e2e_menu_hover, e2e_play_perf | hover moves the menu focus, clicks pick, the reticle follows the mouse | meets it |
| Dev mode from the pause menu, live sliders, reset | e2e_pause, e2e_dev_player, e2e_dev_slider, e2e_dev_actions, e2e_play_perf | Dev mode in the pause menu; tabs; a changed slider in gold with its default in grey; RESET ALL; actions; the perf overlay with lights and shadows | meets it |
| Attract mode | e2e_attract (and attract_fix frames) | DEMO PLAY over the logo, the bot shooting with infinite ammo, PRESS ANY KEY clear of the HUD | meets it |
| Touch-only devices | e2e_touch_title, e2e_touch_settings, e2e_touch_attract | "Controller or keyboard required" box, the SETTINGS button opens Settings, the demo runs with the notice above the weapon slots | meets it |
| Co-op (local) and AI Hub | review_14_coop_split; the hub harness (4 scenarios) in the run | split screen with two agents, each with its own HUD; the harness passes 2 and 4 players with latency and loss, a host leaving, a server | meets it |
| Training | review_15_training | the CREST range lanes, cut-outs and the drill prompt | meets it |
| The ending | review_18_ending | the scrolling credits with the cast | meets it |
| About / Credits with the four sections | final_about_a, final_about_b (every page as paged in-game by keys, and one by the pad) | 15 pages, nothing cut off; Source Information (the usage line as in exit-interview.json), Testing, Engine and Prompt Feedback | meets it |
| Audio all in code, gibberish voices | e2e_voice_spectrogram (and the e2e audio checks) | heard in a real page through analysers on the engine's buses: the menu theme on the music bus, a shot on the sfx bus, a voice line built from one synthesized source per syllable; the spectrogram shows stacked harmonics through formant bands with the pitch gliding syllable to syllable, no words; no audio files requested or embedded, speechSynthesis never called | meets it |
