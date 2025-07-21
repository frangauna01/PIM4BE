import { InternalServerErrorException, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import databaseConfig from '../../configs/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const dbconfig = configService.get<TypeOrmModuleOptions>('typeorm');
        if (!dbconfig)
          throw new InternalServerErrorException(
            'The configuration for TypeORM was not found',
          );
        return dbconfig;
      },
    }),
  ],
})
export class DatabaseModule {}
