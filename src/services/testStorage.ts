/**
 * IndexedDB storage for integration test runs.
 */

import type { SnapshotEpoch } from './jplFetchService';
import type { IntegratorMode } from '../components/UI/PhysicsSettings';

export interface TestFrameBody {
  simPos: [number, number, number]; // WASM Z-up / JPL ecliptic, meters
  refPos: [number, number, number]; // JPL reference, same frame
  errorKm: number;
}

export interface TestFrame {
  simTimeMs: number;   // offset from test start in ms
  epochMs: number;     // absolute unix ms
  bodies: Record<string, TestFrameBody>;
}

export interface TestBodySummary {
  meanErrorKm: number;
  maxErrorKm: number;
  finalErrorKm: number;
  rmsErrorKm: number;
}

export interface TestPhysicsConfig {
  relativity: boolean;
  gravitationalHarmonics: boolean;
  tidalForces: boolean;
  solarRadiationPressure: boolean;
  yarkovskyEffect: boolean;
  atmosphericDrag: boolean;
}

export interface TestRun {
  id: string;
  createdAt: number;
  archiveId: string;
  integrator: IntegratorMode;
  quality: number;
  physicsConfig?: TestPhysicsConfig;
  startEpoch: SnapshotEpoch;
  endEpoch: SnapshotEpoch;
  frames: TestFrame[];
  summary: {
    bodies: Record<string, TestBodySummary>;
    overallMeanErrorKm: number;
    overallMaxErrorKm: number;
    frameCount: number;
    crashed: boolean;
    crashedAtFrame?: number;
  };
}

const DB_NAME = 'integration-tests';
const DB_VERSION = 1;
const STORE = 'test-runs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTestRun(run: TestRun): Promise<TestRun> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(run);
    req.onsuccess = () => resolve(run);
    req.onerror = () => reject(req.error);
  });
}

export async function listTestRuns(): Promise<Omit<TestRun, 'frames'>[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const all: TestRun[] = req.result;
      // Return without frames for listing (frames are large)
      resolve(all.map(({ frames: _f, ...rest }) => rest).sort((a, b) => b.createdAt - a.createdAt));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function loadTestRun(id: string): Promise<TestRun | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteTestRun(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
