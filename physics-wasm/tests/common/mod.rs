
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
    #[serde(default, alias = "J2")]
    j2: Option<f64>,
    #[serde(default, alias = "J3")]
    j3: Option<f64>,
    #[serde(default, alias = "J4")]
    j4: Option<f64>,
    #[serde(default, alias = "C22")]
    c22: Option<f64>,
    #[serde(default, alias = "S22")]
    s22: Option<f64>,
    #[serde(default, alias = "K2")]
    k2: Option<f64>,
    #[serde(default, alias = "poleRA")]
    pole_ra: Option<f64>,
    #[serde(default, alias = "poleDec")]
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
        // Calculate pole vector if pole_ra and pole_dec are available
        if let (Some(ra), Some(dec)) = (self.pole_ra, self.pole_dec) {
            let ra_rad = ra.to_radians();
            let dec_rad = dec.to_radians();
            
            // Initial vector in Equatorial Frame (ICRF)
            let x_eq = dec_rad.cos() * ra_rad.cos();
            let y_eq = dec_rad.cos() * ra_rad.sin();
            let z_eq = dec_rad.sin();
            
            // Obliquity of the Ecliptic (J2000)
            let epsilon = 23.43928_f64.to_radians();
            let cos_eps = epsilon.cos();
            let sin_eps = epsilon.sin();
            
            // Rotate to Ecliptic Frame
            // x_ecl = x_eq
            // y_ecl = y_eq * cos(eps) + z_eq * sin(eps)
            // z_ecl = -y_eq * sin(eps) + z_eq * cos(eps)
            let x_ecl = x_eq;
            let y_ecl = y_eq * cos_eps + z_eq * sin_eps;
            let z_ecl = -y_eq * sin_eps + z_eq * cos_eps;
            
            body.pole_vector = Some(Vector3::new(x_ecl, y_ecl, z_ecl));
        }

        body
    }
}
