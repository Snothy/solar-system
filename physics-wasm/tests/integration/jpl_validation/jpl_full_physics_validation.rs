use crate::common::{initialize_from_jpl, load_bodies, load_jpl_vector};
use physics_wasm::common::types::Vector3;
use physics_wasm::common::config::PhysicsConfig;
use physics_wasm::dynamics::hierarchy::update_hierarchy;
use physics_wasm::integrators::*;
use std::fs::File;
use std::io::Write;

/// Strict error thresholds - DO NOT INFLATE TO MAKE TESTS PASS
const INNER_PLANET_POS_THRESHOLD_KM: f64 = 100.0; // 100 km max error
const INNER_PLANET_VEL_THRESHOLD_MS: f64 = 1.0; // 1 m/s max error
const OUTER_PLANET_POS_THRESHOLD_KM: f64 = 1000.0; // 1000 km max error
const OUTER_PLANET_VEL_THRESHOLD_MS: f64 = 10.0; // 10 m/s max error
const MAJOR_MOON_POS_THRESHOLD_KM: f64 = 50.0; // 50 km max error
const MAJOR_MOON_VEL_THRESHOLD_MS: f64 = 0.5; // 0.5 m/s max error

struct JPLValidationResult {
    body_name: String,
    duration_hours: usize,
    mean_pos_error_km: f64,
    max_pos_error_km: f64,
    final_pos_error_km: f64,
    mean_vel_error_ms: f64,
    max_vel_error_ms: f64,
    final_vel_error_ms: f64,
    passed: bool,
    integrator: String,
}

/// Test inner planet (Mercury) with FULL physics for 30 days
#[test]
fn test_mercury_full_physics_30days() {
    let result = run_jpl_validation("Mercury", 30 * 24, "SABA4", true);

    println!("\n=== MERCURY 30-DAY VALIDATION ===");
    print_result(&result);

    assert!(
        result.passed,
        "Mercury FAILED: max position error {:.2} km > {} km threshold",
        result.max_pos_error_km, INNER_PLANET_POS_THRESHOLD_KM
    );
}

/// Test Earth with FULL physics for 30 days
#[test]
fn test_earth_full_physics_30days() {
    let result = run_jpl_validation("Earth", 30 * 24, "SABA4", true);

    println!("\n=== EARTH 30-DAY VALIDATION ===");
    print_result(&result);

    assert!(
        result.passed,
        "Earth FAILED: max position error {:.2} km > {} km threshold",
        result.max_pos_error_km, INNER_PLANET_POS_THRESHOLD_KM
    );
}

/// Test Mars with FULL physics for 30 days  
#[test]
fn test_mars_full_physics_30days() {
    let result = run_jpl_validation("Mars", 30 * 24, "SABA4", true);

    println!("\n=== MARS 30-DAY VALIDATION ===");
    print_result(&result);

    assert!(
        result.passed,
        "Mars FAILED: max position error {:.2} km > {} km threshold",
        result.max_pos_error_km, INNER_PLANET_POS_THRESHOLD_KM
    );
}

/// Test Jupiter with FULL physics for 30 days
#[test]
fn test_jupiter_full_physics_30days() {
    let result = run_jpl_validation("Jupiter", 30 * 24, "SABA4", true);

    println!("\n=== JUPITER 30-DAY VALIDATION ===");
    print_result(&result);

    assert!(
        result.passed,
        "Jupiter FAILED: max position error {:.2} km > {} km threshold",
        result.max_pos_error_km, OUTER_PLANET_POS_THRESHOLD_KM
    );
}

/// Test Moon (Earth's) with FULL physics for 7 days
#[test]
fn test_moon_full_physics_7days() {
    let result = run_jpl_validation("Moon", 7 * 24, "SABA4", true);

    println!("\n=== MOON 7-DAY VALIDATION ===");
    print_result(&result);

    assert!(
        result.passed,
        "Moon FAILED: max position error {:.2} km > {} km threshold",
        result.max_pos_error_km, MAJOR_MOON_POS_THRESHOLD_KM
    );
}

