//! Tools for games built on the engine (`pav_core::games`): the starter and any game an agent
//! adds there.

use anyhow::{Result, bail};
use pav_core::Sim;
use pav_core::games::{GAMES, Outcome};
use serde_json::json;

use crate::session::Session;
use crate::tools::{Args, Output, get_bool, get_u64};

/// `play`: the running game's HUD, outcome and state; `bot=true` lets its bot play on;
/// `seeds=N` plays fresh runs on seeds 1..N with the bot and leaves the session alone.
pub fn t_play(s: &mut Session, a: &Args) -> Result<Output> {
    let keys = || GAMES.iter().map(|g| g.key).collect::<Vec<_>>().join(", ");
    let Some(key) = s.sim.play().map(|g| g.key()) else {
        bail!("no game is running: `load scene=<key>` with one of: {}", keys());
    };
    let bot = get_bool(a, "bot", false)?;
    let ticks = get_u64(a, "ticks", 3600)?;
    let hz = s.sim.config.tick_rate.hz() as f64;
    if a.contains_key("seeds") {
        if !bot {
            bail!("seeds= runs the bot: add bot=true");
        }
        let n = get_u64(a, "seeds", 1)?.clamp(1, 200);
        let scene = s.sim.state.scene.clone();
        let (mut runs, mut not_won) = (Vec::new(), Vec::new());
        let mut wins = 0;
        for seed in 1..=n {
            let mut sim = Sim::new(&scene, seed)?;
            sim.config = s.sim.config.clone();
            let (outcome, played) = sim.run_bot(ticks);
            runs.push(json!([seed, outcome, round2(played as f64 / hz)]));
            if outcome == Outcome::Won {
                wins += 1;
            } else {
                // The state where the bot lost or ran out of time, to see why.
                not_won.push(json!({ "seed": seed, "status": sim.play().map(|g| g.status(&sim)) }));
            }
        }
        return Ok(Output::Json(json!({
            "game": key,
            "wins": format!("{wins}/{n}"),
            "cols": "seed outcome seconds",
            "runs": runs,
            "not_won": not_won,
        })));
    }
    let mut played = None;
    if bot {
        let (_, t) = s.sim.run_bot(ticks);
        s.keep_events();
        s.sync_camera();
        played = Some(round2(t as f64 / hz));
    }
    let g = s.sim.play().expect("the game is still running");
    Ok(Output::Json(json!({
        "game": key,
        "outcome": g.outcome(),
        "bot_seconds": played,
        "time": round2(s.sim.time()),
        "hud": g.hud(&s.sim),
        "status": g.status(&s.sim),
    })))
}

fn round2(x: f64) -> f64 {
    (x * 100.0).round() / 100.0
}

fn hand_bits(a: &Args, key: &str) -> Result<u8> {
    use pav_core::input::hands;
    let Some(text) = crate::tools::get_str(a, key) else { return Ok(0) };
    let mut bits = 0;
    for n in text.split(',').map(str::trim).filter(|n| !n.is_empty()) {
        bits |= match n {
            "use" => hands::USE,
            "cancel" => hands::CANCEL,
            "gift" => hands::GIFT,
            "precision" => hands::PRECISION,
            "defib" => hands::DEFIB,
            o => bail!("unknown hand '{o}' (use, cancel, gift, precision, defib)"),
        };
    }
    Ok(bits)
}

/// `surgeon`: drives one surgeon slot of the surgery game.
pub fn t_surgeon(s: &mut Session, a: &Args) -> Result<Output> {
    use pav_core::InputFrame;
    use pav_core::games::surgery::Surgery;
    use pav_core::input::{SurgeonInput, SurgeryCmd};
    let slot = get_u64(a, "slot", 0)? as usize;
    if slot > 3 {
        bail!("slot is 0-3");
    }
    let (held, press) = (hand_bits(a, "hold")?, hand_bits(a, "press")?);
    let n = get_u64(a, "ticks", 1)?.max(1);
    let aim = crate::tools::vec_arg(a, "aim")?.filter(|v| v.len() == 2).map(|v| glam::Vec2::new(v[0], v[1]));
    let tool = a.get("tool").and_then(|v| v.as_i64()).unwrap_or(-1) as i8;
    let pressure = a.get("pressure").and_then(|v| v.as_f64()).unwrap_or(1.0) as f32;
    let rotate = a.get("rotate").and_then(|v| v.as_i64()).unwrap_or(0) as i8;
    let cmd = match crate::tools::get_str(a, "cmd") {
        Some("advance") => Some(SurgeryCmd::Advance),
        Some("skip") => Some(SurgeryCmd::SkipScene),
        Some("retry") => Some(SurgeryCmd::Retry { from_start: false }),
        Some("win") => Some(SurgeryCmd::Cheat { id: pav_core::games::surgery::tune::cheat::WIN_CASE, value: 1.0 }),
        Some(o) => bail!("unknown cmd '{o}' (advance, skip, retry, win)"),
        None => None,
    };
    if s.sim.play().and_then(|g| g.get::<Surgery>()).is_none() {
        bail!("no surgery scene is running: `load scene=surgery/case/0`");
    }
    for i in 0..n {
        let was = s.sim.play().and_then(|g| g.get::<Surgery>()).map(|g| g.surgeons[slot].raw).unwrap_or_default();
        let mut f = InputFrame::default();
        f.surgeons[slot] = SurgeonInput {
            active: true,
            aim: aim.unwrap_or(was),
            held: held | if i == 0 { press } else { 0 },
            pressed: if i == 0 { press | held } else { 0 },
            tool: if i == 0 { tool } else { -1 },
            pressure,
            assist: 0.0,
            rotate,
        };
        if i == 0 {
            f.surgery = cmd;
        }
        s.sim.step(&f);
    }
    s.keep_events();
    s.sync_camera();
    let g = s.sim.play().expect("the game is still running");
    Ok(Output::Json(json!({ "status": g.status(&s.sim) })))
}

