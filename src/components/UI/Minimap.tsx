import React, { useMemo } from 'react';
import type { VisualBody, PhysicsBody } from '../../types';
import { SOLAR_SYSTEM_DATA } from '../../data/solarSystem';

interface MinimapProps {
  visualBodies: VisualBody[];
  focusedObject: PhysicsBody | null;
  onFocus?: (body: PhysicsBody) => void;
}

export const Minimap: React.FC<MinimapProps> = ({ visualBodies, focusedObject, onFocus }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showMoons, setShowMoons] = React.useState(false);
  
  const size = isExpanded ? 400 : 200; // Size of the minimap in pixels
  const padding = isExpanded ? 40 : 20; // Padding to keep planets away from the edge

  // Filter to show only Sun and Planets (bodies without a parent) unless showMoons is true
  const filteredBodies = useMemo(() => {
    if (showMoons) return visualBodies;
    return visualBodies.filter(vb => !vb.body.parentName);
  }, [visualBodies, showMoons]);

  // Calculate the maximum distance from the center to determine scale
  const maxDistance = useMemo(() => {
    let max = 0;
    // Always calculate scale based on planets (to keep scale consistent when toggling moons)
    // Otherwise adding a far-out moon might change the scale slightly, or removing them might change it.
    // Actually, usually we want the scale to fit everything visible. 
    // But if we hide moons, we probably still want the same scale as the main system?
    // Let's stick to fitting whatever is in filteredBodies for now, or maybe just planets to keep it stable.
    // Let's use planets only for scale stability.
    const planets = visualBodies.filter(vb => !vb.body.parentName);
    planets.forEach(vb => {
      const dist = Math.sqrt(vb.body.pos.x ** 2 + vb.body.pos.z ** 2);
      if (dist > max) max = dist;
    });
    return max || 1; // Avoid division by zero
  }, [visualBodies]);

  // Scale factor to fit the solar system into the minimap
  // We use (size / 2 - padding) as the radius available for drawing
  const scale = (size / 2 - padding) / maxDistance;

  // Determine which body to highlight
  // If focused object is a moon and moons are hidden, highlight its parent
  const highlightName = useMemo(() => {
    if (!focusedObject) return null;
    if (!showMoons && focusedObject.parentName) return focusedObject.parentName;
    return focusedObject.name;
  }, [focusedObject, showMoons]);

  console.log('Minimap rendering', { visualBodiesCount: visualBodies.length, filteredCount: filteredBodies.length, maxDistance, scale });

  return (
    <div style={{
      position: 'fixed',
      bottom: '6rem', // Moved up to avoid StatusBar
      right: '1rem',
      zIndex: 1000,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '0.5rem',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
      overflow: 'hidden',
      width: size,
      height: size,
      transition: 'width 0.3s ease, height 0.3s ease'
    }}>
      <div style={{
        position: 'absolute',
        top: '0.5rem',
        left: '0.5rem',
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'monospace',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        SOLAR SYSTEM
      </div>
      
      {/* Controls Container */}
      <div style={{
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        display: 'flex',
        gap: '8px',
        zIndex: 20
      }}>
        {/* Show Moons Toggle (only visible when expanded) */}
        {isExpanded && (
          <button
            onClick={() => setShowMoons(!showMoons)}
            title={showMoons ? "Hide Moons" : "Show Moons"}
            style={{
              background: showMoons ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              color: 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: '10px',
              fontFamily: 'sans-serif'
            }}
          >
            {showMoons ? 'MOONS ON' : 'MOONS OFF'}
          </button>
        )}

        {/* Expand/Collapse Button */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          {isExpanded ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 14 10 14 10 20"></polyline>
              <polyline points="20 10 14 10 14 4"></polyline>
              <line x1="14" y1="10" x2="21" y2="3"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          )}
        </button>
      </div>

      <svg width={size} height={size} style={{ display: 'block' }}>
        {/* Background grid lines (optional) */}
        <circle cx={size / 2} cy={size / 2} r={size / 2 - padding} fill="none" stroke="white" strokeOpacity={0.05} />
        <circle cx={size / 2} cy={size / 2} r={(size / 2 - padding) * 0.5} fill="none" stroke="white" strokeOpacity={0.05} />
        
        {/* Sun/Center marker */}
        <circle cx={size / 2} cy={size / 2} r={2} fill="#FDB813" />

        {filteredBodies.map((vb) => {
          // Map 3D coordinates to 2D SVG coordinates
          // 3D x -> SVG x
          // 3D z -> SVG y (top-down view)
          const x = size / 2 + vb.body.pos.x * scale;
          const y = size / 2 + vb.body.pos.z * scale;
          
          const isFocused = highlightName === vb.body.name;
          const isStar = vb.type === 'star';

          // Determine color from static data
          const bodyData = SOLAR_SYSTEM_DATA.find(d => d.name === vb.body.name);
          const color = bodyData?.color ?? 0xffffff;
          const colorHex = '#' + color.toString(16).padStart(6, '0');

          return (
            <g 
              key={vb.body.name} 
              onClick={(e) => {
                e.stopPropagation();
                onFocus?.(vb.body);
              }}
              style={{ cursor: onFocus ? 'pointer' : 'default' }}
            >
              {/* Highlight ring for focused object */}
              {isFocused && (
                <circle 
                  cx={x} 
                  cy={y} 
                  r={isExpanded ? 10 : 6} 
                  fill="none" 
                  stroke="white" 
                  strokeWidth={1.5}
                >
                  <animate attributeName="r" values={isExpanded ? "10;14;10" : "6;8;6"} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              
              {/* Planet dot */}
              <circle 
                cx={x} 
                cy={y} 
                r={isStar ? (isExpanded ? 5 : 3) : (isExpanded ? 4 : 2)} 
                fill={colorHex} 
              />

              {/* Label (only when expanded) */}
              {isExpanded && (
                <text
                  x={x + 8}
                  y={y + 4}
                  fill="rgba(255, 255, 255, 0.8)"
                  fontSize="10"
                  fontFamily="sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {vb.body.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
