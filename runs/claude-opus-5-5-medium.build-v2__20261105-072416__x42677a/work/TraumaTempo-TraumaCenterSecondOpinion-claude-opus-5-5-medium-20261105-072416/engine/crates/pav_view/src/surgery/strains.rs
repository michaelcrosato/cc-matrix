//! Hazards that stand up off the field: hooks and shards, polyps, parasites (SDF spheres and
//! capsules with emissive parts), sacs on stems, embers, the furnace, tendrils, bone fragments.

use glam::{Vec2, Vec3};
use pav_core::games::surgery::field::{Kind, sub};
use pav_core::games::surgery::frame::SurgeryFrame;
use pav_render::scene::{self as rs, Scene, SdfInstance, Style};

use super::plate::{PlateView, srgb3};

fn col(c: [f32; 3]) -> Vec3 {
    Vec3::from_array(c)
}

fn sdf(scene: &mut Scene, a: Vec3, b: Vec3, ra: f32, rb: f32, c: Vec3, e: f32, style: Style, group: u32) {
    scene.sdfs.push(SdfInstance {
        a,
        b,
        ra,
        rb,
        color: c,
        emissive: e,
        style,
        flags: rs::flags::OBJECT | rs::flags::NO_CUT,
        group,
        material: 0,
    });
}

fn at(p: Vec2, y: f32) -> Vec3 {
    Vec3::new(p.x, y, p.y)
}

/// Follow-the-leader chain from `from` to `to`, with a creeping wave.
fn chain(scene: &mut Scene, from: Vec3, to: Vec3, r0: f32, r1: f32, n: usize, wave: f32, t: f32, c: Vec3, group: u32) {
    let mut last = from;
    let d = to - from;
    let perp = Vec3::new(-d.z, 0.0, d.x).normalize_or_zero();
    for k in 1..=n {
        let s = k as f32 / n as f32;
        let wob = (s * 9.0 + t * 3.0).sin() * wave * (s * std::f32::consts::PI).sin();
        let q = from + d * s + perp * wob + Vec3::Y * ((s * 6.0 + t * 2.0).cos() * wave * 0.25);
        let r = r0 + (r1 - r0) * s;
        sdf(scene, last, q, r + (r1 - r0) / n as f32, r, c, 0.0, Style::Cel, group);
        last = q;
    }
}

