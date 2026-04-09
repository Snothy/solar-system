/**
 * Browser-side JPL Horizons fetch service.
 * Fetches vector ephemeris data (position + velocity) for all solar system bodies.
 * Routes through the Vite proxy at /api/horizons → ssd.jpl.nasa.gov
 */

import { SOLAR_SYSTEM_DATA } from '../data/solarSystem';

export interface SnapshotEpoch {
  date: string;   // e.g. "A.D. 2026-Apr-07 00:00:00.0000 TDB"
  jd: number;
  unix_ms: number;
}

export interface BodySnapshot {
  pos: [number, number, number]; // meters, heliocentric ecliptic J2000
  vel: [number, number, number]; // m/s
}

export interface BodyArchiveEntry {
  date: string;
  jd: number;
  unix_ms: number;
  pos: [number, number, number];
  vel: [number, number, number];
}

export interface SnapshotData {
  epoch: SnapshotEpoch;
  bodies: Record<string, BodySnapshot>;
}

export interface ArchiveData {
  startEpoch: SnapshotEpoch;
  endEpoch: SnapshotEpoch;
  stepHours: number;
  bodies: Record<string, BodyArchiveEntry[]>;
}

export type FetchStatus = 'pending' | 'loading' | 'done' | 'error';

const ALL_BODIES = SOLAR_SYSTEM_DATA; // already includes EXTENDED_BODIES via spread

// --- Date parsing ---

const MONTH_MAP: Record<string, number> = {
  Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6,
  Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12
};

function parseJplDate(dateStr: string): number | null {
  const cleaned = dateStr.trim().replace(/^A\.D\.\s*/, '').replace(/\s*TDB$/, '');
  const spaceIdx = cleaned.indexOf(' ');
  if (spaceIdx === -1) return null;
  const datePart = cleaned.substring(0, spaceIdx);
  const timePart = cleaned.substring(spaceIdx + 1);
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const month = MONTH_MAP[monthStr];
  if (!month) return null;
  const [hStr, mStr, sStr] = timePart.split(':');
  let y = parseInt(yearStr), mo = month;
  if (mo <= 2) { y -= 1; mo += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const h = parseInt(hStr), mi = parseInt(mStr), s = parseFloat(sStr);
  const dayFrac = (h + mi / 60 + s / 3600) / 24;
  return Math.floor(365.25 * (y + 4716))
       + Math.floor(30.6001 * (mo + 1))
       + parseInt(dayStr) + dayFrac + b - 1524.5;
}

export function jdToUnixMs(jd: number): number {
  return (jd - 2440587.5) * 86400000;
}

// --- Vector table parser ---

export function parseVectorTable(text: string): Array<{ date: string; pos: [number,number,number]; vel: [number,number,number] }> {
  const soe = text.indexOf('$$SOE');
  const eoe = text.indexOf('$$EOE');
  if (soe === -1 || eoe === -1) return [];

  const block = text.substring(soe, eoe);
  const lines = block.split('\n');
  const results: Array<{ date: string; pos: [number,number,number]; vel: [number,number,number] }> = [];
  let currentDate = '';

  const numRe = /([+-]?\d+(?:\.\d+)?(?:E[+-]?\d+)?)/;
  const getVal = (key: string, src: string) => {
    const m = src.match(new RegExp(`${key}\\s*=\\s*${numRe.source}`, 'i'));
    return m ? parseFloat(m[1]) : NaN;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.includes('TDB')) {
      currentDate = line.split('=')[1]?.trim() || line;
      continue;
    }
    if (line.startsWith('X =')) {
      let combined = line;
      if (lines[i + 1]?.includes('VX')) { combined += ' ' + lines[i + 1]; i++; }
      const x = getVal('X', combined), y = getVal('Y', combined), z = getVal('Z', combined);
      const vx = getVal('VX', combined), vy = getVal('VY', combined), vz = getVal('VZ', combined);
      if (![x, y, z, vx, vy, vz].some(isNaN)) {
        results.push({
          date: currentDate,
          pos: [x * 1000, y * 1000, z * 1000],
          vel: [vx * 1000, vy * 1000, vz * 1000],
        });
      }
    }
  }
  return results;
}

// --- Single-body fetch with retry ---