/// `case_check`: parses one content file, or lints them all.
pub fn t_case_check(_: &mut Session, a: &Args) -> Result<Output> {
    use pav_core::games::surgery::content::{CaseDef, Content, StoryDef};
    if let Some(path) = crate::tools::get_str(a, "path") {
        let text = std::fs::read_to_string(path).map_err(|e| anyhow::anyhow!("{path}: {e}"))?;
        let parsed = if path.contains("story") {
            toml::from_str::<StoryDef>(&text).map(|_| ()).map_err(|e| e.to_string())
        } else {
            toml::from_str::<CaseDef>(&text).map(|_| ()).map_err(|e| e.to_string())
        };
        return Ok(Output::Json(match parsed {
            Ok(()) => json!({ "path": path, "ok": true }),
            Err(e) => json!({ "path": path, "ok": false, "error": e }),
        }));
    }
    let c = Content::read()?;
    let problems = c.lint();
    Ok(Output::Json(
        json!({ "ok": problems.is_empty(), "problems": problems, "cases": c.cases.len(), "stories": c.stories.len() }),
    ))
}

/// `balance`: the bot over seeds and skills, per case.
pub fn t_balance(_: &mut Session, a: &Args) -> Result<Output> {
    use pav_core::games::surgery::Surgery;
    use pav_core::games::surgery::content::{self, CODE_BLUE};
    let seeds = get_u64(a, "seeds", 10)?.clamp(1, 200);
    let text = crate::tools::get_str(a, "skills").unwrap_or("1.0,0.7,0.4").to_string();
    let diff = get_u64(a, "difficulty", 1)? as u8;
    let skills: Vec<f32> = text.split(',').filter_map(|s| s.trim().parse().ok()).collect();
    let cases: Vec<u8> = match a.get("case").and_then(|v| v.as_u64()) {
        Some(c) => vec![c as u8],
        None => (0..content::CASES as u8).chain([CODE_BLUE]).collect(),
    };
    let mut rows = Vec::new();
    for case in cases {
        let scene = if case == CODE_BLUE { "surgery/codeblue".to_string() } else { format!("surgery/case/{case}") };
        let name = content::get().case(case).map(|c| c.name.clone()).unwrap_or_default();
        let mut per_skill = Vec::new();
        for skill in &skills {
            let (mut wins, mut time, mut vitals, mut score, mut codes) = (0u32, 0.0f32, 0.0f32, 0i64, 0u32);
            let mut ranks = std::collections::BTreeMap::new();
            for seed in 1..=seeds {
                let mut sim = Sim::new(&scene, seed)?;
                {
                    let g = sim.state.play.as_mut().and_then(|g| g.get_mut::<Surgery>()).expect("a surgery game");
                    g.bot_skill = *skill;
                }
                sim.step(&pav_core::InputFrame {
                    surgery: Some(pav_core::input::SurgeryCmd::Difficulty(diff)),
                    ..Default::default()
                });
                let (o, t) = sim.run_bot(60 * 60 * 30);
                let g = sim.play().and_then(|g| g.get::<Surgery>()).expect("a surgery game");
                if o == Outcome::Won {
                    wins += 1;
                    if let Some(r) = &g.results {
                        *ranks.entry(r.rank.to_string()).or_insert(0u32) += 1;
                        score += r.total as i64;
                    }
                    vitals += g.op.vitals;
                }
                time += t as f32 / 60.0;
                codes += g.op.counters.notes.get("code").copied().unwrap_or(0);
            }
            let n = seeds as f32;
            per_skill.push(json!({
                "skill": skill,
                "wins": format!("{wins}/{seeds}"),
                "seconds": (time / n).round(),
                "vitals_left": if wins > 0 { (vitals / wins as f32).round() } else { 0.0 },
                "avg_score": if wins > 0 { score / wins as i64 } else { 0 },
                "codes": codes,
                "ranks": ranks,
            }));
        }
        // The par that puts skill 1.0 at the top of S.
        let suggested = per_skill.first().and_then(|r| r["avg_score"].as_i64()).unwrap_or(0) as f32 / 1.08;
        rows.push(json!({ "case": case, "name": name, "suggested_par": (suggested / 100.0).round() * 100.0, "runs": per_skill }));
    }
    Ok(Output::Json(json!({ "balance": rows })))
}
