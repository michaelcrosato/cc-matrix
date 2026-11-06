//! Draws a `UiFrame`, on any screen: the frame is in a 1920x1080 space, scaled by
//! `min(w/1920, h/1080)` and centred, so a hub's small frame gets the same screen. Reports what the
//! pointer did to its items. Holds no state: everything shown comes from the sim.

use std::sync::Arc;

use egui::{Align2, Color32, FontData, FontDefinitions, FontFamily, FontId, Painter, Pos2, Rect, Shape, Stroke, StrokeKind, pos2, vec2};
use glam::{Mat4, Vec3, Vec4};
use pav_core::games::fit::ui_model::*;

use crate::Device;

/// What the pointer did this frame.
#[derive(Clone, Debug, Default)]
pub struct Out {
    pub hover: Option<u16>,
    pub click: Option<u16>,
    pub slider: Option<(u16, f32)>,
    /// Item rects, in window points, for the page's tests.
    pub rects: Vec<(u16, [f32; 4])>,
    /// The pointer is on an item, so a press there is not for the world.
    pub over: bool,
}

pub const TITLE_FONT: &str = "fit_title";
pub const BODY_FONT: &str = "fit_body";

/// Puts the game's fonts in. A font family used in the same pass as `set_fonts` panics, so call
/// this before the first pass.
pub fn install_fonts(ctx: &egui::Context) {
    let mut f = FontDefinitions::default();
    f.font_data.insert(TITLE_FONT.into(), Arc::new(FontData::from_static(include_bytes!("../fonts/Fredoka_600SemiBold.ttf"))));
    f.font_data.insert(BODY_FONT.into(), Arc::new(FontData::from_static(include_bytes!("../fonts/Nunito_700Bold.ttf"))));
    f.families.insert(FontFamily::Name(TITLE_FONT.into()), vec![TITLE_FONT.into(), BODY_FONT.into()]);
    f.families.insert(FontFamily::Name(BODY_FONT.into()), vec![BODY_FONT.into()]);
    ctx.set_fonts(f);
}

fn c(x: Rgba) -> Color32 {
    Color32::from_rgba_unmultiplied(x[0], x[1], x[2], x[3])
}

/// The 1920x1080 space in the window.
#[derive(Clone, Copy)]
struct Space {
    k: f32,
    ox: f32,
    oy: f32,
    size: egui::Vec2,
}

impl Space {
    fn p(&self, a: [f32; 2]) -> Pos2 {
        pos2(self.ox + a[0] * self.k, self.oy + a[1] * self.k)
    }
    fn r(&self, a: [f32; 4]) -> Rect {
        Rect::from_min_max(self.p([a[0], a[1]]), self.p([a[2], a[3]]))
    }
    fn s(&self, x: f32) -> f32 {
        x * self.k
    }
}

fn font(sp: &Space, size: f32, title: bool) -> FontId {
    FontId::new(sp.s(size), FontFamily::Name(if title { TITLE_FONT } else { BODY_FONT }.into()))
}

fn text(p: &Painter, sp: &Space, at: [f32; 2], size: f32, color: Color32, align: u8, title: bool, s: &str, wrap: f32) {
    let w = if wrap > 0.0 { sp.s(wrap) } else { f32::INFINITY };
    let g = p.layout(s.to_string(), font(sp, size, title), color, w);
    let at = sp.p(at);
    let x = match align {
        1 => at.x - if wrap > 0.0 { w * 0.5 } else { g.size().x * 0.5 },
        2 => at.x - g.size().x,
        _ => at.x,
    };
    p.galley(pos2(x, at.y), g, color);
}

/// Width a text takes, in 1080p units.
fn width(p: &Painter, sp: &Space, size: f32, title: bool, s: &str) -> f32 {
    p.layout_no_wrap(s.to_string(), font(sp, size, title), Color32::WHITE).size().x / sp.k.max(1e-3)
}

fn star(p: &Painter, c0: Pos2, r: f32, fill: Color32) {
    let at = |i: i32, rr: f32| {
        let a = -std::f32::consts::FRAC_PI_2 + i as f32 * std::f32::consts::TAU / 10.0;
        c0 + vec2(a.cos(), a.sin()) * rr
    };
    for i in 0..5 {
        let k = i * 2;
        p.add(Shape::convex_polygon(vec![at(k, r), at(k + 1, r * 0.42), at(k - 1, r * 0.42)], fill, Stroke::NONE));
    }
    p.add(Shape::convex_polygon((0..5).map(|i| at(i * 2 + 1, r * 0.42)).collect(), fill, Stroke::NONE));
}

