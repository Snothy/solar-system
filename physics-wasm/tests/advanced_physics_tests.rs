#[cfg(test)]
mod tests {
    use physics_wasm::types::{PhysicsBody, Vector3};
    use physics_wasm::forces::apply_cometary_forces;
    use physics_wasm::torques::apply_yorp_torque;
    use physics_wasm::analysis::resolve_collisions;

    #[test]
    fn test_cometary_forces() {
        let sun = PhysicsBody {
            name: "Sun".to_string(),
            mass: 1.989e30,
            pos: Vector3::zero(),
            vel: Vector3::zero(),
            ..Default::default()
        };

        let mut comet = PhysicsBody {
            name: "Comet".to_string(),
            mass: 1.0e14,
            pos: Vector3 { x: 1.496e11, y: 0.0, z: 0.0 }, // 1 AU
            vel: Vector3 { x: 0.0, y: 29780.0, z: 0.0 },
            comet_a1: Some(1.0e-8), // Small non-grav accel
            comet_a2: Some(0.0),
            comet_a3: Some(0.0),
            ..Default::default()
        };

        let r_vec = Vector3 { x: 1.496e11, y: 0.0, z: 0.0 };
        let dist = 1.496e11;

        let force = apply_cometary_forces(&sun, &comet, &r_vec, dist);
        
        // A1 is radial. Force = mass * A1 * g(r).
        // g(r) at 1 AU is approx 1.0.
        // So Force approx 1e14 * 1e-8 * 1.0 = 1e6 N.
        // Direction should be radial (along r_vec).
        
        assert!(force.x > 0.0);
        assert!(force.y == 0.0);
        assert!(force.z == 0.0);
        assert!(force.x > 0.9e6 && force.x < 1.1e6);
    }

    #[test]
    fn test_yorp_torque() {
        let mut bodies = vec![
            PhysicsBody {
                name: "Sun".to_string(),
                mass: 1.989e30,
                pos: Vector3::zero(),
                ..Default::default()
            },
            PhysicsBody {
                name: "Asteroid".to_string(),
                mass: 1.0e10,
                pos: Vector3 { x: 1.496e11, y: 0.0, z: 0.0 },
                yorp_factor: Some(1.0e17),
                angular_velocity: Some(Vector3 { x: 0.0, y: 0.0, z: 1.0 }),
                pole_vector: Some(Vector3 { x: 0.0, y: 0.0, z: 1.0 }),
                ..Default::default()
            }
        ];

        let dt = 86400.0; // 1 day
        apply_yorp_torque(&mut bodies, dt);

        let asteroid = &bodies[1];
        let ang_vel = asteroid.angular_velocity.unwrap();
        
        // Should have increased spin
        assert!(ang_vel.z > 1.0);
    }

    #[test]
    fn test_collision_resolution() {
        let mut bodies = vec![
            PhysicsBody {
                name: "Earth".to_string(),
                mass: 5.972e24,
                radius: 6371000.0,
                pos: Vector3::zero(),
                vel: Vector3::zero(),
                ..Default::default()
            },
            PhysicsBody {
                name: "Impactor".to_string(),
                mass: 1.0e20,
                radius: 100000.0,
                pos: Vector3 { x: 6000000.0, y: 0.0, z: 0.0 }, // Overlapping Earth
                vel: Vector3 { x: 1000.0, y: 0.0, z: 0.0 },
                ..Default::default()
            }
        ];

        let removed = resolve_collisions(&mut bodies);
        
        assert_eq!(removed.len(), 1);
        assert_eq!(removed[0], 1); // Impactor should be removed
        
        // Earth should have gained mass and momentum
        assert!(bodies[0].mass > 5.972e24);
        assert!(bodies[0].vel.x > 0.0); // Momentum transfer
    }
}
