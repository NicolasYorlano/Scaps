import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// Sin @MinLength en password: acá no se define la política de claves, se
// comparan credenciales. Una clave vieja más corta que la regla de hoy tiene
// que poder loguearse, y el largo mínimo en el login no valida nada útil.
export class LoginDto {
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @IsString({ message: 'La contraseña debe ser texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}
