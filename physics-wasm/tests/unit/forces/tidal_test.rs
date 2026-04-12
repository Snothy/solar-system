use physics_wasm::common::types::{PhysicsBody, Vector3, TidalParams, RotationalParams};
use physics_wasm::forces::body_interactions::apply_body_interactions;
use physics_wasm::forces::ForceConfig;
use physics_wasm::common::constants::G;

#[test]
fn test_two_way_tidal_forces() {
    // Setup two identical bodies with tidal properties
    let mut b1 = PhysicsBody::default();
    b1.name = "Body1".to_string();
    b1.gm = (1.0e24) * physics_wasm::common::constants::G;
    b1.equatorial_radius = 6000e3;
    b1.pos = Vector3::new(0.0, 0.0, 0.0);
    b1.vel = Vector3::new(0.0, 0.0, 0.0);
    b1.tidal = Some(TidalParams { k2: Some(0.3), tidal_q: Some(10.0) });
    b1.rotation = Some(RotationalParams { angular_velocity: Some(Vector3::new(0.0, 0.0, 1.0e-4)), ..Default::default() });

    let mut b2 = PhysicsBody::default();
    b2.name = "Body2".to_string();
    b2.gm = (1.0e24) * physics_wasm::common::constants::G;
    b2.equatorial_radius = 6000e3;
    b2.pos = Vector3::new(1.0e8, 0.0, 0.0); // 100,000 km away
    b2.vel = Vector3::new(0.0, 1000.0, 0.0);
    b2.tidal = Some(TidalParams { k2: Some(0.3), tidal_q: Some(10.0) });
    b2.rotation = Some(RotationalParams { angular_velocity: Some(Vector3::new(0.0, 0.0, 1.0e-4)), ..Default::default() });

    let bodies = vec![b1, b2];
    let mut accs = vec![Vector3::zero(); 2];

    let mut physics_config = physics_wasm::common::config::PhysicsConfig::default();
    physics_config.tidal_forces = true;
    physics_config.atmospheric_drag = false;
    physics_config.relativity = false;
    physics_config.gravitational_harmonics = false;

    let config = ForceConfig {
        physics: &physics_config,
        parent_indices: &[],
        gravity_mode: physics_wasm::forces::GravityMode::FullNBody,
    };

    apply_body_interactions(&bodies, &mut accs, &config, None, 2451545.0);

    // Check symmetry
    println!("Acc1: {:?}", accs[0]);
    println!("Acc2: {:?}", accs[1]);

    // Force = mass * acc
    let f1 = Vector3::new(accs[0].x * (bodies[0].gm / physics_wasm::common::constants::G), accs[0].y * (bodies[0].gm / physics_wasm::common::constants::G), accs[0].z * (bodies[0].gm / physics_wasm::common::constants::G));
    let f2 = Vector3::new(accs[1].x * (bodies[1].gm / physics_wasm::common::constants::G), accs[1].y * (bodies[1].gm / physics_wasm::common::constants::G), accs[1].z * (bodies[1].gm / physics_wasm::common::constants::G));

    println!("Force1: {:?}", f1);
    println!("Force2: {:?}", f2);

    // Newton's 3rd Law: F1 + F2 should be zero
    let mut sum = f1;
    sum.add(&f2);
    println!("Sum: {:?}", sum);

    assert!(sum.len() < 1e-10, "Total force should be zero (Newton's 3rd Law)");
    
    // Since bodies are identical and state is symmetric (except position), forces should be equal magnitude
    assert!((f1.len() - f2.len()).abs() < 1e-10, "Forces should have equal magnitude");
    
    // Verify forces are non-zero (tides are active)
    assert!(f1.len() > 0.0, "Tidal forces should be non-zero");
}
