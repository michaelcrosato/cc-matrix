//! We Stand with no window, GPU or browser: the bot plays the whole game, every event earns stars
//! for the bot and not for doing nothing, and the systems around them hold.

use glam::Vec2;
use pav_core::games::Outcome;
use pav_core::games::fit::events::{ALL_EVENTS, EvKind};
use pav_core::games::fit::menus::MenuKind;
use pav_core::games::fit::run::Phase;
use pav_core::games::fit::ui_model::{B, Ui};
use pav_core::games::fit::*;
use pav_core::input::{UiEvent, buttons as btn};
use pav_core::rng::Rng;
use pav_core::{InputFrame, Sim, SimState};

fn game(sim: &Sim) -> &FitGame {
    sim.play().unwrap().get::<FitGame>().unwrap()
}

fn game_mut(sim: &mut Sim) -> &mut FitGame {
    sim.state.play.as_mut().unwrap().get_mut::<FitGame>().unwrap()
}

fn run_event(kind: EvKind, seed: u64, mut input: impl FnMut(&Sim) -> InputFrame) -> u32 {
    let mut sim = Sim::new(&format!("fit/event/{}", kind.key()), seed).unwrap();
    for _ in 0..60 * 200 {
        if game(&sim).run.as_ref().is_some_and(|r| r.phase == Phase::Result) {
            return game(&sim).run.as_ref().unwrap().score;
        }
        let f = input(&sim);
        sim.step(&f);
    }
    panic!("{kind:?} seed {seed} never finished");
}

fn texts(sim: &mut Sim) -> Vec<String> {
    let f = sim.frame();
    B::texts(&f.hud.fit.unwrap().items)
}

#[test]
fn the_bot_plays_new_stay_to_credits() {
    for seed in [1, 2, 3] {
        let mut sim = Sim::new("fit", seed).unwrap();
        let (outcome, ticks) = sim.run_bot(60 * 60 * 60);
        let g = game(&sim);
        let status = g.status_json(&sim);
        assert_eq!(outcome, Outcome::Won, "seed {seed}, {ticks} ticks: {status}");
        let guest = g.guest().unwrap();
        assert_eq!(guest.stamps, 5, "{status}");
        assert!(guest.free_play);
        for k in ALL_EVENTS {
            assert!(guest.bests.contains_key(k.key()), "never played {k:?}");
        }
        assert!(guest.bests.contains_key("stand"), "never played the Big Stand");
        assert!(guest.age().unwrap() <= 40, "{:?}", guest.ages);
    }
}

#[test]
fn each_event_rewards_the_bot_and_not_idling_or_flailing() {
    let mut bad = Vec::new();
    for k in ALL_EVENTS {
        let mut bot_min = u32::MAX;
        let mut bot_max = 0;
        for seed in 1..=5 {
            let s = run_event(k, seed, |sim| sim.bot_input());
            bot_min = bot_min.min(s);
            bot_max = bot_max.max(s);
        }
        let idle = run_event(k, 1, |_| InputFrame::default());
        let mut rng = Rng::new(9);
        let careless = run_event(k, 1, |_| {
            let mut f = InputFrame { lean: Vec2::new(rng.range(-1.0, 1.0), rng.range(-1.0, 1.0)), ..Default::default() };
            if rng.f32() < 0.05 {
                f.pressed = btn::CONFIRM | btn::STEP_L;
                f.held = f.pressed;
            }
            if rng.f32() < 0.05 {
                f.pressed |= btn::STEP_R;
                f.held |= btn::STEP_R;
            }
            f
        });
        println!("{k:?}: bot {bot_min}..{bot_max}, idle {idle}, careless {careless}");
        if bot_min < 650 || idle >= 400 || careless >= bot_min {
            bad.push(format!("{k:?}: bot {bot_min}..{bot_max}, idle {idle}, careless {careless}"));
        }
    }
    assert!(bad.is_empty(), "{}", bad.join("; "));
}

