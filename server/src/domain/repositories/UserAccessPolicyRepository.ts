import { UserAccessPolicy } from '../entities/UserAccessPolicy';

export interface UserAccessPolicyRepository {
  findByUserId(userId: string): Promise<UserAccessPolicy | null>;
}
