//! The bot: one stateless task planner. It picks the most urgent valid task, selects the tool,
//! moves at a human cursor speed and performs the gesture. `skill` scales speed and accuracy.
//! It drives the tests, the balance tool, attract mode, the Case 7 partner and the Echo.

use glam::Vec2;

use super::*;
use crate::input::{SurgeonInput, sbtn};

fn slot_of(kind: u8, case: u8) -> u8 {
    match kind {
        CRYO => {
            if case == 7 {
                7
            } else {
                5
            }
        }
        DRESS => 1,
        k => k,
    }
}

fn hash(t: u32, s: usize) -> f32 {
    let mut x = t.wrapping_mul(2654435761).wrapping_add(s as u32 * 40503);
    x ^= x >> 15;
    x = x.wrapping_mul(2246822519);
    x ^= x >> 13;
    (x & 0xffff) as f32 / 65535.0 * 2.0 - 1.0
}

fn urgency(g: &Surgery, h: &Hz) -> f32 {
    let mut u = h.drain() * 10.0;
    match h.k {
        Kind::Sac => u += 40.0 - (h.aux - h.grown).max(0.0) * 3.0,
        Kind::Nodule => u += if h.si == 1 { 50.0 } else { 6.0 },
        Kind::Bleeder => u += 60.0,
        Kind::Eye => u += 45.0,
        Kind::Ember => u += if h.si > 0 { 20.0 } else { 8.0 },
        Kind::Tendril => u += 5.0,
        _ => {}
    }
    let _ = g;
    u
}

