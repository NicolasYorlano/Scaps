// three dibuja con WebGL 2: sin él, el visor 3D no puede arrancar.

let supported: boolean | null = null;

/** Se prueba una sola vez: cada prueba crea un contexto, y el navegador tiene un tope. */
export function supportsWebGL(): boolean {
  if (supported === null) {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      supported = gl !== null;
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      supported = false;
    }
  }

  return supported;
}
