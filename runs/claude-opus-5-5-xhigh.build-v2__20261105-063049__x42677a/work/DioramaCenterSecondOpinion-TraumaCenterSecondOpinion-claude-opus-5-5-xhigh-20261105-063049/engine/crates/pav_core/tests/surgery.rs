//! The surgery game's rules: the bot wins, a careless player loses, the whole campaign runs,
//! determinism holds, and every instrument, hazard, strain, gift and Code gets exercised.

use glam::Vec2;
use pav_core::Sim;
use pav_core::games::Outcome;
use pav_core::games::surgery::content::{self, CODE_BLUE};
use pav_core::games::surgery::field::{HazardKind, Rating, Tool};
use pav_core::games::surgery::frame::Stage;
use pav_core::games::surgery::tune;
use pav_core::games::surgery::{Surgery, net, rank_for};
use pav_core::input::{InputFrame, SurgeonInput, SurgeryCmd, hands};

const MAX_TICKS: u64 = 60 * 60 * 40;

fn sim(scene: &str, seed: u64) -> Sim {
    Sim::new(scene, seed).unwrap()
}

fn game(sim: &Sim) -> &Surgery {
    sim.play().unwrap().get::<Surgery>().unwrap()
}

fn game_mut(sim: &mut Sim) -> &mut Surgery {
    sim.state.play.as_mut().unwrap().get_mut::<Surgery>().unwrap()
}

fn step_cmd(sim: &mut Sim, cmd: SurgeryCmd) {
    sim.step(&InputFrame { surgery: Some(cmd), ..Default::default() });
}

/// Past the chart and the banner, into the operation.
fn into_op(sim: &mut Sim) {
    step_cmd(sim, SurgeryCmd::Advance);
    for _ in 0..200 {
        if game(sim).stage == Stage::Op {
            return;
        }
        sim.step(&InputFrame::default());
    }
    panic!("never reached the operation");
}

fn hold(sim: &mut Sim, slot: usize, aim: Vec2, tool: i8, held: u8, ticks: u32) {
    for i in 0..ticks {
        let mut f = InputFrame::default();
        f.surgeons[slot] = SurgeonInput {
            active: true,
            aim,
            held,
            pressed: if i == 0 { held } else { 0 },
            tool,
            pressure: 1.0,
            assist: 0.0,
            rotate: 0,
        };
        sim.step(&f);
    }
}

fn place(g: &Surgery, t: Tool) -> i8 {
    g.op.ring.iter().position(|x| *x == t).unwrap() as i8
}

#[test]
fn the_bot_wins_every_case() {
    for case in 0..content::CASES {
        for seed in 1..=10 {
            let mut s = sim(&format!("surgery/case/{case}"), seed);
            let (o, t) = s.run_bot(MAX_TICKS);
            let g = game(&s);
            assert_eq!(
                o,
                Outcome::Won,
                "case {case} seed {seed}: {:?} after {t} ticks, phase {}, hazards {:?}, vitals {}",
                g.stage,
                g.op.phase,
                g.op.hazards.iter().map(|h| (h.kind, h.stage)).collect::<Vec<_>>(),
                g.op.vitals
            );
        }
    }
}

#[test]
fn the_bot_keeps_code_blue_alive() {
    for seed in 1..=10 {
        let mut s = sim("surgery/codeblue", seed);
        let (o, _) = s.run_bot(MAX_TICKS);
        assert_eq!(o, Outcome::Won, "seed {seed}");
    }
}

#[test]
fn the_bot_wins_the_whole_campaign_on_ten_seeds() {
    for seed in 1..=10 {
        let mut s = sim("surgery/campaign", seed);
        let (o, t) = s.run_bot(MAX_TICKS * 4);
        assert_eq!(o, Outcome::Won, "seed {seed}, after {t} ticks");
        assert_eq!(game(&s).cases_won, content::CASES as u32, "seed {seed}");
    }
}

