use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::forces::drag::apply_drag;

/// Test atmospheric drag in low Earth orbit
#[test]
fn test_leo_atmospheric_drag() {
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.radius = 6371e3;
    earth.atmosphere = Some(physics_wasm::common::types::AtmosphereParams {
        has_atmosphere: Some(true),
        surface_pressure: Some(101325.0), // Pa at sea level
        scale_height: Some(8500.0), // meters
        mean_temperature: Some(288.0), // K
        drag_coefficient: None, // Used for body experiencing drag, not atmosphere provider
    });
    earth.pos = Vector3::zero();

    let mut satellite = PhysicsBody::default();
    satellite.name = "Satellite".to_string();
    satellite.mass = 1000.0;
    satellite.radius = 1.0; // 1m radius (for cross-section)
    satellite.atmosphere = Some(physics_wasm::common::types::AtmosphereParams {
        drag_coefficient: Some(2.2), // Typical for satellite
        ..Default::default()
    });
    // LEO altitude ~400km
    satellite.pos = Vector3::new(6771e3, 0.0, 0.0);
    satellite.vel = Vector3::new(0.0, 7670.0, 0.0); // Orbital velocity

    let mut r_vec = satellite.pos;
    r_vec.sub(&earth.pos);
    let dist = r_vec.len();

    let drag_force = apply_drag(&earth, &satellite, &r_vec, dist);

    // Drag should oppose motion
    assert!(
        drag_force.len() > 0.0,
        "Drag force should be non-zero at LEO altitude"
    );

    // Drag should oppose velocity
    let drag_dot_vel = drag_force.dot(&satellite.vel);
    println!("Drag force: {:.6e} N", drag_force.len());
    println!("Drag · velocity: {:.6e}", drag_dot_vel);

    // Drag opposes motion, so dot product should be negative
    assert!(drag_dot_vel < 0.0, "Drag should oppose orbital motion");
}

/// Test that drag decreases with altitude
#[test]
fn test_drag_altitude_dependence() {
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.radius = 6371e3;
    earth.atmosphere = Some(physics_wasm::common::types::AtmosphereParams {
        has_atmosphere: Some(true),
        surface_pressure: Some(101325.0),
        scale_height: Some(8500.0),
        mean_temperature: Some(288.0),
        ..Default::default()
    });
    earth.pos = Vector3::zero();

    let mut satellite = PhysicsBody::default();
    satellite.mass = 1000.0;
    satellite.radius = 1.0;
    satellite.atmosphere = Some(physics_wasm::common::types::AtmosphereParams {
        drag_coefficient: Some(2.2),
        ..Default::default()
    });
    satellite.vel = Vector3::new(0.0, 7000.0, 0.0);

    // Low altitude (200 km)
    satellite.pos = Vector3::new(6571e3, 0.0, 0.0);
    let mut r_vec = satellite.pos;
    let dist_low = r_vec.len();
    let drag_low = apply_drag(&earth, &satellite, &r_vec, dist_low);

    // High altitude (800 km)
    satellite.pos = Vector3::new(7171e3, 0.0, 0.0);
    r_vec = satellite.pos;
    let dist_high = r_vec.len();
    let drag_high = apply_drag(&earth, &satellite, &r_vec, dist_high);

    println!("Drag at 200km: {:.6e} N", drag_low.len());
    println!("Drag at 800km: {:.6e} N", drag_high.len());

    // Drag should decrease exponentially with altitude
    assert!(
        drag_low.len() > drag_high.len(),
        "Drag should be stronger at lower altitude"
    );
}

