//! Whiff Fit plays itself: the bot goes from New Stay to the credits, every event earns its
//! stars, idle input doesn't, and everything stays exact.

use glam::Vec2;
use pav_core::games::fit::events::{ALL, EventKind};
use pav_core::games::fit::meta::{Guest, SaveData, Settings};
use pav_core::games::fit::rules::Rules;
use pav_core::games::fit::run::RunPhase;
use pav_core::games::fit::{FitGame, Flow, Overlay, script};
use pav_core::input::{UiEvent, buttons as b};
use pav_core::{InputFrame, Sim, SimState};

fn game(sim: &Sim) -> &FitGame {
    sim.play().unwrap().get::<FitGame>().unwrap()
}
fn game_mut(sim: &mut Sim) -> &mut FitGame {
    sim.state.play.as_mut().unwrap().get_mut::<FitGame>().unwrap()
}
fn press(sim: &mut Sim, bit: u32) {
    sim.step(&InputFrame { held: bit, pressed: bit, any: true, ..Default::default() });
    sim.step(&InputFrame::default());
}
fn screen(sim: &Sim) -> String {
    game(sim).screen_name()
}

/// Plays an event from its card to its result with an input function; returns the score.
fn play_event(kind: EventKind, seed: u64, mut input: impl FnMut(&Sim) -> InputFrame) -> f32 {
    let mut sim = Sim::new(&format!("fit/event/{}", kind.key()), seed).unwrap();
    assert_eq!(screen(&sim), "card", "{kind:?}");
    sim.run(20, &InputFrame::default());
    press(&mut sim, b::CONFIRM);
    for _ in 0..60 * 60 * 6 {
        let i = input(&sim);
        sim.step(&i);
        if let Flow::Event(r) = &game(&sim).flow {
            if r.phase == RunPhase::Result {
                return r.out.score;
            }
        } else {
            panic!("{kind:?} left the event");
        }
    }
    panic!("{kind:?} on seed {seed} never ended");
}

#[test]
fn each_event_bot_earns_two_stars_on_five_seeds() {
    for kind in ALL {
        for seed in 1..=5 {
            let s = play_event(kind, seed, |sim| game(sim).bot_input(sim));
            assert!(Rules::default().stars_for(kind, s) >= 2, "{kind:?} seed {seed}: the bot scored {s}");
            if kind == EventKind::PlankStandoff {
                assert!(s >= 750.0, "seed {seed}: the bot should hold 45 s, scored {s}");
            }
        }
    }
}

#[test]
fn each_event_idle_earns_under_a_star() {
    for kind in ALL {
        let s = play_event(kind, 3, |_| InputFrame::default());
        assert!(s < 400.0, "{kind:?}: idle scored {s}");
    }
}

#[test]
fn careless_input_earns_less_than_the_bot() {
    for kind in ALL {
        let mut rng = pav_core::rng::Rng::new(77);
        let mut held = 0u32;
        let bot = play_event(kind, 2, |sim| game(sim).bot_input(sim));
        let careless = play_event(kind, 2, |_| {
            let mut f = InputFrame::default();
            let mut pressed = 0;
            for bit in [b::CONFIRM, b::STEP_L, b::STEP_R] {
                if rng.f32() < 0.03 {
                    held ^= bit;
                    if held & bit != 0 {
                        pressed |= bit;
                    }
                }
            }
            f.held = held;
            f.pressed = pressed;
            f.lean = Vec2::new(rng.range(-1.0, 1.0), rng.range(-1.0, 1.0));
            f
        });
        assert!(careless < bot, "{kind:?}: careless {careless}, bot {bot}");
    }
}

/// Plays with the bot until `until` is true, or panics.
fn run_bot_until(sim: &mut Sim, ticks: u64, until: impl Fn(&Sim) -> bool) {
    for _ in 0..ticks {
        if until(sim) {
            return;
        }
        let f = sim.bot_input();
        sim.step(&f);
    }
    panic!("not there after {ticks} ticks: screen {} status {}", screen(sim), game(sim).status_json(sim));
}

#[test]
fn the_bot_plays_new_stay_to_credits() {
    for seed in [1u64, 2, 3] {
        let mut sim = Sim::new("fit", seed).unwrap();
        let (outcome, ticks) = sim.run_bot(60 * 60 * 60);
        let g = game(&sim);
        let guest = g.guest().unwrap_or_else(|| panic!("no guest: {}", g.status_json(&sim)));
        assert_eq!(outcome, pav_core::games::Outcome::Won, "seed {seed}, {ticks} ticks: {}", g.status_json(&sim));
        assert!(guest.stamps >= 5, "{} stamps", guest.stamps);
        for k in ALL {
            assert!(guest.played.iter().any(|p| p == k.key()), "{k:?} not played");
        }
        assert!(guest.played.iter().any(|p| p == "big_stand"));
        assert!(ticks < 60 * 60 * 60, "under an hour of sim time: {ticks}");
        assert!(guest.free_play());
    }
}

#[test]
fn balance_core_feel() {
    use pav_core::games::fit::core::BalanceCore;
    let r = Rules::default().core;
    let mut rng = pav_core::rng::Rng::new(5);
    let dt = 1.0 / 60.0;
    // Full lean reaches 90% in about 0.4 s.
    let mut c = BalanceCore::new(&mut rng);
    let mut t90 = None;
    for i in 0..60 {
        c.step(Vec2::X, &r, 0.0, Vec2::ZERO, Vec2::ZERO, true, dt, &mut rng);
        if t90.is_none() && c.cob.x > 0.9 * r.reach {
            t90 = Some(i as f32 * dt);
        }
    }
    let t90 = t90.expect("reaches");
    assert!((0.2..0.6).contains(&t90), "90% at {t90}");
    // Released, it settles in about half a second.
    for _ in 0..40 {
        c.step(Vec2::ZERO, &r, 0.0, Vec2::ZERO, Vec2::ZERO, true, dt, &mut rng);
    }
    assert!(c.cob.length() < 0.1, "settled to {}", c.cob.length());
    // Left alone, it wanders only a little.
    let mut sum = 0.0;
    let mut most = 0.0f32;
    for _ in 0..1200 {
        c.step(Vec2::ZERO, &r, 1.0, Vec2::ZERO, Vec2::ZERO, true, dt, &mut rng);
        sum += c.cob.length();
        most = most.max(c.cob.length());
    }
    let mean = sum / 1200.0;
    assert!(mean < 0.12, "mean radius {mean}");
    // Pushed past the edge, it tips after tip_time.
    let mut c = BalanceCore::new(&mut rng);
    c.cob = Vec2::new(1.3, 0.0);
    let mut tipped_at = None;
    for i in 0..60 {
        c.step(Vec2::new(1.0, 0.0), &r, 0.0, Vec2::new(60.0, 0.0), Vec2::ZERO, true, dt, &mut rng);
        if c.tipped {
            tipped_at = Some(i as f32 * dt);
            break;
        }
    }
    let at = tipped_at.expect("tips");
    assert!((at - r.tip_time).abs() < 0.1, "tipped at {at}");
    // A held full lean alone doesn't tip.
    let mut c = BalanceCore::new(&mut rng);
    for _ in 0..600 {
        c.step(Vec2::X, &r, 0.0, Vec2::ZERO, Vec2::ZERO, true, dt, &mut rng);
    }
    assert_eq!(c.tips, 0);
}

