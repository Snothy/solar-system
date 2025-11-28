use crate::types::PhysicsBody;
use crate::forces::calculate_accelerations;
use ode_solvers::{System, Dop853, DVector};

pub fn step_high_precision(
    bodies: &mut Vec<PhysicsBody>,
    parent_indices: &Vec<Option<usize>>,
    dt: f64,
    sim_time: f64,
    enable_relativity: bool, 
    enable_j2: bool, 
    enable_tidal: bool,
    enable_srp: bool,
    enable_yarkovsky: bool,
    enable_drag: bool,
    use_eih: bool,
    enable_pr_drag: bool
) {
    struct SolarSystem<'a> {
        bodies: Vec<PhysicsBody>,
        parent_indices: &'a Vec<Option<usize>>,
        enable_relativity: bool, 
        enable_j2: bool, 
        enable_tidal: bool,
        enable_srp: bool,
        enable_yarkovsky: bool,
        enable_drag: bool,
        use_eih: bool,
        enable_pr_drag: bool
    }
    
    impl<'a> System<DVector<f64>> for SolarSystem<'a> {
        fn system(&self, _t: f64, y: &DVector<f64>, dy: &mut DVector<f64>) {
            let n = self.bodies.len();
            let mut current_bodies = self.bodies.clone();
            for i in 0..n {
                current_bodies[i].pos.x = y[i*6 + 0];
                current_bodies[i].pos.y = y[i*6 + 1];
                current_bodies[i].pos.z = y[i*6 + 2];
                current_bodies[i].vel.x = y[i*6 + 3];
                current_bodies[i].vel.y = y[i*6 + 4];
                current_bodies[i].vel.z = y[i*6 + 5];
            }
            
            let accs = calculate_accelerations(
                &current_bodies,
                self.parent_indices,
                self.enable_relativity,
                self.enable_j2,
                self.enable_tidal,
                self.enable_srp,
                self.enable_yarkovsky,
                self.enable_drag,
                self.use_eih,
                self.enable_pr_drag,
                true,
                false
            );
            
            for i in 0..n {
                dy[i*6 + 0] = current_bodies[i].vel.x;
                dy[i*6 + 1] = current_bodies[i].vel.y;
                dy[i*6 + 2] = current_bodies[i].vel.z;
                dy[i*6 + 3] = accs[i].x;
                dy[i*6 + 4] = accs[i].y;
                dy[i*6 + 5] = accs[i].z;
            }
        }
    }
    
    let n = bodies.len();
    let mut y0_vec = vec![0.0; n * 6];
    for i in 0..n {
        y0_vec[i*6 + 0] = bodies[i].pos.x;
        y0_vec[i*6 + 1] = bodies[i].pos.y;
        y0_vec[i*6 + 2] = bodies[i].pos.z;
        y0_vec[i*6 + 3] = bodies[i].vel.x;
        y0_vec[i*6 + 4] = bodies[i].vel.y;
        y0_vec[i*6 + 5] = bodies[i].vel.z;
    }
    
    let y0 = DVector::from_vec(y0_vec);
    
    let system = SolarSystem {
        bodies: bodies.clone(),
        parent_indices: parent_indices,
        enable_relativity,
        enable_j2,
        enable_tidal,
        enable_srp,
        enable_yarkovsky,
        enable_drag,
        use_eih,
        enable_pr_drag
    };
    
    // Use very tight tolerances for "NASA level"
    let rtol = 1e-13;
    let atol = 1e-13;
    
    let mut stepper = Dop853::new(system, sim_time, sim_time + dt, dt, y0, rtol, atol);
    let res = stepper.integrate();
    
    if let Ok(_) = res {
        if let Some(y_final) = stepper.y_out().last() {
            for i in 0..n {
                bodies[i].pos.x = y_final[i*6 + 0];
                bodies[i].pos.y = y_final[i*6 + 1];
                bodies[i].pos.z = y_final[i*6 + 2];
                bodies[i].vel.x = y_final[i*6 + 3];
                bodies[i].vel.y = y_final[i*6 + 4];
                bodies[i].vel.z = y_final[i*6 + 5];
            }
        }
    }
}
