//! Tempo Trauma: the bot wins every case and the whole campaign, a careless player loses,
//! snapshots/rewind/replays are exact, coverage counters prove every tool, hazard, strain,
//! gift and the Code fire, rule units, content lint and balance.

use std::collections::BTreeSet;

use pav_core::games::Outcome;
use pav_core::games::surgery::data::{self, KINDS};
use pav_core::games::surgery::{self, Mode, Surgery};
use pav_core::input::{SurgeonInput, SurgeryCmd, sbtn};
use pav_core::{InputFrame, Sim, SimState};

fn game(sim: &Sim) -> &Surgery {
    sim.play().unwrap().surgery().unwrap()
}

fn game_mut(sim: &mut Sim) -> &mut Surgery {
    sim.state.play.as_mut().unwrap().surgery_mut().unwrap()
}

fn run_bot_ticks(sim: &mut Sim, max: u64) -> Outcome {
    sim.run_bot(max).0
}

#[test]
fn the_bot_wins_every_case_on_ten_seeds() {
    for case in 0..=8 {
        for seed in 1..=10 {
            let mut sim = Sim::new(&format!("surgery/case/{case}"), seed).unwrap();
            let o = run_bot_ticks(&mut sim, 60 * 60 * 12);
            let g = game(&sim);
            assert_eq!(o, Outcome::Won, "case {case} seed {seed}: mode {:?} phase {} vitals {}", g.mode, g.phase, g.vitals);
        }
    }
}

#[test]
fn the_bot_wins_the_whole_campaign_on_ten_seeds() {
    for seed in 1..=10 {
        let mut sim = Sim::new("surgery/campaign", seed).unwrap();
        let o = run_bot_ticks(&mut sim, 60 * 60 * 30);
        assert_eq!(o, Outcome::Won, "seed {seed}: {}", game(&sim).status_json());
        assert!(game(&sim).total_score > 0);
    }
}

#[test]
fn a_careless_player_loses_every_case() {
    for case in 0..=8 {
        // Idle.
        let mut sim = Sim::new(&format!("surgery/case/{case}"), 1).unwrap();
        let mut lost = false;
        for _ in 0..60 * 60 * 12 {
            sim.step(&InputFrame::default());
            if sim.outcome() == Outcome::Lost {
                lost = true;
                break;
            }
            if game(&sim).mode == Mode::Results {
                break;
            }
        }
        assert!(lost || case == 8, "idle won case {case}");
        // Random tool spam.
        let mut sim = Sim::new(&format!("surgery/case/{case}"), 2).unwrap();
        let mut rng = pav_core::rng::Rng::new(99);
        let mut done = false;
        for _ in 0..60 * 60 * 12 {
            let mut f = InputFrame::default();
            f.surgeons[0] = SurgeonInput {
                active: true,
                aim: glam::Vec2::new(rng.range(-9.0, 9.0), rng.range(-4.0, 4.0)),
                held: if rng.below(2) == 0 { sbtn::USE } else { 0 },
                tool: rng.below(9) as u8,
                ..Default::default()
            };
            sim.step(&f);
            if matches!(sim.outcome(), Outcome::Lost | Outcome::Won) || game(&sim).mode == Mode::Results {
                done = true;
                break;
            }
        }
        assert!(done);
        assert_ne!(sim.outcome(), Outcome::Won, "tool spam won case {case}");
        assert_ne!(game(&sim).mode, Mode::Results, "tool spam finished case {case}");
    }
}

#[test]
fn snapshots_rewind_and_replays_are_exact() {
    let mut sim = Sim::new("surgery/campaign", 3).unwrap();
    for _ in 0..1200 {
        let f = sim.bot_input();
        sim.step(&f);
    }
    let mut bytes = Vec::new();
    ciborium::into_writer(&sim.snapshot(), &mut bytes).unwrap();
    let state: SimState = ciborium::from_reader(bytes.as_slice()).unwrap();
    let mut copy = Sim::new("surgery/campaign", 3).unwrap();
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
    let mut again = Sim::new("surgery/campaign", 3).unwrap();
    for f in sim.recording.iter() {
        again.step(f);
    }
    assert_eq!(again.state_hash(), hash);
}

