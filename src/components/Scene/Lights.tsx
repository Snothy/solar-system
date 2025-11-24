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
      />
    </>
  );
}