#[test]
fn the_whole_campaign_plays_through_and_covers_everything() {
    let mut s = sim("surgery/campaign", 7);
    let (o, t) = s.run_bot(MAX_TICKS * 4);
    let g = game(&s);
    assert_eq!(o, Outcome::Won, "after {t} ticks: {:?} case {} phase {}", g.stage, g.op.case, g.op.phase);
    assert_eq!(g.cases_won, content::CASES as u32);
    let c = &g.coverage;
    for t in Tool::ALL {
        assert!(c.tools[t as usize] > 0, "{t:?} never used");
    }
    for k in HazardKind::ALL {
        assert!(c.spawned[k as usize] > 0, "{k:?} never spawned");
    }
    for k in [
        HazardKind::Laceration,
        HazardKind::Pool,
        HazardKind::Bleeder,
        HazardKind::Foreign,
        HazardKind::Polyp,
        HazardKind::Tumor,
        HazardKind::Burn,
        HazardKind::Bone,
        HazardKind::Nodule,
        HazardKind::Sac,
        HazardKind::Eye,
        HazardKind::Ember,
        HazardKind::Tether,
        HazardKind::Tendril,
        HazardKind::Closure,
        HazardKind::Furnace,
    ] {
        assert!(c.cleared[k as usize] > 0, "{k:?} never cleared");
    }
    for note in [
        "hush",
        "echo",
        "duet",
        "gift_woke",
        "code_scripted",
        "strain_Introit",
        "strain_Lacrimosa",
        "strain_DiesIrae",
        "strain_Shocks",
        "strain_Soloist",
        "introit_wave_0",
        "introit_wave_1",
        "introit_wave_2",
        "introit_wave_3",
        "eye_opened",
        "eye_cut",
        "eye_torn_out",
        "ember_frozen",
        "ember_out",
        "embers_merged",
        "furnace_revealed",
        "furnace_out",
        "ring_sweep",
        "bone_snap",
        "revealed",
        "nodule_step",
        "nodule_telegraph",
        "tendril_out",
        "on_beat",
        "echo_repeat",
        "plate_bowel",
        "plate_furnace",
    ] {
        assert!(c.notes.contains_key(note), "{note} never happened: {:?}", c.notes.keys().collect::<Vec<_>>());
    }
    assert!(c.ratings[Rating::Immaculate as usize] > 0);
    assert!(c.ratings[Rating::Clean as usize] + c.ratings[Rating::Good as usize] > 0);
}

#[test]
fn a_player_who_does_nothing_loses_every_case() {
    for case in 0..content::CASES {
        let mut s = sim(&format!("surgery/case/{case}"), 1);
        step_cmd(&mut s, SurgeryCmd::Advance);
        for _ in 0..60 * 60 * 14 {
            if s.outcome() != Outcome::Playing {
                break;
            }
            s.step(&InputFrame::default());
        }
        assert_eq!(s.outcome(), Outcome::Lost, "case {case} survived an idle surgeon: {:?}", game(&s).stage);
    }
}

#[test]
fn a_player_spamming_random_tools_loses_too() {
    for case in [0usize, 3, 7] {
        let mut s = sim(&format!("surgery/case/{case}"), 2);
        step_cmd(&mut s, SurgeryCmd::Advance);
        let mut x = 0x1234_5678u32;
        let mut r = move || {
            x ^= x << 13;
            x ^= x >> 17;
            x ^= x << 5;
            (x >> 8) as f32 / (1 << 24) as f32
        };
        for t in 0..60 * 60 * 14 {
            if s.outcome() != Outcome::Playing {
                break;
            }
            let mut f = InputFrame::default();
            if t % 20 == 0 {
                let aim = Vec2::new(r() * 18.0 - 9.0, r() * 8.0 - 4.0);
                f.surgeons[0] = SurgeonInput {
                    active: true,
                    aim,
                    held: hands::USE,
                    pressed: hands::USE,
                    tool: (r() * 8.0) as i8,
                    pressure: 1.0,
                    ..Default::default()
                };
            } else {
                let g = game(&s);
                f.surgeons[0] =
                    SurgeonInput { active: true, aim: g.surgeons[0].raw, pressure: 1.0, tool: -1, ..Default::default() };
            }
            s.step(&f);
        }
        assert_ne!(s.outcome(), Outcome::Won, "case {case}: random flailing won");
    }
}

#[test]
fn snapshots_rewind_and_replays_are_exact() {
    let mut a = sim("surgery/case/3", 5);
    let mut b = sim("surgery/case/3", 5);
    for _ in 0..1800 {
        let f = a.bot_input();
        a.step(&f);
        b.step(&f);
    }
    assert_eq!(a.state_hash(), b.state_hash());
    // Rewind goes back to the same state.
    let target = a.state.tick - 120;
    let before = {
        let mut c = sim("surgery/case/3", 5);
        for _ in 0..target {
            let f = c.bot_input();
            c.step(&f);
        }
        c.state_hash()
    };
    assert!(a.rewind_to(target));
    assert_eq!(a.state_hash(), before);
}

