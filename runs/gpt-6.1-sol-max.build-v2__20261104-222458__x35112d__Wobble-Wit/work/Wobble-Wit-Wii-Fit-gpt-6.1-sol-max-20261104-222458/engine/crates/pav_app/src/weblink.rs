//! Narrow browser link. No per-frame simulation exec/query calls.
use crate::simhost::SimHost;
use pav_core::{InputFrame, RenderFrame};
use pav_ui::fit_ui::Response;
use std::sync::Arc;
#[cfg(target_arch = "wasm32")]
use web_sys::{
    js_sys::{Array, Reflect},
    wasm_bindgen::{JsCast, JsValue},
};
#[cfg(target_arch = "wasm32")]
fn get(v: &JsValue, key: &str) -> JsValue {
    Reflect::get(v, &JsValue::from_str(key)).unwrap_or(JsValue::UNDEFINED)
}
#[cfg(target_arch = "wasm32")]
fn win() -> JsValue {
    web_sys::window().unwrap().into()
}
#[cfg(target_arch = "wasm32")]
pub fn boot_scene() -> Option<(String, u64)> {
    let b = get(&win(), "__gameBoot");
    let scene = get(&b, "scene").as_string()?;
    Some((scene, get(&b, "seed").as_f64().unwrap_or(1.) as u64))
}
#[cfg(target_arch = "wasm32")]
pub fn boot(host: &SimHost) {
    let b = get(&win(), "__gameBoot");
    let save = get(&b, "save").as_string().unwrap_or_default();
    let today = get(&b, "today").as_f64().unwrap_or(0.) as u32;
    let about = get(&b, "about").as_string().unwrap_or_default();
    host.exec(move |sim| {
        let Some(mut play) = sim.state.play.take() else {
            return;
        };
        if let Some(g) = play.get_mut::<pav_core::games::fit::FitGame>() {
            g.load_save(&save, today);
            if let Ok(v) = serde_json::from_str(&about) {
                g.set_about(v);
            }
        }
        sim.state.play = Some(play);
    });
}
#[cfg(target_arch = "wasm32")]
pub fn publish(status: Option<&str>) {
    if let Some(s) = status {
        let _ = Reflect::set(&win(), &JsValue::from_str("__gameStatus"), &JsValue::from_str(s));
    }
}
#[cfg(target_arch = "wasm32")]
pub fn input(i: &mut InputFrame) {
    let w = win();
    let p = get(&w, "__fitPad");
    if !p.is_null() && !p.is_undefined() && get(&w, "__fitLastDevice").as_f64() == Some(1.) {
        let held = get(&p, "held").as_f64().unwrap_or(0.) as u32;
        let pressed = get(&p, "pressed").as_f64().unwrap_or(0.) as u32;
        i.held = held;
        i.pressed |= pressed;
        i.any |= get(&p, "any").as_bool().unwrap_or(false);
        i.device = 1;
        i.lean = pav_core::games::fit::core::stick(
            glam::Vec2::new(get(&p, "lx").as_f64().unwrap_or(0.) as f32, get(&p, "ly").as_f64().unwrap_or(0.) as f32),
            1.5,
        );
        let _ = Reflect::set(&p, &JsValue::from_str("pressed"), &JsValue::from_f64(0.));
    }
    let hub = get(&w, "__hub");
    if get(&hub, "go").as_bool().unwrap_or(false) {
        i.held |= pav_core::input::buttons::HUB_GO;
    }
    i.hub_end = get(&hub, "ended").as_bool().unwrap_or(false);
    let value = get(&w, "__fitExternalUi");
    if Array::is_array(&value) {
        let queue: Array = value.unchecked_into();
        let cmd = queue.shift();
        if !cmd.is_undefined() {
            let id = get(&cmd, "id").as_f64().unwrap_or(0.) as u16;
            let kind = get(&cmd, "kind").as_string().unwrap_or_default();
            i.device = 3;
            i.any = true;
            if kind == "settings" {
                i.ui = Some(pav_core::input::UiEvent::Click(500));
            } else if kind == "slider" {
                i.ui = Some(pav_core::input::UiEvent::Slider(id, get(&cmd, "value").as_f64().unwrap_or(0.) as f32));
            } else {
                i.ui = Some(pav_core::input::UiEvent::Click(id));
            }
        }
    }
}
#[cfg(target_arch = "wasm32")]
pub fn ui(r: &Response) {
    if let Ok(s) = serde_json::to_string(&r.items) {
        let _ = Reflect::set(&win(), &JsValue::from_str("__gameUi"), &JsValue::from_str(&s));
    }
}
#[cfg(target_arch = "wasm32")]
pub fn ghosts(prev: Arc<RenderFrame>, curr: Arc<RenderFrame>) -> (Arc<RenderFrame>, Arc<RenderFrame>) {
    let h = get(&win(), "__hub");
    let ghosts = get(&h, "ghosts");
    if ghosts.is_undefined() || ghosts.is_null() {
        return (prev, curr);
    }
    let text = web_sys::js_sys::JSON::stringify(&ghosts).ok().and_then(|v| v.as_string()).unwrap_or_default();
    let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) else {
        return (prev, curr);
    };
    let Some(map) = v.as_object() else {
        return (prev, curr);
    };
    let status = curr.hud.status.as_deref().and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok()).unwrap_or_default();
    if status["ghostLanes"].as_bool() == Some(false) {
        return (prev, curr);
    }
    let area = status["hub"]["ghost"]["area"].as_u64().unwrap_or(255);
    let Some(player) = curr.player.and_then(|id| curr.objects.iter().find(|o| o.id == id)) else {
        return (prev, curr);
    };
    let mut extra = vec![];
    for (seat, g) in map {
        if g["area"].as_u64() != Some(area) {
            continue;
        }
        let Some(p) = g["position"].as_array() else {
            continue;
        };
        if p.len() != 3 {
            continue;
        }
        let n = seat.parse::<u32>().unwrap_or(0);
        let mut obj = player.clone();
        obj.id = pav_core::entity::EntityId(100000 + n);
        obj.pos = glam::Vec3::new(
            p[0].as_f64().unwrap_or(0.) as f32 + (n as f32 + 1.) * 2.6,
            p[1].as_f64().unwrap_or(0.) as f32 + obj.puppet.as_ref().map(|pp| pp.feet_offset).unwrap_or(0.),
            p[2].as_f64().unwrap_or(0.) as f32,
        );
        if let Some(pp) = &mut obj.puppet {
            pp.tint = Some(([[0.9, 0.25, 0.2], [0.2, 0.5, 1.], [0.2, 0.8, 0.4], [1., 0.7, 0.2]][n as usize % 4], 0.65));
            if let Some(lean) = g["lean"].as_array() {
                pp.state.tilt_side = lean.first().and_then(|x| x.as_f64()).unwrap_or(0.) as f32 * 0.24;
            }
        }
        extra.push(obj);
    }
    if extra.is_empty() {
        return (prev, curr);
    }
    let mut a = (*prev).clone();
    let mut b = (*curr).clone();
    a.objects.extend(extra.clone());
    b.objects.extend(extra);
    (Arc::new(a), Arc::new(b))
}

