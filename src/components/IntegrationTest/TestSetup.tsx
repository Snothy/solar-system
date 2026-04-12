/**
 * Setup panel: archive selector, active physics configuration display, test history.
 */

import { useEffect, useState } from "react";
import type { ArchiveRecord } from "../../services/snapshotStorage";
import type { TestRun } from "../../services/testStorage";
import {
  listSnapshots,
  formatEpochDate,
  timeAgo,
} from "../../services/snapshotStorage";
import {
  listTestRuns,
  deleteTestRun,
  loadTestRun,
} from "../../services/testStorage";

const INTEGRATOR_LABELS: Record<string, string> = {
  saba4: "SABA4",
  adaptive: "DOP853",
  "wisdom-holman": "Wisdom-Holman",
  "high-precision": "High Precision",
};

interface ActiveSettings {
  integratorMode: string;
  quality: number;
  enableRelativity: boolean;
  enableTidalEvolution: boolean;
  enableAtmosphericDrag: boolean;
  enableYarkovsky: boolean;
  enableGravitationalHarmonics: boolean;
  enableSolarRadiationPressure: boolean;
}

interface Props {
  onRun: (archive: ArchiveRecord) => void;
  onReplay: (run: TestRun) => void;
  onOpenSettings: () => void;
  activeSettings: ActiveSettings;
}

function TogglePill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "10px",
        fontWeight: 600,
        background: active ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.07)",
        color: active ? "#4ade80" : "rgba(255,255,255,0.3)",
        border: `1px solid ${active ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"}`,
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </span>
  );
}