#[test]
fn better_input_gives_a_lower_age_and_bounds_hold() {
    use pav_core::games::fit::meta::balance_age;
    let r = Rules::default().check;
    assert!(balance_age(0.9, 0, 0, &r) < balance_age(0.2, 0, 0, &r));
    assert_eq!(balance_age(0.5, 0, 0, &r), 50);
    assert!(balance_age(1.0, 5, 99, &r) >= 18);
    assert!(balance_age(0.0, 0, 0, &r) <= 99);
    // The check itself: the bot beats doing nothing.
    let age_of = |bot: bool| {
        let mut sim = Sim::new("fit", 11).unwrap();
        run_bot_until(&mut sim, 60 * 120, |s| matches!(game(s).flow, Flow::Check(_)));
        while matches!(game(&sim).flow, Flow::Check(_)) {
            let f = if bot { sim.bot_input() } else { InputFrame::default() };
            sim.step(&f);
        }
        game(&sim).guest().unwrap().ages[0]
    };
    let (good, idle) = (age_of(true), age_of(false));
    assert!(good < idle, "bot {good}, idle {idle}");
}

#[test]
fn attract_starts_cycles_exits_and_saves_nothing() {
    let mut sim = Sim::new("fit", 4).unwrap();
    let serial = game(&sim).save_serial;
    for _ in 0..598 {
        sim.step(&InputFrame::default());
    }
    assert_eq!(screen(&sim), "title");
    for _ in 0..4 {
        sim.step(&InputFrame::default());
    }
    assert_eq!(screen(&sim), "attract");
    // Every segment comes round, and then the loop does.
    let mut seen = std::collections::BTreeSet::new();
    for _ in 0..60 * 240 {
        sim.step(&InputFrame::default());
        if let Flow::Attract(a) = &game(&sim).flow {
            seen.insert(a.seg);
            if a.cycles > 0 {
                break;
            }
        }
    }
    assert_eq!(seen.len(), 14, "{seen:?}");
    assert_eq!(game(&sim).save_serial, serial, "saved nothing");
    // Any input exits to the title.
    for _ in 0..600 {
        sim.step(&InputFrame::default());
    }
    assert_eq!(screen(&sim), "attract");
    sim.step(&InputFrame { any: true, ..Default::default() });
    assert_eq!(screen(&sim), "title");
}

#[test]
fn pause_freezes_the_world_and_menus_still_run() {
    let mut sim = Sim::new("fit/event/pose_parade", 1).unwrap();
    sim.run(20, &InputFrame::default());
    press(&mut sim, b::CONFIRM);
    for _ in 0..240 {
        let f = sim.bot_input();
        sim.step(&f);
    }
    press(&mut sim, b::PAUSE);
    assert_eq!(screen(&sim), "pause");
    let t = if let Flow::Event(r) = &game(&sim).flow { r.c.t } else { panic!() };
    let pos = sim.feet(game(&sim).pid);
    for _ in 0..120 {
        sim.step(&InputFrame::default());
    }
    let t2 = if let Flow::Event(r) = &game(&sim).flow { r.c.t } else { panic!() };
    assert_eq!(t, t2);
    assert_eq!(pos, sim.feet(game(&sim).pid));
    let f0 = game(&sim).focus;
    press(&mut sim, b::MENU_DOWN);
    assert_eq!(game(&sim).focus, f0 + 1);
    press(&mut sim, b::PAUSE);
    assert_eq!(screen(&sim), "event");
}

#[test]
fn settings_default_music_to_ten_percent() {
    assert!((Settings::default().music - 0.10).abs() < 1e-6);
    let sim = Sim::new("fit", 1).unwrap();
    let f = sim.play().unwrap().ui_frame(&sim).unwrap();
    assert!((f.music - 0.10).abs() < 1e-6);
}

#[test]
fn dev_sliders_change_values_and_reset() {
    let mut sim = Sim::new("fit", 1).unwrap();
    let was = game(&sim).rules.core.stiffness;
    let g = game_mut(&mut sim);
    g.push_overlay(Overlay::Dev);
    g.dev.tab = 3;
    let m = g.menu().unwrap();
    let slider = m.items.iter().position(|i| matches!(i.act, pav_core::games::fit::menus::MAct::DevParam(_))).unwrap();
    g.focus = slider;
    press(&mut sim, b::MENU_RIGHT);
    assert_ne!(game(&sim).rules.core.stiffness, was);
    let m = game(&sim).menu().unwrap();
    let all = m.items.iter().position(|i| i.act == pav_core::games::fit::menus::MAct::DevResetAll).unwrap();
    game_mut(&mut sim).focus = all;
    press(&mut sim, b::CONFIRM);
    assert_eq!(game(&sim).rules.core.stiffness, was);
    // Pointer: a slider drag.
    game_mut(&mut sim).focus = 0;
    sim.step(&InputFrame { ui: Some(UiEvent::Slider(slider as u16, 1.0)), ..Default::default() });
    assert!(game(&sim).rules.core.stiffness > was);
}

