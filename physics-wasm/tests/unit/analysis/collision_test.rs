use approx::assert_relative_eq;
use physics_wasm::dynamics::collisions::{check_collisions, resolve_collisions};
use physics_wasm::common::types::{PhysicsBody, Vector3};

/// Test collision detection when bodies overlap
#[test]
fn test_collision_detection_overlapping() {
    let mut body1 = PhysicsBody::default();
    body1.name = "Body1".to_string();
    body1.mass = 1.0e20;
    body1.radius = 100e3; // 100 km
    body1.pos = Vector3::new(0.0, 0.0, 0.0);

    let mut body2 = PhysicsBody::default();
    body2.name = "Body2".to_string();
    body2.mass = 1.0e20;
    body2.radius = 100e3;
    body2.pos = Vector3::new(150e3, 0.0, 0.0); // 150 km apart (overlapping!)

    let bodies = vec![body1, body2];
    let collisions = check_collisions(&bodies);

    // Should detect collision (distance 150km < sum of radii 200km)
    assert_eq!(collisions.len(), 1, "Should detect 1 collision");

    // Collision point should be midpoint
    let mid = &collisions[0];
    println!("Collision at: ({:.0}, {:.0}, {:.0})", mid.x, mid.y, mid.z);
    assert_relative_eq!(mid.x, 75e3, epsilon = 1.0);
}

/// Test no collision when bodies are far apart
#[test]
fn test_no_collision_when_separated() {
    let mut body1 = PhysicsBody::default();
    body1.radius = 100e3;
    body1.pos = Vector3::new(0.0, 0.0, 0.0);

    let mut body2 = PhysicsBody::default();
    body2.radius = 100e3;
    body2.pos = Vector3::new(1e9, 0.0, 0.0); // 1 million km apart

    let bodies = vec![body1, body2];
    let collisions = check_collisions(&bodies);

    assert_eq!(collisions.len(), 0, "Should detect no collisions");
}

/// Test collision resolution - momentum conservation
#[test]
fn test_collision_momentum_conservation() {
    let mut body1 = PhysicsBody::default();
    body1.name = "Body1".to_string();
    body1.mass = 1.0e20;
    body1.radius = 100e3;
    body1.pos = Vector3::new(0.0, 0.0, 0.0);
    body1.vel = Vector3::new(1000.0, 500.0, 0.0);

    let mut body2 = PhysicsBody::default();
    body2.name = "Body2".to_string();
    body2.mass = 2.0e20; // Twice as massive
    body2.radius = 100e3;
    body2.pos = Vector3::new(150e3, 0.0, 0.0);
    body2.vel = Vector3::new(-500.0, 1000.0, 0.0);

    // Calculate initial momentum
    let mut p_initial = body1.vel;
    p_initial.scale(body1.mass);
    let mut p2 = body2.vel;
    p2.scale(body2.mass);
    p_initial.add(&p2);

    let mut bodies = vec![body1, body2];

    // Resolve collision
    let to_remove = resolve_collisions(&mut bodies);

    // Remove merged bodies
    for &idx in to_remove.iter().rev() {
        bodies.remove(idx);
    }

    // Calculate final momentum
    let mut p_final = Vector3::zero();
    for body in &bodies {
        let mut p_body = body.vel;
        p_body.scale(body.mass);
        p_final.add(&p_body);
    }

    println!(
        "Initial momentum: ({:.3e}, {:.3e}, {:.3e})",
        p_initial.x, p_initial.y, p_initial.z
    );
    println!(
        "Final momentum:   ({:.3e}, {:.3e}, {:.3e})",
        p_final.x, p_final.y, p_final.z
    );

    // Momentum should be conserved
    assert_relative_eq!(p_initial.x, p_final.x, epsilon = 1e10);
    assert_relative_eq!(p_initial.y, p_final.y, epsilon = 1e10);
    assert_relative_eq!(p_initial.z, p_final.z, epsilon = 1e10);
}

/// Test collision resolution - mass conservation
#[test]
fn test_collision_mass_conservation() {
    let mut body1 = PhysicsBody::default();
    body1.name = "Body1".to_string();
    body1.mass = 1.0e20;
    body1.radius = 100e3;
    body1.pos = Vector3::new(0.0, 0.0, 0.0);
    body1.vel = Vector3::new(1000.0, 0.0, 0.0);

    let mut body2 = PhysicsBody::default();
    body2.name = "Body2".to_string();
    body2.mass = 2.0e20;
    body2.radius = 100e3;
    body2.pos = Vector3::new(150e3, 0.0, 0.0);
    body2.vel = Vector3::new(-1000.0, 0.0, 0.0);

    let total_mass = body1.mass + body2.mass;

    let mut bodies = vec![body1, body2];
    let to_remove = resolve_collisions(&mut bodies);

    for &idx in to_remove.iter().rev() {
        bodies.remove(idx);
    }

    let final_mass: f64 = bodies.iter().map(|b| b.mass).sum();

    println!("Initial total mass: {:.3e} kg", total_mass);
    println!("Final total mass:   {:.3e} kg", final_mass);

    assert_relative_eq!(total_mass, final_mass, epsilon = 1e10);
}

