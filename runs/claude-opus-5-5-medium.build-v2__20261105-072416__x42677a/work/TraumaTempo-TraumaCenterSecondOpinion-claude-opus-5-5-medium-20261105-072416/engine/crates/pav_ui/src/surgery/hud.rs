//! The operation HUD and the screens the sim's stages draw: story box, chart card, results and
//! the flatline. Everything reads one `SurgeryFrame`, on the 1920×1080 canvas.

use std::collections::HashMap;

use egui::{Align2, Color32, Mesh, Painter, Pos2, Rect, Stroke, Vec2, pos2, vec2};
use glam::{Mat4, Vec2 as G2, Vec3};
use pav_core::games::surgery::content::content;
use pav_core::games::surgery::field::{Kind, TRAY_Z, Tool, iv_port, tray_slot};
use pav_core::games::surgery::frame::{Stage, SurgeryFrame};
use pav_core::games::surgery::paper::{PartGeo, mouth_points, outline, pose_for, posed, rig_parts};

use super::glyphs::{Action, prompt};
use super::style::*;
use crate::Device;

/// Field to screen (points on the virtual canvas).
#[derive(Clone, Copy)]
pub struct Proj {
    pub vp: Mat4,
    pub size: Vec2,
}

impl Proj {
    pub fn world(&self, p: Vec3) -> Pos2 {
        let c = self.vp * p.extend(1.0);
        let w = c.w.abs().max(1e-4);
        pos2((c.x / w * 0.5 + 0.5) * self.size.x, (0.5 - c.y / w * 0.5) * self.size.y)
    }
    pub fn field(&self, p: G2, y: f32) -> Pos2 {
        self.world(Vec3::new(p.x, y, p.y))
    }
}

/// An ECG sample at `phase` of a beat; `accent` scales the QRS on the bar's first beat.
pub fn ecg(phase: f32, accent: f32) -> f32 {
    let g = |c: f32, w: f32, h: f32| h * (-((phase - c) / w).powi(2)).exp();
    g(0.0, 0.016, 1.0 * accent) + g(1.0, 0.016, 1.0 * accent) - g(0.045, 0.02, 0.26 * accent) - g(0.955, 0.012, 0.16) + g(0.28, 0.06, 0.26) + g(0.82, 0.035, 0.1)
}

pub struct HudCx<'a> {
    pub device: Device,
    pub xbox: bool,
    pub seen: &'a mut Vec<String>,
    pub texts: &'a mut Vec<String>,
    pub names: &'a [String; 4],
    pub local: usize,
    pub chart_open: bool,
    pub cameos: &'a mut HashMap<String, Vec<PartGeo>>,
    pub overlays: bool,
    pub time: f32,
}

fn t(p: &Painter, cx: &mut HudCx, at: Pos2, a: Align2, s: &str, size: f32, c: Color32) -> Rect {
    cx.texts.push(s.to_string());
    text(p, at, a, s, size, c)
}

pub fn mm_ss(s: f32) -> String {
    let s = s.max(0.0) as i32;
    format!("{:01}:{:02}", s / 60, s % 60)
}

// -------------------------------------------------------------------------------------------

/// A rig flattened into egui meshes: the HUD's speaker cameo.
pub fn cameo(p: &Painter, cx: &mut HudCx, r: Rect, rig_id: &str, talking: bool) {
    let c = content();
    let Some(rig) = c.rigs.get(rig_id) else { return };
    if !cx.cameos.contains_key(rig_id) {
        cx.cameos.insert(rig_id.to_string(), rig_parts(&c, rig));
    }
    let parts = &cx.cameos[rig_id];
    let pose = pose_for(rig.expr.get("neutral"), cx.time, rig_id.len() as f32, talking);
    let scale = r.height() / 3.1;
    let origin = r.center() + vec2(0.0, r.height() * 0.1);
    let to = |q: G2| origin + vec2(q.x * scale, -q.y * scale);
    p.rect_filled(r, 12.0, Color32::from_rgb(28, 64, 70));
    let clip = p.with_clip_rect(r);
    for part in parts {
        let col = Color32::from_rgb(part.color[0], part.color[1], part.color[2]);
        let mut mesh = Mesh::default();
        for q in &part.outline.points {
            mesh.colored_vertex(to(posed(part, &pose, *q)), col);
        }
        for tri in part.outline.tris.chunks(3) {
            mesh.add_triangle(tri[0], tri[1], tri[2]);
        }
        clip.add(egui::Shape::mesh(mesh));
    }
    let m = outline(&mouth_points("closed", talking, pose.flap), 1);
    let mut mesh = Mesh::default();
    for q in &m.points {
        mesh.colored_vertex(to(*q + pose.head), Color32::from_rgb(90, 24, 30));
    }
    for tri in m.tris.chunks(3) {
        mesh.add_triangle(tri[0], tri[1], tri[2]);
    }
    clip.add(egui::Shape::mesh(mesh));
    p.rect_stroke(r, 12.0, Stroke::new(3.0, TEAL_L), egui::StrokeKind::Inside);
}

fn who_name(id: &str) -> String {
    let c = content();
    match id {
        "narrator" => String::new(),
        _ => c.rigs.get(id).map(|r| r.name.clone()).unwrap_or_else(|| id.to_string()),
    }
}

// -------------------------------------------------------------------------------------------
// The operation

