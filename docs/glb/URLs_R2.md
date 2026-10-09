# URLs de R2 — Scaps

Base del bucket: `https://pub-6128219e47234ffb824474fa3df9636d.r2.dev`

La URL de cada archivo es la base + `/` + el nombre.

## Modelos 3D (`.glb`)

- cap-danlyvostok.glb
- cap-filipmatlak-negra.glb
- cap-filipmatlak-oliva.glb
- cap-vanarsdale.glb

`cap-danlyvostok` y `cap-vanarsdale` traían materiales *specular-glossiness*, que three no soporta (se ven blancos, sin textura). Se pasaron a metal/rough con `gltf-transform metalrough` antes de `draco`. Si se vuelven a comprimir desde `originales/`, repetir ese paso.

`cap-filipmatlak-negra` miraba hacia +X y las otras tres hacia +Z, así que en el visor abría de costado. Al comprimido se le sumó un nodo raíz (`Scaps_orientation`) con −90° sobre Y; no cambia la geometría ni las texturas. Si se vuelve a comprimir desde `originales/`, repetir ese paso.

`cap-vanarsdale` pesaba 4,2 MB, casi todo en texturas PNG y JPEG. Se pasaron a WebP con calidad 90 (`EXT_texture_webp`), sin tocar la malla: quedó en 0,9 MB y se ve igual. Se repite con `gltf-transform webp --quality 90`. Si se vuelve a comprimir desde `originales/`, repetir ese paso.

## Imágenes de producto

1200 × 1200, `.webp`. En cada producto, la primera es la portada (`es_principal`) y el orden de la lista es el de la galería.

Son renders de los `.glb`. El visor (`apps/web/src/components/ModelViewer.tsx`) usa la misma luz y la misma cámara, así que el 3D abre igual a la portada. Si esa receta cambia, hay que regenerar las fotos.

- **Luz:** `RoomEnvironment` de three como entorno (`PMREMGenerator.fromScene(room, 0.04)`), sin luces sueltas.
- **Tone mapping:** `NeutralToneMapping`.
- **Cámara:** FOV 30°, a 3,6 radios del modelo, centrado y escalado a una esfera de radio 1.
- **Fondo:** blanco puro: la app lo multiplica contra el fondo de la caja (`bg-scaps-photo`) y así toma su color.
- **Ángulos**, como azimut / elevación (azimut 0 = la visera de frente): tres-cuartos 45° / 20° · frente 0° / 10° · costado 90° / 10° · atrás 180° / 10° · arriba 0° / 65°.

El visor suma una luz desde abajo para ver la gorra por dentro; a los ángulos de las fotos casi no cambia.

### cap-danlyvostok

- cap-danlyvostok-tres-cuartos.webp
- cap-danlyvostok-frente.webp
- cap-danlyvostok-costado.webp
- cap-danlyvostok-atras.webp
- cap-danlyvostok-arriba.webp

### cap-filipmatlak-negra

- cap-filipmatlak-negra-tres-cuartos.webp
- cap-filipmatlak-negra-frente.webp
- cap-filipmatlak-negra-costado.webp
- cap-filipmatlak-negra-atras.webp
- cap-filipmatlak-negra-arriba.webp

### cap-filipmatlak-oliva

- cap-filipmatlak-oliva-tres-cuartos.webp
- cap-filipmatlak-oliva-frente.webp
- cap-filipmatlak-oliva-costado.webp
- cap-filipmatlak-oliva-atras.webp
- cap-filipmatlak-oliva-arriba.webp

### cap-vanarsdale

- cap-vanarsdale-tres-cuartos.webp
- cap-vanarsdale-frente.webp
- cap-vanarsdale-costado.webp
- cap-vanarsdale-atras.webp
- cap-vanarsdale-arriba.webp
