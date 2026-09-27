// CORS_ORIGIN admite varios orígenes separados por coma. Un * reemplaza un tramo
// de letras, números y guiones (nunca un punto): así un solo valor cubre todos
// los previews de Vercel, que cambian de URL en cada deploy.
// Sin la variable, la lista queda vacía y el navegador bloquea todo.
export function parseCorsOrigins(
  value: string | undefined,
): (string | RegExp)[] {
  if (!value) return [];

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '')
    .map((origin) =>
      origin.includes('*') ? wildcardToRegExp(origin) : origin,
    );
}

function wildcardToRegExp(pattern: string): RegExp {
  const parts = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^${parts.join('[a-z0-9-]+')}$`);
}