#[test]
fn forceps_rate_by_angle_and_tear_off_axis() {
    let mut s = sim("surgery/case/0", 1);
    into_op(&mut s);
    // Skip the prep to the hooks.
    step_cmd(&mut s, SurgeryCmd::Cheat { id: tune::cheat::SKIP_PHASE, value: 1.0 });
    let g = game(&s);
    let forceps = place(g, Tool::Forceps);
    let h = g.op.hazards.iter().find(|h| h.kind == HazardKind::Foreign).unwrap().clone();
    // A clean pull along the axis.
    hold(&mut s, 0, h.pos, forceps, 0, 2);
    hold(&mut s, 0, h.pos, forceps, hands::USE, 2);
    let along = h.pos + Vec2::from_angle(h.axis) * 1.1;
    hold(&mut s, 0, along, forceps, hands::USE, 3);
    assert_eq!(game(&s).surgeons[0].counts[Rating::Immaculate as usize], 1, "along the axis is immaculate");
    // A yank straight across the axis tears.
    let g = game(&s);
    let h2 = g.op.hazards.iter().find(|x| x.kind == HazardKind::Foreign && x.id != h.id).unwrap().clone();
    let lacs = g.op.hazards.iter().filter(|x| x.kind == HazardKind::Laceration).count();
    hold(&mut s, 0, h2.pos, forceps, 0, 2);
    hold(&mut s, 0, h2.pos, forceps, hands::USE, 2);
    let across = h2.pos + Vec2::from_angle(h2.axis + std::f32::consts::PI) * 1.2;
    hold(&mut s, 0, across, forceps, hands::USE, 3);
    let g = game(&s);
    assert_eq!(g.surgeons[0].counts[Rating::Sloppy as usize], 1, "a yank is sloppy");
    assert_eq!(g.surgeons[0].chain, 0, "sloppy resets the chain");
    assert!(g.op.hazards.iter().filter(|x| x.kind == HazardKind::Laceration).count() > lacs, "it tore");
    assert_eq!(g.op.mistakes, 1);
}

#[test]
fn the_scalpel_rates_by_deviation_and_healthy_tissue_costs() {
    let mut s = sim("surgery/case/1", 1);
    into_op(&mut s);
    let g = game(&s);
    let scalpel = place(g, Tool::Scalpel);
    let line = g.op.hazards.iter().find(|h| h.kind == HazardKind::Incision).unwrap().clone();
    hold(&mut s, 0, line.pts[0], scalpel, 0, 2);
    hold(&mut s, 0, line.pts[0], scalpel, hands::USE, 2);
    // Walk the line in small steps.
    let n = 80;
    let len = line.len();
    for i in 0..=n {
        let p = pav_core::games::surgery::field::polyline_at(&line.pts, len * i as f32 / n as f32).0;
        hold(&mut s, 0, p, scalpel, hands::USE, 1);
    }
    let g = game(&s);
    assert_eq!(g.surgeons[0].counts[Rating::Immaculate as usize], 1, "on the line is immaculate");
    // Now off the line, on healthy tissue.
    let vitals = g.op.vitals;
    let mut p = Vec2::new(-7.0, 3.0);
    hold(&mut s, 0, p, scalpel, 0, 2);
    for _ in 0..60 {
        p.x += 0.1;
        hold(&mut s, 0, p, scalpel, hands::USE, 1);
    }
    let g = game(&s);
    assert!(g.op.mistakes >= 1, "cutting healthy tissue is a mistake");
    assert!(g.op.vitals < vitals);
}

#[test]
fn wrong_tool_clinks_and_resets_the_chain() {
    let mut s = sim("surgery/case/0", 1);
    into_op(&mut s);
    step_cmd(&mut s, SurgeryCmd::Cheat { id: tune::cheat::SKIP_PHASE, value: 1.0 });
    let g = game(&s);
    let h = g.op.hazards.iter().find(|h| h.kind == HazardKind::Foreign).unwrap().clone();
    let laser = place(g, Tool::Laser);
    game_mut(&mut s).surgeons[0].chain = 7;
    hold(&mut s, 0, h.pos, laser, 0, 2);
    hold(&mut s, 0, h.pos, laser, hands::USE, 2);
    let g = game(&s);
    assert_eq!(g.surgeons[0].chain, 0);
    assert_eq!(g.op.counters.notes.get("wrong_tool"), Some(&1));
    assert!(g.hazard(h.id).is_some(), "no effect");
}

#[test]
fn laser_rates_on_release_and_overheating_burns() {
    let mut s = sim("surgery/case/1", 1);
    into_op(&mut s);
    step_cmd(&mut s, SurgeryCmd::Cheat { id: tune::cheat::SKIP_PHASE, value: 1.0 });
    for _ in 0..3 {
        s.step(&InputFrame::default());
    }
    let g = game(&s);
    let laser = place(g, Tool::Laser);
    let polyps: Vec<_> = g.op.hazards.iter().filter(|h| h.kind == HazardKind::Polyp).cloned().collect();
    // Hold about 1.12 s at full pressure: 93%, then let go.
    hold(&mut s, 0, polyps[0].pos, laser, 0, 2);
    hold(&mut s, 0, polyps[0].pos, laser, hands::USE, 67);
    hold(&mut s, 0, polyps[0].pos, laser, 0, 2);
    let g = game(&s);
    assert_eq!(g.surgeons[0].counts[Rating::Immaculate as usize], 1, "released near full");
    assert!(g.hazard(polyps[0].id).is_none());
    // Far too long: burn.
    let burns = g.op.hazards.iter().filter(|h| h.kind == HazardKind::Burn).count();
    hold(&mut s, 0, polyps[1].pos, laser, hands::USE, 100);
    let g = game(&s);
    assert!(g.op.hazards.iter().filter(|h| h.kind == HazardKind::Burn).count() > burns, "overheating makes a burn");
    assert!(g.op.mistakes >= 1);
}

