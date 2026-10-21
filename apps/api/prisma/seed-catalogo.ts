import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';

// Llena el catálogo con copias de los productos de demo de seed.ts, para probar
// la grilla, la paginación y los filtros con más de 4 productos. Cada copia
// toma al azar el .glb y las imágenes de uno de los originales, con otro precio
// y otro stock. Solo para tu base de desarrollo: nunca contra scaps-prod.
//
//   npx ts-node prisma/seed-catalogo.ts            crea (o re-sortea) 30 copias
//   npx ts-node prisma/seed-catalogo.ts 50         crea 50
//   npx ts-node prisma/seed-catalogo.ts --borrar   borra las copias

const CANTIDAD_POR_DEFECTO = 30;

// Las copias se reconocen por este tramo del slug: así se pueden re-sortear o
// borrar sin tocar los productos de seed.ts ni los creados desde el panel.
const MARCA_SLUG = '-demo-';

// Los mismos slugs que PRODUCTOS en seed.ts.
const SLUGS_BASE = [
  'cap-danlyvostok',
  'cap-filipmatlak-negra',
  'cap-filipmatlak-oliva',
  'cap-vanarsdale',
];

const prisma = new PrismaClient();

function enteroAlAzar(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Entre $14.999 y $49.999, de a $500, siempre terminado en 999 o 499 como los
// precios de seed.ts. Decimal de Prisma: va como string.
function precioAlAzar() {
  const pasos = enteroAlAzar(30, 100);
  return `${pasos * 500 - 1}.00`;
}

async function crearCopias(cantidad: number) {
  const bases = await prisma.producto.findMany({
    where: { slug: { in: SLUGS_BASE } },
    include: { imagenes: { orderBy: { orden: 'asc' } } },
  });

  if (bases.length === 0) {
    throw new Error(
      'No están los productos de demo en la base: corré primero npm run seed.',
    );
  }

  for (let i = 1; i <= cantidad; i++) {
    const base = bases[enteroAlAzar(0, bases.length - 1)];
    const numero = String(i).padStart(2, '0');
    const slug = `${base.slug}${MARCA_SLUG}${numero}`;
    const nombre = `${base.nombre} ${numero}`;
    const datos = {
      nombre,
      descripcion: base.descripcion,
      precio: precioAlAzar(),
      stock: enteroAlAzar(0, 50),
      destacado: Math.random() < 0.15,
      glb_url: base.glb_url,
      activo: true,
    };

    // Si la copia número i ya existía con otra base, el slug cambia: se borra
    // la anterior para no acumular dos copias con el mismo número.
    await borrarCopias({ endsWith: `${MARCA_SLUG}${numero}`, not: slug });

    const producto = await prisma.producto.upsert({
      where: { slug },
      update: datos,
      create: { slug, ...datos },
    });

    // Igual que en seed.ts: sin clave única en ProductoImagen, se borran y se
    // recrean dentro de una transacción.
    await prisma.$transaction([
      prisma.productoImagen.deleteMany({ where: { producto_id: producto.id } }),
      prisma.productoImagen.createMany({
        data: base.imagenes.map((imagen) => ({
          producto_id: producto.id,
          url: imagen.url,
          orden: imagen.orden,
          alt: imagen.alt.replace(base.nombre, nombre),
          es_principal: imagen.es_principal,
        })),
      }),
    ]);

    console.log(`Copia lista: ${slug} ($${datos.precio})`);
  }
}

// Las copias que ya están en alguna orden no se pueden borrar sin romper el
// historial: esas se desactivan y dejan de verse en el catálogo.
async function borrarCopias(
  filtroSlug: Prisma.StringFilter = { contains: MARCA_SLUG },
) {
  const copias = await prisma.producto.findMany({
    where: { slug: filtroSlug },
    select: { id: true, _count: { select: { items_orden: true } } },
  });
  const conOrdenes = copias.filter((c) => c._count.items_orden > 0).map((c) => c.id);
  const sinOrdenes = copias.filter((c) => c._count.items_orden === 0).map((c) => c.id);

  await prisma.$transaction([
    prisma.productoImagen.deleteMany({ where: { producto_id: { in: sinOrdenes } } }),
    prisma.itemCarrito.deleteMany({ where: { producto_id: { in: sinOrdenes } } }),
    prisma.producto.deleteMany({ where: { id: { in: sinOrdenes } } }),
    prisma.producto.updateMany({
      where: { id: { in: conOrdenes } },
      data: { activo: false },
    }),
  ]);

  return { borradas: sinOrdenes.length, desactivadas: conOrdenes.length };
}

async function main() {
  const host = new URL(process.env.DATABASE_URL ?? '').host;
  console.log(`Base: ${host}`);

  const argumento = process.argv[2];

  if (argumento === '--borrar') {
    const { borradas, desactivadas } = await borrarCopias();
    console.log(`Copias borradas: ${borradas}. Desactivadas (tenían órdenes): ${desactivadas}.`);
    return;
  }

  const cantidad = argumento ? Number(argumento) : CANTIDAD_POR_DEFECTO;
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) {
    throw new Error('La cantidad tiene que ser un entero entre 1 y 99.');
  }

  await crearCopias(cantidad);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
