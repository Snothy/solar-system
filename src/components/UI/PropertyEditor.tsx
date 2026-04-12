import { useState, useEffect } from "react";
import type { PhysicsBody } from "../../types";
import { AU } from "../../utils/constants";
import { SOLAR_SYSTEM_DATA } from "../../data/solarSystem";

interface PropertyEditorProps {
  body: PhysicsBody;
  onUpdate: (name: string, updates: Partial<PhysicsBody>) => void;
  onClose: () => void;
  onFocusCamera: () => void;
  onUnfocusCamera: () => void;
}

export function PropertyEditor({
  body,
  onUpdate,
  onClose,
  onFocusCamera,
  onUnfocusCamera,
}: PropertyEditorProps) {
  const [mass, setMass] = useState(body.gm.toExponential(2));
  const [radius, setRadius] = useState(
    (body.equatorialRadius / 1000).toFixed(0),
  ); // km
  const [isEditing, setIsEditing] = useState(false);

  const staticData = SOLAR_SYSTEM_DATA.find((d) => d.name === body.name);

  useEffect(() => {
    setMass(body.gm.toExponential(2));
    setRadius((body.equatorialRadius / 1000).toFixed(0));
  }, [body]);

  const handleSave = () => {
    const newMass = parseFloat(mass);
    const newRadius = parseFloat(radius) * 1000;
    if (!isNaN(newMass) && !isNaN(newRadius)) {
      onUpdate(body.name, { gm: newMass, equatorialRadius: newRadius });
      setIsEditing(false);
    }
  };

  const distanceFromSun = body.pos.length() / AU;
  const velocity = body.vel.length() / 1000;

  return (
    <div
      className="apple-panel"
      style={{
        position: "absolute",
        top: "80px",
        right: "24px",
        width: "320px",
        padding: "24px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        maxHeight: "calc(100vh - 160px)",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 500,
              color: "#fff",
              letterSpacing: "-0.03em",
            }}
          >
            {body.name}
          </h2>
          <div
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.5)",
              marginTop: "2px",
              fontWeight: 400,
            }}
          >
            {staticData?.type === "star"
              ? "Star"
              : staticData?.parent
                ? "Moon"
                : "Planet"}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
            border: "none",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Camera Actions */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={onFocusCamera}
          style={{
            flex: 1,
            padding: "10px",
            background: "#fff",
            color: "#000",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 500,
            border: "none",
          }}
        >
          Focus Camera
        </button>
        <button
          onClick={onUnfocusCamera}
          style={{
            flex: 1,
            padding: "10px",
            background: "rgba(255,255,255,0.1)",
            color: "#fff",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 500,
            border: "none",
          }}
        >
          Free Cam
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Physical Properties Area */}
        <div
          style={{
            padding: "16px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
              Mass
            </span>
            {isEditing ? (
              <input
                type="text"
                value={mass}
                onChange={(e) => setMass(e.target.value)}
                style={{
                  width: "80px",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "4px",
                  color: "#fff",
                  padding: "2px 6px",
                  fontSize: "13px",
                  textAlign: "right",
                }}
              />
            ) : (
              <span style={{ fontSize: "14px", color: "#fff" }}>
                {Number(mass).toExponential(2)} kg
              </span>
            )}
          </div>
          <div
            style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
              Radius
            </span>
            {isEditing ? (
              <input
                type="text"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                style={{
                  width: "80px",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "4px",
                  color: "#fff",
                  padding: "2px 6px",
                  fontSize: "13px",
                  textAlign: "right",
                }}
              />
            ) : (
              <span style={{ fontSize: "14px", color: "#fff" }}>
                {Number(radius).toLocaleString()} km
              </span>
            )}
          </div>
        </div>

        {/* Live Data Area */}
        <div style={{ display: "flex", gap: "12px" }}>
          <div
            style={{
              flex: 1,
              padding: "16px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "16px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
              DISTANCE
            </span>
            <span
              style={{
                fontSize: "18px",
                color: "#fff",
                fontWeight: 500,
                marginTop: "4px",
              }}
            >
              {distanceFromSun.toFixed(2)}
            </span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
              AU
            </span>
          </div>
          <div
            style={{
              flex: 1,
              padding: "16px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "16px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
              VELOCITY
            </span>
            <span
              style={{
                fontSize: "18px",
                color: "#fff",
                fontWeight: 500,
                marginTop: "4px",
              }}
            >
              {velocity.toFixed(1)}
            </span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
              km/s
            </span>
          </div>
        </div>

        {/* Static Profile Area */}
        {staticData && (
          <div
            style={{
              padding: "16px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {staticData.rotationPeriod && (
              <>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}
                  >
                    Day Length
                  </span>
                  <span style={{ fontSize: "14px", color: "#fff" }}>
                    {staticData.rotationPeriod}h
                  </span>
                </div>
                <div
                  style={{
                    height: "1px",
                    background: "rgba(255,255,255,0.05)",
                  }}
                />
              </>
            )}
            {staticData.axialTilt && (
              <>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}
                  >
                    Axial Tilt
                  </span>
                  <span style={{ fontSize: "14px", color: "#fff" }}>
                    {staticData.axialTilt}°
                  </span>
                </div>
              </>
            )}
            {staticData.meanTemperature && (
              <>
                <div
                  style={{
                    height: "1px",
                    background: "rgba(255,255,255,0.05)",
                  }}
                />
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}
                  >
                    Mean Temp
                  </span>
                  <span style={{ fontSize: "14px", color: "#fff" }}>
                    {staticData.meanTemperature}K
                  </span>
                </div>
              </>
            )}
            {staticData.surfaceGravity && (
              <>
                <div
                  style={{
                    height: "1px",
                    background: "rgba(255,255,255,0.05)",
                  }}
                />
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}
                  >
                    Gravity
                  </span>
                  <span style={{ fontSize: "14px", color: "#fff" }}>
                    {staticData.surfaceGravity} m/s²
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Editable Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "8px",
          }}
        >
          {isEditing ? (
            <div style={{ display: "flex", gap: "8px", width: "100%" }}>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#fff",
                  color: "#000",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                width: "100%",
                padding: "10px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              Edit Properties...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