#[cfg(not(target_arch = "wasm32"))]
pub fn boot(_host: &SimHost) {}
#[cfg(not(target_arch = "wasm32"))]
pub fn publish(_status: Option<&str>) {}
#[cfg(not(target_arch = "wasm32"))]
pub fn input(_i: &mut InputFrame) {}
#[cfg(not(target_arch = "wasm32"))]
pub fn ui(_r: &Response) {}
#[cfg(not(target_arch = "wasm32"))]
pub fn ghosts(a: Arc<RenderFrame>, b: Arc<RenderFrame>) -> (Arc<RenderFrame>, Arc<RenderFrame>) {
    (a, b)
}

#[cfg(target_arch = "wasm32")]
pub fn camera_axis() -> glam::Vec2 {
    let p = get(&win(), "__fitPad");
    glam::Vec2::new(get(&p, "rx").as_f64().unwrap_or(0.) as f32, get(&p, "ry").as_f64().unwrap_or(0.) as f32)
}
#[cfg(not(target_arch = "wasm32"))]
pub fn camera_axis() -> glam::Vec2 {
    glam::Vec2::ZERO
}

/// The Hub owns the pre-round card. Publish loaded sim state before the first expensive
/// background draw, then reserve rendering for the round itself.
#[cfg(target_arch = "wasm32")]
pub fn waiting_for_round() -> bool {
    let hub = get(&win(), "__hub");
    !hub.is_undefined()
        && !hub.is_null()
        && !get(&hub, "go").as_bool().unwrap_or(false)
        && !get(&hub, "ended").as_bool().unwrap_or(false)
}
#[cfg(not(target_arch = "wasm32"))]
pub fn waiting_for_round() -> bool {
    false
}
