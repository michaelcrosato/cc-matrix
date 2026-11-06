//! 10-foot style: one embedded font, big outlined text, and the painter helpers every screen uses.

use egui::{Align2, Color32, FontData, FontDefinitions, FontFamily, FontId, Painter, Pos2, Rect, Stroke, StrokeKind, Vec2, pos2, vec2};

pub const FONT: &[u8] = include_bytes!("../../assets/BarlowCondensed-SemiBold.ttf");

pub const INK: Color32 = Color32::from_rgb(8, 14, 18);
pub const PANEL: Color32 = Color32::from_rgba_premultiplied(9, 20, 24, 225);
pub const TEAL: Color32 = Color32::from_rgb(46, 150, 146);
pub const TEAL_L: Color32 = Color32::from_rgb(120, 226, 214);
pub const WHITE: Color32 = Color32::from_rgb(240, 244, 240);
pub const DIM: Color32 = Color32::from_rgb(160, 176, 176);
pub const RED: Color32 = Color32::from_rgb(232, 68, 58);
pub const GOLD: Color32 = Color32::from_rgb(245, 200, 90);
pub const GREEN: Color32 = Color32::from_rgb(110, 230, 150);

/// Puts the game's font in front of egui's.
pub fn install(ctx: &egui::Context) {
    let mut f = FontDefinitions::default();
    f.font_data.insert("barlow".to_owned(), FontData::from_static(FONT).into());
    f.families.entry(FontFamily::Proportional).or_default().insert(0, "barlow".to_owned());
    ctx.set_fonts(f);
}

/// The virtual canvas: the screen is 1080 points tall, whatever the window.
pub fn zoom_for(height_px: f32, scale_factor: f32) -> f32 {
    height_px.max(1.0) / 1080.0 / scale_factor.max(0.1)
}

/// Text with a dark outline, readable at ten feet over anything.
pub fn text(p: &Painter, at: Pos2, align: Align2, s: &str, size: f32, color: Color32) -> Rect {
    let id = FontId::proportional(size);
    let o = (size * 0.045).clamp(1.5, 4.0);
    for d in [vec2(-o, 0.0), vec2(o, 0.0), vec2(0.0, -o), vec2(0.0, o), vec2(-o, -o), vec2(o, -o), vec2(-o, o), vec2(o, o)] {
        p.text(at + d, align, s, id.clone(), INK.linear_multiply(color.a() as f32 / 255.0));
    }
    p.text(at, align, s, id, color)
}

/// Wrapped text; returns its height.
pub fn wrapped(p: &Painter, at: Pos2, s: &str, size: f32, color: Color32, width: f32) -> f32 {
    let g = p.layout(s.to_string(), FontId::proportional(size), color, width);
    let h = g.size().y;
    p.galley(at, g, color);
    h
}

pub fn card(p: &Painter, r: Rect, fill: Color32, edge: Color32) {
    p.rect_filled(r, 14.0, fill);
    p.rect_stroke(r, 14.0, Stroke::new(3.0, edge), StrokeKind::Inside);
}

/// A meter: `v` in 0..1.
pub fn bar(p: &Painter, r: Rect, v: f32, fill: Color32) {
    p.rect_filled(r, r.height() * 0.3, Color32::from_rgba_unmultiplied(0, 0, 0, 170));
    let w = r.width() * v.clamp(0.0, 1.0);
    if w > 1.0 {
        p.rect_filled(Rect::from_min_size(r.min, vec2(w, r.height())), r.height() * 0.3, fill);
    }
    p.rect_stroke(r, r.height() * 0.3, Stroke::new(2.0, Color32::from_rgba_unmultiplied(255, 255, 255, 90)), StrokeKind::Outside);
}

pub fn arc(p: &Painter, c: Pos2, r: f32, from: f32, to: f32, stroke: Stroke) {
    let n = ((to - from).abs() * r / 6.0).ceil().max(3.0) as usize;
    let pts: Vec<Pos2> = (0..=n)
        .map(|k| {
            let a = from + (to - from) * k as f32 / n as f32;
            c + Vec2::angled(a) * r
        })
        .collect();
    p.add(egui::Shape::line(pts, stroke));
}

pub fn lerp_color(a: Color32, b: Color32, t: f32) -> Color32 {
    let t = t.clamp(0.0, 1.0);
    let m = |x: u8, y: u8| (x as f32 + (y as f32 - x as f32) * t) as u8;
    Color32::from_rgba_unmultiplied(m(a.r(), b.r()), m(a.g(), b.g()), m(a.b(), b.b()), m(a.a(), b.a()))
}

pub fn seat_color(i: usize) -> Color32 {
    [Color32::from_rgb(0xe8, 0x44, 0x3a), Color32::from_rgb(0x3b, 0x82, 0xf6), Color32::from_rgb(0x22, 0xc5, 0x5e), Color32::from_rgb(0xf5, 0xb7, 0x00)][i % 4]
}

pub fn center(r: Rect) -> Pos2 {
    r.center()
}

pub fn full(ctx: &egui::Context) -> Rect {
    let r = ctx.content_rect();
    Rect::from_min_size(pos2(0.0, 0.0), r.size())
}
