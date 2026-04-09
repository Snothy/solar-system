import { useState, useMemo } from 'react';
import { SOLAR_SYSTEM_DATA } from '../../data/solarSystem';
import { EXTENDED_BODIES } from '../../data/extendedBodies';
import type { CelestialBodyData } from '../../types';

const ALL_BODIES: CelestialBodyData[] = [...SOLAR_SYSTEM_DATA, ...EXTENDED_BODIES];
const AU = 1.495978707e11;

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtMass(kg: number | undefined): string {
  if (kg == null) return '—';
  const exp = Math.floor(Math.log10(kg));
  const mantissa = kg / Math.pow(10, exp);
  return `${mantissa.toFixed(3)} × 10${superscript(exp)} kg`;
}

function superscript(n: number): string {
  return String(n).split('').map(c => {
    const map: Record<string, string> = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻' };
    return map[c] ?? c;
  }).join('');
}

function fmtRadius(m: number | undefined): string {
  if (m == null) return '—';
  return `${(m / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })} km`;
}

function fmtAU(m: number | undefined): string {
  if (m == null) return '—';
  return `${(m / AU).toFixed(4)} AU`;
}

function fmtDeg(v: number | undefined, decimals = 3): string {
  if (v == null) return '—';
  return `${v.toFixed(decimals)}°`;
}

function fmtTemp(k: number | undefined): string {
  if (k == null) return '—';
  return `${k} K`;
}

function fmtGravity(v: number | undefined): string {
  if (v == null) return '—';
  return `${v} m/s²`;
}

function fmtPeriod(h: number | undefined): string {
  if (h == null) return '—';
  const abs = Math.abs(h);
  if (abs >= 24) return `${(h / 24).toFixed(2)} days`;
  return `${h.toFixed(2)} h`;
}

// ─── Type color ───────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  star:         '#fbbf24',
  planet:       '#60a5fa',
  moon:         '#a78bfa',
  'dwarf planet': '#34d399',
  asteroid:     '#fb923c',
  comet:        '#22d3ee',
};

function typeColor(t: string | undefined) {
  return TYPE_COLOR[t ?? ''] ?? 'rgba(255,255,255,0.4)';
}

// ─── Category filter ──────────────────────────────────────────────────────────

type Category = 'All' | 'Stars' | 'Planets' | 'Moons' | 'Dwarfs' | 'Asteroids' | 'Comets';

const CATEGORIES: Category[] = ['All', 'Stars', 'Planets', 'Moons', 'Dwarfs', 'Asteroids', 'Comets'];

const CATEGORY_TYPES: Record<Exclude<Category, 'All'>, string[]> = {
  Stars:     ['star'],
  Planets:   ['planet'],
  Moons:     ['moon'],
  Dwarfs:    ['dwarf planet'],
  Asteroids: ['asteroid'],
  Comets:    ['comet'],
};

// ─── Parameter row (inside expanded card) ────────────────────────────────────

