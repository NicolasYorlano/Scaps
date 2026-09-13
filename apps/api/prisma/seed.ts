import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Mismo costo que auth.service.ts (SALT_ROUNDS = 10): si ahí cambia, cambiar
// también acá para que el hash del seed sea comparable con el de un registro real.
const SALT_ROUNDS = 10;

// Ver docs/glb/URLs_R2.md — la URL de cada archivo es esta base + "/" + el nombre.
const R2_BASE = 'https://pub-6128219e47234ffb824474fa3df9636d.r2.dev';

const prisma = new PrismaClient();

// Ángulo de cámara → texto de alt, en el mismo orden en que aparecen en
// docs/glb/URLs_R2.md (ese orden es el de la galería; el primero es la portada).
const ANGULOS: Record<string, string> = {
  'tres-cuartos': 'vista de tres cuartos',
  frente: 'vista de frente',
  costado: 'vista de costado',
  atras: 'vista de atrás',
  arriba: 'vista desde arriba',
};

interface ProductoSeed {
  slug: string;
  nombre: string;
  descripcion: string;
  precio: string; // Decimal de Prisma: se pasa como string para no perder precisión.
  stock: number;
  destacado: boolean;
  glb: string;
  imagenes: string[]; // nombres de archivo en docs/glb/URLs_R2.md, portada primero.
}

// Catálogo ficticio: un producto por modelo .glb comprimido en docs/glb/comprimidos.
// Precio y stock son de prueba, no vienen de ningún dato real.
const PRODUCTOS: ProductoSeed[] = [
  {
    slug: 'cap-danlyvostok',
    nombre: 'Gorra Danlyvostok',
    descripcion:
      'Gorra de corte clásico con visor curvo, pensada para uso diario. ' +
      'Modelo 3D liviano (baja cantidad de triángulos), ideal para ver el visor ' +
      'girando sin esfuerzo en cualquier dispositivo.',
    precio: '24999.00',
    stock: 40,
    destacado: true,
    glb: 'cap-danlyvostok.glb',
    imagenes: [
      'cap-danlyvostok-tres-cuartos.webp',
      'cap-danlyvostok-frente.webp',
      'cap-danlyvostok-costado.webp',
      'cap-danlyvostok-atras.webp',
      'cap-danlyvostok-arriba.webp',
    ],
  },
  {
    slug: 'cap-filipmatlak-negra',
    nombre: 'Gorra Filipmatlak Negra',
    descripcion:
      'Versión negra del modelo Filipmatlak, con panel frontal estructurado ' +
      'y cierre trasero ajustable. Terminación mate.',
    precio: '22499.00',
    stock: 35,
    destacado: false,
    glb: 'cap-filipmatlak-negra.glb',
    imagenes: [
      'cap-filipmatlak-negra-tres-cuartos.webp',
      'cap-filipmatlak-negra-frente.webp',
      'cap-filipmatlak-negra-costado.webp',
      'cap-filipmatlak-negra-atras.webp',
      'cap-filipmatlak-negra-arriba.webp',
    ],
  },
  {
    slug: 'cap-filipmatlak-oliva',
    nombre: 'Gorra Filipmatlak Oliva',
    descripcion:
      'Mismo corte que la Filipmatlak Negra, en verde oliva. Buena opción ' +
      'para combinar con ropa de tonos neutros.',
    precio: '22499.00',
    stock: 35,
    destacado: false,
    glb: 'cap-filipmatlak-oliva.glb',
    imagenes: [
      'cap-filipmatlak-oliva-tres-cuartos.webp',
      'cap-filipmatlak-oliva-frente.webp',
      'cap-filipmatlak-oliva-costado.webp',
      'cap-filipmatlak-oliva-atras.webp',
      'cap-filipmatlak-oliva-arriba.webp',
    ],
  },
  {
    slug: 'cap-vanarsdale',
    nombre: 'Gorra Vanarsdale',
    descripcion:
      'Modelo de copa más alta, con curvatura de visor más pronunciada. ' +
      'Pensado para quienes buscan un perfil más marcado que el corte clásico.',
    precio: '26999.00',
    stock: 25,
    destacado: false,
    glb: 'cap-vanarsdale.glb',
    imagenes: [
      'cap-vanarsdale-tres-cuartos.webp',
      'cap-vanarsdale-frente.webp',
      'cap-vanarsdale-costado.webp',
      'cap-vanarsdale-atras.webp',
      'cap-vanarsdale-arriba.webp',
    ],
  },
];

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Faltan ADMIN_EMAIL / ADMIN_PASSWORD en el entorno. Definilas antes de ' +
        'correr el seed (nunca hardcodeadas: ver .env.example).',
    );
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  // Upsert (update-insert) por email: en una bd vacía crea el admin, si ya existe 
  // (segunda corrida) lo deja con el mismo hash y es_admin en vez de duplicarlo.
  // A propósito re-sincroniza el hash con el ADMIN_PASSWORD actual del entorno
  // en cada corrida.  
  const admin = await prisma.usuario.upsert({
    where: { email },
    update: { password: hash, es_admin: true },
    create: {
      email,
      password: hash,
      nombre: 'Admin',
      apellido: 'Scaps',
      es_admin: true,
    },
  });

  console.log(`Admin listo: ${admin.email}`);
}

async function seedProductos() {
  for (const p of PRODUCTOS) {
    const producto = await prisma.producto.upsert({
      where: { slug: p.slug },
      update: {
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        stock: p.stock,
        destacado: p.destacado,
        glb_url: `${R2_BASE}/${p.glb}`,
        activo: true,
      },
      create: {
        slug: p.slug,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        stock: p.stock,
        destacado: p.destacado,
        glb_url: `${R2_BASE}/${p.glb}`,
      },
    });

    // ProductoImagen no tiene una clave única propia (no hay como "upsertear"
    // una fila puntual), para que la segunda corrida no duplique
    // imágenes se borran las del producto y se recrean iguales. Al ir todo
    // dentro de una transacción, si createMany falla no queda el producto sin
    // ninguna imagen.
    await prisma.$transaction([
      prisma.productoImagen.deleteMany({ where: { producto_id: producto.id } }),
      prisma.productoImagen.createMany({
        data: p.imagenes.map((archivo, indice) => {
          const angulo = archivo
            .replace(`${p.slug}-`, '')
            .replace('.webp', '');
          return {
            producto_id: producto.id,
            url: `${R2_BASE}/${archivo}`,
            orden: indice,
            alt: `${p.nombre} — ${ANGULOS[angulo] ?? angulo}`,
            es_principal: indice === 0, // la primera del listado es la portada.
          };
        }),
      }),
    ]);

    console.log(`Producto listo: ${producto.slug} (${p.imagenes.length} imágenes)`);
  }
}

async function main() {
  await seedAdmin();
  await seedProductos();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