async function fetchBodyVector(
  jplId: string,
  startDate: string,
  stopDate: string,
  stepSize: string,
  retries = 3,
): Promise<Array<{ date: string; pos: [number,number,number]; vel: [number,number,number] }>> {
  const params = new URLSearchParams({
    format: 'text',
    COMMAND: `'${jplId}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: "'@ssb'",
    START_TIME: `'${startDate}'`,
    STOP_TIME: `'${stopDate}'`,
    STEP_SIZE: `'${stepSize}'`,
    OUT_UNITS: "'KM-S'",
    REF_PLANE: "'ECLIPTIC'",
    CSV_FORMAT: "'NO'",
  });

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
    try {
      const res = await fetch(`/api/horizons?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      // Check for API-level errors in the response text
      if (text.includes('ERROR') && !text.includes('$$SOE')) {
        const errLine = text.split('\n').find(l => l.includes('ERROR')) ?? 'API error';
        throw new Error(errLine.trim());
      }
      const entries = parseVectorTable(text);
      if (entries.length === 0) throw new Error('No data in response');
      return entries;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr!;
}

// --- Concurrency-limited runner ---

async function runWithConcurrency(
  tasks: Array<() => Promise<void>>,
  limit: number,
): Promise<void> {
  const executing = new Set<Promise<void>>();
  for (const task of tasks) {
    const p: Promise<void> = task().finally(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
}

// --- Snapshot pull (single data point per body) ---

export async function pullJPLSnapshot(
  onProgress: (bodyName: string, status: FetchStatus) => void,
  epochDate?: string,
  concurrency = 3,
): Promise<SnapshotData> {
  const startDate = epochDate ?? new Date().toISOString().split('T')[0];
  const stopMs = new Date(startDate).getTime() + 2 * 24 * 60 * 60 * 1000;
  const stopDate = new Date(stopMs).toISOString().split('T')[0];

  const bodies: Record<string, BodySnapshot> = {};
  const failedBodies: string[] = [];
  let epochEntry: { date: string; jd: number } | null = null;

  const fetchableBodies = ALL_BODIES.filter(b => b.jplId);

  for (const body of fetchableBodies) onProgress(body.name, 'pending');

  const tasks = fetchableBodies.map(body => async () => {
    onProgress(body.name, 'loading');
    try {
      const entries = await fetchBodyVector(body.jplId!, startDate, stopDate, '1d');
      const first = entries[0];
      bodies[body.name] = { pos: first.pos, vel: first.vel };
      if (!epochEntry) {
        const jd = parseJplDate(first.date);
        if (jd !== null) epochEntry = { date: first.date, jd };
      }
      onProgress(body.name, 'done');
    } catch (err) {
      console.warn(`Failed to fetch JPL data for ${body.name}:`, err);
      failedBodies.push(body.name);
      onProgress(body.name, 'error');
    }
  });

  await runWithConcurrency(tasks, concurrency);

  // Second-pass retry for any failed bodies
  if (failedBodies.length > 0) {
    await new Promise(r => setTimeout(r, 3000));
    const retryBodies = [...failedBodies];
    failedBodies.length = 0;
    const retryTasks = fetchableBodies
      .filter(b => retryBodies.includes(b.name))
      .map(body => async () => {
        onProgress(body.name, 'loading');
        try {
          const entries = await fetchBodyVector(body.jplId!, startDate, stopDate, '1d', 3);
          const first = entries[0];
          bodies[body.name] = { pos: first.pos, vel: first.vel };
          if (!epochEntry) {
            const jd = parseJplDate(first.date);
            if (jd !== null) epochEntry = { date: first.date, jd };
          }
          onProgress(body.name, 'done');
        } catch (err) {
          console.warn(`Retry failed for JPL snapshot ${body.name}:`, err);
          failedBodies.push(body.name);
          onProgress(body.name, 'error');
        }
      });
    await runWithConcurrency(retryTasks, concurrency);
    if (failedBodies.length > 0) {
      throw new Error('Failed to fetch bodies after retry: ' + failedBodies.join(', '));
    }
  }

  if (!epochEntry) {
    throw new Error('Could not determine epoch — all bodies failed');
  }

  const resolvedEpoch = epochEntry as { date: string; jd: number };
  return {
    epoch: {
      date: resolvedEpoch.date,
      jd: resolvedEpoch.jd,
      unix_ms: jdToUnixMs(resolvedEpoch.jd),
    },
    bodies,
  };
}

// --- Archive pull (hourly range data per body) ---

export async function pullJPLArchive(
  onProgress: (bodyName: string, status: FetchStatus) => void,
  startDateStr: string,
  endDateStr: string,
  stepHours = 1,
  concurrency = 3,
): Promise<ArchiveData> {
  const bodies: Record<string, BodyArchiveEntry[]> = {};
  const failedBodies: string[] = [];
  let startEpoch: { date: string; jd: number } | null = null;
  let endEpoch: { date: string; jd: number } | null = null;

  const fetchableBodies = ALL_BODIES.filter(b => b.jplId);

  for (const body of fetchableBodies) onProgress(body.name, 'pending');

  const tasks = fetchableBodies.map(body => async () => {
    onProgress(body.name, 'loading');
    try {
      const entries = await fetchBodyVector(
        body.jplId!, startDateStr, endDateStr, `${stepHours}h`
      );
      bodies[body.name] = entries.map(e => {
        const jd = parseJplDate(e.date) ?? 0;
        return { date: e.date, jd, unix_ms: jdToUnixMs(jd), pos: e.pos, vel: e.vel };
      });
      // Track actual epoch range from first body
      if (!startEpoch && entries.length > 0) {
        const jd = parseJplDate(entries[0].date);
        if (jd !== null) startEpoch = { date: entries[0].date, jd };
      }
      if (!endEpoch && entries.length > 1) {
        const last = entries[entries.length - 1];
        const jd = parseJplDate(last.date);
        if (jd !== null) endEpoch = { date: last.date, jd };
      }
      onProgress(body.name, 'done');
    } catch (err) {
      console.warn(`Failed to fetch JPL archive for ${body.name}:`, err);
      failedBodies.push(body.name);
      onProgress(body.name, 'error');
    }
  });

  await runWithConcurrency(tasks, concurrency);

  // Second-pass retry for any failed bodies
  if (failedBodies.length > 0) {
    await new Promise(r => setTimeout(r, 3000));
    const retryBodies = [...failedBodies];
    failedBodies.length = 0;
    const retryTasks = fetchableBodies
      .filter(b => retryBodies.includes(b.name))
      .map(body => async () => {
        onProgress(body.name, 'loading');
        try {
          const entries = await fetchBodyVector(
            body.jplId!, startDateStr, endDateStr, `${stepHours}h`, 3
          );
          bodies[body.name] = entries.map(e => {
            const jd = parseJplDate(e.date) ?? 0;
            return { date: e.date, jd, unix_ms: jdToUnixMs(jd), pos: e.pos, vel: e.vel };
          });
          if (!startEpoch && entries.length > 0) {
            const jd = parseJplDate(entries[0].date);
            if (jd !== null) startEpoch = { date: entries[0].date, jd };
          }
          if (!endEpoch && entries.length > 1) {
            const last = entries[entries.length - 1];
            const jd = parseJplDate(last.date);
            if (jd !== null) endEpoch = { date: last.date, jd };
          }
          onProgress(body.name, 'done');
        } catch (err) {
          console.warn(`Retry failed for JPL archive ${body.name}:`, err);
          failedBodies.push(body.name);
          onProgress(body.name, 'error');
        }
      });
    await runWithConcurrency(retryTasks, concurrency);
    if (failedBodies.length > 0) {
      throw new Error('Failed to fetch bodies after retry: ' + failedBodies.join(', '));
    }
  }

  if (!startEpoch) throw new Error('Could not determine epoch — all bodies failed');

  const resolvedStart = startEpoch as { date: string; jd: number };
  const resolvedEnd = endEpoch as { date: string; jd: number } | null;
  return {
    startEpoch: { date: resolvedStart.date, jd: resolvedStart.jd, unix_ms: jdToUnixMs(resolvedStart.jd) },
    endEpoch: resolvedEnd
      ? { date: resolvedEnd.date, jd: resolvedEnd.jd, unix_ms: jdToUnixMs(resolvedEnd.jd) }
      : { date: resolvedStart.date, jd: resolvedStart.jd, unix_ms: jdToUnixMs(resolvedStart.jd) },
    stepHours,
    bodies,
  };
}
