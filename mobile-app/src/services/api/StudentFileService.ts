/**
 * Student File Service — §6c du contrat (F1–F7, D-61). Liste des pièces d'une école et dossier
 * d'un élève. `studentId` = users.id (D-28). La gestion de la liste (F2–F4) est refusée à un
 * simple moniteur par le serveur (403 `FORBIDDEN_MANAGER`, D-56) : l'écran la masque aussi.
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';
import { DocumentType, StudentFile } from '../../models/StudentFile';

class StudentFileService {
  /** F1 : pièces demandées par l'école, dans l'ordre d'affichage. */
  async getDocumentTypes(schoolId: string): Promise<DocumentType[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.DOCUMENT_TYPES, { schoolId });
    const response = await apiClient.get<DocumentType[]>(url);
    return response.data;
  }

  /** F2 (gérant) : ajout en fin de liste ; un libellé retiré revient actif. */
  async addDocumentType(schoolId: string, label: string): Promise<DocumentType> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.DOCUMENT_TYPES, { schoolId });
    const response = await apiClient.post<DocumentType>(url, { label });
    return response.data;
  }

  /** F3 (gérant) : renommage ; les pièces déjà reçues restent rattachées. */
  async renameDocumentType(id: string, label: string): Promise<DocumentType> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.DOCUMENT_TYPE_ITEM, { id });
    const response = await apiClient.put<DocumentType>(url, { label });
    return response.data;
  }

  /** F4 (gérant) : la pièce n'est plus demandée (désactivée, pas supprimée — 204). */
  async removeDocumentType(id: string): Promise<void> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.DOCUMENT_TYPE_ITEM, { id });
    await apiClient.delete(url);
  }

  /** F5 : dossier d'un élève, vu par l'école. */
  async getStudentFile(studentId: string, schoolId: string): Promise<StudentFile> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.FILE, { studentId, schoolId });
    const response = await apiClient.get<StudentFile>(url);
    return response.data;
  }

  /** F6 : son propre dossier, vu par l'élève. */
  async getMyFile(schoolId: string): Promise<StudentFile> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.STUDENT_PROFILES.MY_FILE, { schoolId });
    const response = await apiClient.get<StudentFile>(url);
    return response.data;
  }

  /** F7 : pièce reçue ou non ; le dossier à jour est renvoyé. */
  async setDocumentReceived(
    studentId: string,
    schoolId: string,
    documentTypeId: string,
    received: boolean,
    note?: string
  ): Promise<StudentFile> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.DOCUMENT, {
      studentId,
      schoolId,
      documentTypeId,
    });
    // `note` n'est envoyée que renseignée : le serveur garde la précédente hors de ce cas.
    const response = await apiClient.put<StudentFile>(url, { received, ...(note ? { note } : {}) });
    return response.data;
  }
}

export const studentFileService = new StudentFileService();
