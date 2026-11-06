//! Wii Fine: the bot plays the whole game, every event, the core, the check, the shell.

use pav_core::games::Outcome;
use pav_core::games::fit::FitGame;
use pav_core::{InputFrame, Sim};

fn game(sim: &Sim) -> &FitGame {
    sim.play().unwrap().get::<FitGame>().unwrap()
}

fn game_mut(sim: &mut Sim) -> &mut FitGame {
    sim.state.play.as_mut().unwrap().get_mut::<FitGame>().unwrap()
}

#[test]
fn the_bot_plays_new_stay_to_the_credits() {
    for seed in [1u64, 2, 3] {
        let mut sim = Sim::new("fit", seed).unwrap();
        let mut last = String::new();
        let mut ticks = 0u64;
        let limit = 60 * 60 * 60;
        while sim.outcome() == Outcome::Playing && ticks < limit {
            let f = sim.bot_input();
            sim.step(&f);
            ticks += 1;
            if ticks % 600 == 0 {
                let st = sim.play().unwrap().status(&sim);
                last = st.to_string();
            }
        }
        let g = game(&sim);
        assert_eq!(sim.outcome(), Outcome::Won, "seed {seed} after {ticks} ticks: {last}");
        assert_eq!(g.guest().stamps, 5, "seed {seed}");
        assert!(g.guest().finished);
    }
}

/// Plays an event scene to its end with `pick` choosing the input each tick; returns the score.
fn play_event(key: &str, seed: u64, pick: &mut dyn FnMut(&Sim, u64) -> InputFrame) -> (i32, u64) {
    let mut sim = Sim::new(&format!("fit/event/{key}"), seed).unwrap();
    let mut ticks = 0u64;
    loop {
        // pass the card and count with CONFIRM taps, then hand over to the picker
        let g = game(&sim);
        let screen = format!("{:?}", g.top());
        if screen == "Result" {
            let p = g.play.as_ref().unwrap();
            return (p.score, ticks);
        }
        let f = match screen.as_str() {
            "Card" => InputFrame { pressed: pav_core::input::buttons::CONFIRM, ..Default::default() },
            "Count" => InputFrame::default(),
            _ => pick(&sim, ticks),
        };
        sim.step(&f);
        ticks += 1;
        assert!(ticks < 60 * 400, "{key} seed {seed} never finished");
    }
}

const KEYS: [&str; 11] = [
    "breath_bloom", "pose_parade", "tempo_squats", "plank_standoff", "step_party", "floatie_spin", "morning_lap", "tide_table",
    "paddle_slalom", "tray_trek", "cannonball_cup",
];

#[test]
fn every_event_bot_earns_two_stars_and_idle_earns_none() {
    let mut report = String::new();
    for key in KEYS {
        for seed in 1..=5u64 {
            let (bot, _) = play_event(key, seed, &mut |sim, _| sim.bot_input());
            let (idle, _) = play_event(key, seed, &mut |_, _| InputFrame::default());
            report += &format!("{key} seed {seed}: bot {bot}, idle {idle}\n");
            assert!(bot >= 650, "{key} seed {seed}: bot only {bot}\n{report}");
            assert!(idle < 400, "{key} seed {seed}: idle got {idle}\n{report}");
        }
    }
}

#[test]
#[ignore]
fn print_scores() {
    for key in KEYS {
        let mut line = format!("{key:16}");
        for seed in 1..=3u64 {
            let (bot, t) = play_event(key, seed, &mut |sim, _| sim.bot_input());
            let (idle, _) = play_event(key, seed, &mut |_, _| InputFrame::default());
            let (rnd, _) = play_event(key, seed, &mut |_, n| {
                let a = ((n * 2654435761) % 1000) as f32 / 1000.0 * 6.283;
                let b = pav_core::input::buttons::ACT | pav_core::input::buttons::STEP_L;
                InputFrame { lean: glam::Vec2::new(a.cos(), a.sin()) * 0.7, held: if n % 90 < 45 { b } else { 0 }, pressed: if n % 45 == 0 { b } else { 0 }, ..Default::default() }
            });
            line += &format!(" | bot {bot:4} idle {idle:4} rnd {rnd:4} ({}s)", t / 60);
        }
        println!("{line}");
    }
}

