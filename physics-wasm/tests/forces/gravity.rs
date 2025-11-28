use physics_wasm::forces::gravity::{apply_newtonian, apply_j2};
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::common::constants::G;

#[test]
fn test_apply_newtonian() {
    let mut b1 = PhysicsBody::default();
    b1.mass = 1.0e24;
    b1.pos = Vector3::zero();
    
    let mut b2 = PhysicsBody::default();
    b2.mass = 10.0;
    b2.pos = Vector3::new(1.0e7, 0.0, 0.0);
    
    let mut r_vec = b2.pos; r_vec.sub(&b1.pos);
    let dist_sq = r_vec.len_sq();
    
    let force = apply_newtonian(&b1, &b2, &r_vec, dist_sq);
    
    // F = G * m1 * m2 / r^2
    let expected_mag = G * 1.0e24 * 10.0 / 1.0e14;
    
    // Force should be along r_vec (repulsive? No, gravity is attractive).
    // Wait, apply_newtonian returns:
    // f = r_vec.normalize() * f_mag
    // r_vec points from b1 to b2.
    // So force is in direction of b2 relative to b1.
    // This seems to be force ON b2 due to b1? No, usually gravity is attractive.
    // If r_vec is b2 - b1, then it points to b2.
    // Force on b2 should be towards b1 (negative r_vec).
    // Let's check implementation:
    // f = *r_vec; f.normalize(); f.scale(f_mag);
    // It returns positive r_vec direction.
    // This implies it calculates magnitude and direction, but maybe the caller handles sign?
    // Or maybe it's force on b1?
    // If r_vec is b2 - b1, force on b1 is towards b2 (positive r_vec).
    // So this is force on b1 due to b2.
    
    assert!((force.len() - expected_mag).abs() < 1e-5);
    assert!(force.x > 0.0); // Points towards b2
}

#[test]
fn test_apply_j2() {
    let mut primary = PhysicsBody::default();
    primary.mass = 5.972e24;
    primary.radius = 6.371e6;
    primary.j2 = Some(0.0010826);
    primary.pole_vector = Some(Vector3::new(0.0, 0.0, 1.0));
    primary.pos = Vector3::zero();
    
    let mut satellite = PhysicsBody::default();
    satellite.mass = 1000.0;
    satellite.pos = Vector3::new(7.0e6, 0.0, 0.0); // Equatorial orbit
    
    let mut r_vec = satellite.pos; r_vec.sub(&primary.pos);
    let dist = r_vec.len();
    let dist_sq = dist * dist;
    
    let force = apply_j2(&primary, &satellite, &r_vec, dist, dist_sq);
    
    // At equator (z=0), force should be inward (negative x)
    // Code says: t1 = r_vec * (5*0 - 1) = -r_vec
    // t2 = 0
    // result = -r_vec * factor / dist
    // So it points opposite to r_vec (inward).
    
    assert!(force.x < 0.0);
    assert_eq!(force.y, 0.0);
    assert_eq!(force.z, 0.0);
}
