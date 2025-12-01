use physics_wasm::common::types::PhysicsBody;
use std::fs;

#[test]
fn test_saturn_precession_data() {
    let data = fs::read_to_string("tests/fixtures/bodies.json")
        .expect("Failed to read bodies.json");
    
    let bodies: Vec<PhysicsBody> = serde_json::from_str(&data)
        .expect("Failed to parse bodies.json");
    
    let saturn = bodies.iter().find(|b| b.name == "Saturn")
        .expect("Saturn not found");
    
    println!("\n=== SATURN PRECESSION DATA ===");
    if let Some(precession) = &saturn.precession {
        println!("pole_ra0: {:?}", precession.pole_ra0);
        println!("pole_dec0: {:?}", precession.pole_dec0);
        println!("pole_ra_rate: {:?}", precession.pole_ra_rate);
        println!("pole_dec_rate: {:?}", precession.pole_dec_rate);
    } else {
        println!("NO PRECESSION DATA");
    }
    
    // Also test Jupiter and Mars
    let jupiter = bodies.iter().find(|b| b.name == "Jupiter").unwrap();
    println!("\n=== JUPITER PRECESSION DATA ===");
    if let Some(precession) = &jupiter.precession {
        println!("pole_ra0: {:?}", precession.pole_ra0);
        println!("pole_dec0: {:?}", precession.pole_dec0);
        println!("pole_ra_rate: {:?}", precession.pole_ra_rate);
        println!("pole_dec_rate: {:?}", precession.pole_dec_rate);
    } else {
        println!("NO PRECESSION DATA");
    }
    
    let mars = bodies.iter().find(|b| b.name == "Mars").unwrap();
    println!("\n=== MARS PRECESSION DATA ===");
    if let Some(precession) = &mars.precession {
        println!("pole_ra0: {:?}", precession.pole_ra0);
        println!("pole_dec0: {:?}", precession.pole_dec0);
        println!("pole_ra_rate: {:?}", precession.pole_ra_rate);
        println!("pole_dec_rate: {:?}", precession.pole_dec_rate);
    } else {
        println!("NO PRECESSION DATA");
    }
}
