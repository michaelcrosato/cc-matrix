//! Hands of Harbor: the shipped sim, from a fresh scene.

use pav_core::games::surgery::{
    all_lines, chain_mul, contextual_tool, cycle, octant, rank_of, tray_tool, Hazard, Heart, Surgery, CASES, CRYO, DRESSING,
    FORCEPS, GEL, K_BONE, K_DRESSING, K_EMBER, K_POLYP, K_POOL, K_TETHER, LASER, R_SLOPPY, SCALPEL, SCANNER, SUCTION,
    SUTURE, SURGEON_NAMES, TITLE, TOOL_KEEP, TOOL_NAMES,
};
use pav_core::games::Outcome;
use pav_core::glam::Vec2;
use pav_core::input::{surg, InputFrame, SurgeonInput, SurgeryCmd};
use pav_core::Sim;

fn status(sim: &Sim) -> String {
    sim.play().unwrap().status(sim).to_string()
}

fn game(sim: &Sim) -> &Surgery {
    sim.play().unwrap().get::<Surgery>().unwrap()
}

fn cmd(c: SurgeryCmd) -> InputFrame {
    InputFrame { surgery_cmd: Some(c), ..InputFrame::default() }
}

fn hand(x: f32, z: f32, tool: u8, use_on: bool) -> InputFrame {
    let mut held = surg::AIM_ABSOLUTE | surg::SNAP;
    if use_on {
        held |= surg::USE;
    }
    let mut frame = InputFrame::default();
    frame.surgeons[0] = SurgeonInput {
        active: true,
        aim: Vec2::new(x, z),
        held,
        pressed: 0,
        tool,
        pressure: 1.0,
    };
    frame
}

fn play_until(sim: &mut Sim, cap: u64, drive: impl Fn(u64, &Sim) -> InputFrame) -> u64 {
    for t in 0..cap {
        if sim.outcome() != Outcome::Playing {
            return t;
        }
        let frame = drive(t, sim);
        sim.step(&frame);
    }
    cap
}

#[test]
fn bot_drive_finishes_case_zero_from_empty_hands() {
    let mut sim = Sim::new("surgery/case/0", 1).unwrap();
    sim.step(&cmd(SurgeryCmd::Dev { what: 8, extra: 1 }));
    assert!(game(&sim).bot_drive);
    assert!((game(&sim).skill - 1.0).abs() < 1e-6);
    let ticks = play_until(&mut sim, 60 * 30, |_, _| InputFrame::default());
    assert_eq!(sim.outcome(), Outcome::Won, "t={ticks} {}", status(&sim));
    assert_eq!(game(&sim).mode, 4, "results mode {}", status(&sim));
}

#[test]
fn skill1_bot_wins_every_case_code_and_campaign_on_ten_seeds() {
    for seed in 1..11 {
        for case in 0..8 {
            let scene = format!("surgery/case/{case}");
            let mut sim = Sim::new(&scene, seed).unwrap();
            let (outcome, ticks) = sim.run_bot(60 * 420);
            assert_eq!(outcome, Outcome::Won, "seed {seed} {scene} t={ticks} {}", status(&sim));
            let g = game(&sim);
            assert!(g.rank >= 4, "seed {seed} case {case} rank {} {}", g.rank, status(&sim));
            assert_eq!(g.rank, rank_of(g.total_score(), g.par));
        }
        {
            let mut sim = Sim::new("surgery/code", seed).unwrap();
            let (outcome, ticks) = sim.run_bot(60 * 260);
            assert_eq!(outcome, Outcome::Won, "seed {seed} code t={ticks} {}", status(&sim));
            assert!(game(&sim).rank >= 4, "seed {seed} code {}", status(&sim));
        }
        {
            let mut sim = Sim::new("surgery/campaign", seed).unwrap();
            let (outcome, ticks) = sim.run_bot(60 * 2200);
            assert_eq!(outcome, Outcome::Won, "seed {seed} campaign t={ticks} {}", status(&sim));
            let g = game(&sim);
            assert!(g.coverage.tools.iter().all(|n| *n > 0), "tools {:?}", g.coverage.tools);
            assert!(g.coverage.hazards.iter().all(|n| *n > 0), "hazards {:?}", g.coverage.hazards);
            assert!(g.coverage.strains.iter().all(|n| *n > 0), "strains {:?}", g.coverage.strains);
            assert!(g.coverage.gifts.iter().all(|n| *n > 0), "gifts {:?}", g.coverage.gifts);
            assert!(g.coverage.code > 0, "code {}", g.coverage.code);
            assert!(g.best_chain() >= 5, "chain {}", g.best_chain());
        }
    }
}

