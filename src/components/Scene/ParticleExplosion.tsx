import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleExplosionProps {
  position: THREE.Vector3;
  onComplete: () => void;
}

export function ParticleExplosion({ position, onComplete }: ParticleExplosionProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const velocitiesRef = useRef<number[]>([]);
  const lifeRef = useRef(1.0);
  
  const count = 30;
  
  useEffect(() => {
    // Initialize random velocities
    const vels: number[] = [];
    for (let i = 0; i < count; i++) {
      vels.push(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      );
    }
    velocitiesRef.current = vels;
  }, []);
  
  useFrame(() => {
    if (!pointsRef.current) return;
    
    lifeRef.current -= 0.02;
    
    if (lifeRef.current <= 0) {
      onComplete();
      return;
    }
    
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const vels = velocitiesRef.current;
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] += vels[i * 3];
      positions[i * 3 + 1] += vels[i * 3 + 1];
      positions[i * 3 + 2] += vels[i * 3 + 2];
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    if (pointsRef.current.material instanceof THREE.PointsMaterial) {
      pointsRef.current.material.opacity = lifeRef.current;
    }
  });
  
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({ color: 0xffaa00, size: 2, transparent: true });
  
  return <primitive ref={pointsRef} object={new THREE.Points(geometry, material)} />;
}