/// Draws a frame and reads the pointer. `mouse`: the mouse was used last among keys and mouse.
pub fn draw(ctx: &egui::Context, f: &UiFrame, device: Device, mouse: bool, vp: Mat4) -> Out {
    let screen = ctx.content_rect();
    let size = screen.size();
    let k = (size.x / 1920.0).min(size.y / 1080.0);
    let sp = Space { k, ox: (size.x - 1920.0 * k) * 0.5, oy: (size.y - 1080.0 * k) * 0.5, size };
    let p = ctx.layer_painter(egui::LayerId::new(egui::Order::Foreground, egui::Id::new("fit_ui")));
    // A finger comes and goes within one frame, so the release's own position decides a click.
    let (pointer, release, down) = ctx.input(|i| {
        let release = i.events.iter().rev().find_map(|e| match e {
            egui::Event::PointerButton { pos, button: egui::PointerButton::Primary, pressed: false, .. } => Some(*pos),
            _ => None,
        });
        (i.pointer.hover_pos().or(release), release, i.pointer.primary_down())
    });
    let style = glyphs::Style { device, mouse, xbox: f.xbox };
    let mut out = Out::default();
    for item in &f.items {
        match item {
            Ui::Tint { color } => {
                p.rect_filled(screen, 0.0, c(*color));
            }
            Ui::Card { rect, color, radius, shadow } => {
                let r = sp.r(*rect);
                if *shadow {
                    p.rect_filled(r.translate(vec2(0.0, sp.s(10.0))).expand(sp.s(4.0)), sp.s(*radius), Color32::from_rgba_unmultiplied(38, 62, 84, 40));
                }
                p.rect_filled(r, sp.s(*radius), c(*color));
            }
            Ui::Text { pos, size, color, align, title, text: s, wrap } => text(&p, &sp, *pos, *size, c(*color), *align, *title, s, *wrap),
            Ui::Button { id, rect, label, sub, focused, stars, value, fill, big } => {
                let mut r = sp.r(*rect);
                out.rects.push((*id, [r.min.x, r.min.y, r.max.x, r.max.y]));
                let hovered = pointer.is_some_and(|q| r.contains(q));
                if hovered {
                    out.over = true;
                    out.hover = Some(*id);
                    if release.is_some_and(|q| r.contains(q)) {
                        out.click = Some(*id);
                    }
                    if down && fill.is_some() {
                        if let Some(q) = pointer {
                            // The slider's track is the right half of the row.
                            let track = track_of(r);
                            if q.x >= track.min.x - sp.s(20.0) {
                                out.slider = Some((*id, ((q.x - track.min.x) / track.width()).clamp(0.0, 1.0)));
                                out.click = None;
                            }
                        }
                    }
                }
                if *focused {
                    // Scale 1.05 and a soft bounce, from the sim's clock-free egui time.
                    let bounce = 1.0 + 0.2 * (ctx.input(|i| i.time) as f32 * 5.0).sin();
                    r = r.expand2(r.size() * 0.025 * bounce);
                    p.rect_filled(r.translate(vec2(0.0, sp.s(8.0))), sp.s(36.0), Color32::from_rgba_unmultiplied(38, 62, 84, 50));
                }
                p.rect_filled(r, sp.s(36.0), c(WHITE));
                if *focused {
                    p.rect_stroke(r, sp.s(36.0), Stroke::new(sp.s(8.0), c(TEAL)), StrokeKind::Inside);
                }
                let mid = (rect[1] + rect[3]) * 0.5;
                let x = rect[0] + 44.0;
                let ink = c(INK);
                let label_size = if *big { 60.0 } else { 44.0 };
                let has_sub = !sub.is_empty();
                if *big || (*id >= 1000 && fill.is_none()) || (fill.is_none() && value.is_empty() && !has_sub && *id < 1000 && rect[2] - rect[0] < 900.0) {
                    text(&p, &sp, [(rect[0] + rect[2]) * 0.5, mid - label_size * 0.62], label_size, ink, 1, false, label, 0.0);
                } else if has_sub {
                    text(&p, &sp, [x, rect[1] - 2.0], label_size * 0.92, ink, 0, false, label, 0.0);
                    text(&p, &sp, [x, rect[1] + 44.0], 34.0, c(MUTED), 0, false, sub, 0.0);
                } else {
                    text(&p, &sp, [x, mid - label_size * 0.62], label_size, ink, 0, false, label, 0.0);
                }
                let right = rect[2] - 44.0;
                if *stars >= 0 {
                    for s in 0..3 {
                        let col = if s < *stars { c(SUN) } else { c(PALE) };
                        star(&p, sp.p([right - (2 - s) as f32 * 52.0 - 20.0, mid]), sp.s(26.0), col);
                    }
                } else if let Some(v) = fill {
                    let t = track_of(r);
                    p.rect_filled(t, t.height() * 0.5, c(PALE));
                    let mut on = t;
                    on.set_width(t.width() * v.clamp(0.0, 1.0));
                    p.rect_filled(on, t.height() * 0.5, c(TEAL));
                    p.circle(pos2(t.min.x + t.width() * v, t.center().y), t.height() * 0.8, c(WHITE), Stroke::new(sp.s(4.0), c(TEAL)));
                    text(&p, &sp, [right, mid - 40.0], 34.0, ink, 2, false, value, 0.0);
                } else if !value.is_empty() {
                    text(&p, &sp, [right, mid - 26.0], 40.0, c(TEAL), 2, false, value, 0.0);
                }
            }
            Ui::Prompt { pos, align, glyphs: gs, label, size } => {
                let gw: f32 = gs.iter().map(|g| glyphs::width(&p, &sp.into(), *g, &style, *size)).sum::<f32>() + (gs.len() as f32 - 1.0).max(0.0) * 10.0;
                let lw = if label.is_empty() { 0.0 } else { width(&p, &sp, *size, false, label) + 14.0 };
                let total = gw + lw;
                let x0 = match align {
                    1 => pos[0] - total * 0.5,
                    2 => pos[0] - total,
                    _ => pos[0],
                };
                let bg = sp.r([x0 - 18.0, pos[1] - 6.0, x0 + total + 18.0, pos[1] + size * 1.45]);
                p.rect_filled(bg, sp.s(24.0), Color32::from_rgba_unmultiplied(255, 255, 255, 215));
                let mut x = x0;
                for g in gs {
                    let w = glyphs::width(&p, &sp.into(), *g, &style, *size);
                    glyphs::draw(&p, &sp.into(), [x, pos[1]], *g, &style, *size);
                    x += w + 10.0;
                }
                if !label.is_empty() {
                    text(&p, &sp, [x + 4.0, pos[1] - 4.0], (*size).max(MIN_BODY), c(INK), 0, false, label, 0.0);
                }
            }
            Ui::WorldRing { at, r } => {
                let project = |w: [f32; 3]| {
                    let v = vp * Vec4::new(w[0], w[1], w[2], 1.0);
                    (v.w > 0.0).then(|| {
                        let n = v.truncate() / v.w;
                        pos2((n.x * 0.5 + 0.5) * sp.size.x, (0.5 - n.y * 0.5) * sp.size.y)
                    })
                };
                // Round the ring by points on the ground.
                let pts: Vec<Pos2> = (0..28)
                    .filter_map(|i| {
                        let a = i as f32 / 28.0 * std::f32::consts::TAU;
                        project([at[0] + a.cos() * r, at[1], at[2] + a.sin() * r])
                    })
                    .collect();
                if pts.len() == 28 {
                    p.add(Shape::closed_line(pts, Stroke::new(sp.s(7.0), c(TEAL))));
                }
            }
            Ui::WorldLabel { at, text: s } => {
                let v = vp * Vec4::new(at[0], at[1], at[2], 1.0);
                if v.w > 0.0 {
                    let n = v.truncate() / v.w;
                    let wx = (n.x * 0.5 + 0.5) * sp.size.x;
                    let wy = (0.5 - n.y * 0.5) * sp.size.y;
                    p.text(pos2(wx, wy), Align2::CENTER_BOTTOM, s, font(&sp, 40.0, false), c(INK));
                }
            }
            Ui::WorldPrompt { at, glyph, label } => {
                let v = vp * Vec4::new(at[0], at[1], at[2], 1.0);
                if v.w <= 0.0 {
                    continue;
                }
                let n = v.truncate() / v.w;
                let wx = (n.x * 0.5 + 0.5) * sp.size.x;
                let wy = (0.5 - n.y * 0.5) * sp.size.y;
                let x = (wx - sp.ox) / sp.k;
                let y = (wy - sp.oy) / sp.k;
                let sz = 42.0;
                let gw = glyphs::width(&p, &sp.into(), *glyph, &style, sz);
                let lw = width(&p, &sp, sz, false, label);
                let tw = gw + 14.0 + lw;
                let x0 = (x - tw * 0.5).clamp(30.0, 1890.0 - tw);
                let bar = sp.r([x0 - 22.0, y - 12.0, x0 + tw + 22.0, y + 66.0]);
                p.rect_filled(bar, sp.s(30.0), Color32::from_rgba_unmultiplied(255, 255, 255, 235));
                p.rect_stroke(bar, sp.s(30.0), Stroke::new(sp.s(4.0), c(TEAL)), StrokeKind::Inside);
                glyphs::draw(&p, &sp.into(), [x0, y], *glyph, &style, sz);
                text(&p, &sp, [x0 + gw + 14.0, y - 4.0], sz, c(INK), 0, false, label, 0.0);
            }
            Ui::Puck { center, r, dot, ring, band, stars, trace } => {
                let ct = sp.p(*center);
                let rad = sp.s(*r);
                p.circle(ct + vec2(0.0, sp.s(8.0)), rad, Color32::from_rgba_unmultiplied(38, 62, 84, 50), Stroke::NONE);
                p.circle(ct, rad, c(DECK), Stroke::new(sp.s(8.0), c(INK)));
                if let Some(h) = band {
                    let w = rad * h;
                    p.rect_filled(Rect::from_center_size(ct, vec2(w * 2.0, rad * 1.9)), rad * 0.1, Color32::from_rgba_unmultiplied(120, 220, 170, 110));
                }
                let u = |d: [f32; 2]| ct + vec2(d[0], -d[1]) * rad;
                if let Some((at, rr)) = ring {
                    p.circle(u(*at), rad * rr, Color32::from_rgba_unmultiplied(120, 220, 170, 90), Stroke::new(sp.s(8.0), c(MINT)));
                }
                p.line_segment([ct - vec2(rad * 0.08, 0.0), ct + vec2(rad * 0.08, 0.0)], Stroke::new(sp.s(3.0), c(MUTED)));
                p.line_segment([ct - vec2(0.0, rad * 0.08), ct + vec2(0.0, rad * 0.08)], Stroke::new(sp.s(3.0), c(MUTED)));
                for w in trace.windows(2) {
                    p.line_segment([u(w[0]), u(w[1])], Stroke::new(sp.s(3.0), Color32::from_rgba_unmultiplied(255, 120, 110, 120)));
                }
                p.circle(u(*dot), sp.s(26.0), c(CORAL), Stroke::new(sp.s(5.0), c(WHITE)));
                for s in 0..*stars {
                    let a = -std::f32::consts::FRAC_PI_2 + s as f32 * 0.7 - (*stars as f32 - 1.0) * 0.35;
                    star(&p, ct + vec2(a.cos(), a.sin()) * (rad + sp.s(30.0)), sp.s(24.0), c(SUN));
                }
            }
            Ui::Stars { pos, size, n, of } => {
                for s in 0..*of {
                    let x = pos[0] + (s as f32 - (*of as f32 - 1.0) * 0.5) * size * 2.2;
                    star(&p, sp.p([x, pos[1]]), sp.s(*size), if s < *n { c(SUN) } else { c(PALE) });
                }
            }
            Ui::Bar { rect, frac, color, marker } => {
                let r = sp.r(*rect);
                let rad = r.height().min(r.width()) * 0.5;
                p.rect_filled(r, rad, c(PALE));
                if marker.is_none() {
                    let mut on = r;
                    on.set_width(r.width() * frac.clamp(0.0, 1.0));
                    p.rect_filled(on, rad, c(*color));
                } else if let Some(m) = marker {
                    // A vertical scroll bar.
                    let h = r.height() * 0.25;
                    let top = r.min.y + (r.height() - h) * m;
                    p.rect_filled(Rect::from_min_size(pos2(r.min.x, top), vec2(r.width(), h)), rad, c(*color));
                }
            }
            Ui::Circle { c: center, r, fill, stroke, width } => {
                p.circle(sp.p(*center), sp.s(*r), c(*fill), Stroke::new(sp.s(*width), c(*stroke)));
            }
            Ui::Line { a, b, width, color } => {
                p.line_segment([sp.p(*a), sp.p(*b)], Stroke::new(sp.s(*width), c(*color)));
            }
        }
    }
    let _ = (Align2::LEFT_TOP, Vec3::ZERO);
    out
}

