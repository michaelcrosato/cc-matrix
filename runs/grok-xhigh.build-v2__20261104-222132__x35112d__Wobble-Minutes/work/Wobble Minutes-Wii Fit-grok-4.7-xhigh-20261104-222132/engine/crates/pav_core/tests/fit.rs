//! Headless Tippy Cay. These tests drive the shipped sim, not a copy of it.

use pav_core::games::fit::FitGame;
use pav_core::games::fit::TITLE;
use pav_core::games::Outcome;
use pav_core::glam::Vec2;
use pav_core::input::{buttons, InputFrame, UiEvent};
use pav_core::puppet::HelmKind;
use pav_core::sim::Sim;
use serde_json::Value;

fn boot(scene: &str, seed: u64) -> Sim {
    let mut sim = Sim::new(scene, seed).unwrap_or_else(|e| panic!("boot {scene}: {e:#}"));
    sim.config.history_seconds = 0.0;
    sim
}

fn status(sim: &Sim) -> Value {
    sim.play().expect("game").status(sim)
}

fn phase(sim: &Sim) -> String {
    status(sim)["phase"].as_str().unwrap_or("").to_string()
}

fn bot_until(sim: &mut Sim, pred: impl Fn(&Sim) -> bool, cap: u64) -> bool {
    for _ in 0..cap {
        if pred(sim) {
            return true;
        }
        let input = sim.bot_input();
        sim.step(&input);
    }
    pred(sim)
}

fn press(bits: u32) -> InputFrame {
    InputFrame { pressed: bits, held: bits, ..Default::default() }
}

fn label_hit(label: &str, needle: &str) -> bool {
    if needle.ends_with('x') && needle.chars().next().is_some_and(|c| c.is_ascii_digit()) {
        label.split_whitespace().any(|word| word == needle)
    } else {
        label.contains(needle)
    }
}

fn ui_of(sim: &Sim) -> pav_core::fit_ui::FitUi {
    sim.play().unwrap().fit_ui(sim).unwrap()
}

/// Move focus onto `needle` with the pad. Pages with the shoulder when the row is off-screen.
fn seek(sim: &mut Sim, needle: &str) -> bool {
    for _ in 0..48 {
        let ui = ui_of(sim);
        let labels: Vec<String> = ui.items.iter().map(|it| it.label.clone()).collect();
        let focus = ui.items.iter().find(|it| it.id == ui.focus).map(|it| it.label.clone()).unwrap_or_default();
        if label_hit(&focus, needle) {
            return true;
        }
        if let Some(i) = labels.iter().position(|label| label_hit(label, needle)) {
            let fi = ui.items.iter().position(|it| it.id == ui.focus).unwrap_or(0);
            let bits = if fi < i { buttons::MENU_DOWN } else { buttons::MENU_UP };
            sim.step(&press(bits));
        } else {
            sim.step(&press(buttons::TAB_R));
        }
    }
    false
}

fn pick(sim: &mut Sim, needle: &str) {
    assert!(seek(sim, needle), "missing {needle} on {}", phase(sim));
    sim.step(&press(buttons::CONFIRM));
}

const EVENTS: [&str; 13] = [
    "check", "breath", "pose", "squat", "plank", "step", "floatie", "lap", "tide", "paddle", "tray", "cannon", "bigstand",
];

fn play_direct(kind: &str, seed: u64, idle: bool) -> Value {
    let mut sim = boot(&format!("fit/event/{kind}"), seed);
    let cap = 20_000;
    for _ in 0..cap {
        if phase(&sim) == "result" {
            break;
        }
        if idle {
            sim.step(&InputFrame::default());
        } else {
            let input = sim.bot_input();
            sim.step(&input);
        }
    }
    let s = status(&sim);
    assert_eq!(s["phase"], "result", "{kind} seed {seed} idle {idle} stuck in {} score {}", s["phase"], s["score"]);
    s
}

