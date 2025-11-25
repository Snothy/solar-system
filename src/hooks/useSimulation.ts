import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { PhysicsBody, VisualBody, Particle, CelestialBodyData } from '../types';
import { SOLAR_SYSTEM_DATA } from '../data/solarSystem';
import { START_DATE, SCALE, DEFAULT_VISUAL_SCALE, TRAIL_LENGTH } from '../utils/constants';
import { velocityVerletStep, checkCollisions } from '../utils/physics';

export function useSimulation() {
  const [bodies, setBodies] = useState<PhysicsBody[]>([]);
  const [visualBodies, setVisualBodies] = useState<VisualBody[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [simTime, setSimTime] = useState(START_DATE.getTime());
  const [timeStep, setTimeStep] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [visualScale, setVisualScale] = useState(DEFAULT_VISUAL_SCALE);
  const [useVisualScale, setUseVisualScale] = useState(true);
  const [selectedObject, setSelectedObject] = useState<PhysicsBody | null>(null);
  const [focusedObject, setFocusedObject] = useState<PhysicsBody | null>(null);

  const focusedObjectPrevPos = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  // Initialize bodies
  const [isLoading, setIsLoading] = useState(true);

  // Initialize bodies
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initSimulation = async () => {
      const newBodies: PhysicsBody[] = [];
      const newVisualBodies: VisualBody[] = [];

      type PhysicsBodyProperties = {
        pos: THREE.Vector3;
        vel: THREE.Vector3;
        mass: number;
        radius: number;
        rotationPeriod: number;
        meanTemperature: number;
        axialTilt: number;
        surfaceGravity: number;
      };

      // Fetch real data for all bodies sequentially to avoid rate limiting
      try {
        const realData: (CelestialBodyData & PhysicsBodyProperties)[] = [];
        
        // Add Sun first (no fetch needed)
        const sunData = SOLAR_SYSTEM_DATA.find(d => d.name === "Sun");
        if (sunData) {
          realData.push({
            ...sunData,
            pos: new THREE.Vector3(),
            vel: new THREE.Vector3(),
            mass: 1.989e30, // Fallback/Default for Sun if we don't fetch it (though we could)
            radius: 696340e3,
            rotationPeriod: 609.12,
            meanTemperature: 5778,
            axialTilt: 7.25,
            surfaceGravity: 274
          });
        }

        // Fetch others with concurrency limit
        const CONCURRENCY_LIMIT = 3;
        const bodiesToFetch = SOLAR_SYSTEM_DATA.filter(d => d.name !== "Sun" && d.jplId);
        
        // Helper to process a single body
        const fetchBody = async (data: typeof SOLAR_SYSTEM_DATA[0]) => {
          try {
            const { fetchBodyData } = await import('../services/jplHorizons');
            const jplData = await fetchBodyData(data.jplId!);
            
            return { 
              ...data, 
              pos: jplData.pos, 
              vel: jplData.vel,
              mass: jplData.mass || data.mass || 0,
              radius: jplData.radius || data.radius || 1000,
              rotationPeriod: jplData.rotationPeriod || data.rotationPeriod || 0,
              meanTemperature: jplData.meanTemperature || data.meanTemperature || 0,
              axialTilt: jplData.axialTilt || data.axialTilt || 0,
              surfaceGravity: jplData.surfaceGravity || data.surfaceGravity || 0
            };
          } catch (e) {
            console.warn(`Failed to fetch JPL data for ${data.name}, using fallback`, e);
            const { FALLBACK_DATA } = await import('../data/fallbackData');
            const fallback = FALLBACK_DATA[data.name];
            
            if (fallback) {
              return {
                ...data,
                pos: fallback.pos,
                vel: fallback.vel,
                mass: data.mass || 0,
                radius: data.radius || 1000,
                rotationPeriod: data.rotationPeriod || 0,
                meanTemperature: data.meanTemperature || 0,
                axialTilt: data.axialTilt || 0,
                surfaceGravity: data.surfaceGravity || 0
              };
            }
            return null;
          }
        };

        // Process in chunks/batches or use a queue
        // Simple batching approach
        for (let i = 0; i < bodiesToFetch.length; i += CONCURRENCY_LIMIT) {
          const batch = bodiesToFetch.slice(i, i + CONCURRENCY_LIMIT);
          const results = await Promise.all(batch.map(fetchBody));
          
          results.forEach(res => {
            if (res) realData.push(res);
          });
          
          // Small delay between batches
          if (i + CONCURRENCY_LIMIT < bodiesToFetch.length) {
             await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        if (realData.length === 0) {
          console.error("No data fetched from JPL. Simulation cannot start.");
          setIsLoading(false);
          return; 
        }

        // Debug: Check Earth and Moon relative positions
        const earth = realData.find(d => d.name === "Earth");
        const moon = realData.find(d => d.name === "Moon");
        if (earth && moon) {
          const dist = moon.pos.distanceTo(earth.pos);
          const velRel = moon.vel.clone().sub(earth.vel).length();
          console.log(`[JPL Check] Earth-Moon Distance: ${(dist/1000).toFixed(1)} km (Expected ~384,400)`);
          console.log(`[JPL Check] Moon Relative Velocity: ${velRel.toFixed(1)} m/s (Expected ~1022)`);
          console.log(`[JPL Check] Earth Properties: Tilt=${earth.axialTilt?.toFixed(2)}°, Temp=${earth.meanTemperature}K, Gravity=${earth.surfaceGravity?.toFixed(2)}m/s²`);
        }
        
        // Build bodies
        realData.forEach(data => {
          const body: PhysicsBody = {
            name: data.name,
            mass: data.mass!,
            radius: data.radius!,
            pos: data.pos,
            vel: data.vel,
            force: new THREE.Vector3(),
            parentName: data.parent
          };
          newBodies.push(body);

          // Create visual representation
          const trailGeo = new THREE.BufferGeometry();
          const trailPositions = new Float32Array(TRAIL_LENGTH * 3);
          trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
          const trailMat = new THREE.LineBasicMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending
          });
          const trail = new THREE.Line(trailGeo, trailMat);

          // Calculate rotation speed
          let rotationSpeed = 0;
          if (data.rotationPeriod) {
            const periodSeconds = data.rotationPeriod * 3600;
            rotationSpeed = (2 * Math.PI) / periodSeconds;
          }

          const visualBody: VisualBody = {
            body: body,
            mesh: new THREE.Mesh(),
            trail: trail,
            trailIdx: 0,
            trailCount: 0,
            baseRadius: data.radius! * SCALE,
            type: data.type,
            rotationSpeed: rotationSpeed
          };
          newVisualBodies.push(visualBody);
        });

        setBodies(newBodies);
        setVisualBodies(newVisualBodies);
        setIsLoading(false);

      } catch (error) {
        console.error("Error initializing simulation:", error);
        setIsLoading(false);
      }
    };

    initSimulation();
  }, []);

  const removeParticle = (index: number) => {
    setParticles(prev => prev.filter((_, i) => i !== index));
  };

  // Physics update function to be called from Scene component
  const updatePhysics = () => {
    if (focusedObject) {
      focusedObjectPrevPos.current.copy(focusedObject.pos).multiplyScalar(SCALE);
    }

    const dt = (!isPaused && timeStep > 0) ? (timeStep / 60) : 0;

    if (dt > 0) {
      // Update physics
      velocityVerletStep(bodies, dt);
      setSimTime(prev => prev + dt * 1000);

      // Check collisions
      const collisionPositions = checkCollisions(bodies);
      if (collisionPositions.length > 0) {
        const newParticles: Particle[] = collisionPositions.map(pos => {
          const geo = new THREE.BufferGeometry();
          const positions = new Float32Array(30 * 3);
          for (let i = 0; i < 30; i++) {
            positions[i * 3] = pos.x * SCALE;
            positions[i * 3 + 1] = pos.y * SCALE;
            positions[i * 3 + 2] = pos.z * SCALE;
          }
          geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          const mat = new THREE.PointsMaterial({ color: 0xffaa00, size: 2 });
          const pts = new THREE.Points(geo, mat);
          
          const vels: number[] = [];
          for (let i = 0; i < 30; i++) {
            vels.push((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5));
          }
          
          return { mesh: pts, vels, life: 1.0 };
        });
        setParticles(prev => [...prev, ...newParticles]);
      }

      // Update visual bodies
      visualBodies.forEach(vb => {
        // Update position
        let visualPos = new THREE.Vector3(
          vb.body.pos.x * SCALE,
          vb.body.pos.y * SCALE,
          vb.body.pos.z * SCALE
        );

        // Moon visibility fix
        if (useVisualScale && vb.body.parentName) {
          const parentVb = visualBodies.find(p => p.body.name === vb.body.parentName);
          if (parentVb) {
            const parentPos = new THREE.Vector3(
              parentVb.body.pos.x * SCALE,
              parentVb.body.pos.y * SCALE,
              parentVb.body.pos.z * SCALE
            );
            const parentRadius = parentVb.baseRadius * visualScale;
            const childRadius = vb.baseRadius * visualScale;

            const dir = new THREE.Vector3().subVectors(visualPos, parentPos);
            const dist = dir.length();
            // Use 1.2x parent radius to ensure moon is clearly above surface/atmosphere
            const minDistance = parentRadius * 1.2 + childRadius;

            if (dist < minDistance) {
              dir.normalize();
              visualPos.copy(parentPos).add(dir.multiplyScalar(minDistance));
            }
          }
        }

        vb.mesh.position.copy(visualPos);

        // Update rotation
        if (vb.rotationSpeed !== 0) {
          vb.mesh.rotation.y += vb.rotationSpeed * dt;
        }

        // Update trail
        const positions = vb.trail.geometry.attributes.position.array as Float32Array;
        
        // If trail is full, shift everything back by one position
        if (vb.trailCount >= TRAIL_LENGTH) {
          // Shift existing points: copy from index 3 to 0, length is (TRAIL_LENGTH-1)*3
          positions.copyWithin(0, 3, TRAIL_LENGTH * 3);
          
          // Add new point at the end
          const lastIdx = (TRAIL_LENGTH - 1) * 3;
          positions[lastIdx] = vb.mesh.position.x;
          positions[lastIdx + 1] = vb.mesh.position.y;
          positions[lastIdx + 2] = vb.mesh.position.z;
        } else {
          // Append new point
          const idx = vb.trailCount * 3;
          positions[idx] = vb.mesh.position.x;
          positions[idx + 1] = vb.mesh.position.y;
          positions[idx + 2] = vb.mesh.position.z;
          vb.trailCount++;
        }

        vb.trail.geometry.setDrawRange(0, vb.trailCount);
        vb.trail.geometry.attributes.position.needsUpdate = true;
      });
    }
  };

  // Update body properties
  const updateBody = (name: string, updates: Partial<PhysicsBody>) => {
    setBodies(prevBodies => 
      prevBodies.map(b => {
        if (b.name === name) {
          return { ...b, ...updates };
        }
        return b;
      })
    );

    // Also update visual bodies if necessary (e.g. radius change)
    if (updates.radius !== undefined) {
      setVisualBodies(prevVisualBodies => 
        prevVisualBodies.map(vb => {
          if (vb.body.name === name) {
            return {
              ...vb,
              baseRadius: updates.radius! * SCALE,
              body: { ...vb.body, ...updates } // Keep reference in sync
            };
          }
          return vb;
        })
      );
    }
  };

  const [orbitVisibility, setOrbitVisibility] = useState<Record<string, boolean>>({});

  const toggleOrbitVisibility = (name: string, includeChildren: boolean = false) => {
    setOrbitVisibility(prev => {
      const next = { ...prev };
      // If undefined, it means visible (default true). So toggle means set to false.
      // If defined as true, set to false. If false, set to true.
      // Actually, let's treat undefined as true.
      const current = prev[name] !== false;
      next[name] = !current;

      if (includeChildren) {
        const children = SOLAR_SYSTEM_DATA.filter(d => d.parent === name);
        children.forEach(child => {
          next[child.name] = !current; // Set to same state as parent
        });
      }
      return next;
    });
  };

  const setAllOrbitVisibility = (visible: boolean) => {
    const next: Record<string, boolean> = {};
    SOLAR_SYSTEM_DATA.forEach(d => {
      next[d.name] = visible;
    });
    setOrbitVisibility(next);
  };

  return {
    bodies,
    visualBodies,
    particles,
    simTime,
    timeStep,
    isPaused,
    visualScale,
    useVisualScale,
    selectedObject,
    focusedObject,
    focusedObjectPrevPos,
    orbitVisibility,
    setTimeStep,
    setIsPaused,
    setVisualScale,
    setUseVisualScale,
    setSelectedObject,
    setFocusedObject,
    removeParticle,
    updatePhysics,
    updateBody,
    toggleOrbitVisibility,
    setAllOrbitVisibility,
    isLoading
  };
}