#[test]
fn dev_jump_lands_where_it_says() {
    let mut sim = Sim::new("fit", 1).unwrap();
    let g = game_mut(&mut sim);
    g.push_overlay(Overlay::Dev);
    let m = g.menu().unwrap();
    let t = m.items.iter().position(|i| i.act == pav_core::games::fit::menus::MAct::DevEvent(EventKind::TrayTrek)).unwrap();
    sim.step(&InputFrame { ui: Some(UiEvent::Click(t as u16)), ..Default::default() });
    assert_eq!(screen(&sim), "card");
    assert!(matches!(&game(&sim).flow, Flow::Event(r) if r.kind == EventKind::TrayTrek));
}

#[test]
fn saves_round_trip_with_a_version() {
    let mut s = SaveData::default();
    s.settings.music = 0.33;
    s.slots[1] = Some(Guest { name: "Doug".into(), day: 3, ..Default::default() });
    let text = s.to_json();
    let back = SaveData::parse(&text).unwrap();
    assert_eq!(back, s);
    assert!(SaveData::parse("{\"version\": 99}").is_none());
    assert!(SaveData::parse("nonsense").is_none());
}

fn medley_score(seed: u64) -> (f32, u64) {
    let mut sim = Sim::new("fit/medley", seed).unwrap();
    assert_eq!(screen(&sim), "medley_wait");
    sim.step(&InputFrame { held: b::HUB_GO, ..Default::default() });
    for _ in 0..60 * 400 {
        let mut f = sim.bot_input();
        f.held |= b::HUB_GO;
        sim.step(&f);
        if let Flow::Medley(m) = &game(&sim).flow {
            if m.phase == pav_core::games::fit::medley::MPhase::Done {
                return (m.total(0), sim.state_hash());
            }
        }
    }
    panic!("medley never finished: {}", game(&sim).status_json(&sim));
}

#[test]
fn a_medley_on_a_seed_is_the_same_score_for_the_same_inputs() {
    let (a, h1) = medley_score(5);
    let (b, h2) = medley_score(5);
    assert_eq!(a, b);
    assert_eq!(h1, h2);
    assert!(a > 1000.0, "the bot's medley: {a}");
}

#[test]
fn play_together_completes_with_ghosts() {
    let mut sim = Sim::new("fit", 9).unwrap();
    game_mut(&mut sim).start_together_for_test();
    let mut saw_ghost = false;
    for _ in 0..60 * 900 {
        let f = sim.bot_input();
        sim.step(&f);
        let g = game(&sim);
        if let Flow::Medley(m) = &g.flow {
            if let Some(r) = &m.run {
                saw_ghost |= !r.ghosts.is_empty();
            }
            if m.phase == pav_core::games::fit::medley::MPhase::Podium {
                assert!(saw_ghost, "the second guest saw the first");
                assert_eq!(m.players.len(), 2);
                assert!(sim.frame().objects.len() > 3);
                return;
            }
        }
    }
    panic!("never reached the podium: {}", game(&sim).status_json(&sim));
}

#[test]
fn snapshots_rewind_and_replays_are_exact() {
    let mut sim = Sim::new("fit", 3).unwrap();
    sim.history.enabled = true;
    for _ in 0..240 {
        let f = sim.bot_input();
        sim.step(&f);
    }
    let mut bytes = Vec::new();
    ciborium::into_writer(&sim.snapshot(), &mut bytes).unwrap();
    let state: SimState = ciborium::from_reader(bytes.as_slice()).unwrap();
    let mut copy = Sim::new("fit", 3).unwrap();
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
    let mut again = Sim::new("fit", 3).unwrap();
    for f in sim.recording.iter() {
        again.step(f);
    }
    assert_eq!(again.state_hash(), hash);
}

#[test]
fn the_script_is_long_enough_and_has_no_placeholders() {
    let s = script::all();
    let count = |prefix: &str| s.iter().filter(|(k, _)| k.starts_with(prefix)).map(|(_, v)| v.len()).sum::<usize>();
    assert!(count("pip.") >= 80, "Pip has {}", count("pip."));
    for coach in ["posey.", "kettle.", "bounce.", "gull."] {
        assert!(count(coach) >= 25, "{coach} has {}", count(coach));
    }
    for guest in ["marjorie.", "tom.", "twins."] {
        assert!(count(guest) >= 8, "{guest} has {}", count(guest));
    }
    assert!(s["titles"].len() >= 30);
    assert!(s["names"].len() >= 35);
    for (k, v) in &s {
        for line in v {
            for bad in ["TODO", "FIXME", "placeholder", "lorem", "Nintendo", "Wii", " Mii"] {
                assert!(!line.contains(bad), "{k}: {line}");
            }
        }
    }
    for e in ALL {
        assert!(s.contains_key(&format!("card.{}", e.key())), "{e:?} has no card");
    }
    // At most 2 lines on screen at 10 feet (about 118 letters in the dialogue card).
    for (k, v) in &s {
        if k.starts_with("card.") {
            continue;
        }
        for line in v {
            assert!(line.chars().count() <= 118, "{k} is too long for two lines: {line}");
        }
    }
    // The six named titles the plan gives Pip.
    for t in ["Human Soup", "Acceptable Human", "Certified Lean-To", "Wobble Enthusiast", "Seasoned Tilter", "Stillness Intern", "Professional Standing Person", "Alarmingly Balanced"] {
        assert!(s["titles"].iter().any(|x| x == t), "{t}");
    }
}

#[test]
fn every_screen_keeps_the_text_size_rule() {
    use pav_core::games::fit::ui_model::{MIN_TEXT, Node};
    let mut sim = Sim::new("fit", 2).unwrap();
    let mut screens = std::collections::BTreeSet::new();
    for _ in 0..60 * 60 * 40 {
        // Sampled before the bot moves on, so the very first screen counts.
        if sim.state.tick % 20 != 0 && sim.state.tick > 200 {
            let f = sim.bot_input();
            sim.step(&f);
            continue;
        }
        let f = sim.bot_input();
        let ui = sim.play().unwrap().ui_frame(&sim).unwrap();
        screens.insert(ui.screen.clone());
        for n in ui.nodes.iter().chain(ui.top.iter()) {
            if let Node::Text { size, text, .. } = n {
                assert!(*size >= MIN_TEXT, "{} too small on {}", text, ui.screen);
                assert!(!text.contains('{') && !text.contains("1 minutes"), "unfilled on {}: {text}", ui.screen);
            }
        }
        if sim.outcome() != pav_core::games::Outcome::Playing {
            break;
        }
        sim.step(&f);
    }
    for want in ["title", "slots", "names", "look", "dialog", "check", "report", "island", "schedule", "events", "card", "count", "event", "result", "stamp", "credits"] {
        assert!(screens.contains(want), "never saw {want}: {screens:?}");
    }
}

