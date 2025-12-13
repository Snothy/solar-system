import { useEffect, useState, useMemo, useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StarData {
  pos: [number, number, number];
  mag: number;
  bv: number;
  name?: string;
}

// Approximate B-V to RGB conversion
function bvToColor(bv: number): THREE.Color {
  let t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
  
  if (t < 1900) t = 1900;
  if (t > 12000) t = 12000; 
  
  const color = new THREE.Color();
  
  if (bv < 0.0) color.setHex(0x9bb0ff); 
  else if (bv < 0.5) color.setHex(0xcad7ff); 
  else if (bv < 1.0) color.setHex(0xf8f7ff); 
  else if (bv < 1.5) color.setHex(0xfff4ea); 
  else if (bv < 2.0) color.setHex(0xffd2a1); 
  else color.setHex(0xffa060); 
  
  return color;
}

export function Stars() {
  const [stars, setStars] = useState<StarData[]>([]);
  
  // Load background texture
  const milkyWayTexture = useTexture('/MilkyWay.jpg');

  useEffect(() => {
    fetch('/stars.json')
      .then(res => res.json())
      .then(data => setStars(data))
      .catch(err => console.error("Failed to load stars:", err));
  }, []);

  const geometry = useMemo(() => {
    if (stars.length === 0) return null;

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(stars.length * 3);
    const colors = new Float32Array(stars.length * 3);
    const sizes = new Float32Array(stars.length);

    stars.forEach((star, i) => {
      // Position (at infinite distance, e.g. 900,000 units)
      // Scene camera far is 1,000,000
      const dist = 900000;
      positions[i * 3] = star.pos[0] * dist;
      positions[i * 3 + 1] = star.pos[1] * dist;
      positions[i * 3 + 2] = star.pos[2] * dist;

      // Color
      const col = bvToColor(star.bv);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      // Size based on magnitude
      sizes[i] = Math.max(1.0, 6.0 - 0.8 * star.mag);
    });

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return geo;
  }, [stars]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
        uTime: { value: 0.0 }
      },
      // ... shader code
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        uniform float uTime;
        varying vec3 vColor;
        
        // Pseudo-random
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // Twinkle effect
          // Use position as seed
          float r = random(position.xy);
          float twinkle = 0.5 + 0.5 * sin(uTime * (2.0 + r * 5.0) + r * 100.0);
          
          gl_PointSize = size * (0.8 + 0.4 * twinkle); 
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          if(length(coord) > 0.5) discard;
          
          float strength = 1.0 - (length(coord) * 2.0);
          strength = pow(strength, 2.0);
          
          gl_FragColor = vec4(vColor, strength);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, []);

  // Animate stars
  useFrame((state) => {
    if (material) {
        material.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <group>
      {/* Background Sphere */}
      <mesh>
        <sphereGeometry args={[950000, 64, 64]} />
        <meshBasicMaterial 
          map={milkyWayTexture} 
          side={THREE.BackSide} 
          color={0x666666} // Dim it slightly so it doesn't overpower everything
        />
      </mesh>
      
      {/* Star Points */}
      {geometry && <points geometry={geometry} material={material} />}
    </group>
  );
}
