import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

// Los campos van en español porque son la forma de la petición que fija el
// contrato, no nombres internos. Los mensajes son texto de UI: el frontend los
// muestra tal cual, así que van en prosa, sin el nombre del campo adelante.
export class RegisterDto {
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsString({ message: 'El apellido debe ser texto' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  apellido: string;
}
