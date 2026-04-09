/**
 * 3D test scene: simulated positions (textured spheres) vs JPL reference positions
 * (orange rings + error lines). Bodies shown at fixed small sizes so that
 * position errors — which range from thousands to millions of km — are the
 * dominant visual element, not the body size itself.
 *
 * Coordinate system: WASM/JPL ecliptic Z-up → Three.js Y-up via toScene().
 * Scale: SCALE = 1e-9, so 1 AU ≈ 150 scene units, 1M km ≈ 1 scene unit.
 */

import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { SOLAR_SYSTEM_DATA } from '../../data/solarSystem';
import { SCALE } from '../../utils/constants';
import type { TestFrame } from '../../services/testStorage';
import type { CelestialBodyData } from '../../types';

// SOLAR_SYSTEM_DATA already includes EXTENDED_BODIES
const ALL_BODIES: CelestialBodyData[] = SOLAR_SYSTEM_DATA;

// Same formula as main CelestialBody.tsx — respects user's visual scale setting
function calcRadius(b: CelestialBodyData, visualScale: number, useVisualScale: boolean): number {
  let r = (b.radius ?? 1e6) * SCALE;
  if (useVisualScale) {
    r *= visualScale;
    if (r > 40) r = 40;
  }
  return r;
}

// Static per-body color + texture (scale-independent)
const BODY_STATIC = new Map(
  ALL_BODIES.map(b => [b.name, {
    colorHex: '#' + new THREE.Color(b.color ?? 0xffffff).getHexString(),
    texture: (b as any).texture as string | undefined,
    baseRadius: (b.radius ?? 1e6) * SCALE, // unscaled, for camera focus logic
  }])
);

// Ecliptic Z-up (WASM) → Three.js Y-up
function toScene(pos: [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(pos[0] * SCALE, pos[2] * SCALE, -pos[1] * SCALE);
}

// Color based on error relative to max — green→yellow→red
function errColor(t: number): THREE.Color {
  t = Math.max(0, Math.min(1, t));
  if (t < 0.5) return new THREE.Color().lerpColors(new THREE.Color('#4ade80'), new THREE.Color('#facc15'), t * 2);
  return new THREE.Color().lerpColors(new THREE.Color('#facc15'), new THREE.Color('#f87171'), (t - 0.5) * 2);
}

// ─── Reference position marker ────────────────────────────────────────────────
// Only rendered when error is large enough to be visible (> 0.3 scene units ≈ 300k km)
const MIN_VISIBLE_ERROR_SCENE = 0.3;

function RefMarker({ position, radius }: { position: THREE.Vector3; radius: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  useFrame(() => { if (meshRef.current) meshRef.current.lookAt(camera.position); });
  const inner = radius * 1.1;
  const outer = radius * 1.35;
  return (
    <mesh ref={meshRef} position={position}>
      <ringGeometry args={[inner, outer, 40]} />
      <meshBasicMaterial color="#fb923c" transparent opacity={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Error line ───────────────────────────────────────────────────────────────

function ErrorLine({ from, to, t }: { from: THREE.Vector3; to: THREE.Vector3; t: number }) {
  const prim = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({
      color: errColor(t),
      transparent: true,
      opacity: 0.75,
    });
    return new THREE.Line(geo, mat);
  }, [from.x, from.y, from.z, to.x, to.y, to.z, t]);
  return <primitive object={prim} />;
}

// ─── Trails ───────────────────────────────────────────────────────────────────

function BodyTrail({
  frames, frameIdx, name, trailLength, colorHex,
}: {
  frames: TestFrame[]; frameIdx: number; name: string;
  trailLength: number; colorHex: string;
}) {
  const { simLine, refLine } = useMemo(() => {
    const start = Math.max(0, frameIdx - trailLength + 1);
    const slice = frames.slice(start, frameIdx + 1);

    const simPts = slice.map(f => f.bodies[name]?.simPos).filter(Boolean)
      .map(p => toScene(p as [number, number, number]));
    const refPts = slice.map(f => f.bodies[name]?.refPos).filter(Boolean)
      .map(p => toScene(p as [number, number, number]));

    const makeL = (pts: THREE.Vector3[], color: string, opacity: number) => {
      if (pts.length < 2) return null;
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity }));
    };
    return { simLine: makeL(simPts, colorHex, 0.65), refLine: makeL(refPts, '#fb923c', 0.55) };
  }, [frames, frameIdx, name, trailLength, colorHex]);

  return (
    <>
      {simLine && <primitive object={simLine} />}
      {refLine && <primitive object={refLine} />}
    </>
  );
}

