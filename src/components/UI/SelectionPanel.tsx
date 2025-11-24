import type { PhysicsBody } from '../../types';
import styles from './SelectionPanel.module.css';

interface SelectionPanelProps {
  selectedObject: PhysicsBody | null;
  onFocusCamera: () => void;
  onUnfocusCamera: () => void;
}

export function SelectionPanel({
  selectedObject,
  onFocusCamera,
  onUnfocusCamera
}: SelectionPanelProps) {
  if (!selectedObject) return null;
  
  return (
    <div className={styles.selectionPanel}>
      <div className={styles.sectionTitle}>Selected Object</div>
      <h3 className={styles.selectedName}>{selectedObject.name}</h3>
      <div className={styles.buttonGrid}>
        <button onClick={onFocusCamera}>Focus Cam</button>
        <button onClick={onUnfocusCamera}>Free Cam</button>
      </div>
    </div>
  );
}
