import {Component, Suspense, useEffect, useState, type ReactNode} from 'react';
import { Canvas } from '@react-three/fiber';
import {Bounds, Center, Html, OrbitControls, useGLTF, useProgress} from '@react-three/drei';

// Servimos el decoder de Draco nosotros mismos (apps/web/public/draco) en vez
// de dejar que drei lo baje del CDN de Google por defecto.
useGLTF.setDecoderPath('/draco/');

interface ModeloProps {
  url: string;
}

function Modelo({ url }: ModeloProps) {
  const { scene } = useGLTF(url);
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

interface ModelViewerProps {
  /** URL del archivo .glb a mostrar */
  url: string;
  /** El Canvas ocupa 100% de ancho/alto: el contenedor donde se use ModelViewer necesita una altura definida, o el canvas mide cero y no se ve nada (sin error en consola). */
  className?: string;
  /** Se llama si el .glb no puede cargarse, para que cada pantalla decida qué mostrar en su lugar */
  onError?: (error: Error) => void;
  /** Se llama cuando el modelo ya se ve. Pasarla estable (useCallback): si cambia, se vuelve a llamar. */
  onReady?: () => void;
  /** Aire alrededor del modelo al encuadrarlo: 1 lo deja justo, más grande lo achica. Por defecto 1.2, el de drei. */
  margin?: number;
}

export default function ModelViewer({url, className, onError, onReady, margin = 1.2}: ModelViewerProps) {
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
      {/* Afuera del Canvas: R3F relanza hacia el árbol de React cualquier error de la escena. */}
      <ErrorBoundary
        key={url}
        onError={(error) => {
          // El fallo queda cacheado: sin esto, reintentar falla al instante sin volver a pedir el .glb.
          useGLTF.clear(url);
          onError?.(error);
        }}
      >
        {/* offsetSize: mide sin el scale() de la entrada; si no, el canvas queda al 96 % hasta el primer scroll. */}
        <Canvas
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
          <OrbitControls makeDefault enableZoom={false} enablePan={false} />
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
