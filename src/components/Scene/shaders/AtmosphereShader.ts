import * as THREE from 'three';

export const AtmosphereShader = {
  uniforms: {
    uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
    uColor: { value: new THREE.Color(0x00aaff) },
    uDensity: { value: 1.0 },
    uRadius: { value: 1.0 }
  },
  vertexShader: `
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
      // World Space Normal
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      
      // World Space Position
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uSunPosition;
    uniform vec3 uColor;
    uniform float uDensity;
    
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
      // Light direction from fragment to Sun
      vec3 lightDir = normalize(uSunPosition - vWorldPosition);
      
      // View direction from camera to fragment
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      
      vec3 normal = normalize(vWorldNormal);
      
      // Day/Night term (N dot L)
      float NdotL = dot(normal, lightDir);
      
      // Rim effect (Fresnel)
      // 1.0 - dot(N, V). We use abs coordinates but viewDir is usually V (To Camera) in standard PBR.
      // Here viewDir is Camera - Fragment.
      // dot(N, V).
      float viewDot = dot(normal, viewDir);
      float rim = pow(1.0 - max(0.0, viewDot), 3.0);
      
      // Color mixing
      vec3 dayColor = uColor;
      vec3 sunsetColor = vec3(1.0, 0.5, 0.0);
      // Night scattering (very faint blue)
      vec3 nightColor = vec3(0.0, 0.0, 0.1); 
      
      // Mix day/sunset
      // Sunset happens when NdotL is near 0
      vec3 color = mix(sunsetColor, dayColor, smoothstep(-0.2, 0.4, NdotL));
      
      // Mix into night
      color = mix(nightColor, color, smoothstep(-0.4, 0.0, NdotL));
      
      // Alpha/Intensity logic
      // Atmosphere is brightest at rim
      // And also depends on density
      // And we want it to fade out on the dark side, but not completely (airglow)
      
      float intensity = rim * uDensity * 0.8;
      
      // Boost bright side
      intensity += max(0.0, NdotL) * 0.1;
      
      // Additive mixing for atmosphere
      gl_FragColor = vec4(color, intensity);
    }
  `
};