pub fn op_hud(p: &Painter, cx: &mut HudCx, f: &SurgeryFrame, screen: Rect, proj: &Proj) {
    let w = screen.width();
    let beat = (-f.beat * 5.0).exp();
    let stopped = f.stopped;

    // Low vitals: a red vignette pulsing on the beat.
    if f.crisis > 0.0 && !stopped {
        let a = (f.crisis * (70.0 + beat * 90.0)) as u8;
        vignette(p, screen, Color32::from_rgba_unmultiplied(200, 20, 24, a));
    }

    // Top left: the heart and the vitals.
    let hx = 74.0;
    let hy = 62.0;
    let size = 30.0 + if stopped { 0.0 } else { beat * 9.0 };
    heart_icon(p, pos2(hx, hy), size, if f.vitals < 35.0 { RED } else { Color32::from_rgb(240, 90, 90) });
    let vit = format!("{}", f.vitals.ceil() as i32);
    t(p, cx, pos2(hx + 50.0, hy - 2.0), Align2::LEFT_CENTER, &vit, 72.0, if f.vitals < 35.0 { RED } else { WHITE });
    bar(p, Rect::from_min_size(pos2(40.0, 112.0), vec2(260.0, 18.0)), f.vitals / 100.0, if f.vitals < 35.0 { RED } else { GREEN });
    t(p, cx, pos2(306.0, 58.0), Align2::LEFT_CENTER, &format!("{} BPM", f.bpm as i32), 34.0, DIM);
    if f.codes_left > 0 && !f.slots.is_empty() {
        t(p, cx, pos2(306.0, 100.0), Align2::LEFT_CENTER, &format!("CODES {}", f.codes_left), 30.0, DIM);
    }

    // Middle: the live ECG trace.
    let arming = f.slots.iter().any(|s| s.arming);
    let ecg_r = Rect::from_min_size(pos2(w * 0.5 - 390.0, 22.0), vec2(780.0, 106.0));
    ecg_strip(p, cx, f, ecg_r, stopped || arming);

    // Right: the countdown.
    let urgent = f.timer < 30.0;
    t(p, cx, pos2(w - 40.0, 66.0), Align2::RIGHT_CENTER, &mm_ss(f.timer), 84.0, if urgent { RED } else { WHITE });
    if let Some(fever) = f.fever {
        let r = Rect::from_min_size(pos2(w - 300.0, 112.0), vec2(260.0, 18.0));
        bar(p, r, fever / 110.0, lerp_color(GOLD, RED, (fever - 60.0) / 40.0));
        t(p, cx, pos2(w - 310.0, 121.0), Align2::RIGHT_CENTER, "FEVER", 30.0, if fever > 100.0 { RED } else { GOLD });
    }

    // The NOW line.
    if !f.now.is_empty() {
        let y = 160.0;
        let g = p.layout_no_wrap(f.now.clone(), egui::FontId::proportional(36.0), WHITE);
        let width = g.size().x + 120.0;
        let r = Rect::from_center_size(pos2(w * 0.5, y), vec2(width, 54.0));
        p.rect_filled(r, 10.0, Color32::from_rgba_unmultiplied(8, 18, 22, 190));
        cx.texts.push(f.now.clone());
        t(p, cx, r.left_center() + vec2(14.0, 0.0), Align2::LEFT_CENTER, "NOW", 30.0, TEAL_L);
        text(p, r.left_center() + vec2(72.0, 0.0), Align2::LEFT_CENTER, &f.now, 36.0, WHITE);
    }

    // World-anchored: guides and meters on the field.
    world_marks(p, cx, f, proj);

    // Bottom: the ring hint on the tray.
    let local = f.slots.get(cx.local);
    if let Some(s) = local {
        tray_hint(p, cx, f, s.ring_pos, proj, screen);
        gift_meter(p, cx, f, screen);
    }

    // Bottom left: the speaker's cameo and one short line.
    if let Some(c) = &f.callout {
        let a = ((4.5 - c.age).clamp(0.0, 0.4) / 0.4 * 255.0) as u8;
        let box_r = Rect::from_min_size(pos2(30.0, 790.0), vec2(620.0, 118.0));
        p.rect_filled(box_r, 14.0, Color32::from_rgba_unmultiplied(8, 18, 22, a.min(210)));
        let talking = (c.age * 34.0) < c.text.chars().count() as f32;
        cameo(p, cx, Rect::from_min_size(pos2(38.0, 798.0), vec2(102.0, 102.0)), &c.who, talking);
        let name = who_name(&c.who);
        t(p, cx, pos2(152.0, 814.0), Align2::LEFT_CENTER, &name, 30.0, TEAL_L);
        cx.texts.push(c.text.clone());
        wrapped(p, pos2(152.0, 830.0), &c.text, 31.0, WHITE, 488.0);
    }

    // World-anchored ratings and chains.
    for fl in &f.floats {
        let rise = fl.age * 70.0;
        let at = proj.field(fl.at, 0.8) - vec2(0.0, 40.0 + rise);
        let col = match fl.rating {
            3 => GOLD,
            2 => TEAL_L,
            1 => WHITE,
            0 => Color32::from_rgb(180, 170, 170),
            _ => Color32::from_rgb(150, 240, 255),
        };
        let pop = 1.0 + (0.18 - fl.age).max(0.0) * 2.5;
        let alpha = ((1.5 - fl.age) / 0.5).clamp(0.0, 1.0);
        let size = if fl.rating == 3 { 60.0 } else { 50.0 } * pop;
        let c2 = col.linear_multiply(alpha);
        t(p, cx, at, Align2::CENTER_CENTER, &fl.text, size, c2);
        if fl.on_beat {
            t(p, cx, at + vec2(0.0, 44.0), Align2::CENTER_CENTER, "ON BEAT", 34.0, Color32::from_rgb(255, 140, 180).linear_multiply(alpha));
        }
    }
    for (i, s) in f.slots.iter().enumerate() {
        if !s.active {
            continue;
        }
        let at = proj.field(s.cursor, 0.5);
        if s.chain >= 2 {
            t(p, cx, at + vec2(34.0, 26.0), Align2::LEFT_CENTER, &format!("×{}", s.chain), 32.0, GOLD);
        }
        let others = f.slots.iter().filter(|o| o.active).count() > 1;
        if others {
            let name = if cx.names[i].is_empty() {
                match (f.case, i) {
                    (7, 0) => "Mara".to_string(),
                    (7, 1) => "Pet".to_string(),
                    _ if s.bot => format!("Bot {}", i + 1),
                    _ => format!("Dr. {}", i + 1),
                }
            } else {
                cx.names[i].clone()
            };
            t(p, cx, at + vec2(34.0, -30.0), Align2::LEFT_CENTER, &name, 30.0, seat_color(i));
        }
    }
    // Co-op scores along the top right.
    let actives: Vec<usize> = (0..f.slots.len()).filter(|i| f.slots[*i].active).collect();
    if actives.len() > 1 {
        let mut y = 150.0;
        for i in &actives {
            t(p, cx, pos2(w - 40.0, y), Align2::RIGHT_CENTER, &format!("{}", f.slots[*i].score), 34.0, seat_color(*i));
            y += 38.0;
        }
    } else if let Some(s) = local {
        t(p, cx, pos2(w - 40.0, 150.0), Align2::RIGHT_CENTER, &format!("{}", s.score), 40.0, WHITE);
    }

    // The Code.
    if let Some(c) = &f.code {
        code_panel(p, cx, f, c, screen);
    }

    // Banners.
    if !f.banner.is_empty() && f.banner_t < 1.5 {
        let a = ((1.5 - f.banner_t) / 0.3).clamp(0.0, 1.0);
        let slam = 1.0 + (0.15 - f.banner_t).max(0.0) * 3.0;
        let col = match f.banner.as_str() {
            "CODE" | "VITALS CRITICAL" | "COMPLICATION" => RED,
            "OPERATION COMPLETE" => GOLD,
            _ => WHITE,
        };
        t(p, cx, pos2(w * 0.5, 430.0), Align2::CENTER_CENTER, &f.banner, 112.0 * slam, col.linear_multiply(a));
    }
    if f.stage == Stage::Complete && f.banner != "OPERATION COMPLETE" {
        t(p, cx, pos2(w * 0.5, 430.0), Align2::CENTER_CENTER, "OPERATION COMPLETE", 112.0, GOLD);
    }

    // The chart overlay.
    if cx.chart_open {
        chart_overlay(p, cx, f, screen);
    }
}