#[test]
fn idle_and_random_tool_lose_every_case() {
    let scenes = [
        "surgery/case/0",
        "surgery/case/1",
        "surgery/case/2",
        "surgery/case/3",
        "surgery/case/4",
        "surgery/case/5",
        "surgery/case/6",
        "surgery/case/7",
        "surgery/code",
    ];
    for scene in scenes {
        let mut idle = Sim::new(scene, 1).unwrap();
        play_until(&mut idle, 60 * 400, |_, _| InputFrame::default());
        assert_eq!(idle.outcome(), Outcome::Lost, "idle {scene} {}", status(&idle));

        let mut messy = Sim::new(scene, 1).unwrap();
        play_until(&mut messy, 60 * 400, |t, _| {
            let ang = t as f32 * 0.37;
            let tool = (t % 11) as u8;
            hand(ang.cos() * 3.2, ang.sin() * 2.1, tool, true)
        });
        assert_eq!(messy.outcome(), Outcome::Lost, "random {scene} {}", status(&messy));
    }
}

#[test]
fn snapshot_rewind_and_replay_match() {
    let mut sim = Sim::new("surgery/case/0", 4).unwrap();
    sim.config.history_seconds = 8.0;
    for _ in 0..240 {
        let frame = sim.bot_input();
        sim.step(&frame);
    }
    let mut bytes = Vec::new();
    ciborium::into_writer(&sim.snapshot(), &mut bytes).unwrap();
    let state = ciborium::from_reader(bytes.as_slice()).unwrap();
    let mut copy = Sim::new("surgery/case/0", 4).unwrap();
    copy.restore(state);
    assert_eq!(copy.state_hash(), sim.state_hash());
    for _ in 0..120 {
        let (a, b) = (sim.bot_input(), copy.bot_input());
        sim.step(&a);
        copy.step(&b);
    }
    assert_eq!(copy.state_hash(), sim.state_hash());

    let (tick, hash) = (sim.state.tick, sim.state_hash());
    assert!(sim.rewind_to(tick - 90), "rewind");
    assert!(sim.rewind_to(tick), "replay rewind");
    assert_eq!(sim.state_hash(), hash);

    let mut again = Sim::new("surgery/case/0", 4).unwrap();
    for frame in sim.recording.iter() {
        again.step(frame);
    }
    assert_eq!(again.state_hash(), hash);
}

