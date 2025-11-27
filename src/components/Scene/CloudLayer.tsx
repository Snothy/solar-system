import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface CloudLayerProps {
  radius: number;
  textureUrl: string;
  rotationSpeed?: number;
  opacity?: number;
  sunPosition: THREE.Vector3;
}

export function CloudLayer({ 
  radius, 
  textureUrl, 
  rotationSpeed = 0.05, 
  opacity = 0.8
}: Omit<CloudLayerProps, 'sunPosition'>) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(textureUrl);

  useMemo(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
  }, [texture]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      // Rotate clouds independently
      meshRef.current.rotation.y += rotationSpeed * delta * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} scale={[radius, radius, radius]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial 
        map={texture}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false} // Don't write to depth buffer to avoid z-fighting with atmosphere
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}
