use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::integrators::wisdom_holman::step_wisdom_holman;
use serde::Deserialize;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

#[derive(Debug, Deserialize)]
struct JplDataPoint {
    date: String,
    pos: [f64; 3],
    vel: [f64; 3],
}

#[derive(Debug, Deserialize)]
struct BodyProperties {
    mass: f64,
    radius: f64,
    // other fields ignored
}

fn load_jpl_data(body_name: &str) -> Vec<JplDataPoint> {
    let path = Path::new("../formatted_data")
        .join(body_name)
        .join("vector_data")
        .join("data.json");
    
    let file = File::open(&path).expect(&format!("Failed to open file: {:?}", path));
    let reader = BufReader::new(file);
    serde_json::from_reader(reader).expect("Failed to parse JSON")
}

fn load_body_properties(body_name: &str) -> BodyProperties {
    let path = Path::new("../formatted_data")
        .join(body_name)
        .join("body_data")
        .join("properties.json");
        
    let file = File::open(&path).expect(&format!("Failed to open file: {:?}", path));
    let reader = BufReader::new(file);
    serde_json::from_reader(reader).expect("Failed to parse properties JSON")
}

#[test]
fn test_solar_system_validation() {
    // Load Data
    let sun_data = load_jpl_data("Sun");
    let earth_data = load_jpl_data("Earth");
    let moon_data = load_jpl_data("Moon");
    
    let sun_props = load_body_properties("Sun");
    let earth_props = load_body_properties("Earth");
    let moon_props = load_body_properties("Moon");

    // Initial State (Index 0)
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = sun_props.mass;
    sun.pos = Vector3::new(sun_data[0].pos[0], sun_data[0].pos[1], sun_data[0].pos[2]);
    sun.vel = Vector3::new(sun_data[0].vel[0], sun_data[0].vel[1], sun_data[0].vel[2]);
    
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = earth_props.mass;
    earth.pos = Vector3::new(earth_data[0].pos[0], earth_data[0].pos[1], earth_data[0].pos[2]);
    earth.vel = Vector3::new(earth_data[0].vel[0], earth_data[0].vel[1], earth_data[0].vel[2]);
    
    let mut moon = PhysicsBody::default();
    moon.name = "Moon".to_string();
    moon.mass = moon_props.mass;
    moon.pos = Vector3::new(moon_data[0].pos[0], moon_data[0].pos[1], moon_data[0].pos[2]);
    moon.vel = Vector3::new(moon_data[0].vel[0], moon_data[0].vel[1], moon_data[0].vel[2]);
    
    let mut bodies = vec![sun, earth, moon];
    let parent_indices = vec![None, Some(0), Some(1)]; // Sun -> Earth -> Moon hierarchy
    
    // Simulation Parameters
    // Data is hourly (from pull-data.ts: STEP_SIZE: "'1h'")
    // Let's run for 24 hours (1 day) and compare
    let sim_dt = 3600.0; // 1 hour
    let hours_to_test = 24;
    
    println!("Starting Simulation...");
    println!("Initial Earth Pos: {:?}", bodies[1].pos);
    
    for i in 0..hours_to_test {
        step_wisdom_holman(
            &mut bodies,
            &parent_indices,
            sim_dt,
            false, false, false, false, false, false, false, false, false
        );
        
        // Optional: Compare every step
        let current_idx = i + 1;
        if current_idx < sun_data.len() {
             // ...
        }
    }
    
    // Validation (Compare with index 24)
    let final_idx = hours_to_test;
    let earth_final_ref = &earth_data[final_idx];
    let moon_final_ref = &moon_data[final_idx];
    
    let earth_final_pos_ref = Vector3::new(earth_final_ref.pos[0], earth_final_ref.pos[1], earth_final_ref.pos[2]);
    let moon_final_pos_ref = Vector3::new(moon_final_ref.pos[0], moon_final_ref.pos[1], moon_final_ref.pos[2]);

    println!("Final Earth Pos (Sim): {:?}", bodies[1].pos);
    println!("Final Earth Pos (Ref): {:?}", earth_final_pos_ref);
    
    let earth_error = bodies[1].pos.distance_to(&earth_final_pos_ref);
    let moon_error = bodies[2].pos.distance_to(&moon_final_pos_ref);
    
    println!("Earth Position Error after {} hours: {} m", hours_to_test, earth_error);
    println!("Moon Position Error after {} hours: {} m", hours_to_test, moon_error);
    
    // Tolerances
    // Short term integration should be very accurate.
    // Missing Jupiter might cause some error, but over 1 day it should be small.
    
    assert!(earth_error < 1.0e5, "Earth error too high: {} m", earth_error); // < 100 km
    assert!(moon_error < 1.0e5, "Moon error too high: {} m", moon_error); // < 100 km
}
