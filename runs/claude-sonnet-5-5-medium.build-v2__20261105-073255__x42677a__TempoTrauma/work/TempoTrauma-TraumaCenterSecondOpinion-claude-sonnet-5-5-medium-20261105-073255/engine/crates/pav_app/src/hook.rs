//! Test hook and page glue. In the browser, `window.__game` has `status()` (JSON), `step(n)`
//! (run ticks now) and `do(json)` (a command); the hub shim (`window.__hub`) is polled here.
//! Natively these are no-ops.

use pav_ui::surgery::shell::HubCard;
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize, Default)]
pub struct HubPlayer {
    pub id: u32,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub color: String,
}

#[derive(Clone, Debug, Deserialize, Default)]
#[serde(default)]
pub struct HubInfo {
    pub me: i64,
    pub players: Vec<HubPlayer>,
    pub host: i64,
    #[serde(rename = "isHost")]
    pub is_host: bool,
    pub server: bool,
    pub seed: f64,
    #[serde(rename = "limitMs")]
    pub limit_ms: f64,
}

use crate::simhost::SimHost;

#[cfg(not(target_arch = "wasm32"))]
mod imp {
    use super::*;
    pub fn bind_host(_h: &SimHost) {}
    pub fn publish(_s: String) {}
    pub fn first_frame() {}
    pub fn in_hub() -> bool {
        false
    }
    pub fn take_card() -> Option<HubCard> {
        None
    }
    pub fn rumble(_v: f32, _ms: u32) {}
    pub fn take_shell_cmds() -> Vec<String> {
        Vec::new()
    }
    pub fn hub_info() -> Option<HubInfo> {
        None
    }
    pub fn hub_poll() -> Vec<serde_json::Value> {
        Vec::new()
    }
    pub fn hub_time() -> f64 {
        f64::NEG_INFINITY
    }
    pub fn hub_call(_what: &str, _json: &str, _to: i64) {}
}

#[cfg(target_arch = "wasm32")]
mod imp {
    use std::cell::RefCell;

    use js_sys::{Function, Object, Reflect};
    use wasm_bindgen::JsCast;
    use wasm_bindgen::closure::Closure;
    use wasm_bindgen::JsValue;

    use super::*;

    struct Hook {
        shell: Vec<String>,
        host: *const SimHost,
        status: String,
        installed: bool,
        frames: u32,
    }

    thread_local! {
        static HOOK: RefCell<Hook> = const { RefCell::new(Hook { shell: Vec::new(), host: std::ptr::null(), status: String::new(), installed: false, frames: 0 }) };
    }

    fn window() -> JsValue {
        web_sys::window().map(JsValue::from).unwrap_or(JsValue::NULL)
    }

    pub fn bind_host(h: &SimHost) {
        HOOK.with(|k| {
            let mut k = k.borrow_mut();
            k.host = h as *const SimHost;
            if !k.installed {
                k.installed = true;
                install();
            }
        });
    }

    fn install() {
        let obj = Object::new();
        let status = Closure::<dyn Fn() -> JsValue>::new(|| HOOK.with(|k| JsValue::from_str(&k.borrow().status)));
        let step = Closure::<dyn Fn(f64) -> JsValue>::new(|n: f64| {
            let host = HOOK.with(|k| k.borrow().host);
            if host.is_null() {
                return JsValue::from_str("no host");
            }
            // SAFETY: the pointer is refreshed every frame from the app's own host; the browser is single-threaded.
            let host = unsafe { &*host };
            let sh = host.shared.clone();
            let n = n.max(0.0) as u32;
            host.exec(move |sim| {
                for _ in 0..n {
                    let frame = {
                        let mut i = sh.input.lock().unwrap();
                        let f = *i;
                        i.pressed = 0;
                        for s in i.surgeons.iter_mut() {
                            s.pressed = 0;
                        }
                        i.scmd = None;
                        f
                    };
                    sim.step(&frame);
                }
            });
            // Refresh the status right away.
            let st = host.query(|sim| sim.state.play.as_ref().and_then(|p| p.surgery()).map(|g| g.status_json())).flatten();
            JsValue::from_str(&st.map(|v| v.to_string()).unwrap_or_default())
        });
        let doit = Closure::<dyn Fn(String) -> JsValue>::new(|json: String| {
            let host = HOOK.with(|k| k.borrow().host);
            if host.is_null() {
                return JsValue::from_str("no host");
            }
            let host = unsafe { &*host };
            let Ok(v) = serde_json::from_str::<serde_json::Value>(&json) else { return JsValue::from_str("bad json") };
            if let Some(c) = v.get("sim") {
                if let Ok(cmd) = serde_json::from_value::<pav_core::input::SurgeryCmd>(c.clone()) {
                    host.exec(move |sim| {
                        if let Some(g) = sim.state.play.as_mut().and_then(|p| p.surgery_mut()) {
                            g.command(cmd);
                        }
                    });
                    return JsValue::from_str("ok");
                }
            }
            if let Some(c) = v.get("shell").and_then(|c| c.as_str()) {
                HOOK.with(|k| k.borrow_mut().shell.push(if c.starts_with("mode_t:") { c.to_string() } else { format!("screen:{c}") }));
                return JsValue::from_str("ok");
            }
            if let Some(b) = v.get("bot").and_then(|b| b.as_bool()) {
                host.exec(move |sim| {
                    if let Some(g) = sim.state.play.as_mut().and_then(|p| p.surgery_mut()) {
                        g.command(pav_core::input::SurgeryCmd::Cheat(4, b));
                        g.sg[1].bot = b && g.sg[1].active;
                    }
                });
                return JsValue::from_str("ok");
            }
            JsValue::from_str("unknown command")
        });
        let _ = Reflect::set(&obj, &"status".into(), status.as_ref().unchecked_ref::<Function>());
        let _ = Reflect::set(&obj, &"step".into(), step.as_ref().unchecked_ref::<Function>());
        let _ = Reflect::set(&obj, &"do".into(), doit.as_ref().unchecked_ref::<Function>());
        let _ = Reflect::set(&window(), &"__game".into(), &obj);
        status.forget();
        step.forget();
        doit.forget();
    }

