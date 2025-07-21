import { DataSource, DataSourceOptions } from 'typeorm';
import { registerAs } from '@nestjs/config';
import { envs } from './envs.config';

export const typeorm: DataSourceOptions = {
  type: 'postgres',
  host: envs.typeorm.host,
  port: envs.typeorm.port,
  username: envs.typeorm.username,
  password: envs.typeorm.password,
  database: envs.typeorm.name,
  synchronize: false,
  dropSchema: false,
  logging: false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
};

export default registerAs('typeorm', () => typeorm);

export const typeormCLI = new DataSource(typeorm);
