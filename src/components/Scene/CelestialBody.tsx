import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Atmosphere } from './Atmosphere';
import { CloudLayer } from './CloudLayer';
import type { CelestialBodyData, VisualBody } from '../../types';
import { SCALE } from '../../utils/constants';

interface CelestialBodyProps {
  data: CelestialBodyData;
  visualBody: VisualBody;
  visualScale: number;
  useVisualScale: boolean;
  onClick: () => void;
  layer: number;
  sunPosition: THREE.Vector3;
  parentVisualBody?: VisualBody;
}

function calculateVisualRadius(baseRadius: number, visualScale: number, useVisualScale: boolean): number {
  let r = baseRadius;
  if (useVisualScale) {
    r *= visualScale;
    const MAX_RADIUS = 40.0;
    if (r > MAX_RADIUS) r = MAX_RADIUS;
  }
  return r;
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
  layer,
  sunPosition,
  parentVisualBody
}: CelestialBodyProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Load texture if available (useTexture hook with Suspense)
  // Only load texture if we are NOT using a model (or if model needs it, but usually model has its own)
  const shouldLoadTexture = !data.shape || data.shape === 'sphere';
  const texture = (data.texture && shouldLoadTexture) ? useTexture(data.texture) : null;
  const normalMap = (data.normalMap && shouldLoadTexture) ? useTexture(data.normalMap) : null;
  const roughnessMap = (data.roughnessMap && shouldLoadTexture) ? useTexture(data.roughnessMap) : null;
  const metalnessMap = (data.metalnessMap && shouldLoadTexture) ? useTexture(data.metalnessMap) : null;
  const emissiveMap = (data.emissiveMap && shouldLoadTexture) ? useTexture(data.emissiveMap) : null;
  
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
      const targetPos = visualBody.mesh.position;
      
      // Minimum Visual Distance Logic for Moons
      if (useVisualScale && parentVisualBody) {
         const parentRadius = calculateVisualRadius(parentVisualBody.baseRadius, visualScale, true);
         const myRadius = calculateVisualRadius(visualBody.baseRadius, visualScale, true);
         
         // Minimum distance to avoid clipping (1.1x combined radius)
         const minDist = (parentRadius + myRadius) * 1.1;
         
         const parentPos = parentVisualBody.mesh.position;
         
         // Calculate vector from parent to moon
         const diff = new THREE.Vector3().subVectors(targetPos, parentPos);
         const dist = diff.length();
         
         if (dist < minDist && dist > 0) {
            // Push out along the radius vector
            const dir = diff.normalize();
            const newPos = parentPos.clone().add(dir.multiplyScalar(minDist));
            groupRef.current.position.copy(newPos);
         } else {
            groupRef.current.position.copy(targetPos);
         }
      } else {
         groupRef.current.position.copy(targetPos);
      }
      
      // Update rotation
      // 1. Get base orientation (Pole alignment)
      // Default sphere has pole at (0, 1, 0)
      const pole = visualBody.body.poleVector || new THREE.Vector3(0, 1, 0);
      const baseQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), pole);
      
      // 2. Apply spin rotation around local Y axis (which is now aligned with pole)
      let spinAngle = visualBody.mesh.rotation.y + (visualBody.libration || 0);
      
      const spinQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spinAngle);
      
      // Combine: Base * Spin
      groupRef.current.quaternion.copy(baseQ.multiply(spinQ));
    }
  });

  // Initial orientation is now handled in useFrame to support dynamic updates if needed, 
  // but we can remove the separate useMemo for it to avoid conflicts.
  // The previous useMemo for initial orientation is removed/replaced by the above.
  
  // Calculate scale
  const scaleVec = useMemo(() => {
    // 1. Determine base radii (in scene units)
    let rx, ry, rz;
    
    if (data.radii) {
      rx = data.radii.x * SCALE;
      ry = data.radii.y * SCALE;
      rz = data.radii.z * SCALE;
    } else {
      const r = visualBody.baseRadius;
      rx = r;
      ry = r;
      rz = r;
    }

    // 2. Apply visual scale if enabled
    if (useVisualScale) {
      // Apply scale factor
      rx *= visualScale;
      ry *= visualScale;
      rz *= visualScale;

      // 3. Apply Global Radius Cap (40 units = 40 million km)
      // Mercury perihelion is ~46 million km (46 units).
      // This ensures no body ever expands enough to touch Mercury's orbit.
      const MAX_RADIUS = 40.0;
      
      if (rx > MAX_RADIUS) {
         // Maintain aspect ratio if we cap
         const factor = MAX_RADIUS / rx;
         rx *= factor;
         ry *= factor;
         rz *= factor;
      }
    }

    return [rx, ry, rz] as [number, number, number];
  }, [visualBody.baseRadius, visualScale, useVisualScale, data.radii]);

  
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
          normalMap={normalMap}
          roughnessMap={roughnessMap}
          metalnessMap={metalnessMap}
          emissiveMap={emissiveMap}
          emissive={emissiveMap ? new THREE.Color(0xffffff) : new THREE.Color(0x000000)}
          roughness={data.roughnessMap ? 1.0 : 1.0} 
          metalness={data.metalnessMap ? 1.0 : 0.0}
          color={!texture ? data.color : 0xffffff}
        />
      );
    }
  }, [data.type, texture, normalMap, roughnessMap, metalnessMap, emissiveMap, shouldLoadTexture, data.color]);
  
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
          scale={scaleVec[0] * (data.modelScale || 1)} 
        />
      ) : (
        <mesh 
          scale={scaleVec}
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
          radius={scaleVec[0]}  
          color={data.name === 'Earth' ? '#00aaff' : data.name === 'Venus' ? '#ffaa00' : '#ff4400'} 
          density={data.name === 'Venus' ? 2.0 : 1.0}
          sunPosition={sunPosition}
        />
      )}

      {/* Cloud Layer */}
      {shouldLoadTexture && data.cloudMap && (
        <CloudLayer 
          radius={scaleVec[0] * 1.01} // Slightly larger than planet
          textureUrl={data.cloudMap}
          opacity={data.cloudTransparency || 0.8}
        />
      )}

      {/* Rings */}
      {data.hasRings && data.ringInnerRadius && data.ringOuterRadius && (
        <mesh rotation-x={Math.PI / 2} receiveShadow castShadow>
          <ringGeometry args={[
            data.ringInnerRadius * SCALE * (useVisualScale ? visualScale : 1), 
            data.ringOuterRadius * SCALE * (useVisualScale ? visualScale : 1), 
            128
          ]} />
          <meshStandardMaterial
            color={data.ringColor || 0xffffff}
            side={THREE.DoubleSide}
            transparent
            opacity={data.ringOpacity || 0.8}
            roughness={0.8}
            metalness={0.1}
            // map={ringTexture} // TODO: Load texture if available
          />
        </mesh>
      )}
    </group>
  );
}
