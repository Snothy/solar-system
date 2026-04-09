/**
 * Standalone WASM integration test runner.
 * Initialises a fresh FrontendSimulation from an archive's start positions,
 * steps it through every hourly timestamp in the archive, and compares the
 * simulated positions against the JPL Horizons reference trajectory.
 */

import { useState, useRef, useCallback } from 'react';
import init, { FrontendSimulation } from '../../physics-wasm/pkg/physics_wasm';
import { SOLAR_SYSTEM_DATA } from '../data/solarSystem';
import type { CelestialBodyData } from '../types';
import type { IntegratorMode } from '../components/UI/PhysicsSettings';
import type { ArchiveRecord } from '../services/snapshotStorage';
import type { TestRun, TestFrame, TestBodySummary } from '../services/testStorage';
import * as THREE from 'three';

const ALL_BODIES: CelestialBodyData[] = SOLAR_SYSTEM_DATA; // already includes EXTENDED_BODIES via spread

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map or plain-object accessor for WASM return values */
function gv(obj: any, key: string): any {
  if (!obj) return undefined;
  if (typeof obj.get === 'function') return obj.get(key);
  return obj[key];
}

function computePoleVec(ra?: number, dec?: number): { x: number; y: number; z: number } {
  if (ra == null || dec == null) return { x: 0, y: 1, z: 0 };
  const raR = THREE.MathUtils.degToRad(ra);
  const decR = THREE.MathUtils.degToRad(dec);
  const xe = Math.cos(decR) * Math.cos(raR);
  const ye = Math.cos(decR) * Math.sin(raR);
  const ze = Math.sin(decR);
  const eps = THREE.MathUtils.degToRad(23.43928);
  const c = Math.cos(eps), s = Math.sin(eps);
  // equatorial → ecliptic, then normalise in ecliptic Z-up space
  return { x: xe, y: ye * c + ze * s, z: -ye * s + ze * c };
}

function integToType(mode: IntegratorMode): number {
  if (mode === 'wisdom-holman') return 1;
  if (mode === 'saba4')         return 2;
  if (mode === 'high-precision') return 3;
  return 0; // adaptive / standard
}

export const DEFAULT_CONFIG = {
  relativity: true,
  gravitationalHarmonics: true,
  tidalForces: true,
  solarRadiationPressure: true,
  yarkovskyEffect: true,
  atmosphericDrag: true,
  useEih: true,
  poyntingRobertsonDrag: true,
  yorpEffect: false,
  cometForces: true,
  precession: true,
  nutation: true,
  solarMassLoss: false,
  collisions: false,
};

// ─── State types ─────────────────────────────────────────────────────────────

