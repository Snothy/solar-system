/**
 * Standalone WASM integration test runner.
 * Initialises a fresh FrontendSimulation from an archive's start positions,
 * steps it through every hourly timestamp in the archive, and compares the
 * simulated positions against the JPL Horizons reference trajectory.
 */

import { useState, useRef, useCallback } from "react";
import init, { FrontendSimulation } from "../../physics-wasm/pkg/physics_wasm";

import type { CelestialBodyData } from "../types";
import type { IntegratorMode } from "../components/UI/PhysicsSettings";
import type { ArchiveRecord } from "../services/snapshotStorage";
import type {
  TestRun,
  TestFrame,
  TestBodySummary,
} from "../services/testStorage";
import { celBodyToWasm } from "../physics/wasmInterface";
import { SOLAR_SYSTEM_DATA } from "../data/solarSystem";

const ALL_BODIES: CelestialBodyData[] = SOLAR_SYSTEM_DATA;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map or plain-object accessor for WASM return values */
function gv(obj: any, key: string): any {
  if (!obj) return undefined;
  if (typeof obj.get === "function") return obj.get(key);
  return obj[key];
}

function integToType(mode: IntegratorMode): number {
  if (mode === "wisdom-holman") return 1;
  if (mode === "saba4") return 2;
  if (mode === "high-precision") return 3;
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
  yorpEffect: true,
  cometForces: true,
  precession: true,
  nutation: true,
  solarMassLoss: true,
  collisions: true,
};

// ─── State types ─────────────────────────────────────────────────────────────

