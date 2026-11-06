//! Original procedural medical illustrations, steel instruments and extruded paper actors.
use crate::{CameraParams, CameraRig};
use glam::{Mat4, Quat, Vec2, Vec3};
use pav_core::games::surgery::{Hazard, Surgery};
use pav_render::mesh::{MeshData, Vertex};
use pav_render::scene::*;
use std::f32::consts::{PI, TAU};

pub fn camera() -> CameraRig {
    CameraRig::new(CameraParams { tilt: 73., yaw: 0., distance: 22.0, fov: 36., follow_lag: 0., height_offset: 0., ortho: false })
}
pub fn height(x: f32, z: f32, plate: &str, beat: f32) -> f32 {
    let e = x * x / 77. + z * z / 16.;
    if e > 1. {
        return 0.24 + 0.05 * (x * 3. + z * 2.).sin();
    }
    let pulse = (beat * TAU).cos().max(0.).powi(6);
    let dome = (1. - e).max(0.).powf(0.55);
    let lobes = match plate {
        "heart" | "pericardium" => {
            let a = ((x + 0.9).powi(2) / 14. + z * z / 8.).min(((x - 2.).powi(2) / 7.) + (z + 0.5).powi(2) / 5.);
            (1. - a).max(0.).powf(0.65) * 0.85
        }
        "lung" => {
            let a = ((x.abs() - 2.6).powi(2) / 9. + z * z / 10.).min(1.);
            (1. - a).max(0.) * 0.5
        }
        "liver" => (1. - ((x + 1.).powi(2) / 38. + (z + 0.2).powi(2) / 9.)).max(0.).powf(0.55) * 0.45,
        "forearm" => 0.20 * (1. - z * z / 8.).max(0.),
        _ => 0.12 * (x * 1.8 + z * 0.5).cos(),
    };
    0.38 + dome * 0.55
        + lobes
        + 0.025 * ((x * 4. + z * 1.7).sin() + (z * 6. - x).sin())
        + pulse * if plate == "heart" { 0.15 * dome } else { 0.035 * dome }
}
fn color_plate(x: f32, z: f32, y: f32, plate: &str, clinical: bool) -> Vec3 {
    let e = x * x / 77. + z * z / 16.;
    if e > 1. {
        let fold = ((x * 0.8 + z * 1.7).sin() * 0.5 + 0.5) * 0.10;
        return srgb(28, 105, 108) * (0.75 + fold) + srgb(30, 61, 67) * ((x * 9.).sin() * (z * 9.).cos() * 0.04);
    }
    let mut c = if clinical {
        srgb(84, 118, 134).lerp(srgb(171, 196, 196), (y / 1.7).clamp(0., 1.))
    } else {
        let (dark, light) = match plate {
            "liver" => (srgb(103, 36, 48), srgb(224, 103, 93)),
            "heart" | "pericardium" => (srgb(104, 33, 55), srgb(237, 107, 111)),
            "lung" => (srgb(155, 61, 80), srgb(249, 158, 150)),
            "femur" => (srgb(147, 67, 69), srgb(236, 153, 126)),
            _ => (srgb(163, 60, 65), srgb(248, 157, 132)),
        };
        dark.lerp(light, ((y - 0.35) / 1.25).clamp(0., 1.))
    };
    let grain = (x * 31. + z * 17.).sin() * (x * 7. - z * 23.).cos();
    c *= 0.96 + 0.04 * grain;
    if e > 0.89 {
        c *= 0.56 + (1. - e) * 2.;
    }
    let vein = (z * 1.8 + (x * 0.8).sin() * 0.65).sin().abs();
    if vein < 0.035 && e < 0.8 {
        c = c.lerp(if clinical { srgb(56, 77, 100) } else { srgb(130, 40, 64) }, 0.65);
    }
    let shine = (x * 0.7 + z * 1.4 + (x * 0.6).sin()).sin();
    if shine > 0.96 && y > 0.7 {
        c = c.lerp(srgb(255, 218, 191), 0.26);
    }
    c
}
fn box_at(scene: &mut Scene, p: Vec3, size: Vec3, color: Vec3, style: Style, group: u32) {
    scene.meshes.push(MeshInstance {
        mesh: MeshKey::Cube,
        transform: Mat4::from_scale_rotation_translation(size, Quat::IDENTITY, p),
        color,
        emissive: 0.,
        style,
        flags: 0,
        group,
        material: 0,
        ext: Vec3::ZERO,
    });
}
fn sphere(scene: &mut Scene, p: Vec3, size: Vec3, color: Vec3, style: Style, group: u32, emissive: f32) {
    scene.meshes.push(MeshInstance {
        mesh: MeshKey::Sphere,
        transform: Mat4::from_scale_rotation_translation(size, Quat::IDENTITY, p),
        color,
        emissive,
        style,
        flags: 0,
        group,
        material: 0,
        ext: Vec3::ZERO,
    });
}
fn line(scene: &mut Scene, a: Vec3, b: Vec3, r: f32, c: Vec3, group: u32, glow: f32) {
    let mut v = SdfInstance::capsule(a, b, r, c);
    v.group = group;
    v.style = if glow > 0. { Style::Unlit } else { Style::Lit };
    v.emissive = glow;
    scene.sdfs.push(v);
}
fn ring(scene: &mut Scene, p: Vec3, r: f32, progress: f32, c: Vec3, group: u32) {
    for i in 0..48 {
        let t = i as f32 / 48.;
        if t > progress {
            continue;
        }
        let a = t * TAU;
        let b = (t + 1. / 48.) * TAU;
        line(
            scene,
            p + Vec3::new(a.cos() * r, 0., a.sin() * r),
            p + Vec3::new(b.cos() * r, 0., b.sin() * r),
            0.018,
            c,
            group,
            0.45,
        );
    }
}
fn ground(p: Vec2, plate: &str, beat: f32, offset: f32) -> Vec3 {
    Vec3::new(p.x, height(p.x, p.y, plate, beat) + offset, p.y)
}