/// The bot with a person's reaction time and unsteady hands: what a decent first try might do.
fn humanish(kind: EventKind, seed: u64, lean_lag: usize, press_lag: usize, shake: f32) -> f32 {
    let mut leans = std::collections::VecDeque::new();
    let mut presses: std::collections::VecDeque<(u32, u32)> = std::collections::VecDeque::new();
    let mut rng = pav_core::rng::Rng::new(seed * 31);
    let (mut nx, mut ny) = (0.0f32, 0.0f32);
    play_event(kind, seed, move |sim| {
        let bot = game(sim).bot_input(sim);
        leans.push_back(bot.lean);
        presses.push_back((bot.held, bot.pressed));
        nx += (rng.range(-1.0, 1.0) - nx) * 0.08;
        ny += (rng.range(-1.0, 1.0) - ny) * 0.08;
        let lean = if leans.len() > lean_lag { leans.pop_front().unwrap() } else { Vec2::ZERO };
        let (held, pressed) = if presses.len() > press_lag { presses.pop_front().unwrap() } else { (0, 0) };
        InputFrame { lean: (lean + Vec2::new(nx, ny) * shake).clamp_length_max(1.0), held, pressed, ..Default::default() }
    })
}

/// Prints the balance table: `cargo test -p pav_core --test fit scores -- --ignored --nocapture`.
#[test]
#[ignore]
fn scores() {
    for kind in ALL {
        let bots: Vec<i32> = (1..=2).map(|s| play_event(kind, s, |sim| game(sim).bot_input(sim)) as i32).collect();
        let idle = play_event(kind, 3, |_| InputFrame::default()) as i32;
        let decent: Vec<i32> = (1..=3).map(|s| humanish(kind, s, 12, 4, 0.12) as i32).collect();
        let shaky: Vec<i32> = (1..=3).map(|s| humanish(kind, s, 20, 8, 0.3) as i32).collect();
        println!("{:<16} bot {:?} decent {:?} shaky {:?} idle {}", kind.key(), bots, decent, shaky, idle);
    }
}

/// A guest at the start of a day, on the island.
fn island_sim(day: u8) -> Sim {
    let mut sim = Sim::new("fit", 21).unwrap();
    {
        let g = game_mut(&mut sim);
        g.save.slots[0] = Some(Guest { name: "Doug".into(), day, stamps: day - 1, checked: true, ages: vec![50], last_date: 100, ..Default::default() });
        g.slot = Some(0);
    }
    with_game(&mut sim, |g, sim, ev| {
        g.to_island(sim, ev);
        g.refresh_flips(sim);
    });
    sim
}

/// Runs `f` with the game out of the sim, as a hook does.
fn with_game(sim: &mut Sim, f: impl FnOnce(&mut FitGame, &mut Sim, &mut Vec<pav_core::SimEvent>)) {
    let mut boxed = sim.state.play.take().unwrap();
    let mut ev = Vec::new();
    f(boxed.get_mut::<FitGame>().unwrap(), sim, &mut ev);
    sim.state.play = Some(boxed);
}

#[test]
fn both_endings_roll_credits_and_open_free_play() {
    for (morning, kind) in [(30u8, 1u8), (70, 2)] {
        let mut sim = island_sim(5);
        game_mut(&mut sim).guest_mut().unwrap().ages = vec![morning];
        with_game(&mut sim, |g, sim, ev| g.start_event(sim, ev, EventKind::BigStand));
        sim.run(20, &InputFrame::default());
        press(&mut sim, b::CONFIRM);
        sim.run(200, &InputFrame::default());
        game_mut(&mut sim).dev.win_now = true;
        sim.run(90, &InputFrame::default());
        assert_eq!(screen(&sim), "result");
        run_bot_until(&mut sim, 60 * 120, |s| s.outcome() == pav_core::games::Outcome::Won);
        let guest = game(&sim).guest().unwrap().clone();
        assert_eq!(guest.ending, kind, "morning {morning}, final {}", guest.final_age);
        assert!(guest.free_play());
        assert_eq!(screen(&sim), "island");
        // Free Play: everything is open.
        assert!(game(&sim).spot_open(pav_core::games::fit::island::Spot::Mat(3)));
    }
}

#[test]
fn flip_flops_go_to_tom_for_a_golden_reward() {
    let mut sim = island_sim(2);
    let flips = game(&sim).flips.clone();
    assert_eq!(flips.len(), 5, "five to find");
    let pid = game(&sim).pid;
    for (_, _, at) in flips {
        sim.set_position(pid, at);
        sim.run(3, &InputFrame::default());
    }
    assert_eq!(game(&sim).guest().unwrap().flipflops.count_ones(), 5);
    assert!(game(&sim).flips.is_empty());
    let tom = game(&sim).spots.iter().position(|s| s.spot == pav_core::games::fit::island::Spot::Talk(pav_core::games::fit::dialog::Who::Tom)).unwrap();
    with_game(&mut sim, |g, sim, ev| g.use_spot(tom, sim, ev));
    assert!(game(&sim).guest().unwrap().golden);
    assert!(game(&sim).dialog.is_some());
    let look = pav_core::games::fit::meta::guest_look(game(&sim).guest().unwrap());
    assert_eq!(look.shoes, "#ffcf4a");
}

#[test]
fn walking_clicking_talking_and_waving_on_the_island() {
    let mut sim = island_sim(1);
    let pid = game(&sim).pid;
    let start = sim.feet(pid).unwrap();
    // The stick walks; the sea stops you.
    for _ in 0..600 {
        sim.step(&InputFrame { move_dir: Vec2::new(1.0, 0.0), ..Default::default() });
    }
    let east = sim.feet(pid).unwrap();
    assert!(east.x > start.x + 5.0, "walked: {east}");
    assert!(pav_core::games::fit::island::on_land(east, game(&sim).stages[0]), "stayed ashore: {east}");
    // A click walks there, then uses what's there.
    let pip = game(&sim).spots.iter().find(|s| s.spot == pav_core::games::fit::island::Spot::Talk(pav_core::games::fit::dialog::Who::Pip)).unwrap();
    let at = sim.feet(pip.id.unwrap()).unwrap();
    sim.step(&InputFrame { aim: Some(at), held: b::PRIMARY, pressed: b::PRIMARY, any: true, ..Default::default() });
    for _ in 0..60 * 30 {
        sim.step(&InputFrame { aim: Some(at), ..Default::default() });
        if game(&sim).dialog.is_some() {
            break;
        }
    }
    assert!(game(&sim).dialog.is_some(), "the click reached Pip: {}", sim.feet(pid).unwrap());
    // Wave.
    game_mut(&mut sim).dialog = None;
    press(&mut sim, b::WAVE);
    assert!(game(&sim).wave_t > 0.0);
    // Schedule.
    press(&mut sim, b::SCHEDULE);
    assert_eq!(screen(&sim), "schedule");
    assert_eq!(game(&sim).top_overlay(), Some(Overlay::Schedule(-1)));
}

