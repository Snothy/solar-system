use physics_wasm::common::types::Vector3;

#[test]
fn test_vector3_new() {
    let v = Vector3::new(1.0, 2.0, 3.0);
    assert_eq!(v.x, 1.0);
    assert_eq!(v.y, 2.0);
    assert_eq!(v.z, 3.0);
}

#[test]
fn test_vector3_zero() {
    let v = Vector3::zero();
    assert_eq!(v.x, 0.0);
    assert_eq!(v.y, 0.0);
    assert_eq!(v.z, 0.0);
}

#[test]
fn test_vector3_add() {
    let mut v1 = Vector3::new(1.0, 2.0, 3.0);
    let v2 = Vector3::new(4.0, 5.0, 6.0);
    v1.add(&v2);
    assert_eq!(v1.x, 5.0);
    assert_eq!(v1.y, 7.0);
    assert_eq!(v1.z, 9.0);
}

#[test]
fn test_vector3_sub() {
    let mut v1 = Vector3::new(5.0, 7.0, 9.0);
    let v2 = Vector3::new(4.0, 5.0, 6.0);
    v1.sub(&v2);
    assert_eq!(v1.x, 1.0);
    assert_eq!(v1.y, 2.0);
    assert_eq!(v1.z, 3.0);
}

#[test]
fn test_vector3_scale() {
    let mut v = Vector3::new(1.0, 2.0, 3.0);
    v.scale(2.0);
    assert_eq!(v.x, 2.0);
    assert_eq!(v.y, 4.0);
    assert_eq!(v.z, 6.0);
}

#[test]
fn test_vector3_len() {
    let v = Vector3::new(3.0, 4.0, 0.0);
    assert_eq!(v.len(), 5.0);
    assert_eq!(v.len_sq(), 25.0);
}

#[test]
fn test_vector3_normalize() {
    let mut v = Vector3::new(3.0, 4.0, 0.0);
    v.normalize();
    assert!((v.x - 0.6).abs() < 1e-10);
    assert!((v.y - 0.8).abs() < 1e-10);
    assert!((v.z - 0.0).abs() < 1e-10);
    assert!((v.len() - 1.0).abs() < 1e-10);
}

#[test]
fn test_vector3_dot() {
    let v1 = Vector3::new(1.0, 2.0, 3.0);
    let v2 = Vector3::new(4.0, 5.0, 6.0);
    let dot = v1.dot(&v2);
    assert_eq!(dot, 4.0 + 10.0 + 18.0); // 32.0
}

#[test]
fn test_vector3_cross() {
    let v1 = Vector3::new(1.0, 0.0, 0.0);
    let v2 = Vector3::new(0.0, 1.0, 0.0);
    let cross = v1.cross(&v2);
    assert_eq!(cross.x, 0.0);
    assert_eq!(cross.y, 0.0);
    assert_eq!(cross.z, 1.0);
}

#[test]
fn test_vector3_distance_to() {
    let v1 = Vector3::new(1.0, 1.0, 1.0);
    let v2 = Vector3::new(4.0, 5.0, 1.0);
    assert_eq!(v1.distance_to(&v2), 5.0);
}
