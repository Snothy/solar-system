use physics_wasm::common::types::{PhysicsBody, Vector3, HarmonicsParams, PrecessionParams};
use physics_wasm::common::time::parse_jpl_date;
use serde::Deserialize;
use std::fs;
use std::path::PathBuf;

/// Load body definitions (without positions/velocities)
/// Returns bodies with default zero positions/velocities
pub fn load_bodies() -> Vec<PhysicsBody> {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("tests/fixtures/bodies.json");

    let data = fs::read_to_string(path).expect("Unable to read bodies.json");

    // Deserialize to our simplified structure first
    let simple_bodies: Vec<SimplifiedBody> =
        serde_json::from_str(&data).expect("Unable to parse bodies.json");

    // Convert to PhysicsBody with defaults
    simple_bodies
        .into_iter()
        .map(|sb| sb.to_physics_body())
        .collect()
}

pub fn load_body(name: &str) -> PhysicsBody {
    load_bodies()
        .into_iter()
        .find(|b| b.name == name)
        .unwrap_or_else(|| panic!("body '{}' not found in fixtures", name))
}

/// Get initial Julian Date from JPL vector data.
/// Returns the JD from the first data point, or J2000.0 if parsing fails.
pub fn get_initial_jd(jpl_data: &[JPLVector]) -> f64 {
    if let Some(first) = jpl_data.first() {
        if let Some(jd) = parse_jpl_date(&first.date) {
            return jd;
        }
    }
    // Fallback to J2000.0
    2451545.0
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

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct TidalData {
    #[serde(default)]
    k2: Option<f64>,
    #[serde(default)]
    tidal_q: Option<f64>,
}

// Simplified structure for deserializing from bodies.json.
// All physics-relevant fields; rendering/orbital fields are ignored by serde.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SimplifiedBody {
    name: String,
    mass: Option<f64>,
    #[serde(default)]
    gm: Option<f64>,    // This is our primary high-precision target
    equatorial_radius: f64,
    #[serde(default)]
    pos: [f64; 3],
    #[serde(default)]
    vel: [f64; 3],

    // HarmonicsParams fields (exported at top level)
    #[serde(default, alias = "J")]
    zonal_coeffs: Option<Vec<f64>>,
    #[serde(default)]
    c22: Option<f64>,
    #[serde(default)]
    s22: Option<f64>,

    // TidalParams (nested object in JSON)
    #[serde(default)]
    tidal: Option<TidalData>,

    // PrecessionParams fields (exported at top level)
    #[serde(default, alias = "poleRA")]
    pole_ra: Option<f64>,
    #[serde(default, alias = "poleDec")]
    pole_dec: Option<f64>,
    #[serde(default, alias = "precessionRate")]
    precession_rate: Option<f64>,
    #[serde(default, alias = "nutationAmplitude")]
    nutation_amplitude: Option<f64>,
    #[serde(default, alias = "W0")]
    w0: Option<f64>,
    #[serde(default, alias = "Wdot")]
    wdot: Option<f64>,
    #[serde(default, alias = "poleRARate", alias = "poleRA_rate")]
    pole_ra_rate: Option<f64>,
    #[serde(default, alias = "poleDecRate", alias = "poleDec_rate")]
    pole_dec_rate: Option<f64>,
}

impl SimplifiedBody {
    fn to_physics_body(self) -> PhysicsBody {
        let g_constant: f64 = 6.67430e-11;
        let mut harmonics = HarmonicsParams::default();
        
        // Handle generic zonal coefficients
        if let Some(coeffs) = &self.zonal_coeffs {
            harmonics.zonal_coeffs = Some(coeffs.clone());
        }
        
        harmonics.c22 = self.c22;
        harmonics.s22 = self.s22;
        
        // Calculate pole vector if RA/Dec are provided
        if let (Some(ra), Some(dec)) = (self.pole_ra, self.pole_dec) {
            let ra_rad = ra.to_radians();
            let dec_rad = dec.to_radians();
            
            // Convert to Cartesian (Equatorial J2000)
            let x_eq = dec_rad.cos() * ra_rad.cos();
            let y_eq = dec_rad.cos() * ra_rad.sin();
            let z_eq = dec_rad.sin();
            
            // Obliquity of the Ecliptic (J2000)
            let epsilon = 23.43928_f64.to_radians();
            let cos_eps = epsilon.cos();
            let sin_eps = epsilon.sin();
            
            // Rotate to Ecliptic J2000
            let x_ecl = x_eq;
            let y_ecl = y_eq * cos_eps + z_eq * sin_eps;
            let z_ecl = -y_eq * sin_eps + z_eq * cos_eps;
            
            let mut v = Vector3::new(x_ecl, y_ecl, z_ecl);
            v.normalize();
            harmonics.pole_vector = Some(v);
        }
        
        let mut precession = PrecessionParams::default();
        if let (Some(ra), Some(dec)) = (self.pole_ra, self.pole_dec) {
            precession.pole_ra0 = Some(ra.to_radians());
            precession.pole_dec0 = Some(dec.to_radians());
        }
        if let Some(rate) = self.precession_rate {
            // Rate is in arcseconds/year (e.g. 50.29)
            // Convert to degrees/century: (rate / 3600.0) * 100.0
            precession.precession_rate = Some(((rate / 3600.0) * 100.0).to_radians());
        }
        if let Some(amp) = self.nutation_amplitude {
            // Amplitude is in arcseconds (e.g. 9.2)
            // Convert to degrees first: amp / 3600.0
            precession.nutation_amplitude = Some((amp / 3600.0).to_radians());
        }
        
        precession.w0 = self.w0;
        precession.wdot = self.wdot;
        
        // Load raw rates (degrees/century)
        precession.pole_ra_rate = self.pole_ra_rate;
        precession.pole_dec_rate = self.pole_dec_rate;

        let tidal_params = self.tidal.as_ref().map(|t| physics_wasm::common::types::TidalParams {
            k2: t.k2,
            tidal_q: t.tidal_q,
        });

        PhysicsBody {
            name: self.name,
            // 1. Try to use gm.
            // 2. If no gm, try to map mass * G.
            // 3. If neither exists, default to 0.0.
            gm: self.gm
                .or_else(|| self.mass.map(|m| m * g_constant))
                .unwrap_or(0.0),

            equatorial_radius: self.equatorial_radius,
            pos: Vector3::new(self.pos[0], self.pos[1], self.pos[2]),
            vel: Vector3::new(self.vel[0], self.vel[1], self.vel[2]),
            gravity_harmonics: Some(harmonics),
            tidal: tidal_params,
            precession: Some(precession),
            ..Default::default()
        }
    }
}
