
use std::fs;
use std::path::PathBuf;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use serde::Deserialize;

/// Load body definitions (without positions/velocities)
/// Returns bodies with default zero positions/velocities
pub fn load_bodies() -> Vec<PhysicsBody> {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("tests/fixtures/bodies.json");
    
    let data = fs::read_to_string(path).expect("Unable to read bodies.json");
    
    // Deserialize to our simplified structure first
    let simple_bodies: Vec<SimplifiedBody> = serde_json::from_str(&data)
        .expect("Unable to parse bodies.json");
    
    // Convert to PhysicsBody with defaults
    simple_bodies.into_iter().map(|sb| sb.to_physics_body()).collect()
}

/// Initialize a body's position/velocity from JPL data
pub fn initialize_from_jpl(body: &mut PhysicsBody, jpl_data: &JPLVector) {
    body.pos = Vector3::new(jpl_data.pos[0], jpl_data.pos[1], jpl_data.pos[2]);
    body.vel = Vector3::new(jpl_data.vel[0], jpl_data.vel[1], jpl_data.vel[2]);
}

pub fn load_jpl_vector(body_name: &str) -> Option<Vec<JPLVector>> {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("../formatted_data");
    path.push(body_name);
    path.push("vector_data/data.json");
    
    if !path.exists() {
        return None;
    }

    let data = fs::read_to_string(path).ok()?;
    let vectors: Vec<JPLVector> = serde_json::from_str(&data).ok()?;
    Some(vectors)
}

#[derive(Deserialize, Debug)]
pub struct JPLVector {
    #[allow(dead_code)]
    pub date: String,
    pub pos: [f64; 3],
    pub vel: [f64; 3],
}

// Simplified structure for deserializing from bodies.json
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SimplifiedBody {
    name: String,
    mass: f64,
    radius: f64,
    #[serde(default)]
    j2: Option<f64>,
    #[serde(default)]
    j3: Option<f64>,
    #[serde(default)]
    j4: Option<f64>,
    #[serde(default)]
    c22: Option<f64>,
    #[serde(default)]
    s22: Option<f64>,
    #[serde(default)]
    k2: Option<f64>,
    #[serde(default)]
    pole_ra: Option<f64>,
    #[serde(default)]
    pole_dec: Option<f64>,
}

impl SimplifiedBody {
    fn to_physics_body(self) -> PhysicsBody {
        let mut body = PhysicsBody {
            name: self.name,
            mass: self.mass,
            radius: self.radius,
            pos: Vector3::zero(),
            vel: Vector3::zero(),
            force: Some(Vector3::zero()),
            j2: self.j2,
            j3: self.j3,
            j4: self.j4,
            c22: self.c22,
            s22: self.s22,
            k2: self.k2,
            ..Default::default()
        };
        
        // Calculate pole vector if pole_ra and pole_dec are available
        if let (Some(ra), Some(dec)) = (self.pole_ra, self.pole_dec) {
            let ra_rad = ra.to_radians();
            let dec_rad = dec.to_radians();
            body.pole_vector = Some(Vector3::new(
                dec_rad.cos() * ra_rad.cos(),
                dec_rad.cos() * ra_rad.sin(),
                dec_rad.sin(),
            ));
        }
        
        body
    }
}
