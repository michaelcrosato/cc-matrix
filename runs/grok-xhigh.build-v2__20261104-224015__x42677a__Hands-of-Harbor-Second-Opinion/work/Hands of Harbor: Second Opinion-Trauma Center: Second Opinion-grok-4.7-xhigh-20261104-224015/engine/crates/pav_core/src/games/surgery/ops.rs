//! One tick of the operation. Gameplay happens here, where the input is.

use glam::Vec3;

use super::content::{self, case_def, G_DUET, G_ECHO, G_HUSH};
use super::hazard::{self, Hit};
use super::kinds::*;
use super::*;
use super::{bot, story};
use crate::games::Outcome;
use crate::frame::SimEvent;
use crate::input::{surg, InputFrame, SurgeonInput};
use crate::sim::Sim;

pub fn tick(g: &mut Surgery, sim: &mut Sim, input: &InputFrame, dt: f32, events: &mut Vec<SimEvent>, had_cmd: bool) {
    if g.outcome == Outcome::Lost && g.mode == M_DEAD {
        return;
    }
    let dt = dt.max(0.0);
    match g.mode {
        M_STORY if !had_cmd => {
            if confirmed(input) {
                let lines = story::block(g.case_id, g.story_after);
                if (g.story_i as usize) + 1 >= lines.len() {
                    g.end_story();
                } else {
                    g.story_i = g.story_i.saturating_add(1);
                    cue(events, CUE_VOICE, 0.0, 0.0, 0.7, 0.9 + (g.story_i as f32 % 5.0) * 0.04);
                }
            }
            return;
        }
        M_CHART if !had_cmd => {
            if confirmed(input) {
                g.mode = M_OP;
                g.phase_ready = false;
                cue(events, CUE_OK, 0.0, 0.0, 0.6, 1.0);
            }
            return;
        }
        M_RESULTS if !had_cmd => {
            if confirmed(input) && g.campaign && g.outcome == Outcome::Playing {
                g.mode = M_STORY;
                g.story_after = true;
                g.story_i = 0;
            }
            return;
        }
        M_CARD => {
            g.card_t += dt;
            return;
        }
        M_MIRROR => {
            mirror_predict(g, input, dt);
            return;
        }
        M_TITLE | M_DEAD => return,
        M_OP | M_ATTRACT => {}
        _ => return,
    }
    if g.outcome != Outcome::Playing {
        return;
    }

    let mut slots = input.surgeons;
    if g.mode == M_ATTRACT || (g.mode == M_OP && g.bot_drive) {
        slots[0] = bot::decide(g, sim.state.tick, 0);
        slots[0].active = true;
    }
    if g.case_id == 7 && !slots[1].active {
        slots[1] = bot::decide(g, sim.state.tick, 1);
    }
    let joined = slots.iter().filter(|s| s.active).count().max(1) as u8;
    g.players = g.players.max(joined);

    let rules = if g.hush_beats > 0 { dt * g.tune.hush_scale.clamp(0.05, 1.0) } else { dt };
    let wave = g.heart.tick(rules, g.tune.heart_coupling);
    if wave {
        cue(events, CUE_LUB, 0.0, 0.0, 0.35, (g.heart.bpm / 80.0).clamp(0.7, 1.6));
        if g.hush_beats > 0 {
            g.hush_beats = g.hush_beats.saturating_sub(1);
        }
        if g.heat_phase && !g.heat_on && g.heart.beats % 5 == 0 {
            g.heat_on = true;
            g.heat_angle = 0.0;
        }
    }
    if g.echo_left > 0.0 {
        g.echo_left = (g.echo_left - dt).max(0.0);
        g.echo_cool = (g.echo_cool - dt).max(0.0);
    } else {
        g.echo_on = false;
    }
    if g.duet_left > 0.0 {
        g.duet_left = (g.duet_left - dt).max(0.0);
    }
    g.callout_t = (g.callout_t - dt).max(0.0);
    g.banner_t = (g.banner_t - dt).max(0.0);
    for p in &mut g.popups {
        p.1 = (p.1 - dt).max(0.0);
    }
    if g.plate_blend < 1.0 {
        g.plate_blend = (g.plate_blend + dt / 0.8).min(1.0);
        if g.plate_blend >= 1.0 {
            g.plate = g.plate_next;
        }
    }

    if !g.phase_ready && !g.code_blue {
        enter_phase(g, sim, events);
    }
    if g.outcome != Outcome::Playing {
        return;
    }

    swell_and_wander(g, rules, events);
    if g.heat_on {
        g.heat_angle += rules * 2.8;
        if g.heat_angle > std::f32::consts::TAU {
            g.heat_on = false;
            note_kind(g, K_HEAT);
        }
    }

    if g.heart.flat {
        g.code_t -= dt;
        defib_only(g, &slots, dt, events);
        if g.code_t <= 0.0 && g.heart.flat && g.mode != M_DEAD {
            g.die();
        }
    } else {
        hands(g, &slots, rules, dt, sim.state.tick, events);
        echo_copy(g, events);
        if !g.immortal {
            let mut drain = 0.0;
            for h in &g.hazards {
                if h.alive && h.kind != K_HEAT {
                    drain += h.drain;
                }
            }
            let mul = content::diff_drain(g.difficulty) * g.tune.drain;
            g.heart.vitals -= drain * mul * rules;
        }
    }

    g.heart.vitals = g.heart.vitals.clamp(0.0, 100.0);
    if g.immortal && g.heart.vitals < 20.0 {
        g.heart.vitals = 55.0;
        g.heart.flat = false;
        g.code_t = -1.0;
    }
    if g.heart.vitals < 40.0 && !g.warned_40 && !g.heart.flat {
        g.warned_40 = true;
        g.callout_i = 2;
        g.callout_t = 2.2;
    }
    if g.pending_script && !g.heart.flat && g.mode != M_DEAD {
        g.pending_script = false;
        g.begin_code(true);
    } else if g.heart.vitals <= 0.0 && !g.heart.flat && g.mode != M_DEAD {
        g.begin_code(false);
    }

    if g.mode != M_OP && g.mode != M_ATTRACT {
        return;
    }
    if !g.freeze && !g.heart.flat {
        let speed = 1.0 / g.tune.timer.max(0.2);
        if g.code_blue {
            g.timer -= dt * speed;
        } else {
            g.timer -= rules * speed;
        }
    }
    g.elapsed += dt;

    if !g.code_blue && !g.heart.flat && phase_clear(g) {
        g.phase_i = g.phase_i.saturating_add(1);
        g.phase_ready = false;
        g.heat_on = false;
        if case_def(g.case_id.max(0) as u8).is_some_and(|c| g.phase_i as usize >= c.phases.len()) {
            g.finish_op();
            return;
        }
    }

    if g.code_blue && g.mode == M_OP {
        tick_blue(g, sim, dt);
    }
    if g.timer <= 0.0 && (g.mode == M_OP || g.mode == M_ATTRACT) {
        if g.code_blue && g.heart.vitals > 0.0 && !g.heart.flat {
            g.finish_op();
        } else if !g.code_blue {
            g.die();
        } else if g.heart.flat || g.heart.vitals <= 0.0 {
            g.die();
        }
    }
}

