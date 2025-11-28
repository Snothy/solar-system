use physics_wasm::dynamics::hierarchy::update_hierarchy;
use physics_wasm::common::types::{PhysicsBody, Vector3};

#[test]
fn test_update_hierarchy_sun_earth_moon() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.pos = Vector3::zero();
    
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.pos = Vector3::new(1.496e11, 0.0, 0.0); // 1 AU
    
    let mut moon = PhysicsBody::default();
    moon.name = "Moon".to_string();
    moon.mass = 7.348e22;
    moon.pos = Vector3::new(1.496e11 + 3.844e8, 0.0, 0.0); // Earth + Distance to Moon
    
    let bodies = vec![sun, earth, moon];
    
    let hierarchy = update_hierarchy(&bodies);
    
    // Sun (0) has no parent (None) or itself? The code says "parent_indices[i] = best_parent", initialized to None.
    // But loop skips sun_idx. So sun should be None.
    assert_eq!(hierarchy[0], None);
    
    // Earth (1) should orbit Sun (0)
    assert_eq!(hierarchy[1], Some(0));
    
    // Moon (2) should orbit Earth (1) because it's within Earth's SOI
    // Earth SOI ~ a * (m/M)^0.4 ~ 1.5e11 * (6e24/2e30)^0.4 ~ 1.5e11 * (3e-6)^0.4 ~ 1.5e11 * 0.005 ~ 7.5e8 m
    // Moon dist is 3.8e8 m, so it is within SOI.
    assert_eq!(hierarchy[2], Some(1));
}

#[test]
fn test_update_hierarchy_jupiter_moons() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.0e30;
    
    let mut jupiter = PhysicsBody::default();
    jupiter.name = "Jupiter".to_string();
    jupiter.mass = 1.0e27;
    jupiter.pos = Vector3::new(5.0e11, 0.0, 0.0);
    
    let mut io = PhysicsBody::default();
    io.name = "Io".to_string();
    io.mass = 1.0e22;
    io.pos = Vector3::new(5.0e11 + 4.2e8, 0.0, 0.0);
    
    let bodies = vec![sun, jupiter, io];
    let hierarchy = update_hierarchy(&bodies);
    
    assert_eq!(hierarchy[1], Some(0)); // Jupiter orbits Sun
    assert_eq!(hierarchy[2], Some(1)); // Io orbits Jupiter
}
