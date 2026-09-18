/** Types d'identité partagés par tous les modules (posés sur `req.user` par le middleware). */
export enum UserRole {
  ADMIN = 'admin',
  INSTRUCTOR = 'instructor',
  STUDENT = 'student',
}

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}
