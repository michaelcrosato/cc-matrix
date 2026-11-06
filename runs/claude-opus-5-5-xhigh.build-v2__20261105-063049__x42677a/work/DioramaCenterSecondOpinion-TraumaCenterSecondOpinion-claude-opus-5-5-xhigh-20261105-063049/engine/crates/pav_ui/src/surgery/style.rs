//! The 10-foot look: a virtual 1920 x 1080 canvas, one big condensed font, outlined text.

use egui::{Align2, Color32, FontData, FontDefinitions, FontFamily, FontId, Painter, Pos2, Stroke, epaint::text::FontInsert};

pub const BG: Color32 = Color32::from_rgb(10, 26, 30);
pub const PANEL: Color32 = Color32::from_rgba_premultiplied(9, 24, 28, 232);
pub const INK: Color32 = Color32::from_rgb(232, 240, 238);
pub const DIM: Color32 = Color32::from_rgb(146, 170, 170);
pub const TEAL: Color32 = Color32::from_rgb(80, 210, 196);
pub const GOLD: Color32 = Color32::from_rgb(250, 208, 96);
pub const RED: Color32 = Color32::from_rgb(232, 68, 58);
pub const GREEN: Color32 = Color32::from_rgb(86, 226, 150);
pub const PAPER: Color32 = Color32::from_rgb(232, 226, 208);
pub const PAPER_INK: Color32 = Color32::from_rgb(40, 38, 46);
pub const SEATS: [Color32; 4] = [
    Color32::from_rgb(0xe8, 0x44, 0x3a),
    Color32::from_rgb(0x3b, 0x82, 0xf6),
    Color32::from_rgb(0x22, 0xc5, 0x5e),
    Color32::from_rgb(0xf5, 0xb7, 0x00),
];

const BARLOW: &[u8] = include_bytes!("../../assets/BarlowCondensed-SemiBold.ttf");

/// Installs the game's font: Barlow Condensed SemiBold (OFL) first, egui's default after it.
pub fn install_font(ctx: &egui::Context) {
    ctx.add_font(FontInsert::new(
        "barlow",
        FontData::from_static(BARLOW),
        vec![egui::epaint::text::InsertFontFamily {
            family: FontFamily::Proportional,
            priority: egui::epaint::text::FontPriority::Highest,
        }],
    ));
    let _ = FontDefinitions::default;
}

/// Fits a 1920 x 1080 canvas on the screen, whatever its pixels: 1080 points tall, or 1920 wide on
/// a narrow screen, so nothing is ever cut off.
pub fn set_canvas(ctx: &egui::Context, width_px: f32, height_px: f32, scale_factor: f32) {
    let zoom = ((height_px / 1080.0).min(width_px / 1920.0) / scale_factor.max(0.01)).max(0.05);
    if (ctx.zoom_factor() - zoom).abs() > 1e-4 {
        ctx.set_zoom_factor(zoom);
    }
}

pub fn font(size: f32) -> FontId {
    FontId::proportional(size)
}

/// Text with a dark outline: readable over anything at 10 feet.
pub fn outlined(p: &Painter, at: Pos2, anchor: Align2, text: &str, size: f32, color: Color32) -> egui::Rect {
    let f = font(size);
    let w = (size * 0.055).clamp(1.5, 4.0);
    let dark = Color32::from_rgba_unmultiplied(4, 10, 14, (color.a() as u32 * 235 / 255) as u8);
    for (dx, dy) in [(-1.0, 0.0), (1.0, 0.0), (0.0, -1.0), (0.0, 1.0), (-0.7, -0.7), (0.7, -0.7), (-0.7, 0.7), (0.7, 0.7)] {
        p.text(at + egui::vec2(dx * w, dy * w), anchor, text, f.clone(), dark);
    }
    p.text(at, anchor, text, f, color)
}

pub fn plain(p: &Painter, at: Pos2, anchor: Align2, text: &str, size: f32, color: Color32) -> egui::Rect {
    p.text(at, anchor, text, font(size), color)
}

/// Lays out wrapped text; returns the bottom.
pub fn wrapped(p: &Painter, at: Pos2, width: f32, text: &str, size: f32, color: Color32) -> f32 {
    let galley = p.layout(text.to_string(), font(size), color, width);
    let h = galley.size().y;
    p.galley(at, galley, color);
    at.y + h
}

pub fn line(p: &Painter, a: Pos2, b: Pos2, w: f32, c: Color32) {
    p.line_segment([a, b], Stroke::new(w, c));
}

pub fn with_alpha(c: Color32, a: f32) -> Color32 {
    let [r, g, b, aa] = c.to_srgba_unmultiplied();
    Color32::from_rgba_unmultiplied(r, g, b, (aa as f32 * a.clamp(0.0, 1.0)) as u8)
}
