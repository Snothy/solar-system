use crate::common::{initialize_from_jpl, load_bodies, load_jpl_vector, get_initial_jd, JPLVector};
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::common::config::PhysicsConfig;
use physics_wasm::core::Simulation;
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
    weekly_pos_errors_km: Vec<f64>,
}

#[test]
fn test_saba4_physics_vs_jpl() {
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
    let target_duration_hours = 720; // 30 days
    let mut duration_hours = target_duration_hours;

    for (_, data) in &bodies_with_data {
        if data.len() < duration_hours + 1 {
            duration_hours = data.len() - 1;
        }
    }

    if duration_hours == 0 {
        return;
    }

    // 4. Run Physics Engine Simulation with SABA4
    println!("Testing SABA4 via physics engine for {} hours...", duration_hours);

    // Initialize from JPL data at t=0
    for (idx, data) in &bodies_with_data {
        initialize_from_jpl(&mut bodies[*idx], &data[0]);
    }

    // Extract initial JD from first data point
    let initial_jd = if let Some((_, data)) = bodies_with_data.first() {
        get_initial_jd(data)
    } else {
        2451545.0 // Fallback to J2000
    };

    // Create Simulation instance
    let mut simulation = Simulation::new(bodies, initial_jd);

    

    // Track errors: (pos_error_km, vel_error_ms, pos_mag_km, vel_mag_ms)
    let mut body_errors: Vec<Vec<(f64, f64, f64, f64)>> = vec![Vec::new(); bodies_with_data.len()];
    
    // Track weekly errors for reporting
    let mut weekly_errors: Vec<Vec<f64>> = vec![Vec::new(); bodies_with_data.len()];

    let mut current_sim_time = 0.0;

    let mut config = PhysicsConfig::default();
    config.relativity = true;
    config.gravitational_harmonics = true;
    config.tidal_forces = true;
    config.solar_radiation_pressure = true;
    config.yarkovsky_effect = true;
    config.atmospheric_drag = true;
    config.use_eih = true;
    config.poynting_robertson_drag = true;
    config.yorp_effect = true;
    config.comet_forces = true;
    config.precession = true;
    config.nutation = true;
    config.solar_mass_loss = true;
    config.collisions = true;

    let dt = 60.0; // 1 minute steps

    for hour in 1..=duration_hours {
        let target_time = hour as f64 * 3600.0;
        
        // Loop until we catch up to the target time
        while current_sim_time < target_time {
            // Be careful not to overshoot the target time by a tiny fraction
            let mut step_to_take = dt;
            if current_sim_time + step_to_take > target_time {
                 step_to_take = target_time - current_sim_time;
            }

            simulation.step(
                step_to_take,
                current_sim_time,
                &config,
                2, // SABA4
                2, // Quality
            );
            current_sim_time += step_to_take;
        }

        // Calculate errors
        for (i, (body_idx, data)) in bodies_with_data.iter().enumerate() {
            if hour < data.len() {
                let jpl_pos = Vector3::new(data[hour].pos[0], data[hour].pos[1], data[hour].pos[2]);
                let jpl_vel = Vector3::new(data[hour].vel[0], data[hour].vel[1], data[hour].vel[2]);

                let pos_error_km = simulation.bodies[*body_idx].pos.distance_to(&jpl_pos) / 1000.0;
                let vel_error_ms = simulation.bodies[*body_idx].vel.distance_to(&jpl_vel);

                let pos_mag_km = jpl_pos.len() / 1000.0;
                let vel_mag_ms = jpl_vel.len();

                body_errors[i].push((pos_error_km, vel_error_ms, pos_mag_km, vel_mag_ms));
            }
        }

        
        // Capture weekly errors (every 168 hours)
        if hour % 168 == 0 {
            for (i, _) in bodies_with_data.iter().enumerate() {
                if let Some(last_error) = body_errors[i].last() {
                    weekly_errors[i].push(last_error.0);
                } else {
                    weekly_errors[i].push(0.0);
                }
            }
        }
    }

    // Collect results
    let mut results = Vec::new();
    for (i, (body_idx, _)) in bodies_with_data.iter().enumerate() {
        let errors = &body_errors[i];
        if errors.is_empty() {
            continue;
        }

        let final_error = errors.last().unwrap();
        let max_pos_error = errors.iter().map(|e| e.0).fold(0.0f64, f64::max);
        let max_vel_error = errors.iter().map(|e| e.1).fold(0.0f64, f64::max);

        // Calculate max percentage errors
        // Avoid division by zero
        let max_pos_percent = errors
            .iter()
            .map(|e| if e.2 > 1e-6 { (e.0 / e.2) * 100.0 } else { 0.0 })
            .fold(0.0f64, f64::max);

        let max_vel_percent = errors
            .iter()
            .map(|e| if e.3 > 1e-6 { (e.1 / e.3) * 100.0 } else { 0.0 })
            .fold(0.0f64, f64::max);

        results.push(SimulationResult {
            body_name: simulation.bodies[*body_idx].name.clone(),
            final_pos_error_km: final_error.0,
            final_vel_error_ms: final_error.1,
            max_pos_error_km: max_pos_error,
            max_vel_error_ms: max_vel_error,
            max_pos_error_percent: max_pos_percent,
            max_vel_error_percent: max_vel_percent,
            weekly_pos_errors_km: weekly_errors[i].clone(),
        });
    }

    // 5. Generate Report
    generate_report(&results, duration_hours);
}

