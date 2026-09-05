// Acá y no en el decorador: el decorador importa AdminGuard y el guard importa
// ROLES_KEY. Los dos son valores, así que juntarlos sería un ciclo en runtime.

// El modelo tiene es_admin, no un campo de roles: con el tipo cerrado,
// un @Roles('editor') no compila.
export type Role = 'admin';

export const ROLES_KEY = 'roles';