function Param({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px', padding: '5px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function ParamGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '6px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Single body card ─────────────────────────────────────────────────────────

function BodyCard({ body }: { body: CelestialBodyData }) {
  const [expanded, setExpanded] = useState(false);
  const color = typeColor(body.type);

  const hasOrbital = body.rel_a != null || body.rel_e != null || body.rel_i != null;
  const hasHarmonics = body.J != null || body.C22 != null;
  const hasTidal = body.tidal != null;
  const hasPole = body.poleRA != null || body.poleDec != null;

  return (
    <div style={{
      borderRadius: '12px',
      background: expanded ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
      border: `0.5px solid ${expanded ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
      marginBottom: '8px', overflow: 'hidden', transition: 'background 0.15s, border-color 0.15s',
    }}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
          padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Type dot */}
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />

        {/* Name + type */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff', marginBottom: '3px' }}>
            {body.name}
            {body.parent && (
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginLeft: '8px' }}>
                → {body.parent}
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {body.mass != null && <span>{fmtMass(body.mass)}</span>}
            {body.radius != null && <span>r = {fmtRadius(body.radius)}</span>}
            {body.meanTemperature != null && <span>{fmtTemp(body.meanTemperature)}</span>}
          </div>
        </div>

        {/* Type badge */}
        <span style={{
          fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em',
          padding: '3px 8px', borderRadius: '999px',
          background: `${color}22`, color, flexShrink: 0, textTransform: 'capitalize',
        }}>
          {body.type ?? 'unknown'}
        </span>

        {/* Chevron */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round"
          style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', paddingTop: '14px' }}>
            {/* Left column */}
            <div>
              <ParamGroup title="Physical">
                {body.mass != null && <Param label="Mass" value={fmtMass(body.mass)} />}
                {body.radius != null && <Param label="Radius" value={fmtRadius(body.radius)} />}
                {body.radii != null && (
                  <Param label="Radii (x/y/z)" value={`${(body.radii.x/1e3).toFixed(0)} / ${(body.radii.y/1e3).toFixed(0)} / ${(body.radii.z/1e3).toFixed(0)} km`} />
                )}
                {body.surfaceGravity != null && <Param label="Surface gravity" value={fmtGravity(body.surfaceGravity)} />}
                {body.meanTemperature != null && <Param label="Temperature" value={fmtTemp(body.meanTemperature)} />}
                {body.albedo != null && <Param label="Bond albedo" value={body.albedo.toFixed(3)} />}
                {body.rotationPeriod != null && <Param label="Rotation period" value={fmtPeriod(body.rotationPeriod)} />}
                {body.axialTilt != null && <Param label="Axial tilt" value={fmtDeg(body.axialTilt, 2)} />}
                {body.jplId && <Param label="JPL ID" value={body.jplId} />}
              </ParamGroup>

              {hasTidal && (
                <ParamGroup title="Tidal">
                  <Param label="Love number k₂" value={String(body.tidal!.k2)} />
                  <Param label="Tidal Q" value={String(body.tidal!.tidalQ)} />
                </ParamGroup>
              )}
            </div>

            {/* Right column */}
            <div>
              {hasOrbital && (
                <ParamGroup title="Orbital Elements (J2000)">
                  {body.rel_a != null && <Param label="Semi-major axis" value={fmtAU(body.rel_a)} />}
                  {body.rel_e != null && <Param label="Eccentricity" value={body.rel_e.toFixed(6)} />}
                  {body.rel_i != null && <Param label="Inclination" value={fmtDeg(body.rel_i, 4)} />}
                  {body.rel_node != null && <Param label="Ascending node Ω" value={fmtDeg(body.rel_node, 3)} />}
                  {body.rel_peri != null && <Param label="Arg. of periapsis ω" value={fmtDeg(body.rel_peri, 3)} />}
                  {body.rel_M != null && <Param label="Mean anomaly M₀" value={fmtDeg(body.rel_M, 3)} />}
                </ParamGroup>
              )}

              {hasPole && (
                <ParamGroup title="Pole Orientation">
                  {body.poleRA != null && <Param label="Pole RA" value={fmtDeg(body.poleRA, 2)} />}
                  {body.poleDec != null && <Param label="Pole Dec" value={fmtDeg(body.poleDec, 2)} />}
                  {body.W0 != null && <Param label="Prime meridian W₀" value={fmtDeg(body.W0, 3)} />}
                  {body.Wdot != null && <Param label="Rotation rate Ẇ" value={`${body.Wdot} °/day`} />}
                </ParamGroup>
              )}

              {hasHarmonics && (
                <ParamGroup title="Gravity Harmonics">
                  {body.J?.map((val, i) => (
                    <Param key={i} label={`J${i + 2}`} value={val.toExponential(3)} />
                  ))}
                  {body.C22 != null && <Param label="C₂₂" value={body.C22.toExponential(3)} />}
                  {body.S22 != null && <Param label="S₂₂" value={body.S22.toExponential(3)} />}
                </ParamGroup>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main BodiesPanel ─────────────────────────────────────────────────────────

export function BodiesPanel() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('All');

  const filtered = useMemo(() => {
    let result = ALL_BODIES;
    if (category !== 'All') {
      const types = CATEGORY_TYPES[category];
      result = result.filter(b => b.type && types.includes(b.type));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(b => b.name.toLowerCase().includes(q) || b.type?.toLowerCase().includes(q));
    }
    return result;
  }, [search, category]);

  const counts = useMemo(() => {
    const out: Record<Category, number> = { All: ALL_BODIES.length } as any;
    for (const cat of CATEGORIES.slice(1)) {
      const types = CATEGORY_TYPES[cat as Exclude<Category, 'All'>];
      out[cat] = ALL_BODIES.filter(b => b.type && types.includes(b.type)).length;
    }
    return out;
  }, []);

  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <svg
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search bodies…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', padding: '10px 14px 10px 36px',
            color: '#fff', fontSize: '14px', outline: 'none',
          }}
        />
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {CATEGORIES.map(cat => {
          const isActive = category === cat;
          const count = counts[cat];
          if (count === 0 && cat !== 'All') return null;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 500,
                background: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                border: isActive ? '0.5px solid rgba(255,255,255,0.2)' : '0.5px solid rgba(255,255,255,0.08)',
                cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              {cat}
              <span style={{ fontSize: '10px', opacity: 0.6 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Result count */}
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginBottom: '12px' }}>
        {filtered.length} {filtered.length === 1 ? 'body' : 'bodies'}
        {search && ` matching "${search}"`}
      </div>

      {/* Body list */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', padding: '20px 0' }}>
          No bodies match your filter.
        </p>
      ) : (
        <div>
          {filtered.map(body => (
            <BodyCard key={body.name} body={body} />
          ))}
        </div>
      )}
    </div>
  );
}
