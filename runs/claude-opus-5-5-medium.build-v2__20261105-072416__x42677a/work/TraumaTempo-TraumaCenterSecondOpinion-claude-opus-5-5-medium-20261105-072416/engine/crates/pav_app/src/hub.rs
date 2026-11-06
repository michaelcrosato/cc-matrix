//! The bridge to `window.__hub` (web/hub_shim.js, which owns every AIHub call) and the test hook
//! `window.__game`. Natively neither exists: everything here does nothing.

use serde_json::Value;

#[cfg(target_arch = "wasm32")]
mod js {
    use js_sys::{Function, Reflect};
    use wasm_bindgen::JsValue;

    pub fn hub() -> Option<JsValue> {
        let w = web_sys::window()?;
        let h = Reflect::get(&w, &JsValue::from_str("__hub")).ok()?;
        if h.is_undefined() || h.is_null() { None } else { Some(h) }
    }

    pub fn get(obj: &JsValue, key: &str) -> Option<JsValue> {
        let v = Reflect::get(obj, &JsValue::from_str(key)).ok()?;
        if v.is_undefined() || v.is_null() { None } else { Some(v) }
    }

    pub fn call(obj: &JsValue, key: &str, args: &[JsValue]) -> Option<JsValue> {
        let f: Function = get(obj, key)?.into();
        let list = js_sys::Array::new();
        for a in args {
            list.push(a);
        }
        f.apply(obj, &list).ok()
    }
}

/// True when the page was opened by the hub.
pub fn active() -> bool {
    #[cfg(target_arch = "wasm32")]
    {
        js::hub().and_then(|h| js::get(&h, "active")).and_then(|v| v.as_bool()).unwrap_or(false)
    }
    #[cfg(not(target_arch = "wasm32"))]
    false
}

/// `connect()`'s answer, once it came: JSON of `info`.
pub fn info() -> Option<Value> {
    #[cfg(target_arch = "wasm32")]
    {
        let h = js::hub()?;
        let v = js::call(&h, "infoJson", &[])?;
        serde_json::from_str(&v.as_string()?).ok()
    }
    #[cfg(not(target_arch = "wasm32"))]
    None
}

/// The events queued since the last poll: `[name, data, from?]`.
pub fn poll() -> Vec<Value> {
    #[cfg(target_arch = "wasm32")]
    {
        let Some(h) = js::hub() else { return Vec::new() };
        let Some(v) = js::call(&h, "poll", &[]) else { return Vec::new() };
        v.as_string().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
    }
    #[cfg(not(target_arch = "wasm32"))]
    Vec::new()
}

pub fn ready() {
    #[cfg(target_arch = "wasm32")]
    if let Some(h) = js::hub() {
        js::call(&h, "ready", &[]);
    }
}

pub fn answer(what: &str) {
    #[cfg(target_arch = "wasm32")]
    if let Some(h) = js::hub() {
        js::call(&h, "answer", &[what.into()]);
    }
    #[cfg(not(target_arch = "wasm32"))]
    let _ = what;
}

/// The hub's clock (ms since play began; negative in the countdown).
pub fn time() -> f64 {
    #[cfg(target_arch = "wasm32")]
    {
        js::hub().and_then(|h| js::call(&h, "time", &[])).and_then(|v| v.as_f64()).unwrap_or(f64::NEG_INFINITY)
    }
    #[cfg(not(target_arch = "wasm32"))]
    f64::NEG_INFINITY
}

pub fn send(v: &Value) {
    #[cfg(target_arch = "wasm32")]
    if let Some(h) = js::hub() {
        js::call(&h, "send", &[v.to_string().into()]);
    }
    #[cfg(not(target_arch = "wasm32"))]
    let _ = v;
}

pub fn publish(v: &Value) {
    #[cfg(target_arch = "wasm32")]
    if let Some(h) = js::hub() {
        js::call(&h, "publish", &[v.to_string().into()]);
    }
    #[cfg(not(target_arch = "wasm32"))]
    let _ = v;
}

pub fn finish(v: &Value) {
    #[cfg(target_arch = "wasm32")]
    if let Some(h) = js::hub() {
        js::call(&h, "finish", &[v.to_string().into()]);
    }
    #[cfg(not(target_arch = "wasm32"))]
    let _ = v;
}

/// Rumble on a pad: the page's small helper.
pub fn rumble(pad: usize, ms: f32, weak: f32, strong: f32) {
    #[cfg(target_arch = "wasm32")]
    if let Some(w) = web_sys::window() {
        use wasm_bindgen::JsValue;
        let args = [JsValue::from_f64(pad as f64), JsValue::from_f64(ms as f64), JsValue::from_f64(weak as f64), JsValue::from_f64(strong as f64)];
        js::call(&w, "__rumble", &args);
    }
    #[cfg(not(target_arch = "wasm32"))]
    let _ = (pad, ms, weak, strong);
}

