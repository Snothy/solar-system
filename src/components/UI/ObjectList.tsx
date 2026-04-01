import * as THREE from 'three';
import React from 'react';
import { SOLAR_SYSTEM_DATA } from '../../data/solarSystem';
import type { PhysicsBody } from '../../types';

interface ObjectListProps {
  bodies: PhysicsBody[];
  selectedObject: PhysicsBody | null;
  onSelect: (body: PhysicsBody) => void;
  orbitVisibility: Record<string, boolean>;
  onToggleOrbit: (name: string, includeChildren?: boolean) => void;
  onToggleAllOrbits: (visible: boolean) => void;
}

export const ObjectList = React.memo(function ObjectList({ 
  bodies, selectedObject, onSelect, orbitVisibility, onToggleOrbit, onToggleAllOrbits 
}: ObjectListProps) {
  
  const allVisible = !Object.values(orbitVisibility).some(v => v === false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Objects
        </span>
        <button 
          onClick={() => onToggleAllOrbits(!allVisible)}
          style={{ fontSize: '11px', color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '8px', border: 'none' }}
        >
          {allVisible ? "Hide Paths" : "Show Paths"}
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', paddingRight: '8px' }}>
        {SOLAR_SYSTEM_DATA.filter(d => !d.parent).map((data) => {
          const body = bodies.find(b => b.name === data.name);
          if (!body) return null;
          
          const isSelected = selectedObject?.name === body.name;
          const hexColor = '#' + new THREE.Color(data.color).getHexString();
          const children = SOLAR_SYSTEM_DATA.filter(d => d.parent === data.name);
          
          return (
            <div key={data.name}>
              <div 
                onClick={() => onSelect(body)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: '12px', cursor: 'pointer',
                  background: isSelected ? 'rgba(255,255,255,0.15)' : 'transparent',
                  transition: 'background 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '10px', height: '10px', borderRadius: '50%', backgroundColor: hexColor,
                    boxShadow: `0 0 8px ${hexColor}80`
                  }} />
                  <span style={{ fontSize: '14px', color: isSelected ? '#fff' : 'rgba(255,255,255,0.8)', fontWeight: isSelected ? 500 : 400 }}>
                    {data.name}
                  </span>
                </div>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleOrbit(data.name, true); }}
                  style={{ opacity: isSelected ? 1 : 0.5, border: 'none', background: 'transparent', color: '#fff' }}
                >
                  {orbitVisibility[data.name] !== false ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  )}
                </button>
              </div>
              
              {/* Children (Moons) */}
              {children.map(childData => {
                const childBody = bodies.find(b => b.name === childData.name);
                if (!childBody) return null;
                const isChildSelected = selectedObject?.name === childBody.name;
                const childHexColor = '#' + new THREE.Color(childData.color).getHexString();
                
                return (
                  <div 
                    key={childData.name}
                    onClick={() => onSelect(childBody)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 12px 6px 34px', borderRadius: '12px', cursor: 'pointer',
                      background: isChildSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                      marginTop: '2px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ 
                        width: '6px', height: '6px', borderRadius: '50%', backgroundColor: childHexColor,
                        opacity: 0.8
                      }} />
                      <span style={{ fontSize: '12px', color: isChildSelected ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                        {childData.name}
                      </span>
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); onToggleOrbit(childData.name); }}
                      style={{ opacity: isChildSelected ? 1 : 0.3, border: 'none', background: 'transparent', color: '#fff', transform: 'scale(0.8)' }}
                    >
                      {orbitVisibility[childData.name] !== false ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
});
