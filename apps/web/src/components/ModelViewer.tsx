import {Suspense, useEffect, useRef, useState, type ComponentRef, type KeyboardEvent} from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import {Bounds, Center, Html, OrbitControls, useProgress} from '@react-three/drei';
import { WebGLRenderer } from 'three';
import { DRACOLoader, GLTFLoader } from 'three-stdlib';
import ErrorBoundary from './ErrorBoundary';

// Servimos el decoder de Draco nosotros mismos (apps/web/public/draco) en vez
// de dejar que se baje del CDN de Google por defecto.
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
// Se pide ya: baja mientras llega el modelo, no después.
dracoLoader.preload();

// Avance en bytes de cada descarga, por URL: sobrevive a que el visor se desmonte a mitad de carga.
// useProgress de drei no sirve para esto: cuenta archivos, y con un solo .glb marca 0 hasta el final.
const downloaded = new Map<string, number>();
const downloadListeners = new Map<string, (percent: number) => void>();

function trackDownload(url: string) {
  return (event: ProgressEvent) => {
    // Sin Content-Length no hay total contra el que medir.
    if (!event.lengthComputable) return;
    const percent = Math.round((event.loaded / event.total) * 100);
    downloaded.set(url, percent);
    downloadListeners.get(url)?.(percent);
  };
}

// Un toque de flecha rota 15°.
const KEY_STEP = Math.PI / 12;
// Sin llegar a los polos: ahí la cámara se da vuelta.
const POLAR_MARGIN = 0.1;

interface ModeloProps {
  url: string;
}

function Modelo({ url }: ModeloProps) {
  // useLoader y no useGLTF de drei, que no deja pasar el avance de la descarga.
  const { scene } = useLoader(
    GLTFLoader,
    url,
    (loader) => {
      loader.setDRACOLoader(dracoLoader);
    },
    trackDownload(url),
  );
  return <primitive object={scene} />;
}

// Se monta recién cuando el Suspense resuelve: ahí el modelo ya está en la escena.
function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
}

function Loader() {
  const { progress } = useProgress();
  // Gris de anotación: se lee sobre el blanco de la ficha y sobre el fondo oscuro de la landing.
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-scaps-text-annotation">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-scaps-text-annotation/30 border-t-scaps-text-annotation" />
        <span className="text-sm tabular-nums">{Math.round(progress)}%</span>
      </div>
    </Html>
  );
}

interface ModelViewerProps {
  /** URL del archivo .glb a mostrar */
  url: string;
  /** El Canvas ocupa 100% de ancho/alto: el contenedor donde se use ModelViewer necesita una altura definida, o el canvas mide cero y no se ve nada (sin error en consola). */
  className?: string;
  /** Cómo lo nombra un lector de pantalla, por ejemplo "Modelo 3D de Gorra Trucker". */
  label?: string;
  /** Avance de la descarga del .glb, de 0 a 100. Pasarla estable. Sin tamaño informado por el servidor, no se llama. */
  onProgress?: (percent: number) => void;
  /** Se llama si el .glb no puede cargarse, para que cada pantalla decida qué mostrar en su lugar */
  onError?: (error: Error) => void;
  /** Se llama cuando el modelo ya se ve. Pasarla estable (useCallback): si cambia, se vuelve a llamar. */
  onReady?: () => void;
  /** Aire alrededor del modelo al encuadrarlo: 1 lo deja justo, más grande lo achica. Por defecto 1.2, el de drei. */
  margin?: number;
}