#[test]
fn overheat_is_sloppy_and_five_pools_chain() {
    let mut sim = Sim::new("surgery/case/0", 1).unwrap();
    sim.step(&InputFrame::default());
    sim.step(&cmd(SurgeryCmd::SpawnHazard(K_POLYP)));
    let (x, z) = {
        let h = game(&sim).hazards.iter().find(|h| h.alive && h.kind == K_POLYP).expect("polyp");
        (h.x, h.z)
    };
    for _ in 0..180 {
        if game(&sim).coverage.ratings[R_SLOPPY as usize] > 0 {
            break;
        }
        sim.step(&hand(x, z, LASER, true));
    }
    assert!(game(&sim).coverage.ratings[R_SLOPPY as usize] > 0, "sloppy {}", status(&sim));

    let mut sim = Sim::new("surgery/case/0", 1).unwrap();
    sim.step(&InputFrame::default());
    for _ in 0..5 {
        sim.step(&cmd(SurgeryCmd::SpawnHazard(K_POOL)));
        let (x, z, id) = {
            let h = game(&sim).hazards.iter().rev().find(|h| h.alive && h.kind == K_POOL).expect("pool");
            (h.x, h.z, h.id)
        };
        // A held tool keeps the last wound. Two idle frames let the cursor take the new pool.
        sim.step(&hand(x, z, SUCTION, false));
        sim.step(&hand(x, z, SUCTION, false));
        for _ in 0..120 {
            let alive = game(&sim).hazards.iter().any(|h| h.id == id && h.alive);
            if !alive {
                break;
            }
            sim.step(&hand(x, z, SUCTION, true));
        }
        assert!(
            !game(&sim).hazards.iter().any(|h| h.id == id && h.alive),
            "pool {id} stayed {}",
            status(&sim)
        );
    }
    let chain = game(&sim).best_chain();
    assert!(chain >= 5, "chain {chain}");
    assert_eq!(chain_mul(5), 1.25);
    assert_eq!(chain_mul(10), 1.5);
    assert_eq!(chain_mul(20), 2.0);
}

#[test]
fn beat_window_code_window_and_checkpoint_retry() {
    let mut sim = Sim::new("surgery/case/0", 2).unwrap();
    sim.step(&InputFrame::default());
    {
        let g = game(&sim);
        let t = (1.0 - g.heart.vitals.clamp(0.0, 100.0) / 100.0).clamp(0.0, 1.0);
        let expect = (72.0 + 76.0 * t) * g.tune.heart_coupling.clamp(0.25, 2.0);
        assert!((g.heart.bpm - expect).abs() < 0.05, "bpm {} vs {expect}", g.heart.bpm);
    }
    let mut saw_on = false;
    let mut saw_off = false;
    for _ in 0..240 {
        sim.step(&InputFrame::default());
        let on = game(&sim).heart.on_beat(game(&sim).tune.beat_window_ms);
        saw_on |= on;
        saw_off |= !on;
    }
    assert!(saw_on && saw_off, "on-beat window never changed");
    let _ = Heart::new(80.0);

    let mut sim = Sim::new("surgery/case/0", 2).unwrap();
    sim.step(&InputFrame::default());
    sim.step(&cmd(SurgeryCmd::Dev { what: 4, extra: 0 }));
    assert!(game(&sim).heart.flat, "code did not start");
    assert!(game(&sim).code_t > 0.0);
    play_until(&mut sim, 60 * 8, |_, _| InputFrame::default());
    assert_eq!(sim.outcome(), Outcome::Lost, "missed code {}", status(&sim));

    let mut sim = Sim::new("surgery/case/0", 2).unwrap();
    for _ in 0..40 {
        let frame = sim.bot_input();
        sim.step(&frame);
    }
    let vitals = game(&sim).heart.vitals;
    assert!(vitals > 20.0, "already dead before the kill");
    sim.step(&cmd(SurgeryCmd::Dev { what: 5, extra: 0 }));
    assert_eq!(sim.outcome(), Outcome::Lost, "{}", status(&sim));
    sim.step(&cmd(SurgeryCmd::Retry));
    assert_eq!(sim.outcome(), Outcome::Playing, "retry {}", status(&sim));
    assert_eq!(game(&sim).mode, 3, "back in the operation");
    assert!(game(&sim).heart.vitals > 20.0, "checkpoint vitals {}", game(&sim).heart.vitals);
}

