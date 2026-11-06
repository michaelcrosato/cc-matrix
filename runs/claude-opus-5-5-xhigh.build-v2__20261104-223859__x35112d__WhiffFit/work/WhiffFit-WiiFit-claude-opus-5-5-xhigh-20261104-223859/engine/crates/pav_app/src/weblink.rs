//! The game and its page: window fields read and written, `localStorage`, and the AI Hub's ghosts.
//! No wasm-bindgen snippets (the one-file packer refuses them): only `Reflect`.

use std::collections::BTreeMap;

use pav_core::RenderFrame;
use pav_core::games::fit::ghost::{self, GFrame};
use pav_core::games::fit::medley::ORDER;

/// What the page says at boot.
#[derive(Clone, Debug, Default)]
#[cfg_attr(not(target_arch = "wasm32"), allow(dead_code))]
pub struct BootData {
    pub scene: Option<String>,
    pub seed: Option<u64>,
    pub today: i64,
    pub about: String,
    pub touch_only: bool,
    /// Test pages on a software renderer: no shadows or ripples.
    pub fast: bool,
}

/// One other player, as the session reports them.
#[derive(Clone, Debug, Default)]
pub struct HubGhost {
    pub id: String,
    pub area: i64,
    pub frame: GFrame,
}

/// The session's state, this frame.
#[derive(Clone, Debug, Default)]
pub struct HubLink {
    pub go: bool,
    pub ended: bool,
    pub me: i64,
    pub names: BTreeMap<String, String>,
    pub ghosts: Vec<HubGhost>,
}

/// Local figures for the other players who are in the same area as you, added to clones of the
/// two frames the renderer interpolates. The sim never sees them, so it stays deterministic.
pub fn with_ghosts(
    prev: &RenderFrame,
    curr: &RenderFrame,
    hub: &HubLink,
    seen: &mut BTreeMap<String, GFrame>,
    dt: f32,
) -> (RenderFrame, RenderFrame, Vec<pav_ui::fit_ui::WorldLabel>) {
    let (mut a, mut b) = (prev.clone(), curr.clone());
    let mut labels = Vec::new();
    let area = curr
        .hud
        .status
        .as_ref()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok())
        .and_then(|v| v["hub"]["ghost"]["area"].as_i64())
        .unwrap_or(-1);
    if area < 0 || area as usize >= ORDER.len() {
        return (a, b, labels);
    }
    let kind = ORDER[area as usize];
    for g in hub.ghosts.iter().filter(|g| pav_core::games::fit::ghost::same_area(g.area, area)) {
        let seat: usize = g.id.parse().unwrap_or(1);
        let shown = seen.entry(g.id.clone()).or_insert(g.frame);
        *shown = shown.lerp(&g.frame, (dt * 12.0).min(1.0));
        let frame = *shown;
        let slot = (seat as i64 - hub.me).abs().max(1) as f32 * if seat as i64 > hub.me { 1.0 } else { -1.0 };
        let lane = kind.lane() * slot;
        let look = ghost::seat_look(seat);
        let tint = ghost::SEATS[seat % 4];
        let id = 0x7100_0000 + seat as u32 * 16;
        let obj = ghost::ghost_object(id, &frame, lane, &look, tint, 0.55);
        a.objects.push(obj.clone());
        b.objects.push(obj);
        if let Some(board) = ghost::stands_on(id + 1, kind, &frame, lane) {
            a.objects.push(board.clone());
            b.objects.push(board);
        }
        let name = hub.names.get(&g.id).cloned().unwrap_or_else(|| format!("Guest {}", seat + 1));
        labels.push(pav_ui::fit_ui::WorldLabel {
            pos: glam::Vec3::from(frame.p) + lane + glam::Vec3::Y * 2.3,
            text: name,
            color: [(tint[0] * 255.0) as u8, (tint[1] * 255.0) as u8, (tint[2] * 255.0) as u8],
        });
    }
    (a, b, labels)
}

#[cfg(target_arch = "wasm32")]
mod imp {
    use web_sys::js_sys::{Function, JSON, Reflect};
    use web_sys::wasm_bindgen::{JsCast, JsValue};

    use super::*;

    const SAVE_KEY: &str = "whiff-fit-save-v1";

    fn field(from: &JsValue, name: &str) -> JsValue {
        Reflect::get(from, &JsValue::from_str(name)).unwrap_or(JsValue::UNDEFINED)
    }

    fn window_field(name: &str) -> JsValue {
        web_sys::window().map(|w| field(&w, name)).unwrap_or(JsValue::UNDEFINED)
    }

