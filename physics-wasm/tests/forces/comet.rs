use physics_wasm::forces::comet::apply_cometary_forces;
use physics_wasm::common::types::{PhysicsBody, Vector3};

#[test]
fn test_apply_cometary_forces() {
    let mut sun = PhysicsBody::default();
    sun.vel = Vector3::zero();
    
    let mut comet = PhysicsBody::default();
    comet.mass = 1.0e14;
    comet.pos = Vector3::new(1.5e11, 0.0, 0.0); // 1 AU
    comet.vel = Vector3::new(0.0, 30000.0, 0.0);
    comet.comet_a1 = Some(1.0e-8); // Radial
    comet.comet_a2 = Some(0.0);
    comet.comet_a3 = Some(0.0);
    
    let mut r_vec = comet.pos; r_vec.sub(&sun.pos);
    let dist = r_vec.len();
    
    let force = apply_cometary_forces(&sun, &comet, &r_vec, dist);
    
    // Radial force A1 is positive (outward from Sun usually? or inward?)
    // Standard A1 is non-gravitational acceleration.
    // Usually defined as radial outward (away from Sun) due to outgassing.
    // Code: f_r = dir_r * a1 * g_r
    // dir_r is r_vec normalized (Sun -> Body).
    // So positive A1 means outward force.
    
    assert!(force.x > 0.0);
    assert_eq!(force.y, 0.0);
    assert_eq!(force.z, 0.0);
}