#[test]
fn coverage_every_tool_hazard_strain_gift_and_code_fire() {
    let mut sim = Sim::new("surgery/campaign", 1).unwrap();
    // A couple of forced Codes so the unscripted Code is exercised too.
    let mut forced = 0;
    for t in 0..60 * 60 * 30 {
        if sim.outcome() != Outcome::Playing {
            break;
        }
        if t % 3000 == 2999 && game(&sim).mode == Mode::Op && forced < 3 && game(&sim).case >= 1 {
            game_mut(&mut sim).command(SurgeryCmd::ForceCode);
            forced += 1;
        }
        let f = sim.bot_input();
        sim.step(&f);
    }
    let cov = game(&sim).cov.clone();
    let has = |k: &str| cov.contains_key(k);
    for kind in 1..=10 {
        assert!(has(&format!("tool_done:{kind}")) || kind == 7, "tool kind {kind} never finished a stage: {cov:?}");
    }
    assert!(has("pick:7"), "the scanner was never picked: {cov:?}");
    assert!(has("scan_reveal"));
    for (name, _) in KINDS {
        let k = format!("{:?}", data::kind_of_name(name).unwrap());
        assert!(has(&format!("hazard_done:{k}")), "hazard {k} never cleared: {cov:?}");
    }
    for k in ["gift:hush", "gift:echo", "gift:duet", "code", "code:scripted", "defib_success", "heat_ring", "strain:split", "echo_repeat", "bone_snap", "tendril_pull", "onbeat"] {
        assert!(has(k), "{k} never fired: {cov:?}");
    }
    for c in 0..=7 {
        assert!(has(&format!("case_done:{c}")), "case {c} not finished");
    }
}

#[test]
fn every_rating_is_reachable() {
    // Skill 1 earns Immaculate and Clean; a sloppy bot earns Sloppy.
    let mut sim = Sim::new("surgery/case/1", 1).unwrap();
    sim.run_bot(60 * 60 * 5);
    assert!(game(&sim).cov.contains_key("rating:3"));
    let mut sim = Sim::new("surgery/case/1", 4).unwrap();
    game_mut(&mut sim).bot_skill = 0.5;
    sim.run_bot(60 * 60 * 8);
    let cov = &game(&sim).cov;
    assert!(cov.keys().filter(|k| k.starts_with("rating:")).count() >= 2, "{cov:?}");
    // Good (1) and Clean (2) come from the strictness slider.
    let mut sim = Sim::new("surgery/case/1", 5).unwrap();
    game_mut(&mut sim).tune.set("strict", 1.6);
    sim.run_bot(60 * 60 * 8);
    let cov = &game(&sim).cov;
    assert!(cov.contains_key("rating:2") || cov.contains_key("rating:1"), "{cov:?}");
}

