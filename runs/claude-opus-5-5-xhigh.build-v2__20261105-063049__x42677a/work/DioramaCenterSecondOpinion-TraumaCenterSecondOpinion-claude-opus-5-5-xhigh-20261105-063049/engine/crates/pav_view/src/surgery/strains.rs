//! Everything lying on the tissue: objects, parasites and the thread you left behind. SDF spheres
//! and capsules with emissive parts.

use glam::{Vec2, Vec3};
use pav_core::games::surgery::field::{Hazard, HazardKind as K, polyline_at};
use pav_core::games::surgery::frame::SurgeryFrame;
use pav_render::scene::{PointLight, Scene, SdfInstance, Style, flags, srgb};

use super::plate::PlateView;

const OBJ: u32 = flags::OBJECT | flags::NO_CUT;

fn sd(scene: &mut Scene, a: Vec3, b: Vec3, ra: f32, rb: f32, color: Vec3, emissive: f32, style: Style, group: u32) {
    scene.sdfs.push(SdfInstance { a, b, ra, rb, color, emissive, style, flags: OBJ, group, material: 0 });
}

fn on(p: Vec2, y: f32) -> Vec3 {
    Vec3::new(p.x, y, p.y)
}

fn dir3(a: f32) -> Vec3 {
    Vec3::new(a.cos(), 0.0, a.sin())
}

