//! Overhead operative field, instruments, and paper-theatre cards.
//! One dynamic mesh paints the plate. Lights and the camera are applied last so view settings cannot override them.

use glam::Vec3;
use pav_core::games::surgery::frame::{CameraShot, SurgeryFrame};
use pav_core::games::surgery::kinds::*;
use pav_render::mesh::{MeshData, Vertex};
use pav_render::scene::{self as rs, DynamicMesh, Scene, SdfInstance, Style};

const NX: usize = 420;
const NZ: usize = 240;
/// Hub and mirror copies. A 420×240 plate plus the demo world stalls a software-GPU iframe.
const QUIET_NX: usize = 16;
const QUIET_NZ: usize = 8;

pub fn emit(scene: &mut Scene, op: &SurgeryFrame) {
    let (nx, nz) = if op.quiet { (QUIET_NX, QUIET_NZ) } else { (NX, NZ) };
    scene.dynamic.push(plate(op, nx, nz));
    instruments(scene, op);
    hazards(scene, op);
    if !op.quiet && (op.mode == 0 || op.mode == 1 || op.mode == 4 || op.mode == 6) {
        paper(scene, op);
    }
}

pub fn apply_look(scene: &mut Scene, _rig: &crate::camera::CameraRig, aspect: f32, shot: &CameraShot, quiet: bool) {
    let mut rig = crate::camera::CameraRig::new(crate::camera::CameraParams {
        tilt: shot.tilt,
        yaw: shot.yaw,
        distance: shot.distance,
        fov: shot.fov_deg,
        ortho: false,
        follow_lag: shot.follow_lag,
        height_offset: shot.height_offset,
    });
    rig.snap(shot.target);
    scene.camera = rig.data(aspect);
    scene.sun.direction = Vec3::new(-0.25, -1.0, -0.35).normalize();
    scene.sun.color = Vec3::new(1.0, 0.97, 0.90) * 0.42;
    scene.sun.shadows = true;
    scene.sun.shadow_center = shot.target;
    scene.sun.shadow_radius = 16.0;
    scene.ambient.sky = Vec3::new(0.50, 0.50, 0.54);
    scene.ambient.ground = Vec3::new(0.30, 0.22, 0.22);
    scene.point_lights.clear();
    scene.point_lights.push(rs::PointLight {
        position: Vec3::new(-1.0, 7.0, -1.0),
        color: Vec3::new(1.0, 0.97, 0.9) * 0.9,
        radius: 16.0,
        shadows: true,
    });
    scene.clear_color = rs::srgb(16, 40, 44);
    scene.style.cel_bands = 3.0;
    scene.style.rim = 0.12;
    scene.post.outline_darken = 0.45;
    scene.post.outlines = true;
    scene.post.bloom = 0.35;
    scene.post.bloom_threshold = 1.15;
    scene.post.gi = 0.6;
    scene.filter.vignette = 0.35;
    scene.fog.enabled = false;
    // The coarse hub plate stays lit. Shadows and post on a software GPU
    // take long enough that the iframe stops painting.
    if quiet {
        scene.sun.shadows = false;
        scene.point_lights.clear();
        scene.post.outlines = false;
        scene.post.bloom = 0.0;
        scene.post.gi = 0.0;
    }
}

