use approx::assert_relative_eq;
use physics_wasm::common::constants::G;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::forces::relativity::{apply_relativity_eih, apply_relativity_ppn};

/// Test PPN (Parameterized Post-Newtonian) formulation
/// Mercury's orbit is the classic test case
#[test]
fn test_ppn_mercury_perihelion_precession() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.radius = 696340e3;
    sun.pos = Vector3::zero();
    sun.vel = Vector3::zero();

    let mut mercury = PhysicsBody::default();
    mercury.name = "Mercury".to_string();
    mercury.mass = 3.3011e23;
    mercury.radius = 2439700.0;
    // Mercury at perihelion (~46 million km)
    mercury.pos = Vector3::new(46e9, 0.0, 0.0);
    // Orbital velocity at perihelion (~58.98 km/s)
    mercury.vel = Vector3::new(0.0, 58980.0, 0.0);

    let mut r_vec = mercury.pos;
    r_vec.sub(&sun.pos);
    let dist = r_vec.len();
    let dist_sq = dist * dist;

    let (force_on_sun, force_on_mercury) =
        apply_relativity_ppn(&sun, &mercury, &r_vec, dist, dist_sq);

    // Relativistic correction should be non-zero
    assert!(force_on_mercury.len() > 0.0, "PPN force should be non-zero");

    // For Mercury at perihelion, relativistic correction causes perihelion advance
    // Expected: ~43 arcseconds per century
    // This is a TINY effect: GM/rc² ≈ 1e-8
    let newtonian_force = G * sun.mass * mercury.mass / dist_sq;
    let relativistic_ratio = force_on_mercury.len() / newtonian_force;

    println!("PPN force: {:.6e} N", force_on_mercury.len());
    println!("Newtonian force: {:.6e} N", newtonian_force);
    println!("Relativistic correction ratio: {:.6e}", relativistic_ratio);

    // Relativistic correction should be small but measurable
    assert!(
        relativistic_ratio > 1e-10,
        "Relativistic correction too small"
    );
    assert!(
        relativistic_ratio < 1e-5,
        "Relativistic correction too large"
    );
}

/// Test EIH (Einstein-Infeld-Hoffmann) formulation
/// Should be more accurate than PPN
#[test]
fn test_eih_mercury() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.radius = 696340e3;
    sun.pos = Vector3::zero();
    sun.vel = Vector3::zero();

    let mut mercury = PhysicsBody::default();
    mercury.name = "Mercury".to_string();
    mercury.mass = 3.3011e23;
    mercury.radius = 2439700.0;
    mercury.pos = Vector3::new(46e9, 0.0, 0.0);
    mercury.vel = Vector3::new(0.0, 58980.0, 0.0);

    let mut r_vec = mercury.pos;
    r_vec.sub(&sun.pos);
    let dist = r_vec.len();
    let dist_sq = dist * dist;

    let (force_on_sun, force_on_mercury) =
        apply_relativity_eih(&sun, &mercury, &r_vec, dist, dist_sq);

    assert!(force_on_mercury.len() > 0.0, "EIH force should be non-zero");

    println!("EIH force: {:.6e} N", force_on_mercury.len());
}

/// Compare PPN vs EIH for Mercury
#[test]
fn test_ppn_vs_eih_comparison() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.pos = Vector3::zero();
    sun.vel = Vector3::zero();

    let mut mercury = PhysicsBody::default();
    mercury.name = "Mercury".to_string();
    mercury.mass = 3.3011e23;
    mercury.pos = Vector3::new(46e9, 0.0, 0.0);
    mercury.vel = Vector3::new(0.0, 58980.0, 0.0);

    let mut r_vec = mercury.pos;
    r_vec.sub(&sun.pos);
    let dist = r_vec.len();
    let dist_sq = dist * dist;

    let (_, ppn_force) = apply_relativity_ppn(&sun, &mercury, &r_vec, dist, dist_sq);
    let (_, eih_force) = apply_relativity_eih(&sun, &mercury, &r_vec, dist, dist_sq);

    let ppn_mag = ppn_force.len();
    let eih_mag = eih_force.len();

    println!("PPN magnitude: {:.6e} N", ppn_mag);
    println!("EIH magnitude: {:.6e} N", eih_mag);
    println!(
        "Difference: {:.6e} N ({:.2}%)",
        (ppn_mag - eih_mag).abs(),
        (ppn_mag - eih_mag).abs() / ppn_mag * 100.0
    );

    // Both should give similar results (within ~10% typically)
    // but EIH is more accurate
    assert!(
        ppn_mag > 0.0 && eih_mag > 0.0,
        "Both forces should be non-zero"
    );
}

/// Test relativistic effects scale with velocity
#[test]
fn test_relativity_velocity_dependence() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.pos = Vector3::zero();
    sun.vel = Vector3::zero();

    let mut body = PhysicsBody::default();
    body.name = "Test".to_string();
    body.mass = 1.0e20;
    body.pos = Vector3::new(1e11, 0.0, 0.0);

    let mut r_vec = body.pos;
    let dist = r_vec.len();
    let dist_sq = dist * dist;

    // Test with low velocity
    body.vel = Vector3::new(0.0, 10000.0, 0.0); // 10 km/s
    let (_, force_low) = apply_relativity_ppn(&sun, &body, &r_vec, dist, dist_sq);

    // Test with high velocity
    body.vel = Vector3::new(0.0, 50000.0, 0.0); // 50 km/s
    let (_, force_high) = apply_relativity_ppn(&sun, &body, &r_vec, dist, dist_sq);

    // Higher velocity should give larger relativistic correction
    let mag_low = force_low.len();
    let mag_high = force_high.len();

    println!("Relativistic force at 10 km/s: {:.6e} N", mag_low);
    println!("Relativistic force at 50 km/s: {:.6e} N", mag_high);

    // In this velocity range (10-50 km/s), the (4GM/r - v^2) term decreases as v increases.
    // So the force magnitude actually decreases initially before increasing at very high velocities.
    assert!(
        mag_high < mag_low,
        "In this regime, higher velocity should reduce the repulsive PPN term magnitude"
    );
}

/// Test that relativistic forces are small compared to Newtonian
#[test]
fn test_relativity_is_small_correction() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.pos = Vector3::zero();
    sun.vel = Vector3::zero();

    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.pos = Vector3::new(1.496e11, 0.0, 0.0); // 1 AU
    earth.vel = Vector3::new(0.0, 29780.0, 0.0); // Earth's orbital velocity

    let mut r_vec = earth.pos;
    let dist = r_vec.len();
    let dist_sq = dist * dist;

    let (_, rel_force) = apply_relativity_ppn(&sun, &earth, &r_vec, dist, dist_sq);
    let newtonian = G * sun.mass * earth.mass / dist_sq;

    let ratio = rel_force.len() / newtonian;

    println!("Newtonian: {:.6e} N", newtonian);
    println!("Relativistic: {:.6e} N", rel_force.len());
    println!("Ratio: {:.6e}", ratio);

    // For Earth, relativistic correction should be ~1e-8
    assert!(
        ratio < 1e-6,
        "Relativistic correction should be small for Earth"
    );
    assert!(
        ratio > 1e-12,
        "Relativistic correction should be measurable"
    );
}