// ------------------------------------------------------------------ the Balance Core

use pav_core::games::fit::core::{BalanceCore, CoreRules, shape_stick};
use pav_core::rng::Rng;

fn settle_time(lean: glam::Vec2) -> f32 {
    let r = CoreRules { wobble: 0.0, kick: 0.0, ..Default::default() };
    let mut rng = Rng::new(1);
    let mut c = BalanceCore::new(&mut rng);
    for _ in 0..120 {
        c.step(&r, lean, glam::Vec2::ZERO, 1.0 / 60.0, &mut rng);
    }
    // release and count ticks until the dot is within 0.03 of the middle
    let mut n = 0;
    while c.cob.length() > 0.03 && n < 600 {
        c.step(&r, glam::Vec2::ZERO, glam::Vec2::ZERO, 1.0 / 60.0, &mut rng);
        n += 1;
    }
    n as f32 / 60.0
}

#[test]
fn the_core_feels_like_a_body() {
    let t = settle_time(glam::Vec2::new(1.0, 0.0));
    assert!(t > 0.2 && t < 0.8, "release settles in {t}s");
    // a held full lean does not tip by itself
    let r = CoreRules { wobble: 0.0, kick: 0.0, ..Default::default() };
    let mut rng = Rng::new(2);
    let mut c = BalanceCore::new(&mut rng);
    let mut tipped = false;
    for _ in 0..600 {
        tipped |= c.step(&r, glam::Vec2::new(1.0, 0.0), glam::Vec2::ZERO, 1.0 / 60.0, &mut rng);
    }
    assert!(!tipped && c.cob.length() < 1.0);
    // a gust on top of it does
    c.gust = glam::Vec2::new(40.0, 0.0);
    let mut tipped_at = None;
    for i in 0..120 {
        if c.step(&r, glam::Vec2::new(1.0, 0.0), glam::Vec2::ZERO, 1.0 / 60.0, &mut rng) {
            tipped_at = Some(i);
            break;
        }
    }
    assert!(tipped_at.is_some(), "a gust on a full lean tips");
}

#[test]
fn left_alone_the_dot_wanders_a_little() {
    let r = CoreRules::default();
    let mut rng = Rng::new(3);
    let mut c = BalanceCore::new(&mut rng);
    let (mut sum, mut max) = (0.0, 0.0f32);
    for _ in 0..3600 {
        c.step(&r, glam::Vec2::ZERO, glam::Vec2::ZERO, 1.0 / 60.0, &mut rng);
        sum += c.cob.length();
        max = max.max(c.cob.length());
    }
    assert!(sum / 3600.0 < 0.08, "mean radius {}", sum / 3600.0);
    assert!(max < 0.2, "max radius {max}");
}

#[test]
fn a_tip_needs_tip_time_outside_the_disc() {
    let r = CoreRules { wobble: 0.0, kick: 0.0, ..Default::default() };
    let mut rng = Rng::new(4);
    let mut c = BalanceCore::new(&mut rng);
    c.cob = glam::Vec2::new(1.1, 0.0);
    c.gust = glam::Vec2::new(60.0, 0.0);
    let mut ticks = 0;
    loop {
        ticks += 1;
        if c.step(&r, glam::Vec2::new(1.0, 0.0), glam::Vec2::ZERO, 1.0 / 60.0, &mut rng) || ticks > 200 {
            break;
        }
    }
    assert!(ticks as f32 / 60.0 >= r.tip_time - 0.02 && ticks < 200, "tip after {ticks} ticks");
}

#[test]
fn the_stick_curve_makes_small_motions_fine() {
    assert_eq!(shape_stick(glam::Vec2::new(0.1, 0.0), 0.12, 1.5), glam::Vec2::ZERO);
    let half = shape_stick(glam::Vec2::new(0.5, 0.0), 0.12, 1.5).x;
    assert!(half < 0.3, "half a stick is {half}");
    assert!((shape_stick(glam::Vec2::new(1.0, 0.0), 0.12, 1.5).x - 1.0).abs() < 1e-3);
}

// ------------------------------------------------------------------ the check, the shell, the meta

fn press(b: u32) -> InputFrame {
    InputFrame { pressed: b, held: b, ..Default::default() }
}

