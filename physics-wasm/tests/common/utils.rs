use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::common::utils::{update_positions, update_velocities, recenter_system};

#[test]
fn test_update_positions() {
    let mut body = PhysicsBody::default();
    body.pos = Vector3::new(0.0, 0.0, 0.0);
    body.vel = Vector3::new(1.0, 2.0, 3.0);
    
    let mut bodies = vec![body];
    let dt = 2.0;
    
    update_positions(&mut bodies, dt);
    
    assert_eq!(bodies[0].pos.x, 2.0);
    assert_eq!(bodies[0].pos.y, 4.0);
    assert_eq!(bodies[0].pos.z, 6.0);
}

#[test]
fn test_update_velocities() {
    let mut body = PhysicsBody::default();
    body.vel = Vector3::new(0.0, 0.0, 0.0);
    
    let mut bodies = vec![body];
    let accs = vec![Vector3::new(1.0, 0.5, 0.2)];
    let dt = 2.0;
    
    update_velocities(&mut bodies, &accs, dt);
    
    assert_eq!(bodies[0].vel.x, 2.0);
    assert_eq!(bodies[0].vel.y, 1.0);
    assert_eq!(bodies[0].vel.z, 0.4);
}

#[test]
fn test_recenter_system() {
    let mut body1 = PhysicsBody::default();
    body1.mass = 10.0;
    body1.vel = Vector3::new(10.0, 0.0, 0.0);
    
    let mut body2 = PhysicsBody::default();
    body2.mass = 10.0;
    body2.vel = Vector3::new(-10.0, 0.0, 0.0);
    
    let mut bodies = vec![body1, body2];
    
    // System momentum is 0, so no velocity change expected if already centered
    recenter_system(&mut bodies);
    assert_eq!(bodies[0].vel.x, 10.0);
    assert_eq!(bodies[1].vel.x, -10.0);
    
    // Now add drift
    bodies[0].vel.x += 5.0; // 15.0
    bodies[1].vel.x += 5.0; // -5.0
    // Total momentum = 10*15 + 10*-5 = 150 - 50 = 100
    // Total mass = 20
    // Velocity of COM = 100 / 20 = 5.0
    
    recenter_system(&mut bodies);
    
    // Should subtract 5.0 from each
    assert_eq!(bodies[0].vel.x, 10.0);
    assert_eq!(bodies[1].vel.x, -10.0);
}