pub fn emit(scene: &mut Scene, f: &SurgeryFrame, plate: &PlateView, time: f32) {
    let parasite = srgb(58, 26, 96);
    let core = srgb(36, 18, 66);
    let eye = srgb(255, 210, 70);
    let sac = srgb(120, 255, 170);
    let bone = srgb(238, 226, 200);
    let metal = Vec3::new(0.56, 0.6, 0.64);
    let rust = srgb(150, 94, 60);
    let hook = srgb(210, 214, 220);
    let frost = srgb(190, 230, 245);
    let ember = srgb(255, 130, 40);
    let thread = srgb(30, 44, 130);
    let gauze = srgb(244, 242, 232);

    // Thread stays on.
    for s in &f.stains {
        if s.kind == 1 && s.pts.len() >= 2 {
            stitches(scene, plate, &s.pts, f32::MAX, thread);
        }
    }

    for h in &f.hazards {
        let g = 0x2000 + h.id;
        let y = plate.height_at(h.pos);
        let lift = h.drag.length() * 0.45;
        let drag3 = Vec3::new(h.drag.x, lift, h.drag.y);
        match h.kind {
            K::Laceration | K::Bleeder => {
                if h.progress > 0.0 {
                    stitches(scene, plate, &h.pts, h.progress, thread);
                }
            }
            K::Foreign => {
                if h.hidden && h.reveal <= 0.0 {
                    continue;
                }
                let d = dir3(h.axis);
                let base = on(h.pos, y) + drag3;
                let up = Vec3::Y;
                match h.tag {
                    0 => {
                        // A barbed hook: a curve of steel with a barb.
                        let mut last = base - d * 0.2 + up * 0.04;
                        for i in 1..=5 {
                            let t = i as f32 / 5.0;
                            let p = base + d * (t * 0.55 - 0.2) + up * ((t * 2.6).sin() * 0.5 + 0.05);
                            sd(scene, last, p, 0.055, 0.05, hook, 0.0, Style::Lit, g);
                            last = p;
                        }
                        let tail = base + d * 0.5 + up * 0.75;
                        sd(scene, last, tail, 0.05, 0.05, hook, 0.0, Style::Lit, g);
                        sd(scene, base - d * 0.2 + up * 0.04, base - d * 0.02 + up * 0.28, 0.05, 0.012, hook, 0.0, Style::Lit, g);
                        sd(scene, tail, tail + up * 0.06, 0.09, 0.09, rust, 0.0, Style::Cel, g);
                    }
                    1 => {
                        // A shard of metal, standing proud.
                        sd(scene, base - d * 0.1, base + d * 0.25 + up * 0.62, 0.17, 0.02, metal, 0.0, Style::Lit, g);
                        sd(scene, base + d * 0.12, base + d * 0.46 + up * 0.32, 0.1, 0.015, rust, 0.0, Style::Lit, g);
                    }
                    2 => {
                        // A cable splinter: twisted strands.
                        for k in 0..3 {
                            let off = dir3(h.axis + 1.57) * (k as f32 - 1.0) * 0.045;
                            sd(
                                scene,
                                base + off - d * 0.05,
                                base + off + d * 0.5 + up * 0.5,
                                0.032,
                                0.012,
                                metal,
                                0.0,
                                Style::Lit,
                                g,
                            );
                        }
                    }
                    3 => {
                        // A piece of ember.
                        sd(scene, base, base + d * 0.14 + up * 0.26, 0.2, 0.08, ember, 1.2, Style::Unlit, g);
                    }
                    4 => {
                        // A cyst, or an appendix.
                        sd(
                            scene,
                            base - d * 0.3 + up * 0.1,
                            base + d * 0.3 + up * 0.32,
                            h.r * 0.7,
                            h.r,
                            srgb(240, 170, 130),
                            0.0,
                            Style::Cel,
                            g,
                        );
                    }
                    _ => {
                        // A seed: a violet pill.
                        sd(scene, base - d * 0.12, base + d * 0.14 + up * 0.18, 0.13, 0.13, parasite, 0.0, Style::Cel, g);
                        sd(scene, base + up * 0.18, base + up * 0.18, 0.06, 0.06, eye, 1.0, Style::Unlit, g);
                    }
                }
            }
            K::Polyp => {
                let base = on(h.pos, y);
                let (c, tip) = if h.tag == 4 {
                    (srgb(250, 226, 170), srgb(255, 244, 210))
                } else {
                    (srgb(250, 150, 130), srgb(255, 200, 170))
                };
                let hot = h.heat.clamp(0.0, 1.3);
                sd(
                    scene,
                    base,
                    base + Vec3::Y * h.r * 0.5,
                    h.r * 0.75,
                    h.r * 0.55,
                    c.lerp(ember, hot * 0.6),
                    hot * 0.7,
                    Style::Cel,
                    g,
                );
                sd(
                    scene,
                    base + Vec3::Y * h.r * 0.75,
                    base + Vec3::Y * h.r * 0.75,
                    h.r * 0.44,
                    h.r * 0.44,
                    tip.lerp(ember, hot * 0.7),
                    hot * 0.9,
                    Style::Cel,
                    g,
                );
            }
            K::Tumor => {
                if h.stage >= 2 {
                    continue;
                }
                let base = on(h.pos, y) + drag3 * 1.6;
                let lump = srgb(120, 56, 104);
                let dark = srgb(84, 36, 84);
                let beat = 1.0 + super::plate::beat_env(f.beat) * 0.03;
                sd(scene, base, base + Vec3::Y * 0.18, h.r * 0.74 * beat, h.r * 0.66 * beat, lump, 0.0, Style::Cel, g);
                for k in 0..5 {
                    let a = k as f32 * 2.399 + h.id as f32;
                    let p = base + dir3(a) * h.r * 0.56 + Vec3::Y * 0.26;
                    sd(scene, p, p, h.r * 0.38 * beat, h.r * 0.38 * beat, dark, 0.0, Style::Cel, g + k);
                }
            }
            K::Bone => {
                let d = dir3(h.angle);
                let at = on(h.pos, y + 0.25) + if h.by != 0 { Vec3::Y * 0.3 } else { Vec3::ZERO };
                sd(scene, at - d * 0.72, at + d * 0.72, 0.3, 0.3, bone, 0.0, Style::Cel, g);
                sd(scene, at + d * 0.72, at + d * 0.92 + Vec3::Y * 0.03, 0.26, 0.1, bone * 0.86, 0.0, Style::Cel, g);
                sd(scene, at - d * 0.72, at - d * 0.92 + Vec3::Y * 0.02, 0.26, 0.1, bone * 0.86, 0.0, Style::Cel, g);
                if h.stage == 1 && h.count > 0 {
                    for k in 0..h.count {
                        let off = d.cross(Vec3::Y).normalize() * (k as f32 - 0.5) * 0.28;
                        sd(
                            scene,
                            at + off - d * 0.42 + Vec3::Y * 0.26,
                            at + off + d * 0.42 + Vec3::Y * 0.26,
                            0.03,
                            0.03,
                            metal,
                            0.0,
                            Style::Lit,
                            g,
                        );
                    }
                }
            }
            K::Nodule => {
                if h.hidden && h.reveal <= 0.0 {
                    continue;
                }
                let t_step = h.t;
                let squash = 1.0 + h.dev * 0.2 * (time * 18.0).sin() - t_step * 0.25;
                let base = on(h.pos, y + 0.05);
                let r = h.r * squash.max(0.6);
                let shake = if h.heat > 0.0 { (time * 40.0).sin() * 0.02 * h.heat } else { 0.0 };
                let hot = h.heat.clamp(0.0, 1.3);
                if h.stage == 0 {
                    sd(
                        scene,
                        base + Vec3::X * shake,
                        base + Vec3::X * shake + Vec3::Y * r * 0.25,
                        r,
                        r * 0.9,
                        parasite.lerp(ember, hot * 0.7),
                        hot * 0.8 + 0.08,
                        Style::Cel,
                        g,
                    );
                    for k in 0..6 {
                        let a = k as f32 * 1.047 + time * 0.7;
                        let p = base + dir3(a) * r * 0.86 + Vec3::Y * r * 0.3;
                        sd(scene, p, p + dir3(a) * r * 0.32 + Vec3::Y * 0.05, r * 0.2, 0.02, core, 0.0, Style::Cel, g);
                    }
                    if h.lit > 0.0 {
                        scene.point_lights.push(PointLight {
                            position: base + Vec3::Y,
                            color: Vec3::new(0.55, 0.3, 1.0) * h.lit,
                            radius: 3.0,
                            shadows: false,
                        });
                    }
                    sd(scene, base + Vec3::Y * r, base + Vec3::Y * r, r * 0.26, r * 0.26, eye * 0.8, 0.4, Style::Unlit, g + 1);
                } else {
                    // Shell popped: the soft core, ready to pull.
                    let lifted = base + drag3 * 1.6;
                    sd(scene, lifted, lifted + Vec3::Y * 0.2, r * 0.8, r * 0.7, core, 0.0, Style::Cel, g);
                    sd(
                        scene,
                        lifted + Vec3::Y * r * 0.72,
                        lifted + Vec3::Y * r * 0.72,
                        r * 0.46,
                        r * 0.46,
                        eye,
                        1.6,
                        Style::Unlit,
                        g + 1,
                    );
                    for k in 0..4 {
                        let a = k as f32 * 1.57 + 0.4;
                        let p = base + dir3(a) * r * 1.2;
                        sd(scene, p, p + Vec3::Y * 0.2, r * 0.3, 0.03, parasite, 0.0, Style::Cel, g + 2);
                    }
                }
            }
            K::Sac => {
                let stem = on(h.to, plate.height_at(h.to) + 0.1);
                let wob = (time * (7.0 + h.progress * 14.0) + h.id as f32).sin() * (0.02 + h.progress * 0.05);
                let at = on(h.pos, y + 0.28) + Vec3::new(wob, 0.0, -wob);
                let heat = h.heat.clamp(0.0, 1.0);
                let stem_c = parasite.lerp(ember, if h.count == 0 { heat } else { 0.0 });
                sd(scene, stem, at, 0.09, 0.07, stem_c, heat * 0.8, Style::Cel, g);
                let r = h.r * (1.0 + wob * 2.0);
                let col = sac.lerp(Vec3::new(1.0, 0.92, 0.3), (h.progress - 0.55).clamp(0.0, 0.45) * 2.0);
                let d = (at - stem).normalize_or(Vec3::X);
                sd(scene, at - d * r * 0.5, at + d * r * 0.55, r * 0.34, r, col, 0.75 + h.progress * 0.4, Style::Unlit, g + 1);
            }
            K::Crown => {
                let base = on(h.pos, y + 0.05);
                for k in 0..11 {
                    let a = k as f32 * std::f32::consts::TAU / 11.0 + time * 0.25;
                    let r0 = h.r * 0.86;
                    let wave = (time * 2.0 + k as f32 * 1.3).sin() * 0.14;
                    let p = base + Vec3::new(a.cos() * r0 * 1.3, 0.1, a.sin() * r0);
                    let q = base + Vec3::new(a.cos() * (r0 + 0.55) * 1.3, 0.55 + wave, a.sin() * (r0 + 0.55));
                    sd(scene, p, q, 0.2, 0.02, parasite, 0.05, Style::Cel, g);
                    let n = base + Vec3::new(a.cos() * r0 * 0.7 * 1.3, 0.05, a.sin() * r0 * 0.7);
                    sd(scene, n, p, 0.14, 0.2, core, 0.0, Style::Cel, g);
                }
            }
            K::Eye => {
                let base = on(h.pos, y + 0.2) + drag3 * 1.6;
                match h.stage {
                    0 => {
                        sd(scene, base, base, h.r * 0.7, h.r * 0.7, core, 0.05, Style::Cel, g);
                    }
                    1 | 2 => {
                        sd(scene, base, base, h.r * 0.9, h.r * 0.9, eye, 1.6, Style::Unlit, g);
                        let look = Vec2::new((time * 0.9).sin(), (time * 0.7).cos()) * 0.2;
                        let p = base + Vec3::new(look.x, h.r * 0.74, look.y);
                        sd(scene, p, p, h.r * 0.34, h.r * 0.34, Vec3::new(0.02, 0.01, 0.03), 0.0, Style::Unlit, g + 1);
                        let c = base + Vec3::Y * 0.5;
                        scene.point_lights.push(PointLight {
                            position: c,
                            color: Vec3::new(1.0, 0.8, 0.3) * 0.7,
                            radius: 4.0,
                            shadows: false,
                        });
                    }
                    _ => {}
                }
            }
            K::Ember => {
                if h.stage >= 2 {
                    continue;
                }
                let base = on(h.pos, y + 0.1);
                let frozen = h.stage == 1 || h.heat > 0.4;
                let color = if frozen { frost } else { ember };
                let glow = if frozen { 0.2 } else { 1.0 + (time * 5.0 + h.id as f32).sin() * 0.3 };
                let dark = if frozen { frost * 0.7 } else { srgb(90, 26, 18) };
                sd(scene, base, base + Vec3::Y * 0.2, h.r, h.r * 0.74, dark, 0.0, Style::Cel, g);
                for k in 0..5 {
                    let a = k as f32 * 1.256 + h.id as f32;
                    let p = base + dir3(a) * h.r * 0.62 + Vec3::Y * h.r * 0.5;
                    sd(scene, p, p + Vec3::Y * 0.1, h.r * 0.32, h.r * 0.14, color, glow, Style::Unlit, g);
                }
                if !frozen {
                    scene.point_lights.push(PointLight {
                        position: base + Vec3::Y * 0.8,
                        color: Vec3::new(1.0, 0.45, 0.15) * 0.8,
                        radius: 3.4,
                        shadows: false,
                    });
                }
            }
            K::Tether => {
                chain(scene, plate, &h.pts, h.progress, h.len(), 0.11, 0.07, parasite, 0.1, g, time, 0.05);
            }
            K::Tendril => {
                chain(scene, plate, &h.pts, h.progress, h.len(), 0.2, 0.1, parasite, 0.12, g, time, 0.16);
                let tip = polyline_at(&h.pts, h.progress).0;
                let t3 = on(tip, plate.height_at(tip) + 0.35);
                sd(scene, t3, t3, 0.42, 0.42, core, 0.0, Style::Cel, g);
                sd(scene, t3 + Vec3::Y * 0.3, t3 + Vec3::Y * 0.3, 0.2, 0.2, eye, 1.6, Style::Unlit, g + 1);
            }
            K::Closure => {
                // The gauze laid so far.
                let mut s = 0.0;
                while s < h.progress {
                    let p = polyline_at(&h.pts, s).0;
                    let q = polyline_at(&h.pts, (s + 0.3).min(h.progress)).0;
                    sd(
                        scene,
                        on(p, plate.height_at(p) + 0.05),
                        on(q, plate.height_at(q) + 0.05),
                        0.2,
                        0.2,
                        gauze,
                        0.0,
                        Style::Cel,
                        g,
                    );
                    s += 0.3;
                }
            }
            K::Furnace => {
                let base = on(h.pos, y + 0.1) + drag3;
                let k = 1.0 - h.stage as f32 * 0.09;
                let r = h.r * k;
                let hot = if h.stage == 0 {
                    1.6
                } else if h.stage < 4 {
                    0.9
                } else {
                    0.25
                };
                sd(scene, base, base + Vec3::Y * 0.3, r, r * 0.84, srgb(40, 16, 24), 0.0, Style::Cel, g);
                for i in 0..9 {
                    let a = i as f32 * 2.399 + time * 0.2;
                    let p = base + dir3(a) * r * 0.8 + Vec3::Y * r * 0.55;
                    let q = base + dir3(a + 0.5) * r * 0.5 + Vec3::Y * r * 0.95;
                    sd(scene, p, q, 0.07, 0.04, if h.stage == 0 { ember } else { frost.lerp(ember, 0.5) }, hot, Style::Unlit, g);
                }
                scene.point_lights.push(PointLight {
                    position: base + Vec3::Y * 1.5,
                    color: Vec3::new(1.0, 0.42, 0.14) * 1.2 * k,
                    radius: 6.0,
                    shadows: false,
                });
            }
            _ => {}
        }
    }
}