export default function ModelViewer({url, className, onError, onReady, margin = 1.2}: ModelViewerProps) {
export default function ModelViewer({url, className, label = 'Modelo 3D', onProgress, onError, onReady}: ModelViewerProps) {
  const [entered, setEntered] = useState(false);
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!onProgress) return;
    // Una descarga que ya venía en curso: se arranca con lo que lleva.
    const known = downloaded.get(url);
    if (known !== undefined) onProgress(known);

    downloadListeners.set(url, onProgress);
    return () => {
      if (downloadListeners.get(url) === onProgress) downloadListeners.delete(url);
    };
  }, [url, onProgress]);

  function handleKeyDown(event: KeyboardEvent) {
    const controls = controlsRef.current;
    if (!controls) return;

    // Mismo sentido que arrastrar hacia ese lado.
    if (event.key === 'ArrowLeft') controls.setAzimuthalAngle(controls.getAzimuthalAngle() + KEY_STEP);
    else if (event.key === 'ArrowRight') controls.setAzimuthalAngle(controls.getAzimuthalAngle() - KEY_STEP);
    else if (event.key === 'ArrowUp') controls.setPolarAngle(Math.min(Math.PI - POLAR_MARGIN, controls.getPolarAngle() + KEY_STEP));
    else if (event.key === 'ArrowDown') controls.setPolarAngle(Math.max(POLAR_MARGIN, controls.getPolarAngle() - KEY_STEP));
    else return;

    // Con el foco en el visor, las flechas rotan el modelo en vez de mover la página.
    event.preventDefault();
  }

  return (
    <div
      role="img"
      aria-label={`${label}. Usá las flechas para rotarlo.`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        opacity: entered ? 1 : 0,
        transform: entered ? 'scale(1)' : 'scale(0.96)',
        transition: reducedMotion ? 'none' : 'opacity 400ms ease-out, transform 400ms ease-out',
      }}
    >
      {/* Afuera del Canvas: R3F relanza hacia el árbol de React cualquier error de la escena. */}
      <ErrorBoundary
        key={url}
        onError={(error) => {
          // El fallo queda cacheado: sin esto, reintentar falla al instante sin volver a pedir el .glb.
          useLoader.clear(GLTFLoader, url);
          downloaded.delete(url);
          onError?.(error);
        }}
      >
        {/* offsetSize: mide sin el scale() de la entrada; si no, el canvas queda al 96 % hasta el primer scroll. */}
        <Canvas
          frameloop="demand"
          // Si el navegador no entrega WebGL, R3F pierde el error en una promesa: acá se avisa.
          gl={(defaults) => {
            try {
              return new WebGLRenderer(defaults);
            } catch (error) {
              onError?.(error as Error);
              throw error;
            }
          }}
          resize={{ offsetSize: true }}
          camera={{ position: [0.39, 0.13, 0.5], fov: 55 }}
        >
          {/* Luces declaradas acá y no con <Environment>/<Stage>, que bajan su iluminación de un CDN.
              Solo direccionales y de relleno: no dependen de la escala, y los modelos vienen de autores distintos y miden distinto. */}
          {/* Relleno: cielo claro arriba, suelo gris claro abajo; ninguna cara queda negra. */}
          <hemisphereLight args={['#ffffff', '#b5b5b5', 1.2]} />
          {/* Principal: de frente, arriba y a la derecha, del lado de la cámara. */}
          <directionalLight position={[3, 5, 4]} intensity={2} />
          {/* Relleno lateral: aclara el lado izquierdo, que la principal deja en sombra. */}
          <directionalLight position={[-4, 2, 3]} intensity={0.8} />
          {/* Contorno desde atrás, en diagonal desde los dos lados: dibuja un borde claro en la silueta,
              así una gorra negra se separa del fondo oscuro de la landing. */}
          <directionalLight position={[-4, 3, -4]} intensity={2} />
          <directionalLight position={[4, 3, -4]} intensity={2} />
          {/* Desde abajo y adelante: al rotar la gorra para verla por debajo, el interior y la visera no quedan en negro. */}
          <directionalLight position={[0, -5, 2]} intensity={1.2} />
          <Suspense fallback={<Loader />}>
            {/* Encuadre sin animar: animado, la cámara arranca adentro de los modelos grandes. No 0: drei divide por maxDuration. */}
            <Bounds fit clip observe margin={margin} maxDuration={0.001}>
              {/* Misma caja que mide Bounds: con la precisa, la cámara de los modelos grandes arranca desde otro ángulo. */}
              <Center precise={false}>
                <Modelo url={url} />
              </Center>
            </Bounds>
            <Ready onReady={onReady} />
          </Suspense>
          <OrbitControls ref={controlsRef} makeDefault enableZoom={false} enablePan={false} />
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
