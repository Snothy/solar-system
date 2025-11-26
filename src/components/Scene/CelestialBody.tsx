import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, useGLTF } from '@react-three/drei';
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

function BodyModel({ url, scale }: { url: string, scale: number }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        // Optional: Apply color if model doesn't have texture?
        // For now, keep model's own materials.
      }
    });
    return c;
  }, [scene]);
  
  return <primitive object={clone} scale={[scale, scale, scale]} />;
}

export function CelestialBody({ 
  data, 
  visualBody, 
  visualScale, 
  useVisualScale,
  onClick,
  layer
}: CelestialBodyProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Load texture if available (useTexture hook with Suspense)
  // Only load texture if we are NOT using a model (or if model needs it, but usually model has its own)
  const shouldLoadTexture = !data.shape || data.shape === 'sphere';
  const texture = (data.texture && shouldLoadTexture) ? useTexture(data.texture) : null;
  
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
    if (groupRef.current) {
      // Update position from physics simulation
      groupRef.current.position.copy(visualBody.mesh.position);
      
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
      groupRef.current.quaternion.copy(baseQ.multiply(spinQ));
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
  
  // Material for sphere
  const material = useMemo(() => {
    if (!shouldLoadTexture) return null;
    
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
          color={!texture ? data.color : 0xffffff}
        />
      );
    }
  }, [data.type, texture, shouldLoadTexture, data.color]);
  
  // Axial tilt rotation - REMOVED in favor of Pole Vector Quaternion
  // const rotationX = useMemo(() => {
  //   return data.axialTilt ? THREE.MathUtils.degToRad(data.axialTilt) : 0;
  // }, [data.axialTilt]);
  
  // Apply layer
  useMemo(() => {
    if (groupRef.current) {
      groupRef.current.layers.set(layer);
      groupRef.current.traverse((child) => {
        child.layers.set(layer);
      });
    }
  }, [layer]);

  return (
    <group 
      ref={groupRef}
      onClick={onClick}
      userData={{ parentBody: visualBody.body }}
    >
      {data.shape === 'model' && data.modelPath ? (
        <BodyModel 
          url={data.modelPath} 
          scale={scale * (data.modelScale || 1)} 
        />
      ) : (
        <mesh 
          scale={[scale, scale, scale]}
          castShadow={data.type !== 'star'}
          receiveShadow={data.type !== 'star'}
        >
          <sphereGeometry args={[1, 64, 64]} />
          {material}
        </mesh>
      )}
      
      {/* Atmosphere for Earth, Venus, Mars (Only if sphere) */}
      {shouldLoadTexture && ['Earth', 'Venus', 'Mars'].includes(data.name) && (
        <Atmosphere 
          radius={scale} 
          color={data.name === 'Earth' ? '#00aaff' : data.name === 'Venus' ? '#ffaa00' : '#ff4400'} 
          density={data.name === 'Venus' ? 2.0 : 1.0}
        />
      )}

      {/* Rings for Saturn */}
      {data.hasRings && (
        <mesh rotation-x={Math.PI / 2} receiveShadow castShadow scale={[scale, scale, scale]}>
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
    </group>
  );
}
