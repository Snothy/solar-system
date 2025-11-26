import * as THREE from 'three';

interface OrbitalTrailProps {
  trail: THREE.Line;
  visible: boolean;
}

export function OrbitalTrail({ trail, visible }: OrbitalTrailProps) {
  return <primitive object={trail} visible={visible} frustumCulled={false} />;
}