fn enter_phase(g: &mut Surgery, sim: &mut Sim, events: &mut Vec<SimEvent>) {
    let Some(def) = case_def(g.case_id.max(0) as u8) else {
        g.finish_op();
        return;
    };
    if g.phase_i as usize >= def.phases.len() {
        g.finish_op();
        return;
    }
    let phase = def.phases[g.phase_i as usize];
    g.hazards.clear();
    g.heat_phase = phase.heat;
    g.heat_on = false;
    for spawn in phase.spawns {
        let mut h = Hazard::make(spawn.kind, spawn.x, spawn.z);
        if spawn.drain >= 0.0 {
            h.drain = spawn.drain;
        }
        if spawn.axis < 90.0 {
            h.axis = spawn.axis;
        }
        h.hidden = spawn.hidden;
        h.need *= g.tune.strain_tough.clamp(0.2, 3.0);
        let jx = sim.state.rng.range(-0.05, 0.05);
        let jz = sim.state.rng.range(-0.05, 0.05);
        h.x = (h.x + jx).clamp(-8.2, 8.2);
        h.z = (h.z + jz).clamp(-3.6, 3.6);
        if phase.strain == 0 {
            h.tag = 1;
        }
        h.id = g.next_id;
        g.next_id = g.next_id.wrapping_add(1);
        g.hazards.push(h);
    }
    if phase.strain != NO_STRAIN_SENTINEL {
        let i = phase.strain as usize;
        if i < g.coverage.strains.len() {
            g.coverage.strains[i] = g.coverage.strains[i].saturating_add(1);
            g.strain_phase = phase.strain;
            g.banner_t = 2.4;
            cue(events, CUE_BANNER, 0.0, 0.0, 0.55, 1.0);
        }
    }
    if phase.unlock != 0 {
        g.gifts_unlocked |= phase.unlock;
        g.recent_unlock = phase.unlock;
        g.surgeons[0].meter = 100.0;
        g.callout_i = match phase.unlock {
            G_HUSH => 7,
            G_ECHO => 8,
            G_DUET => 9,
            _ => phase.callout,
        };
        g.callout_t = 2.6;
    } else if phase.callout > 0 {
        g.callout_i = phase.callout;
        g.callout_t = 2.4;
    }
    g.shocks_need = phase.script_code;
    g.shocks_done = 0;
    g.pending_script = phase.script_code > 0;
    g.phase_ready = true;
    if phase.checkpoint || g.phase_i == 0 {
        g.save_checkpoint();
    }
}

