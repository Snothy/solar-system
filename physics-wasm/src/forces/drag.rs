use crate::common::types::{PhysicsBody, Vector3};

pub fn apply_drag(atmo: &PhysicsBody, body: &PhysicsBody, _r_vec: &Vector3, dist: f64) -> Vector3 {
    let altitude = dist - atmo.radius;
    
    if let Some(atmosphere) = &atmo.atmosphere {
        if let (Some(scale_h), Some(press), Some(temp)) = (
            atmosphere.scale_height,
            atmosphere.surface_pressure,
            atmosphere.mean_temperature,
        ) {
            let scale_h_m = scale_h * 1000.0;
            if altitude > 0.0 && altitude < scale_h_m * 10.0 {
                let rho0 = press / (287.0 * temp);
                let rho = rho0 * (-altitude / scale_h_m).exp();
                
                let mut rel_vel = body.vel;
                rel_vel.sub(&atmo.vel);
                
                let v_mag = rel_vel.len();
                if v_mag > 1.0 {
                    // Use drag coefficient from body's atmosphere params if available, else default
                    let cd = body.atmosphere.as_ref().and_then(|a| a.drag_coefficient).unwrap_or(2.2);
                    let area = std::f64::consts::PI * body.radius * body.radius;
                    let drag = 0.5 * rho * v_mag * v_mag * cd * area;
                    let mut f = rel_vel;
                    f.normalize();
                    f.scale(-drag);
                    return f;
                }
            }
        }
    }
    Vector3::zero()
}
