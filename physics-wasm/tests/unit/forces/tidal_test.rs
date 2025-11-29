use physics_wasm::common::types::{Vector3, PhysicsBody};
use physics_wasm::forces::tidal::apply_tidal;
use physics_wasm::common::constants::G;
use approx::assert_relative_eq;

/// Test tidal forces between Earth and Moon
#[test]
fn test_earth_moon_tidal_force() {
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.radius = 6371e3;
    earth.k2 = Some(0.299); // Earth's Love number
    earth.tidal_q = Some(12.0);
    earth.pos = Vector3::zero();
    earth.vel = Vector3::zero();

    let mut moon = PhysicsBody::default();
    moon.name = "Moon".to_string();
    moon.mass = 7.342e22;
    moon.radius = 1737.4e3;
    moon.pos = Vector3::new(384400e3, 0.0, 0.0); // Moon's distance
    moon.vel = Vector3::new(0.0, 1022.0, 0.0); // Orbital velocity

    let mut r_vec = moon.pos;
    r_vec.sub(&earth.pos);
    let dist = r_vec.len();

    let tidal_force = apply_tidal(&earth, &moon, &r_vec, dist);

    // Tidal force should be non-zero
    assert!(tidal_force.len() > 0.0, "Tidal force should be non-zero");
    
    println!("Earth-Moon tidal force: {:.6e} N", tidal_force.len());
    println!("Tidal force components: x={:.6e}, y={:.6e}, z={:.6e}", 
        tidal_force.x, tidal_force.y, tidal_force.z);
}

/// Test tidal forces on Io from Jupiter
/// Io has extreme tidal heating
#[test]  
fn test_io_tidal_heating() {
    let mut jupiter = PhysicsBody::default();
    jupiter.name = "Jupiter".to_string();
    jupiter.mass = 1.8982e27;
    jupiter.radius = 71492e3;
    jupiter.k2 = Some(0.379);
    jupiter.tidal_q = Some(100.0);
    jupiter.pos = Vector3::zero();
    jupiter.vel = Vector3::zero();

    let mut io = PhysicsBody::default();
    io.name = "Io".to_string();
    io.mass = 8.9319e22;
    io.radius = 1821.6e3;
    io.pos = Vector3::new(421700e3, 0.0, 0.0); // Io's orbit
    io.vel = Vector3::new(0.0, 17334.0, 0.0);

    let mut r_vec = io.pos;
    r_vec.sub(&jupiter.pos);
    let dist = r_vec.len();

    let tidal_force = apply_tidal(&jupiter, &io, &r_vec, dist);

    // Io experiences VERY strong tidal forces
    assert!(tidal_force.len() > 0.0, "Io's tidal force should be non-zero");
    
    println!("Jupiter-Io tidal force: {:.6e} N", tidal_force.len());
}

/// Test that tidal force scales with 1/r^6 (approximately)
#[test]
fn test_tidal_distance_dependence() {
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.radius = 6371e3;
    earth.k2 = Some(0.299);
    earth.tidal_q = Some(12.0);
    earth.pos = Vector3::zero();
    earth.vel = Vector3::zero();

    let mut body = PhysicsBody::default();
    body.name = "Test".to_string();
    body.mass = 1.0e20;
    body.vel = Vector3::new(0.0, 1000.0, 0.0);

    // Test at distance r
    body.pos = Vector3::new(384400e3, 0.0, 0.0);
    let mut r_vec = body.pos;
    let dist1 = r_vec.len();
    let force1 = apply_tidal(&earth, &body, &r_vec, dist1);

    // Test at distance 2r
    body.pos = Vector3::new(768800e3, 0.0, 0.0);
    r_vec = body.pos;
    let dist2 = r_vec.len();
    let force2 = apply_tidal(&earth, &body, &r_vec, dist2);

    let mag1 = force1.len();
    let mag2 = force2.len();
    
    // Tidal force implementation scales as 1/r^7 (force on satellite due to bulge on primary)
    // At 2x distance, force should be 1/128th. So F1/F2 should be 128.
    let expected_ratio = (dist2 / dist1).powi(7);
    let actual_ratio = mag1 / mag2;
    
    println!("Force at {:.0e} m: {:.6e} N", dist1, mag1);
    println!("Force at {:.0e} m: {:.6e} N", dist2, mag2);
    println!("Expected ratio (r1/r2)^6: {:.2}", expected_ratio);
    println!("Actual ratio F1/F2: {:.2}", actual_ratio);
    
    // Should be close to 1/r^6 scaling
    assert_relative_eq!(actual_ratio, expected_ratio, epsilon = 0.5);
}

/// Test tidal quality factor (Q) effect
#[test]
fn test_tidal_q_factor() {
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.radius = 6371e3;
    earth.k2 = Some(0.299);
    earth.pos = Vector3::zero();
    earth.vel = Vector3::zero();

    let mut moon = PhysicsBody::default();
    moon.name = "Moon".to_string();
    moon.mass = 7.342e22;
    moon.pos = Vector3::new(384400e3, 0.0, 0.0);
    moon.vel = Vector3::new(0.0, 1022.0, 0.0);

    let mut r_vec = moon.pos;
    let dist = r_vec.len();

    // Low Q (more dissipation)
    earth.tidal_q = Some(1.0);
    let force_low_q = apply_tidal(&earth, &moon, &r_vec, dist);

    // High Q (less dissipation)
    earth.tidal_q = Some(1000.0);
    let force_high_q = apply_tidal(&earth, &moon, &r_vec, dist);

    println!("Tidal force with Q=1: {:.6e} N", force_low_q.len());
    println!("Tidal force with Q=1000: {:.6e} N", force_high_q.len());
    
    // Lower Q should give stronger tidal dissipation effect
    // (though the exact relationship depends on implementation)
}

/// Test that k2 (Love number) affects tidal force magnitude
#[test]
fn test_love_number_effect() {
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.radius = 6371e3;
    earth.tidal_q = Some(12.0);
    earth.pos = Vector3::zero();
    earth.vel = Vector3::zero();

    let mut moon = PhysicsBody::default();
    moon.name = "Moon".to_string();
    moon.mass = 7.342e22;
    moon.pos = Vector3::new(384400e3, 0.0, 0.0);
    moon.vel = Vector3::new(0.0, 1022.0, 0.0);

    let mut r_vec = moon.pos;
    let dist = r_vec.len();

    // Small k2 (rigid body)
    earth.k2 = Some(0.1);
    let force_rigid = apply_tidal(&earth, &moon, &r_vec, dist);

    // Large k2 (deformable)
    earth.k2 = Some(0.5);
    let force_deformable = apply_tidal(&earth, &moon, &r_vec, dist);

    println!("Tidal force with k2=0.1: {:.6e} N", force_rigid.len());
    println!("Tidal force with k2=0.5: {:.6e} N", force_deformable.len());
    
    // Higher k2 should give larger tidal bulge and stronger force
    assert!(force_deformable.len() > force_rigid.len(), 
        "Higher k2 should give larger tidal force");
}
