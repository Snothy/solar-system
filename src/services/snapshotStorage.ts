/**
 * IndexedDB storage for JPL snapshot and archive history.
 */

import type { SnapshotData, ArchiveData } from './jplFetchService';

export interface SnapshotRecord extends SnapshotData {
  id: string;
  kind: 'snapshot';
  createdAt: number;
  bodyCount: number;
  label?: string;
}

export interface ArchiveRecord extends ArchiveData {
  id: string;
  kind: 'archive';
  createdAt: number;
  bodyCount: number;
  entryCount: number; // total data points across all bodies
  label?: string;
}

export type AnyRecord = SnapshotRecord | ArchiveRecord;

const DB_NAME = 'jpl-snapshots';
const DB_VERSION = 2;
const STORE_SNAPSHOTS = 'snapshots';
const STORE_ACTIVE = 'active';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (_e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ACTIVE)) {
        db.createObjectStore(STORE_ACTIVE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSnapshot(data: SnapshotData): Promise<SnapshotRecord> {
  const db = await openDB();
  const record: SnapshotRecord = {
    ...data,
    id: new Date().toISOString(),
    kind: 'snapshot',
    createdAt: Date.now(),
    bodyCount: Object.keys(data.bodies).length,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
    const req = tx.objectStore(STORE_SNAPSHOTS).put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function saveArchive(data: ArchiveData): Promise<ArchiveRecord> {
  const db = await openDB();
  const entryCount = Object.values(data.bodies).reduce((sum, arr) => sum + arr.length, 0);
  const record: ArchiveRecord = {
    ...data,
    id: new Date().toISOString(),
    kind: 'archive',
    createdAt: Date.now(),
    bodyCount: Object.keys(data.bodies).length,
    entryCount,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
    const req = tx.objectStore(STORE_SNAPSHOTS).put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function listSnapshots(): Promise<AnyRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
    const req = tx.objectStore(STORE_SNAPSHOTS).getAll();
    req.onsuccess = () => {
      const all: AnyRecord[] = req.result;
      resolve(all.sort((a, b) => b.createdAt - a.createdAt));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function loadSnapshot(id: string): Promise<AnyRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
    const req = tx.objectStore(STORE_SNAPSHOTS).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSnapshot(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
    const req = tx.objectStore(STORE_SNAPSHOTS).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getActiveSnapshotId(): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ACTIVE, 'readonly');
    const req = tx.objectStore(STORE_ACTIVE).get('activeId');
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function setActiveSnapshotId(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ACTIVE, 'readwrite');
    const req = tx.objectStore(STORE_ACTIVE).put(id, 'activeId');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getLatestSnapshot(): Promise<SnapshotRecord | null> {
  const all = await listSnapshots();
  const snapshots = all.filter((r): r is SnapshotRecord => r.kind === 'snapshot');
  return snapshots[0] ?? null;
}

// --- Display helpers ---

export function formatEpochDate(dateStr: string): string {
  const cleaned = dateStr.replace(/^A\.D\.\s*/, '').replace(/\s*TDB$/, '');
  const [datePart, timePart] = cleaned.split(' ');
  const [, monthStr, dayStr] = datePart.split('-');
  const year = datePart.split('-')[0];
  const day = parseInt(dayStr);
  const time = timePart?.substring(0, 5) ?? '00:00';
  return `${monthStr} ${day}, ${year}  ${time} TDB`;
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
