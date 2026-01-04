import { DataSource } from 'typeorm';
import { ormConfig } from '../config/orm-config';
export const AppDataSource = new DataSource(ormConfig);
