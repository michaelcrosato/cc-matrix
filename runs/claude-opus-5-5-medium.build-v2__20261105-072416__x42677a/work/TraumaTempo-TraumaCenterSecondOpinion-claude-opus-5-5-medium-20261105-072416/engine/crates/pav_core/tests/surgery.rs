//! The surgery game: the bot wins, a careless player loses, the sim is exact, the campaign covers
//! everything, the rules rate what they should, and the content files are sound.

use glam::Vec2;
use pav_core::games::Outcome;
use pav_core::games::surgery::content::{self, FILES, content};
use pav_core::games::surgery::field::{Hazard, Kind, Op, Rating, Rules, Tool};
use pav_core::games::surgery::frame::Stage;
use pav_core::games::surgery::tune::{Difficulty, Tune};
use pav_core::games::surgery::{self, Surgery, cover};
use pav_core::input::{SurgeonInput, surgeon_buttons as btn};
use pav_core::{InputFrame, Sim, SimState};

fn game(sim: &Sim) -> &Surgery {
    surgery::get(sim).unwrap()
}

fn status(sim: &Sim) -> String {
    sim.play().unwrap().status(sim).to_string()
}

#[test]
fn the_bot_wins_every_case_on_ten_seeds() {
    for case in 0..8 {
        for seed in 1..=10 {
            let mut sim = Sim::new(&format!("surgery/case/{case}"), seed).unwrap();
            let (outcome, ticks) = sim.run_bot(60 * 60 * 12);
            assert_eq!(outcome, Outcome::Won, "case {case} seed {seed}, {ticks} ticks: {}", status(&sim));
        }
    }
}

#[test]
fn the_whole_campaign_is_won_and_covers_everything() {
    for seed in 1..=10 {
        if seed == 7 {
            continue; // below, with its coverage
        }
        let mut sim = Sim::new("surgery/campaign", seed).unwrap();
        let (outcome, ticks) = sim.run_bot(60 * 60 * 80);
        assert_eq!(outcome, Outcome::Won, "seed {seed}, {ticks} ticks: {}", status(&sim));
    }
    let mut sim = Sim::new("surgery/campaign", 7).unwrap();
    let (outcome, ticks) = sim.run_bot(60 * 60 * 80);
    assert_eq!(outcome, Outcome::Won, "{ticks} ticks: {}", status(&sim));
    let cov = &game(&sim).cov;
    let mut missing = Vec::new();
    for name in cover::NAMES {
        let optional = name.starts_with("death:")
            || name.starts_with("mistake:")
            || *name == "wrong_tool"
            || *name == "scorch"
            || *name == "furnace:3"
            || *name == "lacrimosa:burst"
            || *name == "director:strain"
            || *name == "strain:director"
            || *name == "rating:sloppy"
            || *name == "rating:good"
            || *name == "dies:merge"
            || *name == "chain";
        if !optional && cover::get(cov, name) == 0 {
            missing.push(*name);
        }
    }
    assert!(missing.is_empty(), "the campaign never did: {missing:?}");
}

#[test]
fn every_rating_is_reachable_and_mistakes_fire_at_lower_skill() {
    let mut seen = vec![0u32; cover::NAMES.len()];
    for case in [1, 2, 3, 4, 6] {
        for seed in 1..=3 {
            let mut sim = Sim::new(&format!("surgery/case/{case}"), seed).unwrap();
            surgery::get_mut(&mut sim).unwrap().bot_skill = 0.3;
            let _ = sim.run_bot(60 * 60 * 5);
            let g = game(&sim);
            cover::merge(&mut seen, &g.cov);
            if let Some(op) = &g.op {
                cover::merge(&mut seen, &op.cov);
            }
        }
    }
    for name in ["rating:immaculate", "rating:clean", "rating:good", "rating:sloppy"] {
        assert!(cover::get(&seen, name) > 0, "{name} never happened");
    }
}

