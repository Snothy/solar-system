import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Billboard } from '@react-three/drei';
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
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        {/* Glowing dot */}
        <mesh>
          <circleGeometry args={[dotSize * 1.5, 32]} />
          <meshBasicMaterial 
            color={color} 
            transparent
            opacity={isStar ? 1.0 : 0.8}
            toneMapped={false}
          />
        </mesh>
        
        {/* Glow ring around dot */}
        <mesh>
          <ringGeometry args={[dotSize * 1.5, dotSize * 2.5, 32]} />
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
      </Billboard>
    </group>
  );
}

// --- Orbit Ellipse ---

interface OrbitEllipseProps {
  data: CelestialBodyData;
  visualBody: VisualBody;
  parentVisualBody?: VisualBody;
  visible: boolean;
}

export function OrbitEllipse({ data, visualBody, parentVisualBody, visible }: OrbitEllipseProps) {
  const lineRef = useRef<THREE.Line>(null);

  const line = useMemo(() => {
    if (!visible || !parentVisualBody) return null;

    const myPos = visualBody.body.pos;
    const myVel = visualBody.body.vel;
    const parentPos = parentVisualBody.body.pos;
    const parentVel = parentVisualBody.body.vel;
    
    // Convert to relative coordinates
    const r_vec = myPos.clone().sub(parentPos);
    const v_vec = myVel.clone().sub(parentVel);
    
    const G = 6.67430e-11;
    const mu = G * parentVisualBody.body.mass;
    
    const r = r_vec.length();
    const v_sq = v_vec.lengthSq();
    
    if (r === 0 || v_sq === 0) return null;
    
    // Specific orbital energy
    const eps = v_sq / 2 - mu / r;
    // Semi-major axis
    const a = -mu / (2 * eps);
    
    if (a <= 0) return null; // Hyperbolic or parabolic

    // Specific angular momentum h = r x v
    const h_vec = new THREE.Vector3().crossVectors(r_vec, v_vec);
    
    // Eccentricity vector e = (v x h)/mu - r/|r|
    const term1 = new THREE.Vector3().crossVectors(v_vec, h_vec).divideScalar(mu);
    const term2 = r_vec.clone().normalize();
    const e_vec = term1.sub(term2);
    const e = e_vec.length();
    
    if (e >= 1.0) return null; // Not an ellipse
    
    // Coordinate frame in the orbital plane
    // P points to periapsis
    const P = e_vec.clone().normalize();
    
    // Q is perpendicular to P around h
    const Q = h_vec.clone().cross(P).normalize();
    
    const segments = 256;
    const points: THREE.Vector3[] = [];

    // Parametric equation using eccentric anomaly E
    for (let j = 0; j <= segments; j++) {
      const E = (j / segments) * Math.PI * 2;
      const x_orb = a * (Math.cos(E) - e);
      const y_orb = a * Math.sqrt(1 - e * e) * Math.sin(E);
      
      // Vector in physical coordinates (relative to parent)
      const pt_physical = new THREE.Vector3()
        .addScaledVector(P, x_orb)
        .addScaledVector(Q, y_orb);
        
      // pt_physical is already in Three.js Y-up coordinates because pos/vel are Y-up
      const xr = pt_physical.x * SCALE;
      const yr = pt_physical.y * SCALE;
      const zr = pt_physical.z * SCALE;
      
      points.push(new THREE.Vector3(xr, yr, zr));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const color = ORBIT_COLORS[data.name] || '#555555';
    const mat = new THREE.LineBasicMaterial({ 
      color, 
      transparent: true, 
      opacity: 0.4 
    });
    return new THREE.Line(geo, mat);
  }, [visualBody.body.pos, visualBody.body.vel, parentVisualBody?.body.pos, parentVisualBody?.body.vel, data.name, visible]);

  useFrame(() => {
    if (lineRef.current && parentVisualBody) {
      lineRef.current.position.copy(parentVisualBody.mesh.position);
    }
  });

  if (!line || !visible) return null;

  return <primitive ref={lineRef} object={line} />;
}