/// Core JPL validation function with ALL PHYSICS ENABLED
fn run_jpl_validation(
    body_name: &str,
    duration_hours: usize,
    integrator: &str,
    full_physics: bool,
) -> JPLValidationResult {
    let mut bodies = load_bodies();

    // Find target body
    let body_idx = bodies
        .iter()
        .position(|b| b.name == body_name)
        .expect(&format!("{} not found in bodies", body_name));

    // Load JPL data
    let jpl_data = load_jpl_vector(body_name).expect(&format!("No JPL data for {}", body_name));

    if jpl_data.is_empty() || jpl_data.len() < duration_hours {
        panic!(
            "{}: Insufficient JPL data (need {} hours, have {})",
            body_name,
            duration_hours,
            jpl_data.len()
        );
    }

    // Initialize from JPL t=0
    initialize_from_jpl(&mut bodies[body_idx], &jpl_data[0]);

    // Also initialize Sun and other major bodies for realistic simulation
    for body in &mut bodies {
        if let Some(body_jpl) = load_jpl_vector(&body.name) {
            if !body_jpl.is_empty() {
                initialize_from_jpl(body, &body_jpl[0]);
            }
        }
    }

    let parent_indices = update_hierarchy(&bodies);

    let dt = 3600.0; // 1 hour timestep

    let mut pos_errors = Vec::new();
    let mut vel_errors = Vec::new();

    // Simulate with FULL PHYSICS
    // Simulate with FULL PHYSICS
    let mut current_sim_time = 0.0;
    let saba4_dt = 60.0; // Small fixed step for SABA4

    let mut config = PhysicsConfig::default();
    if full_physics {
        config.relativity = true;
        config.gravitational_harmonics = true;
        config.tidal_forces = true;
        config.solar_radiation_pressure = true;
        config.yarkovsky_effect = true;
        config.atmospheric_drag = true;
        config.poynting_robertson_drag = true;
        config.comet_forces = true;
    }

    for hour in 1..=duration_hours {
        let target_time = hour as f64 * 3600.0;
        let time_to_advance = target_time - current_sim_time;

        if time_to_advance <= 0.0 {
            continue;
        }

        match integrator {
            "SABA4" => {
                // SABA4: Must run in many small steps
                let num_substeps = (time_to_advance / saba4_dt).round() as usize;
                // Adjust dt slightly to hit target exactly if needed, though round() should be close
                // Better: just run fixed steps and force sync at end if needed?
                // Actually, for validation, let's just run exactly N steps of (time_to_advance / N)
                // to ensure we hit target_time exactly.
                let step_size = time_to_advance / num_substeps as f64;

                for _ in 0..num_substeps {
                    step_saba4(
                        &mut bodies,
                        &parent_indices,
                        step_size,
                        &config,
                    );
                }
            }
            "WisdomHolman" => {
                // WisdomHolman: Can take larger steps, but let's just take one big step for the hour
                // or match the previous logic if it was working.
                // The previous logic used dt=3600.0. Let's stick to that.
                step_wisdom_holman(
                    &mut bodies,
                    &parent_indices,
                    time_to_advance,
                    &config,
                );
            }
            _ => panic!("Unknown integrator: {}", integrator),
        }

        current_sim_time = target_time;

        // Compare with JPL
        let step = hour; // JPL data index corresponds to hour

        // Compare with JPL
        if step < jpl_data.len() {
            let jpl_pos = Vector3::new(
                jpl_data[step].pos[0],
                jpl_data[step].pos[1],
                jpl_data[step].pos[2],
            );
            let jpl_vel = Vector3::new(
                jpl_data[step].vel[0],
                jpl_data[step].vel[1],
                jpl_data[step].vel[2],
            );

            let pos_error_m = bodies[body_idx].pos.distance_to(&jpl_pos);
            let vel_error_ms = bodies[body_idx].vel.distance_to(&jpl_vel);

            pos_errors.push(pos_error_m / 1000.0); // Convert to km
            vel_errors.push(vel_error_ms);
            
            if step == 1 || step == duration_hours {
                println!("Step {}: Sim Pos {:?}, JPL Pos {:?}", step, bodies[body_idx].pos, jpl_pos);
            }
        }
    }

    if pos_errors.is_empty() {
        panic!("{}: No comparison data collected", body_name);
    }

    // Calculate statistics
    let mean_pos = pos_errors.iter().sum::<f64>() / pos_errors.len() as f64;
    let max_pos = pos_errors.iter().cloned().fold(0.0f64, f64::max);
    let final_pos = *pos_errors.last().unwrap();

    let mean_vel = vel_errors.iter().sum::<f64>() / vel_errors.len() as f64;
    let max_vel = vel_errors.iter().cloned().fold(0.0f64, f64::max);
    let final_vel = *vel_errors.last().unwrap();

    // Determine threshold based on body type
    let (pos_threshold, vel_threshold) = match body_name {
        "Mercury" | "Venus" | "Earth" | "Mars" => {
            (INNER_PLANET_POS_THRESHOLD_KM, INNER_PLANET_VEL_THRESHOLD_MS)
        }
        "Jupiter" | "Saturn" | "Uranus" | "Neptune" => {
            (OUTER_PLANET_POS_THRESHOLD_KM, OUTER_PLANET_VEL_THRESHOLD_MS)
        }
        "Moon" | "Io" | "Europa" | "Ganymede" | "Callisto" | "Titan" | "Triton" => {
            (MAJOR_MOON_POS_THRESHOLD_KM, MAJOR_MOON_VEL_THRESHOLD_MS)
        }
        _ => (1000.0, 10.0), // Default for small bodies
    };

    let passed = max_pos <= pos_threshold && max_vel <= vel_threshold;

    JPLValidationResult {
        body_name: body_name.to_string(),
        duration_hours,
        mean_pos_error_km: mean_pos,
        max_pos_error_km: max_pos,
        final_pos_error_km: final_pos,
        mean_vel_error_ms: mean_vel,
        max_vel_error_ms: max_vel,
        final_vel_error_ms: final_vel,
        passed,
        integrator: integrator.to_string(),
    }
}