#[test]
fn the_big_stand_can_be_played_and_broken() {
    let mut sim = Sim::new("fit/stand", 1).unwrap();
    for _ in 0..60 * 400 {
        if game(&sim).run.as_ref().is_some_and(|r| r.phase == Phase::Result) {
            break;
        }
        let f = sim.bot_input();
        sim.step(&f);
    }
    let run = game(&sim).run.as_ref().unwrap();
    assert_eq!(run.phase, Phase::Result, "{}", game(&sim).status_json(&sim));
    assert!(run.score > 700, "bot's stand: {}", run.score);
    // Pressing anything in the Long Stillness forfeits Inner Peace.
    let mut sim = Sim::new("fit/stand/4", 1).unwrap();
    game_mut(&mut sim).run.as_mut().unwrap().phase = Phase::Play;
    for t in 0..60 * 60 {
        if game(&sim).run.as_ref().is_some_and(|r| r.phase == Phase::Result) {
            break;
        }
        let mut f = InputFrame::default();
        if t == 300 {
            f.any = true;
            f.pressed = btn::CONFIRM;
            f.held = btn::CONFIRM;
        }
        sim.step(&f);
    }
    let run = game(&sim).run.as_ref().unwrap();
    assert_eq!(run.phase, Phase::Result);
    let t = texts(&mut sim).join(" ");
    assert!(!t.is_empty());
    if let pav_core::games::fit::run::Body::Stand(f) = &game(&sim).run.as_ref().unwrap().body {
        assert!(!f.peace, "a press should forfeit the bonus");
    }
}

#[test]
fn balance_core_feels_like_a_body() {
    use pav_core::games::fit::core::*;
    use pav_core::games::fit::rules::CoreRules;
    let mut r = CoreRules { wobble: 0.0, kick: 0.0, ..Default::default() };
    let mut rng = Rng::new(1);
    let mut c = BalanceCore::new(&mut rng);
    let dt = 1.0 / 60.0;
    let mut t90 = None;
    let mut peak = 0.0f32;
    for k in 0..180 {
        c.tick(Vec2::X, &r, &mut rng, dt);
        peak = peak.max(c.cob.x);
        if t90.is_none() && c.cob.x >= r.reach * 0.9 {
            t90 = Some(k as f32 * dt);
        }
    }
    let t90 = t90.unwrap();
    println!("90% in {t90:.3} s, peak {:.3} of reach", peak / r.reach);
    assert!((0.3..0.5).contains(&t90), "90% in {t90}");
    assert!(peak < r.reach * 1.08, "overshoot {peak}");
    let mut settle = None;
    for k in 0..180 {
        c.tick(Vec2::ZERO, &r, &mut rng, dt);
        if settle.is_none() && c.cob.length() < 0.05 {
            settle = Some(k as f32 * dt);
        }
    }
    println!("settles in {settle:?}");
    assert!(settle.unwrap() < 0.6, "settle {settle:?}");
    // Left alone, it wanders a little.
    r = CoreRules::default();
    let mut c = BalanceCore::new(&mut rng);
    let (mut sum, mut far) = (0.0, 0.0f32);
    for _ in 0..1200 {
        c.tick(Vec2::ZERO, &r, &mut rng, dt);
        sum += c.cob.length();
        far = far.max(c.cob.length());
    }
    let mean = sum / 1200.0;
    println!("idle wander: mean {mean:.3}, max {far:.3}");
    assert!((0.02..0.08).contains(&mean), "mean wander {mean}");
    assert!(far < 0.12, "max wander {far}");
    // A gust pushes it out, and it tips after tip_time.
    let mut c = BalanceCore::new(&mut rng);
    c.gust = Vec2::new(40.0, 0.0);
    let mut tipped_at = None;
    for k in 0..200 {
        if c.tick(Vec2::X, &r, &mut rng, dt) {
            tipped_at = Some(k);
            break;
        }
    }
    assert!(tipped_at.is_some());
    // Stick curve and keys.
    assert_eq!(shape_stick(Vec2::new(0.1, 0.0), 0.12, 1.5), Vec2::ZERO);
    assert!(shape_stick(Vec2::new(0.5, 0.0), 0.12, 1.5).x < 0.4);
    assert!((shape_stick(Vec2::X, 0.12, 1.5).x - 1.0).abs() < 1e-3);
    let up = ramp_keys(Vec2::ZERO, Vec2::X, 1.6, 1.2, 0.25);
    assert!((up.x - 0.4).abs() < 1e-3);
    let down = ramp_keys(up, Vec2::ZERO, 1.6, 1.2, 0.25);
    assert!((down.x - 0.1).abs() < 1e-3);
}