export type RunnerState =
  | { kind: "idle" }
  | {
      kind: "running";
      currentDay: number;
      totalDays: number;
      liveErrors: Record<string, number>;
    }
  | { kind: "done"; testRun: TestRun }
  | { kind: "error"; message: string };

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTestRunner() {
  const [state, setState] = useState<RunnerState>({ kind: "idle" });
  const cancelRef = useRef(false);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setState({ kind: "idle" });
  }, []);

  const run = useCallback(
    async (
      archive: ArchiveRecord,
      integrator: IntegratorMode,
      quality: number,
      physicsConfig?: Partial<typeof DEFAULT_CONFIG>,
    ) => {
      cancelRef.current = false;
      setState({
        kind: "running",
        currentDay: 0,
        totalDays: 0,
        liveErrors: {},
      });

      try {
        await init();
        const mergedConfig = { ...DEFAULT_CONFIG, ...physicsConfig };

        // ── Build reference timeline ───────────────────────────────────────
        const bodyNames = Object.keys(archive.bodies);
        if (bodyNames.length === 0) throw new Error("No bodies in archive");

        const firstBodyName = bodyNames[0];
        const refTimeline = archive.bodies[firstBodyName];

        if (refTimeline.length < 2) {
          throw new Error("Archive has fewer than 2 timesteps");
        }

        const totalDays =
          (refTimeline[refTimeline.length - 1].unix_ms -
            refTimeline[0].unix_ms) /
          86400000;
        setState((s) => (s.kind === "running" ? { ...s, totalDays } : s));

        // ── Prepare WASM bodies ───────────────────────────────────────────
        const frame0ByName: Record<string, any> = {};
        for (const name of bodyNames) {
          if (archive.bodies[name][0])
            frame0ByName[name] = archive.bodies[name][0];
        }

        const wasmBodies = ALL_BODIES.filter((b) => frame0ByName[b.name]).map(
          (b) => {
            const e = frame0ByName[b.name];
            return celBodyToWasm(b, e.pos, e.vel);
          },
        );

        // CRITICAL: Initialize using the archive's specific Start JD (TDB/JPL Epoch)
        const initialJd = archive.startEpoch.jd || 2451545.0;
        const sim = new FrontendSimulation(wasmBodies, initialJd);
        sim.set_config(mergedConfig);
        const intType = integToType(integrator);

        // ── Main stepping loop ─────────────────────────────────────────────
        const frames: TestFrame[] = [];
        const liveErrors: Record<string, number> = {};
        const errAcc: Record<string, number[]> = {};
        for (const n of bodyNames) errAcc[n] = [];

        let crashedAtFrame: number | undefined;
        let currentSimTimeSec = 0.0;
        const OUTER_DT_SEC = 60.0;

        for (let i = 1; i < refTimeline.length; i++) {
          if (cancelRef.current) break;

          const targetSimTimeSec =
            (refTimeline[i].unix_ms - refTimeline[0].unix_ms) / 1000;

          // Sync with Rust Logic: Step until target is reached
          while (currentSimTimeSec < targetSimTimeSec - 1e-6) {
            if (cancelRef.current) break;

            let dt = Math.min(
              OUTER_DT_SEC,
              targetSimTimeSec - currentSimTimeSec,
            );

            try {
              // Pass relative sim time to match Rust's loop behavior
              sim.step(dt, currentSimTimeSec, intType, quality);
              currentSimTimeSec += dt;
            } catch (err) {
              console.warn(`WASM crashed at hour ${i}:`, err);
              crashedAtFrame = i;
              break;
            }
          }
          if (crashedAtFrame !== undefined) break;

          // Read back positions and compare
          const simStates = sim.get_bodies();
          const currMs = refTimeline[i].unix_ms;

          const frame: TestFrame = {
            simTimeMs: currMs - archive.startEpoch.unix_ms,
            epochMs: currMs,
            bodies: {},
          };

          for (const stateRaw of simStates) {
            const name: string = gv(stateRaw, "name");
            const posObj = gv(stateRaw, "pos");
            const sx = gv(posObj, "x"),
              sy = gv(posObj, "y"),
              sz = gv(posObj, "z");

            const refEntry = archive.bodies[name]?.[i];
            if (!refEntry) continue;

            const dx = sx - refEntry.pos[0],
              dy = sy - refEntry.pos[1],
              dz = sz - refEntry.pos[2];
            const errorKm = Math.sqrt(dx * dx + dy * dy + dz * dz) / 1000;

            frame.bodies[name] = {
              simPos: [sx, sy, sz],
              refPos: refEntry.pos,
              errorKm,
            };
            liveErrors[name] = errorKm;
            errAcc[name]?.push(errorKm);
          }

          frames.push(frame);

          // Update UI every 24 steps (simulated days)
          if (i % 24 === 0 || i === refTimeline.length - 1) {
            setState((s) =>
              s.kind === "running"
                ? {
                    ...s,
                    currentDay: (currMs - refTimeline[0].unix_ms) / 86400000,
                    liveErrors: { ...liveErrors },
                  }
                : s,
            );
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        if (cancelRef.current) return;

        // ── Compute summary ─────────────────────────────────────────────────
        const bodySummaries: Record<string, TestBodySummary> = {};
        for (const name of Object.keys(errAcc)) {
          const errs = errAcc[name];
          if (!errs.length) continue;

          bodySummaries[name] = {
            meanErrorKm: errs.reduce((a, b) => a + b, 0) / errs.length,
            maxErrorKm: Math.max(...errs),
            finalErrorKm: errs[errs.length - 1],
            rmsErrorKm: Math.sqrt(
              errs.reduce((a, b) => a + b * b, 0) / errs.length,
            ),
          };
        }

        const allSummaries = Object.values(bodySummaries);
        const testRun: TestRun = {
          id: new Date().toISOString(),
          createdAt: Date.now(),
          archiveId: archive.id,
          integrator,
          quality,
          physicsConfig: mergedConfig,
          startEpoch: archive.startEpoch,
          endEpoch: archive.endEpoch,
          frames,
          summary: {
            bodies: bodySummaries,
            overallMeanErrorKm: allSummaries.length
              ? allSummaries.reduce((a, b) => a + b.meanErrorKm, 0) /
                allSummaries.length
              : 0,
            overallMaxErrorKm: allSummaries.length
              ? Math.max(...allSummaries.map((b) => b.maxErrorKm))
              : 0,
            frameCount: frames.length,
            crashed: crashedAtFrame !== undefined,
            crashedAtFrame,
          },
        };

        setState({ kind: "done", testRun });
      } catch (err: any) {
        setState({ kind: "error", message: err?.message ?? "Unknown error" });
      }
    },
    [],
  );

  return { state, run, cancel };
}
