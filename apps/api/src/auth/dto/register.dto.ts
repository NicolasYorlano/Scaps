import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

// Los campos van en español porque son la forma de la petición que fija el
// contrato, no nombres internos. Los mensajes también: el frontend los muestra
// tal cual vienen.
export class RegisterDto {
  @IsEmail({}, { message: 'email debe ser un correo válido' })
  email: string;

  @IsString({ message: 'password debe ser texto' })
  @MinLength(8, { message: 'password debe tener al menos 8 caracteres' })
  password: string;

  @IsString({ message: 'nombre debe ser texto' })
  @IsNotEmpty({ message: 'nombre es obligatorio' })
  nombre: string;

  @IsString({ message: 'apellido debe ser texto' })
  @IsNotEmpty({ message: 'apellido es obligatorio' })
  apellido: string;
}
