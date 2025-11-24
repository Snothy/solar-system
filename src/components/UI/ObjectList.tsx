import * as THREE from 'three';
import { SOLAR_SYSTEM_DATA } from '../../data/solarSystem';
import type { PhysicsBody } from '../../types';
import styles from './ObjectList.module.css';

interface ObjectListProps {
  bodies: PhysicsBody[];
  selectedObject: PhysicsBody | null;
  onSelect: (body: PhysicsBody) => void;
}

export function ObjectList({ bodies, selectedObject, onSelect }: ObjectListProps) {
  return (
    <>
      <div className={styles.sectionTitle}>Celestial Objects</div>
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
                  </li>
                );
              })}
            </div>
          );
        })}
      </ul>
    </>
  );
}