#[test]
fn the_wardrobe_unlocks_with_minutes() {
    let mut sim = island_sim(2);
    with_game(&mut sim, |g, _, _| g.push_overlay(Overlay::Wardrobe));
    assert_eq!(screen(&sim), "wardrobe");
    press(&mut sim, b::MENU_RIGHT);
    assert_eq!(game(&sim).guest().unwrap().wear.hat, 0, "nothing unlocked with no minutes");
    game_mut(&mut sim).guest_mut().unwrap().minutes = 50;
    press(&mut sim, b::MENU_RIGHT);
    assert_eq!(game(&sim).guest().unwrap().wear.hat, 1, "the sun cap");
    // Back out to the island's camera.
    press(&mut sim, b::BACK);
    assert_eq!(screen(&sim), "island");
}

#[test]
fn pip_counts_the_days_you_were_away() {
    let mut sim = Sim::new("fit", 1).unwrap();
    {
        let g = game_mut(&mut sim);
        g.boot.today = 110;
        g.save.slots[0] = Some(Guest { name: "Doug".into(), day: 2, last_date: 108, ages: vec![50], checked: true, ..Default::default() });
    }
    with_game(&mut sim, |g, sim, ev| g.activate(pav_core::games::fit::menus::MAct::Slot(0), sim, ev));
    let d = game(&sim).dialog.clone().expect("Pip speaks");
    assert!(d.lines[0].contains('2'), "{}", d.lines[0]);
    assert_eq!(game(&sim).guest().unwrap().last_date, 110);
}

#[test]
fn yesterday_you_appears_from_day_three() {
    for (day, want) in [(2u8, false), (3, true)] {
        let mut sim = island_sim(day);
        let frames = vec![pav_core::games::fit::ghost::GFrame::default(); 50];
        game_mut(&mut sim).guest_mut().unwrap().best_ghost.insert("step_party".into(), frames);
        with_game(&mut sim, |g, sim, ev| g.start_event(sim, ev, EventKind::StepParty));
        let Flow::Event(r) = &game(&sim).flow else { panic!() };
        assert_eq!(!r.ghosts.is_empty(), want, "day {day}");
        sim.run(20, &InputFrame::default());
        press(&mut sim, b::CONFIRM);
        sim.run(30, &InputFrame::default());
        let n = sim.frame().objects.iter().filter(|o| o.id.0 >= 0x7000_0000).count();
        assert_eq!(n > 0, want, "day {day}: {n} ghost figures");
    }
}

#[test]
fn hub_status_is_what_the_page_reads() {
    let mut sim = Sim::new("fit/medley", 7).unwrap();
    let v = game(&sim).status_json(&sim);
    assert_eq!(v["hub"]["label"], "Warming up");
    assert_eq!(v["hub"]["ghost"]["area"], -1);
    // Pause has only Resume and Settings there, and doesn't freeze the world.
    press(&mut sim, b::PAUSE);
    let m = game(&sim).menu().unwrap();
    assert_eq!(m.items.len(), 2);
    assert!(!sim.play().unwrap().frozen());
    press(&mut sim, b::PAUSE);
    sim.step(&InputFrame { held: b::HUB_GO, ..Default::default() });
    let mut held = 0;
    while held < 400 {
        let mut f = sim.bot_input();
        f.held |= b::HUB_GO;
        sim.step(&f);
        held += 1;
    }
    let v = game(&sim).status_json(&sim);
    assert_eq!(v["hub"]["ghost"]["area"], 0, "{v}");
    assert_eq!(v["hub"]["label"], "Paddle Slalom");
}

#[test]
fn touch_only_attract_keeps_settings_open_and_the_bot_plays() {
    let mut sim = Sim::new("fit", 2).unwrap();
    game_mut(&mut sim).boot.touch_only = true;
    sim.run(3, &InputFrame::default());
    assert_eq!(screen(&sim), "attract");
    // The card says what it should.
    let ui = sim.play().unwrap().ui_frame(&sim).unwrap();
    let says = ui.nodes.iter().chain(ui.top.iter()).any(|n| matches!(n, pav_core::games::fit::ui_model::Node::Text { text, .. } if text == "Controller or keyboard required"));
    assert!(says, "the touch card");
    assert_eq!(ui.items.iter().map(|i| i.label.as_str()).collect::<Vec<_>>(), ["Settings"]);
    // A tap on the card's one button.
    sim.step(&InputFrame { ui: Some(UiEvent::Click(0)), ..Default::default() });
    assert_eq!(screen(&sim), "settings");
    sim.run(120, &InputFrame::default());
    assert_eq!(screen(&sim), "settings", "stays open");
    // A finger has no Back button, so Settings has one it can tap.
    let m = game(&sim).menu().unwrap();
    let back = m.items.iter().position(|i| i.act == pav_core::games::fit::menus::MAct::Close).unwrap();
    sim.step(&InputFrame { ui: Some(UiEvent::Click(back as u16)), ..Default::default() });
    assert_eq!(screen(&sim), "attract");
    // Behind the card, the demo plays: the first event's bot scores.
    for _ in 0..60 * 24 {
        sim.step(&InputFrame::default());
    }
    let Flow::Attract(a) = &game(&sim).flow else { panic!() };
    assert!(a.seg >= 1, "segment {}", a.seg);
    // A key or a pad drops the card.
    sim.step(&InputFrame { any: true, ..Default::default() });
    assert!(!game(&sim).boot.touch_only);
}

