use approx::assert_relative_eq;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::forces::gravity::apply_newtonian;

#[test]
fn test_newtonian_gravity() {
    let mut b1 = PhysicsBody::default();
    b1.gm = (1.0e24) * physics_wasm::common::constants::G;
    b1.pos = Vector3::zero();

    let mut b2 = PhysicsBody::default();
    b2.gm = (10.0) * physics_wasm::common::constants::G;
    b2.pos = Vector3::new(1.0e7, 0.0, 0.0); // 10,000 km away

    let mut r_vec = b2.pos;
    r_vec.sub(&b1.pos);
    let dist_sq = r_vec.len_sq();

    let force = apply_newtonian(&b1, &b2, &r_vec, dist_sq);

    // a = GM / r^2 for source body b2
    let expected_mag = b2.gm / dist_sq;

    // Force should be attractive (towards b1, which is at origin)
    // But apply_newtonian returns force on b2?
    // Let's check implementation:
    // f = r_vec.normalize() * f_mag
    // r_vec is b2.pos - b1.pos (vector from b1 to b2)
    // So force is in direction of r_vec (away from b1).
    // Wait, gravity is attractive.
    // In `calculate_accelerations`:
    // let f = apply_newtonian(...)
    // let mut a = f; a.scale(-1.0 / b.gm / physics_wasm::common::constants::G);
    // So `apply_newtonian` returns a vector pointing AWAY from the source (repulsive direction) if r_vec is source->target?
    // Implementation: f = *r_vec; f.normalize(); f.scale(f_mag);
    // Yes, it returns a vector in direction of r_vec.
    // If r_vec is b1->b2, then force is b1->b2.
    // Gravity on b2 should be b2->b1 (negative r_vec).
    // So `apply_newtonian` just calculates the magnitude along the r_vec line.
    // The caller handles the sign.

    assert_relative_eq!(force.len(), expected_mag, epsilon = 1e-6);
    assert_relative_eq!(force.x, expected_mag, epsilon = 1e-6); // Pointing +X
    assert_relative_eq!(force.y, 0.0);
    assert_relative_eq!(force.z, 0.0);
}