/// A line of thread, up to `upto` along the wound: small crossing stitches.
fn stitches(scene: &mut Scene, plate: &PlateView, pts: &[Vec2], upto: f32, color: Vec3) {
    let len = pv_len(pts);
    let end = upto.min(len);
    let mut s = 0.1;
    let mut flip = 1.0f32;
    while s < end {
        let (p, t) = polyline_at(pts, s);
        let n = Vec2::new(-t.y, t.x) * 0.2 * flip;
        let a = p - n + t * 0.05;
        let b = p + n + t * 0.05;
        let y = plate.height_at(p) + 0.05;
        scene.sdfs.push(SdfInstance {
            a: on(a, y),
            b: on(b, y + 0.02),
            ra: 0.024,
            rb: 0.024,
            color,
            emissive: 0.0,
            style: Style::Cel,
            flags: flags::NO_SHADOW | OBJ,
            group: 0x1F00,
            material: 0,
        });
        flip = -flip;
        s += 0.25;
    }
}

fn pv_len(pts: &[Vec2]) -> f32 {
    pts.windows(2).map(|w| w[0].distance(w[1])).sum()
}

/// A creeping chain of capsules along a polyline, from `from` to `to`.
fn chain(
    scene: &mut Scene,
    plate: &PlateView,
    pts: &[Vec2],
    from: f32,
    to: f32,
    ra: f32,
    rb: f32,
    color: Vec3,
    glow: f32,
    g: u32,
    time: f32,
    wave: f32,
) {
    let steps = (((to - from) / 0.4).ceil() as i32).max(1);
    let mut last = None;
    for i in 0..=steps {
        let s = from + (to - from) * i as f32 / steps as f32;
        let (p, t) = polyline_at(pts, s);
        let n = Vec2::new(-t.y, t.x) * (time * 3.0 + s * 2.3).sin() * wave;
        let at = p + n;
        let q = on(at, plate.height_at(at) + 0.18);
        if let Some(l) = last {
            let k = i as f32 / steps as f32;
            sd(scene, l, q, ra + (rb - ra) * k, ra + (rb - ra) * k, color, glow, Style::Cel, g);
        }
        last = Some(q);
    }
}

/// Is a hazard something that should glow where the guide points?
pub fn touch3(h: &Hazard, plate: &PlateView) -> Vec3 {
    let p = h.touch_point();
    let extra = match h.kind {
        K::Laceration | K::Incision | K::Closure => 0.05,
        _ => 0.3,
    };
    on(p, plate.height_at(p) + extra)
}
