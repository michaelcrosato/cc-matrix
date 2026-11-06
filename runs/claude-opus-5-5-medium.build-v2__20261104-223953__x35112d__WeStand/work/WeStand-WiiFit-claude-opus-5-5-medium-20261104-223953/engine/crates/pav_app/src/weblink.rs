//! The browser's window fields. Plain `Reflect`: the single-file packer refuses wasm-bindgen
//! snippets. A read of `window.__hub` costs nothing per frame; `host.exec` would.

use std::sync::Arc;

use glam::{Quat, Vec3};
use pav_core::frame::{RenderFrame, RenderObject};
use pav_core::games::fit::ghost;
use pav_core::puppet::PuppetDef;
use web_sys::js_sys::{Array, Object, Reflect};
use web_sys::wasm_bindgen::{JsCast, JsValue};

fn get(from: &JsValue, key: &str) -> JsValue {
    Reflect::get(from, &JsValue::from_str(key)).unwrap_or(JsValue::UNDEFINED)
}

fn win() -> Option<web_sys::Window> {
    web_sys::window()
}

/// `window.__gameBoot.today`, `.about` and the stored save.
pub fn boot() -> pav_core::games::fit::BootData {
    let mut d = pav_core::games::fit::BootData::default();
    let Some(w) = win() else { return d };
    let b = get(&w, "__gameBoot");
    d.today = get(&b, "today").as_f64().unwrap_or(0.0) as i64;
    d.about = get(&b, "about").as_string().unwrap_or_default();
    if get(&w, "__hub").is_undefined() {
        d.save = w.local_storage().ok().flatten().and_then(|s| s.get_item(crate::fit_link::SAVE_KEY).ok().flatten());
    }
    d
}

pub fn save(text: &str) {
    if let Some(s) = win().and_then(|w| w.local_storage().ok().flatten()) {
        let _ = s.set_item(crate::fit_link::SAVE_KEY, text);
    }
}

/// What the prompts show now, for the page's tests.
pub fn prompts(s: &str) {
    if let Some(w) = win() {
        let _ = Reflect::set(&w, &JsValue::from_str("__gamePrompts"), &JsValue::from_str(s));
    }
}

pub fn status(s: &str) {
    if let Some(w) = win() {
        let _ = Reflect::set(&w, &JsValue::from_str("__gameStatus"), &JsValue::from_str(s));
    }
}

/// Item rects for the page's tests: `window.__gameUi = [{id, x0, y0, x1, y1}...]`.
pub fn publish_rects(rects: &[(u16, [f32; 4])], ppp: f32) {
    let Some(w) = win() else { return };
    let list = Array::new();
    for (id, r) in rects {
        let o = Object::new();
        let set = |k: &str, v: f64| {
            let _ = Reflect::set(&o, &JsValue::from_str(k), &JsValue::from_f64(v));
        };
        set("id", *id as f64);
        set("x0", (r[0] * ppp) as f64);
        set("y0", (r[1] * ppp) as f64);
        set("x1", (r[2] * ppp) as f64);
        set("y1", (r[3] * ppp) as f64);
        list.push(&o);
    }
    let _ = Reflect::set(&w, &JsValue::from_str("__gameUi"), &list);
}

pub fn hub_go() -> bool {
    win().is_some_and(|w| get(&get(&w, "__hub"), "go").as_bool().unwrap_or(false))
}

pub fn hub_ended() -> bool {
    win().is_some_and(|w| get(&get(&w, "__hub"), "ended").as_bool().unwrap_or(false))
}