pub fn emit(scene: &mut Scene, f: &SurgeryFrame, plate: &PlateView, t: f32) {
    let steel = Vec3::new(0.78, 0.8, 0.82);
    let parasite = col(srgb3(58, 26, 96));
    let core = col(srgb3(36, 18, 66));
    let eye = col(srgb3(255, 210, 70));
    let sac_c = col(srgb3(120, 255, 170));
    let hot = col(srgb3(255, 130, 40));
    let frost = col(srgb3(190, 232, 255));
    let bone = col(srgb3(236, 226, 196));
    let beat = (-f.beat * 6.0).exp();
    for h in &f.hazards {
        let group = 0x2000 + h.id;
        let ground = plate.height(h.a);
        let disp = if matches!(h.kind, Kind::Object | Kind::Nodule | Kind::Eye | Kind::Furnace) || (h.kind == Kind::Tumor && h.stage == 1) { h.c } else { Vec2::ZERO };
        let p = h.a + disp;
        let lift = h.prog * 0.5;
        match h.kind {
            Kind::Object => {
                if !h.visible() {
                    continue;
                }
                let dir = Vec2::from_angle(h.ang);
                let base = at(p, ground + 0.05 + lift);
                let tip = at(p + dir * 0.75, ground + 0.32 + lift);
                match h.sub {
                    sub::HOOK => {
                        sdf(scene, base, tip, 0.05, 0.05, steel, 0.0, Style::Lit, group);
                        let bend = at(p - dir * 0.28 + dir.perp() * 0.16, ground + 0.08 + lift);
                        sdf(scene, base, bend, 0.05, 0.035, steel, 0.0, Style::Lit, group);
                        let barb = at(p - dir * 0.02 + dir.perp() * 0.3, ground + 0.09 + lift);
                        sdf(scene, bend, barb, 0.035, 0.015, steel, 0.0, Style::Lit, group);
                        sdf(scene, tip, tip + Vec3::Y * 0.03, 0.09, 0.09, Vec3::new(0.35, 0.36, 0.4), 0.0, Style::Lit, group);
                    }
                    sub::SHARD => {
                        let dark = Vec3::new(0.32, 0.33, 0.36);
                        sdf(scene, base, tip, 0.15, 0.03, dark, 0.0, Style::Lit, group);
                        sdf(scene, base + Vec3::new(0.08, 0.08, 0.0), tip, 0.1, 0.02, steel, 0.0, Style::Lit, group);
                    }
                    sub::SPLINTER => {
                        let wood = Vec3::new(0.5, 0.3, 0.14);
                        sdf(scene, base, tip, 0.07, 0.015, wood, 0.0, Style::Cel, group);
                    }
                    sub::COAL => {
                        sdf(scene, base, tip, 0.13, 0.08, hot * 0.45, 0.3 + beat * 0.6, Style::Cel, group);
                    }
                    _ => {
                        // The appendix: a stubby, inflamed thing.
                        let fl = col(srgb3(214, 120, 104));
                        sdf(scene, base, tip + Vec3::Y * 0.1, 0.24, 0.16, fl, 0.0, Style::Cel, group);
                    }
                }
            }
            Kind::Polyp => {
                let y = ground + 0.02;
                let stem = col(srgb3(210, 110, 110));
                let dome = col(srgb3(240, 170, 130));
                let r = h.r * (1.0 + beat * 0.04);
                sdf(scene, at(p, y), at(p, y + 0.25), r * 0.55, r * 0.7, stem, 0.0, Style::Cel, group);
                sdf(scene, at(p, y + 0.3), at(p, y + 0.3), r * 0.75, r * 0.75, dome, h.fill * 0.5, Style::Cel, group);
            }
            Kind::Tumor if h.stage == 1 => {
                let dark = col(srgb3(96, 52, 88));
                let y = ground + 0.1 + lift;
                sdf(scene, at(p, y), at(p, y + 0.15), h.r * 0.7, h.r * 0.55, dark, 0.0, Style::Cel, group);
            }
            Kind::Bone => {
                if h.stage == 0 {
                    let dir = Vec2::from_angle(h.ang);
                    let y = plate.height(p) + 0.32;
                    let e = dir * h.r;
                    sdf(scene, at(p - e, y), at(p + e, y), 0.34, 0.3, bone, 0.0, Style::Cel, group);
                    let chip = at(p + e * 0.2 + dir.perp() * 0.18, y + 0.05);
                    sdf(scene, chip, chip, 0.26, 0.26, bone * 0.92, 0.0, Style::Cel, group);
                } else {
                    let seat = h.c;
                    let y = plate.height(seat) + 0.18;
                    let e = Vec2::new(h.r, 0.0);
                    sdf(scene, at(seat - e, y), at(seat + e, y), 0.32, 0.3, bone, 0.0, Style::Cel, group);
                    let wire = Vec3::new(0.85, 0.75, 0.45);
                    for k in 0..h.n {
                        let x = h.a.x + (h.b.x - h.a.x) * (k as f32 + 0.5) / h.need.max(1) as f32;
                        sdf(scene, at(Vec2::new(x, seat.y - 0.36), y + 0.14), at(Vec2::new(x, seat.y + 0.36), y + 0.14), 0.035, 0.035, wire, 0.0, Style::Lit, group);
                    }
                }
            }
            Kind::Bleeder => {
                let spurt = (f.beat * std::f32::consts::TAU).cos().max(0.0);
                let c = col(srgb3(180, 12, 24));
                let y = ground + 0.05;
                sdf(scene, at(p.lerp(h.b, 0.5), y), at(p.lerp(h.b, 0.5), y + 0.1 + spurt * 0.5), 0.13, 0.04, c, 0.0, Style::Cel, group);
            }
            Kind::Nodule => {
                if !h.visible() {
                    continue;
                }
                let r = h.r * if h.sub == sub::AMEN { 1.0 } else { 1.0 } * (1.0 + beat * 0.08);
                let y = ground + r * 0.4 + lift;
                if h.stage == 0 || h.stage == 2 {
                    sdf(scene, at(p, y), at(p, y), r, r, parasite, 0.04, Style::Cel, group);
                    for k in 0..5 {
                        let a = k as f32 * 1.256 + t * 0.4;
                        let q = p + Vec2::from_angle(a) * r * 0.85;
                        sdf(scene, at(q, y + 0.15), at(q, y + 0.15), r * 0.22, r * 0.22, core, 0.0, Style::Cel, group);
                    }
                }
                let eye_r = if h.stage == 1 { r * 0.55 } else { r * 0.26 };
                sdf(scene, at(p, y + r * 0.72), at(p, y + r * 0.72), eye_r, eye_r, eye, 1.6, Style::Unlit, group + 1);
                if h.stage == 1 {
                    sdf(scene, at(p, y), at(p, y), r * 0.7, r * 0.7, core, 0.0, Style::Cel, group);
                    let dir = Vec2::from_angle(h.ang);
                    sdf(scene, at(p, y + 0.1), at(p + dir * 0.7, y + 0.35), 0.1, 0.05, parasite, 0.0, Style::Cel, group);
                }
            }
            Kind::Sac => {
                let y = ground + 0.1;
                let root = at(h.b, plate.height(h.b) + 0.12);
                let body = at(h.a, y + h.r * 0.7);
                chain(scene, root, body, 0.1, 0.07, 8, 0.1, t, parasite, group);
                let quiver = (t * 24.0).sin() * 0.03 * h.prog;
                let r = h.r * (1.0 + quiver + beat * 0.03);
                sdf(scene, body, body, r, r, sac_c * (0.3 + h.prog * 0.5), 0.5 + h.prog * 0.5, Style::Cel, group + 1);
                let stem = h.a.lerp(h.b, 0.55);
                if h.fill > 0.0 {
                    sdf(scene, at(stem, y + 0.3), at(stem, y + 0.3), 0.14, 0.14, Vec3::new(1.0, 0.3, 0.1), 1.2 * h.fill, Style::Unlit, group + 2);
                }
            }
            Kind::Eye => {
                let open = h.prog > 0.5 || h.stage == 1;
                let y = ground + 0.28;
                let r = h.r;
                for k in 0..6 {
                    let a = k as f32 / 6.0 * std::f32::consts::TAU + t * 0.1;
                    let q = p + Vec2::from_angle(a) * r * 1.05;
                    sdf(scene, at(q, y), at(p + Vec2::from_angle(a + 0.5) * r * 1.05, y), 0.15, 0.15, parasite, 0.0, Style::Cel, group);
                }
                sdf(scene, at(p, y), at(p, y), r * 0.8, r * 0.8, core, 0.0, Style::Cel, group);
                if open {
                    let look = Vec2::new((t * 0.9).sin(), (t * 0.7).cos()) * 0.12;
                    sdf(scene, at(p, y + 0.42), at(p, y + 0.42), r * 0.52, r * 0.52, eye, 1.6, Style::Unlit, group + 1);
                    sdf(scene, at(p + look, y + 0.8), at(p + look, y + 0.8), r * 0.2, r * 0.2, core, 0.0, Style::Unlit, group + 2);
                } else {
                    sdf(scene, at(p - Vec2::X * 0.4, y + 0.55), at(p + Vec2::X * 0.4, y + 0.55), 0.06, 0.06, eye, 1.2, Style::Unlit, group + 1);
                }
            }
            Kind::Ember => {
                let y = ground + 0.25 + (t * 3.0 + h.id as f32).sin() * 0.03;
                let r = h.r * (1.0 + beat * 0.1);
                if h.stage == 0 {
                    sdf(scene, at(p, y), at(p, y), r, r, hot * 0.5, 0.7 + beat * 0.6, Style::Cel, group);
                    for k in 0..3 {
                        let q = p + Vec2::from_angle(k as f32 * 2.1 + t) * r * 0.75;
                        sdf(scene, at(q, y + 0.28), at(q, y + 0.28), r * 0.28, r * 0.28, Vec3::new(1.0, 0.82, 0.3), 1.8, Style::Unlit, group + 1);
                    }
                } else {
                    sdf(scene, at(p, y), at(p, y), r, r, frost, 0.3, Style::Cel, group);
                    for k in 0..4 {
                        let d = Vec2::from_angle(k as f32 * 1.57 + 0.4);
                        sdf(scene, at(p, y + r * 0.8), at(p + d * r * 0.9, y + r * 0.45), 0.035, 0.02, Vec3::new(0.2, 0.35, 0.5), 0.0, Style::Lit, group + 1);
                    }
                }
            }
            Kind::Furnace => {
                let y = ground + 0.1;
                let r = h.r;
                let c = if h.stage == 1 { frost } else { hot * 0.55 };
                let glow = if h.stage == 1 { 0.2 } else { 1.0 + beat };
                sdf(scene, at(p, y), at(p, y + 0.3), r, r * 0.85, c, glow, Style::Cel, group);
                for k in 0..6 {
                    let a = k as f32 * 1.047 + t * 0.5;
                    let q = p + Vec2::from_angle(a) * r * 1.2;
                    sdf(scene, at(p, y + 0.2), at(q, y + 0.05), 0.12, 0.05, parasite, 0.0, Style::Cel, group + 1);
                }
                sdf(scene, at(p, y + r + 0.3), at(p, y + r + 0.3), r * 0.28, r * 0.28, eye, 1.6, Style::Unlit, group + 2);
            }
            Kind::Tendril => {
                let pulled = h.prog;
                let from = at(h.a, plate.height(h.a) + 0.22);
                let to = at(h.a.lerp(h.b, 1.0 - pulled * 0.8), plate.height(h.b) + 0.3 + pulled * 1.1);
                chain(scene, from, to, 0.28, 0.06, 16, 0.35, t, parasite, group);
                sdf(scene, to, to, 0.2, 0.2, eye, 1.4, Style::Unlit, group + 1);
            }
            Kind::Incision | Kind::Closure | Kind::Lacer | Kind::Pool | Kind::Patch | Kind::Tumor => {}
        }
    }
    // Sutures stay on as visible thread.
    let thread = Vec3::new(0.14, 0.14, 0.34);
    let draw_threads = |scene: &mut Scene, a: Vec2, b: Vec2, n: u16, group: u32| {
        let dir = (b - a).normalize_or_zero().perp() * 0.2;
        for k in 0..n {
            let s = a.lerp(b, (k as f32 + 0.5) / n.max(1) as f32);
            let y = plate.height(s) + 0.06;
            sdf(scene, at(s - dir, y), at(s + dir, y), 0.022, 0.022, thread, 0.0, Style::Cel, group);
        }
    };
    for (k, th) in f.threads.iter().enumerate() {
        draw_threads(scene, th.a, th.b, th.n, 0x1800 + k as u32);
    }
    for h in &f.hazards {
        if matches!(h.kind, Kind::Lacer | Kind::Bleeder) && h.n > 0 {
            let e = h.a.lerp(h.b, h.prog.clamp(0.0, 1.0));
            draw_threads(scene, h.a, e, h.n, 0x1800 + h.id);
        }
    }
    // Things flying to the tray.
    for fl in &f.flights {
        let to = Vec2::new(0.0, 5.3);
        let s = fl.t * fl.t * (3.0 - 2.0 * fl.t);
        let q = fl.from.lerp(to, s);
        let y = 0.8 + (fl.t * std::f32::consts::PI).sin() * 3.0;
        let (c, e) = match fl.kind {
            Kind::Sac => (sac_c * 0.5, 0.6),
            Kind::Eye => (eye, 1.2),
            Kind::Tendril => (parasite, 0.0),
            _ => match fl.sub {
                sub::COAL => (hot * 0.5, 0.8),
                4 => (col(srgb3(150, 80, 80)), 0.0),
                _ => (steel, 0.0),
            },
        };
        sdf(scene, at(q, y), at(q, y + 0.15), 0.18, 0.12, c, e, Style::Cel, 0x1fff);
    }
}