#[test]
fn bot_earns_two_stars_and_idle_earns_none() {
    for kind in EVENTS {
        for seed in [1, 2, 3, 4, 5] {
            let bot = play_direct(kind, seed, false);
            let stars = bot["stars"].as_u64().unwrap_or(0);
            assert!(stars >= 2, "{kind} seed {seed} bot stars {stars} score {}", bot["score"]);
            let idle = play_direct(kind, seed, true);
            let idle_stars = idle["stars"].as_u64().unwrap_or(0);
            assert!(idle_stars < 1, "{kind} seed {seed} idle stars {idle_stars} score {}", idle["score"]);
        }
    }
}

#[test]
fn three_seeds_reach_credits_with_every_stamp() {
    for seed in [7_u64, 11, 21] {
        let mut sim = boot("fit", seed);
        let (outcome, ticks) = sim.run_bot(60 * 60 * 60);
        let s = status(&sim);
        assert_eq!(outcome, Outcome::Won, "seed {seed} outcome {outcome:?} phase {} after {ticks}", s["phase"]);
        assert_eq!(s["outcome"], "won");
        assert_eq!(s["stamps"], 5, "seed {seed} stamps {}", s["stamps"]);
        let played = s["played"].as_array().cloned().unwrap_or_default();
        for kind in EVENTS {
            assert!(played.iter().any(|p| p.as_str() == Some(kind)), "seed {seed} missing {kind} in {played:?}");
        }
        let minutes = s["world_time"].as_f64().unwrap_or(1e9) / 60.0;
        assert!(minutes < 60.0, "seed {seed} took {minutes:.1} sim-minutes");
        let age = s["age"].as_u64().unwrap_or(0);
        assert!((18..=99).contains(&age), "age {age}");
        assert_eq!(s["phase"], "credits");
    }
}

#[test]
fn attract_starts_at_600_and_leaves_without_saving() {
    let mut sim = boot("fit", 4);
    for _ in 0..599 {
        sim.step(&InputFrame::default());
    }
    let mid = status(&sim);
    assert_eq!(mid["demo"], false, "attract early: {mid}");
    assert_eq!(mid["phase"], "title");
    sim.step(&InputFrame::default());
    let on = status(&sim);
    assert_eq!(on["demo"], true, "attract at 600: {on}");
    assert_eq!(on["phase"], "attract");
    let serial = on["save_serial"].clone();
    sim.step(&InputFrame { pressed: buttons::CONFIRM, device: 2, ..Default::default() });
    let off = status(&sim);
    assert_eq!(off["phase"], "title");
    assert_eq!(off["demo"], false);
    assert_eq!(off["save_serial"], serial);
}

#[test]
fn pause_freezes_world_time_and_the_body() {
    let mut sim = boot("fit/event/breath", 6);
    assert!(bot_until(&mut sim, |s| phase(s) == "event", 400));
    for _ in 0..40 {
        let input = sim.bot_input();
        sim.step(&input);
    }
    let before = status(&sim);
    let wt = before["world_time"].as_f64().unwrap();
    assert!(wt > 0.0, "world time never started");
    let id = sim.state.player.expect("player");
    let feet = sim.feet(id).expect("feet");
    sim.step(&press(buttons::PAUSE));
    assert_eq!(phase(&sim), "dev");
    for _ in 0..120 {
        sim.step(&InputFrame::default());
    }
    let frozen = status(&sim);
    assert!((frozen["world_time"].as_f64().unwrap() - wt).abs() < 1e-5);
    let feet2 = sim.feet(id).expect("feet");
    assert!((feet2 - feet).length() < 1e-3, "body moved while paused");
    sim.step(&press(buttons::PAUSE));
    assert_eq!(phase(&sim), "event");
    let input = sim.bot_input();
    sim.step(&input);
    assert!(status(&sim)["world_time"].as_f64().unwrap() > wt);
}

