export function Lights() {
  return (
    <>
      {/* Low ambient light to simulate dark space */}
      <ambientLight intensity={0.1} />
      
      {/* Point light at Sun's position (origin) with no decay for infinite reach */}
      <pointLight 
        position={[0, 0, 0]} 
        intensity={1.5} 
        distance={0} 
        decay={0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-camera-near={0.1}
        shadow-camera-far={200000}
      />
    </>
  );
}