#[test]
fn iv_green_band_heals_and_overdose_hurts() {
    let mut s = sim("surgery/case/0", 1);
    into_op(&mut s);
    game_mut(&mut s).op.vitals = 50.0;
    let iv = place(game(&s), Tool::Iv);
    hold(&mut s, 0, Vec2::ZERO, iv, 0, 2);
    hold(&mut s, 0, Vec2::ZERO, iv, hands::USE, 68);
    hold(&mut s, 0, Vec2::ZERO, iv, 0, 2);
    let g = game(&s);
    assert!(g.op.vitals > 60.0, "a full dose: {}", g.op.vitals);
    assert!(g.surgeons[0].iv_cool > 3.5, "then a cooldown");
    // Overdose after the cooldown.
    game_mut(&mut s).surgeons[0].iv_cool = 0.0;
    let v = game(&s).op.vitals;
    hold(&mut s, 0, Vec2::ZERO, iv, hands::USE, 100);
    hold(&mut s, 0, Vec2::ZERO, iv, 0, 60);
    assert!(game(&s).op.vitals < v, "an overdose costs vitals");
    assert_eq!(game(&s).op.counters.notes.get("overdose"), Some(&1));
}

#[test]
fn pumping_the_iv_never_pays() {
    let dose = |vitals: f32| -> (i32, u32, f32) {
        let mut s = sim("surgery/case/0", 1);
        into_op(&mut s);
        let g = game_mut(&mut s);
        g.op.vitals = vitals;
        g.surgeons[0].chain = 3;
        g.surgeons[0].chain_t = 8.0;
        let iv = place(game(&s), Tool::Iv);
        hold(&mut s, 0, Vec2::ZERO, iv, 0, 2);
        hold(&mut s, 0, Vec2::ZERO, iv, hands::USE, 68);
        hold(&mut s, 0, Vec2::ZERO, iv, 0, 2);
        let g = game(&s);
        (g.surgeons[0].score, g.surgeons[0].chain, g.surgeons[0].gift)
    };
    // A patient with almost nothing to heal (only what drained during the dose): next to nothing.
    let (score, chain, gift) = dose(100.0);
    assert!(score <= 15 && gift < 1.0, "a dose nobody needed paid {score} and {gift} gift");
    assert_eq!(chain, 3, "it neither builds a chain nor breaks one");
    // A patient who needs it: rated, but a quarter of a full award at the very most.
    let (score, chain, _) = dose(40.0);
    assert!(score > 0, "a needed dose still earns something");
    assert!(score as f32 <= 400.0 * 1.25 * 0.25, "a dose pays less than surgery: {score}");
    assert_eq!(chain, 3);
}

#[test]
fn better_hands_outscore_slower_ones() {
    // Average over seeds: what matters is the trend, and one lucky run of on-beat finishes isn't it.
    let average = |case: usize, skill: f32| -> Option<i32> {
        let mut totals = Vec::new();
        for seed in 1..=6 {
            let mut s = sim(&format!("surgery/case/{case}"), seed);
            game_mut(&mut s).bot_skill = skill;
            let (o, _) = s.run_bot(MAX_TICKS);
            if o == Outcome::Won {
                totals.push(game(&s).results.as_ref().unwrap().total);
            }
        }
        (!totals.is_empty()).then(|| totals.iter().sum::<i32>() / totals.len() as i32)
    };
    for case in 0..content::CASES {
        let best = average(case, 1.0).expect("skill 1.0 wins");
        for skill in [0.7, 0.5, 0.3] {
            if let Some(slow) = average(case, skill) {
                assert!(slow <= best, "case {case}: skill {skill} averaged {slow} over skill 1.0's {best}");
            }
        }
    }
}