const NO_STRAIN_SENTINEL: u8 = 255;

fn phase_clear(g: &Surgery) -> bool {
    if g.pending_script || (g.shocks_need > 0 && g.shocks_done < g.shocks_need) {
        return false;
    }
    !g.hazards.iter().any(|h| h.alive && h.kind != K_HEAT)
}

fn swell_and_wander(g: &mut Surgery, rules: f32, events: &mut Vec<SimEvent>) {
    let mut bursts: Vec<(f32, f32)> = Vec::new();
    for h in &mut g.hazards {
        if !h.alive {
            continue;
        }
        if h.kind == K_SAC {
            // aux is the laser charge. Swell uses aux2 so a ripe sac can still be lased.
            h.aux2 = (h.aux2 + rules * 0.08).min(1.3);
            if h.aux2 >= 1.12 {
                h.alive = false;
                bursts.push((h.x, h.z));
            }
        } else if h.tag == 1 {
            let w = (g.elapsed * 1.4 + h.id as f32).sin();
            h.x = (h.x + w * rules * 0.28).clamp(-8.2, 8.2);
        }
    }
    for (x, z) in bursts {
        note_kind(g, K_SAC);
        g.heart.vitals = (g.heart.vitals - 6.0).max(0.0);
        g.spawn_kind_at(K_POOL, x, z, 0.9);
        cue(events, CUE_BURST, x, z, 0.8, 0.9);
    }
}