fn plate(op: &SurgeryFrame, nx: usize, nz: usize) -> DynamicMesh {
    let mut data = MeshData::default();
    data.vertices.reserve(nx * nz);
    let pulse = if op.flat { 0.0 } else { (op.phase * std::f32::consts::TAU).sin() * 0.012 * (0.4 + op.vitals / 160.0) };
    let mut hgt = vec![0.0f32; nx * nz];
    for j in 0..nz {
        for i in 0..nx {
            let x = -11.0 + i as f32 / (nx - 1) as f32 * 22.0;
            let z = -6.3 + j as f32 / (nz - 1) as f32 * 12.6;
            let (elev, color) = vertex_paint(op, x, z, pulse);
            hgt[j * nx + i] = elev;
            data.vertices.push(Vertex {
                pos: [x, elev, z],
                normal: [0.0, 1.0, 0.0],
                uv: [i as f32 / (nx - 1) as f32, j as f32 / (nz - 1) as f32],
                color: [color.x, color.y, color.z, 1.0],
            });
        }
    }
    for j in 0..nz {
        for i in 0..nx {
            let h = |a: usize, b: usize| hgt[b.min(nz - 1) * nx + a.min(nx - 1)];
            let span_x = if nx == NX { 0.11 } else { 44.0 / (nx - 1) as f32 };
            let span_z = if nz == NZ { 0.11 } else { 25.2 / (nz - 1) as f32 };
            let dx = (h(i + 1, j) - h(i.saturating_sub(1), j)) / span_x;
            let dz = (h(i, j + 1) - h(i, j.saturating_sub(1))) / span_z;
            let n = Vec3::new(-dx, 1.0, -dz).normalize_or_zero();
            let n = if n.length_squared() > 0.5 { n } else { Vec3::Y };
            let idx = j * nx + i;
            data.vertices[idx].normal = [n.x, n.y, n.z];
            if n.y > 0.92 && hgt[idx] > 0.15 {
                let c = &mut data.vertices[idx].color;
                c[0] = (c[0] + 0.18).min(1.0);
                c[1] = (c[1] + 0.12).min(1.0);
                c[2] = (c[2] + 0.10).min(1.0);
            }
        }
    }
    for j in 0..nz - 1 {
        for i in 0..nx - 1 {
            let i00 = (j * nx + i) as u32;
            let i10 = i00 + 1;
            let i01 = i00 + nx as u32;
            let i11 = i01 + 1;
            data.indices.extend_from_slice(&[i00, i01, i10, i10, i01, i11]);
        }
    }
    debug_assert!(data.vertices.iter().all(|v| v.pos.iter().all(|c| c.is_finite())));
    DynamicMesh {
        data,
        color: Vec3::ONE,
        emissive: 0.0,
        style: Style::Cel,
        flags: 0,
        group: 2,
        material: 0,
    }
}

fn vertex_paint(op: &SurgeryFrame, x: f32, z: f32, pulse: f32) -> (f32, Vec3) {
    let bed = rs::srgb(74, 22, 30);
    let flesh = rs::srgb(214, 92, 84);
    let top = rs::srgb(246, 150, 128);
    let vein = rs::srgb(150, 40, 60);
    let cut = rs::srgb(44, 8, 14);
    let pool = rs::srgb(120, 6, 16);
    let drape = rs::srgb(34, 112, 116);
    let dx = x;
    let dz = z - 0.15;
    let lobe = 1.0 - dx * dx / 22.0 - dz * dz / 9.0;
    let n = hash(x, z);
    let n2 = hash(x * 1.7 + 4.0, z * 1.3 - 2.0);
    let elev = if lobe > 0.0 {
        1.25 * lobe.powf(0.55) + (n - 0.5) * 0.045 + pulse
    } else {
        (n - 0.5) * 0.01
    };
    let mut elev = elev.max(0.0);
    let mut color = if lobe <= 0.02 {
        drape
    } else {
        let t = (elev / 1.15).clamp(0.0, 1.0);
        let mid = flesh.lerp(top, (t - 0.35).clamp(0.0, 1.0));
        bed.lerp(mid, (t * 1.4).clamp(0.0, 1.0))
    };
    if lobe > 0.05 && n2 > 0.78 {
        color = color.lerp(vein, 0.65);
        elev += 0.01;
    }
    if lobe > 0.08 && n > 0.93 && n2 < 0.4 {
        color = color.lerp(pool, 0.8);
        elev = (elev - 0.03).max(0.02);
    }
    for h in &op.hazards {
        if !h.alive {
            continue;
        }
        let d = ((x - h.x).powi(2) + (z - h.z).powi(2)).sqrt();
        if d < h.radius + 0.15 {
            let k = (1.0 - d / (h.radius + 0.15)).clamp(0.0, 1.0);
            match h.kind {
                K_POOL | K_BLEEDER => {
                    color = color.lerp(pool, 0.75 * k);
                    elev = (elev - 0.04 * k).max(0.0);
                }
                K_LACERATION | K_INCISION | K_TETHER => {
                    color = color.lerp(cut, 0.85 * k);
                    elev = (elev - 0.05 * k).max(0.0);
                }
                K_BURN | K_HEAT => {
                    color = color.lerp(rs::srgb(90, 30, 24), 0.5 * k);
                }
                _ => {
                    elev += 0.04 * k;
                }
            }
        }
    }
    if !elev.is_finite() {
        elev = 0.0;
    }
    (elev, color)
}