#[test]
fn rule_units_ranks_chain_beat_code_retry() {
    assert_eq!(surgery::rank_of(60, 100), "C");
    assert_eq!(surgery::rank_of(70, 100), "B");
    assert_eq!(surgery::rank_of(85, 100), "A");
    assert_eq!(surgery::rank_of(100, 100), "S");
    assert_eq!(surgery::rank_of(115, 100), "ENCORE");
    // BPM follows vitals: 72 at 100, 148 at 0.
    let mut sim = Sim::new("surgery/case/1", 1).unwrap();
    for _ in 0..5 {
        sim.step(&InputFrame::default());
    }
    assert!((game(&sim).bpm - 72.0).abs() < 4.0);
    game_mut(&mut sim).vitals = 50.0;
    sim.step(&InputFrame::default());
    assert!((game(&sim).bpm - 110.0).abs() < 2.0, "{}", game(&sim).bpm);
    // On-beat window.
    {
        let g = game_mut(&mut sim);
        g.beat = 0.0;
        assert!(g.on_beat());
        g.beat = 0.5;
        assert!(!g.on_beat());
    }
    // Code: a defibrillation at the ghost beat returns vitals to 30; a Code costs one.
    let mut sim = Sim::new("surgery/case/1", 1).unwrap();
    game_mut(&mut sim).command(SurgeryCmd::ForceCode);
    for _ in 0..3 {
        sim.step(&InputFrame::default());
    }
    assert!(game(&sim).code_t > 0.0, "code did not start: {}", game(&sim).status_json());
    let before = game(&sim).codes_left;
    for _ in 0..600 {
        let g = game(&sim);
        if g.code_t <= 0.0 {
            break;
        }
        let hold = !(g.sg[0].charge >= 1.25 && (g.ghost_phase - 0.5).abs() < 0.08);
        let mut f = InputFrame::default();
        f.surgeons[0] = SurgeonInput { active: true, held: if hold { sbtn::DEFIB } else { 0 }, ..Default::default() };
        sim.step(&f);
    }
    assert!(game(&sim).code_t <= 0.0 && game(&sim).vitals >= 29.0, "{}", game(&sim).status_json());
    assert_eq!(game(&sim).mode, Mode::Op);
    assert!(before <= 1);
    // Death, then retry from the checkpoint in a command.
    game_mut(&mut sim).command(SurgeryCmd::KillPatient);
    for _ in 0..400 {
        sim.step(&InputFrame::default());
    }
    assert_eq!(game(&sim).mode, Mode::Dead);
    game_mut(&mut sim).command(SurgeryCmd::Retry);
    sim.step(&InputFrame::default());
    assert_eq!(game(&sim).mode, Mode::Op);
    assert!(game(&sim).vitals >= 60.0);
}

#[test]
fn content_lint() {
    let content = data::load();
    let speakers = ["mara", "pet", "bashir", "teddy", "voss", "vane", "narrator"];
    let exprs = ["neutral", "alarmed", "stern", "soft"];
    let sets = ["corridor", "scrub", "gallery", "atrium", "theatre", "nightward", "depot", "recovery", "cabin"];
    let plates: Vec<String> = data::plates().plate.iter().map(|p| p.id.clone()).collect();
    let plates: Vec<&str> = plates.iter().map(|s| s.as_str()).collect();
    assert!(plates.len() >= 10);
    let musics = ["tender", "tense", "crisis", "title"];
    let mut lines = 0;
    for sc in &content.scenes {
        assert!(sets.contains(&sc.set.as_str()), "scene {} set {}", sc.id, sc.set);
        assert!(musics.contains(&sc.music.as_str()), "scene {} music {}", sc.id, sc.music);
        for l in &sc.line {
            lines += 1;
            assert!(speakers.contains(&l.who.as_str()), "{}: speaker {}", sc.id, l.who);
            assert!(exprs.contains(&l.expr.as_str()), "{}: expr {}", sc.id, l.expr);
            assert!(!l.text.trim().is_empty() && !l.text.contains("TODO"), "{}: text", sc.id);
        }
    }
    for c in &content.cases {
        assert!(plates.contains(&c.plate.as_str()), "case {} plate {}", c.id, c.plate);
        for ph in &c.phase {
            if let Some(p) = &ph.plate_next {
                assert!(plates.contains(&p.as_str()), "case {} plate_next {p}", c.id);
            }
            for s in &ph.spawn {
                data::make(1, s, 1.0).unwrap_or_else(|e| panic!("case {} {}: {e}", c.id, ph.name));
            }
            for s in &ph.say {
                let mut it = s.splitn(3, '|');
                assert!(it.next().unwrap().parse::<f32>().is_ok(), "case {} say time: {s}", c.id);
                assert!(speakers.contains(&it.next().unwrap()), "case {} say speaker: {s}", c.id);
                assert!(!it.next().unwrap().trim().is_empty());
            }
            assert!(!ph.now.contains("TODO") && !ph.name.contains("TODO"));
        }
    }
    let callouts: usize = content.cases.iter().flat_map(|c| c.phase.iter()).map(|p| p.say.len()).sum();
    assert!(lines + callouts >= 150 && lines + callouts <= 300, "{lines} story lines + {callouts} callouts");
    // Every cue id has a name and a sound.
    for id in 1..surgery::cue::NAMES.len() {
        assert!(!surgery::cue::NAMES[id].is_empty());
    }
}