#[test]
fn dev_holds_the_world_and_steps_a_tick() {
    let mut sim = Sim::new("fit/event/pose_parade", 1).unwrap();
    sim.run(20, &InputFrame::default());
    press(&mut sim, b::CONFIRM);
    sim.run(200, &InputFrame::default());
    game_mut(&mut sim).dev.hold = true;
    let t = |sim: &Sim| if let Flow::Event(r) = &game(sim).flow { r.c.t } else { panic!() };
    sim.step(&InputFrame::default());
    let a = t(&sim);
    sim.run(30, &InputFrame::default());
    assert_eq!(t(&sim), a, "held");
    sim.step(&InputFrame { held: b::TAB_R, pressed: b::TAB_R, ..Default::default() });
    sim.run(3, &InputFrame::default());
    let b2 = t(&sim);
    assert!(b2 > a && b2 < a + 0.05, "one step: {a} -> {b2}");
    game_mut(&mut sim).dev.hold = false;
    sim.run(30, &InputFrame::default());
    assert!(t(&sim) > b2 + 0.3, "lets go");
}

#[test]
fn attract_starts_from_settings_but_not_while_reading() {
    let mut sim = Sim::new("fit", 6).unwrap();
    with_game(&mut sim, |g, _, _| g.push_overlay(Overlay::Settings));
    sim.run(590, &InputFrame::default());
    assert_eq!(screen(&sim), "settings");
    sim.run(20, &InputFrame::default());
    assert_eq!(screen(&sim), "attract");
    let mut sim = Sim::new("fit", 6).unwrap();
    with_game(&mut sim, |g, _, _| g.push_overlay(Overlay::About(0)));
    sim.run(900, &InputFrame::default());
    assert_eq!(screen(&sim), "about");
}

#[test]
fn step_partys_song_starts_on_the_first_tick_of_play() {
    let mut sim = Sim::new("fit/event/step_party", 1).unwrap();
    sim.run(20, &InputFrame::default());
    press(&mut sim, b::CONFIRM);
    sim.drain_events();
    let mut started_at = None;
    for _ in 0..400 {
        sim.step(&InputFrame::default());
        let song = sim.drain_events().iter().any(|e| matches!(e, pav_core::SimEvent::Music { song: 4 }));
        if song {
            let Flow::Event(r) = &game(&sim).flow else { panic!() };
            started_at = Some((r.phase, r.c.t));
            break;
        }
    }
    let (phase, t) = started_at.expect("the song starts");
    assert_eq!(phase, RunPhase::Play);
    assert!(t < 0.05, "at {t}");
    // The audio clock wins when it's believable, and is ignored when it isn't.
    let Flow::Event(_) = &game(&sim).flow else { panic!() };
    sim.step(&InputFrame { song_pos: Some(0.5), ..Default::default() });
    let Flow::Event(r) = &game(&sim).flow else { panic!() };
    let pav_core::games::fit::events::EventState::Step(s) = &r.st else { panic!() };
    assert!((s.song - 0.5).abs() < 1e-3, "{}", s.song);
    sim.step(&InputFrame { song_pos: Some(40.0), ..Default::default() });
    let Flow::Event(r) = &game(&sim).flow else { panic!() };
    let pav_core::games::fit::events::EventState::Step(s) = &r.st else { panic!() };
    assert!(s.song < 1.0, "a stale clock is ignored: {}", s.song);
}

#[test]
fn the_intro_can_be_skipped() {
    let mut sim = Sim::new("fit", 8).unwrap();
    with_game(&mut sim, |g, sim, ev| {
        g.flow = Flow::Look(0, "Doug".into());
        g.activate(pav_core::games::fit::menus::MAct::Begin, sim, ev);
    });
    assert!(matches!(game(&sim).flow, Flow::Intro));
    assert!(game(&sim).dialog.is_some());
    press(&mut sim, b::BACK);
    assert!(matches!(game(&sim).flow, Flow::Morning), "on to the first morning");
    assert!(game(&sim).dialog.is_some(), "Pip wakes you");
}

#[test]
fn every_clip_and_prop_the_plan_names_exists() {
    for clip in [
        "MESH2MOTION/Jog", "MESH2MOTION/Pushup", "MESH2MOTION/Jumping Jacks", "CMU/Hop_One_Foot_Loop", "STYLE100/Balance_Walk", "CMU/Wave_Hello",
        "CMU/Stretch_Yawn", "MESH2MOTION/Cheering_Two_Hands", "MESH2MOTION/Victory", "MESH2MOTION/Sitting_Idle", "QUATERNIUS/Dance_Loop",
        "FIT/Breath", "FIT/Squat", "FIT/Tree", "FIT/Warrior", "FIT/Lighthouse", "FIT/DeckChair", "FIT/Bridge", "FIT/Seated", "FIT/ArmFlail", "FIT/Stumble",
        "FIT/StepL", "FIT/StepR", "FIT/HipCircle", "FIT/CarryTray", "FIT/Tuck", "FIT/DiveEntry", "FIT/Flop", "FIT/Bow", "FIT/Sleep", "FIT/Wake", "FIT/Sigh",
    ] {
        assert!(pav_core::clips::find(clip).is_some(), "no clip {clip}");
    }
    for prop in [
        "palm", "exercise_mat", "step_box", "diving_board", "diving_tower", "paddleboard", "buoy", "tide_raft", "tide_pool", "shell", "tray", "smoothie", "floatie",
        "lounge_chair", "umbrella", "cabana", "reception_desk", "pavilion", "calendar_wall", "minute_clam", "flip_flop", "gull", "gull_wing", "scorecard", "lotus",
        "small_raft", "towel_stack", "rowboat", "park_bench", "lamp_post", "signpost", "fence", "market_stall", "round_table", "chair",
    ] {
        assert!(pav_core::props::resolve_placed(&format!("LIB/core/{prop}"), &pav_core::props::Params::new()).is_ok(), "no prop {prop}");
    }
}