#[test]
fn better_input_gives_a_lower_age_within_bounds() {
    use pav_core::games::fit::meta::balance_age;
    assert!(balance_age(0.9, 0, 0) < balance_age(0.5, 0, 0));
    assert_eq!(balance_age(0.5, 0, 0), 50);
    assert_eq!(balance_age(0.2, 0, 0), 68);
    assert!(balance_age(1.0, 9, 99) >= 18);
    assert!(balance_age(0.0, 0, 0) <= 99);
    // The morning check itself: the bot scores well, and doing nothing does not.
    let measure = |bot: bool| {
        let mut sim = Sim::new("fit/day/1", 1).unwrap();
        let mut ev = Vec::new();
        let mut g = sim.state.play.take().unwrap();
        g.get_mut::<FitGame>().unwrap().start_check(&mut sim, &mut ev);
        sim.state.play = Some(g);
        for _ in 0..60 * 120 {
            if game(&sim).mode != Mode::Check {
                break;
            }
            let f = if bot { sim.bot_input() } else { InputFrame::default() };
            sim.step(&f);
        }
        assert_ne!(game(&sim).mode, Mode::Check);
        game(&sim).check.as_ref().unwrap().skill()
    };
    let (a, b) = (measure(true), measure(false));
    assert!(a > 0.8, "bot's skill {a}");
    assert!(b < a - 0.2, "idle skill {b} against {a}");
}

#[test]
fn attract_starts_cycles_exits_and_saves_nothing() {
    let mut sim = Sim::new("fit", 2).unwrap();
    let serial = game(&sim).save_serial;
    let idle = InputFrame::default();
    for _ in 0..ATTRACT_AFTER - 2 {
        sim.step(&idle);
    }
    assert!(game(&sim).attract.is_none());
    for _ in 0..4 {
        sim.step(&idle);
    }
    assert!(game(&sim).attract.is_some(), "attract after 10 s");
    let mut seen = Vec::new();
    for _ in 0..60 * 200 {
        sim.step(&idle);
        let g = game(&sim);
        if let Some(r) = &g.run {
            let name = r.name();
            if !seen.contains(&name) {
                seen.push(name);
            }
        }
    }
    assert!(seen.len() >= 10, "{seen:?}");
    assert_eq!(game(&sim).save_serial, serial);
    sim.step(&InputFrame { any: true, ..Default::default() });
    assert!(game(&sim).attract.is_none());
    assert_eq!(game(&sim).mode, Mode::Title);
    assert!(game(&sim).run.is_none());
}

