import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// Sin @MinLength en password: acá no se define la política de claves, se
// comparan credenciales. Una clave vieja más corta que la regla de hoy tiene
// que poder loguearse, y el largo mínimo en el login no valida nada útil.
export class LoginDto {
  @IsEmail({}, { message: 'email debe ser un correo válido' })
  email: string;

  @IsString({ message: 'password debe ser texto' })
  @IsNotEmpty({ message: 'password es obligatorio' })
  password: string;
}
