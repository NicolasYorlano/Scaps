import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';

function Modelo() {
  const { scene } = useGLTF('/modelo.glb');
  return <primitive object={scene} />;
}

function Visor3D() {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#040404' }}>
      <Canvas camera={{ position: [0.4, 0.13, 0.5], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[0, 30, 0]} intensity={1} />
        <pointLight position={[1, -1.5, 0]} intensity={0.5} />
        <Suspense fallback={null}>
          <Modelo />
        </Suspense>
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}

export default Visor3D;