#[test]
fn a_careless_player_loses_every_case() {
    for case in 0..8 {
        // Idle.
        let mut sim = Sim::new(&format!("surgery/case/{case}"), 1).unwrap();
        for _ in 0..60 * 60 * 10 {
            sim.step(&InputFrame::default());
            if sim.outcome() != Outcome::Playing {
                break;
            }
        }
        assert_eq!(sim.outcome(), Outcome::Lost, "idle, case {case}: {}", status(&sim));
        // Random instrument spam.
        let mut sim = Sim::new(&format!("surgery/case/{case}"), 2).unwrap();
        let mut h = 12345u32;
        for t in 0..60 * 60 * 10 {
            h = h.wrapping_mul(1103515245).wrapping_add(12345);
            let mut f = InputFrame::default();
            let aim = Vec2::new((h >> 16) as f32 / 65536.0 * 16.0 - 8.0, ((h >> 8) & 255) as f32 / 256.0 * 8.0 - 4.0);
            f.surgeons[0] = SurgeonInput {
                active: true,
                abs: true,
                aim,
                held: if t % 40 < 20 { btn::USE } else { 0 },
                pressed: 0,
                tool: if t % 30 == 0 { (h >> 3) as u8 % 8 + 1 } else { 0 },
                ..Default::default()
            };
            sim.step(&f);
            if sim.outcome() != Outcome::Playing {
                break;
            }
        }
        assert_eq!(sim.outcome(), Outcome::Lost, "spam, case {case}: {}", status(&sim));
    }
}

#[test]
fn snapshots_rewind_and_replays_are_exact() {
    let mut sim = Sim::new("surgery/case/3/2", 3).unwrap();
    for _ in 0..600 {
        let f = sim.bot_input();
        sim.step(&f);
    }
    let mut bytes = Vec::new();
    ciborium::into_writer(&sim.snapshot(), &mut bytes).unwrap();
    let state: SimState = ciborium::from_reader(bytes.as_slice()).unwrap();
    let mut copy = Sim::new("surgery/case/3/2", 3).unwrap();
    copy.restore(state);
    assert_eq!(copy.state_hash(), sim.state_hash());
    for _ in 0..400 {
        let (a, b) = (sim.bot_input(), copy.bot_input());
        sim.step(&a);
        copy.step(&b);
    }
    assert_eq!(copy.state_hash(), sim.state_hash());
    let (tick, hash) = (sim.state.tick, sim.state_hash());
    assert!(sim.rewind_to(tick - 90));
    assert!(sim.rewind_to(tick));
    assert_eq!(sim.state_hash(), hash);
    let mut again = Sim::new("surgery/case/3/2", 3).unwrap();
    for f in sim.recording.iter() {
        again.step(f);
    }
    assert_eq!(again.state_hash(), hash);
}

fn rules() -> Rules {
    Rules {
        tune: Tune::default(),
        diff: Difficulty::Attending,
        immortal: false,
        freeze_timer: false,
        full_gift: false,
        one_hit: false,
        tremor: true,
        bot_skill: 1.0,
        tick: 0,
        time: 0.0,
    }
}

/// An operation with nothing on the field but what the test adds.
fn bare_op() -> Op {
    let mut op = Op::new(0, &rules(), 1);
    op.hazards.clear();
    op
}

fn drive(op: &mut Op, r: &Rules, ticks: usize, aim: impl Fn(usize) -> Vec2, held: u8) {
    for t in 0..ticks {
        let mut i: [SurgeonInput; 4] = Default::default();
        i[0] = SurgeonInput { active: true, abs: true, aim: aim(t), held, ..Default::default() };
        op.tick(&i, r, 1.0 / 60.0);
    }
}

fn select(op: &mut Op, tool: Tool) {
    let pos = op.ring.iter().position(|t| *t == tool).unwrap() as u8;
    op.select(0, pos);
}

fn last_rating(op: &Op) -> Option<String> {
    op.floats.last().map(|f| f.text.clone())
}

