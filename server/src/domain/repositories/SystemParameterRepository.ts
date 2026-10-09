import { SystemParameter } from '../entities/SystemParameter';

export interface SystemParameterRepository {
  findByKey(key: string): Promise<SystemParameter | null>;
  findAll(): Promise<SystemParameter[]>;
  create(data: Omit<SystemParameter, 'id'>): Promise<SystemParameter>;
  update(key: string, value: string): Promise<SystemParameter>;
}
