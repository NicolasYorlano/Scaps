import type { Usuario } from '@prisma/client';

// La forma exacta del objeto `user` del contrato: la misma en register, login
// y me. Las fechas salen como Date y JSON las serializa a ISO 8601 UTC.
export interface UserResponse {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  es_admin: boolean;
  creado_en: Date;
  actualizado_en: Date;
}

// Allowlist, no `delete usuario.password`: borrar protege contra el campo de
// hoy, listar protege también contra el que alguien sume al modelo mañana.
export function toUserResponse(usuario: Usuario): UserResponse {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    telefono: usuario.telefono,
    es_admin: usuario.es_admin,
    creado_en: usuario.creado_en,
    actualizado_en: usuario.actualizado_en,
  };
}
