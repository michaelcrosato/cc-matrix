//! A stateless good hand. Noise and release timing come from skill, not from `sim.rng`.

use super::content::G_DUET;
use super::hazard::aim_point;
use super::kinds::*;
use super::*;
use crate::input::{surg, SurgeonInput};

const DT: f32 = 1.0 / 60.0;

pub fn decide(game: &Surgery, tick: u64, slot: usize) -> SurgeonInput {
    let mut inp = SurgeonInput { active: true, pressure: 1.0, tool: TOOL_KEEP, ..Default::default() };
    let skill = game.skill.clamp(0.0, 1.0);
    if matches!(game.mode, M_STORY | M_CHART | M_RESULTS) {
        inp.held = surg::CONFIRM;
        inp.pressed = surg::CONFIRM;
        inp.tool = TOOL_KEEP;
        return inp;
    }
    if game.mode != M_OP && game.mode != M_ATTRACT {
        inp.active = false;
        return inp;
    }
    let me = &game.surgeons[slot.min(3)];
    if game.heart.flat {
        return defib(game, me, skill, inp);
    }
    if skill >= 0.5 {
        inp.held |= surg::PRECISION;
    }
    if want_gift(game, skill) {
        let on = game.heart.on_beat(game.tune.beat_window_ms);
        if !on || !me.was_gift {
            inp.held |= surg::GIFT;
        }
    }
    let avoid = if slot == 0 { None } else { game.surgeons[0].focus };
    let Some(h) = pick(game, avoid) else {
        aim_toward(game, me, slot, skill, tick, me.x, me.z, &mut inp);
        inp.tool = me.tool;
        return inp;
    };
    let mut tool = if h.hidden && h.revealed <= 0.0 { SCANNER } else { h.tool };
    if skill < 0.2 {
        tool = (tick % 11) as u8;
    }
    inp.tool = tool;
    let side = if (tick / 8) % 2 == 0 { 1.0 } else { -1.0 };
    let (mut tx, mut tz) = aim_for(h, tick, side);
    // A skill of 0 still knew where the wound was, so the easy cases lived.
    // Below 0.15 the hand wanders and the case should be lost.
    if skill < 0.15 {
        tx = (tick as f32 * 0.07).sin() * 3.2;
        tz = (tick as f32 * 0.05).cos() * 2.2;
    }
    if h.kind == K_TENDRIL && !game.heart.diastole() {
        tx = h.x;
        tz = h.z;
    }
    if me.focus == Some(h.id) && me.focus_t > 2.2 && skill > 0.3 {
        let a = me.focus_t * 2.4;
        tx += a.cos() * 0.42;
        tz += a.sin() * 0.42;
    }
    aim_toward(game, me, slot, skill, tick, tx, tz, &mut inp);
    let dx = tx - me.x;
    let dz = tz - me.z;
    let dist = (dx * dx + dz * dz).sqrt();
    let near = dist < (h.radius + 0.28).max(0.45);
    let release_at = release_at(skill, h.kind);
    let charging = is_charge(h);
    let heat = heat_danger(game, me.x, me.z);
    let hold = if heat {
        false
    } else if charging && h.aux >= release_at {
        false
    } else if h.kind == K_TENDRIL && !game.heart.diastole() {
        h.grabbed || dist < h.radius
    } else if h.kind == K_BONE && h.stage == 0 && h.aux.abs() >= 12.0 {
        false
    } else if h.grabbed {
        true
    } else if tool == SCANNER {
        dist < h.radius + 0.4
    } else if tool == IV {
        true
    } else {
        near || (me.was_use && dist < h.radius + 0.85)
    };
    if h.kind == K_BONE && h.stage == 0 && h.aux > 12.0 {
        inp.held |= surg::ROT_L;
    } else if h.kind == K_BONE && h.stage == 0 && h.aux < -12.0 {
        inp.held |= surg::ROT_R;
    }
    if hold {
        inp.held |= surg::USE;
    }
    inp
}

fn want_gift(game: &Surgery, skill: f32) -> bool {
    if skill < 0.55 || game.heart.flat || game.surgeons[0].meter < 100.0 {
        return false;
    }
    game.pending_gift() != 0
}

