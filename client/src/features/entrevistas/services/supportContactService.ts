import { apiClient } from '@shared/services/apiClient';

export interface SupportContact {
  id: string;
  studentId: string;
  fullName: string;
  relationship: string;
  age?: number | null;
  occupation?: string | null;
  phone: string;
}

export interface UpsertSupportContactData {
  fullName: string;
  relationship: string;
  age?: number;
  occupation?: string;
  phone: string;
}

export const supportContactService = {
  upsertSupportContact: async (
    studentId: string,
    data: UpsertSupportContactData,
  ): Promise<SupportContact> => {
    const response = await apiClient.put<{ message: string; contact: SupportContact }>(
      `/students/${studentId}/support-contact`,
      data,
    );
    return response.data.contact;
  },
};
