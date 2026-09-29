import { ReferralService, ReferralStatus } from '@domain/entities/StudentReferral';

export interface ReferralTrackingItem {
  id: string;
  studentId: string;
  service: ReferralService;
  status: ReferralStatus;
  createdAt: Date;
  lastUpdatedAt: Date;
  hoursSinceUpdate: number;
  isOverdue: boolean;
}

export interface ReferralTrackingServiceSummary {
  service: ReferralService;
  total: number;
  overdue: number;
  byStatus: Record<ReferralStatus, number>;
}

export interface ReferralTrackingReport {
  deadlineHours: number;
  generatedAt: Date;
  items: ReferralTrackingItem[];
  summary: ReferralTrackingServiceSummary[];
}
