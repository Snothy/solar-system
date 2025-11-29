
use crate::common::{load_bodies, load_jpl_vector, initialize_from_jpl, JPLVector};
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::integrators::step_high_precision;
use physics_wasm::dynamics::hierarchy::update_hierarchy;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

struct SimulationResult {
    body_name: String,
    final_pos_error_km: f64,
    final_vel_error_ms: f64,
    max_pos_error_km: f64,
    max_vel_error_ms: f64,
    max_pos_error_percent: f64,
    max_vel_error_percent: f64,
}

#[test]
fn test_dop853_integration_vs_jpl() {
    // 1. Load all bodies
    let mut bodies = load_bodies();
    
    // 2. Identify bodies with JPL data
    let mut bodies_with_data: Vec<(usize, Vec<JPLVector>)> = Vec::new();
    
    for (i, body) in bodies.iter().enumerate() {
        if let Some(jpl_data) = load_jpl_vector(&body.name) {
            if !jpl_data.is_empty() {
                bodies_with_data.push((i, jpl_data));
            }
        }
    }
    
    if bodies_with_data.is_empty() {
        println!("No JPL data found for any body. Skipping test.");
        return;
    }
    
    // 3. Determine simulation duration
    let target_duration_hours = 168; // 1 week
    let mut duration_hours = target_duration_hours;
    
    for (_, data) in &bodies_with_data {
        if data.len() < duration_hours + 1 {
            duration_hours = data.len() - 1;
        }
    }
    
    if duration_hours == 0 {
        return;
    }
    
    // 4. Run DOP853 Simulation
    println!("Testing DOP853 integrator for {} hours...", duration_hours);
    
    // Initialize from JPL data at t=0
    for (idx, data) in &bodies_with_data {
        initialize_from_jpl(&mut bodies[*idx], &data[0]);
    }
    
    let parent_indices = update_hierarchy(&bodies);
    let dt = 3600.0; // 1 hour steps
    
    // Track errors: (pos_error_km, vel_error_ms, pos_mag_km, vel_mag_ms)
    let mut body_errors: Vec<Vec<(f64, f64, f64, f64)>> = vec![Vec::new(); bodies_with_data.len()];
    
    let mut current_sim_time = 0.0;
    
    for hour in 1..=duration_hours {
        let target_time = hour as f64 * 3600.0;
        let dt_step = target_time - current_sim_time;
        
        if dt_step > 0.0 {
            step_high_precision(
                &mut bodies,
                &parent_indices,
                dt_step,
                current_sim_time,
                true, // relativity
                true, // j2
                true, // tidal
                true, // srp
                true, // yarkovsky
                true, // drag
                false, // eih
                true, // pr_drag
                true, // comet
            );
            current_sim_time = target_time;
        }
        
        // Calculate errors
        for (i, (body_idx, data)) in bodies_with_data.iter().enumerate() {
            if hour < data.len() {
                let jpl_pos = Vector3::new(data[hour].pos[0], data[hour].pos[1], data[hour].pos[2]);
                let jpl_vel = Vector3::new(data[hour].vel[0], data[hour].vel[1], data[hour].vel[2]);
                
                let pos_error_km = bodies[*body_idx].pos.distance_to(&jpl_pos) / 1000.0;
                let vel_error_ms = bodies[*body_idx].vel.distance_to(&jpl_vel);
                
                let pos_mag_km = jpl_pos.len() / 1000.0;
                let vel_mag_ms = jpl_vel.len();
                
                body_errors[i].push((pos_error_km, vel_error_ms, pos_mag_km, vel_mag_ms));
            }
        }
    }
    
    // Collect results
    let mut results = Vec::new();
    for (i, (body_idx, _)) in bodies_with_data.iter().enumerate() {
        let errors = &body_errors[i];
        if errors.is_empty() { continue; }
        
        let final_error = errors.last().unwrap();
        let max_pos_error = errors.iter().map(|e| e.0).fold(0.0f64, f64::max);
        let max_vel_error = errors.iter().map(|e| e.1).fold(0.0f64, f64::max);
        
        // Calculate max percentage errors
        // Avoid division by zero
        let max_pos_percent = errors.iter()
            .map(|e| if e.2 > 1e-6 { (e.0 / e.2) * 100.0 } else { 0.0 })
            .fold(0.0f64, f64::max);
            
        let max_vel_percent = errors.iter()
            .map(|e| if e.3 > 1e-6 { (e.1 / e.3) * 100.0 } else { 0.0 })
            .fold(0.0f64, f64::max);
        
        results.push(SimulationResult {
            body_name: bodies[*body_idx].name.clone(),
            final_pos_error_km: final_error.0,
            final_vel_error_ms: final_error.1,
            max_pos_error_km: max_pos_error,
            max_vel_error_ms: max_vel_error,
            max_pos_error_percent: max_pos_percent,
            max_vel_error_percent: max_vel_percent,
        });
    }
    
    // 5. Generate Report
    generate_report(&results, duration_hours);
}

fn generate_report(results: &[SimulationResult], duration_hours: usize) {
    let output_dir = Path::new("../output_integration");
    if !output_dir.exists() {
        fs::create_dir_all(output_dir).expect("Failed to create output directory");
    }
    
    let mut report = String::new();
    report.push_str("# DOP853 Integration Test Report\n\n");
    report.push_str(&format!("**Duration:** {} hours ({} days)\n\n", duration_hours, duration_hours / 24));
    
    report.push_str("| Body | Max Pos Error % | Max Pos Error (km) | Final Pos Error (km) | Max Vel Error % | Max Vel Error (m/s) |\n");
    report.push_str("|------|-----------------|--------------------|----------------------|-----------------|---------------------|\n");
    
    // Sort by max position error percentage descending
    let mut sorted_results: Vec<&SimulationResult> = results.iter().collect();
    sorted_results.sort_by(|a, b| b.max_pos_error_percent.partial_cmp(&a.max_pos_error_percent).unwrap_or(std::cmp::Ordering::Equal));
    
    for result in sorted_results {
        report.push_str(&format!("| {} | {:.6}% | {:.3} | {:.3} | {:.6}% | {:.6} |\n", 
            result.body_name, 
            result.max_pos_error_percent,
            result.max_pos_error_km, 
            result.final_pos_error_km, 
            result.max_vel_error_percent,
            result.max_vel_error_ms
        ));
    }
    
    let report_path = output_dir.join("dop853_validation.md");
    let mut file = File::create(&report_path).expect("Failed to create report file");
    file.write_all(report.as_bytes()).expect("Failed to write report");
    
    println!("DOP853 Report generated at {:?}", report_path);
}
