use crate::common::types::{Vector3, PhysicsBody};
use crate::common::constants::{C_LIGHT, SOLAR_LUMINOSITY};

pub fn apply_srp(_sun: &PhysicsBody, body: &PhysicsBody, r_vec: &Vector3, dist: f64) -> Vector3 {
    let area = std::f64::consts::PI * body.radius * body.radius;
    let cr = 1.3;
    let f_mag = (SOLAR_LUMINOSITY * cr * area) / (4.0 * std::f64::consts::PI * C_LIGHT * dist * dist);
    let mut f = *r_vec; f.normalize(); f.scale(f_mag);
    f
}

pub fn apply_pr_drag(sun: &PhysicsBody, body: &PhysicsBody, _r_vec: &Vector3, dist: f64) -> Vector3 {
    let area = std::f64::consts::PI * body.radius * body.radius;
    let solar_flux = SOLAR_LUMINOSITY / (4.0 * std::f64::consts::PI * dist * dist);
    let w = solar_flux * area;
    let factor = w / (C_LIGHT * C_LIGHT);
    let mut rel_vel = body.vel; rel_vel.sub(&sun.vel);
    let mut f = rel_vel; f.scale(-factor);
    f
}

pub fn apply_yarkovsky(_sun: &PhysicsBody, body: &PhysicsBody, r_vec: &Vector3, dist: f64) -> Vector3 {
    if let (Some(albedo), Some(_inertia)) = (body.albedo, body.thermal_inertia) {
        let solar_flux = SOLAR_LUMINOSITY / (4.0 * std::f64::consts::PI * dist * dist);
        let absorbed = (1.0 - albedo) * solar_flux * std::f64::consts::PI * body.radius * body.radius;
        let lag = std::f64::consts::PI / 4.0;
        let f_mag = (absorbed / C_LIGHT) * lag.sin() * 0.1;
        
        let mut dir = *r_vec; dir.normalize();
        let mut v = body.vel; v.normalize();
        let cross1 = dir.cross(&v); 
        let mut tan = cross1.cross(&dir); tan.normalize();
        
        let mut direction = 1.0;
        if let (Some(_ang_vel), Some(pole)) = (body.angular_velocity, body.pole_vector) {
             let orb_norm = r_vec.cross(&body.vel);
             if orb_norm.dot(&pole) < 0.0 { direction = -1.0; }
        }
        
        tan.scale(f_mag * direction);
        return tan;
    }
    Vector3::zero()
}