    pub fn boot() -> BootData {
        let b = window_field("__gameBoot");
        BootData {
            scene: field(&b, "scene").as_string(),
            seed: field(&b, "seed").as_f64().map(|v| v as u64),
            today: field(&b, "today").as_f64().unwrap_or(0.0) as i64,
            about: field(&b, "about").as_string().unwrap_or_default(),
            touch_only: field(&b, "touchOnly").as_bool().unwrap_or(false),
            fast: field(&b, "fast").as_bool().unwrap_or(false),
        }
    }

    fn storage() -> Option<web_sys::Storage> {
        web_sys::window()?.local_storage().ok().flatten()
    }

    pub fn load_save() -> Option<String> {
        if !window_field("__hub").is_undefined() {
            return None;
        }
        storage()?.get_item(SAVE_KEY).ok().flatten()
    }

    pub fn store_save(text: &str) {
        if !window_field("__hub").is_undefined() {
            return;
        }
        if let Some(s) = storage() {
            let _ = s.set_item(SAVE_KEY, text);
        }
    }

    pub fn publish_status(text: &str) {
        if let Some(w) = web_sys::window() {
            let _ = Reflect::set(&w, &JsValue::from_str("__gameStatus"), &JsValue::from_str(text));
        }
    }

    pub fn publish_ui_text(text: &str) {
        if let Some(w) = web_sys::window() {
            let _ = Reflect::set(&w, &JsValue::from_str("__gameUi"), &JsValue::from_str(text));
        }
    }

    pub fn rumble(v: f32) {
        let f = window_field("__rumble");
        if f.is_function() {
            let _ = f.unchecked_into::<Function>().call1(&JsValue::NULL, &JsValue::from_f64(v as f64));
        }
    }

    pub fn hub() -> HubLink {
        let h = window_field("__hub");
        if h.is_undefined() {
            return HubLink::default();
        }
        let mut out = HubLink {
            go: field(&h, "go").as_bool().unwrap_or(false),
            ended: field(&h, "ended").as_bool().unwrap_or(false),
            me: field(&h, "me").as_f64().unwrap_or(0.0) as i64,
            ..Default::default()
        };
        let text = |v: &JsValue| JSON::stringify(v).ok().and_then(|s| s.as_string()).unwrap_or_default();
        if let Ok(players) = serde_json::from_str::<serde_json::Value>(&text(&field(&h, "players"))) {
            for p in players.as_array().into_iter().flatten() {
                if let (Some(id), Some(name)) = (p["id"].as_i64(), p["name"].as_str()) {
                    out.names.insert(id.to_string(), name.to_string());
                }
            }
        }
        if let Ok(ghosts) = serde_json::from_str::<serde_json::Value>(&text(&field(&h, "ghosts"))) {
            for (id, g) in ghosts.as_object().into_iter().flatten() {
                let f = |k: &str, i: usize| g[k][i].as_f64().unwrap_or(0.0) as f32;
                out.ghosts.push(HubGhost {
                    id: id.clone(),
                    area: g["area"].as_i64().unwrap_or(-1),
                    frame: GFrame {
                        p: [f("p", 0), f("p", 1), f("p", 2)],
                        f: g["f"].as_f64().unwrap_or(0.0) as f32,
                        l: [f("l", 0), f("l", 1)],
                        c: g["c"].as_u64().unwrap_or(0) as u32,
                        t: g["t"].as_f64().unwrap_or(0.0) as f32,
                        s: g["s"].as_f64().unwrap_or(0.0) as f32,
                    },
                });
            }
        }
        out
    }
}

#[cfg(not(target_arch = "wasm32"))]
mod imp {
    use super::*;

    pub fn boot() -> BootData {
        BootData::default()
    }
    pub fn load_save() -> Option<String> {
        None
    }
    pub fn store_save(_text: &str) {}
    pub fn publish_status(_text: &str) {}
    pub fn publish_ui_text(_text: &str) {}
    pub fn rumble(_v: f32) {}
    pub fn hub() -> HubLink {
        HubLink::default()
    }
}

pub use imp::*;

/// Publishes the item rects, prompts and device for browser tests.
pub fn publish_ui(f: &pav_core::games::fit::ui_model::UiFrame, o: &pav_ui::fit_ui::Output, device: pav_ui::Device, mouse: bool) {
    let items: Vec<serde_json::Value> = o
        .rects
        .iter()
        .map(|(id, r, label)| serde_json::json!({ "id": id, "x": r[0], "y": r[1], "w": r[2], "h": r[3], "label": label }))
        .collect();
    let dev = match device {
        pav_ui::Device::Gamepad => "pad",
        pav_ui::Device::Touch => "touch",
        pav_ui::Device::KeyboardMouse if mouse => "mouse",
        pav_ui::Device::KeyboardMouse => "keys",
    };
    let event = o.event.map(|e| format!("{e:?}"));
    let v = serde_json::json!({ "screen": f.screen, "focus": f.focus, "items": items, "prompts": o.prompts, "device": dev, "xbox": f.xbox, "event": event });
    publish_ui_text(&v.to_string());
}