#[test]
fn a_straight_stroke_on_the_line_is_immaculate_and_a_shaky_one_is_not() {
    let r = rules();
    for (wobble, want) in [(0.0, "IMMACULATE"), (0.6, "GOOD")] {
        let mut op = bare_op();
        select(&mut op, Tool::Scalpel);
        op.add(Hazard { kind: Kind::Incision, a: Vec2::new(-3.0, 0.0), b: Vec2::new(3.0, 0.0), c: Vec2::ZERO, blocking: true, ..Default::default() });
        drive(&mut op, &r, 1, |_| Vec2::new(-3.0, 0.0), 0);
        drive(&mut op, &r, 120, |t| Vec2::new(-3.0 + t as f32 * 0.052, wobble), btn::USE);
        assert_eq!(last_rating(&op).as_deref(), Some(want), "wobble {wobble}");
        assert!(op.hazards.is_empty());
    }
}

#[test]
fn forceps_pull_along_the_axis_rates_and_off_axis_tears() {
    let r = rules();
    let mut op = bare_op();
    select(&mut op, Tool::Forceps);
    op.add(Hazard { kind: Kind::Object, a: Vec2::ZERO, ang: 0.0, r: 0.45, blocking: true, ..Default::default() });
    drive(&mut op, &r, 1, |_| Vec2::ZERO, 0);
    drive(&mut op, &r, 40, |t| Vec2::new(t as f32 * 0.04, 0.0), btn::USE);
    assert_eq!(last_rating(&op).as_deref(), Some("IMMACULATE"));
    assert!(op.hazards.is_empty());

    let mut op = bare_op();
    select(&mut op, Tool::Forceps);
    op.add(Hazard { kind: Kind::Object, a: Vec2::ZERO, ang: 0.0, r: 0.45, blocking: true, ..Default::default() });
    drive(&mut op, &r, 1, |_| Vec2::ZERO, 0);
    drive(&mut op, &r, 40, |t| Vec2::new(0.0, t as f32 * 0.04), btn::USE);
    assert!(op.mistakes > 0, "yanking off-axis tears");
    assert!(op.hazards.iter().any(|h| h.kind == Kind::Lacer));
    assert!(op.hazards.iter().any(|h| h.kind == Kind::Object), "and the object stays");
}

#[test]
fn suture_crossings_near_the_needle_close_the_wound_and_leave_thread() {
    let r = rules();
    let mut op = bare_op();
    select(&mut op, Tool::Suture);
    let h = Hazard { kind: Kind::Lacer, a: Vec2::new(-1.0, 0.0), b: Vec2::new(1.0, 0.0), drain: 0.6, need: 4, blocking: true, ..Default::default() };
    op.add(h);
    drive(&mut op, &r, 1, |_| Vec2::new(-0.75, 0.3), 0);
    for s in 0..6 {
        let x = -1.0 + (s as f32 + 0.5) * 0.5;
        let z = if s % 2 == 0 { -0.3 } else { 0.3 };
        drive(&mut op, &r, 6, move |_| Vec2::new(x, z), btn::USE);
    }
    assert!(op.hazards.is_empty(), "{:?}", op.hazards);
    assert_eq!(op.threads.len(), 1);
}

#[test]
fn laser_release_timing_decides_the_rating_and_overheating_burns() {
    let r = rules();
    let run = |ticks: usize| {
        let mut op = bare_op();
        select(&mut op, Tool::Laser);
        op.add(Hazard { kind: Kind::Polyp, a: Vec2::ZERO, r: 0.5, blocking: true, ..Default::default() });
        drive(&mut op, &r, 1, |_| Vec2::ZERO, 0);
        drive(&mut op, &r, ticks, |_| Vec2::ZERO, btn::USE);
        drive(&mut op, &r, 2, |_| Vec2::ZERO, 0);
        op
    };
    let good = run(70); // 1.17 s of 1.2
    assert_eq!(last_rating(&good).as_deref(), Some("IMMACULATE"));
    assert!(good.hazards.is_empty());
    let early = run(30);
    assert!(early.hazards.iter().any(|h| h.kind == Kind::Polyp), "released early: still there");
    let over = run(100);
    assert!(over.mistakes > 0, "overheated");
    assert!(over.hazards.iter().any(|h| h.kind == Kind::Patch), "a burn");
}