/// Other players' ghosts, as figures to draw this frame, and their names to label.
pub fn hub_ghosts(area: i64) -> Vec<(i64, ghost::Sample, String)> {
    let mut out = Vec::new();
    let Some(w) = win() else { return out };
    let hub = get(&w, "__hub");
    let ghosts = get(&hub, "ghosts");
    if !ghosts.is_object() {
        return out;
    }
    let me = get(&hub, "me").as_string();
    let players: Array = get(&hub, "players").dyn_into().unwrap_or_else(|_| Array::new());
    let names = |id: &JsValue| -> (i64, String) {
        for (i, p) in players.iter().enumerate() {
            let pid = get(&p, "id");
            if pid.as_string() == id.as_string() || pid == *id {
                return (i as i64, get(&p, "name").as_string().unwrap_or_default());
            }
        }
        (0, String::new())
    };
    let _ = me;
    let keys = Object::keys(&ghosts.clone().unchecked_into::<Object>());
    for key in keys.iter() {
        let g = Reflect::get(&ghosts, &key).unwrap_or(JsValue::UNDEFINED);
        if !ghost::same_area(area, get(&g, "area").as_f64().map(|a| a as i64)) {
            continue;
        }
        let p: Array = match get(&g, "p").dyn_into() {
            Ok(a) => a,
            Err(_) => continue,
        };
        let n = |k: &str| get(&g, k).as_f64().unwrap_or(0.0) as f32;
        let s = ghost::Sample {
            t: 0.0,
            p: [p.get(0).as_f64().unwrap_or(0.0) as f32, p.get(1).as_f64().unwrap_or(0.0) as f32, p.get(2).as_f64().unwrap_or(0.0) as f32],
            f: n("f"),
            ts: n("ts"),
            tf: n("tf"),
            c: n("c") as u32,
            ct: n("ct"),
            s: n("s"),
        };
        let (seat, name) = names(&key);
        out.push((seat, s, name));
    }
    out
}

/// Appends hub ghosts to a pair of frames as tinted figures.
pub fn with_ghosts(frame: &RenderFrame, ghosts: &[(i64, ghost::Sample, String)]) -> Arc<RenderFrame> {
    let mut f = frame.clone();
    for (k, (seat, s, _)) in ghosts.iter().enumerate() {
        f.objects.push(object(k as u32 + 100, *seat, s));
    }
    Arc::new(f)
}

fn object(id: u32, seat: i64, s: &ghost::Sample) -> RenderObject {
    let def = Arc::new(pav_core::games::fit::meta::guest_def(seat as u8, seat as u8, &Default::default()));
    let lane = Vec3::new(2.4 * (seat as f32 + 1.0), 0.0, 0.0);
    let _ = (Quat::IDENTITY, PuppetDef::default());
    ghost::object(id, s, lane, def, ghost::SEATS[seat as usize % 4], 0.55)
}

/// A short rumble on a pad that has one, through the standard Gamepad API.
pub fn rumble(strength: f32) {
    if strength <= 0.02 {
        return;
    }
    let Some(w) = win() else { return };
    let nav = get(&w, "navigator");
    let f = get(&nav, "getGamepads");
    let Ok(f) = f.dyn_into::<web_sys::js_sys::Function>() else { return };
    let Ok(list) = f.call0(&nav) else { return };
    let Ok(list) = list.dyn_into::<Array>() else { return };
    for pad in list.iter() {
        let act = get(&pad, "vibrationActuator");
        if act.is_object() {
            if let Ok(play) = get(&act, "playEffect").dyn_into::<web_sys::js_sys::Function>() {
                let o = Object::new();
                let _ = Reflect::set(&o, &JsValue::from_str("duration"), &JsValue::from_f64(60.0));
                let _ = Reflect::set(&o, &JsValue::from_str("strongMagnitude"), &JsValue::from_f64(strength as f64 * 0.5));
                let _ = Reflect::set(&o, &JsValue::from_str("weakMagnitude"), &JsValue::from_f64(strength as f64));
                let _ = play.call2(&act, &JsValue::from_str("dual-rumble"), &o);
            }
            break;
        }
    }
}

/// Whether this is a touch-only device: a coarse pointer, no fine one.
pub fn touch_only() -> bool {
    let Some(w) = win() else { return false };
    let m = |q: &str| w.match_media(q).ok().flatten().is_some_and(|m| m.matches());
    m("(pointer: coarse)") && !m("(any-pointer: fine)")
}
