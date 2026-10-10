import { NotificationType, Notifier } from '../../types/notification.types';
import { EventNotifier, SchoolInstructorsLookup } from '../event-notifier';

/**
 * D-64 : une demande neuve part à l'instructeur **préféré** s'il y en a un, sinon à **tous** les
 * instructeurs de l'école. Les cas limites comptent autant que le cas nominal : mieux vaut
 * prévenir toute l'école qu'un seul instructeur introuvable, ou personne.
 */
describe('EventNotifier (17.4, D-64)', () => {
  const payload = { type: NotificationType.LESSON_REQUESTED, params: { student: 'Nour' } };
  let dispatcher: jest.Mocked<Notifier>;
  let instructors: jest.Mocked<SchoolInstructorsLookup>;
  let warnings: string[];
  let notifier: EventNotifier;

  beforeEach(() => {
    dispatcher = { notify: jest.fn().mockResolvedValue(undefined) };
    instructors = {
      findBySchoolId: jest
        .fn()
        .mockResolvedValue([{ userId: 'u-instr-1' }, { userId: 'u-instr-2' }]),
      findById: jest.fn().mockResolvedValue({ userId: 'u-prefere', schoolId: 'school-1' }),
    };
    warnings = [];
    notifier = new EventNotifier(dispatcher, instructors, (line) => warnings.push(line));
  });

  it('instructeur préféré de cette école : lui seul est prévenu', async () => {
    await notifier.notifySchool('school-1', payload, 'instr-prefere');

    expect(dispatcher.notify).toHaveBeenCalledWith(['u-prefere'], payload);
    expect(instructors.findBySchoolId).not.toHaveBeenCalled();
  });

  it('sans instructeur préféré : toute l’école', async () => {
    await notifier.notifySchool('school-1', payload);

    expect(dispatcher.notify).toHaveBeenCalledWith(['u-instr-1', 'u-instr-2'], payload);
  });

  it('préféré d’une autre école, introuvable, ou sans compte : toute l’école', async () => {
    instructors.findById.mockResolvedValue({ userId: 'u-prefere', schoolId: 'school-2' });
    await notifier.notifySchool('school-1', payload, 'instr-ailleurs');

    instructors.findById.mockResolvedValue(null);
    await notifier.notifySchool('school-1', payload, 'instr-inconnu');

    instructors.findById.mockResolvedValue({ userId: null, schoolId: 'school-1' });
    await notifier.notifySchool('school-1', payload, 'instr-sans-compte');

    expect(dispatcher.notify).toHaveBeenCalledTimes(3);
    for (const call of dispatcher.notify.mock.calls) {
      expect(call[0]).toEqual(['u-instr-1', 'u-instr-2']);
    }
  });

  it('les fiches sans compte lié sont écartées de la liste', async () => {
    instructors.findBySchoolId.mockResolvedValue([{ userId: null }, { userId: 'u-instr-2' }]);

    await notifier.notifySchool('school-1', payload);

    expect(dispatcher.notify).toHaveBeenCalledWith(['u-instr-2'], payload);
  });

  it('une liste d’instructeurs illisible ne remonte pas : la demande reste enregistrée (D-63)', async () => {
    instructors.findBySchoolId.mockRejectedValue(new Error('base indisponible'));

    await expect(notifier.notifySchool('school-1', payload)).resolves.toBeUndefined();
    expect(dispatcher.notify).not.toHaveBeenCalled();
    expect(warnings.join(' ')).toContain('base indisponible');
  });

  it('`notify` passe au répartiteur, et avale son échec (garantie structurelle, D-63)', async () => {
    await notifier.notify(['u1'], payload);
    expect(dispatcher.notify).toHaveBeenCalledWith(['u1'], payload);

    dispatcher.notify.mockRejectedValue(new Error('répartiteur cassé'));
    await expect(notifier.notify(['u1'], payload)).resolves.toBeUndefined();
    expect(warnings.join(' ')).toContain('répartiteur cassé');
  });
});
