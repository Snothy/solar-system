use serde::{Serialize, Deserialize};


#[derive(Serialize, Deserialize, Clone, Copy, Debug, Default)]
pub struct Vector3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Vector3 {
    pub fn new(x: f64, y: f64, z: f64) -> Self { Self { x, y, z } }
    pub fn zero() -> Self { Self { x: 0.0, y: 0.0, z: 0.0 } }
    
    pub fn add(&mut self, other: &Vector3) { 
        self.x += other.x; 
        self.y += other.y; 
        self.z += other.z; 
    }
    
    pub fn sub(&mut self, other: &Vector3) { 
        self.x -= other.x; 
        self.y -= other.y; 
        self.z -= other.z; 
    }
    
    pub fn scale(&mut self, s: f64) { 
        self.x *= s; 
        self.y *= s; 
        self.z *= s; 
    }

    pub fn len_sq(&self) -> f64 { self.x*self.x + self.y*self.y + self.z*self.z }
    pub fn len(&self) -> f64 { self.len_sq().sqrt() }
    
    pub fn normalize(&mut self) {
        let l = self.len();
        if l > 0.0 { self.scale(1.0/l); }
    }
    
    pub fn dot(&self, other: &Vector3) -> f64 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    pub fn cross(&self, other: &Vector3) -> Vector3 {
        Vector3 {
            x: self.y * other.z - self.z * other.y,
            y: self.z * other.x - self.x * other.z,
            z: self.x * other.y - self.y * other.x,
        }
    }

    pub fn distance_to(&self, other: &Vector3) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        let dz = self.z - other.z;
        (dx*dx + dy*dy + dz*dz).sqrt()
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct PhysicsBody {
    pub name: String,
    pub mass: f64,
    pub radius: f64,
    pub pos: Vector3,
    pub vel: Vector3,
    #[serde(default)]
    pub force: Option<Vector3>,
    
    // Advanced Physics Properties
    #[serde(default)]
    pub j2: Option<f64>,
    #[serde(default)]
    pub j3: Option<f64>,
    #[serde(default)]
    pub j4: Option<f64>,
    #[serde(default)]
    pub c22: Option<f64>,
    #[serde(default)]
    pub s22: Option<f64>,
    #[serde(default)]
    pub pole_vector: Option<Vector3>,
    
    #[serde(default)]
    pub k2: Option<f64>,
    #[serde(default)]
    pub tidal_q: Option<f64>,
    
    #[serde(default)]
    pub angular_velocity: Option<Vector3>,
    #[serde(default)]
    pub moment_of_inertia: Option<f64>,
    #[serde(default)]
    pub torque: Option<Vector3>,

    // Atmosphere & Drag
    #[serde(default)]
    pub has_atmosphere: Option<bool>,
    #[serde(default)]
    pub surface_pressure: Option<f64>,
    #[serde(default)]
    pub scale_height: Option<f64>,
    #[serde(default)]
    pub mean_temperature: Option<f64>,
    #[serde(default)]
    pub drag_coefficient: Option<f64>,

    // Yarkovsky
    #[serde(default)]
    pub albedo: Option<f64>,
    #[serde(default)]
    pub thermal_inertia: Option<f64>,

    // Precession/Nutation
    #[serde(default)]
    pub pole_ra0: Option<f64>,
    #[serde(default)]
    pub pole_dec0: Option<f64>,
    #[serde(default)]
    pub precession_rate: Option<f64>,
    #[serde(default)]
    pub nutation_amplitude: Option<f64>,
    
    #[serde(default)]
    pub libration: Option<f64>,

    // YORP Effect
    #[serde(default)]
    pub yorp_factor: Option<f64>,

    // Cometary Non-Gravitational Forces (Marsden-Sekanina)
    #[serde(default)]
    pub comet_a1: Option<f64>,
    #[serde(default)]
    pub comet_a2: Option<f64>,
    #[serde(default)]
    pub comet_a3: Option<f64>,
}
