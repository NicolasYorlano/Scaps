import { Canvas, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useRef, useState, useEffect, Suspense } from 'react'
import * as THREE from 'three'

const ANGULOS = {
  frente:      [0, 0, 4],
  tresCuartos: [2.8, 1, 2.8],
  costado:     [4, 0, 0],
  atras:       [0, 0, -4],
  arriba:      [0, 4, 0.5],
} as const

const ANGULO_PORTADA: keyof typeof ANGULOS = 'tresCuartos' // mismo ángulo en los 4 productos

const PRODUCTOS = ['cap-danlyvostok', 'cap-filipmatlak-negra', 'cap-filipmatlak-oliva', 'cap-vanarsdale']

const MAX_KB = 200

// Tamaño "de mundo" al que se normaliza CUALQUIER gorra, sin importar su
// escala real en el .glb. Esto es lo que faltaba: sin esto, cap-danlyvostok
// (bounding box ~48 unidades) se ve mucho más grande en cámara que
// cap-vanarsdale (~13 unidades), aunque la cámara esté a la misma distancia.
// Ajustá este valor si querés que la gorra ocupe más o menos frame (a mayor
// TARGET_SIZE, más "cerca" se ve con la misma distancia de cámara).
const TARGET_SIZE = 2.2

function Modelo({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const ref = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!ref.current) return

    // 1) bounding box del modelo tal cual viene del .glb (escala 1)
    const box = new THREE.Box3().setFromObject(ref.current)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    // 2) escala uniforme para que la dimensión más grande mida TARGET_SIZE
    const maxDim = Math.max(size.x, size.y, size.z)
    const escala = maxDim > 0 ? TARGET_SIZE / maxDim : 1

    // 3) centrar en el origen (el centro real del modelo, no su pivote)
    //    la posición se aplica en espacio del padre, por eso el centro
    //    original hay que escalarlo también
    ref.current.scale.setScalar(escala)
    ref.current.position.set(-center.x * escala, -center.y * escala, -center.z * escala)
  }, [scene])

  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  )
}

function CamaraFija({ angulo, onListo }: { angulo: keyof typeof ANGULOS; onListo: () => void }) {
  const { camera, gl } = useThree()
  useEffect(() => {
    camera.position.set(...ANGULOS[angulo])
    camera.lookAt(0, 0, 0)
    // esperar a que R3F efectivamente dibuje el frame nuevo antes de avisar
    // que está listo para capturar (si no, toBlob agarra el frame anterior)
    requestAnimationFrame(() => requestAnimationFrame(onListo))
  }, [angulo])
  return null
}

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

// intenta con calidad 0.9 y la va bajando hasta entrar en MAX_KB
function capturarConLimite(
  canvas: HTMLCanvasElement,
  nombre: string,
  calidad = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error(`${nombre}: toBlob devolvió null`))
        const kb = blob.size / 1024
        if (kb <= MAX_KB || calidad <= 0.3) {
          console.log(`${nombre}.webp: ${kb.toFixed(0)} KB (calidad ${calidad})`)
          resolve(blob)
        } else {
          capturarConLimite(canvas, nombre, calidad - 0.1).then(resolve, reject)
        }
      },
      'image/webp',
      calidad
    )
  })
}

export default function DevCapturas() {
  const [producto, setProducto] = useState(PRODUCTOS[0])
  const [angulo, setAngulo] = useState<keyof typeof ANGULOS>('frente')
  const [listo, setListo] = useState(true)
  const [corriendo, setCorriendo] = useState(false)

  async function capturarActual() {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const blob = await capturarConLimite(canvas, `${producto}-${angulo}`)
    descargar(blob, `${producto}-${angulo}.webp`)
  }

  // recorre los 5 ángulos para el producto actual, una captura por vez
  async function capturarTodosLosAngulos() {
    setCorriendo(true)
    for (const a of Object.keys(ANGULOS) as (keyof typeof ANGULOS)[]) {
      setAngulo(a)
      await new Promise<void>((r) => setTimeout(r, 300)) // margen para que cambie cámara + dibuje
      const canvas = document.querySelector('canvas')
      if (!canvas) continue
      const blob = await capturarConLimite(canvas, `${producto}-${a}`)
      descargar(blob, `${producto}-${a}.webp`)
    }
    setCorriendo(false)
  }

  return (
    <div>
      <div style={{ width: 1200, height: 1200 }}>
        <Canvas gl={{ preserveDrawingBuffer: true }} camera={{ fov: 35 }}>
          <color attach="background" args={['#ffffff']} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 5, 5]} intensity={1.2} />
          <CamaraFija angulo={angulo} onListo={() => setListo(true)} />
          <Suspense fallback={null}>
            <Modelo url={`/modelos/${producto}.glb`} />
          </Suspense>
        </Canvas>
      </div>

      <select value={producto} onChange={(e) => setProducto(e.target.value)}>
        {PRODUCTOS.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      <select value={angulo} onChange={(e) => setAngulo(e.target.value as any)}>
        {Object.keys(ANGULOS).map((a) => (
          <option key={a} value={a}>
            {a}{a === ANGULO_PORTADA ? ' (portada)' : ''}
          </option>
        ))}
      </select>

      <button onClick={capturarActual} disabled={corriendo}>
        Capturar este ángulo
      </button>

      <button onClick={capturarTodosLosAngulos} disabled={corriendo}>
        {corriendo ? 'Capturando...' : 'Capturar los 5 ángulos'}
      </button>
    </div>
  )
}
