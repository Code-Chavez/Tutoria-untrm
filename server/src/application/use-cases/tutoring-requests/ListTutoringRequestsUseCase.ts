import { TutoringRequest } from '@domain/entities/TutoringRequest';
import {
  TutoringRequestRepository,
  TutoringRequestFilters,
} from '@domain/repositories/TutoringRequestRepository';

export class ListTutoringRequestsUseCase {
  constructor(private readonly requests: TutoringRequestRepository) {}

  execute(filters?: TutoringRequestFilters): Promise<TutoringRequest[]> {
    return this.requests.findAll(filters);
  }
}