fn hash(x: f32, z: f32) -> f32 {
    let xi = (x * 32.0).floor() as i32;
    let zi = (z * 32.0).floor() as i32;
    let mut n = xi.wrapping_mul(374761393) ^ zi.wrapping_mul(668265263);
    n = (n ^ (n >> 13)).wrapping_mul(1274126177);
    (n as u32 & 0xffff) as f32 / 65535.0
}

fn instruments(scene: &mut Scene, op: &SurgeryFrame) {
    let steel = rs::srgb(186, 196, 204);
    let grip = rs::srgb(40, 78, 86);
    for (i, c) in op.cursors.iter().enumerate() {
        if !c.active && op.mode == 3 && i > 0 {
            continue;
        }
        if op.mode != 3 && op.mode != 6 && op.mode != 8 && i > 0 {
            continue;
        }
        let show = c.active || i == 0;
        if !show && op.mode != 0 {
            continue;
        }
        if op.mode == 0 {
            break;
        }
        let y = 0.55 + if c.tool == op.cursors[0].tool { 0.12 } else { 0.0 };
        let origin = Vec3::new(c.x, y, c.z);
        let tint = Vec3::new(c.color[0], c.color[1], c.color[2]);
        tool_mesh(scene, c.tool, origin, steel.lerp(tint, 0.25), grip, 40 + i as u32);
    }
    if !op.quiet && (op.mode == 3 || op.mode == 0 || op.mode == 6) {
        for t in 0..8 {
            let x = -3.5 + t as f32 * 1.0;
            let z = 5.4;
            let lift = op.cursors.first().map(|c| c.tool == t as u8).unwrap_or(false);
            let y = if lift { 0.42 } else { 0.22 };
            tool_mesh(scene, t as u8, Vec3::new(x, y, z), steel, grip, 20 + t as u32);
        }
    }
}

fn tool_mesh(scene: &mut Scene, tool: u8, at: Vec3, steel: Vec3, grip: Vec3, group: u32) {
    let tip = match tool {
        FORCEPS => Vec3::new(0.18, 0.05, 0.34),
        LASER | CRYO => Vec3::new(0.0, 0.08, 0.42),
        DEFIB => Vec3::new(0.22, 0.02, 0.1),
        _ => Vec3::new(0.0, 0.02, 0.38),
    };
    let mut a = SdfInstance::capsule(at, at + tip, 0.035, steel);
    a.style = Style::Lit;
    a.group = group;
    scene.sdfs.push(a);
    let mut b = SdfInstance::capsule(at, at + Vec3::new(-0.05, 0.02, -0.28), 0.045, grip);
    b.style = Style::Lit;
    b.group = group;
    scene.sdfs.push(b);
    if tool == DEFIB {
        let mut pad = SdfInstance::capsule(at + Vec3::new(0.16, 0.04, 0.12), at + Vec3::new(-0.16, 0.04, 0.12), 0.06, steel);
        pad.style = Style::Lit;
        pad.group = group;
        scene.sdfs.push(pad);
    }
}

