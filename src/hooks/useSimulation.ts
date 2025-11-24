import { useState, useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { PhysicsBody, VisualBody, Particle } from '../types';
import { SOLAR_SYSTEM_DATA } from '../data/solarSystem';
import { J2000, MS_PER_DAY, START_DATE, SCALE, DEFAULT_VISUAL_SCALE, TRAIL_LENGTH } from '../utils/constants';
import { getKeplerianStateVector } from '../utils/keplerian';
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
  useMemo(() => {
    if (initialized.current) return;
    initialized.current = true;

    const daysSinceJ2000 = (START_DATE.getTime() - J2000) / MS_PER_DAY;
    const newBodies: PhysicsBody[] = [];
    const newVisualBodies: VisualBody[] = [];

    SOLAR_SYSTEM_DATA.forEach(data => {
      let pos: THREE.Vector3, vel: THREE.Vector3;

      if (data.name === "Sun") {
        pos = new THREE.Vector3(0, 0, 0);
        vel = new THREE.Vector3(0, 0, 0);
      } else if (data.parent) {
        const parent = newBodies.find(b => b.name === data.parent);
        if (parent) {
          pos = parent.pos.clone().add(new THREE.Vector3(data.rel_a!, 0, 0));
          vel = parent.vel.clone().add(new THREE.Vector3(0, 0, data.rel_v!));
        } else {
          pos = new THREE.Vector3(149.6e9, 0, 0);
          vel = new THREE.Vector3(0, 0, 0);
        }
      } else {
        const pv = getKeplerianStateVector(data.elements!, daysSinceJ2000);
        pos = pv.pos;
        vel = pv.vel;
      }

      const body: PhysicsBody = {
        name: data.name,
        mass: data.mass,
        radius: data.radius,
        pos: pos,
        vel: vel,
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
        mesh: new THREE.Mesh(), // Will be replaced by CelestialBody component
        trail: trail,
        trailIdx: 0,
        trailCount: 0,
        baseRadius: data.radius * SCALE,
        type: data.type,
        rotationSpeed: rotationSpeed
      };
      newVisualBodies.push(visualBody);
    });

    setBodies(newBodies);
    setVisualBodies(newVisualBodies);
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
            const minDistance = parentRadius + childRadius * 2.0 + 5;

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
    setTimeStep,
    setIsPaused,
    setVisualScale,
    setUseVisualScale,
    setSelectedObject,
    setFocusedObject,
    removeParticle,
    focusedObjectPrevPos,
    updatePhysics,
    updateBody
  };
}
