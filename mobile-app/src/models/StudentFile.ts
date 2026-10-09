/**
 * Dossier administratif de l'élève — §6c du contrat (D-61, D-62). Pas d'envoi de fichier
 * (D-49) : l'instructeur note qu'une pièce a été **reçue au bureau**, l'élève lit ce qui lui
 * manque. Un dossier incomplet n'interdit rien (D-62) : il informe. Dates en chaînes ISO 8601.
 */

/** F1–F4 : une pièce demandée par l'école. `position` donne l'ordre d'affichage. */
export interface DocumentType {
  id: string;
  schoolId: string;
  label: string;
  position: number;
  active: boolean;
}

/** F5–F7 : une pièce du dossier d'un élève ; `receivedAt` et `note` sont nuls tant qu'elle manque. */
export interface StudentFileDocument {
  documentTypeId: string;
  label: string;
  received: boolean;
  receivedAt: string | null;
  note: string | null;
}

/** `complete` : toutes les pièces encore demandées sont reçues (école sans pièce = complet). */
export interface StudentFile {
  complete: boolean;
  documents: StudentFileDocument[];
}

/** Pièces encore attendues, telles qu'on les montre à l'élève et sur une demande d'examen. */
export const missingDocuments = (file: StudentFile): string[] =>
  file.documents.filter((document) => !document.received).map((document) => document.label);
