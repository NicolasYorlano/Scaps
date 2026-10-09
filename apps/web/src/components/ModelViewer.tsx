import {Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type KeyboardEvent} from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {Box3, MathUtils, NeutralToneMapping, OrthographicCamera, PMREMGenerator, Sphere, Vector4, WebGLRenderer, type DirectionalLight, type Group, type Mesh, type MeshStandardMaterial, type Scene} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
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

/** Desde dónde mira la cámara, en grados. azimuth 0: la visera de frente. elevation: sobre el horizonte. */
interface ViewAngle {
  azimuth: number;
  elevation: number;
}

// La receta de las fotos de producto (docs/glb/URLs_R2.md): con la misma, el 3D abre igual a la portada.
const FOV = 30;
// En radios del modelo, que se escala a una esfera de radio 1.
const DISTANCE = 3.6;
const COVER_ANGLE: ViewAngle = { azimuth: 45, elevation: 20 };

// Relleno desde abajo: deja ver la gorra por dentro sin cambiar lo que se ve desde arriba.
const FILL_INTENSITY = 4;
// Cuánto tiene que verse el lado de abajo (luminancia mediana, de 0 a 1) y hasta cuánto se sube el relleno para llegar.
const FILL_TARGET = 0.025;
const FILL_MAX_BOOST = 4;
// Lado, en px, del cuadro con el que se mide.
const METER_SIZE = 32;

const MAX_ANISOTROPY = 8;
const TEXTURE_SLOTS = ['map', 'normalMap', 'aoMap', 'roughnessMap', 'metalnessMap'] as const;

// Cuánto se espera a que el navegador devuelva el contexto WebGL antes de dar el 3D por caído.
const CONTEXT_GRACE_MS = 3000;

// Un toque de flecha rota 15°.
const KEY_STEP = Math.PI / 12;
// Sin llegar a los polos: ahí la cámara se da vuelta.
const POLAR_MARGIN = 0.1;

function cameraPosition({ azimuth, elevation }: ViewAngle, distance: number): [number, number, number] {
  const az = MathUtils.degToRad(azimuth);
  const el = MathUtils.degToRad(elevation);
  return [distance * Math.cos(el) * Math.sin(az), distance * Math.sin(el), distance * Math.cos(el) * Math.cos(az)];
}

const toLinear = (channel: number) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

/** Luminancia mediana del modelo visto desde abajo, ya con el tone mapping: lo que va a ver el usuario. */
function measureUnderside(gl: WebGLRenderer, scene: Scene): number {
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.set(0, -4, 0);
  camera.up.set(0, 0, 1);
  camera.lookAt(0, 0, 0);

  // Un cuadro chico en una esquina del canvas; después se borra y se deja todo como estaba.
  const viewport = gl.getViewport(new Vector4());
  const scissor = gl.getScissor(new Vector4());
  gl.setViewport(0, 0, METER_SIZE, METER_SIZE);
  gl.setScissor(0, 0, METER_SIZE, METER_SIZE);
  gl.setScissorTest(true);
  gl.render(scene, camera);
  const side = Math.round(METER_SIZE * gl.getPixelRatio());
  const pixels = new Uint8Array(side * side * 4);
  const context = gl.getContext();
  context.readPixels(0, 0, side, side, context.RGBA, context.UNSIGNED_BYTE, pixels);
  gl.clear();
  gl.setScissorTest(false);
  gl.setScissor(scissor);
  gl.setViewport(viewport);

  const luminances: number[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    // Solo donde hay modelo: el fondo es transparente.
    if (pixels[i + 3] > 200) {
      luminances.push(0.2126 * toLinear(pixels[i]) + 0.7152 * toLinear(pixels[i + 1]) + 0.0722 * toLinear(pixels[i + 2]));
    }
  }
  luminances.sort((a, b) => a - b);
  return luminances.length > 0 ? luminances[luminances.length >> 1] : 1;
}

/** La luz de estudio y el tone mapping de las fotos. El entorno se genera en el momento, sin bajar nada. */
function StudioEnvironment() {
  const gl = useThree((state) => state.gl);
  const get = useThree((state) => state.get);

  const environment = useMemo(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    room.dispose();
    pmrem.dispose();
    return target;
  }, [gl]);

  useLayoutEffect(() => {
    const state = get();
    // R3F arranca en ACES, que agrisa los colores. Va acá y no en onCreated, que con el modelo en caché llega después de medir el relleno.
    state.gl.toneMapping = NeutralToneMapping;
    state.invalidate();
    return () => environment.dispose();
  }, [environment, get]);

  return <primitive object={environment.texture} attach="environment" />;
}