/// Test collision resolution - volume conservation
#[test]
fn test_collision_volume_conservation() {
    let mut body1 = PhysicsBody::default();
    body1.name = "Body1".to_string();
    body1.mass = 1.0e20;
    body1.radius = 100e3; // 100 km
    body1.pos = Vector3::new(0.0, 0.0, 0.0);
    body1.vel = Vector3::new(1000.0, 0.0, 0.0);

    let mut body2 = PhysicsBody::default();
    body2.name = "Body2".to_string();
    body2.mass = 1.0e20;
    body2.radius = 100e3; // Same size
    body2.pos = Vector3::new(150e3, 0.0, 0.0);
    body2.vel = Vector3::new(-1000.0, 0.0, 0.0);

    // V = 4/3 π R³
    let vol1 = (4.0 / 3.0) * std::f64::consts::PI * body1.radius.powi(3);
    let vol2 = (4.0 / 3.0) * std::f64::consts::PI * body2.radius.powi(3);
    let total_vol = vol1 + vol2;

    let mut bodies = vec![body1, body2];
    let to_remove = resolve_collisions(&mut bodies);

    for &idx in to_remove.iter().rev() {
        bodies.remove(idx);
    }

    let final_vol: f64 = bodies
        .iter()
        .map(|b| (4.0 / 3.0) * std::f64::consts::PI * b.radius.powi(3))
        .sum();

    println!("Initial total volume: {:.3e} m³", total_vol);
    println!("Final total volume:   {:.3e} m³", final_vol);
    println!("Final radius:         {:.3} km", bodies[0].radius / 1000.0);

    // For equal spheres: R_new = 2^(1/3) * R_original ≈ 1.26 * R
    let expected_radius = (2.0_f64).powf(1.0 / 3.0) * 100e3;
    println!("Expected radius:      {:.3} km", expected_radius / 1000.0);

    assert_relative_eq!(total_vol, final_vol, epsilon = 1e15);
}

/// Test head-on collision of equal masses
#[test]
fn test_equal_mass_head_on_collision() {
    let mut body1 = PhysicsBody::default();
    body1.name = "Body1".to_string();
    body1.mass = 1.0e20;
    body1.radius = 100e3;
    body1.pos = Vector3::new(0.0, 0.0, 0.0);
    body1.vel = Vector3::new(1000.0, 0.0, 0.0);

    let mut body2 = PhysicsBody::default();
    body2.name = "Body2".to_string();
    body2.mass = 1.0e20; // Equal mass
    body2.radius = 100e3;
    body2.pos = Vector3::new(150e3, 0.0, 0.0);
    body2.vel = Vector3::new(-1000.0, 0.0, 0.0); // Equal opposite velocity

    let mut bodies = vec![body1, body2];
    let to_remove = resolve_collisions(&mut bodies);

    for &idx in to_remove.iter().rev() {
        bodies.remove(idx);
    }

    // Should have 1 merged body
    assert_eq!(bodies.len(), 1, "Should have 1 merged body");

    // For symmetric collision, velocity should be zero
    println!(
        "Merged body velocity: ({:.3}, {:.3}, {:.3})",
        bodies[0].vel.x, bodies[0].vel.y, bodies[0].vel.z
    );

    assert!(
        bodies[0].vel.len() < 1.0,
        "Equal mass head-on collision should result in near-zero velocity"
    );
}

/// Test multiple collisions in one step
#[test]
fn test_multiple_collisions() {
    let mut body1 = PhysicsBody::default();
    body1.mass = 1.0e20;
    body1.radius = 100e3;
    body1.pos = Vector3::new(0.0, 0.0, 0.0);

    let mut body2 = PhysicsBody::default();
    body2.mass = 1.0e20;
    body2.radius = 100e3;
    body2.pos = Vector3::new(150e3, 0.0, 0.0); // Colliding with body1

    let mut body3 = PhysicsBody::default();
    body3.mass = 1.0e20;
    body3.radius = 100e3;
    body3.pos = Vector3::new(0.0, 150e3, 0.0); // Also colliding with body1

    let bodies = vec![body1, body2, body3];
    let collisions = check_collisions(&bodies);

    // Should detect 2 collisions
    assert_eq!(collisions.len(), 2, "Should detect 2 collisions");
    println!("Detected {} collision points", collisions.len());
}
