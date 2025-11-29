use physics_wasm::common::types::{Vector3, PhysicsBody};
use physics_wasm::common::utils::update_pole_orientation;

/// Test Earth's precession over time
#[test]
fn test_earth_precession() {
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.pole_ra0 = Some(0.0); // degrees
    earth.pole_dec0 = Some(90.0);
    earth.precession_rate = Some(50.29); // arcsec/year
    earth.pole_vector = Some(Vector3::new(0.0, 0.0, 1.0));
    
    let mut bodies = vec![earth];
    
    // Simulate 1 year of precession
    let sim_time = 365.25 * 24.0 * 3600.0; // 1 year in seconds
    
    update_pole_orientation(&mut bodies, sim_time, true, false);
    
    // Pole vector should have changed slightly
    println!("Pole vector after 1 year: {:?}", bodies[0].pole_vector);
}

/// Test nutation amplitude
#[test]
fn test_earth_nutation() {
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.pole_ra0 = Some(0.0);
    earth.pole_dec0 = Some(90.0);
    earth.nutation_amplitude = Some(9.2); // arcseconds
    earth.pole_vector = Some(Vector3::new(0.0, 0.0, 1.0));
    
    let mut bodies = vec![earth];
    
    // Test nutation at different times
    update_pole_orientation(&mut bodies, 0.0, false, true);
    let pole_t0 = bodies[0].pole_vector.unwrap();
    
    update_pole_orientation(&mut bodies, 86400.0, false, true); // 1 day
    let pole_t1 = bodies[0].pole_vector.unwrap();
    
    println!("Pole at t=0: {:?}", pole_t0);
    println!("Pole at t=1day: {:?}", pole_t1);
}

/// Test pole vector updates
#[test]
fn test_pole_vector_normalization() {
    let mut body = PhysicsBody::default();
    body.pole_ra0 = Some(45.0);
    body.pole_dec0 = Some(60.0);
    body.pole_vector = None; // Will be calculated
    
    let mut bodies = vec![body];
    
    update_pole_orientation(&mut bodies, 0.0, true, true);
    
    // Pole vector should be normalized
    let pole = bodies[0].pole_vector.unwrap();
    let magnitude = pole.len();
    
    println!("Pole vector: {:?}", pole);
    println!("Magnitude: {:.6}", magnitude);
    
    assert!((magnitude - 1.0).abs() < 0.01, "Pole vector should be normalized");
}
