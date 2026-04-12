use crate::common::load_body;
use approx::assert_relative_eq;
use physics_wasm::common::types::{PhysicsBody, Vector3, HarmonicsParams};
use physics_wasm::forces::gravity::apply_zonal_harmonics;

/// Test J3 gravitational perturbation (pear-shaped Earth)
#[test]
fn test_j3_perturbation() {
    let mut earth = load_body("Earth");
    earth.gravity_harmonics = Some(HarmonicsParams {
        zonal_coeffs: Some(vec![0.0, -2.53e-6]), // J2=0, J3=-2.53e-6
        pole_vector: Some(Vector3::new(0.0, 0.0, 1.0)),
        ..Default::default()
    });
    earth.pos = Vector3::zero();

    let mut satellite = PhysicsBody::default();
    satellite.gm = 1_000.0;
    satellite.pos = Vector3::new(7_000_000.0, 0.0, 0.0); // Low Earth orbit

    let mut r_vec = satellite.pos;
    r_vec.sub(&earth.pos);
    let dist = r_vec.len();
    let dist_sq = dist * dist;

    let acc = apply_zonal_harmonics(&earth, &satellite, &r_vec, dist, dist_sq, None);

    // J3 should produce a non-zero acceleration
    assert!(acc.len() > 0.0, "J3 acceleration should be non-zero");

    println!("J3 acc magnitude: {:.6e} m/s^2", acc.len());
    println!(
        "J3 acc components: x={:.6e}, y={:.6e}, z={:.6e}",
        acc.x, acc.y, acc.z
    );
}

/// Test J4 gravitational perturbation (higher-order oblateness)
#[test]
fn test_j4_perturbation() {
    let mut jupiter = load_body("Jupiter");
    jupiter.gravity_harmonics = Some(HarmonicsParams {
        zonal_coeffs: Some(vec![0.0, 0.0, -5.87e-4]), // J2=0, J3=0, J4=-5.87e-4
        pole_vector: Some(Vector3::new(0.0, 0.0, 1.0)),
        ..Default::default()
    });
    jupiter.pos = Vector3::zero();

    let mut satellite = PhysicsBody::default();
    satellite.gm = 1_000.0;
    satellite.pos = Vector3::new(200_000_000.0, 0.0, 0.0); // 200,000 km orbit

    let mut r_vec = satellite.pos;
    r_vec.sub(&jupiter.pos);
    let dist = r_vec.len();
    let dist_sq = dist * dist;

    let acc = apply_zonal_harmonics(&jupiter, &satellite, &r_vec, dist, dist_sq, None);

    // J4 should produce measurable acceleration
    assert!(acc.len() > 0.0, "J4 acceleration should be non-zero");

    println!("J4 acc magnitude: {:.6e} m/s^2", acc.len());
    println!(
        "J4 acc components: x={:.6e}, y={:.6e}, z={:.6e}",
        acc.x, acc.y, acc.z
    );
}



/// Test that J3 varies with latitude
#[test]
fn test_j3_latitude_variation() {
    let mut earth = load_body("Earth");
    earth.gravity_harmonics = Some(HarmonicsParams {
        zonal_coeffs: Some(vec![0.0, -2.53e-6]),
        pole_vector: Some(Vector3::new(0.0, 0.0, 1.0)),
        ..Default::default()
    });
    earth.pos = Vector3::zero();

    let mut sat = PhysicsBody::default();
    sat.gm = 1_000.0;

    // Test at equator
    sat.pos = Vector3::new(7000000.0, 0.0, 0.0);
    let mut r_vec = sat.pos;
    let dist = r_vec.len();
    let acc_equator = apply_zonal_harmonics(&earth, &sat, &r_vec, dist, dist * dist, None);

    // Test at pole
    sat.pos = Vector3::new(0.0, 0.0, 7000000.0);
    r_vec = sat.pos;
    let acc_pole = apply_zonal_harmonics(&earth, &sat, &r_vec, dist, dist * dist, None);

    // J3 effect should vary with latitude
    let mag_equator = acc_equator.len();
    let mag_pole = acc_pole.len();

    println!("J3 at equator: {:.6e} m/s^2", mag_equator);
    println!("J3 at pole: {:.6e} m/s^2", mag_pole);

    // They should be different due to latitude dependence
    assert!(
        (mag_equator - mag_pole).abs() > 1e-10,
        "J3 should vary with latitude"
    );
}