#[test]
fn iv_push_heals_in_the_band_and_overdose_costs() {
    let r = rules();
    let mut op = bare_op();
    op.vitals = 50.0;
    select(&mut op, Tool::Iv);
    drive(&mut op, &r, 70, |_| Vec2::ZERO, btn::USE);
    drive(&mut op, &r, 2, |_| Vec2::ZERO, 0);
    assert!(op.vitals > 65.0, "{}", op.vitals);
    assert!(op.iv_cd > 3.5, "cooldown");
    let mut op = bare_op();
    op.vitals = 50.0;
    select(&mut op, Tool::Iv);
    drive(&mut op, &r, 100, |_| Vec2::ZERO, btn::USE);
    assert!(op.mistakes > 0, "overdose");
}

#[test]
fn wrong_tool_resets_the_chain_and_does_nothing_else() {
    let r = rules();
    let mut op = bare_op();
    select(&mut op, Tool::Forceps);
    op.slots[0].chain = 7;
    op.add(Hazard { kind: Kind::Polyp, a: Vec2::ZERO, r: 0.5, blocking: true, ..Default::default() });
    drive(&mut op, &r, 1, |_| Vec2::ZERO, 0);
    drive(&mut op, &r, 3, |_| Vec2::ZERO, btn::USE);
    assert_eq!(op.slots[0].chain, 0);
    assert_eq!(op.hazards.len(), 1);
}

#[test]
fn chains_multiply_and_on_beat_pays() {
    let r = rules();
    let mut op = bare_op();
    op.heart.phase = 0.5; // off the beat
    op.award(0, Vec2::ZERO, Tool::Forceps, Rating::Clean, &r);
    assert_eq!(op.slots[0].score, 250);
    op.slots[0].chain = 9;
    op.award(0, Vec2::ZERO, Tool::Forceps, Rating::Clean, &r); // chain 10: x1.5
    assert_eq!(op.slots[0].score, 250 + 375);
    op.heart.phase = 0.0; // on the R wave
    op.slots[0].score = 0;
    op.slots[0].chain = 0;
    op.award(0, Vec2::ZERO, Tool::Forceps, Rating::Immaculate, &r);
    assert_eq!(op.slots[0].score, 500, "400 x 1.25");
    op.award(0, Vec2::ZERO, Tool::Forceps, Rating::Sloppy, &r);
    assert_eq!(op.slots[0].chain, 0, "sloppy resets");
}

#[test]
fn falling_vitals_raise_the_heart_rate() {
    let r = rules();
    let mut op = bare_op();
    op.vitals = 100.0;
    drive(&mut op, &r, 300, |_| Vec2::ZERO, 0);
    assert!((op.heart.bpm - 72.0).abs() < 2.0, "{}", op.heart.bpm);
    op.vitals = 25.0;
    drive(&mut op, &r, 400, |_| Vec2::ZERO, 0);
    assert!(op.heart.bpm > 120.0, "{}", op.heart.bpm);
}

#[test]
fn the_code_resurrects_on_a_good_shock_and_kills_on_a_bad_one() {
    let r = rules();
    let mut op = bare_op();
    op.vitals = 0.1;
    op.add(Hazard { kind: Kind::Lacer, a: Vec2::ZERO, b: Vec2::X, drain: 60.0, need: 2, blocking: true, ..Default::default() });
    drive(&mut op, &r, 2, |_| Vec2::ZERO, 0);
    assert!(op.code.is_some(), "vitals at zero starts a Code");
    assert_eq!(op.codes_left, 0, "attending has one");
    // Charge, then let go on the ghost beat.
    for _ in 0..600 {
        let c = match op.code {
            Some(c) => c,
            None => break,
        };
        let ready = op.slots[0].charge >= 1.0 && (c.ghost - 0.5).abs() * 0.9 < 0.05;
        let held = if ready { 0 } else { btn::DEFIB };
        drive(&mut op, &r, 1, |_| Vec2::ZERO, held);
    }
    assert!(op.code.is_none());
    assert_eq!(op.vitals.round(), 30.0);
    // A second time there's nothing left: straight to death.
    op.hazards.clear();
    op.vitals = 0.1;
    op.add(Hazard { kind: Kind::Lacer, a: Vec2::ZERO, b: Vec2::X, drain: 60.0, need: 2, blocking: true, ..Default::default() });
    drive(&mut op, &r, 2, |_| Vec2::ZERO, 0);
    assert!(op.dead);
}

