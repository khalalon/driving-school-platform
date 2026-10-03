/**
 * `useIsManager` (14.4, D-54, D-56) — l'appelant est-il le gérant de son école ? Lu depuis A3
 * (`isManager`, gardé par l'`AuthContext`). Les écrans s'en servent pour masquer les actions
 * réservées au gérant ; le serveur reste juge (403 `FORBIDDEN_MANAGER`).
 */

import { useAuth } from '../context/AuthContext';
import { UserRole } from '../models/User';

export const useIsManager = (): boolean => {
  const { user } = useAuth();
  return user?.role === UserRole.INSTRUCTOR && user.isManager === true;
};