#[test]
fn on_beat_action_pays_more_and_chains_multiply() {
    assert_eq!(rank_for(0.5), "C");
    assert_eq!(rank_for(0.71), "B");
    assert_eq!(rank_for(0.86), "A");
    assert_eq!(rank_for(1.0), "S");
    assert_eq!(rank_for(1.2), "ENCORE");
    let mut s = sim("surgery/case/0", 1);
    into_op(&mut s);
    let mut ev = Vec::new();
    let g = game_mut(&mut s);
    g.heart.phase = 0.5;
    g.heart.since_r = 0.4;
    g.award(0, Rating::Clean, Tool::Gel, Vec2::ZERO, false, &mut ev);
    let off = g.surgeons[0].score;
    assert_eq!(off, 250);
    g.heart.phase = 0.0;
    g.heart.since_r = 0.0;
    g.award(0, Rating::Clean, Tool::Gel, Vec2::ZERO, false, &mut ev);
    assert_eq!(g.surgeons[0].score - off, 312, "on beat is +25%");
    g.surgeons[0].chain = 9;
    let before = g.surgeons[0].score;
    g.heart.phase = 0.5;
    g.heart.since_r = 0.4;
    g.award(0, Rating::Immaculate, Tool::Gel, Vec2::ZERO, false, &mut ev);
    assert_eq!(g.surgeons[0].score - before, 600, "×1.5 at ten");
}

#[test]
fn a_code_needs_the_ghost_beat_and_retry_returns_to_the_checkpoint() {
    let mut s = sim("surgery/case/0", 1);
    into_op(&mut s);
    step_cmd(&mut s, SurgeryCmd::Cheat { id: tune::cheat::SKIP_PHASE, value: 1.0 });
    game_mut(&mut s).op.vitals = 0.0;
    s.step(&InputFrame::default());
    assert_eq!(game(&s).stage, Stage::Code);
    // A release with no charge does nothing.
    let aim = Vec2::ZERO;
    hold(&mut s, 0, aim, -1, hands::DEFIB, 5);
    hold(&mut s, 0, aim, -1, 0, 2);
    assert_eq!(game(&s).stage, Stage::Code);
    assert!(game(&s).op.counters.notes.contains_key("defib_miss"));
    // Nobody shocks it again: with no Codes left, it dies.
    for _ in 0..60 * 6 {
        s.step(&InputFrame::default());
    }
    assert_eq!(game(&s).stage, Stage::Dead);
    assert_eq!(s.outcome(), Outcome::Lost);
    step_cmd(&mut s, SurgeryCmd::Retry { from_start: false });
    let g = game(&s);
    assert_eq!(s.outcome(), Outcome::Playing);
    assert_eq!(g.stage, Stage::OpStart);
    assert_eq!(g.op.phase, 1, "from the checkpoint");
}

#[test]
fn the_bot_lands_a_shock() {
    let mut s = sim("surgery/case/2", 2);
    let (o, _) = s.run_bot(MAX_TICKS);
    assert_eq!(o, Outcome::Won);
    assert!(game(&s).coverage.tools[Tool::Defib as usize] > 0);
}

#[test]
fn the_hush_slows_the_world_but_not_the_cursor() {
    let mut s = sim("surgery/case/3", 1);
    into_op(&mut s);
    {
        let g = game_mut(&mut s);
        g.op.gift_awake = true;
        g.surgeons[0].gift = 100.0;
    }
    let mut ev = Vec::new();
    game_mut(&mut s).fire_gift(0, &mut ev);
    let g = game(&s);
    assert!(g.gifts.hush_beats >= 6.0);
    let (t0, clock0) = (g.op.timer, g.op.clock);
    hold(&mut s, 0, Vec2::new(5.0, 1.0), -1, 0, 60);
    let g = game(&s);
    assert!((g.op.clock - clock0 - 0.3).abs() < 0.02, "the world at 30%: {}", g.op.clock - clock0);
    assert!((t0 - g.op.timer - 0.3).abs() < 0.02);
    assert_eq!(g.surgeons[0].cursor, Vec2::new(5.0, 1.0), "the cursor is real time");
}

#[test]
fn the_echo_repeats_on_the_next_target_at_the_same_rating() {
    let mut s = sim("surgery/case/0", 1);
    into_op(&mut s);
    step_cmd(&mut s, SurgeryCmd::Cheat { id: tune::cheat::SKIP_PHASE, value: 1.0 });
    {
        let g = game_mut(&mut s);
        g.gifts.echo_t = 10.0;
    }
    let g = game(&s);
    let n = g.op.hazards.iter().filter(|h| h.kind == HazardKind::Foreign).count();
    let forceps = place(g, Tool::Forceps);
    let h = g.op.hazards.iter().find(|h| h.kind == HazardKind::Foreign).unwrap().clone();
    hold(&mut s, 0, h.pos, forceps, 0, 2);
    hold(&mut s, 0, h.pos, forceps, hands::USE, 2);
    hold(&mut s, 0, h.pos + Vec2::from_angle(h.axis) * 1.1, forceps, hands::USE, 2);
    for _ in 0..40 {
        s.step(&InputFrame::default());
    }
    let g = game(&s);
    assert_eq!(g.op.hazards.iter().filter(|h| h.kind == HazardKind::Foreign).count(), n - 2, "both hands");
    assert_eq!(g.surgeons[0].counts[Rating::Immaculate as usize], 2);
    assert!(g.op.counters.notes.contains_key("echo_repeat"));
}