fn heart_icon(p: &Painter, c: Pos2, r: f32, col: Color32) {
    p.circle_filled(c + vec2(-r * 0.42, -r * 0.2), r * 0.52, col);
    p.circle_filled(c + vec2(r * 0.42, -r * 0.2), r * 0.52, col);
    p.add(egui::Shape::convex_polygon(
        vec![c + vec2(-r * 0.92, -r * 0.05), c + vec2(r * 0.92, -r * 0.05), c + vec2(0.0, r * 0.95)],
        col,
        Stroke::NONE,
    ));
}

fn vignette(p: &Painter, r: Rect, col: Color32) {
    let clear = Color32::TRANSPARENT;
    let th = 240.0;
    let mut mesh = Mesh::default();
    let mut quad = |a: Pos2, b: Pos2, c: Pos2, d: Pos2, ca: Color32, cb: Color32, cc: Color32, cd: Color32| {
        let i = mesh.vertices.len() as u32;
        mesh.colored_vertex(a, ca);
        mesh.colored_vertex(b, cb);
        mesh.colored_vertex(c, cc);
        mesh.colored_vertex(d, cd);
        mesh.add_triangle(i, i + 1, i + 2);
        mesh.add_triangle(i, i + 2, i + 3);
    };
    let (l, t_, rr, b) = (r.left(), r.top(), r.right(), r.bottom());
    quad(pos2(l, t_), pos2(rr, t_), pos2(rr, t_ + th), pos2(l, t_ + th), col, col, clear, clear);
    quad(pos2(l, b - th), pos2(rr, b - th), pos2(rr, b), pos2(l, b), clear, clear, col, col);
    quad(pos2(l, t_), pos2(l + th, t_), pos2(l + th, b), pos2(l, b), col, clear, clear, col);
    quad(pos2(rr - th, t_), pos2(rr, t_), pos2(rr, b), pos2(rr - th, b), clear, col, col, clear);
    p.add(egui::Shape::mesh(mesh));
}

