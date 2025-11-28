use physics_wasm::forces::solar::{apply_srp, apply_pr_drag};
use physics_wasm::common::types::{PhysicsBody, Vector3};

#[test]
fn test_apply_srp() {
    let sun = PhysicsBody::default();
    
    let mut sail = PhysicsBody::default();
    sail.radius = 100.0; // Large area
    sail.pos = Vector3::new(1.5e11, 0.0, 0.0);
    
    let mut r_vec = sail.pos; r_vec.sub(&sun.pos);
    let dist = r_vec.len();
    
    let force = apply_srp(&sun, &sail, &r_vec, dist);
    
    // SRP is repulsive (away from Sun)
    // r_vec is Sun -> Sail (positive x)
    // Force should be positive x
    assert!(force.x > 0.0);
}

#[test]
fn test_apply_pr_drag() {
    let mut sun = PhysicsBody::default();
    sun.vel = Vector3::zero();
    
    let mut dust = PhysicsBody::default();
    dust.radius = 0.001;
    dust.pos = Vector3::new(1.5e11, 0.0, 0.0);
    dust.vel = Vector3::new(0.0, 30000.0, 0.0); // Orbiting
    
    let mut r_vec = dust.pos; r_vec.sub(&sun.pos);
    let dist = r_vec.len();
    
    let force = apply_pr_drag(&sun, &dust, &r_vec, dist);
    
    // PR drag opposes velocity
    // Velocity is +y, force should be -y
    assert!(force.y < 0.0);
}