#[test]
fn the_tremor_shakes_only_pets_hand_and_precision_stills_it() {
    let mut s = sim("surgery/case/5", 1);
    into_op(&mut s);
    let aim = Vec2::new(1.0, 1.0);
    hold(&mut s, 0, aim, -1, 0, 30);
    assert_ne!(game(&s).surgeons[0].cursor, aim, "it shakes");
    hold(&mut s, 0, aim, -1, hands::PRECISION, 2);
    assert_eq!(game(&s).surgeons[0].cursor, aim, "precision stills it");
    step_cmd(&mut s, SurgeryCmd::Tremor(false));
    hold(&mut s, 0, aim, -1, 0, 30);
    assert_eq!(game(&s).surgeons[0].cursor, aim, "the setting turns it off");
    let mut m = sim("surgery/case/3", 1);
    into_op(&mut m);
    hold(&mut m, 0, aim, -1, 0, 30);
    assert_eq!(game(&m).surgeons[0].cursor, aim, "Mara's hand doesn't");
}

#[test]
fn slots_operate_independently_and_each_has_a_score() {
    let mut s = sim("surgery/codeblue", 3);
    step_cmd(&mut s, SurgeryCmd::Join { slot: 1 });
    into_op(&mut s);
    for _ in 0..120 {
        s.step(&InputFrame::default());
    }
    let g = game(&s);
    assert!(g.surgeons[1].present);
    let h = g.op.hazards.iter().find(|h| h.kind == HazardKind::Foreign).cloned();
    let forceps = place(g, Tool::Forceps);
    if let Some(h) = h {
        hold(&mut s, 1, h.pos, forceps, 0, 2);
        hold(&mut s, 1, h.pos, forceps, hands::USE, 2);
        hold(&mut s, 1, h.pos + Vec2::from_angle(h.axis) * 1.1, forceps, hands::USE, 2);
        let g = game(&s);
        assert!(g.surgeons[1].score > 0, "slot 1 scored");
        assert_eq!(g.surgeons[0].score, 0, "slot 0 did not");
    }
}

#[test]
fn a_snapshot_survives_the_wire_and_stays_small() {
    let mut s = sim("surgery/codeblue", 3);
    step_cmd(&mut s, SurgeryCmd::Join { slot: 1 });
    into_op(&mut s);
    for _ in 0..60 * 40 {
        let f = s.bot_input();
        s.step(&f);
    }
    let frame = game(&s).frame();
    let v = net::encode_frame(&frame, &[(1, 3, 0.0, 0.0)]);
    let text = serde_json::to_string(&v).unwrap();
    assert!(text.len() < 4000, "snapshot {} bytes", text.len());
    let back = net::decode_frame(&v, &Default::default());
    assert_eq!(back.hazards.len(), frame.hazards.len());
    assert_eq!(back.surgeons.len(), frame.surgeons.len());
    assert!((back.vitals - frame.vitals).abs() < 0.2);
    assert_eq!(back.case_no, CODE_BLUE);
    let hands = SurgeonInput { active: true, aim: Vec2::new(1.5, -2.0), held: 1, tool: 3, pressure: 0.5, ..Default::default() };
    let round = net::decode_input(&net::encode_input(&hands, 1));
    assert_eq!(round.aim, hands.aim);
    assert_eq!(round.tool, 3);
}

#[test]
fn attract_loops_through_its_segments_with_nobody_at_the_table() {
    let mut s = sim("surgery/attract", 1);
    let mut seen = std::collections::BTreeSet::new();
    for _ in 0..60 * 150 {
        s.step(&InputFrame::default());
        seen.insert(game(&s).attract_seg);
    }
    assert_eq!(seen.len(), 6, "{seen:?}");
    assert_eq!(s.outcome(), Outcome::Playing);
}

#[test]
fn the_tune_table_resets_and_the_title_scene_builds() {
    let mut s = sim("surgery/title", 1);
    assert_eq!(game(&s).stage, Stage::Title);
    step_cmd(&mut s, SurgeryCmd::SetTune { id: tune::DRAIN as u16, value: 2.0 });
    assert_eq!(game(&s).tune.get(tune::DRAIN), 2.0);
    step_cmd(&mut s, SurgeryCmd::ResetTune);
    assert_eq!(game(&s).tune.get(tune::DRAIN), 1.0);
}