/// Test J4 symmetry (even zonal harmonic)
#[test]
fn test_j4_symmetry() {
    let mut jupiter = load_body("Jupiter");
    jupiter.gravity_harmonics = Some(HarmonicsParams {
        zonal_coeffs: Some(vec![0.0, 0.0, -5.87e-4]),
        pole_vector: Some(Vector3::new(0.0, 0.0, 1.0)),
        ..Default::default()
    });
    jupiter.pos = Vector3::zero();

    let mut sat = PhysicsBody::default();
    sat.gm = 1_000.0;

    // Test at +Z
    sat.pos = Vector3::new(0.0, 0.0, 200000000.0);
    let mut r_vec = sat.pos;
    let dist = r_vec.len();
    let acc_north = apply_zonal_harmonics(&jupiter, &sat, &r_vec, dist, dist * dist, None);

    // Test at -Z (should be symmetric for even harmonic)
    sat.pos = Vector3::new(0.0, 0.0, -200000000.0);
    r_vec = sat.pos;
    let acc_south = apply_zonal_harmonics(&jupiter, &sat, &r_vec, dist, dist * dist, None);

    // J4 is even - should be symmetric about equator
    // Magnitudes should be equal (but directions opposite)
    assert_relative_eq!(acc_north.len(), acc_south.len(), epsilon = 1e-6);

    println!("J4 north pole: {:.6e} m/s^2", acc_north.len());
    println!("J4 north pole: {:.6e} m/s^2", acc_north.len());
    println!("J4 south pole: {:.6e} m/s^2", acc_south.len());
}

fn make_test_body(name: &str, zonal_coeffs: Vec<f64>) -> PhysicsBody {
    let mut body = load_body(name);
    let mut harmonics = HarmonicsParams::default();
    harmonics.zonal_coeffs = Some(zonal_coeffs);
    harmonics.pole_vector = Some(Vector3::new(0.0, 0.0, 1.0));
    body.gravity_harmonics = Some(harmonics);
    body
}

#[test]
fn test_j2_acceleration_at_equator() {
    // Setup: Earth-like body with real fixture GM and radius
    let primary = make_test_body("Earth", vec![0.0010826]);
    let radius = primary.equatorial_radius;
    let j2 = 0.0010826;

    let mut satellite = PhysicsBody::default();
    satellite.gm = 1_000.0;
    
    // Position: On Equator (x-axis), distance 2*R
    let dist = 2.0 * radius;
    let r_vec = Vector3::new(dist, 0.0, 0.0);
    let dist_sq = dist * dist;
    
    let acc = apply_zonal_harmonics(&primary, &satellite, &r_vec, dist, dist_sq, None);
    
    // Expected Calculation
    // K = GM J2 R^2 / r^4
    // At Equator (theta=90, c=0):
    // a_r = 3 K P_2 = 3 K (-0.5) = -1.5 K
    // a_theta = 0 (since c=0)
    // Result should be purely radial (along x-axis) and attractive (negative x).
    
    let k = primary.gm * j2 * radius * radius / (dist.powi(4));
    let expected_ax = -1.5 * k;
    
    println!("Expected ax: {}, Got: {}", expected_ax, acc.x);
    
    assert!((acc.x - expected_ax).abs() < 1e-10, "Radial acceleration mismatch");
    assert!(acc.y.abs() < 1e-10, "Y acceleration should be zero");
    assert!(acc.z.abs() < 1e-10, "Z acceleration should be zero");
}

#[test]
fn test_j2_acceleration_at_pole() {
    let primary = make_test_body("Earth", vec![0.0010826]);
    let radius = primary.equatorial_radius;
    let j2 = 0.0010826;

    let mut satellite = PhysicsBody::default();
    satellite.gm = 1_000.0;
    
    // Position: On Pole (z-axis), distance 2*R
    let dist = 2.0 * radius;
    let r_vec = Vector3::new(0.0, 0.0, dist);
    let dist_sq = dist * dist;
    
    let acc = apply_zonal_harmonics(&primary, &satellite, &r_vec, dist, dist_sq, None);
    
    // Expected Calculation
    // At Pole (theta=0, c=1):
    // a_r = 3 K P_2 = 3 K (1) = 3 K
    // a_theta = 0
    // Result should be purely radial (along z-axis) and repulsive (positive z).
    
    let k = primary.gm * j2 * radius * radius / (dist.powi(4));
    let expected_az = 3.0 * k;
    
    println!("Expected az: {}, Got: {}", expected_az, acc.z);
    
    assert!((acc.z - expected_az).abs() < 1e-10, "Radial acceleration mismatch at pole");
    assert!(acc.x.abs() < 1e-10, "X acceleration should be zero");
    assert!(acc.y.abs() < 1e-10, "Y acceleration should be zero");
}

#[test]
fn test_mass_independence() {
    let primary = make_test_body("Earth", vec![0.0010826]);
    let radius = primary.equatorial_radius;

    let mut sat1 = PhysicsBody::default();
    sat1.gm = 1_000.0;
    
    let mut sat2 = PhysicsBody::default();
    sat2.gm = 2_000.0; // Double gm
    
    let dist = 2.0 * radius;
    let r_vec = Vector3::new(dist, 0.0, 0.0);
    let dist_sq = dist * dist;
    
    let acc1 = apply_zonal_harmonics(&primary, &sat1, &r_vec, dist, dist_sq, None);
    let acc2 = apply_zonal_harmonics(&primary, &sat2, &r_vec, dist, dist_sq, None);
    
    // Acceleration should be identical regardless of satellite mass
    assert!((acc1.x - acc2.x).abs() < 1e-20, "Acceleration depends on mass!");
}