export type RunnerState =
  | { kind: 'idle' }
  | { kind: 'running'; currentDay: number; totalDays: number; liveErrors: Record<string, number> }
  | { kind: 'done'; testRun: TestRun }
  | { kind: 'error'; message: string };

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTestRunner() {
  const [state, setState] = useState<RunnerState>({ kind: 'idle' });
  const cancelRef = useRef(false);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setState({ kind: 'idle' });
  }, []);

  const run = useCallback(async (
    archive: ArchiveRecord,
    integrator: IntegratorMode,
    quality: number,
    physicsConfig?: Partial<typeof DEFAULT_CONFIG>,
  ) => {
    cancelRef.current = false;
    setState({ kind: 'running', currentDay: 0, totalDays: 0, liveErrors: {} });

    try {
      await init();
      const mergedConfig = { ...DEFAULT_CONFIG, ...physicsConfig };

      // ── Build reference timeline ───────────────────────────────────────
      // All bodies should have the same number of entries; use the longest.
      const bodyNames = Object.keys(archive.bodies);
      const timelines = bodyNames.map(n => archive.bodies[n]);
      const refTimeline = timelines.reduce(
        (best, t) => (t.length > best.length ? t : best),
        timelines[0] ?? []
      );

      if (refTimeline.length < 2) {
        throw new Error('Archive has fewer than 2 timesteps — cannot run test');
      }

      const totalDays = (refTimeline[refTimeline.length - 1].unix_ms - refTimeline[0].unix_ms)
        / 86400000;
      setState(s => s.kind === 'running' ? { ...s, totalDays } : s);

      // ── Prepare WASM bodies from archive frame 0 + metadata ───────────
      const frame0ByName: Record<string, { pos: [number,number,number]; vel: [number,number,number] }> = {};
      for (const name of bodyNames) {
        if (archive.bodies[name][0]) frame0ByName[name] = archive.bodies[name][0];
      }

      const wasmBodies = ALL_BODIES
        .filter(b => frame0ByName[b.name])
        .map(b => {
          const e = frame0ByName[b.name];
          // Archive pos is JPL Z-up [X,Y,Z] — pass directly to WASM (same frame)
          return {
            name: b.name,
            mass: b.mass ?? 1e10,
            radius: b.radius ?? 1e6,
            pos: { x: e.pos[0], y: e.pos[1], z: e.pos[2] },
            vel: { x: e.vel[0], y: e.vel[1], z: e.vel[2] },
            J: (b as any).J ?? null,
            c22: (b as any).C22 ?? null,
            s22: (b as any).S22 ?? null,
            pole_vector: computePoleVec((b as any).poleRA, (b as any).poleDec),
            k2: (b as any).tidal?.k2 ?? null,
            tidal_q: (b as any).tidal?.tidalQ ?? null,
            angular_velocity: null,
            moment_of_inertia: null,
            has_atmosphere: (b as any).hasAtmosphere ?? false,
            surface_pressure: (b as any).surfacePressure ?? null,
            scale_height: (b as any).scaleHeight ?? null,
            mean_temperature: (b as any).meanTemperature ?? null,
            drag_coefficient: (b as any).dragCoefficient ?? null,
            albedo: (b as any).albedo ?? null,
            thermal_inertia: (b as any).thermalInertia ?? null,
            pole_ra0: (b as any).poleRA ?? null,
            pole_dec0: (b as any).poleDec ?? null,
            precession_rate: (b as any).precessionRate ?? null,
            nutation_amplitude: (b as any).nutationAmplitude ?? null,
            libration: null,
          };
        });

      const sim = new FrontendSimulation(wasmBodies, archive.startEpoch.unix_ms);
      sim.set_config(mergedConfig);
      const intType = integToType(integrator);

      // ── Main stepping loop ─────────────────────────────────────────────
      const frames: TestFrame[] = [];
      const liveErrors: Record<string, number> = {};
      let crashedAtFrame: number | undefined;

      // Per-body error accumulators for summary
      const errAcc: Record<string, number[]> = {};
      for (const n of bodyNames) errAcc[n] = [];

      // Step size matches the Rust integration test: 60s outer dt.
      // Each archive interval (typically 1 hour = 3600s) is walked in 60s
      // increments so that hierarchy updates, torques, and JD advances all
      // run at 60s granularity.  Positions are compared to JPL reference only
      // at the hour boundary (end of each archive interval).
      const OUTER_DT_SEC = 60;

      for (let i = 1; i < refTimeline.length; i++) {
        if (cancelRef.current) break;

        const prevMs = refTimeline[i - 1].unix_ms;
        const currMs = refTimeline[i].unix_ms;
        const intervalSec = (currMs - prevMs) / 1000;

        // Walk the interval in OUTER_DT_SEC substeps
        let elapsed = 0;
        let stepped = false;
        while (elapsed < intervalSec - 1e-6) {
          if (cancelRef.current) break;
          const dt = Math.min(OUTER_DT_SEC, intervalSec - elapsed);
          const stepJd = (prevMs / 1000 + elapsed + dt) / 86400 + 2440587.5;
          try {
            sim.step(dt, stepJd, intType, quality);
          } catch (err) {
            console.warn(`WASM step crashed at frame ${i} (elapsed ${elapsed}s):`, err);
            crashedAtFrame = i;
            stepped = true; // sentinel to break outer loop
            break;
          }
          elapsed += dt;
          stepped = true;
        }
        if (crashedAtFrame !== undefined) break;

        // Read back positions
        const simStates = sim.get_bodies();
        const frame: TestFrame = {
          simTimeMs: currMs - archive.startEpoch.unix_ms,
          epochMs: currMs,
          bodies: {},
        };

        for (const stateRaw of simStates) {
          const name: string = gv(stateRaw, 'name');
          const posObj = gv(stateRaw, 'pos');
          const sx = gv(posObj, 'x') as number;
          const sy = gv(posObj, 'y') as number;
          const sz = gv(posObj, 'z') as number;

          const refEntry = archive.bodies[name]?.[i];
          if (!refEntry) continue;

          const simPos: [number, number, number] = [sx, sy, sz];
          const refPos = refEntry.pos;
          const dx = sx - refPos[0], dy = sy - refPos[1], dz = sz - refPos[2];
          const errorKm = Math.sqrt(dx * dx + dy * dy + dz * dz) / 1000;

          frame.bodies[name] = { simPos, refPos, errorKm };
          liveErrors[name] = errorKm;
          errAcc[name]?.push(errorKm);
        }

        frames.push(frame);

        // Yield to UI every 50 frames + report progress
        if (i % 50 === 0 || i === refTimeline.length - 1) {
          const currentDay = (currMs - archive.startEpoch.unix_ms) / 86400000;
          setState({ kind: 'running', currentDay, totalDays, liveErrors: { ...liveErrors } });
          await new Promise(r => setTimeout(r, 0));
        }
      }

      if (cancelRef.current) return;

      // ── Compute summary ─────────────────────────────────────────────────
      const bodySummaries: Record<string, TestBodySummary> = {};
      for (const name of Object.keys(errAcc)) {
        const errs = errAcc[name];
        if (!errs.length) continue;
        const mean = errs.reduce((a, b) => a + b, 0) / errs.length;
        const max = Math.max(...errs);
        const final = errs[errs.length - 1];
        const rms = Math.sqrt(errs.reduce((a, b) => a + b * b, 0) / errs.length);
        bodySummaries[name] = { meanErrorKm: mean, maxErrorKm: max, finalErrorKm: final, rmsErrorKm: rms };
      }

      const allErrors = Object.values(bodySummaries);
      const overallMean = allErrors.length
        ? allErrors.reduce((a, b) => a + b.meanErrorKm, 0) / allErrors.length
        : 0;
      const overallMax = allErrors.length ? Math.max(...allErrors.map(b => b.maxErrorKm)) : 0;

      const testRun: TestRun = {
        id: new Date().toISOString(),
        createdAt: Date.now(),
        archiveId: archive.id,
        integrator,
        quality,
        physicsConfig: physicsConfig ? {
          relativity: mergedConfig.relativity,
          gravitationalHarmonics: mergedConfig.gravitationalHarmonics,
          tidalForces: mergedConfig.tidalForces,
          solarRadiationPressure: mergedConfig.solarRadiationPressure,
          yarkovskyEffect: mergedConfig.yarkovskyEffect,
          atmosphericDrag: mergedConfig.atmosphericDrag,
        } : undefined,
        startEpoch: archive.startEpoch,
        endEpoch: archive.endEpoch,
        frames,
        summary: {
          bodies: bodySummaries,
          overallMeanErrorKm: overallMean,
          overallMaxErrorKm: overallMax,
          frameCount: frames.length,
          crashed: crashedAtFrame !== undefined,
          crashedAtFrame,
        },
      };

      setState({ kind: 'done', testRun });
    } catch (err: any) {
      setState({ kind: 'error', message: err?.message ?? 'Unknown error' });
    }
  }, []);

  return { state, run, cancel };
}
