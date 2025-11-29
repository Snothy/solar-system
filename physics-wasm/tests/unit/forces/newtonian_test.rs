use approx::assert_relative_eq;
use physics_wasm::common::constants::G;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::forces::gravity::{apply_j2, apply_newtonian};

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

#[test]
fn test_j2_force() {
    let mut primary = PhysicsBody::default();
    primary.mass = 5.972e24; // Earth
    primary.radius = 6378137.0;
    primary.gravity_harmonics = Some(physics_wasm::common::types::HarmonicsParams {
        j2: Some(0.0010826),
        pole_vector: Some(Vector3::new(0.0, 0.0, 1.0)), // Z-aligned pole
        ..Default::default()
    });
    primary.pos = Vector3::zero();

    let mut satellite = PhysicsBody::default();
    satellite.mass = 1000.0;
    satellite.pos = Vector3::new(7000000.0, 0.0, 0.0); // Equatorial orbit

    let mut r_vec = satellite.pos;
    r_vec.sub(&primary.pos);
    let dist = r_vec.len();
    let dist_sq = dist * dist;

    let force = apply_j2(&primary, &satellite, &r_vec, dist, dist_sq);

    // At equator (z=0), J2 force is purely radial and attractive (adds to gravity)
    // F_J2 = - (3 GM m J2 R^2) / (2 r^4) * r_hat (approx)
    // Let's check implementation behavior
    // t1 = r_vec * (5 * 0 - 1) = -r_vec
    // t1.scale(factor/dist)
    // So it returns -r_vec * factor/dist
    // Which is attractive (towards primary).

    let r4 = dist_sq * dist_sq;
    let factor = (3.0
        * G
        * primary.mass
        * satellite.mass
        * primary.gravity_harmonics.as_ref().unwrap().j2.unwrap()
        * primary.radius
        * primary.radius)
        / (2.0 * r4);
    let expected_mag = factor; // Since it's along r_vec

    assert_relative_eq!(force.len(), expected_mag, epsilon = 1e-6);
    // Should be negative X (attractive)
    assert!(force.x < 0.0);
    assert_relative_eq!(force.y, 0.0);
    assert_relative_eq!(force.z, 0.0);
}