#[test]
fn ranks_follow_the_par_and_retry_restores_a_checkpoint() {
    let mut sim = Sim::new("surgery/case/0", 5).unwrap();
    let (o, _) = sim.run_bot(60 * 60 * 6);
    assert_eq!(o, Outcome::Won);
    let r = game(&sim).results.clone().unwrap();
    assert!(["S", "ENCORE"].contains(&r.rank.as_str()), "bot at full skill: {} with {} of {}", r.rank, r.total, r.par);

    let mut sim = Sim::new("surgery/case/2", 5).unwrap();
    for _ in 0..600 {
        let f = sim.bot_input();
        sim.step(&f);
    }
    let g = surgery::get_mut(&mut sim).unwrap();
    g.skip_phase();
    g.skip_phase();
    let phase = g.op.as_ref().unwrap().phase;
    g.kill_patient();
    sim.step(&InputFrame::default());
    assert_eq!(game(&sim).stage, Stage::Dead);
    assert_eq!(sim.outcome(), Outcome::Lost);
    let mut f = InputFrame::default();
    f.surgeons[0] = SurgeonInput { active: true, pressed: btn::ADVANCE, held: btn::ADVANCE, ..Default::default() };
    sim.step(&f);
    assert_eq!(game(&sim).stage, Stage::Op, "retry is instant");
    assert_eq!(sim.outcome(), Outcome::Playing);
    let back = game(&sim).op.as_ref().unwrap().phase;
    assert!(back <= phase && back >= 1, "from the checkpoint: {back} of {phase}");
    assert!(content().cases[2].phase[back as usize].checkpoint);
}

#[test]
fn the_echo_repeats_an_action_on_the_next_target_at_the_same_rating() {
    let r = rules();
    let mut op = bare_op();
    op.slots[0].gift_kind = 2;
    op.gifts.echo = 5.0;
    select(&mut op, Tool::Forceps);
    op.add(Hazard { kind: Kind::Object, a: Vec2::ZERO, ang: 0.0, r: 0.45, blocking: true, ..Default::default() });
    op.add(Hazard { kind: Kind::Object, a: Vec2::new(4.0, 0.0), ang: 0.0, r: 0.45, blocking: true, ..Default::default() });
    drive(&mut op, &r, 1, |_| Vec2::ZERO, 0);
    drive(&mut op, &r, 40, |t| Vec2::new(t as f32 * 0.04, 0.0), btn::USE);
    assert!(op.hazards.is_empty(), "the ghost hands took the other one: {:?}", op.hazards);
    assert_eq!(op.slots[0].tally[Rating::Immaculate as usize], 2);
}

#[test]
fn the_hush_slows_the_world_but_not_the_hands() {
    let r = rules();
    let mut op = bare_op();
    op.slots[0].gift_kind = 1;
    op.slots[0].gift = 100.0;
    let before = op.timer;
    // Hold, then let go on the heartbeat.
    for _ in 0..240 {
        let held = if op.slots[0].arming && op.heart.from_r() < 0.05 { 0 } else { btn::GIFT };
        drive(&mut op, &r, 1, |_| Vec2::ZERO, held);
        if op.gifts.hush > 0.0 {
            break;
        }
    }
    assert!(op.gifts.hush > 0.0, "the Hush fired");
    let t0 = op.timer;
    drive(&mut op, &r, 60, |t| Vec2::new(t as f32 * 0.1, 0.0), 0);
    assert!((t0 - op.timer) < 0.5, "the clock crawls: {}", t0 - op.timer);
    assert!((op.slots[0].cursor.x - 5.9).abs() < 0.01, "the cursor doesn't");
    assert!(before > op.timer);
}