fn defib(game: &Surgery, me: &Surgeon, skill: f32, mut inp: SurgeonInput) -> SurgeonInput {
    inp.tool = DEFIB;
    let on = game.heart.ghost_on_beat(game.tune.beat_window_ms);
    let hold = if skill < 0.35 {
        me.defib < 1.15
    } else if me.defib < 1.15 || !on {
        true
    } else {
        !me.was_defib
    };
    if hold {
        inp.held |= surg::DEFIB;
    }
    inp
}

fn pick(game: &Surgery, avoid: Option<u32>) -> Option<&Hazard> {
    let mut best: Option<&Hazard> = None;
    for h in &game.hazards {
        if !h.alive || h.kind == K_HEAT {
            continue;
        }
        if avoid == Some(h.id) && game.hazards.iter().any(|o| o.alive && o.kind != K_HEAT && Some(o.id) != avoid) {
            continue;
        }
        let better = match best {
            None => true,
            Some(b) => h.drain > b.drain + 0.05 || ((h.drain - b.drain).abs() <= 0.05 && h.id < b.id),
        };
        if better {
            best = Some(h);
        }
    }
    best
}

fn aim_for(h: &Hazard, tick: u64, side: f32) -> (f32, f32) {
    let paint = matches!(h.tool, GEL | DRESSING) && matches!(h.kind, K_INFLAM | K_BURN | K_DRESSING | K_TUMOR);
    if paint {
        let ang = tick as f32 * 0.22;
        let r = h.radius * 0.55;
        return (h.x + ang.cos() * r, h.z + ang.sin() * r);
    }
    aim_point(h, side)
}

fn is_charge(h: &Hazard) -> bool {
    match h.kind {
        K_POLYP | K_SAC | K_IV => true,
        K_NODULE | K_EMBER if h.stage == 0 => true,
        _ => false,
    }
}

fn release_at(skill: f32, kind: u8) -> f32 {
    if kind == K_IV {
        if skill < 0.2 { 1.25 } else { 0.90 }
    } else {
        0.90 + (1.0 - skill) * 0.28
    }
}

fn heat_danger(game: &Surgery, x: f32, z: f32) -> bool {
    if !game.heat_on {
        return false;
    }
    let ang = z.atan2(x);
    let mut d = (ang - game.heat_angle).abs();
    if d > std::f32::consts::PI {
        d = std::f32::consts::TAU - d;
    }
    let r = (x * x + z * z).sqrt();
    d < 0.22 && r > 0.4
}

fn aim_toward(game: &Surgery, me: &Surgeon, slot: usize, skill: f32, tick: u64, mut tx: f32, mut tz: f32, inp: &mut SurgeonInput) {
    let amp = (1.0 - skill) * (1.0 - skill) * 2.2;
    if amp > 0.001 {
        tx += (hash01(tick, slot, 1) - 0.5) * 2.0 * amp;
        tz += (hash01(tick, slot, 2) - 0.5) * 2.0 * amp;
    }
    let _ = game;
    let step = (3.0 + 12.0 * skill) * DT;
    let dx = tx - me.x;
    let dz = tz - me.z;
    let dist = (dx * dx + dz * dz).sqrt();
    if dist > step && dist > 0.0001 {
        tx = me.x + dx / dist * step;
        tz = me.z + dz / dist * step;
    }
    tx = tx.clamp(X_MIN, X_MAX);
    tz = tz.clamp(Z_MIN, Z_MAX);
    inp.aim = glam::Vec2::new(tx, tz);
    inp.held |= surg::AIM_ABSOLUTE;
}

fn hash01(tick: u64, slot: usize, salt: u64) -> f32 {
    let mut x = tick.wrapping_mul(0x9E37_79B9_7F4A_7C15) ^ ((slot as u64) << 17) ^ salt.wrapping_mul(0xBF58_476D_1CE4_E5B9);
    x ^= x >> 30;
    x = x.wrapping_mul(0xBF58_476D_1CE4_E5B9);
    x ^= x >> 27;
    (x as u32 as f32) / (u32::MAX as f32)
}

#[allow(dead_code)]
fn _gift_bit() -> u8 {
    G_DUET
}
