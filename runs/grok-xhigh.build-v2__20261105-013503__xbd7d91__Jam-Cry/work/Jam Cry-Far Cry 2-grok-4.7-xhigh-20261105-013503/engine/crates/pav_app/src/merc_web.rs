//! Browser bridge for Jam Cry. The page owns menus, look, and the hub. The sim stays authoritative.

use pav_core::games::merc::{Merc, Screen};
use pav_core::{InputFrame, Sim};

#[cfg(not(target_arch = "wasm32"))]
pub fn apply(_sim: &mut Sim, _frame: &mut InputFrame) {}

#[cfg(not(target_arch = "wasm32"))]
pub fn publish(_sim: &Sim) {}

#[cfg(not(target_arch = "wasm32"))]
pub fn tick_cap(_sim: &Sim) -> u32 {
    8
}

#[cfg(not(target_arch = "wasm32"))]
pub fn skip_draw() -> bool {
    false
}

#[cfg(target_arch = "wasm32")]
mod wasm {
    use super::*;
    use std::cell::Cell;
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    extern "C" {
        #[wasm_bindgen(js_namespace = gameBridge, catch)]
        fn pull() -> Result<String, JsValue>;
        #[wasm_bindgen(js_namespace = gameBridge, js_name = publish, catch)]
        fn bridge_publish(status: &str, ui: &str) -> Result<(), JsValue>;
    }

    #[derive(Clone, Copy)]
    struct Flags {
        ready: bool,
        test: bool,
        nodraw: bool,
        server: bool,
        restored: bool,
        saved: u32,
        pubs: u32,
    }

    thread_local! {
        static FLAGS: Cell<Flags> = Cell::new(Flags {
            ready: false,
            test: false,
            nodraw: false,
            server: false,
            restored: false,
            saved: 0,
            pubs: 0,
        });
    }

    fn flags() -> Flags {
        FLAGS.with(|c| c.get())
    }

    fn ensure() -> Flags {
        let mut f = flags();
        if f.ready {
            return f;
        }
        f.ready = true;
        if let Some(win) = web_sys::window() {
            if let Ok(search) = win.location().search() {
                if let Ok(q) = web_sys::UrlSearchParams::new_with_str(&search) {
                    f.test = q.get("test").is_some_and(|v| v == "1");
                    f.nodraw = q.get("nodraw").is_some_and(|v| v == "1") || f.test;
                }
            }
            if let Some(doc) = win.document() {
                if let Some(root) = doc.document_element() {
                    if root.get_attribute("data-jam-server").is_some() {
                        f.server = true;
                        f.nodraw = true;
                    }
                }
            }
        }
        FLAGS.with(|c| c.set(f));
        f
    }

    pub fn skip_draw() -> bool {
        let f = ensure();
        f.nodraw || f.server
    }

    pub fn tick_cap(sim: &Sim) -> u32 {
        let f = ensure();
        if f.test || f.nodraw || f.server {
            return 120;
        }
        if let Some(play) = sim.state.play.as_ref() {
            if play.key() == "merc" {
                if let Some(g) = play.get::<Merc>() {
                    if g.world.screen != Screen::Playing {
                        return 120;
                    }
                }
            }
        }
        8
    }

    fn num(v: &serde_json::Value, i: usize) -> f32 {
        v.get(i).and_then(|n| n.as_f64()).unwrap_or(0.0) as f32
    }

    pub fn apply(sim: &mut Sim, frame: &mut InputFrame) {
        let _ = ensure();
        let Some(play) = sim.state.play.as_mut() else { return };
        if play.key() != "merc" {
            return;
        }
        let Some(game) = play.get_mut::<Merc>() else { return };
        restore_save(&mut game.world);
        let Ok(raw) = pull() else { return };
        let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) else { return };
        if let Some(look) = v.get("look").filter(|x| x.is_array()) {
            let x = num(look, 0);
            let y = num(look, 1);
            if x != 0.0 || y != 0.0 {
                frame.look.x += x;
                frame.look.y += y;
            }
        }
        if let Some(mv) = v.get("move").filter(|x| x.is_array()) {
            frame.move_dir.x = num(mv, 0);
            frame.move_dir.y = num(mv, 1);
        }
        if let Some(ax) = v.get("axes").filter(|x| x.is_array()) {
            frame.axes.x = num(ax, 0);
            frame.axes.y = num(ax, 1);
        }
        if let Some(bits) = v.get("pressed").and_then(|n| n.as_u64()) {
            let bits = bits as u32;
            frame.pressed |= bits;
            frame.held |= bits;
        }
        if let Some(act) = v.get("act").and_then(|n| n.as_u64()) {
            if act != 0 {
                frame.act = act as u32;
            }
        }
        if let Some(h) = v.get("hover").filter(|x| x.is_array()) {
            game.world.pointer = Some((num(h, 0), num(h, 1)));
        }
        if v.get("click").and_then(|b| b.as_bool()) == Some(true) {
            game.world.pointer_click = true;
        }
        let lock = v.get("lock").and_then(|b| b.as_bool()) == Some(true);
        if let Some(dev) = v.get("device").and_then(|s| s.as_str()) {
            if dev == "gamepad" {
                game.world.device = pav_core::games::merc::Device::Gamepad;
                if lock {
                    game.world.device_lock = 1;
                }
            } else if dev == "keyboard" && game.world.device_lock == 0 {
                game.world.device = pav_core::games::merc::Device::Keyboard;
            }
        }
        if v.get("touch").and_then(|b| b.as_bool()) == Some(true) {
            game.world.touch_only = true;
        }
        if v.get("xbox").and_then(|b| b.as_bool()) == Some(true) {
            game.world.xbox = true;
        }
        if v.get("hub").and_then(|b| b.as_bool()) == Some(true) {
            game.world.hub = true;
        }
    }

    fn restore_save(world: &mut pav_core::games::merc::World) {
        let mut f = flags();
        if f.restored || world.hub {
            return;
        }
        f.restored = true;
        FLAGS.with(|c| c.set(f));
        let Some(win) = web_sys::window() else { return };
        let Ok(Some(store)) = win.local_storage() else { return };
        let Ok(Some(blob)) = store.get_item("jamcry-save") else { return };
        if blob.is_empty() || world.has_save {
            return;
        }
        world.save_blob = blob;
        world.has_save = true;
    }

    pub fn publish(sim: &Sim) {
        let Some(play) = sim.state.play.as_ref() else { return };
        if play.key() != "merc" {
            return;
        }
        let Some(game) = play.get::<Merc>() else { return };
        let mut f = flags();
        if game.world.saves_written > f.saved && !game.world.hub && !game.world.save_blob.is_empty() {
            f.saved = game.world.saves_written;
            if let Some(win) = web_sys::window() {
                if let Ok(Some(store)) = win.local_storage() {
                    let _ = store.set_item("jamcry-save", &game.world.save_blob);
                }
            }
        }
        let n = f.pubs;
        f.pubs = n.wrapping_add(1);
        FLAGS.with(|c| c.set(f));
        if !f.test && n % 15 != 0 {
            return;
        }
        let status = game.world.status().to_string();
        let ui = game.world.ui_value().to_string();
        let _ = bridge_publish(&status, &ui);
    }
}

#[cfg(target_arch = "wasm32")]
pub use wasm::{apply, publish, skip_draw, tick_cap};