#[test]
fn music_defaults_quiet_and_a_dev_slider_resets() {
    let mut sim = boot("fit", 8);
    let s = status(&sim);
    assert!((s["music"].as_f64().unwrap() - 0.10).abs() < 1e-6, "music {}", s["music"]);
    let stiff = s["stiffness"].as_f64().unwrap();
    pick(&mut sim, "Settings");
    assert_eq!(phase(&sim), "settings");
    sim.step(&press(buttons::MENU_RIGHT));
    let music = status(&sim)["music"].as_f64().unwrap();
    assert!((music - 0.20).abs() < 0.02, "pad right left music at {music}");
    pick(&mut sim, "Back");
    assert_eq!(phase(&sim), "title");
    sim.step(&press(buttons::PAUSE));
    assert_eq!(phase(&sim), "dev");
    pick(&mut sim, "Tuning");
    sim.step(&press(buttons::MENU_RIGHT));
    let moved = status(&sim)["stiffness"].as_f64().unwrap();
    assert!((moved - stiff).abs() > 1.0, "pad right left stiffness at {moved}");
    pick(&mut sim, "Reset feel");
    let back = status(&sim)["stiffness"].as_f64().unwrap();
    assert!((back - stiff).abs() < 1e-3, "reset left {back}, was {stiff}");
}

#[test]
fn medley_is_the_same_course_twice() {
    let a = medley_scores(9);
    let b = medley_scores(9);
    for (i, (x, y)) in a.iter().zip(b.iter()).enumerate() {
        assert!((x - y).abs() < 1e-3, "stat {i} {x} vs {y}");
    }
    assert!(a.iter().sum::<f64>() <= 3000.0);
}

fn medley_scores(seed: u64) -> Vec<f64> {
    let mut sim = boot("fit/medley", seed);
    assert!(bot_until(&mut sim, |s| status(s)["hub"]["done"].as_bool() == Some(true), 30_000));
    let s = status(&sim);
    assert_eq!(s["hub"]["label"], "Inter-Resort Medley");
    let stats = &s["hub"]["stats"];
    vec![
        stats["paddle"].as_f64().unwrap(),
        stats["tide"].as_f64().unwrap(),
        stats["cannon"].as_f64().unwrap(),
    ]
}

#[test]
fn play_together_reaches_a_podium() {
    let mut sim = boot("fit", 12);
    sim.step(&press(buttons::MENU_DOWN));
    sim.step(&press(buttons::CONFIRM));
    assert_eq!(phase(&sim), "together");
    assert!(bot_until(&mut sim, |s| phase(s) == "podium", 40_000), "phase {}", phase(&sim));
    let s = status(&sim);
    let podium = s["podium"].as_array().cloned().unwrap_or_default();
    assert_eq!(podium.len(), 2, "{podium:?}");
    assert_eq!(s["outcome"], "playing");
}

#[test]
fn shipped_text_stays_in_bounds() {
    let files: [(&str, &str); 5] = [
        ("script", include_str!("../src/games/fit/script.toml")),
        ("rules", include_str!("../src/games/fit/rules.toml")),
        ("charts", include_str!("../src/games/fit/charts.toml")),
        ("hub", include_str!("../src/games/fit/hub.toml")),
        ("events", include_str!("../src/games/fit/events.rs")),
    ];
    let banned = ["todo", "placeholder", "bmi", "diet", "weight", "wii", "nintendo"];
    for (name, text) in files {
        for (n, line) in text.lines().enumerate() {
            if line.contains("Source:") {
                continue;
            }
            let low = line.to_ascii_lowercase();
            for word in banned {
                assert!(!low.contains(word), "{name}:{} contains {word}", n + 1);
            }
        }
    }
    assert_eq!(TITLE, "Wobble Minutes");
}

#[test]
fn save_round_trip_matches_the_slot() {
    let mut sim = boot("fit", 15);
    {
        let g = sim.state.play.as_mut().unwrap().get_mut::<FitGame>().unwrap();
        g.day = 3;
        g.age = 22;
        g.stamps = 2;
        g.name = "Kai".into();
        g.settings.music = 0.25;
        g.today = 20;
        let blob = g.export_save();
        g.day = 1;
        g.age = 80;
        g.name = "Guest".into();
        g.settings.music = 0.10;
        assert!(g.import_save(&blob));
        assert!(!g.import_save("{"));
        assert!(!g.import_save("{\"version\":9,\"slots\":[],\"settings\":{},\"last_day\":0}"));
    }
    let s = status(&sim);
    assert_eq!(s["day"], 3);
    assert_eq!(s["age"], 22);
    assert_eq!(s["name"], "Kai");
    assert!((s["music"].as_f64().unwrap() - 0.25).abs() < 1e-6);
    assert_eq!(s["version"], 1);
}