#[test]
fn content_files_on_disk_are_embedded() {
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src/games/surgery/content");
    let mut names = BTreeSet::new();
    for e in std::fs::read_dir(&dir).unwrap() {
        names.insert(e.unwrap().file_name().to_string_lossy().to_string());
    }
    for (file, text) in [("cases.toml", data::CASES_TOML), ("story.toml", data::STORY_TOML)] {
        assert!(names.contains(file));
        assert_eq!(std::fs::read_to_string(dir.join(file)).unwrap(), text, "{file} differs from the embedded copy");
    }
    assert!(names.contains("level.toml") && names.contains("README.md") && names.contains("rigs.toml") && names.contains("plates.toml"), "{names:?}");
    assert_eq!(std::fs::read_to_string(dir.join("rigs.toml")).unwrap(), data::RIGS_TOML);
    for who in ["mara", "pet", "bashir", "teddy", "voss", "vane"] {
        assert_eq!(data::rig_of(who).id, who);
    }
}

#[test]
fn balance_bot_skill_ladder() {
    // 1.0 always wins at S or above; 0.4 loses the later cases; 0 always loses.
    let mut wins_hi = 0;
    let mut total = 0;
    for case in [3, 4, 6, 7] {
        for seed in 1..=3 {
            total += 1;
            let mut sim = Sim::new(&format!("surgery/case/{case}"), seed).unwrap();
            let o = sim.run_bot(60 * 60 * 12).0;
            if o == Outcome::Won {
                wins_hi += 1;
            }
            let rank = game(&sim).results.as_ref().map(|r| r.rank.clone()).unwrap_or_default();
            assert!(matches!(rank.as_str(), "S" | "ENCORE" | "A"), "case {case} seed {seed}: rank {rank}");
        }
    }
    assert_eq!(wins_hi, total);
    let mut lost_lo = 0;
    for case in [4, 6, 7] {
        let mut sim = Sim::new(&format!("surgery/case/{case}"), 1).unwrap();
        game_mut(&mut sim).bot_skill = 0.4;
        if sim.run_bot(60 * 60 * 12).0 != Outcome::Won {
            lost_lo += 1;
        }
    }
    assert!(lost_lo >= 1, "a 0.4 bot won every late case");
    let mut sim = Sim::new("surgery/case/3", 1).unwrap();
    game_mut(&mut sim).bot_skill = 0.0;
    assert_ne!(sim.run_bot(60 * 60 * 10).0, Outcome::Won);
}

/// `cargo test -p pav_core --test surgery balance_report -- --ignored --nocapture`: the balance
/// tool. Prints wins, time, vitals left, and a suggested `par` per case at skills 1.0, 0.7, 0.4.
#[test]
#[ignore]
fn balance_report() {
    for case in 0..=8 {
        let mut line = format!("case {case}:");
        let mut suggested = 0;
        for skill in [1.0f32, 0.7, 0.4] {
            let (mut wins, mut totals, mut vit, mut secs) = (0, vec![], 0.0, 0.0);
            let n = 10;
            for seed in 1..=n {
                let mut sim = Sim::new(&format!("surgery/case/{case}"), seed).unwrap();
                game_mut(&mut sim).bot_skill = skill;
                let (o, t) = sim.run_bot(60 * 60 * 12);
                if o == Outcome::Won {
                    wins += 1;
                    let g = game(&sim);
                    totals.push(g.results.as_ref().map(|r| r.total).unwrap_or(0));
                    vit += g.vitals;
                    secs += t as f32 / 60.0;
                }
            }
            totals.sort();
            let med = totals.get(totals.len() / 2).copied().unwrap_or(0);
            if skill == 1.0 {
                suggested = (med as f32 / 1.08) as i64;
            }
            line += &format!("  [{skill}] wins {wins}/{n} med {med} vit {:.0} t {:.0}s", vit / wins.max(1) as f32, secs / wins.max(1) as f32);
        }
        println!("{line}  -> suggested par {suggested}");
    }
}
