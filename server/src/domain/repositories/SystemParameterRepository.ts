import { SystemParameter } from '../entities/SystemParameter';

export interface SystemParameterRepository {
  findByKey(key: string): Promise<SystemParameter | null>;
}
