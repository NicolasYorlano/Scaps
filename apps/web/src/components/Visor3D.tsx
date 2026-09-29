import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF, useProgress } from '@react-three/drei';

// Servimos el decoder de Draco nosotros mismos (apps/web/public/draco) en vez
// de dejar que drei lo baje del CDN de Google por defecto.
useGLTF.setDecoderPath('/draco/');

// Cuánto más lejos que el "encuadre justo" ponemos la cámara, para no cortar
// el modelo al rotarlo: visto de punta, la diagonal de la caja es más ancha
// que su eje más largo (hasta ~35% más en los modelos que probamos).
const FRAME_MARGIN = 1.5;

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _triangle = new THREE.Triangle();
const _mid = new THREE.Vector3();

/**
 * Centro de superficie (ponderado por área de cada triángulo) y tamaño de la
 * caja envolvente, en espacio mundo. A diferencia del centro de la caja, el
 * centroide de superficie no se corre hacia una visera u otra parte que
 * sobresalga de un lado: sigue el volumen real de la malla, sea cual sea su
 * forma, así que el pivot de rotación queda igual de "centrado" en cualquier
 * modelo que se suba a futuro.
 */
function measureSurface(object: THREE.Object3D) {
  object.updateWorldMatrix(true, true);
  const centroidSum = new THREE.Vector3();
  let totalArea = 0;
  const box = new THREE.Box3();

  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const position = mesh.geometry.attributes.position;
    const index = mesh.geometry.index;
    const triCount = (index ? index.count : position.count) / 3;

    for (let i = 0; i < triCount; i++) {
      const ia = index ? index.getX(i * 3) : i * 3;
      const ib = index ? index.getX(i * 3 + 1) : i * 3 + 1;
      const ic = index ? index.getX(i * 3 + 2) : i * 3 + 2;
      _a.fromBufferAttribute(position, ia).applyMatrix4(mesh.matrixWorld);
      _b.fromBufferAttribute(position, ib).applyMatrix4(mesh.matrixWorld);
      _c.fromBufferAttribute(position, ic).applyMatrix4(mesh.matrixWorld);
      box.expandByPoint(_a);
      box.expandByPoint(_b);
      box.expandByPoint(_c);

      _triangle.set(_a, _b, _c);
      const area = _triangle.getArea();
      _triangle.getMidpoint(_mid);
      centroidSum.addScaledVector(_mid, area);
      totalArea += area;
    }
  });

  const centroid = totalArea > 0 ? centroidSum.divideScalar(totalArea) : centroidSum;
  const size = box.isEmpty() ? new THREE.Vector3(1, 1, 1) : box.getSize(new THREE.Vector3());
  return { centroid, maxSize: Math.max(size.x, size.y, size.z) };
}

function useModelMeasurements(url: string) {
  const { scene } = useGLTF(url);
  return useMemo(() => measureSurface(scene), [scene]);
}

interface ModeloProps {
  url: string;
}

function Modelo({ url }: ModeloProps) {
  const { scene } = useGLTF(url);
  const { centroid } = useModelMeasurements(url);
  return (
    <group position={[-centroid.x, -centroid.y, -centroid.z]}>
      <primitive object={scene} />
    </group>
  );
}

/** Aleja la cámara lo necesario para que el modelo entre, y apunta al centroide (0,0,0 ya que `Modelo` lo centró ahí). Se recalcula si cambia el tamaño del canvas, por ejemplo al girar el celular. */
function CameraFit({ url }: { url: string }) {
  const { maxSize } = useModelMeasurements(url);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const controls = useThree((state) => state.controls) as { target: THREE.Vector3; update: () => void } | null;
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  useLayoutEffect(() => {
    const aspect = width / height;
    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const fitHeightDistance = maxSize / (2 * Math.tan(fovRad / 2));
    const fitWidthDistance = fitHeightDistance / aspect;
    const distance = FRAME_MARGIN * Math.max(fitHeightDistance, fitWidthDistance);

    const direction = camera.position.lengthSq() > 0 ? camera.position.clone().normalize() : new THREE.Vector3(0, 0, 1);
    camera.position.copy(direction.multiplyScalar(distance));
    camera.updateProjectionMatrix();

    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [camera, controls, maxSize, width, height]);

  return null;
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <span className="text-sm tabular-nums">{Math.round(progress)}%</span>
      </div>
    </Html>
  );
}

interface ErrorBoundaryProps {
  onError?: (error: Error) => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface Visor3DProps {
  /** URL del archivo .glb a mostrar */
  url: string;
  /** El Canvas ocupa 100% de ancho/alto: el contenedor donde se use Visor3D necesita una altura definida, o el canvas mide cero y no se ve nada (sin error en consola). */
  className?: string;
  /** Se llama si el .glb no puede cargarse, para que cada pantalla decida qué mostrar en su lugar */
  onError?: (error: Error) => void;
}

function Visor3D({ url, className, onError }: Visor3DProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        opacity: entered ? 1 : 0,
        transform: entered ? 'scale(1)' : 'scale(0.96)',
        transition: 'opacity 400ms ease-out, transform 400ms ease-out',
      }}
    >
      <Canvas camera={{ position: [0.39, 0.13, 0.5], fov: 55 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[0, 30, 0]} intensity={1} />
        <pointLight position={[1, -1.5, 0]} intensity={0.5} />
        <ErrorBoundary key={url} onError={onError}>
          <Suspense fallback={<Loader />}>
            <Modelo url={url} />
            <CameraFit url={url} />
          </Suspense>
        </ErrorBoundary>
        <OrbitControls makeDefault enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}

export default Visor3D;
