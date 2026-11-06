use pav_core::games::Outcome;
use pav_core::games::surgery::*;
use pav_core::{Sim, SimState};

fn play(g: &mut Surgery, limit: usize) {
    for _ in 0..limit {
        if g.mode != "operation" {
            break;
        }
        let mut i = [SurgeonInput::default(); 4];
        i[0] = g.bot_seat(0);
        if g.case == 7 {
            i[1] = g.bot_seat(1);
        }
        g.tick(i, 1. / 60.);
    }
}
#[test]
fn every_case_is_winnable() {
    for n in 0..8 {
        for _ in 0..3 {
            let mut g = Surgery::new(n, false, false);
            play(&mut g, 60 * 900);
            assert_eq!(
                g.outcome,
                Outcome::Won,
                "Case {n}: {} phase {}, vitals {}, hazards {:?}",
                g.mode,
                g.phase,
                g.vitals,
                g.hazards
            );
        }
    }
}
#[test]
fn idle_loses_every_case() {
    for n in 0..8 {
        let mut g = Surgery::new(n, false, false);
        for _ in 0..60 * 900 {
            g.tick([SurgeonInput::default(); 4], 1. / 60.);
            if g.outcome == Outcome::Lost {
                break;
            }
        }
        assert_eq!(g.outcome, Outcome::Lost, "case {n}");
    }
}
#[test]
fn campaign_exercises_the_whole_language() {
    let mut sim = Sim::new("surgery/campaign", 7).unwrap();
    let (result, _) = sim.run_bot(60 * 3600);
    let g = sim.play().unwrap().get::<Surgery>().unwrap();
    assert_eq!(result, Outcome::Won, "phase {} case {} {:?}", g.phase, g.case, g.hazards);
    for n in 0..9 {
        assert!(g.coverage.contains_key(&format!("tool:{n}")), "missing tool {n}, {:?}", g.coverage);
    }
    for key in [
        "gift:Hush",
        "gift:Echo",
        "gift:Duet",
        "defibrillated",
        "strain:introit",
        "strain:lacrimosa",
        "strain:dies",
        "strain:libera",
    ] {
        assert!(g.coverage.contains_key(key), "missing {key}");
    }
    assert_eq!(g.completed.len(), 8);
}
#[test]
fn snapshots_and_replays_are_exact() {
    let mut a = Sim::new("surgery/case/3", 17).unwrap();
    for _ in 0..300 {
        a.step(&a.bot_input());
    }
    let mut bytes = Vec::new();
    ciborium::into_writer(&a.snapshot(), &mut bytes).unwrap();
    let state: SimState = ciborium::from_reader(bytes.as_slice()).unwrap();
    let mut b = Sim::new("surgery/case/3", 17).unwrap();
    b.restore(state);
    for _ in 0..200 {
        let f = a.bot_input();
        a.step(&f);
        b.step(&f);
    }
    assert_eq!(a.state_hash(), b.state_hash());
    let mut replay = Sim::new("surgery/case/3", 17).unwrap();
    for f in a.recording.iter() {
        replay.step(f);
    }
    assert_eq!(a.state_hash(), replay.state_hash());
}
#[test]
fn wrong_tool_and_checkpoint_are_real() {
    let mut g = Surgery::new(0, false, false);
    let p = g.hazards[0].pos;
    let mut i = [SurgeonInput::default(); 4];
    i[0] = SurgeonInput { active: true, aim: p, tool: 2, held: USE, pressure: 1., ..Default::default() };
    g.tick(i, 1. / 60.);
    assert_eq!(g.mistakes, 1);
    g.phase = 2;
    g.fail();
    g.retry(true);
    assert_eq!(g.phase, 2);
    assert_eq!(g.mode, "operation");
    assert!(!g.hazards.is_empty());
}
#[test]
fn editable_content_is_complete() {
    let data = content().unwrap();
    assert_eq!(data.cases.len(), 8);
    for c in data.cases {
        assert!(!c.patient.is_empty() && !c.fate.is_empty());
        assert!(c.phases.len() >= 4);
        for p in c.phases {
            assert!(!p.objective.is_empty());
            for h in p.hazards {
                assert!(h.pos.iter().all(|x| x.is_finite()));
            }
        }
    }
}
#[test]
fn careless_extraction_is_sloppy_and_tears_tissue() {
    let mut g = Surgery::new(0, false, false);
    let p = g.hazards[1].pos;
    let mut f = [SurgeonInput::default(); 4];
    f[0] = SurgeonInput { active: true, aim: p, tool: 1, held: USE, pressure: 1., ..Default::default() };
    g.tick(f, 1. / 60.);
    f[0].aim += glam::Vec2::X * 1.2;
    g.tick(f, 1. / 60.);
    assert!(g.coverage.contains_key("rating:SLOPPY"));
    assert!(!g.hazards[1].alive);
    assert!(g.hazards.iter().any(|h| h.kind == "laceration" && h.alive));
    assert_eq!(g.surgeons[0].chain, 0);
}
#[test]
fn iv_release_and_shock_timing_change_the_patient() {
    let mut g = Surgery::new(0, false, false);
    g.vitals = 40.;
    let mut f = [SurgeonInput::default(); 4];
    f[0] = SurgeonInput { active: true, tool: 7, held: USE, pressure: 1., ..Default::default() };
    for _ in 0..104 {
        g.tick(f, 1. / 60.);
    }
    f[0].held = 0;
    g.tick(f, 1. / 60.);
    assert!(g.vitals > 55. && g.surgeons[0].iv_cool > 3.9);
    g.start_code(1, true);
    f[0].held = SHOCK;
    for _ in 0..78 {
        g.tick(f, 1. / 60.);
    }
    g.beat = 0.02;
    f[0].held = 0;
    g.tick(f, 1. / 60.);
    assert_eq!(g.shocks, 0);
    assert_eq!(g.code, 0.);
    assert!(g.vitals > 30.);
    assert!(g.coverage.contains_key("defibrillated"));
}
#[test]
fn echo_does_not_steal_a_fourth_human_seat() {
    let mut g = Surgery::new(5, false, false);
    g.phase = 1;
    g.load_phase();
    g.gift_kind = "Echo".into();
    g.gift_left = 8.;
    g.surgeons[3].active = true;
    g.surgeons[3].cursor = glam::Vec2::new(7., 2.);
    let p = g.hazards[0].pos;
    let mut f = [SurgeonInput::default(); 4];
    f[0] = SurgeonInput { active: true, aim: p, tool: 4, held: USE, pressure: 1., precision: true, ..Default::default() };
    for _ in 0..65 {
        g.tick(f, 1. / 60.);
    }
    f[0].held = 0;
    g.tick(f, 1. / 60.);
    assert!(!g.surgeons[3].ghost);
    assert_eq!(g.surgeons[3].cursor, glam::Vec2::new(7., 2.));
    assert!(g.coverage.contains_key("echo_repeat"));
    g.surgeons[3].ghost = true;
    f[3] = SurgeonInput { active: true, aim: glam::Vec2::new(6., 2.), tool: 5, ..Default::default() };
    g.tick(f, 1. / 60.);
    assert!(!g.surgeons[3].ghost);
}
#[test]
fn expert_balance_measurements() {
    for n in 0..8 {
        let mut g = Surgery::new(n, false, false);
        play(&mut g, 60 * 900);
        assert_eq!(g.outcome, Outcome::Won);
        assert!(["S", "ENCORE"].contains(&g.rank()), "case {n}: {}", g.rank());
        println!("BALANCE {n} score={} par={} rank={} elapsed={}", g.total(), g.chart().par, g.rank(), g.time);
    }
}
#[test]
fn code_blue_is_a_complete_survival_round() {
    let mut g = Surgery::new(0, false, true);
    play(&mut g, 60 * 600);
    assert_eq!(g.outcome, Outcome::Won, "{:?}", g.hazards);
    assert!(g.vitals > 0.);
    assert!(g.wave >= 10);
}

#[test]
fn the_partner_cannot_win_for_an_idle_lead_surgeon() {
    let mut sim = Sim::new("surgery/case/7", 2).unwrap();
    for _ in 0..60 * 600 {
        if sim.outcome() != Outcome::Playing {
            break;
        }
        sim.step(&pav_core::InputFrame::default());
    }
    assert_eq!(sim.outcome(), Outcome::Lost);
}