// ─── Textured body (requires Suspense) ───────────────────────────────────────

function TexturedBody({
  simPos, refPos, radius, texture, colorHex, onClick, errorT,
}: {
  simPos: THREE.Vector3; refPos: THREE.Vector3; radius: number;
  texture: string; colorHex: string; onClick: () => void;
  errorT: number;
}) {
  const tex = useTexture(texture);
  const col = useMemo(() => new THREE.Color(colorHex), [colorHex]);
  const errSceneUnits = simPos.distanceTo(refPos);
  const showRef = errSceneUnits > MIN_VISIBLE_ERROR_SCENE;

  return (
    <group>
      <mesh position={simPos} onClick={e => { e.stopPropagation(); onClick(); }}>
        <sphereGeometry args={[radius, 20, 20]} />
        <meshStandardMaterial map={tex} emissive={col} emissiveIntensity={0.12} />
      </mesh>
      {showRef && <RefMarker position={refPos} radius={radius} />}
      {showRef && <ErrorLine from={simPos} to={refPos} t={errorT} />}
    </group>
  );
}

// ─── Flat (untextured) body ───────────────────────────────────────────────────

function FlatBody({
  simPos, refPos, radius, colorHex, onClick, errorT,
}: {
  simPos: THREE.Vector3; refPos: THREE.Vector3; radius: number;
  colorHex: string; onClick: () => void; errorT: number;
}) {
  const col = useMemo(() => new THREE.Color(colorHex), [colorHex]);
  const errSceneUnits = simPos.distanceTo(refPos);
  const showRef = errSceneUnits > MIN_VISIBLE_ERROR_SCENE;

  return (
    <group>
      <mesh position={simPos} onClick={e => { e.stopPropagation(); onClick(); }}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.35} />
      </mesh>
      {showRef && <RefMarker position={refPos} radius={radius} />}
      {showRef && <ErrorLine from={simPos} to={refPos} t={errorT} />}
    </group>
  );
}

// ─── Camera controller ────────────────────────────────────────────────────────
// Repositions camera once when focusedBody changes, then hands control back to user.

function CameraController({
  focusedBody, frame, controlsRef, visualScale, useVisualScale,
}: {
  focusedBody: string | null;
  frame: TestFrame | null;
  controlsRef: React.RefObject<any>;
  visualScale: number;
  useVisualScale: boolean;
}) {
  const { camera } = useThree();

  // Refs so useFrame always reads the latest values without re-subscribing
  const focusedBodyRef = useRef(focusedBody);
  const frameRef = useRef(frame);
  useEffect(() => { focusedBodyRef.current = focusedBody; frameRef.current = frame; });

  // Jump camera to focused body when selection changes
  useEffect(() => {
    if (!focusedBody || !frame) return;
    const bodyData = frame.bodies[focusedBody];
    if (!bodyData) return;

    const bodyDef = ALL_BODIES.find(b => b.name === focusedBody);
    const r = bodyDef ? calcRadius(bodyDef, visualScale, useVisualScale) : 1;

    const simPos = toScene(bodyData.simPos);
    const refPos = toScene(bodyData.refPos);
    const errScene = simPos.distanceTo(refPos);

    const mid = errScene > MIN_VISIBLE_ERROR_SCENE
      ? new THREE.Vector3().addVectors(simPos, refPos).multiplyScalar(0.5)
      : simPos.clone();
    const dist = Math.max(errScene * 3, r * 12, 1);

    camera.position.set(mid.x + dist * 0.6, mid.y + dist * 0.4, mid.z + dist * 0.8);
    camera.lookAt(mid);

    if (controlsRef.current) {
      controlsRef.current.target.copy(mid);
      controlsRef.current.update();
    }
  }, [focusedBody]); // only repositions on focus change — user can freely orbit after

  // Continuously update orbit target to track the focused body during playback
  useFrame(() => {
    const name = focusedBodyRef.current;
    const f = frameRef.current;
    if (!name || !f || !controlsRef.current) return;
    const bodyData = f.bodies[name];
    if (!bodyData) return;
    const simPos = toScene(bodyData.simPos);
    const refPos = toScene(bodyData.refPos);
    const errScene = simPos.distanceTo(refPos);
    const mid = errScene > MIN_VISIBLE_ERROR_SCENE
      ? new THREE.Vector3().addVectors(simPos, refPos).multiplyScalar(0.5)
      : simPos.clone();
    controlsRef.current.target.copy(mid);
  });

  return null;
}

