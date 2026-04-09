use crate::common::types::{PhysicsBody, Vector3};
use crate::common::time::unix_timestamp_to_jd;
use crate::core::Simulation;
use js_sys::Float32Array;
use wasm_bindgen::prelude::*;
use serde::Serialize;

/// Manages frontend-specific visualization state and logic.
/// This includes trails, light time delay, aberration, and visual scaling.
struct FrontendState {
    trails: Vec<Vec<f32>>,
    trail_indices: Vec<usize>,
    visual_positions: Vec<f32>,
    geometric_positions: Vec<f32>,
}

impl FrontendState {
    pub fn new(n_bodies: usize) -> Self {
        let mut trails = Vec::with_capacity(n_bodies);
        for _ in 0..n_bodies {
            trails.push(vec![0.0; 3000]); // 1000 points * 3 coords
        }
        Self {
            trails,
            trail_indices: vec![0; n_bodies],
            visual_positions: vec![0.0; n_bodies * 3],
            geometric_positions: vec![0.0; n_bodies * 3],
        }
    }

    pub fn resize(&mut self, n_bodies: usize) {
        if n_bodies != self.trails.len() {
            self.trails = vec![vec![0.0; 3000]; n_bodies];
            self.trail_indices = vec![0; n_bodies];
            self.visual_positions = vec![0.0; n_bodies * 3];
            self.geometric_positions = vec![0.0; n_bodies * 3];
        }
    }

    pub fn compute_visual_state(
        &mut self,
        bodies: &[PhysicsBody],
        observer_x: f64,
        observer_y: f64,
        observer_z: f64,
        observer_vx: f64,
        observer_vy: f64,
        observer_vz: f64,
        scale_factor: f64,
        use_light_time_delay: bool,
        enable_light_aberration: bool,
    ) -> JsValue {
        let n = bodies.len();
        
        // Auto-resize if needed
        if n != self.trails.len() {
            self.resize(n);
        }

        let observer_pos = Vector3::new(observer_x, observer_y, observer_z);
        let observer_vel = Vector3::new(observer_vx, observer_vy, observer_vz);
        let c_light = 299792458.0;

        for i in 0..n {
            let b = &bodies[i];

            // 1. Geometric Position (scaled)
            let mut pos = b.pos;
            pos.scale(scale_factor); // Convert to visual units

            self.geometric_positions[i * 3] = pos.x as f32;
            self.geometric_positions[i * 3 + 1] = pos.y as f32;
            self.geometric_positions[i * 3 + 2] = pos.z as f32;

            let mut vis_pos = pos;

            // 2. Light Time Delay
            if use_light_time_delay {
                let dist_visual = observer_pos.distance_to(&vis_pos);
                let dist_meters = dist_visual / scale_factor;
                let delay = dist_meters / c_light;

                let mut correction = b.vel;
                correction.scale(-delay * scale_factor);
                vis_pos.add(&correction);
            }

            // 3. Light Aberration
            if enable_light_aberration {
                let mut to_obj = vis_pos;
                to_obj.sub(&observer_pos);
                to_obj.normalize();

                let v_cross = observer_vel.cross(&to_obj);
                let aberration_angle = v_cross.len() / c_light;

                if aberration_angle > 1e-12 {
                    let mut perp = v_cross;
                    perp.normalize();
                    let dist = observer_pos.distance_to(&vis_pos);
                    let shift_mag = dist * aberration_angle.sin();
                    perp.scale(shift_mag);
                    vis_pos.add(&perp);
                }
            }

            self.visual_positions[i * 3] = vis_pos.x as f32;
            self.visual_positions[i * 3 + 1] = vis_pos.y as f32;
            self.visual_positions[i * 3 + 2] = vis_pos.z as f32;

            // Update Trails
            let t_idx = self.trail_indices[i];
            let trail_len = self.trails[i].len() / 3;

            self.trails[i][t_idx * 3] = pos.x as f32;
            self.trails[i][t_idx * 3 + 1] = pos.y as f32;
            self.trails[i][t_idx * 3 + 2] = pos.z as f32;

            self.trail_indices[i] = (t_idx + 1) % trail_len;
        }

        // Return object with positions and trails
        let result = js_sys::Object::new();



        // Use from() to copy data safely to JS
        let pos_array = js_sys::Float32Array::from(self.visual_positions.as_slice());
        let geo_array = js_sys::Float32Array::from(self.geometric_positions.as_slice());
        


        js_sys::Reflect::set(&result, &JsValue::from("positions"), &pos_array).unwrap();
        js_sys::Reflect::set(&result, &JsValue::from("geometricPositions"), &geo_array).unwrap();
        result.into()
    }

