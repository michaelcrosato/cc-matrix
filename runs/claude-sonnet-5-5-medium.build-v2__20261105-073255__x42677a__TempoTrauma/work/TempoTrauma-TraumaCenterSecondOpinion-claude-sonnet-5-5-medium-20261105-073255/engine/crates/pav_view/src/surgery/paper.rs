//! The paper theatre: layered, extruded spline cards, lit and outlined by the engine.

use glam::{Mat4, Quat, Vec2, Vec3, Vec4};
use pav_core::games::surgery::frame::SurgeryFrame;
use pav_core::games::surgery::data;
use pav_render::mesh::{MeshData, Vertex};
use pav_render::scene::{self as rs, DynamicMesh, ParticleBurst, PointLight, Scene, SdfInstance, Style};

use super::lin;

pub fn chaikin(pts: &[Vec2], passes: u32) -> Vec<Vec2> {
    let mut p = pts.to_vec();
    for _ in 0..passes {
        let mut out = Vec::with_capacity(p.len() * 2);
        for i in 0..p.len() {
            let a = p[i];
            let b = p[(i + 1) % p.len()];
            out.push(a.lerp(b, 0.25));
            out.push(a.lerp(b, 0.75));
        }
        p = out;
    }
    p
}

fn area(p: &[Vec2]) -> f32 {
    let mut a = 0.0;
    for i in 0..p.len() {
        let (u, v) = (p[i], p[(i + 1) % p.len()]);
        a += u.x * v.y - v.x * u.y;
    }
    a * 0.5
}