    pub fn take_shell_cmds() -> Vec<String> {
        HOOK.with(|k| std::mem::take(&mut k.borrow_mut().shell))
    }

    pub fn publish(s: String) {
        HOOK.with(|k| {
            let mut k = k.borrow_mut();
            k.status = s;
            k.frames += 1;
        });
    }

    pub fn first_frame() {
        // Tell the hub shim the first frame is up (it sends `ready`).
        if let Ok(hub) = Reflect::get(&window(), &"__hub".into()) {
            if let Ok(f) = Reflect::get(&hub, &"ready".into()) {
                if let Some(f) = f.dyn_ref::<Function>() {
                    let _ = f.call0(&hub);
                }
            }
        }
    }

    pub fn in_hub() -> bool {
        let Some(hub) = hub() else { return false };
        Reflect::get(&hub, &"active".into()).ok().and_then(|v| v.as_bool()).unwrap_or(false)
    }

    pub fn take_card() -> Option<HubCard> {
        None
    }

    fn hub() -> Option<JsValue> {
        let hub = Reflect::get(&window(), &"__hub".into()).ok()?;
        if hub.is_undefined() || hub.is_null() { None } else { Some(hub) }
    }

    pub fn hub_info() -> Option<HubInfo> {
        let hub = hub()?;
        let f = Reflect::get(&hub, &"infoJson".into()).ok()?;
        let f = f.dyn_ref::<Function>()?;
        let s = f.call0(&hub).ok()?.as_string()?;
        if s.is_empty() { None } else { serde_json::from_str(&s).ok() }
    }

    pub fn hub_poll() -> Vec<serde_json::Value> {
        let Some(hub) = hub() else { return Vec::new() };
        let Ok(f) = Reflect::get(&hub, &"poll".into()) else { return Vec::new() };
        let Some(f) = f.dyn_ref::<Function>() else { return Vec::new() };
        let Ok(r) = f.call0(&hub) else { return Vec::new() };
        let s = r.as_string().unwrap_or_default();
        serde_json::from_str::<Vec<serde_json::Value>>(&s).unwrap_or_default()
    }

    pub fn hub_time() -> f64 {
        let Some(hub) = hub() else { return f64::NEG_INFINITY };
        let Ok(f) = Reflect::get(&hub, &"time".into()) else { return f64::NEG_INFINITY };
        let Some(f) = f.dyn_ref::<Function>() else { return f64::NEG_INFINITY };
        f.call0(&hub).ok().and_then(|v| v.as_f64()).unwrap_or(f64::NEG_INFINITY)
    }

    /// `what`: "send" (json, to), "publish", "finish", "answer" (json = "ready" | "more").
    pub fn hub_call(what: &str, json: &str, to: i64) {
        let Some(hub) = hub() else { return };
        let Ok(f) = Reflect::get(&hub, &what.into()) else { return };
        let Some(f) = f.dyn_ref::<Function>() else { return };
        if what == "send" {
            let _ = f.call2(&hub, &JsValue::from_str(json), &JsValue::from_f64(to as f64));
        } else {
            let _ = f.call1(&hub, &JsValue::from_str(json));
        }
    }

    pub fn rumble(v: f32, ms: u32) {
        if let Ok(f) = Reflect::get(&window(), &"__rumble".into()) {
            if let Some(f) = f.dyn_ref::<Function>() {
                let _ = f.call2(&JsValue::NULL, &JsValue::from_f64(v as f64), &JsValue::from_f64(ms as f64));
            }
        }
    }
}

pub use imp::*;