fn hands(g: &mut Surgery, slots: &[SurgeonInput; 4], rules: f32, dt: f32, tick: u64, events: &mut Vec<SimEvent>) {
    for i in 0..4 {
        let mut inp = slots[i];
        if inp.held & surg::AIM_ABSOLUTE == 0 {
            if inp.held & surg::PRECISION != 0 {
                inp.aim *= 0.35;
            }
            inp.aim = assist_aim(g, g.surgeons[i].x, g.surgeons[i].z, g.surgeons[i].tool, inp.aim, dt);
        }
        let lead = i == 0;
        if !inp.active && !lead {
            continue;
        }
        if lead {
            g.surgeons[0].active = true;
        }
        if inp.active {
            if inp.tool != TOOL_KEEP {
                g.surgeons[i].tool = inp.tool.min(DEFIB);
            }
            steer(&mut g.surgeons[i], inp, dt, g.tune.cursor_speed);
        }
        g.surgeons[i].x = g.surgeons[i].x.clamp(X_MIN, X_MAX);
        g.surgeons[i].z = g.surgeons[i].z.clamp(Z_MIN, Z_MAX);
        g.surgeons[i].wrong_cd = (g.surgeons[i].wrong_cd - dt).max(0.0);
        g.surgeons[i].iv_cd = (g.surgeons[i].iv_cd - dt).max(0.0);
        g.surgeons[i].since_chain += dt;

        let (mut x, mut z) = (g.surgeons[i].x, g.surgeons[i].z);
        let precise = inp.held & surg::PRECISION != 0;
        let echo = g.echo_left > 0.0;
        if i == 0 && !precise && !echo && g.tune.tremor > 0.0 {
            let w = 0.12 * g.tune.tremor;
            let t = tick as f32;
            x += (t * 0.73).sin() * w;
            z += (t * 0.51).cos() * w;
        }
        let use_held = inp.held & surg::USE != 0;
        let just_release = g.surgeons[i].was_use && !use_held;
        let ring = g.surgeons[i].tool;
        let tool = contextual_tool(ring, x, z, &g.hazards);
        g.surgeons[i].tool = tool;
        if g.heat_on && use_held && heat_hit(g.heat_angle, x, z) {
            g.heart.vitals = (g.heart.vitals - 8.0).max(0.0);
            g.surgeons[i].chain = 0;
            g.mistakes = g.mistakes.saturating_add(1);
            g.callout_i = 4;
            g.callout_t = 1.4;
            cue(events, CUE_STING, x, z, 0.7, 1.0);
        }
        let rot = if inp.held & surg::ROT_L != 0 {
            1
        } else if inp.held & surg::ROT_R != 0 {
            -1
        } else {
            0
        };
        let focus = g.surgeons[i].focus;
        let idx = select(&g.hazards, x, z, tool, focus, just_release, use_held);
        if let Some(idx) = idx {
            let id = g.hazards[idx].id;
            let before = g.hazards[idx].work;
            let was_hidden = g.hazards[idx].hidden;
            let mut hit = hazard::apply(
                &mut g.hazards[idx],
                x,
                z,
                tool,
                use_held,
                just_release,
                inp.pressure,
                rot,
                rules,
                g.tune.tool_power,
                g.heart.diastole() || g.duet_left > 0.0,
                g.tune.rating_strict,
            );
            if g.one_hit && hit.engaged && g.hazards[idx].accepts(tool) && tool != SCANNER {
                hit.done = true;
                hit.rating = R_IMMACULATE;
                g.hazards[idx].alive = false;
            }
            if was_hidden && !g.hazards[idx].hidden {
                g.coverage.tools[SCANNER as usize] = g.coverage.tools[SCANNER as usize].saturating_add(1);
            }
            let grew = g.hazards[idx].work > before + 0.0001 || hit.done;
            if g.surgeons[i].focus == Some(id) {
                if grew {
                    g.surgeons[i].focus_t = 0.0;
                } else {
                    g.surgeons[i].focus_t += dt;
                }
            } else {
                g.surgeons[i].focus = Some(id);
                g.surgeons[i].focus_t = 0.0;
            }
            if hit.engaged {
                g.hazards[idx].idle = 0.0;
            }
            if hit.done {
                resolve_done(g, i, idx, hit, events);
            } else if use_held && !hit.engaged && g.surgeons[i].wrong_cd <= 0.0 && tool != SCANNER && tool != DEFIB {
                if let Some(w) = nearest_wrong(&g.hazards, x, z, tool) {
                    let _ = w;
                    g.surgeons[i].chain = 0;
                    g.surgeons[i].wrong_cd = 0.8;
                    g.mistakes = g.mistakes.saturating_add(1);
                    g.heart.vitals = (g.heart.vitals - 2.0 * g.tune.wrong_penalty).max(0.0);
                    g.callout_i = if tool == SCALPEL { 1 } else { 3 };
                    g.callout_t = 1.2;
                    cue(events, CUE_WRONG, x, z, 0.55, 1.0);
                }
            }
            if hit.cue != 0 && (hit.done || tick % 8 == 0) {
                cue(events, hit.cue, x, z, 0.45, 1.0);
            }
        }
        gift_edge(g, i, inp, dt);
        g.surgeons[i].was_use = use_held;
    }
    let mut busy = [0u32; 8];
    let mut n = 0;
    for s in &g.surgeons {
        if let Some(id) = s.focus {
            if n < busy.len() {
                busy[n] = id;
                n += 1;
            }
        }
    }
    for h in &mut g.hazards {
        if busy[..n].contains(&h.id) && h.idle == 0.0 {
            continue;
        }
        h.idle += rules;
        if h.idle > 0.4 && !matches!(h.kind, K_BONE | K_SAC | K_HEAT | K_IV) {
            h.work = (h.work - rules * 0.45).max(0.0);
        }
    }
}

