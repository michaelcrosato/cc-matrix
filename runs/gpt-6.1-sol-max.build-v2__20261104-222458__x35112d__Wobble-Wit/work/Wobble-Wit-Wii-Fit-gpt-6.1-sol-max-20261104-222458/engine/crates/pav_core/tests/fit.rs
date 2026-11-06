use glam::{Vec2, Vec3};
use pav_core::games::{
    Outcome,
    fit::{
        FitGame, Rules, Screen,
        core::{BalanceCore, keys, stick},
        events::{Event, Kind, ROSTER},
        meta,
    },
};
use pav_core::input::{UiEvent, buttons as b};
use pav_core::{InputFrame, Sim, SimState};
fn game(s: &Sim) -> &FitGame {
    s.play().unwrap().get::<FitGame>().unwrap()
}
fn modify(s: &mut Sim, f: impl FnOnce(&mut FitGame)) {
    f(s.state.play.as_mut().unwrap().get_mut::<FitGame>().unwrap());
}
fn sim(scene: &str, seed: u64) -> Sim {
    let mut s = Sim::new(scene, seed).unwrap();
    s.config.history_seconds = 0.;
    assert!(s.state.world.errors.is_empty(), "{:?}", s.state.world.errors);
    s
}
fn event_score(k: Kind, seed: u32, mode: u8) -> u32 {
    let mut e = Event::new(k, [seed as f32, seed as f32 * 1.3, seed as f32 * 2.1, seed as f32 * 0.7]);
    let r = Rules::default();
    let mut ev = vec![];
    for n in 0..(k.duration() * 60. + 600.) as u32 {
        let i = if mode == 1 {
            e.bot(&r, 1. / 60.)
        } else if mode == 2 {
            let a = n as f32 * 3.7 + seed as f32;
            InputFrame {
                lean: Vec2::new(a.sin(), (a * 1.7).cos()),
                held: if n % 4 == 0 { b::CONFIRM } else { 0 },
                pressed: if n % 9 == 0 { b::STEP_L } else { 0 },
                ..Default::default()
            }
        } else {
            InputFrame::default()
        };
        e.step(&i, 1. / 60., &r, &mut ev, Vec3::ZERO);
        ev.clear();
        if e.finished {
            break;
        }
    }
    e.score
}
#[test]
fn every_bot_beats_idle_and_careless() {
    let mut errors = vec![];
    for k in ROSTER {
        for seed in 1..=5 {
            let bot = event_score(k, seed, 1);
            let idle = event_score(k, seed, 0);
            let random = event_score(k, seed, 2);
            if bot < 650 || idle >= 400 || bot <= random {
                errors.push(format!("{} seed {seed}: bot {bot}, idle {idle}, careless {random}", k.key()));
            }
        }
    }
    assert!(errors.is_empty(), "{}", errors.join("\n"));
}
#[test]
fn the_bot_checks_in_and_finishes_all_five_days() {
    for seed in 1..=3 {
        let mut s = sim("fit", seed);
        let (outcome, ticks) = s.run_bot(60 * 60 * 60);
        let g = game(&s);
        assert_eq!(
            outcome,
            Outcome::Won,
            "seed {seed}, {ticks} ticks: {} day {} event {} minutes {}",
            format!("{:?}", g.screen),
            g.profile.day,
            g.event.kind.key(),
            g.profile.minutes
        );
        assert_eq!(g.profile.stamps, 5);
        assert_eq!(g.profile.bests.iter().take(11).filter(|b| b.score > 0).count(), 11);
        assert!(ticks < 60 * 60 * 60);
        assert_eq!(g.screen, Screen::Credits);
        assert!(serde_json::to_string(&g.save).unwrap().len() < 600_000, "four guest saves must fit localStorage");
    }
}
#[test]
fn spring_settles_and_tips_only_after_grace() {
    let r = Rules::default();
    let mut c = BalanceCore::default();
    for n in 0..24 {
        c.step(Vec2::X, n as f32 / 60., 1. / 60., 0., Vec2::ZERO, &r);
    }
    assert!(c.cob.x > 0.8 && c.cob.x < 1.);
    for n in 0..30 {
        c.step(Vec2::ZERO, n as f32 / 60., 1. / 60., 0., Vec2::ZERO, &r);
    }
    assert!(c.cob.length() < 0.1);
    c.cob = Vec2::X * 1.1;
    c.vel = Vec2::ZERO;
    let mut tight = r.clone();
    tight.stiffness = 0.;
    for n in 0..20 {
        assert!(!c.step(Vec2::ZERO, n as f32 / 60., 1. / 60., 0., Vec2::ZERO, &tight));
    }
    assert!(c.step(Vec2::ZERO, 0., 1. / 60., 0., Vec2::ZERO, &tight));
}
#[test]
fn input_is_fine_and_age_is_monotonic() {
    assert_eq!(stick(Vec2::X * 0.1, 1.5), Vec2::ZERO);
    assert!(stick(Vec2::X * 0.4, 1.5).x < 0.3);
    let mut k = Vec2::ZERO;
    for _ in 0..6 {
        k = keys(k, Vec2::X, 1. / 60., false, 1.6, 1.2);
    }
    assert!((k.x - 0.16).abs() < 0.01);
    assert!(meta::age([0.8; 4], 0, 0) < meta::age([0.2; 4], 0, 0));
    assert!(meta::age([0.5; 4], 4, 30) < meta::age([0.5; 4], 0, 0));
    assert_eq!(meta::age([1.; 4], 4, 100), 18);
}
#[test]
fn attract_starts_at_ten_seconds_exits_and_never_saves() {
    let mut s = sim("fit", 2);
    for _ in 0..600 {
        s.step(&InputFrame::default());
    }
    assert!(game(&s).demo);
    let save = serde_json::to_string(&game(&s).save).unwrap();
    for _ in 0..1200 {
        s.step(&InputFrame::default());
    }
    assert_eq!(save, serde_json::to_string(&game(&s).save).unwrap());
    s.step(&InputFrame { any: true, ..Default::default() });
    assert!(!game(&s).demo);
    assert_eq!(game(&s).screen, Screen::Title);
}
#[test]
fn pause_freezes_world_and_settings_reset_live_rules() {
    let mut s = sim("fit/event/pose-parade", 4);
    for _ in 0..30 {
        s.step(&s.bot_input());
    }
    s.step(&InputFrame { pressed: b::PAUSE, ..Default::default() });
    let t = game(&s).event.time;
    let p = s.player().unwrap().pos;
    for _ in 0..60 {
        s.step(&InputFrame::default());
    }
    assert_eq!(game(&s).event.time, t);
    assert_eq!(s.player().unwrap().pos, p);
    assert_eq!(game(&s).save.settings.music, 0.10);
    modify(&mut s, |g| {
        g.screen = Screen::Dev;
        g.dev_tab = 3;
    });
    s.step(&InputFrame { ui: Some(UiEvent::Slider(0, 65.)), ..Default::default() });
    assert_eq!(game(&s).rules.stiffness, 65.);
    s.step(&InputFrame { ui: Some(UiEvent::Click(99)), ..Default::default() });
    assert_eq!(game(&s).rules.stiffness, 40.);
}
#[test]
fn save_snapshot_and_replay_are_exact() {
    let mut s = sim("fit/event/pose-parade", 7);
    for _ in 0..180 {
        s.step(&s.bot_input());
    }
    let mut data = vec![];
    ciborium::into_writer(&s.snapshot(), &mut data).unwrap();
    let state: SimState = ciborium::from_reader(data.as_slice()).unwrap();
    let mut copy = sim("fit/event/pose-parade", 7);
    copy.restore(state);
    assert_eq!(s.state_hash(), copy.state_hash());
    for _ in 0..180 {
        let i = s.bot_input();
        s.step(&i);
        copy.step(&i);
    }
    assert_eq!(s.state_hash(), copy.state_hash());
    let save = serde_json::to_string(&game(&s).save).unwrap();
    let mut loaded = game(&s).clone();
    loaded.load_save(&save, 123);
    assert_eq!(loaded.save.version, 1);
    assert_eq!(loaded.today, 123);
    let mut replay = sim("fit/event/pose-parade", 7);
    for i in s.recording.iter() {
        replay.step(i);
    }
    assert_eq!(replay.state_hash(), s.state_hash());
}
#[test]
fn hotseat_medley_finishes_for_four_guests() {
    let mut s = sim("fit", 6);
    modify(&mut s, |g| {
        g.screen = Screen::Pass;
        g.together_count = 4;
    });
    for _ in 0..60000 {
        let i = s.bot_input();
        s.step(&i);
        if game(&s).screen == Screen::Podium {
            break;
        }
    }
    let g = game(&s);
    assert_eq!(g.screen, Screen::Podium);
    assert_eq!(g.hub.scores.len(), 4);
    assert!(g.hub.scores.iter().all(|&n| n >= 1800));
}
#[test]
fn long_stillness_resists_the_skip_prompt() {
    let r = Rules::default();
    let mut e = Event::new(Kind::Finale, [0.; 4]);
    e.time = 112.;
    for _ in 0..1801 {
        e.step(&InputFrame::default(), 1. / 60., &r, &mut vec![], Vec3::ZERO);
    }
    assert!(e.peace);
    let mut e = Event::new(Kind::Finale, [0.; 4]);
    e.time = 127.;
    e.step(&InputFrame { pressed: b::CONFIRM, held: b::CONFIRM, ..Default::default() }, 1. / 60., &r, &mut vec![], Vec3::ZERO);
    assert!(!e.peace);
}
#[test]
fn all_content_is_complete_and_has_native_motion() {
    let data = include_str!("../src/games/fit/script.toml");
    let parsed: toml::Value = toml::from_str(data).unwrap();
    assert!(parsed["pip"]["lines"].as_array().unwrap().len() >= 80);
    for k in ["posey", "kettle", "bounce", "gull"] {
        assert!(parsed[k]["lines"].as_array().unwrap().len() >= 25);
    }
    for clip in ["FIT/Tree", "FIT/Squat", "FIT/Breath", "FIT/Plank", "FIT/Tuck"] {
        assert!(pav_core::clips::find(clip).is_some(), "{clip}");
    }
}