fn print_result(result: &JPLValidationResult) {
    println!("Body: {}", result.body_name);
    println!(
        "Duration: {} hours ({} days)",
        result.duration_hours,
        result.duration_hours / 24
    );
    println!("Integrator: {}", result.integrator);
    println!("\nPosition Error (km):");
    println!("  Mean:  {:.3}", result.mean_pos_error_km);
    println!("  Max:   {:.3}", result.max_pos_error_km);
    println!("  Final: {:.3}", result.final_pos_error_km);
    println!("\nVelocity Error (m/s):");
    println!("  Mean:  {:.6}", result.mean_vel_error_ms);
    println!("  Max:   {:.6}", result.max_vel_error_ms);
    println!("  Final: {:.6}", result.final_vel_error_ms);
    println!(
        "\nStatus: {}",
        if result.passed {
            "✅ PASS"
        } else {
            "❌ FAIL"
        }
    );
}

/// Generate comprehensive test report
#[test]
#[ignore] // Run separately with --ignored
fn generate_comprehensive_jpl_report() {
    let mut report = String::new();
    report.push_str("# Comprehensive JPL Validation Report\n\n");
    report.push_str("## ALL PHYSICS ENABLED\n\n");
    report.push_str("- Relativity (PPN)\n");
    report.push_str("- J2 Perturbations\n");
    report.push_str("- Tidal Forces\n");
    report.push_str("- Solar Radiation Pressure\n");
    report.push_str("- Yarkovsky Effect\n");
    report.push_str("- Atmospheric Drag\n");
    report.push_str("- PR Drag\n");
    report.push_str("- Cometary Forces\n\n");

    report.push_str("## Test Results\n\n");

    let bodies = vec!["Mercury", "Earth", "Mars", "Jupiter"];

    let mut all_passed = true;
    for body in &bodies {
        let result = run_jpl_validation(body, 30 * 24, "SABA4", true);

        report.push_str(&format!("### {}\n\n", body));
        report.push_str(&format!("| Metric | Mean | Max | Final | Threshold |\n"));
        report.push_str("|--------|------|-----|-------|----------|\n");
        report.push_str(&format!(
            "| Position (km) | {:.2} | {:.2} | {:.2} | {} |\n",
            result.mean_pos_error_km,
            result.max_pos_error_km,
            result.final_pos_error_km,
            if body.contains("Jupiter") {
                "1000"
            } else {
                "100"
            }
        ));
        report.push_str(&format!(
            "| Velocity (m/s) | {:.4} | {:.4} | {:.4} | {} |\n\n",
            result.mean_vel_error_ms,
            result.max_vel_error_ms,
            result.final_vel_error_ms,
            if body.contains("Jupiter") { "10" } else { "1" }
        ));
        report.push_str(&format!(
            "**Status**: {}\n\n",
            if result.passed {
                "✅ PASS"
            } else {
                "❌ FAIL"
            }
        ));

        if !result.passed {
            all_passed = false;
        }
    }

    report.push_str(&format!(
        "\n## Overall Result: {}\n",
        if all_passed {
            "✅ ALL TESTS PASSED"
        } else {
            "❌ SOME TESTS FAILED"
        }
    ));

    let mut file = File::create("COMPREHENSIVE_JPL_REPORT.md").expect("Failed to create report");
    file.write_all(report.as_bytes())
        .expect("Failed to write report");

    println!("\n✅ Comprehensive JPL report generated: COMPREHENSIVE_JPL_REPORT.md");
}