pub fn emit(scene: &mut Scene, g: &Surgery) {
    scene.meshes.clear();
    scene.sdfs.clear();
    scene.dynamic.clear();
    scene.texts.clear();
    scene.clear_color = srgb(9, 27, 31);
    scene.sun.direction = Vec3::new(-0.25, -1., -0.35).normalize();
    scene.sun.color = Vec3::new(1., 0.95, 0.88) * 0.42;
    scene.sun.shadow_radius = 18.;
    scene.ambient = Ambient { sky: Vec3::splat(0.5), ground: Vec3::new(0.3, 0.22, 0.22) };
    scene.style.cel_bands = 3.;
    scene.style.rim = 0.12;
    scene.style.specular = 0.7;
    scene.post.outline_px = 1.25;
    scene.post.outline_darken = 0.4;
    scene.post.bloom = 0.27;
    scene.post.bloom_threshold = 1.15;
    scene.post.gi = 0.55;
    scene.filter.vignette = 0.35;
    scene.filter.grain = 0.035;
    if g.gift_left > 0. && g.gift_kind != "Echo" {
        scene.filter.saturation = 0.3;
        scene.filter.chroma = 0.9;
    }
    scene.point_lights.push(PointLight {
        position: Vec3::new(-1., 7., -1.),
        color: Vec3::new(1., 0.97, 0.90) * 0.9,
        radius: 17.,
        shadows: true,
    });
    let plate = g.stage().plate.as_str();
    // The drape and organ are a single finely tessellated, vertex-painted living surface.
    let (nx, nz) = (180, 104);
    let mut mesh = MeshData::default();
    for iz in 0..=nz {
        for ix in 0..=nx {
            let x = -13. + 26. * ix as f32 / nx as f32;
            let z = -7. + 14. * iz as f32 / nz as f32;
            let y = height(x, z, plate, g.beat);
            let eps = 0.035;
            let n = Vec3::new(
                height(x - eps, z, plate, g.beat) - height(x + eps, z, plate, g.beat),
                eps * 2.,
                height(x, z - eps, plate, g.beat) - height(x, z + eps, plate, g.beat),
            )
            .normalize();
            let mut col = color_plate(x, z, y, plate, g.tune.clinical);
            for h in &g.hazards {
                if !h.alive {
                    continue;
                }
                let dist = Vec2::new(x, z).distance(h.pos);
                if h.kind == "pool" && dist < 1.3 * (1. - h.progress).max(0.05).sqrt() * (1. + 0.08 * (x * 13. + z * 9.).sin()) {
                    col = col.lerp(if g.tune.clinical { srgb(34, 59, 91) } else { srgb(118, 10, 28) }, 0.95);
                }
                if h.kind == "burn" && dist < 0.65 {
                    col = col.lerp(srgb(119, 60, 63), 0.65);
                }
            }
            debug_assert!(y.is_finite() && n.is_finite() && col.is_finite());
            mesh.vertices.push(Vertex {
                pos: [x, y, z],
                normal: n.to_array(),
                uv: [ix as f32 / nx as f32, iz as f32 / nz as f32],
                color: [col.x, col.y, col.z, 1.],
            });
        }
    }
    for iz in 0..nz {
        for ix in 0..nx {
            let a = (iz * (nx + 1) + ix) as u32;
            let b = a + (nx + 1) as u32;
            mesh.indices.extend([a, b, a + 1, a + 1, b, b + 1]);
        }
    }
    scene.dynamic.push(DynamicMesh {
        data: mesh,
        color: Vec3::ONE,
        emissive: 0.,
        style: Style::Cel,
        flags: 0,
        group: 5,
        material: 0,
    });
    let steel = srgb(168, 197, 200);
    let dark = srgb(44, 67, 75);
    let mint = srgb(140, 244, 210);
    // Drape stitching, towel clamps, and shadow-casting retractors.
    for side in [-1., 1.] {
        for i in 0..42 {
            let x = -10. + i as f32 * 0.49;
            line(scene, Vec3::new(x, 0.39, side * 5.), Vec3::new(x + 0.22, 0.39, side * 5.), 0.009, srgb(72, 151, 151), 10, 0.);
        }
        for x in [-7., 0., 7.] {
            let z = side * 3.65;
            let p = Vec3::new(x, 0.6, z);
            box_at(scene, p, Vec3::new(0.6, 0.2, 1.), steel, Style::Lit, 11);
            line(scene, p + Vec3::Y * 0.1, p + Vec3::new(0., 0.4, side * 1.5), 0.08, steel, 12, 0.);
            ring(scene, p + Vec3::new(0., 0.4, side * 1.7), 0.22, 1., steel, 12);
        }
    }
    // Painted vessels and organ-specific structures stay underneath the tasks.
    for sign in [-1., 1.] {
        let mut prev = ground(Vec2::new(-6., sign * 1.2), plate, g.beat, 0.018);
        for k in 1..42 {
            let x = -6. + k as f32 * 0.29;
            let z = sign * (1.2 + 0.18 * (x * 1.4).sin());
            let at = ground(Vec2::new(x, z), plate, g.beat, 0.018);
            line(scene, prev, at, 0.035, if g.tune.clinical { srgb(56, 78, 115) } else { srgb(143, 38, 69) }, 15, 0.);
            prev = at;
        }
    }
    if plate == "lung" {
        for side in [-1., 1.] {
            for j in 0..5 {
                let x = side * (1.6 + j as f32 * 0.65);
                let p = ground(Vec2::new(x, -0.5), plate, g.beat, 0.02);
                line(scene, p, p + Vec3::new(0.4 * side, 0.1, 1.7), 0.07, srgb(221, 141, 135), 16, 0.);
            }
        }
    }
    if plate == "femur" {
        line(
            scene,
            ground(Vec2::new(0., -3.), plate, g.beat, 0.25),
            ground(Vec2::new(0., 3.), plate, g.beat, 0.25),
            0.48,
            srgb(244, 219, 177),
            17,
            0.,
        );
    }
    for h in &g.hazards {
        hazard(scene, h, g);
    }
    if g.heat_radius >= 0. {
        ring(scene, Vec3::new(0., 2.1, 0.), g.heat_radius, 1., srgb(255, 157, 69), 60);
    }
    // Steel tray and eight independently articulated instruments.
    box_at(scene, Vec3::new(0., 0.2, 5.8), Vec3::new(18.4, 0.18, 1.65), dark, Style::Lit, 70);
    for i in 0..8 {
        let p = Vec3::new(-7.4 + i as f32 * 2.1, 0.5, 5.8);
        instrument(scene, i, p, 0., false, 80 + i as u32 * 10, 0.7, g.case);
    }
    for (i, s) in g.surgeons.iter().enumerate() {
        if !s.active {
            continue;
        }
        let p = ground(s.cursor, plate, g.beat, 0.32);
        let col = [mint, srgb(104, 163, 255), srgb(125, 240, 139), srgb(176, 208, 255)][i];
        ring(scene, p, 0.30, 1., col, 200 + i as u32);
        instrument(scene, s.tool, p + Vec3::new(0.25, 0.2, 0.05), s.charge, s.held & 1 != 0, 240 + i as u32 * 20, 1., g.case);
        if s.charge > 0.01 {
            ring(
                scene,
                p + Vec3::Y * 0.12,
                0.53,
                s.charge.min(1.),
                if s.charge > 1.1 { srgb(255, 99, 89) } else { mint },
                202 + i as u32,
            );
        }
    }
    for cue in &g.cues {
        if cue.age < 0.7 && (cue.kind == "rating" || cue.kind == "gift" || cue.kind == "shock") {
            for i in 0..10 {
                let a = i as f32 * TAU / 10.;
                let r = cue.age * 1.4;
                let p = ground(cue.pos, plate, g.beat, 0.2 + cue.age * 0.6) + Vec3::new(a.cos() * r, 0., a.sin() * r);
                sphere(scene, p, Vec3::splat(0.055 * (1. - cue.age)), mint, Style::Unlit, 400 + i, 0.7);
            }
        }
    }
}
fn hazard(scene: &mut Scene, h: &Hazard, g: &Surgery) {
    let plate = g.stage().plate.as_str();
    let p = ground(h.pos, plate, g.beat, 0.06);
    let q = ground(h.end, plate, g.beat, 0.06);
    let id = 500 + h.id * 12;
    let mint = srgb(140, 244, 210);
    let blood = if g.tune.clinical { srgb(32, 66, 106) } else { srgb(99, 13, 34) };
    if !h.alive {
        if matches!(h.kind.as_str(), "laceration" | "bleeder" | "bone") {
            let d = q - p;
            for j in 0..7 {
                let a = p + d * (j as f32 / 7.);
                line(scene, a + Vec3::new(0., 0.06, -0.18), a + Vec3::new(0.09, 0.06, 0.18), 0.022, srgb(56, 61, 87), id, 0.);
            }
        }
        return;
    }
    if h.hidden && h.reveal <= 0. {
        if h.kind == "nodule" {
            sphere(scene, p, Vec3::new(0.8, 0.23, 0.6), srgb(154, 77, 104), Style::Cel, id, 0.);
        }
        return;
    }
    match h.kind.as_str() {
        "incision" | "tether" | "soloist" | "dressing" => {
            let color = if h.kind == "soloist" { srgb(254, 211, 117) } else { mint };
            let d = q - p;
            for k in 0..20 {
                let t = k as f32 / 20.;
                if t < h.progress {
                    line(scene, p + d * t, p + d * (t + 0.035), 0.06, blood, id, 0.);
                } else {
                    line(scene, p + d * t + Vec3::Y * 0.035, p + d * (t + 0.024) + Vec3::Y * 0.035, 0.022, color, id, 0.3);
                }
            }
            ring(scene, p + Vec3::Y * 0.08, 0.15, 1., color, id + 1);
        }
        "laceration" | "bleeder" => {
            let d = q - p;
            for j in 0..20 {
                let a = p + d * (j as f32 / 20.);
                let b = p + d * ((j + 1) as f32 / 20.);
                line(
                    scene,
                    a + Vec3::Y * ((j as f32 * 2.).sin() * 0.03),
                    b,
                    if h.kind == "bleeder" { 0.10 } else { 0.065 },
                    blood,
                    id,
                    0.,
                );
            }
            let dir = (q - p).normalize_or_zero();
            for j in 0..h.count {
                let a = p + (q - p) * (j as f32 / (h.count as f32 + 1.));
                line(
                    scene,
                    a + dir.cross(Vec3::Y) * 0.2 + Vec3::Y * 0.07,
                    a - dir.cross(Vec3::Y) * 0.2 + Vec3::Y * 0.07,
                    0.025,
                    srgb(49, 67, 79),
                    id + 1,
                    0.,
                );
            }
            let at = p + (q - p) * (h.progress + 0.1).min(0.95);
            ring(scene, at + Vec3::Y * 0.10, 0.22, 1., mint, id + 2);
            if h.kind == "bleeder" {
                let t = g.time * 4.;
                for j in 0..4 {
                    let a = t + j as f32;
                    let rise = a.fract();
                    sphere(
                        scene,
                        p + Vec3::new((a * 2.).sin() * 0.2, rise * 0.8, 0.),
                        Vec3::splat(0.055),
                        srgb(206, 55, 77),
                        Style::Cel,
                        id + 3,
                        0.,
                    );
                }
            }
        }
        "hook" | "shard" => {
            if h.kind == "hook" {
                for j in 0..9 {
                    let a = j as f32 * PI / 8.;
                    let b = (j + 1) as f32 * PI / 8.;
                    line(
                        scene,
                        p + Vec3::new(a.cos() * 0.25, 0.08, a.sin() * 0.25),
                        p + Vec3::new(b.cos() * 0.25, 0.08, b.sin() * 0.25),
                        0.06,
                        srgb(191, 204, 204),
                        id,
                        0.,
                    );
                }
                line(scene, p + Vec3::new(-0.25, 0.08, 0.), p + Vec3::new(-0.25, 0.1, -0.42), 0.06, srgb(191, 204, 204), id, 0.);
            } else {
                box_at(scene, p + Vec3::Y * 0.12, Vec3::new(0.24, 0.3, 0.7), srgb(173, 201, 207), Style::Lit, id);
            }
            let d = (q - p).normalize_or_zero();
            line(scene, p + Vec3::Y * 0.26, p + d * 0.8 + Vec3::Y * 0.26, 0.016, mint, id + 1, 0.4);
            line(scene, p + d * 0.8 + Vec3::Y * 0.26, p + d * 0.55 + Vec3::X * 0.15 + Vec3::Y * 0.26, 0.016, mint, id + 1, 0.4);
        }
        "polyp" | "tumor" | "nodule" | "sac" | "ember" | "tendril" => {
            let strain = matches!(h.kind.as_str(), "nodule" | "sac" | "ember" | "tendril");
            let r = if h.kind == "tumor" { 0.7 } else { 0.43 };
            let c = if h.kind == "ember" {
                if h.stage == 0 { srgb(210, 68, 44) } else { srgb(117, 218, 236) }
            } else if strain {
                srgb(68, 35, 101)
            } else {
                srgb(188, 63, 91)
            };
            if h.kind == "sac" {
                line(scene, p, p + Vec3::Y * 0.65, 0.08, srgb(90, 42, 109), id, 0.);
                sphere(
                    scene,
                    p + Vec3::Y * 0.55,
                    Vec3::new(0.65, 0.85, 0.65) * (1. + h.age / 30.),
                    srgb(155, 235, 181),
                    Style::Cel,
                    id + 1,
                    0.3,
                );
            } else {
                sphere(scene, p + Vec3::Y * 0.12, Vec3::new(r * 2., r * 0.9, r * 1.65), c, Style::Cel, id, 0.05);
            }
            if strain {
                sphere(
                    scene,
                    p + Vec3::new(0., 0.4, -0.03),
                    Vec3::new(0.22, 0.13, 0.26),
                    srgb(255, 211, 101),
                    Style::Unlit,
                    id + 2,
                    0.9,
                );
                for j in 0..5 {
                    let a = j as f32 * TAU / 5.;
                    let mut prev = p;
                    for k in 1..5 {
                        let d = k as f32 * 0.22;
                        let ang = a + (g.time * 1.2 + j as f32).sin() * 0.15 * d;
                        let at = p + Vec3::new(ang.cos() * d, 0.03 + (g.time * 2. + k as f32).sin() * 0.04, ang.sin() * d);
                        line(scene, prev, at, 0.06 * (1. - d * 0.5), c, id + 3, 0.);
                        prev = at;
                    }
                }
            }
            if h.progress > 0. {
                ring(
                    scene,
                    p + Vec3::Y * 0.38,
                    r + 0.15,
                    h.progress.min(1.),
                    if h.progress > 1.1 { srgb(255, 103, 85) } else { mint },
                    id + 4,
                );
            }
            if h.kind == "tumor" && h.stage == 0 {
                ring(scene, p + Vec3::Y * 0.12, 0.65, 1., mint, id + 5);
            }
        }
        "pool" => {
            let r = (1. - h.progress).max(0.01).sqrt();
            sphere(scene, p + Vec3::Y * 0.025, Vec3::new(2.3 * r, 0.06, 1.9 * r), blood, Style::Lit, id, 0.);
            for i in 0..3 {
                let a = i as f32 * 2.1;
                ring(scene, p + Vec3::new(a.sin() * 0.4 * r, 0.06, a.cos() * 0.4 * r), 0.1 * r, 1., srgb(167, 49, 66), id + 1);
            }
        }
        "burn" | "inflammation" => {
            sphere(scene, p, Vec3::new(1.2, 0.08, 1.), srgb(186, 87, 94).lerp(mint, h.progress), Style::Cel, id, 0.);
            ring(scene, p + Vec3::Y * 0.08, 0.57, h.progress, mint, id + 1);
        }
        "bone" => {
            if h.stage == 0 {
                line(scene, q, q + Vec3::new(0., 0., 0.7), 0.22, srgb(99, 139, 139), id, 0.15);
                line(
                    scene,
                    p,
                    p + Vec3::new(h.angle.sin() * 0.9, 0.2, h.angle.cos() * 0.9),
                    0.24,
                    srgb(248, 228, 184),
                    id + 1,
                    0.,
                );
            } else {
                line(scene, p, q, 0.24, srgb(248, 228, 184), id + 1, 0.);
            }
        }
        _ => {}
    }
}
fn instrument(scene: &mut Scene, tool: u8, p: Vec3, charge: f32, held: bool, id: u32, scale: f32, case: usize) {
    let steel = srgb(192, 217, 220);
    let dark = srgb(57, 85, 96);
    let mint = srgb(123, 235, 198);
    let cyan = srgb(125, 213, 245);
    let v = |x: f32, y: f32, z: f32| p + Vec3::new(x, y, z) * scale;
    let squeeze = if held { 0.055 } else { 0.14 };
    match tool {
        0 => {
            line(scene, v(0.12, 0.5, 0.85), v(0., 0.15, 0.05), 0.07 * scale, dark, id, 0.);
            line(scene, v(0., 0.15, 0.05), v(-0.12, 0., -0.35), 0.045 * scale, steel, id + 1, 0.);
        }
        1 => {
            for side in [-1., 1.] {
                line(scene, v(0., 0.5, 1.), v(side * 0.16, 0.25, 0.4), 0.045 * scale, steel, id, 0.);
                line(scene, v(side * 0.16, 0.25, 0.4), v(side * squeeze, 0., -0.1), 0.035 * scale, steel, id, 0.);
            }
        }
        2 => {
            line(scene, v(0.16, 0.5, 0.8), v(0., 0.10, 0.), 0.045 * scale, steel, id, 0.);
            for i in 0..8 {
                let a = i as f32 * PI / 8.;
                let b = (i + 1) as f32 * PI / 8.;
                line(
                    scene,
                    v(a.cos() * 0.17, 0.06, a.sin() * 0.17),
                    v(b.cos() * 0.17, 0.06, b.sin() * 0.17),
                    0.015 * scale,
                    steel,
                    id + 1,
                    0.,
                );
            }
            line(scene, v(-0.17, 0.05, 0.), v(-0.4, 0.02, 0.5), 0.015 * scale, srgb(68, 94, 119), id + 2, 0.);
        }
        3 => {
            line(scene, v(0.3, 0.65, 0.9), v(0.12, 0.3, 0.35), 0.12 * scale, dark, id, 0.);
            line(scene, v(0.12, 0.3, 0.35), v(0., 0., 0.), 0.06 * scale, steel, id + 1, 0.);
            if held {
                ring(scene, v(0., 0.02, 0.), 0.2 * scale, 1., cyan, id + 2);
            }
        }
        4 | 6 => {
            let frost = tool == 6 && case == 7 || tool == 4 && case == 6;
            let col = if frost {
                cyan
            } else if tool == 6 {
                mint
            } else {
                srgb(255, 127, 103)
            };
            line(scene, v(0.1, 0.6, 0.85), v(0., 0.15, 0.1), 0.10 * scale, dark, id, 0.);
            line(scene, v(0., 0.15, 0.1), v(0., 0.05, -0.25), 0.035 * scale, steel, id + 1, 0.);
            line(scene, v(0.1, 0.56, 0.75), v(0.04, 0.3, 0.3), 0.05 * scale, col, id + 2, 0.5);
            if held {
                line(scene, v(0., 0.05, -0.25), v(0., -0.08, -0.35), 0.025 * scale, col, id + 3, 1.);
                ring(scene, v(0., -0.07, -0.35), 0.18 * scale, 1., col, id + 4);
            }
        }
        5 => {
            sphere(scene, v(0.1, 0.5, 0.6), Vec3::new(0.32, 0.24, 0.65) * scale, mint, Style::Lit, id, 0.);
            line(scene, v(0.1, 0.35, 0.35), v(0., 0., 0.), 0.055 * scale, steel, id + 1, 0.);
            if held {
                sphere(scene, v(0., -0.03, -0.05), Vec3::new(0.26, 0.04, 0.22) * scale, mint, Style::Lit, id + 2, 0.3);
            }
        }
        7 => {
            line(scene, v(0., 0.3, 0.8 - charge * 0.2), v(0., 0.2, 0.1), 0.12 * scale, steel, id, 0.);
            line(scene, v(0., 0.2, 0.1), v(0., 0., -0.35), 0.018 * scale, steel, id + 1, 0.);
            line(scene, v(0., 0.3, 0.6), v(0., 0.2, 0.18), 0.07 * scale, mint, id + 2, 0.);
        }
        _ => {
            box_at(scene, v(0., 0.1, 0.), Vec3::new(0.9, 0.16, 0.65) * scale, srgb(241, 229, 198), Style::Cel, id);
        }
    }
}