fn resolve_done(g: &mut Surgery, slot: usize, idx: usize, hit: Hit, events: &mut Vec<SimEvent>) {
    let kind = g.hazards[idx].kind;
    let hx = g.hazards[idx].x;
    let hz = g.hazards[idx].z;
    let tool = g.surgeons[slot].tool as usize;
    if kind == K_IV && hit.rating != R_SLOPPY {
        g.hazards[idx].alive = false;
    }
    if hit.heal != 0.0 && g.surgeons[slot].iv_cd <= 0.0 {
        g.heart.vitals = (g.heart.vitals + hit.heal * g.tune.iv_heal).clamp(0.0, 100.0);
        if hit.heal > 0.0 {
            g.surgeons[slot].iv_cd = 8.0;
        }
    }
    let rating = hit.rating.min(3);
    g.coverage.ratings[rating as usize] = g.coverage.ratings[rating as usize].saturating_add(1);
    if tool < N_TOOLS {
        g.coverage.tools[tool] = g.coverage.tools[tool].saturating_add(1);
    }
    g.last_tool = g.surgeons[slot].tool;
    g.last_rating = rating;
    g.last_id = g.hazards[idx].id;
    g.last_ok = true;
    if rating == R_SLOPPY || hit.misuse > 0 {
        g.surgeons[slot].chain = 0;
        g.mistakes = g.mistakes.saturating_add(1);
        g.surgeons[slot].score += rating_points(R_SLOPPY);
    } else {
        let chain = if g.surgeons[slot].since_chain <= g.tune.chain_window && g.surgeons[slot].chain > 0 {
            g.surgeons[slot].chain.saturating_add(1)
        } else {
            1
        };
        g.surgeons[slot].chain = chain;
        g.surgeons[slot].best_chain = g.surgeons[slot].best_chain.max(chain);
        g.surgeons[slot].since_chain = 0.0;
        let pts = (rating_points(rating) as f32 * chain_mul(chain) * g.tune.score_mul).round() as i32;
        g.surgeons[slot].score += pts;
        if chain == 5 || chain == 10 || chain == 20 {
            cue(events, CUE_CHAIN, hx, hz, 0.6, 1.0 + chain as f32 * 0.01);
        }
        let mut meter = match rating {
            R_IMMACULATE => 8.0,
            R_CLEAN => 4.0,
            _ => 0.0,
        };
        if g.heart.on_beat(g.tune.beat_window_ms) {
            meter += 2.0;
            cue(events, CUE_BEAT, hx, hz, 0.4, 1.2);
        }
        g.surgeons[slot].meter = (g.surgeons[slot].meter + meter * g.tune.gift_gain).min(100.0);
    }
    if !g.hazards[idx].alive {
        note_kind(g, kind);
    }
    push_popup(g, rating, hx, hz);
    cue(events, CUE_RATE, hx, hz, 0.5, 1.0 + (3 - rating) as f32 * 0.08);
    if rating == R_IMMACULATE {
        g.callout_i = 0;
        g.callout_t = g.callout_t.max(0.8);
    }
}