#[test]
fn hub_ghost_is_a_sample_and_about_pages_turn() {
    let medley = boot("fit/medley", 3);
    let ghost = &status(&medley)["hub"]["ghost"];
    assert!(ghost.is_object(), "{ghost}");
    assert_eq!(ghost["area"], 9, "paddle is event index 9");
    assert!(ghost["position"].is_array());
    assert!(ghost["lean"].is_array());
    let title = boot("fit", 3);
    assert_eq!(status(&title)["hub"]["ghost"]["area"], -1);

    let mut sim = boot("fit", 4);
    {
        let g = sim.state.play.as_mut().unwrap().get_mut::<FitGame>().unwrap();
        g.about_blob = r#"{"sourceInformation":{"usage":"added on import","source":"Wii Fit"},"testingFeedback":["the bot caught a gust"],"engineFeedback":["pause returns inside the tick"],"promptFeedback":["the full roster ships"]}"#.into();
    }
    sim.step(&InputFrame { ui: Some(UiEvent::Click(5)), device: 2, pressed: 0, ..Default::default() });
    let ui = sim.play().unwrap().fit_ui(&sim).unwrap();
    let blob = ui.lines.join(" ");
    assert!(blob.contains("Source:"), "{blob}");
    assert!(blob.contains("added on import"), "{blob}");
    assert!(blob.contains("Testing Feedback"), "{blob}");
    sim.step(&press(buttons::TAB_R));
    sim.step(&press(buttons::TAB_R));
    let ui = sim.play().unwrap().fit_ui(&sim).unwrap();
    let blob = ui.lines.join(" ");
    assert!(blob.contains("the bot caught a gust"), "{blob}");
}

#[test]
fn name_and_outfit_pages_reach_gray_and_golden() {
    let mut sim = boot("fit", 16);
    sim.step(&press(buttons::CONFIRM));
    assert_eq!(phase(&sim), "slots");
    sim.step(&press(buttons::CONFIRM));
    assert_eq!(phase(&sim), "name");
    sim.step(&press(buttons::TAB_R));
    sim.step(&press(buttons::CONFIRM));
    assert_eq!(status(&sim)["name"], "Gray");
    assert_eq!(phase(&sim), "look");
    sim.step(&press(buttons::CONFIRM));
    assert_eq!(phase(&sim), "outfit");
    sim.step(&press(buttons::TAB_R));
    sim.step(&press(buttons::MENU_DOWN));
    sim.step(&press(buttons::CONFIRM));
    assert_eq!(status(&sim)["outfit"], 7, "Golden is the eighth outfit");
    assert_eq!(phase(&sim), "intro");
}

#[test]
fn schedule_pages_to_cannonball_after_unlock() {
    let mut sim = boot("fit", 18);
    sim.step(&press(buttons::PAUSE));
    assert_eq!(phase(&sim), "dev");
    pick(&mut sim, "Cheats");
    pick(&mut sim, "Unlock all");
    pick(&mut sim, "Back");
    pick(&mut sim, "Jump");
    pick(&mut sim, "Island");
    assert_eq!(phase(&sim), "island");
    sim.step(&press(buttons::SCHEDULE));
    assert_eq!(phase(&sim), "schedule");
    pick(&mut sim, "Cannonball");
    let s = status(&sim);
    assert_eq!(s["event"], "cannon");
    assert!(matches!(s["phase"].as_str(), Some("card" | "countdown" | "event")), "{}", s["phase"]);
}