#[test]
fn counts_read_properly_and_nothing_shows_an_unfilled_word() {
    use pav_core::games::fit::script::singulars;
    assert_eq!(singulars("1 minutes for the Clam"), "1 minute for the Clam");
    assert_eq!(singulars("11 minutes"), "11 minutes");
    assert_eq!(singulars("21 days and 1 days"), "21 days and 1 day");
    assert_eq!(singulars("1 more minutes"), "1 more minute");
    assert_eq!(singulars("1 shells in"), "1 shell in");
    // Only lists read through `words` may hold {fill-ins}: said anywhere else, they'd show.
    let filled = ["pip.intro", "pip.morning", "pip.absence", "pip.report_", "pip.worst", "pip.beat", "pip.goal_met", "pip.notyet", "pip.clam", "pip.flipflop", "pip.wave", "pip.paused", "pip.back", "pip.end_", "tom.progress", "tom.reward", "tom.talk", "marjorie.talk", "twins.talk", "pip.talk", "posey.talk", "kettle.talk", "bounce.talk", "gull.talk", "result."];
    for (k, v) in script::all() {
        if v.iter().any(|l| l.contains('{')) {
            assert!(filled.iter().any(|f| k.starts_with(f)), "{k} holds a fill-in nothing fills");
        }
    }
    // A wave, a one-day absence and a one-minute result, as the player sees them.
    let mut sim = island_sim(1);
    for _ in 0..12 {
        game_mut(&mut sim).wave_t = 0.0;
        game_mut(&mut sim).bot_tick += 1;
        press(&mut sim, b::WAVE);
        let (q, _) = game(&sim).island_quip.clone().expect("Pip remarks");
        assert!(!q.text().contains('{'), "{}", q.text());
    }
    let mut sim = Sim::new("fit", 1).unwrap();
    {
        let g = game_mut(&mut sim);
        g.boot.today = 110;
        g.save.slots[0] = Some(Guest { name: "Doug".into(), day: 2, last_date: 109, ages: vec![50], checked: true, ..Default::default() });
    }
    with_game(&mut sim, |g, sim, ev| g.activate(pav_core::games::fit::menus::MAct::Slot(0), sim, ev));
    let d = game(&sim).dialog.clone().expect("Pip speaks");
    assert!(!d.lines[0].contains("1 days") && !d.lines[0].contains("were 1"), "{}", d.lines[0]);
}

#[test]
fn plank_stars_come_at_25_40_and_55_seconds() {
    let r = Rules::default();
    let stars = |secs: f32| r.stars_for(EventKind::PlankStandoff, secs / 60.0 * 1000.0);
    assert_eq!([stars(24.9), stars(25.0), stars(39.9), stars(40.0), stars(54.9), stars(55.0)], [0, 1, 1, 2, 2, 3]);
    // Every other event keeps the common thresholds.
    assert_eq!(r.stars_for(EventKind::TideTable, 649.0), 1);
    assert_eq!(r.stars_for(EventKind::TideTable, 850.0), 3);
}

#[test]
fn the_schedule_is_a_carousel_of_pavilions_then_events() {
    use pav_core::games::fit::menus::{Layout, MAct, carousel_first};
    let mut sim = island_sim(4);
    press(&mut sim, b::SCHEDULE);
    let menu = game(&sim).menu().expect("the schedule's menu");
    assert!(matches!(menu.layout, Layout::Carousel { .. }), "{:?}", menu.layout);
    assert!(menu.items.len() > 3, "more pavilions than show at once");
    assert!(menu.items[0].sub.contains("stars"), "{}", menu.items[0].sub);
    let cards = |sim: &Sim| game(sim).build_ui(sim).items.clone();
    let shown = cards(&sim);
    assert_eq!(shown.len(), 3, "three big cards at once");
    assert_eq!(shown[0].id, 0);
    // Right moves along it; it slides only once the focus would leave.
    let n = menu.items.len();
    let top = shown[0].r[1];
    for want in 1..n {
        press(&mut sim, b::MENU_RIGHT);
        assert_eq!(game(&sim).focus, want);
        let shown = cards(&sim);
        assert!(shown.iter().any(|c| c.id as usize == want && c.focused), "the focus stays in view at {want}");
        assert!(shown.iter().all(|c| c.r[0] >= 0.0 && c.r[0] + c.r[2] <= 1920.0 && c.r[1] == top), "on screen at {want}");
    }
    assert_eq!(cards(&sim)[0].id as usize, n - 3, "slid to the end");
    // Moving back within the view doesn't slide, so a still pointer stays on its card.
    press(&mut sim, b::MENU_LEFT);
    assert_eq!(cards(&sim)[0].id as usize, n - 3);
    assert_eq!(carousel_first(3, 3, 6, 3), 3);
    assert_eq!(carousel_first(3, 2, 6, 3), 2);
    assert_eq!(carousel_first(0, 5, 6, 3), 3);
    // Then the events, with stars. The lagoon has four, more than show at once.
    let lagoon = menu.items.iter().position(|i| i.label == "Lagoon" || i.act == MAct::Pavilion(3)).unwrap();
    while game(&sim).focus != lagoon {
        press(&mut sim, b::MENU_LEFT);
    }
    press(&mut sim, b::CONFIRM);
    let events = game(&sim).menu().unwrap();
    assert_eq!(events.key, "events");
    assert!(matches!(events.layout, Layout::Carousel { .. }));
    assert_eq!(events.items.len(), 4);
    assert!(events.items.iter().all(|i| i.stars.is_some()), "every event shows its stars");
    assert_eq!(cards(&sim).len(), 3);
}

#[test]
fn the_pointer_rings_the_thing_under_it() {
    use pav_core::games::fit::ui_model::Node;
    let mut sim = island_sim(1);
    let pip = game(&sim).spots.iter().position(|s| s.spot == pav_core::games::fit::island::Spot::Talk(pav_core::games::fit::dialog::Who::Pip)).unwrap();
    let at = sim.feet(game(&sim).spots[pip].id.unwrap()).unwrap();
    let rings = |sim: &Sim| game(sim).build_ui(sim).nodes.iter().filter(|n| matches!(n, Node::WorldRing { r, .. } if *r > 1.2)).count();
    sim.step(&InputFrame { aim: Some(at + glam::Vec3::new(0.8, 0.0, 0.0)), ..Default::default() });
    assert_eq!(game(&sim).under_pointer, Some(pip), "within 1.2 m");
    assert_eq!(rings(&sim), 1);
    sim.step(&InputFrame { aim: Some(at + glam::Vec3::new(2.0, 0.0, 0.0)), ..Default::default() });
    assert_eq!(game(&sim).under_pointer, None, "beyond 1.2 m");
    assert_eq!(rings(&sim), 0);
    sim.step(&InputFrame::default());
    assert_eq!(game(&sim).under_pointer, None, "no pointer, no ring");
}