fn step_n(sim: &mut Sim, n: usize, f: &InputFrame) {
    for _ in 0..n {
        sim.step(f);
    }
}

/// A new game at the island with the intro and the first check done by the bot.
fn at_island(seed: u64) -> Sim {
    let mut sim = Sim::new("fit", seed).unwrap();
    for _ in 0..60 * 120 {
        let top = game(&sim).top().name();
        if top == "Island" && game(&sim).guest().checked_today {
            break;
        }
        let f = sim.bot_input();
        sim.step(&f);
    }
    sim
}

#[test]
fn a_better_check_gives_a_lower_balance_age() {
    let run = |quality: f32| -> i32 {
        let mut sim = Sim::new("fit", 5).unwrap();
        pav_core::games::fit::with_game(&mut sim, |g| g.autoplay = false);
        for _ in 0..60 * 200 {
            let top = game(&sim).top().name();
            if top == "Island" && game(&sim).guest().checked_today {
                break;
            }
            let mut f = sim.bot_input();
            if top == "CheckTest" {
                // a careless player adds noise to what the bot would press
                let t = sim.state.tick as f32;
                f.lean += glam::Vec2::new((t * 0.31).sin(), (t * 0.23).cos()) * (1.0 - quality);
                if quality < 0.5 {
                    f.pressed &= !(pav_core::input::buttons::STEP_L | pav_core::input::buttons::STEP_R);
                }
            }
            sim.step(&f);
        }
        game(&sim).age_today
    };
    let good = run(1.0);
    let bad = run(0.0);
    assert!(good < bad, "good {good} bad {bad}");
    assert!((18..=99).contains(&good) && (18..=99).contains(&bad));
}

#[test]
fn pause_freezes_the_world_and_resumes() {
    let mut sim = at_island(6);
    let before = sim.state.tick;
    let pos = game(&sim).guest().minutes;
    step_n(&mut sim, 1, &press(pav_core::input::buttons::PAUSE));
    step_n(&mut sim, 2, &InputFrame::default());
    assert_eq!(game(&sim).top().name(), "Pause");
    let p0 = sim.feet(sim.state.player.unwrap()).unwrap();
    step_n(&mut sim, 30, &InputFrame { move_dir: glam::Vec2::X, ..Default::default() });
    let p1 = sim.feet(sim.state.player.unwrap()).unwrap();
    assert!((p1 - p0).length() < 0.01, "walked while paused: {}", (p1 - p0).length());
    assert!(sim.state.tick > before);
    let _ = pos;
    step_n(&mut sim, 1, &press(pav_core::input::buttons::BACK));
    step_n(&mut sim, 2, &InputFrame::default());
    assert_eq!(game(&sim).top().name(), "Island");
    step_n(&mut sim, 30, &InputFrame { move_dir: glam::Vec2::X, ..Default::default() });
    let p2 = sim.feet(sim.state.player.unwrap()).unwrap();
    assert!((p2 - p1).length() > 0.3, "walks again after resume");
}

#[test]
fn settings_default_music_is_ten_percent() {
    let sim = Sim::new("fit", 1).unwrap();
    assert!((game(&sim).save.settings.music - 0.10).abs() < 1e-6);
}

#[test]
fn dev_sliders_change_values_and_reset() {
    let mut sim = Sim::new("fit", 1).unwrap();
    let list0 = {
        let mut r = game(&sim).rules.clone();
        pav_core::params::list(&mut r)
    };
    assert!(list0.len() > 60, "{} tunables", list0.len());
    pav_core::games::fit::with_game(&mut sim, |g| {
        pav_core::params::set(&mut g.rules, "core.stiffness", pav_core::params::ParamValue::Float(55.0)).unwrap();
        assert!((g.rules.core.stiffness - 55.0).abs() < 1e-4);
        g.rules = pav_core::games::fit::rules::Rules::default();
        assert!((g.rules.core.stiffness - 40.0).abs() < 1e-4);
    });
}

#[test]
fn the_save_round_trips_and_versions() {
    let sim = at_island(7);
    let json = game(&sim).save_json();
    let back = pav_core::games::fit::meta::Save::from_json(&json).expect("reads");
    assert_eq!(back.guests[0].ages, game(&sim).guest().ages);
    assert_eq!(back.guests[0].minutes, game(&sim).guest().minutes);
    let broken = json.replacen("\"version\":1", "\"version\":99", 1);
    assert!(pav_core::games::fit::meta::Save::from_json(&broken).is_none());
    assert!(pav_core::games::fit::meta::Save::from_json("{not json").is_none());
}