#[test]
fn eyes_closed_hides_the_puck_and_the_tone_moves() {
    let mut sim = boot("fit/event/check", 3);
    assert!(
        bot_until(&mut sim, |s| phase(s) == "check" && status(s)["act_phase"].as_u64() == Some(2), 4000),
        "phase {} act {}",
        phase(&sim),
        status(&sim)["act_phase"]
    );
    let ui = ui_of(&sim);
    assert!(ui.puck.is_none(), "puck stayed up");
    assert!(ui.dim > 0.5, "dim {}", ui.dim);
    let blob = ui.lines.join(" ").to_ascii_lowercase();
    assert!(blob.contains("eyes"), "{blob}");
    let tone = status(&sim)["tone"].as_f64().unwrap();
    for _ in 0..30 {
        sim.step(&InputFrame { lean: Vec2::new(1.0, 0.0), ..Default::default() });
    }
    let later = status(&sim);
    assert_eq!(later["act_phase"], 2, "left the eyes-closed phase");
    let moved = later["tone"].as_f64().unwrap();
    assert!((moved - tone).abs() > 0.05, "tone {tone} -> {moved}");
}

#[test]
fn long_stillness_goes_quiet_and_offers_a_fake_skip() {
    let mut sim = boot("fit", 5);
    sim.step(&press(buttons::PAUSE));
    pick(&mut sim, "Time");
    pick(&mut sim, "4x");
    pick(&mut sim, "Back");
    pick(&mut sim, "Jump");
    pick(&mut sim, "The Big Stand");
    let opened = status(&sim);
    assert_eq!(opened["phase"], "event");
    assert_eq!(opened["event"], "bigstand");
    assert_eq!(opened["song"], 3, "finale bed");
    sim.step(&press(buttons::PAUSE));
    pick(&mut sim, "Jump");
    pick(&mut sim, "Long stillness");
    let still = status(&sim);
    assert_eq!(still["song"], 0, "stillness should be silent");
    assert_eq!(still["act_phase"], 4);
    let mut guard = 0;
    while status(&sim)["act_sub"].as_f64().unwrap_or(0.0) < 15.0 && guard < 400 {
        sim.step(&InputFrame::default());
        guard += 1;
    }
    let s = status(&sim);
    assert!(s["act_sub"].as_f64().unwrap() >= 15.0, "sub {} after {guard}", s["act_sub"]);
    let ui = ui_of(&sim);
    let line = ui.lines.join(" ");
    assert!(line.contains("Press") && line.contains("skip"), "{line}");
    assert!(ui.footer.contains("Press") && ui.footer.contains("skip"), "{}", ui.footer);
    assert!(ui.big.is_empty(), "score banner {}", ui.big);
    assert!(ui.title.is_empty(), "title fell back to {}", ui.title);
    assert!(ui.puck.is_some(), "puck should stay");
}

#[test]
fn a_good_finale_can_rowboat_from_a_middle_age() {
    let mut sim = boot("fit", 1);
    {
        let g = sim.state.play.as_mut().unwrap().get_mut::<FitGame>().unwrap();
        g.age = 45;
    }
    sim.step(&press(buttons::PAUSE));
    pick(&mut sim, "Jump");
    pick(&mut sim, "The Big Stand");
    assert_eq!(status(&sim)["event"], "bigstand");
    assert!(
        bot_until(&mut sim, |s| phase(s) == "ending", 20_000),
        "phase {} score {}",
        phase(&sim),
        status(&sim)["score"]
    );
    let s = status(&sim);
    let score = s["score"].as_f64().unwrap();
    let cut = (score / 100.0).floor().min(10.0) as u8;
    let expect = 45u8.saturating_sub(cut).max(18);
    assert_eq!(s["age"], expect, "score {score}");
    if score >= 500.0 {
        assert_eq!(s["ending"], "rowboat", "score {score} age {}", s["age"]);
    }
}

#[test]
fn pose_parade_plays_the_tree_clip() {
    let mut sim = boot("fit/event/pose", 2);
    assert!(bot_until(&mut sim, |s| phase(s) == "event", 400));
    for _ in 0..20 {
        let input = sim.bot_input();
        sim.step(&input);
    }
    let tree = pav_core::clips::find("FIT/Tree").expect("FIT/Tree");
    let clip = status(&sim)["clip"].as_u64().unwrap();
    assert_ne!(clip, 0);
    assert_eq!(clip, tree as u64);
}

