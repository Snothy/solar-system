import * as THREE from 'three';
import React from 'react';
import { SOLAR_SYSTEM_DATA } from '../../data/solarSystem';
import type { PhysicsBody } from '../../types';
import styles from './ObjectList.module.css';

interface ObjectListProps {
  bodies: PhysicsBody[];
  selectedObject: PhysicsBody | null;
  onSelect: (body: PhysicsBody) => void;
  orbitVisibility: Record<string, boolean>;
  onToggleOrbit: (name: string, includeChildren?: boolean) => void;
  onToggleAllOrbits: (visible: boolean) => void;
}

export const ObjectList = React.memo(function ObjectList({ 
  bodies, 
  selectedObject, 
  onSelect, 
  orbitVisibility, 
  onToggleOrbit,
  onToggleAllOrbits 
}: ObjectListProps) {
  
  // Check if all are visible (heuristic: if any is explicitly false, then not all visible)
  const allVisible = !Object.values(orbitVisibility).some(v => v === false);

  return (
    <>
      <div className={styles.sectionTitle}>
        <span>Celestial Objects</span>
        <button 
          className={styles.headerToggle}
          onClick={() => onToggleAllOrbits(!allVisible)}
          title={allVisible ? "Hide All Orbits" : "Show All Orbits"}
        >
          {allVisible ? "Hide Orbits" : "Show Orbits"}
        </button>
      </div>
      <ul className={styles.objectList}>
        {SOLAR_SYSTEM_DATA.filter(d => !d.parent).map((data) => {
          const body = bodies.find(b => b.name === data.name);
          if (!body) return null;
          
          const isSelected = selectedObject?.name === body.name;
          const hexColor = '#' + new THREE.Color(data.color).getHexString();
          
          // Find children (moons)
          const children = SOLAR_SYSTEM_DATA.filter(d => d.parent === data.name);
          
          return (
            <div key={data.name}>
              <li
                className={`${styles.objectItem} ${isSelected ? styles.selected : ''}`}
              >
                <div 
                  className={styles.objectItemContent}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => onSelect(body)}
                >
                  <div 
                    className={styles.objIcon} 
                    style={{ 
                      backgroundColor: hexColor,
                      boxShadow: `0 0 8px ${hexColor}80`
                    }}
                  />
                  <div className={styles.objInfo}>
                    <span className={styles.objName}>{data.name}</span>
                    <span className={styles.objDetail}>
                      {data.type === 'star' ? 'Star' : 'Planet'}
                    </span>
                  </div>
                </div>
                
                <button 
                  className={styles.toggleBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleOrbit(data.name, true);
                  }}
                  title="Toggle Orbit (and moons)"
                >
                  {orbitVisibility[data.name] !== false ? '👁️' : '✕'}
                </button>
              </li>
              
              {/* Render Moons */}
              {children.map(childData => {
                const childBody = bodies.find(b => b.name === childData.name);
                if (!childBody) return null;
                
                const isChildSelected = selectedObject?.name === childBody.name;
                const childHexColor = '#' + new THREE.Color(childData.color).getHexString();
                
                return (
                  <li
                    key={childData.name}
                    className={`${styles.objectItem} ${isChildSelected ? styles.selected : ''}`}
                    style={{ paddingLeft: '2rem', borderLeft: '2px solid rgba(255,255,255,0.05)' }}
                  >
                    <div 
                      style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => onSelect(childBody)}
                    >
                      <div 
                        className={styles.objIcon} 
                        style={{ 
                          backgroundColor: childHexColor,
                          boxShadow: `0 0 5px ${childHexColor}60`,
                          width: '8px',
                          height: '8px'
                        }}
                      />
                      <div className={styles.objInfo}>
                        <span className={styles.objName} style={{ fontSize: '0.9rem' }}>{childData.name}</span>
                        <span className={styles.objDetail} style={{ fontSize: '0.7rem' }}>Moon</span>
                      </div>
                    </div>

                    <button 
                      className={styles.toggleBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleOrbit(childData.name);
                      }}
                      title="Toggle Orbit"
                    >
                      {orbitVisibility[childData.name] !== false ? '👁️' : '✕'}
                    </button>
                  </li>
                );
              })}
            </div>
          );
        })}
      </ul>
    </>
  );
});