fn ecg_strip(p: &Painter, cx: &mut HudCx, f: &SurgeryFrame, r: Rect, flat: bool) {
    p.rect_filled(r, 10.0, Color32::from_rgba_unmultiplied(4, 18, 16, 215));
    p.rect_stroke(r, 10.0, Stroke::new(2.0, Color32::from_rgb(30, 96, 86)), egui::StrokeKind::Inside);
    // Grid.
    for k in 1..12 {
        let x = r.left() + r.width() * k as f32 / 12.0;
        p.line_segment([pos2(x, r.top() + 4.0), pos2(x, r.bottom() - 4.0)], Stroke::new(1.0, Color32::from_rgb(16, 52, 46)));
    }
    let period = 60.0 / f.bpm.max(30.0);
    let span = 4.5; // seconds across the strip
    let n = 300;
    let col = if f.stopped { RED } else { Color32::from_rgb(100, 255, 170) };
    let mid = r.center().y + 22.0;
    let amp = r.height() * 0.5;
    let beat_now = f.beats as f32 + f.beat;
    let meter = f.meter.max(1) as i32;
    let mut pts = Vec::with_capacity(n + 1);
    for k in 0..=n {
        let s = k as f32 / n as f32;
        let back = (1.0 - s) * span;
        let b = beat_now - back / period;
        let phase = b.rem_euclid(1.0);
        // The nearest R wave's place in the bar makes the strain's meter visible.
        let beat_i = b.round() as i32 + f.bar as i32 - f.beats as i32;
        let accent = if beat_i.rem_euclid(meter) == 0 { 1.25 } else { 0.72 };
        let flat_here = flat && back < span * 0.5 || f.stopped;
        let v = if flat_here { 0.0 } else { ecg(phase, accent) };
        pts.push(pos2(r.left() + r.width() * s, mid - v * amp));
    }
    p.add(egui::Shape::line(pts, Stroke::new(3.0, col)));
    p.circle_filled(pos2(r.right() - 2.0, mid - if flat { 0.0 } else { ecg(f.beat, 1.0) * amp }), 5.0, Color32::WHITE);
    let tag = match f.meter {
        3 => "3/4",
        6 => "6/8",
        5 => "5/4",
        7 => "7/8",
        _ => "",
    };
    if !tag.is_empty() {
        t(p, cx, r.left_top() + vec2(14.0, 22.0), Align2::LEFT_CENTER, tag, 36.0, Color32::from_rgb(200, 150, 255));
    }
}

fn world_marks(p: &Painter, cx: &mut HudCx, f: &SurgeryFrame, proj: &Proj) {
    let pulse = 0.5 + 0.5 * (cx.time * 5.0).sin();
    let hover = f.slots.get(cx.local).map(|s| s.hover).unwrap_or(0);
    let tool = f.slots.get(cx.local).map(|s| s.tool).unwrap_or(0);
    for h in &f.hazards {
        if !h.visible() {
            continue;
        }
        let at = proj.field(h.spot(), 0.45);
        let radius_px = 42.0;
        let takes = h.takes();
        let valid = takes.map(|x| x as u8) == Some(tool) || (h.kind == Kind::Sac && tool == Tool::Suction as u8);
        // Early cases highlight the target; hovering always does.
        if f.guide && valid {
            p.circle_stroke(at, radius_px + pulse * 8.0, Stroke::new(3.0, Color32::from_rgba_unmultiplied(255, 240, 150, 200)));
        }
        if h.id == hover && valid {
            p.circle_stroke(at, radius_px * 0.8, Stroke::new(4.0, Color32::from_rgb(120, 255, 230)));
        }
        // The heat or frost ring.
        if h.fill > 0.02 && matches!(h.kind, Kind::Polyp | Kind::Nodule | Kind::Sac | Kind::Ember | Kind::Furnace) {
            let fill = h.fill.min(1.3);
            let start = -std::f32::consts::FRAC_PI_2;
            let col = if fill > 1.0 {
                RED
            } else if fill >= 0.8 {
                GREEN
            } else {
                GOLD
            };
            let track = Color32::from_rgba_unmultiplied(0, 0, 0, 160);
            arc(p, at, 48.0, 0.0, std::f32::consts::TAU, Stroke::new(10.0, track));
            arc(p, at, 48.0, start, start + fill.min(1.0) * std::f32::consts::TAU, Stroke::new(7.0, col));
            // The green band.
            arc(p, at, 58.0, start + 0.8 * std::f32::consts::TAU, start + std::f32::consts::TAU, Stroke::new(4.0, GREEN));
        }
        // Stitches left.
        if matches!(h.kind, Kind::Lacer | Kind::Bleeder) && h.n > 0 {
            t(p, cx, at + vec2(0.0, -46.0), Align2::CENTER_CENTER, &format!("{}/{}", h.n, h.need), 32.0, WHITE);
        }
        if h.kind == Kind::Tendril {
            bar(p, Rect::from_center_size(at + vec2(0.0, -70.0), vec2(220.0, 16.0)), h.prog, GOLD);
        }
        if h.kind == Kind::Patch || (h.kind == Kind::Tumor && h.stage == 2) {
            if h.prog > 0.0 {
                arc(p, at, 44.0, -1.57, -1.57 + h.prog.min(1.0) * std::f32::consts::TAU, Stroke::new(6.0, Color32::from_rgb(170, 240, 220)));
            }
        }
        if h.deadline > 0.0 && h.kind == Kind::Incision {
            t(p, cx, at + vec2(0.0, -40.0), Align2::CENTER_CENTER, &format!("{:.1}", h.deadline), 34.0, GOLD);
        }
        // A pull's axis, for forceps.
        if valid && matches!(h.kind, Kind::Object | Kind::Nodule | Kind::Tumor | Kind::Eye | Kind::Furnace | Kind::Tendril) && tool == Tool::Forceps as u8 {
            let d = G2::from_angle(h.ang);
            let a = proj.field(h.a + d * 0.35, 0.4);
            let b = proj.field(h.a + d * 1.5, 0.4);
            p.arrow(a, b - a, Stroke::new(4.0, Color32::from_rgba_unmultiplied(255, 255, 255, 200)));
        }
    }
    // The IV's green band at the port.
    if let Some(s) = f.slots.get(cx.local) {
        if s.tool == Tool::Iv as u8 {
            let at = proj.field(iv_port(), 1.0);
            let r = Rect::from_min_size(at + vec2(36.0, -90.0), vec2(30.0, 180.0));
            p.rect_filled(r, 8.0, Color32::from_rgba_unmultiplied(0, 0, 0, 200));
            let band = |v: f32| r.bottom() - r.height() * (v / 1.3);
            p.rect_filled(Rect::from_min_max(pos2(r.left(), band(1.0)), pos2(r.right(), band(0.82))), 0.0, Color32::from_rgb(70, 200, 110));
            p.line_segment([pos2(r.left() - 6.0, band(s.meter)), pos2(r.right() + 6.0, band(s.meter))], Stroke::new(5.0, WHITE));
            if f.iv_cd > 0.0 {
                t(p, cx, at + vec2(80.0, 0.0), Align2::LEFT_CENTER, &format!("{:.0}", f.iv_cd.ceil()), 36.0, DIM);
            }
        }
        if s.tool == Tool::Gel as u8 {
            let at = proj.field(s.cursor, 0.6);
            bar(p, Rect::from_center_size(at + vec2(0.0, 56.0), vec2(120.0, 12.0)), s.flow, Color32::from_rgb(170, 240, 220));
        }
    }
    if let Some(radius) = f.heat_ring {
        // The sweep on screen follows the stamped ring.
        let c = proj.field(G2::ZERO, 0.2);
        let edge = proj.field(G2::new(radius, 0.0), 0.2);
        p.circle_stroke(c, (edge.x - c.x).abs(), Stroke::new(3.0, Color32::from_rgba_unmultiplied(255, 180, 70, 90)));
    }
    if f.ring_warn > 0.0 {
        let w = proj.size.x;
        t(p, cx, pos2(w * 0.5, 250.0), Align2::CENTER_CENTER, "LIFT OFF!", 70.0, Color32::from_rgb(255, 170, 60));
    }
}