fn tri_contains(a: Vec2, b: Vec2, c: Vec2, p: Vec2) -> bool {
    let s = |p1: Vec2, p2: Vec2, p3: Vec2| (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    let (d1, d2, d3) = (s(p, a, b), s(p, b, c), s(p, c, a));
    !((d1 < 0.0 || d2 < 0.0 || d3 < 0.0) && (d1 > 0.0 || d2 > 0.0 || d3 > 0.0))
}

/// Ear-clipping triangulation of a counter-clockwise simple polygon.
pub fn ear_clip(p: &[Vec2]) -> Vec<[u32; 3]> {
    let mut idx: Vec<usize> = (0..p.len()).collect();
    let mut out = vec![];
    let mut guard = 0;
    while idx.len() > 3 && guard < 4000 {
        guard += 1;
        let n = idx.len();
        let mut clipped = false;
        for k in 0..n {
            let (i0, i1, i2) = (idx[(k + n - 1) % n], idx[k], idx[(k + 1) % n]);
            let (a, b, c) = (p[i0], p[i1], p[i2]);
            if (b - a).perp_dot(c - b) <= 1e-7 {
                continue;
            }
            if idx.iter().any(|&j| j != i0 && j != i1 && j != i2 && tri_contains(a, b, c, p[j])) {
                continue;
            }
            out.push([i0 as u32, i1 as u32, i2 as u32]);
            idx.remove(k);
            clipped = true;
            break;
        }
        if !clipped {
            // degenerate: fan the rest
            break;
        }
    }
    if idx.len() >= 3 {
        for k in 1..idx.len() - 1 {
            out.push([idx[0] as u32, idx[k] as u32, idx[k + 1] as u32]);
        }
    }
    out
}

/// One card: a closed outline extruded from `z` back to `z - depth`, moved by `xf`.
#[allow(clippy::too_many_arguments)]
pub fn card(scene: &mut Scene, pts: &[Vec2], chaikin_passes: u32, z: f32, depth: f32, color: Vec3, group: u32, xf: Mat4, emissive: f32, style: Style) {
    if pts.len() < 3 {
        return;
    }
    let mut p = chaikin(pts, chaikin_passes);
    if area(&p) < 0.0 {
        p.reverse();
    }
    let tris = ear_clip(&p);
    let mut vertices = Vec::with_capacity(p.len() * 3);
    let mut indices = vec![];
    let tf = |v: Vec3| xf.transform_point3(v);
    let nrm = xf.transform_vector3(Vec3::Z).normalize();
    for q in &p {
        vertices.push(Vertex { pos: tf(Vec3::new(q.x, q.y, z)).to_array(), normal: nrm.to_array(), uv: [0.0; 2], color: [1.0; 4] });
    }
    for t in &tris {
        indices.extend_from_slice(&[t[0], t[1], t[2]]);
    }
    let n = p.len();
    for i in 0..n {
        let (a, b) = (p[i], p[(i + 1) % n]);
        let e = (b - a).normalize_or(Vec2::X);
        let out = Vec3::new(e.y, -e.x, 0.0);
        let on = xf.transform_vector3(out).normalize();
        let base = vertices.len() as u32;
        for (pt, zz) in [(a, z), (b, z), (b, z - depth), (a, z - depth)] {
            vertices.push(Vertex { pos: tf(Vec3::new(pt.x, pt.y, zz)).to_array(), normal: on.to_array(), uv: [0.0; 2], color: [1.0; 4] });
        }
        indices.extend_from_slice(&[base, base + 1, base + 2, base, base + 2, base + 3]);
    }
    scene.dynamic.push(DynamicMesh { data: MeshData { vertices, indices }, color, emissive, style, flags: 0, group, material: 0 });
}

fn v(p: &[[f32; 2]]) -> Vec<Vec2> {
    p.iter().map(|a| Vec2::new(a[0], a[1])).collect()
}

fn mirror(p: &[Vec2]) -> Vec<Vec2> {
    p.iter().rev().map(|a| Vec2::new(-a.x, a.y)).collect()
}

fn shift(p: &[Vec2], d: Vec2) -> Vec<Vec2> {
    p.iter().map(|a| *a + d).collect()
}

fn scale(p: &[Vec2], s: Vec2) -> Vec<Vec2> {
    p.iter().map(|a| *a * s).collect()
}

struct Look {
    skin: Vec3,
    shade: Vec3,
    hair: Vec3,
    cloth: Vec3,
    accent: Vec3,
    hair_style: u8,
    glasses: bool,
    beard: bool,
}

fn look(who: &str) -> Look {
    let r = data::rig_of(who);
    let c = |h: &str| {
        let [a, b, d] = data::hex_rgb(h);
        lin(a, b, d)
    };
    Look { skin: c(&r.skin), shade: c(&r.shade), hair: c(&r.hair), cloth: c(&r.cloth), accent: c(&r.accent), hair_style: r.hair_style, glasses: r.glasses, beard: r.beard }
}

#[derive(Default)]
pub struct PaperView {
    rain_t: f32,
}

#[derive(Clone, Copy)]
struct Expr {
    open: f32,
    brow: f32,
    brow_tilt: f32,
    mouth: u8,
}

fn expr_of(e: &str) -> Expr {
    match e {
        "alarmed" => Expr { open: 1.35, brow: 0.12, brow_tilt: -0.1, mouth: 1 },
        "stern" => Expr { open: 0.7, brow: -0.06, brow_tilt: 0.16, mouth: 2 },
        "soft" => Expr { open: 0.85, brow: 0.03, brow_tilt: -0.05, mouth: 3 },
        _ => Expr { open: 1.0, brow: 0.0, brow_tilt: 0.0, mouth: 0 },
    }
}

fn character(scene: &mut Scene, who: &str, ex: Expr, xf: Mat4, time: f32, talking: bool, group: u32, dim: f32) {
    let l = look(who);
    let k = |c: Vec3| c * dim;
    let mut g = group;
    let mut put = |scene: &mut Scene, pts: &[Vec2], ch: u32, z: f32, col: Vec3, new_group: bool| {
        if new_group {
            g += 1;
        }
        card(scene, pts, ch, z * 0.035, 0.03, k(col), g, xf, 0.0, Style::Cel);
    };
    // back hair
    let back: Vec<Vec2> = match l.hair_style {
        0 => v(&[[-1.0, 0.3], [-1.05, 1.3], [-0.5, 1.9], [0.4, 1.95], [1.0, 1.5], [1.08, 0.2], [0.95, -1.3], [0.4, -0.5], [-0.4, -0.5], [-0.95, -1.3]]),
        1 => v(&[[-0.9, 0.5], [-0.95, 1.3], [-0.4, 1.75], [0.4, 1.75], [0.95, 1.3], [0.9, 0.5], [0.7, 0.0], [-0.7, 0.0]]),
        4 => v(&[[-0.85, 0.6], [-0.8, 1.4], [-0.3, 1.8], [0.3, 1.8], [0.8, 1.4], [0.85, 0.6], [0.4, 0.2], [-0.4, 0.2]]),
        5 => v(&[[-1.1, 0.0], [-1.15, 1.4], [-0.5, 2.0], [0.5, 2.0], [1.15, 1.4], [1.1, 0.0], [1.2, -1.8], [0.5, -1.0], [-0.5, -1.0], [-1.2, -1.8]]),
        _ => v(&[[-0.8, 0.6], [-0.8, 1.3], [-0.3, 1.6], [0.3, 1.6], [0.8, 1.3], [0.8, 0.6]]),
    };
    put(scene, &back, 3, 0.0, l.hair, true);
    // shoulders
    let sh = v(&[[-1.72, -2.4], [-1.66, -1.36], [-1.2, -1.02], [-0.52, -0.82], [-0.3, -0.72], [0.0, -1.34], [0.3, -0.72], [0.52, -0.82], [1.2, -1.02], [1.66, -1.36], [1.72, -2.4]]);
    let breathe = (time * 1.6).sin() * 0.02;
    let sh = shift(&sh, Vec2::new(0.0, breathe));
    put(scene, &sh, 2, 1.0, l.cloth, true);
    // collar accent
    let collar = v(&[[-0.5, -0.84], [-0.3, -0.72], [0.0, -1.34], [0.3, -0.72], [0.5, -0.84], [0.2, -0.9], [0.0, -1.5], [-0.2, -0.9]]);
    put(scene, &collar, 0, 2.2, l.accent, true);
    // neck
    put(scene, &v(&[[-0.28, -0.1], [-0.3, -0.9], [0.0, -1.0], [0.3, -0.9], [0.28, -0.1]]), 2, 1.6, l.shade, true);
    // face
    let face = v(&data::rigs().face);
    put(scene, &face, 3, 3.0, l.skin, true);
    // cheek shade, subtle
    put(scene, &v(&[[0.3, -0.45], [0.58, -0.12], [0.7, 0.2], [0.55, 0.0], [0.3, -0.3]]), 2, 3.2, l.skin.lerp(l.shade, 0.5), false);
    // eyes
    let ew = v(&[[0.15, 0.33], [0.28, 0.45], [0.44, 0.45], [0.54, 0.34], [0.42, 0.26], [0.26, 0.26]]);
    let ew = scale(&shift(&ew, Vec2::new(0.0, -0.34)), Vec2::new(1.0, ex.open.min(1.4)));
    let ew = shift(&ew, Vec2::new(0.0, 0.34));
    let blink = ((time * 0.8).fract() > 0.93) as i32 as f32;
    let ew = if blink > 0.0 { scale(&shift(&ew, Vec2::new(0.0, -0.34)), Vec2::new(1.0, 0.15)).iter().map(|p| *p + Vec2::new(0.0, 0.34)).collect() } else { ew };
    for m in [false, true] {
        let e = if m { mirror(&ew) } else { ew.clone() };
        put(scene, &e, 2, 3.6, Vec3::new(0.97, 0.97, 0.98), false);
        let cx = if m { -0.34 } else { 0.34 };
        let iris = circle(Vec2::new(cx, 0.35), 0.085, 10);
        if blink == 0.0 {
            put(scene, &iris, 0, 3.8, if l.hair_style == 3 { lin(80, 130, 90) } else { lin(50, 36, 30) }, false);
            put(scene, &circle(Vec2::new(cx + 0.03, 0.38), 0.02, 8), 0, 4.2, Vec3::ONE, false);
        }
        // brows
        let bx = if m { -1.0 } else { 1.0 };
        let brow = v(&[[0.14, 0.62 + ex.brow], [0.3, 0.68 + ex.brow + ex.brow_tilt * 0.3], [0.56, 0.62 + ex.brow + ex.brow_tilt], [0.56, 0.58 + ex.brow + ex.brow_tilt], [0.3, 0.63 + ex.brow], [0.14, 0.57 + ex.brow]]);
        let brow = if m { mirror(&brow) } else { brow };
        let _ = bx;
        put(scene, &brow, 0, 4.4, l.hair * 0.8, false);
    }
    // nose
    put(scene, &v(&[[0.0, 0.2], [0.07, -0.1], [0.0, -0.13], [-0.07, -0.1]]), 1, 3.6, l.shade, false);
    // mouth
    let flap = if talking { ((time * 11.0).sin() > 0.0) as i32 } else { 0 };
    let mouth: Vec<Vec2> = if flap == 1 {
        v(&[[-0.15, -0.255], [0.0, -0.2], [0.15, -0.255], [0.08, -0.36], [-0.08, -0.36]])
    } else {
        match ex.mouth {
            1 => v(&[[-0.1, -0.26], [0.0, -0.22], [0.1, -0.26], [0.07, -0.38], [-0.07, -0.38]]),
            2 => v(&[[-0.16, -0.3], [0.0, -0.26], [0.16, -0.3], [0.0, -0.285]]),
            3 => v(&[[-0.17, -0.24], [0.0, -0.3], [0.17, -0.24], [0.0, -0.33]]),
            _ => v(&[[-0.16, -0.26], [0.0, -0.235], [0.16, -0.26], [0.0, -0.285]]),
        }
    };
    put(scene, &mouth, 1, 3.6, lin(150, 60, 70), false);
    if l.beard {
        put(scene, &v(&[[-0.6, -0.1], [-0.4, -0.5], [0.0, -0.66], [0.4, -0.5], [0.6, -0.1], [0.4, -0.3], [0.0, -0.42], [-0.4, -0.3]]), 2, 3.4, l.hair, false);
    }
    // front hair
    let front: Vec<Vec2> = match l.hair_style {
        0 => v(&[[-0.86, 0.38], [-0.9, 1.1], [-0.42, 1.62], [0.26, 1.68], [0.8, 1.36], [0.92, 0.8], [0.84, 0.3], [0.68, 0.74], [0.36, 1.02], [-0.16, 0.98], [-0.42, 0.72], [-0.68, 0.56]]),
        1 => v(&[[-0.84, 0.5], [-0.86, 1.2], [-0.4, 1.62], [0.4, 1.62], [0.86, 1.2], [0.84, 0.5], [0.6, 0.95], [0.0, 1.05], [-0.6, 0.95]]),
        2 => v(&[[-0.8, 0.7], [-0.8, 1.15], [-0.3, 1.45], [0.3, 1.45], [0.8, 1.15], [0.8, 0.7], [0.6, 1.0], [0.0, 1.1], [-0.6, 1.0]]),
        3 => v(&[[-0.82, 0.5], [-0.85, 1.25], [-0.3, 1.65], [0.0, 1.5], [0.3, 1.7], [0.85, 1.25], [0.82, 0.5], [0.5, 1.0], [0.1, 0.85], [-0.2, 1.05], [-0.6, 0.95]]),
        4 => v(&[[-0.8, 0.55], [-0.82, 1.2], [-0.35, 1.6], [0.35, 1.6], [0.82, 1.2], [0.8, 0.55], [0.55, 1.0], [0.0, 1.12], [-0.55, 1.0]]),
        _ => v(&[[-0.86, 0.3], [-0.9, 1.2], [-0.4, 1.7], [0.4, 1.7], [0.9, 1.2], [0.86, 0.3], [0.7, 0.8], [0.2, 1.1], [-0.2, 1.1], [-0.7, 0.8]]),
    };
    put(scene, &front, 3, 5.0, l.hair, true);
    if l.hair_style == 4 {
        // bun
        put(scene, &circle(Vec2::new(0.0, 1.95), 0.32, 10), 0, 5.4, l.hair, false);
    }
    if l.glasses {
        for m in [false, true] {
            let cx = if m { -0.34 } else { 0.34 };
            // A thin ring: short quads round the lens.
            let n = 16;
            for k in 0..n {
                let a0 = k as f32 / n as f32 * std::f32::consts::TAU;
                let a1 = (k as f32 + 1.0) / n as f32 * std::f32::consts::TAU;
                let (r0, r1) = (0.22, 0.27);
                let c = Vec2::new(cx, 0.36);
                let quad = vec![c + Vec2::from_angle(a0) * r0, c + Vec2::from_angle(a0) * r1, c + Vec2::from_angle(a1) * r1, c + Vec2::from_angle(a1) * r0];
                put(scene, &quad, 0, 5.2, lin(30, 30, 40), false);
            }
        }
    }
}

fn circle(c: Vec2, r: f32, n: usize) -> Vec<Vec2> {
    (0..n).map(|i| c + Vec2::from_angle(i as f32 / n as f32 * std::f32::consts::TAU) * r).collect()
}

fn rect(x0: f32, y0: f32, x1: f32, y1: f32) -> Vec<Vec2> {
    vec![Vec2::new(x0, y0), Vec2::new(x1, y0), Vec2::new(x1, y1), Vec2::new(x0, y1)]
}

impl PaperView {
    pub fn emit(&mut self, scene: &mut Scene, f: &SurgeryFrame, time: f32, aspect: f32) {
        // Stage camera.
        let eye = Vec3::new(0.0, 0.0, 14.0);
        let mut fov = 26f32.to_radians();
        if aspect < 1.6 {
            fov = 2.0 * ((fov * 0.5).tan() * 1.7778 / aspect.max(0.6)).atan();
        }
        scene.camera.eye = eye;
        scene.camera.forward = -Vec3::Z;
        scene.camera.view = glam::camera::rh::view::look_to_mat4(eye, -Vec3::Z, Vec3::Y);
        scene.camera.proj = glam::camera::rh::proj::directx::perspective(fov, aspect.max(0.1), 0.1, 200.0);
        scene.sun.direction = Vec3::new(0.3, -0.45, -0.85).normalize();
        scene.sun.color = Vec3::new(1.0, 0.97, 0.92) * 0.34;
        scene.sun.shadows = true;
        scene.sun.shadow_center = Vec3::ZERO;
        scene.sun.shadow_radius = 14.0;
        scene.ambient.sky = Vec3::new(0.74, 0.74, 0.78);
        scene.ambient.ground = Vec3::new(0.6, 0.56, 0.56);
        scene.style = rs::StyleSettings { flat_shadow: 0.6, cel_bands: 3.0, rim: 0.05, specular: 0.0 };
        scene.post.outline_darken = 0.32;
        scene.post.outline_px = 1.4;
        scene.post.gi = 0.4;
        scene.filter.vignette = 0.32;
        let content = data::load();
        let Some(sc) = content.scenes.iter().find(|s| s.id == f.story) else { return };
        let line = sc.line.get(f.line as usize);
        let set = sc.set.as_str();
        self.set(scene, set, time);
        let who = line.map(|l| l.who.as_str()).unwrap_or("narrator");
        let ex = line.map(|l| l.expr.as_str()).unwrap_or("neutral");
        // previous distinct speaker
        let mut prev: Option<&str> = None;
        for l in sc.line[..(f.line as usize).min(sc.line.len())].iter().rev() {
            if l.who != who && l.who != "narrator" {
                prev = Some(&l.who);
                break;
            }
        }
        let side = |w: &str| -> f32 {
            match w {
                "mara" | "teddy" | "vane" => -1.0,
                _ => 1.0,
            }
        };
        let len = line.map(|l| l.text.chars().count() as f32).unwrap_or(0.0);
        let talking = f.typed < len;
        let t_line = f.typed / 48.0;
        let slide = (1.0 - (t_line * 3.0).min(1.0)).powi(2) * 2.0;
        if let Some(pw) = prev {
            let s = side(pw);
            let xf = Mat4::from_translation(Vec3::new(s * 4.6 * if side(who) == s { 1.15 } else { 1.0 }, 0.2, -1.0))
                * Mat4::from_quat(Quat::from_rotation_y(-s * 0.22))
                * Mat4::from_scale(Vec3::splat(0.8));
            character(scene, pw, Vec2::ZERO.into_expr(), xf, time, false, 200, 0.7);
        }
        if who != "narrator" {
            let s = side(who);
            let sway = (time * 0.7).sin() * 0.035;
            let nod = if talking { (time * 5.0).sin() * 0.02 } else { 0.0 };
            let xf = Mat4::from_translation(Vec3::new(s * 2.6 + s * slide, 0.45 + nod * 3.0, 0.0))
                * Mat4::from_quat(Quat::from_rotation_y(-s * 0.22 + sway))
                * Mat4::from_scale(Vec3::splat(1.05));
            character(scene, who, expr_of(ex), xf, time, talking, 100, 1.0);
        }
        // Rain on the glass.
        self.rain_t += 1.0;
        if matches!(set, "corridor" | "gallery" | "atrium" | "theatre" | "depot" | "cabin" | "nightward") {
            let mut b = ParticleBurst { pos: Vec3::new(0.0, 9.0, -5.0), count: 5, color0: Vec4::new(0.7, 0.85, 1.0, 0.6), color1: Vec4::new(0.7, 0.85, 1.0, 0.0), ..Default::default() };
            b.area = Vec3::new(14.0, 0.5, 1.0);
            b.vel = Vec3::new(-0.5, -14.0, 0.0);
            b.life = (0.6, 0.9);
            b.size = (0.025, 0.02);
            b.stretch = true;
            scene.particles.push(b);
        }
    }

    fn set(&self, scene: &mut Scene, set: &str, time: f32) {
        // Sets are cards too, with parallax layers.
        let id = Mat4::IDENTITY;
        let (wall, floor, accent, window): (Vec3, Vec3, Vec3, bool) = match set {
            "corridor" => (lin(120, 150, 160), lin(70, 86, 96), lin(200, 220, 230), true),
            "scrub" => (lin(110, 160, 156), lin(70, 100, 100), lin(230, 240, 240), false),
            "gallery" => (lin(70, 76, 96), lin(40, 44, 60), lin(190, 200, 230), true),
            "atrium" => (lin(210, 190, 160), lin(150, 120, 100), lin(255, 230, 180), true),
            "theatre" => (lin(50, 110, 112), lin(40, 80, 84), lin(240, 250, 250), false),
            "nightward" => (lin(30, 44, 70), lin(24, 30, 46), lin(120, 220, 255), false),
            "depot" => (lin(96, 100, 90), lin(60, 62, 60), lin(255, 200, 120), true),
            "recovery" => (lin(180, 196, 200), lin(130, 140, 146), lin(255, 240, 220), true),
            "cabin" => (lin(60, 44, 40), lin(40, 30, 28), lin(255, 200, 120), true),
            _ => (lin(100, 120, 130), lin(60, 70, 80), lin(220, 230, 240), false),
        };
        card(scene, &rect(-14.0, -7.0, 14.0, 7.5), 0, -6.0 * 0.035 - 3.0, 0.03, wall, 1, id, 0.0, Style::Cel);
        card(scene, &rect(-14.0, -7.0, 14.0, -2.6), 0, -2.0, 0.03, floor, 2, id, 0.0, Style::Cel);
        if window {
            for i in 0..3 {
                let x = -7.0 + i as f32 * 7.0;
                card(scene, &rect(x - 2.0, 0.6, x + 2.0, 5.6), 0, -4.5, 0.03, lin(16, 30, 46), 3 + i as u32, id, 0.1, Style::Cel);
                card(scene, &rect(x - 1.9, 0.7, x + 1.9, 5.5), 0, -4.4, 0.02, lin(30, 52, 80), 3 + i as u32, id, 0.3, Style::Unlit);
                scene.point_lights.push(PointLight { position: Vec3::new(x, 3.0, -2.0), color: accent * 0.15, radius: 7.0, shadows: false });
            }
        } else {
            for i in 0..4 {
                let x = -8.5 + i as f32 * 5.7;
                card(scene, &rect(x - 0.9, 1.2, x + 0.9, 3.0), 0, -4.0, 0.03, lin(20, 24, 30), 4 + i as u32, id, 0.1, Style::Cel);
                let pulse = 0.8 + 0.4 * (time * 3.0 + i as f32).sin();
                card(scene, &rect(x - 0.8, 1.3, x + 0.8, 2.9), 0, -3.9, 0.02, accent * 0.5, 4 + i as u32, id, pulse, Style::Unlit);
            }
        }
        // a table / counter
        card(scene, &rect(-14.0, -3.4, 14.0, -2.4), 0, -1.0, 0.1, floor * 0.7, 9, id, 0.0, Style::Cel);
        let _ = SdfInstance::sphere(Vec3::ZERO, 0.0, Vec3::ZERO);
    }
}

trait IntoExpr {
    fn into_expr(self) -> Expr;
}
impl IntoExpr for Vec2 {
    fn into_expr(self) -> Expr {
        Expr { open: 1.0, brow: 0.0, brow_tilt: 0.0, mouth: 0 }
    }
}