#[test]
fn pause_freezes_and_settings_default_and_dev_tools_work() {
    let mut sim = Sim::new("fit/event/pose", 1).unwrap();
    assert!((game(&sim).save.settings.music - 0.10).abs() < 1e-6);
    assert!((sim.frame().hud.fit.unwrap().music - 0.10).abs() < 1e-6);
    for _ in 0..60 {
        sim.step(&InputFrame::default());
    }
    let t = game(&sim).run.as_ref().unwrap().t;
    let press = |b| InputFrame { held: b, pressed: b, any: true, ..Default::default() };
    sim.step(&press(btn::PAUSE));
    assert!(game(&sim).paused);
    let pos = sim.feet(sim.state.player.unwrap());
    for _ in 0..60 {
        sim.step(&InputFrame::default());
    }
    assert_eq!(game(&sim).run.as_ref().unwrap().t, t, "pause must freeze the event");
    assert_eq!(sim.feet(sim.state.player.unwrap()), pos);
    // Dev Mode: a slider changes a number, reset puts it back.
    let m = game(&sim).menus.last().copied().unwrap();
    let dev = game(&sim).menu_items(&m).iter().position(|i| matches!(i.act, menus::Act::DevOpen)).unwrap();
    sim.step(&InputFrame { ui: Some(UiEvent::Click(dev as u16)), any: true, ..Default::default() });
    assert_eq!(game(&sim).menus.last().unwrap().kind, MenuKind::Dev);
    sim.step(&InputFrame { ui: Some(UiEvent::Click(1003)), any: true, ..Default::default() });
    let before = game(&sim).rules.core.stiffness;
    let m = game(&sim).menus.last().copied().unwrap();
    let items = game(&sim).menu_items(&m);
    let slider = items.iter().position(|i| matches!(&i.act, menus::Act::Param(p, _, _) if p == "core.stiffness")).unwrap();
    sim.step(&InputFrame { ui: Some(UiEvent::Slider(slider as u16, 0.9)), any: true, ..Default::default() });
    assert_ne!(game(&sim).rules.core.stiffness, before);
    let reset = items.iter().position(|i| matches!(i.act, menus::Act::ResetAll)).unwrap();
    sim.step(&InputFrame { ui: Some(UiEvent::Click(reset as u16)), any: true, ..Default::default() });
    assert_eq!(game(&sim).rules.core.stiffness, before);
    // Single step advances a paused event by exactly one tick.
    let before = game(&sim).run.as_ref().unwrap().t;
    sim.step(&InputFrame { ui: Some(UiEvent::Click(1002)), any: true, ..Default::default() });
    let m = game(&sim).menus.last().copied().unwrap();
    let step = game(&sim).menu_items(&m).iter().position(|i| matches!(i.act, menus::Act::Step)).unwrap();
    sim.step(&InputFrame { ui: Some(UiEvent::Click(step as u16)), any: true, ..Default::default() });
    assert!(game(&sim).run.as_ref().unwrap().t > before, "single step");
    let after = game(&sim).run.as_ref().unwrap().t;
    sim.step(&InputFrame::default());
    assert_eq!(game(&sim).run.as_ref().unwrap().t, after, "one step only");
    // Dev jump lands where it says.
    sim.step(&InputFrame { ui: Some(UiEvent::Click(1000)), any: true, ..Default::default() });
    let m = game(&sim).menus.last().copied().unwrap();
    let items = game(&sim).menu_items(&m);
    let tide = items.iter().position(|i| matches!(i.act, menus::Act::JumpEvent(EvKind::Tide))).unwrap();
    sim.step(&InputFrame { ui: Some(UiEvent::Click(tide as u16)), any: true, ..Default::default() });
    assert_eq!(game(&sim).run.as_ref().unwrap().kind, Some(EvKind::Tide));
    assert!(!game(&sim).paused);
}

#[test]
fn saves_round_trip_and_refuse_other_versions() {
    let mut sim = Sim::new("fit/event/breath", 1).unwrap();
    for _ in 0..60 * 80 {
        let f = sim.bot_input();
        sim.step(&f);
        if game(&sim).save_serial > 0 {
            break;
        }
    }
    let frame = sim.frame().hud.fit.unwrap();
    let (serial, text) = frame.save.clone().unwrap();
    assert!(serial > 0);
    let back = meta::Save::parse(&text);
    let (a, b) = (back.guests[0].as_ref().unwrap(), game(&sim).save.guests[0].as_ref().unwrap());
    assert_eq!(a.bests, b.bests);
    assert_eq!(a.minutes, b.minutes);
    assert_eq!(back.settings, game(&sim).save.settings);
    assert!(a.ghosts.get("breath").is_some_and(|g| !g.is_empty()));
    assert!(back.guests[0].as_ref().unwrap().bests.contains_key("breath"));
    let other = text.replace("\"version\":1", "\"version\":99");
    assert_eq!(meta::Save::parse(&other), meta::Save::default());
    assert_eq!(meta::Save::parse("not json"), meta::Save::default());
}