/// A name above a head, for the host's own figures (hub ghosts).
pub fn world_label(ctx: &egui::Context, vp: Mat4, at: [f32; 3], s: &str) {
    let v = vp * Vec4::new(at[0], at[1], at[2], 1.0);
    if v.w <= 0.0 {
        return;
    }
    let size = ctx.content_rect().size();
    let n = v.truncate() / v.w;
    let k = (size.x / 1920.0).min(size.y / 1080.0);
    let p = ctx.layer_painter(egui::LayerId::new(egui::Order::Foreground, egui::Id::new("fit_labels")));
    p.text(pos2((n.x * 0.5 + 0.5) * size.x, (0.5 - n.y * 0.5) * size.y), Align2::CENTER_BOTTOM, s, FontId::new(40.0 * k, FontFamily::Name(BODY_FONT.into())), c(INK));
}

fn track_of(r: Rect) -> Rect {
    let h = (r.height() * 0.2).max(4.0);
    let w = r.width() * 0.34;
    let x = r.max.x - w - r.width() * 0.04;
    Rect::from_min_size(pos2(x, r.center().y + h * 0.5), vec2(w, h))
}

#[path = "glyphs.rs"]
pub mod glyphs;

#[cfg(test)]
mod tests {
    use super::glyphs::*;
    use super::*;