export function TestSetup({
  onRun,
  onReplay,
  onOpenSettings,
  activeSettings,
}: Props) {
  const [archives, setArchives] = useState<ArchiveRecord[]>([]);
  const [history, setHistory] = useState<Omit<TestRun, "frames">[]>([]);
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    listSnapshots().then((all) => {
      setArchives(all.filter((r): r is ArchiveRecord => r.kind === "archive"));
    });
    listTestRuns().then(setHistory);
  }, []);

  const selectedArchive =
    archives.find((a) => a.id === selectedArchiveId) ?? null;

  const handleRun = () => {
    if (selectedArchive) onRun(selectedArchive);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTestRun(id);
    setHistory((h) => h.filter((r) => r.id !== id));
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", gap: "0" }}>
      {/* ── Left sidebar ─────────────────────────────────────────── */}
      <div
        className="apple-panel"
        style={{
          width: "380px",
          flexShrink: 0,
          borderRadius: "0",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "32px 24px",
          gap: "24px",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          overflowY: "auto",
          background: "rgba(12,12,18,0.6)",
        }}
      >
        {/* Archive selector */}
        <div>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            Archive
          </div>

          {archives.length === 0 ? (
            <div
              style={{
                padding: "16px",
                borderRadius: "12px",
                background: "rgba(251,146,60,0.08)",
                border: "1px solid rgba(251,146,60,0.2)",
                fontSize: "13px",
                color: "rgba(251,146,60,0.9)",
                lineHeight: "1.5",
              }}
            >
              No archives yet. Pull one in
              <span style={{ color: "#fb923c", fontWeight: 600 }}>
                {" "}
                Settings → Data
              </span>
              .
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {archives.map((a) => (
                <button
                  key={a.id}
                  onClick={() =>
                    setSelectedArchiveId(
                      a.id === selectedArchiveId ? null : a.id,
                    )
                  }
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    textAlign: "left",
                    background:
                      a.id === selectedArchiveId
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(255,255,255,0.04)",
                    border:
                      a.id === selectedArchiveId
                        ? "1px solid rgba(255,255,255,0.2)"
                        : "1px solid rgba(255,255,255,0.06)",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#fff",
                      marginBottom: "4px",
                    }}
                  >
                    {a.label ?? formatEpochDate(a.startEpoch.date)}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.45)",
                      display: "flex",
                      gap: "8px",
                    }}
                  >
                    <span>
                      {formatEpochDate(a.startEpoch.date)} →{" "}
                      {formatEpochDate(a.endEpoch.date)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.3)",
                      marginTop: "2px",
                      display: "flex",
                      gap: "8px",
                    }}
                  >
                    <span>{a.bodyCount} bodies</span>
                    <span>·</span>
                    <span>{a.entryCount.toLocaleString()} pts</span>
                    <span>·</span>
                    <span>{timeAgo(a.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Physics Configuration */}
        <div>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            Physics Configuration
          </div>
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}
              >
                Integrator
              </span>
              <span
                style={{ fontSize: "12px", fontWeight: 500, color: "#fff" }}
              >
                {INTEGRATOR_LABELS[activeSettings.integratorMode] ??
                  activeSettings.integratorMode}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}
              >
                Quality
              </span>
              <span
                style={{ fontSize: "12px", fontWeight: 500, color: "#fff" }}
              >
                {activeSettings.quality}
              </span>
            </div>
            <div
              style={{ height: "1px", background: "rgba(255,255,255,0.06)" }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              <TogglePill
                label="Relativity"
                active={activeSettings.enableRelativity}
              />
              <TogglePill
                label="Tidal"
                active={activeSettings.enableTidalEvolution}
              />
              <TogglePill
                label="Atm Drag"
                active={activeSettings.enableAtmosphericDrag}
              />
              <TogglePill
                label="Yarkovsky"
                active={activeSettings.enableYarkovsky}
              />
              <TogglePill
                label="GravHarmonics"
                active={activeSettings.enableGravitationalHarmonics}
              />
              <TogglePill
                label="SRP"
                active={activeSettings.enableSolarRadiationPressure}
              />
            </div>
            <button
              onClick={onOpenSettings}
              style={{
                alignSelf: "flex-start",
                padding: "4px 0",
                fontSize: "12px",
                color: "#60a5fa",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              Change in Settings →
            </button>
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={!selectedArchive}
          style={{
            padding: "14px",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 600,
            background: selectedArchive ? "#fff" : "rgba(255,255,255,0.08)",
            color: selectedArchive ? "#000" : "rgba(255,255,255,0.3)",
            cursor: selectedArchive ? "pointer" : "not-allowed",
            transition: "all 0.15s",
            width: "100%",
          }}
        >
          Run Integration Test
        </button>
      </div>

      {/* ── Right: test history ───────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "32px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            marginBottom: "20px",
          }}
        >
          Test History
        </div>

        {history.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                textAlign: "center",
                color: "rgba(255,255,255,0.2)",
                fontSize: "14px",
              }}
            >
              No tests run yet. Select an archive and run your first test.
            </div>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {history.map((run) => (
              <HistoryRow
                key={run.id}
                run={run}
                onReplay={onReplay}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── History row ──────────────────────────────────────────────────────────────

function HistoryRow({
  run,
  onReplay,
  onDelete,
}: {
  run: Omit<TestRun, "frames">;
  onReplay: (run: TestRun) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleReplay = async () => {
    setLoading(true);
    const full = await loadTestRun(run.id);
    setLoading(false);
    if (full) onReplay(full);
  };

  const bodyCount = Object.keys(run.summary.bodies).length;
  const meanKm = run.summary.overallMeanErrorKm;

  const errorColor =
    meanKm < 100 ? "#4ade80" : meanKm < 1000 ? "#facc15" : "#f87171";

  const integratorLabel: Record<string, string> = {
    saba4: "SABA4",
    adaptive: "DOP853",
    "wisdom-holman": "W-H",
    "high-precision": "High-P",
    standard: "Std",
  };

  return (
    <div
      className="apple-panel"
      style={{
        padding: "16px 20px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.04)",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}
    >
      {/* Error indicator dot */}
      <div
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: errorColor,
          flexShrink: 0,
        }}
      />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#fff",
            marginBottom: "4px",
          }}
        >
          {formatEpochDate(run.startEpoch.date)}
          <span style={{ color: "rgba(255,255,255,0.4)", margin: "0 6px" }}>
            →
          </span>
          {formatEpochDate(run.endEpoch.date)}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "rgba(255,255,255,0.4)",
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              background: "rgba(255,255,255,0.08)",
              padding: "1px 6px",
              borderRadius: "4px",
            }}
          >
            {integratorLabel[run.integrator] ?? run.integrator}
          </span>
          <span>{bodyCount} bodies</span>
          <span>{run.summary.frameCount} frames</span>
          {run.summary.crashed && (
            <span style={{ color: "#f87171" }}>⚠ crashed</span>
          )}
          <span style={{ color: "rgba(255,255,255,0.25)" }}>
            {timeAgo(run.createdAt)}
          </span>
        </div>
      </div>

      {/* Mean error */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: errorColor }}>
          {fmtKm(meanKm)}
        </div>
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>
          mean error
        </div>
      </div>

      {/* Replay + delete */}
      <button
        onClick={handleReplay}
        disabled={loading}
        style={{
          padding: "6px 14px",
          borderRadius: "8px",
          fontSize: "12px",
          fontWeight: 500,
          background: "rgba(255,255,255,0.1)",
          color: "#fff",
          flexShrink: 0,
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? "…" : "View"}
      </button>
      <button
        onClick={(e) => onDelete(run.id, e)}
        style={{
          background: "transparent",
          color: "rgba(255,255,255,0.3)",
          padding: "4px 6px",
          fontSize: "16px",
          flexShrink: 0,
        }}
        title="Delete"
      >
        ×
      </button>
    </div>
  );
}

function fmtKm(km: number): string {
  if (km >= 1e6) return `${(km / 1e6).toFixed(2)} M km`;
  if (km >= 1000) return `${(km / 1000).toFixed(1)} k km`;
  return `${km.toFixed(0)} km`;
}