#[test]
fn medley_is_the_same_for_the_same_inputs_and_play_together_completes() {
    let play = |seed| {
        let mut sim = Sim::new("fit/medley", seed).unwrap();
        for _ in 0..60 * 400 {
            if game(&sim).mode == Mode::HubDone {
                break;
            }
            let f = sim.bot_input();
            sim.step(&f);
        }
        assert_eq!(game(&sim).mode, Mode::HubDone, "{}", game(&sim).status_json(&sim));
        game(&sim).medley_total()
    };
    assert_eq!(play(7), play(7));
    assert!(play(8) > 1500);

    // Two guests on one pad, through the menus.
    let mut sim = Sim::new("fit", 3).unwrap();
    let click = |sim: &mut Sim, want: &dyn Fn(&menus::Act) -> bool| {
        let m = game(sim).menus.last().copied().unwrap();
        let i = game(sim).menu_items(&m).iter().position(|x| want(&x.act)).unwrap();
        sim.step(&InputFrame { ui: Some(UiEvent::Click(i as u16)), any: true, ..Default::default() });
    };
    click(&mut sim, &|a| matches!(a, menus::Act::Together));
    click(&mut sim, &|a| matches!(a, menus::Act::TogetherGo));
    let mut passes = 0;
    let mut saw_ghost = false;
    for _ in 0..60 * 800 {
        let g = game(&sim);
        if g.mode == Mode::Podium {
            break;
        }
        if g.run.as_ref().is_some_and(|r| !r.ghosts.is_empty()) {
            saw_ghost = true;
        }
        if g.mode == Mode::PassPad {
            passes += 1;
        }
        let f = sim.bot_input();
        sim.step(&f);
    }
    assert_eq!(game(&sim).mode, Mode::Podium);
    assert!(passes > 0, "a pass-the-pad card between players");
    assert!(saw_ghost, "the second player sees the first as a ghost");
    let frame = sim.frame();
    let objects_ok = frame.hud.fit.is_some();
    assert!(objects_ok);
}

#[test]
fn ghosts_draw_where_they_should() {
    let mut sim = Sim::new("fit/event/pose", 1).unwrap();
    let n0 = sim.frame().objects.len();
    // A best run from a past day, and a stay on Day 3.
    let g = game_mut(&mut sim);
    g.guest_mut().day = 3;
    g.guest_mut().ghosts.insert("pose".into(), vec![pav_core::games::fit::ghost::Sample { p: [400.0, 0.0, 30.0], ..Default::default() }]);
    let mut ev = Vec::new();
    let mut p = sim.state.play.take().unwrap();
    p.get_mut::<FitGame>().unwrap().start_event(&mut sim, EvKind::Pose, run::RunCtx::Stay, &mut ev);
    sim.state.play = Some(p);
    let f = sim.frame();
    assert!(f.objects.iter().any(|o| o.id.0 >= pav_core::games::fit::ghost::FIRST_ID), "{n0} objects");
}

#[test]
fn snapshots_and_replays_are_exact() {
    let mut sim = Sim::new("fit/event/tide", 3).unwrap();
    sim.history.enabled = true;
    for _ in 0..240 {
        let f = sim.bot_input();
        sim.step(&f);
    }
    let mut bytes = Vec::new();
    ciborium::into_writer(&sim.snapshot(), &mut bytes).unwrap();
    let state: SimState = ciborium::from_reader(bytes.as_slice()).unwrap();
    let mut copy = Sim::new("fit/event/tide", 3).unwrap();
    copy.restore(state);
    assert_eq!(copy.state_hash(), sim.state_hash());
    for _ in 0..240 {
        let (a, b) = (sim.bot_input(), copy.bot_input());
        sim.step(&a);
        copy.step(&b);
    }
    assert_eq!(copy.state_hash(), sim.state_hash());
    let (tick, hash) = (sim.state.tick, sim.state_hash());
    assert!(sim.rewind_to(tick - 90));
    assert!(sim.rewind_to(tick));
    assert_eq!(sim.state_hash(), hash);
    let mut again = Sim::new("fit/event/tide", 3).unwrap();
    for f in sim.recording.iter() {
        again.step(f);
    }
    assert_eq!(again.state_hash(), hash);
}