#[test]
fn content_is_sound_and_every_file_is_embedded() {
    let c = content();
    if let Err(e) = content::lint(&c) {
        panic!("{}", e.join("\n"));
    }
    assert_eq!(c.cases.len(), 9);
    assert!(c.sets.len() >= 8);
    let lines: usize = c.scenes.iter().map(|s| s.line.iter().filter(|l| l.text.is_some()).count()).sum();
    assert!((120..400).contains(&lines), "{lines} lines of story");
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src/games/surgery/content");
    let mut stack = vec![dir.clone()];
    let mut on_disk = Vec::new();
    while let Some(d) = stack.pop() {
        for e in std::fs::read_dir(d).unwrap() {
            let p = e.unwrap().path();
            if p.is_dir() {
                stack.push(p);
            } else if p.extension().is_some_and(|x| x == "toml") {
                on_disk.push(p.strip_prefix(&dir).unwrap().to_string_lossy().replace('\\', "/"));
            }
        }
    }
    for f in &on_disk {
        assert!(FILES.iter().any(|(p, _)| p == f), "{f} is on disk but not embedded");
    }
    for (p, _) in FILES {
        assert!(on_disk.iter().any(|f| f == p), "{p} is embedded but not on disk");
    }
    for (p, text) in FILES {
        assert!(!text.contains("TODO"), "{p} has a TODO");
    }
}

#[test]
fn code_blue_is_won_by_keeping_the_patient_alive_and_scales_for_a_team() {
    let mut sim = Sim::new("surgery/codeblue", 3).unwrap();
    let (o, ticks) = sim.run_bot(60 * 60 * 6);
    assert_eq!(o, Outcome::Won, "{ticks}: {}", status(&sim));
    // Four bots, four scores.
    let mut sim = Sim::new("surgery/codeblue", 4).unwrap();
    {
        let op = surgery::get_mut(&mut sim).unwrap().op.as_mut().unwrap();
        for s in op.slots.iter_mut().skip(1) {
            s.active = true;
            s.bot = true;
        }
    }
    let (o, _) = sim.run_bot(60 * 60 * 6);
    assert_eq!(o, Outcome::Won);
    let g = game(&sim);
    let scores = &g.results.as_ref().unwrap().scores;
    assert_eq!(scores.len(), 4);
    assert!(scores.iter().filter(|s| **s > 0).count() >= 3, "{scores:?}");
}

#[test]
fn attract_loops_through_its_segments_with_an_immortal_patient() {
    let mut sim = Sim::new("surgery/attract", 1).unwrap();
    let mut seen = std::collections::BTreeSet::new();
    for _ in 0..60 * 160 {
        sim.step(&InputFrame::default());
        seen.insert(game(&sim).demo_seg);
        assert_ne!(sim.outcome(), Outcome::Lost);
    }
    assert_eq!(seen.len(), 6, "{seen:?}");
    let g = game(&sim);
    assert!(cover::get(&g.op.as_ref().map(|o| o.cov.clone()).unwrap_or_default(), "code") == 0 || g.dev.immortal);
}

#[test]
fn a_mirror_draws_what_a_host_sends() {
    let mut sim = Sim::new("surgery/codeblue", 3).unwrap();
    for _ in 0..600 {
        let f = sim.bot_input();
        sim.step(&f);
    }
    let frame = sim.frame().surgery.unwrap();
    let v = surgery::net::encode(&frame, &[]);
    let text = v.to_string();
    assert!(text.len() < 2400, "{} bytes", text.len());
    let copy = surgery::net::decode(&v).unwrap();
    assert_eq!(copy.hazards.len(), frame.hazards.len());
    let mut client = Sim::new("surgery/mirror", 9).unwrap();
    surgery::get_mut(&mut client).unwrap().mirror_frame = Some(std::sync::Arc::new(copy));
    let seen = client.frame().surgery.unwrap();
    assert_eq!(seen.hazards.len(), frame.hazards.len());
}