#[test]
fn wardrobe_calendar_and_beach_props() {
    let mut sim = boot("fit", 20);
    let props = sim.state.entities.iter().filter(|e| e.prop.is_some()).count();
    assert!(props > 0, "no beach props");
    let mats = status(&sim)["mats"].as_array().cloned().unwrap_or_default();
    assert!(mats.len() >= 11, "{mats:?}");
    assert!(mats.iter().any(|m| m["event"] == "cannon"), "{mats:?}");
    sim.step(&press(buttons::PAUSE));
    pick(&mut sim, "Wardrobe");
    pick(&mut sim, "Sun cap");
    assert_eq!(sim.config.puppet.gear.helm, HelmKind::Cap);
    pick(&mut sim, "Calendar");
    let ui = ui_of(&sim);
    assert!(ui.items.iter().any(|it| it.label.contains("Day")), "{:?}", ui.items);
}

#[test]
fn a_mat_on_the_sand_starts_its_event() {
    let mut sim = boot("fit", 22);
    sim.step(&press(buttons::PAUSE));
    pick(&mut sim, "Cheats");
    pick(&mut sim, "Unlock all");
    pick(&mut sim, "Back");
    pick(&mut sim, "Jump");
    pick(&mut sim, "Island");
    assert_eq!(phase(&sim), "island");
    let mats = status(&sim)["mats"].as_array().cloned().unwrap();
    let mat = mats.iter().find(|m| m["event"] == "floatie").expect("floatie mat");
    let x = mat["x"].as_f64().unwrap() as f32;
    let z = mat["z"].as_f64().unwrap() as f32;
    let id = sim.state.player.expect("player");
    let mut arrived = false;
    for _ in 0..700 {
        let feet = sim.feet(id).expect("feet");
        let dx = x - feet.x;
        let dz = z - feet.z;
        if dx.hypot(dz) < 0.8 {
            arrived = true;
            break;
        }
        let d = dx.hypot(dz).max(0.001);
        sim.step(&InputFrame { move_dir: Vec2::new(dx / d, dz / d), ..Default::default() });
    }
    assert!(arrived, "never reached the floatie mat");
    sim.step(&press(buttons::CONFIRM));
    let s = status(&sim);
    assert_eq!(s["event"], "floatie", "{s}");
    assert!(matches!(s["phase"].as_str(), Some("card" | "countdown" | "event")), "{}", s["phase"]);
}

#[test]
fn view_and_save_tabs_change_the_stay() {
    let mut sim = boot("fit", 3);
    {
        let g = sim.state.play.as_mut().unwrap().get_mut::<FitGame>().unwrap();
        g.day = 4;
        g.stamps = 3;
        g.day_minutes = 9;
        g.name = "Gray".into();
    }
    sim.step(&press(buttons::PAUSE));
    pick(&mut sim, "View");
    pick(&mut sim, "Input");
    pick(&mut sim, "Dot");
    pick(&mut sim, "Engine");
    pick(&mut sim, "Free");
    pick(&mut sim, "Ghost");
    let view = status(&sim)["view"].clone();
    assert_eq!(view["input"], true, "{view}");
    assert_eq!(view["stats"], true, "{view}");
    assert_eq!(view["free"], true, "{view}");
    assert_eq!(view["lanes"], true, "{view}");
    pick(&mut sim, "Back");
    pick(&mut sim, "Save");
    pick(&mut sim, "Reset Gray");
    let s = status(&sim);
    assert_eq!(s["day"], 1, "{s}");
    assert_eq!(s["stamps"], 0);
    assert_eq!(s["minutes"], 0);
    assert_eq!(s["name"], "Gray");
    assert_eq!(s["view"]["lanes"], true, "reset cleared the viewer");
    pick(&mut sim, "Back");
    pick(&mut sim, "Jump");
    pick(&mut sim, "Pose Parade");
    assert_eq!(status(&sim)["event"], "pose");
    for _ in 0..8 {
        sim.step(&InputFrame::default());
    }
    let ui = ui_of(&sim);
    assert!(!ui.trace.is_empty(), "dot trace stayed empty");
    assert!(ui.overlay.contains("Lean"), "{}", ui.overlay);
    assert!(ui.overlay.contains("Tick"), "{}", ui.overlay);
    assert!(ui.camera_yaw.is_some());
    assert!(status(&sim)["view"]["trace"].as_u64().unwrap_or(0) > 0);
}