pub fn bot_slot(g: &Surgery, s: usize) -> SurgeonInput {
    let sg = &g.sg[s];
    let skill = g.bot_skill;
    let mut inp = SurgeonInput { active: true, aim: sg.pos, tool: 0, ..Default::default() };
    let tick = g.tick;
    if skill <= 0.01 {
        return inp;
    }
    let speed = 8.0 * (0.3 + 0.7 * skill) / 60.0;
    let wob = (1.0 - skill) * 1.1;
    let noise = Vec2::new(hash(tick / 4, s), hash(tick / 4 + 7919, s)) * wob;
    let mv = |to: Vec2| -> Vec2 { sg.pos + (to - sg.pos).clamp_length_max(speed) };
    if g.mode != Mode::Op {
        return inp;
    }
    // Code: charge and release on the ghost beat.
    if g.code_t > 0.0 {
        let hold = !(sg.charge >= 1.25 && (g.ghost_phase - 0.5).abs() < 0.08);
        if hold {
            inp.held |= sbtn::DEFIB;
        }
        return inp;
    }
    // Gift: hold, release on the beat.
    if sg.unlocked_gift && sg.gift >= 100.0 && g.hush <= 0.0 && g.echo <= 0.0 && g.beat > 0.15 && g.beat < 0.999 {
        inp.held |= sbtn::GIFT;
    }
    let case = g.case;
    // IV when vitals fall.
    if g.vitals < 42.0 && sg.iv_cd <= 0.0 && g.ring_unlocked(8) && s == 0 {
        inp.tool = 8;
        if sg.dose < 0.86 {
            inp.held |= sbtn::USE;
        }
        inp.aim = IV_PORT;
        return inp;
    } else if sg.dose > 0.0 && sg.tool == 8 {
        // release to finish the dose
        inp.tool = 8;
        return inp;
    }
    // Candidates.
    let mut cands: Vec<usize> = (0..g.hz.len())
        .filter(|&i| {
            let h = &g.hz[i];
            if h.covered {
                return false;
            }
            if h.k == Kind::Eye && h.aux > 0.5 {
                return false;
            }
            // Case 7's partner does the support work; the strains are the player's.
            if g.case == 7 && s == 1 && !g.attract && !g.sg[0].bot && g.partner_support {
                if !matches!(h.k, Kind::Pool | Kind::Lace | Kind::Bleeder | Kind::Hook | Kind::Polyp | Kind::Burn) {
                    return false;
                }
            }
            if h.k == Kind::Dress {
                return g.hz.iter().all(|o| o.k == Kind::Dress);
            }
            true
        })
        .collect();
    cands.sort_by(|&a, &b| urgency(g, &g.hz[b]).total_cmp(&urgency(g, &g.hz[a])).then(g.hz[a].id.cmp(&g.hz[b].id)));
    // Keep working on a held gesture.
    let locked = g.hz.iter().position(|h| h.grabbed == Some(s as u8)).or_else(|| sg.target.and_then(|id| g.hz.iter().position(|h| h.id == id)));
    let pick = match locked {
        Some(i) => Some(i),
        None => {
            // Share the work between bots.
            let others = (0..s).filter(|&o| g.sg[o].active).count();
            let mut avail: Vec<usize> = cands.clone();
            // hidden things need scanning first
            avail.retain(|&i| true || i < usize::MAX);
            avail.get(others.min(avail.len().saturating_sub(1))).copied()
        }
    };
    let Some(i) = pick else {
        // nothing to do: park
        inp.aim = mv(Vec2::new(0.0, 3.8));
        return inp;
    };
    let h = &g.hz[i];
    // Hidden: scan first.
    let hidden = (h.hidden && h.reveal <= 0.0) && g.ring_unlocked(7);
    let kind = if hidden { SCAN } else { h.need() };
    let kind = if h.k == Kind::Dress { DRESS } else { kind };
    let slot = slot_of(kind, case);
    inp.tool = if kind == DRESS { 0 } else { slot };
    if h.k == Kind::Dress {
        inp.tool = 0;
    }
    // If the slot is locked in this case, nothing to do.
    let target = h.p;
    match kind {
        SCAN => {
            inp.aim = mv(target + noise);
            if (sg.pos - target).length() < 1.0 {
                inp.held |= sbtn::USE;
            }
        }
        SCALPEL => {
            let (a, b) = Surgery::stroke(h);
            let l = (b - a).length().max(0.01);
            let dir = (b - a) / l;
            let engaged = sg.target == Some(h.id);
            if !engaged {
                inp.aim = mv(a + noise * 0.3);
                if (sg.pos - a).length() < 0.35 {
                    inp.held |= sbtn::USE;
                }
            } else {
                let t = (((sg.pos - a).dot(dir) / l) + 0.12 / l * 6.0).clamp(0.0, 1.0);
                let goal = a + dir * (t * l).min(l) + noise * 0.15;
                inp.aim = mv(goal);
                inp.held |= sbtn::USE;
            }
        }
        FORCEPS => {
            if h.k == Kind::Bone {
                let grabbed = h.grabbed == Some(s as u8);
                if !grabbed {
                    inp.aim = mv(h.p);
                    if (sg.pos - h.p).length() < 0.2 {
                        inp.held |= sbtn::USE;
                    }
                } else {
                    inp.aim = mv(h.q);
                    let d = (h.p - h.q).length();
                    let diff = (h.ang - h.goal).rem_euclid(std::f32::consts::PI);
                    let diff = if diff > std::f32::consts::FRAC_PI_2 { diff - std::f32::consts::PI } else { diff };
                    if diff.abs() > 0.05 {
                        inp.held |= if diff > 0.0 { sbtn::ROT_L } else { sbtn::ROT_R };
                    }
                    let angle_ok = diff.abs().to_degrees() < 6.0;
                    if d < 0.12 && angle_ok {
                        // release to snap
                    } else {
                        inp.held |= sbtn::USE;
                    }
                }
            } else if h.grabbed == Some(s as u8) {
                inp.held |= sbtn::USE;
                let axis = Vec2::from_angle(h.ang);
                if h.k == Kind::Tendril && g.case == 7 {
                    let diastole = g.beat > 0.45;
                    inp.aim = if diastole { mv(sg.pos + axis * 0.5) } else { sg.pos };
                } else {
                    inp.aim = mv(sg.gp + axis * if h.k == Kind::Tendril { 3.0 } else { 1.6 } + noise * 0.1);
                }
            } else {
                inp.aim = mv(h.p + noise * 0.1);
                if (sg.pos - h.p).length() < 0.18 {
                    inp.held |= sbtn::USE;
                }
            }
        }
        SUTURE => {
            let (needle, axis) = {
                let (n, a) = match h.k {
                    Kind::Lace => {
                        let n = h.count().max(1) as f32;
                        let f = (h.cnt as f32 + 0.5) / n;
                        let ab = h.q - h.p;
                        (h.p + ab * f, ab.normalize_or(Vec2::X))
                    }
                    _ => (h.p, Vec2::X),
                };
                (n, a)
            };
            let perp = Vec2::new(-axis.y, axis.x);
            let lat = (sg.pos - needle).dot(perp);
            let far = (sg.pos - needle).length() > 1.0;
            if far {
                inp.aim = mv(needle + perp * 0.5);
            } else {
                let want = if lat > 0.18 {
                    -0.55
                } else if lat < -0.18 {
                    0.55
                } else if h.last_side >= 0 {
                    -0.55
                } else {
                    0.55
                };
                inp.aim = sg.pos + ((needle + perp * want + noise * 0.1) - sg.pos).clamp_length_max(speed * 1.6);
                inp.held |= sbtn::USE;
            }
            if !far {
                inp.held |= sbtn::USE;
            }
        }
        SUCTION => {
            inp.aim = mv(target + noise * 0.3);
            inp.pressure = 1.0;
            if (sg.pos - target).length() < h.r * 0.7 + 0.2 {
                inp.held |= sbtn::USE;
            }
        }
        LASER | CRYO => {
            inp.aim = mv(target + noise * 0.05);
            let on = (sg.pos - target).length() < 0.2;
            let auto = h.k == Kind::Sac;
            let engaged = sg.target == Some(h.id);
            if on {
                if auto || !engaged || sg.heat < 0.88 {
                    inp.held |= sbtn::USE;
                }
            }
        }
        GEL => {
            let r = h.r * 0.55;
            let w = g.t * 7.0;
            inp.aim = mv(target + Vec2::new(w.cos(), w.sin()) * r);
            let near = (sg.pos - target).length() < h.r + 0.1;
            if near && sg.flow > 0.08 {
                inp.held |= sbtn::USE;
            }
            if sg.flow < 0.08 {
                inp.aim = sg.pos;
            }
        }
        DRESS => {
            let (a, b) = (h.p, h.q);
            let l = (b - a).length().max(0.01);
            let dir = (b - a) / l;
            let engaged = h.prog > 0.01 && (sg.pos - a).dot(dir) > -0.5;
            if !engaged && (sg.pos - a).length() > 0.3 {
                inp.aim = mv(a);
            } else {
                let t = (((sg.pos - a).dot(dir)) / l + 0.5 / l).clamp(0.0, 1.0);
                inp.aim = mv(a + dir * t * l + noise * 0.1);
                inp.held |= sbtn::USE;
            }
        }
        _ => {}
    }
    // Rhythm / Echo helpers could go here.
    inp
}
