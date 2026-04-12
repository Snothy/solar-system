use crate::common::load_body;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::common::indices::BodyIndex;
use physics_wasm::dynamics::hierarchy::update_hierarchy;

/// Test parent-child detection
#[test]
fn test_parent_child_detection() {
    let mut sun = load_body("Sun");
    sun.pos = Vector3::zero();

    let mut earth = load_body("Earth");
    earth.pos = Vector3::new(1.496e11, 0.0, 0.0);

    let mut moon = load_body("Moon");
    moon.pos = Vector3::new(1.496e11 + 384400e3, 0.0, 0.0);

    let bodies = vec![sun, earth, moon];
    let parent_indices = update_hierarchy(&bodies);

    assert_eq!(parent_indices[0], None, "Sun should have no parent");
    assert_eq!(parent_indices[1], Some(BodyIndex(0)), "Earth's parent should be Sun");
    assert_eq!(parent_indices[2], Some(BodyIndex(1)), "Moon's parent should be Earth");

    println!("Hierarchy: {:?}", parent_indices);
}

/// Test hierarchy with Jupiter and moons
#[test]
fn test_jupiter_moons_hierarchy() {
    let mut sun = load_body("Sun");
    sun.pos = Vector3::zero();

    let mut jupiter = load_body("Jupiter");
    jupiter.pos = Vector3::new(7.78e11, 0.0, 0.0);

    let mut io = load_body("Io");
    io.pos = Vector3::new(7.78e11 + 421700e3, 0.0, 0.0);

    let mut europa = load_body("Europa");
    europa.pos = Vector3::new(7.78e11 - 670900e3, 0.0, 0.0);

    let bodies = vec![sun, jupiter, io, europa];
    let parent_indices = update_hierarchy(&bodies);

    assert_eq!(parent_indices[1], Some(BodyIndex(0)), "Jupiter's parent should be Sun");
    assert_eq!(parent_indices[2], Some(BodyIndex(1)), "Io's parent should be Jupiter");
    assert_eq!(parent_indices[3], Some(BodyIndex(1)), "Europa's parent should be Jupiter");

    println!("Jupiter system hierarchy: {:?}", parent_indices);
}

/// Test sphere of influence changes with distance
#[test]
fn test_soi_distance_dependence() {
    // Using load_body for the main gravity wells to get accurate GM values
    let mut sun = load_body("Sun");
    sun.pos = Vector3::zero();

    let mut planet = load_body("Jupiter");
    planet.pos = Vector3::new(5e11, 0.0, 0.0);

    // For specific test cases where you want manual GM values, 
    // assign to .gm directly without multiplying by G.
    let mut moon_far = PhysicsBody::default();
    moon_far.name = "MoonFar".to_string();
    moon_far.gm = 6.674e11; // Equivalent to roughly 1e22 kg * G
    moon_far.pos = Vector3::new(5e11 + 1e10, 0.0, 0.0); 

    let mut moon_close = PhysicsBody::default();
    moon_close.name = "MoonClose".to_string();
    moon_close.gm = 6.674e11;
    moon_close.pos = Vector3::new(5e11 + 1e8, 0.0, 0.0); 

    let bodies = vec![sun.clone(), planet.clone(), moon_far];
    let parent_far = update_hierarchy(&bodies);

    let bodies2 = vec![sun, planet, moon_close];
    let parent_close = update_hierarchy(&bodies2);

    println!("Far moon parent: {:?}", parent_far[2]);
    println!("Close moon parent: {:?}", parent_close[2]);
    
    // Logic check: Far moon should likely be Sun (0), Close should be Planet (1)
    assert_eq!(parent_far[2], Some(BodyIndex(0)));
    assert_eq!(parent_close[2], Some(BodyIndex(1)));
}