#[test]
fn no_text_is_under_the_size_rule_and_screens_are_not_dense() {
    use pav_core::games::fit::ui_model::{MIN_BODY, MIN_TITLE};
    let mut sim = Sim::new("fit", 5).unwrap();
    // Walks the whole game by bot, reading every frame.
    let mut screens = std::collections::BTreeSet::new();
    for t in 0..60 * 60 * 60 {
        if sim.outcome() != Outcome::Playing {
            break;
        }
        let f = sim.bot_input();
        sim.step(&f);
        let name = menus::screen_name(game(&sim));
        let fresh = screens.insert(name);
        if t % 30 != 0 && !fresh {
            continue;
        }
        let frame = sim.frame();
        let ui = frame.hud.fit.unwrap();
        let mut buttons = 0;
        for i in &ui.items {
            match i {
                Ui::Text { size, title, text, .. } => {
                    let min = if *title { MIN_TITLE } else { MIN_BODY };
                    assert!(*size >= min, "{text}: {size}");
                }
                Ui::Button { id, .. } if *id < 900 => buttons += 1,
                _ => {}
            }
        }
        assert!(buttons <= 6, "{} buttons on {}", buttons, ui.screen);
    }
    // The first frames show the title before the bot's first press.
    screens.insert("title");
    for s in ["title", "name", "look", "dialog", "check", "report", "island", "schedule", "card", "count", "event", "result", "stamp", "ending", "credits"] {
        assert!(screens.contains(s), "the bot never saw {s}: {screens:?}");
    }
}

#[test]
fn content_is_complete() {
    use pav_core::games::fit::script as sc;
    let s = sc::script();
    let pip: usize = s.lines.iter().filter(|(k, _)| k.starts_with("pip_") || *k == "intro").map(|(_, v)| v.len()).sum();
    for c in ["MESH2MOTION/Victory", "CMU/Hop_One_Foot_Loop", "MESH2MOTION/Jumping Jacks", "CMU/Stretch_Yawn", "MESH2MOTION/Cheering_Two_Hands", "MESH2MOTION/Sitting_Idle", "QUATERNIUS/Dance_Loop"] {
        assert!(pav_core::clips::find(c).is_some(), "{c}");
    }
    assert!(pip >= 80, "Pip has {pip} lines");
    for k in ["coach_0", "coach_1", "coach_2", "coach_3"] {
        assert!(sc::lines(k).len() >= 25, "{k}");
    }
    assert!(s.titles.len() >= 30);
    assert!((30..=50).contains(&s.names.len()));
    for (k, v) in &s.lines {
        for l in v {
            let low = l.to_lowercase();
            for bad in ["todo", "placeholder", "tbd", "lorem", "fixme"] {
                assert!(!low.contains(bad), "{k}: {l}");
            }
            for bad in ["wii", "mii", "nintendo", "balance board", "bmi", "weight loss", "diet"] {
                assert!(!low.contains(bad), "{k}: {l}");
            }
        }
    }
    // Every event has a card, rules and a bot.
    for k in ALL_EVENTS {
        assert!(!run::goal(Some(k)).is_empty());
        assert!(!run::how_to(Some(k)).is_empty());
    }
    let notes: usize = events::step::chart_bars().iter().map(|b| b.chars().filter(|c| *c != '.').count()).sum();
    assert!(notes >= 95, "{notes} notes");
    // Every clip the game names exists.
    for c in ["Breath", "Squat", "Tree", "Warrior", "Lighthouse", "DeckChair", "Bridge", "Seated", "ArmFlail", "Stumble", "StepL", "StepR", "HipCircle", "CarryTray", "Tuck", "DiveEntry", "Flop", "Bow", "Sleep", "Wake", "Sigh", "Plank", "Paddle"] {
        assert!(pav_core::clips::find(&format!("FIT/{c}")).is_some(), "FIT/{c}");
    }
    for c in ["MESH2MOTION/Jog", "CMU/Wave_Hello"] {
        assert!(pav_core::clips::find(c).is_some(), "{c}");
    }
}

