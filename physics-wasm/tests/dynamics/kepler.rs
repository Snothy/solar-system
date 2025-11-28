use physics_wasm::dynamics::kepler::{solve_kepler, drift_kepler};
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::common::constants::G;
use std::f64::consts::PI;

#[test]
fn test_solve_kepler() {
    // Circular orbit: M = E
    let e = solve_kepler(PI/2.0, 0.0);
    assert!((e - PI/2.0).abs() < 1e-10);
    
    // Elliptical orbit
    // M = E - e*sin(E)
    // Let E = PI/2, e = 0.5
    // M = PI/2 - 0.5 * 1 = 1.57 - 0.5 = 1.07
    let m = PI/2.0 - 0.5;
    let e_calc = solve_kepler(m, 0.5);
    assert!((e_calc - PI/2.0).abs() < 1e-10);
}

#[test]
fn test_drift_kepler_circular() {
    let sun_mass = 1.989e30;
    let sun_pos = Vector3::zero();
    let sun_vel = Vector3::zero();
    
    let mut earth = PhysicsBody::default();
    earth.mass = 5.972e24;
    let r = 1.496e11;
    let v = (G * sun_mass / r).sqrt(); // Circular velocity
    
    earth.pos = Vector3::new(r, 0.0, 0.0);
    earth.vel = Vector3::new(0.0, v, 0.0);
    
    // Drift for 1/4 period
    let period = 2.0 * PI * r / v;
    let dt = period / 4.0;
    
    drift_kepler(&mut earth, dt, sun_mass, &sun_pos, &sun_vel);
    
    // Should be at (0, r, 0) approximately
    assert!(earth.pos.x.abs() < r * 1e-4); // Allow some error due to numerical precision
    assert!((earth.pos.y - r).abs() < r * 1e-4);
}
