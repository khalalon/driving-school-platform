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
  /** Session (famille de refresh tokens, 4.6) ; absent d'un jeton émis avant 4.6. */
  sid?: string;
}
