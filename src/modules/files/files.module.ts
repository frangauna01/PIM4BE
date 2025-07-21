import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { TransactionHelper } from '../utils/helpers/transaction.helper';
import cloudinary from '../../configs/cloudinary.config';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [FilesController],
  providers: [FilesService, TransactionHelper, JwtService, cloudinary],
})
export class FilesModule {}