fn gift_edge(g: &mut Surgery, slot: usize, inp: SurgeonInput, dt: f32) {
    if slot != 0 {
        return;
    }
    let held = inp.held & surg::GIFT != 0;
    if held {
        g.surgeons[0].gift_arm += dt;
    } else if g.surgeons[0].was_gift {
        let armed = g.surgeons[0].gift_arm >= 0.12;
        let on = g.heart.on_beat(g.tune.beat_window_ms);
        if armed && on && g.surgeons[0].meter >= 100.0 && !g.heart.flat {
            let bit = g.pending_gift();
            g.activate_gift(bit);
        }
        g.surgeons[0].gift_arm = 0.0;
    }
    g.surgeons[0].was_gift = held;
}

fn defib_only(g: &mut Surgery, slots: &[SurgeonInput; 4], dt: f32, events: &mut Vec<SimEvent>) {
    for i in 0..4 {
        let inp = slots[i];
        if !inp.active && i != 0 {
            continue;
        }
        if i == 0 {
            g.surgeons[0].active = true;
        }
        if inp.tool != TOOL_KEEP && inp.active {
            g.surgeons[i].tool = inp.tool.min(DEFIB);
        }
        let held = inp.held & surg::DEFIB != 0 || (g.surgeons[i].tool == DEFIB && inp.held & surg::USE != 0);
        if held {
            g.surgeons[i].defib += dt;
            if g.surgeons[i].defib > 0.2 && (g.surgeons[i].defib * 10.0) as u32 % 8 == 0 {
                cue(events, CUE_WHINE, g.surgeons[i].x, g.surgeons[i].z, 0.3, 0.8 + g.surgeons[i].defib);
            }
        } else if g.surgeons[i].was_defib {
            let c = g.surgeons[i].defib;
            if (1.12..=2.6).contains(&c) && g.heart.ghost_on_beat(g.tune.beat_window_ms) {
                cue(events, CUE_THUMP, 0.0, 0.0, 0.9, 1.0);
                g.resuscitate();
                return;
            }
            g.surgeons[i].defib = 0.0;
        }
        g.surgeons[i].was_defib = held;
    }
}

fn echo_copy(g: &mut Surgery, events: &mut Vec<SimEvent>) {
    if g.echo_left <= 0.0 || g.echo_cool > 0.0 || !g.last_ok {
        return;
    }
    let tool = g.last_tool;
    let rating = g.last_rating;
    let skip = g.surgeons[0].focus;
    let found = g.hazards.iter().position(|h| {
        h.alive && h.kind != K_HEAT && h.tool == tool && Some(h.id) != skip && h.id != g.last_id
    });
    let Some(idx) = found else { return };
    let kind = g.hazards[idx].kind;
    let x = g.hazards[idx].x;
    let z = g.hazards[idx].z;
    g.hazards[idx].alive = false;
    g.echo_x = x;
    g.echo_z = z;
    g.echo_on = true;
    g.echo_cool = 1.15;
    g.last_id = g.hazards[idx].id;
    note_kind(g, kind);
    if (tool as usize) < N_TOOLS {
        g.coverage.tools[tool as usize] = g.coverage.tools[tool as usize].saturating_add(1);
    }
    g.coverage.ratings[rating as usize] = g.coverage.ratings[rating as usize].saturating_add(1);
    let pts = (rating_points(rating) as f32 * g.tune.score_mul) as i32;
    g.surgeons[0].score += pts;
    push_popup(g, rating, x, z);
    cue(events, CUE_PING, x, z, 0.45, 1.4);
}

