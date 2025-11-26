import { useEffect, useState, useMemo } from 'react';
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
  
  // Clamp temperature
  if (t < 1900) t = 1900;
  if (t > 12000) t = 12000; // Cap at blue-white
  
  // Simple Kelvin to RGB (approximate)
  // Using a simplified lookup or algorithm
  // For simplicity, let's map B-V directly to hue
  // -0.4 (Blue) -> 1.8 (Red)
  
  const color = new THREE.Color();
  
  if (bv < 0.0) color.setHex(0x9bb0ff); // Blue
  else if (bv < 0.5) color.setHex(0xcad7ff); // Blue-white
  else if (bv < 1.0) color.setHex(0xf8f7ff); // White
  else if (bv < 1.5) color.setHex(0xfff4ea); // Yellow-white
  else if (bv < 2.0) color.setHex(0xffd2a1); // Orange
  else color.setHex(0xffa060); // Red
  
  return color;
}

export function Stars() {
  const [stars, setStars] = useState<StarData[]>([]);

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
      // Mag -1.5 (Sirius) -> Large
      // Mag 6.5 -> Small
      // Formula: size = max(0.5, 5.0 - 0.7 * mag)
      sizes[i] = Math.max(1.0, 6.0 - 0.8 * star.mag);
    });

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return geo;
  }, [stars]);

  // Custom shader for points to handle size attenuation and soft edges
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size; // No attenuation for stars (they are at infinity)
          // Or maybe slight attenuation? No, stars should remain points.
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          // Circular point
          vec2 coord = gl_PointCoord - vec2(0.5);
          if(length(coord) > 0.5) discard;
          
          // Soft edge
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

  if (!geometry) return null;

  return (
    <points geometry={geometry} material={material} />
  );
}
