use physics_wasm::forces::tidal::apply_tidal;
use physics_wasm::common::types::{PhysicsBody, Vector3};

#[test]
fn test_apply_tidal() {
    let mut primary = PhysicsBody::default();
    primary.mass = 1.0e24;
    primary.radius = 6.0e6;
    primary.k2 = Some(0.3);
    primary.tidal_q = Some(100.0);
    primary.angular_velocity = Some(Vector3::new(0.0, 0.0, 1.0e-4)); // Fast spin
    primary.vel = Vector3::zero();
    
    let mut satellite = PhysicsBody::default();
    satellite.mass = 1.0e20;
    satellite.pos = Vector3::new(1.0e8, 0.0, 0.0);
    satellite.vel = Vector3::new(0.0, 1.0e3, 0.0); // Orbiting
    
    let mut r_vec = satellite.pos; r_vec.sub(&primary.pos);
    let dist = r_vec.len();
    
    let force = apply_tidal(&primary, &satellite, &r_vec, dist);
    
    // Should have some force
    assert!(force.len() > 0.0);
    
    // Spin is fast, so tidal bulge should lead satellite.
    // Torque transfers angular momentum from spin to orbit.
    // Force should have tangential component accelerating satellite?
    // Or drag it?
    // If spin > orbital_ang_vel, bulge leads, pulls satellite forward (accelerates).
    // Orbital ang vel ~ v/r = 1e3/1e8 = 1e-5.
    // Spin = 1e-4. Spin > Orbital.
    // Should accelerate satellite (tangential force in direction of velocity).
    
    // Velocity is +y. Force y component should be positive.
    assert!(force.y > 0.0);
}
