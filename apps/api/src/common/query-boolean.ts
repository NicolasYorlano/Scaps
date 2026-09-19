import { Transform } from 'class-transformer';

// Los query params llegan como texto y Boolean('false') es true, así que se
// convierte a mano. Cualquier otro valor queda como está y lo rechaza @IsBoolean.
export function QueryBoolean() {
  return Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  );
}
