import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { CelestialBodyData, VisualBody } from '../../types';
import { SCALE } from '../../utils/constants';

// Color palette for orbit lines (NASA Eyes-inspired)
const ORBIT_COLORS: Record<string, string> = {
  Mercury: '#888888',
  Venus: '#e8c547',
  Earth: '#4488ff',
  Mars: '#cc4422',
  Jupiter: '#cc9944',
  Saturn: '#ddbb66',
  Uranus: '#66cccc',
  Neptune: '#4466dd',
  Pluto: '#aa8877',
};

function getBodyColor(data: CelestialBodyData): string {
  if (data.type === 'star') return '#ffcc44';
  return ORBIT_COLORS[data.name] || `#${new THREE.Color(data.color).getHexString()}`;
}

interface SchematicBodyProps {
  data: CelestialBodyData;
  visualBody: VisualBody;
  onClick: () => void;
}

export function SchematicBody({
  data,
  visualBody,
  onClick,
}: SchematicBodyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const color = getBodyColor(data);
  const isStar = data.type === 'star';
  const isPlanet = data.type === 'planet';
  const isMoon = data.type === 'moon';

  // Dot size: stars bigger, planets medium, moons small
  const dotSize = isStar ? 0.08 : isPlanet ? 0.03 : 0.015;

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(visualBody.mesh.position);
    }
  });

  // Don't show labels for very small bodies unless they're planets
  const showLabel = isPlanet || isStar || data.type === 'dwarf planet';

  return (
    <group ref={groupRef} onClick={onClick}>
      {/* Glowing dot */}
      <mesh>
        <sphereGeometry args={[dotSize, 16, 16]} />
        <meshBasicMaterial 
          color={color} 
          toneMapped={false}
        />
      </mesh>
      
      {/* Glow ring around dot */}
      <mesh>
        <ringGeometry args={[dotSize * 1.2, dotSize * 1.8, 32]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={isStar ? 0.6 : 0.3} 
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Label */}
      {showLabel && (
        <Html
          position={[dotSize * 3, dotSize * 2, 0]}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
          zIndexRange={[10, 0]}
        >
          <div style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: '11px',
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontWeight: 600,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            textShadow: '0 0 8px rgba(0,0,0,0.8)',
          }}>
            {data.name}
          </div>
        </Html>
      )}

      {/* Moon label - smaller */}
      {isMoon && (
        <Html
          position={[dotSize * 2, dotSize * 1.5, 0]}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
          zIndexRange={[10, 0]}
        >
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '8px',
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontWeight: 500,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            {data.name}
          </div>
        </Html>
      )}
    </group>
  );
}

// --- Orbit Ellipse ---

interface OrbitEllipseProps {
  data: CelestialBodyData;
  parentPosition: THREE.Vector3;
  visible: boolean;
}

export function OrbitEllipse({ data, parentPosition, visible }: OrbitEllipseProps) {
  const lineRef = useRef<THREE.Line>(null);

  const line = useMemo(() => {
    if (!data.rel_a || !visible) return null;

    const a = data.rel_a * SCALE;
    const e = data.rel_e || 0;
    const i = THREE.MathUtils.degToRad(data.rel_i || 0);
    const b = a * Math.sqrt(1 - e * e);

    const segments = 128;
    const points: THREE.Vector3[] = [];

    for (let j = 0; j <= segments; j++) {
      const theta = (j / segments) * Math.PI * 2;
      const x = a * Math.cos(theta) - a * e;
      const y = b * Math.sin(theta);
      
      const xr = x;
      const yr = y * Math.cos(i);
      const zr = y * Math.sin(i);

      points.push(new THREE.Vector3(xr, zr, -yr));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const color = ORBIT_COLORS[data.name] || '#555555';
    const mat = new THREE.LineBasicMaterial({ 
      color, 
      transparent: true, 
      opacity: 0.4 
    });
    return new THREE.Line(geo, mat);
  }, [data.rel_a, data.rel_e, data.rel_i, data.name, visible]);

  useFrame(() => {
    if (lineRef.current) {
      lineRef.current.position.copy(parentPosition);
    }
  });

  if (!line || !visible) return null;

  return <primitive ref={lineRef} object={line} />;
}