fn hazards(scene: &mut Scene, op: &SurgeryFrame) {
    let parasite = rs::srgb(58, 26, 96);
    let core = rs::srgb(36, 18, 66);
    let eye = rs::srgb(255, 210, 70);
    let sac = rs::srgb(120, 255, 170);
    let ember = rs::srgb(255, 120, 40);
    for h in &op.hazards {
        if !h.alive || h.hidden && h.kind != K_FOREIGN {
            continue;
        }
        let p = Vec3::new(h.x, 0.35 + h.work * 0.05, h.z);
        match h.kind {
            K_SAC => {
                let mut s = SdfInstance::sphere(p, h.radius.max(0.18) * (0.7 + h.aux.min(1.2) * 0.4), sac);
                s.emissive = 0.75;
                s.style = Style::Unlit;
                s.group = 80 + (h.id % 40);
                scene.sdfs.push(s);
            }
            K_EYE => {
                let mut s = SdfInstance::sphere(p + Vec3::Y * 0.1, 0.16, eye);
                s.emissive = 1.6;
                s.style = Style::Unlit;
                s.group = 120;
                scene.sdfs.push(s);
                let mut body = SdfInstance::sphere(p, 0.28, parasite);
                body.style = Style::Cel;
                body.group = 121;
                scene.sdfs.push(body);
            }
            K_POLYP | K_NODULE | K_TUMOR | K_TENDRIL => {
                let mut s = SdfInstance::sphere(p, h.radius.max(0.16), parasite);
                s.style = Style::Cel;
                s.group = 140 + (h.id % 30);
                scene.sdfs.push(s);
                let mut c = SdfInstance::sphere(p + Vec3::Y * 0.08, 0.07, core);
                c.emissive = 0.4;
                c.style = Style::Unlit;
                c.group = 170;
                scene.sdfs.push(c);
            }
            K_EMBER => {
                let mut s = SdfInstance::sphere(p, 0.14, ember);
                s.emissive = 1.2;
                s.style = Style::Unlit;
                s.group = 200 + (h.id % 20);
                scene.sdfs.push(s);
            }
            K_FOREIGN => {
                let mut s = SdfInstance::capsule(p, p + Vec3::new(0.2, 0.05, 0.05), 0.05, rs::srgb(210, 210, 200));
                s.style = Style::Lit;
                s.group = 220;
                scene.sdfs.push(s);
            }
            _ => {}
        }
    }
}

fn paper(scene: &mut Scene, op: &SurgeryFrame) {
    let who = if op.story_who.is_empty() { "Mara Quill" } else { op.story_who.as_str() };
    let expr = (op.elapsed as u32 % 4) as u8;
    let left = card_mesh(who, expr, -2.6);
    let right_name = match who {
        "Mara Quill" => "Pet Nwosu",
        "Pet Nwosu" => "Bashir Haddad",
        "Bashir Haddad" => "Ottoline Voss",
        "Ottoline Voss" => "Teddy Lark",
        "Cordelia Vane" => "Mara Quill",
        _ => "Ottoline Voss",
    };
    let right = card_mesh(right_name, (expr + 1) % 4, 2.6);
    scene.dynamic.push(left);
    scene.dynamic.push(right);
    let _ = op;
}

fn card_mesh(who: &str, expr: u8, x: f32) -> DynamicMesh {
    let (skin, shade, hair, cloth) = palette(who);
    let mut data = MeshData::default();
    push_part(&mut data, &body_poly(), x, 0.15, cloth, 0.06);
    push_part(&mut data, &head_poly(), x, 1.55, skin, 0.05);
    push_part(&mut data, &hair_poly(who), x, 1.72, hair, 0.04);
    push_part(&mut data, &cheek_poly(), x + 0.18, 1.48, shade, 0.02);
    push_part(&mut data, &mouth_poly(expr), x, 1.28, shade, 0.015);
    if data.vertices.is_empty() {
        data.vertices.push(Vertex { pos: [x, 0.2, -3.2], normal: [0.0, 0.0, 1.0], uv: [0.0, 0.0], color: [1.0, 1.0, 1.0, 1.0] });
    }
    DynamicMesh {
        data,
        color: Vec3::ONE,
        emissive: 0.02,
        style: Style::Cel,
        flags: rs::flags::NO_SHADOW,
        group: 300 + (x.abs() as u32),
        material: 0,
    }
}