#[test]
fn attract_starts_after_ten_idle_seconds_cycles_and_saves_nothing() {
    let mut sim = Sim::new("fit", 8).unwrap();
    let serial = game(&sim).save.serial;
    step_n(&mut sim, 599, &InputFrame::default());
    assert_eq!(game(&sim).top().name(), "Title");
    step_n(&mut sim, 3, &InputFrame::default());
    assert_eq!(game(&sim).top().name(), "Attract");
    // every event shows up in turn
    let mut seen = std::collections::BTreeSet::new();
    for _ in 0..60 * 60 * 4 {
        sim.step(&InputFrame::default());
        if let Some(p) = game(&sim).play.as_ref() {
            seen.insert(pav_core::games::fit::events::spec(p.kind).key);
        }
    }
    assert!(seen.len() >= 9, "attract showed {seen:?}");
    assert_eq!(game(&sim).save.serial, serial, "attract saved something");
    assert!(game(&sim).frame_ui_demo(&sim));
    // any input exits
    step_n(&mut sim, 1, &InputFrame { any: true, ..Default::default() });
    assert_eq!(game(&sim).top().name(), "Title");
    assert!(game(&sim).play.is_none());
}

#[test]
fn dev_jump_lands_where_it_says() {
    let mut sim = Sim::new("fit", 9).unwrap();
    pav_core::games::fit::with_game(&mut sim, |g| {
        g.save.guests[0].used = true;
    });
    let mut sim2 = Sim::new("fit/event/cannonball_cup", 9).unwrap();
    assert_eq!(game(&sim2).set, 7);
    assert!(game(&sim2).play.is_some());
    step_n(&mut sim2, 2, &InputFrame::default());
    let _ = sim;
}

#[test]
fn the_medley_gives_the_same_score_for_the_same_inputs() {
    let run = || -> i32 {
        let mut sim = Sim::new("fit/medley", 11).unwrap();
        pav_core::games::fit::with_game(&mut sim, |g| g.seed = 77);
        for _ in 0..60 * 300 {
            let held = pav_core::input::buttons::HUB_GO;
            let mut f = sim.bot_input();
            f.held |= held;
            sim.step(&f);
            if game(&sim).medley.as_ref().map(|m| m.done).unwrap_or(false) {
                break;
            }
        }
        game(&sim).medley.as_ref().unwrap().total()
    };
    let (a, b) = (run(), run());
    assert_eq!(a, b);
    assert!(a > 1200, "the bot's medley total {a}");
}

#[test]
fn play_together_completes_with_a_podium() {
    let mut sim = Sim::new("fit", 12).unwrap();
    let mut ticks = 0;
    // Title -> Play Together (index 2) with two guests
    step_n(&mut sim, 5, &InputFrame::default());
    pav_core::games::fit::with_game(&mut sim, |g| {
        g.focus = 2;
    });
    step_n(&mut sim, 1, &press(pav_core::input::buttons::CONFIRM));
    step_n(&mut sim, 3, &InputFrame::default());
    assert_eq!(game(&sim).top().name(), "Together");
    pav_core::games::fit::with_game(&mut sim, |g| g.focus = 1);
    step_n(&mut sim, 1, &press(pav_core::input::buttons::CONFIRM));
    step_n(&mut sim, 3, &InputFrame::default());
    while game(&sim).top().name() != "Podium" && ticks < 60 * 60 * 20 {
        let f = sim.bot_input();
        sim.step(&f);
        ticks += 1;
    }
    assert_eq!(game(&sim).top().name(), "Podium", "after {ticks} ticks");
    assert_eq!(game(&sim).medley.as_ref().unwrap().totals.len(), 2);
}

