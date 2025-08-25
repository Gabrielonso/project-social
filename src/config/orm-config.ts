import { DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

import { User } from '../user/entity/user.entity';
import Wallet from '../wallet/entity/wallet.entity';
import { Submission } from 'src/submission/entity/submission.entity';
import { Skill } from 'src/skills/entity/skill.entity';
import { Opportunity } from 'src/opportunity/entity/opportunity.entity';
import { Client } from 'src/client/entity/client.entity';
import { Faq } from 'src/faq/entity/faq.entity';
dotenv.config();
export const ormConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: process.env.DB_SYNCHRONIZATION === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: [User, Wallet, Submission, Skill, Opportunity, Client, Faq],
  migrations: [],
};
