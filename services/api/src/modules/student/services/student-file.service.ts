import { SchoolGuard } from '../../../http/authz';
import { HttpError } from '../../../http/errors';
import { AuthUser } from '../../../types/auth';
import { IStudentFileRepository } from '../repositories/student-file.repository';
import { StudentFile } from '../types/student.types';

/**
 * Dossier administratif (F5–F7, D-61). L'élève ne coche rien lui-même (pas d'envoi de fichier,
 * D-49) : l'instructeur de l'école note la pièce **reçue au bureau**, l'élève lit ce qui lui
 * manque. Un dossier incomplet n'interdit rien (D-62) : il informe.
 *
 * `userId` est toujours `users.id` (D-28) ; `students.id` est résolu ici.
 */
export class StudentFileService {
  constructor(
    private readonly files: IStudentFileRepository,
    private readonly schoolGuard: SchoolGuard
  ) {}

  /** F5 : l'instructeur de l'école (ou l'admin) lit le dossier d'un de ses élèves. */
  async getStudentFile(caller: AuthUser, userId: string, schoolId: string): Promise<StudentFile> {
    await this.schoolGuard.assertSameSchool(caller, schoolId);
    return this.buildFile(await this.requireStudentId(userId, schoolId), schoolId);
  }

  /** F6 : l'élève lit son propre dossier (identifiant pris dans le jeton). */
  async getOwnFile(userId: string, schoolId: string): Promise<StudentFile> {
    return this.buildFile(await this.requireStudentId(userId, schoolId), schoolId);
  }

  /**
   * F7 : la pièce est reçue ou ne l'est plus. Le dossier complet est renvoyé — l'écran affiche
   * l'état d'ensemble sans second appel. Une note n'a de sens que sur une pièce reçue.
   */
  async setDocumentReceived(
    caller: AuthUser,
    userId: string,
    schoolId: string,
    documentTypeId: string,
    received: boolean,
    note?: string
  ): Promise<StudentFile> {
    await this.schoolGuard.assertSameSchool(caller, schoolId);
    const studentId = await this.requireStudentId(userId, schoolId);

    if (!(await this.files.documentTypeExists(documentTypeId, schoolId))) {
      throw new HttpError(404, 'NOT_FOUND', 'Pièce introuvable dans la liste de cette école');
    }

    if (received) {
      await this.files.markReceived(studentId, documentTypeId, caller.userId, note ?? null);
    } else {
      await this.files.markNotReceived(studentId, documentTypeId);
    }

    return this.buildFile(studentId, schoolId);
  }

  /** Une école sans pièce demandée a des dossiers complets : il n'y a rien à apporter. */
  private async buildFile(studentId: string, schoolId: string): Promise<StudentFile> {
    const documents = await this.files.listDocuments(studentId, schoolId);
    return { complete: documents.every((document) => document.received), documents };
  }

  private async requireStudentId(userId: string, schoolId: string): Promise<string> {
    const studentId = await this.files.findStudentId(userId, schoolId);
    if (!studentId) {
      throw new HttpError(404, 'NOT_FOUND', 'Fiche élève introuvable pour cette école');
    }
    return studentId;
  }
}
