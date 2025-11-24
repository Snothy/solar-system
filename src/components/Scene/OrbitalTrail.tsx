import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface OrbitalTrailProps {
  positions: Float32Array;
  count: number;
  color: number;
}

export function OrbitalTrail({ positions, count, color }: OrbitalTrailProps) {
  const lineRef = useRef<THREE.Line>(null);
  
  useEffect(() => {
    if (lineRef.current && count > 0) {
      const geometry = lineRef.current.geometry;
      geometry.setDrawRange(0, count);
      geometry.attributes.position.needsUpdate = true;
    }
  }, [count, positions]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending
  });
  
  return <primitive ref={lineRef} object={new THREE.Line(geometry, material)} frustumCulled={false} />;
}