#[test]
fn every_prop_the_game_names_loads() {
    let names = ["fit_palm", "fit_mat", "fit_stepbox", "fit_board", "fit_tower", "fit_paddleboard", "fit_buoy", "fit_raft", "fit_pool", "fit_shell", "fit_bumper", "fit_tray", "fit_smoothie", "fit_ring", "fit_chair", "fit_umbrella", "fit_cabana", "fit_desk", "fit_pavilion", "fit_calendar", "fit_clam", "fit_flipflop", "fit_gull", "fit_wing", "fit_cap", "fit_card", "fit_lotus", "fit_smallraft", "fit_towels", "fit_towel", "fit_crab", "fit_ribbon", "fit_post", "fit_guidepost", "fit_pier", "fit_lamp", "rowboat"];
    let mut bad = Vec::new();
    for n in names {
        if let Err(e) = pav_core::props::resolve_placed(&format!("LIB/core/{n}"), &pav_core::props::Params::new()) {
            bad.push(format!("{n}: {e}"));
        }
    }
    assert!(bad.is_empty(), "{}", bad.join("\n"));
}

#[test]
fn ghosts_match_by_area() {
    use pav_core::games::fit::ghost::same_area;
    assert!(same_area(1, Some(1)));
    assert!(!same_area(1, Some(2)));
    assert!(!same_area(-1, Some(-1)), "no event, no ghosts");
    assert!(!same_area(0, None));
    // The status a copy sends carries its area: the leg it is on, or -1 between.
    let mut sim = Sim::new("fit/medley", 3).unwrap();
    sim.step(&sim.bot_input());
    assert_eq!(game(&sim).status_json(&sim)["hub"]["ghost"]["area"], 0);
}

#[test]
fn events_run_about_as_long_as_the_plan_says() {
    let run = |k: EvKind| {
        let mut sim = Sim::new(&format!("fit/event/{}", k.key()), 1).unwrap();
        for t in 0..60 * 200 {
            if game(&sim).run.as_ref().is_some_and(|r| r.phase == Phase::Result) {
                return t as f32 / 60.0;
            }
            let f = sim.bot_input();
            sim.step(&f);
        }
        panic!("{k:?}");
    };
    for (k, lo, hi) in [(EvKind::Breath, 40.0, 50.0), (EvKind::Pose, 55.0, 65.0), (EvKind::Squats, 45.0, 56.0), (EvKind::Plank, 45.0, 65.0), (EvKind::Step, 58.0, 70.0), (EvKind::Spin, 45.0, 55.0), (EvKind::Lap, 70.0, 100.0), (EvKind::Paddle, 35.0, 60.0), (EvKind::Tray, 45.0, 60.0), (EvKind::Cannon, 25.0, 50.0)] {
        let s = run(k);
        println!("{k:?}: {s:.0} s");
        assert!((lo..=hi).contains(&s), "{k:?} took {s}");
    }
    // Tide Table's 60 s is a limit: the bot may finish early.
    assert!(run(EvKind::Tide) <= 61.0);
    // The Morning Check, about 70 s.
    let mut sim = Sim::new("fit/day/1", 1).unwrap();
    let mut ev = Vec::new();
    let mut g = sim.state.play.take().unwrap();
    g.get_mut::<FitGame>().unwrap().start_check(&mut sim, &mut ev);
    sim.state.play = Some(g);
    let mut t = 0;
    while game(&sim).mode == Mode::Check && t < 60 * 200 {
        let f = sim.bot_input();
        sim.step(&f);
        t += 1;
    }
    let s = t as f32 / 60.0;
    println!("Morning Check: {s:.0} s");
    assert!((50.0..=85.0).contains(&s), "check took {s}");
}