fn tray_hint(p: &Painter, cx: &mut HudCx, f: &SurgeryFrame, selected: u8, proj: &Proj, screen: Rect) {
    let name = f.ring_tool(selected as usize).name();
    let y_label = screen.bottom() - 34.0;
    for k in 0..8 {
        let slot = tray_slot(k);
        let at = proj.field(glam::Vec2::new(slot.x, TRAY_Z + 1.0), 1.0);
        let selected_here = k == selected as usize;
        let h = if selected_here { 44.0 } else { 36.0 };
        prompt(p, pos2(at.x - h * 0.5, y_label - if selected_here { 6.0 } else { 0.0 }), Action::Ring(k as u8), cx.device, cx.xbox, h, cx.seen);
    }
    // What's in hand.
    let tool = f.slots.get(cx.local).map(|s| Tool::from_u8(s.tool)).unwrap_or(Tool::Scalpel);
    let label = if matches!(tool, Tool::Dressing | Tool::Defib) { tool.name() } else { name };
    t(p, cx, pos2(screen.width() * 0.5, screen.bottom() - 186.0), Align2::CENTER_CENTER, label, 44.0, TEAL_L);
    // Use prompt beside the name.
    let g = screen.width() * 0.5 + 110.0;
    prompt(p, pos2(g, screen.bottom() - 186.0), Action::Use, cx.device, cx.xbox, 40.0, cx.seen);
}

fn gift_meter(p: &Painter, cx: &mut HudCx, f: &SurgeryFrame, screen: Rect) {
    let Some(s) = f.slots.get(cx.local) else { return };
    if s.gift_kind == 0 || f.gift_locked {
        return;
    }
    let meter = if s.gift_kind == 3 { f.slots[0].gift } else { s.gift };
    let label = match s.gift_kind {
        1 => "THE HUSH",
        2 => "THE ECHO",
        _ => "THE DUET",
    };
    let (x, y) = (screen.right() - 330.0, screen.bottom() - 130.0);
    let ready = meter >= 100.0;
    let col = if ready { lerp_color(GOLD, WHITE, (-f.beat * 5.0).exp()) } else { TEAL };
    t(p, cx, pos2(x, y - 30.0), Align2::LEFT_CENTER, label, 36.0, col);
    bar(p, Rect::from_min_size(pos2(x, y), vec2(290.0, 24.0)), meter / 100.0, col);
    if f.hush > 0.0 {
        t(p, cx, pos2(x, y + 50.0), Align2::LEFT_CENTER, "HUSH", 34.0, WHITE);
        bar(p, Rect::from_min_size(pos2(x + 80.0, y + 42.0), vec2(210.0, 16.0)), f.hush, WHITE);
    } else if f.echo > 0.0 {
        t(p, cx, pos2(x, y + 50.0), Align2::LEFT_CENTER, &format!("ECHO {:.0}", f.echo), 34.0, Color32::from_rgb(150, 230, 255));
    } else if ready {
        let w = prompt(p, pos2(x, y + 50.0), Action::Gift, cx.device, cx.xbox, 40.0, cx.seen);
        let msg = if s.arming { "Let go on the heartbeat" } else { "Hold, let go on the beat" };
        t(p, cx, pos2(x + w + 6.0, y + 50.0), Align2::LEFT_CENTER, msg, 30.0, WHITE);
    }
}