/// Test Mars atmosphere effects
#[test]
fn test_mars_atmosphere() {
    let mut mars = PhysicsBody::default();
    mars.name = "Mars".to_string();
    mars.mass = 6.4171e23;
    mars.radius = 3389.5e3;
    mars.atmosphere = Some(physics_wasm::common::types::AtmosphereParams {
        has_atmosphere: Some(true),
        surface_pressure: Some(600.0), // Much thinner than Earth
        scale_height: Some(11100.0),
        mean_temperature: Some(210.0),
        ..Default::default()
    });
    mars.pos = Vector3::zero();

    let mut probe = PhysicsBody::default();
    probe.name = "Probe".to_string();
    probe.mass = 500.0;
    probe.radius = 0.5;
    probe.atmosphere = Some(physics_wasm::common::types::AtmosphereParams {
        drag_coefficient: Some(2.2),
        ..Default::default()
    });
    probe.pos = Vector3::new(3589.5e3, 0.0, 0.0); // 200km altitude
    probe.vel = Vector3::new(0.0, 3400.0, 0.0);

    let mut r_vec = probe.pos;
    let dist = r_vec.len();

    let drag_force = apply_drag(&mars, &probe, &r_vec, dist);

    // Mars thin atmosphere should still produce drag
    println!("Mars drag at 200km: {:.6e} N", drag_force.len());
}

/// Test drag coefficient effect
#[test]
fn test_drag_coefficient_effect() {
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.radius = 6371e3;
    earth.atmosphere = Some(physics_wasm::common::types::AtmosphereParams {
        has_atmosphere: Some(true),
        surface_pressure: Some(101325.0),
        scale_height: Some(8500.0),
        mean_temperature: Some(288.0),
        ..Default::default()
    });
    earth.pos = Vector3::zero();

    let mut body = PhysicsBody::default();
    body.mass = 1000.0;
    body.radius = 1.0;
    body.pos = Vector3::new(6671e3, 0.0, 0.0);
    body.vel = Vector3::new(0.0, 7500.0, 0.0);

    let mut r_vec = body.pos;
    let dist = r_vec.len();

    // Streamlined (low Cd)
    body.atmosphere = Some(physics_wasm::common::types::AtmosphereParams {
        drag_coefficient: Some(0.5),
        ..Default::default()
    });
    let drag_sleek = apply_drag(&earth, &body, &r_vec, dist);

    // Blunt (high Cd)
    body.atmosphere = Some(physics_wasm::common::types::AtmosphereParams {
        drag_coefficient: Some(3.0),
        ..Default::default()
    });
    let drag_blunt = apply_drag(&earth, &body, &r_vec, dist);

    println!("Drag with Cd=0.5: {:.6e} N", drag_sleek.len());
    println!("Drag with Cd=3.0: {:.6e} N", drag_blunt.len());

    // Higher Cd should give more drag
    assert!(
        drag_blunt.len() > drag_sleek.len(),
        "Higher drag coefficient should give more drag"
    );
}

/// Test Venus thick atmosphere
#[test]
fn test_venus_thick_atmosphere() {
    let mut venus = PhysicsBody::default();
    venus.name = "Venus".to_string();
    venus.mass = 4.8675e24;
    venus.radius = 6051.8e3;
    venus.atmosphere = Some(physics_wasm::common::types::AtmosphereParams {
        has_atmosphere: Some(true),
        surface_pressure: Some(9200000.0), // 92 bar!
        scale_height: Some(15900.0),
        mean_temperature: Some(737.0),
        ..Default::default()
    });
    venus.pos = Vector3::zero();

    let mut probe = PhysicsBody::default();
    probe.mass = 100.0;
    probe.radius = 0.3;
    probe.atmosphere = Some(physics_wasm::common::types::AtmosphereParams {
        drag_coefficient: Some(2.0),
        ..Default::default()
    });
    probe.pos = Vector3::new(6151.8e3, 0.0, 0.0); // 100km altitude
    probe.vel = Vector3::new(0.0, 7000.0, 0.0);

    let mut r_vec = probe.pos;
    let dist = r_vec.len();

    let drag_force = apply_drag(&venus, &probe, &r_vec, dist);

    // Venus has VERY thick atmosphere - drag should be significant
    println!("Venus drag at 100km: {:.6e} N", drag_force.len());
    assert!(drag_force.len() > 0.0, "Venus should have measurable drag");
}
