use crate::common::load_body;
use approx::assert_relative_eq;
use physics_wasm::common::constants::G;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::forces::{calculate_accelerations, ForceConfig, GravityMode};
use physics_wasm::common::config::PhysicsConfig;
use physics_wasm::common::indices::BodyIndex;

fn create_test_system() -> (Vec<PhysicsBody>, Vec<Option<BodyIndex>>) {
    let mut sun = load_body("Sun");
    sun.pos = Vector3::zero();

    let mut earth = load_body("Earth");
    earth.pos = Vector3::new(1.496e11, 0.0, 0.0);

    let mut moon = load_body("Moon");
    moon.pos = Vector3::new(1.496e11 + 3.844e8, 0.0, 0.0);

    let bodies = vec![sun, earth, moon];

    // Hierarchy: Sun -> Earth -> Moon
    // Indices: 0, 1, 2
    let parent_indices = vec![None, Some(BodyIndex(0)), Some(BodyIndex(1))];

    (bodies, parent_indices)
}

#[test]
fn test_newtonian_gravity_full() {
    let (bodies, parent_indices) = create_test_system();

    // Standard N-body: Include Sun, Don't subtract parent
    let physics_config = PhysicsConfig::default();
    let force_config = ForceConfig {
        physics: &physics_config,
        parent_indices: &parent_indices,
        gravity_mode: GravityMode::FullNBody,
    };

    let accs = calculate_accelerations(
        &bodies,
        &force_config,
        2451545.0, // J2000.0
    );

    // Earth should feel Sun's gravity
    let r_se = 1.496e11;
    let expected_acc_earth = G * (bodies[0].gm / physics_wasm::common::constants::G) / (r_se * r_se);

    // Accel is towards Sun (-X)
    assert_relative_eq!(accs[1].x, -expected_acc_earth, epsilon = 1e-3);

    // Moon should feel Earth's gravity AND Sun's gravity
    // Earth->Moon
    let r_em = 3.844e8;
    let acc_from_earth = G * (bodies[1].gm / physics_wasm::common::constants::G) / (r_em * r_em);

    // Sun->Moon
    let r_sm = 1.496e11 + 3.844e8;
    let acc_from_sun = G * (bodies[0].gm / physics_wasm::common::constants::G) / (r_sm * r_sm);

    let total_moon_acc = acc_from_earth + acc_from_sun;
    assert_relative_eq!(accs[2].x, -total_moon_acc, epsilon = 1e-3);
}

#[test]
fn test_wisdom_holman_mode() {
    let (bodies, parent_indices) = create_test_system();

    // WH Mode: Exclude Sun gravity (handled by drift), Subtract parent gravity (handled by drift)
    // But wait, WH usually subtracts Sun from Planets, and Planet from Moons.
    // `include_sun_gravity = false` means Sun->Planet is skipped.
    // `subtract_parent_gravity = true` means Planet->Moon is skipped.

    let mut physics_config = PhysicsConfig::default();
    physics_config.relativity = false;
    physics_config.gravitational_harmonics = false;
    physics_config.tidal_forces = false;
    physics_config.solar_radiation_pressure = false;
    physics_config.yarkovsky_effect = false;
    physics_config.atmospheric_drag = false;
    physics_config.poynting_robertson_drag = false;
    physics_config.comet_forces = false;
    let force_config = ForceConfig {
        physics: &physics_config,
        parent_indices: &parent_indices,
        gravity_mode: GravityMode::HierarchicalSubtraction,
    };

    let accs = calculate_accelerations(
        &bodies,
        &force_config,
        2451545.0, // J2000.0
    );

    // 1. Earth (Index 1)
    // Parent is Sun. `include_sun_gravity` is false.
    // So Earth should feel NO gravitational acceleration from Sun.
    // It might feel Moon's pull (perturbation).

    // In WH mode, if subtract_parent_gravity is true, the direct parent-child interaction is skipped.
    // Earth is parent of Moon, so Earth-Moon Newtonian force is skipped.
    // Earth should feel 0 acceleration from Moon here (it's handled by the Keplerian drift of the Moon relative to Earth?
    // Actually, the reflex motion of Earth due to Moon is usually handled by using Barycentric coordinates or similar,
    // but in this implementation, if we skip the force, we skip the force.
    assert_relative_eq!(accs[1].x, 0.0, epsilon = 1e-10);

    // 2. Moon (Index 2)
    // Parent is Earth. `subtract_parent_gravity` is true.
    // So Moon should NOT feel Earth's gravity (direct parent).
    // But it SHOULD feel Sun's TIDAL force (Sun->Moon - Sun->Earth).

    // Let's check logic in `calculate_accelerations`:
    // if !subtract_parent_gravity { ... } else if !is_sun_parent { ... Tidal ... }
    // Moon's parent is Earth (not Sun). So it enters the else if block.
    // It calculates Sun->Moon force and subtracts Sun->Earth force (Tidal).

    // Sun->Moon acc
    let r_sm = 1.496e11 + 3.844e8;
    let a_sm = G * (bodies[0].gm / physics_wasm::common::constants::G) / (r_sm * r_sm);

    // Sun->Earth acc
    let r_se = 1.496e11;
    let a_se = G * (bodies[0].gm / physics_wasm::common::constants::G) / (r_se * r_se);

    let expected_tidal = -(a_sm - a_se); // Both are towards Sun (-X), so difference.
                                         // Wait, a_sm is smaller than a_se. So (a_sm - a_se) is negative.
                                         // So expected_tidal is positive (relative acceleration away from Sun?).
                                         // Actually: a_tidal = a_sun_body - a_sun_parent
                                         // a_sun_body = -G M / r_sm^2
                                         // a_sun_parent = -G M / r_se^2
                                         // a_tidal = (-small) - (-big) = big - small > 0.
                                         // So it should be positive X.

    assert_relative_eq!(accs[2].x, expected_tidal, epsilon = 1e-5);
}

#[test]
fn test_j2_enable() {
    let (mut bodies, parent_indices) = create_test_system();

    // Enable J2 on Earth
    bodies[1].gravity_harmonics = Some(physics_wasm::common::types::HarmonicsParams {
        zonal_coeffs: Some(vec![0.0010826]),
        pole_vector: Some(Vector3::new(0.0, 0.0, 1.0)),
        ..Default::default()
    });

    let mut physics_config = PhysicsConfig::default();
    physics_config.gravitational_harmonics = true;

    let force_config = ForceConfig {
        physics: &physics_config,
        parent_indices: &parent_indices,
        gravity_mode: GravityMode::FullNBody,
    };

    let accs = calculate_accelerations(
        &bodies,
        &force_config,
        2451545.0, // J2000.0
    );

    // Moon should feel Earth's J2
    // We already tested J2 calculation in harmonics_test.
    // Here we just verify it's added to the total.

    // Newtonian Earth->Moon
    let r_em = 3.844e8;
    let acc_newtonian = G * (bodies[1].gm / physics_wasm::common::constants::G) / (r_em * r_em);

    // Sun->Moon
    let r_sm = 1.496e11 + 3.844e8;
    let acc_sun = G * (bodies[0].gm / physics_wasm::common::constants::G) / (r_sm * r_sm);

    let total_newtonian = acc_newtonian + acc_sun;

    // Actual accel should be slightly different due to J2
    // J2 is attractive at equator, so it should increase the inward acceleration (more negative).
    assert!(accs[2].x < -total_newtonian);
}