fn generate_report(results: &[SimulationResult], duration_hours: usize) {
    let output_dir = Path::new("../output_integration");
    
    // Get timestamp from env (set by npm script) or use current time
    let timestamp = std::env::var("TEST_TIMESTAMP").unwrap_or_else(|_| {
        chrono::Local::now().format("%Y-%m-%dT%H-%M-%S").to_string()
    });

    // Create historical directory
    let history_dir = output_dir.join(&timestamp);
    if !history_dir.exists() {
        fs::create_dir_all(&history_dir).expect("Failed to create history directory");
    }
    
    // Ensure base output dir exists
    if !output_dir.exists() {
        fs::create_dir_all(output_dir).expect("Failed to create output directory");
    }

    let mut report = String::new();
    report.push_str("# SABA4 Physics Engine Validation Report\n\n");
    
    // Add Date/Time to header
    let pretty_date = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    report.push_str(&format!("**Date:** {}\n", pretty_date));
    report.push_str(&format!("**Run ID:** {}\n\n", timestamp));

    report.push_str(&format!(
        "**Duration:** {} hours ({} days)\n\n",
        duration_hours,
        duration_hours / 24
    ));

    report.push_str("**Test Type:** Full Physics Engine (via `Simulation` module)\n\n");

    report.push_str("| Body | Max Pos Error % | Max Pos Error (km) | Final Pos Error (km) | Week 1 (km) | Week 2 (km) | Week 3 (km) | Week 4 (km) | Max Vel Error % | Max Vel Error (m/s) |\n");
    report.push_str("|------|-----------------|--------------------|----------------------|-------------|-------------|-------------|-------------|-----------------|---------------------|\n");

    // Sort by max position error percentage descending
    let mut sorted_results: Vec<&SimulationResult> = results.iter().collect();
    sorted_results.sort_by(|a, b| {
        b.max_pos_error_percent
            .partial_cmp(&a.max_pos_error_percent)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    for result in sorted_results {
        let w1 = result.weekly_pos_errors_km.get(0).unwrap_or(&0.0);
        let w2 = result.weekly_pos_errors_km.get(1).unwrap_or(&0.0);
        let w3 = result.weekly_pos_errors_km.get(2).unwrap_or(&0.0);
        let w4 = result.weekly_pos_errors_km.get(3).unwrap_or(&0.0);

        report.push_str(&format!(
            "| {} | {:.6}% | {:.3} | {:.3} | {:.3} | {:.3} | {:.3} | {:.3} | {:.6}% | {:.6} |\n",
            result.body_name,
            result.max_pos_error_percent,
            result.max_pos_error_km,
            result.final_pos_error_km,
            w1, w2, w3, w4,
            result.max_vel_error_percent,
            result.max_vel_error_ms
        ));
    }

    // Write to historical file
    let history_path = history_dir.join("saba4_validation.md");
    let mut file = File::create(&history_path).expect("Failed to create historical report file");
    file.write_all(report.as_bytes())
        .expect("Failed to write historical report");

    println!("SABA4 Physics Engine Report generated at {:?}", history_path);
}