    #[test]
    fn prompts_follow_device_and_setting() {
        assert_eq!(prompt(Glyph::Confirm, Device::Gamepad, false, false), Shown::Cross);
        assert_eq!(prompt(Glyph::Back, Device::Gamepad, false, false), Shown::Circle);
        assert_eq!(prompt(Glyph::Wave, Device::Gamepad, false, false), Shown::Square);
        assert_eq!(prompt(Glyph::Schedule, Device::Gamepad, false, false), Shown::Triangle);
        assert_eq!(prompt(Glyph::Confirm, Device::Gamepad, false, true), Shown::Letter("A", [0x5c, 0xb8, 0x5c]));
        assert_eq!(prompt(Glyph::StepL, Device::Gamepad, false, false), Shown::Pill("L1"));
        assert_eq!(prompt(Glyph::StepL, Device::Gamepad, false, true), Shown::Pill("LB"));
        assert_eq!(prompt(Glyph::Confirm, Device::KeyboardMouse, false, false), Shown::Key("Space"));
        assert_eq!(prompt(Glyph::Confirm, Device::KeyboardMouse, true, false), Shown::Mouse(0));
        assert_eq!(prompt(Glyph::Back, Device::KeyboardMouse, true, true), Shown::Mouse(1));
    }

    #[test]
    fn a_frame_draws_and_reports_the_pointer() {
        let ctx = egui::Context::default();
        install_fonts(&ctx);
        let frame = UiFrame {
            items: vec![Ui::Button { id: 3, rect: [100.0, 100.0, 900.0, 200.0], label: "Resume".into(), sub: String::new(), focused: true, stars: -1, value: String::new(), fill: None, big: false }],
            ..Default::default()
        };
        let mut first = true;
        let mut got = Out::default();
        for pass in 0..3 {
            let mut events = vec![egui::Event::PointerMoved(pos2(250.0, 75.0 + pass as f32))];
            if pass == 2 {
                events.push(egui::Event::PointerButton { pos: pos2(250.0, 75.0), button: egui::PointerButton::Primary, pressed: true, modifiers: Default::default() });
                events.push(egui::Event::PointerButton { pos: pos2(250.0, 75.0), button: egui::PointerButton::Primary, pressed: false, modifiers: Default::default() });
            }
            let raw = egui::RawInput { screen_rect: Some(Rect::from_min_size(Pos2::ZERO, vec2(960.0, 540.0))), events, ..Default::default() };
            let mut out = ctx.run_ui(raw, |ui| {
                got = super::draw(ui.ctx(), &frame, Device::KeyboardMouse, false, Mat4::IDENTITY);
            });
            // Never painted: egui checks that textures are not dropped unapplied.
            out.textures_delta.clear();
            first = false;
        }
        assert!(!first);
        assert_eq!(got.rects.len(), 1);
        assert!(got.over);
        assert_eq!(got.click, Some(3));
    }
}