#[test]
fn story_lines_are_filled_and_music_defaults_quiet() {
    let lines = all_lines();
    assert!(lines.len() >= 150, "story lines {}", lines.len());
    let banned = ["Hope Hospital", "Caduceus", "Stiles", "GUILT", "Healing Touch"];
    for line in &lines {
        assert!(!line.text.trim().is_empty(), "empty line from {}", line.who);
        assert!(!line.who.trim().is_empty());
        let blob = format!("{} {}", line.who, line.text);
        assert!(!blob.contains("TODO"), "{blob}");
        for word in banned {
            assert!(!blob.contains(word), "{word} in {blob}");
        }
    }
    for name in TOOL_NAMES.into_iter().chain(SURGEON_NAMES).chain(CASES.iter().map(|c| c.name)).chain(CASES.iter().map(|c| c.patient)) {
        for word in banned {
            assert!(!name.contains(word), "{word} in {name}");
        }
    }
    assert_eq!(TITLE, "Hands of Harbor: Second Opinion");
    let sim = Sim::new("surgery/title", 1).unwrap();
    assert!((game(&sim).tune.music - 0.10).abs() < 1e-6);
    assert!((game(&sim).tune.effects - 0.80).abs() < 1e-6);
    assert!((game(&sim).tune.voices - 0.70).abs() < 1e-6);
    assert_eq!(rank_of(900, 900), 4);
    assert_eq!(rank_of(1035, 900), 5);
    assert_eq!(rank_of(449, 900), 0);
}

/// `cargo test -p pav_core --test surgery -- --ignored --nocapture balance_sheet`
/// Prints wins, time, vitals left, and a par that would put the skill-1.0 mean on S.
#[test]
#[ignore]
fn balance_sheet() {
    let skills = [1.0_f32, 0.7, 0.4, 0.0];
    let scenes: Vec<String> = (0..8).map(|c| format!("surgery/case/{c}")).chain(["surgery/code".into()]).collect();
    println!("skill case wins/5 time_s vitals score par suggested_par");
    for skill in skills {
        for scene in &scenes {
            let mut wins = 0;
            let mut time = 0.0;
            let mut vitals = 0.0;
            let mut score = 0.0;
            let mut par = 0;
            for seed in 1..=5 {
                let mut sim = Sim::new(scene, seed).unwrap();
                sim.state.play.as_mut().unwrap().get_mut::<Surgery>().unwrap().skill = skill;
                let (outcome, _ticks) = sim.run_bot(60 * 420);
                let g = game(&sim);
                if outcome == Outcome::Won {
                    wins += 1;
                }
                time += g.elapsed;
                vitals += g.heart.vitals;
                score += g.total_score() as f32;
                par = g.par;
            }
            let mean_score = score / 5.0;
            let suggested = if skill == 1.0 { mean_score.round().max(1.0) as i32 } else { par };
            println!(
                "{skill:.1} {scene} {wins}/5 {:.1} {:.1} {:.0} {par} {suggested}",
                time / 5.0,
                vitals / 5.0,
                mean_score
            );
        }
    }
}

fn place(sim: &mut Sim, x: f32, z: f32, tool: u8, use_on: bool, extra: u32) {
    let mut held = surg::AIM_ABSOLUTE | surg::SNAP | surg::PRECISION | extra;
    if use_on {
        held |= surg::USE;
    }
    let mut frame = InputFrame::default();
    frame.surgeons[0] = SurgeonInput {
        active: true,
        aim: Vec2::new(x, z),
        held,
        pressed: 0,
        tool,
        pressure: 1.0,
    };
    sim.step(&frame);
}

/// Ring tools stay 0–7. Cryoprobe and Dressing are whatever `contextual_tool` returns.
fn mapped(sim: &mut Sim, x: f32, z: f32, ring: u8, use_on: bool, extra: u32) -> u8 {
    assert!(ring <= 7, "ring {ring} is outside the eight-way");
    let tool = contextual_tool(ring, x, z, &game(sim).hazards);
    place(sim, x, z, tool, use_on, extra);
    tool
}

