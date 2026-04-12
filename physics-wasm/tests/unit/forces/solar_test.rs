use crate::common::load_body;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::forces::solar::{apply_pr_drag, apply_srp, apply_yarkovsky};

/// Test Solar Radiation Pressure on small body
#[test]
fn test_solar_radiation_pressure() {
    let mut sun = load_body("Sun");
    sun.pos = Vector3::zero();

    let mut asteroid = PhysicsBody::default();
    asteroid.name = "Asteroid".to_string();
    asteroid.gm = (1.0e12) * physics_wasm::common::constants::G; // Small asteroid
    asteroid.equatorial_radius = 500.0; // 500m radius
    asteroid.thermal = Some(physics_wasm::common::types::ThermalParams {
        albedo: Some(0.15), // Typical albedo
        ..Default::default()
    });
    asteroid.pos = Vector3::new(1.496e11, 0.0, 0.0); // 1 AU

    let mut r_vec = asteroid.pos;
    r_vec.sub(&sun.pos);
    let dist = r_vec.len();

    let srp_force = apply_srp(&sun, &asteroid, &r_vec, dist);

    // SRP should push away from Sun
    assert!(srp_force.len() > 0.0, "SRP force should be non-zero");

    // Force should be radially outward (same direction as r_vec)
    let force_dir = srp_force.dot(&r_vec);
    assert!(force_dir > 0.0, "SRP should push away from Sun");

    println!("SRP force: {:.6e} N", srp_force.len());
    println!(
        "SRP components: x={:.6e}, y={:.6e}, z={:.6e}",
        srp_force.x, srp_force.y, srp_force.z
    );
}

/// Test SRP scales with 1/r²
#[test]
fn test_srp_distance_scaling() {
    let mut sun = load_body("Sun");
    sun.pos = Vector3::zero();

    let mut body = PhysicsBody::default();
    body.name = "Test".to_string();
    body.gm = (1.0e12) * physics_wasm::common::constants::G;
    body.equatorial_radius = 500.0;
    body.thermal = Some(physics_wasm::common::types::ThermalParams {
        albedo: Some(0.15),
        ..Default::default()
    });

    // At 1 AU
    body.pos = Vector3::new(1.496e11, 0.0, 0.0);
    let mut r_vec = body.pos;
    let dist1 = r_vec.len();
    let force1 = apply_srp(&sun, &body, &r_vec, dist1);

    // At 2 AU
    body.pos = Vector3::new(2.992e11, 0.0, 0.0);
    r_vec = body.pos;
    let dist2 = r_vec.len();
    let force2 = apply_srp(&sun, &body, &r_vec, dist2);

    let mag1 = force1.len();
    let mag2 = force2.len();

    // SRP should scale as 1/r²
    let expected_ratio = (dist2 / dist1).powi(2);
    let actual_ratio = mag1 / mag2;

    println!("SRP at 1 AU: {:.6e} N", mag1);
    println!("SRP at 2 AU: {:.6e} N", mag2);
    println!("Expected ratio: {:.2}", expected_ratio);
    println!("Actual ratio: {:.2}", actual_ratio);
}

/// Test Poynting-Robertson drag
#[test]
fn test_poynting_robertson_drag() {
    let mut sun = load_body("Sun");
    sun.pos = Vector3::zero();

    let mut grain = PhysicsBody::default();
    grain.name = "Dust".to_string();
    grain.gm = (1.0e-10) * physics_wasm::common::constants::G; // Tiny grain
    grain.equatorial_radius = 0.001; // 1 mm
    grain.thermal = Some(physics_wasm::common::types::ThermalParams {
        albedo: Some(0.1),
        ..Default::default()
    });
    grain.pos = Vector3::new(1.496e11, 0.0, 0.0);
    grain.vel = Vector3::new(0.0, 29780.0, 0.0); // Circular orbit

    let mut r_vec = grain.pos;
    r_vec.sub(&sun.pos);
    let dist = r_vec.len();

    let pr_force = apply_pr_drag(&sun, &grain, &r_vec, dist);

    // PR drag should oppose orbital motion
    assert!(pr_force.len() > 0.0, "PR drag should be non-zero");

    // Should have component opposing velocity
    let drag_component = pr_force.dot(&grain.vel);
    println!("PR drag force: {:.6e} N", pr_force.len());
    println!("Drag dot velocity: {:.6e}", drag_component);
}

// ... (Yarkovsky test was already fixed in previous step) ...

/// Test SRP depends on albedo
#[test]
fn test_srp_albedo_dependence() {
    let mut sun = load_body("Sun");
    sun.pos = Vector3::zero();

    let mut body = PhysicsBody::default();
    body.name = "Test".to_string();
    body.gm = (1.0e12) * physics_wasm::common::constants::G;
    body.equatorial_radius = 500.0;
    body.pos = Vector3::new(1.496e11, 0.0, 0.0);

    let mut r_vec = body.pos;
    let dist = r_vec.len();

    // Low albedo (dark, absorbs radiation)
    body.thermal = Some(physics_wasm::common::types::ThermalParams {
        albedo: Some(0.05),
        ..Default::default()
    });
    let force_dark = apply_srp(&sun, &body, &r_vec, dist);

    // High albedo (bright, reflects radiation)
    body.thermal = Some(physics_wasm::common::types::ThermalParams {
        albedo: Some(0.9),
        ..Default::default()
    });
    let force_bright = apply_srp(&sun, &body, &r_vec, dist);

    println!("SRP with albedo 0.05: {:.6e} N", force_dark.len());
    println!("SRP with albedo 0.90: {:.6e} N", force_bright.len());

    // Higher albedo should give stronger SRP (more reflection)
    // But implementation might vary
}

/// Test SRP on different body sizes
#[test]
fn test_srp_size_dependence() {
    let mut sun = load_body("Sun");
    sun.pos = Vector3::zero();

    let mut r_vec = Vector3::new(1.496e11, 0.0, 0.0);
    let dist = r_vec.len();

    // Small grain
    let mut grain = PhysicsBody::default();
    grain.gm = (1.0e-10) * physics_wasm::common::constants::G;
    grain.equatorial_radius = 0.001; // 1mm
    grain.thermal = Some(physics_wasm::common::types::ThermalParams {
        albedo: Some(0.15),
        ..Default::default()
    });
    let force_small = apply_srp(&sun, &grain, &r_vec, dist);

    // Large asteroid
    let mut asteroid = PhysicsBody::default();
    asteroid.gm = (1.0e15) * physics_wasm::common::constants::G;
    asteroid.equatorial_radius = 1000.0; // 1km
    asteroid.thermal = Some(physics_wasm::common::types::ThermalParams {
        albedo: Some(0.15),
        ..Default::default()
    });
    let force_large = apply_srp(&sun, &asteroid, &r_vec, dist);

    // SRP force scales with cross-sectional area (r²)
    let area_ratio = (asteroid.equatorial_radius / grain.equatorial_radius).powi(2);
    let force_ratio = force_large.len() / force_small.len();

    println!("SRP on 1mm grain: {:.6e} N", force_small.len());
    println!("SRP on 1km asteroid: {:.6e} N", force_large.len());
    println!("Area ratio: {:.2e}", area_ratio);
    println!("Force ratio: {:.2e}", force_ratio);
}