// Paper theatre. Chaikin silhouettes are triangulated as convex fans; concave hair is split into locks.
fn card(scene: &mut Scene, points: &[Vec2], z: f32, color: Vec3, transform: Mat4, id: u32, rounds: u8) {
    let mut pts = points.to_vec();
    for _ in 0..rounds {
        let mut out = vec![];
        for i in 0..pts.len() {
            let a = pts[i];
            let b = pts[(i + 1) % pts.len()];
            out.push(a.lerp(b, 0.25));
            out.push(a.lerp(b, 0.75));
        }
        pts = out;
    }
    let area = (0..pts.len()).map(|i| pts[i].perp_dot(pts[(i + 1) % pts.len()])).sum::<f32>();
    if area < 0. {
        pts.reverse();
    }
    let mut data = MeshData::default();
    for a in &pts {
        let v = transform.transform_point3(Vec3::new(a.x, a.y, z));
        data.vertices.push(Vertex {
            pos: v.to_array(),
            normal: transform.transform_vector3(Vec3::Z).to_array(),
            uv: [0., 0.],
            color: [1.; 4],
        });
    }
    // Ear clipping allows the same card format to hold brows, V-necks and hair.
    let mut remaining: Vec<usize> = (0..pts.len()).collect();
    let mut guard = 0;
    while remaining.len() > 2 && guard < pts.len() * pts.len() {
        guard += 1;
        let mut cut = false;
        for j in 0..remaining.len() {
            let a = remaining[(j + remaining.len() - 1) % remaining.len()];
            let b = remaining[j];
            let c = remaining[(j + 1) % remaining.len()];
            if (pts[b] - pts[a]).perp_dot(pts[c] - pts[b]) <= 0. {
                continue;
            }
            let inside = remaining.iter().any(|&i| {
                i != a
                    && i != b
                    && i != c
                    && (pts[b] - pts[a]).perp_dot(pts[i] - pts[a]) >= 0.
                    && (pts[c] - pts[b]).perp_dot(pts[i] - pts[b]) >= 0.
                    && (pts[a] - pts[c]).perp_dot(pts[i] - pts[c]) >= 0.
            });
            if inside {
                continue;
            }
            data.indices.extend([a as u32, b as u32, c as u32]);
            remaining.remove(j);
            cut = true;
            break;
        }
        if !cut {
            break;
        }
    }
    for i in 0..pts.len() {
        let a = pts[i];
        let b = pts[(i + 1) % pts.len()];
        let normal = Vec3::new(b.y - a.y, a.x - b.x, 0.).normalize_or_zero();
        data.push_quad(
            [
                transform.transform_point3(a.extend(z)),
                transform.transform_point3(a.extend(z - 0.055)),
                transform.transform_point3(b.extend(z - 0.055)),
                transform.transform_point3(b.extend(z)),
            ],
            transform.transform_vector3(normal),
        );
    }
    scene.dynamic.push(DynamicMesh { data, color, emissive: 0., style: Style::Cel, flags: 0, group: id, material: 0 });
}
fn oval(scene: &mut Scene, c: Vec2, r: Vec2, z: f32, color: Vec3, m: Mat4, id: u32) {
    let pts: Vec<Vec2> = (0..30)
        .map(|i| {
            let a = i as f32 * TAU / 30.;
            c + Vec2::new(a.cos(), a.sin()) * r
        })
        .collect();
    card(scene, &pts, z, color, m, id, 0);
}
pub fn theatre(scene: &mut Scene, left: &str, right: &str, speaker: &str, expr: &str, time: f32, set: &str) {
    scene.meshes.clear();
    scene.sdfs.clear();
    scene.dynamic.clear();
    scene.texts.clear();
    scene.point_lights.clear();
    scene.camera = CameraData {
        view: glam::camera::rh::view::look_to_mat4(Vec3::new(0., 0., 17.), Vec3::NEG_Z, Vec3::Y),
        proj: glam::camera::rh::proj::directx::perspective(26f32.to_radians(), 16. / 9., 0.1, 100.),
        eye: Vec3::new(0., 0., 17.),
        forward: Vec3::NEG_Z,
        ortho: false,
    };
    scene.clear_color = srgb(11, 29, 35);
    scene.ambient = Ambient { sky: Vec3::splat(0.72), ground: Vec3::splat(0.55) };
    scene.sun.direction = Vec3::new(0.3, -0.45, -0.85).normalize();
    scene.sun.color = Vec3::splat(0.34);
    scene.post.outline_px = 1.5;
    scene.post.outline_darken = 0.32;
    scene.filter.vignette = 0.32;
    // Eight sets share architectural pieces, with their own lighting and window compositions.
    let warm = set == "gala" || set == "ship";
    let base = if warm { srgb(59, 45, 45) } else { srgb(22, 57, 65) };
    box_at(scene, Vec3::new(0., 0., -1.), Vec3::new(20., 12., 0.15), base, Style::Cel, 801);
    for i in -4..=4 {
        box_at(scene, Vec3::new(i as f32 * 2.5, 0., -0.6), Vec3::new(0.12, 12., 0.3), srgb(13, 33, 43), Style::Cel, 802);
    }
    for i in -2..=2 {
        box_at(scene, Vec3::new(0., i as f32 * 2., -0.7), Vec3::new(20., 0.1, 0.2), srgb(46, 78, 81), Style::Cel, 803);
    }
    if warm {
        for i in -4..=4 {
            sphere(scene, Vec3::new(i as f32 * 2., 2.5, -0.3), Vec3::splat(0.12), srgb(255, 199, 129), Style::Unlit, 804, 1.);
        }
    } else {
        for i in 0..36 {
            let x = (i as f32 * 2.73).sin() * 9.;
            let y = 4. - (time * 2.4 + i as f32 * 0.91).rem_euclid(9.);
            line(scene, Vec3::new(x, y, -0.4), Vec3::new(x - 0.08, y - 0.45, -0.4), 0.009, srgb(90, 154, 175), 810, 0.15);
        }
    }
    for (i, name) in [left, right].iter().enumerate() {
        if name.is_empty() {
            continue;
        }
        let x = if i == 0 { -3.15 } else { 3.15 };
        let active = *name == speaker;
        let yaw = if i == 0 { 0.13 } else { -0.13 };
        let lift = if active { 0.02 * (time * 2.).sin() } else { 0. };
        let m =
            Mat4::from_scale_rotation_translation(Vec3::splat(1.55), Quat::from_rotation_y(yaw), Vec3::new(x, -0.4 + lift, 0.));
        actor(scene, name, expr, active, time, m, 900 + i as u32 * 60);
    }
}
fn actor(scene: &mut Scene, name: &str, expr: &str, talking: bool, t: f32, m: Mat4, id: u32) {
    let (skin, shade, hair, scrub) = match name {
        "Pet" => (srgb(122, 80, 58), srgb(107, 68, 53), srgb(226, 226, 232), srgb(98, 70, 136)),
        "Bashir" => (srgb(190, 142, 104), srgb(167, 118, 89), srgb(42, 37, 43), srgb(60, 104, 164)),
        "Teddy" => (srgb(229, 181, 151), srgb(205, 155, 132), srgb(127, 79, 49), srgb(53, 116, 136)),
        "Voss" => (srgb(225, 191, 174), srgb(198, 163, 152), srgb(182, 179, 180), srgb(52, 70, 86)),
        "Vane" => (srgb(237, 196, 168), srgb(218, 169, 143), srgb(155, 96, 50), srgb(221, 196, 152)),
        _ => (srgb(242, 200, 172), srgb(226, 178, 153), srgb(46, 36, 60), srgb(46, 150, 146)),
    };
    let cv = |p: &[[f32; 2]]| p.iter().map(|v| Vec2::from_array(*v)).collect::<Vec<_>>();
    oval(scene, Vec2::new(0., 0.6), Vec2::new(0.89, 1.03), 0., hair, m, id);
    card(
        scene,
        &cv(&[
            [-1.72, -2.5],
            [-1.66, -1.36],
            [-1.2, -1.02],
            [-0.52, -0.82],
            [-0.3, -0.72],
            [0., -1.34],
            [0.3, -0.72],
            [0.52, -0.82],
            [1.2, -1.02],
            [1.66, -1.36],
            [1.72, -2.5],
        ]),
        0.035,
        scrub,
        m,
        id + 1,
        2,
    );
    card(scene, &cv(&[[-0.3, -0.8], [-0.28, -0.24], [0.28, -0.24], [0.3, -0.8], [0., -1.2]]), 0.055, skin, m, id + 2, 2);
    card(
        scene,
        &cv(&[
            [-0.76, 0.76],
            [-0.74, 0.28],
            [-0.56, -0.16],
            [-0.26, -0.5],
            [0., -0.6],
            [0.26, -0.5],
            [0.56, -0.16],
            [0.74, 0.28],
            [0.76, 0.76],
            [0.52, 1.22],
            [0., 1.32],
            [-0.52, 1.22],
        ]),
        0.105,
        skin,
        m,
        id + 3,
        3,
    );
    oval(scene, Vec2::new(0.52, -0.03), Vec2::new(0.12, 0.19), 0.112, shade, m, id + 3);
    let blink = (t * 0.7).sin() > 0.994;
    let alarm = expr == "alarmed";
    let stern = expr == "stern";
    for side in [-1., 1.] {
        let eye = Vec2::new(side * 0.34, 0.34);
        let open = if blink {
            0.015
        } else if alarm {
            0.11
        } else {
            0.075
        };
        oval(scene, eye, Vec2::new(0.19, open), 0.13, srgb(255, 247, 222), m, id + 4);
        if !blink {
            oval(scene, eye + Vec2::new(-side * 0.02, 0.), Vec2::new(0.06, 0.07), 0.14, srgb(70, 85, 86), m, id + 5);
            oval(scene, eye, Vec2::splat(0.03), 0.145, srgb(26, 28, 39), m, id + 6);
            oval(scene, eye + Vec2::new(-0.025, 0.025), Vec2::splat(0.015), 0.15, srgb(255, 250, 231), m, id + 7);
        }
        let by = if alarm { 0.62 } else { 0.53 };
        card(
            scene,
            &cv(&[
                [side * 0.17, by + if stern { -0.03 } else { 0. }],
                [side * 0.55, by + if stern { 0.08 } else { 0.01 }],
                [side * 0.55, by + 0.065],
                [side * 0.17, by + 0.055],
            ]),
            0.155,
            hair,
            m,
            id + 8,
            1,
        );
    }
    card(scene, &cv(&[[-0.03, 0.27], [0.055, -0.01], [-0.065, -0.025]]), 0.14, shade, m, id + 9, 1);
    let mouth = if talking && (t * 15.).sin() > 0. {
        cv(&[[-0.15, -0.255], [0., -0.20], [0.15, -0.255], [0.08, -0.36], [-0.08, -0.36]])
    } else {
        cv(&[[-0.16, -0.26], [0., -0.235], [0.16, -0.26], [0., -0.285]])
    };
    card(scene, &mouth, 0.15, srgb(117, 59, 65), m, id + 10, 1);
    card(
        scene,
        &cv(&[
            [-0.86, 0.38],
            [-0.9, 1.1],
            [-0.42, 1.62],
            [0.26, 1.68],
            [0.8, 1.36],
            [0.92, 0.8],
            [0.84, 0.3],
            [0.68, 0.74],
            [0.36, 1.02],
            [-0.16, 0.98],
            [-0.42, 0.72],
            [-0.68, 0.56],
        ]),
        0.175,
        hair,
        m,
        id + 11,
        3,
    );
    if name == "Pet" {
        oval(scene, Vec2::new(-0.62, 1.29), Vec2::new(0.34, 0.3), 0.01, hair, m, id + 12);
    }
    if name == "Bashir" || name == "Teddy" {
        card(scene, &cv(&[[-0.8, 0.9], [-0.8, 1.45], [0.8, 1.45], [0.8, 0.9]]), 0.19, scrub, m, id + 13, 2);
    }
    card(scene, &cv(&[[-0.46, -0.89], [-0.15, -1.4], [-0.28, -1.5], [-0.65, -1.03]]), 0.09, scrub * 0.7, m, id + 14, 0);
    card(scene, &cv(&[[0.46, -0.89], [0.15, -1.4], [0.28, -1.5], [0.65, -1.03]]), 0.09, scrub * 0.7, m, id + 14, 0);
    card(scene, &cv(&[[0.55, -1.45], [0.92, -1.45], [0.92, -1.72], [0.55, -1.72]]), 0.09, srgb(230, 231, 216), m, id + 15, 0);
}