#[test]
fn hub_score_sums_all_events_and_pause_keeps_its_clock() {
    let mut s = sim("fit/medley", 9);
    modify(&mut s, |g| {
        g.hub.go = true;
        g.screen = Screen::Pause;
    });
    let before = game(&s).event.time;
    for _ in 0..5 {
        s.step(&InputFrame::default());
    }
    assert!(game(&s).event.time > before);
    s.step(&InputFrame { ui: Some(UiEvent::Click(1)), ..Default::default() });
    assert_eq!(game(&s).screen, Screen::Settings);
    modify(&mut s, |g| {
        g.hub.ended = true;
        g.hub.scores = vec![2400];
        g.hub.total = 0;
        g.event.score = 800;
    });
    assert_eq!(game(&s).status_json(&s)["hub"]["score"], 2400);
}

#[test]
fn escape_backs_out_of_menus_and_pauses_play() {
    let mut s = sim("fit", 12);
    modify(&mut s, |g| g.screen = Screen::Pass);
    s.step(&InputFrame { pressed: b::PAUSE, ..Default::default() });
    assert_eq!(game(&s).screen, Screen::Title);
    modify(&mut s, |g| {
        g.screen = Screen::Settings;
        g.return_to = Screen::Title;
    });
    s.step(&InputFrame { pressed: b::PAUSE, ..Default::default() });
    assert_eq!(game(&s).screen, Screen::Title);
    modify(&mut s, |g| g.screen = Screen::Hub);
    s.step(&InputFrame { pressed: b::PAUSE, ..Default::default() });
    assert_eq!(game(&s).screen, Screen::Pause);
}

#[test]
fn mouse_interactions_finish_before_colliding_with_furniture() {
    let mut s = sim("fit/hub", 13);
    let pid = s.state.player.unwrap();
    s.set_position(pid, Vec3::new(-6., 0.4, 14.));
    modify(&mut s, |g| {
        g.profile.free_play = false;
        g.profile.day = 1;
        g.profile.minutes = 4;
        g.interact_goal = Some(6);
        g.way_to = Some(Vec3::new(-6., 0.3, 16.));
    });
    s.step(&InputFrame::default());
    assert_eq!(game(&s).screen, Screen::Calendar);
}