/// The About block the page carries.
pub fn about_text() -> Option<String> {
    #[cfg(target_arch = "wasm32")]
    {
        web_sys::window()?.document()?.get_element_by_id("about-data")?.text_content()
    }
    #[cfg(not(target_arch = "wasm32"))]
    None
}

/// Whether a key or a fine pointer can exist here: a phone can do neither.
pub fn touch_only() -> bool {
    #[cfg(target_arch = "wasm32")]
    {
        let m = |q: &str| web_sys::window().and_then(|w| w.match_media(q).ok().flatten()).is_some_and(|m| m.matches());
        !m("(any-pointer: fine)") && m("(any-pointer: coarse)")
    }
    #[cfg(not(target_arch = "wasm32"))]
    false
}

/// A tap the page saw, as fractions of the window.
pub fn take_tap() -> Option<(f32, f32)> {
    #[cfg(target_arch = "wasm32")]
    {
        use wasm_bindgen::JsValue;
        let w = web_sys::window()?;
        let v = js::get(&w, "__tap")?;
        let _ = js_sys::Reflect::set(&w, &"__tap".into(), &JsValue::NULL);
        let a = js_sys::Array::from(&v);
        return Some((a.get(0).as_f64()? as f32, a.get(1).as_f64()? as f32));
    }
    #[cfg(not(target_arch = "wasm32"))]
    None
}

/// Tests' switch: `?lite=1` or `window.__lite` draws only the UI.
pub fn lite() -> bool {
    #[cfg(target_arch = "wasm32")]
    {
        let Some(w) = web_sys::window() else { return false };
        let by_var = js::get(&w, "__lite").and_then(|v| v.as_bool()).unwrap_or(false);
        by_var || w.location().search().unwrap_or_default().contains("lite=1")
    }
    #[cfg(not(target_arch = "wasm32"))]
    false
}

const SAVE_KEY: &str = "trauma_tempo_save";

pub fn load_save() -> Option<String> {
    #[cfg(target_arch = "wasm32")]
    {
        web_sys::window()?.local_storage().ok()??.get_item(SAVE_KEY).ok()?
    }
    #[cfg(not(target_arch = "wasm32"))]
    std::fs::read_to_string(crate::boot::exe_dir().join(format!("{SAVE_KEY}.json"))).ok()
}

pub fn store_save(text: &str) {
    #[cfg(target_arch = "wasm32")]
    if let Some(s) = web_sys::window().and_then(|w| w.local_storage().ok().flatten()) {
        let _ = s.set_item(SAVE_KEY, text);
    }
    #[cfg(not(target_arch = "wasm32"))]
    let _ = std::fs::write(crate::boot::exe_dir().join(format!("{SAVE_KEY}.json")), text);
}

// The test hook: `window.__game.status()`, `.step(n)`, `.do(json)`.
#[cfg(target_arch = "wasm32")]
thread_local! {
    static STATUS: std::cell::RefCell<String> = const { std::cell::RefCell::new(String::new()) };
    static STEPS: std::cell::Cell<u32> = const { std::cell::Cell::new(0) };
    static DOS: std::cell::RefCell<Vec<String>> = const { std::cell::RefCell::new(Vec::new()) };
}

/// Installs `window.__game`.
pub fn install_hook() {
    #[cfg(target_arch = "wasm32")]
    {
        use wasm_bindgen::JsCast;
        use wasm_bindgen::closure::Closure;
        let Some(w) = web_sys::window() else { return };
        let game = js_sys::Object::new();
        let status = Closure::<dyn Fn() -> String>::new(|| STATUS.with(|s| s.borrow().clone()));
        let step = Closure::<dyn Fn(u32)>::new(|n: u32| STEPS.with(|s| s.set(s.get() + n)));
        let run = Closure::<dyn Fn(String)>::new(|j: String| DOS.with(|d| d.borrow_mut().push(j)));
        let set = |k: &str, f: &js_sys::Function| {
            let _ = js_sys::Reflect::set(&game, &k.into(), f);
        };
        set("status", status.as_ref().unchecked_ref());
        set("step", step.as_ref().unchecked_ref());
        set("do", run.as_ref().unchecked_ref());
        let _ = js_sys::Reflect::set(&w, &"__game".into(), &game);
        status.forget();
        step.forget();
        run.forget();
    }
}

pub fn set_status(v: &Value) {
    #[cfg(target_arch = "wasm32")]
    STATUS.with(|s| *s.borrow_mut() = v.to_string());
    #[cfg(not(target_arch = "wasm32"))]
    let _ = v;
}

pub fn take_steps() -> u32 {
    #[cfg(target_arch = "wasm32")]
    {
        STEPS.with(|s| s.replace(0))
    }
    #[cfg(not(target_arch = "wasm32"))]
    0
}

pub fn take_dos() -> Vec<String> {
    #[cfg(target_arch = "wasm32")]
    {
        DOS.with(|d| std::mem::take(&mut *d.borrow_mut()))
    }
    #[cfg(not(target_arch = "wasm32"))]
    Vec::new()
}
