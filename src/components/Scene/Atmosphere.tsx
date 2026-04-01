import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AtmosphereShader } from './shaders/AtmosphereShader';

interface AtmosphereProps {
  radius: number;
  color: string;
  density?: number;
  sunPosition: THREE.Vector3;
  geometry: THREE.BufferGeometry;
}

export function Atmosphere({ radius, color, density = 1.0, sunPosition, geometry }: AtmosphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(AtmosphereShader.uniforms),
      vertexShader: AtmosphereShader.vertexShader,
      fragmentShader: AtmosphereShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
    return mat;
  }, []);

  useFrame(() => {
    if (meshRef.current) {
      // Update uniforms
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uColor.value.set(color);
      mat.uniforms.uDensity.value = density;
      mat.uniforms.uSunPosition.value.copy(sunPosition);
    }
  });

  return (
    <mesh ref={meshRef} scale={[radius * 1.2, radius * 1.2, radius * 1.2]}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