fn tick_blue(g: &mut Surgery, sim: &mut Sim, dt: f32) {
    if g.timer <= 32.0 && !g.blue_finale {
        g.blue_finale = true;
        g.spawn_kind_at(K_NODULE, -0.8, 0.4, 0.35);
        g.spawn_kind_at(K_NODULE, 0.9, -0.3, 0.35);
        g.spawn_kind_at(K_POOL, 0.1, 1.0, 0.6);
        return;
    }
    if g.timer <= 32.0 {
        return;
    }
    let quiet = g.hazards.iter().all(|h| !h.alive || h.kind == K_HEAT);
    if !quiet {
        return;
    }
    g.blue_t += dt;
    if g.blue_t < 18.0 {
        return;
    }
    g.blue_t = 0.0;
    g.blue_wave = g.blue_wave.wrapping_add(1);
    let wave = g.blue_wave;
    let extra = (g.players.saturating_sub(1)).min(3);
    match wave % 6 {
        0 => {
            g.spawn_kind_at(K_LACERATION, -1.2, 0.2, 0.8);
            g.spawn_kind_at(K_POOL, 1.3, -0.4, 0.55);
        }
        1 => {
            g.spawn_kind_at(K_POLYP, 0.4, 0.8, 0.3);
            g.spawn_kind_at(K_INFLAM, -1.4, -0.6, 0.35);
        }
        2 => {
            g.spawn_kind_at(K_BLEEDER, 0.2, -0.2, 1.8);
            let mut h = Hazard::make(K_FOREIGN, -1.0, 0.9);
            h.hidden = true;
            h.drain = 0.4;
            h.id = g.next_id;
            g.next_id += 1;
            g.hazards.push(h);
        }
        3 => {
            g.spawn_kind_at(K_SAC, -0.6, 0.5, 0.25);
            g.spawn_kind_at(K_SAC, 1.1, 0.2, 0.25);
        }
        4 => {
            g.spawn_kind_at(K_EMBER, -0.3, 0.6, 0.3);
            g.spawn_kind_at(K_BURN, 1.2, -0.7, 0.3);
        }
        _ => {
            g.spawn_kind_at(K_INCISION, -1.8, 0.4, 0.0);
            g.spawn_kind_at(K_DRESSING, 0.6, -1.0, 0.1);
        }
    }
    if extra >= 1 {
        g.spawn_kind_at(K_POOL, -1.6, -1.1, 0.4);
    }
    if extra >= 2 {
        g.spawn_kind_at(K_LACERATION, 1.6, 1.0, 0.6);
    }
    if extra >= 3 {
        g.spawn_kind_at(K_BLEEDER, 0.0, 1.3, 1.4);
    }
    let _ = sim;
}

fn select(
    hazards: &[Hazard],
    x: f32,
    z: f32,
    tool: u8,
    focus: Option<u32>,
    just_release: bool,
    use_held: bool,
) -> Option<usize> {
    if just_release || use_held {
        if let Some(id) = focus {
            if let Some(i) = hazards.iter().position(|h| h.id == id && h.alive && h.kind != K_HEAT) {
                let h = &hazards[i];
                // A pull travels away from the wound. Keep the grabbed hazard, or the
                // one this tool is already working, so a neighbor does not steal it.
                if h.grabbed || (use_held && h.accepts(tool) && h.dist(x, z) < h.radius + 2.6) || just_release {
                    return Some(i);
                }
            }
        }
    }
    if tool == IV {
        if let Some(i) = hazards.iter().position(|h| h.alive && h.kind == K_IV) {
            return Some(i);
        }
    }
    let mut best = None;
    let mut best_d = f32::MAX;
    for (i, h) in hazards.iter().enumerate() {
        if !h.alive || h.kind == K_HEAT {
            continue;
        }
        let d = h.dist(x, z);
        if d < best_d {
            best_d = d;
            best = Some(i);
        }
    }
    best
}

fn nearest_wrong(hazards: &[Hazard], x: f32, z: f32, tool: u8) -> Option<usize> {
    let mut best = None;
    let mut best_d = f32::MAX;
    for (i, h) in hazards.iter().enumerate() {
        if !h.alive || h.kind == K_HEAT || h.accepts(tool) {
            continue;
        }
        let d = h.dist(x, z);
        if d <= h.radius + 0.12 && d < best_d {
            best_d = d;
            best = Some(i);
        }
    }
    best
}

