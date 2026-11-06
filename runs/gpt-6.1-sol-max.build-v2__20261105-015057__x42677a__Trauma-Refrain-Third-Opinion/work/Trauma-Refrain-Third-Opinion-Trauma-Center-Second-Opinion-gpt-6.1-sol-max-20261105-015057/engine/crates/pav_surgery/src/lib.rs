//! Dedicated browser product host. All rules, snapshots and art use Pavilion's crates.
#[cfg(target_arch = "wasm32")]
mod web {
    use glam::{Vec2, Vec3};
    use pav_core::games::surgery::{HazardSpec, SurgeonInput, Surgery};
    use pav_core::{InputFrame, Sim, SimState};
    use pav_render::gpu::{self, BackendChoice};
    use pav_render::{Renderer, Scene, wgpu};
    use pav_view::{CameraRig, surgery};
    use serde_json::{Value, json};
    use wasm_bindgen::prelude::*;

    struct Graphics {
        surface: wgpu::Surface<'static>,
        device: wgpu::Device,
        queue: wgpu::Queue,
        config: wgpu::SurfaceConfiguration,
        renderer: Renderer,
    }
    #[wasm_bindgen]
    pub struct Hospital {
        sim: Sim,
        graphics: Option<Graphics>,
        camera: CameraRig,
        saved: Option<SimState>,
    }
    #[wasm_bindgen]
    impl Hospital {
        #[wasm_bindgen(constructor)]
        pub fn new() -> Self {
            std::panic::set_hook(Box::new(|p| web_sys::console::error_1(&p.to_string().into())));
            Self {
                sim: Sim::new("surgery/title", 42).expect("surgical scene"),
                graphics: None,
                camera: surgery::camera(),
                saved: None,
            }
        }
        pub async fn graphics(&mut self, canvas: web_sys::HtmlCanvasElement) -> Result<(), JsValue> {
            let instance = gpu::create_instance(BackendChoice::Vulkan);
            let surface = instance.create_surface(wgpu::SurfaceTarget::Canvas(canvas.clone())).map_err(err)?;
            let adapter = gpu::request_adapter_async(&instance, Some(&surface)).await.map_err(err)?;
            let (device, queue) = gpu::request_device_async(&adapter).await.map_err(err)?;
            device.on_uncaptured_error(std::sync::Arc::new(|e| web_sys::console::error_1(&format!("Pavilion GPU: {e}").into())));
            let caps = surface.get_capabilities(&adapter);
            let mut config = surface
                .get_default_config(&adapter, canvas.width().max(1), canvas.height().max(1))
                .ok_or("No drawing surface")?;
            config.format = caps.formats.iter().copied().find(|f| !f.is_srgb()).unwrap_or(config.format);
            surface.configure(&device, &config);
            let scope = device.push_error_scope(wgpu::ErrorFilter::Validation);
            let renderer = Renderer::new(&device, &queue);
            if let Some(e) = scope.pop().await {
                return Err(err(e));
            }
            self.graphics = Some(Graphics { surface, device, queue, config, renderer });
            Ok(())
        }
        pub fn load(&mut self, scene: &str, seed: u32) -> Result<(), JsValue> {
            self.sim = Sim::new(scene, seed as u64).map_err(err)?;
            self.camera = surgery::camera();
            Ok(())
        }
        pub fn state(&self) -> String {
            let mut value = self.sim.play().unwrap().status(&self.sim);
            value.as_object_mut().unwrap().remove("data");
            value["tick"] = json!(self.sim.state.tick);
            value.to_string()
        }
        pub fn content(&self) -> String {
            json!({"title":pav_core::games::surgery::TITLE,"cases":self.game().data.cases}).to_string()
        }
        pub fn step(&mut self, raw: &str, n: u32, bot: bool) -> Result<String, JsValue> {
            let inputs: [SurgeonInput; 4] = serde_json::from_str(raw).map_err(err)?;
            for _ in 0..n.min(200000) {
                if self.sim.outcome() != pav_core::games::Outcome::Playing {
                    break;
                }
                let mut f = InputFrame { surgeons: inputs, ..Default::default() };
                if bot {
                    f = self.sim.bot_input();
                    let g = self.game();
                    for j in 1..4 {
                        if g.surgeons[j].active && !g.surgeons[j].ghost {
                            f.surgeons[j] = g.bot_seat(j);
                        }
                    }
                }
                self.sim.step(&f);
            }
            Ok(self.state())
        }
        pub fn command(&mut self, raw: &str) -> Result<String, JsValue> {
            let v: Value = serde_json::from_str(raw).map_err(err)?;
            let kind = v["type"].as_str().unwrap_or("");
            if kind == "snapshot" {
                self.saved = Some(self.sim.snapshot());
                return Ok(self.state());
            }
            if kind == "restore" {
                if let Some(s) = self.saved.clone() {
                    self.sim.restore(s);
                }
                return Ok(self.state());
            }
            if kind == "rewind" {
                let tick = self.sim.state.tick.saturating_sub(300);
                self.sim.rewind_to(tick);
                return Ok(self.state());
            }
            let g = self.sim.state.play.as_mut().unwrap().get_mut::<Surgery>().unwrap();
            match kind {
                "tune" => {
                    let mut values = serde_json::to_value(&g.tune).unwrap();
                    for (k, val) in v["values"].as_object().ok_or("Expected tune values")? {
                        values[k] = val.clone();
                    }
                    g.tune = serde_json::from_value(values).map_err(err)?;
                }
                "defaults" => g.tune = Default::default(),
                "phase" => {
                    g.phase = (v["phase"].as_u64().unwrap_or(0) as usize).min(g.chart().phases.len() - 1);
                    g.mode = "operation".into();
                    g.code = 0.;
                    g.shocks = 0;
                    g.load_phase();
                }
                "skip" => g.next(),
                "win" => g.finish(),
                "kill" => g.fail(),
                "code" => g.start_code(1, false),
                "retry" => g.retry(v["checkpoint"].as_bool().unwrap_or(true)),
                "gift" => {
                    for s in &mut g.surgeons {
                        s.gift = 100.;
                    }
                }
                "difficulty" => {
                    g.difficulty = v["value"].as_u64().unwrap_or(0).min(2) as u8;
                    g.defibs = 2 - g.difficulty;
                }
                "spawn" => {
                    let kind = v["kind"].as_str().unwrap_or("pool");
                    let p = g.surgeons[0].cursor;
                    g.spawn(&HazardSpec {
                        kind: kind.into(),
                        pos: p.to_array(),
                        end: Some((p + Vec2::X * 1.5).to_array()),
                        hidden: false,
                        stage: 0,
                    });
                }
                "mirror" => {
                    let mut state = serde_json::to_value(&*g).unwrap();
                    for (key, value) in v["state"].as_object().ok_or("Expected mirror frame")? {
                        state[key] = value.clone();
                    }
                    *g = serde_json::from_value(state).map_err(err)?;
                }
                _ => return Err(JsValue::from_str("Unknown game command")),
            }
            Ok(self.state())
        }
        pub fn render(&mut self, width: u32, height: u32, mode: &str, story: &str, time: f32) {
            let g = self.game().clone();
            let Some(gfx) = &mut self.graphics else { return };
            if width != gfx.config.width || height != gfx.config.height {
                gfx.config.width = width.max(1);
                gfx.config.height = height.max(1);
                gfx.surface.configure(&gfx.device, &gfx.config);
            }
            self.camera.snap(Vec3::ZERO);
            let mut scene = Scene { camera: self.camera.data(16. / 9.), time, ..Default::default() };
            surgery::emit(&mut scene, &g);
            if mode == "story" {
                let v: Value = serde_json::from_str(story).unwrap_or_default();
                let text = |key: &str| v[key].as_str().unwrap_or("");
                surgery::theatre(&mut scene, text("left"), text("right"), text("who"), text("expr"), time, text("set"));
            }
            match gfx.surface.get_current_texture() {
                wgpu::CurrentSurfaceTexture::Success(frame) | wgpu::CurrentSurfaceTexture::Suboptimal(frame) => {
                    let view = frame.texture.create_view(&Default::default());
                    let mut encoder = gfx.device.create_command_encoder(&Default::default());
                    gfx.renderer.render(&mut encoder, &scene, &view, gfx.config.format, (gfx.config.width, gfx.config.height));
                    gfx.queue.submit([encoder.finish()]);
                    gfx.queue.present(frame);
                }
                _ => gfx.surface.configure(&gfx.device, &gfx.config),
            }
        }
        pub fn aim(&self, x: f32, y: f32) -> String {
            let mut point = self.camera.ground_point(Vec2::new(x, y), Vec2::new(1920., 1080.), 1.0).unwrap_or_default();
            for _ in 0..3 {
                let h = surgery::height(point.x, point.z, &self.game().stage().plate, self.game().beat);
                point = self.camera.ground_point(Vec2::new(x, y), Vec2::new(1920., 1080.), h).unwrap_or(point);
            }
            json!([point.x, point.z]).to_string()
        }
        pub fn project(&self, x: f32, z: f32) -> String {
            let h = surgery::height(x, z, &self.game().stage().plate, self.game().beat) + 0.1;
            let n = self.camera.view_proj(16. / 9.).project_point3(Vec3::new(x, h, z));
            json!([(n.x + 1.) * 960., (1. - n.y) * 540.]).to_string()
        }
        pub fn hash(&self) -> String {
            format!("{:?}", self.sim.state_hash())
        }
    }
    impl Hospital {
        fn game(&self) -> &Surgery {
            self.sim.play().unwrap().get::<Surgery>().unwrap()
        }
    }
    fn err(e: impl std::fmt::Display) -> JsValue {
        JsValue::from_str(&e.to_string())
    }
}
