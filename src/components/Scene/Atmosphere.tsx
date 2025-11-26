import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AtmosphereProps {
  radius: number;
  color: string;
  density?: number;
}

export function Atmosphere({ radius, color, density = 1.0 }: AtmosphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) },
    uDensity: { value: density },
    uTime: { value: 0 }
  }), [color, density]);

  useFrame(({ clock, camera }) => {
    if (meshRef.current) {
      meshRef.current.lookAt(camera.position);
      uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    uniform float uDensity;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      // Calculate intensity based on the angle between the normal and the view direction
      // This creates a "rim light" effect typical of atmospheres
      float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 4.0);
      
      // Add a soft glow
      vec3 atmosphere = uColor * intensity * uDensity;
      
      gl_FragColor = vec4(atmosphere, intensity * uDensity);
    }
  `;

  return (
    <mesh ref={meshRef} scale={[radius * 1.2, radius * 1.2, radius * 1.2]}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
