//! The link between the game and the page it runs in: Rust reads and writes plain window
//! fields; the hub logic is a few lines of JS in the page (see web/index.html). Outside the
//! browser every function does the harmless thing (nothing, defaults).

use pav_core::games::fit::GhostMsg;

#[derive(Clone, Debug, Default)]
pub struct BootInfo {
    pub scene: Option<String>,
    pub seed: Option<u64>,
    /// Days since 1970 (UTC): the page tells the game what day it is.
    pub today: i64,
    /// The About text (a JSON block in the page, editable after the build).
    pub about: String,
    pub coarse_pointer: bool,
}

#[derive(Clone, Debug, Default)]
pub struct HubIn {
    pub go: bool,
    pub ended: bool,
    pub ghosts: Vec<(String, GhostMsg)>,
    pub me: usize,
    pub players: Vec<(String, String)>,
    pub active: bool,
}

#[cfg(target_arch = "wasm32")]
mod web {
    use super::*;
    use web_sys::js_sys::{Array, Object, Reflect};
    use web_sys::wasm_bindgen::{JsCast, JsValue};

    fn win() -> Option<web_sys::Window> {
        web_sys::window()
    }

    fn get(o: &JsValue, k: &str) -> JsValue {
        Reflect::get(o, &JsValue::from_str(k)).unwrap_or(JsValue::UNDEFINED)
    }

    pub fn boot() -> BootInfo {
        let mut b = BootInfo::default();
        let Some(w) = win() else { return b };
        let g = get(&w, "__gameBoot");
        if g.is_object() {
            b.scene = get(&g, "scene").as_string();
            b.seed = get(&g, "seed").as_f64().map(|v| v as u64);
            b.today = get(&g, "today").as_f64().unwrap_or(0.0) as i64;
            b.about = get(&g, "about").as_string().unwrap_or_default();
        }
        b.coarse_pointer = w.match_media("(pointer: coarse)").ok().flatten().is_some_and(|m| m.matches())
            && !w.match_media("(any-pointer: fine)").ok().flatten().is_some_and(|m| m.matches());
        b
    }

    pub fn set_status(s: &str) {
        if let Some(w) = win() {
            Reflect::set(&w, &JsValue::from_str("__gameStatus"), &JsValue::from_str(s)).ok();
        }
    }

    pub fn set_ui(s: &str) {
        if let Some(w) = win() {
            Reflect::set(&w, &JsValue::from_str("__gameUi"), &JsValue::from_str(s)).ok();
        }
    }

    pub fn hub() -> HubIn {
        let mut h = HubIn::default();
        let Some(w) = win() else { return h };
        let v = get(&w, "__hub");
        if !v.is_object() {
            return h;
        }
        h.active = true;
        h.go = get(&v, "go").as_bool().unwrap_or(false);
        h.ended = get(&v, "ended").as_bool().unwrap_or(false);
        h.me = get(&v, "me").as_f64().unwrap_or(0.0) as usize;
        let players = Array::from(&get(&v, "players"));
        for p in players.iter() {
            h.players.push((get(&p, "id").as_string().unwrap_or_default(), get(&p, "name").as_string().unwrap_or_else(|| "Guest".into())));
        }
        let ghosts = get(&v, "ghosts");
        if ghosts.is_object() {
            let keys = Object::keys(ghosts.unchecked_ref::<Object>());
            for k in keys.iter() {
                let id = k.as_string().unwrap_or_default();
                let g = get(&ghosts, &id);
                let area = get(&g, "area").as_f64().unwrap_or(-1.0) as i32;
                if area < 0 {
                    continue;
                }
                h.ghosts.push((
                    id,
                    GhostMsg {
                        area,
                        x: get(&g, "x").as_f64().unwrap_or(0.0) as f32,
                        y: get(&g, "y").as_f64().unwrap_or(0.0) as f32,
                        z: get(&g, "z").as_f64().unwrap_or(0.0) as f32,
                        facing: get(&g, "facing").as_f64().unwrap_or(0.0) as f32,
                        score: get(&g, "score").as_f64().unwrap_or(0.0) as f32,
                        clip: get(&g, "clip").as_string().unwrap_or_default(),
                        tx: get(&g, "tx").as_f64().unwrap_or(0.0) as f32,
                        ty: get(&g, "ty").as_f64().unwrap_or(0.0) as f32,
                    },
                ));
            }
        }
        h
    }

    pub fn storage_get(key: &str) -> Option<String> {
        win()?.local_storage().ok()??.get_item(key).ok()?
    }

    pub fn storage_set(key: &str, val: &str) {
        if let Some(Some(s)) = win().map(|w| w.local_storage().ok().flatten()) {
            let _ = s.set_item(key, val);
        }
    }

    /// A short rumble on the first pad (Eyes Closed: the offset you can feel).
    pub fn rumble(strength: f32) {
        let Some(w) = win() else { return };
        let nav: JsValue = w.navigator().into();
        let Ok(f) = Reflect::get(&nav, &JsValue::from_str("getGamepads")) else { return };
        let Some(f) = f.dyn_ref::<web_sys::js_sys::Function>() else { return };
        let Ok(arr) = f.call0(&nav) else { return };
        let pad = Reflect::get(&arr, &JsValue::from_f64(0.0)).unwrap_or(JsValue::UNDEFINED);
        if pad.is_null() || pad.is_undefined() {
            return;
        }
        let act = get(&pad, "vibrationActuator");
        if !act.is_object() {
            return;
        }
        let opts = Object::new();
        for (k, v) in [("duration", 120.0), ("strongMagnitude", strength as f64), ("weakMagnitude", strength as f64)] {
            Reflect::set(&opts, &JsValue::from_str(k), &JsValue::from_f64(v)).ok();
        }
        if let Ok(f) = Reflect::get(&act, &JsValue::from_str("playEffect")) {
            if let Some(f) = f.dyn_ref::<web_sys::js_sys::Function>() {
                let _ = f.call2(&act, &JsValue::from_str("dual-rumble"), &opts);
            }
        }
    }

    pub fn fullscreen(on: bool) {
        if let Some(doc) = win().and_then(|w| w.document()) {
            if on {
                if let Some(el) = doc.document_element() {
                    let _ = el.request_fullscreen();
                }
            } else {
                doc.exit_fullscreen();
            }
        }
    }
}

#[cfg(not(target_arch = "wasm32"))]
mod web {
    use super::*;

    fn save_path() -> std::path::PathBuf {
        crate::boot::exe_dir().join("wiifine_save.json")
    }
    pub fn boot() -> BootInfo {
        let secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
        BootInfo { today: (secs / 86400) as i64, ..Default::default() }
    }
    pub fn set_status(_: &str) {}
    pub fn set_ui(_: &str) {}
    pub fn hub() -> HubIn {
        HubIn::default()
    }
    pub fn storage_get(_: &str) -> Option<String> {
        std::fs::read_to_string(save_path()).ok()
    }
    pub fn storage_set(_: &str, v: &str) {
        let _ = std::fs::write(save_path(), v);
    }
    pub fn fullscreen(_: bool) {}
    pub fn rumble(_: f32) {}
}

pub use web::*;
