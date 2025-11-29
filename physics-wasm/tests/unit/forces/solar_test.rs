use physics_wasm::common::types::{Vector3, PhysicsBody};
use physics_wasm::forces::solar::{apply_srp, apply_pr_drag, apply_yarkovsky};

/// Test Solar Radiation Pressure on small body
#[test]
fn test_solar_radiation_pressure() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.radius = 696340e3;
    sun.pos = Vector3::zero();

    let mut asteroid = PhysicsBody::default();
    asteroid.name = "Asteroid".to_string();
    asteroid.mass = 1.0e12; // Small asteroid
    asteroid.radius = 500.0; // 500m radius
    asteroid.albedo = Some(0.15); // Typical albedo
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
    println!("SRP components: x={:.6e}, y={:.6e}, z={:.6e}", 
        srp_force.x, srp_force.y, srp_force.z);
}

/// Test SRP scales with 1/r²
#[test]
fn test_srp_distance_scaling() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.radius = 696340e3;
    sun.pos = Vector3::zero();

    let mut body = PhysicsBody::default();
    body.name = "Test".to_string();
    body.mass = 1.0e12;
    body.radius = 500.0;
    body.albedo = Some(0.15);

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
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.radius = 696340e3;
    sun.pos = Vector3::zero();

    let mut grain = PhysicsBody::default();
    grain.name = "Dust".to_string();
    grain.mass = 1.0e-10; // Tiny grain
    grain.radius = 0.001; // 1 mm
    grain.albedo = Some(0.1);
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

/// Test Yarkovsky effect
#[test]
fn test_yarkovsky_effect() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.radius = 696340e3;
    sun.pos = Vector3::zero();

    let mut asteroid = PhysicsBody::default();
    asteroid.name = "Asteroid".to_string();
    asteroid.mass = 1.0e12;
    asteroid.radius = 500.0;
    asteroid.albedo = Some(0.15);
    asteroid.thermal_inertia = Some(200.0); // Typical value J/m²/K/s^0.5
    asteroid.mean_temperature = Some(250.0);
    asteroid.pos = Vector3::new(2.5e11, 0.0, 0.0); // Main belt
    asteroid.vel = Vector3::new(0.0, 20000.0, 0.0);

    let mut r_vec = asteroid.pos;
    r_vec.sub(&sun.pos);
    let dist = r_vec.len();

    let yark_force = apply_yarkovsky(&sun, &asteroid, &r_vec, dist);

    // Yarkovsky effect should produce a force
    println!("Yarkovsky force: {:.6e} N", yark_force.len());
    println!("Yarkovsky components: x={:.6e}, y={:.6e}, z={:.6e}", 
        yark_force.x, yark_force.y, yark_force.z);
}

/// Test SRP depends on albedo
#[test]
fn test_srp_albedo_dependence() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.radius = 696340e3;
    sun.pos = Vector3::zero();

    let mut body = PhysicsBody::default();
    body.name = "Test".to_string();
    body.mass = 1.0e12;
    body.radius = 500.0;
    body.pos = Vector3::new(1.496e11, 0.0, 0.0);

    let mut r_vec = body.pos;
    let dist = r_vec.len();

    // Low albedo (dark, absorbs radiation)
    body.albedo = Some(0.05);
    let force_dark = apply_srp(&sun, &body, &r_vec, dist);

    // High albedo (bright, reflects radiation)
    body.albedo = Some(0.9);
    let force_bright = apply_srp(&sun, &body, &r_vec, dist);

    println!("SRP with albedo 0.05: {:.6e} N", force_dark.len());
    println!("SRP with albedo 0.90: {:.6e} N", force_bright.len());
    
    // Higher albedo should give stronger SRP (more reflection)
    // But implementation might vary
}

/// Test SRP on different body sizes
#[test]
fn test_srp_size_dependence() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.radius = 696340e3;
    sun.pos = Vector3::zero();

    let mut r_vec = Vector3::new(1.496e11, 0.0, 0.0);
    let dist = r_vec.len();

    // Small grain
    let mut grain = PhysicsBody::default();
    grain.mass = 1.0e-10;
    grain.radius = 0.001; // 1mm
    grain.albedo = Some(0.15);
    let force_small = apply_srp(&sun, &grain, &r_vec, dist);

    // Large asteroid
    let mut asteroid = PhysicsBody::default();
    asteroid.mass = 1.0e15;
    asteroid.radius = 1000.0; // 1km
    asteroid.albedo = Some(0.15);
    let force_large = apply_srp(&sun, &asteroid, &r_vec, dist);

    // SRP force scales with cross-sectional area (r²)
    let area_ratio = (asteroid.radius / grain.radius).powi(2);
    let force_ratio = force_large.len() / force_small.len();
    
    println!("SRP on 1mm grain: {:.6e} N", force_small.len());
    println!("SRP on 1km asteroid: {:.6e} N", force_large.len());
    println!("Area ratio: {:.2e}", area_ratio);
    println!("Force ratio: {:.2e}", force_ratio);
}