#[test]
fn snapshots_rewind_and_replays_are_exact() {
    let mut sim = Sim::new("fit", 3).unwrap();
    for _ in 0..600 {
        let f = sim.bot_input();
        sim.step(&f);
    }
    let mut bytes = Vec::new();
    ciborium::into_writer(&sim.snapshot(), &mut bytes).unwrap();
    let state: pav_core::SimState = ciborium::from_reader(bytes.as_slice()).unwrap();
    let mut copy = Sim::new("fit", 3).unwrap();
    copy.restore(state);
    assert_eq!(copy.state_hash(), sim.state_hash());
    for _ in 0..600 {
        let (a, b) = (sim.bot_input(), copy.bot_input());
        sim.step(&a);
        copy.step(&b);
    }
    assert_eq!(copy.state_hash(), sim.state_hash());
    let (tick, hash) = (sim.state.tick, sim.state_hash());
    assert!(sim.rewind_to(tick - 90));
    assert!(sim.rewind_to(tick));
    assert_eq!(sim.state_hash(), hash);
    let mut again = Sim::new("fit", 3).unwrap();
    for f in sim.recording.iter() {
        again.step(f);
    }
    assert_eq!(again.state_hash(), hash);
}

#[test]
fn the_script_has_no_placeholders_and_enough_lines() {
    let script = include_str!("../src/games/fit/script.toml").to_string();
    for bad in ["TODO", "FIXME", "lorem", "placeholder", "XXX"] {
        assert!(!script.to_lowercase().contains(&bad.to_lowercase()), "script has {bad}");
    }
    let s = pav_core::games::fit::meta::Script::parse(&script).unwrap();
    let count = |prefix: &str| -> usize { s.lines.iter().filter(|(k, _)| k.starts_with(prefix)).map(|(_, v)| v.len()).sum() };
    assert!(count("pip") >= 80, "Pip has {} lines", count("pip"));
    for coach in ["posey", "kettle", "bounce", "gull"] {
        let own = count(&format!("coach.{coach}"));
        let tips: usize = pav_core::games::fit::events::ALL_KINDS
            .iter()
            .map(|k| pav_core::games::fit::events::spec(*k))
            .filter(|sp| sp.coach == coach)
            .map(|sp| s.all(&format!("tips.{}.a", sp.key)).len())
            .sum();
        assert!(own + tips >= 25, "{coach} has {} lines", own + tips);
    }
    assert!(count("titles") >= 30, "{} titles", count("titles"));
    // every event has a card, rules and a bot (the star tests run them); a card line for each
    for k in pav_core::games::fit::events::ALL_KINDS {
        let sp = pav_core::games::fit::events::spec(k);
        assert!(!s.all(&format!("tips.{}.a", sp.key)).is_empty(), "no tips for {}", sp.key);
        assert!(!s.all(&format!("coach.{}.intro", sp.coach)).is_empty(), "no intro for {}", sp.coach);
    }
}

#[test]
#[ignore]
fn dbg_playthrough() {
    let mut sim = Sim::new("fit", 1).unwrap();
    let mut last = String::new();
    for t in 0..60 * 60 * 40u64 {
        let f = sim.bot_input();
        sim.step(&f);
        let g = game(&sim);
        let now = format!("{} day{} min{} stamps{} ages{:?} chk{} fin{}", g.top().name(), g.guest().day, g.guest().minutes, g.guest().stamps, g.guest().ages, g.guest().checked_today, g.guest().finished);
        if now != last && t % 1 == 0 {
            if last.split(' ').next() != now.split(' ').next() || t % 600 == 0 {
                println!("{t}: {now}");
            }
            last = now;
        }
        if sim.outcome() != Outcome::Playing { break; }
    }
}

/// A feel pass with a human-like player: the bot's input, about 65 ms late and with noise.
#[test]
#[ignore]
fn feel_pass() {
    for key in KEYS {
        let mut line = format!("{key:16}");
        for noise in [0.0f32, 0.25, 0.5] {
            let mut hist: std::collections::VecDeque<InputFrame> = Default::default();
            let (s, _) = play_event(key, 1, &mut |sim, n| {
                let mut f = sim.bot_input();
                let t = n as f32;
                f.lean += glam::Vec2::new((t * 0.37).sin(), (t * 0.29).cos()) * noise;
                hist.push_back(f);
                if hist.len() > 4 { hist.pop_front().unwrap() } else { InputFrame::default() }
            });
            line += &format!(" | noise {noise:.2}: {s:4}");
        }
        println!("{line}");
    }
}
