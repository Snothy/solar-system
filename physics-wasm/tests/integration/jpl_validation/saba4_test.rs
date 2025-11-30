use crate::common::{initialize_from_jpl, load_bodies, load_jpl_vector, get_initial_jd, JPLVector};
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::common::config::PhysicsConfig;
use physics_wasm::dynamics::hierarchy::update_hierarchy;
use physics_wasm::integrators::saba4::Saba4Integrator;
use physics_wasm::integrators::traits::Integrator;
use physics_wasm::integrators::types::IntegratorQuality;


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
fn test_saba4_integration_vs_jpl() {
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

    // 4. Run SABA4 Simulation
    println!("Testing SABA4 integrator for {} hours...", duration_hours);

    // Initialize from JPL data at t=0
    for (idx, data) in &bodies_with_data {
        initialize_from_jpl(&mut bodies[*idx], &data[0]);
    }

    let parent_indices = update_hierarchy(&bodies);
    let dt = 60.0; // 1 minute steps (60 per hour)
    let steps_per_hour = 6;

    // Extract initial JD from first data point
    let initial_jd = if let Some((_, data)) = bodies_with_data.first() {
        get_initial_jd(data)
    } else {
        2451545.0 // Fallback to J2000
    };
    let mut current_jd = initial_jd;

    // Track errors: (pos_error_km, vel_error_ms, pos_mag_km, vel_mag_ms)
    let mut body_errors: Vec<Vec<(f64, f64, f64, f64)>> = vec![Vec::new(); bodies_with_data.len()];

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

    let integrator = Saba4Integrator;

    for hour in 1..=duration_hours {
        let target_time = hour as f64 * 3600.0;
        let time_to_advance = target_time - current_sim_time;

        if time_to_advance > 0.0 {
            // SABA4 is fixed-step, so we must take multiple steps to reach the hour
            // We need to ensure we land exactly on the hour.
            let num_substeps = (time_to_advance / dt).round() as usize;
            let step_size = time_to_advance / num_substeps as f64;

            for _ in 0..num_substeps {
                integrator.step(
                    &mut bodies,
                    &parent_indices,
                    step_size,
                    &config,
                    IntegratorQuality::Medium,
                    current_jd,
                );
                current_jd += step_size / 86400.0; // Update JD (seconds to days)
            }
            current_sim_time = target_time;
        }

        // Calculate errors at the hour mark
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
            body_name: bodies[*body_idx].name.clone(),
            final_pos_error_km: final_error.0,
            final_vel_error_ms: final_error.1,
            max_pos_error_km: max_pos_error,
            max_vel_error_ms: max_vel_error,
            max_pos_error_percent: max_pos_percent,
            max_vel_error_percent: max_vel_percent,
        });
    }

    // Validation: Print summary (report generation moved to saba4_physics_validation.rs)
    println!("\n=== SABA4 Integrator Test Results ===");
    for result in &results {
        println!(
            "{}: Max Pos Error = {:.3} km ({:.6}%), Max Vel Error = {:.6} m/s ({:.6}%)",
            result.body_name,
            result.max_pos_error_km,
            result.max_pos_error_percent,
            result.max_vel_error_ms,
            result.max_vel_error_percent
        );
    }
}
