import * as THREE from 'three';

export const AtmosphereShader = {
  uniforms: {
    uSunPosition: { value: new THREE.Vector3(0, 0, 0) }, // Light source position
    uViewVector: { value: new THREE.Vector3(0, 0, 0) },  // Camera position relative to center
    uColor: { value: new THREE.Color(0x00aaff) },
    uDensity: { value: 1.0 },
    uRadius: { value: 1.0 }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uSunPosition;
    uniform vec3 uColor;
    uniform float uDensity;
    
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      // Light direction (Sun is at uSunPosition)
      // Since we are in local space or world space? 
      // uSunPosition should be in World Space. vWorldPosition is World Space.
      vec3 lightDir = normalize(uSunPosition - vWorldPosition);
      
      // View direction (Camera is at 0,0,0 in View Space, but we have world pos)
      // Actually, standard rim light uses view direction in Camera space.
      // Let's use simple dot products for now.
      
      vec3 normal = normalize(vNormal);
      
      // Day/Night term (N dot L)
      float NdotL = dot(normal, lightDir);
      float dayNight = smoothstep(-0.2, 0.2, NdotL); // Soft terminator
      
      // Rim/Atmosphere effect (Fresnel)
      // We need view direction in World Space.
      // But vNormal is in View Space (normalMatrix * normal).
      // So let's use View Space for Fresnel.
      // In View Space, view direction is always (0,0,1) looking at the pixel?
      // No, view direction is vector from fragment to camera (0,0,0).
      // In View Space, fragment position is vViewPosition.
      // Let's stick to the previous simple rim light but modulated by Day/Night.
      
      // Re-calculate normal in View Space for Fresnel
      // (Already done in vertex shader as vNormal)
      
      float viewDot = dot(normal, vec3(0.0, 0.0, 1.0));
      float rim = pow(0.6 - viewDot, 4.0);
      
      // Scattering Color Simulation
      // Sunset (red) when NdotL is near 0
      // Blue when NdotL is 1
      
      vec3 dayColor = uColor;
      vec3 sunsetColor = vec3(1.0, 0.4, 0.1); // Orange/Red
      vec3 nightColor = vec3(0.0, 0.0, 0.05); // Very dark blue
      
      // Mix based on sun angle
      vec3 atmosphereColor = mix(sunsetColor, dayColor, smoothstep(-0.1, 0.5, NdotL));
      atmosphereColor = mix(nightColor, atmosphereColor, smoothstep(-0.4, 0.0, NdotL));
      
      // Apply density and rim
      float alpha = rim * uDensity * (dayNight * 0.8 + 0.2); // Keep slight glow at night
      
      gl_FragColor = vec4(atmosphereColor, alpha);
    }
  `
};