function Studio({ onContextLost }: { onContextLost: () => void }) {
  const gl = useThree((state) => state.gl);
  // El entorno vive en la GPU: cada vez que vuelve el contexto WebGL hay que generarlo de nuevo.
  const [restores, setRestores] = useState(0);
  const notifyLost = useRef(onContextLost);

  useEffect(() => {
    notifyLost.current = onContextLost;
  }, [onContextLost]);

  useEffect(() => {
    const canvas = gl.domElement;
    let timer = 0;

    const giveUp = () => {
      // Con la pestaña oculta el navegador no devuelve el contexto: se sigue esperando.
      if (document.hidden) timer = window.setTimeout(giveUp, CONTEXT_GRACE_MS);
      else if (gl.getContext().isContextLost()) notifyLost.current();
    };
    const handleLost = () => {
      timer = window.setTimeout(giveUp, CONTEXT_GRACE_MS);
    };
    const handleRestored = () => {
      window.clearTimeout(timer);
      setRestores((count) => count + 1);
    };

    canvas.addEventListener('webglcontextlost', handleLost);
    canvas.addEventListener('webglcontextrestored', handleRestored);
    return () => {
      window.clearTimeout(timer);
      canvas.removeEventListener('webglcontextlost', handleLost);
      canvas.removeEventListener('webglcontextrestored', handleRestored);
    };
  }, [gl]);

  return <StudioEnvironment key={restores} />;
}

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
  const gl = useThree((state) => state.gl);
  const group = useRef<Group>(null);

  // Como en las fotos: centrado y a escala de una esfera de radio 1.
  const fit = useMemo(() => {
    const sphere = new Box3().setFromObject(scene, true).getBoundingSphere(new Sphere());
    return { scale: 1 / sphere.radius, offset: sphere.center.negate() };
  }, [scene]);

  useLayoutEffect(() => {
    // Sin esto, costuras y bordados salen blandos cuando la tela se ve de costado.
    const anisotropy = Math.min(MAX_ANISOTROPY, gl.capabilities.getMaxAnisotropy());
    group.current?.traverse((object) => {
      const material = (object as Mesh).material as MeshStandardMaterial | undefined;
      if (!material) return;
      for (const slot of TEXTURE_SLOTS) {
        const texture = material[slot];
        if (texture && texture.anisotropy !== anisotropy) {
          texture.anisotropy = anisotropy;
          texture.needsUpdate = true;
        }
      }
    });
  }, [gl, scene]);

  // El encuadre va en grupos: el scene queda cacheado entre aperturas y no se le toca nada.
  return (
    <group ref={group} scale={fit.scale}>
      <group position={fit.offset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

/** El relleno desde abajo. Mide cada modelo y, si es oscuro, lo sube: una gorra negra también se ve por dentro. */
function InteriorFill({ url }: { url: string }) {
  const get = useThree((state) => state.get);
  const light = useRef<DirectionalLight>(null);

  useLayoutEffect(() => {
    if (!light.current) return;
    const { gl, scene, invalidate } = get();

    light.current.intensity = FILL_INTENSITY;
    const median = measureUnderside(gl, scene);
    // En lo oscuro el tone mapping es cuadrático: para verse k veces más claro hace falta raíz de k de luz.
    const boost = MathUtils.clamp(Math.sqrt(FILL_TARGET / Math.max(median, 1e-5)), 1, FILL_MAX_BOOST);
    light.current.intensity = FILL_INTENSITY * boost;
    invalidate();
  }, [get, url]);

  return <directionalLight ref={light} position={[0, -1, 0]} intensity={FILL_INTENSITY} />;
}

// Se monta recién cuando el Suspense resuelve: ahí el modelo ya está en la escena.
function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
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
  /** Desde dónde abre la cámara. Por defecto, el ángulo de la foto de portada. */
  angle?: ViewAngle;
  /** Aire alrededor del modelo: 1 es el encuadre de las fotos de producto; más grande lo aleja. */
  margin?: number;
}

export default function ModelViewer({url, className, label = 'Modelo 3D', onProgress, onError, onReady, angle = COVER_ANGLE, margin = 1}: ModelViewerProps) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  // A dónde tiene que llegar el giro del teclado: los toques seguidos se suman acá.
  const keyGoal = useRef<{ azimuth: number; polar: number } | null>(null);

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

    // Con la tecla mantenida el giro sale parejo desde donde está; los toques sueltos parten de la meta anterior.
    const goal = (!event.repeat && keyGoal.current) || { azimuth: controls.getAzimuthalAngle(), polar: controls.getPolarAngle() };

    // Mismo sentido que arrastrar hacia ese lado.
    if (event.key === 'ArrowLeft') goal.azimuth += KEY_STEP;
    else if (event.key === 'ArrowRight') goal.azimuth -= KEY_STEP;
    else if (event.key === 'ArrowUp') goal.polar = Math.min(Math.PI - POLAR_MARGIN, goal.polar + KEY_STEP);
    else if (event.key === 'ArrowDown') goal.polar = Math.max(POLAR_MARGIN, goal.polar - KEY_STEP);
    else return;

    keyGoal.current = goal;
    controls.setAzimuthalAngle(goal.azimuth);
    controls.setPolarAngle(goal.polar);
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
      style={{ width: '100%', height: '100%' }}
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
          camera={{ position: cameraPosition(angle, DISTANCE * margin), fov: FOV, near: 0.1, far: 100 }}
        >
          <Studio onContextLost={() => onError?.(new Error('WebGL context lost'))} />
          <Suspense fallback={null}>
            <Modelo url={url} />
            <InteriorFill url={url} />
            <Ready onReady={onReady} />
          </Suspense>
          {/* Un arrastre deja vieja la meta del teclado. */}
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableZoom={false}
            enablePan={false}
            onStart={() => {
              keyGoal.current = null;
            }}
          />
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
