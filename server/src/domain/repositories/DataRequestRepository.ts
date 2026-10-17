export type DataRequestStatus = 'ENVIADO' | 'FALLIDO';
export type DataRequestKind = 'ESTUDIANTES' | 'DOCENTES';

export interface DataRequest {
  id: string;
  createdAt: Date;
  periodId: string;
  schoolId: string;
  kind: DataRequestKind;
  toEmail: string;
  cycles: number[];
  note: string | null;
  requestedById: string;
  status: DataRequestStatus;
  error: string | null;
  receivedAt: Date | null;
  receivedById: string | null;
}

export interface DataRequestRepository {
  create(data: Omit<DataRequest, 'id' | 'createdAt' | 'receivedAt' | 'receivedById'>): Promise<DataRequest>;
  /** Más recientes primero. Con `schoolIds` solo las de esas escuelas. */
  list(filters?: { schoolIds?: string[]; periodId?: string }): Promise<DataRequest[]>;
  findById(id: string): Promise<DataRequest | null>;
  markReceived(id: string, byId: string, at: Date): Promise<DataRequest | null>;
}
