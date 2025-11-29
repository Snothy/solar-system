use physics_wasm::common::types::{Vector3, PhysicsBody};
use physics_wasm::forces::gravity::{apply_j3, apply_j4, apply_c22_s22};
use approx::assert_relative_eq;

/// Test J3 gravitational perturbation (pear-shaped Earth)
#[test]
fn test_j3_perturbation() {
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.radius = 6378137.0;
    earth.j3 = Some(-2.53e-6); // Earth's J3
    earth.pole_vector = Some(Vector3::new(0.0, 0.0, 1.0));
    earth.pos = Vector3::zero();

    let mut satellite = PhysicsBody::default();
    satellite.mass = 1000.0;
    satellite.pos = Vector3::new(7000000.0, 0.0, 0.0); // Low Earth orbit

    let mut r_vec = satellite.pos;
    r_vec.sub(&earth.pos);
    let dist = r_vec.len();
    let dist_sq = dist * dist;

    let force = apply_j3(&earth, &satellite, &r_vec, dist, dist_sq);

    // J3 should produce a non-zero force
    // At equator, J3 creates asymmetric (pear-shaped) perturbation
    assert!(force.len() > 0.0, "J3 force should be non-zero");
    
    // J3 is odd zonal harmonic - creates north-south asymmetry
    // Force should have Z component due to asymmetry
    println!("J3 force magnitude: {:.6e} N", force.len());
    println!("J3 force components: x={:.6e}, y={:.6e}, z={:.6e}", force.x, force.y, force.z);
}

/// Test J4 gravitational perturbation (higher-order oblateness)
#[test]
fn test_j4_perturbation() {
    let mut jupiter = PhysicsBody::default();
    jupiter.name = "Jupiter".to_string();
    jupiter.mass = 1.8982e27;
    jupiter.radius = 71492000.0;
    jupiter.j4 = Some(-5.87e-4); // Jupiter's J4 is significant
    jupiter.pole_vector = Some(Vector3::new(0.0, 0.0, 1.0));
    jupiter.pos = Vector3::zero();

    let mut satellite = PhysicsBody::default();
    satellite.mass = 1000.0;
    satellite.pos = Vector3::new(200000000.0, 0.0, 0.0); // 200,000 km orbit

    let mut r_vec = satellite.pos;
    r_vec.sub(&jupiter.pos);
    let dist = r_vec.len();
    let dist_sq = dist * dist;

    let force = apply_j4(&jupiter, &satellite, &r_vec, dist, dist_sq);

    // J4 should produce measurable force for Jupiter (large J4)
    assert!(force.len() > 0.0, "J4 force should be non-zero");
    
    // At equator, J4 adds to oblateness effect
    println!("J4 force magnitude: {:.6e} N", force.len());
    println!("J4 force components: x={:.6e}, y={:.6e}, z={:.6e}", force.x, force.y, force.z);
}

/// Test C22/S22 sectoral harmonics (equatorial ellipticity)
#[test]
fn test_c22_s22_harmonics() {
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.radius = 6378137.0;
    earth.c22 = Some(2.43e-6); // Earth's C22
    earth.s22 = Some(-1.4e-6);  // Earth's S22
    earth.pole_vector = Some(Vector3::new(0.0, 0.0, 1.0));
    earth.pos = Vector3::zero();

    let mut satellite = PhysicsBody::default();
    satellite.mass = 1000.0;
    satellite.pos = Vector3::new(7000000.0, 0.0, 0.0);

    let mut r_vec = satellite.pos;
    r_vec.sub(&earth.pos);
    let dist = r_vec.len();

    let force = apply_c22_s22(&earth, &satellite, &r_vec, dist);

    // C22/S22 create equatorial ellipticity perturbation
    assert!(force.len() > 0.0, "C22/S22 force should be non-zero");
    
    println!("C22/S22 force magnitude: {:.6e} N", force.len());
    println!("C22/S22 force components: x={:.6e}, y={:.6e}, z={:.6e}", force.x, force.y, force.z);
}

/// Test that J3 varies with latitude
#[test]
fn test_j3_latitude_variation() {
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.radius = 6378137.0;
    earth.j3 = Some(-2.53e-6);
    earth.pole_vector = Some(Vector3::new(0.0, 0.0, 1.0));
    earth.pos = Vector3::zero();

    let mut sat = PhysicsBody::default();
    sat.mass = 1000.0;

    // Test at equator
    sat.pos = Vector3::new(7000000.0, 0.0, 0.0);
    let mut r_vec = sat.pos;
    let dist = r_vec.len();
    let force_equator = apply_j3(&earth, &sat, &r_vec, dist, dist * dist);

    // Test at pole
    sat.pos = Vector3::new(0.0, 0.0, 7000000.0);
    r_vec = sat.pos;
    let force_pole = apply_j3(&earth, &sat, &r_vec, dist, dist * dist);

    // J3 effect should vary with latitude
    let mag_equator = force_equator.len();
    let mag_pole = force_pole.len();
    
    println!("J3 at equator: {:.6e} N", mag_equator);
    println!("J3 at pole: {:.6e} N", mag_pole);
    
    // They should be different due to latitude dependence
    assert!((mag_equator - mag_pole).abs() > 1e-10, 
        "J3 should vary with latitude");
}

/// Test J4 symmetry (even zonal harmonic)
#[test]
fn test_j4_symmetry() {
    let mut jupiter = PhysicsBody::default();
    jupiter.name = "Jupiter".to_string();
    jupiter.mass = 1.8982e27;
    jupiter.radius = 71492000.0;
    jupiter.j4 = Some(-5.87e-4);
    jupiter.pole_vector = Some(Vector3::new(0.0, 0.0, 1.0));
    jupiter.pos = Vector3::zero();

    let mut sat = PhysicsBody::default();
    sat.mass = 1000.0;

    // Test at +Z
    sat.pos = Vector3::new(0.0, 0.0, 200000000.0);
    let mut r_vec = sat.pos;
    let dist = r_vec.len();
    let force_north = apply_j4(&jupiter, &sat, &r_vec, dist, dist * dist);

    // Test at -Z (should be symmetric for even harmonic)
    sat.pos = Vector3::new(0.0, 0.0, -200000000.0);
    r_vec = sat.pos;
    let force_south = apply_j4(&jupiter, &sat, &r_vec, dist, dist * dist);

    // J4 is even - should be symmetric about equator
    // Magnitudes should be equal (but directions opposite)
    assert_relative_eq!(force_north.len(), force_south.len(), epsilon = 1e-6);
    
    println!("J4 north pole: {:.6e} N", force_north.len());
    println!("J4 south pole: {:.6e} N", force_south.len());
}