fn wake(sim: &mut Sim) {
    place(sim, -8.0, -3.0, TOOL_KEEP, false, 0);
}

fn alive_id(sim: &Sim, id: u32) -> Option<Hazard> {
    game(sim).hazards.iter().find(|h| h.id == id && h.alive).cloned()
}

fn alive_kind(sim: &Sim, kind: u8) -> Option<Hazard> {
    game(sim).hazards.iter().find(|h| h.kind == kind && h.alive).cloned()
}

#[test]
fn shipped_mapping_clears_an_ember_and_a_dressing() {
    let mut sim = Sim::new("surgery/case/5", 1).unwrap();
    wake(&mut sim);
    let ember = alive_kind(&sim, K_EMBER).expect("case 5 ember");
    let id = ember.id;
    let down = octant(Vec2::new(0.0, -1.0)).expect("down");
    let left = octant(Vec2::new(-1.0, 0.0)).expect("left");
    assert_eq!(down, LASER);
    assert_eq!(left, SCANNER);
    assert!(octant(Vec2::new(0.2, 0.2)).is_none(), "a short flick must not pick a tool");
    assert_eq!(contextual_tool(down, ember.x, ember.z, &game(&sim).hazards), CRYO);
    assert_eq!(contextual_tool(left, ember.x, ember.z, &game(&sim).hazards), CRYO);

    place(&mut sim, ember.x, ember.z, down, true, 0);
    assert_eq!(game(&sim).surgeons[0].tool, CRYO, "laser on an ember must become the cryoprobe");
    for _ in 0..80 {
        let Some(h) = alive_id(&sim, id) else {
            panic!("ember died during frost {}", status(&sim));
        };
        if h.stage > 0 {
            break;
        }
        if h.aux >= 0.86 {
            let sent = mapped(&mut sim, h.x, h.z, down, false, 0);
            assert_eq!(sent, CRYO);
            break;
        }
        let sent = mapped(&mut sim, h.x, h.z, down, true, 0);
        assert_eq!(sent, CRYO);
    }
    let h = alive_id(&sim, id).unwrap_or_else(|| panic!("frost did not hold {}", status(&sim)));
    assert!(h.stage >= 1, "ember stage {} aux {} {}", h.stage, h.aux, status(&sim));

    let scalpel = cycle(cycle(SCANNER, true), true);
    assert_eq!(scalpel, SCALPEL);
    for _ in 0..90 {
        let Some(h) = alive_id(&sim, id) else { panic!("ember died under the scalpel {}", status(&sim)) };
        if h.stage >= 2 {
            break;
        }
        mapped(&mut sim, h.x, h.z, scalpel, true, 0);
    }
    let h = alive_id(&sim, id).unwrap_or_else(|| panic!("scalpel missed {}", status(&sim)));
    assert!(h.stage >= 2, "stage {} {}", h.stage, status(&sim));

    let forceps = tray_tool(-3.5 + FORCEPS as f32, 5.4).expect("forceps slot");
    assert_eq!(forceps, FORCEPS);
    assert!(tray_tool(0.0, 0.0).is_none());
    let h = alive_id(&sim, id).unwrap();
    mapped(&mut sim, h.x, h.z, forceps, true, 0);
    let h = alive_id(&sim, id).unwrap_or_else(|| panic!("grab lost the ember {}", status(&sim)));
    assert!(h.grabbed, "forceps did not grab {}", status(&sim));
    let (dirx, dirz) = (h.axis.cos(), h.axis.sin());
    mapped(&mut sim, h.x + dirx * 0.9, h.z + dirz * 0.9, forceps, true, 0);
    assert!(alive_id(&sim, id).is_none(), "ember still alive {}", status(&sim));

    let mut sim = Sim::new("surgery/case/2", 2).unwrap();
    wake(&mut sim);
    let bone = alive_kind(&sim, K_BONE).expect("bone");
    let bid = bone.id;
    let up_right = octant(Vec2::new(1.0, 1.0)).unwrap();
    assert_eq!(up_right, FORCEPS);
    for _ in 0..90 {
        let Some(h) = alive_id(&sim, bid) else { break };
        if h.stage > 0 {
            break;
        }
        let extra = if h.aux > 12.0 {
            surg::ROT_L
        } else if h.aux < -12.0 {
            surg::ROT_R
        } else {
            0
        };
        mapped(&mut sim, h.x, h.z, up_right, true, extra);
    }
    {
        let h = alive_id(&sim, bid).unwrap_or_else(|| panic!("bone broke early {}", status(&sim)));
        assert_eq!(h.stage, 1, "bone aux {} {}", h.aux, status(&sim));
    }
    let suture = cycle(FORCEPS, true);
    assert_eq!(suture, SUTURE);
    for _ in 0..12 {
        let Some(h) = alive_id(&sim, bid) else { break };
        let (dirx, dirz) = (h.axis.cos(), h.axis.sin());
        let span = h.need.max(0.4);
        let n = h.samples_need.max(1) as f32;
        let along = -span * 0.5 + (h.samples as f32 + 0.5) * (span / n);
        for side in [0.5_f32, -0.5] {
            let Some(h) = alive_id(&sim, bid) else { break };
            let x = h.x + dirx * along - dirz * side;
            let z = h.z + dirz * along + dirx * side;
            mapped(&mut sim, x, z, suture, true, 0);
        }
    }
    assert!(alive_id(&sim, bid).is_none(), "bone still open {}", status(&sim));

    let tether = alive_kind(&sim, K_TETHER).unwrap_or_else(|| panic!("tether {}", status(&sim)));
    let tid = tether.id;
    let up = octant(Vec2::new(0.0, 1.0)).unwrap();
    assert_eq!(up, SCALPEL);
    let mut along = 0.0;
    for _ in 0..24 {
        let Some(h) = alive_id(&sim, tid) else { break };
        let x = h.x + h.axis.cos() * along;
        let z = h.z + h.axis.sin() * along;
        mapped(&mut sim, x, z, up, true, 0);
        along = (along + 0.28).min(h.need + 0.25);
    }
    assert!(alive_id(&sim, tid).is_none(), "tether still there {}", status(&sim));

    for _ in 0..4 {
        if alive_kind(&sim, K_DRESSING).is_some() {
            break;
        }
        wake(&mut sim);
    }
    let dressing = alive_kind(&sim, K_DRESSING).unwrap_or_else(|| panic!("no dressing {}", status(&sim)));
    let did = dressing.id;
    let gel = octant(Vec2::new(-1.0, -1.0)).unwrap();
    assert_eq!(gel, GEL);
    assert_eq!(contextual_tool(gel, dressing.x, dressing.z, &game(&sim).hazards), DRESSING);
    assert_ne!(contextual_tool(gel, 8.0, 3.0, &game(&sim).hazards), DRESSING);
    place(&mut sim, dressing.x, dressing.z, gel, true, 0);
    assert_eq!(game(&sim).surgeons[0].tool, DRESSING, "a closure must auto-select dressing");
    let offsets = [(0.55_f32, 0.0), (0.0, 0.55), (-0.55, 0.0), (0.0, -0.55)];
    for _ in 0..4 {
        if alive_id(&sim, did).is_none() {
            break;
        }
        for (dx, dz) in offsets {
            let Some(h) = alive_id(&sim, did) else { break };
            for _ in 0..8 {
                if alive_id(&sim, did).is_none() {
                    break;
                }
                let sent = mapped(&mut sim, h.x + dx, h.z + dz, gel, true, 0);
                assert_eq!(sent, DRESSING);
            }
        }
    }
    let left = alive_id(&sim, did);
    assert!(left.is_none(), "dressing {:?} {}", left.map(|h| (h.bits, h.work)), status(&sim));
}
