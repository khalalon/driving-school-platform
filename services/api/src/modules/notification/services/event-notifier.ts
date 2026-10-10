import { NotificationPayload, Notifier, SchoolNotifier } from '../types/notification.types';

/** Ce que le répartiteur attend du module school : les instructeurs d'une école, et l'un d'eux. */
export interface SchoolInstructorsLookup {
  findBySchoolId(schoolId: string): Promise<{ userId: string | null }[]>;
  findById(id: string): Promise<{ userId: string | null; schoolId: string } | null>;
}

/**
 * Adressage des notifications aux services métier (17.4). Deux raisons d'exister :
 *
 * - **D-64 en un seul endroit** : une demande neuve part à l'instructeur préféré s'il y en a un,
 *   sinon à tous les instructeurs de l'école. Aucun service n'a à réimplémenter cette règle ;
 * - **rien ne remonte** (D-63) : même la résolution des destinataires est protégée. Une école
 *   dont la liste d'instructeurs est illisible ne doit pas faire échouer la demande de l'élève
 *   qui vient d'être enregistrée.
 */
export class EventNotifier implements SchoolNotifier {
  constructor(
    private readonly dispatcher: Notifier,
    private readonly instructors: SchoolInstructorsLookup,
    private readonly log: (message: string) => void = console.warn
  ) {}

  /**
   * Le répartiteur avale déjà ses erreurs ; cette garde-ci rend la promesse **structurelle** :
   * quel que soit le `Notifier` injecté, un service métier ne peut pas voir d'exception venir
   * d'un envoi, et l'action qui vient de réussir reste réussie (D-63).
   */
  async notify(userIds: string[], payload: NotificationPayload): Promise<void> {
    try {
      await this.dispatcher.notify(userIds, payload);
    } catch (error) {
      this.log(`[notification] ${payload.type} non envoyée : ${String(error)}`);
    }
  }

  async notifySchool(
    schoolId: string,
    payload: NotificationPayload,
    preferredInstructorId?: string | null
  ): Promise<void> {
    try {
      const recipients = await this.schoolRecipients(schoolId, preferredInstructorId);
      await this.dispatcher.notify(recipients, payload);
    } catch (error) {
      this.log(`[notification] destinataires introuvables pour ${payload.type} : ${String(error)}`);
    }
  }

  /**
   * L'instructeur préféré ne reçoit seul que s'il a un compte **et** qu'il est bien de cette
   * école ; sinon toute l'école est prévenue — mieux vaut plusieurs téléphones qu'aucun.
   */
  private async schoolRecipients(
    schoolId: string,
    preferredInstructorId?: string | null
  ): Promise<string[]> {
    if (preferredInstructorId) {
      const preferred = await this.instructors.findById(preferredInstructorId);
      if (preferred?.userId && preferred.schoolId === schoolId) {
        return [preferred.userId];
      }
    }
    const staff = await this.instructors.findBySchoolId(schoolId);
    return staff
      .map((instructor) => instructor.userId)
      .filter((userId): userId is string => Boolean(userId));
  }
}
