//! Browser fields. Native builds keep the stubs so the window code stays one path.

#[cfg(target_arch = "wasm32")]
mod bind {
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    extern "C" {
        #[wasm_bindgen(js_namespace = Reflect, js_name = get, catch)]
        pub fn get(target: &JsValue, key: &JsValue) -> Result<JsValue, JsValue>;
        #[wasm_bindgen(js_namespace = Reflect, js_name = set, catch)]
        pub fn set(target: &JsValue, key: &JsValue, value: &JsValue) -> Result<bool, JsValue>;
        #[wasm_bindgen(js_namespace = JSON, js_name = parse, catch)]
        pub fn parse(text: &str) -> Result<JsValue, JsValue>;
        #[wasm_bindgen(js_namespace = Date, js_name = now)]
        pub fn date_now() -> f64;
        #[wasm_bindgen(js_namespace = Object, js_name = keys)]
        pub fn object_keys(obj: &JsValue) -> JsValue;

        // `js_class` is what the glue emits (`new String`). The Rust type name
        // would otherwise be called, and `DomString` is not a JS built-in.
        #[wasm_bindgen(js_name = String)]
        type DomString;
        #[wasm_bindgen(constructor, js_class = String)]
        fn new(s: &str) -> DomString;
    }

    pub fn string_obj(text: &str) -> JsValue {
        DomString::new(text).into()
    }
}

/// Scene, seed and day-number from `window.__gameBoot`, when the page set them.
pub fn boot_parts() -> (Option<String>, Option<u64>, Option<i64>) {
    #[cfg(target_arch = "wasm32")]
    {
        let Some(win) = web_sys::window() else { return (None, None, None) };
        let Ok(boot) = bind::get(win.as_ref(), &"__gameBoot".into()) else { return (None, None, None) };
        let scene = bind::get(&boot, &"scene".into()).ok().and_then(|v| v.as_string()).filter(|s| !s.is_empty());
        let seed = bind::get(&boot, &"seed".into()).ok().and_then(|v| v.as_f64()).filter(|n| *n >= 0.0).map(|n| n as u64);
        let today = bind::get(&boot, &"today".into()).ok().and_then(|v| v.as_f64()).map(|n| n as i64);
        return (scene, seed, today);
    }
    #[cfg(not(target_arch = "wasm32"))]
    (None, None, None)
}

pub fn coarse_only() -> bool {
    #[cfg(target_arch = "wasm32")]
    {
        let Some(win) = web_sys::window() else { return false };
        let coarse = win.match_media("(pointer: coarse)").ok().flatten().map(|m| m.matches()).unwrap_or(false);
        let fine = win.match_media("(any-pointer: fine)").ok().flatten().map(|m| m.matches()).unwrap_or(false);
        return coarse && !fine;
    }
    #[cfg(not(target_arch = "wasm32"))]
    false
}

/// About text the page put on `__gameBoot.about` (the `#about-data` block).
pub fn boot_about() -> Option<String> {
    #[cfg(target_arch = "wasm32")]
    {
        let win = web_sys::window()?;
        let boot = bind::get(win.as_ref(), &"__gameBoot".into()).ok()?;
        if boot.is_null() || boot.is_undefined() {
            return None;
        }
        let v = bind::get(&boot, &"about".into()).ok()?;
        let s = v.as_string()?;
        return if s.trim().is_empty() { None } else { Some(s) };
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        None
    }
}

/// Other seats' ghost samples. Empty outside the browser, and when nobody has sent one.
pub struct HubGhost {
    pub seat: u32,
    pub area: i32,
    pub pos: [f32; 3],
    pub facing: f32,
    pub lean: [f32; 2],
}

pub fn hub_ghosts() -> Vec<HubGhost> {
    #[cfg(target_arch = "wasm32")]
    {
        return read_hub_ghosts();
    }
    #[cfg(not(target_arch = "wasm32"))]
    Vec::new()
}

#[cfg(target_arch = "wasm32")]
fn js_f32(v: &wasm_bindgen::JsValue, key: &str) -> Option<f32> {
    let k = wasm_bindgen::JsValue::from_str(key);
    bind::get(v, &k).ok().and_then(|n| n.as_f64()).map(|n| n as f32)
}

#[cfg(target_arch = "wasm32")]
fn js_vec3(v: &wasm_bindgen::JsValue) -> [f32; 3] {
    [
        js_f32(v, "0").or_else(|| js_f32(v, "x")).unwrap_or(0.0),
        js_f32(v, "1").or_else(|| js_f32(v, "y")).unwrap_or(0.0),
        js_f32(v, "2").or_else(|| js_f32(v, "z")).unwrap_or(0.0),
    ]
}