#[test]
fn an_unknown_scene_says_what_exists() {
    let e = Sim::new("surgery/nope", 1).err().unwrap().to_string();
    assert!(e.contains("campaign"), "{e}");
    assert!(Sim::new("surgery/case/99", 1).is_err());
}

fn run_skill(scene: &str, seed: u64, skill: f32) -> (Outcome, Option<String>) {
    let mut s = sim(scene, seed);
    game_mut(&mut s).bot_skill = skill;
    let (o, _) = s.run_bot(MAX_TICKS);
    (o, game(&s).results.as_ref().map(|r| r.rank.to_string()))
}

#[test]
fn the_balance_targets_hold() {
    for case in 0..content::CASES {
        let scene = format!("surgery/case/{case}");
        // Skill 1.0 wins at S or above.
        for seed in 1..=2 {
            let (o, rank) = run_skill(&scene, seed, 1.0);
            assert_eq!(o, Outcome::Won, "{scene} at 1.0");
            let r = rank.unwrap();
            assert!(r == "S" || r == "ENCORE", "{scene} at 1.0 ranked {r}");
        }
        // Skill 0 always loses.
        assert_eq!(run_skill(&scene, 1, 0.0).0, Outcome::Lost, "{scene} at 0");
    }
    // Skill 0.7 wins most; 0.4 loses the later cases.
    let wins = |skill: f32, cases: std::ops::Range<usize>| -> (usize, usize) {
        let mut won = 0;
        let mut all = 0;
        for case in cases {
            for seed in 1..=2 {
                all += 1;
                if run_skill(&format!("surgery/case/{case}"), seed, skill).0 == Outcome::Won {
                    won += 1;
                }
            }
        }
        (won, all)
    };
    let (w, n) = wins(0.7, 0..content::CASES);
    assert!(w * 10 >= n * 6, "0.7 should win most: {w}/{n}");
    let (w, n) = wins(0.4, 3..content::CASES);
    assert!(w * 2 <= n, "0.4 should lose the later cases: {w}/{n}");
}

/// Each difficulty at each skill: wins, and how long a win takes. `cargo test difficulty_table -- --ignored --nocapture`
#[test]
#[ignore]
fn difficulty_table() {
    for d in 0..3u8 {
        for skill in [0.7f32, 0.5, 0.4, 0.3] {
            let mut line = format!("diff{d} skill{skill:.1}:");
            let mut total = 0;
            for case in 0..content::CASES {
                let (mut wins, mut secs) = (0, 0);
                for seed in 1..=4 {
                    let mut s = sim(&format!("surgery/case/{case}"), seed);
                    step_cmd(&mut s, SurgeryCmd::Difficulty(d));
                    game_mut(&mut s).bot_skill = skill;
                    let (o, ticks) = s.run_bot(MAX_TICKS);
                    if o == Outcome::Won {
                        wins += 1;
                    }
                    secs += ticks / 60;
                }
                total += secs / 4;
                line += &format!(" c{case} {wins}/4 {:3}s", secs / 4);
            }
            println!("{line} = {} min", total / 60);
        }
    }
}

/// Where the points come from, per tool, per case and skill. `cargo test score_sources -- --ignored --nocapture`
#[test]
#[ignore]
fn score_sources() {
    for case in 0..content::CASES {
        for skill in [1.0f32, 0.7, 0.5, 0.3] {
            let mut s = sim(&format!("surgery/case/{case}"), 3);
            game_mut(&mut s).bot_skill = skill;
            let mut by_tool: std::collections::BTreeMap<String, (i32, u32)> = Default::default();
            let mut last = 0;
            let mut t = 0;
            while s.outcome() == Outcome::Playing && t < MAX_TICKS {
                let f = s.bot_input();
                s.step(&f);
                t += 1;
                let g = game(&s);
                let now: i32 = g.surgeons.iter().map(|x| x.score).sum();
                if now != last {
                    let e = by_tool.entry(format!("{:?}", g.surgeons[0].last_tool)).or_default();
                    e.0 += now - last;
                    e.1 += 1;
                    last = now;
                }
            }
            let g = game(&s);
            println!(
                "case{case} skill{skill:.1} {:?} {:4}s score {:6} rank {:?} mistakes {:2} {:?}",
                s.outcome(),
                t / 60,
                last,
                g.results.as_ref().map(|r| r.rank.to_string()),
                g.op.mistakes,
                by_tool
            );
        }
    }
}

