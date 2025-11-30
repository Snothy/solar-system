use crate::common::types::PhysicsBody;
use crate::common::time::unix_timestamp_to_jd;
use crate::core::Simulation;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct PhysicsEngine {
    sim: Simulation,
}

#[wasm_bindgen]
impl PhysicsEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(bodies_js: JsValue, initial_timestamp_ms: f64) -> PhysicsEngine {
        let bodies: Vec<PhysicsBody> = serde_wasm_bindgen::from_value(bodies_js).unwrap();
        let initial_jd = unix_timestamp_to_jd(initial_timestamp_ms);
        PhysicsEngine {
            sim: Simulation::new(bodies, initial_jd),
        }
    }

    pub fn update_bodies(&mut self, bodies_js: JsValue) {
        let new_bodies: Vec<PhysicsBody> = serde_wasm_bindgen::from_value(bodies_js).unwrap();
        self.sim.bodies = new_bodies;
        self.sim.update_hierarchy_internal();
    }

    pub fn step(
        &mut self, 
        dt: f64, 
        sim_time: f64,
        config_js: JsValue,
        integrator_type: u8, // 0=Adaptive, 1=Wisdom-Holman, 2=SABA4, 3=HighPrecision
        quality: u8 // 0=Low, 1=Medium, 2=High, 3=Ultra
    ) -> f64 {
        let config: crate::common::config::PhysicsConfig = serde_wasm_bindgen::from_value(config_js).unwrap_or_default();
        self.sim.step(dt, sim_time, &config, integrator_type, quality)
    }

    pub fn get_bodies(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.sim.bodies).unwrap()
    }

    pub fn get_barycenter(&self) -> JsValue {
        let bary = self.sim.get_barycenter();
        serde_wasm_bindgen::to_value(&bary).unwrap()
    }

    pub fn get_moon_libration(&self) -> f64 {
        if let Some(moon) = self.sim.bodies.iter().find(|b| b.name == "Moon") {
            return moon.moon.as_ref().and_then(|m| m.libration).unwrap_or(0.0);
        }
        0.0
    }

    pub fn check_collisions(&self) -> JsValue {
        let collisions = crate::dynamics::collisions::check_collisions(&self.sim.bodies);
        serde_wasm_bindgen::to_value(&collisions).unwrap()
    }
}