// ─── Lights ───────────────────────────────────────────────────────────────────

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 0]} intensity={4} decay={0} color="#fffbe6" />
    </>
  );
}

// ─── Scene content ────────────────────────────────────────────────────────────

function SceneContent({
  frames, frameIdx, trailLength, focusedBody, onBodyClick, controlsRef,
  visualScale, useVisualScale,
}: {
  frames: TestFrame[]; frameIdx: number; trailLength: number;
  focusedBody: string | null; onBodyClick: (name: string) => void;
  controlsRef: React.RefObject<any>;
  visualScale: number; useVisualScale: boolean;
}) {
  const frame = frames[frameIdx] ?? null;
  if (!frame) return null;

  const entries = Object.entries(frame.bodies);
  const maxErrorKm = useMemo(
    () => Math.max(...entries.map(([, b]) => b.errorKm), 1),
    [frame]
  );

  return (
    <>
      <SceneLights />
      <Stars radius={50000} depth={5000} count={3000} factor={6} saturation={0} />
      <CameraController focusedBody={focusedBody} frame={frame} controlsRef={controlsRef}
        visualScale={visualScale} useVisualScale={useVisualScale} />

      {entries.map(([name, data]) => {
        const meta = BODY_STATIC.get(name);
        if (!meta) return null;
        const radius = calcRadius(
          ALL_BODIES.find(b => b.name === name)!,
          visualScale, useVisualScale
        );
        const simPos = toScene(data.simPos);
        const refPos = toScene(data.refPos);
        const errorT = data.errorKm / maxErrorKm;
        const isFocused = focusedBody === name;

        const bodyEl = meta.texture ? (
          <Suspense fallback={
            <FlatBody simPos={simPos} refPos={refPos} radius={radius}
              colorHex={meta.colorHex} onClick={() => onBodyClick(name)}
              errorT={errorT} />
          }>
            <TexturedBody simPos={simPos} refPos={refPos} radius={radius}
              texture={meta.texture} colorHex={meta.colorHex}
              onClick={() => onBodyClick(name)} errorT={errorT} />
          </Suspense>
        ) : (
          <FlatBody simPos={simPos} refPos={refPos} radius={radius}
            colorHex={meta.colorHex} onClick={() => onBodyClick(name)}
            errorT={errorT} />
        );

        return (
          <group key={name}>
            {bodyEl}
            {isFocused && (
              <BodyTrail frames={frames} frameIdx={frameIdx} name={name}
                trailLength={trailLength} colorHex={meta.colorHex} />
            )}
          </group>
        );
      })}
    </>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────

export interface TestSceneProps {
  frames: TestFrame[];
  frameIdx: number;
  trailLength?: number;
  onBodyClick: (name: string) => void;
  focusedBody: string | null;
  visualScale: number;
  useVisualScale: boolean;
}

export function TestScene({
  frames, frameIdx, trailLength = 48, onBodyClick, focusedBody, visualScale, useVisualScale,
}: TestSceneProps) {
  const controlsRef = useRef<any>(null);

  return (
    <Canvas
      camera={{ position: [0, 40, 60], fov: 50, near: 0.001, far: 2000000 }}
      gl={{ logarithmicDepthBuffer: true, outputColorSpace: THREE.SRGBColorSpace }}
      style={{ width: '100%', height: '100%', background: '#000' }}
    >
      <SceneContent
        frames={frames}
        frameIdx={frameIdx}
        trailLength={trailLength}
        focusedBody={focusedBody}
        onBodyClick={onBodyClick}
        controlsRef={controlsRef}
        visualScale={visualScale}
        useVisualScale={useVisualScale}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
      />
    </Canvas>
  );
}
