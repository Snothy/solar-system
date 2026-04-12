import { useState, useRef, useCallback } from "react";
import init, { FrontendSimulation } from "../../physics-wasm/pkg/physics_wasm";
import { SOLAR_SYSTEM_DATA } from "../data/solarSystem";
import type { CelestialBodyData } from "../types";
import type { IntegratorMode } from "../components/UI/PhysicsSettings";
import type { ArchiveRecord } from "../services/snapshotStorage";
import type {
  TestRun,
  TestFrame,
  TestBodySummary,
} from "../services/testStorage";
import { celBodyToWasm } from "../physics/wasmInterface";

const ALL_BODIES: CelestialBodyData[] = SOLAR_SYSTEM_DATA;
const MS_PER_DAY = 86400000;

function getIntegratorType(mode: IntegratorMode): number {
  switch (mode) {
    case "wisdom-holman":
      return 1;
    case "saba4":
      return 2;
    case "high-precision":
      return 3; // DOP853
    default:
      return 0;
  }
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
        const config = { ...DEFAULT_CONFIG, ...physicsConfig };
        const bodyNames = Object.keys(archive.bodies);
        const refTimeline = archive.bodies[bodyNames[0]];
        const startMs = refTimeline[0].unix_ms;
        const totalDays =
          (refTimeline[refTimeline.length - 1].unix_ms - startMs) / MS_PER_DAY;

        setState((s) => (s.kind === "running" ? { ...s, totalDays } : s));

        // 1. Initialize bodies from frame 0
        const wasmBodies = ALL_BODIES.filter(
          (b) => archive.bodies[b.name]?.[0],
        ).map((b) => {
          const e = archive.bodies[b.name][0];
          return celBodyToWasm(b, e.pos, e.vel);
        });

        // Use JD from archive for exact TDB alignment
        const initialJd = archive.startEpoch.jd || 2451545.0;
        const sim = new FrontendSimulation(wasmBodies, initialJd);
        sim.set_config(config);
        const intType = getIntegratorType(integrator);

        const frames: TestFrame[] = [];
        const errAcc: Record<string, number[]> = Object.fromEntries(
          bodyNames.map((n) => [n, []]),
        );

        // --- THE INTEGRATION LOOP ---
        for (let i = 1; i < refTimeline.length; i++) {
          if (cancelRef.current) break;

          // Goal: Reach the exact timestamp of the JPL reference entry
          // We calculate the delta (dt) between this frame and the previous frame
          const currentUnix = refTimeline[i].unix_ms;
          const prevUnix = refTimeline[i - 1].unix_ms;
          const dt = (currentUnix - prevUnix) / 1000;

          // The current simulation time relative to start (used for some internal force calcs)
          const simTimeSec = (currentUnix - startMs) / 1000;

          try {
            // Because you updated Rust to store 'last_hp_step_size',
            // calling this in a loop is now as accurate as a single long call.
            sim.step(dt, simTimeSec, intType, quality);
          } catch (err) {
            throw new Error(`Integrator diverged at step ${i}`);
          }

          const simStates = sim.get_bodies();
          const liveErrors: Record<string, number> = {};
          const frame: TestFrame = {
            simTimeMs: currentUnix - startMs,
            epochMs: currentUnix,
            bodies: {},
          };

          for (const s of simStates) {
            const name = s.name;
            const ref = archive.bodies[name]?.[i];
            if (!ref) continue;

            const dx = s.pos.x - ref.pos[0];
            const dy = s.pos.y - ref.pos[1];
            const dz = s.pos.z - ref.pos[2];

            const errorKm = Math.sqrt(dx * dx + dy * dy + dz * dz) / 1000;

            frame.bodies[name] = {
              simPos: [s.pos.x, s.pos.y, s.pos.z],
              refPos: ref.pos,
              errorKm,
            };
            liveErrors[name] = errorKm;
            errAcc[name].push(errorKm);
          }

          frames.push(frame);

          // Update UI every simulated day
          if (i % 24 === 0 || i === refTimeline.length - 1) {
            setState((s) =>
              s.kind === "running"
                ? {
                    ...s,
                    currentDay: (currentUnix - startMs) / MS_PER_DAY,
                    liveErrors,
                  }
                : s,
            );
            // Yield to main thread
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        // --- FINAL SUMMARY ---
        const bodySummaries: Record<string, TestBodySummary> = {};
        Object.entries(errAcc).forEach(([name, errs]) => {
          if (!errs.length) return;
          bodySummaries[name] = {
            meanErrorKm: errs.reduce((a, b) => a + b, 0) / errs.length,
            maxErrorKm: Math.max(...errs),
            finalErrorKm: errs[errs.length - 1],
            rmsErrorKm: Math.sqrt(
              errs.reduce((a, b) => a + b * b, 0) / errs.length,
            ),
          };
        });

        const summaries = Object.values(bodySummaries);
        setState({
          kind: "done",
          testRun: {
            id: new Date().toISOString(),
            createdAt: Date.now(),
            archiveId: archive.id,
            integrator,
            quality,
            physicsConfig: config,
            startEpoch: archive.startEpoch,
            endEpoch: archive.endEpoch,
            frames,
            summary: {
              bodies: bodySummaries,
              overallMeanErrorKm:
                summaries.reduce((a, b) => a + b.meanErrorKm, 0) /
                (summaries.length || 1),
              overallMaxErrorKm: Math.max(
                ...summaries.map((s) => s.maxErrorKm),
                0,
              ),
              frameCount: frames.length,
              crashed: false,
            },
          },
        });
      } catch (err: any) {
        setState({ kind: "error", message: err?.message || "Unknown Error" });
      }
    },
    [],
  );

  return { state, run, cancel };
}