fn palette(who: &str) -> (Vec3, Vec3, Vec3, Vec3) {
    match who {
        "Pet Nwosu" => (rs::srgb(122, 80, 58), rs::srgb(92, 58, 44), rs::srgb(226, 226, 232), rs::srgb(98, 70, 136)),
        "Bashir Haddad" => (rs::srgb(190, 142, 104), rs::srgb(160, 112, 80), rs::srgb(40, 32, 28), rs::srgb(60, 104, 164)),
        "Teddy Lark" => (rs::srgb(232, 196, 170), rs::srgb(200, 150, 130), rs::srgb(180, 90, 40), rs::srgb(70, 120, 110)),
        "Ottoline Voss" => (rs::srgb(230, 200, 186), rs::srgb(190, 150, 140), rs::srgb(80, 80, 88), rs::srgb(48, 56, 72)),
        "Cordelia Vane" => (rs::srgb(214, 170, 140), rs::srgb(170, 120, 100), rs::srgb(30, 28, 36), rs::srgb(120, 48, 62)),
        _ => (rs::srgb(242, 200, 172), rs::srgb(214, 158, 136), rs::srgb(46, 36, 60), rs::srgb(46, 150, 146)),
    }
}

fn body_poly() -> Vec<[f32; 2]> {
    vec![
        [-0.7, 0.0],
        [-0.85, 0.7],
        [-0.45, 1.05],
        [0.0, 1.15],
        [0.45, 1.05],
        [0.85, 0.7],
        [0.7, 0.0],
    ]
}

fn head_poly() -> Vec<[f32; 2]> {
    let mut v = Vec::new();
    for i in 0..14 {
        let a = i as f32 / 14.0 * std::f32::consts::TAU;
        v.push([a.cos() * 0.38, a.sin() * 0.46]);
    }
    v
}

fn hair_poly(who: &str) -> Vec<[f32; 2]> {
    let wide = if who == "Pet Nwosu" { 0.5 } else { 0.42 };
    vec![[-wide, -0.05], [-wide * 0.8, 0.35], [0.0, 0.48], [wide * 0.8, 0.35], [wide, -0.05], [0.2, 0.05], [-0.2, 0.05]]
}

fn cheek_poly() -> Vec<[f32; 2]> {
    vec![[-0.12, -0.06], [0.12, -0.02], [0.08, 0.08], [-0.1, 0.06]]
}

fn mouth_poly(expr: u8) -> Vec<[f32; 2]> {
    match expr % 4 {
        1 => vec![[-0.12, 0.02], [0.0, -0.08], [0.12, 0.02], [0.0, 0.08]],
        2 => vec![[-0.14, 0.04], [0.14, 0.04], [0.1, -0.02], [-0.1, -0.02]],
        3 => vec![[-0.12, -0.02], [0.0, 0.06], [0.12, -0.02], [0.0, -0.06]],
        _ => vec![[-0.12, 0.0], [0.12, 0.0], [0.08, -0.03], [-0.08, -0.03]],
    }
}

fn push_part(data: &mut MeshData, poly: &[[f32; 2]], x: f32, y: f32, color: Vec3, depth: f32) {
    let smooth = chaikin(poly, 2);
    if smooth.len() < 3 {
        return;
    }
    let z0 = -3.4;
    let base = data.vertices.len() as u32;
    for p in &smooth {
        data.vertices.push(vert(x + p[0], y + p[1], z0, [0.0, 0.0, 1.0], color));
    }
    for p in &smooth {
        data.vertices.push(vert(x + p[0], y + p[1], z0 - depth, [0.0, 0.0, -1.0], color * 0.72));
    }
    let n = smooth.len() as u32;
    let tris = triangulate(&smooth);
    for (a, b, c) in tris {
        data.indices.extend_from_slice(&[base + a, base + b, base + c]);
        data.indices.extend_from_slice(&[base + n + a, base + n + c, base + n + b]);
    }
    for i in 0..n {
        let j = (i + 1) % n;
        data.indices.extend_from_slice(&[base + i, base + n + i, base + j, base + j, base + n + i, base + n + j]);
    }
}

fn vert(x: f32, y: f32, z: f32, n: [f32; 3], color: Vec3) -> Vertex {
    Vertex { pos: [x, y, z], normal: n, uv: [0.5, 0.5], color: [color.x, color.y, color.z, 1.0] }
}

fn chaikin(pts: &[[f32; 2]], n: usize) -> Vec<[f32; 2]> {
    let mut p = pts.to_vec();
    for _ in 0..n {
        if p.len() < 3 {
            break;
        }
        let mut q = Vec::with_capacity(p.len() * 2);
        for i in 0..p.len() {
            let a = p[i];
            let b = p[(i + 1) % p.len()];
            q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
            q.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
        }
        p = q;
    }
    p
}

