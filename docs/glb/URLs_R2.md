# URLs de R2 — Scaps

Base del bucket: `https://pub-6128219e47234ffb824474fa3df9636d.r2.dev`

La URL de cada archivo es la base + `/` + el nombre.

## Modelos 3D (`.glb`)

- cap-danlyvostok.glb
- cap-filipmatlak-negra.glb
- cap-filipmatlak-oliva.glb
- cap-vanarsdale.glb

`cap-danlyvostok` y `cap-vanarsdale` traían materiales *specular-glossiness*, que three no soporta (se ven blancos, sin textura). Se pasaron a metal/rough con `gltf-transform metalrough` antes de `draco`. Si se vuelven a comprimir desde `originales/`, repetir ese paso.

## Imágenes de producto

1200 × 1200, `.webp`. En cada producto, la primera es la portada (`es_principal`) y el orden de la lista es el de la galería.

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
