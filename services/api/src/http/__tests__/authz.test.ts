import { UserRole } from '../../types/auth';
import { SchoolGuard } from '../authz';

describe('SchoolGuard (cloisonnement par école, D-20)', () => {
  const lookup = { findByUserId: jest.fn() };
  const guard = new SchoolGuard(lookup);
  const instructor = { userId: 'user-instr', email: 'i@x.io', role: UserRole.INSTRUCTOR };
  const admin = { userId: 'user-admin', email: 'a@x.io', role: UserRole.ADMIN };
  const student = { userId: 'user-student', email: 's@x.io', role: UserRole.STUDENT };

  beforeEach(() => {
    lookup.findByUserId.mockReset();
    lookup.findByUserId.mockResolvedValue({ id: 'instr-1', schoolId: 'school-1' });
  });

  it('assertSameSchool : passe pour son école, 403 FORBIDDEN_SCHOOL pour une autre', async () => {
    await expect(guard.assertSameSchool(instructor, 'school-1')).resolves.toBeUndefined();
    await expect(guard.assertSameSchool(instructor, 'school-2')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN_SCHOOL',
    });
  });

  it('assertSameSchool : l’admin passe sans lecture de la fiche instructeur', async () => {
    await expect(guard.assertSameSchool(admin, 'school-2')).resolves.toBeUndefined();
    expect(lookup.findByUserId).not.toHaveBeenCalled();
  });

  it('requireSchool : école de l’instructeur ; 403 sans fiche, 403 pour un élève ou un admin', async () => {
    await expect(guard.requireSchool(instructor)).resolves.toBe('school-1');

    lookup.findByUserId.mockResolvedValue(null);
    await expect(guard.requireSchool(instructor)).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN_SCHOOL',
    });
    await expect(guard.requireSchool(student)).rejects.toMatchObject({ status: 403 });
    await expect(guard.requireSchool(admin)).rejects.toMatchObject({ status: 403 });
  });
});
