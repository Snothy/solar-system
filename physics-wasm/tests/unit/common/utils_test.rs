use approx::assert_relative_eq;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::common::utils::{recenter_system, update_positions, update_velocities};

#[test]
fn test_recenter_system() {
    let mut b1 = PhysicsBody::default();
    b1.gm = (100.0) * physics_wasm::common::constants::G;
    b1.pos = Vector3::new(10.0, 0.0, 0.0);
    b1.vel = Vector3::new(0.0, 1.0, 0.0);

    let mut b2 = PhysicsBody::default();
    b2.gm = (100.0) * physics_wasm::common::constants::G;
    b2.pos = Vector3::new(-10.0, 0.0, 0.0);
    b2.vel = Vector3::new(0.0, -1.0, 0.0);

    let mut bodies = vec![b1, b2];

    // System momentum is already zero: 100*1 + 100*(-1) = 0
    // Let's add a drift
    bodies[0].vel = Vector3::new(0.0, 2.0, 0.0);
    // Total P = 100*2 + 100*(-1) = 100
    // Total M = 200
    // V_com = 100/200 = 0.5

    recenter_system(&mut bodies);

    // Velocities should be adjusted by -0.5
    // b1: 2.0 - 0.5 = 1.5
    // b2: -1.0 - 0.5 = -1.5
    assert_relative_eq!(bodies[0].vel.y, 1.5);
    assert_relative_eq!(bodies[1].vel.y, -1.5);

    // Verify total momentum is now zero
    let p_total = bodies[0].vel.y * (bodies[0].gm / physics_wasm::common::constants::G) + bodies[1].vel.y * (bodies[1].gm / physics_wasm::common::constants::G);
    assert_relative_eq!(p_total, 0.0);
}

#[test]
fn test_update_positions() {
    let mut body = PhysicsBody::default();
    body.pos = Vector3::new(0.0, 0.0, 0.0);
    body.vel = Vector3::new(1.0, 2.0, 3.0);

    let mut bodies = vec![body];
    let dt = 2.0;

    update_positions(&mut bodies, dt);

    assert_relative_eq!(bodies[0].pos.x, 2.0);
    assert_relative_eq!(bodies[0].pos.y, 4.0);
    assert_relative_eq!(bodies[0].pos.z, 6.0);
}

#[test]
fn test_update_velocities() {
    let mut body = PhysicsBody::default();
    body.vel = Vector3::new(0.0, 0.0, 0.0);

    let mut bodies = vec![body];
    let acc = Vector3::new(1.0, -1.0, 0.5);
    let accs = vec![acc];
    let dt = 2.0;

    update_velocities(&mut bodies, &accs, dt);

    assert_relative_eq!(bodies[0].vel.x, 2.0);
    assert_relative_eq!(bodies[0].vel.y, -2.0);
    assert_relative_eq!(bodies[0].vel.z, 1.0);
}