fn code_panel(p: &Painter, cx: &mut HudCx, f: &SurgeryFrame, c: &pav_core::games::surgery::field::Code, screen: Rect) {
    let w = screen.width();
    let r = Rect::from_center_size(pos2(w * 0.5, 610.0), vec2(860.0, 230.0));
    p.rect_filled(r, 16.0, Color32::from_rgba_unmultiplied(40, 4, 8, 228));
    p.rect_stroke(r, 16.0, Stroke::new(4.0, RED), egui::StrokeKind::Inside);
    let title = if c.shocks > 1 { format!("SHOCK HIM: {} TO GO", c.shocks) } else { "CODE: DEFIBRILLATE".to_string() };
    t(p, cx, r.center_top() + vec2(0.0, 40.0), Align2::CENTER_CENTER, &title, 52.0, WHITE);
    t(p, cx, r.right_top() + vec2(-24.0, 40.0), Align2::RIGHT_CENTER, &format!("{:.1}", c.left.max(0.0)), 52.0, RED);
    // The ghost beat crosses the centre.
    let line_y = r.center().y + 12.0;
    let (l, rr) = (r.left() + 60.0, r.right() - 60.0);
    p.line_segment([pos2(l, line_y), pos2(rr, line_y)], Stroke::new(3.0, Color32::from_rgb(120, 40, 44)));
    let mid = (l + rr) * 0.5;
    let window = (rr - l) * 0.2 / 0.9;
    p.rect_filled(Rect::from_center_size(pos2(mid, line_y), vec2(window, 46.0)), 8.0, Color32::from_rgba_unmultiplied(110, 230, 150, 110));
    let x = l + (rr - l) * c.ghost;
    p.circle_filled(pos2(x, line_y), 16.0, WHITE);
    heart_icon(p, pos2(mid, line_y), 14.0, RED);
    // Charge.
    let charge = f.slots.get(cx.local).map(|s| s.charge).unwrap_or(0.0);
    bar(p, Rect::from_min_size(pos2(l, r.bottom() - 60.0), vec2(rr - l - 340.0, 22.0)), charge, if charge >= 1.0 { GREEN } else { GOLD });
    let gx = rr - 320.0;
    let used = prompt(p, pos2(gx, r.bottom() - 50.0), Action::Defib, cx.device, cx.xbox, 42.0, cx.seen);
    let msg = if charge >= 1.0 { "Let go on the beat" } else { "Hold to charge" };
    t(p, cx, pos2(gx + used + 4.0, r.bottom() - 50.0), Align2::LEFT_CENTER, msg, 30.0, WHITE);
}

fn chart_overlay(p: &Painter, cx: &mut HudCx, f: &SurgeryFrame, screen: Rect) {
    let r = Rect::from_center_size(screen.center(), vec2(900.0, 460.0));
    card(p, r, Color32::from_rgb(232, 228, 212), Color32::from_rgb(90, 100, 96));
    let ink = Color32::from_rgb(30, 34, 38);
    p.text(r.left_top() + vec2(40.0, 40.0), Align2::LEFT_TOP, &f.patient, egui::FontId::proportional(60.0), ink);
    cx.texts.push(f.patient.clone());
    let mut y = 120.0;
    y += wrapped(p, r.left_top() + vec2(40.0, y), &f.life, 34.0, ink, 820.0) + 18.0;
    y += wrapped(p, r.left_top() + vec2(40.0, y), &f.diagnosis, 34.0, ink, 820.0) + 18.0;
    wrapped(p, r.left_top() + vec2(40.0, y), &f.now, 34.0, Color32::from_rgb(170, 30, 40), 820.0);
}

// -------------------------------------------------------------------------------------------
// The chart card before an operation

pub fn chart_card(p: &Painter, cx: &mut HudCx, f: &SurgeryFrame, screen: Rect) {
    let slide = ((f.stage_t) / 0.35).clamp(0.0, 1.0);
    let offset = (1.0 - slide) * (1.0 - slide) * 900.0;
    let r = Rect::from_center_size(screen.center() + vec2(0.0, offset), vec2(1120.0, 640.0));
    p.rect_filled(screen, 0.0, Color32::from_rgba_unmultiplied(0, 0, 0, 120));
    card(p, r, Color32::from_rgb(232, 228, 212), Color32::from_rgb(90, 100, 96));
    let ink = Color32::from_rgb(30, 34, 38);
    let name = format!("CASE {}: {}", f.case, f.case_name.to_uppercase());
    cx.texts.push(name.clone());
    p.text(r.left_top() + vec2(48.0, 34.0), Align2::LEFT_TOP, &name, egui::FontId::proportional(58.0), Color32::from_rgb(20, 90, 90));
    p.text(r.left_top() + vec2(48.0, 118.0), Align2::LEFT_TOP, &f.patient, egui::FontId::proportional(70.0), ink);
    cx.texts.push(f.patient.clone());
    let mut y = 210.0;
    y += wrapped(p, r.left_top() + vec2(48.0, y), &f.life, 38.0, ink, 1020.0) + 24.0;
    p.text(r.left_top() + vec2(48.0, y), Align2::LEFT_TOP, "DIAGNOSIS", egui::FontId::proportional(32.0), Color32::from_rgb(170, 30, 40));
    y += 42.0;
    wrapped(p, r.left_top() + vec2(48.0, y), &f.diagnosis, 38.0, ink, 1020.0);
    let at = r.left_bottom() + vec2(48.0, -56.0);
    let w = prompt(p, at, Action::Confirm, cx.device, cx.xbox, 48.0, cx.seen);
    p.text(at + vec2(w + 8.0, 0.0), Align2::LEFT_CENTER, "Scrub in", egui::FontId::proportional(40.0), ink);
    cx.texts.push("Scrub in".into());
}

