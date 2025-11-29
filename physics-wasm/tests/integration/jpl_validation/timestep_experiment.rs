
use crate::common::{load_bodies, load_jpl_vector, initialize_from_jpl, JPLVector};
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::integrators::step_saba4;
use physics_wasm::dynamics::hierarchy::update_hierarchy;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

#[test]
fn test_timestep_sensitivity() {
    let bodies_to_test = vec!["Phobos", "Mimas", "Io"];
    let timesteps = vec![3600.0, 600.0, 60.0]; // 1 hour, 10 mins, 1 min
    
    println!("Running Timestep Sensitivity Experiment...");
    println!("Bodies: {:?}", bodies_to_test);
    println!("Timesteps: {:?}", timesteps);
    
    let mut results = String::new();
    results.push_str("| Body | Timestep (s) | Max Pos Error (km) | Max Pos Error % |\n");
    results.push_str("|------|--------------|--------------------|-----------------|\n");
    
    for body_name in bodies_to_test {
        for dt in &timesteps {
            let error_stats = run_simulation_for_body(body_name, *dt);
            if let Some((max_err, max_percent)) = error_stats {
                results.push_str(&format!("| {} | {} | {:.3} | {:.6}% |\n", 
                    body_name, dt, max_err, max_percent));
                println!("Completed {} with dt={}", body_name, dt);
            }
        }
    }
    
    println!("\nResults:\n{}", results);
}

fn run_simulation_for_body(body_name: &str, dt: f64) -> Option<(f64, f64)> {
    // 1. Setup
    let mut bodies = load_bodies();
    let jpl_data = load_jpl_vector(body_name)?;
    
    if jpl_data.is_empty() { return None; }
    
    // Find body index
    let body_idx = bodies.iter().position(|b| b.name == body_name)?;
    
    // Initialize all bodies from JPL at t=0
    // We need to initialize ALL bodies that have data to ensure gravity is correct
    for (i, body) in bodies.iter_mut().enumerate() {
        if let Some(data) = load_jpl_vector(&body.name) {
            if !data.is_empty() {
                initialize_from_jpl(body, &data[0]);
            }
        }
    }
    
    let parent_indices = update_hierarchy(&bodies);
    
    // Run for 24 hours only to save time, usually enough to see the trend
    let duration_hours = 24;
    let steps_per_hour = (3600.0 / dt).round() as usize;
    
    let mut max_pos_error = 0.0;
    let mut max_pos_percent = 0.0;
    
    for hour in 1..=duration_hours {
        // Run substeps to reach the next hour
        for _ in 0..steps_per_hour {
            step_saba4(
                &mut bodies,
                &parent_indices,
                dt,
                true, true, true, true, true, true, false, true, true
            );
        }
        
        // Compare with JPL data at the hour mark
        if hour < jpl_data.len() {
            let jpl_pos = Vector3::new(jpl_data[hour].pos[0], jpl_data[hour].pos[1], jpl_data[hour].pos[2]);
            let pos_error_km = bodies[body_idx].pos.distance_to(&jpl_pos) / 1000.0;
            let pos_mag_km = jpl_pos.len() / 1000.0;
            
            if pos_error_km > max_pos_error {
                max_pos_error = pos_error_km;
            }
            
            let percent = if pos_mag_km > 0.0 { (pos_error_km / pos_mag_km) * 100.0 } else { 0.0 };
            if percent > max_pos_percent {
                max_pos_percent = percent;
            }
        }
    }
    
    Some((max_pos_error, max_pos_percent))
}