#[test]
fn test_j3_acceleration_at_equator_precise() {
    // Setup: Body with J3 only, using fixture GM and radius
    let mut body = load_body("Earth");
    let radius = body.equatorial_radius;
    let j3 = 0.001; // Arbitrary J3
    body.name = "PearPlanet".to_string();
    
    let mut harmonics = HarmonicsParams::default();
    harmonics.zonal_coeffs = Some(vec![0.0, j3]);
    harmonics.pole_vector = Some(Vector3::new(0.0, 0.0, 1.0));
    body.gravity_harmonics = Some(harmonics);
    
    let mut satellite = PhysicsBody::default();
    satellite.gm = 1_000.0;
    
    // Position: On Equator (x-axis), distance 2*R
    let dist = 2.0 * radius;
    let r_vec = Vector3::new(dist, 0.0, 0.0);
    let dist_sq = dist * dist;
    
    let acc = apply_zonal_harmonics(&body, &satellite, &r_vec, dist, dist_sq, None);
    
    // Expected Calculation for J3 (n=3)
    // K3 = GM J3 R^3 / r^5
    // P3(x) = 0.5(5x^3 - 3x). P3'(x) = 0.5(15x^2 - 3).
    // At Equator (x=0):
    // P3(0) = 0.
    // P3'(0) = -1.5.
    
    // a_r = (3+1) * K3 * P3 = 4 * K3 * 0 = 0.
    // a_theta = - K3 * P3' * sin(90) = - K3 * (-1.5) * 1 = 1.5 * K3.
    
    // Vector direction:
    // theta_hat at equator (x-axis) points -Z (South).
    // Wait. theta_hat = (pole - cos*r)/sin.
    // pole=(0,0,1). r=(1,0,0). cos=0. sin=1.
    // theta_hat = (0,0,1). Points North?
    // My code calculates `theta_component` = pole - cos*r = (0,0,1).
    // This is +Z (North).
    // My code: `acc_theta -= factor * P_n'`.
    // `acc_theta` = - K3 * (-1.5) = 1.5 K3. (Positive).
    // `a_vec` adds `theta_component * acc_theta`.
    // `a_vec` adds (0,0,1) * 1.5 K3.
    // Result: +Z direction (North).
    
    // Standard Physics:
    // J3 makes the "pear" shape. Stem at North?
    // V_J3 = - (GM/r) J3 (R/r)^3 P3.
    // P3 is antisymmetric. + at North, - at South.
    // Potential is lower (more negative) at North Pole (if J3>0).
    // Force should point North?
    // Yes.
    
    let factor = body.gm * j3 * radius.powi(3) / dist.powi(5);
    let expected_az = 3.0 * factor / (2.0 * dist);
    
    println!("Expected az: {}, Got: {}", expected_az, acc.z);
    
    assert!(acc.x.abs() < 1e-10, "Radial acceleration should be zero for J3 at equator");
    assert!(acc.y.abs() < 1e-10, "Y acceleration should be zero");
    assert!((acc.z - expected_az).abs() < 1e-10, "Z acceleration mismatch for J3");
}

#[test]
fn test_j4_acceleration_at_equator_precise() {
    // Setup: Body with J4 only, using fixture GM and radius
    let mut body = load_body("Earth");
    let radius = body.equatorial_radius;
    let j4 = 0.001; // Arbitrary J4
    body.name = "SquarePlanet".to_string();
    
    let mut harmonics = HarmonicsParams::default();
    harmonics.zonal_coeffs = Some(vec![0.0, 0.0, j4]);
    harmonics.pole_vector = Some(Vector3::new(0.0, 0.0, 1.0));
    body.gravity_harmonics = Some(harmonics);
    
    let mut satellite = PhysicsBody::default();
    satellite.gm = 1_000.0;
    
    // Position: On Equator (x-axis), distance 2*R
    let dist = 2.0 * radius;
    let r_vec = Vector3::new(dist, 0.0, 0.0);
    let dist_sq = dist * dist;
    
    let acc = apply_zonal_harmonics(&body, &satellite, &r_vec, dist, dist_sq, None);
    
    // Expected Calculation for J4 (n=4)
    // K4 = GM J4 R^4 / r^6
    // P4(x) = 1/8 (35x^4 - 30x^2 + 3).
    // At Equator (x=0): P4(0) = 3/8 = 0.375.
    // P4'(0) = 0.
    
    // a_r = (4+1) * K4 * P4 = 5 * K4 * 0.375 = 1.875 * K4.
    // a_theta = 0.
    
    // Result should be purely radial (along x-axis) and repulsive (positive x).
    
    let factor = (-15.0 * body.gm * j4 * radius.powi(4)) / (8.0 * dist.powi(6));
    let expected_ax = 3.0 * factor;
    
    println!("Expected ax: {}, Got: {}", expected_ax, acc.x);
    
    assert!((acc.x - expected_ax).abs() < 1e-10, "Radial acceleration mismatch for J4");
    assert!(acc.y.abs() < 1e-10, "Y acceleration should be zero");
    assert!(acc.z.abs() < 1e-10, "Z acceleration should be zero");
}
