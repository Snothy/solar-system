import { useState, useEffect } from 'react';
import type { PhysicsBody } from '../../types';
import { SOLAR_SYSTEM_DATA } from '../../data/solarSystem';
import { AU } from '../../utils/constants';

interface PropertyEditorProps {
  body: PhysicsBody;
  onUpdate: (name: string, updates: Partial<PhysicsBody>) => void;
  onClose: () => void;
}

export function PropertyEditor({ body, onUpdate, onClose }: PropertyEditorProps) {
  const [mass, setMass] = useState(body.mass.toExponential(2));
  const [radius, setRadius] = useState((body.radius / 1000).toFixed(0)); // km
  const [isEditing, setIsEditing] = useState(false);
  
  // Get static data for this body
  const staticData = SOLAR_SYSTEM_DATA.find(d => d.name === body.name);

  useEffect(() => {
    setMass(body.mass.toExponential(2));
    setRadius((body.radius / 1000).toFixed(0));
  }, [body]);

  const handleSave = () => {
    const newMass = parseFloat(mass);
    const newRadius = parseFloat(radius) * 1000; // Convert km back to meters

    if (!isNaN(newMass) && !isNaN(newRadius)) {
      onUpdate(body.name, {
        mass: newMass,
        radius: newRadius
      });
      setIsEditing(false);
    }
  };

  const distanceFromSun = body.pos.length() / AU;
  const velocity = body.vel.length() / 1000; // km/s

  return (
    <div style={{
      position: 'absolute',
      top: '80px',
      right: '20px',
      width: '320px',
      backgroundColor: 'rgba(16, 20, 28, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '20px',
      color: '#e0e0e0',
      zIndex: 1000,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '12px'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#00d2ff' }}>{body.name}</h2>
        <button 
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#8a8f98',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: '4px'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Dynamic Properties */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.75rem', color: '#8a8f98', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Physical Properties</label>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#ccc' }}>Mass (kg)</span>
            {isEditing ? (
              <input 
                type="text" 
                value={mass} 
                onChange={e => setMass(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: 'white',
                  fontSize: '0.875rem',
                  width: '100%'
                }}
              />
            ) : (
              <span style={{ fontSize: '0.875rem', fontFamily: 'monospace', textAlign: 'right' }}>{Number(mass).toExponential(2)}</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#ccc' }}>Radius (km)</span>
            {isEditing ? (
              <input 
                type="text" 
                value={radius} 
                onChange={e => setRadius(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: 'white',
                  fontSize: '0.875rem',
                  width: '100%'
                }}
              />
            ) : (
              <span style={{ fontSize: '0.875rem', fontFamily: 'monospace', textAlign: 'right' }}>{Number(radius).toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Read-only Real-time Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <label style={{ fontSize: '0.75rem', color: '#8a8f98', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Real-time Data</label>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: '#ccc' }}>Distance from Sun</span>
            <span style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{distanceFromSun.toFixed(3)} AU</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: '#ccc' }}>Orbital Velocity</span>
            <span style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{velocity.toFixed(2)} km/s</span>
          </div>
        </div>

        {/* Static Data */}
        {staticData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <label style={{ fontSize: '0.75rem', color: '#8a8f98', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Characteristics</label>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#ccc' }}>Axial Tilt</span>
              <span style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{staticData.axialTilt}°</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#ccc' }}>Rotation Period</span>
              <span style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{staticData.rotationPeriod} h</span>
            </div>

            {staticData.meanTemperature && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: '#ccc' }}>Mean Temp</span>
                <span style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{staticData.meanTemperature} K</span>
              </div>
            )}

            {staticData.surfaceGravity && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: '#ccc' }}>Surface Gravity</span>
                <span style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{staticData.surfaceGravity} m/s²</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          {isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.875rem',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.875rem',
                  borderRadius: '4px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Save Changes
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              style={{
                width: '100%',
                padding: '6px 12px',
                fontSize: '0.875rem',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Edit Properties
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
