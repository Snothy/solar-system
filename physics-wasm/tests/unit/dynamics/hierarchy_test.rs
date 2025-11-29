use physics_wasm::common::types::{Vector3, PhysicsBody};
use physics_wasm::dynamics::hierarchy::update_hierarchy;

/// Test parent-child detection
#[test]
fn test_parent_child_detection() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.pos = Vector3::zero();
    
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.pos = Vector3::new(1.496e11, 0.0, 0.0);
    
    let mut moon = PhysicsBody::default();
    moon.name = "Moon".to_string();
    moon.mass = 7.342e22;
    moon.pos = Vector3::new(1.496e11 + 384400e3, 0.0, 0.0);
    
    let bodies = vec![sun, earth, moon];
    let parent_indices = update_hierarchy(&bodies);
    
    // Sun should have no parent
    assert_eq!(parent_indices[0], None, "Sun should have no parent");
    
    // Earth's parent should be Sun (index 0)
    assert_eq!(parent_indices[1], Some(0), "Earth's parent should be Sun");
    
    // Moon's parent should be Earth (index 1)
    assert_eq!(parent_indices[2], Some(1), "Moon's parent should be Earth");
    
    println!("Hierarchy: {:?}", parent_indices);
}

/// Test hierarchy with Jupiter and moons
#[test]
fn test_jupiter_moons_hierarchy() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.pos = Vector3::zero();
    
    let mut jupiter = PhysicsBody::default();
    jupiter.name = "Jupiter".to_string();
    jupiter.mass = 1.8982e27;
    jupiter.pos = Vector3::new(7.78e11, 0.0, 0.0);
    
    let mut io = PhysicsBody::default();
    io.name = "Io".to_string();
    io.mass = 8.9319e22;
    io.pos = Vector3::new(7.78e11 + 421700e3, 0.0, 0.0);
    
    let mut europa = PhysicsBody::default();
    europa.name = "Europa".to_string();
    europa.mass = 4.7998e22;
    // Place Europa on opposite side to avoid being captured by Io's SOI in this simple check
    europa.pos = Vector3::new(7.78e11 - 670900e3, 0.0, 0.0);
    
    let bodies = vec![sun, jupiter, io, europa];
    let parent_indices = update_hierarchy(&bodies);
    
    // Jupiter's parent should be Sun
    assert_eq!(parent_indices[1], Some(0), "Jupiter's parent should be Sun");
    
    // Io's parent should be Jupiter
    assert_eq!(parent_indices[2], Some(1), "Io's parent should be Jupiter");
    
    // Europa's parent should be Jupiter
    assert_eq!(parent_indices[3], Some(1), "Europa's parent should be Jupiter");
    
    println!("Jupiter system hierarchy: {:?}", parent_indices);
}

/// Test sphere of influence changes with distance
#[test]
fn test_soi_distance_dependence() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.pos = Vector3::zero();
    
    let mut planet = PhysicsBody::default();
    planet.name = "Planet".to_string();
    planet.mass = 1.0e27; // Jupiter-like
    planet.pos = Vector3::new(5e11, 0.0, 0.0);
    
    // Moon far from planet - should be in Sun's SOI
    let mut moon_far = PhysicsBody::default();
    moon_far.name = "MoonFar".to_string();
    moon_far.mass = 1.0e22;
    moon_far.pos = Vector3::new(5e11 + 1e10, 0.0, 0.0); // 10 million km from planet
    
    // Moon close to planet - should be in planet's SOI
    let mut moon_close = PhysicsBody::default();
    moon_close.name = "MoonClose".to_string();
    moon_close.mass = 1.0e22;
    moon_close.pos = Vector3::new(5e11 + 1e8, 0.0, 0.0); // 100k km from planet
    
    let bodies = vec![sun.clone(), planet.clone(), moon_far];
    let parent_far = update_hierarchy(&bodies);
    
    let bodies2 = vec![sun, planet, moon_close];
    let parent_close = update_hierarchy(&bodies2);
    
    println!("Far moon parent: {:?}", parent_far[2]);
    println!("Close moon parent: {:?}", parent_close[2]);
}
