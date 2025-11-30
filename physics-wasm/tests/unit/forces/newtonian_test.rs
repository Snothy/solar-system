use approx::assert_relative_eq;
use physics_wasm::common::constants::G;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::forces::gravity::apply_newtonian;

#[test]
fn test_newtonian_gravity() {
    let mut b1 = PhysicsBody::default();
    b1.mass = 1.0e24;
    b1.pos = Vector3::zero();

    let mut b2 = PhysicsBody::default();
    b2.mass = 10.0;
    b2.pos = Vector3::new(1.0e7, 0.0, 0.0); // 10,000 km away

    let mut r_vec = b2.pos;
    r_vec.sub(&b1.pos);
    let dist_sq = r_vec.len_sq();

    let force = apply_newtonian(&b1, &b2, &r_vec, dist_sq);

    // F = G * m1 * m2 / r^2
    let expected_mag = (G * b1.mass * b2.mass) / dist_sq;

    // Force should be attractive (towards b1, which is at origin)
    // But apply_newtonian returns force on b2?
    // Let's check implementation:
    // f = r_vec.normalize() * f_mag
    // r_vec is b2.pos - b1.pos (vector from b1 to b2)
    // So force is in direction of r_vec (away from b1).
    // Wait, gravity is attractive.
    // In `calculate_accelerations`:
    // let f = apply_newtonian(...)
    // let mut a = f; a.scale(-1.0 / b.mass);
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