// -------------------------------------------------------------------------------------------
// The story box

pub fn story_box(p: &Painter, cx: &mut HudCx, f: &SurgeryFrame, screen: Rect, pointer_hint: bool) {
    let Some(st) = &f.story else { return };
    let w = screen.width();
    let r = Rect::from_min_size(pos2(w * 0.5 - 760.0, 758.0), vec2(1520.0, 280.0));
    if st.text.is_empty() {
        return;
    }
    p.rect_filled(r, 16.0, Color32::from_rgba_unmultiplied(6, 14, 18, 234));
    p.rect_stroke(r, 16.0, Stroke::new(3.0, Color32::from_rgb(60, 130, 130)), egui::StrokeKind::Inside);
    let name = who_name(&st.who);
    let mut text_y = r.top() + 26.0;
    if !name.is_empty() {
        let c = content();
        let col = c.rigs.get(&st.who).and_then(|rig| rig.colors.get("scrubs")).map(|h| {
            let v = u32::from_str_radix(h.trim_start_matches('#'), 16).unwrap_or(0);
            lerp_color(Color32::from_rgb((v >> 16) as u8, (v >> 8) as u8, v as u8), WHITE, 0.45)
        });
        t(p, cx, r.left_top() + vec2(36.0, 34.0), Align2::LEFT_CENTER, &name, 44.0, col.unwrap_or(TEAL_L));
        text_y += 42.0;
    }
    let shown: String = st.text.chars().take(st.typed as usize).collect();
    cx.texts.push(st.text.clone());
    let italic = name.is_empty();
    let col = if italic { Color32::from_rgb(200, 216, 214) } else { WHITE };
    wrapped(p, pos2(r.left() + 36.0, text_y), &shown, 42.0, col, r.width() - 72.0);
    // The advance prompt (a real click target: the whole box).
    let done = st.typed as usize >= st.text.chars().count();
    if done {
        let at = r.right_bottom() + vec2(-82.0, -40.0);
        prompt(p, at, Action::Confirm, cx.device, cx.xbox, 46.0, cx.seen);
    }
    let _ = pointer_hint;
    // Hold to skip, backlog, auto.
    let at = r.left_bottom() + vec2(36.0, -30.0);
    let used = prompt(p, at, Action::Skip, cx.device, cx.xbox, 34.0, cx.seen);
    t(p, cx, at + vec2(used + 4.0, 0.0), Align2::LEFT_CENTER, "hold: skip", 30.0, DIM);
    let at2 = at + vec2(used + 170.0, 0.0);
    let used2 = prompt(p, at2, Action::Chart, cx.device, cx.xbox, 34.0, cx.seen);
    t(p, cx, at2 + vec2(used2 + 4.0, 0.0), Align2::LEFT_CENTER, "backlog", 30.0, DIM);
    let at3 = at2 + vec2(used2 + 140.0, 0.0);
    let used3 = prompt(p, at3, Action::Auto, cx.device, cx.xbox, 34.0, cx.seen);
    t(p, cx, at3 + vec2(used3 + 4.0, 0.0), Align2::LEFT_CENTER, if st.auto { "auto: on" } else { "auto: off" }, 30.0, if st.auto { GOLD } else { DIM });
    if st.skip > 0.0 {
        arc(p, at + vec2(17.0, 0.0), 26.0, -1.57, -1.57 + st.skip * std::f32::consts::TAU, Stroke::new(5.0, GOLD));
    }
    if st.flash > 0.0 {
        p.rect_filled(screen, 0.0, Color32::from_rgba_unmultiplied(255, 255, 255, (st.flash * 60.0) as u8));
    }
}

/// The backlog: the last few lines of the scene.
pub fn backlog(p: &Painter, cx: &mut HudCx, f: &SurgeryFrame, screen: Rect) {
    let Some(st) = &f.story else { return };
    let c = content();
    let Some(scene) = c.scenes.get(st.scene as usize) else { return };
    let r = Rect::from_center_size(screen.center(), vec2(1500.0, 880.0));
    card(p, r, PANEL, TEAL);
    t(p, cx, r.left_top() + vec2(40.0, 42.0), Align2::LEFT_CENTER, "BACKLOG", 52.0, TEAL_L);
    let spoken: Vec<_> = scene.line.iter().take(st.line as usize + 1).filter(|l| l.text.is_some()).collect();
    let mut y = r.top() + 90.0;
    for l in spoken.iter().rev().take(5).rev() {
        let who = l.who.as_deref().map(who_name).unwrap_or_default();
        if !who.is_empty() {
            p.text(pos2(r.left() + 40.0, y), Align2::LEFT_TOP, &who, egui::FontId::proportional(32.0), TEAL_L);
            y += 38.0;
        }
        let line = l.text.as_deref().unwrap_or("");
        cx.texts.push(line.to_string());
        y += wrapped(p, pos2(r.left() + 40.0, y), line, 34.0, WHITE, 1420.0) + 12.0;
    }
    let at = r.left_bottom() + vec2(40.0, -36.0);
    let used = prompt(p, at, Action::Back, cx.device, cx.xbox, 40.0, cx.seen);
    t(p, cx, at + vec2(used + 4.0, 0.0), Align2::LEFT_CENTER, "Close", 34.0, WHITE);
}