#[test]
fn the_commodore_is_three_entities_and_his_wings_move() {
    let mut sim = island_sim(1);
    let rigs = game(&sim).commodores.clone();
    assert_eq!(rigs.len(), 5, "the hub and all four lagoon sets");
    let rot = |sim: &Sim, id| sim.state.entities.get(id).unwrap().rot;
    let wing = rigs[0].wings[0];
    assert_eq!(rigs[0].wings.len(), 2);
    for _ in 0..3 {
        sim.step(&InputFrame::default());
    }
    let resting = rot(&sim, wing);
    // He flaps when he has the floor.
    game_mut(&mut sim).dialog = Some(pav_core::games::fit::dialog::Dialog::new(pav_core::games::fit::dialog::Who::Gull, vec!["That was a dive.".to_string()]));
    sim.step(&InputFrame::default());
    let a = rot(&sim, wing);
    for _ in 0..8 {
        sim.step(&InputFrame::default());
    }
    let b = rot(&sim, wing);
    assert!(resting.angle_between(a) > 0.1, "talking lifts the wings");
    assert!(a.angle_between(b) > 0.05, "and they keep moving");
}

#[test]
fn every_sound_in_the_bank_is_played_somewhere() {
    // Exit interview: 43 sounds. A sound nothing fires isn't one of them.
    let mut src = String::new();
    let mut dirs = vec![std::path::PathBuf::from("src/games/fit")];
    while let Some(d) = dirs.pop() {
        for e in std::fs::read_dir(d).unwrap().flatten() {
            let p = e.path();
            if p.is_dir() {
                dirs.push(p);
            } else if p.extension().is_some_and(|x| x == "rs") && !p.ends_with("world.rs") {
                src += &std::fs::read_to_string(p).unwrap();
            }
        }
    }
    let world = std::fs::read_to_string("src/games/fit/world.rs").unwrap();
    let block = &world[world.find("pub mod sound").expect("the sound table")..];
    let mut count = 0;
    for line in block.lines().skip(1) {
        let Some(rest) = line.trim().strip_prefix("pub const ") else {
            if line.trim() == "}" {
                break;
            }
            continue;
        };
        let name = rest.split(':').next().unwrap();
        if name == "TOTAL" {
            continue;
        }
        count += 1;
        assert!(src.contains(&format!("sound::{name}")), "nothing plays sound::{name}");
    }
    assert!(count >= 30, "the plan asks for at least 30 sounds, found {count}");
}

#[test]
fn ghosts_match_by_area() {
    use pav_core::games::fit::ghost::same_area;
    assert!(same_area(1, 1), "the same event");
    assert!(!same_area(0, 1), "another event");
    assert!(!same_area(-1, -1), "nobody draws anyone before the round");
    // The area a copy reports is its own event's place in the Medley.
    let mut sim = Sim::new("fit/medley", 5).unwrap();
    let area = |sim: &Sim| -> i64 {
        let v: serde_json::Value = serde_json::from_str(&game(sim).status_json(sim).to_string()).unwrap();
        v["hub"]["ghost"]["area"].as_i64().unwrap()
    };
    assert_eq!(area(&sim), -1, "not yet");
    let go = InputFrame { held: b::HUB_GO, ..Default::default() };
    let mut seen = Vec::new();
    for _ in 0..60 * 400 {
        let mut f = sim.bot_input();
        f.held |= go.held;
        sim.step(&f);
        let a = area(&sim);
        if a >= 0 && seen.last() != Some(&a) {
            seen.push(a);
        }
        if seen.len() == 3 {
            break;
        }
    }
    assert_eq!(seen, [0, 1, 2], "paddle, tide, dive, in order on every copy");
}

#[test]
fn every_event_has_a_card_rules_and_a_bot() {
    let rules: toml::Value = toml::from_str(include_str!("../src/games/fit/rules.toml")).unwrap();
    let section = |k: EventKind| match k {
        EventKind::BreathBloom => "breath",
        EventKind::PoseParade => "pose",
        EventKind::TempoSquats => "squats",
        EventKind::PlankStandoff => "plank",
        EventKind::StepParty => "step",
        EventKind::FloatieSpin => "spin",
        EventKind::MorningLap => "lap",
        EventKind::TideTable => "tide",
        EventKind::PaddleSlalom => "paddle",
        EventKind::TrayTrek => "tray",
        EventKind::CannonballCup => "dive",
        EventKind::BigStand => "stand",
    };
    let script_text = include_str!("../src/games/fit/script.toml");
    for k in ALL {
        assert!(rules.get(section(k)).is_some(), "{k:?} has no rules section");
        assert!(script_text.contains(&format!("\"card.{}\"", k.key())), "{k:?} has no card");
        // The bot does something: an idle Intent would score under a star (see the idle test).
        let s = play_event(k, 2, |sim| game(sim).bot_input(sim));
        assert!(s > 0.0, "{k:?}'s bot did nothing");
    }
}

#[test]
fn every_set_has_someone_in_it_and_the_plans_dressing() {
    for (name, text) in [
        ("hub", include_str!("../src/games/fit/sets/hub.toml")),
        ("studio", include_str!("../src/games/fit/sets/studio.toml")),
        ("gazebo", include_str!("../src/games/fit/sets/gazebo.toml")),
        ("boardwalk", include_str!("../src/games/fit/sets/boardwalk.toml")),
        ("tide", include_str!("../src/games/fit/sets/tide.toml")),
        ("channel", include_str!("../src/games/fit/sets/channel.toml")),
        ("pier", include_str!("../src/games/fit/sets/pier.toml")),
        ("tower", include_str!("../src/games/fit/sets/tower.toml")),
        ("bay", include_str!("../src/games/fit/sets/bay.toml")),
    ] {
        assert!(text.contains("[[npc]]"), "{name} has nobody in the background");
        assert!(text.contains("outlines_on = \"objects\""), "{name} misses the view recipe");
        assert!(text.contains("name = \"far_sea\""), "{name} has no far sea");
        if ["tide", "channel", "pier", "tower", "hub"].contains(&name) {
            assert!(text.contains("name = \"commodore\""), "{name} has no Commodore");
        }
        if name == "studio" || name == "tide" {
            assert!(text.contains("preset = \"bubbles\""), "{name} has no bubbles");
        }
        if name == "bay" {
            assert!(text.contains("light = "), "the sunset has no point lights");
        }
    }
}