#[cfg(target_arch = "wasm32")]
fn read_hub_ghosts() -> Vec<HubGhost> {
    use wasm_bindgen::JsValue;
    let Some(win) = web_sys::window() else { return Vec::new() };
    let Ok(hub) = bind::get(win.as_ref(), &"__hub".into()) else { return Vec::new() };
    if hub.is_null() || hub.is_undefined() {
        return Vec::new();
    }
    let Ok(ghosts) = bind::get(&hub, &"ghosts".into()) else { return Vec::new() };
    if ghosts.is_null() || ghosts.is_undefined() {
        return Vec::new();
    }
    let keys = bind::object_keys(&ghosts);
    let len = bind::get(&keys, &"length".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0) as u32;
    let mut out = Vec::new();
    for i in 0..len.min(8) {
        let Some(key) = bind::get(&keys, &JsValue::from_str(&i.to_string())).ok().and_then(|v| v.as_string()) else {
            continue;
        };
        let Ok(data) = bind::get(&ghosts, &JsValue::from_str(&key)) else { continue };
        if data.is_null() || data.is_undefined() {
            continue;
        }
        let area = js_f32(&data, "area").unwrap_or(-1.0) as i32;
        let pos = bind::get(&data, &JsValue::from_str("position")).ok().map(|v| js_vec3(&v)).unwrap_or([0.0; 3]);
        let facing = js_f32(&data, "facing").unwrap_or(0.0);
        let lean3 = bind::get(&data, &JsValue::from_str("lean")).ok().map(|v| js_vec3(&v)).unwrap_or([0.0; 3]);
        let seat = key.parse().unwrap_or(i);
        out.push(HubGhost { seat, area, pos, facing, lean: [lean3[0], lean3[1]] });
    }
    out
}

/// Days since the Unix epoch. The boot object wins when it set `today`.
pub fn epoch_day() -> i64 {
    #[cfg(target_arch = "wasm32")]
    {
        (bind::date_now() / 86_400_000.0) as i64
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        0
    }
}

/// 0 solo, 1 hub waiting, 2 hub go. Ended sessions wait again.
pub fn hub_code() -> u8 {
    #[cfg(target_arch = "wasm32")]
    {
        let Some(win) = web_sys::window() else { return 0 };
        let Ok(hub) = bind::get(win.as_ref(), &"__hub".into()) else { return 0 };
        if hub.is_undefined() || hub.is_null() {
            return 0;
        }
        let ended = bind::get(&hub, &"ended".into()).ok().and_then(|v| v.as_bool()).unwrap_or(false);
        if ended {
            return 1;
        }
        let go = bind::get(&hub, &"go".into()).ok().and_then(|v| v.as_bool()).unwrap_or(false);
        return if go { 2 } else { 1 };
    }
    #[cfg(not(target_arch = "wasm32"))]
    0
}

pub fn take_fit_click() -> Option<u16> {
    #[cfg(target_arch = "wasm32")]
    {
        let win = web_sys::window()?;
        let v = bind::get(win.as_ref(), &"__fitClick".into()).ok()?;
        let n = v.as_f64()?;
        if n <= 0.0 {
            return None;
        }
        let _ = bind::set(win.as_ref(), &"__fitClick".into(), &wasm_bindgen::JsValue::from_f64(0.0));
        return Some(n as u16);
    }
    #[cfg(not(target_arch = "wasm32"))]
    None
}

pub fn storage_get(key: &str) -> Option<String> {
    #[cfg(target_arch = "wasm32")]
    {
        let win = web_sys::window()?;
        let store = win.local_storage().ok().flatten()?;
        return store.get_item(key).ok().flatten();
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = key;
        None
    }
}

pub fn storage_set(key: &str, value: &str) {
    #[cfg(target_arch = "wasm32")]
    if let Some(win) = web_sys::window() {
        if let Ok(Some(store)) = win.local_storage() {
            let _ = store.set_item(key, value);
        }
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = (key, value);
    }
}

/// Publishes status as a string object (so `JSON.parse` and `.tick` both work) and item rects.
pub fn publish(status: &str, ui_json: &str) {
    #[cfg(target_arch = "wasm32")]
    {
        let Some(win) = web_sys::window() else { return };
        let obj = bind::string_obj(status);
        if let Ok(parsed) = bind::parse(status) {
            for key in ["tick", "phase", "event", "music", "sfx", "voice", "demo", "touch_card", "score", "stars", "hub", "stamps", "age", "day", "menu_focus", "prompt", "xbox"] {
                if let Ok(v) = bind::get(&parsed, &(*key).into()) {
                    let _ = bind::set(&obj, &(*key).into(), &v);
                }
            }
        }
        let _ = bind::set(win.as_ref(), &"__gameStatus".into(), &obj);
        if let Ok(ui) = bind::parse(ui_json) {
            let _ = bind::set(win.as_ref(), &"__gameUi".into(), &ui);
        }
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = (status, ui_json);
    }
}