    pub fn get_trail(&self, body_idx: usize) -> Float32Array {
        if body_idx < self.trails.len() {
            js_sys::Float32Array::from(self.trails[body_idx].as_slice())
        } else {
            Float32Array::new_with_length(0)
        }
    }

    pub fn get_trail_index(&self, body_idx: usize) -> usize {
        if body_idx < self.trail_indices.len() {
            self.trail_indices[body_idx]
        } else {
            0
        }
    }
}

#[wasm_bindgen]
pub struct FrontendSimulation {
    sim: Simulation,
    frontend_state: FrontendState,
    cached_config: crate::common::config::PhysicsConfig,
}

#[wasm_bindgen]
impl FrontendSimulation {
    #[wasm_bindgen(constructor)]
    pub fn new(bodies_js: JsValue, initial_timestamp_ms: f64) -> FrontendSimulation {
        let bodies: Vec<PhysicsBody> = serde_wasm_bindgen::from_value(bodies_js).unwrap();
        let n_bodies = bodies.len();
        let initial_jd = unix_timestamp_to_jd(initial_timestamp_ms);
        FrontendSimulation {
            sim: Simulation::new(bodies, initial_jd),
            frontend_state: FrontendState::new(n_bodies),
            cached_config: crate::common::config::PhysicsConfig::default(),
        }
    }

    /// Update the physics config. Call this when settings change, not on every step.
    pub fn set_config(&mut self, config_js: JsValue) {
        if let Ok(config) = serde_wasm_bindgen::from_value(config_js) {
            self.cached_config = config;
        }
    }

    pub fn update_bodies(&mut self, bodies_js: JsValue) {
        let new_bodies: Vec<PhysicsBody> = serde_wasm_bindgen::from_value(bodies_js).unwrap();
        if new_bodies.len() != self.sim.bodies.len() {
             self.frontend_state.resize(new_bodies.len());
        }
        
        self.sim.bodies = new_bodies;
        self.sim.update_hierarchy_internal();
    }

    pub fn step(
        &mut self,
        dt: f64,
        sim_time: f64,
        integrator_type: u8,
        quality: u8
    ) -> f64 {
        self.sim.step(dt, sim_time, &self.cached_config, integrator_type, quality)
    }

    pub fn get_bodies(&self) -> JsValue {
        let serializer = serde_wasm_bindgen::Serializer::json_compatible();
        self.sim.bodies.serialize(&serializer).unwrap()
    }

    pub fn get_barycenter(&self) -> JsValue {
        let bary = self.sim.get_barycenter();
        let serializer = serde_wasm_bindgen::Serializer::json_compatible();
        bary.serialize(&serializer).unwrap()
    }

    pub fn check_collisions(&self) -> JsValue {
        let collisions = crate::dynamics::collisions::check_collisions(&self.sim.bodies);
        let serializer = serde_wasm_bindgen::Serializer::json_compatible();
        collisions.serialize(&serializer).unwrap()
    }

    pub fn get_visual_state(
        &mut self,
        observer_x: f64,
        observer_y: f64,
        observer_z: f64,
        observer_vx: f64,
        observer_vy: f64,
        observer_vz: f64,
        scale_factor: f64,
        use_light_time_delay: bool,
        enable_light_aberration: bool,
    ) -> JsValue {
        self.frontend_state.compute_visual_state(
            &self.sim.bodies,
            observer_x,
            observer_y,
            observer_z,
            observer_vx,
            observer_vy,
            observer_vz,
            scale_factor,
            use_light_time_delay,
            enable_light_aberration,
        )
    }
    
    pub fn get_trail(&self, body_idx: usize) -> Float32Array {
        self.frontend_state.get_trail(body_idx)
    }

    pub fn get_trail_index(&self, body_idx: usize) -> usize {
        self.frontend_state.get_trail_index(body_idx)
    }
}