fn assist_aim(g: &Surgery, x: f32, z: f32, tool: u8, aim: glam::Vec2, dt: f32) -> glam::Vec2 {
    let scale = g.tune.aim_assist.clamp(0.0, 2.0);
    if scale <= 0.0 || aim.length_squared() < 0.0004 {
        return aim;
    }
    let mut best: Option<(f32, f32, f32)> = None;
    for h in &g.hazards {
        if !h.alive || h.kind == K_HEAT || !h.accepts(tool) {
            continue;
        }
        let dx = h.x - x;
        let dz = h.z - z;
        let d = (dx * dx + dz * dz).sqrt();
        if d < 1.2 && best.map(|(bd, _, _)| d < bd).unwrap_or(true) {
            best = Some((d, dx, dz));
        }
    }
    let Some((d, dx, dz)) = best else { return aim };
    let closeness = (1.0 - d / 1.2).clamp(0.0, 1.0) * scale.min(1.0);
    let mut aim = aim * (1.0 - 0.5 * closeness);
    if d > 0.02 {
        let inv = 1.0 / d;
        let pull = 3.0 * dt * closeness;
        let extra = pull / (g.tune.cursor_speed.max(1.0) * dt.max(1e-4));
        aim.x += dx * inv * extra;
        aim.y += dz * inv * extra;
    }
    aim
}

fn mirror_predict(g: &mut Surgery, input: &InputFrame, dt: f32) {
    for (i, inp) in input.surgeons.iter().enumerate() {
        if !inp.active {
            continue;
        }
        let (tool, x, z) = {
            let s = &mut g.surgeons[i];
            s.active = true;
            if inp.tool != TOOL_KEEP {
                s.tool = inp.tool;
            }
            steer(s, *inp, dt, g.tune.cursor_speed);
            (s.tool, s.x, s.z)
        };
        g.surgeons[i].tool = contextual_tool(tool, x, z, &g.hazards);
    }
}

fn steer(s: &mut Surgeon, inp: SurgeonInput, dt: f32, speed: f32) {
    let abs = inp.held & surg::AIM_ABSOLUTE != 0;
    let snap = inp.held & surg::SNAP != 0;
    if abs && snap {
        s.x = inp.aim.x;
        s.z = inp.aim.y;
        return;
    }
    if abs {
        let dx = inp.aim.x - s.x;
        let dz = inp.aim.y - s.z;
        let d = (dx * dx + dz * dz).sqrt();
        let step = speed.max(1.0) * dt;
        if d <= step || d < 1e-5 {
            s.x = inp.aim.x;
            s.z = inp.aim.y;
        } else {
            s.x += dx / d * step;
            s.z += dz / d * step;
        }
    } else if inp.aim.length_squared() > 0.0004 {
        s.x += inp.aim.x * speed * dt;
        s.z += inp.aim.y * speed * dt;
    }
}

fn heat_hit(angle: f32, x: f32, z: f32) -> bool {
    let ang = z.atan2(x);
    let mut d = (ang - angle).abs();
    if d > std::f32::consts::PI {
        d = std::f32::consts::TAU - d;
    }
    let r = (x * x + z * z).sqrt();
    d < 0.22 && r > 0.4
}

fn note_kind(g: &mut Surgery, kind: u8) {
    let i = kind as usize;
    if i < g.coverage.hazards.len() {
        g.coverage.hazards[i] = g.coverage.hazards[i].saturating_add(1);
    }
}

fn push_popup(g: &mut Surgery, rating: u8, x: f32, z: f32) {
    g.popups[0] = g.popups[1];
    g.popups[1] = g.popups[2];
    g.popups[2] = g.popups[3];
    g.popups[3] = (rating, 1.1, x, z);
}

fn cue(events: &mut Vec<SimEvent>, id: u16, x: f32, z: f32, gain: f32, pitch: f32) {
    events.push(SimEvent::Cue { id, pos: Vec3::new(x, 0.2, z), gain, pitch });
}
