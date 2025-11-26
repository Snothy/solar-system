import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Atmosphere } from './Atmosphere';
import type { CelestialBodyData, VisualBody } from '../../types';

interface CelestialBodyProps {
  data: CelestialBodyData;
  visualBody: VisualBody;
  visualScale: number;
  useVisualScale: boolean;
  onClick: () => void;
  layer: number;
}

export function CelestialBody({ 
  data, 
  visualBody, 
  visualScale, 
  useVisualScale,
  onClick,
  layer
}: CelestialBodyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Load texture if available (useTexture hook with Suspense)
  const texture = data.texture ? useTexture(data.texture) : null;
  
  // Set color space for texture
  useMemo(() => {
    if (texture) {
      if (Array.isArray(texture)) {
        texture.forEach(t => {
          t.colorSpace = THREE.SRGBColorSpace;
        });
      } else {
        texture.colorSpace = THREE.SRGBColorSpace;
      }
    }
  }, [texture]);
  

  
  // Update position and rotation every frame from physics simulation
  useFrame(() => {
    if (meshRef.current) {
      // Update position from physics simulation
      meshRef.current.position.copy(visualBody.mesh.position);
      
      // Update rotation
      // 1. Get base orientation (Pole alignment)
      // Default sphere has pole at (0, 1, 0)
      const pole = visualBody.body.poleVector || new THREE.Vector3(0, 1, 0);
      const baseQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), pole);
      
      // 2. Apply spin rotation around local Y axis (which is now aligned with pole)
      // visualBody.mesh.rotation.y contains the accumulated rotation angle from the simulation loop
      const spinAngle = visualBody.mesh.rotation.y;
      const spinQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spinAngle);
      
      // Combine: Base * Spin
      meshRef.current.quaternion.copy(baseQ.multiply(spinQ));
    }
  });

  // Initial orientation is now handled in useFrame to support dynamic updates if needed, 
  // but we can remove the separate useMemo for it to avoid conflicts.
  // The previous useMemo for initial orientation is removed/replaced by the above.
  
  // Calculate scale
  const scale = useMemo(() => {
    let r = visualBody.baseRadius;
    // Apply visual scale uniformly to all bodies, but cap the Sun's scale
    // The Sun is huge, so if we scale it up by the same factor as planets, it eats the inner solar system
    if (useVisualScale) {
      if (data.type === 'star') {
        // Scale sun much less than planets - maybe 1/10th of the visual scale or a fixed cap
        // visualScale is typically around 1000-3000 for planets to be visible
        // Let's try a much smaller multiplier for the sun
        r = r * (1 + (visualScale - 1) * 0.05);
      } else {
        r = r * visualScale;
      }
    }
    return r;
  }, [visualBody.baseRadius, visualScale, useVisualScale, data.type]);
  
  // Material
  const material = useMemo(() => {
    if (data.type === 'star') {
      return (
        <meshBasicMaterial 
          map={texture} 
          color={0xffffff} 
        />
      );
    } else {
      return (
        <meshStandardMaterial 
          map={texture} 
          roughness={1.0} 
          metalness={0.0}
        />
      );
    }
  }, [data.type, texture]);
  
  // Axial tilt rotation - REMOVED in favor of Pole Vector Quaternion
  // const rotationX = useMemo(() => {
  //   return data.axialTilt ? THREE.MathUtils.degToRad(data.axialTilt) : 0;
  // }, [data.axialTilt]);
  
  // Apply layer
  useMemo(() => {
    if (meshRef.current) {
      meshRef.current.layers.set(layer);
      meshRef.current.traverse((child) => {
        child.layers.set(layer);
      });
    }
  }, [layer]);

  return (
    <mesh 
      ref={meshRef}
      scale={[scale, scale, scale]}
      // rotation-x={rotationX} // Controlled by Quaternion now
      onClick={onClick}
      userData={{ parentBody: visualBody.body }}
      castShadow={data.type !== 'star'}
      receiveShadow={data.type !== 'star'}
    >
      <sphereGeometry args={[1, 64, 64]} />
      {material}
      

      
      {/* Atmosphere for Earth, Venus, Mars */}
      {['Earth', 'Venus', 'Mars'].includes(data.name) && (
        <Atmosphere 
          radius={1} 
          color={data.name === 'Earth' ? '#00aaff' : data.name === 'Venus' ? '#ffaa00' : '#ff4400'} 
          density={data.name === 'Venus' ? 2.0 : 1.0}
        />
      )}

      {/* Rings for Saturn - using color only since texture URL is dead */}
      {data.hasRings && (
        <mesh rotation-x={Math.PI / 2} receiveShadow castShadow>
          <ringGeometry args={[1.4, 2.4, 128]} />
          <meshStandardMaterial
            color={data.ringColor}
            side={THREE.DoubleSide}
            transparent
            opacity={0.8}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
      )}
    </mesh>
  );
}