// -------------------------------------------------------------------------------------------
// Results and death

pub fn results(p: &Painter, cx: &mut HudCx, f: &SurgeryFrame, screen: Rect) {
    let Some(res) = &f.results else { return };
    let tt = res.t;
    p.rect_filled(screen, 0.0, Color32::from_rgba_unmultiplied(0, 0, 0, 150));
    let slide = (tt / 0.35).clamp(0.0, 1.0);
    let off = (1.0 - slide) * (1.0 - slide) * 1000.0;
    let r = Rect::from_center_size(screen.center() + vec2(off, 0.0), vec2(1240.0, 900.0));
    card(p, r, Color32::from_rgb(232, 228, 212), Color32::from_rgb(90, 100, 96));
    let ink = Color32::from_rgb(30, 34, 38);
    let left = r.left() + 56.0;
    let title = format!("{}", res.title.to_uppercase());
    cx.texts.push(title.clone());
    p.text(pos2(left, r.top() + 32.0), Align2::LEFT_TOP, &title, egui::FontId::proportional(64.0), Color32::from_rgb(20, 90, 90));
    p.text(pos2(left, r.top() + 112.0), Align2::LEFT_TOP, &res.patient, egui::FontId::proportional(46.0), ink);
    cx.texts.push(res.patient.clone());
    let mut y = r.top() + 196.0;
    for (i, (label, v)) in res.lines.iter().enumerate() {
        let at_time = 0.45 + i as f32 * 0.32;
        if tt < at_time {
            break;
        }
        cx.texts.push(label.clone());
        p.text(pos2(left, y), Align2::LEFT_TOP, label, egui::FontId::proportional(40.0), ink);
        p.text(pos2(r.left() + 860.0, y), Align2::RIGHT_TOP, &format!("{v}"), egui::FontId::proportional(44.0), ink);
        y += 60.0;
    }
    if tt > 1.75 {
        p.line_segment([pos2(left, y + 4.0), pos2(r.left() + 860.0, y + 4.0)], Stroke::new(3.0, ink));
        p.text(pos2(left, y + 14.0), Align2::LEFT_TOP, "TOTAL", egui::FontId::proportional(50.0), ink);
        p.text(pos2(r.left() + 860.0, y + 14.0), Align2::RIGHT_TOP, &format!("{}", res.total), egui::FontId::proportional(56.0), ink);
        cx.texts.push("TOTAL".into());
    }
    // The stamp slams.
    if tt > 2.2 {
        let s = (tt - 2.2) / 0.16;
        let slam = 1.0 + (1.0 - s.clamp(0.0, 1.0)) * 1.8;
        let c = pos2(r.right() - 190.0, r.top() + 360.0);
        let col = match res.rank.as_str() {
            "ENCORE" => Color32::from_rgb(190, 130, 20),
            "S" => Color32::from_rgb(170, 30, 40),
            "A" => Color32::from_rgb(160, 60, 40),
            _ => Color32::from_rgb(90, 90, 90),
        };
        let size = if res.rank.len() > 2 { 74.0 } else { 170.0 } * slam;
        p.circle_stroke(c, 136.0 * slam, Stroke::new(9.0 * slam, col));
        cx.texts.push(res.rank.clone());
        p.text(c, Align2::CENTER_CENTER, &res.rank, egui::FontId::proportional(size), col);
    }
    if tt > 2.5 {
        cx.texts.push(res.fate.clone());
        wrapped(p, pos2(left, r.bottom() - 220.0), &res.fate, 40.0, ink, 1100.0);
        let at = r.left_bottom() + vec2(56.0, -56.0);
        let used = prompt(p, at, Action::Confirm, cx.device, cx.xbox, 48.0, cx.seen);
        p.text(at + vec2(used + 8.0, 0.0), Align2::LEFT_CENTER, "Continue", egui::FontId::proportional(40.0), ink);
    }
}

pub fn death(p: &Painter, cx: &mut HudCx, f: &SurgeryFrame, screen: Rect, retry_label: bool) {
    let a = ((f.stage_t) * 2.0).clamp(0.0, 1.0);
    p.rect_filled(screen, 0.0, Color32::from_rgba_unmultiplied(0, 0, 0, (a * 255.0) as u8));
    let c = screen.center();
    // The flat line.
    p.line_segment([pos2(screen.left(), c.y - 170.0), pos2(screen.right(), c.y - 170.0)], Stroke::new(3.0, RED.linear_multiply(a)));
    t(p, cx, c - vec2(0.0, 60.0), Align2::CENTER_CENTER, &f.death_time, 92.0, WHITE.linear_multiply(a));
    if f.stage_t > 0.5 && retry_label {
        let at = c + vec2(-280.0, 90.0);
        let used = prompt(p, at, Action::Confirm, cx.device, cx.xbox, 48.0, cx.seen);
        t(p, cx, at + vec2(used + 8.0, 0.0), Align2::LEFT_CENTER, "Retry from the checkpoint", 44.0, WHITE);
        let at = c + vec2(-280.0, 160.0);
        let used = prompt(p, at, Action::Cancel, cx.device, cx.xbox, 48.0, cx.seen);
        t(p, cx, at + vec2(used + 8.0, 0.0), Align2::LEFT_CENTER, "Start the operation again", 44.0, WHITE);
    }
}