/// A balance probe: what happens over time in one case at one skill. `cargo test probe -- --ignored --nocapture`
#[test]
#[ignore]
fn probe() {
    let case: u8 = std::env::var("CASE").ok().and_then(|v| v.parse().ok()).unwrap_or(6);
    let skill: f32 = std::env::var("SKILL").ok().and_then(|v| v.parse().ok()).unwrap_or(0.7);
    let diff: u8 = std::env::var("DIFF").ok().and_then(|v| v.parse().ok()).unwrap_or(1);
    for seed in 1..=2 {
        let mut s = sim(&format!("surgery/case/{case}"), seed);
        step_cmd(&mut s, SurgeryCmd::Difficulty(diff));
        game_mut(&mut s).bot_skill = skill;
        let mut t = 0;
        while s.outcome() == Outcome::Playing && t < 60 * 60 * 15 {
            let f = s.bot_input();
            s.step(&f);
            t += 1;
            let detail = std::env::var("DETAIL").is_ok();
            if detail && t % 30 == 0 && (60 * 60..60 * 75).contains(&t) {
                let g = game(&s);
                let x = &g.surgeons[0];
                let hid: Vec<String> =
                    g.op.hazards
                        .iter()
                        .filter(|h| h.required)
                        .map(|h| {
                            format!(
                                "{} hid{} rev{:.1} cov{} {:.1},{:.1}",
                                h.kind.name(),
                                h.hidden,
                                h.reveal,
                                g.covered(h),
                                h.pos.x,
                                h.pos.y
                            )
                        })
                        .collect();
                println!(
                    "d{:5.1} v{:5.1} tool {:?} eng {} using {} iv_on {} cool {:.1} raw {:.1},{:.1} last {:.1} | {:?}",
                    t as f32 / 60.0,
                    g.op.vitals,
                    x.tool,
                    x.engaged,
                    x.using,
                    x.iv_on,
                    x.iv_cool,
                    x.raw.x,
                    x.raw.y,
                    g.op.clock - x.last_action,
                    hid
                );
            }
            if t % (60 * 15) == 0 {
                let g = game(&s);
                let kinds: std::collections::BTreeMap<String, u32> = g.op.hazards.iter().fold(Default::default(), |mut m, h| {
                    *m.entry(h.kind.name().to_string()).or_insert(0) += 1;
                    m
                });
                println!(
                    "t{:4} {:?} ph{} v{:5.1} drain {:4.1} fever {:?} {:?}",
                    t / 60,
                    g.stage,
                    g.op.phase,
                    g.op.vitals,
                    g.op.drain_now,
                    g.op.strain.as_ref().and_then(|x| x.fever),
                    kinds
                );
            }
        }
        let g = game(&s);
        println!(
            "seed {seed}: {:?} after {}s ph{} mistakes {} notes {:?}",
            s.outcome(),
            t / 60,
            g.op.phase,
            g.op.mistakes,
            g.op.counters.notes
        );
    }
}

/// The easy setting has to let an unhurried player through, or the campaign stops there.
#[test]
fn a_slow_player_finishes_every_case_on_resident() {
    for case in 0..content::CASES {
        for seed in 1..=2 {
            let mut s = sim(&format!("surgery/case/{case}"), seed);
            step_cmd(&mut s, SurgeryCmd::Difficulty(0));
            game_mut(&mut s).bot_skill = 0.4;
            let (o, t) = s.run_bot(MAX_TICKS);
            assert_eq!(o, Outcome::Won, "case {case} seed {seed} on Resident at skill 0.4, after {}s", t / 60);
        }
    }
}

/// A pad player: the bot's wishes, sent through the stick's speed curve and aim assist, at 60 Hz.
fn play_with_stick(scene: &str, seed: u64) -> (Outcome, u64) {
    use pav_core::games::surgery::surgeon;
    let mut s = sim(scene, seed);
    let mut aim = Vec2::ZERO;
    let dt = 1.0 / 60.0;
    for t in 0..MAX_TICKS {
        if s.outcome() != Outcome::Playing {
            return (s.outcome(), t);
        }
        let mut f = s.bot_input();
        let want = f.surgeons[0];
        let g = game(&s);
        // The stick points where the bot wants to go, as far as the curve allows.
        let d = want.aim - aim;
        let need = d.length() / (15.0 * dt);
        let stick = if need > 0.0 { d.normalize_or_zero() * need.min(1.0).powf(1.0 / 2.2) } else { Vec2::ZERO };
        let targets: Vec<Vec2> = g.frame().targets(g.surgeons[0].tool).collect();
        aim = surgeon::integrate(aim, stick, 15.0, false, 1.0, dt, targets.into_iter());
        f.surgeons[0].aim = aim;
        f.surgeons[0].assist = 1.0;
        s.step(&f);
    }
    (s.outcome(), MAX_TICKS)
}

#[test]
fn a_pad_with_aim_assist_can_finish_the_cases() {
    for case in 0..content::CASES {
        let scene = format!("surgery/case/{case}");
        let (o, t) = play_with_stick(&scene, 4);
        assert_eq!(o, Outcome::Won, "{scene} on a pad, after {t} ticks");
    }
}
