use physics_wasm::analysis::{update_moon_libration, resolve_collisions, check_collisions};
use physics_wasm::common::types::{PhysicsBody, Vector3};

#[test]
fn test_update_moon_libration() {
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.pos = Vector3::zero();
    earth.vel = Vector3::zero();
    
    let mut moon = PhysicsBody::default();
    moon.name = "Moon".to_string();
    moon.mass = 7.348e22;
    moon.pos = Vector3::new(3.844e8, 0.0, 0.0);
    moon.vel = Vector3::new(0.0, 1022.0, 0.0); // Approx orbital velocity
    
    let mut bodies = vec![earth, moon];
    
    update_moon_libration(&mut bodies);
    
    // Moon should have libration updated
    assert!(bodies[1].libration.is_some());
}

#[test]
fn test_resolve_collisions() {
    let mut b1 = PhysicsBody::default();
    b1.mass = 10.0;
    b1.radius = 1.0;
    b1.pos = Vector3::new(0.0, 0.0, 0.0);
    b1.vel = Vector3::new(1.0, 0.0, 0.0);
    
    let mut b2 = PhysicsBody::default();
    b2.mass = 10.0;
    b2.radius = 1.0;
    b2.pos = Vector3::new(0.5, 0.0, 0.0); // Overlapping
    b2.vel = Vector3::new(-1.0, 0.0, 0.0);
    
    let mut bodies = vec![b1, b2];
    
    let removed = resolve_collisions(&mut bodies);
    
    assert_eq!(removed.len(), 1);
    assert_eq!(removed[0], 1); // Should remove b2 (index 1) or b1 (index 0). 
    // Logic: if masses equal, remove larger index?
    // Code: if bodies[i].mass >= bodies[j].mass { (i, j) } else { (j, i) }
    // i=0, j=1. mass equal. big=0, small=1.
    // So small=1 is removed.
    
    // Check merged body (index 0)
    // Mass = 20
    assert_eq!(bodies[0].mass, 20.0);
    // Vel = (10*1 + 10*-1)/20 = 0
    assert_eq!(bodies[0].vel.x, 0.0);
    // Pos = (10*0 + 10*0.5)/20 = 0.25
    assert_eq!(bodies[0].pos.x, 0.25);
    // Radius = (1^3 + 1^3)^(1/3) = 2^(1/3) = 1.26
    assert!((bodies[0].radius - 1.2599).abs() < 1e-4);
}

#[test]
fn test_check_collisions() {
    let mut b1 = PhysicsBody::default();
    b1.radius = 1.0;
    b1.pos = Vector3::new(0.0, 0.0, 0.0);
    
    let mut b2 = PhysicsBody::default();
    b2.radius = 1.0;
    b2.pos = Vector3::new(1.5, 0.0, 0.0); // Overlapping (dist 1.5 < 2.0 * 0.8 = 1.6)
    
    let bodies = vec![b1, b2];
    
    let collisions = check_collisions(&bodies);
    
    assert_eq!(collisions.len(), 1);
    assert_eq!(collisions[0].x, 0.75); // Midpoint
}
