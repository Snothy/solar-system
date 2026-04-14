use serde::{Deserialize, Serialize};

/// A 3D vector used throughout the physics engine.
///
/// # Units
/// The interpretation of units depends on context:
/// - **Position vectors**: Meters (m) in heliocentric ecliptic J2000 frame
/// - **Velocity vectors**: Meters per second (m/s)
/// - **Acceleration vectors**: Meters per second squared (m/s²)
/// - **Force vectors**: Newtons (N)
/// - **Angular velocity**: Radians per second (rad/s)
///
/// # Coordinate System
/// All position and velocity vectors use the **heliocentric ecliptic J2000** reference frame:
/// - Origin: Center of the Sun
/// - XY-plane: Earth's orbital plane (ecliptic) at epoch J2000
/// - X-axis: Points toward the vernal equinox
#[derive(Serialize, Deserialize, Clone, Copy, Debug, Default)]
pub struct Vector3 {
    /// X component (units depend on context)
    pub x: f64,
    /// Y component (units depend on context)
    pub y: f64,
    /// Z component (units depend on context)
    pub z: f64,
}

impl Vector3 {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }
    pub fn zero() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        }
    }

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

    pub fn scaled(&self, factor: f64) -> Self {
        Self {
            x: self.x * factor,
            y: self.y * factor,
            z: self.z * factor,
        }
    }

    pub fn len_sq(&self) -> f64 {
        self.x * self.x + self.y * self.y + self.z * self.z
    }
    pub fn len(&self) -> f64 {
        self.len_sq().sqrt()
    }

    pub fn normalize(&mut self) {
        let l = self.len();
        if l > 0.0 {
            self.scale(1.0 / l);
        }
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
        (dx * dx + dy * dy + dz * dz).sqrt()
    }
}