fn triangulate(poly: &[[f32; 2]]) -> Vec<(u32, u32, u32)> {
    let mut idx: Vec<u32> = (0..poly.len() as u32).collect();
    let mut out = Vec::new();
    let mut guard = 0;
    while idx.len() > 3 && guard < 64 {
        guard += 1;
        let mut clipped = false;
        let n = idx.len();
        for i in 0..n {
            let a = idx[(i + n - 1) % n] as usize;
            let b = idx[i] as usize;
            let c = idx[(i + 1) % n] as usize;
            if ear(poly, a, b, c, &idx) {
                out.push((a as u32, b as u32, c as u32));
                idx.remove(i);
                clipped = true;
                break;
            }
        }
        if !clipped {
            break;
        }
    }
    if idx.len() == 3 {
        out.push((idx[0], idx[1], idx[2]));
    }
    out
}

fn ear(poly: &[[f32; 2]], a: usize, b: usize, c: usize, rest: &[u32]) -> bool {
    let (pa, pb, pc) = (poly[a], poly[b], poly[c]);
    let cross = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
    if cross <= 0.0 {
        return false;
    }
    for &i in rest {
        let i = i as usize;
        if i == a || i == b || i == c {
            continue;
        }
        if inside(poly[i], pa, pb, pc) {
            return false;
        }
    }
    true
}

fn inside(p: [f32; 2], a: [f32; 2], b: [f32; 2], c: [f32; 2]) -> bool {
    let s = |u: [f32; 2], v: [f32; 2]| (p[0] - u[0]) * (v[1] - u[1]) - (p[1] - u[1]) * (v[0] - u[0]);
    let d1 = s(a, b);
    let d2 = s(b, c);
    let d3 = s(c, a);
    (d1 >= 0.0 && d2 >= 0.0 && d3 >= 0.0) || (d1 <= 0.0 && d2 <= 0.0 && d3 <= 0.0)
}

#[cfg(test)]
mod tests {
    use pav_core::games::surgery::frame::{CursorView, HazardView, SurgeryFrame};
    use pav_core::games::surgery::kinds::*;
    use pav_render::scene::Scene;

    use super::emit;

    fn hazard(kind: u8, x: f32, z: f32) -> HazardView {
        HazardView {
            id: 7,
            kind,
            x,
            z,
            radius: 0.5,
            work: 0.0,
            need: 1.0,
            alive: true,
            hidden: false,
            stage: 0,
            stages: 3,
            axis: 0.2,
            aux: 0.0,
            bits: 0,
            tool: CRYO,
            grabbed: false,
        }
    }

    #[test]
    fn quiet_hub_draws_plate_instruments_hazards_and_cursors() {
        for mode in [3_u8, 8] {
            let mut op = SurgeryFrame::empty();
            op.quiet = true;
            op.mode = mode;
            op.hazards.push(hazard(K_EMBER, -1.2, 0.8));
            op.cursors[0] = CursorView {
                active: true,
                x: 2.0,
                z: -1.0,
                tool: CRYO,
                score: 0,
                chain: 0,
                meter: 0.0,
                color: [0.9, 0.2, 0.2],
            };
            let mut scene = Scene::default();
            emit(&mut scene, &op);
            let plate = scene.dynamic.first().expect("plate");
            let n = plate.data.vertices.len();
            assert!(n > 100 && n < 8_000, "mode {mode} coarse plate had {n} verts");
            assert!(plate.data.vertices.iter().any(|v| v.pos[0] < -10.0), "mode {mode} field");
            assert!(plate.data.vertices.iter().any(|v| v.pos[0] > 10.0), "mode {mode} field");
            let ember = scene.sdfs.iter().any(|s| (s.a.x + 1.2).abs() < 0.05 && (s.a.z - 0.8).abs() < 0.05);
            let cursor = scene.sdfs.iter().any(|s| (s.a.x - 2.0).abs() < 0.05 && (s.a.z + 1.0).abs() < 0.05);
            assert!(ember, "mode {mode} ember sdf missing");
            assert!(cursor, "mode {mode} cursor sdf missing");
        }
    }
}
