import { Global, Module } from '@nestjs/common';
import { TransactionHelper } from './helpers/transaction.helper';

@Global()
@Module({ providers: [TransactionHelper], exports: [TransactionHelper] })
export class UtilsModule {}
