import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { CelestialBodyData, VisualBody } from '../../types';

interface CelestialBodyProps {
  data: CelestialBodyData;
  visualBody: VisualBody;
  visualScale: number;
  useVisualScale: boolean;
  onClick: () => void;
}

export function CelestialBody({ 
  data, 
  visualBody, 
  visualScale, 
  useVisualScale,
  onClick 
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
  
  // Calculate rotation speed
  const rotationSpeed = useMemo(() => {
    if (!data.rotationPeriod) return 0;
    const periodSeconds = data.rotationPeriod * 3600;
    return (2 * Math.PI) / periodSeconds;
  }, [data.rotationPeriod]);
  
  // Update position and rotation every frame from physics simulation
  useFrame(() => {
    if (meshRef.current) {
      // Update position from physics simulation
      meshRef.current.position.copy(visualBody.mesh.position);
      
      // Update rotation
      if (rotationSpeed !== 0) {
        meshRef.current.rotation.y = visualBody.mesh.rotation.y;
      }
    }
  });
  
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
  
  // Axial tilt rotation
  const rotationX = useMemo(() => {
    return data.axialTilt ? THREE.MathUtils.degToRad(data.axialTilt) : 0;
  }, [data.axialTilt]);
  
  return (
    <mesh 
      ref={meshRef}
      scale={[scale, scale, scale]}
      rotation-x={rotationX}
      onClick={onClick}
      userData={{ parentBody: visualBody.body }}
    >
      <sphereGeometry args={[1, 64, 64]} />
      {material}
      
      {/* Rings for Saturn - using color only since texture URL is dead */}
      {data.hasRings && (
        <mesh rotation-x={Math.PI / 2}>
          <ringGeometry args={[1.4, 2.4, 128]} />
          <meshBasicMaterial
            color={data.ringColor}
            side={THREE.DoubleSide}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </mesh>
  );
}
